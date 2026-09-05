# 学脉 AI Skill Spec

本文件定义当前 MVP 的 Skill 规范。完整版本以 `docs/PRD.md` 第 8、9、12、13、17 章为准。

## Skill 定义

每个 Skill 必须定义：

- `skill_id`
- 名称
- 适用对象：学生 / 班级 / 老师工作台
- 触发方式：胶囊 / 自然语言 / 系统待办
- 所需输入
- 自动读取的上下文
- 执行步骤
- 输出 Schema
- UI 展示卡片
- 老师操作按钮
- 入档目标
- 下一步推荐
- 风险检查规则
- 日志记录要求

## Skill Runner

Skill 不是普通按钮。胶囊或自然语言识别到的任务，必须进入统一 Runner，形成可追踪的 `SkillRun`。

当前最小 Runner 只做 mock 执行：

- `createSkillRun` 创建运行对象。
- `runSkillMock` 生成 mock 草稿，不调用真实 AI。
- `transitionSkillRun` 管理复制、已发送、确认入档等状态流转。
- `toSkillCardViewModel` 把正式输出转换成 SkillCard 展示模型。

当前阶段 Runner 不接 Supabase、不接真实 AI、不接 MCP，也不做复杂 Agent 编排。

前台 SkillCard 的正式操作也必须经过 Runner 状态流转校验。UI 可以保留兼容状态名，但复制、标记已发、确认入档、重新生成等动作不应绕开 `transitionSkillRun` 单独判断。

不改变主状态的按钮也必须形成 Runner 事件，例如加入月报素材、生成针对练习、仅保存备注、生成下一步 Skill 等。这类动作不应自动入档，也不应伪造新的长期事实，只追加可追踪的 `SkillRunEvent`。

右侧审核详情应把 `SkillRunEvent` 转成老师可读的操作轨迹，例如已复制微信反馈、已标记发给家长、已加入月报素材、已生成针对练习。该轨迹用于回看按钮操作，不替代正式入档记录。

## SkillCard 边界

所有正式 AI 输出必须转成 SkillCard。业务页面不应直接消费裸 prompt 输出或模型原文。

SkillCard 至少包含：

- Skill 类型
- 标题
- 状态
- 输入摘要
- 参考上下文
- 可信度
- 结构化结果
- 可展示正文
- 操作按钮
- 入档目标
- 下一步建议

## SkillCard 版本链

SkillCard 必须保留 AI 原稿与老师编辑版的边界：

- `original_output`：AI 原始草稿，不允许被老师编辑污染。
- `current_output`：老师当前编辑版。
- `archived_output`：老师确认入档后的最终版本。
- `edit_events`：老师编辑事件列表。

每次老师编辑正文或结构化字段，都需要记录一条 `edit_event`，至少包含：

- `id`
- `skill_run_id`
- `field_path`
- `before`
- `after`
- `edited_at`
- `edited_by = teacher`
- `source = manual_edit`

当前阶段这些字段只在 mock 内核中维护，不写数据库。

## 本地持久化契约

当前 mock 工作台使用 `schema_version = 2` 的 localStorage 载荷保存可回放状态。载荷同时保留 `chat_state` 和规范化投影：

- `skill_runs`：Skill 运行摘要和状态。
- `skill_cards`：卡片当前版、原稿、入档版和展示状态。
- `skill_card_events`：复制、标记发送、加入月报素材、生成练习、保存备注等按钮事件。
- `skill_card_edits`：老师编辑字段事件。
- `timeline_records`：老师确认后的本地时间线。

这只是前端 mock 回放契约，不代表真实数据库写入。后续接 Supabase 时，应以该结构映射到正式表或兼容层。

E5 的 Supabase 兼容策略是：用 `skill_runs`、`skill_cards`、`skill_card_events`、`skill_card_edits`、`skill_archive_logs` 承接前台 Skill Shell；继续保留 `agent_runs` / `agent_outputs` 作为后端 AI 执行与草稿边界。adapter 只生成 upsert plan，不直接写库。

E6 提供 `POST /api/skills/persistence` dry-run 入口，用于校验 E4 payload 并预览 Supabase rows。该接口必须从 Supabase Auth session 派生老师身份。

E8 增加受控真实写入路径，但默认关闭：只有服务端显式设置 `SKILL_PERSISTENCE_WRITE_ENABLED=true`，并且 migration / RLS / ownership 边界已人工确认后，`dryRun=false` 才允许把 Skill Shell rows upsert 到 Supabase。业务 UI 不应直接绕过该 API 写库。

## 通用学习证据分析报告 Schema

`analyze_learning_evidence` 必须保持全学科通用。SkillCard 只展示摘要，完整报告放在 `structured_result.report`，当前 mock schema version 为 `learning_evidence_report_v1`。

摘要兼容字段仍保留：

- `material_type`
- `subject`
- `learning_goal`
- `observed_performance`
- `strengths`
- `weaknesses`
- `evidence_points`
- `error_or_gap_patterns`
- `next_steps`
- `teacher_review_notes`
- `parent_summary`
- `confidence_level`
- `subject_specific_notes`
- `first_priority_action`
- `report`

完整报告必须包含：

1. `material_overview`：材料类型、学科领域、输入摘要。
2. `overview_judgement`：当前表现、主要优势、主要问题、第一优先动作、可信度。
3. `data_validation`：可用证据、缺失上下文、可靠性说明。
4. `improvement_path_map`：可提升点、瓶颈、下一突破口。
5. `ability_profile`：任务理解、核心知识/概念、方法过程、表达呈现、迁移应用、自我检查。
6. `problem_pattern_clusters`：问题模式聚类、证据、可能原因、干预方式。
7. `key_evidence_cards`：关键证据卡。
8. `priority_queue`：提升优先队列。
9. `recurrence_risks`：复发风险、触发场景、预警信号、防控动作。
10. `short_cycle_plan`：3 天、7 天、下 3 次课计划。
11. `next_learning_checklist`：下次学习执行清单。
12. `collaboration_actions`：学生、老师、家长协同行动。
13. `parent_readable_summary`：家长可读总结。
14. `student_profile_update_suggestions`：建议写入学生档案的能力画像、薄弱点、复发风险、行动计划、月报素材。

该 Skill 可以处理试卷、作业、作文、阅读材料、课堂记录、口语练习、实验报告、艺术/音乐/项目制作品等老师提供的学习材料。

不要把数学试卷专属字段作为核心字段，例如 `score_rate`、`recoverable_score`、`wrong_questions`、`exam_total_score`、`math_knowledge_points`。如果某学科确实需要细节，应放在 `subject_specific_notes` 或后续学科 adapter 中。

当前 mock UI 中，聊天流 SkillCard 只显示学习证据分析摘要；老师点击“查看报告”后，右侧审核栏展示完整报告。报告底部的学生档案更新建议支持老师勾选；只有点击确认入档后，所选项才会进入本地 `TimelineRecord.profileUpdates`，并反映到右侧学生档案更新区。

已确认的 `profileUpdates` 会被投影到学生侧栏：能力画像、薄弱点、复发风险、跟进计划和月报素材分开展示；“最近入档”支持按学习记录、分析报告、家长反馈、月报素材筛选。这些仍是 mock 档案视图，不代表真实数据库写入。

后端 `StudentLearningMaterialAnalysis` 合同必须承接同一目标，不能只返回短摘要。正式分析输出还必须包含：

- `material_classification`：识别材料类型、科目、学段、年级候选、地区/教材线索，并附 evidenceRefs。
- 中国大陆 K12 范围 gate：即使 `material_state=valid_student_material`，只要材料中明确出现大学、成人教育、职业教育/资格、考研考博、大学英语四六级、雅思/托福等非 K12 范围线索，或香港/澳门/台湾考试体系、IB/A-Level/IGCSE/AP/SAT 等非中国大陆 K12 课程线索，也必须在模型调用前降级为老师复核或阻断，不能生成学生能力分析。
- `accuracy_policy`：明确高置信题目正确率目标为 `>=99%`，证据不足时必须拒判或进入老师确认。
- `question_analyses`：逐题正误、知识点、错因、下一步动作都必须有 evidenceRefs；低置信、依据不足或关键 evidence 未绑定题内 `region_id` 的题不能输出确定性正误；题目集合和顺序必须与同一份 `VisionEvidencePacket.questions` 完全一致，不能漏题、加题、重题或乱序。
- 所有 analysis evidenceRefs 必须能解析到同一份 `VisionEvidencePacket`、显式按 `question_id` 映射的 side input，或仅用于 `monthly_comparison_seed` 的上月来源 refs；模型编造或跨 case 借用的 refs 必须在 Runner 或资产预检中失败。
- `teacher_professional_report`：给老师看的专业测评型学情报告。
- `wechat_parent_feedback_draft`：给家长的微信反馈草稿，老师确认前不能 ready_to_send。
- `monthly_report_snapshot` 和 `monthly_comparison_seed`：沉淀月报素材，并支持本月与上月纵向比较；老师确认前 `teacher_confirmed = false`。`previous_month_snapshot` 只有在存在可追溯上月已确认素材/报告来源时才能出现，并且必须带上月来源 `evidenceRefs`。
- `model_contract`：固定输入输出合同，允许 Vision/OCR Provider 和文本推理模型后续替换。

业务 UI 或 API 不应直接展示裸 `StudentLearningMaterialAnalysis`。面向老师/家长的最终结果应先经过 `src/skills/student-learning-material-analyzer/user-facing-result.ts` 装配为：

- `material_classification`：老师/UI 可直接展示的材料类型、科目、学段、年级候选、地区/教材线索和置信度，只保留 `S1/S2/...` 来源标签，不暴露内部 `evidenceRefs`。
- `teacher_report`：专业测评型老师报告，含材料概览、数据可信度、证据充分性判定、逐题分析、知识薄弱点、能力维度、错误模式、优先关注点、月报素材说明和家长反馈草稿。
- `parent_feedback`：家长反馈评语，包含是否可复制、风险提示和来源标签。
- `monthly_result`：本月月报素材摘要和与上月的纵向比较说明；缺少上月确认素材或上月来源 `evidenceRefs` 时必须提示证据不足，不能写成明确进步或退步。该对象还必须携带结构化 `previous_month_evidence_status` 和 `previous_month_source_ids`，让 delivery bundle / teacher review packet 用证据状态判断是否有可比上月，而不是从中文文案推断。正式 `student_monthly_report_v1` artifact 还必须带 `comparison_evidence`，记录本月素材数、上月素材数、上月来源 ID 和是否使用上月月报，以便资产预检审计。

用户可见报告只展示 `S1/S2/...` 这类来源标签；内部 `evidenceRefs` 只保留在 `source_map` 供“查看来源”和审计使用，不直接暴露给老师或家长。

前台分析详情页应优先读取 `structured_result.user_facing_result`。旧版 `structured_result.report` 只作为 mock/历史卡片兼容兜底，不应再作为新链路的主要展示合同。

文本推理模型必须通过 `src/skills/student-learning-material-analyzer/model.ts` 的 `createLearningMaterialAnalysisModel(...)` 进入。该适配器走 `src/agents/shared/model/` 的 OpenAI-compatible provider-agnostic 层，当前 DeepSeek 工厂仅作为兼容别名保留。无论后续接 DeepSeek、OpenAI 还是其他兼容模型，输出都必须是合法 JSON，并通过同一套 `StudentLearningMaterialAnalysis` 校验、证据覆盖检查、微信反馈安全检查和 dataset evaluation。

`monthly_report_snapshot` 是分析草稿中的候选素材，不等于月报正式来源。老师确认入档后，系统才可以生成一份带 `teacher_confirmed=true`、`confirmed_at`、`source_skill_run_id` / `archive_record_id` 的确认快照副本，供 `monthly_report` 聚合；未确认快照必须被过滤。

`analyze_learning_evidence` 的 99% 验收不能依赖合成样例。工程上必须区分：

- synthetic fixture：只用于冒烟测试和回归形状，不允许支撑 99% 正确率宣称。
- public benchmark/source dataset：例如 K12Vista、CMMaTH、CMM-Math、E-EVAL、EduEval、K12-Bench、K12-KGraph、OCRBench、Math23K、MWPToolkit，只能作为覆盖参考、taxonomy 设计或公开对照评测，不允许冒充真实脱敏学生材料 gold。
- human_labeled dataset：真实脱敏材料，至少包含人工 gold 标注、双人标注、分歧仲裁和覆盖统计。

Label Studio、CVAT 或其他标注工具可以作为 human gold dataset 的上游工作台，但工具导出不能直接作为验收 gold。所有标注结果必须先归一化为 `student_learning_material_gold_label_annotation_import.v0.1`，再转换为 `student_learning_material_gold_label_package.v0.1`，并与 `VisionEvidencePacket` 的题号、证据引用、bbox/polygon/crop_ref 和 side input answer/rubric refs 对齐后再进入评测。只要转换出的 final gold package 存在 source-aware validation error，例如跨题 evidence ref、证据槽位类型错误或仲裁硬判缺少 reviewer basis，annotation import conversion 就必须失败，不能把 `validation.ok=false` 的包当作成功产物继续流转。资产预检阶段若提供 `annotation_import_path`，必须用同一份 `VisionEvidencePacket` 和题目切分 QA 重建完整 final gold provenance，包括 reviewer labels、reviewer metadata、逐题 question evidence basis、`adjudicated_gold` 和 adjudicator metadata；只重建仲裁结果一致不够。缺仲裁的 annotation draft 可以在显式 debug 模式下写盘，但必须标记 `claimable99Correctness=false`，不能进入 99% 验收链路。

模型、OCR/Vision Provider、Prompt 或 Schema 变化前后，都必须用同一批 human-labeled dataset 跑批量评测。baseline/candidate 不仅 case id 集合要一致，每个 case 的 human-gold 内容也必须完全一致，不能为了让候选通过而替换 gold 标签。默认产品级验收门槛是至少 100 份材料、500 道人工标注题，并且任一单个 case 失败都不能被其他简单 case 平均掉。

本地评测入口：

- `src/skills/student-learning-material-analyzer/evaluation.ts`：逐 case、批量和 dataset 级指标计算。
- `src/skills/student-learning-material-analyzer/evaluation-files.ts`：从 JSON 文本或文件加载 dataset，并输出可读评测报告。
- `src/skills/student-learning-material-analyzer/gold-labeling.ts`：校验人工 gold 标注包，要求双人标注、分歧仲裁、脱敏和逐题证据依据；当提供同源 `VisionEvidencePacket` 时，还会校验包身份、gold 题目集合/顺序、question evidence basis 覆盖/顺序和同题 evidence refs。
- `src/skills/student-learning-material-analyzer/evaluation-asset-manifest-files.ts`：从 case 资产路径列表生成可回放评测资产清单，并立即预检。
- `src/skills/student-learning-material-analyzer/vision-provider-trial-report-files.ts`：从 `VisionEvidencePacket` 生成不含原始 OCR 文本、normalized text 或复制 OCR/text 内容的 Provider 试跑报告，汇总 Provider 候选、gate、题目切分、逐题 readiness、阻断项、warning 和下一步，用于真实 OCR/Vision 输出进入人工标注前的预检；校验时会用同一份证据包重算 packet-derived trial report，拒绝把缺证据、需复核或 blocked 的报告手工改成 `ready_for_human_labeling`。
- `src/skills/student-learning-material-analyzer/vision-provider-regression.ts`：比较同一材料的 baseline/candidate Provider 试跑报告，在文本推理和 human gold 标注前拦截 OCR/Vision Provider 造成的题目丢失、crop_ref 缺失、题目切分退步、逐题 readiness 退步或置信度下降。
- `src/skills/student-learning-material-analyzer/question-segmentation-review-files.ts`：从 VisionEvidencePacket 生成脱敏题目切分 QA artifact，检查题目、页码、区域、几何/crop_ref、证据归属和复核清单；同题 evidence 若没有绑定题内 `region_id`，该题必须进入老师复核，不能作为稳定切分通过。同一份证据包参与校验时，validator 会重算 packet-derived segmentation review，拒绝 question order、status、issues、crop_ref 或 definitive readiness 被手工改成稳定通过的 review，自由文本也不能复制 OCR/text 内容。
- `src/skills/student-learning-material-analyzer/evaluation-case-package-files.ts`：为真实脱敏样本生成 case package scaffold，包括固定 artifact 路径、annotation import 路径、monthly report input/output 路径、teacher review packet 路径、命令序列、99% readiness checklist、`evaluation-assets.cases.json` 和 helper-only `provider/external-vision-input.template.json` 映射模板；模板会提示采集链路保留 OCR/文档解析、layout 和 formula Provider 候选角色覆盖，但该 scaffold 不复制原始学生图片或原始学习材料，template 不能作为正式 Provider input 或 99% claim 证据。
- `src/skills/student-learning-material-analyzer/validators.ts`：在进入文本推理前校验 `VisionEvidencePacket` 的页面、题目、区域、证据、gate 和 pipeline trace 引用一致性；重复 evidence ref、孤儿 question/page/region 引用、证据 region_id 属于另一题、gate 指向不存在证据或 trace output 指向不存在对象都会阻断；模型输出后的 `StudentLearningMaterialAnalysis` evidenceRefs 还必须解析到同一证据包、允许的逐题 side input，或月报上月比较来源；`question_analyses` 还必须与同一证据包的题目集合和顺序一致。关键 evidence 缺少 `region_id` 不一定使 VisionEvidencePacket 结构失败，但会使逐题 readiness 和题目切分 QA 降级为老师复核。
- `src/skills/student-learning-material-analyzer/vision-adapter.ts`：把外部 OCR/Layout/Vision Provider 输出归一化为 `VisionEvidencePacket`，并在生成前运行 `validateExternalVisionAdapterInput`；缺 provider/model/material/student 元数据、空 page/question、重复 ID、非法 confidence、helper template 占位符、非法 bbox/polygon、跨题 evidence、证据 region_id 属于另一题或孤儿 page/region 引用时先拒绝写入。
- `src/skills/student-learning-material-analyzer/evaluation-artifact-bundle-files.ts`：从资产清单批量生成 Provider 试跑报告、题目切分 QA、脱敏标注任务包、人工双标一致性报告、老师报告/家长反馈 result artifact、老师交付包 artifact 和老师复核包 artifact，并可在显式老师确认元数据存在时生成月报 artifact；该命令不调用实时模型。Provider 试跑、题目切分 QA、脱敏标注任务包和人工双标一致性报告可在 `analysis_path` 不存在时先生成；老师报告/家长反馈 result、月报 input 生成、以及没有现成 result 的交付包才要求 analysis artifact。
- `src/skills/student-learning-material-analyzer/evaluation-assets.ts`：在正式 dataset eval 前校验可回放资产清单，要求 external OCR/Vision adapter input、`VisionEvidencePacket`、Provider 试跑报告、题目切分 QA artifact、脱敏标注任务包、normalized annotation import、人工双标一致性报告、外部答案/评分点 side input、人工 gold 包、题号映射、逐题 evidence readiness、analysis 题目覆盖、analysis evidenceRefs 同源可解析、Provider 候选 trace、benchmark/open-source 候选、候选来源 URL、许可/部署复核备注、OCR/文档解析 + layout + formula 候选角色覆盖、用户可见结果、月报 input/output 当前月与上月 source id、老师交付包和老师复核包互相一致，并输出 `claimable99AssetReady` 与阻断原因；若同时提供 external Provider input 和 VisionEvidencePacket，预检会从 external input 重建 adapter-derived packet，并拒绝 pages、questions/regions、evidences、gates 或 pipeline stage 核心字段漂移；关键 evidence 没有题内 `region_id` 归属时，题目切分 QA 和逐题 readiness 不能支持 definitive gold 或模型硬判；资产覆盖会同时报告原始地区/教材候选、大陆区域分组、教材版本族和全国卷/新高考线索，不能只用候选数量替代代表性检查；`human_labeled` 清单若仍包含 mock/synthetic Vision source、public benchmark/source dataset 或缺少 external Provider input artifact，也会阻断 claim readiness。若提供 `annotation_import_path`，预检会用同一份 VisionEvidencePacket 和题目切分 QA 重新生成 gold package，并要求其 labels、reviewer metadata、question evidence basis、`adjudicated_gold` 和 adjudicator metadata 都与 `gold_label_package_path` 对齐。
- `src/skills/student-learning-material-analyzer/evaluation-dataset-from-assets-files.ts`：从已预检的 evaluation asset manifest 生成 `eval:k12-material` dataset，并把同批 `claimable99AssetReady`、blockers 和每个 case 的 `asset_manifest_case_id` / `gold_label_package_path` / `analysis_path` 写入 dataset，避免手工拼 dataset 时绕过资产预检或丢失 artifact provenance。
- `src/skills/student-learning-material-analyzer/evaluation-case-package-readiness-files.ts`：检查真实样本 case package 的隐私边界、artifact 存在状态、已存在 external Provider input / VisionEvidencePacket / 题目切分 QA / Provider trial report / 脱敏 annotation task / normalized annotation import / final gold package / gold label review report / analysis / user-facing result / monthly report input-output / delivery bundle / teacher review packet artifact 的同源结构校验、OCR/Vision、题目切分、human gold、月报比较、老师交付等链路组缺口、按顺序可执行的下一条命令、`evaluation-assets.json` 预检状态和 99% claim blocker；Provider 角色覆盖 checklist 不是只看 `vision_packet_path` 文件存在，而是读取同一份 `VisionEvidencePacket.pipeline_trace.provider_candidates`，确认 OCR/文档解析、layout 和 formula 候选角色都存在后才显示 present；readiness report 会输出 checklist present/missing 数量、缺失项、`providerRoleCoverageChecklist` 和 `providerTrialReadiness`，当已有有效 VisionEvidencePacket 但角色覆盖仍缺失时，下一步会变成 `complete_checklist_evidence:provider_candidate_role_coverage_document_layout_formula`，先要求补 trace 而不是继续下游 Provider trial 或 asset preflight；当已有结构有效的 Provider trial report 仍为 `blocked` 时，下一步会变成 `fix_provider_trial_readiness`，先修 OCR/Layout/Vision Provider 输出再进入标注；如果 external Provider input 与 VisionEvidencePacket 同时存在，readiness 会复用 external input -> adapter-derived packet 重建 gate，拒绝 pages、questions/regions、evidences、gates 或 pipeline 核心字段漂移；如果 annotation import 与 final gold package 同时存在，readiness 会复用完整 provenance 比较，指出 labels、reviewer metadata、question evidence basis、`adjudicated_gold` 或 adjudicator metadata 中哪一段与重建结果不一致；月报 output 校验会回看同一份 `monthly_report_input_path`，拒绝当前月 `evidence_timeline` 或上月 `comparison_evidence.previous_month_source_ids` 与输入来源不一致的手工改写。该检查只读脱敏结构化 artifact 路径，不读取或复制原始学生材料。
- `src/skills/student-learning-material-analyzer/evaluation-claim-audit-files.ts`：从 dataset 文件输出结构化 99% claim audit，拆出样本数、题目数、可硬判题、需复核题、材料类型、学科、学段、地区/教材线索、大陆区域分组、教材版本族、全国卷/新高考线索、人工标注协议和 artifact-focused 资产预检缺口，并给出下一批真实样本采集或补 artifact 目标；asset preflight 中缺 Provider OCR/文档解析、layout 或 formula 候选角色覆盖时，会映射为 `complete_provider_role_coverage` 目标。
- `src/skills/student-learning-material-analyzer/evaluation-regression.ts`：比较 baseline 与 candidate 两份同 gold dataset 的评测结果，模型、Provider、Prompt 或 Schema 切换时正式模式要求 baseline 和 candidate 都是 `claimable99Correctness=yes`，并检查 case 集合一致、同 case human-gold 内容一致、新增失败 case、指标退步，以及 candidate 是否仍能从每个 analysis 生成通过校验的用户可见 result、老师 delivery bundle 和老师 review packet。
- `src/skills/student-learning-material-analyzer/gold-label-template-files.ts`：生成人工标注草稿时可读取题目切分 QA artifact，把每题 segmentation status / issues 写入 reviewer notes。
- `src/skills/student-learning-material-analyzer/gold-label-annotation-task-files.ts`：从同一份 `VisionEvidencePacket` 和题目切分 QA artifact 生成脱敏人工标注任务包，包含 Label Studio/CVAT/manual payload hints、crop_ref、几何、证据 ref 和 annotation import skeleton，但不带原始 OCR 文本、normalized text；task questions、annotation import skeleton 和 Label Studio payload 必须与同源 VisionEvidencePacket 重建出的 packet-derived annotation task 一致。校验时会拒绝 segmentation status、review_required、definitive suggestion、issues、regions、evidence summaries、evidence basis suggestions、annotation import skeleton evidence refs/notes 或 Label Studio payload evidence_refs/crop_refs/issues/status hints 被手工改写，也不得在备注、清单、payload 等可编辑字段里复制 VisionEvidencePacket 文本片段。
- `src/skills/student-learning-material-analyzer/gold-label-annotation-import-files.ts`：把人工标注工具归一化后的 annotation import 转换成最终 gold package，并默认要求脱敏、双标、仲裁和 VisionEvidencePacket 对齐；可选读取题目切分 QA artifact，并拒绝未通过 segmentation review 的 definitive gold judgement。转换会先用同一份 VisionEvidencePacket 扫描 annotation import notes，再扫描 final gold package notes，拒绝复制 OCR/text 内容。
- `src/skills/student-learning-material-analyzer/gold-label-review-report-files.ts`：从最终 gold package 生成 `student_learning_material_gold_label_review_report.v0.1`，记录双标一致率、分歧数量、仲裁状态和 99% readiness blocker；分歧值只写哈希，不复制 reviewer values、OCR 原文或 notes；校验时会从同一 final gold package 重算分歧字段、message 和哈希列表，拒绝手工篡改的 disagreement 明细。
- `src/skills/student-learning-material-analyzer/mainland-k12-reference.ts`：保存公开检索到的中国大陆 K12 课程/评价参考，用于粗粒度学段/学科识别、能力维度提示、疑似超纲/学段不匹配风险提示，以及把地区/教材候选分桶为大陆区域、教材版本族和全国卷/新高考覆盖信号。
- `src/skills/student-learning-material-analyzer/material-classifier.ts`：在文本推理模型前提供确定性材料预分类基线，从 `VisionEvidencePacket` 识别材料类型、科目、学段、年级候选和地区/教材线索，并把 evidenceRefs 与风险提示一起传给 prompt 和降级分析；常见课时作业、周末作业、寒暑假作业、校本作业、随堂练习、晨测、堂清、限时训练、期中/期末复习卷、诊断卷、小升初和地方教材版本名也必须走该预分类器；多地区或多教材版本同时命中时必须降置信并提示老师复核，不能硬猜唯一来源；明确非 K12 或非中国大陆 K12 范围线索必须降低置信并触发 Runner/资产预检阻断。
- `src/skills/student-learning-material-analyzer/runner.ts`：在模型调用前执行材料状态、范围和证据 gate。空白模板、痕迹不足、非 K12、低质量、学生身份异常、notes-only 和 teacher-mark-only 材料必须先降级为老师复核草稿；降级输出可以保留材料分类和缺失上下文提示，但不能生成正式能力画像、确定性正误、可复制家长反馈、档案建议或月报结论。
- `src/skills/student-learning-material-analyzer/question-evidence-readiness.ts`：在文本推理模型前后提供逐题证据就绪度 gate；只有题目切分稳定、学生答案存在、同题标准答案/评分点或清晰老师批改存在且关键证据置信度达标时，才允许模型输出确定性正误。外部 `answerKeys` / `rubrics` 只有显式映射到同一 `question_id` 时，才能作为该题答案依据。
- `src/skills/student-learning-material-analyzer/output-files.ts`：从 `VisionEvidencePacket` 文件调用 provider-agnostic 文本推理模型，并把真实模型输出落盘为 `StudentLearningMaterialAnalysis` JSON，供 dataset 的 `analysis_path` 使用。
- `src/skills/student-learning-material-analyzer/user-facing-result.ts`：把通过校验的分析 JSON 装配为老师报告、家长反馈和月报结果对象，并把材料类型、科目、学段、年级候选、地区/教材线索转成来源标签化的 UI 字段；老师报告必须覆盖专业测评章节，包括证据充分性判定、学情传导图、难度层表现、学习策略、学科能力、重点错题成因、表现空间和复发风险。校验器必须确认逐题行覆盖同一份 analysis 的全部 `question_id`，不能只校验数量。
- `src/skills/student-learning-material-analyzer/result-files.ts`：把最终用户可见结果落盘为 `StudentLearningMaterialUserFacingResult` artifact；支持从已有 `analysis_path` 装配，也支持直接跑 `VisionEvidencePacket -> model -> result` 全链路；写文件前会运行 `validateStudentLearningMaterialUserFacingResult`，包括材料分类、逐题行、报告章节、家长反馈和月报比较。
- `src/skills/student-learning-material-analyzer/delivery-bundle-files.ts`：把用户可见结果进一步打包为老师交付包，包含结构化材料分类、专业测评报告、家长反馈、月报摘要/纵向比较、反馈/入档状态、安全边界和来源映射；写文件前会运行 `validateStudentLearningMaterialDeliveryBundle`，并要求交付包保留专业测评章节、逐题行与 result / analysis 的 `question_id` 集合和顺序对齐。
- `src/skills/student-learning-material-analyzer/teacher-review-packet-files.ts`：从已有 delivery bundle，或从 result/analysis/VisionEvidencePacket 先生成 delivery bundle，再生成老师复核 SkillCard / 分析详情页交接包，列出结构化材料分类、可执行动作、禁自动发微信、禁自动入档、老师确认边界、source labels 和内部 source map 隔离，并保留 `## 证据充分性判定`；写文件前会运行 `validateStudentLearningMaterialTeacherReviewPacket`，确认动作启停、复核数量、source label 和 audit source map 与同一 delivery bundle 一致。

dataset JSON 支持两种 case 形态：

```json
{ "gold": { "...": "人工标注" }, "analysis": { "...": "模型输出" } }
```

或：

```json
{ "gold_path": "gold/case-001.json", "analysis_path": "outputs/case-001.json" }
```

真实人工标注 case 也可以直接引用双标/仲裁包。正式 claimable dataset 还必须保留该 case 来自 asset manifest 的 id：

```json
{ "asset_manifest_case_id": "case-001", "gold_label_package_path": "gold/case-001-label-package.json", "analysis_path": "outputs/case-001.json" }
```

文件路径相对于 dataset JSON 所在目录解析。`gold_path` 可用于本地指标和模型回归调试，但不是 final human-gold package provenance，不能支撑 99% claim。评测报告必须显示 `claimable99Correctness`，避免把 synthetic smoke test 误当成真实正确率证明。正式可宣称 dataset 还必须带 `asset_preflight.claimable99AssetReady=true`，该字段来自同批样本先跑 `validate:k12-eval-assets` 的结果；同时每个 case 必须保留 `asset_manifest_case_id`、final `gold_label_package_path` 和 `analysis_path`。缺少这些凭证时，即使逐题指标全绿也不能输出 `claimable99Correctness=yes`。

本地命令：

```bash
XUEMAI_EVAL_CASE_PACKAGE_DIR=/absolute/path/to/case-dir XUEMAI_EVAL_CASE_ID=case-001 XUEMAI_EVAL_CASE_DATASET_ID=real-provider-pilot npm run generate:k12-eval-case-package
```

该命令用于真实脱敏样本采集前创建 case package scaffold。它会写 `case-package.json`、`evaluation-assets.cases.json` 和 helper-only `provider/external-vision-input.template.json`，约定外部 Provider 输出、VisionEvidencePacket、Provider trial report、题目切分 QA、标注任务、annotation import、final gold package、gold label review report、analysis/result、monthly-report input、monthly report、delivery bundle、teacher review packet 的路径与命令顺序；不会复制原始图片、学生作答原件或任何未脱敏材料。模板只用于把真实 PaddleOCR/PaddleX 等 Provider 输出映射到 `provider/external-vision-input.json`，并提醒后续 `VisionEvidencePacket.pipeline_trace.provider_candidates` 必须覆盖 OCR/文档解析、layout 和 formula 候选角色、来源 URL 与许可/部署复核备注；它不会进入 `evaluation_asset_case`，不能作为 99% 证据；如果把模板中的 `<...>` 或 placeholder 字段直接当正式输入使用，`validateExternalVisionAdapterInput` 必须拒绝。scaffold 本身不是 99% 证据，只有 referenced artifacts 全部补齐并通过 `validate:k12-eval-assets` 后才能进入正式 dataset eval。

```bash
XUEMAI_EVAL_CASE_PACKAGE_READINESS_DIR=/absolute/path/to/case-dir npm run inspect:k12-eval-case-package
```

该命令用于真实样本采集过程中的下一步检查。它会按 `case-package.json` 的命令序列检查最早未完成步骤，报告缺失输入、可执行命令、隐私边界错误、`evaluation-assets.json` 预检状态和 99% blocker。它还会先校验 `evaluation-assets.cases.json` 是否仍与同一个 `case-package.json` 的 `dataset_id`、`dataset_kind`、`description` 和唯一 `evaluation_asset_case` 完全一致，避免真实样本包还没生成正式 asset manifest 前就丢失 case、路径或月报/交付 artifact 入口。它必须始终把 `claimable99_from_case_package` 保持为 `false`，不能替代 `validate:k12-eval-assets` 和 `eval:k12-material`。

如果 case package 中已经存在 `evaluation_asset_cases_path`、`external_vision_input_path`、`vision_packet_path`、`question_segmentation_review_path`、`provider_trial_report_path`、`annotation_task_path`、`annotation_import_path`、`gold_label_package_path`、`gold_label_review_report_path`、`analysis_path`、`result_path`、`monthly_report_input_path`、`monthly_report_path`、`delivery_bundle_path` 或 `teacher_review_packet_path`，该命令会先运行同源 artifact 校验，并把 `evaluation-assets.cases.json` 与 `case-package.json.evaluation_asset_case` 不一致、外部 Provider adapter input 缺字段、空 page/question、重复 ID、跨题 region/evidence 归属、孤儿引用、缺字段、JSON 解析失败、external Provider input 与已生成 VisionEvidencePacket 的 pages/questions/regions/evidences/gates 或 pipeline 核心字段漂移、题目切分 QA 被手工改成 pass、Provider trial report 与同一 Vision 包重算结果不一致、annotation task 复制 OCR/text 或引用不存在 evidence、annotation import 无法用同一 Vision 包和题目切分 QA 重建 final gold package、final gold package 与 annotation import 重建结果不一致、gold label review report 与 final package 不一致或未 `ready_for_99_evaluation`、analysis evidenceRefs 或题目覆盖不对齐、result 报告/逐题行不合格、monthly report input 未使用老师确认来源、当前月/上月来源月份不匹配、缺 SkillRun/archive/source-material 标识或非空 evidenceRefs、monthly report 缺少上月证据却写趋势、delivery bundle 与 result/monthly 不一致、teacher review packet 动作边界与 delivery bundle 不一致等问题列入 `artifact_validation_statuses`。它还会把缺 OCR/文档解析、layout 或 formula Provider 候选角色的 checklist 保持为 missing，而不是因 `vision_packet_path` 存在就显示完成；如果 VisionEvidencePacket 本身有效，这个缺口会优先变成 `complete_checklist_evidence` next action。若 Provider trial report 结构有效但 `readiness=blocked`，则会优先返回 `fix_provider_trial_readiness`，避免把 blocked OCR/Vision 输出继续送进 human gold 标注。readiness report 会打印当前 strict `claimPolicy.requirements`，但仍保持 `claimable99_from_case_package=false`；存在无效 asset case 入口、OCR/Vision adapter input、VisionEvidencePacket、human-gold 入口、final human-gold、analysis/result、monthly-comparison 或 teacher-delivery artifact 时，下一步必须是 `fix_artifact_validation`，不能继续推荐 Vision packet 归一化、human gold、analysis、monthly、delivery 或 dataset 命令。

```bash
XUEMAI_EVAL_CLAIM_AUDIT_DATASET=/absolute/path/to/dataset.json npm run audit:k12-eval-claim
```

该命令用于正式评测前后检查“还缺哪些样本覆盖”。它读取 dataset，按 strict claim policy 输出 `student_learning_material_evaluation_claim_audit.v0.1`，把 99% blocker 结构化为 gaps 和 next sample targets；asset preflight blocker 会进一步拆成 external Provider input、Provider 试跑、Provider role coverage、annotation import、月报 input、月报 output、月报上月对比证据、老师复核包、mock/synthetic source 替换、public benchmark/source dataset 替换等 artifact-focused target，并且会区分 `externalVisionInput` / `providerTrial`、`monthlyReportInput` / `monthlyReport`，避免把缺外部 Provider 输入误报为缺 Provider 试跑，或把缺月报输入误报为缺月报输出。它本身不是正确率证明；最终仍以 `eval:k12-material` 的 `claimable99Correctness=yes` 为准。

dataset 中的 `asset_preflight` 不能只手写一个 `claimable99AssetReady=true`：正式 claim policy 会要求 `asset_preflight.manifest_id` 与当前 `dataset_id` 对齐、`checked_at` 记录资产预检时间，并且 ready=true 时 `blockers` 为空。推荐始终通过 `generate:k12-eval-dataset` 从同一份通过预检的 manifest 生成 dataset；如果命令传入自定义 `datasetId`，生成器会把 `manifest_id` 绑定到最终 dataset id，并用 `source_manifest_id` 保留原资产清单 id。

```bash
XUEMAI_DELIVERY_BUNDLE_INPUT=/absolute/path/to/delivery-bundle.json XUEMAI_TEACHER_REVIEW_PACKET_OUTPUT=/absolute/path/to/teacher-review-packet.json npm run generate:k12-teacher-review-packet
```

该命令用于把最终 delivery bundle 交给产品 UI 前再包一层老师复核状态。若还没有 delivery bundle，也可以设置 `XUEMAI_DELIVERY_BUNDLE_OUTPUT`，再传入 `XUEMAI_RESULT_INPUT`、`XUEMAI_ANALYSIS_INPUT` 或 `XUEMAI_VISION_PACKET`，命令会先生成 delivery bundle，再写出 `student_learning_material_teacher_review_packet.v0.1`。输出会明确哪些动作可用、哪些动作会改反馈状态或写长期档案、哪些动作必须老师确认；同时保证 teacher-visible payload 不暴露 `internal_evidence_ref` / `evidenceRefs` / `VisionEvidencePacket` 等内部字段。

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_PROVIDER_TRIAL_REPORT_OUTPUT=/absolute/path/to/provider-trial-report.json npm run generate:k12-provider-trial-report
```

该命令用于真实 OCR/Vision Provider 试跑后的第一道资产报告。它可选读取 `XUEMAI_QUESTION_SEGMENTATION_REVIEW`，输出 `student_learning_material_vision_provider_trial_report.v0.1`，只保留 Provider 候选、gate 状态、题目切分计数、逐题 readiness、阻断项、warning 和下一步，不包含原始 OCR 全文、normalized text，也不能在 next steps、warning、备注类字段中复制 OCR/text 内容。若设置 `XUEMAI_PROVIDER_TRIAL_REPORT_REQUIRE_READY=1`，只允许 `ready_for_human_labeling` 的报告写出；否则会把缺 crop_ref、缺答案依据、低置信区域等问题写成可修复 warning。

```bash
XUEMAI_BASELINE_PROVIDER_TRIAL_REPORT=/absolute/path/to/baseline-provider-trial-report.json XUEMAI_CANDIDATE_PROVIDER_TRIAL_REPORT=/absolute/path/to/candidate-provider-trial-report.json npm run compare:k12-vision-provider-regression
```

该命令用于更换 OCR/Vision Provider 或其配置前的第一道回归验收。baseline 与 candidate 必须来自同一份学生材料；正式模式下两边都必须达到 `ready_for_human_labeling`，candidate 不能丢页、丢题、减少总证据数、减少全局或同题学生痕迹证据数、减少全局或同题答案依据证据数，不能重排题目顺序，不能改变同一 `question_id` 的页码或题号身份，不能减少题目切分通过数或可硬判题数，不能增加缺 crop_ref、低置信区域、孤儿证据、需老师复核题或 blocked 题，也不能让同一题的 segmentation/readiness/confidence 退步。只有设置 `XUEMAI_VISION_PROVIDER_REGRESSION_ALLOW_INCOMPLETE=1` 时，才允许把未完成证据包作为命令链路调试输入。

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_QUESTION_SEGMENTATION_REVIEW_OUTPUT=/absolute/path/to/question-segmentation-review.json npm run generate:k12-question-segmentation-review
```

该命令用于在人工 gold 标注和 99% 资产预检前生成脱敏题目切分 QA artifact。它不保存原始 OCR 文本，也不能在人工复核清单等自由文本中复制 OCR/text 内容，只记录题目区域、crop_ref、证据类型、置信度、风险和人工复核清单；校验时题目顺序也必须与同源 VisionEvidencePacket 一致。同题 evidence 未绑定题内 `region_id` 时，该题必须进入老师复核。gold 中允许硬判的题必须在该 artifact 中为 `pass`。

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_QUESTION_SEGMENTATION_REVIEW=/absolute/path/to/question-segmentation-review.json XUEMAI_GOLD_LABEL_ANNOTATION_TASK_OUTPUT=/absolute/path/to/annotation-task.json npm run generate:k12-gold-label-annotation-task
```

该命令用于给 Label Studio、CVAT 或人工复核生成上游标注任务包。任务包只暴露题号、题目切分状态、bbox/polygon/crop_ref、证据 ref、标注配置提示和 annotation import skeleton，不包含原始 OCR 全文、normalized text；task questions、annotation import skeleton 和 Label Studio payload 必须与同源 VisionEvidencePacket 重建出的 packet-derived annotation task 一致。校验时会从 VisionEvidencePacket 重建题目切分状态、区域、证据摘要、证据 basis 建议、skeleton evidence refs/notes 和 Label Studio evidence_refs/crop_refs/issues/status hints，手工改绿、删改证据建议或删改标注工具 payload 证据都必须失败；任何可编辑字段也不能复制 VisionEvidencePacket 的 OCR/text 内容。它本身不能作为 99% 验收 gold，标注完成后仍必须归一化为 annotation import。

```bash
XUEMAI_GOLD_LABEL_ANNOTATION_IMPORT=/absolute/path/to/annotation-import.json XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_QUESTION_SEGMENTATION_REVIEW=/absolute/path/to/question-segmentation-review.json XUEMAI_GOLD_LABEL_PACKAGE_OUTPUT=/absolute/path/to/gold-label-package.json npm run generate:k12-gold-label-package
```

该命令用于把 Label Studio、CVAT 或人工标注流程归一化后的 `student_learning_material_gold_label_annotation_import.v0.1` 转换成最终 gold package。默认必须脱敏、双标、仲裁，并且题号与证据引用必须和同一份 `VisionEvidencePacket` 对齐。传入 `XUEMAI_QUESTION_SEGMENTATION_REVIEW` 时，可硬判题必须在题目切分 QA artifact 中为 `pass`；annotation import notes 和 gold package notes 类字段都不能复制 OCR/normalized/text 内容，`XUEMAI_GOLD_LABEL_ANNOTATION_ALLOW_INCOMPLETE=1` 也不能绕过该泄漏检查。

```bash
XUEMAI_GOLD_LABEL_PACKAGE=/absolute/path/to/gold-label-package.json npm run validate:k12-gold-labels
# 可选：XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_ANSWER_KEYS=/absolute/path/to/answer-keys.json XUEMAI_RUBRICS=/absolute/path/to/rubrics.json
```

该命令用于校验单个人工 gold 标注包是否具备双人标注、分歧仲裁、脱敏标记和逐题证据依据。若同时提供 `XUEMAI_VISION_PACKET`，还会要求 gold 包身份、题目覆盖/顺序和逐题 evidence basis 与同一份 VisionEvidencePacket 对齐，并拒绝跨题 evidence ref 或把 answer_key/rubric、student trace、teacher correction 放入错误 basis 槽位。`adjudicated_gold` 中允许硬判的题，也必须能从每位 reviewer 的 `question_evidence_basis` 找到学生痕迹和答案/评分点或老师批改依据，不能由仲裁结果凭空新增硬判。若 gold basis 使用 `side_input.*` 答案/评分点证据，必须同步传入 `XUEMAI_ANSWER_KEYS` / `XUEMAI_RUBRICS`，让 standalone 验包命令复用与 case package readiness、asset preflight 一致的同题 side-input 白名单。没有通过该命令的 gold 包不能作为 99% 验收依据。

```bash
XUEMAI_GOLD_LABEL_PACKAGE=/absolute/path/to/gold-label-package.json XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_GOLD_LABEL_REVIEW_REPORT_OUTPUT=/absolute/path/to/gold-label-review-report.json npm run generate:k12-gold-label-review-report
```

该命令用于给最终 gold package 生成可审计的人工双标一致性报告。真实样本必须同时传入同源 `XUEMAI_VISION_PACKET`，使报告生成阶段复验 gold package 身份、题目覆盖/顺序和逐题 evidence basis 是否与同一份 VisionEvidencePacket 对齐，并拒绝跨题 evidence ref、evidence_type 与 basis 槽位不匹配的 ref，或缺少 reviewer basis 支撑的 `adjudicated_gold` 硬判题。报告会记录 reviewer 数、label 数、题目数、一致率、分歧字段数量和仲裁状态；分歧值不原样写入报告，只保留短哈希，避免把 OCR 原文、人工备注或学生作答内容扩散到评测报告中。校验报告时不能只信任分歧数量和 readiness，还必须从同一 final gold package 重算 disagreement 的 field、message 和 reviewer value hash 列表。未完成仲裁、gold package 校验失败或 disagreement 明细被手工改写时，报告只能作为 incomplete 调试产物，不能进入 99% readiness。

```bash
XUEMAI_EVAL_ASSET_MANIFEST_CASES=/absolute/path/to/cases.json XUEMAI_EVAL_ASSET_MANIFEST_OUTPUT=/absolute/path/to/evaluation-assets.json npm run generate:k12-eval-assets-manifest
```

该命令用于从多 case 资产路径列表生成 `student_learning_material_evaluation_assets.v0.1` 清单，并立即复用资产预检器，减少真实样本进入评测前的手工 JSON 拼装错误。

`XUEMAI_EVAL_ASSET_MANIFEST_CASES` 可以是 case 数组，也可以是带 `dataset_id`、`dataset_kind`、`description`、`cases` 的对象。若 cases 文件已经声明这些 dataset 元数据，命令行或环境变量传入的同名值必须一致；只有缺字段时才允许外部参数补齐，避免从 case package 生成的 `evaluation-assets.cases.json` 被静默改绑到另一个 dataset。

```bash
XUEMAI_EVAL_ARTIFACT_MANIFEST_INPUT=/absolute/path/to/evaluation-assets.json XUEMAI_EVAL_ARTIFACT_MANIFEST_OUTPUT=/absolute/path/to/evaluation-assets.with-artifacts.json npm run generate:k12-eval-artifacts
```

该命令用于批量补齐 Provider 试跑报告、题目切分 QA artifact、脱敏 annotation task、人工双标一致性报告、用户可见 result artifact、老师 delivery bundle artifact 和 teacher review packet artifact；teacher review packet 默认随 delivery bundle 生成，可用 `XUEMAI_EVAL_ARTIFACT_GENERATE_TEACHER_REVIEW=0` 关闭。真实样本可先在没有 `analysis_path` 的阶段生成 Provider 试跑、题目切分 QA、annotation task 和 gold review report；只有生成 result、月报 input，或没有现成 result 却要生成 delivery bundle 时，才需要 analysis artifact。若输入 manifest 已有 `external_vision_input_path`，输出 manifest 必须保留并按输出 manifest 目录重新计算相对路径，但该命令不伪造或生成外部 Provider 输入。如需生成月报 input/output artifact，必须显式设置 `XUEMAI_EVAL_ARTIFACT_GENERATE_MONTHLY=1`、`XUEMAI_EVAL_ARTIFACT_TEACHER_ID` 和 `XUEMAI_EVAL_ARTIFACT_CONFIRMED_AT`，以保留老师确认边界；更新后的 manifest 会写入 `monthly_report_input_path` 和 `monthly_report_path`。命令不调用实时推理模型，避免评测资产受模型版本或网络状态漂移影响。delivery bundle 与 teacher review packet 会校验专业报告章节、逐题覆盖、家长反馈安全、月报纵向比较、状态、动作边界和来源映射。

```bash
XUEMAI_EVAL_ASSET_MANIFEST=/absolute/path/to/evaluation-assets.json npm run validate:k12-eval-assets
```

该命令用于在跑 `eval:k12-material` 前校验一组可回放评测资产：每个 case 必须能读取 `vision_packet_path` 和 `gold_label_package_path`，可选 `external_vision_input_path`、`provider_trial_report_path`、`question_segmentation_review_path`、`annotation_task_path`、`annotation_import_path`、`gold_label_review_report_path`、`answer_keys_path` / `rubrics_path` 必须按 `question_id` 映射；若提供 external Provider input，预检会要求它通过 `ExternalVisionAdapterInput` 校验，拒绝 helper template 占位符和非法 bbox/polygon，与同一份 VisionEvidencePacket 的 providerRunId、materialId、studentId、page/question 顺序等关键身份字段对齐，并从 external input 重建 adapter-derived packet，拒绝 pages、questions/regions、evidences、gates 或 pipeline stage 核心字段被手工改写。人工 gold 中允许确定性判断的题，必须被同题 external Provider input、VisionEvidencePacket、Provider 试跑报告、题目切分 QA artifact、脱敏 annotation task、normalized annotation import、人工双标一致性报告与 side input 支撑。若提供 `analysis_path`，其 `question_analyses` 必须与同一份 VisionEvidencePacket 的题目集合和顺序完全一致，且 evidenceRefs 必须同源可解析。若 Provider 试跑报告仍为 `blocked`，annotation import 不能重新生成同一份 final gold package，或 gold label review report 未达到 `ready_for_99_evaluation`，资产清单会阻断 `claimable99AssetReady`；`needs_evidence_completion` 可用于提示后续补齐 side input、crop_ref 或复核材料。Provider 试跑报告和题目切分 QA artifact 都必须能被同一份 VisionEvidencePacket 重算校验，篡改 ready/pass、summary、blockers/warnings、crop_ref、issues 或逐题 readiness 时会直接失败。每个真实 OCR/Vision case 还必须在 `pipeline_trace.provider_candidates` 中记录当前选中 Provider、至少一个 benchmark/fallback 候选、每个候选的 `evidence_source_url`，以及 license/deployment review notes，并覆盖 OCR/文档解析、layout 和 formula 候选角色；缺这些评估痕迹或角色覆盖时结构预检可以通过，但 99% asset readiness 必须为 no。若 `human_labeled` 清单包含 `mock` source kind、mock/synthetic provider/model、`mock://` / `synthetic://` page ref、同类 evidence ref 或缺少 external Provider input artifact，也会阻断 claim readiness。若清单提供 `analysis_path`、`result_path`、`monthly_report_input_path`、`monthly_report_path`、`delivery_bundle_path`、`teacher_review_packet_path`，还会校验老师报告、家长反馈、月报 input/output artifact、最终用户结果、老师交付包和老师复核包是否属于同一 case，并检查 result/delivery/review packet artifact 的报告章节、逐题覆盖、月报比较、安全边界和动作启停。月报 input 必须只包含老师确认来源，并保留当前月/上月来源的确认时间、SkillRun/archive/source-material 标识和非空 evidenceRefs；月报 artifact 的 `evidence_timeline` source ids 必须与 input 中当前月来源按月报生成排序一致，`comparison_evidence.previous_month_source_ids` 必须与 input 中上月来源和 replayable `previous_report.evidence_timeline` 去重结果一致；若写出本月较上月的趋势，必须通过 `comparison_evidence` 提供可回放上月来源 ID；`previous_month_source_count` 必须与非空、去重后的 `previous_month_source_ids` 一致，missing 状态不能携带上月来源或标记使用上月报告。缺少上月来源时只能输出证据不足说明，不能写成明确进步、稳定、退步或新问题。该命令不读取原始图片，只校验结构化证据和脱敏 gold 包。报告会输出当前 strict `claimPolicy.requirements`；`claimable99AssetReady=no` 表示结构预检虽可能通过，但样本覆盖、artifact 覆盖、external Provider input 覆盖、Provider 试跑报告覆盖与 readiness、annotation import 覆盖、人工双标一致性报告、Provider 候选评估来源和角色覆盖、月报 input/output 和上月对比证据、老师复核包覆盖、mock/synthetic 来源或 human-labeled 要求仍不足，不能作为 99% 可宣称资产。

补充要求：`gold_label_review_report_path` 不能只校验 reviewer 数、分歧数量和 readiness；预检必须从同一 final gold package 重算 disagreements 的 field、message 和 reviewer value hash 列表，发现手工改写的分歧明细时必须失败。

```bash
XUEMAI_EVAL_DATASET_ASSET_MANIFEST=/absolute/path/to/evaluation-assets.with-artifacts.json \
XUEMAI_EVAL_DATASET_OUTPUT=/absolute/path/to/dataset.json \
npm run generate:k12-eval-dataset
```

该命令把通过 `validate:k12-eval-assets` 的资产清单转换为正式 dataset 文件。它要求每个 case 已有 `analysis_path`，并把 `gold_label_package_path` / `analysis_path` 写入 dataset case，同时把同一份资产预检结果写入 `asset_preflight.claimable99AssetReady`、`asset_preflight.manifest_id`、`asset_preflight.checked_at` 和 `asset_preflight.blockers`。如果传入自定义 dataset id，`manifest_id` 会对齐最终 dataset id，原资产清单 id 保存在 `source_manifest_id`。如果资产预检仍有 blocker，dataset 仍可用于调试或定位问题，但 `eval:k12-material` 不会给出 `claimable99Correctness=yes`。

```bash
XUEMAI_EVAL_BASELINE_DATASET=/absolute/path/to/baseline-dataset.json XUEMAI_EVAL_CANDIDATE_DATASET=/absolute/path/to/candidate-dataset.json npm run compare:k12-model-regression
```

该命令用于更换推理模型、文本模型 Provider、Prompt 或 Schema 前的回归验收。baseline 与 candidate 必须引用同一批 gold case；正式模式下两边都必须是 `claimable99Correctness=yes`，candidate 不能新增失败 case、不能出现指标退步。比较器还会从每个 analysis 生成 user-facing result、老师确认后的 monthly report input、monthly report、delivery bundle 和 teacher review packet 并复用质量校验器，防止候选模型内部指标不退步但最终老师交付物缺标题、缺专业章节、逐题错配、家长反馈不安全、月报输入绕过老师确认/上月可回放证据，或 SkillCard/分析详情页动作边界被破坏。只有设置 `XUEMAI_EVAL_REGRESSION_ALLOW_SMOKE=1` 的命令链路调试才允许跳过正式 claimable 要求。

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_ANALYSIS_OUTPUT=/absolute/path/to/analysis.json npm run generate:k12-analysis-output
```

该命令用于先生成真实 provider/model 的 `analysis_path` 文件。可选输入包括 `XUEMAI_ANSWER_KEYS`、`XUEMAI_RUBRICS`、`XUEMAI_KNOWLEDGE_POINTS` 和 `XUEMAI_STUDENT_PROFILE_HISTORY`。默认只允许写入 `draft_ready` 输出；`XUEMAI_GENERATE_ALLOW_DEGRADED=1` 只能用于调试退化样例，不能作为 99% 验收依据。

```bash
XUEMAI_ANALYSIS_INPUT=/absolute/path/to/analysis.json XUEMAI_RESULT_OUTPUT=/absolute/path/to/result.json npm run generate:k12-user-result
```

该命令用于把已有 `StudentLearningMaterialAnalysis` artifact 装配成老师报告、家长反馈和月报结果。若没有现成分析文件，也可以用 `XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_RESULT_OUTPUT=/absolute/path/to/result.json npm run generate:k12-user-result` 直接跑完整链路；可选 `XUEMAI_ANALYSIS_OUTPUT` 同时保留内部分析 artifact。默认不写入降级结果，`XUEMAI_RESULT_ALLOW_DEGRADED=1` 只能用于调试和老师复核流。

```bash
XUEMAI_DELIVERY_BUNDLE_OUTPUT=/absolute/path/to/delivery-bundle.json npm run generate:k12-delivery-bundle
```

该命令用于生成老师实际消费的交付包，整合专业测评报告、家长反馈、月报摘要与上月纵向比较、反馈/入档状态、安全提示和来源映射。它支持三种入口：`XUEMAI_RESULT_INPUT`、`XUEMAI_ANALYSIS_INPUT` 或 `XUEMAI_VISION_PACKET`；从 analysis 或 VisionEvidencePacket 开始时，可设置 `XUEMAI_RESULT_OUTPUT` 保留中间用户结果 artifact。交付包遵守状态优先级：已反馈 > 待反馈 > 已入档 > 待入档；证据不足或需补充材料会作为阻断状态显示。

```bash
XUEMAI_EVAL_DATASET=/absolute/path/to/dataset.json npm run eval:k12-material
```

该命令默认要求 `claimable99Correctness=yes`，且正式 dataset 需要记录 `asset_preflight.claimable99AssetReady=true`。仅调试命令链路时可以使用 synthetic fixture：

文件 runner 的顶层 `ok` 代表完整正式 gate 是否通过；当逐题指标全绿但缺少 `asset_preflight` 或样本覆盖不足时，`result.ok` 可以是 true，但顶层 `ok` 必须是 false，并在报告中输出 `claimable99Correctness=no`、当前 `claimPolicy.requirements` 和对应 warning。自定义小 policy 只允许用于本地链路调试，不能替代严格 99% claim gate。

```bash
XUEMAI_EVAL_DATASET=tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json XUEMAI_EVAL_ALLOW_SMOKE=1 npm run eval:k12-material
```

`XUEMAI_EVAL_ALLOW_SMOKE=1` 只能用于本地冒烟测试，不能用于模型、OCR/Vision Provider 或 Prompt 的 99% 验收。

## P0 Skill

- `update_learning_record`：生成结构化学习记录。
- `generate_feedback`：生成微信课后反馈。
- `monthly_report`：基于已入档记录生成月报草稿。学生会话生成家长可读月报，班级会话生成老师内部复盘月报；两者都必须保留依据来源和老师确认边界。

## 月报 Skill 结构

`monthly_report` 当前使用 mock schema，不接真实 AI 和数据库，但学生月报已经具备确定性聚合路径：

- 学生月报：`student_monthly_report_v1`，面向家长沟通，重点是本月状态、主要进步、主要问题、下月跟进和家长可读摘要。
- 班级月报：`class_monthly_report_v1`，面向老师复盘，重点是班课节奏、共性薄弱点、学生分层、下月班课安排和服务待办。

学生月报构建函数：

- `createStudentMonthlyReportFromConfirmedSnapshots(...)`：只读取老师确认后的学习材料月报快照。
- `createConfirmedMonthlyReportSnapshotCopy(...)`：把分析 Skill 的未确认 `monthly_report_snapshot` 复制成带 `teacher_id`、`source_skill_run_id`、`archive_record_id`、`confirmed_at` 的已确认月报素材；必须使用老师编辑后的当前快照，不能直接把 AI 原始草稿加入月报池。
- `generate:k12-monthly-report`：从文件化素材包生成 `student_monthly_report_v1`，用于真实样本、上月素材和模型/Provider 切换后的可回放月报验收。
- 也可读取已确认学习记录、已确认家长反馈记录和老师备注，形成统一月报素材池。
- 自动过滤未确认、非本学生、非本月素材。
- 若本月没有任何确认素材，输出“依据不足”，不编造进步、问题或趋势。
- 若缺少上月确认素材或上月确认月报，纵向比较只提示证据不足，不输出强趋势判断。
- 上月确认月报只有在 `student_name`、上月 `month_label`、`readiness.source_count`、`comparison_evidence` 和 `evidence_timeline` 可回放 source id 都自洽且匹配时，才能作为纵向比较证据；文件化月报输入应拒绝错学生、错月份、source_count 与 timeline 不一致、comparison evidence 自相矛盾、家长文案含禁用表达、空 source id 或重复 source id 的 `previous_report`。
- `comparison_evidence` 必须记录本月素材数、上月素材数、上月来源 ID、是否使用上月月报和上月证据状态；资产预检会拒绝“没有上月来源却声称趋势变化”的月报 artifact。
- 若只有学习记录/反馈/备注而没有学习材料快照，可以生成服务型月报草稿，但逐题趋势必须标注依据不足。

聊天流只展示月报 SkillCard 摘要；完整月报在右侧侧聊详情中展示。班级月报不应写成家长群发文案，班级共性结论也不能自动覆盖学生个人档案。

## P1 Skill

- `analyze_learning_evidence`：面向全学科分析试卷、作业、作文、阅读材料、课堂记录、口语练习、实验报告、艺术/音乐/项目制作品等学习证据。
- `next_lesson_plan`：生成下次课建议。
- `parent_communication`：家长沟通话术。
- `class_lesson_record`：班课记录。
- `batch_feedback`：班级批量反馈。

## SkillCard 必须展示

- Skill 类型
- 当前状态
- 输入摘要
- AI 本次参考依据
- 可信度
- 结构化结果
- 可编辑正文
- 操作按钮
- 入档位置
- 下一步建议

当前 mock UI 已轻量接入 SkillCard 版本链：默认只展示当前结果摘要和主操作，AI 原稿与编辑区默认收起；老师展开后可以查看 AI 原稿、编辑当前版、看到编辑次数、重置为原稿，并在确认入档时固化 `current_output`。

## 入档原则

AI 只能生成草稿或 SkillCard。正式写入 `learning_records`、`feedbacks`、`monthly_reports` 等长期事实，必须由老师显式点击确认触发。

`archived` 状态不能由生成流程自动进入，必须由老师明确动作触发。当前 mock Runner 对微信反馈要求 `draft_ready -> copied -> sent -> archived`；学习记录和学习材料分析可在草稿就绪后由老师明确确认入档。

确认入档时保存的是 `current_output`，不是 `original_output`。如果老师没有编辑，两者内容相同。

`generate_feedback` 的入档仍需先复制并标记已发给家长；`update_learning_record` 与 `analyze_learning_evidence` 可在老师审核后直接确认入档。

## 风险原则

- 不做医学或心理诊断。
- 不承诺提分。
- 不编造课堂事实。
- 不夸大学习效果。
- 不替老师做最终判断。
- 不自动入档。
