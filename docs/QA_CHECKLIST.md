# 学脉手动 QA Checklist

当前 checklist 用于 mock SkillCard 编辑面板验证。不要连接真实 AI 或 Supabase。

## SkillCard 编辑面板

- 打开 `/dashboard`。
- 进入一个学生会话，例如“王一路”。
- 输入一条课堂记录，生成学习记录 SkillCard。
- 确认卡片默认只展示当前结果摘要、状态、参考依据和主操作。
- 确认 AI 原稿默认收起。
- 确认编辑区默认收起。
- 确认学习记录主操作顺序为：确认入档、生成微信反馈、下次课建议。
- 点击“编辑当前版”，修改 textarea 内容并保存。
- 确认卡片显示“已编辑 · N 次”。
- 点击“更多”。
- 点击“查看 AI 原稿”，确认原稿内容未被编辑污染。
- 点击“重置为 AI 原稿”，确认当前版回到原稿且不会自动入档。
- 从学习记录卡片触发“生成微信反馈”。
- 确认微信反馈主操作顺序为：复制微信反馈、标记已发给家长、确认入档。
- 对微信反馈执行“复制微信反馈”。
- 点击“已发给家长”。
- 点击“确认并入档”。
- 检查聊天流出现 ArchiveLog，文案为“已入档，将作为后续备课、反馈和月报依据。”。
- 检查 ArchiveLog 显示入档目标，例如“王一路 > 课后反馈”。
- 检查右侧学生时间线使用的是最终确认版 current_output，而不是被污染的 original_output。

## 不应发生

- 不应自动入档。
- 不应显示“AI 已完成诊断”等绝对化文案。
- 不应调用真实 AI。
- 不应写入 Supabase。
- 不应引入 LangGraph、Redis、MCP、向量库或多 Agent。

## Skill Persistence Dry-run

用于验证 E4-E8 的 Skill Shell 持久化契约。默认只做 dry-run，不写真实数据库。

- 确认 `.env.local` 不提交，不在日志里打印密钥。
- 确认服务端未设置 `SKILL_PERSISTENCE_WRITE_ENABLED=true` 时，`dryRun=false` 会返回 409。
- 使用登录态请求 `POST /api/skills/persistence`，请求体包含 `schema_version = 2` 的 `payload` 和 `dryRun = true`。
- 确认响应 `success = true`、`mode = dry_run`。
- 确认响应里包含 `skill_runs`、`skill_cards`、`skill_card_events`、`skill_card_edits`、`skill_archive_logs` 的 counts。
- 如传入 `subjectsByConversationId.studentId` 或 `classId`，确认服务端会做 ownership check。
- 未登录请求应返回 401。
- 无权限 student/class 请求应返回 403。

## Skill Persistence 真实写入前置条件

只有全部满足后，才允许在受控测试环境开启 `SKILL_PERSISTENCE_WRITE_ENABLED=true`。

- 已人工执行并检查 `supabase/migrations/202606120002_skillcard_persistence_contract.sql`。
- 已人工执行并检查 `supabase/migrations/202606120003_skill_shell_rls_policies.sql`。
- 已在 Supabase SQL Editor 运行只读检查 `supabase/checks/202606130001_skill_shell_readiness_check.sql`。
- 只读检查中 `skill_tables`、`skill_columns`、`skill_unique_indexes`、`skill_rls_enabled` 均为 `ok`。
- Supabase Auth 的 `auth.uid()` 已稳定等于业务表 `teacher_id`。
- `skill_*` 表 RLS policy 已验证当前老师只能读写自己的行。
- dry-run plan 的 counts 和 rows 结构符合预期。
- 确认可重复执行同一 payload，不产生重复事件、编辑或入档日志。
