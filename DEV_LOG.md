# 学脉自动开发记录

## 2026-06-06：PC Web 微信式 AI 教学工作台 MVP

### 本轮依据

- 参考 `/Users/wdlmacpro/Downloads/xuemai_codex_long_auto_dev_plan.md` 的阶段计划。
- 优先级：聊天输入引擎、任务卡状态机、按钮操作、会话独立、新建学生/班级、localStorage、搜索、待办、设置、mock 登录。

### 已完成

- 将 `XuemaiWorkbenchApp` 从单文件大组件拆成类型、mock 数据、聊天引擎、导航、聊天区、抽屉、设置/待办/登录、新建弹窗等模块。
- 实现 mock 登录，登录信息保存到 `localStorage`，未登录时显示登录页。
- 实现空会话输入、Enter 发送、普通 AI 回复、关键词意图识别和运行中任务卡。
- 实现任务卡逐步推进、完成卡、复制微信反馈、查看详情、标记已反馈、重新生成。
- 实现图片上传后的确认卡和“以后默认这样处理”偏好。
- 实现快捷任务 Chips、新建学生/班级、班级成员抽屉、聊天记录搜索、待办聚合、设置页、清空本地数据和退出登录。
- 继续保持 PC Web 三栏布局、紧凑会话列表、右侧独立滚动消息区和绿色微信式视觉风格。

### 验证

- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run dev -- --hostname 127.0.0.1 --port 3012`：启动成功。
- Browser 验收 `http://127.0.0.1:3012/`：
  - mock 登录成功。
  - 输入普通文本后出现老师消息和 AI 回复。
  - 点击“生成微信反馈”后任务卡运行并完成。
  - “查看详情”打开任务详情抽屉。
  - 新建学生后出现 `陈思远`。
  - 待办、设置入口可打开。
  - 浏览器 console error/warn 为空。
- 截图：`/private/tmp/xuemai-mvp-browser-qa.png`、`/private/tmp/xuemai-mvp-settings-qa.png`。

### 仍为 mock

- AI 回复、试卷识别、错题归因、微信反馈、学习记录、待办截止时间、登录鉴权均为本地 mock。
- 数据持久化使用 `localStorage`，尚未接 Supabase。
- 图片仅本地预览，不上传服务器，不做真实 OCR。

### 下一步

- 将 mock AI 逻辑迁移到 server-side API route，再接真实 OpenAI/OCR。
- 将 conversations/messages/taskCards 迁移到 Supabase Auth + Postgres。
- 补端到端测试脚本，覆盖登录、创建、上传、任务、搜索、刷新持久化。
