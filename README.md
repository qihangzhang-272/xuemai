# 学脉（Xuemai）

学脉是面向小学到高中学科类独立老师和教培机构的微信式 AI 教学服务工作台。

产品以学生为主线，把课堂记录、学生学习材料、学情分析、家长微信沟通、学生档案和月报连接起来。当前产品范围、页面、流程和验收标准统一以[产品需求文档](docs/product/product-requirements.md)为准。

Teaching Agent OS 是内部架构名称，不是用户可见的产品名称。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 风格本地组件
- lucide-react
- 后续接 Supabase Auth / Supabase Postgres
- 通过服务端 API route 调用 AI
- Vercel 部署

## 仓库结构

| 目录 | 用途 |
|---|---|
| `app/` | Web 页面与服务端路由 |
| `components/` | Web 通用组件和产品组件 |
| `src/` | Skill、工作流、数据与领域能力 |
| `lib/` | Web 侧工具和轻量业务适配 |
| `mobile/` | 移动端 Expo 应用 |
| `supabase/` | 数据库迁移和检查 |
| `tests/` | 自动化测试 |
| `docs/` | 正式项目文档与导航 |
| `public/` | 静态资源 |

文件和目录命名约定见 [CONTRIBUTING.md](CONTRIBUTING.md)，代码完成与合入条件见[代码验收标准](docs/development/code-acceptance-criteria.md)。

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://127.0.0.1:3016/dashboard`。`npm run dev` 已固定映射到 `dev:stable`，会先释放旧的 3016 监听并清理 `.next`，避免本地预览残留。

如果只想停止本项目预览监听：

```bash
npm run dev:stop
```

除非排查 Next.js 本身问题，否则不要直接使用 `npm run dev:raw`。

## 当前 AI 工具

- 识别模块：`lib/ai/practice-recognition.ts`
- 反馈模块：`lib/ai/wechat-feedback.ts`
- 识别 API：`POST /api/ai/practice-recognition`
  - 必填输入：`studentName`、`subject`、`images`
  - 图片规则：最少 1 张，最多 9 张，支持 PNG / JPG / WebP，使用 data URL 传入。
  - 输出：可编辑的练习类型、题目信息、分数/表现、错误原因、建议和月度总结素材。
- 反馈 API：`POST /api/ai/wechat-feedback`
  - 必填输入：`studentName`、`subject`、`correctedDraft`
  - 可选输入：`parentName`、`grade`、`materialTitle`、`scoreText`、`teacherNotes`、`nextPlan`、`tone`
  - 输出：微信反馈草稿，以及用于保存的月度总结素材。

## 当前原型工作台

访问 `/students/demo-student-1/feedback/new` 可以试用第一版闭环：

```txt
上传练习图片 -> AI 识别 -> 老师校正 -> 生成微信反馈 -> Mock 保存
```

这个闭环目前用于验证 Parent Feedback Agent 的产品流程。后续应接入 `src/agents/` 中的 Agent Registry、Shared Harness Core、运行日志和数据库生命周期，而不是继续扩展成一次性页面逻辑。

真实 AI 调用需要在 `.env.local` 配置：

```bash
AI_PROVIDER=deepseek
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=<your_deepseek_api_key>
AI_MODEL=deepseek-v4-flash
```

## 第一阶段可验收路由

- `/`
- `/login`
- `/dashboard`
- `/classes`
- `/classes/new`
- `/students`
- `/students/new`
- `/students/demo-student-1`
- `/students/demo-student-1/feedback/new`
- `/api/ai/practice-recognition`
- `/api/ai/wechat-feedback`
- `/settings`

## 检查命令

```bash
npm run lint
npm run typecheck
npm run build
```

## 项目文档入口

- [文档导航](docs/README.md)
- [当前产品 PRD V5.4.1](docs/product/product-requirements.md)
- [代码验收标准 V1.0](docs/development/code-acceptance-criteria.md)

正式文档使用稳定文件名，版本号记录在文档内部；历史稿、截图、审计过程和个人开发日志不作为仓库默认入口。

## 当前阶段边界

- 只做老师端。
- 登录页为临时免登录 UI。
- 所有数据来自 `lib/mock/data.ts`。
- 运行时暂不接 Supabase；已新增 Supabase migration，等待人工执行和后续 API 接入。
- 已提供服务端微信反馈生成工具；当前 UI 仍以 mock 展示为主。
- 默认模型提供方是 DeepSeek；模型层通过 OpenAI-compatible client 调用，配置统一读取 `AI_PROVIDER`、`AI_BASE_URL`、`AI_API_KEY` 和 `AI_MODEL`。
- `src/agents/` 已建立长期 Agent 架构骨架，后续 Phase 应优先接入 Harness Core 和数据生命周期。
- 不做家长端、学生端、小程序、支付、自动 OCR 批改、复杂教务系统。
