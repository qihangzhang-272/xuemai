# Testing

本文件记录学脉当前最小测试体系和边界。

## Commands

本地预览统一使用固定端口，避免旧监听和 HMR 缓存残留：

```bash
npm run dev
```

该命令会先释放 `3016` 端口，再清理 `.next` 并启动 `http://127.0.0.1:3016/dashboard`。如果只想保留缓存快速启动，可用：

```bash
npm run dev:stable:no-clean
```

如果只想关闭本项目预览监听，可用：

```bash
npm run dev:stop
```

本地预览默认绑定 `127.0.0.1:3016`。不要混用 `localhost` 和其他端口；调试时统一打开 `http://127.0.0.1:3016/dashboard`。如果浏览器能打开但命令行 `curl` / `nc` 报错，优先以浏览器实际表现为准；当前 Codex 沙箱可能会限制命令行直连本地 TCP。

每轮开发根据改动范围运行：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

手动 QA 参考 [QA_CHECKLIST.md](/Users/wdlmacpro/Documents/教培全流程追踪系统/docs/QA_CHECKLIST.md)。

## Current Test Scope

当前使用 Vitest 做最小单元测试。

已覆盖：

- Skill Registry smoke test。
- Skill Runner mock 执行测试。
- Mock Workflow 闭环测试。
- 核心 Skill 是否存在。
- Skill 定义是否包含 id、title/label、scope/subjectTypes、requiredInputs/requiredInput、actions 等基础契约。
- 学生、班级、老师工作台三类会话是否都能取到上下文相关 Skill。
- SkillRun 创建、mock 草稿生成、复制、已发送、确认入档与失败错误结构。
- ArchiveLog 与 TimelineRecord 只在老师显式确认后创建。
- `analyze_learning_evidence` 通用 schema。
- `analyze_learning_evidence` 完整学习证据分析报告 schema：覆盖总览、数据校验、提升路径、能力画像、问题聚类、关键证据、优先队列、复发风险、短周期计划、执行清单、协同行动、家长摘要和学生档案更新建议。
- 学习证据分析报告核心字段保持全学科通用，不把数学/试卷专属字段作为核心字段。
- 学习证据分析报告右侧审核栏 helper：只有带 `learning_evidence_report_v1` 的卡片进入完整报告 UI，短旧版分析卡不会误判。
- 学习证据分析报告的学生档案更新建议：默认勾选、老师确认选择、入档摘要和本地 timeline profileUpdates 回放。
- 学生侧栏 timeline / profileUpdates 投影：按学习记录、分析报告、家长反馈、月报素材筛选，并从确认后的 profileUpdates 生成月报素材池。
- `generate_feedback` 从学习记录或分析结果触发的 mock flow。
- SkillCard `original_output / current_output / archived_output` 版本链。
- `edit_events` 记录老师手动编辑字段。
- Mock SkillCard UI 状态 helper：已编辑状态、编辑次数、查看原稿数据、重置原稿和入档 current_output。
- Mock SkillCard 默认折叠状态和状态文案映射。
- Mock SkillCard 主操作排序。
- 编辑后的微信反馈仍必须走 `copied -> sent -> archived`。
- Parent Feedback API 输入解析不会信任请求体伪造的 `teacherId`。
- Parent Feedback API auth / ownership 错误状态映射。
- Parent Feedback route 级安全边界：未登录 401、伪造 `teacherId` 被忽略、student/class/agent_output ownership 在写入前校验。
- Parent Feedback confirm 服务层会在 ownership 不匹配时拒绝进入 service-role 写入。
- Parent Feedback confirm 对已 final 草稿走幂等 archive 路径。
- Skill Shell persistence payload 解析和 schema version 校验。
- Skill Shell Supabase adapter dry-run plan。
- Skill Persistence API route 最小边界：未登录 401、dry-run ownership check、默认拒绝真实写入。
- SkillCard persistence migration 静态护栏：非破坏式建表、版本链字段、external id 去重索引、不启用阻断式 RLS。
- Skill Shell RLS migration 静态护栏。
- Skill Shell readiness check SQL 静态护栏：只读语句、覆盖表/字段/索引/RLS/policy/auth.uid 检查。
- Skill Shell readiness 结果解释器：把 Supabase SQL Editor 返回行解释为缺表、缺列、缺唯一索引、缺 RLS、缺 policy、误加 delete policy 和 Auth 映射提醒。
- Skill Shell feature flag 默认关闭和 UUID 外键解析顺序。
- Server-only Supabase 边界：service role env 只能在 server client 模块读取，UI/shared frontend 不得导入 server client。
- 环境文件安全边界：`.env*` 默认忽略，`.env.example` 作为模板可跟踪。

## Boundaries

当前测试不连接 Supabase，不调用真实 AI，不引入 LangGraph、Redis、MCP、向量库或复杂多 Agent。SkillCard 编辑面板先通过 UI 状态 helper 覆盖核心交互边界，暂不引入 React 渲染测试库。

当前 Parent Feedback 安全测试优先覆盖 helper / service 层纯逻辑。真实 API 需要手动验证：

1. 未登录请求 `POST /api/agents/parent-feedback` 返回 401。
2. 请求体带伪造 `teacherId` 不影响服务端 session-derived teacherId。
3. 不属于当前老师的 `studentId` / `agentOutputId` 返回 403。
4. 同一 `agentOutputId` 重复 confirm 不新增第二条 `feedback_history` 或 `student_learning_records`。
5. confirm migration 已在 Supabase 执行后，再测试真实入档 RPC。

Skill Shell 持久化真实写入前，需要手动运行只读检查：

1. 执行 `supabase/checks/202606130001_skill_shell_readiness_check.sql`。
2. 确认 Skill Shell 表、关键列、external id 去重索引、RLS 状态和 policies 符合预期。
3. 可把 SQL Editor 返回行交给 `src/skills/persistence/readiness.ts` 的解释器做本地判断。
4. 再考虑在受控环境设置 `SKILL_PERSISTENCE_WRITE_ENABLED=true`。

后续再按阶段补充：

- SkillCard 交互测试。
- ArchiveLog 入档链路测试。
- Skill Persistence API route 的真实 Supabase 集成测试。
- 真实 AI Skill 的 schema / risk checker 测试。
