import OpenAI from "openai";
import { getAiModelConfig, type AiModelConfig } from "./model-config";

export function createOpenAICompatibleClient(config: AiModelConfig = getAiModelConfig()) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl
  });
}
