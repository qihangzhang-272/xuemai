# Skill Runtime

`src/skills/` 是当前 PRD v3 的 MVP 主线。

它用于承载 Workflow-first Skill Shell：

- `registry.ts`：定义学生、班级、老师工作台可用 Skill。
- `runner.ts`：当前阶段只做 mock Skill Runner。
- `types.ts`：Skill、SkillRun、ContextSource 等共享类型。
- `actions.ts`：统一动作标签。

当前阶段不在这里直接调用 LLM，不写正式数据库，不绕过老师确认。

