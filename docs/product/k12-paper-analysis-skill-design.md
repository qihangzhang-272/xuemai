# K12 试卷作业分析 Skill 设计稿

## 目标

本 Skill 面向中国大陆小学、初中、高中学科类教培场景。它接收带有学生作答、订正、批改或练习痕迹的试卷、作业题、错题、错题本、阶段测验、周测、月考等材料，输出两类结果：

1. 给老师看的专业测评型学情报告。
2. 给家长看的微信反馈评语。

本 Skill 不做自动诊断、不自动承诺提分、不自动写入长期档案。所有长期结论都必须经过老师确认。

## 99% 正确率口径

不能把“任意材料、任意拍摄质量、任意题型自动判断 99% 正确”作为系统承诺。可落地的口径是：

```text
在题目清晰、学生作答清晰、答案或评分点可用、OCR/视觉识别置信度达标、题目切分稳定的题目上，逐题正误与关键结论目标正确率 >= 99%。
证据不足、识别不清、答案缺失、评分点缺失、题目切分不稳定的题目，不生成确定性判断，只进入“需老师确认”。
```

因此系统的高准确率来自：

- 证据不足时拒判。
- 每题都有置信度和证据引用。
- 自动校验结构化输出。
- 老师确认后才进入学生档案和月报素材池。
- 用评测集持续回归不同地区、学段、学科、题型、拍照质量。

99% 的正式验收需要真实脱敏材料和人工 gold 标注，不能用合成 mock 样例代替。合成样例只能证明流程能跑通；真实验收集至少要记录材料类型、学科、学段、年级候选、地区/教材线索、逐题标准答案或评分点、学生答案、老师判定、证据是否足够、哪些题必须进入老师确认。

推荐的产品级验收底线：

```text
human_labeled dataset
>= 100 份材料
>= 500 道人工标注题
>= 300 道证据充分、允许硬判的题
>= 50 道证据不足、应路由老师复核的题
>= 4 类材料类型
>= 5 个学科
覆盖 primary / middle / high 三个学段
>= 3 个地区或教材线索
>= 4 个大陆区域分组
>= 2 个教材版本族
包含全国卷 / 新高考等考试范围线索
双人标注
分歧仲裁
学生隐私脱敏
任一 case 失败则整批失败
```

工程评测入口已经按这个口径拆成两层：

- `evaluation.ts`：计算逐题、逐 case、批量和 dataset 级指标。
- `evaluation-files.ts`：加载 dataset JSON，支持内联 `gold/analysis` 或相对路径 `gold_path/analysis_path`，并生成可读报告。
- `evaluation-asset-manifest-files.ts`：把多 case 的 VisionEvidencePacket、gold package、side input、analysis/result/monthly artifact 路径生成可回放资产清单，并立即复用 validator 预检。
- `vision-provider-trial-report-files.ts`：从真实 OCR/Vision Provider 产出的 `VisionEvidencePacket` 生成不含原始 OCR 全文、normalized text 或复制 OCR/text 内容的 Provider 试跑报告，汇总 Provider 候选、基础 gate、题目切分计数、逐题 readiness、阻断项和下一步，作为进入人工标注前的预检；校验时会用同一份 VisionEvidencePacket 重算 report，拒绝把缺证据、需复核或 blocked 的 Provider 输出手工改成 `ready_for_human_labeling`。
- `vision-provider-regression.ts`：比较同一材料的 baseline/candidate Provider 试跑报告，在文本推理前拦截 OCR/Vision Provider 切换造成的丢题、缺 crop_ref、题目切分退步、逐题 readiness 退步或置信度下降。
- `question-segmentation-review-files.ts`：从 VisionEvidencePacket 生成脱敏题目切分 QA artifact，记录题目、页码、区域、几何/crop_ref、证据归属、置信度和人工复核清单；同题关键 evidence 没有绑定题内 `region_id` 时，该题必须进入老师复核；校验时会用同一份 VisionEvidencePacket 重算题目切分状态，拒绝把缺 crop_ref、缺 evidence region 归属、低置信或边界不稳的题手工改成 `pass`，不落原始 OCR 文本，也不能在自由文本字段复制 OCR/text 内容。
- `evaluation-artifact-bundle-files.ts`：从已有 `analysis_path` 的资产清单批量生成 Provider 试跑报告、题目切分 QA artifact、脱敏标注任务包、人工双标一致性报告、老师报告/家长反馈结果 artifact 和老师交付包 artifact，并在显式老师确认元数据存在时生成月报 artifact；该命令不调用实时模型，避免评测资产被模型版本漂移污染。
- `evaluation-case-package-files.ts`：为真实脱敏样本创建 case package scaffold，固定 artifact 路径、monthly report input/output 路径、命令顺序、99% readiness checklist 和 `evaluation-assets.cases.json`，并写出 helper-only `provider/external-vision-input.template.json` 帮助真实 Provider 输出映射到正式 adapter input，同时提醒 OCR/文档解析、layout 和 formula Provider 候选角色覆盖，但不复制原始学生图片或未脱敏学习材料，template 也不算评测证据。
- `evaluation-case-package-readiness-files.ts`：检查 case package 当前推进状态，报告隐私边界、缺失 artifact、OCR/Vision、题目切分、human gold、月报比较、老师交付等链路组缺口、最早可执行/被阻断命令、asset preflight 状态和 99% blocker；readiness 会先确认 `evaluation-assets.cases.json` 的 dataset 元数据和唯一 case 路径仍与 `case-package.json.evaluation_asset_case` 一致，防止 asset manifest 入口被手工改坏后继续下游命令；Provider 角色覆盖 checklist 会读取 `VisionEvidencePacket.pipeline_trace.provider_candidates`，只有 OCR/文档解析、layout 和 formula 候选角色都存在才算 present；当有效 packet 缺少这些角色时，next action 会优先提示 `complete_checklist_evidence`，先补 Provider trace 再继续 Provider trial 或 asset preflight；当 Provider trial report 结构有效但 `readiness=blocked` 时，next action 会优先提示 `fix_provider_trial_readiness`，先修 OCR/Vision 输出再进入人工标注；当 external Provider input 与 VisionEvidencePacket 同时存在时，会重建 adapter-derived packet 并拦截 pages/questions/regions/evidences/gates 或 pipeline 核心字段漂移，防止把 scaffold 或不完整样本误当作 claim 证据。
- `evaluation-assets.ts`：在正式评测前校验可回放资产清单，确认 external Provider input、VisionEvidencePacket、Provider 试跑报告、题目切分 QA artifact、脱敏标注任务包、人工双标一致性报告、外部答案/评分点、人工 gold 包、题号映射、证据引用、逐题 readiness、Provider 候选 trace、benchmark/open-source 候选、候选来源 URL、许可/部署复核备注、OCR/文档解析 + layout + formula 候选角色覆盖、用户结果、月报上月对比证据和老师交付包彼此一致；若同时提供 external Provider input 和 VisionEvidencePacket，会重建 adapter-derived packet 并拒绝 pages、questions/regions、evidences、gates 或 pipeline stage 核心字段漂移；输出 `claimable99AssetReady` 阻断原因；关键 evidence 缺少题内 `region_id` 归属时，不能支持 definitive gold 或模型硬判；资产清单会同时报告地区/教材原始候选、大陆区域分组、教材版本族和全国卷/新高考线索，不能只用候选数量替代代表性覆盖；`human_labeled` 清单不能用 mock/synthetic Vision source 或 public benchmark/source dataset 凑 99% 资产覆盖。
- `evaluation-dataset-from-assets-files.ts`：把已预检的资产清单转换为 `eval:k12-material` dataset，并自动携带 `asset_preflight.claimable99AssetReady`、blockers 和每个 case 的 `asset_manifest_case_id` / `gold_label_package_path` / `analysis_path`，避免 dataset eval 绕过资产链路或丢失可回放 artifact 来源。
- `evaluation-claim-audit-files.ts`：从 dataset 文件输出 99% claim audit，结构化展示 strict policy 下的覆盖缺口、artifact-focused 资产缺口与下一批样本/标注补齐目标，包括 external Provider input、Provider 试跑、Provider 角色覆盖、annotation import、月报比较、老师复核包、mock/synthetic source 替换和 public benchmark/source dataset 替换，避免真实样本只堆数量但缺少学段、学科、材料类型、地区/教材线索、大陆区域分组、教材版本族、全国卷/新高考线索、老师复核题覆盖或关键评测 artifact。
- `gold-label-template-files.ts`：从已校验的 `VisionEvidencePacket` 生成待人工标注的 gold package 草稿；可选读取题目切分 QA artifact，并把每题 segmentation status / issues 写入 reviewer notes。草稿不能作为 99% 证据，必须经脱敏、双人标注和仲裁后才能进入评测集。
- `gold-label-annotation-task-files.ts`：从同一份 `VisionEvidencePacket` 和题目切分 QA artifact 生成脱敏标注任务包，包含 Label Studio/CVAT/manual payload hints、题号、crop_ref、几何、证据 ref 和 annotation import skeleton，不落原始 OCR 全文、normalized text。校验会重算 packet-derived annotation task，拒绝题目切分状态、区域、证据摘要、证据 basis 建议、annotation import skeleton evidence refs/notes 或 Label Studio evidence_refs/crop_refs/issues/status hints 被手工改写，也会拒绝备注、清单或 payload 中复制 VisionEvidencePacket 文本片段。
- `gold-label-annotation-import-files.ts`：把 Label Studio、CVAT 或人工标注后的统一 annotation import 转换成最终 gold package，并立即校验脱敏、双标、仲裁和 `VisionEvidencePacket` 对齐；可选读取题目切分 QA artifact，并拒绝把未通过 segmentation review 的题标成 definitive gold judgement。只要生成后的 final gold package 存在 source-aware validation error，例如跨题 evidence ref、wrong-type basis ref 或 unsupported adjudicated hard judgement，转换本身就失败，不能把无效包交给下游。显式 `allowIncomplete` 只能写缺仲裁草稿用于调试，输出仍必须 `claimable99Correctness=false`。annotation import notes 与 final gold package notes 类字段都会用同一份 `VisionEvidencePacket` 做内容级泄漏检查；资产预检和 case package readiness 重放 annotation import 时，必须连 labels、reviewer metadata、question evidence basis、`adjudicated_gold` 和 adjudicator metadata 一起与 final gold package 对齐。
- `gold-label-review-report-files.ts`：从 final gold package 生成脱敏人工双标一致性报告，记录一致率、分歧数量、仲裁状态和 readiness blocker；分歧值只写哈希，不复制 OCR/text 内容或 reviewer notes。
- `output-files.ts`：从 `VisionEvidencePacket` 生成可回放的 `StudentLearningMaterialAnalysis` artifact，作为 dataset 的 `analysis_path`。
- `result-files.ts`：从已有 `analysis_path` 或完整 `VisionEvidencePacket -> model` 链路生成老师报告、家长反馈和月报结果 artifact；落盘前必须通过 `validateStudentLearningMaterialUserFacingResult`，并保留来源标签化的材料类型、科目、学段、年级候选、地区/教材线索。专业测评报告必须包含证据充分性判定、学情传导图、难度层表现、学习策略、学科能力、重点错题成因、表现空间和复发风险，逐题行必须覆盖同一 analysis 的全部 `question_id` 并保持题目顺序。
- `delivery-bundle-files.ts`：把最终用户结果打包成老师交付包，包含结构化材料分类、专业测评报告、家长反馈、月报摘要/纵向比较、反馈/入档状态、安全边界和来源映射；落盘前必须通过 `validateStudentLearningMaterialDeliveryBundle`，并拒绝缺专业章节、重复、遗漏或顺序错乱的逐题行。
- `teacher-review-packet-files.ts`：把老师交付包转换成聊天 SkillCard / 分析详情页可用的老师复核包；也可从 result/analysis/VisionEvidencePacket 先生成交付包再生成复核包。它包含结构化材料分类、可执行动作、反馈/入档状态、老师确认边界、source label、`## 证据充分性判定` 和内部 source map 隔离；校验器会确认动作启停、复核数量、source label 和 audit source map 与同一 delivery bundle 一致。它不参与逐题正确率证明，但必须作为评测资产完整性的一环，保证产品层不会自动发微信、自动入档或丢失硬判/复核边界。
- `evaluation-regression.ts`：比较 baseline 与 candidate 两份同 gold dataset 的评测结果，用于更换模型、Provider、Prompt 或 Schema 前的回归验收；比较时不仅要求 case id 集合一致，也要求同 case 的 human-gold 内容一致，同时从每个 analysis 生成用户可见 result、老师 delivery bundle 和 teacher review packet，确保候选模型不会破坏最终老师/家长交付物或 SkillCard/分析详情动作边界。
- `material-classifier.ts`：在模型前先做确定性预分类，识别材料类型、学科、学段、年级候选和地区/教材线索；正常 prompt 和降级分析都复用该结果，避免把入口分类完全交给模型自由发挥。分类器已覆盖课时作业、周末作业、寒暑假作业、校本作业、随堂练习、晨测、堂清、限时训练、期中/期末复习卷、诊断卷、小升初、青岛版、北京版、鲁科版、仁爱版等常见大陆材料/教材表述；若同一材料命中多个地区或多个教材版本，只输出复核 warning 并降低置信度，不把冲突线索硬判为唯一来源。
- `question-evidence-readiness.ts`：在模型前后做逐题证据准入，只有题目切分、学生答案、答案依据/批改依据和置信度都达标时才允许确定性正误；外部 `answerKeys` / `rubrics` 只有显式映射到同一 `question_id` 时才算答案依据，否则必须路由老师复核。
- `npm run generate:k12-eval-assets-manifest`：读取 `XUEMAI_EVAL_ASSET_MANIFEST_CASES` 指定的 case asset 列表，生成 `XUEMAI_EVAL_ASSET_MANIFEST_OUTPUT` 资产清单并立即预检。object-form cases 文件已经声明 `dataset_id`、`dataset_kind` 或 `description` 时，外部 env/input 只能传入相同值，不能静默覆盖真实样本包的 dataset 身份。
- `npm run generate:k12-provider-trial-report`：读取 `XUEMAI_VISION_PACKET`，生成 `XUEMAI_PROVIDER_TRIAL_REPORT_OUTPUT` 指定的 Provider 试跑报告；它不保存原始 OCR 全文、normalized text 或复制 OCR/text 内容，用于先判断真实 OCR/Vision 输出是否足以进入题目切分复核和 human gold 标注，后续校验会拒绝篡改 readiness、summary、blockers/warnings、Provider 候选或逐题状态的报告。
- `npm run compare:k12-vision-provider-regression`：读取 baseline/candidate 两份同材料 Provider 试跑报告，比较页数、题目覆盖、总证据数、全局和逐题学生痕迹证据、全局和逐题答案依据证据、题目顺序、同题页码/题号身份、crop_ref、题目切分、逐题 readiness、可硬判题数、需复核题数和置信度；正式模式下两边都必须 `ready_for_human_labeling`。
- `npm run generate:k12-eval-case-package`：为真实脱敏样本创建 case package scaffold，输出 `case-package.json`、`evaluation-assets.cases.json` 和 helper-only `provider/external-vision-input.template.json`，作为后续 Provider 输出、人工标注、annotation import、gold review、analysis/result、monthly-report input、monthly report、delivery bundle、teacher review packet 的路径约定；template 会提示 Provider 候选 trace 需覆盖 OCR/文档解析、layout 和 formula 角色，但不进入正式 asset manifest。
- `npm run inspect:k12-eval-case-package`：读取 `XUEMAI_EVAL_CASE_PACKAGE_READINESS_DIR` 或 `XUEMAI_EVAL_CASE_PACKAGE_READINESS_PATH` 指定的 case package，检查隐私边界、`evaluation-assets.cases.json` 与 case package 的同源一致性、artifact 状态、Provider 角色覆盖 checklist、Provider trial readiness、链路组缺口、下一条顺序命令、当前 strict `claimPolicy.requirements` 和 99% blocker；报告会显示 checklist present/missing 数量、`providerRoleCoverageChecklist` 和 `providerTrialReadiness`，但它只用于推进流程，不能作为 99% 正确率证据。
- `npm run audit:k12-eval-claim`：读取 `XUEMAI_EVAL_CLAIM_AUDIT_DATASET` 指定的 dataset，输出 99% claim audit，列出当前 `claimPolicy.requirements`、样本数、题目数、可硬判题、需复核题、材料类型、学科、学段、地区/教材线索、大陆区域分组、教材版本族、全国卷/新高考线索、review protocol、asset preflight 缺口和 artifact-focused 下一步目标；当 Provider OCR/文档解析、layout 或 formula 候选角色覆盖不足时，会输出 `complete_provider_role_coverage` 目标。它用于指导补样/补 artifact，不能替代正式评测。
- `npm run generate:k12-question-segmentation-review`：读取 `XUEMAI_VISION_PACKET`，生成 `XUEMAI_QUESTION_SEGMENTATION_REVIEW_OUTPUT` 指定的脱敏题目切分 QA artifact；它用于先判断题目边界、区域、crop_ref 和证据归属是否足以支持硬判，同时拒绝伪造 `pass` 状态或在复核清单等字段复制 OCR/text 内容。
- `npm run generate:k12-eval-artifacts`：读取 `XUEMAI_EVAL_ARTIFACT_MANIFEST_INPUT` 指定的 analysis-backed 资产清单，批量生成缺失的 provider trial report/question-segmentation review/annotation task/result/delivery bundle/teacher review packet/monthly report artifact，写出 `XUEMAI_EVAL_ARTIFACT_MANIFEST_OUTPUT` 并立即预检。
- `npm run generate:k12-gold-label-review-report`：读取 final gold package，生成 `XUEMAI_GOLD_LABEL_REVIEW_REPORT_OUTPUT` 指定的人工双标一致性报告；该报告不复制 reviewer values、OCR 原文或备注内容。
- `npm run generate:k12-eval-dataset`：读取 `XUEMAI_EVAL_DATASET_ASSET_MANIFEST` 指定的预检资产清单，生成 `XUEMAI_EVAL_DATASET_OUTPUT` 指定的 dataset 文件，并把同批 `claimable99AssetReady`、blockers 和每个 case 的 manifest id / final gold package path / analysis path 写入 dataset。
- `npm run generate:k12-gold-label-annotation-task`：读取 `XUEMAI_VISION_PACKET` 和可选 `XUEMAI_QUESTION_SEGMENTATION_REVIEW`，生成 `XUEMAI_GOLD_LABEL_ANNOTATION_TASK_OUTPUT` 指定的脱敏标注任务包，供 Label Studio、CVAT 或人工复核使用；任务包不能包含任何复制自 VisionEvidencePacket 的 OCR/text 内容，也不能作为 99% gold。
- `npm run generate:k12-gold-label-package`：读取人工标注工具归一化后的 annotation import 和同一份 `VisionEvidencePacket`，生成最终 gold package；传入 `XUEMAI_QUESTION_SEGMENTATION_REVIEW` 时，未通过题目切分 QA 的题不能作为 definitive gold judgement。未脱敏、未双标、未仲裁、题号/证据不对齐、跨题或错槽位证据、annotation import notes 或 gold notes 复制 OCR/text 内容时默认拒绝写入；显式 debug 草稿即使写出也不能标记为 99% claimable。
- `npm run validate:k12-eval-assets`：读取 `XUEMAI_EVAL_ASSET_MANIFEST` 指定的资产清单，在生成模型输出和跑 dataset eval 前先检查样本证据链是否可回放；报告会打印当前 strict `claimPolicy.requirements`，结构预检通过不等于 99% 可宣称，仍需查看 `claimable99AssetReady` 是否为 `yes`。Provider 试跑报告若仍为 `blocked`，annotation import 缺失或无法重建同一 final gold package，人工双标一致性报告缺失或未 ready，地区/教材只覆盖少量原始候选但缺少大陆区域分组、教材版本族或全国卷/新高考线索，Provider 候选 trace / benchmark 候选 / 来源 URL / 许可部署复核备注 / OCR-文档解析、layout、formula 角色覆盖缺失，teacher review packet 覆盖不足，或 `human_labeled` 清单中仍混有 mock/synthetic Vision source / public benchmark source dataset，都会直接阻断 99% asset readiness。
- `npm run compare:k12-model-regression`：读取 baseline/candidate 两份同 gold dataset 的模型输出，先确认 case id 集合和同 case human-gold 内容一致，再对比失败 case、指标退步、`claimable99Correctness` 是否丢失，并校验候选 analysis 仍能生成通过质量 gate 的老师报告、家长反馈、delivery bundle 和 teacher review packet。
- `npm run eval:k12-material`：读取 `XUEMAI_EVAL_DATASET` 指定的 dataset JSON，默认要求 `claimable99Correctness=yes`；正式 dataset 还必须记录同批资产预检的 `asset_preflight.claimable99AssetReady=true`，报告会打印当前 `claimPolicy.requirements`，避免把本地调试小 policy 误当成严格 99% claim gate。
- `npm run generate:k12-user-result`：读取 `XUEMAI_ANALYSIS_INPUT` 或 `XUEMAI_VISION_PACKET`，输出 `XUEMAI_RESULT_OUTPUT` 指定的最终用户可见结果。result artifact 必须包含专业测评报告章节、逐题行、家长反馈、月报纵向比较、结构化上月证据状态和来源标签，否则生成/资产预检会拒绝。
- `npm run generate:k12-delivery-bundle`：读取 `XUEMAI_RESULT_INPUT`、`XUEMAI_ANALYSIS_INPUT` 或 `XUEMAI_VISION_PACKET`，输出 `XUEMAI_DELIVERY_BUNDLE_OUTPUT` 指定的老师交付包；从 analysis 或 VisionEvidencePacket 开始时可设置 `XUEMAI_RESULT_OUTPUT` 保留中间用户结果 artifact；反馈状态优先于入档状态展示。交付包必须包含专业测评报告结构、逐题行、家长反馈、月报纵向比较、结构化 `monthly_comparison_evidence`、安全边界和来源映射，否则生成/资产预检会拒绝。
- `npm run generate:k12-teacher-review-packet`：读取 `XUEMAI_DELIVERY_BUNDLE_INPUT`，输出 `XUEMAI_TEACHER_REVIEW_PACKET_OUTPUT` 指定的老师复核包；如果还没有 delivery bundle，可改为设置 `XUEMAI_DELIVERY_BUNDLE_OUTPUT` 并传入 `XUEMAI_RESULT_INPUT`、`XUEMAI_ANALYSIS_INPUT` 或 `XUEMAI_VISION_PACKET`，命令会先补齐 delivery bundle 再生成复核包。它会列出查看详情、编辑反馈、复制反馈、标记已反馈、确认入档、补充材料、重新分析等动作，并确保动作启停和月报上月证据状态来自同一 delivery bundle，微信不会自动发送，档案不会自动写入，且老师可见报告保留 `## 证据充分性判定`。

`claimable99Correctness=yes` 同时要求：

- dataset 是 `human_labeled`。
- 双人标注、分歧仲裁、隐私脱敏均完成。
- dataset 记录了同批 `validate:k12-eval-assets` 的 `asset_preflight.claimable99AssetReady=true`。
- dataset 每个 case 保留 `asset_manifest_case_id`、final `gold_label_package_path` 和 `analysis_path`；手写 `asset_preflight` 或只用 `gold_path` 只能做本地指标调试，不能支撑正式 99% claim。
- 逐题指标达到严格阈值。
- 样本量、可硬判题、需复核题、材料类型、学科、学段、地区/教材线索、大陆区域分组、教材版本族和全国卷/新高考线索达到代表性覆盖门槛。
- 每个 case 的 Provider 试跑报告、题目切分 QA artifact、脱敏 annotation task、用户可见 result、月报、月报上月对比证据和老师交付包都能被资产清单回放校验。
- 每个真实 OCR/Vision case 的 `pipeline_trace.provider_candidates` 都记录当前选中 Provider、至少一个 fallback/benchmark 候选、来源 URL、许可/部署复核备注，以及 OCR/文档解析、layout、formula 候选角色覆盖。

后续换 OCR/Vision Provider、换大模型或改 Prompt 时，只要保持 `VisionEvidencePacket -> StudentLearningMaterialAnalysis` 合同不变，就用同一批 human-labeled dataset 生成 baseline/candidate 两份输出；baseline/candidate 必须保持相同 case id 和相同 human-gold 内容，先跑 `compare:k12-model-regression` 校验用户结果、老师确认月报 input/output、delivery bundle 和 teacher review packet，再跑正式 `eval:k12-material`。

## 设计依据

- OpenAI Structured Outputs 建议用 JSON Schema 约束模型输出，并结合 evals 验证结构是否适合业务场景：https://platform.openai.com/docs/guides/structured-outputs
- OpenAI Evals 的基本做法是为任务定义测试数据和判分标准，再反复测试 prompt 或模型版本：https://platform.openai.com/docs/guides/evals
- OpenAI Codex Skills 的官方思路是把可复用工作流封装为说明、参考资料和可选脚本，而不是只写一个长 prompt：https://developers.openai.com/codex/skills
- 结构化输出研究也指出，JSON Schema/约束解码需要评估结构合规、覆盖能力和输出质量，不能只检查“能不能返回 JSON”：https://arxiv.org/abs/2501.10868

## OCR / Vision 开源项目评估

调研时间：2026-06-19；2026-06-20 复核公开仓库信息。以下只作为 Provider 候选评估，不代表已经接入，也不能支撑 99% 正确率宣称。所有候选都必须先产出 `VisionEvidencePacket`，再通过 human-labeled dataset 回归。

| 项目 | 适合放在链路哪一段 | 主要价值 | 主要风险 / 不足 | 当前结论 |
|---|---|---|---|---|
| [PaddleOCR / PP-StructureV3](https://github.com/PaddlePaddle/PaddleOCR) | OCR、文档解析、版面、表格、公式候选 | 官方 README 描述支持 PDF/图片转 JSON/Markdown，PP-StructureV3 提供更细粒度坐标；PaddleX 也提供通用 OCR、版面解析、公式识别等产线 | 仍是通用文档解析，不等于 K12 试卷逐题切分；真实手写、批改痕迹和题号映射必须自测 | 第一候选 Provider，优先用于真实样本试跑 |
| [Docling](https://github.com/docling-project/docling) | PDF/图片/Office 文档转换、OCR、结构化文档表示 | 主仓库说明支持扫描 PDF/图片 OCR、VLM 和 CLI，适合做扫描件/PDF 结构化 baseline | 通用文档转换，不覆盖学生痕迹、老师批改归属、逐题证据准入或家长反馈 | 作为 PDF/扫描件转换对照 Provider，不作为默认生产依赖 |
| [PaddleX](https://github.com/PaddlePaddle/PaddleX) | 产线化部署、模型组合、二次开发 | 集成 OCR、目标检测、版面解析、公式识别等模型产线，支持本地推理、服务化部署和二次开发 | 引入成本高于纯 mock；需要确认部署环境、模型许可和性能 | 作为 PaddleOCR 生产化/二次开发入口评估 |
| [Pix2Text](https://github.com/breezedeus/Pix2Text) | 数学公式、表格、复杂版面转 Markdown | 目标是识别 layout、table、math formula、text 并整合 Markdown；中文/英文识别依赖 CnOCR | 更偏文档转写，不负责学生作答正误和老师批改语义；需验证中文 K12 手写公式 | 数学材料的公式识别和 Markdown 对照候选 |
| [UniMERNet](https://github.com/opendatalab/UniMERNet) | 数学公式识别 | 公开论文/仓库定位为真实场景数学表达式识别，数据、模型和代码可作为公式 OCR 专项参考 | 只覆盖数学表达式识别，不处理整页题目切分、学生作答归属、批改痕迹和家长反馈 | 作为数学公式识别专项候选，进入对照评测前仍需 adapter 输出 `VisionEvidencePacket` |
| [LaTeX-OCR / pix2tex](https://github.com/lukas-blecher/LaTeX-OCR) | 公式图片转 LaTeX | 适合把局部公式 crop 转为 LaTeX，便于数学题干/答案依据结构化 | 不负责中文题干 OCR、整页 layout、题号映射和手写批改；公式结果仍需置信度和人工复核 | 可作为公式 crop 的轻量对照候选 |
| [CnOCR](https://github.com/breezedeus/CnOCR) | 中文/英文文字 OCR | 提供中文/英文 OCR，模型按 scene/doc/number/general 场景区分，适合快速中文文本识别试验 | 不负责复杂题目切分、批改痕迹归属和版面结构 | 可作为轻量 OCR baseline 或 Pix2Text 依赖观察项 |
| [RapidOCR](https://github.com/RapidAI/RapidOCR) | 轻量部署 OCR | 支持 ONNX Runtime、OpenVINO、Paddle、TensorRT、PyTorch 等后端，安装和调用简单 | 主要解决 OCR 部署，不解决 K12 题目结构和证据准入 | 可作为低成本 OCR baseline / 部署候选 |
| [Surya](https://github.com/datalab-to/surya) | OCR、layout、reading order、table | 输出 block、bbox、polygon、reading_order、confidence 等，和 `VisionEvidencePacket` 字段契合 | 模型权重有商业使用限制；v2 需要 VLM 推理后端，部署成本需评估 | 作为对照 Provider，适合验证 polygon/reading order schema |
| [MinerU](https://github.com/opendatalab/MinerU) | PDF/图片/DOCX/PPTX/XLSX 文档解析 | 输出 Markdown/JSON，支持公式、表格、阅读顺序、OCR、可视化结果和本地部署 | 面向通用复杂文档；对学生手写、批改痕迹、逐题归因仍需自定义 adapter | 长文档/PDF 解析候选，不作为第一版唯一依赖 |
| [Marker](https://github.com/datalab-to/marker) | PDF/图片转 Markdown/JSON、OCR-only、block 提取 | 支持 PDF/图片/PPTX/DOCX/XLSX 等转 Markdown/JSON，可输出 block 结构，OCR-only 可保留字符和 bbox | GPL-3.0 和模型商业许可需要审查；LLM 增强模式会增加不确定性 | 适合离线对照与复杂 PDF 解析实验，不作为默认生产依赖 |
| [MonkeyOCR](https://github.com/Yuliang-Liu/MonkeyOCR) | 中英文文档解析、公式/表格/文本识别 | 采用结构-识别-关系范式，输出 Markdown、layout PDF 和中间 block JSON；README 声称中英文文档表现较强 | 仍是通用文档解析；模型部署资源、输出稳定性、商业许可和 K12 手写样本需验证 | 可作为下一轮 document parser 对照 Provider |
| [olmOCR](https://github.com/allenai/olmocr) | PDF 线性化、复杂版面文本化 | Apache-2.0，面向 PDF/image-based document 到可读纯文本，适合大规模文档线性化 benchmark | 更偏英文/通用 PDF 线性化，不负责题目切分、学生痕迹归属和中文 K12 语义 | 可作为 PDF reading-order 对照，不放第一优先级 |
| [DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR) | 文档 OCR / 光学压缩模型 | 可作为外部 OCR/Vision Provider 候选之一，需通过 adapter 产出结构化证据 | 与本项目 DeepSeek 文本推理边界不同；不能让文本推理模型直接读图，且部署依赖 vLLM/CUDA 环境 | 暂只记录为候选，不接入 MVP |
| [dots.mocr](https://github.com/rednote-hilab/dots.mocr) | 多模态文档解析、layout、公式、表格和 reading order | 主仓库说明可输出 layout 类别、bbox、公式 LaTeX、表格 HTML 和 reading-order，适合作复杂试卷/讲义结构对照 | VLM 文档解析不是学生作答归属、老师批改归属或正误判断；模型许可、部署成本和隐私边界需复核 | 加入 Provider benchmark-only trace，用于真实样本试跑和回归对照 |
| [DocLayout-YOLO](https://github.com/opendatalab/DocLayout-YOLO) | 版面检测 | 实时文档 layout detection，支持 bbox 类输出，可用于训练/对照版面检测 | AGPL-3.0 许可需要商业合规审查；只做 layout，不做 OCR/题目语义 | 仅作研究/benchmark 或离线实验候选 |
| [LayoutParser](https://github.com/Layout-Parser/layout-parser) | 版面分析工具箱 | Apache-2.0，提供统一 layout 数据结构、模型 API、OCR 区域处理工具 | 维护较旧；模型和 K12 题目样式需另行验证 | 可用于离线标注/数据工具，不作为核心 Provider |
| [docTR](https://github.com/mindee/doctr) | 文档 OCR、文字检测与识别 | PyTorch OCR 工具链，支持 PDF/图片输入，输出 page/block/line/word 等层级结构和 JSON，可作为 OCR baseline | 中文 K12、手写答案和批改痕迹需要单独验证；不提供本项目所需的题目证据准入和教育语义 | 可作为 OCR baseline/对照 Provider，低优先于 PaddleOCR/PaddleX |
| [MMOCR](https://github.com/open-mmlab/mmocr) | OCR 训练/评测工具箱 | OpenMMLab 工具箱，支持文本检测、识别和 KIE，下游可定制 | 工程栈较重，偏模型训练与研究，不直接提供 K12 题目分析 | 后续若需要自训练 OCR/检测模型再评估 |

调研判断：

- 没有发现可以直接替代本 Skill 的“中国大陆 K12 试卷/作业逐题分析”开源项目。
- 可复用的是 OCR、layout、formula、table、reading order、bbox/polygon、confidence 等基础能力。
- 题目切分、学生作答归属、老师批改归属、答案/评分点按 `question_id` 对齐、证据不足拒判和老师复核，仍必须由本项目的 `VisionEvidencePacket`、`question-evidence-readiness` 和 human gold dataset 控制。
- 接真实 Provider 时不要把 Provider 原始 JSON 直接传给 DeepSeek；必须先写 adapter 归一化为 `VisionEvidencePacket`，并保存 provider、model version、stage trace、bbox/polygon、crop_ref、confidence 和 risk_flags。

2026-06-20 复核补充：

- GitHub API 对 `试卷 OCR PaddleOCR`、`题目切分 OCR`、`exam paper OCR question segmentation` 的直接搜索没有发现可用垂直仓库；`homework correction OCR education` 和 `answer sheet OCR education` 只命中小型口算批改、答题卡/OMR 或自动评分 demo，不能覆盖本 Skill 的中国大陆 K12 学习材料证据链。
- PaddleOCR/PaddleX 仍是第一真实 Provider 候选：公开仓库显示 PaddleOCR 继续更新 OCR、PP-StructureV3、PaddleOCR-VL 和 JSON/Markdown 输出；PaddleX 提供通用 OCR、文档图像预处理、版面解析、表格识别和公式识别等产线。
- MinerU、Pix2Text、UniMERNet、LaTeX-OCR、docTR、DocLayout-YOLO 和 EduNLP/EduData 更适合作为专项或对照链路：分别覆盖复杂文档解析、公式/Markdown 转写、数学表达式识别、OCR baseline、layout detection、教育题目文本/公开教育数据参考，但都不覆盖“学生痕迹 + 老师批改 + 逐题证据准入 + 家长反馈”的完整闭环。
- Label Studio/CVAT 适合作为 human gold dataset 上游标注台，但其导出只算工作文件，必须转为 `student_learning_material_gold_label_annotation_import.v0.1`，再生成双标、仲裁、脱敏、可回放且 source-aware validation 通过的 gold package。

### 中文 K12 公开评测 / 推理项目参考

以下项目更适合作为评测口径、题型覆盖和专项数学推理参考，不能替代本项目的真实脱敏 human gold dataset。

| 项目 | 可参考内容 | 不足 / 风险 | 当前结论 |
|---|---|---|---|
| [CMMU](https://github.com/flageval-baai/CMMU) | 中文多模态多学科评测，覆盖数学、生物、物理、化学、地理、政治、历史，小学到高中 | 公开 benchmark 题不等于学生作答材料，缺少订正、批改和老师复核链路 | 可参考多学科评测结构和题型拆分，不纳入产品 gold |
| [K12Vista](https://github.com/lichongod/K12Vista) | 中文 K12 多模态 benchmark、过程评价数据和人工标注 K12 过程评价 benchmark | 公开 benchmark 不等于真实学生作答、订正和老师批改材料；也不能验证家长反馈安全 | 可参考学科/学段/题型覆盖和过程评价字段，不纳入产品 gold |
| [OCRBench / MultimodalOCR](https://github.com/Yuliang-Liu/MultimodalOCR) | OCR、文档解析和多模态 OCR benchmark | 不是中国大陆 K12 已作答学习材料集，缺少老师复核和入档链路 | 可参考 OCR/文档解析评测拆分，不替代 Provider trial report 或 human gold |
| [CMMaTH](https://arxiv.org/abs/2407.12023) | 中文 K12 多模态数学题，含视觉元素、知识点和标准解答 | 需确认数据/代码实际可获得性与许可；仍不是学生材料分析 | 可参考数学知识点与多模态题型标注字段 |
| [CMM-Math](https://arxiv.org/abs/2409.02834) | 1-12 年级中文多模态数学样本、题型和详细解答 | 公开题存在模型污染风险；不含真实学生答案和批改痕迹 | 可参考年级覆盖和数学题型覆盖，不替代 human gold |
| [MWPToolkit](https://github.com/LYH-YF/MWPToolkit) | 数学应用题求解数据处理、baseline 和评测框架 | 偏研究型解题，不处理 OCR、错题照片和老师反馈 | 作为数学 word problem 评测/数据处理参考 |
| [Confucius3-Math](https://arxiv.org/abs/2506.18330) | 中文 K12 数学推理开源模型/代码 | 更换推理模型必须跑同一 human-labeled regression；不能绕过 VisionEvidencePacket 边界 | 暂记录为未来专项数学模型候选 |
| [Ape210K](https://arxiv.org/abs/2009.11506) | 原论文声称中文小学数学应用题大规模数据 | arXiv 页面显示论文已撤回，原因是数据集不公开，实验不可复现 | 作为不可复现风险案例，不用于评测 |

### Human Gold Dataset 标注工具候选

以下工具只用于真实脱敏样本的人工标注、复核和质检协作。它们不能直接替代 `student_learning_material_gold_label_package.v0.1`，最终进入评测链路的仍必须是已脱敏、双标、仲裁后的 gold package。

| 项目 | 适合放在链路哪一段 | 主要价值 | 主要风险 / 不足 | 当前结论 |
|---|---|---|---|---|
| [Label Studio](https://github.com/HumanSignal/label-studio) | 多类型数据标注、人工 gold 生成前台 | 支持文本、图片、音频、视频、时序等多类型标注，可本地部署并导出多种格式，适合做题目级标签、正误标签、证据充足性标签和家长反馈安全标签 | 导出格式需要再转换为本项目 gold package；双标/仲裁规则要由项目流程约束 | 第一候选标注台，优先试做脱敏样本标注模板 |
| [CVAT](https://github.com/cvat-ai/cvat) | 题目区域、bbox/polygon、crop_ref 质检 | 自托管视觉数据标注平台，支持图片/视频/3D、团队协作、QA、SDK/API，适合题目切分、学生作答区域、批改痕迹区域的人工框选和复核 | 更偏视觉区域标注，不负责教育语义标签；部分 serverless 资产和依赖需单独审查 | 与 Label Studio 互补，用于视觉区域 gold 和 OCR/Layout 对齐质检 |
| [X-AnyLabeling](https://github.com/CVHub520/X-AnyLabeling) | 离线图像标注、OCR/document parsing 辅助标注 | 支持矩形、旋转框、多边形、四边形、文本检测/识别、KIE、OCR、document parsing 等标注形态，可本地处理图片 | GPL-3.0 许可不适合作为默认生产依赖；更适合单机离线标注实验 | 仅作为离线标注对照或快速试验工具 |

标注链路要求：

- 原始图片和学生隐私材料不进入公开 eval JSON。
- 标注工具导出的 bbox/polygon、题号、学生作答、老师批改和答案依据，必须先归一化为 `student_learning_material_gold_label_annotation_import.v0.1`，再转换成 `VisionEvidencePacket` 与 gold package 可交叉校验的字段；若 final gold package 复验发现跨题 evidence ref、证据槽位类型错误或仲裁硬判缺 reviewer basis，该 annotation import 不能算转换成功。进入资产预检后，annotation import 重建结果必须与 final gold package 的人工标签、标注员元数据、逐题 evidence basis、仲裁结果和仲裁员元数据完全一致，避免只保持 `adjudicated_gold` 一致却替换人工标注来源。
- 缺仲裁的 annotation draft 只能作为人工标注中间态，不能让生成命令或资产预检显示 `claimable99Correctness=yes`。
- 每个 case 至少两名标注员独立标注；分类、逐题正误、证据充足性、知识点或错因存在分歧时必须仲裁。
- 标注工具只负责采集人类标签；`validate:k12-gold-labels` 和 `validate:k12-eval-assets` 才是进入 99% 验收前的工程 gate。

### Provider Adapter 输入规范

真实 OCR/Vision/Layout Provider 输出先进入 `src/skills/student-learning-material-analyzer/vision-adapter.ts`，再生成 `VisionEvidencePacket`。

Adapter 当前要求 Provider 至少提供：

```text
provider
providerRunId
providerModelVersion
materialId / sourceMaterialId
studentId / teacherId / tenantId
pages[]
questions[]
questions[].regions[]
questions[].evidences[]
```

归一化规则：

- 生成 `VisionEvidencePacket` 之前，先运行 `validateExternalVisionAdapterInput`；缺少 provider/model/material/student 元数据、page/question 为空、重复 ID、helper template 占位符、非法 bbox/polygon、跨题 evidence 归属、孤立 page/region 引用或非法 confidence 时直接拒绝写入。
- `pages[]` 保存页图引用、宽高、质量置信度和质量风险。
- `questions[].regions[]` 保存题目区域、bbox/polygon、`crop_ref`、region confidence。
- `questions[].evidences[]` 保存题干、学生答案、订正/过程、学生笔记、老师批改、标准答案/评分点等证据。
- Adapter 自动生成稳定 `evidence_ref`，补齐 `pipeline_trace`，并计算 `image_quality`、`student_trace`、`question_segmentation`、`answer_key` 四类基础 gate。
- `validateVisionEvidencePacket` 会校验 page/question/region/evidence/gate/trace 的交叉引用；重复证据引用、孤立题目/页面/区域引用、gate 指向不存在证据或 trace output 指向不存在对象时，不能进入文本推理。
- `pipeline_trace.provider_candidates` 会记录当前选中 Provider、PaddleOCR/PaddleX 第一候选、Pix2Text/Surya/MinerU 等 benchmark 或专项候选，以及许可/部署复核提醒，避免换 Provider 时丢失评估依据。
- 没有学生痕迹时，材料状态进入 `insufficient_student_trace`，不能推断学生能力。
- 有 bbox/polygon 但缺 `crop_ref` 时，结构校验可以通过，但逐题 readiness 必须进入老师复核，不能做确定性正误判断。
- 换 Provider、模型版本、Prompt 或 schema 后，必须用同一批 human-labeled dataset 重跑 `validate:k12-eval-assets` 和 `eval:k12-material`。

可回放文件链路：

```bash
XUEMAI_EVAL_CASE_PACKAGE_DIR=/absolute/path/to/case-dir \
XUEMAI_EVAL_CASE_ID=case-001 \
XUEMAI_EVAL_CASE_DATASET_ID=real-provider-pilot \
npm run generate:k12-eval-case-package
```

该命令先生成真实样本 case package scaffold，只约定路径和命令顺序，不复制原始学生图片或未脱敏材料。它会额外写出 `provider/external-vision-input.template.json`，用于提示真实 OCR/Layout/Vision Provider 输出如何映射到 `provider/external-vision-input.json`，并提醒后续 `VisionEvidencePacket.pipeline_trace.provider_candidates` 必须覆盖 OCR/文档解析、layout 和 formula 候选角色、来源 URL 与许可/部署复核备注；这个 template 只是 helper，不进入 asset manifest，也不能作为 99% 证据。后续命令都应把输出写入该 package 约定的 artifact 路径。

```bash
XUEMAI_EVAL_CASE_PACKAGE_READINESS_DIR=/absolute/path/to/case-dir \
npm run inspect:k12-eval-case-package
```

每补齐一个 artifact 后都可以跑这个检查。它会告诉当前最早被阻断的输入或下一条可执行命令，并保持 `claimable99_from_case_package=false`，避免把 scaffold、半成品 artifact 或缺失人工标注的样本误当作 99% 证据。

```bash
XUEMAI_EXTERNAL_VISION_INPUT=/absolute/path/to/external-vision-input.json \
XUEMAI_VISION_PACKET_OUTPUT=/absolute/path/to/vision-packet.json \
npm run generate:k12-vision-packet
```

生成的 `vision-packet.json` 再进入：

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/vision-packet.json \
XUEMAI_PROVIDER_TRIAL_REPORT_OUTPUT=/absolute/path/to/provider-trial-report.json \
npm run generate:k12-provider-trial-report
```

Provider 试跑报告不包含原始 OCR 全文、normalized text 或复制 OCR/text 内容。它只汇总真实 Provider 候选、gate 状态、题目切分计数、逐题 readiness、阻断项、warning 和下一步；设置 `XUEMAI_PROVIDER_TRIAL_REPORT_REQUIRE_READY=1` 时，只有报告达到 `ready_for_human_labeling` 才允许写出。这个报告用于在人工标注和 99% 资产预检前发现 Provider 输出缺页、缺 crop_ref、缺学生作答、缺答案依据或低置信证据；资产预检会把 `blocked` Provider trial case 作为 `claimable99AssetReady` 阻断项，也会把缺少当前 Provider primary_candidate、benchmark/open-source 候选或许可/部署复核备注的 case 作为 99% readiness blocker，并拒绝任何从同一 `VisionEvidencePacket` 复制进报告自由文本的 OCR/text 内容。校验器拿到同一份 `VisionEvidencePacket` 时，还会重算 packet-derived Provider trial report，核对 readiness、summary、blockers、warnings、next steps、Provider candidates 和逐题 segmentation/readiness，防止把缺 crop_ref、需复核或 blocked 的真实 Provider 输出手工改绿。

更换 OCR/Vision Provider 或其配置前，还要保留同一材料的 baseline/candidate Provider 试跑报告并运行：

```bash
XUEMAI_BASELINE_PROVIDER_TRIAL_REPORT=/absolute/path/to/baseline-provider-trial-report.json \
XUEMAI_CANDIDATE_PROVIDER_TRIAL_REPORT=/absolute/path/to/candidate-provider-trial-report.json \
npm run compare:k12-vision-provider-regression
```

该比较只看 OCR/Vision 证据层，不调用文本推理模型。candidate 丢失页面或题目、减少总证据数、减少全局或同题学生作答/订正/批改等学生痕迹证据、减少全局或同题答案或评分依据证据、重排题目顺序、改变同一 `question_id` 的页码或题号身份、减少题目切分通过数或可硬判题数、增加缺 crop_ref/低置信/孤儿证据/需老师复核/blocked 题，或让同一题 segmentation、readiness、confidence 退步，都会被视为 Provider 回归。

同一份 `vision-packet.json` 还要进入题目切分 QA：

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/vision-packet.json \
XUEMAI_QUESTION_SEGMENTATION_REVIEW_OUTPUT=/absolute/path/to/question-segmentation-review.json \
npm run generate:k12-question-segmentation-review
```

题目切分 QA artifact 不包含原始 OCR 文本，也不能在人工复核清单等自由文本中复制 OCR/text 内容。它只保留题号、页码、区域、几何/crop_ref、证据类型计数、风险和人工复核清单；只有 `pass` 题目才能进入 definitive gold judgement，其他题目应标为证据不足或老师复核预期。

通过题目切分 QA 后，先生成给人工标注台使用的脱敏任务包：

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/vision-packet.json \
XUEMAI_QUESTION_SEGMENTATION_REVIEW=/absolute/path/to/question-segmentation-review.json \
XUEMAI_GOLD_LABEL_ANNOTATION_TASK_OUTPUT=/absolute/path/to/annotation-task.json \
npm run generate:k12-gold-label-annotation-task
```

标注任务包本身不是 gold，只是把题号、区域、crop_ref、证据 ref、题目切分状态和 annotation import skeleton 交给 Label Studio、CVAT 或人工复核。标注完成并转成 final gold package 后，先生成双标一致性报告：

```bash
XUEMAI_GOLD_LABEL_PACKAGE=/absolute/path/to/gold-label-package.json \
XUEMAI_VISION_PACKET=/absolute/path/to/vision-packet.json \
XUEMAI_GOLD_LABEL_REVIEW_REPORT_OUTPUT=/absolute/path/to/gold-label-review-report.json \
npm run generate:k12-gold-label-review-report
```

双标一致性报告记录 reviewer 数、label 数、分歧数量、一致率和仲裁状态；真实样本要同时传入同源 `XUEMAI_VISION_PACKET`，让报告生成阶段复验 gold package 身份、题目覆盖/顺序和逐题 evidence basis 是否与同一份 VisionEvidencePacket 对齐，并确认 student trace、answer/rubric、teacher correction 槽位使用的 packet evidence_type 正确。`adjudicated_gold` 的可硬判题不能脱离 reviewer basis，必须仍有学生痕迹和答案/评分点或老师批改依据。分歧值只保留哈希，不复制 OCR 原文、人工备注或学生作答内容。未完成仲裁、跨题 evidence ref、wrong-type basis ref 或 unsupported adjudicated hard judgement 的报告不能进入 99% readiness。

之后再进入：

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/vision-packet.json \
XUEMAI_ANALYSIS_OUTPUT=/absolute/path/to/analysis.json \
npm run generate:k12-analysis-output
```

最后由 `analysis.json` 或 `vision-packet.json` 生成用户可见老师报告、家长反馈和月报结果。这个链路用于真实 Provider 样本、人工 gold dataset 和模型/Provider 回归评测；不能用单个 synthetic fixture 或 mock Vision source 支撑 99% 宣称。

## Skill 构建流程

### 1. 材料准入

先判断材料能不能分析。

可分析：

- 学生试卷。
- 学生作业。
- 错题照片。
- 错题本。
- 老师批改后的练习。
- 订正记录。
- 学生笔记。
- 老师粘贴的学生答案或错题内容。

不可作为学生能力证据：

- 空白试卷。
- 纯教材内容。
- 老师 PPT。
- 老师教案。
- 泛泛教学资料。
- 无学生作答、无订正、无批改、无练习痕迹的材料。

进一步的证据边界：

- 只有学生笔记但没有题目、学生作答、答案/评分点或老师批改依据，只能生成复核草稿，不能生成正式测评结论。
- 只有老师批改痕迹但缺少学生原始作答、订正内容或解题过程，也只能生成复核草稿，不能生成确定性正误或家长可发送反馈。

材料状态：

```text
valid_student_material
insufficient_student_trace
blank_template
teacher_resource
low_quality
needs_review
```

只有 `valid_student_material` 可以进入完整分析。其他状态只能提示老师补材料或进入人工确认。

### 2. 识别与结构化

图片、PDF、手写、题目区域、批改痕迹必须先由 Vision/OCR/Layout 模块处理，生成结构化证据包。文本推理模型只消费结构化文本和证据引用。

识别目标：

- 材料类型：试卷、作业、错题、周测、月考、阶段测验等。
- 地区/教材线索：能判断则记录，不能判断则不猜；确定性预分类器覆盖大陆省级行政区、常见省会/重点城市线索、全国卷/新高考卷种，以及常见教材版本线索。多地区或多教材版本同时出现时，必须降置信并进入老师/标注复核。
- 学段年级：小学、初中、高中，年级能判断则记录。
- 科目：语文、数学、英语、物理、化学、生物、历史、地理、道德与法治等。
- 题目结构：题号、题型、题干、选项、图表、学生答案、老师批改、订正、分值、得分。
- 证据引用：每个题目、答案、批改痕迹、订正痕迹都要有稳定 `evidenceRef`。
- 评测口径：`materialClassificationAccuracy` 必须同时校验材料类型、科目、学段、年级候选和地区/教材线索，不能只用前三项代替完整分类准确率。

最低识别要求：

```text
page_id
question_id
evidence_type
text 或 normalized_text
bbox 或 polygon
crop_ref
confidence
```

低于识别阈值的证据不能支撑确定性结论。只有 bbox/polygon 但没有 `crop_ref` 的视觉证据，可以作为待复核线索，但不能支撑确定性正误判断。

### 3. 逐题分析

每题输出：

- 题号。
- 题型。
- 题干摘要。
- 学生答案。
- 标准答案或评分点来源。
- 老师批改痕迹。
- 正误判断：正确、部分正确、错误、无法判断、需老师确认。
- 扣分点或错误点。
- 知识点。
- 能力维度。
- 错因分类。
- 可追回分。
- 置信度。
- 证据引用。
- 需老师确认项。

正误判断规则：

```text
有标准答案或评分点 -> 可判正误。
有清晰老师批改 -> 可参考老师批改。
外部答案/评分点明确映射到本题 question_id -> 可作为本题答案依据。
答案/评分点缺失 -> 降级为需老师确认。
学生答案识别不清 -> 不判。
题干识别不完整 -> 不判。
步骤题缺评分点 -> 不给确定性扣分，只描述可疑问题。
```

错因不能乱推。没有过程证据时，不能写“粗心”“不认真”“概念混淆”。只能写：

```text
从本题可见，答案中缺少/错误使用了某个条件或步骤；具体原因需结合老师课堂观察确认。
```

### 4. 汇总成专业测评型学情报告

老师版报告不是聊天摘要，而是可检查、可追溯、可沉淀的专业测评结果。

模板如下：

1. 报告基本信息
   - 学生
   - 年级
   - 科目
   - 材料类型
   - 材料时间
   - 分析时间
   - 识别可信度
   - 报告状态：待反馈、已反馈、待入档、已入档、需补充材料、证据不足

2. 材料识别概览
   - 本次材料属于什么类型。
   - 共识别多少页、多少题、多少道可分析题。
   - 多少题可确定判断，多少题需老师确认。
   - 是否包含批改、订正、错题标记、得分。

3. 总体表现结论
   - 本次表现一句话判断。
   - 主要优势 1-3 条。
   - 主要问题 1-3 条。
   - 第一优先关注点。
   - 本结论可信度。

4. 得分与完成情况
   - 总分/得分，若可识别。
   - 题型得分情况，若可识别。
   - 可追回分区间，若评分点足够。
   - 不足以计算分数时明确说明。

5. 逐题分析表
   - 题号。
   - 题型。
   - 正误。
   - 关键错误。
   - 对应知识点。
   - 能力维度。
   - 错因分类。
   - 建议订正方式。
   - 证据。
   - 置信度。

6. 知识点掌握情况
   - 稳定掌握。
   - 基本掌握但易错。
   - 明显薄弱。
   - 无法判断。

7. 能力维度画像
   - 审题与信息提取。
   - 基础知识调用。
   - 解题方法与步骤。
   - 计算/书写/表达规范。
   - 综合迁移。
   - 自我检查与订正。

8. 错误模式聚类
   - 高频错误模式。
   - 代表题目。
   - 可能影响。
   - 干预建议。
   - 是否需要老师确认。

9. 学习风险与复发点
   - 哪些错误容易在同类题复发。
   - 哪些场景下容易出现。
   - 下次课如何验证。

10. 近期巩固建议
   - 不做每日任务表。
   - 只给 1-3 个优先方向。
   - 每个方向要有验证方式。

11. 月报沉淀建议
   - 是否加入本月素材池。
   - 本次可作为月报证据的结论。
   - 不适合进入月报的待确认结论。
   - 对本月趋势指标的影响。

12. 家长反馈草稿
   - 可直接复制微信。
   - 温和、具体、不过度焦虑。
   - 不承诺提分。
   - 不暴露内部证据字段。

13. 证据与边界
   - 可用证据。
   - 缺失证据。
   - 低置信度题目。
   - 老师需确认项。

### 5. 家长反馈评语

家长版只输出一段可直接复制的微信反馈，不输出复杂表格。

结构：

```text
孩子这次在【材料/主题】中的整体表现是……
比较好的地方是……
目前需要继续关注的是……
接下来我们会重点做……
家里配合上可以……
```

禁止：

- 严重。
- 很差。
- 完全不会。
- 不认真。
- 基础很差。
- 保证提分。
- 一定提高。
- 孩子不行。
- 家长必须。

推荐表达：

- 这次材料显示……
- 目前更需要关注……
- 后续会先把……稳定下来。
- 建议先看过程是否完整，不急着只看速度。

### 6. 月报纵向对比承接

每次试卷/作业分析都要沉淀一份“月报指标快照”，否则月底无法可靠做纵向比较。

月报素材字段：

```text
source_analysis_id
student_id
month
subject
material_type
material_date
score_summary
question_count
analyzable_question_count
knowledge_points
ability_dimensions
error_patterns
main_progress_signal
main_issue_signal
first_priority_action
parent_visible_summary
teacher_only_notes
confidence_level
evidenceRefs
teacher_confirmed
```

月报纵向对比字段：

```text
previous_month_snapshot
current_month_snapshot
trend_by_knowledge_point
trend_by_ability_dimension
trend_by_error_pattern
new_issues
improved_issues
repeated_issues
confidence_change
teacher_interpretation
parent_readable_comparison
```

月报评价口径：

- 和上月相比，哪些能力更稳定。
- 哪些问题重复出现。
- 哪些问题是本月新增。
- 哪些问题证据不足，不做趋势判断。
- 本月下一个最优先动作是什么。

实现边界：

- `analyze_learning_evidence` 只能输出 `teacher_confirmed = false` 的候选快照。
- 老师确认入档后，系统生成确认快照副本，再进入月报素材池。
- `monthly_report` 可聚合确认快照、已确认学习记录、已确认家长反馈和老师备注；未确认、非本学生、非本月素材必须过滤。
- 没有本月任何确认素材时，月报显示依据不足，不生成表现变化结论。
- 有学习记录/反馈/备注但没有学习材料快照时，可以形成服务型月报草稿，但逐题和知识点趋势必须显示依据不足。
- 缺少上月确认素材或上月确认月报时，纵向比较只输出证据不足说明，不写强趋势判断。
- 月报 output 不能只校验素材数量：`evidence_timeline` source ids 必须与 `monthly_report_input_path` 的当前月确认来源按生成排序一致；`comparison_evidence.previous_month_source_ids` 必须与上月确认来源和可回放 `previous_report.evidence_timeline` 去重结果一致。
- `comparison_evidence.previous_month_source_count` 必须和可回放、非空、去重后的 `previous_month_source_ids` 一致；若状态为 `missing`，不能携带上月来源 ID，也不能标记 `previous_month_report_used`。
- 作为上月基线的 `previous_report` 必须自身通过月报输入校验：学生和上月标签匹配，`readiness.source_count`、`comparison_evidence.current_month_source_count` 与 `evidence_timeline` 数量一致，`comparison_evidence` 不能在 `missing` 状态携带上月来源，家长可见文案不能包含禁用表达。

家长可读纵向比较示例：

```text
和上个月相比，孩子在订正后的步骤补充上更主动一些，这是一个积极变化。本月还需要继续关注的是审题时关键信息提取的稳定性，尤其是条件较多的题目。下个月我们会先把“圈条件-列步骤-回看答案”的流程固定下来。
```

### 7. 模型可替换设计

不要把 Skill 绑死到某一个大模型。

固定不变：

- 输入证据包 Schema。
- 输出报告 Schema。
- 准入规则。
- 置信度规则。
- 安全表达规则。
- 评测集。
- 老师确认流程。

可替换：

- OCR/Vision Provider。
- 文本推理模型。
- 结构化输出能力。
- 安全检查模型。

模型适配层：

```text
ModelAdapter
  - provider
  - model
  - supports_json_schema
  - supports_strict_schema
  - max_context
  - call()
  - normalize_output()
  - validate_output()
  - retry_with_repair()
```

如果模型支持严格 JSON Schema，就直接要求结构化输出。若模型不支持，则必须走：

```text
模型输出 -> JSON parse -> schema validate -> evidence coverage check -> safety check -> repair retry -> 仍失败则进入老师确认
```

### 8. 评测集设计

要接近 99% 目标，必须先建立评测集。

最小评测维度：

- 地区：至少覆盖多个省市常见试卷风格。
- 学段：小学、初中、高中。
- 学科：数学、语文、英语、物理、化学、生物、历史、地理、道德与法治。
- 类型：试卷、作业、错题、错题本、周测、月考。
- 图片质量：清晰、轻微倾斜、阴影、手写较乱、批改痕迹复杂。
- 题型：选择、填空、计算、解答、阅读、作文、实验、图表。

每条评测样例需要人工标注：

- 材料类型。
- 科目。
- 年级/学段。
- 题目切分。
- 关键证据的题内 region 归属。
- 学生答案。
- 标准答案或评分点。
- 正误。
- 知识点。
- 错因。
- 是否允许系统确定判断。
- 家长反馈是否合格。

核心指标：

```text
material_classification_accuracy
subject_classification_accuracy
question_segmentation_accuracy
student_answer_extraction_accuracy
correction_mark_extraction_accuracy
correctness_judgement_accuracy
knowledge_mapping_accuracy
mistake_diagnosis_accuracy
unsafe_feedback_rate
overclaim_rate
unsupported_definitive_judgement_rate
teacher_review_routing_recall
```

99% 目标优先放在：

```text
unsupported_definitive_judgement_rate 接近 0
unsafe_feedback_rate 接近 0
高置信题目的 correctness_judgement_accuracy >= 99%
```

比“所有题都自动判对”更重要的是：不该判的时候必须拦住。

## MVP 切口

第一版不要覆盖所有地区和所有题型。建议先做：

```text
初中数学 / 英语
清晰图片或 PDF
有学生作答
有标准答案或老师批改
输出老师学情报告 + 家长微信反馈
可加入月报素材
老师确认后入档
```

当 MVP 评测稳定后，再扩展到更多学科和复杂题型。
