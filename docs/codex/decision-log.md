# Codex Decision Log

## Decision 001：停止流水账式开发记录

### 决定

后续 Codex 接续记录只维护 `docs/codex/task-plan.md`、`docs/codex/dev-log.md` 和 `docs/codex/decision-log.md`。`dev-log.md` 每个 Phase 最多写一次，控制为阶段总结；`decision-log.md` 只记录影响长期架构、数据库、Agent 行为、Harness 分层、权限安全或数据生命周期的关键决策。

### 原因

流水账式开发日记会消耗上下文，也会降低后续 Codex 读取项目状态的效率。项目需要的是阶段状态和长期决策，而不是普通文件创建、按钮样式、琐碎 bug 修复或 import/export 调整过程。

### 影响

后续完成普通开发任务时，不再默认追加冗长 `开发日记/YYYY-MM-DD_开发日记.md`。如果确实需要保留信息，应优先判断它属于 Phase 总结还是关键决策，并写入对应 `docs/codex/` 文件。

## Decision 002：AI 输出不直接进入学生长期档案

### 决定

AI 生成内容先进入 `agent_outputs`，老师确认后才写入 `feedback_history` 和 `student_learning_records`。

### 原因

避免模型幻觉或未经确认的建议污染学生长期画像。

### 影响

后续 Student Profile Agent、Monthly Report Agent 等只能把 confirmed records 当作长期事实；未确认 AI 草稿只能作为待审核输出或辅助上下文。

## Decision 003：Parent Feedback Agent 是第一链路，不是系统边界

### 决定

第一阶段优先交付 Parent Feedback Agent，但底层必须按可复用 Harness Core 设计，支持未来 Wrong Question Analysis、Student Profile、Monthly Report、Batch Feedback 和 Orchestrator Agent。

### 原因

项目目标是 Teaching Agent Operating System，不是一次性微信反馈 Demo。

### 影响

命名、目录、API、日志和数据模型都必须避免写死为单一反馈功能；共享能力应沉淀到 model、context、tools、memory、evaluation、guardrails、logging、recovery 等分层。

## Decision 004：所有高风险写入必须有人类确认

### 决定

自动发送消息、覆盖学生档案、批量写入长期记录等高风险动作必须由老师显式确认。

### 原因

教学数据和家校沟通都涉及隐私与责任边界，不能让模型自主完成不可逆动作。

### 影响

Agent API 和 UI 必须保留 inspect、edit、confirm、save 的人类确认链路；模型只能生成建议或草稿，不能直接替老师执行外部发送或长期档案覆盖。

## Decision 005：`src/agents/` 作为长期 Agent 架构边界

### 决定

后续 Agent Registry、Agent 类型、Parent Feedback Agent、Orchestrator skeleton 和 Shared Harness Core 统一放在 `src/agents/` 下。现有页面、mock 工作台和 `lib/ai` 暂不迁移，等具体 Phase 需要时再接入。

### 原因

先建立稳定边界，可以避免 Parent Feedback Agent 继续以单个 API 或页面逻辑形式扩张，也为错题、画像、月报、批量反馈和总控 Agent 预留一致入口。

### 影响

后续新增 Agent 能力时，应优先判断是否属于 `src/agents/` 的 Agent/Harness 层；UI 只负责交互和展示，不能承载 Agent workflow、工具权限、日志或数据生命周期逻辑。

## Decision 006：Phase 2 migration 采用非破坏式增量策略

### 决定

数据库升级通过 `supabase/migrations/202606070001_teaching_agent_os_v12_schema.sql` 落地。迁移只使用 `create table if not exists`、`alter table add column if not exists`、索引和非验证外键约束，不执行 drop、delete、truncate、rename。

### 原因

当前仓库没有可读取的旧 Supabase migration，但远端数据库可能已有旧表。非破坏式迁移能最大限度保留旧数据，并让后续按实际远端状态补充回填或兼容 adapter。

### 影响

如果远端已有同名旧表且字段类型不一致、缺少 `id` 主键或存在重复 `class_students` 关系，迁移可能需要人工调整后再执行。

## Decision 007：Auth 未接入前暂不启用 RLS

### 决定

Phase 2 schema 保留 `teacher_id` 权限边界和 RLS TODO，但不在 migration 中启用 RLS policy。

### 原因

当前项目还没有 Supabase Auth 和从 session 派生 `teacher_id` 的服务端路径。提前启用 RLS 会阻断现有 mock/原型流程，也可能诱导前端传入可伪造的 teacherId。

### 影响

Phase 3/Phase 4 接入真实 API 前必须补上 Auth session -> teacher_id 的链路；正式上线前必须启用 RLS，保证老师只能访问自己的学生、班级、记录和 Agent 输出。

## Decision 008：默认模型提供方改为 DeepSeek，模型层保持 provider-agnostic

### 决定

项目默认使用 DeepSeek API，统一环境变量为 `AI_PROVIDER`、`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`。OpenAI SDK 只作为 OpenAI-compatible client 使用，不能把 OpenAI 作为唯一提供方假设。

### 原因

模型供应商可能切换，Agent Harness 不应把业务 Agent、prompt、workflow 和某个厂商能力绑定在一起。DeepSeek 是当前默认，但后续切回 OpenAI 或其他兼容服务应只改环境变量。

### 影响

所有服务端模型调用必须经过 `src/agents/shared/model/`。严格 structured outputs、tool calling、JSON response mode 等能力必须在模型层做 capability check 或 fallback，不能让业务 Agent 直接依赖厂商特性。

## Decision 009：先落地 Shared Harness Core，再实现具体业务 Agent

### 决定

Phase 3 先建立 `src/agents/shared/` 下的 run、context、tools、logging、evaluation、guardrails、recovery 等共享骨架。Parent Feedback Agent、Wrong Question Analysis Agent、Student Profile Agent、Monthly Report Agent、Batch Feedback Agent 和 Teacher Orchestrator 后续都必须通过这些边界运行。

### 原因

如果直接在 Parent Feedback Agent 中写运行流程、上下文拼装、日志、评分、兜底和权限判断，后续其他 Agent 会复制同类逻辑，导致 Harness 分层失效。

### 影响

Phase 4 开始实现 Parent Feedback Agent 后端核心时，只能把业务 prompt、输入输出契约和 workflow 放在业务 Agent 层；模型调用、隐私安全日志、工具权限、评估、护栏和恢复策略应继续复用 Shared Harness Core。

## Decision 010：Agent 后端写入使用 server-only service role client

### 决定

Agent 后端写入 Supabase 时使用 server-only client，读取 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。前端不得读取 service role key，业务组件也不能直接导入该 server client。

### 原因

`agent_runs`、`agent_outputs`、`feedback_history` 和 `student_learning_records` 属于服务端受控写入。使用 anon key 会受权限限制，也容易诱导前端持有不该拥有的写权限。

### 影响

Auth/RLS 接入前，后端必须显式校验 `teacher_id`、`student_id` 和 `agent_output_id` 的归属关系。Auth/RLS 接入后，`teacherId` 必须从 session 派生，service role 的使用范围应限制在 API route 和 Agent backend。

## Decision 011：当前前台主线切换为 Workflow-first Skill Shell

### 决定

根据 PRD v3，当前 MVP 主线从较重的 Teaching Agent OS 多 Agent 叙事，收敛为微信式 AI 教学工作台：聊天是入口，Skill 是执行，SkillCard 是结果载体，确认入档才进入长期记忆。`src/skills/` 作为当前前台工作流主线；`src/agents/` 保留为后端 AI 能力和长期 Agent Harness 储备。

### 原因

第一阶段最重要的是跑通可控教学服务闭环，而不是提前引入复杂多 Agent、LangGraph、Redis、向量库或生产 MCP。Workflow-first 可以更快验证学生会话、学习记录、微信反馈、确认入档和月报复用。

### 影响

后续 UI 胶囊、SkillCard、ArchiveLog 和 mock 执行应优先通过 Skill Registry / Skill Runner。真实 AI 接入时也应先进入 Skill Runner，再复用 `src/agents` 中已有模型、日志、护栏等后端能力，不能让 UI 按钮直接调用 LLM 或写正式档案。

## Decision 012：真实写入 API 不再信任请求体 teacherId

### 决定

Parent Feedback 生成和确认 API 的 `teacherId` 必须从 Supabase Auth session / user.id 派生。请求体中的 `teacherId` 即使存在也会被忽略。service role 写入前必须完成 session-derived teacherId 和 ownership check。

### 原因

前端传入 `teacherId` 可伪造；如果与 service role client 组合，会绕过 RLS 并造成跨老师访问风险。

### 影响

未登录请求返回 401，无权访问学生或 AI 草稿返回 403。后续所有真实写入 API 都应沿用同一 auth helper 和 ownership helper。

## Decision 013：Parent Feedback 确认入档使用 RPC 幂等边界

### 决定

确认入档通过 `confirm_parent_feedback_archive(...)` 数据库 RPC 完成，并为 `feedback_history.agent_output_id` 与 parent_feedback 类型的 `student_learning_records.agent_output_id` 增加唯一索引。

### 原因

确认入档会同时影响 AI 草稿状态、反馈历史、长期学习记录和老师编辑事件。分散写入容易半成功或重复入档。

### 影响

同一个 `agent_output_id` 重复 confirm 应返回已有结果，不新增重复长期事实。执行新代码前需要先在 Supabase 执行对应 migration。

## Decision 014：Skill Shell 持久化采用并行兼容层

### 决定

PRD v3 前台 Skill Shell 使用 `skill_runs`、`skill_cards`、`skill_card_events`、`skill_card_edits`、`skill_archive_logs` 作为持久化兼容层；现有 `agent_runs`、`agent_outputs`、`feedback_history`、`student_learning_records` 暂不替换。

### 原因

`agent_*` 表更适合记录后端 AI 执行和草稿边界，SkillCard 还包含前台卡片状态、老师按钮事件、编辑链和聊天流 ArchiveLog。直接混用会让 UI 回放和长期事实边界变得模糊。

### 影响

后续真实同步应先通过 server-side adapter 写入 Skill Shell 表，再按老师确认结果写入 confirmed records。mock/local 的字符串 id 只能存入 `external_*` 字段用于兼容和去重，不能作为生产主键或权限依据。

## Decision 015：Skill Shell 真实同步默认由服务端特性开关关闭

### 决定

`POST /api/skills/persistence` 可以生成 Supabase 写入计划，也预留真实 upsert 路径，但真实写入默认关闭。只有服务端显式设置 `SKILL_PERSISTENCE_WRITE_ENABLED=true`，并且已确认 Skill Shell migration、RLS 和 Auth teacher_id 映射后，才允许 `dryRun=false` 写入。

### 原因

SkillCard 状态、老师编辑、按钮事件和入档日志会影响后续回放与长期教学档案。若在 RLS 或身份映射未确认前开放真实同步，可能产生跨老师写入或错误持久化。

### 影响

后续产品原型可以继续安全使用 mock/localStorage。需要 Supabase 同步时，应先跑 dry-run 和人工迁移验证，再在受控环境开启 feature flag；前端不能直接绕过 API 写 Skill Shell 表。

## Decision 016：99% 正确率只能由人工标注评测集支撑

### 决定

`analyze_learning_evidence` 可以把 `>=99%` 作为高置信、证据充分题目的目标门槛，但产品级正确率宣称必须来自脱敏真实材料的 human-labeled dataset。synthetic fixture 只能用于冒烟测试、结构回归和失败路径覆盖，不能支撑对外或产品内部验收口径。

### 原因

试卷、作业和错题分析同时受 OCR/题目切分、答案/评分点、老师批改痕迹、地区教材线索和模型推理影响。没有人工 gold 标注，就无法判断模型是正确分析、拒判得当，还是把证据不足的题硬判成确定性结论。

### 影响

后续更换 OCR/Vision Provider、推理模型、Prompt 或输出 Schema 前后，都必须跑同一批 human-labeled dataset。默认产品级验收底线为至少 100 份材料、500 道人工标注题、双人标注、分歧仲裁和隐私脱敏；任一单个 case 失败时，整批结果不能被其他简单 case 平均为通过。

## Decision 017：月报只聚合老师确认后的月度素材

### 决定

`analyze_learning_evidence` 输出的 `monthly_report_snapshot` 永远是 AI 草稿候选，字段保持 `teacher_confirmed=false`。老师确认入档后，系统才可以生成带 `teacher_confirmed=true`、`confirmed_at`、`source_skill_run_id` / `archive_record_id` 的确认快照副本，供 `monthly_report` 聚合。月报也可以读取已确认学习记录、已确认家长反馈和老师备注。月报生成必须过滤未确认、非本学生、非本月素材。

### 原因

月报会被老师用于家长沟通和长期服务复盘，如果直接读取 AI 草稿，就会绕过证据复核和入档边界。确认素材池让月报既能复用材料分析结果、学习记录、反馈历史和老师备注，又不会把未审核结论当作正式月度事实。

### 影响

没有本月任何确认素材时，学生月报只能显示依据不足，不生成主要进步、主要问题或表现趋势。有学习记录、反馈或老师备注但没有学习材料确认快照时，可以生成服务型月报草稿，但逐题、知识点和题型趋势必须显示依据不足。缺少上月确认素材或上月确认月报时，纵向比较只能提示证据不足，不能写成明确进步或退步。后续接入真实数据库时，月报素材池需要保存确认动作、来源 SkillRun、来源材料和写入版本。

## Decision 018：学习材料分析模型调用采用 provider-agnostic adapter

### 决定

`analyze_learning_evidence` 默认模型调用使用 `createLearningMaterialAnalysisModel(...)`。该适配器只依赖 `src/agents/shared/model/` 的 OpenAI-compatible provider-agnostic 层，并要求模型返回合法 JSON。`createDeepSeekLearningMaterialAnalysisModel(...)` 保留为兼容别名，不再作为业务层默认命名。无论接入 DeepSeek、OpenAI 或其他兼容模型，输出都必须满足 `StudentLearningMaterialAnalysis`，并经过 schema、证据覆盖、微信安全和 dataset evaluation。

### 原因

用户明确要求后续接入的大模型可能变化。若业务 Runner 直接绑定 DeepSeek 命名或厂商能力，后续替换模型会改动 prompt、校验、评测和错误处理边界，容易引入不可比结果。

### 影响

切换 `AI_PROVIDER`、`AI_BASE_URL`、`AI_MODEL`、Prompt 或 Schema 时，不能只看单次生成是否成功，必须用同一批 human-labeled dataset 重新评测。模型层可以使用 JSON response mode 或 prompt-level JSON fallback，但业务层不依赖厂商专有 structured output 行为。

## Decision 019：真实模型输出必须先固化为评测 artifact

### 决定

`analyze_learning_evidence` 的真实 provider/model 输出必须先保存为 `StudentLearningMaterialAnalysis` JSON artifact，再通过 dataset 的 `analysis_path` 参与评测。生成入口使用 `npm run generate:k12-analysis-output`，输入是已结构化的 `VisionEvidencePacket` 文件和可选的答案、评分点、知识点、历史档案 JSON 文件。非 `draft_ready` 输出默认不得落盘；显式允许的 degraded artifact 只能用于调试，不能用于 99% 验收。

### 原因

人工 gold 标注、OCR/Vision 输出和模型输出需要解耦保存，才能复跑同一批材料、比较不同模型/provider/prompt 的差异，并追踪失败案例。若评测直接调用实时模型，结果会受模型版本、环境变量和临时网络状态影响，难以回放。

### 影响

后续收集真实样本时，每个 case 应至少保留脱敏 gold、VisionEvidencePacket 和对应模型输出 artifact。更换 OCR/Vision Provider、推理模型、Prompt 或 Schema 时，应重新生成 `analysis_path` artifact，再跑同一批 human-labeled dataset。

## Decision 020：99% 验收 gold 必须保留双标与仲裁过程

### 决定

真实 K12 学习材料评测 case 不只保存最终 `gold`，还应保存 `student_learning_material_gold_label_package.v0.1`。该包必须包含至少两个独立 reviewer 的标签、逐题证据依据、脱敏状态和仲裁后的 `adjudicated_gold`。dataset 可以直接引用 `gold_label_package_path`，由 loader 提取仲裁结果参与评测。

### 原因

试卷和作业分析的错误来源可能来自 OCR、题目切分、评分点、老师批改痕迹或人工理解分歧。只保存最终 gold 会丢失争议来源，无法判断 99% 评测失败是模型问题、证据问题还是标注问题。

### 影响

后续真实样本入库前，应先用 `XUEMAI_GOLD_LABEL_PACKAGE=/absolute/path/to/package.json npm run validate:k12-gold-labels` 校验。未双标、未仲裁、未脱敏或缺逐题证据依据的 package 不能作为 99% 验收依据。

## Decision 021：用户可见报告不直接展示裸模型 JSON

### 决定

`StudentLearningMaterialAnalysis` 是内部结构化分析合同，不能直接作为老师或家长可见结果。展示前必须通过 `createStudentLearningMaterialUserFacingResult(...)` 装配为 `teacher_report`、`parent_feedback` 和 `monthly_result`。用户可见正文只展示来源标签；内部证据引用保留在 `source_map` 中，供“查看来源”和审计使用。

### 原因

模型输出需要服务校验、评测、入档和审计，但老师最终需要的是专业测评型报告和可复制的家长反馈。直接展示内部字段会暴露 `evidenceRefs` 等技术概念，也容易让 UI 不同位置各自拼文案，造成口径不一致。

### 影响

后续 SkillCard、分析详情页和导出能力应优先消费用户可见结果对象。若模型输出 schema 调整，应同步更新装配器和测试，保证老师报告、家长反馈和月报素材仍然保持同一来源口径。

## Decision 022：公开课程资料只做粗粒度边界，不替代地区教材库

### 决定

`mainland-k12-reference.ts` 保存公开检索到的中国大陆 K12 课程与评价参考，用于学段/学科识别、报告能力维度提示、疑似超纲或学段/科目不匹配风险提示。它不作为完整知识点库、地区教材库或题库。

### 原因

公开课程方案可以稳定提供学段、学科和核心能力口径，但不同省市考试方案、教材版本、学校进度和机构讲义差异很大。若把粗粒度公开资料当成细粒度知识库，会在逐题诊断和 99% 验收中制造假确定性。

### 影响

后续遇到省市考试范围、教材版本、机构题库或用户报告模板时，应作为单独 adapter 接入，并用真实样本和 gold 标注验证。没有材料证据时，系统只能标注“未识别/需老师确认”，不能猜测地区教材或超出样本的长期能力。

## Decision 023：最终用户结果 artifact 是业务消费边界

### 决定

`StudentLearningMaterialAnalysis` 继续作为内部结构化分析、评测和审计合同；业务 UI、导出、老师查看和家长反馈复制应优先消费 `StudentLearningMaterialUserFacingResult`。`result-files.ts` 提供文件化入口，可以从已有分析 artifact 或完整 `VisionEvidencePacket -> model` 链路生成最终用户结果 artifact。

### 原因

用户目标是拿到老师看的专业学情报告、家长反馈评语和月报比较结果，而不是裸模型 JSON。若每个 UI 页面临时拼接报告，会造成证据标签、风险提示、月报口径和家长反馈安全规则不一致，也容易把内部 `evidenceRefs` 暴露给老师或家长。

### 影响

后续 SkillCard、分析详情页、导出能力和 API 响应应复用同一个用户结果对象。评测仍以 `analysis_path` 作为模型输出可回放证据；产品展示和交付物则以 `result_path` / 用户结果 artifact 为准。模型、Prompt 或 Schema 调整时，需要同时验证内部分析校验、用户结果装配和真实 human-labeled dataset。

## Decision 024：材料分类先走确定性预分类基线

### 决定

`analyze_learning_evidence` 在调用文本推理模型前，先用 `material-classifier.ts` 从 `VisionEvidencePacket` 做确定性预分类，输出材料类型、科目、学段、年级候选、地区/教材线索、分类置信度和 evidenceRefs。prompt 会携带该预分类结果，降级分析也复用同一分类器。

### 原因

用户要求系统能识别中国大陆 K12 试卷、作业、错题等材料的种类和科目，且希望未来可替换模型。若入口分类完全依赖模型自由判断，换模型或 prompt 时分类口径会漂移，也不利于 99% 验收的 material/subject/stage 指标回归。

### 影响

预分类只是可测基线，不替代 OCR/Vision、人工 gold 标注或老师确认。材料状态为 blank_template、teacher_resource、low_quality、needs_review 等时，分类结果只能用于路由和复核，不能推断学生能力。地区/教材线索如果同时命中多个地区或多个教材版本，必须作为冲突来源提示老师或标注员复核，并降低分类置信度，不能硬猜一个唯一来源。后续真实样本评测必须同时统计 material classification、subject classification、stage/grade classification、region/curriculum classification 和老师复核路由表现。

## Decision 025：逐题正误判断必须经过证据就绪度 gate

### 决定

`analyze_learning_evidence` 在调用文本推理模型前，为 `VisionEvidencePacket` 中每道题生成 `QuestionEvidenceReadiness`。只有题目切分稳定、题干存在、学生答案存在、同题标准答案/评分点或清晰老师批改存在，并且关键证据置信度达标时，才允许模型输出 `correct`、`partially_correct` 或 `incorrect`。模型返回后，Runner 再用同一 gate 校验一次，越权硬判会降级为老师复核草稿。

### 原因

99% 正确率的可实现口径来自“证据充分才硬判，证据不足就拒判”。如果只在 prompt 中提醒模型，换模型或 prompt 后仍可能出现低证据硬判。逐题 gate 把这个边界从提示词提升为可测试的 deterministic check。

### 影响

后续 OCR/Vision Provider、推理模型、Prompt 或 Schema 替换时，必须保留逐题 evidence readiness 规则。真实 human-labeled dataset 中 `definitive_judgement_allowed=false` 的题目，模型输出必须进入 `unknown` 或 `needs_teacher_review`；不能用平均正确率掩盖单题越权硬判。

## Decision 026：外部答案和评分点必须按题号进入逐题 gate

### 决定

`answerKeys` / `rubrics` side input 是逐题证据就绪度 gate 的一等答案依据，但只有显式映射到同一 `question_id` 时才生效。它们可以补足 `VisionEvidencePacket` 中没有识别到的标准答案或评分点，但不能替代题干、学生作答、题目切分稳定性和关键视觉证据置信度。Runner 的预降级逻辑也必须识别这类 side input，避免有外部答案时仍因全局 `answer_key` gate 把整份材料提前降级。

### 原因

真实教学材料经常是“学生卷面图片 + 老师另传答案/评分标准”。如果逐题 gate 只看 VisionEvidencePacket，会把这类可分析题误判为答案依据缺失；但如果外部答案不按题号映射，又会把某题答案错误套到另一题上，破坏 99% 口径。

### 影响

后续 OCR/Vision Provider、模型、Prompt 或数据集格式变化时，外部答案/评分点必须保留 `question_id` 映射并进入评测 artifact。没有映射、映射到错误题号、缺少学生答案或题目切分不稳的题目，仍必须路由老师复核，不能输出确定性正误。

## Decision 027：99% 评测前必须先校验可回放资产清单

### 决定

真实 99% 验收不只跑 `analysis_path` 与 gold 的指标比较，还必须先通过 `evaluation-assets.ts` 校验资产清单。每个 case 至少绑定 `VisionEvidencePacket` 和双标仲裁后的 gold label package；如使用外部 `answerKeys` / `rubrics`，这些 side input 必须以文件形式进入资产清单并按 `question_id` 映射。资产校验会检查证据包结构、gold 包脱敏与仲裁、case id / material id / vision packet id 对齐、证据引用存在性，以及 gold 中允许确定性判断的题是否被同题 readiness 支撑。

### 原因

如果只在最后跑 dataset eval，很容易把证据包与 gold 包错配、外部答案漏传、题号错配、证据引用不存在或未脱敏样本混进验收集。此时即使模型指标看起来通过，也无法证明系统真的达到可审计的 99% 口径。

### 影响

后续收集真实样本时，流程应是：脱敏材料与 VisionEvidencePacket 入库 -> 双标/仲裁 gold package -> `validate:k12-eval-assets` 预检 -> 生成真实模型 `analysis_path` -> `eval:k12-material` 批量评测。未通过资产预检的 case 不能作为 99% 正式验收依据。

## Decision 028：OCR/Vision Provider 只通过证据包适配层进入业务链路

### 决定

真实 OCR/Vision/Layout 能力接入时，不把 PaddleOCR、PaddleX、Pix2Text、Surya、MinerU 或其他开源项目直接暴露给 DeepSeek/文本推理模型，也不让业务 UI 消费 provider 原始 JSON。Provider 输出必须先经 adapter 归一化为 `VisionEvidencePacket`，并记录 `pipeline_trace`、bbox/polygon、`crop_ref`、confidence、risk_flags、provider、model version 和可回放输出引用。PaddleOCR/PaddleX 暂作为第一真实 Provider 候选，其他项目作为专项补充或 benchmark 对照。

### 原因

开源 OCR/Layout 项目能提供文本、版面、公式、表格、阅读顺序和坐标能力，但不能直接解决中国大陆 K12 试卷/作业的学生答案归属、老师批改归属、逐题答案依据映射、证据不足拒判和老师复核。若业务层直接绑定某个 provider，会让 99% 验收口径随 provider 原始格式漂移，也难以比较不同 provider 的效果。

### 影响

后续更换 OCR/Vision Provider、provider 版本、题目切分策略或预处理参数时，必须重新生成 `VisionEvidencePacket` 和 `analysis_path` artifact，并跑同一批 human-labeled dataset。没有 `crop_ref` 的视觉区域即使有 bbox，也只能作为待老师复核证据，不能支撑确定性正误判断。

## Decision 029：人工标注工具可替换，gold package 才是验收合同

### 决定

Label Studio、CVAT、X-AnyLabeling 或其他标注工具只能作为 human gold dataset 的上游工作台。无论使用哪种工具，导出结果必须先归一化为 `student_learning_material_gold_label_annotation_import.v0.1`，再转换为 `student_learning_material_gold_label_package.v0.1`。最终进入 `validate:k12-gold-labels`、`validate:k12-eval-assets` 和 `eval:k12-material` 的验收资产，必须与 `VisionEvidencePacket` 的 `question_id`、evidence refs、bbox/polygon/crop_ref 和 side input answer/rubric refs 对齐。

### 原因

标注工具能提升人工标注效率，但工具导出格式本身不等于可审计 gold。K12 试卷/作业分析的 99% 口径同时依赖脱敏、双标、仲裁、证据充足性、题目切分、学生作答归属、老师批改归属和答案依据映射；如果把某个工具的导出直接当最终 gold，会绕过这些工程 gate。

### 影响

后续可以用 Label Studio 做题目级语义标签，用 CVAT 做视觉区域 gold/QC，用 X-AnyLabeling 做离线实验，但都必须保留转换脚本或手工转换记录，并在入评测前通过 gold package 校验和资产清单预检。未转换、未双标、未仲裁或未脱敏的标注结果只能作为草稿，不能支撑 99% claim。

## Decision 030：模型切换必须通过同一 gold dataset 回归比较

### 决定

更换推理模型、Provider、Prompt 或输出 Schema 时，必须保留 baseline 与 candidate 两份同一 gold dataset 的 `analysis_path` 输出，并运行 `npm run compare:k12-model-regression`。候选结果必须使用相同 case IDs，不能新增失败 case，不能出现评测指标退步；如果 baseline 已经 `claimable99Correctness=yes`，candidate 也必须保持 `yes`。

### 原因

用户明确要求大模型后续可能变化。单次生成成功无法证明新模型维持了中国大陆 K12 材料分类、逐题正误、老师复核路由、老师报告、家长反馈和月报素材边界。用同一批 human-labeled dataset 做 baseline/candidate 对比，才能发现模型切换带来的隐性退步。

### 影响

后续模型切换流程应是：固定 human gold dataset 和评测资产 -> 为 baseline/candidate 分别生成 `analysis_path` -> 跑 `compare:k12-model-regression` -> 再跑 candidate 的 `eval:k12-material`。synthetic fixture 只能测试命令链路，不能作为 99% 接受依据。

## Decision 031：月报纵向比较必须有可回放上月证据

### 决定

`student_monthly_report_v1` 必须输出 `comparison_evidence`，记录本月素材数、上月素材数、上月来源 ID、是否使用上月月报和上月证据状态。月报如果写出“和上月相比”的趋势、进步、稳定、下降、重复问题或新增问题，必须有可回放的上月来源 ID；缺少上月确认素材时，只能输出证据不足说明，不能把本月观察写成纵向变化。

### 原因

月报与上月纵向比较是用户明确目标。如果只校验文案里出现“上月”或“相比”，很容易出现没有上月来源却生成趋势判断的情况。把上月来源变成 artifact 元数据和资产预检规则，才能让月报能力与 99% 资产链路一样可审计、可回放、可阻断。

### 影响

后续真实样本月报链路必须同时准备本月确认素材和上月确认素材或上月确认月报。`validate:k12-eval-assets` 会拒绝没有上月证据却声称趋势的月报，并把月报上月对比证据覆盖纳入 `claimable99AssetReady` 阻断项。没有上月基线的首月样本可以生成月报草稿，但只能标注无可比基线，不能作为纵向比较能力覆盖。

## Decision 032：真实 Provider 输出先过试跑报告再进入 gold 标注

### 决定

真实 OCR/Vision/Layout Provider 输出在归一化为 `VisionEvidencePacket` 后，必须先生成 `student_learning_material_vision_provider_trial_report.v0.1`。该报告只能保留 Provider 候选、基础 gate、题目切分计数、逐题 readiness、阻断项、warning 和下一步，不能保存原始 OCR 全文或 normalized text。进入 `validate:k12-eval-assets` 的 case 应提供 `provider_trial_report_path`，由资产预检校验它与同一份 `VisionEvidencePacket` 和可选 question-segmentation review 对齐。

### 原因

真实 Provider 试跑阶段最容易混入缺页、题目边界不稳、缺 crop_ref、学生作答归属错误、答案依据缺失或低置信证据。如果直接进入人工 gold 标注或模型评测，后续的 99% 失败很难区分是 OCR/Layout 问题、标注问题还是文本推理问题。Provider 试跑报告把这些问题提前固化成可回放 artifact，同时避免泄露原始 OCR 全文。

### 影响

后续采集 PaddleOCR/PaddleX 或其他 Provider 样本时，流程应是：Provider 输出 -> adapter -> `VisionEvidencePacket` -> Provider trial report -> question-segmentation review -> redacted annotation task -> annotation import -> final gold package -> analysis/result/delivery/monthly artifacts -> `validate:k12-eval-assets`。缺少 Provider trial report 的真实样本可以用于本地调试，但不能作为 99% asset readiness 的完整证据链；Provider trial report 若仍为 `blocked`，即使文件存在，也必须阻断 `claimable99AssetReady`。

## Decision 033：最终逐题交付必须按 question_id 覆盖同一分析链路

### 决定

用户可见 result 和老师 delivery bundle 的逐题行不能只校验数量。`teacher_report.question_rows` 必须覆盖同一份 `StudentLearningMaterialAnalysis.question_analyses` 的全部 `question_id`，并保持题目顺序；`teacher_delivery.question_rows` 必须同时与来源 result 和 analysis 的 `question_id` 集合及顺序对齐。交付包生成时必须复制 result 中的逐题行、来源映射和可信度数组，避免后续 UI 或 API 层修改 bundle 时污染源 result。

### 原因

老师最终看到的是逐题报告和交付包，而不是内部 analysis JSON。若只检查逐题行数量，重复一题、遗漏另一题、题号顺序错乱仍可能通过校验，造成老师报告、家长反馈和月报素材与真实题目不一致。引用共享还会让校验上下文被同步篡改，掩盖这种错配。

### 影响

后续任何 UI 拼接、API 打包或评测 artifact 生成都必须复用 result/delivery validator。若老师交付包中的逐题行缺题、重复题、未知题号或顺序错乱，文件生成和 `validate:k12-eval-assets` 都应拒绝该 artifact；前端不得临时重建逐题报告来绕过这一合同。

## Decision 034：专业测评型报告必须覆盖关键维度但保留证据边界

### 决定

老师版 `StudentLearningMaterialUserFacingResult` 和最终 delivery bundle 必须保留专业测评型报告的关键维度：学情传导图、知识薄弱点、能力维度、错误模式、难度层表现、学习策略表现、学科能力、重点错题成因、优先关注点、表现空间、复发风险和近期巩固方向。若某个维度缺少结构化证据，例如没有题库难度标签或没有连续月份材料，报告仍应显示该维度的证据边界和复核要求，而不是省略章节或编造结论。

### 原因

用户目标是“老师看的专业测评型学情报告”，不是一段普通总结。老师需要看到完整评估框架，也需要知道哪些维度证据不足。缺章节会让报告显得不专业；硬造难度层、长期复发风险或可追回分，又会违背教育场景的证据边界。

### 影响

`validateStudentLearningMaterialUserFacingResult` 和 `validateStudentLearningMaterialDeliveryBundle` 必须拒绝缺关键专业章节的 artifact。后续若扩展 `StudentLearningMaterialAnalysis` schema 增加 difficulty level、strategy label 或表现空间量化字段，应优先填充这些章节；没有这些字段前，只能输出基于现有证据的边界说明，不能承诺提分或生成长期诊断。

## Decision 035：模型切换验收必须覆盖最终老师/家长交付物

### 决定

`compare:k12-model-regression` 在比较 baseline/candidate 的同一 gold dataset 时，不只检查内部 analysis 指标、失败 case 和 `claimable99Correctness`，还必须从每个 analysis 生成 `StudentLearningMaterialUserFacingResult` 和 `StudentLearningMaterialDeliveryBundle`，并运行对应 validator。baseline 交付物无效表示比较基线不可用；candidate 交付物无效表示模型/Prompt/Schema 切换导致最终交付物回归。

### 原因

用户最终要的是老师学情报告和家长反馈，而不是内部 JSON。模型切换可能保持逐题正误指标不退步，却让报告标题、专业章节、逐题行、家长反馈安全或月报比较文案失效。只比较内部指标会漏掉真正影响老师使用的回归。

### 影响

后续更换 DeepSeek/OpenAI/其他兼容模型、OCR Provider、Prompt 或输出 Schema 时，必须同时保留 baseline/candidate 输出并跑 `compare:k12-model-regression`。候选模型若无法生成通过质量 gate 的 result/delivery bundle，即使内部正确率指标没有退步，也不能视为可接受。

## Decision 036：评测链路红线 artifact 必须做内容级脱敏校验

### 决定

`student_learning_material_vision_provider_trial_report.v0.1`、`student_learning_material_question_segmentation_review.v0.1`、`student_learning_material_gold_label_annotation_task.v0.1`、`student_learning_material_gold_label_annotation_import.v0.1` 和 `student_learning_material_gold_label_package.v0.1` 不只禁止出现 `raw_ocr_text`、`normalized_text` 等字段名，也禁止在 next steps、warning、人工备注、review checklist、Label Studio/CVAT payload、annotation import skeleton、annotation import notes、gold package notes 或其他可编辑/报告字段中复制 `VisionEvidencePacket` 的 OCR、normalized 或 text 内容。只要校验器拿到同一份 `VisionEvidencePacket`，就必须按证据文本片段扫描并拒绝泄漏。

### 原因

Provider 试跑报告、题目切分 QA、human gold dataset 的上游标注任务、annotation import 和最终 gold package 都会进入评测资产链路，是最容易被手工补充说明污染的环节。只检查字段名无法阻止“把学生作答原文粘到备注里”这类泄漏，也会让脱敏资产链路看起来通过但实际携带原始材料内容。

### 影响

后续生成或导入 provider trial report、question-segmentation review、annotation task、annotation import、final gold package 时，评测资产预检会复用内容级脱敏 gate。错误信息只能指出泄漏来源 `evidence_ref`，不能把原文片段重新打印到日志或报告中。`XUEMAI_GOLD_LABEL_ANNOTATION_ALLOW_INCOMPLETE=1` 只能放宽双标/仲裁等草稿要求，不能绕过原文泄漏检查。真实图片、crop 文件和标注工具工作区仍需独立的人工脱敏与权限控制，JSON artifact 不能携带原始 OCR 文本。

## Decision 037：human_labeled 评测资产不能混用 mock/synthetic Vision 来源

### 决定

`validate:k12-eval-assets` 必须把 Vision 来源纳入 `claimable99AssetReady`。即使 manifest 的 `dataset_kind` 写成 `human_labeled`，只要同批 `VisionEvidencePacket` 出现 `mock` source kind、mock/synthetic provider 或 model、`mock://` / `synthetic://` page ref，或 mock/synthetic 前缀 evidence ref，就必须阻断 claim readiness。结构校验仍可通过，方便保留 synthetic fixture 作为命令链路回归，但不能把它当作 99% 可宣称资产。

### 原因

99% 目标只能来自真实脱敏材料、真实 OCR/Vision Provider 输出、人工 gold 标注、双人标注、仲裁和同批回归验证。仅检查 `dataset_kind=human_labeled` 会留下一个漏洞：测试 fixture 或 mock provider 生成的结构化证据可能满足所有 schema、artifact 和覆盖数量要求，却完全不能证明真实图片、题目切分、手写/批改识别或材料分类表现。

### 影响

后续构造 human-labeled manifest 时，必须先采集真实 Provider 样本并归一化为 `VisionEvidencePacket`。Synthetic fixture 仍可用于单元测试、文件命令冒烟和回归形状校验，但 `claimable99AssetReady` 报告会显示 mock/synthetic source blocker；只有该 blocker 与样本覆盖、artifact 覆盖、月报上月证据、Provider readiness 等全部清零后，才能继续讨论 99% 宣称。

## Decision 038：dataset eval 的 99% 口径必须引用资产预检通过记录

### 决定

`student_learning_material_evaluation_dataset.v0.1` 可以继续用于模型输出指标评测，但要得到 `claimable99Correctness=yes`，正式 dataset 必须包含 `asset_preflight.claimable99AssetReady=true`。该字段来自同批样本先跑 `validate:k12-eval-assets` 的结果。缺少 `asset_preflight`，或资产预检仍有 blocker 时，即使 `dataset_kind=human_labeled`、双标/仲裁/脱敏完成、逐题指标全绿，也只能输出 `claimable99Correctness=no`。

### 原因

`eval:k12-material` 只比较 gold 与 analysis，无法自己证明 VisionEvidencePacket、Provider 试跑报告、题目切分 QA、脱敏 annotation task、final gold package、月报上月证据和 delivery bundle 是否同源、可回放、脱敏且非 mock。若 dataset eval 可以绕过 asset manifest，团队很容易得到“指标全绿”的误导结果，却没有证明真实 OCR/Vision 和 human gold 资产链路可靠。

### 影响

正式评测流程必须是：先构建/扩展 evaluation asset manifest，跑 `validate:k12-eval-assets` 并确认 `claimable99AssetReady=true`，再通过 `generate:k12-eval-dataset` 把该结果写入 dataset 的 `asset_preflight` 元数据，最后跑 `eval:k12-material`。Synthetic 或 smoke 回归可以通过测试专用 claim policy 关闭该 gate，但不能用于对外或产品口径的 99% 宣称。

## Decision 039：真实 OCR/Vision Provider 必须留下候选评估链路

### 决定

真实 OCR/Vision/Layout Provider 输出进入 99% 资产预检时，`VisionEvidencePacket.pipeline_trace.provider_candidates` 必须记录当前选中 Provider，并将其标为 `primary_candidate`；同时至少记录一个 fallback 或 benchmark/open-source 候选，并为候选写入 license/deployment review notes。`validate:k12-eval-assets` 可以让缺少这些记录的资产清单结构校验通过，方便调试，但必须把 provider candidate trace、benchmark candidate 或 license notes 缺失写入 `claimable99AssetReady` blocker。

### 原因

开源 OCR/Layout/Formula 项目只能提供局部能力，不能直接替代 K12 学习材料分析 Skill。若真实样本只保存某个 Provider 的最终输出，而没有记录为什么选它、哪些开源/benchmark 候选被对照、许可和部署风险是否复核，后续更换 Provider 或解释 99% 验收结果时无法回放判断依据。

### 影响

后续采集 PaddleOCR/PaddleX、MinerU、Pix2Text、EasyOCR、docTR、MMOCR、LayoutParser 或其他 Provider 样本时，adapter 必须保留候选清单、角色、fit、来源 URL 和 license note。缺这些评估痕迹的样本可以用于本地调试和失败定位，但不能成为 `claimable99AssetReady=yes` 的正式资产。任何模型、Provider、Prompt 或 schema 切换仍需使用同一批 human-labeled dataset 做回归，不能用开源项目公开 benchmark 替代项目自有 gold dataset。

## Decision 040：OCR/Vision Provider 切换必须先比较证据层试跑报告

### 决定

更换 OCR/Vision/Layout Provider、Provider 配置或 Provider 输出归一化规则时，必须先保留同一材料的 baseline 与 candidate 两份 `student_learning_material_vision_provider_trial_report.v0.1`，并运行 `npm run compare:k12-vision-provider-regression`。正式模式下 baseline 和 candidate 都必须达到 `ready_for_human_labeling`；candidate 不能丢页、丢题、减少总证据数、减少全局或同题学生痕迹证据或答案依据证据，不能重排题目顺序，不能改变同一 `question_id` 的页码或题号身份，不能增加缺 crop_ref/低置信/孤儿证据/需老师复核/blocked 题，不能降低题目切分通过数或可硬判题数，也不能让同一题的 segmentation/readiness/confidence 退步。

### 原因

OCR/Vision Provider 退步会发生在文本推理模型之前。若只跑 `compare:k12-model-regression`，候选 Provider 可能已经丢题、缺 crop_ref 或让题目边界不稳定，却在后续模型输出中被平均指标掩盖。先比较 Provider trial report 能把问题限定在证据层，避免不合格 OCR/Vision 输出进入 human gold 标注、文本推理或用户可见报告。

### 影响

后续流程应分两级验收：OCR/Vision Provider 切换先跑 `compare:k12-vision-provider-regression`，证明同材料证据层没有退步；推理模型、文本 Provider、Prompt 或 Schema 切换再跑 `compare:k12-model-regression`，证明同一 human-labeled dataset 的模型输出和最终交付物没有退步。两个 gate 都不能替代真实脱敏样本、双人标注、仲裁和资产预检通过记录，因此不能单独支撑 99% 宣称。

## Decision 041：Human Gold 必须有双标一致性报告才能进入 99% 资产链路

### 决定

最终 gold package 生成后，必须生成 `student_learning_material_gold_label_review_report.v0.1`。该报告记录 reviewer 数、label 数、题目数、分歧数量、一致率、仲裁状态和 `ready_for_99_evaluation`；分歧值只保存哈希，不保存 reviewer 原始取值。`validate:k12-eval-assets` 对 human-labeled 资产必须校验 `gold_label_review_report_path`，报告缺失、未 ready、与 gold package 不一致，或复制了同一份 `VisionEvidencePacket` 的 OCR/text 内容时，必须阻断 `claimable99AssetReady`。

### 原因

只要求 gold package “双标 + 仲裁”仍不够可审计。团队需要知道两个标注员在哪些字段分歧、分歧是否已仲裁、一致率是否可追踪，同时又不能把学生作答、OCR 原文或人工备注扩散到评测报告。把双标一致性报告做成独立 artifact，能把人工标注质量从“包里有字段”变成可回放、可比较、可阻断的验收门。

### 影响

真实样本流程变为：annotation task -> annotation import -> final gold package -> gold label review report -> evaluation asset manifest -> `validate:k12-eval-assets` -> `generate:k12-eval-dataset` -> `eval:k12-material`。`generate:k12-eval-artifacts` 默认补齐 review report；但 synthetic fixture 只能证明命令链路，不能替代真实脱敏样本、真实 Provider 输出和人工标注质量。

## Decision 042：真实样本 Case Package 只保存脱敏结构化 artifact 路径

### 决定

真实样本进入 99% 评测链路前，可以先生成 `student_learning_material_evaluation_case_package.v0.1` scaffold。该 package 只保存 case id、dataset id、artifact 路径、命令序列、readiness checklist 和 `evaluation-assets.cases.json`；不得复制原始学生图片、原始试卷照片、未脱敏 OCR 全文或未脱敏学习材料。原始材料只能留在受控采集环境，进入 repo 或评测 JSON 的必须是脱敏结构化 artifact。

### 原因

99% 评测需要真实样本，但真实样本又包含学生隐私。若为了跑批方便把原始材料复制进 case 目录，后续很容易误提交或在 gold/report artifact 中扩散。把 case package 定义成“路径与命令 scaffold”，能规范真实样本流程，同时把原始材料排除在可提交评测资产之外。

### 影响

后续采集 PaddleOCR/PaddleX 或其他 Provider 输出时，应先生成 case package，再把脱敏后的 `ExternalVisionAdapterInput`、VisionEvidencePacket、Provider trial report、segmentation review、annotation task、gold package、gold review、analysis/result/monthly/delivery bundle 写入约定路径。case package 本身不能作为 99% 证据；只有 referenced artifacts 全部存在并通过 `validate:k12-eval-assets` 后，才能进入 dataset 评测。

## Decision 043：Case Package Readiness 只做流程推进，不做正确率证明

### 决定

真实样本 case package 可以通过 `student_learning_material_evaluation_case_package_readiness.v0.1` 做只读检查。检查内容包括隐私边界、raw material 目录误放、artifact 文件存在状态、OCR/Vision、题目切分、human gold、月报比较和老师交付等链路组状态、命令序列中最早未完成步骤、`evaluation-assets.json` 资产预检状态和 99% blocker。检查结果必须固定 `claimable99_from_case_package=false`；即使所有 scaffold 路径都有文件，也只能进入 `validate:k12-eval-assets` 和后续 `eval:k12-material`，不能直接宣称正确率。

### 原因

真实样本采集会持续多步推进，很容易出现“后面的 manifest 文件已生成，但前面的 Provider 输入、题目切分复核、人工 gold 或 review report 还缺失”的半成品状态。若只看目录里有没有一些 JSON 文件，团队可能误以为样本已可评测。readiness inspector 把下一步命令和 blocker 显式化，同时把 case package 与正确率证明严格分开。

### 影响

每个真实样本 case package 生成后，可以反复运行 `npm run inspect:k12-eval-case-package` 来确认下一步；但正式验收仍必须走完整链路：真实 Provider 输出 -> VisionEvidencePacket -> Provider trial report -> question segmentation review -> redacted annotation task -> annotation import -> final gold package -> gold label review report -> evaluation asset manifest -> `validate:k12-eval-assets` -> `generate:k12-eval-dataset` -> `eval:k12-material`。该检查器不能读取或复制原始学生材料，不能替代人工标注和数据集评测。

## Decision 044：99% Claim Audit 用于补样导航，不替代正式评测

### 决定

`student_learning_material_evaluation_claim_audit.v0.1` 只用于把 strict claim policy 的覆盖缺口结构化输出，包括 case/question 数、可硬判题、需老师复核题、材料类型、学科、小初高学段、地区/教材线索、review protocol 和 asset preflight 状态。audit 可以给出下一批真实样本采集目标，但不能把自身结果作为正确率证明。正式口径仍以 `eval:k12-material` 输出 `claimable99Correctness=yes` 为准。

### 原因

99% 不只是“指标过线”，还要求样本覆盖足够代表用户目标场景。没有结构化缺口报告时，团队可能不断追加相似样本，比如只加初中数学试卷，却仍缺小学/高中、语文/英语/理化、错题本、作业、低置信需复核题或地区/教材线索。claim audit 把“还缺什么样本”前置，能降低真实样本采集和人工标注的返工。

### 影响

真实数据集生成后，应先运行 `npm run audit:k12-eval-claim` 查看补样目标，再运行或复跑 `npm run eval:k12-material`。模型、Prompt、Provider 或 Schema 切换时，audit 只能说明样本覆盖是否仍足够；接受候选仍必须通过同一 human-labeled dataset 的正式 eval 和 regression gate。

## Decision 045：Teacher Review Packet 负责产品动作边界，不参与正确率证明

### 决定

`student_learning_material_teacher_review_packet.v0.1` 作为 delivery bundle 之后、进入 SkillCard / 分析详情页之前的产品交接包。它列出老师可见报告、逐题行、家长反馈、月报纵向比较、source labels、安全提示和可执行动作；同时必须声明 AI 输出仍为草稿、AI 不会静默自动发送微信、档案不会自动写入，渠道发送、标记已反馈和确认入档都需要老师显式确认。teacher-visible payload 不能暴露 `evidenceRefs`、`VisionEvidencePacket` 或 `internal_evidence_ref`。

### 原因

delivery bundle 已经解决“交付什么内容”，但还没有把“老师能做什么动作、哪些动作被证据风险阻断、哪些动作会改变反馈/入档状态”固化为产品契约。教育场景里，正式反馈和长期档案写入都不能被 AI 自动触发；把 review packet 做成独立 artifact，可以让 UI、API 和测试都围绕同一套动作边界开发。

### 影响

后续 UI 接入应消费 teacher review packet，而不是直接从 delivery bundle 自行推断按钮和状态。review packet 可以由同一命令从现成 delivery bundle 生成，也可以先从 result/analysis/VisionEvidencePacket 补齐 delivery bundle 后生成，以减少 UI 和真实样本跑批的手工串联。review packet 是产品动作安全层，不是 human gold 评测资产；它不能替代 `validate:k12-eval-assets`、`audit:k12-eval-claim` 或 `eval:k12-material`。

## Decision 046：最终用户结果必须结构化暴露材料分类

### 决定

`StudentLearningMaterialUserFacingResult`、`StudentLearningMaterialDeliveryBundle` 和 `StudentLearningMaterialTeacherReviewPacket` 都必须携带来源标签化的 `material_classification`，包括材料类型、科目、学段、年级候选、地区/教材线索和分类置信度。用户可见字段只使用 `S1/S2/...` 来源标签，不能暴露内部 `evidenceRefs`。

### 原因

用户明确要求系统能识别试卷、作业、错题等材料类型，以及科目和学段。若这些信息只埋在报告 markdown 的材料概览里，UI、SkillCard、筛选、月报聚合和后续 API 都容易重新解析文本或绕回内部 analysis。把分类作为最终结果合同的一部分，可以让产品层直接展示和校验，同时保留证据边界。

### 影响

后续 UI 应直接读取最终 artifact 的 `material_classification` 展示材料类型、科目、学段、年级候选和地区/教材线索。分类字段必须与同一份 `StudentLearningMaterialAnalysis.material_classification` 对齐；分类准确率仍只能通过 human-labeled dataset 与 `validate:k12-eval-assets` / `eval:k12-material` 证明，不能因为字段存在就宣称 99% 达成。

## Decision 047：Provider 候选必须可追溯到来源 URL 才能支撑 99% 资产

### 决定

真实 OCR/Vision case 的 `VisionEvidencePacket.pipeline_trace.provider_candidates` 不只要记录 selected provider、fallback 或 benchmark/open-source 候选和 license/deployment review note，还必须为每个候选记录 `evidence_source_url`。`validate:k12-eval-assets` 会统计 `provider_candidate_source_url_case_count`，并在候选来源 URL 覆盖不足时阻断 `claimable99AssetReady`。

### 原因

用户要求先搜索并评估相关开源项目。开源项目只能作为 OCR、layout、formula、reading order、bbox/crop_ref 等 Provider 候选，不能替代本 Skill 的证据门控和 human gold dataset。若评测资产只写 “paddleocr” 或 “surya” 这样的候选名，而没有来源 URL，后续无法复核具体项目、许可、部署条件和公开能力边界，也容易把不可追溯的 Provider 输出误认为可支撑 99% 宣称。

### 影响

真实样本可以先用缺来源 URL 的 pipeline trace 做本地调试，但不能成为 99% 可宣称资产。接入 PaddleOCR、MinerU、Pix2Text、RapidOCR、Surya、CnOCR、DocLayout-YOLO、LayoutParser 或内部 Provider 时，都要补齐候选来源 URL、角色、fit、license/deployment review note，再跑 Provider trial report、question segmentation review、human gold、asset preflight 和正式 dataset eval。

## Decision 048：真实样本必须显式准备月报输入后再生成交付包

### 决定

真实样本 case package 必须包含 `monthly_report_input_path`，默认路径为 `human-review/monthly-report-input.json`。命令序列中必须先运行 `generate:k12-monthly-report` 生成 `artifacts/monthly-report.json`，再运行 delivery bundle 生成。readiness inspector 若发现 result 已生成但 monthly input 或 monthly report 缺失，必须把下一步停在 `monthly_report`，不能跳过月报进入交付包。

### 原因

用户明确要求每月报告既总结本月表现，也和上月纵向比较。若 case package 只保留 monthly report 输出路径，而不要求准备 monthly input，真实样本跑批很容易把月报当作可选旁路，导致 delivery bundle 有老师报告和家长反馈，却缺少可回放的上月对比证据。把 monthly input 做成标准 artifact，可以强制团队说明本月确认素材、上月来源或无上月基线的原因。

### 影响

后续真实样本采集时，`human-review/monthly-report-input.json` 应来自老师确认的本月学习材料快照、学习记录、反馈、老师备注，以及上月确认来源或明确的 no-baseline 说明。该输入本身不是正确率证明，但缺少它会阻断 case package 的下一步和 99% asset readiness。delivery bundle 只消费已生成的 monthly report artifact，不应自行补写上月趋势。

## Decision 049：公式识别开源项目只能作为证据层 Benchmark

### 决定

LaTeX-OCR、Pix2Text、UniMERNet 等公式识别项目可以记录在 `VisionEvidencePacket.pipeline_trace.provider_candidates` 中，作为数学公式 crop 的 benchmark 或 fallback 候选。它们必须带来源 URL、角色、fit、license/deployment review note，并且只能增强 OCR/Layout/Vision 证据层；不得直接产生学生正误、错因、能力结论、家长反馈或 99% 正确率宣称。

### 原因

数学材料里的公式识别会明显影响题干、学生答案和标准答案的证据质量，但公式 OCR 仍然只解决局部表达式转写。逐题硬判还需要稳定题目切分、学生作答、同题标准答案或评分点、老师批改归属、证据置信度和 human gold dataset 验证。把公式项目纳入 provider trace 可以让真实样本复核有据可查，同时避免把公开公式 benchmark 外推为学情分析正确率。

### 影响

后续数学真实样本应在 Provider trial report 中保留公式识别候选和对照结果；若候选 Provider 改变公式识别策略，需要先跑同材料 OCR/Vision regression，再进入 reasoning-model regression 或 human-labeled dataset eval。即使公式 benchmark 表现更好，缺少题目切分 QA、gold label review、asset preflight 或正式 eval 时，仍必须进入老师复核，不能硬判。

## Decision 050：老师报告必须展示证据充分性判定

### 决定

专业测评型老师报告必须包含“证据充分性判定”章节。该章节至少说明本次逐题可硬判数量、需老师复核数量、非 pass gate 或缺失上下文，并明确只有题目切分、学生作答、同题答案依据或清晰老师批改、OCR/Layout 置信度同时满足时才允许确定性判断。`validateStudentLearningMaterialUserFacingResult`、`validateStudentLearningMaterialDeliveryBundle` 和 `validateStudentLearningMaterialTeacherReviewPacket` 必须拒绝缺少该章节的最终 artifact。

### 原因

用户要求正确率 99% 以上，但该目标只能靠“证据充分才硬判，证据不足进老师复核，human-labeled dataset 验证”逼近。若最终老师报告只给结论和数据可信度，老师仍然难以看出哪些题是证据充分、哪些题只是 AI 草稿或需补证据。把证据充分性做成必备章节，可以把内部 gate 显性化为老师可审阅的报告内容，降低误把 AI 草稿当最终诊断的风险。

### 影响

后续 UI、delivery bundle、teacher review packet 和真实样本交付包都应保留 `## 证据充分性判定`。缺少该章节时，即使其他章节完整，也不能视为合格老师交付物。该章节只说明证据边界，不等于 99% 已达成；正式正确率仍以 `claimable99AssetReady=true` 和 `eval:k12-material` 的 `claimable99Correctness=yes` 为准。

## Decision 051：题目切分 Review 必须可由同源证据包重算校验

### 决定

`student_learning_material_question_segmentation_review.v0.1` 不能只按自身字段自证通过。只要校验器拿到同一份 `VisionEvidencePacket`，就必须重新推导 packet-derived segmentation review，并核对 summary、逐题 status、issues、readiness、definitive readiness、region crop_ref 和 region issues。若 review 把缺 `crop_ref`、低置信、边界不稳或证据不匹配的题手工改成 `pass`，必须校验失败。

### 原因

题目切分 QA artifact 是 human gold、annotation task、asset preflight 和 99% claim readiness 的上游硬门。如果它可以被手工改绿，后续 gold 中的 definitive judgement 就可能建立在不稳定题目边界上，最终把 OCR/Layout 问题伪装成高正确率模型输出。

### 影响

后续任何导入、生成或复用 question-segmentation review 的流程，都必须与同一份 `VisionEvidencePacket` 一起校验。缺 crop_ref、低置信、孤儿证据、边界不稳或篡改 pass 的题，只能进入老师复核或阻断资产预检，不能作为 definitive gold judgement 或 99% 正确率证据。

## Decision 052：Provider Trial Report 必须可由同源证据包重算校验

### 决定

`student_learning_material_vision_provider_trial_report.v0.1` 不能只按自身字段自证 `ready_for_human_labeling`。只要校验器拿到同一份 `VisionEvidencePacket`，就必须重算 packet-derived Provider trial report，并核对 readiness、summary、gate statuses、Provider candidates、blockers、warnings、next steps，以及逐题 segmentation/readiness、definitive readiness、review_required、issues、readiness reasons 和 evidence refs。若报告把缺 `crop_ref`、证据不足、需复核或 blocked 的 Provider 输出手工改成 ready，必须校验失败。

### 原因

Provider 试跑报告位于真实 OCR/Vision 输出进入题目切分 QA、annotation task、human gold 和 99% 资产预检之前。如果 report 可以被手工改绿，后续资产清单会误以为真实 Provider 输出已经可用于人工标注和确定性评测，从而把 OCR/Layout 证据问题伪装成模型准确率。

### 影响

后续真实样本 case package、`validate:k12-eval-assets` 和 Provider regression 都必须把 Provider trial report 与同一份 `VisionEvidencePacket` 一起校验。被篡改的 ready、summary、blockers/warnings、Provider candidates 或逐题状态只允许作为失败 artifact 被修复，不能进入 claimable 99% 资产链路。

## Decision 053：月报上月对比来源数量必须与可回放 ID 一致

### 决定

`student_monthly_report_v1.comparison_evidence` 中的 `previous_month_source_count` 必须等于非空、去重后的 `previous_month_source_ids` 数量。若 `previous_month_evidence_status=available`，必须存在可回放的上月来源 ID；若状态为 `missing`，不能携带上月来源 ID，也不能标记 `previous_month_report_used=true`。资产预检必须拒绝空白、重复或数量不一致的上月来源元数据。

### 原因

月报纵向比较是用户明确目标之一。此前已有“无上月来源不得写趋势”的 gate，但如果上月来源数量和来源 ID 不一致，团队仍可能用不可回放的数量字段制造“有证据”的错觉。把数量和 ID 一一对齐，可以让每条上月对比都能追溯到实际已确认来源或已确认上月月报。

### 影响

后续真实样本月报必须准备可回放的上月素材 ID 或明确无基线说明。首月样本可以生成月报草稿，但不能计入纵向比较能力覆盖；所有写入趋势的月报 artifact 都要通过 `validate:k12-eval-assets` 的 comparison evidence 一致性校验后，才能进入 claimable 99% 资产链路。

## Decision 054：模型回归必须覆盖老师复核包动作边界

### 决定

`compare:k12-model-regression` 除了校验 user-facing result 和 delivery bundle，还必须从每个 analysis 生成 `student_learning_material_teacher_review_packet.v0.1` 并运行 `validateStudentLearningMaterialTeacherReviewPacket`。teacher review packet 的复核数量、source label 数量、SkillCard 状态、内部 audit source map，以及复制反馈、标记已反馈、确认入档、补充材料等动作的 enabled 状态，都必须与同一 delivery bundle 的证据阻断状态一致。

### 原因

模型、Prompt 或 Schema 切换可能不只影响内部正确率指标，也可能破坏最终 SkillCard / 分析详情页的产品安全边界。若还有需老师复核的题目却允许直接复制反馈、标记已反馈或确认入档，系统就会绕过“证据不足进老师复核、老师确认后才入档”的核心规则。把 teacher review packet 纳入模型回归，可以在候选模型通过内部指标前，先确认最终老师操作入口没有被改坏。

### 影响

后续 reasoning model、文本 Provider、Prompt 或 Schema 切换时，candidate 即使没有新增失败 case、指标也没有退步，只要无法生成有效的 teacher review packet，仍不能接受。该 gate 是产品动作安全层，不是 99% 正确率证明；正式正确率仍必须依赖同批 `validate:k12-eval-assets`、human-labeled dataset 和 `eval:k12-material`。

## Decision 055：Teacher Review Packet 必须进入 99% 资产完整性链路

### 决定

`student_learning_material_evaluation_assets.v0.1` 可以并应记录 `teacher_review_packet_path`。正式 asset preflight 必须校验每个老师复核包与同一 delivery bundle 对齐，包括动作启停、需复核数量、source label、SkillCard 状态和 audit source map。真实样本 case package 和 analysis-backed artifact expansion 都必须把 teacher review packet 放在 delivery bundle 之后生成；缺少该 artifact 时，`claimable99AssetReady` 不能为 true。

### 原因

99% 目标不能只看逐题指标，还要保证证据不足题确实进入老师复核、不会在最终 SkillCard / 分析详情页被按钮或状态绕过。delivery bundle 负责交付内容，teacher review packet 负责“老师能做什么动作”和“哪些动作被证据阻断”。如果 asset manifest 不检查这一层，团队可能得到一个指标合格的 dataset，却在真实 UI handoff 中允许复制、标记已反馈或确认入档不该通过的草稿。

### 影响

后续真实样本跑批必须在 delivery bundle 之后生成并保存 `artifacts/teacher-review-packet.json`，再运行 `validate:k12-eval-assets`。该要求是资产完整性和产品安全条件，不是单独的正确率证据；即使 teacher review packet 全部通过，也仍然需要真实脱敏材料、Provider trial、题目切分 QA、双人标注/仲裁、gold review、`generate:k12-eval-dataset`、`audit:k12-eval-claim` 和 `eval:k12-material` 才能讨论 99% claim。

## Decision 056：Human Gold 必须保留可回放 Annotation Import

### 决定

`student_learning_material_evaluation_assets.v0.1` 可以并应记录 `annotation_import_path`。真实 human-labeled case 的 annotation import 必须是 Label Studio、CVAT 或人工标注流程归一化后的 `student_learning_material_gold_label_annotation_import.v0.1`，并且 asset preflight 要用同一份 VisionEvidencePacket 和 question-segmentation review 重新转换它，确认生成出的仲裁 gold 与 `gold_label_package_path` 对齐。缺少 annotation import 或 import 无法重建 final gold package 时，`claimable99AssetReady` 不能为 true。

### 原因

final gold package 是评测直接使用的结果，但如果不保留 annotation import，团队无法追溯人工标签来自哪个标注流程、是否双标、是否仲裁、是否在导入阶段复制了 OCR/text 内容，也无法发现 final gold package 被手工改过。把 annotation import 纳入 manifest，可以让 human gold 链路从上游标注导出到最终 gold package 都可回放，而不是只信任一个最终 JSON。

### 影响

后续真实样本 case package 必须把归一化导入文件保存到 `human-review/annotation-import.json`，再运行 `generate:k12-gold-label-package` 生成 final gold package。`validate:k12-eval-assets` 会把 annotation import 覆盖和对齐纳入 claim blocker。该决策不代表 human gold dataset 已足够，也不证明 99% 正确率；它只是让人工标注来源成为正式资产链路的一部分。

## Decision 057：Claim Audit 必须把资产预检 blocker 拆成可执行 Artifact 目标

### 决定

`student_learning_material_evaluation_claim_audit.v0.1` 不只输出泛化的 `asset_preflight_not_claim_ready`。当 dataset warning 暴露具体资产预检 blocker 时，claim audit 必须生成对应 artifact-focused gap 和 `next_sample_target.suggested_case_attributes.artifact_focus`，并在文本报告中展示 `artifactFocusTargets` 摘要。典型目标包括 Provider trial report、Provider candidate trace、question-segmentation review、annotation task、annotation import、gold label review report、analysis/user-facing/monthly/delivery/teacher review packet、monthly comparison evidence 和 mock/synthetic Vision source 替换。

### 原因

99% 目标不只是补更多样本，也要求每个样本证据链完整。若 audit 只说 asset preflight 没 ready，真实采集负责人仍要翻长 blocker 或 JSON 才知道下一步应该补标注导入、上月对比证据、老师复核包还是 Provider 试跑报告。把 blocker 拆成 artifact-focused target，可以把采集、标注、OCR/Vision、月报和 UI 交付链路的缺口分派出去，同时保留“audit 不是正确率证明”的边界。

### 影响

后续真实样本采集应先看 `audit:k12-eval-claim` 的 `artifactFocusTargets` 和结构化 `next_sample_targets`，再决定补样或补 artifact。该报告只能指导下一批工作；正式 99% 仍必须先通过 `validate:k12-eval-assets` 得到 `claimable99AssetReady=true`，再由同批 human-labeled dataset 的 `eval:k12-material` 输出 `claimable99Correctness=yes`。

## Decision 058：用户结果月报纵向比较必须有上月来源证据

### 决定

`StudentLearningMaterialAnalysis.monthly_comparison_seed.previous_month_snapshot` 只有在存在可回放上月已确认素材或上月报告来源时才能出现，并且必须携带该上月来源的 `evidenceRefs`。最终用户结果中的老师月报说明和 `monthly_result.comparison_to_previous_month` 只有在这些上月来源 refs 存在并进入 source map 时，才允许展示明确的本月 vs 上月趋势；否则必须提示缺少上月已确认素材或上月来源证据，不能写成明确进步或退步。

### 原因

上月 snapshot 对象本身不是证据。如果只因为模型输出了 `previous_month_snapshot` 就展示“和上月相比”，UI 会把不可回放的上月基线包装成专业测评结论。月报纵向比较会影响家长沟通和长期学生档案，因此必须与正式月报 artifact 的 `comparison_evidence` 规则保持一致：有可追溯来源才写趋势，没有来源就只记录本月表现和证据不足。

### 影响

后续模型、prompt、fixture 或真实 analysis artifact 必须在 `previous_month_snapshot` 中提供上月来源 `evidenceRefs`，否则 analysis schema 或用户结果校验会降级/失败。首月样本、缺失上月素材样本和上月来源不可回放样本仍可生成本月报告草稿，但不能生成明确纵向进步、退步、反复出现等趋势结论。该决策只保护月报比较证据边界，不代表 99% 正确率已达成。

## Decision 059：StudentLearningMaterialAnalysis evidenceRefs 必须可回放到同源证据

### 决定

`StudentLearningMaterialAnalysis` 中所有 evidenceRefs 不能只校验“非空字符串”。Runner 和 `validate:k12-eval-assets` 必须把 analysis 里的材料分类、gate、证据摘要、逐题分析、老师报告、家长反馈、档案建议、下一步动作、月报快照和月报比较 refs，与同一份 `VisionEvidencePacket.evidences[].evidence_ref` 对齐；只有显式按 `question_id` 映射的 side input refs 可以作为外部答案/评分点来源，且上月来源 refs 只能出现在 `monthly_comparison_seed` 范围内。

### 原因

raw string evidenceRefs 不是证据。如果模型或 artifact 可以随便写一个看似存在的 ref，老师报告、家长反馈和月报比较就会显得“有来源”，但实际无法回放到 OCR/Vision 证据、题目切分或老师确认的上月素材。这会削弱“证据充分才硬判，证据不足进老师复核”的核心安全边界，也会让 99% 验收链路被伪造引用污染。

### 影响

后续模型输出、fixture 和真实 `analysis_path` artifact 若引用不存在、跨 case、未映射 side input 或错误位置的上月 refs，必须降级或预检失败。该决策只保证 analysis 引用同源可回放，不代表证据内容本身正确，也不代表 99% 正确率已经达成；正式宣称仍必须依赖真实脱敏材料、Provider trial、题目切分 QA、human gold、asset preflight 和 dataset eval。

## Decision 060：显式非 K12 范围线索必须在模型前阻断

### 决定

`analyze_learning_evidence` 必须在调用文本推理模型前检测显式非 K12 范围线索。材料文本或元数据出现大学/高等教育、成人教育、职业教育或职业资格、考研考博、大学英语四六级、雅思/托福、专业证书考试等信号时，即使上游 `VisionEvidencePacket.material_state=valid_student_material`，也必须降级为老师复核或阻断，不能生成学生能力分析、家长反馈或可入档月报素材。正式评测资产预检也必须拒绝这类 case 进入中国大陆 K12 claimable 数据集。

### 原因

用户目标是中国大陆小学到高中学科类材料分析。若只相信上游 `material_state`，OCR/Vision 或人工构造 artifact 中的大学、成人、职业或外部考试材料可能被误送进模型，最终生成看似专业的学情诊断和家长反馈。这会直接违反产品边界，也会污染 99% 正确率验收集。

### 影响

后续 Provider adapter、fixture、真实样本和标注任务都要把显式非 K12 材料视为 out-of-scope。该规则只阻断明确非 K12 样本，不替代模糊材料的老师复核，也不证明 K12 样本内部分类或逐题判断已经达到 99%。正式宣称仍必须依赖真实脱敏 K12 材料、human gold、asset preflight 和 dataset eval。

## Decision 061：Analysis 逐题行必须与 VisionEvidencePacket 题目集合同源同序

### 决定

`StudentLearningMaterialAnalysis.question_analyses` 不能只要求“数组存在”或“每行有 evidenceRefs”。Runner 和 `validate:k12-eval-assets` 必须将 analysis 逐题行与同一份 `VisionEvidencePacket.questions` 对齐，要求每个 question_id 恰好出现一次，并保持 VisionEvidencePacket 中的顺序。漏题、额外题、重复题号或乱序题目行都必须降级或预检失败。降级分析也必须为每个已识别题目生成老师复核行，而不是只返回第一题。

### 原因

用户目标要求逐题分析。若模型可以少分析一题、复制一题冒充多题，或打乱题目顺序，最终老师报告和家长反馈即使 evidenceRefs 非空，也可能漏掉真实薄弱点或把题目结论错配到错误位置。逐题覆盖必须在 analysis 层就被固定，不能只依赖后续 result/delivery artifact 的行数校验。

### 影响

后续模型、prompt、fixture 和真实 `analysis_path` artifact 必须按 VisionEvidencePacket 的题目顺序输出逐题行；证据不足的题也要显式输出 `needs_teacher_review` 或 `unknown`，不能省略。该决策只保证题目覆盖和对齐，不证明 OCR/Vision 切分正确或正误判断达到 99%；正式宣称仍必须依赖真实脱敏材料、题目切分 QA、human gold、asset preflight 和 dataset eval。

## Decision 062：Final Gold Package 必须可与源 VisionEvidencePacket 同源验包

### 决定

`student_learning_material_gold_label_package.v0.1` 不能只检查“双标、仲裁、脱敏、字段存在”。当验证器拿到源 `VisionEvidencePacket` 时，必须校验 package 身份与源 packet 一致，所有 reviewer label 和 adjudicated gold 的题目集合与顺序覆盖同一份 packet，`question_evidence_basis` 也逐题同序覆盖。basis 中的 evidence ref 必须属于同一个 question_id；外部 `side_input.*` 只能作为答案/评分点 basis，不能冒充学生痕迹或老师批改。

### 原因

final gold package 是 99% dataset eval 的直接答案源。如果它可以少标一题、把题目顺序改乱，或用 q002 的学生作答支撑 q001 的 gold 结论，即使双标和仲裁字段存在，也会把人工 gold 自身变成不可回放的伪证据。annotation import 和 asset manifest 已经能重建/校验这条链，但单包验证也需要在拿到源 packet 时提前发现错配，减少真实样本跑批后期返工。

### 影响

后续 `validate:k12-gold-labels` 可配合 `XUEMAI_VISION_PACKET` 运行同源验包；真实样本 case package 里的 final gold package 必须经得起这层校验，再进入 gold label review report 和 asset preflight。该决策只保证 gold 包与结构化证据同源，不证明人工标注值正确、样本足够代表真实场景或 99% 已达成；正式宣称仍必须通过真实脱敏材料、题目切分 QA、双标/仲裁、gold review、asset preflight、claim audit 和 dataset eval。

## Decision 063：VisionEvidencePacket 的 region 证据归属必须同题

### 决定

外部 OCR/Layout/Vision Provider 输出在归一化前，必须校验每个 evidence 引用的 `region_id` 属于同一个 parent `question_id`。最终 `VisionEvidencePacket` 也必须执行同样校验：如果 evidence 声明 `question_id=q002`，但 `region_id` 来自 q001 的题目区域，必须在进入文本推理、题目切分 QA、gold 标注或资产预检前失败。

### 原因

逐题分析依赖题目区域、学生作答、老师批改和答案依据的同题归属。只校验 `region_id` 全局存在，会允许 q002 的作答证据挂到 q001 的视觉区域，后续再正确校验 evidenceRefs 也无法发现视觉归属已错位。这会污染硬判依据、错因诊断、人标 gold 和老师报告。

### 影响

后续真实 Provider adapter、fixture 和手工构造的 VisionEvidencePacket 必须保持 evidence.region_id 与 evidence.question_id 同题。该决策只保证视觉区域引用不跨题，不证明 OCR 文本内容、题目边界或正误判断本身正确；正式 99% 仍必须依赖真实脱敏材料、Provider trial、题目切分 QA、human gold、asset preflight、claim audit 和 dataset eval。

## Decision 064：Case Package Readiness 必须前置校验已存在 VisionEvidencePacket

### 决定

真实样本 case package readiness 不能只把 `vision_packet_path` 当作“文件存在即完成”。当 case package 中已经存在 VisionEvidencePacket artifact 时，`inspect:k12-eval-case-package` 必须先运行结构校验，并把错误写入 `artifact_validation_statuses`。如果该 packet 无效，下一步必须是 `fix_artifact_validation`，不能继续推荐 Provider trial report、题目切分 QA、human gold、analysis、月报、交付或 dataset 命令。

### 原因

case package 是真实样本采集和 human gold 链路的操作导航。如果坏的 Vision 包因为文件存在而被视为已完成，后续 Provider report、question segmentation review、gold package、analysis 和老师交付 artifact 都会建立在错位证据上，直到资产预检或更晚才失败。前置校验可以把 OCR/Vision 结构问题暴露在最早可修复位置，符合“证据充分才硬判，证据不足或证据错配先复核”的原则。

### 影响

后续真实样本跑 `inspect:k12-eval-case-package` 时，若 VisionEvidencePacket JSON 解析失败、缺字段、孤儿引用、跨题 region/evidence 错配或其他结构错误，必须先修复该 artifact。该决策不替代正式 `validate:k12-eval-assets` 和 `eval:k12-material`，也不代表 OCR/Vision 内容或 99% 正确率已经达成。

## Decision 065：Case Package Readiness 必须前置校验 OCR/Vision 中间 Artifact 同源一致

### 决定

真实样本 case package readiness 不仅要校验已存在的 VisionEvidencePacket，还必须在 `question_segmentation_review_path` 或 `provider_trial_report_path` 已存在时，用同一份 VisionEvidencePacket 进行同源校验。题目切分 QA 的 status、issues、crop_ref、definitive readiness 不能被手工改成通过；Provider trial report 的 readiness、summary、provider candidates、blockers、warnings、next steps 和逐题行也必须与同源 Vision 包重算结果一致。若任一 artifact 无效，下一步必须是 `fix_artifact_validation`。

### 原因

Provider trial report 和 question-segmentation review 位于 human gold 与模型分析之前。如果它们只凭文件存在就被视为完成，真实样本链路会把被篡改或错配的题目边界、crop_ref、ready 状态、逐题 evidence readiness 继续传给标注任务、gold package、analysis 和老师交付结果。readiness 命令是采集过程中的日常导航，必须在最早阶段暴露这些错误，而不是等到 `validate:k12-eval-assets` 才发现。

### 影响

后续真实样本包如果已经生成 Provider trial report 或题目切分 QA，再次运行 `inspect:k12-eval-case-package` 会先复验这些 artifact。无效 artifact 不能进入 human gold、analysis、monthly、delivery 或 dataset 命令推荐。该决策只保证中间 artifact 与同源结构证据一致，不证明 OCR 文本、人标值、模型输出或 99% 正确率已达成；正式验收仍依赖完整 asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 066：Case Package Readiness 必须前置校验 Human Gold 入口 Artifact

### 决定

真实样本 case package readiness 不能只把 `annotation_task_path` 和 `annotation_import_path` 当作“文件存在即完成”。当这些 artifact 已存在时，`inspect:k12-eval-case-package` 必须在推荐 analysis、monthly、delivery 或 dataset 命令前先校验它们：redacted annotation task 要与同一份 `VisionEvidencePacket` 对齐并保持 raw-text-safe；normalized annotation import 要能结合同一份 Vision 包和 question-segmentation review 重建通过校验的 final gold package。任一入口 artifact 无效时，下一步必须是 `fix_artifact_validation`。

### 原因

human gold 是 99% dataset eval 的核心答案来源。如果上游 annotation task 引用不存在的 evidence ref、复制 OCR/text，或 annotation import 缺少脱敏、双标、仲裁、同题 evidence basis 与题目切分 pass 约束，后续 final gold、analysis、老师报告和月报都会建立在不可靠标注入口上。case package readiness 是真实采集流程中的日常导航，必须在最早阶段暴露这些 human gold 入口问题，不能等到资产预检后期才发现。

### 影响

后续真实样本包只要放入 annotation task 或 annotation import，运行 `inspect:k12-eval-case-package` 就会复验它们。工具导出、人工修改和中间 JSON 不能靠文件存在跳过同源校验、文本泄漏校验或 final gold 重建校验。该决策只保证 human gold 入口 artifact 可追溯且 raw-text-safe，不证明人工标注值本身正确、样本代表性足够或 99% 已达成；正式验收仍必须经过 final gold package、gold review report、`validate:k12-eval-assets`、claim audit 和 human-labeled dataset eval。

## Decision 067：Case Package Readiness 必须前置校验 Final Human Gold Artifact

### 决定

真实样本 case package readiness 也不能只把 `gold_label_package_path` 和 `gold_label_review_report_path` 当作“文件存在即完成”。当 final gold package 已存在时，`inspect:k12-eval-case-package` 必须用同一份 `VisionEvidencePacket` 校验 package 身份、题目覆盖/顺序、逐题 evidence basis、脱敏、双标和仲裁；如果同一包内存在有效 annotation import，还必须确认 final gold package 与 annotation import 重建结果一致。当 gold label review report 已存在时，必须校验它与同一 final gold package 和 VisionEvidencePacket 对齐，并且 `ready_for_99_evaluation=true`。任一终态 artifact 无效时，下一步必须是 `fix_artifact_validation`。

### 原因

final gold package 和 gold review report 是 99% dataset eval 前最关键的人标终态。如果它们只凭文件存在就被视为完成，真实样本流程可能把手工篡改、漏题、跨题 evidence basis、未仲裁、未 ready 的 review report 继续送入 analysis、月报、老师交付和 dataset 生成。case package readiness 是采集过程中的早期导航，必须尽早暴露 final human gold 的同源错配和 readiness 问题，避免把错误拖到 asset preflight 或正式评测阶段。

### 影响

后续真实样本只要生成 final gold package 或 gold label review report，再运行 `inspect:k12-eval-case-package` 就会复验终态人标 artifact。annotation import、final gold package、gold review report 三者不能互相漂移；未 ready 的 gold review report 不能继续被当作完整人标证据链。该决策只保证 final human gold artifact 可追溯、对齐且 ready，不证明人工标注内容绝对正确、样本覆盖足够或 99% 已达成；正式验收仍必须经过 `validate:k12-eval-assets`、claim audit 和 human-labeled dataset eval。

## Decision 068：Case Package Readiness 必须前置校验下游交付 Artifact

### 决定

真实样本 case package readiness 不能只校验到 OCR/Vision 和 human gold 链路。当 `analysis_path`、`result_path`、`monthly_report_input_path`、`monthly_report_path`、`delivery_bundle_path` 或 `teacher_review_packet_path` 已存在时，`inspect:k12-eval-case-package` 必须先校验它们：analysis 要与同一 VisionEvidencePacket 的 evidenceRefs 和题目顺序对齐；result 要与同一 analysis 对齐；monthly report input/output 要能说明上月证据存在或缺失且不能无证据写趋势；delivery bundle 要与 result、analysis、monthly report 同源；teacher review packet 的动作启停、复核数量和 audit source map 要与同一 delivery bundle 一致。任一下游 artifact 无效时，下一步必须是 `fix_artifact_validation`。

### 原因

真实老师最终看到的是 result、delivery bundle 和 teacher review packet，而不是内部 gold package。若 case package 只检查到 human gold，就可能把 `{}`、过期 result、缺上月证据却写趋势的 monthly report、丢题的 delivery bundle，或绕过老师复核动作边界的 review packet 继续带入 asset manifest 和 dataset 命令。教育场景的正确率目标不仅要求逐题 gold 可追溯，也要求证据不足题真的进入老师复核，家长反馈和入档动作不能被下游 UI handoff 绕过。

### 影响

后续真实样本跑 `inspect:k12-eval-case-package` 时，只要已经生成 analysis/result/monthly/delivery/review artifact，就会在推荐 asset manifest 或 dataset 命令前先复验这些文件。无效下游 artifact 不能靠“文件存在”跳过月报纵向比较、老师专业报告、家长反馈安全或复核动作边界。该决策不证明模型判断正确、人工 gold 值正确或 99% 已达成；正式宣称仍必须依赖真实脱敏材料、Provider trial、题目切分 QA、双标/仲裁、gold review、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 069：月报输入必须前置校验老师确认与可回放证据

### 决定

`student_monthly_report_input.v0.1` 不能只依赖月报生成器在内部过滤未确认来源。文件输入本身必须在生成前校验：当前月和上月的学习材料快照、课堂记录、反馈记录、老师备注都必须是老师确认来源，且与输入学生和月份一致；快照必须携带确认时间、teacher_id、SkillRun ID、archive_record_id、source_material_id 和非空 evidenceRefs；普通确认来源也必须携带确认时间和非空 evidenceRefs。无效 input 在 `generate:k12-monthly-report`、case package readiness 和 `validate:k12-eval-assets` 中都必须失败；正式 evaluation asset manifest 必须记录 `monthly_report_input_path`，否则不能进入 99% claim-ready。

### 原因

月报会对家长呈现月度状态和上月纵向比较。如果输入文件允许未确认快照、月份错位来源或没有 evidenceRefs 的上月来源混入，生成器可能静默过滤后产出低证据月报，也可能让后续 artifact 看起来具备“上月对比”但无法回放。教育场景必须把“证据不足进老师复核”落在输入边界，而不是把坏数据留给下游文案兜底。

### 影响

真实样本包准备 `human-review/monthly-report-input.json` 时，需要先把 AI 草稿转成老师确认后的月报快照或确认来源记录，并保留 SkillRun/archive/source-material/evidenceRefs 链路。没有上月证据时可以生成明确 no-baseline 的低证据月报，但不能伪造趋势；缺 evidenceRefs、未确认来源或 asset manifest 缺 `monthly_report_input_path` 会在生成、readiness 或 asset preflight 阶段被阻断，claim audit 也必须把它识别为单独的 `monthly_report_input` 补齐目标。case package 写出的 `evaluation_asset_case` 和后续 manifest path normalizer 都必须保留该路径，避免 scaffold 中已准备的月报输入在正式资产清单里消失。该决策不证明月报趋势正确或 99% 达成，正式 claim 仍依赖真实脱敏样本、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 070：模型回归必须覆盖月报输入输出链路

### 决定

`compare:k12-model-regression` 在比较 baseline/candidate 的同一 gold dataset 时，除了 analysis 指标、user-facing result、delivery bundle 和 teacher review packet，还必须从每个 analysis 生成老师确认后的 monthly report input 与 monthly report，并运行同一月报输入与输出一致性校验。candidate 若无法生成有效月报 input/output，即使逐题指标没有退步，也不能接受为模型、Provider、Prompt 或 Schema 切换结果。

### 原因

月报与上月纵向比较是本 Skill 的正式用户价值之一，也最容易被模型输出里的“看起来合理”文本绕过。如果模型切换后 monthly_report_snapshot 出现违规家长表述、缺可回放 evidenceRefs、未保留老师确认元数据，或月报输出与上月来源不一致，内部正确率指标可能仍然不退步，但老师最终会拿到不可入档或不可给家长的月报。模型回归必须覆盖这个交付链路，才符合“证据不足进老师复核、老师确认后才入档”的边界。

### 影响

后续更换 DeepSeek/OpenAI/其他兼容模型、Prompt 或 Schema 时，baseline/candidate dataset 不只要通过 `eval:k12-material` 指标比较，也要能生成通过校验的月报 input/output、delivery bundle 和 teacher review packet。synthetic fixture 只能证明 gate 生效，不能证明真实月报趋势、样本代表性或 99% 正确率；正式 claim 仍依赖真实脱敏样本、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 071：Human Gold 上游 Artifact 必须保留同源题目顺序

### 决定

question-segmentation review、redacted annotation task、annotation import skeleton 和 Label Studio payload 都必须保持与同一份 `VisionEvidencePacket.questions` 完全一致的 `question_id` 顺序。即使题目集合相同，只要顺序被手工重排，也必须在 validator、case package readiness 或 `validate:k12-eval-assets` 中失败。

### 原因

本 Skill 的逐题分析、证据充分性、人工双标、仲裁和老师报告都依赖稳定的同题对齐。若上游 artifact 允许 q001/q002 等题目顺序漂移，后续标注员、annotation import 或 final gold package 可能把证据、正误、知识点和错因挂到同题号集合中的错误位置，尤其在多页、多小题或题号重复样式下很难靠人工肉眼发现。顺序校验能把这种漂移挡在 human gold 上游，而不是等到最终评测或老师报告出现错配。

### 影响

后续真实样本链路中，题目切分 QA、标注任务包、annotation import skeleton 和 Label Studio payload 只要被重排，就不能继续进入 final gold package、analysis、monthly、delivery 或 dataset eval。该决策只保证结构化题目顺序没有漂移，不证明 OCR/Vision 边界、人类标注值或 99% 正确率；正式 claim 仍需要真实脱敏样本、Provider trial、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 072：Case Package Readiness 必须校验外部 Provider 输入

### 决定

真实样本 case package readiness 不能只把 `external_vision_input_path` 当作“文件存在即完成”。当外部 OCR/Vision Provider 输入文件已存在时，`inspect:k12-eval-case-package` 必须先按 `ExternalVisionAdapterInput` 校验 provider 元数据、pages/questions、ID 唯一性、page/region 引用、confidence、嵌套 question_id 与跨题 region/evidence 归属。任一校验失败时，下一步必须是 `fix_artifact_validation`，不能推荐 `normalize_external_vision`、human gold、analysis、monthly、delivery 或 dataset 命令。

### 原因

PaddleOCR/PaddleX 或其他开源/商业 Provider 的原始输出必须先被映射成项目内部可追溯的 adapter input。如果 readiness 只看文件是否存在，真实样本流程可能把 `{}`、字段缺失、题目空数组、跨题区域归属或孤儿引用继续送入 VisionEvidencePacket 生成，后续 Provider trial、题目切分 QA 和人工标注都会建立在坏输入上。外部输入校验需要前置到 case package inspection，才能在采集样本时及时发现映射问题。

### 影响

后续采集真实 PaddleOCR/PaddleX 样本时，先把脱敏 Provider 输出保存到 package 的 `provider/external-vision-input.json`，运行 `inspect:k12-eval-case-package`，只有该输入通过 adapter 校验后才继续生成 `VisionEvidencePacket`。该决策只证明外部 Provider 输入结构可归一化，不证明 OCR/Vision 内容、题目切分、人工 gold 标注值或 99% 正确率；正式 claim 仍必须经过 Provider trial report、question-segmentation review、human gold package、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 073：Evaluation Asset Manifest 必须保留外部 Provider 输入来源

### 决定

正式 `student_learning_material_evaluation_assets.v0.1` 清单必须支持 `external_vision_input_path`。当该 artifact 存在时，`validate:k12-eval-assets` 必须校验它通过 `ExternalVisionAdapterInput` 结构检查，并与同一份 `VisionEvidencePacket` 的 providerRunId、providerModelVersion、materialId、sourceMaterialId、studentId、sourceKind、pages 顺序和 questions 顺序对齐。human-labeled 资产若缺少 external Provider input artifact，必须阻断 `claimable99AssetReady`。

### 原因

只保存归一化后的 `VisionEvidencePacket` 不足以证明真实 OCR/Vision Provider 输出是可回放、可审计、可替换的。Provider 更换、OCR 失败复盘、题目切分纠错和 99% dataset 评测都需要知道原始 Provider 输出如何映射到内部结构。如果正式资产清单不保存 `external_vision_input_path`，后续即使 Provider trial report、human gold 和 analysis 都存在，也无法证明 VisionEvidencePacket 不是手工拼接或来源漂移。

### 影响

后续真实样本进入 `validate:k12-eval-assets` 前，需要把脱敏 Provider adapter input 与 VisionEvidencePacket 一起纳入资产清单。`generate:k12-eval-artifacts` 只能保留已存在的 `external_vision_input_path`，不能伪造或生成 Provider 输入；`audit:k12-eval-claim` 也必须把缺失 external Provider input 映射为单独的 `external_provider_input` 补齐目标。缺失或不同源的 external Provider input 仍可用于本地调试定位，但不能成为 claim-ready 资产。该决策只证明 Provider 输入来源可回放，不证明 Provider 识别质量、人工标注值、模型判断或 99% 正确率已经达成；正式宣称仍需要 Provider trial report、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 074：过程性错因必须有同题学生过程证据

### 决定

`StudentLearningMaterialAnalysis.question_analyses[*].mistakeDiagnosis` 不能仅凭最终答案或标准答案推断知识缺口、过程遗漏、检查习惯、粗心、不认真、概念混淆、方法错误或思路混乱。凡是过程性错因，必须引用同题 `student_process` 或 `student_note` evidenceRef；否则 runner 降级为老师复核，`validate:k12-eval-assets` 拒绝该 analysis artifact。

### 原因

专业测评型报告可以指出“答案漏了条件范围”这类可见事实，但不能把可见错误直接升级成学生方法、概念或态度问题。教育场景中“粗心”“概念混淆”“方法不熟”会影响老师后续判断和家长沟通，必须有学生过程、订正思路、笔记或同等可回放证据支撑。缺过程证据时，只能写错因待老师确认。

### 影响

后续模型、Prompt 或 Provider 切换即使能给出更像老师口吻的错因，也必须通过同题过程证据门。真实样本若想支持过程性错因，需要 OCR/Vision Provider 抽取学生过程、订正或笔记，并在 human gold 双标/仲裁中确认；否则对应题目进入老师复核。该决策不证明真实过程识别、错因标注或 99% 正确率已达成，正式 claim 仍依赖完整真实样本评测链路。

## Decision 075：家长反馈可复制状态必须服从老师复核边界

### 决定

最终 user-facing result 中的 `parent_feedback.copyable` 不能只信任模型输出的 `wechat_parent_feedback_draft.status=draft`。只要 analysis 仍有老师复核阻断，包括 analysis 级 `teacher_review_required`、risk flags，或任一题正误为 `needs_teacher_review` / `unknown`，家长反馈必须标记为 `needs_teacher_review` 且 `copyable=false`；validator 必须拒绝被手工改成可复制的结果。

### 原因

老师报告和家长微信反馈是同一份分析的两个交付面。如果逐题证据不足、OCR/Vision 风险或 AI 输出风险还没被老师复核，但微信反馈仍可复制，老师很容易把未经确认的学情结论发给家长。这会绕过“证据不足进老师复核”和“AI 草稿不自动交付”的核心边界。

### 影响

后续 delivery bundle、teacher review packet 和 SkillCard 动作都应继承 user-facing result 的 copyable 状态；存在复核阻断时，可以展示家长反馈草稿供老师编辑，但不能直接允许复制/标记已发。该决策只保证交付状态不越界，不证明文案质量或 99% 正确率；正式 claim 仍依赖真实脱敏材料和 human-labeled dataset 全链路验证。

## Decision 076：档案更新建议必须由可硬判逐题证据支撑

### 决定

`student_profile_update_suggestions` 若保持 `draft`，必须至少引用一条同份 `VisionEvidencePacket` 中已可明确正误判定的题目证据。若建议引用的题目在 analysis 中仍为 `needs_teacher_review` 或 `unknown`，必须降级或改为 `needs_teacher_review`，不能作为可入档草稿候选。外部 `side_input.*` 答案键/评分点只允许用于逐题正误依据，不能直接支撑长期档案建议、全局报告或家长反馈。

### 原因

档案更新建议会影响学生长期画像、月报复用和后续家长沟通，比一次性报告摘要风险更高。若模型能把待复核题目的可见错误、缺答案依据的题目，或仅存在的外部答案键直接写成“薄弱点”“能力快照”“复发风险”，就会绕过“证据不足进老师复核”和“老师确认后才入档”。档案建议必须只从证据已足够的逐题结论中抽取，并继续要求老师确认。

### 影响

runner、case-package readiness 与 `validate:k12-eval-assets` 都要执行同一档案建议证据门。真实样本中，若某题缺学生答案、缺同题答案/评分依据、题目切分不稳或置信度不足，该题可以进入老师复核和报告说明，但不能生成可入档的长期档案 `draft`。该决策不证明长期画像正确或 99% 达成，正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 077：Case Package Readiness 必须复用正式逐题证据门

### 决定

真实样本 case package readiness 校验 `analysis_path` 时，必须复用与 live runner、`validate:k12-eval-assets` 一致的逐题证据门：`VisionEvidencePacket` 题目覆盖与顺序、question evidence readiness、同题 answer/rubric side input 白名单、过程性错因证据门、档案更新建议证据门、微信反馈安全门。若 case package 显式声明 `answer_keys_path` 或 `rubrics_path`，readiness 必须解析这些 side input 并只允许它们支撑匹配 `question_id` 的逐题判断。

### 原因

case package readiness 是真实样本采集时最早被反复运行的检查。如果它不识别同题外部答案键，会误把合法 analysis artifact 判成 unknown evidenceRef；如果它缺少 question evidence readiness 或过程性错因门，又可能让本地样本包看似可继续，直到正式 asset preflight 才失败。真实样本链路需要早发现、同口径，而不是前后校验标准漂移。

### 影响

后续准备真实 OCR/Vision 样本包时，可在 case package 或 evaluation asset case 中显式声明 answer/rubric side-input 文件；readiness 会把它们纳入 analysis 校验，但仍只允许同题使用。side input 文件每一项都必须包含 `question_id` 或 `questionId`，且题号必须存在于同一份 `VisionEvidencePacket`。缺少 side input 时，含 `side_input.*` 的 analysis 仍会失败。该决策不证明 side input 内容正确或 99% 达成，正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial、question-segmentation review、human gold 双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 078：Human Gold Evidence Basis 必须复用同题 Side Input 白名单

### 决定

human gold package 的 `question_evidence_basis` 不能只校验 packet evidence refs 同题归属，也必须校验 `side_input.*` answer/rubric refs 是否映射到同一个 `question_id`。`side_input.*` 仍只允许出现在 `answer_key_or_rubric_evidence_refs`，并且在 case package readiness 或 asset preflight 提供 side-input 白名单时，q001 的 gold basis 不能使用 q002 的外部答案或评分点。

### 原因

99% dataset 的 gold label 是评测基准。如果 gold evidence basis 可以跨题引用外部答案键，即使模型输出完全按 gold 评测通过，也可能是在错误证据基础上“正确”。这类错误必须挡在人类 gold 资产阶段，而不是等到模型评测或老师报告阶段暴露。

### 影响

后续 Label Studio、CVAT 或 manual annotation import 转 final gold package 时，也要继承同题 side-input 白名单。standalone `validate:k12-gold-labels`、gold label review report 生成/校验、case readiness 与 asset preflight 也必须复用同一份白名单，不能接受未按声明 side-input 映射生成或验证的 stale ready human-gold artifact。缺少 side-input 白名单时可继续保持旧的草稿兼容行为；一旦真实样本包或 asset manifest 声明了 answer/rubric side inputs，就必须校验它们和 gold basis 的题号一致。该决策不证明人工标注值正确或 99% 达成，正式 claim 仍需要真实脱敏 Provider 输出、Provider trial、question-segmentation review、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 079：公开 K12 Benchmark 不能作为 Human-Labeled Claim 样本

### 决定

K12Vista、CMMaTH、CMM-Math、E-EVAL、EduEval、K12-Bench、K12-KGraph、OCRBench、Math23K、MWPToolkit 等公开 benchmark 或 source dataset 只能作为覆盖口径、知识点 taxonomy、公开对照评测或模型研究参考，不能作为 `human_labeled` 真实脱敏学生材料资产支撑 99% 正确率宣称。

`validate:k12-eval-assets` 必须识别 VisionEvidencePacket 的 metadata / material id / source material id 中的 public benchmark/source dataset 线索，并让 `claimable99AssetReady=false`。`audit:k12-eval-claim` 必须把这类 blocker 映射为 `replace_public_benchmark_source`，提示采集真实脱敏学生作答、订正、老师批改和人工 gold 标注。

### 原因

公开 K12 benchmark 通常包含考试题、标准答案、知识点或模型评测输入，但缺少本产品最关键的真实学生作答、订正、老师批改、OCR/Vision 题目切分、人类双标/仲裁和老师复核入档链路。把公开 benchmark 伪装成 human-labeled 真实样本，会让 99% claim 看起来有样本量和题量，实际却无法证明产品在教培老师日常材料上的识别、归属、正误判断、家长反馈和月报纵向比较能力。

### 影响

后续真实样本链路可以参考公开 benchmark 的学科、学段、题型、知识点和认知维度覆盖，但必须另行采集真实脱敏学生材料并走 external Provider input、VisionEvidencePacket、Provider trial、question segmentation review、annotation task/import、final gold package、gold label review、analysis/result/monthly/delivery/review packet、asset preflight、claim audit 和 dataset eval。该决策不证明任何公开 benchmark 无价值，也不证明 99% 已达成；它只防止把公开 benchmark 当成真实学生材料证据链。

## Decision 080：模型回归必须校验 Human-Gold 内容同源

### 决定

`compare:k12-model-regression` 在比较 baseline/candidate dataset 时，不能只要求 case id 集合一致。对每一个相同 `case_id`，baseline 与 candidate 的 human-gold case 内容必须完全一致；如果 candidate 替换了 gold 的材料分类、题目正误、是否可硬判、知识点、错因或其他 gold 字段，比较必须失败。

### 原因

模型、Prompt 或 Provider 切换的回归目标是验证“同一批人工 gold”上的输出有没有退步。如果 candidate 可以带着同 case id 但不同 gold 标签参与比较，指标看起来可能没有退步，实际却换了评测基准。这会绕过 99% claim 所依赖的 human-labeled dataset 稳定性，也让模型切换验收失去意义。

### 影响

后续生成 baseline/candidate dataset 时，可以重新生成 `analysis_path`，但不能重写或替换 gold case。若 human gold 本身需要修订，应先作为新的 dataset 版本重新完成 asset preflight、claim audit 和基线建立，而不是在模型回归比较中静默替换。该决策不证明模型正确率已达成；它只保证模型回归的比较基准没有漂移。

## Decision 081：Human Gold Evidence Basis 槽位必须匹配 Evidence Type

### 决定

当 human gold package 校验传入同源 `VisionEvidencePacket` 时，`question_evidence_basis` 不能只要求 evidence ref 存在且属于同一题，还必须要求 evidence ref 的 `evidence_type` 与 basis 槽位一致。`student_trace_evidence_refs` 只能引用学生作答、订正、过程、笔记或老师批改痕迹；`answer_key_or_rubric_evidence_refs` 只能引用 `answer_key` / `rubric` 或同题 `side_input.*`；`teacher_correction_evidence_refs` 只能引用 `teacher_mark` / `teacher_comment` / `teacher_score`。

### 原因

99% dataset 的 gold basis 是“为什么这题可以硬判”的证据链。如果同一题的 answer key 可以被放进学生痕迹槽位，或者学生答案可以冒充答案依据，gold package 看起来同题且双标完成，但实际缺少硬判所需的证据角色。这会污染模型评测、Provider 回归、老师报告和月报复用。

### 影响

后续 Label Studio、CVAT 或 manual annotation import 转 final gold package、standalone `validate:k12-gold-labels`、gold label review report、case readiness 与 asset preflight 都应继承该槽位类型校验。没有传入 source VisionEvidencePacket 的草稿仍不能作为 99% 依据；正式样本必须带同源 packet 才能证明 basis ref 的题号和证据类型都正确。该决策不证明人工标注值正确或 99% 达成，正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial、question-segmentation review、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 082：Adjudicated Gold 硬判不能脱离 Reviewer Evidence Basis

### 决定

`adjudicated_gold.questions[*].definitive_judgement_allowed=true` 时，最终 gold package 必须证明该题在每位 reviewer 的 `question_evidence_basis` 中都有学生痕迹证据，并且有答案/评分点依据或老师批改依据。仲裁可以解决 reviewer 对 correctness、知识点或错因的分歧，但不能在 reviewer evidence basis 不足时新增可硬判题。

### 原因

99% 评测以 `adjudicated_gold` 作为最终基准。如果仲裁结果可以把 reviewer 都未提供答案依据的题改成可硬判，评测集就会把证据不足题纳入硬判正确率，直接破坏“证据充分才硬判、证据不足进老师复核”的核心口径。

### 影响

后续 final gold package、gold label review report、case readiness、asset preflight 和 dataset 生成都应拒绝 unsupported adjudicated hard judgement。若仲裁过程中确实发现可补充依据，应先更新 reviewer/annotation import 的 evidence basis 或补充同题 side input，再重新生成 final gold package。该决策不证明人工标注值正确或 99% 达成，正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial、question-segmentation review、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 083：Dataset 99% Claim 必须保留 Case Artifact Provenance

### 决定

正式 `eval:k12-material` dataset 不能只记录 dataset-level `asset_preflight.claimable99AssetReady=true`。每个 case 还必须保留来自 asset manifest 的 `asset_manifest_case_id`、final `gold_label_package_path` 和 replayable `analysis_path`。缺任一字段时，即使人工标注协议、样本覆盖和逐题指标都通过，也不能得到 `claimable99Correctness=yes`。

`gold_path` 仍可用于本地指标调试或模型回归小样本，但它不是 final human-gold package provenance，不能支撑正式 99% claim。正式 dataset 应通过 `generate:k12-eval-dataset` 从已经通过 `validate:k12-eval-assets` 的 asset manifest 生成，而不是手写 `asset_preflight`。

### 原因

只校验 dataset-level asset preflight 会留下绕过空间：有人可以手写 `claimable99AssetReady=true`，再用 ad hoc gold JSON 和 analysis JSON 拼出指标全绿的 dataset。case-level provenance 把每个评测 case 重新绑定到 asset manifest、最终双标/仲裁 gold package 和可回放 analysis artifact，能让 99% claim 回到同一条 OCR/Vision、human gold、老师交付和月报证据链。

### 影响

后续真实样本跑批必须从 asset manifest 生成 dataset，并保留 case provenance。`audit:k12-eval-claim` 会把缺失 provenance 映射为重新生成 dataset 的 artifact target。已有 `gold_path` fixture 可继续作为 synthetic smoke 或局部模型指标测试，但不能用于产品或对外 99% 正确率口径。该决策不证明 99% 已达成，正式 claim 仍依赖真实脱敏 Provider 输出、Provider trial、question-segmentation review、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 084：月报纵向比较状态不能从文案推断

### 决定

最终用户结果、老师交付包和老师复核包必须携带结构化上月证据状态。`monthly_result` 记录 `previous_month_evidence_status` 和 `previous_month_source_ids`；delivery bundle 记录 `monthly_comparison_evidence`；teacher review packet 的月报纵向比较状态和上月来源数量必须从该结构化字段计算，不能通过中文文案是否包含“缺少上月”来推断。

### 原因

月报纵向比较会进入老师报告、家长沟通和长期学生档案素材。如果 UI 或 SkillCard 只靠文案判断“有无上月证据”，改写一句话就可能把证据不足的首月材料包装成“和上月相比”的趋势结论。结构化 evidence status 能让生成、交付、复核和资产预检使用同一个机器可校验口径。

### 影响

后续 delivery bundle、teacher review packet、SkillCard 和分析详情页都应读取结构化 monthly comparison evidence。文案仍可展示给老师和家长，但不能作为 gate 判断来源。该决策不证明月报趋势已达成 99% 正确；正式 claim 仍依赖老师确认来源、可回放上月证据、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 085：大陆地区/教材覆盖不能只按候选数量验收

### 决定

正式 99% claim policy 不能只要求 `regionsOrCurricula` 达到若干个字符串。dataset eval、asset preflight 和 claim audit 必须同时报告并约束大陆区域分组、教材版本族和全国卷/新高考考试范围线索。缺少这些分桶覆盖时，即使原始地区/教材候选数量达标，也不能得到 `claimable99Correctness=yes` 或 `claimable99AssetReady=yes`。

### 原因

中国大陆 K12 材料差异不只体现在单个省名或教材名。只数 `广东/江苏/浙江` 这类候选，可能让样本集中在一个大区；只数 `人教版/苏教版/浙教版`，也可能缺少全国卷、新高考或其他区域考试口径。99% claim 需要证明样本覆盖具有代表性，而不是靠几个相近标签满足数量门槛。

### 影响

后续采集真实脱敏样本时，`audit:k12-eval-claim` 会给出缺失区域分组、教材版本族或全国卷/新高考线索的 next sample target。该决策不证明地区/教材识别或逐题分析已达 99%，只是把覆盖不足更早暴露到资产链路；正式 claim 仍必须依赖真实 Provider 输出、题目切分 QA、human gold 双标/仲裁、asset preflight、claim audit 和 dataset eval。

## Decision 086：Gold Review Report 分歧明细必须可回放

### 决定

`student_learning_material_gold_label_review_report.v0.1` 不能只校验 reviewer 数、分歧数量、一致率和 readiness。只要提供 final gold package，校验器必须从同一 package 重算 `disagreements` 的 field、message 和 reviewer value hash 列表；手工改写 disagreement 明细、hash 或字段名时，standalone review report 校验和 asset preflight 都必须失败。

### 原因

人工双标一致性报告是判断 human gold 质量的审计证据。如果报告只保留正确的分歧数量，但分歧行可以被替换，团队就无法追踪标注员到底在哪些字段分歧，也难以判断仲裁是否覆盖了真实争议来源。这会削弱 99% claim 所依赖的可回放 human-gold 链路。

### 影响

后续生成、复验、case readiness 和 asset preflight 都应把 gold review report 当成由 final gold package 派生的可回放 artifact，而不是可手工编辑的统计摘要。该决策不证明人工标注值正确或 99% 达成；正式 claim 仍依赖真实脱敏 Provider 输出、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 087：Human Gold Side Input 必须由同题白名单声明

### 决定

`student_learning_material_gold_label_package.v0.1` 在 source-packet 校验模式下引用 `side_input.*` 答案或评分点时，必须同时提供由 `XUEMAI_ANSWER_KEYS` 或 `XUEMAI_RUBRICS` 生成的同题白名单。没有 `question_id -> side_input ref` 映射时，`side_input.*` 不能作为 reviewer evidence basis 或 final gold package 的可硬判依据。

### 原因

外部答案和评分点可以补足 OCR/Vision packet 内缺失的标准答案，但它们不是图片内证据。如果只允许 `side_input.*` 前缀通过，而不要求同题映射文件，就可能让 q001 的 gold basis 引用未声明、跨题或手工拼写的外部答案，削弱 99% claim 所需的可回放 human-gold 链路。

### 影响

后续 annotation import、standalone gold validation、case readiness、asset preflight 和 gold review report 生成都应使用同一份 side-input question map。真实样本采集时，如果需要外部答案或评分点，必须把 answer key / rubric artifact 放进 case package，并与 VisionEvidencePacket 中的 `question_id` 对齐后再生成 final gold。该决策不证明外部答案正确或 99% 达成；正式 claim 仍依赖真实脱敏 Provider 输出、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 088：Case Package 不得携带原始学生材料文件

### 决定

真实样本 case package 只能组织脱敏后的结构化 artifact 路径和可回放校验产物，不能保存原始学生材料文件。`inspect:k12-eval-case-package` 必须在隐私边界阶段递归拦截嵌套 raw/source-material 目录，以及 `.jpg`、`.png`、`.pdf`、`.heic`、`.webp` 等疑似原始图片或试卷文件；发现后下一步必须是 `fix_privacy_boundary`，不能继续推荐 Provider、human gold、analysis、monthly、delivery 或 asset preflight 命令。

### 原因

case package 会被反复传递、验证和可能纳入工程目录。若原始学生照片、PDF 或扫描件混入其中，即使后续 gold JSON 已脱敏，也会产生隐私泄露和误提交风险。99% 证据链需要保留可回放来源，但来源应通过受控私有存储或 Provider 输出引用，而不是把原始学生材料复制到评测包里。

### 影响

后续真实样本采集应把原始材料留在受控存储中，只把脱敏 Provider adapter input、VisionEvidencePacket、redacted annotation task、annotation import、final gold package、monthly input/output 和 teacher delivery artifact 放进 case package。该决策不证明脱敏质量或 99% 已达成；正式 claim 仍依赖真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 089：Case Package 内部路径必须同源

### 决定

真实样本 `case-package.json` 内部的 `artifact_paths` 与 `evaluation_asset_case` 必须保持一致。`inspect:k12-eval-case-package` 必须先校验这两组路径映射；如果同一个 artifact key 在命令路径和正式 asset-manifest 入口中指向不同文件，下一步必须是 `fix_artifact_validation`，不能继续推荐 Provider、human gold、analysis、monthly、delivery、teacher review、asset preflight 或 dataset 命令。

### 原因

case package 同时承担采集命令清单和正式评测入口的组织作用。如果 `artifact_paths` 与 `evaluation_asset_case` 发生手工漂移，采集人员可能按一组路径生成 VisionEvidencePacket、monthly input 或 teacher review packet，而 `evaluation-assets.cases.json` 和后续 manifest 又引用另一组文件。这会破坏 99% claim 所依赖的同源、可回放证据链。

### 影响

后续所有真实样本包必须把 OCR/Vision、human gold、analysis/result、monthly、delivery 和 teacher-review artifact 路径维护为单一来源。路径漂移应在 readiness 阶段修复，而不是等到 asset preflight 或 dataset eval 失败后再定位。该决策不证明 artifact 内容正确或 99% 达成；正式 claim 仍依赖真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 090：Case Package 命令序列必须由 Artifact Paths 派生

### 决定

真实样本 `case-package.json.command_sequence` 不能作为可自由手工编辑的事实来源。readiness 必须使用当前 `artifact_paths` 重新生成标准命令序列，并校验 step 顺序、命令字符串、required inputs、outputs 和 purpose；任何漂移都必须返回 `fix_artifact_validation`，不能继续推荐 Provider、human gold、analysis、monthly、delivery、teacher review、asset preflight 或 dataset 命令。

### 原因

case package readiness 会根据 command sequence 告诉采集人员下一步该运行什么。如果命令序列被手工改坏，即使 artifact paths 与 evaluation asset case 仍一致，真实样本也可能被写到错误文件，或跳过月报、老师复核、asset manifest 等关键步骤。这会破坏 OCR/Vision、human gold、月报纵向比较和老师交付链路的可回放性。

### 影响

后续真实样本包的命令序列应由生成器重新生成，而不是人工维护。若需要调整流程，必须修改 `buildCommandSequence` 和对应验证/测试，而不是直接改某个 case package JSON。该决策不证明任何命令执行成功或 99% 达成；正式 claim 仍依赖真实脱敏样本、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 human-labeled dataset eval。

## Decision 091：Case Package Readiness 必须有正向全链路回放

### 决定

case package readiness 不只需要负向 drift / invalid artifact 测试，也必须保留一条正向全链路 replay fixture。该 fixture 应在 package 标准路径下补齐 external Provider input、VisionEvidencePacket、Provider trial report、question-segmentation review、redacted annotation task、annotation import、final gold package、gold review report、analysis/result、monthly input/output、delivery bundle 和 teacher review packet；所有这些 artifact 验证通过后，readiness 的下一步必须推进到正式 evaluation asset manifest generation，同时仍保持 `claimable99_from_case_package=false`。

### 原因

大量局部 gate 可以证明坏 artifact 会被拦住，但不能证明整条真实样本准备链路能被串起来。如果没有正向全链路 replay，后续很容易出现“每个单点 validator 都有测试，但组合后卡在月报、交付、老师复核或 asset manifest 前”的问题。正向 replay 能让 OCR/Vision、human gold、月报纵向比较和老师交付 artifact 的组合边界持续可见。

### 影响

后续修改 case package、artifact bundle、monthly report、delivery bundle、teacher review packet 或 asset manifest 入口时，都应确保这条正向 replay 仍能通过。该决策不证明真实样本识别准确率或 99% claim 达成；它只证明链路可回放。正式 claim 仍依赖真实脱敏 human-labeled dataset、Provider trial、题目切分 QA、双标/仲裁、asset preflight、claim audit 和 `eval:k12-material`。

## Decision 092：Case Package Readiness 必须回放正式 Asset Preflight 阻断

### 决定

当 case package 已经生成 `evaluation-assets.json` 后，readiness 不能只停留在“asset manifest 已存在”。它必须读取同一份 manifest 的 `validate:k12-eval-assets` 预检结果，将 `evaluation_asset_manifest` 命令标记为 complete，并在 `claimable99AssetReady=false` 时返回 `fix_asset_preflight`，同时把 mock/synthetic source、样本覆盖、题目覆盖、学科/学段/地区教材覆盖、Provider trace/source URL 等 blocker 带回采集视图。`claimable99_from_case_package` 必须继续固定为 false。

### 原因

真实样本采集人员需要在 case package 视图里看到正式 asset preflight 的下一步阻断，而不是只知道 manifest 文件已经生成。若 readiness 不回放这些 blockers，团队容易误以为 full-chain artifact 已经足够接近 99% claim，或者需要跳到 dataset eval 才发现 mock source、覆盖不足、Provider trace 缺口等问题。

### 影响

后续调整 `generate:k12-eval-assets-manifest`、`validate:k12-eval-assets`、case package readiness 或 claim audit 时，都应保持 manifest 后置回放测试通过。该决策只保证 asset preflight 阻断能被采集视图持续暴露，不证明真实样本质量、模型正确率或 99% claim 达成；正式 claim 仍依赖真实脱敏 human-labeled dataset、claim-ready asset preflight、claim audit 和 `eval:k12-material`。

## Decision 093：Generated Dataset 必须保留 Asset Preflight 到 Claim Audit 的阻断链

### 决定

正式 `eval:k12-material` dataset 应由 `generate:k12-eval-dataset` 从 asset manifest 生成，并保留同批 `validate:k12-eval-assets` 的 `asset_preflight` 结果和 per-case artifact provenance。若 `claimable99AssetReady=false`，这些 blockers 必须进入 `audit:k12-eval-claim`，并被转换成 artifact-focused gaps / next sample targets，例如替换 mock/synthetic Vision source、补齐 external Provider input、Provider trial report、monthly comparison evidence、teacher review packet 等。

### 原因

dataset 是评测输入，不应成为手写指标和手写 claim 状态的容器。如果 asset preflight blockers 在 manifest -> dataset 过程中丢失，后续 eval 或 audit 可能只看到 gold/analysis 指标，而看不到 OCR/Vision、human-gold、月报纵向比较、老师复核包、样本覆盖等证据链缺口。这会让 99% claim 重新变成不可审计的指标口号。

### 影响

后续新增 dataset 生成选项、claim audit gap、model/provider regression 或 case package 输出时，都必须保持 manifest -> dataset -> audit 的 blocker 传递测试。该决策不证明 blockers 已解决或 99% 达成；正式 claim 仍要求真实脱敏 human-labeled assets 达到 `claimable99AssetReady=true`，claim audit 无阻断，并由 `eval:k12-material` 输出 `claimable99Correctness=yes`。

## Decision 094：Claim Audit 之后必须转成真实样本采集计划，而不是口头 TODO

### 决定

`audit:k12-eval-claim` 输出的 `next_sample_targets` 可以进一步生成 `student_learning_material_evaluation_sample_plan.v0.1`。采集计划应为每个 coverage 或 artifact blocker 给出建议 case 数、caseId 前缀、case package 目录模板、起步命令、后续 readiness 命令、采集要求和 artifact focus notes。采集计划必须声明自己不是 correctness evidence，不能替代真实脱敏样本、asset preflight、claim audit 或 `eval:k12-material`。

### 原因

claim audit 已能说明 99% claim 缺哪些覆盖和 artifact，但如果它只停在文本 target 列表，真实样本采集仍容易靠人工记忆执行，遗漏月报上月证据、老师复核包、Provider role coverage 或 mock/source replacement 等关键事项。把 audit 转成 batch plan，可以让下一批真实样本从同一个证据链起步，同时保持“不宣称已达成”的边界。

### 影响

后续真实样本采集应先运行 claim audit，再用 sample plan 生成下一批 case package 起步命令。计划可以帮助组织采集，但不能生成或证明样本本身；正式 99% claim 仍只接受真实脱敏 human-labeled asset manifest 通过 `claimable99AssetReady=true`、claim audit 无 blocker，并由 `eval:k12-material` 输出 `claimable99Correctness=yes`。

## Decision 095：Sample Plan 可以批量生成 Case Package，但只能是 Scaffold

### 决定

`student_learning_material_evaluation_sample_plan.v0.1` 可以用于批量生成真实样本 case package 骨架。生成器必须复用标准 case package 结构，保留 OCR/Vision、Provider trial、题目切分 QA、annotation import、final gold、gold review、analysis/result、monthly input/output、delivery bundle 和 teacher review packet 路径，并保留隐私边界。生成的 package 只能是 scaffold，不能包含原始学生图片/PDF，也不能作为 human gold、asset readiness 或 99% correctness evidence。

### 原因

claim audit 和 sample plan 能告诉团队下一批样本要补哪些覆盖，但如果每个 package 仍靠人工逐个创建，容易出现 case id、dataset id、artifact path、monthly/teacher-review 路径漂移。批量生成 scaffold 可以让真实样本采集从一致的路径和命令序列开始，同时不触碰真实原始材料。

### 影响

后续采集批次可以先用 `generate:k12-eval-sample-packages` 建立目录和 JSON 骨架，再逐个补入脱敏 Provider adapter input、VisionEvidencePacket、人工标注、月报和交付 artifact。任何 package 在 readiness、asset preflight、claim audit 和 dataset eval 通过前都不能支撑 99% claim。

## Decision 096：PRD V5.0 成为当前唯一完整产品基线

### 决定

自 2026-08-06 起，产品需求冲突按 `AGENTS.md` > `docs/PRD.md` > 专项文档 > 历史页面 PRD 和竞品还原文档处理。当前基线升级为 V5.0.0，只描述产品形态；核心闭环为聊天记录与学生材料、结果卡片、微信家长反馈、老师确认入档、学生时间线和月报复用，家长消息、跟进、新生测评与机构协作按产品阶段进入。

### 原因

仓库内并存多代定位、页面结构和开发任务，旧文档包含备课、续费、原生 App、传统教务后台和较重多 Agent 叙事，与现行产品护栏和学生学习材料分析主线冲突。若没有唯一基线，后续实现会持续把历史研究范围误当成当前需求。

### 影响

后续产品需求、页面设计和验收先读取 `docs/PRD.md`。历史页面 PRD 和竞品材料只作研究参考，不自动进入当前版本范围。任何超出 V5.0.0 的扩展必须先更新产品范围和 PRD。

## Decision 097：理想终局 PRD 与当前实施基线永久分离

### 决定

`docs/PRD_理想版.md` 用于描述学脉理想终局，可包含移动端、微信家长服务、机构协作、课程服务、商业化和招生到续费的连续主线；`docs/PRD.md` 继续作为当前唯一产品与验收基线。愿景能力不能因为出现在理想版中就直接进入当前版本。

### 原因

团队既需要足够完整的长期产品叙事来指导架构预留、融资沟通和阶段选择，也需要防止“大饼”反向污染 MVP 范围。将两份文档分开，能同时保留理想方向与当前执行纪律。

### 影响

任何愿景能力进入当前版本前，必须经过真实用户或业务证据验证，并重新冻结目标用户、页面、流程、功能和验收范围。理想版同样只保留个人版和机构版，不包含工作室版、团队版、集团版和多层组织治理。

## Decision 101：主 PRD 永久使用纯产品表达

### 决定

`docs/PRD.md` 和 `docs/PRD_理想版.md` 只描述用户、场景、价值、版本、页面、流程、功能、状态、指标、商业模式和范围边界。实现内容不进入主 PRD，除非用户明确要求另写专项方案。

### 原因

主 PRD 的作用是让客户、产品、设计和业务人员快速理解学脉长什么样、解决什么问题、用户如何使用以及哪些能力不做。混入实现内容会遮蔽真实产品判断，使讨论从客户价值偏移到实现细节。

### 影响

后续修改主 PRD 时先检查产品形态是否清楚，再检查功能和页面是否对应。微信直连统一表达为“家长消息进入学脉—归到学生—AI 辅助整理—老师确认回复—形成记录与跟进”，不在主 PRD 展开接入方式。

## Decision 102：总览负责发现与进入处理，批量负责提效但不取消个体责任

### 决定

个人版和机构版都提供总览视图；机构版另提供更完整的整体服务视图。总览中的数字、趋势和异常必须能进入具体对象或待处理清单。批量管理作为独立页面，支持学生、班级、负责人、服务状态、反馈/月报草稿、普通跟进和交接等高频操作。

### 原因

学生和成员数量增加后，逐个处理会让老师和机构重新回到表格与重复操作；但如果批量能力直接跳过个体检查，会破坏学脉强调的学生差异、老师确认和家长沟通责任。总览与批量必须同时解决“看得见全局”和“能高效处理”，又不把个体服务压平。

### 影响

后续页面设计中，总览优先展示异常和下一步，不做装饰性大屏。批量操作前展示影响范围，完成后展示逐项明细；个性化结果独立保存，批量生成不等于批量确认，未检查反馈不得直接批量发送，长期档案和高风险家长沟通继续逐项处理。

## Decision 098：全流程数据打通不等于全模块自研

### 决定

学脉以学生及其家长、课程、课堂、学习材料、反馈、档案、沟通、跟进和服务状态为核心数据主线。产品必须自建这些决定教学服务连续性和 AI 可信上下文的主数据、业务状态与审计事件；支付、短信/微信送达、电子签约、发票税务、硬件考勤等通用基础设施优先采用标准集成，不在产品内重复建设完整系统。

### 原因

真实痛点是信息跨招生、教学、反馈与续费环节断裂，并不是机构缺少另一套无所不包的 ERP。若把“数据打通”误解为全模块自研，会显著增加交付成本和后台复杂度，同时削弱聊天入口、Skill 执行、反馈处理和确认入档这条核心差异化链路。

### 影响

所有新增模块先判断是否产生核心学生服务数据或关键业务状态。属于核心数据的能力进入统一数据模型；属于通用基础设施的能力只保存必要映射、状态和回执。复杂排课、完整财务会计、工资、人事、营销自动化和集团治理不得仅因竞品存在就进入范围。

## Decision 099：家长风险只能是限时可核实事件，不能是永久人格标签

### 决定

家长沟通分析必须明确区分已知事实、待核实信息和 AI 推断。所谓高、中、低风险只能附着在一次有来源、有时间、有负责人、有截止日期和处理结果的 `CommunicationRiskEvent` 上；不能把“情绪失望型”等标签写入家长永久档案，也不能由 AI 自动发送回复、自动判定流失或自动完成沟通记录。

### 原因

竞品的场景识别、沟通策略和回复草稿能降低课程顾问认知负担，但永久标签和确定性流失判断缺少稳定证据，容易放大偏见，并把建议误当事实。真正可持续的产品价值来自实际沟通过程和结果被确认、沉淀并复用。

### 影响

家长消息 Skill 的正式输出必须包含来源、核实缺口、策略、可编辑草稿和跟进建议。只有老师或课程顾问确认实际回复内容、渠道、时间和结果后，系统才更新沟通与跟进状态；未确认的 AI 内容保持草稿，不得进入正式学生或家长档案。

## Decision 100：微信可直连，但发送权仍属于老师

### 决定

学脉允许通过官方或已确认合规的授权渠道直接接收和发送微信消息。入站消息先完成渠道验签、去重和家长—学生身份绑定；出站消息必须展示接收人、渠道和最终版本，并由有权限的老师或机构成员主动确认。渠道成功回执或用户手工标记已发才能更新正式沟通状态。AI 不得静默自动发送，也不得通过个人号 Hook、模拟登录、模拟点击或账号托管实现接管。

### 原因

仅生成微信文案仍要求老师在系统和微信之间搬运消息，无法形成完整沟通上下文和可信发送结果；而完全自动外发会把 AI 草稿直接变成机构行为，并引入错绑家长、重复发送、权限越界和平台合规风险。授权直连加人工确认兼顾了闭环效率与责任边界。

### 影响

微信连接器必须具备授权 Scope、令牌加密、Webhook 验签、防重放、渠道消息 ID 去重、联系人认领、发送幂等、结果未知防重发、权限审计和解绑停用能力。未授权、授权失效或渠道不可用时，反馈仍可复制并由用户手工标记已发。任何首个连接器开发前必须单独确认账号主体资质、允许的消息类型、发送窗口、联系人稳定标识和可获得的回执。

## Decision 103：完整功能结构按学生服务主线组织，不按竞品模块数量扩张

### 决定

学脉完整功能结构统一按“咨询/测评—正式服务—课堂与材料—分析与反馈—确认入档—报告与沟通—服务跟进与续费准备”的学生主线组织。产品保持工作台、会话、学生、班级和管理五个一级入口，完整能力拆分为 F01—F20，并通过 P0、P1、P2 控制进入顺序。个人版和机构版共用教学服务核心，机构版只增加成员、角色、分配、交接、机构范围工作台和权限范围内的批量操作。

### 原因

竞品展示了学生管理、续费、报告、考勤和经营看板等大量模块，但功能数量不能证明真实价值。学脉的差异化来自同一学生记录在教学、家长反馈、长期档案和机构协作中的连续复用，而不是复制一套教务 ERP。按学生服务主线组织能够补齐全流程，同时避免聊天入口和可信反馈闭环被后台功能淹没。

### 影响

后续功能讨论先对照 `docs/产品功能结构.md` 判断所属模块、页面、版本和优先级。服务周期、课次、出勤和外部经营信息只作为学生服务背景与提醒依据；复杂排课、完整财务、人事工资、自动营销、学生任务中心和无依据 AI 评分不进入当前产品范围。完整功能总图不能直接替代每一期冻结后的开发范围。

## Decision 104：学脉以六类本体和五个主页面构成产品形态

### 决定

学脉以学生、关系、事件、证据、结论产物和责任承诺六类对象作为稳定产品本体。状态由关系、事件和未完成责任得出；来源说明事实从哪里来；总览、月报、报告、续费准备和批量操作均为对同一批对象的视图或操作方式。产品一级形态固定为工作台、会话、学生、班级和管理五个主页面。

### 原因

按竞品功能名称设计会反复创建新生、在读、月报、续费和家长沟通等平行数据孤岛。同一学生、课堂和材料会被多次复制，页面状态最终互相冲突。本体先行可以让一次真实事件同时服务会话、反馈、档案、报告和机构协作，并明确 AI 草稿、老师确认结果和家长实际收到内容的不同性质。

### 影响

总览和待处理合并进入工作台；批量管理不再是独立一级业务入口，而是学生、班级、工作台清单和管理页的多选模式；新生、测评、月报和续费属于学生生命周期的阶段、事件或产物；数据接入只把外部事实归到既有学生、关系和事件。任何新页面都必须说明它观察或操作的是哪类本体，不能仅因竞品存在而新建模块。
