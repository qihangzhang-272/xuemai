import type OpenAI from "openai";
import { createOpenAICompatibleClient } from "./openai-compatible-client";
import { getAiModelConfig, type AiModelConfig } from "./model-config";

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

type JsonChatCompletionInput = {
  messages: ChatMessage[];
  temperature?: number;
  model?: string;
  config?: AiModelConfig;
};

function withJsonOnlyInstruction(messages: ChatMessage[]): ChatMessage[] {
  return [
    {
      role: "system",
      content: "Return valid JSON only. Do not include Markdown, explanations, or surrounding text."
    },
    ...messages
  ];
}

export async function createJsonChatCompletion(input: JsonChatCompletionInput) {
  const config = input.config ?? getAiModelConfig();
  const client = createOpenAICompatibleClient(config);
  const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: input.model ?? config.model,
    messages: config.capabilities.jsonObjectResponseFormat ? input.messages : withJsonOnlyInstruction(input.messages),
    temperature: input.temperature ?? 0.2
  };

  if (config.capabilities.jsonObjectResponseFormat) {
    request.response_format = { type: "json_object" };
  }

  return client.chat.completions.create(request);
}

export function assertToolCallingSupported(config: AiModelConfig = getAiModelConfig()) {
  if (!config.capabilities.toolCalling) {
    throw new Error(`Tool calling is not enabled for AI_PROVIDER=${config.provider}`);
  }
}

export function assertStrictStructuredOutputsSupported(config: AiModelConfig = getAiModelConfig()) {
  if (!config.capabilities.strictStructuredOutputs) {
    throw new Error(`Strict structured outputs are not enabled for AI_PROVIDER=${config.provider}`);
  }
}
