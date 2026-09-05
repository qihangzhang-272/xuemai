# 学脉 Engineering Guide

本文件是 `docs/PRD.md` 的工程执行摘要。完整产品与阶段规划以 `docs/PRD.md` 为准。

## 当前主线

学脉当前采用 Workflow-first Agent Shell + Harness-first AI Coding。

第一阶段先完成微信式 AI 教学工作台 MVP，不引入复杂多 Agent、LangGraph、Redis、向量库或生产 MCP。

## 开发顺序

1. E0：纯前端 mock，跑通三栏 UI、ContextPanel、SkillLauncher、SkillCard、ArchiveLog。
2. E1：本地 Skill Registry，所有胶囊来自 registry。
3. E2：Skill Runner mock，所有 SkillCard 由 runner 生成。
4. E3：右侧审核面板展示教师可读事件轨迹。
5. E4：本地 `schema_version = 2` 持久化契约，支持 SkillRun、SkillCard、事件、编辑和时间线回放。
6. E5：Supabase Skill Shell 兼容表和纯 adapter plan。
7. E6：服务端 dry-run API，session-derived teacher identity，默认不写库。
8. E7：Skill Shell RLS migration 草案。
9. E8-E11：真实写入路径放在服务端 feature flag 后，并补齐 route、migration、sync 静态测试。

## 当前代码分层

- `components/xuemai-workbench/`：当前微信式工作台 UI。
- `src/skills/`：当前 MVP 主线，放 Skill Registry、Skill Runner 和 Skill 类型。
- `src/agents/`：前期已实现的 Agent/Harness 能力储备，暂不继续扩复杂多 Agent。
- `app/api/skills/persistence`：Skill Shell 持久化 dry-run / 受控同步入口，真实写入默认关闭。
- `docs/`：产品、工程、Skill、数据、安全和测试文档。

## 本阶段禁止

- 不新增复杂 Agent 编排。
- 不引入 LangGraph / Redis / 向量库 / 生产 MCP。
- 不让 UI 按钮直接调用 LLM。
- 不让 AI 草稿自动入档。
- 不读取、打印或提交 `.env`、`.env.local` 或任何密钥。

## 验证命令

每轮开发结束根据项目实际情况运行：

```bash
npm run lint
npm run typecheck
npm run build
```

如果某个命令不存在，必须明确说明未运行原因。
