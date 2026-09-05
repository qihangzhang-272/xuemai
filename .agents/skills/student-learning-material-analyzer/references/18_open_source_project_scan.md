# Open Source Project Scan

调研日期：2026-06-19。

补充调研日期：2026-06-20。

本轮网页复核：2026-06-20。主要查看 PaddleOCR、Docling、MinerU、dots.mocr、Pix2Text、RapidOCR、Surya、CnOCR、DocLayout-YOLO、LayoutParser、LaTeX-OCR、UniMERNet、Label Studio、CVAT、K12Vista、OCRBench 等主仓库和项目说明，并补做试卷/作业题目切分相关关键词搜索。

本页记录与中国大陆 K12 学习材料分析相关的开源项目候选。结论只用于 Provider Adapter、评测资产和 human gold dataset 设计参考，不代表已经接入，也不能支撑 99% 正确率宣称。

## Non-Negotiable Boundary

- 没有发现可以直接替代本 Skill 的开源系统。开源项目可复用的是 OCR、版面、公式、表格、reading order、bbox/polygon、公开评测格式等局部能力。
- 真实 OCR/Layout/Vision Provider 必须先归一化为 `VisionEvidencePacket`，再交给文本推理模型。不能把原始图片、PDF、bbox、crop_ref 或 provider 原始 JSON 直接交给 DeepSeek 文本推理模型。
- 公开 benchmark 不能替代本项目的 human-labeled dataset。公开题库多是标准题或模型评测题，不包含真实学生作答、订正、老师批改和教培老师复核链路。
- 许可、模型权重商业使用限制、部署资源、隐私和数据出境风险，必须在接入前单独复核。

## OCR, Layout, Formula, Document Parsing Candidates

| Project | Useful For | Fit | Risk |
|---|---|---|---|
| PaddleOCR / PP-StructureV3 | OCR、PDF/图片文档解析、坐标、表格、公式候选 | 第一优先级 Provider 候选。其 README 明确面向 PDF/图片转 JSON/Markdown，并提供细粒度坐标能力。 | 通用文档解析不等于 K12 逐题切分；手写答案、批改归属和题号映射必须另测。 |
| Docling | PDF/图片/Office 文档转换、OCR、结构化文档表示 | 适合作为 PDF/扫描件文档转换 baseline，尤其用于对照版面、阅读顺序和表格结构输出。 | 通用文档转换不是学生学习材料分析；缺少学生痕迹、老师批改、题号映射和证据准入语义。 |
| MinerU | PDF/图片/Office 文档解析、Markdown/JSON、公式/表格/阅读顺序 | 适合复杂 PDF 和长文档对照。 | 通用文档解析，不能负责学生能力判断；本地部署资源和模型许可要复核。 |
| MonkeyOCR | 中英文文档解析、版面/文字/公式/表格关系候选 | 适合复杂版面和中英文材料的对照试跑。 | 模型使用条款、部署资源和 K12 手写/批改归属仍需单独验证。 |
| olmOCR | PDF / image-based document 线性化、Markdown reading order | 适合 PDF 扫描件阅读顺序和文档线性化 baseline。 | 更偏通用 PDF 文档；不负责中文 K12 学生痕迹、老师批改和逐题 evidence readiness。 |
| DeepSeek-OCR | 外部 OCR/Vision Provider 候选 | 适合纳入 Provider 候选 trace 做文档 OCR 对照。 | 必须与 DeepSeek 文本推理边界分开；不能让文本推理模型直接读图或越过 VisionEvidencePacket。 |
| dots.mocr | 多模态文档解析、layout/bbox、公式 LaTeX、表格 HTML、reading order | 适合做复杂试卷/讲义版面、公式和表格解析的 benchmark-only 对照候选。 | VLM 文档解析仍不是 K12 学生作答归属或正误判断；模型许可、部署成本和隐私边界需复核。 |
| RapidOCR | 中文/英文 OCR、ONNX/OpenVINO/TensorRT 等多后端离线部署 | 适合做轻量离线 OCR Provider 对照和速度基线。 | 不负责复杂版面、题目切分、公式、老师批改归属或学情判断。 |
| Surya | OCR、layout analysis、reading order、table recognition | 适合作为阅读顺序、layout/table 对照 Provider 候选。 | 通用文档场景；必须验证中文 K12 试卷、拍照畸变、手写答案和批改痕迹。 |
| EasyOCR / docTR / MMOCR | OCR 检测识别 baseline | 适合做 OCR baseline 或特定失败样本对照。 | 不是 K12 学习材料分析系统；不能替代题目切分 QA 和 human gold dataset。 |
| CnOCR | 中文/英文 OCR baseline | 适合轻量中文 OCR 对照，也可观察其 CnSTD 检测定位能力。 | 不负责复杂版面、题目切分或批改痕迹归属。 |
| Tesseract | 传统 OCR baseline | Apache-2.0，适合做低成本 OCR 对照和离线 smoke。 | 中文 K12 拍照、手写和复杂版面不是强项。 |
| DocLayout-YOLO | 文档 layout detection、bbox 区域对照 | 可用于版面检测实验、题块区域候选和合成训练思路。 | AGPL-3.0 许可要审查；只做 layout，不做 OCR/语义。 |
| LayoutParser | 版面分析工具箱、layout 数据结构、区域 OCR 工具 | 适合离线实验和标注/可视化工具。 | 维护较旧；需验证模型对 K12 试卷样式的适配度。 |
| pix2tex / LaTeX-OCR | 公式图片转 LaTeX | 可用于数学公式专项对照，尤其是公式 crop 的识别实验。 | 公式识别不是整题理解；无法判断学生正误或错因。 |
| UniMERNet | 真实场景数学表达式识别、公式 crop 识别评测 | 适合与 LaTeX-OCR / Pix2Text 做数学公式专项 benchmark 对照。 | 只解决数学表达式识别；不能替代题目切分、同题答案依据、学生作答归属或错因诊断。 |

## Education-Specific Repo Scan

2026-06-20 对 GitHub API 做了额外关键词扫描：

- `试卷 OCR PaddleOCR`：0 个有效仓库命中。
- `题目切分 OCR`：0 个有效仓库命中。
- `exam paper OCR question segmentation`：0 个有效仓库命中。
- `homework correction OCR education`：只命中小学生口算批改 demo，场景过窄且许可不清，不能作为本 Skill 底座。
- `answer sheet OCR education`：只命中答题卡/OMR 或自动评分小项目，主要处理选择题涂卡或简单答卷，不覆盖中国大陆 K12 试卷/作业/错题的逐题证据、学生作答、老师批改、错因诊断和家长反馈链路。

结论：没有发现可直接复用的“中文 K12 试卷/作业逐题切分 + 学生作答归属 + 老师批改归属 + 学情报告”开源系统。产品路径仍应是：

```text
通用 OCR/Layout/Formula Provider 候选
→ 统一 VisionEvidencePacket
→ Provider trial report
→ compare:k12-vision-provider-regression（Provider 切换时）
→ 题目切分 QA artifact
→ 脱敏 annotation task
→ 双人标注 + 仲裁 gold package
→ validate:k12-eval-assets
→ eval:k12-material / compare:k12-model-regression
```

任何开源 Provider 只能作为可替换输入来源，不能直接产生学生能力结论、家长反馈或 99% 正确率宣称。

## Annotation Tool Candidates

| Project | Useful For | Fit | Risk |
|---|---|---|---|
| Label Studio | 多类型数据标注、图片/文本任务、导出标注结果、接入预标注 | 第一标注 UI 候选，适合把 redacted annotation task 分发给双标人员。 | 工具导出只是上游工作文件；必须归一化为 annotation import，再转换为 gold package。 |
| CVAT | 图像、视频、3D 区域标注，bbox/polygon/QC/团队协作 | 适合题块、学生答案区域、老师批改区域、crop_ref 质检。 | 视觉区域标注不等于语义判断；仍需答案依据、双标、仲裁和脱敏。 |

## Chinese K12 Benchmarks And Reasoning Projects

| Project | Useful For | Fit | Risk |
|---|---|---|---|
| K12Vista | 中文 K12 多模态 benchmark、过程评价数据和 K12 推理评测口径 | 可参考学科、学段、题型和过程评价覆盖，不作为真实学生材料 gold。 | 公开 benchmark 不是已作答试卷/作业照片，缺少真实学生作答、订正、老师批改和教培老师复核入档链路。 |
| CMMU | 中文多模态多学科评测，覆盖小学到高中、七个基础学科 | 可参考 eval JSON、题型拆分和多学科覆盖口径。 | 公开 benchmark 不是学生学习材料；缺学生作答/批改/订正证据。 |
| CMMaTH | 中文 K12 多模态数学能力评测，含题型、视觉元素、知识点和标准解答 | 可参考数学多模态题型、知识点、标准解答标注字段。 | 不能替代真实教培材料 gold；需确认数据/代码实际获取与许可。 |
| CMM-Math | 中文 1-12 年级多模态数学 benchmark/training 数据 | 可参考年级覆盖、题型覆盖和多图文输入评测。 | 与学生作答分析不同；公开题可能有模型污染风险。 |
| MWPToolkit | 数学应用题求解工具箱，含 Math23K 等数据和统一评测框架 | 可参考数学 word problem 数据处理、求解评测和 baseline 管理。 | 研究型求解框架，不解决 OCR、学生痕迹、老师复核和报告生成。 |
| Confucius3-Math | 中文 K12 数学推理开源模型/代码 | 可作为未来专项数学推理候选模型之一。 | 当前项目默认 DeepSeek 文本推理边界不变；替换模型必须跑同一 human-labeled regression。 |
| OCRBench / MultimodalOCR | OCR、文档解析和多模态 OCR benchmark 任务 | 可参考 OCR 评测任务拆分和失败类型归因。 | 不是中国大陆 K12 已作答材料分析集；不能替代本项目 Provider trial report、题目切分 QA 或 human gold。 |
| E-EVAL / EduEval | 中文 K12 教育 LLM benchmark | 可参考学科、学段、认知维度和文本推理能力覆盖口径。 | 公开 benchmark 主要是考试题、课堂任务或专家 prompt，不是脱敏学生作答/批改材料。 |
| K12-KGraph / K12-Bench | 人教版教材知识图谱、课程结构和知识检索/推理 benchmark | 可参考知识点先修关系、教材章节、概念/技能结构和月报知识薄弱点 taxonomy。 | 知识图谱和公开 benchmark 不能替代 OCR/Vision 证据链、逐题正误 gold 或老师复核。 |
| Ape210K | 中文小学数学应用题数据集论文 | 只作为“不可复现风险”案例记录。 | arXiv 页面标明论文已撤回，原因是数据集未公开；不能作为评测或产品依据。 |

公开 benchmark 或研究数据集即使是中文 K12 主题，也只能进入覆盖参考、taxonomy 设计、公开对照评测或模型研究候选，不能作为 `human_labeled` 真实样本资产支撑 99% 正确率宣称。`validate:k12-eval-assets` 已增加 `publicBenchmarkSources` 覆盖项；如果 human-labeled manifest 的 VisionEvidencePacket metadata / source id 标记为 K12Vista、CMMaTH、CMM-Math、E-EVAL、EduEval、K12-Bench、K12-KGraph、OCRBench、Math23K、MWPToolkit 等 public benchmark/source dataset，`claimable99AssetReady` 必须保持 `no`。

## Recommended Next Experiment

1. 选 20-30 份脱敏真实材料，覆盖试卷、作业、错题、笔记、老师批改照片。
2. 用 PaddleOCR / PP-StructureV3 作为第一条 Provider 候选，另用 MinerU 或 LayoutParser 做对照。
3. 统一转成 `VisionEvidencePacket`，保留 provider、model version、bbox/polygon、crop_ref、confidence、reading order 和风险标记。
4. 用 Label Studio/CVAT 等上游工具完成双人标注和仲裁，再转成 `student_learning_material_gold_label_package.v0.1`。
5. 先跑 `validate:k12-eval-assets`，只有 `claimable99AssetReady=yes` 后才跑正式 dataset eval。

## Provider Candidate Trace Requirement

真实 OCR/Vision 样本进入 99% 资产预检时，不能只保存某个 Provider 的最终 OCR JSON。`VisionEvidencePacket.pipeline_trace.provider_candidates` 必须至少记录：

- 当前选中的 Provider，且 `fit=primary_candidate`。
- 至少一个 fallback 或 benchmark 候选，例如 PaddleOCR/PaddleX、Pix2Text、CnOCR、EasyOCR、Tesseract、docTR、LayoutParser、MinerU、MMOCR、LaTeX-OCR 等。
- 每个候选的角色、适用性、来源 URL、license/deployment review note。
- 覆盖 OCR/文档解析、layout 和 formula 角色；K12 数学、理科或综合试卷不能只保留一个通用 OCR 候选后就进入 99% readiness。

`validate:k12-eval-assets` 会统计 `providerCandidateTrace`、`benchmarkCandidates`、`sourceUrls`、`licenseNotes` 和 `providerRoleCoverage` 覆盖率。结构预检可以 PASS，但如果这些覆盖项不足，`claimable99AssetReady` 必须保持 `no`。

2026-06-20 实现补强：Provider 候选的 `evidence_source_url` 已进入 99% 资产预检覆盖项。真实 OCR/Vision case 即使结构校验通过，只要缺少候选来源 URL，也不能成为 `claimable99AssetReady=yes` 的资产。

2026-06-20 实现补强：Provider 候选角色覆盖已进入 99% 资产预检。真实样本 case 必须至少覆盖 OCR/文档解析、layout 和 formula 候选角色；缺公式识别候选时，`validate:k12-eval-assets` 会报告 `coverage.providerRoleCoverage` 并阻断 `claimable99AssetReady`，避免把公式或理科题型未经专项候选评估的资产用于 99% 宣称。

2026-06-20 实现补强：`vision-adapter` 默认候选 trace 已补齐 Docling、MonkeyOCR、olmOCR、DeepSeek-OCR、dots.mocr，全部定位为 `benchmark_only` / 外部 OCR 或 document parser 候选；它们只能用于真实样本 Provider 试跑和回归对照，不能直接生成学生能力结论、家长反馈或 99% 正确率宣称。

## Primary-Source Verification Notes

- 2026-06-20 本轮继续检索通用 OCR/Layout、公式识别、文档解析、annotation tool、中文 K12 benchmark 和题目切分相关开源项目。结论仍是：可复用项目只应进入 Provider 候选、benchmark 或标注上游，不能绕过 `VisionEvidencePacket`、题目切分 QA、human gold dataset、老师复核和月报证据门。
- 2026-06-20 继续复核 PaddleOCR、MinerU、RapidOCR、Surya、Label Studio、K12Vista 和 OCRBench / MultimodalOCR 等主仓库后，结论没有改变：它们分别适合作为 OCR/Layout/Formula Provider 候选、标注工具或公开 benchmark 参考，但没有一个能直接替代本 Skill 的逐题证据链、老师复核、家长反馈和月报纵向比较。
- 2026-06-20 复核 dots.mocr 主仓库后，将其作为 benchmark-only 文档解析候选加入 Provider trace。它的 layout、bbox、公式 LaTeX、表格 HTML 和 reading-order 能力适合作复杂材料对照，但不能绕过 K12 题目切分、学生痕迹归属、老师批改归属、human gold 和老师复核。
- 2026-06-20 网页复核没有发现可直接替代本 Skill 的“中文 K12 试卷/作业逐题切分 + 学生作答归属 + 老师批改归属 + 学情报告”垂直仓库；搜索结果仍主要是通用 OCR、document layout analysis、答题卡/OMR、口算批改 demo 或研究型工具。后续仍应按 Provider candidate 而不是产品内核接入。
- PaddleOCR / PP-StructureV3：主仓库说明其面向 PDF/图片转结构化 JSON/Markdown，并提供细粒度坐标能力，适合作第一轮 OCR/Layout Provider 候选；但它的公共精度与文档解析能力不能外推为 K12 学生逐题分析正确率。
- Docling：主仓库说明其提供扫描 PDF/图片 OCR 支持、Visual Language Model 支持和 CLI，适合作为通用文档转换 baseline；但它不能替代 K12 学生痕迹识别、老师批改归属、逐题 evidence readiness 或家长反馈安全链路。
- MinerU：主仓库说明其可把 PDF、Office、图片、网页转成 Markdown/JSON，包含公式、表格、阅读顺序、扫描件和手写场景能力；仓库许可已改为基于 Apache 2.0 的自定义 MinerU Open Source License，接入前仍需单独复核附加条件、模型权重、离线部署资源和学生隐私边界。
- Pix2Text：主仓库说明其可识别 layout、table、math formula、text 并整合成 Markdown，适合数学公式/表格专项对照；仓库标注 MIT license，但它不是学生作答正误或错因判断器。
- CnOCR：主仓库说明其是中文/英文 OCR 工具包并带多种预训练模型，适合作轻量中文 OCR baseline；它不负责复杂版面、题目切分或批改归属。
- RapidOCR、Surya、EasyOCR、docTR、MMOCR：可作为 OCR/Layout/reading-order baseline 或对照 Provider；RapidOCR 仓库标注 Apache-2.0，Surya 代码标注 Apache-2.0 但模型权重存在额外商业使用限制。它们的能力边界仍停在视觉/文档解析层，不能越过 `VisionEvidencePacket` 和逐题 evidence readiness。
- DocLayout-YOLO、LayoutParser：适合 layout detection / layout 数据结构和区域 OCR 实验；DocLayout-YOLO 仓库标注 AGPL-3.0，LayoutParser 标注 Apache-2.0，均需在商业化接入前审查许可和维护状态。
- dots.mocr：主仓库说明其面向多模态文档解析，可输出 layout 类别、bbox、公式 LaTeX、表格 HTML、reading order 等结构信息；适合作为复杂试卷/讲义版面与公式表格解析的 benchmark-only 候选，但不能替代学生作答归属、老师批改归属、逐题正误或错因诊断。
- GitHub API 与网页关键词扫描均没有发现可直接替代本 Skill 的教育垂直开源项目；小型口算批改、答题卡识别或自动评分 demo 不覆盖本项目需要的中国大陆 K12 材料分类、逐题证据链、老师复核、家长反馈和月报纵向比较。
- Label Studio、CVAT：适合作为 human gold dataset 的上游标注和视觉区域质检工具；公开仓库分别标明为 Apache-2.0 和 MIT 许可核心，但工具导出不能直接作为验收 gold，必须走 annotation import 和 final gold package 归一化。
- K12Vista：主仓库说明其包含中文 K12 多模态 benchmark、K12-PEM-800K 过程评价数据和人工标注的 K12-PEBench，可用于覆盖口径参考；它仍不是本项目真实脱敏学生材料 gold，也不能证明试卷/作业 OCR、题目切分或家长反馈正确。
- OCRBench / MultimodalOCR：主仓库包含 OCRBench、OCRBench v2 和 MDPBench，可用于 OCR/文档解析 benchmark 参考；它不能替代本项目真实 Provider trial report、question segmentation review 和 human-labeled dataset。
- CnOCR、Tesseract、LayoutParser、DocLayout-YOLO、pix2tex：分别适合中文 OCR baseline、传统 OCR baseline、layout 数据结构和区域 OCR 实验、文档 layout detection、公式 crop 转 LaTeX 对照；都不能单独完成题目切分、学生答案归属、老师批改归属、逐题正误和学情报告。
- UniMERNet：主仓库说明其面向真实场景数学表达式识别，并公开模型、数据集入口和 Apache-2.0 许可；适合作为数学公式 crop 的 benchmark 候选，但不能替代整题理解、学生正误判断或错因诊断。
- CMMU、CMMaTH、CMM-Math、MWPToolkit、Confucius3-Math：可参考中文 K12 多模态题型、知识点、标准答案、数学推理或评测框架；这些公开题/模型项目不包含本产品所需的真实学生作答、订正、老师批改、家长反馈和老师确认入档链路。
- Ape210K：只保留为反例。arXiv 页面标明论文已撤回且数据未公开，不能作为可复现评测资产。

## Sources Checked

- https://github.com/PaddlePaddle/PaddleOCR
- https://github.com/docling-project/docling
- https://github.com/opendatalab/MinerU
- https://github.com/rednote-hilab/dots.mocr
- https://github.com/RapidAI/RapidOCR
- https://github.com/datalab-to/surya
- https://github.com/JaidedAI/EasyOCR
- https://github.com/mindee/doctr
- https://github.com/open-mmlab/mmocr
- https://github.com/breezedeus/CnOCR
- https://github.com/tesseract-ocr/tesseract
- https://github.com/opendatalab/DocLayout-YOLO
- https://github.com/Layout-Parser/layout-parser
- https://github.com/lukas-blecher/LaTeX-OCR
- https://github.com/opendatalab/UniMERNet
- https://github.com/HumanSignal/label-studio
- https://github.com/cvat-ai/cvat
- https://github.com/lichongod/K12Vista
- https://github.com/Yuliang-Liu/MultimodalOCR
- https://github.com/flageval-baai/CMMU
- https://arxiv.org/abs/2401.15927
- https://arxiv.org/abs/2512.00290
- https://arxiv.org/abs/2605.09635
- https://arxiv.org/abs/2407.12023
- https://arxiv.org/abs/2409.02834
- https://github.com/LYH-YF/MWPToolkit
- https://arxiv.org/abs/2506.18330
- https://arxiv.org/abs/2009.11506
