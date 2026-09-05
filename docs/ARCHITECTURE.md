# Architecture

本文件用于记录学脉的长期工程架构。

当前主线：

- Chat-first UX
- Workflow-first execution
- SkillCard as formal output carrier
- Human-confirmed archive as long-term memory boundary
- `src/skills/` as current MVP execution boundary
- `src/agents/` as reserved backend AI/Harness capability

## Current Mock Kernel

当前纯 mock 闭环位于 `src/skills/`：

- `registry.ts`：注册 `update_learning_record`、`analyze_learning_evidence`、`generate_feedback`、`next_lesson_plan`、`monthly_report` 等 Skill。
- `runner.ts`：提供 `createSkillRun`、`runSkillMock`、`transitionSkillRun`、`toSkillCardViewModel`。
- `actions.ts`：提供 SkillCard 编辑、重置和确认归档的纯函数。
- `mock-workflow.ts`：用纯函数表达学生会话、消息、SkillCard、ArchiveLog、TimelineRecord 的本地闭环。

当前不接真实 AI、不接 Supabase、不接 MCP。所有入档都必须由老师显式动作触发。

`analyze_learning_evidence` 是全学科通用分析 Skill，不绑定数学、英语、物理或试卷场景。

SkillCard 当前支持版本链：

- `original_output`：mock AI 原始草稿。
- `current_output`：老师当前编辑版。
- `archived_output`：老师确认后的最终入档版。
- `edit_events`：老师手动编辑事件列表。

入档时只固化 `current_output`，不会反向污染 `original_output`。

## Skill Shell Persistence Boundary

当前持久化分为三层：

- `components/xuemai-workbench/persistence.ts`：把 mock 工作台状态保存为 `schema_version = 2` 的本地回放载荷。
- `components/xuemai-workbench/supabase-persistence-adapter.ts`：把本地载荷转换为 Supabase 兼容 upsert plan，不直接写库。
- `app/api/skills/persistence/route.ts`：服务端 dry-run / 受控同步入口，老师身份必须来自 Supabase Auth session。

真实写入路径默认关闭。只有确认以下条件后，才允许设置 `SKILL_PERSISTENCE_WRITE_ENABLED=true`：

- `202606120002_skillcard_persistence_contract.sql` 已执行并检查。
- `202606120003_skill_shell_rls_policies.sql` 已执行并检查。
- Auth 的 `auth.uid()` 与业务 `teacher_id` 映射稳定。
- dry-run plan 和 RLS ownership 都通过测试环境验证。

`skill_*` 表用于前台 Skill Shell 回放和审计；`agent_runs`、`agent_outputs`、`feedback_history`、`student_learning_records` 仍分别承担后端 AI 运行、AI 草稿、老师确认反馈和长期学习事实。

TODO:

- 补充 E0-E8 阶段架构图。
- 补充 `src/skills` 与既有 `src/agents` 的兼容策略图。
