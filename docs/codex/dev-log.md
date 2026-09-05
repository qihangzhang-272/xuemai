# Codex Dev Log

## Phase 20：原学脉工作台总览优化

### 本阶段完成

* 在原有微信式 UI 上重做一级“工作台”，工作台为完整独立页面，仅保留窄一级导航，不再携带学生/班级聊天边栏；进入“聊天”后才恢复会话列表与上下文面板。
* 新增待反馈、待回复、待检查、需关注四类可下钻指标，以及可搜索、筛选、预览并直达对应会话的待处理工作清单。
* 新增多选与批量生成反馈草稿、安排跟进、分配负责人交互；批量结果按学生独立保留，家长反馈仍需逐项检查，学生档案不允许一键批量确认。
* 补充今日行程、当前事项与批量操作边界，完成桌面端和 390px 移动端页面与导航验收。

### 验证结果

* `eslint`、`tsc --noEmit`、62 个测试文件共 474 条测试及 Next.js production build 全部通过。
* 浏览器验证工作台无聊天边栏、筛选结果正确、批量弹窗与完成状态可用，“去处理”能进入对应学生聊天。

### 下一阶段

* 使用真实老师样本验证事项排序、状态命名和批量动作是否符合每日工作顺序，再决定机构总览的进一步扩展。

## Phase 19：教培老师痛点产品 Demo

### 本阶段完成

* 新增独立 `/teacher-demo`，以“今天先处理什么”为首页，聚合待反馈、待回复、待检查和需关注事项。
* 打通快速记录、学生材料、家长消息、证据摘要、反馈草稿编辑、标记已发、可选入档和完整分析查看。
* 新增学生连续档案、班级公共记录与逐学生服务状态；批量能力只生成个体草稿，不替代老师逐项确认。
* 完成桌面三栏与 390px 移动端响应式验收，并覆盖任务完成、快速记录、分析抽屉、学生时间线与班级视图交互。

### 验证结果

* `eslint`、`tsc --noEmit`、62 个测试文件共 474 条测试及 Next.js production build 全部通过。
* 浏览器验收无控制台错误；Demo 使用独立本地状态，不改变既有 `/dashboard` 与 `/workbench-v2`。

### 下一阶段

* 用 Demo 访谈真实老师，优先验证事项队列、家长回复和课后反馈是否比传统模块导航更省时间，再决定并入正式产品的页面范围。

## Phase 12：LessonLedger v2 前端还原压缩

### 本阶段完成

* 将成绩记录、薄弱点记录和开放预约时段三个高频弹窗从通用表单改为两栏操作面板。
* 成绩弹窗新增学生、家长、考试、日期、成绩、排名预览，并说明保存后进入阶段学习报告。
* 薄弱点弹窗新增严重程度标签、归档位置和后续加强动作预览。
* 开放预约弹窗新增多日选择后的开放预览、家长端可选次数、覆盖已有课程提示和日期状态表。
* 课程新增/编辑弹窗改为排课操作面板，保存前展示对象、类型、时长、人数、应收、课时变化、冲突检测和后续同步位置。
* 课后反馈弹窗压缩为生成依据、三项输入、附件、AI 状态、反馈正文和家长端预览的一体面板，并修复 390px 移动端底部操作按钮裁切。
* 今日课程表移除旧的模拟 preset 行，改为完全读取真实课程数据；一对一待上课行展示“已上课 / 学生缺席 / 取消”，已完成待反馈行展示“去反馈”，真实班课行展示“开始点名”。

### 关键变化

* 影响 `/workbench-v2` 竞品还原的前端 fidelity，不改变旧 `/dashboard`、后端合同或真实数据结构。
* Chrome/CDP 已验证桌面和 390px 移动视口都能打开目标弹窗，且无横向溢出；移动端反馈按钮区已验证不被裁切，今日课程状态按钮已验证真实班课/一对一操作不串行。

### 遗留问题

* 当前仍是可演示级还原，不是逐帧像素级复刻；后续还需按视频关键帧继续抠课程编辑、空数据和极端移动端状态。

## Phase 11：LessonLedger v2 后端闭环

### 本阶段完成

* 明确 `/workbench-v2` 竞品还原阶段选择 TypeScript / Next Route Handlers 作为后端实现，不额外引入 Go 服务。
* 补充 `docs/product/lessonledger-v2-backend.md`，记录 API route、service、repository、types、seed 的职责边界。
* 新增服务模块重载后的文件持久化测试，证明学生建档和课时流水可从本地 JSON store 恢复。

### 关键变化

* 影响 LessonLedger v2 后端可接续性和验收证据，不改变旧 `/dashboard`。
* 当前仍是单机本地文件后端，适合竞品还原和演示；多人生产部署前仍需迁移到正式数据库与登录态。

## Phase 0：Codex 文档治理

### 本阶段完成

* 归档 Teaching Agent OS v1.2 完整指导书，作为长期架构来源。
* 将根目录 `AGENTS.md` 升级为 v1.2 项目规则。
* 建立 `task-plan.md`、`dev-log.md`、`decision-log.md` 三个轻量接续入口。
* 明确停止流水账式开发日记，后续只写 Phase 总结与关键架构决策。

### 关键变化

* 影响开发流程与后续 Codex 接续方式，不改变业务代码、数据库、API 或 UI 主流程。
* 后续文档记录从“每日流水账”调整为“阶段总结 + 关键决策”。

### 遗留问题

* Phase 1 仍需创建 Shared Harness Core、Agent Registry 和数据库生命周期方案。

### 下一阶段

* Phase 1：完成长期架构基础目录与 Parent Feedback Agent 可扩展骨架。

## Phase 1：长期架构基础骨架

### 本阶段完成

* 补强 `AGENTS.md`，明确 `src/agents/` 是长期 Agent 架构边界。
* 校正 `README.md` 的旧 MVP 和开发日记入口表述，避免误导后续接手。
* 新建 `docs/harness/` 与 `docs/product/`，沉淀 Harness 和产品长期定位。
* 新建 Agent Registry、共享 Agent 类型、Parent Feedback Agent 类型骨架。
* 创建 Shared Harness Core 与未来多 Agent 目录占位。

### 关键变化

* 影响长期架构边界，不改变现有 UI、业务页面、API 行为或数据库。
* Parent Feedback Agent 被定位为第一条链路，其他 Agent 以 planned skeleton 方式预留。

### 遗留问题

* 尚未落地数据库表、Supabase Auth、RLS、Agent 运行日志和真实保存链路。

### 下一阶段

* Phase 2：设计并落地支持 AI 输出生命周期的数据库模型与迁移策略。

## Phase 2：数据模型升级

### 本阶段完成

* 检查仓库内暂无既有 Supabase migration 或 SQL schema。
* 新增非破坏式 v1.2 schema migration，覆盖班级、学生、关系表、Agent 运行、AI 输出、错题、偏好、反馈历史和编辑事件。
* 明确 AI 草稿、老师确认反馈和长期学习记录分层。
* 添加查询索引，并保留 Auth/RLS 接入前的权限 TODO。

### 关键变化

* 影响数据库、Agent 输出生命周期、权限边界和后续持久化 API。
* 不改变现有 UI、路由或 mock 工作台行为。

### 遗留问题

* 远端 Supabase 真实旧表未知；执行前需人工确认是否有同名旧表、重复关系或 teacher_id 回填问题。

### 下一阶段

* Phase 3：实现 Shared Harness Core 的接口与薄适配层，为 Parent Feedback Agent 正式 workflow 做准备。

## Phase 3：Shared Harness Core 运行骨架

### 本阶段完成

* 补齐 Agent Registry 查询函数，并保留多 Agent planned 状态。
* 新增统一 run lifecycle、status、runner wrapper 和隐私安全日志接口。
* 新增 context、tools、evaluation、guardrails、recovery 通用骨架。
* 将 JSON、tool calling、strict structured outputs 的模型兼容边界继续留在 shared/model。

### 关键变化

* 影响 Harness 分层、Agent 运行生命周期、日志结构和后续 API 组织方式。
* 不改变现有 UI、路由、数据库 schema 或 Parent Feedback Agent 业务流程。

### 遗留问题

* Supabase run logger 仍是 TODO placeholder，需等 Auth teacher_id 边界明确后接入。
* 当前 evaluator 和 guardrails 是通用框架，Phase 4 需补 Parent Feedback 专用规则。

### 下一阶段

* Phase 4：基于 Shared Harness Core 实现 Parent Feedback Agent 后端核心。

## Phase 4：Parent Feedback Agent 后端核心

### 本阶段完成

* 新增 Parent Feedback Agent 的 contract、prompt、context、guardrails、evaluator、recovery、workflow 和 API route。
* 接入 shared/model、shared/context、shared/logging、shared/guardrails、shared/evaluation 和 shared/recovery。
* 新增最小 Supabase server adapter，读取学生、已确认学习记录、错题和老师偏好。
* 将 AI 草稿写入 `agent_outputs`，并更新 `agent_runs` 运行状态和安全日志字段。

### 关键变化

* 影响 Agent 后端 API、运行日志、AI 草稿生命周期和 Phase 5 确认保存入口。
* 不改变 UI，不写 `feedback_history`，不写 `student_learning_records`，不更新学生画像，不做外部发送。

### 遗留问题

* 当前 `teacherId` 暂从请求体传入且要求为 uuid；后续必须从 Supabase Auth session 派生。
* `agent_runs.teacher_id` 是 uuid，示例 mock 字符串不能直接用于真实数据库写入。
* Phase 5 需要实现老师确认保存逻辑，并在 Auth/RLS 接入后调整服务端 Supabase client。

### 下一阶段

* Phase 5：实现老师确认保存逻辑，把确认后的草稿写入 `feedback_history` 和可进入长期档案的学习记录。

## Phase 5：老师确认保存逻辑

### 本阶段完成

* 新增确认保存接口，将 `agent_outputs` 草稿转为老师确认后的反馈记录。
* 保存时写入 `feedback_history` 和 `student_learning_records`，并把 `confirmed_by_teacher` 标记为 true。
* 老师编辑过反馈时记录 `teacher_edit_events`，同时更新 `agent_outputs` 为 confirmed 或 edited。
* 保留 Auth TODO，当前 `teacherId` 仍来自请求体并做 ownership 校验。

### 关键变化

* 影响数据生命周期和 API 主流程：AI 草稿与老师确认事实正式分层落地。
* 不自动发送微信，不自动更新 `students` 学生画像。

### 遗留问题

* Auth/RLS 未接入前，`teacherId` 仍存在可伪造风险，需要后续从 session 派生。

### 下一阶段

* Phase 6：把生成、编辑、复制、保存流程接入学生详情页。

## Phase 6：学生详情页接入

### 本阶段完成

* 在学生详情页接入 Parent Feedback Agent 面板。
* 支持老师填写课堂表现、错题摘要和语气要求后生成家长反馈草稿。
* 支持编辑反馈文本、复制到剪贴板、确认保存到学生记录。
* 保存成功后显示“已保存到学生记录，可用于后续月报”。

### 关键变化

* 影响 UI 主流程：Parent Feedback Agent 从后端 API 变成老师可操作的闭环入口。
* UI 仍只负责展示和确认，Agent workflow 与持久化逻辑保持在后端。

### 遗留问题

* 页面仍使用临时 mock `teacherId`，上线前必须接入 Supabase Auth。

### 下一阶段

* Phase 7：执行页面到 Supabase 的真实端到端验证。

## Phase 7：端到端验证

### 本阶段完成

* 通过学生详情页完成填写、生成、编辑、复制和保存全链路测试。
* Supabase 只读核验确认 `agent_runs` 写入 success，`agent_outputs` 更新为 edited 且 `is_final=true`。
* 确认 `feedback_history`、`student_learning_records` 和 `teacher_edit_events` 均有对应记录。
* 静态扫描未发现 `students` 自动更新路径。

### 关键变化

* 验证了 Parent Feedback Agent 第一条交付链路真实闭环。
* 长期档案仍只接收老师确认后的 `student_learning_records`。

### 遗留问题

* 当前测试使用固定测试学生和临时老师 ID；正式多老师场景必须先完成 Auth/RLS。

### 下一阶段

* Phase 8：同步项目文档，随后优先进入 Auth/RLS。

## Phase 9：PRD v3 Workflow-first 对齐

### 本阶段完成

* 将最新 PRD v3、首次开发提示词和短版 AGENTS 护栏平移进项目。
* 新增工程执行摘要与 AI Skill 规范，明确当前主线是微信式 Skill Workflow MVP。
* 新增 `src/skills` 的 Registry、类型、动作标签和 mock Runner。
* 将当前工作台 Skill 胶囊改为从 Registry 读取，SkillCard mock 结果改为通过 Runner 生成。

### 关键变化

* 前台产品主线从较重的多 Agent 叙事收敛为 Workflow-first Skill Shell；`src/agents` 暂作为后端能力储备，不继续扩复杂 Agent。

### 遗留问题

* 当前 Skill Runner 仍为 mock，尚未持久化 `skill_runs`、`skill_cards` 或事件流。
* 既有 `agent_runs` / `agent_outputs` 与 PRD v3 `skill_runs` / `skill_cards` 的数据库映射需在 E3 决定。

### 下一阶段

* E2：补齐 mock Skill Runner 事件模型，让所有 SkillCard 操作都可追踪、可回放、可调试。

## Phase 10：K12 学习材料专业测评 Skill

### 本阶段完成

* 为 `analyze_learning_evidence` 补齐专业测评型合同：材料类型/科目/学段识别、逐题分析、老师版报告、家长反馈草稿、月报快照与月度对比种子。
* 明确 DeepSeek/文本模型只消费 `VisionEvidencePacket`，图片、PDF、手写和题目切分必须由 OCR/Vision/Layout 先结构化。
* 新增本地评测 harness，覆盖 99% 高置信正误目标、证据不足拒判、老师确认路由、家长反馈安全、月报字段和模型可替换合同。
* 新增数据集级验收规则：合成样例只做冒烟测试；真实 99% 宣称必须依赖脱敏人工 gold 标注、双人标注和分歧仲裁。
* 新增文件化评测入口，支持内联 JSON 或相对路径 `gold_path` / `analysis_path`，便于后续替换模型和 OCR/Vision Provider 后复用同一批 gold set。
* 新增 `npm run eval:k12-material` 手动验收命令；默认要求 `claimable99Correctness=yes`，synthetic smoke fixture 必须显式开启 `XUEMAI_EVAL_ALLOW_SMOKE=1`。
* 学生月报 mock 改为通过确认快照聚合器生成：只读取老师确认后的学习材料快照，过滤未确认、非本学生、非本月素材，并在缺少本月或上月确认素材时输出依据不足而不是编造趋势。
* 月报聚合器继续扩展为统一确认素材池：已确认学习记录、已确认家长反馈和老师备注可以进入服务型月报；但逐题、知识点和题型趋势仍必须依赖已确认学习材料快照。
* 学习材料分析文本推理层改为 provider-agnostic adapter：`createLearningMaterialAnalysisModel` 通过 shared model 层调用 OpenAI-compatible provider，DeepSeek 工厂保留为兼容别名；模型输出统一解析为 `StudentLearningMaterialAnalysis` 并补充 provider/model 元数据。
* 新增真实模型输出文件生成入口：`npm run generate:k12-analysis-output` 可从 `VisionEvidencePacket` 文件生成 `StudentLearningMaterialAnalysis` JSON，作为人工 gold dataset 的 `analysis_path`；降级输出默认拒绝落盘，显式允许时也只能用于调试。
* 新增人工 gold 标注包协议与校验入口：`student_learning_material_gold_label_package.v0.1` 要求双人标注、分歧仲裁、脱敏和逐题证据依据；dataset 可直接引用 `gold_label_package_path`。
* 新增用户可见结果装配层：把通过校验的分析 JSON 转成 `teacher_report`、`parent_feedback` 和 `monthly_result`，老师报告使用来源标签，内部证据引用仅保留在来源映射中。
* 根据公开检索资料新增大陆 K12 课程/评价参考模块：覆盖义务教育 2022、高中 2017/2020、初中学业水平考试命题和教育评价改革的工程化边界，用于学段/学科识别、报告能力维度和不匹配风险提示。
* 新增最终用户结果文件生成入口：`npm run generate:k12-user-result` 支持从已有分析 artifact 或完整 VisionEvidencePacket 链路生成老师报告、家长反馈和月报结果 artifact。
* 前台分析详情面板已优先消费 `StudentLearningMaterialUserFacingResult`：老师报告、逐题分析、家长反馈和月报比较使用同一个最终结果对象展示，旧 mock 报告只作为兼容兜底。
* 新增确定性材料预分类器：从 `VisionEvidencePacket` 中识别材料类型、科目、学段、年级候选和地区/教材线索，prompt 与降级分析复用同一结果；补充月考、周测、空白模板、学段科目冲突和十二年级误判防护测试。
* 新增逐题证据就绪度 gate：每题在模型前计算是否允许确定性正误，模型输出后再次校验；缺少答案依据、缺少学生答案、题目切分不稳或低置信证据会强制降级为老师复核。
* 逐题证据就绪度 gate 已接入外部答案/评分点 side input：只有显式映射到同一 `question_id` 的 `answerKeys` / `rubrics` 才能作为该题答案依据；映射错误、缺少学生答案或题目切分不稳仍会进入老师复核。
* 新增评测资产清单校验入口：`npm run validate:k12-eval-assets` 会在正式 dataset eval 前检查 `VisionEvidencePacket`、外部答案/评分点 side input、双标仲裁 gold 包、证据引用和逐题 readiness 是否互相支撑，避免把证据链不完整的样本混入 99% 验收集。
* 补充 OCR/Vision/Layout 开源项目评估：PaddleOCR/PaddleX 暂定为第一真实 Provider 候选，Pix2Text、Surya、MinerU、RapidOCR、CnOCR、DocLayout-YOLO、LayoutParser、MMOCR、Marker、MonkeyOCR、olmOCR、DeepSeek-OCR 作为专项或对照候选；没有项目可以直接替代本 Skill 的逐题证据链和 human gold 验收。
* `VisionEvidencePacket` 增加 polygon 几何和可选 pipeline trace 元数据，用于记录 OCR/Layout/Vision 各阶段 provider、model version、confidence、输出引用和风险标记。
* 题目证据 gate 收紧：缺少 `crop_ref` 的 bbox-only 视觉区域会被视为题目切分不稳，进入老师复核；评测资产清单报告也新增材料/学科/学段/provider/side input 覆盖统计。
* 新增 provider-neutral `vision-adapter.ts`：真实 Provider 输出先归一化为 `VisionEvidencePacket`，自动记录 provider/model/stage trace、四类基础 gate、稳定 evidence_ref，并通过测试覆盖完整证据、缺 crop_ref、无学生痕迹三类关键边界。
* 新增 Provider 文件生成入口：`npm run generate:k12-vision-packet` 可把外部 OCR/Vision adapter 输入文件生成为已校验的 `VisionEvidencePacket` artifact，作为后续 `generate:k12-analysis-output`、`generate:k12-user-result` 和 dataset eval 的前置资产。
* 收紧 99% 可宣称策略：即使 human-labeled dataset 指标全绿，也必须覆盖足够的可硬判题、需复核题、材料类型、学科、primary/middle/high 学段和地区/教材线索，否则 `claimable99Correctness` 仍为 no。
* 新增学习材料月报素材确认边界：`monthly-snapshot-archive.ts` 会把分析 Skill 的未确认月报候选快照复制为带老师、SkillRun、archive record 和确认时间的已确认素材副本；月报聚合继续只读取这些确认副本，不直接读取 AI 原始草稿。
* 新增月报文件化生成入口：`npm run generate:k12-monthly-report` 可读取已确认学习材料快照、已确认学习记录、家长反馈、老师备注和上月素材，生成可回放的 `student_monthly_report_v1` artifact，便于后续真实样本和 Provider/模型切换回归。
* 扩展评测资产清单预检：`validate:k12-eval-assets` 现在可交叉校验 `analysis_path`、`result_path` 和 `monthly_report_path`，确保 VisionEvidencePacket、人工 gold、老师报告、家长反馈和月报 artifact 指向同一学生、同一材料和同一分析链路。
* OCR/Vision adapter 的 `pipeline_trace.provider_candidates` 现在固定记录选中 Provider、PaddleOCR/PaddleX 第一候选、Pix2Text/Surya/MinerU 等 benchmark 或专项候选及许可/部署复核说明；校验器要求候选清单包含当前选中 Provider 的 `primary_candidate`，避免真实 Provider 切换时只留下不可追溯的原始输出。
* 扩展确定性材料预分类器的地区/教材线索：在不猜测地区的前提下，新增大陆省级行政区、常见省会/重点城市、全国卷/新高考卷种和常见教材版本识别；测试覆盖北京、上海、四川、湖北、新疆等样例，继续把“未出现证据”保留为未识别。
* 继续增强地区/教材线索识别：补充更多大陆常见地市线索，并在同一材料命中多个地区或多个教材版本时输出复核 warning、降低分类置信度，避免把冲突来源硬判成唯一确定分类。
* 收紧材料分类评测口径：`materialClassificationAccuracy` 现在同时计算材料类型、科目、学段、年级候选和地区/教材线索，评测资产清单也会拒绝 `analysis_path` 中年级或地区/教材与仲裁 gold 不一致的产物，避免后续 99% 验收漏掉大陆 K12 识别细节。
* 新增 human gold 标注起点命令：`npm run generate:k12-gold-label-template` 会从已校验的 `VisionEvidencePacket` 生成双 reviewer 待标注草稿包，自动带上逐题证据 basis；草稿默认脱敏标记为 false 且没有仲裁结果，明确不能作为 99% claim 证据，必须人工完成脱敏、双标和仲裁后再跑 `validate:k12-gold-labels`。
* 新增评测资产清单生成命令：`npm run generate:k12-eval-assets-manifest` 可从多 case 资产路径列表生成 `student_learning_material_evaluation_assets.v0.1`，自动把路径转成相对 manifest 的可回放引用，并立即调用现有预检器，减少真实样本进入 `validate:k12-eval-assets` 前的手工 JSON 组装错误。
* 新增评测 artifact 批处理命令：`npm run generate:k12-eval-artifacts` 从已有 `analysis_path` 的资产清单批量生成老师报告/家长反馈 result artifact，并可在显式老师确认元数据存在时生成月报 artifact；命令写出更新后的 manifest 并立即预检，不在批处理里隐式调用实时模型。
* 补充 human gold dataset 标注工具调研：Label Studio 作为第一标注台候选，CVAT 用于题目区域、bbox/polygon、学生作答区域和批改痕迹的视觉 gold/QC，X-AnyLabeling 仅作为离线实验选项；任何工具导出都必须转换为 gold package 和 `VisionEvidencePacket` 对齐证据引用。
* 资产清单预检现在显式输出 `claimable99AssetReady` 与阻断原因；结构预检 PASS 仍可能因为样本量、学科/学段/地区覆盖、可硬判/需复核题覆盖或 artifact 覆盖不足而不能支撑 99% claim。
* 新增 annotation import 转换链路：`student_learning_material_gold_label_annotation_import.v0.1` 作为 Label Studio、CVAT 或人工标注结果的统一中间格式，`npm run generate:k12-gold-label-package` 会把它与同一份 `VisionEvidencePacket` 对齐后生成 final gold package，并默认拒绝未脱敏、未双标、未仲裁或证据不匹配的输入。
* 新增模型回归比较命令：`npm run compare:k12-model-regression` 读取 baseline/candidate 两份同 gold dataset 的评测文件，检查 case 集合一致性、新增失败 case、指标退步和 `claimable99Correctness` 丢失，专门服务后续更换模型、Provider、Prompt 或 Schema。
* 新增老师交付包 artifact：`student_learning_material_delivery_bundle.v0.1` 由 `npm run generate:k12-delivery-bundle` 从最终用户结果生成，打包专业测评报告、家长反馈、月报摘要/纵向比较、反馈/入档状态、安全边界和来源映射，避免前台临时拼接“老师只要的结果”。
* 老师交付包命令已扩展为一条链路入口：可直接从 `XUEMAI_RESULT_INPUT`、`XUEMAI_ANALYSIS_INPUT` 或 `XUEMAI_VISION_PACKET` 生成交付包，并可选落盘中间 result/analysis artifact，兼顾老师交付和评测回放。
* 刷新相关开源项目调研：OCR/Layout/Formula 类项目继续作为 Provider 候选或对照，CMMU、CMMaTH、CMM-Math、MWPToolkit、Confucius3-Math 只作为中文 K12 评测/推理参考；Ape210K 因公开记录显示撤回和数据不可复现，仅作为风险案例，不进入评测依据。
* 评测资产链路已把最终老师交付包纳入 manifest：`delivery_bundle_path` 会被 `validate:k12-eval-assets` 校验 schema、case/student/material/analysis 对齐、专业测评报告、家长反馈、月报父母消息、来源映射和用户可见状态。
* `npm run generate:k12-eval-artifacts` 现在默认从 analysis-backed manifest 生成 result 与 delivery bundle，并可在显式老师确认元数据存在时继续生成 monthly report；最终产品交付物也能被回放和预检，而不是只验证内部分析 JSON。
* 新增题目切分 QA artifact 链路：`npm run generate:k12-question-segmentation-review` 可从同一份 `VisionEvidencePacket` 生成脱敏 review JSON，记录题目页码、区域、几何/crop_ref、证据归属、置信度和人工复核清单，不写入原始 OCR 文本。
* 评测资产清单扩展支持 `question_segmentation_review_path`，`validate:k12-eval-assets` 现在要求 definitive gold 题目必须有 matching `pass` segmentation review；缺 crop_ref、低置信、边界不稳或 orphan evidence 会阻断 99% claim readiness，改走老师复核。
* `generate:k12-eval-artifacts` 默认补齐 question-segmentation review、user-facing result 和 delivery bundle，可选补齐 monthly report；真实样本链路变为 VisionEvidencePacket -> segmentation QA -> gold labeling -> analysis/result/delivery/monthly artifacts -> asset preflight。
* gold template 生成器现在可读取 `XUEMAI_QUESTION_SEGMENTATION_REVIEW`，把每题 segmentation review status / issues 写进两位 reviewer 的 `question_evidence_basis.notes`，让人工标注前就能看到哪些题不能硬判。
* annotation import 转 final gold package 现在也可读取同一份 segmentation review；如果人工标注把 review 非 `pass` 的题标为 `definitive_judgement_allowed=true`，转换阶段会直接拒绝写入，提前保护 human gold dataset 质量。
* 新增老师交付包质量校验器：`validateStudentLearningMaterialDeliveryBundle` 会检查专业测评报告必备章节、逐题行覆盖、家长反馈安全、月报纵向比较文字、反馈/入档展示状态、安全边界和来源映射；文件生成与评测资产预检都会复用该校验器。
* 老师交付包 safeguards 收紧：无论家长反馈是否可复制，交付包都必须明确“系统不会自动发送微信”，避免待复核状态下丢失产品安全边界。
* 新增用户可见结果质量校验器：`validateStudentLearningMaterialUserFacingResult` 会检查老师报告必备章节、逐题行覆盖、家长反馈安全、月报纵向比较、来源标签和可见 markdown 不暴露内部 evidence refs；`generate:k12-user-result` 写文件和 `validate:k12-eval-assets` 资产预检都会复用该校验器。
* 收紧 VisionEvidencePacket 交叉引用校验：`validateVisionEvidencePacket` 现在会拒绝重复/孤立的 page、question、region、evidence 引用，gate 指向不存在证据，或 pipeline trace output 指向不存在对象；mock fixture 的 gate 也改为使用稳定 `evidence_ref`，避免真实 Provider 接入前把 evidence_id 当成可审计证据引用。
* 复核相关开源项目：没有发现能直接替代本 Skill 的大陆 K12 学生材料逐题分析项目；PaddleOCR/PaddleX 继续作为第一真实 Provider 候选，MinerU、Pix2Text、DocLayout-YOLO、LaTeX-OCR、EduNLP/EduData 作为专项或对照参考，Label Studio/CVAT 作为 human gold dataset 上游标注工具候选。
* 新增外部 OCR/Vision adapter 输入预检：`validateExternalVisionAdapterInput` 会在写出 `VisionEvidencePacket` 前拒绝缺 provider/model/material/student 元数据、空 page/question、重复 ID、非法 confidence、跨题 evidence 或孤儿 page/region 引用；文件生成入口会把输入预检 warning 和 packet 校验 warning 合并处理。
* 新增 human gold 上游标注任务包：`generate:k12-gold-label-annotation-task` 会从 `VisionEvidencePacket` 和 question-segmentation review 生成脱敏 Label Studio/CVAT/manual 任务包，保留题号、crop_ref、几何、证据 ref、题目切分状态和 annotation import skeleton，但不保存原始 OCR 全文或 normalized text；任务包仍需转 annotation import 和 final gold package，不能直接支撑 99%。
* 评测资产清单已纳入 `annotation_task_path`：`validate:k12-eval-assets` 会校验 annotation task 与同一份 VisionEvidencePacket、question-segmentation review 和 adjudicated gold 对齐，并把 annotation task 覆盖纳入 `claimable99AssetReady` 阻断项；`generate:k12-eval-artifacts` 默认补齐该 artifact。
* 月报上月纵向比较增加可审计来源：`student_monthly_report_v1` 现在输出 `comparison_evidence`，记录本月素材数、上月素材数、上月来源 ID 和上月证据状态；没有上月证据时趋势字段必须为空并输出证据不足说明，资产预检会拒绝“无上月来源却写趋势”的月报。
* `validate:k12-eval-assets` 新增 `monthlyComparisonEvidence` 覆盖项，并把月报上月对比证据纳入 `claimable99AssetReady` 阻断原因；结构通过但缺少可回放上月依据的月报，仍不能支撑月报纵向比较能力或 99% 对外口径。
* 本轮开源项目复核补充 UniMERNet、LaTeX-OCR/pix2tex 和 docTR：它们分别作为数学表达式识别、公式 crop 转写和 OCR baseline 候选；仍需通过 adapter 产出 `VisionEvidencePacket`，不能直接替代本 Skill 的证据 gate、老师复核和 human gold 验收。
* 新增 Provider 试跑报告 artifact：`npm run generate:k12-provider-trial-report` 会从 `VisionEvidencePacket` 输出 `student_learning_material_vision_provider_trial_report.v0.1`，只保留 Provider 候选、gate 状态、题目切分计数、逐题 readiness、阻断项、warning 和下一步，不保存原始 OCR 全文或 normalized text。
* 评测资产链路已纳入 `provider_trial_report_path`：`validate:k12-eval-assets` 会校验 Provider 试跑报告与同一份 `VisionEvidencePacket` 和可选 question-segmentation review 对齐，并把 Provider 试跑报告覆盖纳入 `claimable99AssetReady` 阻断项。
* `generate:k12-eval-artifacts` 现在默认补齐 Provider trial report、question-segmentation review、annotation task、user-facing result 和 delivery bundle，可选补齐 monthly report；真实样本链路变为 VisionEvidencePacket -> provider trial report -> segmentation QA -> annotation task/gold -> analysis/result/delivery/monthly artifacts -> asset preflight。
* Provider trial readiness 已进入资产预检报告：`validate:k12-eval-assets` 会输出 ready / needsEvidence / blocked 覆盖数，并在任一 Provider trial report 仍为 `blocked` 时阻断 `claimable99AssetReady`。

### 关键变化

* 影响 AI 输出合同、Skill 质量清单、产品设计稿、结果展示边界、OCR/Vision 证据包和评测流程；不改变老师确认入档、微信反馈不自动发送、SkillCard 承载正式输出这些核心边界。

### 遗留问题

* 已具备真实 OCR/Vision Provider 输出的 adapter 入口、Provider 试跑报告、题目切分 QA artifact 和文件生成命令，但尚未采集真实 PaddleOCR/PaddleX 样本输出，也未用真实模型输出跑脱敏人工标注集。
* 尚无足够覆盖地区、学段、学科、题型、拍摄质量、可硬判题和需复核题的 human-labeled dataset，因此不能对外宣称已达到 99%；目前只是具备资产清单、标注包校验、覆盖门槛和评测入口。
* 月报聚合目前仍是 mock 纯函数，尚未连接真实 repository adapter、Auth/RLS 或 Supabase 表；上月纵向比较已有 artifact 证据元数据和资产预检，但仍需要真实已确认上月素材样本验证。
* 最终用户结果 artifact 尚未接入真实后端 API / Supabase 持久化，当前前台仍以 mock SkillCard 数据验证展示路径。
* 老师交付包 artifact 已进入文件化评测资产链路，但尚未接入真实 SkillCard 数据库表和分析详情页 API。
* 公开课程参考只提供粗粒度边界；具体省市考试方案、教材版本、机构题库和真实报告模板仍需后续按样本或用户资料接入。
* 模型适配器已具备可替换边界，但真实 provider 切换仍需要同一批 human-labeled dataset 回归验证。
* 当前回归比较命令已有 synthetic 测试覆盖，但真实接受候选模型仍必须使用脱敏 human-labeled dataset，不能用 synthetic fixture 证明 99%。

### 下一阶段

* 采集真实 PaddleOCR/PaddleX 样本输出，先归一化为 `VisionEvidencePacket`，再生成 Provider 试跑报告和 question-segmentation review，并把同一份 review 传给 gold label template 与 final gold package 生成；人工标注工具导出先转为 annotation import，再生成/校验 final gold package，通过 `validate:k12-gold-labels` 与 `validate:k12-eval-assets` 进入同一批量评测入口。
* 在 Auth/RLS 和表结构确认后，把统一月报素材池接入真实已确认学习记录、反馈历史和老师备注。

## 2026-06-20：开源扫描补充与最终逐题交付校验

### 完成内容

* 补充开源扫描：通过网页检索和 GitHub API 复核，未发现可直接替代本 Skill 的中文 K12 试卷/题目切分开源项目；口算批改、答题卡/OMR 或自动评分 demo 都过窄，不能覆盖学生作答、老师批改、逐题证据、家长反馈和月报纵向比较。PaddleOCR/PaddleX 仍作为第一 Provider 候选，RapidOCR、Surya、EasyOCR、docTR、MMOCR、MinerU、LayoutParser、LaTeX-OCR 等只作为 OCR/Layout/Formula 对照或专项候选；Label Studio/CVAT 仍只作为 human gold dataset 上游标注工具。
* 收紧最终交付校验：`validateStudentLearningMaterialUserFacingResult` 和 `validateStudentLearningMaterialDeliveryBundle` 不再只检查逐题行数量，而是校验 `question_id` 集合和顺序必须与同一份 analysis/result 对齐。交付包生成时也会复制 result 中的可变数组，避免 bundle 被篡改时同步污染源 result，导致对齐校验失效。

### 遗留问题

* 仍未接入真实 PaddleOCR/PaddleX 样本输出，也没有足够 human-labeled dataset，因此不能声称 99% 已达成。下一步应采集脱敏真实样本，生成 Provider trial report、question-segmentation review、annotation task、gold package、analysis/result/delivery/monthly artifacts，再跑 `validate:k12-eval-assets`。

## 2026-06-20：专业测评型老师报告章节增强

### 完成内容

* `StudentLearningMaterialUserFacingResult` 的老师报告从基础结论扩展为更完整的专业测评结构：新增学情传导图、难度层表现反馈、学习策略表现反馈、学科能力反馈、重点错题成因反馈、表现空间反馈和复发风险反馈。新增章节只使用现有 analysis 证据；缺少难度分层等结构化标签时明确提示证据不足或需后续标注，不硬造低/中/高难度表现。
* `validateStudentLearningMaterialUserFacingResult` 和 `validateStudentLearningMaterialDeliveryBundle` 已把关键专业章节纳入质量 gate，最终老师交付包缺少学情传导、难度层或复发风险等章节时会拒绝写入或资产预检通过。

### 遗留问题

* 当前专业章节仍由现有字段派生，尚未扩展 `StudentLearningMaterialAnalysis` schema 的难度层、学习策略维度、表现空间量化字段。后续如果真实题库或人工 gold 提供 difficulty level / strategy label，可进一步把这些章节从“证据边界提示”升级为结构化维度评分。

## 2026-06-20：模型切换回归纳入最终交付物校验

### 完成内容

* `compare:k12-model-regression` 不再只比较内部 `StudentLearningMaterialAnalysis` 指标。比较器现在会对 baseline/candidate 每个 case 从 analysis 生成 user-facing result 和 teacher delivery bundle，并复用现有质量校验器检查老师报告、家长反馈、专业章节、逐题覆盖、月报比较和交付包边界。
* baseline 交付物无效会作为比较错误；candidate 交付物无效会作为模型回归失败。这样后续换大模型、Provider、Prompt 或 Schema 时，候选模型不能只靠内部指标不退步通过，还必须证明最终老师/家长能拿到完整可用结果。

### 遗留问题

* 真实模型切换验收仍需要同一批脱敏 human-labeled dataset。synthetic fixture 只能证明回归命令和 artifact gate 生效，不能证明 99% 正确率。

## 2026-06-20：标注任务包和 Gold Package 增加内容级脱敏校验

### 完成内容

* `validateGoldLabelAnnotationTask` 不再只检查 `raw_ocr_text` / `normalized_text` 字段名是否缺失；当传入同一份 `VisionEvidencePacket` 时，会扫描任务包所有字符串字段，拒绝任何复制自 OCR、normalized 或 text 证据内容的片段。
* `validate:k12-eval-assets` 通过 annotation task 校验复用该 gate，能拦截把原始 OCR 文本误写入人工备注、review checklist、Label Studio/CVAT payload 或其他可编辑字段的资产清单。
* `createGoldLabelPackageFromAnnotationImport` 现在会先扫描 annotation import 自身的 notes 类字段；标注工具导出备注、label notes、question notes 或 adjudication notes 若复制 OCR/normalized/text 内容，会在写 final gold package 前直接失败。
* `validateStudentLearningMaterialGoldLabelPackage` 也新增基于同一份 `VisionEvidencePacket` 的 notes 内容级泄漏检查；annotation import 转 final gold package 时，若最终 package notes 复制了 OCR/normalized/text 内容，会作为硬失败拒绝写入，即使是 incomplete 草稿调试也不能绕过。

### 遗留问题

* 内容级校验只保护结构化 JSON artifact；真实图片、crop 文件和标注工具工作区仍需要人工脱敏流程与访问权限控制。知识点和错因等结构化标签仍允许人工填写，校验重点放在 notes/备注类自由文本泄漏。

## 2026-06-20：Provider 试跑报告和题目切分 QA 增加内容级脱敏校验

### 完成内容

* `validateVisionProviderTrialReport` 和 `validateQuestionSegmentationReview` 现在在传入同一份 `VisionEvidencePacket` 时，会扫描 artifact 内所有字符串字段，拒绝复制 OCR、normalized 或 text 证据内容；错误只暴露 `evidence_ref`，不把原始文本回显到日志或报告。
* `validate:k12-eval-assets` 通过 Provider trial report 与 question-segmentation review 校验复用该 gate，能拦截把 OCR 原文误写入 next steps、warning、人工复核清单等自由文本字段的评测资产。
* Skill 说明、AI Skill Spec、产品设计稿和决策日志已同步说明：Provider 试跑报告、题目切分 QA、标注任务包和 final gold package 都属于 99% 资产链路红线 artifact，不能携带复制自源证据包的 OCR/text 内容。

### 遗留问题

* 该校验仍依赖同一份 `VisionEvidencePacket` 参与 validation；真实 Provider 落地时，API 和批处理入口必须确保 provider trial report、question segmentation review、annotation task、final gold package 都和源证据包一起校验，不能只做 schema-only validation。

## 2026-06-20：Human-labeled 资产预检阻断 mock/synthetic Vision 来源

### 完成内容

* `validate:k12-eval-assets` 现在会统计 `VisionEvidencePacket` 的 source kind，并识别 `mock` source kind、mock/synthetic provider 或 model、`mock://` / `synthetic://` page ref，以及 mock/synthetic 前缀 evidence ref。
* 对 `human_labeled` manifest，mock/synthetic Vision source 不会让结构校验直接失败，但会写入 `claimable99AssetReady` blocker，防止用 synthetic fixture 或 mock provider 补齐样本覆盖后误认为可支撑 99% 宣称。
* `eval:k12-material` 新增 dataset-level `asset_preflight` gate；正式 dataset 必须记录同批 `validate:k12-eval-assets` 的 `claimable99AssetReady=true`，否则即使逐题指标和人工标注协议全绿，也只能输出 `claimable99Correctness=no`。
* 新增 `npm run generate:k12-eval-dataset`：从已预检的 evaluation asset manifest 生成 dataset，自动引用每个 case 的 final gold package 和 analysis artifact，并把同一份资产预检的 `claimable99AssetReady` 与 blockers 写入 `asset_preflight`。

### 遗留问题

* 真实可宣称资产仍需要脱敏 PaddleOCR/PaddleX 或其他真实 Provider 样本、双人标注、仲裁、月报上月证据和同批模型回归评测；当前新增的是来源真实性、资产预检引用 gate 和 dataset 生成胶水，不是 99% 达成证明。

## 2026-06-20：Provider 候选评估进入 99% 资产预检

### 完成内容

* `validate:k12-eval-assets` 现在会统计每个 case 的 `pipeline_trace.provider_candidates` 是否包含当前选中 Provider 的 `primary_candidate`、至少一个 fallback/benchmark/open-source 候选，以及候选的 license/deployment review notes。
* Provider 候选 trace、benchmark 候选或 license notes 缺失时，资产清单结构仍可用于调试，但 `claimable99AssetReady` 会保持 `no`，防止真实 OCR/Vision provider 试跑只留下不可追溯的单一输出。
* adapter 的固定候选清单补充 EasyOCR、Tesseract、docTR 和 LaTeX-OCR，继续把它们定位为 OCR/公式 baseline 或 benchmark，不让任何开源项目越过 `VisionEvidencePacket`、题目切分 QA、human gold package 和老师复核边界。

### 遗留问题

* 这仍不是 99% 达成证明。下一步要用真实脱敏材料跑 PaddleOCR/PaddleX 或其他 Provider，把 provider trace、trial report、segmentation review、annotation task、gold package、analysis/result/monthly/delivery artifacts 全部串成同一批资产后再评估。

## 2026-06-20：OCR/Vision Provider 切换增加回归比较门

### 完成内容

* 新增 `compare:k12-vision-provider-regression`，读取同一材料的 baseline/candidate Provider 试跑报告，在进入文本推理、人工 gold 标注或模型回归前先比较 OCR/Vision 证据层是否退步。
* 比较器会拦截 candidate 丢题、缺 crop_ref、题目切分通过数下降、可硬判题数下降、需老师复核或 blocked 题增加、同题 segmentation/readiness 退步，以及置信度下降超过阈值。正式模式下 baseline 和 candidate 都必须达到 `ready_for_human_labeling`。
* 新增文件级测试覆盖同报告通过、candidate 缺 crop_ref 导致退步失败，以及环境变量驱动的命令入口。

### 遗留问题

* 当前回归用 synthetic fixture 验证命令链路；真实 Provider 验收仍需要脱敏真实样本的 baseline/candidate trial reports。这个门只能证明“Provider 输出没有相对退步”，不能替代 human-labeled dataset 的 99% 正确率评测。

## 2026-06-20：Human Gold 增加双标一致性报告

### 完成内容

* 新增 `student_learning_material_gold_label_review_report.v0.1` 和 `npm run generate:k12-gold-label-review-report`，从 final gold package 生成双标一致率、分歧数量、仲裁状态和 readiness blocker。
* 分歧值不原样写入报告，只保存短哈希；报告校验会和同一份 `VisionEvidencePacket` 做内容级扫描，防止 OCR 原文、学生作答或人工备注扩散到评测报告。
* `validate:k12-eval-assets` 现在支持 `gold_label_review_report_path`，会校验报告与 gold package / VisionEvidencePacket 对齐，并在报告缺失或未 `ready_for_99_evaluation` 时阻断 `claimable99AssetReady`。`generate:k12-eval-artifacts` 也会默认补齐这个 artifact。

### 遗留问题

* 当前仍用 synthetic fixture 验证链路。真实 99% 证据还需要脱敏真实材料、真实 OCR/Vision Provider 输出、双人标注、仲裁、gold label review report、完整资产预检和同批 dataset eval。

## 2026-06-20：真实样本 Case Package Scaffold

### 完成内容

* 新增 `npm run generate:k12-eval-case-package`，为真实脱敏样本创建 `case-package.json` 和 `evaluation-assets.cases.json`，固定 Provider 输入、VisionEvidencePacket、Provider trial report、题目切分 QA、标注任务、annotation import、gold package、gold review、analysis/result/monthly/delivery bundle 的路径约定。
* case package 带有命令序列和 99% readiness checklist，便于真实 PaddleOCR/PaddleX 或其他 Provider 样本按同一目录规范推进到 `validate:k12-eval-assets`。
* scaffold 明确 `raw_student_materials_allowed_in_package=false`，不会复制原始图片或未脱敏学生材料，只负责组织脱敏后的结构化 artifact 路径。

### 遗留问题

* case package 只是采集与跑批入口，不是评测证据本身。真实 99% 仍需要把 referenced artifacts 全部补齐、通过资产预检，再生成 dataset 并跑正式评测。

## 2026-06-20：Case Package 增加 Readiness Inspector

### 完成内容

* 新增 `npm run inspect:k12-eval-case-package`，读取真实样本 `case-package.json`，检查隐私边界、artifact 是否存在、命令序列中最早未完成步骤、`evaluation-assets.json` 预检状态和 99% blocker。
* inspector 按顺序推进命令，不会因为后面的 `evaluation-assets.cases.json` 已存在就跳过前面的 Provider 输入、VisionEvidencePacket、题目切分或人工标注步骤。
* 输出中固定 `claimable99_from_case_package=false`，并要求后续 `validate:k12-eval-assets` 与 `eval:k12-material`，避免把 scaffold 或半成品 package 误当成 99% 正确率证据。

### 遗留问题

* 该 inspector 仍只检查文件链路与资产预检状态，不读取原始学生材料，也不能替代真实脱敏样本、真实 Provider 输出、人工双标/仲裁和正式 dataset eval。

## 2026-06-20：Dataset 增加 99% Claim Audit

### 完成内容

* 新增 `npm run audit:k12-eval-claim`，读取 `student_learning_material_evaluation_dataset.v0.1`，把 strict claim policy 下的缺口结构化为 `student_learning_material_evaluation_claim_audit.v0.1`。
* audit 会拆出样本数、题目数、可硬判题、需老师复核题、材料类型、学科、小初高学段、地区/教材线索、review protocol 和 asset preflight blocker，并给出下一批真实样本采集目标。
* 测试覆盖 synthetic smoke dataset 不能 claim、asset preflight blocker 可见，以及显式 tiny local policy 下的通过态。

### 遗留问题

* audit 只是补样导航，不是正确率证明。真实 99% 仍以同批资产预检通过、human-labeled dataset 覆盖足够、`eval:k12-material` 输出 `claimable99Correctness=yes` 为准。

## 2026-06-20：Teacher Review Packet 作为产品交接包

### 完成内容

* 新增 `student_learning_material_teacher_review_packet.v0.1` 和 `npm run generate:k12-teacher-review-packet`，从 delivery bundle 生成老师可复核的 SkillCard / 分析详情页交接包。
* packet 会列出查看详情、编辑反馈、复制反馈、标记已反馈、确认入档、补充材料、重新分析等动作，并根据证据/复核状态控制按钮是否可用。
* validator 固定 `auto_send_wechat=false`、`auto_archive=false`，要求标记已反馈和确认入档必须老师确认，同时禁止 teacher-visible payload 暴露 `evidenceRefs`、`VisionEvidencePacket` 或 `internal_evidence_ref`。

### 遗留问题

* 当前只是文件级 artifact 与 validator，尚未接入真实 SkillCard UI / API 持久化。它不替代 99% 评测资产，只负责产品层复核和动作边界。

## 2026-06-20：Teacher Review Packet 支持从上游 Artifact 直达

### 完成内容

* `generate:k12-teacher-review-packet` 现在不仅能读取现成的 `XUEMAI_DELIVERY_BUNDLE_INPUT`，也能在设置 `XUEMAI_DELIVERY_BUNDLE_OUTPUT` 时，从 `XUEMAI_RESULT_INPUT`、`XUEMAI_ANALYSIS_INPUT` 或 `XUEMAI_VISION_PACKET` 先生成 delivery bundle，再写出老师复核包。
* 文件入口返回 `sourceKind`、中间 delivery/result/analysis 路径，方便真实样本跑批和 UI 接入追踪上游来源。
* 同步补充 Skill、AI spec、产品设计稿、评测接受规则和 open-source scan。开源复核仍把 PaddleOCR/MinerU/Pix2Text/RapidOCR/Surya/CnOCR/DocLayout/LayoutParser 定位为 Provider 候选或 baseline，没有发现可直接替代本 Skill 证据链和 human gold dataset 的 K12 垂直系统。

### 遗留问题

* 这只是交付链路收敛，不是 99% 正确率证明。真实验收仍需要脱敏真实材料、真实 OCR/Vision Provider 输出、题目切分 QA、双人标注/仲裁、gold review、资产预检和 dataset eval。

## 2026-06-20：最终结果补齐结构化材料分类

### 完成内容

* `StudentLearningMaterialUserFacingResult` 新增来源标签化的 `material_classification`，包含材料类型、科目、学段、年级候选、地区/教材线索和分类置信度，供老师报告 UI 直接展示。
* `StudentLearningMaterialDeliveryBundle` 和 `StudentLearningMaterialTeacherReviewPacket` 会携带同一份结构化分类，避免 SkillCard / 分析详情页只能从 markdown 摘要里反解析“试卷、数学、初中”等关键信息。
* 校验器会确认分类字段与同一份 analysis/result 对齐，并拒绝在用户可见分类字段中暴露原始 `evidenceRefs`。

### 遗留问题

* 分类字段是最终交付合同增强，不代表分类准确率已经达到 99%。真实准确率仍依赖 human-labeled dataset、资产预检和正式 eval。

## 2026-06-20：Provider 候选来源 URL 纳入 99% 资产预检

### 完成内容

* 在实时复核开源 OCR/Layout/Formula 项目后，继续保持 PaddleOCR、MinerU、Pix2Text、RapidOCR、Surya、CnOCR、DocLayout-YOLO、LayoutParser 等项目只作为 Provider 候选或 baseline，不把公开 benchmark 外推为本项目正确率。
* `validate:k12-eval-assets` 新增 Provider candidate source URL 覆盖项，报告现在会输出 `sourceUrls`，并在候选 trace 缺少 `evidence_source_url` 时阻断 `claimable99AssetReady`。
* `validateVisionEvidencePacket` 对缺少候选来源 URL 的 pipeline trace 给出 warning；结构包仍可用于本地调试，但不能进入 99% 可宣称资产。

### 遗留问题

* 这只是 Provider 评估证据链补强，不是 OCR/Vision Provider 接入完成，也不是 99% 正确率证明。下一步仍要用真实脱敏材料生成 case package、Provider output、VisionEvidencePacket、题目切分 QA、人工双标 gold 和正式 eval。

## 2026-06-20：Case Package 补齐月报输入步骤

### 完成内容

* `student_learning_material_evaluation_case_package.v0.1` 新增 `monthly_report_input_path`，默认指向 `human-review/monthly-report-input.json`，用于保存老师确认的本月素材、上月素材或明确缺少上月基线的证据说明。
* case package command sequence 新增 `monthly_report` 步骤，要求先运行 `generate:k12-monthly-report` 写出 `artifacts/monthly-report.json`，再进入 delivery bundle 打包。
* readiness inspector 现在会在 result 已有但 monthly input 缺失时把下一步阻断在 `monthly_report`，避免真实样本跑批跳过用户要求的月报纵向比较。

### 遗留问题

* 该补强只是把月报输入纳入真实样本标准链路；真实月报质量仍需要老师确认来源、上月对比证据、`validate:k12-eval-assets` 和最终 dataset eval 共同证明。

## 2026-06-20：开源公式识别候选补入 Provider Trace

### 完成内容

* 复核 PaddleOCR、RapidOCR、CnOCR、LayoutParser、Surya、Marker、LaTeX-OCR、UniMERNet、Label Studio、CVAT 等开源项目后，继续确认没有发现可直接替代本 Skill 的中文 K12 学习材料分析系统。
* `vision-adapter` 的 Provider 候选 trace 新增 `unimernet`，定位为数学公式 crop 的 benchmark-only 候选，并记录 GitHub 来源 URL 与 Apache-2.0 许可复核备注。
* 开源扫描文档补充 UniMERNet 的适用边界：它可用于真实场景数学表达式识别对照，但不能替代题目切分、同题答案依据、学生作答归属、错因诊断或学情报告。

### 遗留问题

* 该更新只是 provider 候选清单补强，没有接入 UniMERNet，也没有证明公式 OCR 或逐题分析准确率。真实验收仍需要脱敏真实材料、同批 Provider trial report、question segmentation review、human gold package、asset preflight 和 dataset eval。

## 2026-06-20：老师报告补齐证据充分性判定

### 完成内容

* `StudentLearningMaterialUserFacingResult.teacher_report` 新增必备章节“证据充分性判定”，汇总本次逐题可硬判数量、需老师复核数量、非 pass gate、缺失上下文，并明示证据不足题不能生成能力或错因定性。
* `validateStudentLearningMaterialUserFacingResult` 和 `validateStudentLearningMaterialDeliveryBundle` 都把 `## 证据充分性判定` 纳入质量 gate，避免最终老师报告或交付包丢失硬判/复核边界。
* 同步补充 AI spec、产品设计文档和 Skill quality checklist，把证据充分性从内部 gate 提升为老师可见的专业测评报告结构。

### 遗留问题

* 该章节能展示证据边界，但不是 99% 正确率证明。真实 99% 仍必须通过真实脱敏样本、题目切分 QA、双人标注/仲裁、资产预检和正式 dataset eval。

## 2026-06-20：复核包证据边界与开源扫描补充

### 完成内容

* `validateStudentLearningMaterialTeacherReviewPacket` 现在也检查老师可见报告必须包含 `## 证据充分性判定`，避免聊天 SkillCard / 分析详情页交接包在最后一层丢掉“哪些题可硬判、哪些题需老师复核”的边界。
* 老师复核包测试补充了缺失该章节的拒绝用例，并继续校验不自动发微信、不自动入档、不暴露内部证据字段。
* 开源项目扫描补充 Docling、K12Vista、OCRBench / MultimodalOCR：前者只作为 PDF/扫描件文档转换 baseline，后两者只作为中文 K12 或 OCR benchmark 参考，均不能替代本项目的 `VisionEvidencePacket`、题目切分 QA、human gold dataset 和老师复核链路。

### 遗留问题

* 本次只是契约和调研补强，没有接入新的 OCR/Vision Provider，也没有证明 99% 正确率。下一步仍应从真实脱敏样本 case package 开始跑 Provider trial、题目切分 QA、双标仲裁和资产预检。

## 2026-06-20：题目切分 Review 防伪通过校验

### 完成内容

* `validateQuestionSegmentationReview` 在传入同一份 `VisionEvidencePacket` 时，会重新生成 packet-derived segmentation review，并核对 summary、逐题 status、issues、readiness、definitive readiness、region crop_ref 和 region issues。
* 新增测试覆盖“缺 crop_ref 的题被手工篡改成 pass”的场景；validator 会拒绝这种伪稳定题目切分，防止 definitive gold 或 99% asset preflight 被手工改绿。
* Skill 说明、AI spec 和产品设计文档已同步：题目切分 QA artifact 必须能被同一份 VisionEvidencePacket 重算校验，缺 crop_ref、低置信、边界不稳或篡改 pass 都必须进入老师复核或校验失败。

### 遗留问题

* 该校验提高了结构化 artifact 的可信度，但仍不等于真实 OCR/Vision 正确率。真实样本仍需 Provider trial report、题目切分 QA、annotation task、双标仲裁、gold label review、asset preflight 和正式 dataset eval。

## 2026-06-20：Provider Trial Report 防伪通过校验

### 完成内容

* `validateVisionProviderTrialReport` 在传入同一份 `VisionEvidencePacket` 时，会重算 packet-derived Provider trial report，并核对 readiness、summary、gate statuses、Provider candidates、blockers、warnings、next steps 和逐题 segmentation/readiness 字段。
* 新增测试覆盖“缺 crop_ref 的 Provider 输出被手工篡改成 `ready_for_human_labeling`”的场景；资产清单测试也会拒绝与源证据包不一致的 Provider trial report artifact。
* Skill 说明、AI spec 和产品设计文档已同步：Provider 试跑报告必须能由同源证据包重算校验，缺证据、需复核、blocked 或篡改 ready 都不能进入 human gold / 99% 资产链路。

### 遗留问题

* 该校验只防止结构化 artifact 被手工改绿，不代表真实 OCR/Vision Provider 已接入或达到 99%。下一步仍要采集脱敏真实样本，生成 Provider output、VisionEvidencePacket、题目切分 QA、annotation task、双标仲裁、gold review、asset preflight 和正式 dataset eval。

## 2026-06-20：月报上月对比来源数量一致性校验

### 完成内容

* `validate:k12-eval-assets` 的月报 artifact 校验进一步收紧：`comparison_evidence.previous_month_source_count` 必须与可回放、非空、去重后的 `previous_month_source_ids` 数量一致。
* 资产预检现在会拒绝空白或重复的上月来源 ID，也会拒绝 `previous_month_evidence_status=missing` 时仍携带上月来源 ID 或标记 `previous_month_report_used` 的月报。
* 新增测试覆盖“月报写了上月来源数，但来源 ID 数量不匹配”的失败场景；月报聚合测试也确认正常生成的 comparison evidence 自身一致。

### 遗留问题

* 该校验保证月报纵向比较 artifact 更自洽，但仍需要真实老师确认的本月/上月素材和最终 dataset eval 才能证明月报比较质量；首月无上月基线时仍只能输出证据不足说明。

## 2026-06-20：模型回归纳入老师复核包校验

### 完成内容

* `compare:k12-model-regression` 现在会从每个 baseline/candidate analysis 继续生成 teacher review packet，并运行 `validateStudentLearningMaterialTeacherReviewPacket`。
* 老师复核包 validator 新增同源 delivery bundle 校验：复核数量、source label 数量、SkillCard 状态、内部 audit source map，以及复制反馈、标记已反馈、确认入档、补充材料等动作的 enabled 状态，都必须与同一 delivery bundle 的证据阻断状态一致。
* 新增测试覆盖被篡改的复核数量、按钮启停和 source map；模型回归测试也确认正常 candidate 不产生 final artifact errors。

### 遗留问题

* 该 gate 只能证明候选模型没有破坏最终产品交接包和动作边界，不代表正确率已达 99%。正式正确率仍依赖真实脱敏样本、资产预检、human gold dataset 和 `eval:k12-material`。

## 2026-06-20：Teacher Review Packet 纳入评测资产链路

### 完成内容

* `student_learning_material_evaluation_assets.v0.1` 新增 `teacher_review_packet_path`，资产预检会读取老师复核包并与同一 delivery bundle 做动作启停、复核数量、source label 和 audit source map 对齐校验。
* `generate:k12-eval-artifacts` 默认在 delivery bundle 后继续生成 teacher review packet，并把路径写回输出 manifest；如需调试可用 `XUEMAI_EVAL_ARTIFACT_GENERATE_TEACHER_REVIEW=0` 关闭。
* `generate:k12-eval-case-package` 生成的真实样本 scaffold 现在包含 `artifacts/teacher-review-packet.json`、对应命令步骤和 99% readiness checklist 项，避免真实样本跑批停在 delivery bundle 而漏掉最终 SkillCard / 分析详情页动作边界。

### 遗留问题

* 老师复核包仍是 UI 交接和动作安全 artifact，不是正确率证明。它只能作为 `claimable99AssetReady` 的资产完整性条件之一；正式 99% 仍必须通过真实脱敏材料、人工双标/仲裁、资产预检、claim audit 和 `eval:k12-material`。

## 2026-06-20：Annotation Import 纳入 Human Gold 资产预检

### 完成内容

* `student_learning_material_evaluation_assets.v0.1` 新增 `annotation_import_path`，用于保存 Label Studio、CVAT 或人工流程归一化后的 `student_learning_material_gold_label_annotation_import.v0.1`。
* `validate:k12-eval-assets` 现在会用同一份 VisionEvidencePacket 和题目切分 QA artifact 转换 annotation import，并要求生成出的仲裁 gold 与 `gold_label_package_path` 对齐；不一致、泄漏 OCR/text、未双标或未仲裁都会作为资产错误或 claim blocker 暴露。
* case package 的 `evaluation-assets.cases.json` 会写入 `human-review/annotation-import.json`，checklist 也新增 `annotation_import_normalized_and_source_text_safe`，避免真实样本只保留 final gold package 而丢失标注导入来源。

### 遗留问题

* 该链路只能证明人工标注导入、final gold package 和同源证据包可回放；它不代表已有足够真实样本或 99% 正确率。正式验收仍要补齐真实 OCR/Vision 输出、人工双标/仲裁、gold review、月报对比证据、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Readiness 增加链路组状态

### 完成内容

* `inspect:k12-eval-case-package` 的结构化输出新增 `artifact_group_statuses`，按 OCR/Vision、题目切分、human gold、analysis/result、月报比较、老师交付和 asset manifest 聚合 artifact 缺口。
* readiness 文本报告新增 `artifactGroups=...` 摘要，让 `annotation-import.json`、月报上月对比输入或老师复核包缺失时，不必只靠长 blocker 列表排查。
* 新增测试覆盖 fresh scaffold 的 human gold 全缺失状态，以及 human gold 已补齐但 monthly comparison 仍缺失时的分组状态。

### 遗留问题

* 该检查仍然只看脱敏结构化 artifact 路径和文件存在性，不读取原始学生材料，也不能替代 `validate:k12-eval-assets`、claim audit 或 human-labeled dataset eval。

## 2026-06-20：Claim Audit 拆分 Asset Preflight Artifact 缺口

### 完成内容

* `audit:k12-eval-claim` 现在会把 `asset_preflight` blocker 进一步拆成 artifact-focused gaps，例如 Provider 试跑报告、annotation import、月报上月对比证据和老师复核包缺失。
* `next_sample_targets` 会携带 `artifact_focus`，文本报告新增 `artifactFocusTargets=...` 摘要，让真实样本采集负责人不必打开 JSON 也能看到下一步应补哪类评测资产。
* Skill 说明、AI spec、产品设计文档和评测验收规则已同步：claim audit 只能指导补样/补 artifact，不能替代 `validate:k12-eval-assets` 或 `eval:k12-material`。

### 遗留问题

* 该输出仍然只是采集和标注路线图，不代表任何正确率已达标。正式 99% 仍要求同批资产 `claimable99AssetReady=true`，并由 human-labeled dataset 的 `eval:k12-material` 输出 `claimable99Correctness=yes`。

## 2026-06-20：Runner 强制执行 Material State 前置降级

### 完成内容

* `runAnalyzeLearningEvidence` 现在会在调用文本推理模型前检查 `material_state`。除 `valid_student_material` 外，`insufficient_student_trace`、`teacher_resource`、`needs_review` 和 `low_quality` 都会直接进入降级分析和老师复核。
* 新增回归测试覆盖“上游 gate 看起来正常，但 material_state 已标明不可完整分析”的情况，确认模型不会被调用，也不会产生学生档案更新建议、可发送家长反馈或已确认月报素材。
* 降级报告会把 `unsupported_material_state` 写入风险和缺失上下文，继续保留材料预分类结果用于路由，但不输出学生能力诊断。

### 遗留问题

* 这只是运行时安全门，不代表 OCR/Vision 已经能稳定判断所有真实材料状态。真实样本仍需通过 Provider trial、题目切分 QA、human gold、asset preflight 和 dataset eval 验证。

## 2026-06-20：用户结果月报纵向比较证据门

### 完成内容

* `MonthlyComparisonSeed.previous_month_snapshot` 现在必须在存在时携带可追溯上月来源 `evidenceRefs`；schema 校验会拒绝无来源的上月 snapshot。
* `createStudentLearningMaterialUserFacingResult` 在缺少上月已确认素材或上月来源证据时，会让老师月报说明和 `monthly_result` 统一输出证据不足提示，不再复用模型生成的“和上月相比”趋势文案。
* 用户结果 validator 新增同源校验：无上月来源时拒绝趋势文案，有上月来源时要求 `monthly_result.source_ids` 包含上月来源标签；测试覆盖“snapshot 存在但 evidenceRefs 被删掉”的隐蔽失败场景。

### 遗留问题

* 该 gate 只保证用户结果不会写无来源趋势，不代表真实月报比较已经具备足够样本或 99% 正确率。真实纵向比较仍需老师确认的本月/上月素材、月报 artifact `comparison_evidence`、asset preflight 和 human-labeled dataset eval。

## 2026-06-20：Analysis EvidenceRef 同源校验

### 完成内容

* `StudentLearningMaterialAnalysis` 现在会在 Runner 和评测资产预检中校验所有 analysis evidenceRefs，要求它们解析到同一份 `VisionEvidencePacket`、显式按题号映射的 side input，或仅用于 `monthly_comparison_seed` 的上月来源。
* `runAnalyzeLearningEvidence` 会把模型编造的 evidence ref 降级为老师复核草稿，避免“字符串存在”被误当成真实证据。
* `validate:k12-eval-assets` 会拒绝 `analysis_path` 中跨 case 或不存在的 evidence ref，新增测试覆盖老师报告引用伪造 evidence ref 的失败场景。

### 遗留问题

* 该校验只证明 analysis 引用没有脱离同源证据包，不代表 OCR/Vision 识别、题目切分或模型正误判断已经达到 99%。正式正确率仍要走真实脱敏样本、人工双标/仲裁、资产预检和 `eval:k12-material`。

## 2026-06-20：显式非 K12 材料前置阻断

### 完成内容

* `material-classifier.ts` 新增显式非 K12 范围检测，识别大学/高等教育、成人教育、职业教育或资格、考研考博、大学英语四六级、雅思/托福等线索，并降低分类置信度、输出复核 warning。
* `runAnalyzeLearningEvidence` 在模型调用前执行该 gate；即使上游 `material_state=valid_student_material`，明确非 K12 材料也会降级为老师复核草稿，且不会生成学生档案更新建议或可发送家长反馈。
* `validate:k12-eval-assets` 会拒绝包含显式非 K12 范围线索的 case，防止这类样本混入中国大陆 K12 99% 验收资产集。

### 遗留问题

* 该 gate 只覆盖“明确出现”的非 K12 线索；模糊材料仍需要 OCR/Vision、人工标注和老师复核确认。它也不证明 K12 内部材料分类已达 99%，正式正确率仍依赖 human-labeled dataset。

## 2026-06-20：Analysis 逐题覆盖同源校验

### 完成内容

* `validators.ts` 新增 `validateStudentLearningMaterialAnalysisQuestionCoverageAgainstPacket`，要求 `StudentLearningMaterialAnalysis.question_analyses` 与同一份 `VisionEvidencePacket.questions` 的 question_id 集合和顺序完全一致。
* `runAnalyzeLearningEvidence` 现在会把漏题、额外题、重复题号或乱序题目行降级为老师复核草稿，避免模型只分析部分题目却进入 `draft_ready`。
* `validate:k12-eval-assets` 会拒绝 `analysis_path` 中题目覆盖不一致的 artifact；降级分析也改为对每个识别到的题目生成 `needs_teacher_review` 行，而不是只保留第一题。

### 遗留问题

* 该校验只能证明 analysis 没有在题目集合层面漏题、加题、重题或乱序，不证明 OCR/Vision 题目切分本身正确，也不证明正误判断达到 99%。正式正确率仍依赖真实脱敏材料、题目切分 QA、human gold、资产预检和 dataset eval。

## 2026-06-20：Human Gold Package 同源验包增强

### 完成内容

* `validateStudentLearningMaterialGoldLabelPackage` 在传入 `sourcePacket` 时，会校验 gold package 的 `source_material_id`、`vision_packet_id`、`material_id` 与同一份 VisionEvidencePacket 对齐。
* gold package 中每个 reviewer label 和 adjudicated gold 的题目集合与顺序必须覆盖同一份 VisionEvidencePacket；question evidence basis 也必须逐题同序覆盖，不能漏题、加题、重题或乱序。
* question evidence basis 中的 packet evidence ref 必须属于同一个 question_id；`side_input.*` 只允许出现在答案/评分点 basis。`validate:k12-gold-labels` 现在可选读取 `XUEMAI_VISION_PACKET` 来执行这层同源校验。

### 遗留问题

* 该校验只证明 final gold package 与结构化 VisionEvidencePacket 对齐，不证明人工标注值本身正确，也不证明样本量或代表性足够。99% 仍必须依赖真实脱敏材料、双标/仲裁、gold review、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Gold Review Report 文件入口补同源回归

### 完成内容

* `generate:k12-gold-label-review-report` 的文件级测试新增“同源 VisionEvidencePacket 下跨题 evidence basis”失败用例：当 gold package 把 q002 的学生作答证据误挂到 q001 时，报告生成会在写文件前失败，并返回不含 OCR 原文的 evidence ref 错误。
* Skill 说明、`docs/AI_SKILL_SPEC.md` 和 K12 材料分析产品说明已同步推荐真实样本生成 gold label review report 时传入 `XUEMAI_VISION_PACKET`，让报告阶段也复验 package 身份、题目覆盖/顺序和逐题证据归属。
* 本轮没有改变 gold review report 的 schema，只把已有同源验包能力落实到文件命令入口和人工操作说明中，降低真实样本流程漏传 source packet 的风险。

### 遗留问题

* 该补强只能证明报告生成入口不会放过明显跨题证据错配，不证明人工标注值正确、OCR/Vision 题目切分正确或 99% 已达成。真实宣称仍必须经过同批脱敏样本、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：OCR/Vision Region 同题归属校验

### 完成内容

* `validateExternalVisionAdapterInput` 现在会记录每个 `region_id` 所属的 `question_id`，并拒绝 evidence 把另一题的 region 当作当前题区域使用。这样真实 OCR/Layout Provider 输出在归一化为 VisionEvidencePacket 前，就会挡住跨题视觉区域错配。
* `validateVisionEvidencePacket` 也新增同样的 region/question 归属校验，防止绕过 adapter 或手工编辑的 packet 把 q002 证据挂到 q001 region 后进入文本推理、题目切分 QA、gold 标注或 asset preflight。
* 新增回归测试分别覆盖外部 Provider 输入层和最终 VisionEvidencePacket 层的跨题 region 错配失败；Skill 说明和 AI spec 已同步这条硬规则。

### 遗留问题

* 该校验只证明 evidence 的 region 引用没有跨题错挂，不证明 OCR 文本、题目边界、手写识别或老师批改归属已经正确。真实 99% 仍需要 Provider trial、question segmentation review、human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Readiness 前置 Vision 包校验

### 完成内容

* `inspect:k12-eval-case-package` 现在会对已存在的 `vision_packet_path` artifact 运行 `validateVisionEvidencePacket`，并在 readiness 输出中新增 `artifact_validation_statuses`，记录 validator、错误和 warning。
* 如果 VisionEvidencePacket 已存在但结构无效，例如 evidence 引用了另一题的 region，readiness 会把下一步改为 `fix_artifact_validation`，不再继续推荐 Provider trial、题目切分、人标 gold、analysis 或交付命令。
* 新增回归测试覆盖“case package 里已有坏 Vision 包”的失败场景，并把既有月报链路测试中的 Vision 包占位 `{}` 改成真实可校验的结构化 packet，避免文件存在被误当成证据存在。

### 遗留问题

* 该检查只在 case package readiness 阶段提前暴露已存在 Vision 包的结构问题，不替代 `validate:k12-eval-assets`、人工题目切分 QA、双标/仲裁或 dataset eval；也不证明 OCR 文本、题目边界或正误判断已达到 99%。

## 2026-06-20：Case Package Readiness 前置 Provider/题目切分校验

### 完成内容

* `inspect:k12-eval-case-package` 的 `artifact_validation_statuses` 现在覆盖已存在的 `question_segmentation_review_path` 和 `provider_trial_report_path`，并要求它们能用同一份 `VisionEvidencePacket` 重新校验。
* 题目切分 review 如果被手工改成 `pass`、删除 issues 或修改 review_required，会在 readiness 阶段返回 `fix_artifact_validation`，不再继续推荐 human gold 或 analysis 命令。
* Provider trial report 如果 summary/readiness/问题行等内容与同源 Vision 包重算结果不一致，也会在 readiness 阶段阻断；既有月报链路测试改用真实生成的 Provider trial report 和题目切分 QA artifact，不再用 `{}` 占位。

### 遗留问题

* 该补强只证明真实样本包内 OCR/Vision 中间 artifact 没有明显结构篡改或同源错配，不证明题目切分、人标 gold、模型正误判断或月报纵向比较已经达到 99%。正式宣称仍必须经过完整 asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package Readiness 前置 Human Gold 入口校验

### 完成内容

* `inspect:k12-eval-case-package` 的 `artifact_validation_statuses` 现在继续覆盖已存在的 `annotation_task_path` 和 `annotation_import_path`。annotation task 必须能与同源 `VisionEvidencePacket` 和题目切分 QA 链路对齐，不能引用不存在 evidence ref 或复制 OCR/text 内容。
* annotation import 会在 readiness 阶段尝试通过同一份 Vision 包和 question-segmentation review 重建 final gold package；缺脱敏、缺双标、缺仲裁、notes 泄漏 OCR/text、definitive gold 题未通过题目切分 review，或 final package validation 不通过，都会提前返回 `fix_artifact_validation`。
* readiness 回归测试新增 annotation task 错 evidence ref、annotation import notes 泄漏 OCR/text 两个失败场景；既有月报链路测试改用真实结构化 annotation task/import，不再用 `{}` 占位通过 human gold 入口。

### 遗留问题

* 该检查只保证 case package 中已存在的 human gold 上游 artifact 没有明显结构错误、同源错配或文本泄漏，不证明人工标注值正确、样本覆盖足够或 99% 已达成。正式 claim 仍必须依赖 final gold package、gold review report、`validate:k12-eval-assets`、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package Readiness 前置 Final Human Gold 校验

### 完成内容

* `inspect:k12-eval-case-package` 的 `artifact_validation_statuses` 现在覆盖已存在的 `gold_label_package_path` 和 `gold_label_review_report_path`。final gold package 必须能用同一份 `VisionEvidencePacket` 校验身份、题目覆盖/顺序、逐题 evidence basis 和脱敏/双标/仲裁状态。
* 如果同一 case package 已存在有效 annotation import，readiness 会要求 final gold package 与 annotation import 重建结果一致，避免人工修改 final gold 后绕过 annotation import 链路。
* gold label review report 必须与同一 final gold package 和 VisionEvidencePacket 对齐，并且 `ready_for_99_evaluation=true`；被手工改成 not-ready、blockers 不匹配、统计项不一致或复制 OCR/text 的报告都会提前返回 `fix_artifact_validation`。

### 遗留问题

* 该补强只证明 case package 内 final human gold artifact 与同源结构证据、annotation import 和 review report 对齐，不证明人工标注值本身正确，也不证明样本量、材料类型/学科/学段/地区覆盖足够。99% 仍必须等待真实脱敏样本通过 asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package Readiness 前置下游交付 Artifact 校验

### 完成内容

* `inspect:k12-eval-case-package` 的 `artifact_validation_statuses` 继续覆盖已存在的 `analysis_path`、`result_path`、`monthly_report_input_path`、`monthly_report_path`、`delivery_bundle_path` 和 `teacher_review_packet_path`。
* analysis artifact 现在会与同一份 `VisionEvidencePacket` 校验 evidenceRefs、题目覆盖/顺序和微信反馈安全；result artifact 必须与有效 analysis 对齐，月报 input/output 必须保留可回放输入和上月证据边界；delivery bundle 必须与 result、analysis、monthly report 同源；teacher review packet 必须与同一 delivery bundle 的动作阻断和 source map 对齐。
* readiness 回归测试新增月报比较证据错配、delivery bundle 逐题行丢失、teacher review packet 动作边界错配三个失败场景；既有月报链路测试改用真实同源 analysis/result artifact，不再用 `{}` 占位绕过下游链路。

### 遗留问题

* 该检查只保证 case package 内已生成的下游 artifact 没有明显结构错误、同源漂移或老师复核边界破坏，不证明 OCR/Vision 内容、模型判断、人工 gold 标注值或 99% 正确率已经达成。正式 claim 仍必须经过真实脱敏样本、human-labeled dataset、asset preflight、claim audit 和 `eval:k12-material`。

## 2026-06-20：月报输入老师确认与证据回放校验

### 完成内容

* `generate:k12-monthly-report` 现在会在生成前校验月报 input：当前月与上月快照、课堂记录、反馈记录和老师备注都必须是老师确认来源，且学生、月份、确认时间、SkillRun/archive/source-material 标识和非空 evidenceRefs 可回放。
* `inspect:k12-eval-case-package` 复用同一套月报 input 校验，因此真实样本包不能靠手工拼 JSON 或 `{}` 占位绕过月报纵向比较证据链。
* `student_learning_material_evaluation_assets.v0.1` 现在支持 `monthly_report_input_path`；`validate:k12-eval-assets` 会校验同一份月报 input，并把月报 input 覆盖纳入 `claimable99AssetReady` blocker。`generate:k12-eval-artifacts` 可选生成月报时也会把 input/output 两个路径都写回更新后的 manifest。
* `audit:k12-eval-claim` 会把月报 input 缺失单独映射为 `monthly_report_input` artifact focus，不再因为 `monthlyReportInput` 包含 `monthlyReport` 而误报成缺月报输出。
* 新增回归测试覆盖未确认学习材料快照混入月报 input、上月对比来源缺 evidenceRefs、正式资产清单中坏月报 input、claim audit 月报 input 缺失目标四类失败，防止月报生成器、asset manifest 或 claim audit 静默过滤坏来源后仍产出看似可用的月报。

### 遗留问题

* 该校验只证明月报输入来源已确认且可回放，不证明上月材料代表性足够、趋势判断真实正确或 99% 已达成。正式 claim 仍必须依赖真实脱敏材料、老师确认记录、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：模型回归纳入月报输入输出链路

### 完成内容

* `compare:k12-model-regression` 现在会从每个 baseline/candidate analysis 生成老师确认后的 monthly report input、monthly report、delivery bundle 和 teacher review packet。
* 回归比较会校验月报 input 的老师确认、SkillRun/archive/source-material 标识、非空 evidenceRefs、当前月和上月来源月份，以及 monthly report 的 source count、previous_month_source_ids 和纵向比较状态。
* 新增回归测试覆盖候选 analysis 生成违规月报家长可见摘要时，模型回归即使内部指标未显著变化也会因 `monthly_report_input` 无效而失败。

### 遗留问题

* 该补强只说明模型/Prompt/Schema 切换不能绕过月报证据链，不证明真实月报趋势判断已经正确，也不证明 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏样本、老师确认记录、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Human Gold 上游 Artifact 增加题目顺序校验

### 完成内容

* `validateQuestionSegmentationReview` 现在要求 question-segmentation review 的题目顺序与同源 `VisionEvidencePacket.questions` 完全一致；同题号集合被手工重排也会失败。
* `validateGoldLabelAnnotationTask` 现在要求 annotation task、annotation import skeleton 和 Label Studio task payload 的题目顺序都与同源 VisionEvidencePacket 一致。
* 生成 annotation import skeleton 时，每个 reviewer label 都获得独立 question skeleton 副本，避免两个标注员草稿共享数组引用后互相污染。
* 新增回归测试覆盖题目切分 QA 和标注任务被重排后失败的场景。

### 遗留问题

* 该校验只证明上游 artifact 没有在结构顺序上漂移，不证明 OCR/Vision 题目切分正确、人工标注值正确或 99% 已达成。正式 claim 仍必须走真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Readiness 增加外部 Provider 输入校验

### 完成内容

* 复核开源 OCR/Layout/Formula 候选后，继续保持 PaddleOCR/PaddleX 作为第一真实 Provider 候选，MinerU、Pix2Text、CnOCR、LaTeX-OCR 等只作为文档解析、公式或 OCR baseline，不替代本 Skill 的逐题证据链和 human gold 验收。
* `inspect:k12-eval-case-package` 现在会在 `provider/external-vision-input.json` 存在时先校验 `ExternalVisionAdapterInput`，缺 provider 元数据、空 pages/questions、重复 ID、孤儿 page/region 引用、非法 confidence 或跨题 region/evidence 归属都会进入 `artifact_validation_statuses`。
* readiness 下一步会在坏 Provider 输入时返回 `fix_artifact_validation`，不会因为文件存在就推荐 `normalize_external_vision` 或继续 human gold、analysis、monthly、delivery 链路。
* 回归测试新增坏 Provider 输入拦截，并把需要“上游已存在”的用例改成真实合法 Provider fixture，避免 `{}` 占位绕过真实样本包导航。

### 遗留问题

* 该补强只证明 Provider 输入结构能被 adapter 接收，不证明 PaddleOCR/PaddleX 真实 OCR、题目切分、手写识别或逐题判断准确。99% 仍必须等待脱敏真实样本、Provider trial report、question-segmentation review、human gold package、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Evaluation Asset Manifest 纳入外部 Provider 输入

### 完成内容

* `student_learning_material_evaluation_assets.v0.1` 现在支持 `external_vision_input_path`，case package 生成的 `evaluation_asset_case` 会自动写入 `provider/external-vision-input.json`。
* `validate:k12-eval-assets` 会读取 external Provider input，先运行 `validateExternalVisionAdapterInput`，再校验 providerRunId、providerModelVersion、materialId、studentId、sourceKind、pages 顺序和 questions 顺序是否与同一份 `VisionEvidencePacket` 对齐。
* 资产预检报告新增 `coverage.externalVisionInputs`，并在 human-labeled claim readiness 中把 external Provider input 覆盖不足列为 blocker；结构校验可用于调试，但缺该 artifact 不能作为 99% 可宣称资产。
* 回归测试覆盖三类场景：缺 external Provider input 时阻断 claim readiness、合法 Provider input 计入覆盖、坏 Provider input 或 providerRunId 不同源时 asset validation 失败。
* `generate:k12-eval-artifacts` 会在扩展 manifest 时保留 `external_vision_input_path`，并按输出 manifest 目录重新计算相对路径；`audit:k12-eval-claim` 会把缺 external Provider input 映射到 `external_provider_input` artifact focus，避免把它误归为 Provider trial report 缺失。

### 遗留问题

* 该更新只保证 Provider 输出映射输入可回放且与 VisionEvidencePacket 同源，不证明 OCR/Layout/手写识别质量或题目切分正确。真实正确率仍必须依赖真实脱敏材料、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Manifest 保留月报输入路径

### 完成内容

* `generate:k12-eval-case-package` 写出的 `evaluation_asset_case` 现在会带上 `monthly_report_input_path`，不再只在 `artifact_paths` 和 command sequence 中保留该路径。
* `generate:k12-eval-assets-manifest` 的路径标准化逻辑现在会继续保留并相对化 `monthly_report_input_path`，避免从 case package 到正式 asset manifest 时丢失老师确认的月报输入 artifact。
* 回归测试覆盖 case package scaffold 和 manifest generator 两段路径保留，确保 `human-review/monthly-report-input.json` 能进入后续 `validate:k12-eval-assets`。

### 遗留问题

* 该修复只保证月报输入 artifact 路径不会在清单链路中丢失，不证明月报趋势、OCR/Vision 识别、人工 gold 或 99% 正确率已达成。真实 claim 仍必须通过完整 asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：地区与教材版本识别避免出版社误判

### 完成内容

* 确定性材料分类器在识别地区/教材线索时，会先从地区匹配文本中剥离常见教材出版社或教材版本上下文，例如 `北京师范大学出版社`、`牛津上海版`、`江苏凤凰教育出版社` 等。
* 教材版本识别仍然保留原始文本，因此 `北京师范大学出版社` 可以识别为 `北师大版`，但不会仅凭出版社名称额外生成 `北京` 地区线索。
* 新增回归测试覆盖“只有出版社/教材版本时不伪造地区”和“明确出现北京市海淀区时仍保留北京地区 + 北师大版教材”两种情况。

### 遗留问题

* 该修复只减少地区/教材预分类误判，不证明地区卷、教材版本或本地考试口径完全准确。生产级地区规则仍需要真实脱敏材料和省市/机构样本持续扩展，并通过 human-labeled dataset 回归验证。

## 2026-06-20：Teacher Delivery Bundle 锁定月报来源一致性

### 完成内容

* `validateStudentLearningMaterialDeliveryBundle` 现在会校验 `monthly_summary`、`month_over_month_comparison` 和 `first_priority_action` 是否与同一份已验证来源一致。
* 当 delivery bundle 未附带正式 `student_monthly_report_v1` artifact 时，月报字段必须匹配 `StudentLearningMaterialUserFacingResult.monthly_result`；当附带正式月报 artifact 时，字段必须匹配该月报的 `teacher_summary` 和 `month_over_month_comparison.parent_readable_comparison`。
* 新增回归测试覆盖两个风险：缺上月证据时 delivery bundle 被手工改成“和上月相比明显进步”，以及附带正式月报时 delivery bundle 仍沿用旧 result 月报草稿字段。

### 遗留问题

* 该校验只防止最终老师交付包从已验证 result/monthly artifact 漂移，不证明月报趋势本身完全正确。真实纵向比较仍必须依赖老师确认来源、上月可回放证据、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：月报纵向比较只信任可回放上月来源

### 完成内容

* `createStudentMonthlyReportFromConfirmedSnapshots` 现在只把带有非空 `evidence_timeline` source id 的上月报告视为可参与纵向比较的证据来源。
* `comparison_evidence.previous_month_source_count` 改为由去重后的 replayable previous-month source ids 计算，不再叠加旧月报自己的 `readiness.source_count`。
* 当上月报告存在但没有可回放 source id 时，月报会保持 `previous_month_evidence_status=missing`、`previous_month_report_used=false`，并在家长可见比较中保留“先不做强趋势判断”的口径。
* 新增回归测试覆盖旧月报 `readiness.source_count` 被篡改、上月 timeline source id 重复、上月报告缺少 replayable source id 三类情况。

### 遗留问题

* 该补强只保证月报生成器不会产出自相矛盾的上月比较证据元数据，不证明真实月报趋势判断、OCR/Vision、题目切分、human gold 或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏样本、老师确认来源、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Artifact Bundle 沿用人工准备的月报输入

### 完成内容

* `generate:k12-eval-artifacts` 在生成月报输出时，现在会优先读取 manifest 已有的 `monthly_report_input_path`。
* 当已有月报输入路径且未显式 overwrite 时，生成器不会重写该输入，也不再要求额外传入 `monthlyReport.teacherId` / `confirmedAt`。
* 只有缺少 `monthly_report_input_path` 或显式 `overwriteExisting=true` 时，生成器才会根据 analysis 和老师确认 metadata 创建月报输入。
* 新增回归测试覆盖人工准备的 `human-review/monthly-input.json` 被沿用、未被覆盖，并驱动生成出的月报保留人工输入中的 student name 与 source_skill_run_id。

### 遗留问题

* 该补强只保证 case package / asset manifest 链路不会无声绕开人工准备的月报输入，不证明月报趋势判断或 99% 正确率已达成。正式 claim 仍需真实脱敏 OCR/Vision Provider 输出、题目切分 QA、human gold 双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：OCR/Vision 证据归属增加跨页校验

### 完成内容

* `validateExternalVisionAdapterInput` 现在记录每个 region 所属的 page，并拒绝 evidence 引用同一 region 但填写不同 `page_id` 的 Provider 输出。
* `validateVisionEvidencePacket` 也加入同样的跨页 region/evidence 校验，防止手工篡改或中间 artifact 漂移后绕过 adapter。
* 新增回归测试覆盖外部 Provider 输入跨页错配和已生成 VisionEvidencePacket 被篡改后的跨页错配。

### 遗留问题

* 该补强只保证视觉区域引用不会跨页错配，不证明真实 OCR/Layout、手写识别、题目切分或 99% 正确率已达成。正式 claim 仍必须使用真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold package、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Side Input 答案依据增加同题校验

### 完成内容

* 继续复核开源 OCR/Layout/Formula 与标注工具候选后，结论保持不变：PaddleOCR/MinerU/Pix2Text/RapidOCR/Surya/CnOCR/DocLayout-YOLO/LayoutParser/UniMERNet 等只能作为 Provider、公式专项或 benchmark 候选，Label Studio/CVAT 只能作为 human gold 上游标注工具，不能替代 `VisionEvidencePacket`、题目切分 QA、双标仲裁和老师复核链路。
* `validate:k12-eval-assets` 现在把 external answer key / rubric side input 从全局白名单收紧为 `question_id -> evidenceRef` 映射。
* human gold 的 `question_evidence_basis` 会拒绝 q001 使用 q002 的 `side_input.answer_key.q002` 或跨题 packet evidence ref 作为学生答案、答案依据、老师批改依据。
* analysis artifact 的逐题 `question_analyses[*]` evidenceRefs 也会校验同题归属，防止模型输出用另一道题的外部答案依据支撑当前题正误或错因。
* 新增回归测试覆盖 gold basis 跨题 side input 和 analysis 逐题 evidenceRefs 跨题 side input 两类失败场景。

### 遗留问题

* 该补强只证明资产预检不会接受跨题答案依据，不证明真实外部答案文件正确、OCR/Vision 题目切分正确或 99% 正确率已达成。正式 claim 仍必须使用真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：错因诊断增加学生过程证据门

### 完成内容

* 新增 `validateStudentLearningMaterialAnalysisMistakeDiagnosisEvidenceAgainstPacket`，要求知识缺口、过程遗漏、检查习惯等过程性错因必须引用同题 `student_process` 或 `student_note` 证据。
* 若模型在没有同题学生过程证据时写出“粗心、不认真、概念混淆、概念不清、方法错误、思路混乱、检查不足”等表述，runner 会降级为老师复核草稿，asset preflight 也会拒绝该 analysis artifact。
* live runner 现在也按 `question_id -> side_input refs` 传入 external answer/rubric 白名单，和 asset preflight 的同题 side input 校验保持一致。
* Prompt 增加同题学生过程证据要求，减少模型生成阶段的越界错因；最终安全仍由 validator 执行。
* 新增回归测试覆盖 live runner 跨题 side input、无过程证据却诊断检查习惯，以及 asset preflight 拒绝无过程证据的过程性错因。

### 遗留问题

* 该补强只证明模型输出和评测资产不会在无学生过程证据时接受过程性错因，不证明真实学生过程 OCR、手写识别、错因标注或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：家长反馈复制状态跟随老师复核边界

### 完成内容

* `createStudentLearningMaterialUserFacingResult` 现在会检查 analysis 是否仍有老师复核阻断：analysis 级 `teacher_review_required`、risk flags，或任一题 `needs_teacher_review` / `unknown`。
* 只要存在复核阻断，最终 `parent_feedback.status` 会变为 `needs_teacher_review`，`copyable=false`，并附加 `teacher_review_required` warning；blocked feedback 仍保持 blocked，但同样保留复核 warning。
* `validateStudentLearningMaterialUserFacingResult` 会拒绝被手工改成 `draft + copyable=true` 的家长反馈，防止老师报告还需复核时，delivery bundle 或 SkillCard 误给出可复制微信反馈。
* 回归测试覆盖 user-facing result、result file、delivery bundle、teacher review packet 链路，确保该状态会向下游交付包和复核动作延续。

### 遗留问题

* 该补强只保证有证据/复核阻断时不会直接给出可复制家长反馈，不证明家长反馈文案质量、真实 OCR/Vision、题目切分或 99% 正确率已达成。正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：档案更新建议跟随逐题证据充分性

### 完成内容

* 新增 `validateStudentLearningMaterialAnalysisProfileUpdateSuggestionsAgainstPacket`，要求 `draft` 状态的长期档案更新建议必须引用同份 `VisionEvidencePacket` 中已可明确判定正误的题目证据。
* 若档案建议引用 `needs_teacher_review` / `unknown` 题目，runner 会降级，asset preflight 与 case-package readiness 也会拒绝该 analysis artifact。
* `side_input.*` 答案键/评分点现在只允许出现在逐题 `question_analyses` 范围内，不能直接支撑全局报告、家长反馈或档案建议。
* Prompt 增加档案建议证据规则，回归测试覆盖 live runner 的待复核题目、side-input 越界和 evaluation asset 的档案建议拒绝场景。

### 遗留问题

* 该补强只保证 AI 草稿不会把证据不足题目或答案键直接升级为长期档案候选，不证明真实 OCR/Vision、人工错因标注、档案写回质量或 99% 正确率已达成。正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package Readiness 对齐逐题 Side Input 校验

### 完成内容

* `student_learning_material_evaluation_case_package` 现在支持调用方显式传入可选 `answer_keys_path` / `rubrics_path`，并会同步写入 evaluation asset case 与 `analysis_output` 命令环境变量。
* `inspect:k12-eval-case-package` 会识别 case package 或 evaluation asset case 中声明的 answer/rubric side input 文件，解析后传入 analysis 校验。
* case-package readiness 的 `analysis_path` 校验补齐 `buildQuestionEvidenceReadiness`、`validateAnalysisAgainstQuestionEvidenceReadiness`、同题 side-input 白名单、过程性错因证据门和档案更新建议证据门，使它与 live runner / asset preflight 口径一致。
* 新增回归测试覆盖：带有同题 `side_input.answer_key.q001` 的 analysis artifact 在 case package 明确声明 answer key 文件后可以通过 readiness 校验。
* side input 文件本身也会校验：每一项必须包含 `question_id` 或 `questionId`，且题号必须存在于同一份 `VisionEvidencePacket`；生成 case package 的 env 路径也可传入 answer/rubric side input 路径。
* 新增回归测试覆盖：`answer_keys_path` 中出现不存在的 `question_id=q999` 时，case package readiness 会进入 `fix_artifact_validation`。

### 遗留问题

* 该补强只保证真实样本包检查不会误拒绝合法同题 side input，也不会接受题号不存在的外部答案/评分点文件；它不证明外部答案键内容正确、题目切分正确或 99% 正确率已达成。正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Human Gold Evidence Basis 接入 Side Input 同题白名单

### 完成内容

* `validateStudentLearningMaterialGoldLabelPackage` 新增可选 `allowedExternalEvidenceRefsByQuestionId`，在传入同题 side-input 白名单时，会拒绝 `question_evidence_basis` 中跨题使用 `side_input.*` 答案/评分点证据。
* `createGoldLabelPackageFromAnnotationImport` 会把该白名单继续传给最终 gold package 校验，防止 normalized annotation import 生成的 final package 绕过同题 side-input 检查。
* `inspect:k12-eval-case-package` 现在会用同一份 answer/rubric side input 白名单校验 annotation import 转换结果与 final gold package；case package readiness 能提前发现 human gold evidence basis 的跨题 side-input 错配。
* 新增回归测试覆盖 gold-labeling 直接校验和 case-package readiness 两条路径：q001 的 human gold basis 使用 `side_input.answer_key.q002` 会失败。

### 遗留问题

* 该补强只保证 human gold 证据引用结构和 side-input 题号映射一致，不证明外部答案键本身正确、人工标注值正确或 99% 正确率已达成。正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Gold Review Report 复用 Side Input 同题白名单

### 完成内容

* `buildGoldLabelReviewReport` 与 `validateGoldLabelReviewReport` 现在可接收 `allowedExternalEvidenceRefsByQuestionId`，复核报告 readiness 会复用 final gold package 的同题 side-input 证据口径。
* `generate:k12-gold-label-package` 与 `generate:k12-gold-label-review-report` 的文件生成入口支持可选 `XUEMAI_ANSWER_KEYS` / `XUEMAI_RUBRICS`，真实样本包若使用外部答案或评分点，生成命令会按同一份 `question_id -> side_input refs` 白名单校验。
* case package scaffold、case readiness、evaluation asset preflight 和 artifact bundle 生成器都已把 answer/rubric side-input 路径传入 human gold / gold review 链路，避免只在 analysis 侧生效。
* 新增回归测试覆盖：旧口径生成的 ready gold review report 在声明 side-input 映射后会失败；文件生成遇到 q001 引用 q002 external answer key 会拒绝；asset preflight 也会拒绝 stale ready review report。

### 遗留问题

* 该补强只保证 gold review report 不会与 final gold package 的 side-input 证据口径漂移，不证明外部答案键内容正确、人工标注值正确、OCR/Vision 题目切分正确或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Standalone Gold Label 验包命令接入 Side Input 白名单

### 完成内容

* `validate:k12-gold-labels` 对应的文件命令现在会读取可选 `XUEMAI_ANSWER_KEYS` / `XUEMAI_RUBRICS`，并在同时提供 `XUEMAI_VISION_PACKET` 时构建同题 side-input 白名单。
* 直接验 final gold package 时，`question_evidence_basis` 中的 `side_input.*` 答案/评分点引用会和 case package readiness、asset preflight、gold review report 使用同一套 `question_id -> side_input refs` 规则。
* 新增回归测试覆盖：standalone 验包声明 answer key 文件后，q001 使用 `side_input.answer_key.q002` 会失败。
* `SKILL.md` 与 `docs/AI_SKILL_SPEC.md` 已同步说明 direct validation 也要传入同源 side-input 路径。

### 遗留问题

* 该补强只保证 standalone gold package 验证不会忽略已声明的 side-input 题号映射，不证明外部答案键内容、人工标注值、真实 OCR/Vision 或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：eval:k12-material 顶层 Runner Gate 对齐 99% Claim

### 完成内容

* `evaluateStudentLearningMaterialDatasetFile` 的顶层 `ok` 现在跟随 `claimable99Correctness`，不再只表示逐题指标通过。
* 底层 `result.ok` 继续保留“评测指标是否通过”的含义，便于 claim audit 区分模型指标问题和资产链路/样本覆盖问题。
* 新增回归测试覆盖：human-labeled dataset 指标全绿、双标/仲裁/脱敏完成，但缺少 `asset_preflight` 时，`result.ok=true`、`claimable99Correctness=false`、顶层 `run.ok=false`，报告必须提示 `validate:k12-eval-assets`。
* `SKILL.md` 与 `docs/AI_SKILL_SPEC.md` 已同步说明 runner 顶层 gate 与 metric-only 信号的区别。

### 遗留问题

* 该补强只防止外层自动化误把 metric-only PASS 当成 99% 正式通过；它不证明真实 OCR/Vision、人工标注质量、样本代表性或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Provider Candidate Trace 补齐新一轮文档解析候选

### 完成内容

* 复核开源 OCR/Layout/文档解析候选后，继续确认没有发现可直接替代本 Skill 的中文 K12 学生材料逐题分析系统。
* `vision-adapter` 的默认 `pipeline_trace.provider_candidates` 补齐 Docling、MonkeyOCR、olmOCR 和 DeepSeek-OCR，全部标记为 `benchmark_only`，并记录来源 URL、许可/部署复核提醒和边界说明。
* 生成 `VisionEvidencePacket` 的测试已覆盖这些新候选，确保真实 Provider 输出归一化后能携带更完整的 open-source/benchmark trace，后续 `validate:k12-eval-assets` 才能审查候选来源与许可备注覆盖。

### 遗留问题

* 这些新增候选只提升真实样本 Provider 试跑和回归对照的可追溯性，不代表已经接入真实 OCR，也不证明题目切分、手写识别、批改归属或 99% 正确率。正式 claim 仍必须依赖真实脱敏 Provider 输出、Provider trial report、question-segmentation review、human gold package、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：中国大陆 K12 范围与正式初中年级识别补强

### 完成内容

* `material-classifier.ts` 修正 `初中一年级 / 初中二年级 / 初中三年级` 的年级识别，避免被泛化的“一年级 / 二年级 / 三年级”误判为小学年级。
* 明确把香港/澳门/台湾考试体系，以及 IB、A-Level、IGCSE、AP、SAT 等国际课程线索识别为非中国大陆 K12 范围，降低分类置信度并输出复核 warning。
* Skill、AI spec、accuracy framework、quality checklist 已同步“中国大陆 K12”准入边界，避免后续评测资产或模型回归把非大陆课程误混进 99% claim scope。

### 遗留问题

* 该补强只覆盖明确出现的地区/课程线索；模糊材料、真实 OCR 错漏、题目切分和人工 gold 标注质量仍需要真实脱敏样本与 human-labeled dataset 验证。它不代表材料分类或整体逐题分析已达到 99%。

## 2026-06-20：上月月报纵向比较身份校验补强

### 完成内容

* `createStudentMonthlyReportFromConfirmedSnapshots` 现在只会复用同学生、同上月标签、且带可回放 `evidence_timeline` source id 的 `previous_report`。
* `generate:k12-monthly-report` 的文件输入校验会拒绝错学生、错上月、空 source id 或重复 source id 的上月月报，避免真实样本链路把错误 baseline 当成纵向比较证据。
* 新增回归测试覆盖运行时降级和文件入口硬失败两条路径。

### 遗留问题

* 该补强只保证上月月报来源身份和可回放 source id 不漂移，不证明上月素材代表性、趋势判断真实性、OCR/Vision 质量或 99% 正确率。正式 claim 仍必须依赖真实脱敏 Provider 输出、老师确认来源、月报 artifact、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Dataset 99% Claim 绑定 Asset Preflight 身份

### 完成内容

* `evaluateStudentLearningMaterialDatasetBundle` 在正式 claim policy 下不再只信任 `asset_preflight.claimable99AssetReady=true`。
* dataset 级 99% claim 现在要求 `asset_preflight.manifest_id` 与当前 `dataset_id` 一致、`checked_at` 存在，并且 ready=true 时 `blockers` 为空。
* 新增回归测试覆盖“指标通过但 asset preflight 来自别的 manifest / 缺检查时间 / 仍带 blocker”时不能得到 `claimable99Correctness=yes`。

### 遗留问题

* 该补强只防止 dataset 手写或复用错误资产预检元数据，不证明真实样本覆盖、人工标注质量、OCR/Vision 质量或模型正确率已达成。正式 claim 仍必须由真实脱敏样本、同源 asset manifest、asset preflight、claim audit 和 human-labeled dataset eval 共同证明。

## 2026-06-20：自定义 Dataset ID 时保持 Asset Preflight 身份自洽

### 完成内容

* `generate:k12-eval-dataset` 传入自定义 `datasetId` 时，现在会把 `asset_preflight.manifest_id` 写成最终 dataset id，保证生成器产物能满足 dataset-level 99% claim gate。
* 原资产清单 id 会保存在 `asset_preflight.source_manifest_id`，用于追溯这份 dataset 来自哪一份 evaluation asset manifest。
* 新增回归测试覆盖自定义 dataset id 的生成路径，避免正式命令自己产出身份不一致的 dataset。

### 遗留问题

* 该补强只修复 dataset 生成器和 claim gate 的身份一致性，不代表资产预检已经 ready，也不证明真实样本或 99% 正确率已达成。正式 claim 仍必须由真实脱敏 Provider 输出、同源 asset manifest、asset preflight、claim audit 和 human-labeled dataset eval 共同证明。

## 2026-06-20：Artifact Bundle 支持先生成上游 Human-Gold Artifact

### 完成内容

* `generate:k12-eval-artifacts` 不再在每个 case 入口强制要求 `analysis_path`。
* Provider trial report、question-segmentation review、redacted annotation task 和 gold label review report 现在可以在模型 analysis artifact 生成前先补齐，贴合真实样本先 OCR/Vision、再人工标注、再模型分析的顺序。
* user-facing result、月报 input 生成、以及没有现成 result 的 delivery bundle 仍会按需要求 `analysis_path`，避免下游交付物缺模型输出来源。
* 新增回归测试覆盖“无 analysis_path 时只生成上游 human-gold artifact”的路径。

### 遗留问题

* 该补强只解除上游 artifact 生成对 analysis 的不必要阻塞，不代表 OCR/Vision、人工标注或模型分析质量已达成。正式 99% 仍必须等待真实脱敏样本、final gold、analysis/result/monthly/delivery/review packet、asset preflight、claim audit 和 dataset eval 全链路通过。

## 2026-06-20：公开 K12 Benchmark 不能冒充 Human-Gold 真实样本

### 完成内容

* 继续搜索并复核开源 OCR/Layout/Formula、标注工具和中文 K12 benchmark，结论仍是没有发现可直接替代本 Skill 的中文 K12 学生材料逐题分析系统。
* 开源项目扫描补充分层：PaddleOCR、Docling、MinerU、RapidOCR、Surya、CnOCR、公式识别等只能作为 Provider / benchmark 候选；Label Studio / CVAT 只能作为上游标注工具；K12Vista、CMMaTH、CMM-Math、E-EVAL、EduEval、K12-KGraph 等只能作为覆盖和 taxonomy 参考。
* `validate:k12-eval-assets` 增加 `publicBenchmarkSources` 覆盖项。human-labeled manifest 若把 VisionEvidencePacket metadata / source id 标成公开 benchmark 或 source dataset，会阻断 `claimable99AssetReady`，避免公开题库或研究数据集被误当真实脱敏学生作答材料。
* `audit:k12-eval-claim` 现在会把 public benchmark/source-dataset blocker 映射为 `replace_public_benchmark_source` artifact focus，并在 `artifactFocusTargets` 里提示替换为真实脱敏学生材料。

### 遗留问题

* 该补强只拦截公开 benchmark 冒充真实样本，不代表真实样本已采集、双标完成、OCR/Vision 已达标或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏学生材料、同源 Provider 输出、题目切分 QA、human gold 双标/仲裁、老师复核、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：模型回归校验 Human-Gold 内容不漂移

### 完成内容

* `compare:k12-model-regression` 现在不只比较 baseline/candidate 的 case id 集合，还会对相同 case id 的 human-gold case 做稳定 JSON 比较。
* 如果 candidate dataset 静默改了 gold 标签、材料分类、可硬判标记、知识点或错因等 gold 内容，比较会直接失败，防止“换模型”时同时换评测基准。
* 新增回归测试覆盖同 case id 但 candidate gold 正误标签被改写的场景。

### 遗留问题

* 该补强只保证模型回归比较使用同一份 gold 内容，不证明 gold 标注本身正确、样本代表性充分或 99% 已达成。正式 claim 仍必须依赖真实脱敏 Provider 输出、human gold 双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：OCR/Vision Provider 回归校验题目顺序

### 完成内容

* `compare:k12-vision-provider-regression` 现在会输出 `reorderedQuestionIds`，并在同一材料的 candidate Provider 改变 baseline 题目顺序时直接失败。
* 同一 `question_id` 的 candidate 若改变 `page_id` 或 `question_number`，比较也会输出 `changedQuestionIdentityIds` 并失败，防止同题号集合看似一致但页码/题号身份已经漂移。
* Provider 回归数值指标新增页数、总证据数、学生痕迹证据数和答案依据证据数，candidate 即使仍然 `ready_for_human_labeling`，只要少了学生作答/订正/批改痕迹或答案/评分依据，也会失败。
* 逐题 `evidence_type_counts` 也按学生痕迹类和答案依据类聚合比较，避免 candidate 用另一题的新增证据抵消当前题的作答或答案依据缺失。
* 新增回归测试覆盖 candidate 保留相同 `question_id` 集合但倒置题目顺序、summary 证据计数退步，以及 summary 计数不变但逐题证据类别退步的场景，避免 Provider 切换把逐题证据、人工 gold 和老师报告的同题对齐链路打乱。
* Skill、AI spec、产品设计文档和 OCR/Vision Provider 切换决策已同步：Provider 回归比较必须保持页数、题目覆盖、全局和逐题证据数量、题目顺序和同题页码/题号身份。

### 遗留问题

* 该补强只防止结构化题目顺序、题目身份、证据计数和逐题证据类型漂移，不证明 OCR/Vision 识别文本、题目边界或正误判断本身正确。正式 99% claim 仍必须依赖真实脱敏 Provider 输出、题目切分 QA、human gold 双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Human Gold Evidence Basis 校验证据类型槽位

### 完成内容

* `validateStudentLearningMaterialGoldLabelPackage` 在传入同源 `VisionEvidencePacket` 时，现在会校验 `question_evidence_basis` 中 packet evidence ref 的 `evidence_type` 是否匹配所在槽位。
* `student_trace_evidence_refs` 只接受学生作答、订正、过程、笔记或老师批改痕迹；`answer_key_or_rubric_evidence_refs` 只接受 `answer_key` / `rubric` 或同题 `side_input.*`；`teacher_correction_evidence_refs` 只接受老师批改/评语/得分。
* 新增回归测试覆盖同一题内 wrong-type basis ref：answer_key 不能冒充学生痕迹，学生答案不能冒充答案依据或老师批改依据。
* Skill、AI spec、产品设计文档和任务记录已同步：human gold 不只要求 evidence ref 同题，还要求证据类型与证据槽位一致。

### 遗留问题

* 该补强只校验 human gold 证据依据的结构与类型，不证明人工标注值本身正确、样本代表性充分或 OCR/Vision 已达标。正式 99% claim 仍必须依赖真实脱敏 Provider 输出、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Human Gold 仲裁硬判必须有 Reviewer Basis

### 完成内容

* `validateStudentLearningMaterialGoldLabelPackage` 现在会检查 `adjudicated_gold` 中所有 `definitive_judgement_allowed=true` 的题。
* 每个最终可硬判题必须在每位 reviewer 的 `question_evidence_basis` 中具备学生痕迹证据，以及答案/评分点或老师批改证据。
* 新增回归测试覆盖 reviewer label 仍把 q002 标为不可硬判且缺答案依据，但 `adjudicated_gold` 把 q002 改成可硬判的场景；验证器会拒绝这种 unsupported adjudicated hard judgement。
* Skill、AI spec、产品设计文档和任务记录已同步：final gold 不能比 reviewer evidence basis 走得更远。

### 遗留问题

* 该补强只阻止仲裁结果凭空新增硬判，不证明 reviewer 的人工判断值正确，也不证明样本覆盖或 OCR/Vision 质量已达标。正式 99% claim 仍必须依赖真实脱敏 Provider 输出、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Dataset Claim 需要 Case Artifact Provenance

### 完成内容

* `student_learning_material_evaluation_dataset.v0.1` 的 case 现在可以携带 `artifact_provenance`，记录 `asset_manifest_case_id`、final `gold_label_package_path` 和 `analysis_path`。
* `generate:k12-eval-dataset` 从 asset manifest 生成 dataset 时会写入每个 case 的 manifest id、最终 gold package 路径和 analysis 路径。
* 正式 claim gate 现在不再只看 dataset-level `asset_preflight.claimable99AssetReady=true`；如果 case 缺少可回放 artifact provenance，`claimable99Correctness` 仍为 no。
* `audit:k12-eval-claim` 会把缺 case provenance 映射为 `regenerate_dataset_from_asset_manifest:case_artifact_provenance`，提示回到预检后的 asset manifest 重新生成 dataset。
* 新增/更新回归测试覆盖：final gold package 生成的 dataset 可保留 provenance；手写 `asset_preflight` 但只使用 ad hoc `gold_path` 的 dataset 不能 claim。

### 遗留问题

* 该补强只防止手写 dataset 绕过 asset manifest，不证明真实样本已采集、OCR/Vision 质量已达标、human gold 标注正确或 99% 正确率已完成。正式 claim 仍必须依赖真实脱敏 Provider 输出、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：最终交付包结构化月报上月证据状态

### 完成内容

* `StudentLearningMaterialUserFacingResult.monthly_result` 新增 `previous_month_evidence_status` 和 `previous_month_source_ids`。
* `StudentLearningMaterialDeliveryBundle.teacher_delivery` 新增 `monthly_comparison_evidence`，区分来源是 analysis monthly result 还是 attached monthly report，并保留上月来源状态和 source ids。
* `StudentLearningMaterialTeacherReviewPacket.teacher_review_summary` 现在从 delivery bundle 的结构化证据状态计算月报纵向比较状态和上月来源数量，不再从中文文案是否包含“缺少上月”来推断。
* 新增/更新回归测试覆盖：缺上月证据时 user-facing result 必须结构化标记 `missing`；delivery bundle 若篡改结构化上月证据状态会被拒绝；teacher review packet 若篡改月报比较状态或上月来源数量会被拒绝。

### 遗留问题

* 该补强只保证最终交付 artifact 不靠文案猜测月报纵向比较证据状态，不证明真实月报趋势本身正确。正式 99% 仍必须依赖真实脱敏 Provider 输出、老师确认的本月/上月来源、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：大陆地区/教材覆盖 Claim Gate 分桶

### 完成内容

* `mainland-k12-reference` 新增地区/教材覆盖分桶，将原始 `region_or_curriculum_candidate` 归入大陆七大区域、教材版本族和全国卷/新高考考试范围线索。
* `eval:k12-material` 的 dataset coverage、`validate:k12-eval-assets` 的资产 coverage、`audit:k12-eval-claim` 的报告和 next sample targets 都同步输出这些分桶。
* strict 99% claim policy 现在不再只要求若干个地区/教材候选；还要求覆盖足够的大陆区域分组、教材版本族，并至少包含全国卷/新高考等考试范围线索。
* 新增/更新回归测试覆盖分桶函数、dataset report、asset preflight blocker 和 claim audit 采样目标。

### 遗留问题

* 该补强只提升真实样本覆盖审计粒度，不证明地区卷、教材版本或逐题分析已达到 99%。正式 claim 仍必须依赖真实脱敏 Provider 输出、题目切分 QA、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：99% Claim Policy 报告口径可见

### 完成内容

* `StudentLearningMaterialEvaluationDatasetResult` 现在保留本次评测实际使用的 `claim_policy`，避免 dataset report 在自定义本地 policy 下只显示默认严格口径或丢失口径。
* 新增统一的 claim policy requirements formatter，`eval:k12-material` dataset report 与 `audit:k12-eval-claim` audit report 都会输出同一行 `claimPolicy.requirements`。
* `validate:k12-eval-assets` 的资产预检报告也会输出同一套 strict `claimPolicy.requirements`，让人工审查在 dataset 生成前就能看到样本数、题目数、可硬判/需复核题、学段、地区/教材分桶、human-labeled、asset preflight 和 case provenance 等门槛。
* `inspect:k12-eval-case-package` 的 readiness report 也输出同一套 strict `claimPolicy.requirements`，同时继续固定 `claimable99_from_case_package=false`，避免真实样本 scaffold 或半成品 artifact 被误读为 99% 证据。
* 相关测试覆盖默认严格策略中的大陆区域分组、教材版本族、全国卷/新高考线索，以及自定义小 policy 在 report 中的可见性。
* Skill、AI spec、产品设计文档和任务记录已同步：本地小 policy 只能调试链路，严格 99% gate 仍要靠真实脱敏 human-labeled dataset、asset preflight 和 claim audit。

### 遗留问题

* 该补强只让验收口径更透明，不产生新的真实样本、OCR/Vision 质量证明或人工 gold 结论。正式 99% claim 仍必须等真实脱敏样本、双标/仲裁、claimable99AssetReady 和 `claimable99Correctness=yes` 全部满足。

## 2026-06-20：大陆 K12 材料预分类常见表述补强

### 完成内容

* `material-classifier.ts` 扩展了常见大陆学习材料表述：课时作业、课堂作业、随堂练习、一课一练、限时训练、每日一练、专项/专题/巩固/过关训练、诊断卷、质量检测、调研/摸底/综合测试、一模/二模/三模等。
* 年级和学段识别补充了 `小升初`、七上/八下/九上等常见简称；学科线索补充品德与社会、品德与生活、读后续写、七选五、物质科学等材料措辞。
* 地方教材版本线索补充青岛版、北京版、鲁科版、苏科版、沪粤版、仁爱版、湘少版、冀少版、西师版等，并纳入大陆地区/教材 claim coverage 分桶；`青岛版`、`北京版` 等教材名不会被误当成山东/北京地区来源。
* 新增回归测试覆盖课时作业、限时训练、诊断卷、小升初、地方教材名和 false region 防护。

### 遗留问题

* 该补强只提升模型前材料分类入口稳定性，不证明 OCR/Vision、题目切分、逐题正误、错因诊断或月报纵向比较已经达到 99%。正式 claim 仍必须走真实脱敏 Provider 输入、题目切分 QA、human gold 双标/仲裁、资产预检和 dataset eval。

## 2026-06-20：Case Package Provider 输入映射模板

### 完成内容

* `generate:k12-eval-case-package` 现在除 `case-package.json` 和 `evaluation-assets.cases.json` 外，还会写出 `provider/external-vision-input.template.json`。
* 该 template 明确标记为 helper-only，不进入 `evaluation_asset_case`，不参与 asset manifest，也不能作为 99% claim evidence。
* 模板记录正式 `provider/external-vision-input.json` 的目标路径、隐私边界、必填身份字段、pages/questions/evidence 映射要求、题目顺序和 crop_ref / bbox / polygon 要求，以及 Provider candidate trace 的来源 URL 与 license/deployment review 约束。
* 新增回归测试覆盖 template 写出、非正式 artifact 隔离、隐私边界声明和不会生成 raw/source image 目录。

### 遗留问题

* 该补强只是让真实 PaddleOCR/PaddleX 等 Provider 输出更容易映射进统一 adapter input，不生成真实 OCR/Vision 结果，也不证明题目切分、手写识别、老师批改归属或逐题正误达到 99%。正式 claim 仍需要真实脱敏 Provider 输出写入 `provider/external-vision-input.json`，再依次通过 VisionEvidencePacket、Provider trial、题目切分 QA、human gold、asset preflight 和 dataset eval。

## 2026-06-20：External Provider 输入模板误用与几何校验

### 完成内容

* `validateExternalVisionAdapterInput` 现在会在生成 `VisionEvidencePacket` 前拒绝 ID/ref/path 类字段中的 helper template 占位符，例如 `<real-provider-run-id>`、`<crop-ref-created-by-provider-or-review-tool>` 或整字段 `placeholder`。
* 同一预检会校验外部 Provider 给出的 `bbox` 和 `polygon`：bbox 必须是有限数字且满足 `x2 > x1`、`y2 > y1`；normalized 坐标必须在 0-1，pixel 坐标不能为负；polygon 至少 3 个点且每个点坐标合法。
* 回归测试覆盖直接复制 `provider/external-vision-input.template.json` 占位符、反向/零面积 bbox、越界 polygon，以及数学题 OCR 文本中的 `x<2` 不会被误判成模板占位符。
* Skill、AI spec、产品设计文档和任务计划已同步：helper-only template 不能作为正式 Provider input 或 99% claim evidence，坏几何也不能进入后续 human gold 或月报比较链路。

### 遗留问题

* 该补强只是堵住外部 OCR/Vision 输入链路中的模板误用和几何脏数据，不产生真实 Provider 输出，也不证明 OCR 识别、题目切分、逐题正误、错因诊断或月报纵向比较达到 99%。正式 claim 仍需要真实脱敏 Provider 输入、题目切分 QA、human gold 双标/仲裁、asset preflight 和 dataset eval。

## 2026-06-20：上月月报 Baseline 自洽性校验

### 完成内容

* `generate:k12-monthly-report` 的输入校验现在把 `previous_report` 当作完整的上月月报 artifact 检查，而不只检查学生姓名、月份和 `evidence_timeline` source id。
* 新增校验包括：`previous_report.readiness.source_count` 必须是非负整数并与 `evidence_timeline` 数量一致，`comparison_evidence.current_month_source_count` 必须同时匹配 readiness 和 timeline，`previous_month_evidence_status=missing` 时不能携带上上月来源或标记使用过上月报告。
* `previous_report.evidence_timeline` 中每个来源必须有 label、合法 type、summary 和 `usable_for_parent` 布尔值；上月报告的 parent message 和来源 summary 也会过家长禁用表达检查。
* 新增回归测试覆盖学生/月都匹配但 readiness、comparison evidence 和家长文案被篡改的上月报告，确保当前月月报生成前失败。

### 遗留问题

* 该补强保证“作为纵向比较基线的上月月报 artifact”结构自洽且安全，但不证明上月报告本身来自真实代表性样本，也不证明 OCR/Vision、逐题分析或月报趋势达到 99%。正式 claim 仍必须依赖真实脱敏 Provider 输入、老师确认来源、月报 artifact、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：月报 Output 绑定 Replayable Input 来源 ID

### 完成内容

* `validate:k12-eval-assets` 现在会把 `monthly_report_path` 与同一 case 的 `monthly_report_input_path` 做来源 ID 对齐校验，不再只核对月份、学生名和 source count。
* 当前月月报 `evidence_timeline` source ids 必须匹配 input 中老师确认快照/确认来源按月报生成排序后的 ID。
* 上月 `comparison_evidence.previous_month_source_ids` 必须匹配 input 中上月确认来源与可回放 `previous_report.evidence_timeline` 去重后的 ID。
* `inspect:k12-eval-case-package` 也复用同一约束；真实样本包中手工篡改月报当前月或上月来源 ID 时，会进入 `fix_artifact_validation`，不能继续推荐 delivery 或 dataset 命令。
* 新增回归测试覆盖资产清单预检与 case package readiness 两条链路的 source-id 篡改失败场景。

### 遗留问题

* 该补强只保证月报 output 没有脱离同一份老师确认 input，不证明月报趋势判断、上月样本代表性、OCR/Vision、逐题分析或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏 Provider 输入、老师确认来源、月报 artifact、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：关键 Evidence Region 归属进入硬判 Gate

### 完成内容

* `buildQuestionEvidenceReadiness` 新增 `critical_evidence_region_missing` 降级原因。题干、学生答案、答案/评分点、老师批改等关键 evidence 如果没有绑定题内 `region_id`，该题不能进入确定性正误判断。
* `buildQuestionSegmentationReview` 新增 `evidence_region_missing` 题目切分问题。同题 evidence 缺 region 归属时，题目切分 QA 会把该题标为 `needs_teacher_review`，而不是 `pass`。
* Provider trial report 通过复用题目切分 QA 与逐题 readiness，会同步反映 evidence region 归属缺口，真实 OCR/Vision 输出不能靠只填 `question_id` 绕过题内区域归属。
* 新增回归测试覆盖：关键 evidence 缺 region_id 时逐题 readiness 降级；题目切分 review 对同类材料显示 `needs_teacher_review` 并记录 `evidence_region_missing`。
* Skill、AI spec、产品设计文档和任务计划已同步：definitive gold / 模型硬判必须有同题关键 evidence 与题内 region 的可回放归属。

### 遗留问题

* 该补强只保证结构化证据归属不足时不会硬判，不证明 OCR 文本内容、手写识别、老师批改归属或人工 gold 标注值本身正确。正式 99% claim 仍必须依赖真实脱敏 Provider 输入、题目切分 QA、human gold 双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Annotation Import 最终 Gold Package 验包失败即失败

### 完成内容

* `createGoldLabelPackageFromAnnotationImport` 现在在生成 final gold package 后，只要 source-aware validation 存在错误就返回失败，不再允许 `ok=true` 但 `validation.ok=false` 的转换结果继续流转。
* 新增回归测试覆盖 annotation import 把学生作答证据误放进 answer/rubric 槽位时，转换函数会直接失败并暴露 wrong-type basis ref 错误。
* Skill、AI spec、产品设计文档和任务计划已同步：Label Studio/CVAT/manual annotation import 只有在生成包也通过同源 VisionEvidencePacket 验证时，才算 human-gold 链路中的有效产物。

### 遗留问题

* 该补强只堵住人工标注导入后的无效 gold package 流转，不证明人工标签本身正确，也不证明 OCR/Vision、题目切分、逐题正误或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏 Provider 输入、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Annotation Import Draft 不可标记 99% Claimable

### 完成内容

* `generate:k12-gold-label-package` 的 `allowIncomplete` / `XUEMAI_GOLD_LABEL_ANNOTATION_ALLOW_INCOMPLETE=1` 现在只允许缺仲裁 annotation draft 写盘用于调试，返回结果固定不把它标成 `claimable99Correctness=true`。
* 新增回归测试覆盖：缺 `adjudication` 的 annotation import 在 `allowIncomplete=true` 下可以生成 draft package，`requireAdjudication=false` 校验通过但正式 99% 校验失败，命令结果必须 `claimable99Correctness=false`。
* Skill、AI spec、产品设计文档和任务计划已同步：debug draft 不能进入 99% 验收链路，也不能绕过同源 VisionEvidencePacket 的 source-aware validation。

### 遗留问题

* 该补强只修正人工标注草稿的 claim 口径，不产生真实脱敏样本、仲裁结论或 OCR/Vision 质量证明。正式 99% claim 仍必须等真实 Provider 输入、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval 全部满足。

## 2026-06-20：Annotation Import 重建完整 Human Gold Provenance

### 完成内容

* `validate:k12-eval-assets` 现在会把 annotation import 重建出的 final gold package 与 `gold_label_package_path` 做完整 provenance 对齐，不再只比较 case/source identity、label 数量和 `adjudicated_gold`。
* 新增对 reviewer labels、reviewer metadata、逐题 `question_evidence_basis` 和 `adjudicated_by` 的重放一致性校验；如果标注员 ID、证据依据或仲裁员元数据被换掉，即使仲裁结果没变，资产预检也会失败。
* 新增回归测试覆盖 annotation import 中 `reviewer_id` 被改写但 `adjudicated_gold` 不变的场景，确保 human gold dataset 链路不会丢失人工标注来源。
* Skill、AI spec、产品设计文档和任务计划已同步：normalized annotation import 必须重建完整 final gold provenance。

### 遗留问题

* 该补强只能防止 annotation import 与 final gold package 之间出现来源漂移、手工篡改或不完整回放；它不证明人工标签本身正确，也不证明样本量、代表性、OCR/Vision、题目切分或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏 Provider 输入、双标/仲裁、gold review、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package Readiness 复用完整 Human Gold Provenance 比较

### 完成内容

* 新增 `listGoldLabelPackageProvenanceDifferences`，把 annotation import 重建包与 final gold package 的 case/source identity、labels、reviewer metadata、逐题 evidence basis、`adjudicated_gold` 和 `adjudicated_by` 比较逻辑集中到 human gold 模块。
* `validate:k12-eval-assets` 继续保持原有分项错误文案；`inspect:k12-eval-case-package` 在发现 final gold 与 annotation import 重建结果不一致时，会额外指出具体漂移字段。
* 新增 readiness 回归测试覆盖 final gold package 中 reviewer_id 被改写、annotation import 未改写的场景，确保真实样本推进阶段先返回 `fix_artifact_validation`。
* Skill、AI spec、产品设计文档和任务计划已同步：case package readiness 与 asset preflight 使用同一套 human gold provenance 口径。

### 遗留问题

* 该补强只提高真实样本 case package 推进时的错误定位能力，并阻止 final gold 来源漂移；它仍不证明 OCR/Vision 识别、人工标注值、样本代表性、月报比较或 99% 正确率已经达成。

## 2026-06-20：大陆 K12 材料预分类真实别名补强

### 完成内容

* `material-classifier.ts` 补充真实教培场景高频材料名：周末作业、每日作业、寒假作业、暑假作业、假期作业、校本作业、晨测、日清、堂清、课课清、综合练习、期中/期末检测、期中/期末复习卷、复习卷、专题卷、训练卷、测评卷和过关卷。
* 新增材料分类回归测试覆盖寒假作业、周末作业、校本作业、晨测、堂清练习和期中复习卷，确保材料类型、科目、学段、年级和教材版本识别保持稳定。
* Skill、AI spec、产品设计文档和任务计划已同步：预分类负责入口路由和 prompt 约束，不替代学生痕迹、题目切分、答案依据或老师复核 gate。

### 遗留问题

* 该补强只提升材料类型识别覆盖率，不证明 OCR/Vision 内容识别正确，也不允许在缺少学生作答、批改、答案依据或题内 region 归属时进行确定性正误判断。99% claim 仍必须依赖真实脱敏 Provider 输出、human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Notes-only 与 Teacher-mark-only 材料降级边界补强

### 完成内容

* 降级分析的 `missing_context` 现在会明确区分 notes-only 缺少“题目、学生作答、标准答案或老师批改依据”，以及 teacher-mark-only 缺少“学生原始作答、订正内容或解题过程”。
* 新增 runner 回归测试覆盖学生笔记-only 和老师批改-only 两类材料，确保它们在模型调用前降级为老师复核草稿。
* 回归测试确认这两类材料不会产生 profile update suggestions，不会成为 teacher-confirmed 月报素材，也不会输出可发送家长反馈。
* Skill、AI spec、产品设计文档和任务计划已同步：notes-only / teacher-mark-only 只能保留分类和补证据提示，不能替代正式逐题分析证据链。

### 遗留问题

* 该补强只收紧证据不足材料的降级边界，不证明真实 OCR/Vision 能正确识别学生笔记、老师批改或学生作答归属。99% claim 仍依赖真实脱敏 Provider 输出、题目切分 QA、human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Annotation Task Packet-derived Drift Gate

### 完成内容

* `validateGoldLabelAnnotationTask` 现在在传入同一份 `VisionEvidencePacket` 时，会重建 packet-derived annotation task，并校验每题的 `segmentation_status`、`review_required`、`definitive_judgement_allowed_suggestion`、`issues`、regions、evidence summaries 和 evidence basis suggestions。
* annotation import skeleton 和 Label Studio task payload 现在也会对齐同一 packet-derived task，防止标注员拿到的 evidence refs、notes、crop refs、issues 或状态提示与源证据链不一致。
* 新增回归测试覆盖两类漂移：把缺 crop_ref 的题目手工改成可硬判，以及删除 student-trace evidence basis。两类情况都会在 annotation task validator 阶段失败。
* `validate:k12-eval-assets` 通过 annotation task 校验复用该 gate，即使没有单独提供 question-segmentation-review artifact，被手工删改证据 basis 的 annotation task 也会作为资产清单错误暴露。
* Skill、AI spec、产品设计稿和任务计划已同步：脱敏标注任务包不是自由编辑的中间 JSON，必须能从同一份 VisionEvidencePacket 重算出题目切分、区域、证据摘要、basis 建议、skeleton 证据引用和标注工具 payload 证据提示。

### 遗留问题

* 该补强只能防止 human-gold 上游标注任务包在结构化证据链中被手工改绿或删改证据建议；它不证明真实 OCR/Vision 题目切分正确，也不证明人工标注值、样本代表性或 99% 正确率已达成。正式 claim 仍需要真实脱敏 Provider 输入、双标/仲裁、gold review、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：External Provider Input 重建 VisionEvidencePacket 核心字段

### 完成内容

* `validate:k12-eval-assets` 现在在同时拿到 `external_vision_input_path` 和 `vision_packet_path` 时，会用 external Provider input 重新生成 adapter-derived VisionEvidencePacket。
* 资产预检新增核心字段同源校验：pages、questions/regions、evidences、gates、pipeline preprocessing/stages/policies、material_state、metadata 和 plugin_errors 都必须与重建结果一致。
* 新增回归测试覆盖已生成 VisionEvidencePacket 被手工改写 evidence text/crop_ref，以及 gate status/reason 被改写的场景，二者都会在 external Provider input 同源校验阶段失败。
* Skill、AI spec、产品设计文档和任务计划已同步：external Provider input 不只是身份文件，还必须能重建同一份核心结构化证据链。

### 遗留问题

* 该补强只能证明结构化 Provider 输入与 VisionEvidencePacket 没有后期漂移，不证明真实 OCR/Vision 识别准确、题目切分正确或 99% 正确率已达成。正式 claim 仍必须依赖真实脱敏 Provider 输入、Provider trial、题目切分 QA、human gold 双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Readiness 复用 External Provider 重建 Gate

### 完成内容

* `inspect:k12-eval-case-package` 现在会在 `external_vision_input_path` 和 `vision_packet_path` 同时存在时复用 `validateExternalVisionInputAgainstVisionEvidencePacket`。
* pages、questions/regions、evidences、gates、pipeline 核心字段等漂移会暴露在 `external_vision_input_path` 的 artifact validation 中，并把下一步改成 `fix_artifact_validation`。
* 新增 readiness 回归测试：VisionEvidencePacket 本身结构有效，但 evidence text 被手工改写时，readiness 会在下游命令前阻断。
* Skill、AI spec、产品设计文档和任务计划已同步这条 readiness 前置 gate。

### 遗留问题

* 该补强只证明真实样本包内 external Provider input 与 VisionEvidencePacket 同源且未后期漂移，不证明真实 OCR/Vision 识别准确、题目切分正确或 99% 正确率已达成。正式 claim 仍依赖真实脱敏 Provider 输入、题目切分 QA、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Provider 候选角色覆盖进入 99% 资产预检

### 完成内容

* `validate:k12-eval-assets` 的 Provider 候选覆盖报告新增 `coverage.providerRoleCoverage`，分别统计 OCR/文档解析、layout 和 formula 角色是否覆盖每个 case。
* `claimable99AssetReady` 现在会在真实 OCR/Vision case 缺少 OCR/文档解析候选、layout 候选或公式识别候选时保持 `no`，防止数学/理科或综合试卷在未评估公式/版面候选的情况下进入 99% 宣称链路。
* 新增回归测试：Provider candidate trace 结构有效且有 benchmark/source/license 覆盖，但移除全部 formula 候选时，资产结构校验仍可通过，99% readiness 会被 `Provider 公式识别候选覆盖不足` 阻断。
* Skill、AI spec、产品设计稿、open-source scan 和任务计划已同步：开源项目调研必须转成 Provider 角色覆盖和试跑证据，不能只保留链接清单。

### 遗留问题

* 该补强只证明资产链路记录了候选角色覆盖，不证明任何 OCR/Layout/Formula Provider 在真实 K12 材料上已经足够准确。正式 99% claim 仍需真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁 human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Claim Audit 映射 Provider 角色覆盖缺口

### 完成内容

* `audit:k12-eval-claim` 现在会识别 asset preflight 中的 Provider OCR/文档解析、layout 和 formula 候选角色覆盖 blocker。
* 新增 `asset_preflight_provider_role_coverage_missing` gap，并把它映射为 `complete_provider_role_coverage:provider_role_coverage`，让下一批真实样本/Provider trace 补齐目标更具体。
* 新增回归测试：当 dataset 的 asset preflight blocker 包含 `Provider 公式识别候选覆盖不足` 和 `coverage.providerRoleCoverage=...formula:0` 时，claim audit 会输出对应 gap、target 和 artifactFocusTargets。
* Skill、AI spec、产品设计稿和任务计划已同步：claim audit 不只提示 Provider trace/source/license，也会提示候选角色覆盖。

### 遗留问题

* 该补强只把资产预检缺口转成更清晰的采样/补 artifact 目标，不证明真实 Provider 已完成评估或达到 99%。正式 claim 仍必须依赖真实脱敏样本、Provider trial、题目切分 QA、human gold 双标/仲裁、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Scaffold 前置 Provider 角色覆盖提醒

### 完成内容

* `generate:k12-eval-case-package` 生成的 `provider/external-vision-input.template.json` 现在明确列出 `document_parser_or_ocr`、`layout` 和 `formula` 三类 Provider 候选角色要求。
* helper template 的 mapping rules 和 provider trace requirements 会提醒采集者：后续 `VisionEvidencePacket.pipeline_trace.provider_candidates` 必须覆盖 OCR/文档解析、layout、formula 角色，并保留来源 URL 与许可/部署复核备注。
* case package 的 99% readiness checklist 新增 `provider_candidate_role_coverage_document_layout_formula`，让真实样本包在进入 asset preflight 前就能看到该准备项。
* 新增回归断言覆盖 helper template 和 checklist，防止真实样本 scaffold 退回只提示 fallback/benchmark 候选而漏掉角色覆盖。

### 遗留问题

* 该补强只是把 Provider 角色覆盖要求前移到 scaffold 阶段，不证明真实 Provider 输出质量、题目切分质量或 99% 正确率。正式 claim 仍必须由真实脱敏 Provider 输入、Provider trial、题目切分 QA、双标/仲裁 human gold、asset preflight、claim audit 和 dataset eval 共同证明。

## 2026-06-20：Case Package Readiness 校验 Provider 角色覆盖 Checklist

### 完成内容

* `inspect:k12-eval-case-package` 的 checklist 状态不再对 `provider_candidate_role_coverage_document_layout_formula` 只看 `vision_packet_path` 文件是否存在。
* readiness 现在会读取同一份 `VisionEvidencePacket.pipeline_trace.provider_candidates`，只有 OCR/文档解析、layout 和 formula 三类候选角色都存在时，该 checklist 才显示 `present`。
* 新增回归测试覆盖两种情况：没有 provider candidate trace 的 packet 即使文件存在也保持 missing；从 external Provider input 生成且包含 OCR/layout/formula 候选的 packet 才标为 present。
* Skill、AI spec、产品设计稿和任务计划已同步：readiness 可以帮助发现 Provider role coverage 缺口，但仍不能替代 asset preflight 或 dataset eval。

### 遗留问题

* 该补强只避免 case package 自查出现误导性绿勾，不证明候选 Provider 在真实 K12 试卷/作业/错题材料上足够准确。正式 99% claim 仍依赖真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁 human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Readiness 输出 Checklist 摘要与补证据动作

### 完成内容

* readiness report 现在输出 checklist present/missing 数量、缺失 checklist item，以及 `providerRoleCoverageChecklist` 状态。
* 当 `vision_packet_path` 已存在且 VisionEvidencePacket 结构有效，但 Provider candidate trace 仍缺 OCR/文档解析、layout 或 formula 角色时，`next_action.status` 会返回 `complete_checklist_evidence`。
* `nextAction` 文本会带上具体 checklist item：`complete_checklist_evidence:provider_candidate_role_coverage_document_layout_formula`，避免采样人员误以为下一步应该继续 Provider trial 或 asset preflight。
* 新增/更新 readiness 回归断言覆盖 report summary、next action reason 和具备角色覆盖后回到 `provider_trial_report` 顺序命令。

### 遗留问题

* 该补强只提升真实样本包推进提示的可执行性，不代表 Provider 角色覆盖质量已验证，更不代表 99% 正确率达成。正式 claim 仍需真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁 human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Readiness 阻断 Blocked Provider Trial

### 完成内容

* `inspect:k12-eval-case-package` 现在会读取结构有效的 Provider trial report readiness，并在报告里输出 `providerTrialReadiness`。
* 当 Provider trial report 与同源 VisionEvidencePacket 匹配但 `readiness=blocked` 时，`next_action.status` 会返回 `fix_provider_trial_readiness`，不会继续推荐 annotation task、human gold 或 asset preflight。
* claim blockers 会包含 Provider trial blocked 原因，例如 `material_state=blank_template cannot support student performance analysis`，让真实采样人员先修 OCR/Vision 输出或材料状态。
* 新增 readiness 回归测试覆盖结构有效但 readiness blocked 的 Provider trial report，确保它不会被当成可继续的下游输入。

### 遗留问题

* 该补强只阻止 blocked Provider 输出继续进入人工标注链路，不证明 Provider 输出已经达到生产准确率。正式 99% claim 仍需要真实脱敏样本、ready/可复核的 Provider trial、题目切分 QA、双标/仲裁 human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Provider 候选 Trace 增补 dots.mocr

### 完成内容

* 继续复核开源 OCR/Layout/文档解析项目后，将 `rednote-hilab/dots.mocr` 纳入默认 `VisionEvidencePacket.pipeline_trace.provider_candidates`。
* dots.mocr 被固定为 `benchmark_only` document-parser 候选，记录来源 URL、许可/部署/隐私复核提醒，以及不能绕过 `VisionEvidencePacket` 和 human-gold gate 的边界说明。
* 视觉 adapter 回归测试现在断言默认 PaddleOCR packet 和未知内部 Provider packet 都保留 dots.mocr 对照候选，避免后续 Provider trace 只剩单一 OCR 或浅链接清单。
* open-source scan、产品设计说明和 task plan 已同步：dots.mocr 适合真实样本 Provider trial / regression 对照，不直接生成学生能力结论、家长反馈或 99% 正确率宣称。

### 遗留问题

* 该补强只增加一个可试跑/可回归的开源候选，不证明 dots.mocr 或任何 OCR/Vision Provider 已适配中国大陆 K12 真实学生材料。正式 claim 仍需要脱敏真实样本、Provider trial、题目切分 QA、双标/仲裁 human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Case Package Readiness 校验 Asset Cases 同源入口

### 完成内容

* `inspect:k12-eval-case-package` 现在会把 `evaluation-assets.cases.json` 纳入 `artifact_validation_statuses`，使用 `evaluation_asset_cases` validator 校验。
* readiness 会确认 `evaluation-assets.cases.json` 的 `dataset_id`、`dataset_kind`、`description` 和唯一 case 与同一个 `case-package.json.evaluation_asset_case` 保持一致。
* 如果采集人员手工改坏 `case_id`、`vision_packet_path`、`monthly_report_input_path`、`delivery_bundle_path`、`teacher_review_packet_path` 等 asset manifest 入口，readiness 会返回 `fix_artifact_validation`，不会继续推荐 Provider、human gold、analysis、monthly、delivery 或 dataset 命令。
* 新增回归测试覆盖篡改 dataset id 和 VisionEvidencePacket 路径的 `evaluation-assets.cases.json`，并同步 Skill、AI spec、产品设计稿和 task plan。

### 遗留问题

* 该补强只证明 case package 到 asset manifest 的入口更可回放，不证明真实 OCR/Vision、题目切分、人工 gold、模型分析或月报纵向比较已经达到 99%。正式 claim 仍必须依赖真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁 human gold、asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Asset Manifest 生成拒绝 Dataset 元数据漂移

### 完成内容

* `generate:k12-eval-assets-manifest` 从 object-form cases 文件生成正式 asset manifest 时，不再允许用 env/input 静默覆盖文件内已有的 `dataset_id`、`dataset_kind` 或 `description`。
* 当 cases 文件已经声明 dataset 元数据时，外部传入的同名值必须完全一致；只有文件缺字段时才允许外部参数补齐。
* 新增回归测试覆盖 `dataset_id`、`dataset_kind` 和 `description` 漂移，防止从 case package 的 `evaluation-assets.cases.json` 进入正式 manifest 时被误绑到另一个 dataset。
* Skill、AI spec、产品设计稿和 task plan 已同步该约束。

### 遗留问题

* 该补强只防止 asset manifest 身份漂移，不证明真实样本代表性、OCR/Vision 质量、人工 gold 正确性、模型输出或 99% claim 已达成。正式 claim 仍必须跑真实脱敏 human-gold asset preflight、claim audit 和 dataset eval。

## 2026-06-20：Gold Review Report 分歧明细可回放校验

### 完成内容

* `validateGoldLabelReviewReport` 现在会从同一 final gold package 重算 disagreement 的 field、message 和 reviewer value hash 列表。
* 如果 review report 的分歧数量、readiness 仍正确，但 `disagreements` 明细被手工替换或改 hash，standalone 校验和 `validate:k12-eval-assets` 都会失败。
* 新增回归测试覆盖 gold review report 直接校验与 asset preflight 两层，防止人工双标一致性报告只留下正确统计、丢失可审计分歧来源。
* Skill、AI spec、task plan 和 decision log 已同步该 human-gold 守门要求。

### 遗留问题

* 该补强只保证人工双标一致性报告的分歧明细能由同一 final gold package 回放，不证明标注值本身正确、样本覆盖充足或 99% 已达成。正式 claim 仍必须依赖真实脱敏 Provider 输出、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Legacy Mock 用户结果遵守月报证据边界

### 完成内容

* `createMockStudentLearningMaterialUserFacingResult` 不再把旧 mock report 中缺少上月证据来源的 `parent_readable_comparison` 直接展示为“和上个月相比”。
* 当旧 report 的 `previous_month_snapshot` 没有 replayable evidence refs 时，老师月报 note 和 `monthly_result.comparison_to_previous_month` 会展示缺少上月已确认素材/来源证据的说明，并保持 `previous_month_evidence_status=missing`。
* 新增 UI helper 回归测试，确保前端预览层不会在没有上月证据时展示明确纵向进步/退步文案；正式 user-facing / delivery / teacher review 路径的相关测试保持通过。

### 遗留问题

* 该补强只修正 legacy/mock 交付层的月报文案边界，不证明真实月报纵向比较已经具备足够上月证据。正式比较仍必须依赖老师确认来源、monthly report input/output 校验、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Human Gold Side Input 必须有同题映射

### 完成内容

* source-packet human gold validation 现在会拒绝缺少同题白名单的 `side_input.*` 答案/评分点证据引用。
* `side_input.*` 仍只能出现在 `answer_key_or_rubric_evidence_refs`，并且必须由 `XUEMAI_ANSWER_KEYS` 或 `XUEMAI_RUBRICS` 生成的 `question_id -> side_input` 映射支撑。
* 新增 standalone gold package、annotation import 和 asset preflight 回归测试，防止人工 gold 文件或标注导入文件在没有 side-input artifact 的情况下把外部答案当成可硬判依据。

### 遗留问题

* 该补强只保证外部答案/评分点的引用边界更可审计，不证明外部答案本身正确或 99% 已达成。正式 claim 仍必须依赖真实脱敏材料、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package 递归阻断原始学生材料

### 完成内容

* `inspect:k12-eval-case-package` 的隐私边界检查现在会递归扫描 case package 内的目录和文件名。
* 除根目录 `raw-images` 等旧检查外，嵌套 `source-images` / `student-materials` 目录，以及 `.jpg`、`.png`、`.pdf`、`.heic`、`.webp` 等疑似原始材料文件都会触发 `fix_privacy_boundary`。
* 新增回归测试覆盖嵌套 raw/source-material 目录和原始图片/PDF 文件，确保真实样本包不会携带原图或原始试卷文件继续进入 Provider、human gold、月报交付或 asset preflight。

### 遗留问题

* 该补强只根据路径和扩展名拦截明显原始材料，不读取文件内容，也不证明脱敏质量已经充分。正式 99% claim 仍必须依赖受控存储中的真实脱敏材料、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package 内部 Artifact 路径一致性校验

### 完成内容

* `inspect:k12-eval-case-package` 现在会先校验 `case-package.json.artifact_paths` 与同一文件内的 `evaluation_asset_case` 是否一致。
* 如果采集包的命令路径和正式 asset manifest 入口路径发生漂移，例如 `artifact_paths.vision_packet_path` 指向一个文件而 `evaluation_asset_case.vision_packet_path` 仍指向旧文件，readiness 会返回 `fix_artifact_validation`。
* 新增回归测试覆盖内部路径漂移，避免真实样本包继续进入 Provider、human gold、analysis、monthly、delivery、teacher review 或 asset preflight 时使用两套 artifact 口径。
* Skill、验收规则、task plan 和 decision log 已同步该 provenance 守门要求。

### 遗留问题

* 该补强只保证 case package 内部路径映射一致，不证明这些 artifact 已存在、内容正确、样本覆盖充分或 99% 已达成。正式 claim 仍必须依赖真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package Command Sequence 派生一致性校验

### 完成内容

* `buildCommandSequence` 现在作为 case package 命令序列的单一来源导出，readiness 复用它来校验 `case-package.json.command_sequence`。
* `inspect:k12-eval-case-package` 会核对 command sequence 的 step 顺序、命令、required inputs、outputs 和 purpose 是否仍由当前 `artifact_paths` 派生。
* 如果采集包的下一步命令被手工改坏，例如 `normalize_external_vision` 输出到错误 VisionEvidencePacket 路径，readiness 会返回 `fix_artifact_validation`，不会继续推荐错误命令。
* 新增回归测试覆盖 command sequence 输出路径漂移，Skill、验收规则、task plan 和 decision log 已同步该守门要求。

### 遗留问题

* 该补强只保证 case package 推荐命令与 artifact path 单一来源一致，不证明命令已真实执行、artifact 内容正确或 99% 已达成。正式 claim 仍必须依赖真实脱敏 Provider 输出、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## 2026-06-20：Case Package 全链路正向回放

### 完成内容

* 新增 case package readiness 正向回归：从脱敏 external Provider input 生成同源 VisionEvidencePacket，再补齐 Provider trial report、question-segmentation review、redacted annotation task、annotation import、final gold package、gold review report、analysis/result、monthly input/output、delivery bundle 和 teacher review packet。
* readiness 在这套标准路径 artifact 全部存在且验证通过时，所有主要 artifact group 都为 `complete`，除正式 `evaluation-assets.json` 外的 package command 都为 `complete`。
* 该状态下 `next_action` 会推进到 `evaluation_asset_manifest`，提示运行 `generate:k12-eval-assets-manifest`，同时继续保持 `claimable99_from_case_package=false` 并要求后续 asset preflight / dataset eval。
* Skill、验收规则、task plan 和 decision log 已同步该正向 replay 要求。

### 遗留问题

* 该回归使用 synthetic/replayed fixture，只证明 package 链路可以被完整串起来，不证明真实 OCR/Vision Provider、人工标注质量、样本覆盖或 99% 已达成。正式 claim 仍必须使用真实脱敏 human-labeled dataset 通过 Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 `eval:k12-material`。

## 2026-06-20：Case Package 接入 Asset Preflight 阻断回放

### 完成内容

* 新增 follow-on readiness 回归：在完整 case package artifact 链条之后，通过 `generate:k12-eval-assets-manifest` 生成 `evaluation-assets.json`，再重新 inspect 同一个 package。
* readiness 现在在该场景下会把 `evaluation_asset_manifest` 命令标记为 `complete`，读取同一份 `evaluation-assets.json` 的 asset preflight 结果，并返回 `fix_asset_preflight`。
* 回归断言覆盖 `assetPreflight.exists=yes`、`claimable99AssetReady=false`、mock/synthetic Vision source blocker、样本/题目/学科/学段/地区教材等代表性覆盖不足 blocker，同时继续保持 `claimable99_from_case_package=false`。
* Skill、验收规则、task plan 和 decision log 已同步该“manifest 已生成但仍需 preflight 修复”的守门要求。

### 遗留问题

* 该补强只证明 case package 能把正式 asset manifest 的预检阻断项带回采集视图，不证明真实样本、Provider 识别、人工 gold、月报纵向比较或 99% 正确率已经达成。正式 claim 仍必须依赖真实脱敏 human-labeled dataset、asset preflight、claim audit 和 `eval:k12-material`。

## 2026-06-20：Generated Dataset 接入 Claim Audit 阻断回放

### 完成内容

* `generate:k12-eval-dataset` 的文件级回归现在会把从 asset manifest 生成出的 dataset 继续送入 `audit:k12-eval-claim`。
* 回归断言生成的 dataset 保留同批 `asset_preflight.claimable99AssetReady=false`、preflight blockers 和每个 case 的 `asset_manifest_case_id` / final gold package / analysis artifact provenance。
* claim audit 会把这些 blockers 转成 artifact-focused gaps 和 next sample targets，例如 `replace_mock_vision_sources`、`complete_external_provider_inputs`、`complete_provider_trial_reports`、`complete_monthly_comparison_evidence`。
* Skill、验收规则、task plan 和 decision log 已同步该 manifest -> dataset -> audit 的可回放要求。

### 遗留问题

* 该回归只证明预检 blocker 不会在 dataset 生成后丢失，不证明 blockers 已修复，也不证明真实样本覆盖或 99% 正确率已达成。正式 claim 仍必须依赖 `claimable99AssetReady=true` 的真实脱敏评测资产、claim audit 无 blocker，以及 `eval:k12-material` 输出 `claimable99Correctness=yes`。

## 2026-06-20：Claim Audit 生成真实样本采集计划

### 完成内容

* 新增 `generate:k12-eval-sample-plan`，从 `audit:k12-eval-claim` 输出的 claim audit JSON 读取 `next_sample_targets`，生成下一批真实样本采集计划。
* 计划会为每个目标输出建议 case 数、caseId 前缀、case package 目录模板、第一条 `generate:k12-eval-case-package` 命令、后续 readiness 检查命令、覆盖属性要求和 artifact-focus 说明。
* 采集计划显式保留边界：plan 不是 correctness evidence，不能替代真实脱敏学生材料、asset preflight、claim audit 或 `eval:k12-material`。
* 新增回归测试覆盖 synthetic audit、asset-focused blockers、已经 claimable 的空计划，以及 env-driven 文件命令。

### 遗留问题

* 该工具只把缺口转成操作计划，不会生成真实样本、不会调用 OCR Provider、不会完成 human gold，也不证明 99% 已达成。下一步仍需要真实脱敏材料进入 case package，并逐步通过 Provider trial、题目切分 QA、双标/仲裁、月报对比证据、交付包和老师复核包校验。

## 2026-06-20：Sample Plan 批量生成 Case Package 骨架

### 完成内容

* 新增 `generate:k12-eval-sample-packages`，可从 `student_learning_material_evaluation_sample_plan.v0.1` 批量生成真实样本 case package 骨架。
* 生成器复用现有 `generateStudentLearningMaterialEvaluationCasePackage`，每个 package 都保留标准 OCR/Vision、Provider trial、题目切分 QA、annotation、human gold、monthly input/output、delivery bundle 和 teacher review packet 路径。
* 支持 `XUEMAI_EVAL_SAMPLE_PACKAGE_MAX_CASES_PER_PLAN` 与 `XUEMAI_EVAL_SAMPLE_PACKAGE_MAX_TOTAL_CASES`，方便先按小批次采集真实材料。
* 新增回归测试覆盖 sample plan 到 package 骨架、claimable plan 不生成 package，以及 env-driven package 命令。

### 遗留问题

* 生成的 package 仍只是 scaffold，不包含真实 Provider 输出、人工标注、analysis、月报或交付结果，也不会复制原始学生图片/PDF。正式 99% claim 仍要求这些 package 后续逐步补齐真实脱敏 artifact，并通过 readiness、asset preflight、claim audit 和 `eval:k12-material`。

## 2026-06-21：LessonLedger 竞品前端 v2 独立入口还原

### 完成内容

* 冻结旧 `/dashboard`，在独立 `/workbench-v2` 与 `/workbench-v2/login` 内继续还原 LessonLedger 竞品前端，教师端和家长端仍使用隔离 mock data。
* 教师首页对齐竞品关键帧：保留 Qrane 示例账号、三张数据总览卡、今日日程、右侧“今日待处理”与“本周概览”，并补齐 12 条待办计数、家庭账号待激活入口和底部账号下拉感。
* 家长端首页对齐关键帧：保留预约课程、查看服务、授课老师、近期课程、最新反馈、学习报告、账务摘要和通知红点；最新反馈标题统一为“数学 - 日期 - Qrane”。
* 排课总表保留蓝色开放预约、黄色已有课程、右侧预约冲突审核、拖拽改期确认和预约通过写入排课的前端演示流程。
* 完成本轮验证：`npm run typecheck`、`npm run lint`、`npm run build` 均通过；重启 `127.0.0.1:3016` 后，登录页、教师端、家长端均返回 200，API mock 基线保持 `Qrane老师 / 5 节课 / l2 待点名 / l3 待上课 / 5 条流水`。

### 遗留问题

* 当前仍是前端 mock 还原，不接真实账号、支付、微信发送或生产数据。
* 学生档案页已覆盖成绩、薄弱点、学习报告、课程、收款、财务时间线和家校入口，但顶部学生卡片区比竞品视频更强化学生管理，后续如果追求更“一比一”可再压缩。

## 2026-06-21：LessonLedger v2 本地后端契约补强

### 完成内容

* 继续沿用当前 Next.js Route Handlers + TypeScript service + file-backed repository 作为 v2 后端，不引入 Go 或第二套服务进程，避免拆散现有前端类型和 mock 数据契约。
* 后端现在拒绝非 `HH:mm` 时间、未开放蓝色时段内的家长预约，以及空学生预约；冲突预约必须先调整到无冲突时段后才能通过并写入课程表。
* 手动课时流水现在会同步更新学生剩余课时，并规范化充值/扣课/撤销的课时变化与余额。
* 家长端反馈列表优先读取后端已发送 feedback draft；没有真实发送记录时才展示竞品演示默认反馈，避免发布后刷新丢失最新反馈。
* 新增 `tests/lessonledger-service.test.ts` 覆盖开放预约校验、坏时间拒绝、冲突预约调整通过、手动流水余额更新、AI 反馈生成与发布持久化。
* 验证通过：`npx vitest run tests/lessonledger-service.test.ts`、`npm run typecheck`、`npm run lint`、`npm run build`，并通过 HTTP smoke 验证 API 动作后重置 demo 数据。

### 遗留问题

* 当前后端仍是本地 JSON 文件持久化，适合单机演示和竞品还原；多老师真实生产还需要账号体系、权限隔离、数据库迁移和备份策略。

## 2026-06-21：LessonLedger 学生建档后端化

### 完成内容

* 将“新增学生”从前端本地状态提升为 `createStudent` 后端 action，API 支持列表、服务层、前端保存动作和回归测试同步接入。
* 后端会校验学生姓名、家长称呼和重复建档；新增学生使用当前老师账号写入 `teacherId`，并保留年级、关注点、最近成绩和剩余课时。
* 如果建档时填写了初始剩余课时，系统会同步生成一条“新增学生建档初始课时”的充值流水，避免学生余额与财务记录脱节。
* 前端新增学生弹窗保持竞品式教务录入体验，保存成功后读取后端返回的学生 id，跳转到学生档案，并同步账务学生选择。
* 新增服务测试覆盖建档、初始课时流水、家庭邀请联动和重复建档拒绝。

### 遗留问题

* 学生详情里的成绩、薄弱点、课时、家庭账号等已逐步接入后端 action，但还未形成真实账号权限隔离；后续生产化仍需数据库、Auth/RLS、老师/家长可见范围和迁移策略。

## 2026-06-21：LessonLedger 家庭邀请绑定链路修正

### 完成内容

* 修正家庭邀请生成逻辑，不再固定给 `s1/李三` 生成邀请，而是使用当前选中的学生；账号管理表也按学生列表和后端邀请状态展示。
* 家庭邀请激活页进入家长端时会携带 `studentId`，`/workbench-v2?role=parent&studentId=...` 会选中对应学生。
* 家长端首页、课程、账务、反馈、学习报告、通知、资料和预约表单都改为读取绑定学生，避免新学生激活后仍显示李三数据。
* 课程状态、反馈发布、开放预约时段和教师回复沟通改为以后端 action 返回为准，失败时不再先把 UI 标成成功。
* 服务测试补充新建学生生成邀请、激活邀请和重复建档拒绝，覆盖“建档 -> 邀请 -> 激活”基础链路。

### 遗留问题

* 目前家庭账号仍是本地文件后端模拟，没有真实登录态、手机号验证码或权限隔离；生产化需要把 invite token、parent account、student binding 和会话权限拆成正式数据库模型。

## 2026-06-21：LessonLedger 授权更新需求池后端化

### 完成内容

* 将“提交功能需求”从纯前端 toast 提升为 `submitFeatureRequest` 后端 action，需求标题、说明、提交老师、状态和提交时间会写入本地 LessonLedger snapshot。
* 系统更新页和设置页增加需求池展示，提交后刷新仍可看到已提交需求，贴合视频中“授权用户在群内提交需求，测试后推送更新”的竞品能力。
* API 支持列表、类型、seed、repository normalize、服务层和前端同步逻辑已补齐，旧本地数据缺少 `featureRequests` 字段时会自动补默认空数组。
* 服务测试新增需求池回归：空标题拒绝、正常提交持久化、reset 后清空。

### 遗留问题

* 当前需求池仍是单机演示队列，不包含真实群聊入口、后台审核人、测试流转或发布版本关联；后续如果继续做“一比一”生产化，可把状态扩展为排期、测试中、已推送并关联更新说明。

## 2026-06-21：LessonLedger 家校沟通闭环补强

### 完成内容

* 按竞品 PRD 的“围绕反馈发起沟通”规则收紧后端合同：家长沟通必须绑定已知学生、家长称呼必须匹配学生档案、关联课程反馈不能为空，标题和正文按长度校验。
* 新增重复提交保护，避免家长连续点击发送时产生相同线程；老师回复也改为服务端校验非空和长度，回复成功后沟通状态更新为“已确认”。
* 前端同步保留 `issueType`，家长端沟通列表只展示当前绑定学生相关线程；老师端仍可查看全部家长沟通。
* 服务测试新增家校沟通回归，覆盖空标题、正文过短、家长越权、正常创建、重复提交、空回复和老师确认回复。

### 遗留问题

* 当前沟通线程仍使用 `linkedLesson` 文案来表示关联课程反馈，尚未拆成真实 `feedbackId` / `conversationId`；等数据库化时需要把反馈、课程、家长账号和消息线程拆成正式关联模型。

## 2026-06-21：LessonLedger 班课点名持久化

### 完成内容

* 新增 `attendanceRecords` 本地后端数据结构，每次班课点名都会按课程保存每个学生的状态、是否扣课、保存时间和班级上下文。
* `saveAttendance` 现在会校验班课、班级存在、班级成员非空和考勤状态枚举；保存后同时更新班级成员最近考勤、课程状态、反馈状态和班课扣课流水。
* 重复保存同一节班课会覆盖该课的考勤明细，但不会重复生成扣课流水，避免老师修改点名时课时被重复扣减。
* 前端同步 `attendanceRecords`，打开同一节班课点名时优先回填已保存明细；班级页新增“最近点名明细”回显区。
* 服务测试新增班课点名回归，覆盖明细保存、扣课标记、课程状态、成员状态和重复保存不重复扣课。

### 遗留问题

* 当前点名备注和“部分学生无课时规则”的异常标记还没有做成可编辑字段；后续数据库化时可拆出正式 Attendance 表并加入 remark、异常原因和审计字段。

## 2026-06-21：LessonLedger 成绩与薄弱点记录补强

### 完成内容

* 收紧 `addScore` 后端合同：考试名称 2-50 字、成绩必须使用“得分 / 总分”格式、得分不能大于总分、排名必须为正整数或“名次 / 总人数”、备注不超过 300 字。
* 新增成绩保存后会同步学生档案的最近成绩；同一学生、同一考试、同一日期再次保存时覆盖旧记录，避免重复堆积。
* 收紧 `addWeakness` 合同：薄弱点名称 2-50 字、严重程度必须是系统枚举、加强动作必填且不超过 300 字；同名薄弱点会更新而不是重复追加。
* 学生详情的成绩表和薄弱点模块补上“暂无成绩记录 / 暂无薄弱点记录”空状态，适配新建学生建档后的真实视图。
* 服务测试新增成绩与薄弱点回归，覆盖异常成绩、异常排名、最近成绩同步、同名同日期更新、空薄弱点和同名薄弱点更新。

### 遗留问题

* 当前成绩仍沿用前端一栏“得分 / 总分”的输入形式，尚未拆成独立 `score`、`totalScore`、`subject` 字段；后续数据库化时应按 PRD 的 ExamScore 模型拆字段并补编辑/删除确认。

## 2026-06-21：LessonLedger 学习报告去硬编码

### 完成内容

* 调整 `generateStudyReport`，报告来源、摘要、反馈亮点、成绩波动、薄弱点和建议都改为从当前学生的成绩、薄弱点、课程和反馈草稿动态派生。
* 数据质量从“有任意一条数据”改为按成绩、薄弱点、课程/反馈三个来源维度判断；数据不足时报告仍可保存，但标记为“数据较少，仅供参考”。
* 去掉李三/圆锥曲线/取值范围专项等固定话术，避免给其他学生生成报告时串学生上下文。
* 服务测试新增学习报告回归，验证王小满报告会引用二次函数相关成绩和薄弱点，并拒绝出现圆锥曲线硬编码建议。

### 遗留问题

* 当前报告仍是确定性本地文本生成，不是真实 AI 长报告；后续接模型时需要保留“老师确认保存后家长端可见”的边界，并把 sourceIds、periodStart/End 拆成正式字段。

## 2026-06-21：LessonLedger 课时流水与改期重置补强

### 完成内容

* 手动课时流水现在由服务端重新计算余额，不再信任前端填写的余额字段；充值、扣课、撤销会校验课时数范围、最多一位小数和增减方向。
* 扣课超过学生剩余课时会拒绝并返回“课时不足，请充值或确认欠费”，避免静默把余额压到 0 后丢失异常信息。
* 课时流水备注限制为 300 字，日期必须是系统可识别的日期格式，继续保留“充值 / 扣课 / 撤销”三类轻量模型。
* 排课总表拖拽课程并选择“重置状态”时，除了课程状态和反馈草稿，也会清理该课程的班课点名明细，避免历史考勤跟着未来课程走。
* 服务测试新增课时不足、错误符号、改期重置清理反馈草稿和点名记录的回归。

### 遗留问题

* 当前还没有正式“允许欠费”确认流，也没有对历史流水做逐条撤销关联；后续生产化应拆出 ledgerId、courseId、reversalOfLedgerId 和欠费确认字段。

## 2026-06-21：LessonLedger 家庭邀请有效期补强

### 完成内容

* 家庭邀请数据结构新增 `expiresAt`，新生成邀请默认 48 小时有效；旧本地 JSON 缺失有效期时会按 `createdAt + 48h` 自动补齐。
* 激活家庭账号时服务端会校验家长姓名和大陆手机号；超过有效期的待激活邀请会转为 `已过期`，不会误激活家长账号。
* 家庭邀请激活页只在后端状态真实变成 `已激活` 时进入成功页；若后端返回 `已过期`，页面会提示“邀请链接已过期，请联系老师重新生成”。
* 教师端账号管理和生成邀请弹窗显示真实选中学生、家长称呼、邀请状态和到期时间，修掉弹窗固定显示“李三 / 李三家长”的问题。
* 服务测试新增邀请有效期回归，覆盖 48 小时有效期、手机号校验和过期链接不可激活。

### 遗留问题

* 当前家庭账号仍是本地文件后端模拟，没有正式 parent account/session；生产化时需要把 invite token、parentId、student binding、expiresAt 和登录态拆成数据库模型。

## 2026-06-21：LessonLedger 预约冲突规则补强

### 完成内容

* 预约服务层新增预约申请之间的冲突检测：同一学生、同一天、同一时段重复提交会被拒绝；与其它未拒绝预约重叠时会进入“冲突”状态并显示“与预约 xx-xx 学生冲突”。
* 老师审批预约时重新校验已有课程和其它预约申请，避免旧页面状态或重复点击绕过冲突规则；只有调整到无冲突时段后才能通过并写入排课总表。
* 家长端预约时间格、只显示可预约时间、已选预约提示，以及老师端冲突检测弹窗，都从“只看课程”扩展为同时看课程和待处理预约。
* 服务测试新增重复预约、预约与预约冲突、调整后通过的回归用例，并校准原课程冲突用例避免与种子预约重复。

### 遗留问题

* 当前预约申请仍只有轻量状态和冲突文案，没有正式锁定机制或并发事务；生产化数据库版本需要在 booking/request 表上增加唯一约束、时间段冲突查询和审批事务。

## 2026-06-21：LessonLedger 课后反馈合同补强

### 完成内容

* `generateFeedback` 服务端增加本次上课内容、学生上课状态、课后作业的长度校验，避免极短占位文本直接生成家长反馈。
* 反馈生成文案不再固定写入“离心率 / 取值范围”等圆锥曲线内容，而是根据当前课程内容、课堂状态、作业和附件摘要生成通用反馈。
* 附件分析文案从固定学科结论改为“课前基础 / 答题痕迹 / 错题分布”的补充依据表达，未识别附件仍允许基于文字生成。
* `publishFeedback` 增加反馈正文长度校验和风险词拦截，阻止“保证提分、完全不会、基础很差、不认真、严重”等不适合直接发给家长的表达。
* 前端反馈弹窗同步增加内容过短、状态过短、作业过长和风险词即时提示；服务测试新增非圆锥课程不串文案和风险发布拦截回归。

### 遗留问题

* 当前仍是确定性本地反馈模拟，不是真实模型生成；后续接 AI 时要保留相同的输入校验、风险词拦截、老师编辑确认和不自动发送微信边界。

## 2026-06-21：LessonLedger 排课拖动冲突补强

### 完成内容

* `moveLesson` 服务端在原有课程冲突检测之外，增加未拒绝预约申请冲突检测；课程不能被拖到已有待审核、冲突或已通过但未落表的预约时段。
* 改期确认弹窗新增目标时段冲突预览，会显示课程或预约的时间、学生和来源状态；存在冲突时禁用“确认修改”。
* 前端确认移动前也会拦截冲突并提示重新拖动，避免用户点击后才收到泛化失败。
* 服务测试新增“拖到待审核预约时段被拒绝”的回归，同时保留历史课程移动后重置状态、清理反馈草稿和点名记录的验证。

### 遗留问题

* 当前拖拽仍是 HTML5 简化交互，没有正式日历库的拖拽预览、跨天网格吸附或并发锁；生产化时需要配合数据库事务和更强的排课可视化组件。

## 2026-06-21：LessonLedger 家长端移动端布局 QA

### 完成内容

* 使用本机 Chrome headless 截取教师工作台、家长预约移动端和排课页，发现 390px 宽度下家长预约页视觉上容易出现横向截断。
* 将家长端顶部导航外层限制为 `min-w-0/max-w-full` 并保留自身横向滚动，避免导航内容把整个页面撑宽。
* 页面根、主内容区、`Section` 容器和预约页网格补充 `min-w-0` / `max-w-full` 约束，预约卡片状态胶囊改为移动端可换行、桌面端保持紧凑。
* 复测 DOM 宽度显示 `bodyScroll/htmlScroll` 均为 390，主要剩余溢出只来自预期的顶部横滑导航。

### 遗留问题

* 家长端移动导航目前是横向滚动条；后续若做真实手机端，可考虑底部 Tab 或折叠菜单，让预约、反馈、报告入口更接近小程序/移动 Web 习惯。

## 2026-06-21：LessonLedger 工作台首页动态化

### 完成内容

* 教师工作台首页的“本周课程 / 本月实收 / 账户风险”从固定数字改为根据当前 v2 状态派生：课程数、课时小时数、完成课程、已完成课程收入、待上课收入、充值课时、低余额和待续学生都会随操作变化。
* “今日待处理”从硬编码列表改为动态任务：低余额、待续费、待反馈、预约待审核/冲突、家庭邀请待激活、学习报告待生成会按当前数据生成，最多展示 5 条，数量按钮显示真实待办总数。
* 本周概览柱状图改为按当前排课总表日期统计，不再显示固定一到日数据；无课日期保留低高度占位，避免柱状图空白塌陷。
* 使用本机 Chrome headless 截图检查教师工作台，确认动态数字和待办列表没有破坏第一屏布局。

### 遗留问题

* 当前“本月实收”仍以已完成课程价格近似计算，不是真实收款金额；后续生产化应把财务模型拆成收款金额、课时变化和课程消课收入三套字段。

## 2026-06-21：LessonLedger 今日课程状态合同补强

### 完成内容

* `markLessonStatus` 现在在标记“已上课”前校验学生课时余额；余额不足会拒绝并提示“请先充值或确认欠费”，不再把余额静默压到 0。
* 重复标记同一节课为“已上课”不会重复生成扣课流水，保持课程状态和财务流水幂等。
* 标记“学生缺席 / 已取消 / 待上课”会把反馈状态恢复为“未生成”，并清理该课程已存在的反馈草稿，避免取消课程仍挂“待反馈”。
* 前端课程状态按钮会显示后端返回的具体失败原因，老师能直接看到余额不足等业务提示。
* 服务测试新增课程状态回归，覆盖已上课扣课、重复点击不重复扣、取消清反馈草稿、余额不足拒绝。

### 遗留问题

* 缺席是否扣课当前仍采用“不扣课并清反馈”的轻量规则；生产化时需要增加可配置的缺席扣课规则和老师确认备注。

## 2026-06-21：LessonLedger 学习报告发布链路补强

### 完成内容

* 学习报告服务从“生成即保存、立即家长可见”拆成两步：`generateStudyReport` 只生成草稿，`saveStudyReport` 才把报告标为“已保存”并设为家长可见。
* 报告草稿继续从当前学生自己的成绩、薄弱点、课程和反馈派生，并支持记录老师在弹窗里的补充生成要求。
* 确认保存时可以写入“家长可见摘要”，服务端会做长度校验和不适合家长反馈的风险词拦截。
* 前端学习报告弹窗改为真实调用后端生成草稿，预览使用返回的草稿报告；点击“确认保存”后再发布到家长端学习报告页。
* 服务测试更新为覆盖“生成草稿不可见、确认保存后家长可见”的完整竞品流程。

### 遗留问题

* 当前报告内容仍是确定性本地生成，不是真实 AI 大模型；后续接模型时应保留草稿、老师确认、家长可见摘要和风险词拦截这条数据边界。

## 2026-06-21：LessonLedger 学生档案编辑入口补强

### 完成内容

* 学生档案成绩表新增行内“编辑”入口，可回填考试名称、日期、分数、排名和考试情况，保存后回到成绩页。
* 薄弱点统计新增行内“编辑”入口，可回填薄弱点名称、严重程度、来源和后续加强动作。
* 服务层新增 `updateScore` 和 `updateWeakness`，携带原考试/日期或原薄弱点名称作为替换键；即使老师调整了考试名、日期或薄弱点名称，也不会留下重复旧记录。
* 前端新增/编辑共用同一弹窗，但按钮、标题和保存动作会按当前模式区分。
* 服务测试增加成绩改名改日期、薄弱点改名后的替换回归。

### 遗留问题

* 当前成绩和薄弱点还没有删除、批量导入或变更历史；后续如果要做正式家长可追溯版本，需要增加审计记录。

## 2026-06-21：LessonLedger 财务收款口径补强

### 完成内容

* 课时财务流水新增 `cashAmount` 字段，用于区分“课时变化”和“现金收款”，避免把课程价格当作真实收入。
* `addFinanceEvent` 对手工充值增加收款金额校验，充值必须填写大于 0 的金额，并统一格式化为 `¥x`；扣课可不填金额，撤销可明确记录 `¥0` 或退款金额。
* 种子数据和前端 mock 财务数据补充现金金额，首次进入工作台即可看到由真实充值流水汇总出的本月实收。
* 教师工作台、本页财务统计、学生收款摘要和时间线明细都改为展示真实收款金额；财务表新增“收款”列。
* 服务测试新增充值金额规范化、漏填充值金额拦截、扣课不产生收款的回归。

### 遗留问题

* 当前金额仍是轻量字符串字段，没有拆成分币整数、支付渠道、收款账户和退款原因；生产化时应做正式财务字段和不可变审计流水。

## 2026-06-21：LessonLedger 财务筛选与账务待处理动态化

### 完成内容

* 财务页顶部的“全部流水 / 充值 / 扣课 / 撤销 / 待结算”从提示 toast 改为真实筛选，表格只显示当前筛选口径下的流水。
* 当前轻量模型中将“待结算”定义为已产生扣课流水但未记录现金收款的记录，适配独立老师后付费或待核对场景。
* 财务表增加筛选空状态，避免筛选后无数据时页面像加载失败。
* 右侧“账务待处理”从固定三条 mock 改为动态任务：低余额学生、待结算扣课流水、撤销流水会自动生成提醒。
* 点击待处理项会跳到对应学生或对应筛选，老师可继续记录收款或核对账务。

### 遗留问题

* “待结算”目前仍是基于现金金额缺失的轻量判断；正式账务系统应增加结算状态、应收金额、支付渠道、确认人和不可变流水。

## 2026-06-21：LessonLedger 家长端反馈与报告可见性补强

### 完成内容

* 家长端首页“学习报告”卡片改为只读取已保存且家长可见的报告，不再把教师端草稿或兜底报告提前展示给家长。
* 家长端通知里的学习报告标题同样只取已发布报告；没有报告时显示明确空状态。
* 家长端首页和课程页的近期开课记录会按课程日期匹配已发送反馈，匹配不到时“查看反馈 / 沟通”入口禁用并显示“暂无反馈”。
* 家长端反馈列表中的“沟通”按钮会先绑定对应反馈索引，再打开沟通弹窗，避免围绕错误课程发起沟通。

### 遗留问题

* 当前课程与反馈的匹配仍基于日期/文案的轻量规则；正式版本应在反馈对象中保存稳定的 `lessonId`，家长端直接用课程 ID 关联反馈和沟通。

## 2026-06-21：LessonLedger 排课预约视觉与交互打磨

### 完成内容

* 排课总表单元格改为同时展示蓝色开放预约条、黄色已有课程块、待审核/冲突预约标记，老师能在同一张表里看出开放时段、已有课和冲突申请的叠加关系。
* 预约审核侧栏增加冲突、待审核、已通过统计，并按冲突优先排序；假期排课右侧改为展示已开放预约时段和可选 2 小时时间格数量。
* 预约申请详情弹窗补充“推荐无冲突时段”，时间选择扩展为半小时粒度；老师可以先保存调整，再通过预约，保留竞品演示里的冲突处理链路。
* 家长端切换预约日期时会自动选择当天首个可用时间格，避免日期变化后仍残留上一天的无效选择。
* 使用本机 Chrome / Playwright 验证教师端冲突详情弹窗、家长端选时弹窗、桌面截图和 390px 移动视口，未发现相关控制台错误。

### 遗留问题

* 当前排课网格仍是轻量自研表格，尚未引入正式日历库；生产化后如果要做更顺滑的拖拽预览、跨天吸附和多课程叠放，需要再评估专用日历组件。

## 2026-06-21：LessonLedger 授权更新与需求池闭环补强

### 完成内容

* Demo 默认释放一个新版本 `1.0.12`，旧本地快照读取时会自动识别新的最新版本，不会继续卡在旧的“已是最新”状态。
* 授权码增加格式校验；检查更新、执行更新和刷新报告会显示检查中/更新中/授权失败/已更新等状态。
* 执行更新会把教师版本更新到最新版本，同时保留课程、课时流水、家庭账号、学习报告和预约记录；系统更新页会显示各类保留数据的当前数量。
* 功能需求提交增加长度校验，提交成功后进入需求池，并在系统更新页展示“已提交”状态。
* 使用 Playwright 验证系统更新页“检查更新 → 执行更新 → 提交功能需求”流程，页面无相关控制台错误。

### 遗留问题

* 当前更新仍是本地 mock 状态机，没有真实版本包下载、迁移脚本执行或回滚日志；生产化时应增加更新任务记录和迁移审计。

## 2026-06-21：LessonLedger 教师端首屏与排课表紧凑化收口

### 完成内容

* 工作台顶部三张统计卡继续去卡片化：移除阴影、降低圆角和内边距，把标签、数值、辅助状态压成更薄的信息块。
* 今日课程列表保持“时间 / 课程 / 状态 / 操作”的表格结构，配合更窄按钮和标签，让 1440px 首屏能同时看到统计、课程和右侧待处理。
* 排课总表行高、单元格内边距、黄色课程块、蓝色开放预约条、红色冲突块和空槽占位再次压缩，视觉上更接近竞品视频里的密集排课表。
* 用 Chrome headless 截取 `/workbench-v2` 和预约排课页，确认没有明显溢出、断行或空白页问题。

### 遗留问题

* 这轮是第一轮可演示视觉收口，不是逐帧像素级复刻；家长端、反馈/点名/邀请弹窗、移动端和拖拽态仍需要继续按视频关键帧做截图校准。

## 2026-06-21：LessonLedger 家长端反馈沟通链路还原

### 完成内容

* 家长端顶部栏和首页主宽度收窄，首页统计改成绑定学生、授课老师、剩余课次、已发反馈四个薄信息块，更接近竞品家长门户的信息密度。
* 家长首页“学生近期课程”改为表格化列表，保留最近 5 条课程记录，并把“查看反馈 / 沟通”放在每条课程右侧。
* “最新反馈”卡片增加并列的查看全文与沟通入口；反馈详情弹窗改为左侧反馈正文、右侧关联课程和发起沟通入口。
* 发起沟通弹窗顶部展示已关联反馈，默认填入视频中的“想让老师讲讲取值范围的问题”和取值范围沟通正文，打开后可直接发送。
* 修复家长端 390px 移动视口顶部操作按钮被截断的问题，Chrome CDP 验证 `家长首页 -> 查看全文 -> 发起沟通` 链路无运行时异常。

### 遗留问题

* 家长端课程、账务、预约、通知和报告详情还需要继续按关键帧统一密度；教师端点名、邀请、学习报告弹窗也需要做同样的视觉收口。

## 2026-06-21：LessonLedger 教师端关键弹窗视觉收口

### 完成内容

* 班课点名弹窗从下拉选择改成行内状态按钮，老师可以直接给每个学生切换“签到 / 迟到 / 请假 / 缺席”，顶部同步显示各状态人数汇总。
* 家庭邀请弹窗压缩为绑定学生、家长账号、状态三块信息和一个邀请链接区域，主动作只保留复制邀请链接，减少演示时的视觉噪声。
* 学习报告弹窗压缩左右栏密度，左侧展示输入来源、成绩记录、薄弱点、近期课程和生成要求，右侧展示待生成空态与生成后的报告预览。
* 使用 Chrome CDP 验证 `?modal=attendance`、`?modal=invite`、学生页点击“生成学习报告 -> AI 生成草稿”链路，并保存临时截图；未发现运行时异常。

### 遗留问题

* 学习报告仍是本地 deterministic 生成器，不是真实大模型；报告保存后的家长端详情页、预约详情弹窗、授权更新弹窗还需要继续按竞品关键帧压缩。

## 2026-06-21：LessonLedger 家长端账务、报告、预约视觉收口

### 完成内容

* 家长端账务页压缩为三块薄统计卡、流水表和付款方式摘要，家长可以在同一屏看到剩余课次、已收金额、扣课次数、充值/扣课/撤销记录。
* 学习报告页改为家长门户视角，不再直接复用教师端长报告：顶部阶段摘要、近期成绩、反馈摘要、薄弱点、后续安排和来源分区更接近竞品家长端。
* Demo 初始学习报告标记为“已保存 / 家长端可见”，避免首次打开家长端报告页只显示空状态；生成草稿再确认保存的老师流程仍然保留。
* 家长端预约页继续压缩网格和弹窗密度，蓝色开放时段、黄色课程、冲突提示、已选预约、最近预约状态能在桌面视口内同时查看。
* 家长端通知页从简单卡片补成表格式提醒流；我的资料页补齐家长账号、绑定学生、授课老师、最近课程、最近反馈和可见内容摘要。
* 使用 Chrome/CDP 验证家长端报告 hydrate 后正文可见，并保存账务、报告、预约、选时弹窗、通知和资料页临时截图。
* 390px 移动视口验证家长首页、通知、资料、预约、报告页面没有横向溢出。

### 遗留问题

* 这轮家长端主线已可演示，但仍不是逐帧像素级复刻；授权更新弹窗、教师端少数详情弹窗和拖拽细节还需要继续对照视频关键帧精修。

## 2026-06-21：LessonLedger 预约审核、授权更新和拖拽确认收口

### 完成内容

* 教师端预约申请弹窗改为紧凑审核表格，按时间、申请、状态、操作组织，冲突申请突出“处理冲突”，待审核申请可直接通过或拒绝。
* 预约冲突详情弹窗改成两栏审核面板：左侧显示申请信息、冲突检测和推荐无冲突时段，右侧显示调整结果、备注和“修改并通过”。
* 冲突详情打开时默认套用第一个无冲突推荐时段，Chrome 验证“修改并通过”按钮可用，避免演示中仍停在冲突状态。
* 管理授权弹窗补齐更新说明和数据保留清单，授权状态、授权码、当前版本、最新版本、保留课程/课时流水/家庭账号/学习报告/预约记录都在同一弹窗可见。
* 拖拽课程确认弹窗压缩为首屏可完成，原时间、新时间、重置/保留、冲突检查和确认按钮都能在 1366x768 视口内看到。
* 使用 Chrome CDP 验证预约申请列表、冲突详情、授权弹窗和排课表拖拽确认态，并保存临时截图。

### 遗留问题

* 仍未做逐帧像素级复刻；登录页、部分新增/编辑表单弹窗和移动端极端状态还可以继续压缩统一。

## 2026-06-21：LessonLedger 登录入口与高频表单弹窗收口

### 完成内容

* `/workbench-v2/login` 从偏产品介绍的卡片布局改成试用授权入口，登录表单旁直接展示今日课程、本周课程、本月实收、当前版本、演示账号和授权状态。
* 新增学生弹窗改成左侧录入、右侧建档摘要，保存前即可看到学生列表、家长账号、课时余额和成绩/薄弱点/家庭邀请等后续入口。
* 新增课时流水弹窗改成左侧录入、右侧流水预览，充值、扣课、撤销的学生、家长、课时变化、收款金额和余额会在保存前集中显示。
* 使用 Chrome CDP 验证桌面登录页、学生弹窗和财务弹窗；390px 移动视口下三者均无横向溢出。

### 遗留问题

* 登录态错误、更多编辑类表单和极端空数据状态仍没有逐帧校准；当前收口目标是让高频演示路径更像竞品后台。

## 2026-06-21：LessonLedger 今日课程状态确认弹窗补齐

### 完成内容

* 工作台今日课程表的“已上课 / 学生缺席 / 取消”不再直接写入状态，改为先打开“确认课程状态”弹窗。
* 弹窗顶部展示本节课程对象、日期、时间、学科和课程类型，并用状态标签标明将要写入的结果。
* “确认后影响”按今日课程、课时流水、反馈入口三行说明：已上课会扣课并进入待反馈；缺席/取消不新增正常上课扣课，并清理未发送反馈草稿。
* `markLessonStatus` 改为返回成功/失败，确认后只有后端写入成功才关闭弹窗，余额不足等错误仍保留在弹窗上下文中提示。
* Chrome/CDP 临时验证桌面 1440px 和 390px 移动视口均能打开弹窗，弹窗不溢出；lint、typecheck、LessonLedger 关键测试和 build 均通过。

### 遗留问题

* 这轮补齐的是 PRD 明确的状态确认态；完整逐帧还原还需要继续做全页面关键帧审计，而不只是单个弹窗。

## 2026-06-21：LessonLedger 登录态错误与授权状态补齐

### 完成内容

* `/workbench-v2/login` 增加登录状态机，覆盖空态提示、登录中、登录成功、账号密码错误、未授权和网络异常文案。
* 教师端登录会校验授权码格式和试用授权值，账号未授权时保留账号输入并提示输入授权码或联系管理员。
* 登录表单加入教师/家长演示账号快捷填入，便于还原竞品试用入口；按钮在登录中会进入 loading 状态，避免重复点击。
* 提交时从 input ref 读取当前输入值，兼容真实键入、浏览器自动填充和 CDP 自动化输入，不只依赖 React state。
* Chrome/CDP 临时验证了账号密码错误、未授权、成功进入教师端和 390px 移动登录页无横向溢出；lint、typecheck、LessonLedger 关键测试和 build 均通过。

### 遗留问题

* 当前仍是前端 mock 登录，不是真实账号系统；生产化前需要接正式 Auth、登录态过期跳转和服务端授权校验。

## 2026-06-21：LessonLedger 排课拖拽确认态补强

### 完成内容

* 排课总表课程块增加 pointer 事件拖拽链路，避免浏览器原生 drag/drop 在自动化和部分环境中不稳定时无法触发确认弹窗。
* 课程拖到其他日期/时间格后，会继续复用“确认调整课程时间”弹窗，展示原时间、新时间、重置/保留状态、冲突检查和确认调整按钮。
* Chrome/CDP 在当前 3016 构建上复验 `/workbench-v2?role=teacher&view=schedule&scheduleSection=table`，确认拖拽后弹窗出现且无运行时错误；截图保存在 `/private/tmp/lessonledger-schedule-drag-confirm-current-20260621.png`。
* 本轮重新通过 `lint`、`typecheck`、LessonLedger 关键测试、生产 `build` 和三个入口 HTTP 200 smoke check。

### 遗留问题

* 当前仍是前端 mock 与本地文件后端的竞品还原版；后续真正生产化还需要接真实账号、真实 AI 反馈和更完整的数据迁移审计。

## 2026-06-21：LessonLedger 学生档案表格化收口

### 完成内容

* 教师端学生列表从三张大卡压缩为后台表格行，按学生、服务类型、账务状态、下次排课、学习关注和操作列展示。
* 学生档案摘要从四个卡片改成同一张紧凑信息表，保留年级科目、剩余课时、最近成绩、家庭账号和学习状态。
* 成绩记录由大卡片改成流水表，集中展示考试、日期、成绩、排名、考试情况和编辑入口。
* 薄弱点记录由分散行卡改成表格明细，按薄弱点、级别、来源、后续加强和操作维护。
* Chrome/CDP 验证 `/workbench-v2?role=teacher&view=students&studentTab=scores` 桌面和 390px 移动端均无页面级横向溢出；截图保存在 `/private/tmp/lessonledger-students-table-desktop-20260621.png` 和 `/private/tmp/lessonledger-students-table-mobile-20260621.png`。
* 本轮重新通过 `lint`、`typecheck`、LessonLedger 关键测试、生产 `build` 和四个入口 HTTP 200 smoke check。

### 遗留问题

* 学生页已更接近竞品的传统教务后台密度；剩余视觉工作主要是继续按视频关键帧压缩其它二级页面和真实手机浏览器细节。

## 2026-06-21：LessonLedger 沟通中心三栏还原

### 完成内容

* 教师端沟通中心从两栏改为三栏：左侧家长沟通列表，中间关联反馈与对话气泡，右侧反馈辅助。
* 对话详情顶部增加“待处理 / 已确认 / 关闭”状态操作，点击“待处理 / 已确认”会真实更新当前沟通状态标签。
* 右侧反馈辅助补齐待确认草稿、最近已发布反馈和处理记录，更贴近视频 155s 关键帧里的辅助栏。
* 左侧沟通列表压缩为行式列表，减少大卡片感，和学生页一样靠近传统教务后台密度。
* 家长端留言页保留家长门户两栏/单栏布局，并验证 390px 移动端消息气泡和关联反馈可读。
* Chrome/CDP 验证教师端 `/workbench-v2?role=teacher&view=messages` 和家长端 `/workbench-v2?role=parent&view=parentMessages`，均无页面级横向溢出或可见运行时错误；截图保存在 `/private/tmp/lessonledger-teacher-messages-three-column-20260621.png`、`/private/tmp/lessonledger-parent-messages-mobile-20260621.png`。
* 本轮重新通过 `lint`、`typecheck`、LessonLedger 关键测试、生产 `build` 和五个入口 HTTP 200 smoke check。

### 遗留问题

* 沟通中心已完成视频关键帧结构还原；后续如要生产化，需要把关闭状态、消息已读、附件和真实通知推送接入后端。

## 2026-06-21：LessonLedger 课程与收款流水表格化

### 完成内容

* 学生档案的“课程”页从下一节课卡片 + 列表改为课程流水表，按日期、时间、课程、类型、状态和操作展示。
* 课程页顶部补齐总课次、已完成、待上课三个紧凑状态标签，贴近视频里“总课次 / 已完成 / 待上课”的信息组织。
* 学生档案的“收款”页从大统计卡和摘要卡改为同屏表格：上方保留默认单价、每节时长、累计完成、剩余课次、已收金额，下方列出每一笔充值、扣课、撤销、余额和备注。
* “财务时间线”页从卡片时间线改为表格明细，按日期、事件、课时变化、余额、说明和现金列展示。
* Chrome/CDP 验证 `/workbench-v2?role=teacher&view=students&studentTab=lessons|payments|timeline`，桌面三页和 390px 收款页均无页面级横向溢出或可见运行时错误；截图保存在 `/private/tmp/lessonledger-student-lessons-desktop-20260621.png`、`/private/tmp/lessonledger-student-payments-desktop-20260621.png`、`/private/tmp/lessonledger-student-timeline-desktop-20260621.png`、`/private/tmp/lessonledger-student-payments-mobile-20260621.png`。
* 本轮重新通过 `lint`、`typecheck`、LessonLedger 关键测试、生产 `build` 和相关入口 HTTP 200 smoke check。

### 遗留问题

* 前端已更接近视频 185s 的课程/收款流水结构；删除课程、关闭流水、正式收款凭证仍是演示态，生产化需要后端权限和审计记录。

## 2026-06-21：LessonLedger 家庭账号邀请表格化

### 完成内容

* 学生档案的“家庭账号”页从卡片式账号状态改为后台表格，按家庭账号、手机号、备注、绑定学生、状态、有效期和操作列展示。
* 右侧补齐“当前邀请链路”面板，集中展示绑定学生、家长账号状态、48 小时邀请链接、复制邀请和预览入口。
* 页面底部增加“家长门户同步记录”表，覆盖最近沟通、课后反馈和通知记录，便于和家长端可见内容对齐。
* 家庭邀请弹窗保持已压缩样式，和表格页的待激活账号链路保持一致。
* Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=students&studentTab=family` 与 `/workbench-v2/invite/b3a5f55cc8da67a1020b0e88d1126ce5716c88f4e4cf3cf69dafd4000624a047`。
* 验证截图：`/private/tmp/lessonledger-family-table-desktop-20260621.png`、`/private/tmp/lessonledger-family-invite-modal-after-table-20260621.png`、`/private/tmp/lessonledger-family-table-mobile-20260621.png`、`/private/tmp/lessonledger-portal-invite-mobile-20260621.png`；桌面、弹窗、390px 移动端和家长激活页均无页面级横向溢出。
* 本轮重新通过 `lint`、`typecheck`、LessonLedger 关键测试、生产 `build` 和四个入口 HTTP 200 smoke check。

### 遗留问题

* 这轮完成的是家庭邀请前端主流程还原；真实短信/微信通知、账号启停审计和正式 Auth 仍属于后端生产化阶段。

## 2026-06-21：LessonLedger 学习报告详情收口

### 完成内容

* 教师端学生档案的“学习报告”页从简单报告列表改为后台表格，按报告、周期、生成依据、状态和操作列展示，并支持点击切换当前报告详情。
* 报告详情改为左侧来源/状态/家长可见同步信息，右侧完整报告正文；成绩波动、薄弱点、近期反馈、报告结论和后续巩固方向都以表格或报告段落呈现。
* 家长端“学习报告”页改为家长可读报告详情，包含阶段总结、近期成绩、当前薄弱点、近期课程反馈、后续巩固方向、报告概览、报告来源和关联课程反馈。
* 报告生成弹窗保持无破坏验证：Chrome/CDP 只打开“新建学习报告”弹窗，不执行生成或保存，避免污染当前 mock 数据。
* Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=students&studentTab=reports`、`/workbench-v2?role=parent&view=reports`。
* 验证截图：`/private/tmp/lessonledger-reports-teacher-desktop-20260621.png`、`/private/tmp/lessonledger-reports-teacher-modal-20260621.png`、`/private/tmp/lessonledger-reports-teacher-mobile-20260621.png`、`/private/tmp/lessonledger-reports-parent-desktop-20260621.png`、`/private/tmp/lessonledger-reports-parent-mobile-20260621.png`；桌面、弹窗和 390px 移动端均无页面级横向溢出或控制台错误。
* 本轮重新通过 `lint`、`typecheck`、LessonLedger 关键测试、生产 `build`，并重启 3016 稳定预览后复验报告页路由和 Chrome QA。

### 遗留问题

* 学习报告仍是 deterministic 本地生成器，不是真实大模型；完整一比一还需要继续按视频关键帧校准报告弹窗生成后的预览文本和真实 AI 生成延迟状态。

## 2026-06-21：LessonLedger 预约冲突排除收口

### 完成内容

* 家长端预约页补齐“冲突排除”面板：根据黄色已有课程和待审核预约计算可选/冲突时间格，并展示推荐的无冲突时段。
* 家长端选时段弹窗增加候选时间统计，明确显示当前日期无冲突数量和需老师调整数量，保留只看可预约时间的筛选。
* 教师端预约审核列表和排课侧栏补齐“推荐调整至”提示，冲突申请打开详情时会默认套用第一个无冲突推荐时段。
* Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=schedule&scheduleSection=booking`、`/workbench-v2?role=parent&view=booking`。
* 验证截图：`/private/tmp/lessonledger-booking-teacher-desktop-20260621.png`、`/private/tmp/lessonledger-booking-conflict-modal-20260621.png`、`/private/tmp/lessonledger-booking-parent-desktop-20260621.png`、`/private/tmp/lessonledger-booking-picker-modal-20260621.png`、`/private/tmp/lessonledger-booking-parent-mobile-20260621.png`；桌面、弹窗和 390px 移动端均无页面级横向溢出或控制台错误。
* 本轮重新通过 `typecheck`、`lint`、LessonLedger 关键测试、生产 `build`，并重启 3016 稳定预览后复验预约页路由和 Chrome QA。

### 遗留问题

* 预约排课已经完成视频 04:16-05:34 的前端主线还原；真实生产化仍需要正式账号、真实通知、多人抢占时段并发处理和操作审计。

## 2026-06-21：LessonLedger 学生档案首屏压缩

### 完成内容

* 教师端学生管理页顶部从大表格“学生列表”改为横向“学生切换”档案栏，保留学生选择、排课和去结算入口，但不再占用半个首屏。
* 选中学生卡改为黑底强调，非选中学生保持白底薄边框；每张学生卡集中展示家长、年级科目、账务、下次排课和学习关注。
* 学生档案摘要、横向功能标签和成绩流水表在 1440px 首屏内更早出现，更接近竞品视频 185s 的“档案统计 + 横向标签 + 明细表”节奏。
* Chrome/CDP 验证路径：`/workbench-v2?role=teacher&view=students&studentTab=scores`。
* 验证截图：`/private/tmp/lessonledger-students-switch-desktop-20260621.png`、`/private/tmp/lessonledger-students-switch-mobile-20260621.png`；桌面和 390px 移动端均无页面级横向溢出、无框架错误、无控制台错误。
* 本轮重新通过 `typecheck`、`lint`、LessonLedger 关键测试、生产 `build`，并重启 3016 稳定预览后复验学生页路由和 Chrome QA。

### 遗留问题

* 学生档案页已进一步靠近竞品的紧凑后台节奏；后续若继续推进，需要继续逐帧处理其它学生子页、极端移动高度和真实后端操作审计。

## 2026-06-21：LessonLedger 工作台首屏压缩与前端点击 smoke

### 完成内容

* 教师工作台首屏再次压缩：三张统计块降低内边距和字号，今日日程表格行缩短，右侧“今日待处理”从大卡片改为紧凑任务行。
* 工作台主栅格增加顶部对齐，避免左侧日程表被右侧栏撑高后出现大面积空白；本周概览条形图同步降低高度。
* 新增临时 Chrome smoke 脚本 `/private/tmp/lessonledger-frontend-click-smoke.mjs`，覆盖教师端工作台按钮、教师导航、学生标签与弹窗、排课预约弹窗、反馈生成、班课点名、财务/账号/更新/资料动作、家长端首页反馈沟通、家长导航、家长预约选时、通知/资料二级动作和 390px 移动端健康检查。
* Chrome smoke 最终 12 个前端 action 流程全部通过，并输出截图 `/private/tmp/lessonledger-frontend-click-smoke-dashboard-20260621.png`、`/private/tmp/lessonledger-frontend-click-smoke-parent-20260621.png`。
* 工作台密度 QA 复验桌面、状态确认弹窗和 390px 移动端，均无横向溢出、无框架错误、无控制台错误。
* 本轮重新通过 `typecheck`、`lint`、LessonLedger 关键测试、生产 `build`，并重启 3016 稳定预览后复验点击 smoke 与视觉密度 QA。

### 遗留问题

* 这轮完成的是前端主链路可点击可跳转验证，不等于生产后端完成；真实 Auth、真实 AI、真实通知和并发审计仍留到后端/生产化阶段。

## 2026-06-21：LessonLedger AI Provider 后端边界补齐

### 完成内容

* 新增 `src/lessonledger/ai-provider.ts`，为课后反馈和学习报告提供可配置的 DeepSeek/OpenAI-compatible 文本模型边界。
* `runLessonLedgerActionAsync` 接入 `generateFeedback` 和 `generateStudyReport`，API route 改为 await async action；旧的同步 `runLessonLedgerAction` 保留，避免破坏现有 service 测试和本地演示。
* 反馈生成会先构造后端确定的课程、课堂状态、作业和附件上下文；Provider 输出如果为空、过短、过长或包含不安全家长话术，会自动回落到本地 deterministic 文案。
* 学习报告 Provider 只允许覆盖摘要、家长摘要、章节和建议；学生、成绩、薄弱点、课程、来源、可见性等结构字段仍由后端 deterministic 逻辑生成，避免模型改乱事实来源。
* 补充 service 和 route 测试，验证 Provider 输出会被保存到反馈/报告，也验证“基础很差 / 保证提分”等不安全输出会被回落过滤。
* 本轮通过 `typecheck`、`lint`、`tests/lessonledger-service.test.ts`、`tests/lessonledger-route.test.ts`、`tests/workbench-v2-page-state.test.ts`。

### 遗留问题

* 当前未读取或写入任何真实密钥，也没有发起真实模型网络调用；真实 DeepSeek 模型联调、提示词评测、超时/重试策略和生成质量回归仍需后续完成。

## 2026-06-21：LessonLedger 前端点击 smoke 可重复复验

### 完成内容

* 将 `/private/tmp/lessonledger-frontend-click-smoke.mjs` 改为运行前调用 `/api/workbench-v2` 的 `resetDemo` action，避免上一次点击验收留下已点名、已生成反馈或重复流水后污染下一轮结果。
* 修复财务流水、学生账务流水和家长端账务表的 React key 组合，重复 demo 流水不再触发 duplicate key console warning。
* 在 AI Provider 接入、前端 key 修复和生产构建通过后，重启 3016 稳定预览并复跑 12-flow Chrome 点击 smoke：教师端工作台、导航、学生、排课、反馈、点名、财务、账号、更新、资料，以及家长端首页、反馈沟通、预约、通知、资料和 390px 移动端健康检查全部通过。
* 本轮重新通过 `typecheck`、`lint`、`tests/lessonledger-service.test.ts`、`tests/lessonledger-route.test.ts`、`tests/workbench-v2-page-state.test.ts`、生产 `build` 和 `/private/tmp/lessonledger-frontend-click-smoke.mjs`。

### 遗留问题

* 前端主链路已经达到可点击、可跳转、可重复验证的演示态；真实 Auth、真实模型联调、真实微信/通知和生产审计仍属于后续后端生产化任务。

## 2026-08-06：学脉 PRD V4.0 完整整合

### 完成内容

* 将原 2000 余行、混有旧 Agent OS、备课、续费和历史开发指令的 PRD，重构为当前唯一完整产品基线。
* 按现行项目护栏统一了目标用户、材料边界、PC/移动端页面职责、P0/P1 功能、正常与异常流程、状态机、字段、文案和验收标准。
* 固化“反馈优先于入档”的双状态规则，以及 Vision/OCR/Layout 先行、DeepSeek 仅做文本推理、老师确认后才入档的证据与安全边界。
* 纳入学生月报确认素材池、班级逐学生反馈、SkillCard 版本链、Auth/RLS、隐私、幂等写入、非功能需求、指标和 6 周版本计划。
* 在文档导航中明确 `docs/PRD.md` 的权威入口，并将 LessonLedger/历史页面 PRD 定位为研究或实现参考，避免继续扩大学脉当前范围。

### 遗留问题

* 本轮只整合产品文档，未修改业务代码。下一步应按 V4.0 做实现差距审计，优先核对聊天主入口、双状态展示、学生详情页职责、分析详情页和真实 Auth/RLS。

## 2026-08-06：学脉理想终局 Vision PRD

### 完成内容

* 新增独立的 `docs/PRD_理想版.md`，作为学脉未来 24 个月的北极星蓝图，不替代当前 V4.0 实施基线。
* 愿景版覆盖个人老师、机构老师、教研负责人、管理员、家长、学生轻触点和生态开发者，形成 PC、移动端、家长门户、机构后台和开放平台的完整产品矩阵。
* 补齐 16 项 P0/P1 理想能力，包括全渠道工作台、多模态材料分析、受控 Agent Shell、家长合规送达、成长图谱、课程课时、班级批量服务、机构质检、商业化和 Marketplace。
* 为每项能力补充正常/异常流程、状态机、字段、文案和异常处理，并保留证据先行、老师确认、租户隔离、未成年人隐私和禁止自动高风险动作等底线。
* 同步更新文档导航与长期产品入口，明确愿景只能用于战略、叙事和架构预留，不能直接扩张当前代码范围。

### 遗留问题

* 愿景中的具体价格、商业化转化目标、家长端和机构版流程均属于建议默认值，需要在对应阶段通过真实访谈、成本核算和独立 PRD 再确认。

## 2026-08-06：真实痛点与竞品能力整合至 PRD V4.1

### 完成内容

* 基于老师课后反馈耗时、学生材料分散、家长沟通难追踪、机构协作断层和招生教学数据重复录入等真实痛点，升级当前完整 PRD 与理想版 PRD。
* 吸收竞品的新生测评、学习规划、课堂反馈、家长沟通和续费提醒优势，但将其改造成同一学生数据链上的受控工作流，不复制永久家长标签、无证据流失预测、自动发消息和通用 ERP。
* 产品版本固定为个人版和机构版；工作室按是否需要多账号协作归类，集团版及多层组织治理明确不做。
* 新增家长消息分析与跟进、限时服务风险事件、线索转学生身份连续性、机构工作区权限，以及“核心业务状态自建、支付/消息/电子签约等基础设施标准集成”的长期边界。

### 遗留问题

* 竞品材料证明了场景存在，但尚不能证明所有功能的付费优先级。下一步应通过个人老师与机构角色访谈验证家长沟通闭环、同源复用率和机构协作的使用频次，再决定 P1 排期。

## 2026-08-06：微信授权渠道直连纳入 PRD V4.2

### 完成内容

* 将微信能力从“复制后人工标记”升级为“授权渠道消息接收 + 家长身份绑定 + 老师确认发送”，同时保留未接通或授权失效时的复制降级路径。
* 新增渠道连接、联系人绑定、入站/出站消息和发送尝试数据对象，补齐回调验签、防重放、消息去重、幂等发送、结果未知防重发、授权过期和解绑停用要求。
* 更新当前版与理想版流程、页面、功能、状态、字段、指标、验收和路线图；明确 AI 不得静默自动外发，也不通过个人号 Hook、模拟登录、模拟点击或账号托管接管个人微信。

### 遗留问题

* 具体可用的微信能力取决于首选渠道、主体资质、授权 Scope 和平台实时规则。开发前需要冻结首个连接器及其消息类型、发送窗口、联系人标识、回执能力和审核要求。

## 2026-08-06：学脉 PRD 按纯产品形态重做

### 完成内容

* 将当前完整 PRD 重做为 V5.0.0，只保留目标客户、真实痛点、竞品启示、产品版本、页面结构、核心旅程、功能、状态、指标、验收和阶段路线。
* 将理想版重做为 Vision V3.0.0，围绕个人版和机构版的完整产品体验，串联家长咨询、新生测评、课堂、学生材料、微信沟通、成长档案、阶段报告、服务跟进和续费准备。
* 微信直连统一按产品体验表达：家长消息进入学生会话，AI 辅助整理，老师确认回复，结果进入沟通记录并继续跟进。
* 删除主 PRD 中与产品评审无关的实现表达，保留“AI 辅助、老师负责”“无学生痕迹不判断”“不做永久标签和结果保证”等产品底线。

### 遗留问题

* 两份文档已可用于产品评审；下一步需要用真实个人老师和机构角色访谈验证功能优先级、页面入口和付费价值，避免继续按竞品功能数量扩张范围。

## 2026-08-06：总览与批量管理纳入产品 PRD

### 完成内容

* 当前版升级为 V5.1.0，新增个人总览、机构总览和独立批量管理页；总览覆盖学生、班级、课程、反馈、家长沟通、跟进、新生和机构协作状态，并可从数字或异常直接进入清单。
* 批量管理覆盖学生分班、负责人分配、服务状态、反馈/月报草稿、普通跟进、交接和符合条件的归档，同时提供筛选、多选、影响确认、处理进度与逐项结果。
* 理想版升级为 Vision V3.1.0，将总体视图和批量能力加入个人版、机构版、关键页面、功能地图、指标、路线和验收。
* 明确批量边界：个性化结果按学生独立，批量生成不等于批量确认，未检查反馈不能直接批量发送，长期档案不能一键批量确认，高风险家长事项不能普通批量关闭。

### 遗留问题

* 总览首屏信息密度和第一批批量动作仍需通过高学生量个人老师、教务和机构管理员访谈排序，避免总览变成大而空的数据看板。

## 2026-08-06：完整产品功能结构总地图

### 完成内容

* 新增 `docs/产品功能结构.md`，将此前真实痛点、两组竞品启示、个人版与机构版边界及当前 PRD 合并为统一功能总地图。
* 产品按 5 个一级入口和 F01—F20 模块组织，完整覆盖咨询、测评、正式服务、课堂记录、材料分析、家长微信反馈、档案、报告、跟进、服务结束与续费准备。
* 补充服务周期、完整服务时间线、数据接入中心和历史迁移，明确外部课程、课次、出勤和服务状态只作为学生服务背景，不扩展为完整教务、财务或人事后台。
* 按 P0、P1、P2 拆分实施边界，并为个人版和机构版给出能力矩阵、统一状态和明确不做清单。

### 遗留问题

* 功能结构已经完整，但 P1 内部优先顺序仍需通过真实个人老师、授课老师、班主任、课程顾问和机构负责人访谈确认；功能总地图不能直接等同于单期开发范围。

## 2026-08-06：从本体重组产品形态

### 完成内容

* 新增 `docs/产品本体与产品形态.md`，将需求还原为学生、关系、事件、证据、结论产物和责任承诺六类稳定本体，明确状态、来源和页面只是对这些本体的投影。
* 将原有功能重新组合为一个学生服务主线、个人版/机构版两种模式，以及工作台、会话、学生、班级、管理五个主页面。
* 总览与待处理合并为工作台；批量管理降为对象列表和管理页中的操作模式；新生、测评、月报、续费不再被理解为独立数据系统。
* 当前 PRD 升级为 V5.2.0，理想版升级为 Vision V3.2.0，并同步更新功能结构和项目护栏。

### 遗留问题

* 五个主页面的首屏信息层级、移动端导航和管理页的信息密度仍需在页面信息架构阶段验证，但不得重新拆回互不相通的功能孤岛。
