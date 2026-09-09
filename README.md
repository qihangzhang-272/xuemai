# 学脉 · Xuemai

面向中小学老师的课堂记录与家长反馈工作台。把课堂观察或学习材料整理成记录，经老师检查后生成家长反馈，让课后沟通更省时。

**选择学生 → 记录课堂或上传材料 → 检查结果 → 编辑并复制家长反馈**

学脉采用 Web / Mobile 自适应界面，支持本地运行。账号、数据库和文件存储独立，运行时不依赖其他教学项目。

## 功能

| 功能 | 说明 |
| --- | --- |
| 学生与班级 | 新建、编辑、搜索学生和班级，维护年级、科目、家长关系与学习目标 |
| 课堂记录 | 整理老师记录的学习内容与学生表现，保留原始输入，支持修改和失败重试 |
| 材料分析 | 上传作业图片或文档，整理可确认的学习表现与待核实内容 |
| 家长反馈 | 生成、编辑和复制反馈，手动标记已发送，支持调整语气与长度 |
| 学生档案 | 选择具体内容并确认入档，按时间查看学习记录 |
| 学生月报 | 根据指定月份的入档记录生成草稿，支持筛选素材、编辑和定稿 |
| 工作台 | 查看待反馈、整理中、失败记录与月报草稿 |
| 数据管理 | 独立账号登录、记录 JSON 导出、数据库与材料备份 |

**支持材料：** PNG、JPEG、WebP、PDF、DOCX、PPTX、UTF-8 TXT 和 Markdown。单个文件不超过 20 MB，每条记录最多关联 5 份材料。

## 技术栈

- **前端：** Next.js 15、React 19、TypeScript、Tailwind CSS
- **后端：** Next.js Route Handlers、Node.js 24+
- **存储：** Node.js 内置 SQLite、本地文件目录
- **AI：** 千问兼容接口，支持图文输入
- **文档解析：** MinerU
- **内容展示：** React Markdown、KaTeX
- **测试：** Vitest、真实接口与材料验收脚本

## 快速开始

### 1. 准备环境

- Node.js **24 或更新版本**，以及 npm、Git。
- 可用的图文模型 API Key；使用 PDF、DOCX、PPTX 时还需 MinerU Token。
- 生成内容和解析文档时，需要联网访问相应服务。

当前工作台使用 SQLite，无需额外安装数据库服务。

### 2. 下载并安装

```bash
git clone https://github.com/qihangzhang-272/xuemai.git
cd xuemai
npm ci
```

### 3. 配置环境变量

从示例文件创建 `.env.local`。

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填写 `QWEN_API_KEY`；需要文档解析时填写 `MINERU_API_TOKEN`。已有配置时直接编辑原文件。

### 4. 构建并启动

```bash
npm run build
npm start
```

打开 [http://127.0.0.1:3016](http://127.0.0.1:3016)，在登录页创建学脉账号，然后添加学生开始使用。仓库不提供默认登录密码，也不包含本机账号和学生数据库。

Windows 也可在配置完成后执行 `./start.ps1`。该脚本会在缺少依赖或构建时先安装、构建，再启动服务。

开发模式使用 `npm run dev`。开发与生产模式使用同一端口和构建目录，请一次只运行一个实例；更新生产代码时，先停止服务，再构建并重新启动。

## 配置说明

所有配置均在服务端读取，完整模板见 [.env.example](.env.example)。

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `QWEN_API_KEY` | 空 | 生成记录、分析和反馈时必填 |
| `QWEN_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 模型接口地址 |
| `QWEN_MODEL` | `qwen3.6-flash` | 模型名称；分析图片需要图文能力 |
| `MINERU_API_TOKEN` | 空 | PDF、DOCX、PPTX 解析时必填 |
| `MINERU_API_BASE_URL` | `https://mineru.net/api/v4` | 文档解析接口地址 |
| `XUEMAI_DATA_DIR` | `.xuemai-data` | 数据库、上传原件与解析文件目录 |
| `XUEMAI_HTTPS` | `false` | HTTPS 部署时设为 `true`，启用安全会话 Cookie |
| `XUEMAI_ORIGIN` | 空 | 反向代理部署时填写外部访问源，如 `https://xuemai.example.com` |

`.env.local`、数据库、上传材料和运行日志均由 Git 忽略，不应提交到仓库。调用模型及文档解析服务时，相关材料会提交给配置的服务商。

## 使用流程

1. **添加学生。** 填写姓名、年级与科目；需要时补充班级和家长资料。
2. **记录这节课。** 选择学生，写下学习内容与具体表现，或上传学习材料。
3. **检查结果。** 阅读完整正文，核实并修改后整理家长反馈。
4. **复制反馈。** 检查称呼和措辞，复制到微信等渠道发送；发送后手动标记已发。
5. **按需入档。** 勾选要留在档案里的内容，再确认入档。月报从这些入档记录中选择素材。

复制、标记已发和入档是三个独立操作。生成反馈不要求先入档，复制也不会自动发送消息。已发送、已入档或已定稿的正文通过另建更正记录修订。

## 开发与测试

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务，地址为 `127.0.0.1:3016` |
| `npm run build` | 构建生产版本 |
| `npm start` | 启动已构建的生产版本 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | 检查当前工作台和后端代码 |
| `npm test` | 运行当前独立项目的测试 |
| `npm run test:smoke` | 调用真实模型，检查记录、反馈、入档、月报及账号隔离 |
| `npm run test:materials` | 验证图片、PDF、DOCX、PPTX 的真实解析与分析 |
| `npm run test:source` | 运行原始源码保留的历史原型测试 |
| `npm run backup` | 备份本机数据库与材料 |

提交代码前运行：

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

真实接口测试需要先启动服务、配置模型和解析服务，会产生相应 API 调用。`test:smoke` 默认创建临时验收账号，使用合成学生数据，账号信息保存在本地 `output/.smoke-access.txt`。

执行 `test:materials` 前，先完成 `test:smoke`，再通过 `XUEMAI_SMOKE_USER` 和 `XUEMAI_SMOKE_PASSWORD` 环境变量指定同一验收账号。该账号包含脚本所需的合成学生和班级。结果分别写入 `output/http-smoke.json`、`output/material-smoke.json`。

## 项目结构

```text
app/api/xuemai/                 独立业务接口
components/xuemai-workbench/    当前工作台界面
lib/xuemai/                     账号、存储、记录与 AI 工作流
lib/mdt/                        复制复用的解析与安全工具
public/                        静态资源
scripts/                       启动、备份与验收脚本
tests/xuemai-*.test.ts          当前项目测试
tests/fixtures/xuemai/          合成验收材料
docs/implementation/           需求依据、范围与验收文档
.env.example                   环境变量模板
```

仓库同时保留原始前端中的 `mobile/`、`supabase/` 和其他研究、原型代码，便于追溯与参考。当前运行入口为 `components/xuemai-workbench/XuemaiWorkbenchApp.tsx`，业务接口为 `/api/xuemai/`；历史目录不代表已接入的产品能力。

## 数据与备份

默认数据保存在项目根目录的 `.xuemai-data/`：

```text
.xuemai-data/
├── xuemai.sqlite    账号与业务记录
├── uploads/         上传原件
└── artifacts/       文档解析结果
```

备份前等待上传与生成任务结束，再执行：

```bash
npm run backup
```

备份写入 `output/backups/<时间戳>/`，包含数据库和材料。恢复时停止学脉，将备份放入一个新的数据目录，设置 `XUEMAI_DATA_DIR` 后重新启动。恢复前保留旧目录，确认恢复成功后再处理旧数据。

页面中的 JSON 导出用于留存记录，不包含上传文件本体，不能替代完整备份。

## 部署

当前实现适合**单机、单实例、持久磁盘**运行。生产启动脚本固定监听 `127.0.0.1:3016`。

部署到服务器时：

1. 安装 Node.js 24+，克隆代码并完成环境配置。
2. 将 `XUEMAI_DATA_DIR` 指向持久数据目录，保留后续升级可复用的数据库与材料。
3. 执行 `npm ci`、`npm run build`，通过进程管理工具运行 `npm start`。
4. 如需外部访问，在同一服务器上配置 HTTPS 反向代理至 `127.0.0.1:3016`，并设置 `XUEMAI_HTTPS=true` 与实际的 `XUEMAI_ORIGIN`。代理超时和上传大小需覆盖文档处理请求。

可用 `GET /api/xuemai/health` 检查服务是否响应。该接口返回项目与数据库类型，不校验模型密钥或文档解析服务是否可用。

当前启动方式需要可写文件系统，不适用于临时文件系统或多实例共享写入。GitHub Pages 只能托管静态内容，不能运行本项目的完整服务端。

## 当前范围

- AI 结果需要老师审核；空白试卷、纯教材或无法辨认的材料不能作为学生能力证据。
- 微信直连、机构协作、批量服务、完整题库、自动批改和复杂排课尚未纳入当前版本。
- 当前不提供备课和日报的新建入口，历史记录仍可查看。
- 尚未完成真实教师试用和多用户压力测试。

需求与验收文档：[PRD V5.4.1](docs/implementation/source-prd.md) · [本期功能范围](docs/implementation/2026-09-06-会议与PRD交付范围.md) · [最近一次功能验收](docs/implementation/2026-09-08-文案与仓库验收.md)

## 参与贡献

欢迎通过 [Issues](https://github.com/qihangzhang-272/xuemai/issues) 反馈问题，或提交范围明确的 Pull Request。请提供复现步骤、预期结果和实际结果；使用合成或脱敏材料，勿附账号密码、API Key 或真实学生资料。

协作流程见 [CONTRIBUTING.md](CONTRIBUTING.md)，当前范围和代码约定见 [AGENTS.md](AGENTS.md)。

## 许可证

本项目根目录尚未设置统一的 `LICENSE` 文件。原始代码和第三方组件中的版权声明予以保留，包括 [mobile/LICENSE](mobile/LICENSE)。
