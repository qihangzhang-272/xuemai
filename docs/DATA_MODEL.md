# Data Model

本文件用于记录学脉数据模型。

当前原则：

- 聊天消息默认不是正式档案。
- AI 输出先成为 SkillCard / draft。
- 老师确认后才进入长期记录。
- 后续持久化需区分 `skill_runs`、`skill_cards`、`learning_records`、`feedbacks`、`monthly_reports` 和 `archive_logs`。

## PRD v3 Skill Shell 兼容层

E5 新增迁移草案 `supabase/migrations/202606120002_skillcard_persistence_contract.sql`，用于承接前台 mock Skill Shell：

- `skill_runs`：前台 Skill 工作流运行摘要，可通过 `agent_run_id` 关联后端 `agent_runs`。
- `skill_cards`：正式 SkillCard 输出，保留 `original_output`、`current_output`、`archived_output`。
- `skill_card_events`：复制、标记已发、加入月报素材、生成练习、保存备注等按钮事件。
- `skill_card_edits`：老师编辑字段事件。
- `skill_archive_logs`：老师确认入档后聊天流里的 ArchiveLog。

这些表不替代现有 `agent_runs` / `agent_outputs` / `feedback_history` / `student_learning_records`。当前策略是并行兼容：Skill Shell 负责前台可回放工作流，`agent_*` 和 confirmed records 继续承担真实 AI 草稿与长期事实边界。

为兼容当前 mock/localStorage，表使用 UUID 主键，同时保留 `external_run_id`、`external_card_id`、`external_event_id`、`external_edit_id`、`external_archive_id`。生产代码不应把这些 external id 当作数据库主键。

E8 增加 server-side sync service，把 adapter plan 按 `skill_runs -> skill_cards -> events/edits/archive_logs` 顺序写入，并先解析生产 UUID 外键。该写入路径默认由 `SKILL_PERSISTENCE_WRITE_ENABLED=false` 关闭；开启前必须确认迁移、RLS 和 Auth teacher_id 映射。

E15 增加 `src/skills/persistence/readiness.ts`，用于解释手动 readiness SQL 返回结果。它不会连接 Supabase，也不会开启真实写入，只把表、关键列、external id 唯一索引、RLS、policy、delete policy 和 `auth.uid()` 检查转成可测试的本地结论，降低手动判断遗漏。

TODO:

- 对齐 `docs/PRD.md` 第 11 章数据模型。
- 执行并验证 Supabase RLS 策略。
- 在测试环境验证受控 server-side upsert 后，再决定是否对产品原型开启真实同步。
