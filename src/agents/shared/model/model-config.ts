export type AiProvider = "deepseek" | "openai" | "openai-compatible";

export type ModelCapabilities = {
  jsonObjectResponseFormat: boolean;
  strictStructuredOutputs: boolean;
  toolCalling: boolean;
};

export type AiModelConfig = {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  capabilities: ModelCapabilities;
};

const providerDefaults: Record<AiProvider, { baseUrl: string; model: string; capabilities: ModelCapabilities }> = {
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
    capabilities: {
      jsonObjectResponseFormat: true,
      strictStructuredOutputs: false,
      toolCalling: false
    }
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    capabilities: {
      jsonObjectResponseFormat: true,
      strictStructuredOutputs: true,
      toolCalling: true
    }
  },
  "openai-compatible": {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
    capabilities: {
      jsonObjectResponseFormat: true,
      strictStructuredOutputs: false,
      toolCalling: false
    }
  }
};

function readProvider(value: string | undefined): AiProvider {
  if (value === "openai" || value === "openai-compatible" || value === "deepseek") return value;
  return "deepseek";
}

function assertServerSide() {
  if (typeof window !== "undefined") {
    throw new Error("AI model config must only be read on the server.");
  }
}

export function getAiModelConfig(): AiModelConfig {
  assertServerSide();

  const provider = readProvider(process.env.AI_PROVIDER);
  const defaults = providerDefaults[provider];
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing AI_API_KEY");
  }

  return {
    provider,
    baseUrl: process.env.AI_BASE_URL || defaults.baseUrl,
    apiKey,
    model: process.env.AI_MODEL || defaults.model,
    capabilities: defaults.capabilities
  };
}
