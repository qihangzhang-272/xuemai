import { classifyK12LearningMaterial } from "./material-classifier";
import type { DegradedReason, StudentLearningMaterialAnalysis, VisionEvidencePacket } from "./types";

export function createDegradedAnalysis(input: {
  analysisId: string;
  packet: VisionEvidencePacket;
  reasons: DegradedReason[];
  message: string;
  validationErrors?: string[];
  safetyWarnings?: string[];
}): StudentLearningMaterialAnalysis {
  const evidenceRefs = input.packet.evidences.map((evidence) => evidence.evidence_ref);
  const firstQuestion = input.packet.questions[0];
  const fallbackEvidenceRefs = evidenceRefs.length ? evidenceRefs : input.packet.gates.flatMap((gate) => gate.evidenceRefs);
  const primaryReason = input.reasons[0] ?? "model_output_invalid";
  const classificationResult = classifyK12LearningMaterial({ packet: input.packet, fallbackEvidenceRefs });
  const classification = classificationResult.classification;
  const questionAnalyses = input.packet.questions.map((question, index) => {
    const questionEvidenceRefs = input.packet.evidences
      .filter((evidence) => evidence.question_id === question.question_id)
      .map((evidence) => evidence.evidence_ref);
    const scopedEvidenceRefs = questionEvidenceRefs.length ? questionEvidenceRefs : fallbackEvidenceRefs;

    return {
      question_id: question.question_id || `unknown_question_${index + 1}`,
      question_number: question.question_number,
      material_refs: scopedEvidenceRefs,
      correctnessJudgement: {
        status: "needs_teacher_review" as const,
        source_basis: "insufficient" as const,
        explanation: input.message,
        evidenceRefs: scopedEvidenceRefs,
        confidence: 0.3,
        degradeReason: primaryReason
      },
      knowledgeMapping: [],
      mistakeDiagnosis: [
        {
          diagnosis_type: "unknown" as const,
          explanation: "当前证据不足，不能安全判断具体错因。",
          evidenceRefs: scopedEvidenceRefs,
          confidence: 0.2,
          suggested_verification: "请老师补充标准答案、评分点、学生过程或确认材料身份。"
        }
      ],
      nextActions: [
        {
          action_type: "teacher_review" as const,
          title: "请老师先复核材料证据",
          detail: input.message,
          priority: "high" as const,
          verification_method: "老师确认材料身份、题目、答案和批改依据。",
          evidenceRefs: scopedEvidenceRefs
        }
      ],
      confidence: 0.3,
      evidenceRefs: scopedEvidenceRefs,
      degradeReason: primaryReason
    };
  });

  return {
    schema_version: "student_learning_material_analysis.v0.4",
    analysis_id: input.analysisId,
    source_material_id: input.packet.source_material_id,
    student_id: input.packet.student_id,
    material_state: input.packet.material_state,
    material_classification: classification,
    gates: input.packet.gates.map((gate) => (gate.status === "pass" ? gate : { ...gate, status: gate.status === "block" ? "block" : "degrade" })),
    accuracy_policy: {
      high_confidence_target: ">=99%",
      auto_judgement_rule: "只有题干、学生答案、标准答案/评分点或清晰老师批改都可用，且证据置信度达标时，才允许确定性判断。",
      refusal_rule: "证据不足、材料身份不清、学生痕迹缺失或模型输出不合格时，必须降级为老师复核。",
      unsupported_definitive_judgement_allowed: false
    },
    evidence_summary: {
      usableEvidenceRefs: fallbackEvidenceRefs,
      missing_context: buildMissingContext(input.reasons),
      reliability_notes: [
        input.message,
        ...input.reasons.map((reason) => `degraded_reason:${reason}`),
        ...classificationResult.warnings.map((warning) => `classification_warning:${warning}`),
        ...(input.validationErrors ?? []),
        ...(input.safetyWarnings ?? [])
      ]
    },
    question_analyses: questionAnalyses,
    student_profile_update_suggestions: [],
    next_learning_actions: [
      {
        action_type: "teacher_review",
        title: "先完成证据复核",
        detail: input.message,
        priority: "high",
        verification_method: "补充或确认材料证据后再分析。",
        evidenceRefs: fallbackEvidenceRefs
      }
    ],
    teacher_professional_report: {
      report_title: "学习材料分析需老师复核",
      assessment_style: "professional_evaluation",
      material_overview: "当前材料未达到自动分析条件。",
      overall_conclusion: input.message,
      score_or_completion_summary: "证据不足，暂不计算得分、完成率或可追回分。",
      question_table_summary: firstQuestion ? `已生成 ${questionAnalyses.length} 道待复核题目线索，但不输出确定性逐题结论。` : "未识别到可分析题目。",
      knowledge_mastery_summary: "证据不足，暂不生成知识点掌握判断。",
      ability_dimension_summary: "证据不足，暂不生成能力画像。",
      error_pattern_summary: "证据不足，暂不推断错因模式。",
      priority_focus: "先补齐材料证据和老师确认信息。",
      consolidation_suggestions: ["补充清晰图片、标准答案、评分点或老师批改依据后再分析。"],
      teacher_review_boundary: "当前内容只能作为复核提示，不写入学生长期档案或月报正式结论。",
      evidenceRefs: fallbackEvidenceRefs
    },
    wechat_parent_feedback_draft: {
      status: input.reasons.includes("wechat_feedback_unsafe") ? "blocked" : "needs_teacher_review",
      text: "当前材料证据需要老师先复核，暂不生成可发送给家长的反馈。",
      sentences: [
        {
          text: "当前材料证据需要老师先复核，暂不生成可发送给家长的反馈。",
          evidenceRefs: fallbackEvidenceRefs
        }
      ],
      warnings: ["teacher_review_required", ...input.reasons],
      forbidden_terms_found: []
    },
    monthly_report_snapshot: {
      source_analysis_id: input.analysisId,
      student_id: input.packet.student_id,
      month: input.packet.created_at.slice(0, 7),
      subject: classification.subject,
      material_type: classification.material_type,
      material_date: input.packet.created_at.slice(0, 10),
      score_summary: "证据不足，暂不进入月报分数或表现趋势。",
      question_count: input.packet.questions.length,
      analyzable_question_count: 0,
      knowledge_points: [],
      ability_dimensions: [],
      error_patterns: [],
      main_progress_signal: "证据不足，暂不生成进步信号。",
      main_issue_signal: "证据不足，需补材料后再判断。",
      first_priority_action: "先由老师复核材料证据。",
      parent_visible_summary: "当前材料仍需老师确认，暂不作为家长版月报内容。",
      teacher_only_notes: ["降级分析不能自动进入月报正式素材。"],
      confidence: 0.2,
      evidenceRefs: fallbackEvidenceRefs,
      teacher_confirmed: false
    },
    monthly_comparison_seed: {
      current_month_snapshot: {
        month: input.packet.created_at.slice(0, 7),
        main_progress_signal: "证据不足，暂不生成进步信号。",
        main_issue_signal: "证据不足，需补材料后再判断。",
        first_priority_action: "先由老师复核材料证据。",
        confidence: 0.2
      },
      trend_by_knowledge_point: [],
      trend_by_ability_dimension: [],
      trend_by_error_pattern: [],
      new_issues: [],
      improved_issues: [],
      repeated_issues: [],
      confidence_change: "当前证据不足，不能做本月与上月纵向比较。",
      teacher_interpretation: "降级分析只提示补证据，不形成趋势判断。",
      parent_readable_comparison: "本次材料还需要老师确认，暂不和上月做比较。",
      evidenceRefs: fallbackEvidenceRefs
    },
    model_contract: {
      input_schema: "VisionEvidencePacket",
      output_schema: "StudentLearningMaterialAnalysis",
      vision_provider_replaceable: true,
      reasoning_model_replaceable: true,
      strict_json_schema_preferred: true,
      provider_name: "degraded_runner",
      model_name: "none"
    },
    teacher_review_required: true,
    risk_flags: input.reasons,
    audit: {
      runtime_model: "deepseek-v4-pro",
      vision_plugin_run_id: input.packet.plugin_run_id,
      created_at: new Date().toISOString(),
      error_sources: inferErrorSources(input.reasons)
    }
  };
}

function buildMissingContext(reasons: DegradedReason[]) {
  const missing = new Set<string>();
  if (reasons.includes("answer_key_missing")) missing.add("标准答案或评分点");
  if (reasons.includes("no_student_trace")) missing.add("学生作答/订正/批改/笔记痕迹");
  if (reasons.includes("unsupported_material_state")) missing.add("可用于学情分析的学生学习材料");
  if (reasons.includes("out_of_k12_scope")) missing.add("中国大陆 K12 学科类学生材料");
  if (reasons.includes("student_identity_uncertain") || reasons.includes("student_identity_conflict")) missing.add("学生身份确认");
  if (reasons.includes("missing_question_id")) missing.add("题目定位或 question_id");
  if (reasons.includes("low_image_quality")) missing.add("清晰材料图片");
  if (reasons.includes("notes_only")) missing.add("题目、学生作答、标准答案或老师批改依据");
  if (reasons.includes("teacher_mark_only")) missing.add("学生原始作答、订正内容或解题过程");
  return [...missing];
}

function inferErrorSources(reasons: DegradedReason[]) {
  const sources = new Set<string>();
  for (const reason of reasons) {
    if (
      reason.includes("identity") ||
      reason === "unsupported_material_state" ||
      reason === "out_of_k12_scope" ||
      reason === "low_image_quality" ||
      reason === "missing_question_id" ||
      reason === "vision_packet_invalid"
    ) {
      sources.add("vision_plugin_error");
    } else if (reason === "answer_key_missing" || reason === "teacher_mark_answer_key_conflict") {
      sources.add("answer_key_error");
    } else if (reason === "wechat_feedback_unsafe") {
      sources.add("feedback_safety_error");
    } else {
      sources.add("deepseek_reasoning_error");
    }
  }
  return [...sources];
}
