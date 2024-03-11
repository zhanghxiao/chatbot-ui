import { Database } from "@/supabase/types"
import { ChatSettings } from "@/types"
import { createClient } from "@supabase/supabase-js"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export const runtime: ServerRuntime = "edge"

// 预置模型列表
const presetModels = [
  {
    name: "讯飞星火v3.5",
    baseURL: "https://rdoneapi1.xiaochatgpt.xyz/v1",
    apiKey: "sk-8ww5TKvXVil7YxLyEbF61fC91bFf40FbBd779e54A18d83Df"
  },
  {
    name: "通义千问-plus",
    baseURL: "https://rdoneapi1.xiaochatgpt.xyz/v1",
    apiKey: "sk-8ww5TKvXVil7YxLyEbF61fC91bFf40FbBd779e54A18d83Df"
  }
]

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, selectedModelName } = json as {
    chatSettings: ChatSettings
    messages: any[]
    selectedModelName: string
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 从预置模型列表中查找选定的模型
    const selectedModel = presetModels.find(model => model.name === selectedModelName)

    if (!selectedModel) {
      throw new Error("Invalid model selected")
    }

    const { baseURL, apiKey } = selectedModel

    const custom = new OpenAI({
      apiKey,
      baseURL
    })

    const response = await custom.chat.completions.create({
      model: selectedModelName,
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      stream: true
    })

    const stream = OpenAIStream(response)
    return new StreamingTextResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Custom API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "Custom API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}