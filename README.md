# 学脉 · 独立教学服务工作台

直接使用用户提供的学脉 Web / Mobile 前端源码。唯一工作台为 `components/xuemai-workbench/XuemaiWorkbenchApp.tsx`，自写的 `components/xuemai-live` 前端已删除。保留原版组件、配色、字体、布局和样式，只适配真实接口、数据状态及必要的手机详情宽度。

核心流程为：记录课堂 / 上传材料 → AI 整理 → 老师检查 → 家长反馈 → 复制到微信 → 手工标记已发 → 确认入档 → 月报复用。

本项目有自己的 Git、账号、数据库、上传目录和启动入口。可关闭原教学项目，学脉的独立账号与已导入数据仍可使用。AI 与文档解析需要联网访问已配置的模型 / MinerU 服务。

## 快速启动

需要 **Node.js 24 或更新版本**，使用其内置 SQLite，不需要安装 PostgreSQL、Redis 或 Supabase。

```powershell
npm ci
Copy-Item .env.example .env.local
# 编辑 .env.local，填写自己的模型及文档解析配置
npm run build
npm start
```

访问 **http://127.0.0.1:3016**。Windows 也可以运行 `./start.ps1`；它在缺少依赖或构建时先完成安装 / 构建，再启动。启动程序不会清理或终止其他占用端口的服务。

开发使用 `npm run dev`。不要同时运行开发实例与生产实例，也不要在开发实例运行时重建 `.next`。

这台电脑上的 `.env.local` 已复用现有项目的千问 / MinerU 服务配置。源码压缩包不会携带凭据。体验账号在 Git 忽略的 `.local-access.txt` 中；页面中“演示”学生及课堂记录均为合成测试内容。正式使用可以在登录页创建一个自己的学脉账号，账号之间数据隔离。

## 已实现的工作流

- 独立账号注册、登录、退出；也可用原教学后端教师账号登录。
- 使用原版表单新建与编辑学生、班级，保存教学目标与服务规则，学生 / 班级搜索。
- 课堂记录、AI 备课、学生学习材料分析；原输入在调用模型前保存，失败保留来源且支持重试。
- PNG / JPEG / WebP 图片、PDF、DOCX、PPTX、UTF-8 TXT / Markdown；每份不超过 20 MB，一次最多 5 份材料。
- 原始材料下载、AI 原稿与老师修订版本对照。
- 家长反馈生成、修订、复制与手工标记已发。应用不会给任何微信联系人自动发消息。
- 学生档案确认与不可变正文快照；修改已发送或已入档正文需要另建记录。
- 学生日报／月报：点击“学习报告”（班级内为“学生报告”），先选择学生与日期或月份，再引用该范围内已入档的课堂 / 分析记录。无可用记录时可直接前往学生会话补充。
- 工作台真实统计、待反馈清单、已入档清单与最近服务记录。
- 反馈语气偏好、原教学后端班级导入、记录 JSON 导出和本机备份。
- 原版侧边追问使用真实 AI；追问对话仅保留在当前页面，不自动写入学生档案。
- 桌面三栏工作台与手机网页布局。

空白试卷和教材不作为个体能力证据；老师补充并明确核实学生表现后才允许反馈及入档。AI 生成内容仍需教师检查。

## 与原教学项目的关系

复制复用的能力：MDT 的 MinerU 解析器、文件安全校验、UTF-8 正文质量校验、密码散列与校验。新项目沿用千问兼容接口配置及单任务、失败可追溯的实现原则，未复制旧项目数据库。

可选 MDT 连接只用于原账号登录以及 **GET 读取**：

| 用途 | 原后端接口 |
| --- | --- |
| 登录 | `/api/auth/csrf`、`/api/auth/callback/credentials`、`/api/auth/session` |
| 班级列表 | `/api/teacher/classes` |
| 学生及作答统计 | `/api/teacher/classes/{classId}/analytics/students` |

在“设置 → 教学后端”连接后，点击“读取班级列表”，按班级主动导入。导入到学脉的是独立副本，重复导入不会覆盖老师在学脉修改的资料；不会复制虚构的学情记录，也不会回写 MDT。学情读取接口保留，原版前端未新增统计页面。

本期本地备课、课堂记录、反馈和月报全部由学脉服务完成。不会为了调用旧出题接口而在原数据库创建课节。

## 配置与数据

| 配置 | 说明 |
| --- | --- |
| `QWEN_API_KEY / QWEN_BASE_URL / QWEN_MODEL` | 千问兼容模型，支持图文输入 |
| `MINERU_API_TOKEN / MINERU_API_BASE_URL` | PDF / DOCX / PPTX 解析 |
| `MDT_BASE_URL` | 可选原教学后端地址 |
| `XUEMAI_DATA_DIR` | 默认 `.xuemai-data`，包含 SQLite、上传原件和解析工件 |
| `XUEMAI_HTTPS / XUEMAI_ORIGIN` | 在 HTTPS 反向代理环境中按实际来源配置 |

所有密钥仅在服务端读取，浏览器只收到必要业务数据。源码和构建不依赖其他项目目录。`.xuemai-data` 必须放在持久磁盘，不应使用临时或只读托管文件系统。

`npm run backup` 将数据库和材料备份到 `output/backups/时间戳`。完整备份建议在没有处理中的上传 / AI 任务时执行。恢复时先停止学脉，在新数据目录放入备份文件，再设置 `XUEMAI_DATA_DIR` 指向该目录；不覆盖或删除旧数据。JSON 导出用于资料留存，不包含原文件二进制，不等于完整备份。

## 验证命令

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

默认测试覆盖本期独立项目规则和复制的 MinerU 解析器。`npm run test:source` 可运行压缩包保留的全部历史研究 / 原型测试；这不代表对应功能被纳入本期。

真实端到端检查需要启动服务并配置可用模型，会产生少量模型调用：

```powershell
# 不指定账号时，脚本自动创建临时本机账号并保存到 .local-access.txt
npm run test:smoke
# 仓库已附带合成测试素材，使用同一验收账号
$env:XUEMAI_SMOKE_USER = '你的验收账号'
$env:XUEMAI_SMOKE_PASSWORD = '你的验收密码'
npm run test:materials
# MDT 连接只读验收
$env:MDT_TEST_IDENTIFIER = '你的原教学后端教师账号'
$env:MDT_TEST_PASSWORD = '你的原教学后端教师密码'
npm run test:mdt
```

验收结果位于 `output/http-smoke.json`、`output/material-smoke.json`、`output/mdt-smoke.json` 和 `output/qa/`。范围与开发依据见 `docs/implementation/开发计划.md`；最终验收事实见 `docs/implementation/验收报告.md`；2026-09-05 的产品细节复测见 `docs/implementation/2026-09-05-产品细节检查.md`。

## 当前交付边界

本期覆盖课堂记录、材料分析、反馈与入档的教学服务闭环，不包含完整 PRD 中的微信消息直连、机构角色协作、小程序、排课收费、自动批改或出题。原版表单中的课时、提醒及反馈规则会保存，但没有后台定时调度。批量生成与班级自动拆分入口尚未接通，应逐位进入学生会话处理；相关服务端接口保留。未提交的输入、上传预览和侧边追问不保证刷新保留。

这是适合单机、单实例使用的独立项目。SQLite 不用于多实例共享写入；AI 请求和文档任务在当前服务中执行，中断超过 12 分钟后显示失败供重试。本轮没有部署公网，没有宣称完成真实教师课堂 UAT。
