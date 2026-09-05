# Security

本文件用于记录学脉安全与隐私原则。

当前原则：

- 不读取、打印或提交 `.env`、`.env.local` 或密钥。
- `.env*` 默认必须被 Git 忽略，只有 `.env.example` 可作为占位符模板进入仓库。
- 学生数据属于敏感教育数据。
- AI 草稿不能自动成为正式事实。
- 所有入档必须由老师确认。
- 服务端写入必须校验老师、学生、班级和记录归属。
- `teacherId` 必须来自 Supabase Auth session / user.id，真实写入 API 不得信任请求体里的 `teacherId`。
- `SUPABASE_SERVICE_ROLE_KEY` 只能用于受控 server-side 内部操作；使用 service role 前必须完成 session-derived teacherId 与 ownership check。
- 前端组件、页面组件和通用 `lib` 不得直接导入 `supabase-server-client` 或读取 `SUPABASE_SERVICE_ROLE_KEY`。
- Parent Feedback 确认入档必须通过事务化 RPC 或数据库幂等约束，避免重复写入 `feedback_history` / `student_learning_records`。
- `localStorage` 只能保存当前 mock 工作台数据；真实学生隐私数据不得长期保存在浏览器本地。
- Skill Shell 同步到 Supabase 时，adapter 必须使用 session-derived `teacher_id`。前端 mock 的 external id 只能用于兼容/去重，不能作为权限依据。
- `POST /api/skills/persistence` 默认只允许 dry-run；真实 sync 必须显式设置服务端 `SKILL_PERSISTENCE_WRITE_ENABLED=true`，且只能在 migration 与 RLS/ownership 边界确认后开启。
- 当前 npm audit 命中 Next 内置 PostCSS moderate 风险；禁止执行 `npm audit fix --force`，后续用独立依赖安全分支处理。

## Parent Feedback API Boundary

- `POST /api/agents/parent-feedback`：先读取 Supabase Auth session，派生 `teacherId`，再校验 student ownership；如果请求带 `classId`，也必须校验 class ownership，最后进入 Agent workflow。
- `POST /api/agents/parent-feedback/confirm`：先读取 Supabase Auth session，校验 student、可选 class 和 agent_output ownership，再调用数据库 RPC 确认入档。
- 未登录返回 401；无权访问学生或 AI 草稿返回 403；输入错误返回 400。
- 请求体中即使包含 `teacherId`，也会被忽略。

## Confirm Archive Idempotency

- `feedback_history.agent_output_id` 增加唯一索引。
- `student_learning_records(agent_output_id)` 在 `record_type = 'parent_feedback'` 时增加唯一索引。
- `confirm_parent_feedback_archive(...)` RPC 在同一数据库事务中完成：
  - 锁定目标 `agent_outputs`。
  - 校验 output 类型、老师、学生、class/run 归属。
  - upsert confirmed `feedback_history`。
  - upsert confirmed `student_learning_records`。
  - 更新 `agent_outputs.is_final/status/output_json`。
  - 按需记录一次确认前老师编辑事件。
- 重复 confirm 会返回已有 archive 结果，不重复入档。

## Skill Persistence Boundary

- `POST /api/skills/persistence`：读取 Supabase Auth session 派生 `teacher_id`，解析 `schema_version = 2` 的 Skill Shell payload，校验传入 student/class 归属，然后返回 dry-run upsert plan。
- 默认不执行真实数据库写入，`dryRun=false` 在 `SKILL_PERSISTENCE_WRITE_ENABLED` 未启用时返回 409。
- 开启真实写入后，API 仍必须先从 session 派生 `teacher_id`，完成 student/class ownership check，再使用 server-only Supabase client upsert Skill Shell 表。
- 前端传入的 `subjectsByConversationId` 只用于声明要映射的 subject；服务端必须校验归属后才能使用。
- 后续真实写入只能在 `202606120002_skillcard_persistence_contract.sql` 已执行、RLS/ownership 策略明确后开启。
- `202606120003_skill_shell_rls_policies.sql` 是 Skill Shell 表的 RLS 草案，只覆盖 `skill_*` 表；执行前必须确认 Auth 已稳定使用 `auth.uid()` 作为 `teacher_id`。
- 本阶段不提供 delete policy。删除/废弃卡片应先建模为状态流转，避免误删审计链。

## Dependency Audit

- 2026-06-12 运行 `npm audit --audit-level=moderate`：命中 2 个 moderate，来源为 `next` 依赖的内部 `postcss < 8.5.10`。
- Advisory：PostCSS CSS stringify output 中未转义 `</style>` 可能导致 XSS。
- 不执行 `npm audit fix --force`，因为它会引入破坏性 Next 降级。
- 后续建议单独开依赖安全分支，优先验证 Next 官方修复版本或可控 override。

TODO:

- 补充 Supabase Auth / RLS 策略。
- 补充日志脱敏策略。
- 补充导出、删除和外部发送的安全策略。
