# Model

Shared provider-agnostic model client boundary.

The default provider is DeepSeek, but Agent workflows must not depend on a specific vendor.

Required environment variables:

```txt
AI_PROVIDER=deepseek
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=<your_deepseek_api_key>
AI_MODEL=deepseek-v4-flash
```

Rules:

- Read API keys only from `AI_API_KEY`.
- Read model names only from `AI_MODEL`.
- Read OpenAI-compatible endpoint URLs from `AI_BASE_URL`.
- Never put real API keys in code or committed files.
- It is acceptable to use the OpenAI SDK as an OpenAI-compatible HTTP client.
- Business Agents must call shared model helpers instead of depending on provider-specific features.

Compatibility:

- JSON response mode is negotiated here.
- Strict structured outputs and tool calling must be capability-checked here before later Agents use them.
- If a provider does not support a feature, this layer should fall back to prompt-level JSON instructions or return a typed capability error.
