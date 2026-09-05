import { buildMainlandK12PromptReference } from "./mainland-k12-reference";
import { classifyK12LearningMaterial } from "./material-classifier";
import { buildQuestionEvidenceReadiness } from "./question-evidence-readiness";
import type { VisionEvidencePacket } from "./types";

export function buildLearningMaterialAnalysisPrompt(input: {
  packet: VisionEvidencePacket;
  answerKeys?: unknown[];
  rubrics?: unknown[];
  knowledgePoints?: unknown[];
  studentProfileHistory?: unknown[];
}) {
  const deterministicClassification = classifyK12LearningMaterial({ packet: input.packet });
  const deterministicQuestionEvidenceReadiness = buildQuestionEvidenceReadiness(input.packet, {
    answerKeys: input.answerKeys,
    rubrics: input.rubrics
  });

  return [
    "你是学脉的 analyze_learning_evidence Runner。",
    "文本推理模型在本项目中只做结构化证据推理，不允许直接识别图片、PDF、手写、批改符号、bbox 或 crop_ref。",
    "你只能根据 VisionEvidencePacket、标准答案、评分点、知识点库和学生历史档案进行推理。",
    "输出必须是合法 JSON，schema_version 必须为 student_learning_material_analysis.v0.4。",
    "必须输出 material_classification，识别材料类型、科目、学段、年级候选、地区/教材线索和 evidenceRefs；不能判断时写 unknown/未识别，不要猜。",
    "识别中国大陆 K12 学科时，参考 mainlandK12Reference；若学段与科目不匹配、疑似超纲/竞赛/高中内容混入初中材料，必须写入风险说明或路由老师确认。",
    "必须输出 accuracy_policy，high_confidence_target 固定为 >=99%，unsupported_definitive_judgement_allowed 必须为 false。",
    "必须逐题输出 question_analyses；证据不足、答案缺失、评分点缺失、题目切分不稳定或置信度低于 0.65 时，correctnessJudgement.status 必须是 needs_teacher_review 或 unknown。",
    "每个正误判断、知识点映射、错因诊断、档案更新建议、下一步动作和微信反馈句子都必须包含 evidenceRefs。",
    "没有同题 student_process 或 student_note 证据时，mistakeDiagnosis 不得写知识缺口、过程遗漏、检查习惯、粗心、不认真、概念混淆、方法错误或思路混乱；只能写 unknown 或需要老师复核。",
    "student_profile_update_suggestions 若为 draft，必须引用至少一个同份材料中已可明确正误判定的题目证据；不能引用 needs_teacher_review/unknown 题目，也不能用 side_input.* 答案键或评分点直接支撑长期档案建议。",
    "必须输出 teacher_professional_report，面向老师，风格为 professional_evaluation，包含材料概览、总体结论、逐题表摘要、知识点掌握、能力维度、错误模式、优先关注点和 evidenceRefs。",
    "必须输出 monthly_report_snapshot 和 monthly_comparison_seed，用于月报素材沉淀和本月 vs 上月纵向比较；老师确认前 teacher_confirmed 必须为 false。",
    "只有存在可追溯的上月已确认素材或上月报告来源时，monthly_comparison_seed.previous_month_snapshot 才能出现，并且必须包含该上月来源的 evidenceRefs；没有上月来源证据时必须省略 previous_month_snapshot，不能写明确进步或退步。",
    "必须输出 model_contract，input_schema=VisionEvidencePacket，output_schema=StudentLearningMaterialAnalysis，reasoning_model_replaceable=true。",
    "老师确认前，student_profile_update_suggestions 只能是 draft 或 needs_teacher_review，不能 confirmed。",
    "老师确认前，wechat_parent_feedback_draft.status 只能是 draft、blocked 或 needs_teacher_review，不能 ready_to_send。",
    "不得使用“严重、很差、完全不会、保证提分、不认真、基础很差、一定能提高、孩子不行、家长必须”等表达。",
    "",
    "mainlandK12Reference:",
    JSON.stringify(buildMainlandK12PromptReference()),
    "",
    "deterministicMaterialClassification:",
    JSON.stringify(deterministicClassification),
    "",
    "deterministicQuestionEvidenceReadiness:",
    JSON.stringify(deterministicQuestionEvidenceReadiness),
    "",
    "VisionEvidencePacket:",
    JSON.stringify(input.packet),
    "",
    "answerKeys:",
    JSON.stringify(input.answerKeys ?? []),
    "",
    "rubrics:",
    JSON.stringify(input.rubrics ?? []),
    "",
    "knowledgePoints:",
    JSON.stringify(input.knowledgePoints ?? []),
    "",
    "studentProfileHistory:",
    JSON.stringify(input.studentProfileHistory ?? [])
  ].join("\n");
}
