# AI Layer

`src/ai/` 用于承载 PRD v3 中与运行时 AI 有关的轻量能力。

当前阶段只保留目录边界，不接真实 AI，不引入 LangGraph、Redis、向量库、MCP 或复杂多 Agent。

建议子目录：

- `context-loaders/`
- `schemas/`
- `validators/`
- `risk-checkers/`
- `prompts/`

