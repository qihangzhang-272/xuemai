import type {
  StudentLearningMaterialDeliveryArchiveStatus,
  StudentLearningMaterialDeliveryBundle,
  StudentLearningMaterialDeliveryFeedbackStatus
} from "./delivery-bundle";
import type { ValidationResult } from "./types";

export type StudentLearningMaterialTeacherReviewActionId =
  | "view_analysis_detail"
  | "edit_parent_feedback"
  | "copy_parent_feedback"
  | "mark_feedback_sent"
  | "confirm_archive"
  | "request_more_evidence"
  | "rerun_analysis";

export type StudentLearningMaterialTeacherReviewPacket = {
  schema_version: "student_learning_material_teacher_review_packet.v0.1";
  skill_card: {
    skill_name: "学生学习材料分析";
    skill_run_id: string;
    card_title: string;
    generated_at: string;
    detail_page: "分析详情页";
    status: {
      display_status: StudentLearningMaterialDeliveryBundle["status"]["display_status"];
      secondary_status?: StudentLearningMaterialDeliveryBundle["status"]["secondary_status"];
      feedback_status: StudentLearningMaterialDeliveryFeedbackStatus;
      archive_status: StudentLearningMaterialDeliveryArchiveStatus;
    };
    input_source: {
      analysis_id: string;
      source_material_id: string;
      student_id: string;
    };
  };
  review_policy: {
    ai_outputs_are_draft: true;
    auto_send_wechat: false;
    auto_archive: false;
    requires_teacher_confirmation_before_feedback_sent: true;
    requires_teacher_confirmation_before_archive: true;
    teacher_may_edit_feedback_before_copy: true;
    raw_internal_evidence_refs_hidden_from_teacher_copy: true;
  };
  teacher_review_summary: {
    assessment_style: "professional_evaluation";
    material_classification: StudentLearningMaterialDeliveryBundle["teacher_delivery"]["material_classification"];
    material_summary: string;
    data_credibility_level: StudentLearningMaterialDeliveryBundle["teacher_delivery"]["data_credibility"]["level"];
    question_count: number;
    review_required_question_count: number;
    parent_feedback_copyable: boolean;
    monthly_comparison_status: "has_previous_month_comparison" | "missing_previous_month_evidence";
    monthly_comparison_previous_month_source_count: number;
    source_label_count: number;
  };
  teacher_visible_payload: {
    teacher_report_markdown: string;
    question_rows: StudentLearningMaterialDeliveryBundle["teacher_delivery"]["question_rows"];
    parent_feedback_text: string;
    parent_feedback_warnings: string[];
    monthly_summary: string;
    month_over_month_comparison: string;
    source_labels: string[];
    safeguards: string[];
  };
  review_actions: Array<{
    action_id: StudentLearningMaterialTeacherReviewActionId;
    label: string;
    enabled: boolean;
    requires_teacher_confirmation: boolean;
    writes_long_term_profile: boolean;
    changes_feedback_status?: StudentLearningMaterialDeliveryFeedbackStatus;
    changes_archive_status?: StudentLearningMaterialDeliveryArchiveStatus;
    reason: string;
  }>;
  internal_audit: {
    source_map_expose_to_user: false;
    source_map: StudentLearningMaterialDeliveryBundle["source_map"];
  };
};

export type CreateStudentLearningMaterialTeacherReviewPacketInput = {
  deliveryBundle: StudentLearningMaterialDeliveryBundle;
  skillRunId?: string;
  generatedAt?: string;
};

const REQUIRED_TEACHER_REPORT_MARKDOWN_SECTIONS = ["## 证据充分性判定"];

export function createStudentLearningMaterialTeacherReviewPacket(
  input: CreateStudentLearningMaterialTeacherReviewPacketInput
): StudentLearningMaterialTeacherReviewPacket {
  const delivery = input.deliveryBundle.teacher_delivery;
  const reviewRequiredCount = delivery.question_rows.filter((row) => row.needs_teacher_review).length;
  const sourceLabels = input.deliveryBundle.source_map.map((source) => source.source_id);
  return {
    schema_version: "student_learning_material_teacher_review_packet.v0.1",
    skill_card: {
      skill_name: "学生学习材料分析",
      skill_run_id: input.skillRunId || input.deliveryBundle.analysis_id,
      card_title: delivery.title,
      generated_at: input.generatedAt || input.deliveryBundle.generated_at,
      detail_page: "分析详情页",
      status: {
        display_status: input.deliveryBundle.status.display_status,
        secondary_status: input.deliveryBundle.status.secondary_status,
        feedback_status: input.deliveryBundle.status.feedback_status,
        archive_status: input.deliveryBundle.status.archive_status
      },
      input_source: {
        analysis_id: input.deliveryBundle.analysis_id,
        source_material_id: input.deliveryBundle.source_material_id,
        student_id: input.deliveryBundle.student_id
      }
    },
    review_policy: {
      ai_outputs_are_draft: true,
      auto_send_wechat: false,
      auto_archive: false,
      requires_teacher_confirmation_before_feedback_sent: true,
      requires_teacher_confirmation_before_archive: true,
      teacher_may_edit_feedback_before_copy: true,
      raw_internal_evidence_refs_hidden_from_teacher_copy: true
    },
    teacher_review_summary: {
      assessment_style: delivery.assessment_style,
      material_classification: cloneMaterialClassification(delivery.material_classification),
      material_summary: delivery.material_summary,
      data_credibility_level: delivery.data_credibility.level,
      question_count: delivery.question_rows.length,
      review_required_question_count: reviewRequiredCount,
      parent_feedback_copyable: delivery.parent_feedback_copyable,
      monthly_comparison_status: toTeacherReviewMonthlyComparisonStatus(delivery.monthly_comparison_evidence.previous_month_evidence_status),
      monthly_comparison_previous_month_source_count: delivery.monthly_comparison_evidence.previous_month_source_ids.length,
      source_label_count: sourceLabels.length
    },
    teacher_visible_payload: {
      teacher_report_markdown: delivery.teacher_report_markdown,
      question_rows: cloneQuestionRows(delivery.question_rows),
      parent_feedback_text: delivery.parent_feedback_text,
      parent_feedback_warnings: [...delivery.parent_feedback_warnings],
      monthly_summary: delivery.monthly_summary,
      month_over_month_comparison: delivery.month_over_month_comparison,
      source_labels: sourceLabels,
      safeguards: [
        ...delivery.safeguards,
        "老师确认前，本卡片不会自动入档；标记已发只记录反馈状态，不代表自动发送微信。"
      ]
    },
    review_actions: buildReviewActions(input.deliveryBundle, reviewRequiredCount),
    internal_audit: {
      source_map_expose_to_user: false,
      source_map: input.deliveryBundle.source_map.map((source) => ({ ...source }))
    }
  };
}

export function validateStudentLearningMaterialTeacherReviewPacket(
  packet: unknown,
  deliveryBundle?: StudentLearningMaterialDeliveryBundle
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(packet)) return { ok: false, errors: ["teacher review packet must be an object"], warnings };
  const candidate = packet as StudentLearningMaterialTeacherReviewPacket;
  if (candidate.schema_version !== "student_learning_material_teacher_review_packet.v0.1") {
    errors.push("schema_version must be student_learning_material_teacher_review_packet.v0.1");
  }
  validateSkillCard(candidate, deliveryBundle, errors);
  validateReviewPolicy(candidate, errors);
  validateTeacherVisiblePayload(candidate, deliveryBundle, errors);
  validateReviewActions(candidate, errors);
  if (deliveryBundle) validateReviewActionsAgainstDeliveryBundle(candidate, deliveryBundle, errors);
  validateInternalAudit(candidate, deliveryBundle, errors);
  return { ok: errors.length === 0, errors, warnings };
}

function buildReviewActions(deliveryBundle: StudentLearningMaterialDeliveryBundle, reviewRequiredCount: number) {
  const feedbackStatus = deliveryBundle.status.feedback_status;
  const archiveStatus = deliveryBundle.status.archive_status;
  const hasReviewBlocker = feedbackStatus === "blocked" || feedbackStatus === "needs_teacher_review" || reviewRequiredCount > 0;
  return [
    {
      action_id: "view_analysis_detail" as const,
      label: "查看详情",
      enabled: true,
      requires_teacher_confirmation: false,
      writes_long_term_profile: false,
      reason: "打开分析详情页查看完整专业测评报告、逐题分析和来源标签。"
    },
    {
      action_id: "edit_parent_feedback" as const,
      label: "编辑家长反馈",
      enabled: feedbackStatus !== "blocked",
      requires_teacher_confirmation: true,
      writes_long_term_profile: false,
      reason: feedbackStatus === "blocked" ? "证据不足时先补充材料或重跑分析。" : "家长反馈是草稿，老师可先调整语气和细节。"
    },
    {
      action_id: "copy_parent_feedback" as const,
      label: "复制家长反馈",
      enabled: deliveryBundle.teacher_delivery.parent_feedback_copyable && !hasReviewBlocker,
      requires_teacher_confirmation: true,
      writes_long_term_profile: false,
      reason: hasReviewBlocker ? "仍有需复核题目或反馈风险，复制前必须老师处理。" : "反馈可复制，但系统不会自动发送微信。"
    },
    {
      action_id: "mark_feedback_sent" as const,
      label: "标记已发给家长",
      enabled: feedbackStatus === "pending_feedback" && !hasReviewBlocker,
      requires_teacher_confirmation: true,
      writes_long_term_profile: false,
      changes_feedback_status: "feedback_sent" as const,
      reason: hasReviewBlocker ? "存在证据或反馈复核项，不能直接标记已发给家长。" : "老师确认已经通过微信或其他渠道发给家长后再标记。"
    },
    {
      action_id: "confirm_archive" as const,
      label: "确认入档",
      enabled: archiveStatus === "pending_archive" && !hasReviewBlocker,
      requires_teacher_confirmation: true,
      writes_long_term_profile: true,
      changes_archive_status: "archived" as const,
      reason: hasReviewBlocker ? "证据不足或仍需复核，不能写入长期学生档案。" : "老师确认后，当前版本才可作为长期学情档案素材。"
    },
    {
      action_id: "request_more_evidence" as const,
      label: "补充材料",
      enabled: hasReviewBlocker,
      requires_teacher_confirmation: false,
      writes_long_term_profile: false,
      reason: hasReviewBlocker ? "需要补充答案、评分点、清晰图片或老师判断。" : "当前暂无阻断项。"
    },
    {
      action_id: "rerun_analysis" as const,
      label: "重新分析",
      enabled: feedbackStatus === "blocked" || feedbackStatus === "needs_teacher_review",
      requires_teacher_confirmation: false,
      writes_long_term_profile: false,
      reason: "补充材料或修正 OCR/Vision 证据后可重新生成草稿。"
    }
  ];
}

function validateSkillCard(
  packet: StudentLearningMaterialTeacherReviewPacket,
  deliveryBundle: StudentLearningMaterialDeliveryBundle | undefined,
  errors: string[]
) {
  if (packet.skill_card?.skill_name !== "学生学习材料分析") errors.push("skill_card.skill_name must be 学生学习材料分析");
  if (!readString(packet.skill_card?.skill_run_id)) errors.push("skill_card.skill_run_id is required");
  if (!readString(packet.skill_card?.card_title)) errors.push("skill_card.card_title is required");
  if (packet.skill_card?.detail_page !== "分析详情页") errors.push("skill_card.detail_page must be 分析详情页");
  if (!readString(packet.skill_card?.generated_at)) errors.push("skill_card.generated_at is required");
  if (deliveryBundle) {
    if (packet.skill_card.input_source.analysis_id !== deliveryBundle.analysis_id) errors.push("skill_card.input_source.analysis_id must match delivery bundle");
    if (packet.skill_card.input_source.source_material_id !== deliveryBundle.source_material_id) {
      errors.push("skill_card.input_source.source_material_id must match delivery bundle");
    }
    if (packet.skill_card.input_source.student_id !== deliveryBundle.student_id) errors.push("skill_card.input_source.student_id must match delivery bundle");
    if (packet.skill_card.status.display_status !== deliveryBundle.status.display_status) errors.push("skill_card.status.display_status must match delivery bundle");
    if (packet.skill_card.status.secondary_status !== deliveryBundle.status.secondary_status) {
      errors.push("skill_card.status.secondary_status must match delivery bundle");
    }
    if (packet.skill_card.status.feedback_status !== deliveryBundle.status.feedback_status) errors.push("skill_card.status.feedback_status must match delivery bundle");
    if (packet.skill_card.status.archive_status !== deliveryBundle.status.archive_status) errors.push("skill_card.status.archive_status must match delivery bundle");
  }
}

function validateReviewPolicy(packet: StudentLearningMaterialTeacherReviewPacket, errors: string[]) {
  const policy = packet.review_policy;
  if (!policy?.ai_outputs_are_draft) errors.push("review_policy.ai_outputs_are_draft must be true");
  if (policy?.auto_send_wechat !== false) errors.push("review_policy.auto_send_wechat must be false");
  if (policy?.auto_archive !== false) errors.push("review_policy.auto_archive must be false");
  if (!policy?.requires_teacher_confirmation_before_feedback_sent) {
    errors.push("review_policy.requires_teacher_confirmation_before_feedback_sent must be true");
  }
  if (!policy?.requires_teacher_confirmation_before_archive) {
    errors.push("review_policy.requires_teacher_confirmation_before_archive must be true");
  }
  if (!policy?.raw_internal_evidence_refs_hidden_from_teacher_copy) {
    errors.push("review_policy.raw_internal_evidence_refs_hidden_from_teacher_copy must be true");
  }
}

function validateTeacherVisiblePayload(
  packet: StudentLearningMaterialTeacherReviewPacket,
  deliveryBundle: StudentLearningMaterialDeliveryBundle | undefined,
  errors: string[]
) {
  const payload = packet.teacher_visible_payload;
  if (!payload || typeof payload !== "object") {
    errors.push("teacher_visible_payload is required");
    return;
  }
  for (const field of ["teacher_report_markdown", "parent_feedback_text", "monthly_summary", "month_over_month_comparison"] as const) {
    if (!readString(payload[field])) errors.push(`teacher_visible_payload.${field} is required`);
  }
  const teacherReportMarkdown = readString(payload.teacher_report_markdown);
  if (teacherReportMarkdown) {
    for (const section of REQUIRED_TEACHER_REPORT_MARKDOWN_SECTIONS) {
      if (!teacherReportMarkdown.includes(section)) errors.push(`teacher_visible_payload.teacher_report_markdown missing ${section}`);
    }
  }
  const visibleText = collectStringValues(payload).join("\n");
  for (const forbidden of ["evidenceRefs", "VisionEvidencePacket", "internal_evidence_ref", "DeepSeek"]) {
    if (visibleText.includes(forbidden)) errors.push(`teacher_visible_payload must not expose ${forbidden}`);
  }
  if (!Array.isArray(payload.question_rows) || payload.question_rows.length === 0) errors.push("teacher_visible_payload.question_rows must not be empty");
  if (!Array.isArray(payload.source_labels) || payload.source_labels.length === 0) errors.push("teacher_visible_payload.source_labels must not be empty");
  if (!Array.isArray(payload.safeguards) || payload.safeguards.length === 0) errors.push("teacher_visible_payload.safeguards must not be empty");
  if (!payload.safeguards.some((item) => item.includes("不会自动发送微信"))) {
    errors.push("teacher_visible_payload.safeguards must state WeChat is not auto-sent");
  }
  if (!payload.safeguards.some((item) => item.includes("不会自动入档"))) {
    errors.push("teacher_visible_payload.safeguards must state archive is not automatic");
  }
  if (deliveryBundle) {
    validateReviewSummaryMaterialClassification(packet, deliveryBundle, errors);
    validateReviewSummaryAgainstDeliveryBundle(packet, deliveryBundle, errors);
    if (payload.parent_feedback_text !== deliveryBundle.teacher_delivery.parent_feedback_text) {
      errors.push("teacher_visible_payload.parent_feedback_text must match delivery bundle");
    }
    if (payload.teacher_report_markdown !== deliveryBundle.teacher_delivery.teacher_report_markdown) {
      errors.push("teacher_visible_payload.teacher_report_markdown must match delivery bundle");
    }
    const expectedLabels = deliveryBundle.source_map.map((source) => source.source_id).join("|");
    if (payload.source_labels.join("|") !== expectedLabels) errors.push("teacher_visible_payload.source_labels must match delivery bundle source labels");
  }
}

function validateReviewSummaryMaterialClassification(
  packet: StudentLearningMaterialTeacherReviewPacket,
  deliveryBundle: StudentLearningMaterialDeliveryBundle,
  errors: string[]
) {
  const classification = packet.teacher_review_summary?.material_classification;
  const expected = deliveryBundle.teacher_delivery.material_classification;
  if (!classification || typeof classification !== "object") {
    errors.push("teacher_review_summary.material_classification is required");
    return;
  }
  if (classification.material_type !== expected.material_type) errors.push("teacher_review_summary.material_classification.material_type must match delivery bundle");
  if (classification.subject !== expected.subject) errors.push("teacher_review_summary.material_classification.subject must match delivery bundle");
  if (classification.education_stage !== expected.education_stage) errors.push("teacher_review_summary.material_classification.education_stage must match delivery bundle");
  if (classification.grade_candidate !== expected.grade_candidate) errors.push("teacher_review_summary.material_classification.grade_candidate must match delivery bundle");
  if (classification.region_or_curriculum_candidate !== expected.region_or_curriculum_candidate) {
    errors.push("teacher_review_summary.material_classification.region_or_curriculum_candidate must match delivery bundle");
  }
  if (!Array.isArray(classification.source_ids) || classification.source_ids.length === 0) {
    errors.push("teacher_review_summary.material_classification.source_ids must not be empty");
  }
  if ("evidenceRefs" in classification) {
    errors.push("teacher_review_summary.material_classification must not expose raw evidenceRefs");
  }
}

function validateReviewSummaryAgainstDeliveryBundle(
  packet: StudentLearningMaterialTeacherReviewPacket,
  deliveryBundle: StudentLearningMaterialDeliveryBundle,
  errors: string[]
) {
  const summary = packet.teacher_review_summary;
  const delivery = deliveryBundle.teacher_delivery;
  const reviewRequiredQuestionCount = delivery.question_rows.filter((row) => row.needs_teacher_review).length;
  const expectedMonthlyStatus = toTeacherReviewMonthlyComparisonStatus(delivery.monthly_comparison_evidence.previous_month_evidence_status);
  if (summary?.assessment_style !== delivery.assessment_style) errors.push("teacher_review_summary.assessment_style must match delivery bundle");
  if (summary?.material_summary !== delivery.material_summary) errors.push("teacher_review_summary.material_summary must match delivery bundle");
  if (summary?.data_credibility_level !== delivery.data_credibility.level) {
    errors.push("teacher_review_summary.data_credibility_level must match delivery bundle");
  }
  if (summary?.question_count !== delivery.question_rows.length) errors.push("teacher_review_summary.question_count must match delivery bundle");
  if (summary?.review_required_question_count !== reviewRequiredQuestionCount) {
    errors.push("teacher_review_summary.review_required_question_count must match delivery bundle review blockers");
  }
  if (summary?.parent_feedback_copyable !== delivery.parent_feedback_copyable) {
    errors.push("teacher_review_summary.parent_feedback_copyable must match delivery bundle");
  }
  if (summary?.monthly_comparison_status !== expectedMonthlyStatus) {
    errors.push("teacher_review_summary.monthly_comparison_status must match delivery bundle");
  }
  if (summary?.monthly_comparison_previous_month_source_count !== delivery.monthly_comparison_evidence.previous_month_source_ids.length) {
    errors.push("teacher_review_summary.monthly_comparison_previous_month_source_count must match delivery bundle monthly comparison evidence");
  }
  if (summary?.source_label_count !== deliveryBundle.source_map.length) {
    errors.push("teacher_review_summary.source_label_count must match delivery bundle source labels");
  }
}

function toTeacherReviewMonthlyComparisonStatus(status: "available" | "missing") {
  return status === "available" ? "has_previous_month_comparison" : "missing_previous_month_evidence";
}

function validateReviewActions(packet: StudentLearningMaterialTeacherReviewPacket, errors: string[]) {
  if (!Array.isArray(packet.review_actions) || packet.review_actions.length === 0) {
    errors.push("review_actions must not be empty");
    return;
  }
  const actionIds = new Set(packet.review_actions.map((action) => action.action_id));
  for (const required of ["view_analysis_detail", "edit_parent_feedback", "copy_parent_feedback", "mark_feedback_sent", "confirm_archive"]) {
    if (!actionIds.has(required as StudentLearningMaterialTeacherReviewActionId)) errors.push(`review_actions missing ${required}`);
  }
  packet.review_actions.forEach((action, index) => {
    if (!readString(action.label)) errors.push(`review_actions[${index}].label is required`);
    if (!readString(action.reason)) errors.push(`review_actions[${index}].reason is required`);
    if (action.writes_long_term_profile && action.action_id !== "confirm_archive") {
      errors.push(`review_actions[${index}] only confirm_archive may write long-term profile`);
    }
    if (action.action_id === "confirm_archive" && !action.requires_teacher_confirmation) {
      errors.push("confirm_archive must require teacher confirmation");
    }
    if (action.action_id === "mark_feedback_sent" && !action.requires_teacher_confirmation) {
      errors.push("mark_feedback_sent must require teacher confirmation");
    }
  });
}

function validateReviewActionsAgainstDeliveryBundle(
  packet: StudentLearningMaterialTeacherReviewPacket,
  deliveryBundle: StudentLearningMaterialDeliveryBundle,
  errors: string[]
) {
  const reviewRequiredCount = deliveryBundle.teacher_delivery.question_rows.filter((row) => row.needs_teacher_review).length;
  const feedbackStatus = deliveryBundle.status.feedback_status;
  const archiveStatus = deliveryBundle.status.archive_status;
  const hasReviewBlocker = feedbackStatus === "blocked" || feedbackStatus === "needs_teacher_review" || reviewRequiredCount > 0;
  const actions = new Map(packet.review_actions.map((action) => [action.action_id, action]));
  const expectedEnabled: Partial<Record<StudentLearningMaterialTeacherReviewActionId, boolean>> = {
    view_analysis_detail: true,
    edit_parent_feedback: feedbackStatus !== "blocked",
    copy_parent_feedback: deliveryBundle.teacher_delivery.parent_feedback_copyable && !hasReviewBlocker,
    mark_feedback_sent: feedbackStatus === "pending_feedback" && !hasReviewBlocker,
    confirm_archive: archiveStatus === "pending_archive" && !hasReviewBlocker,
    request_more_evidence: hasReviewBlocker,
    rerun_analysis: feedbackStatus === "blocked" || feedbackStatus === "needs_teacher_review"
  };

  Object.entries(expectedEnabled).forEach(([actionId, enabled]) => {
    const action = actions.get(actionId as StudentLearningMaterialTeacherReviewActionId);
    if (action && action.enabled !== enabled) {
      errors.push(`review_actions.${actionId}.enabled must match delivery bundle review blockers`);
    }
  });
}

function validateInternalAudit(
  packet: StudentLearningMaterialTeacherReviewPacket,
  deliveryBundle: StudentLearningMaterialDeliveryBundle | undefined,
  errors: string[]
) {
  if (packet.internal_audit?.source_map_expose_to_user !== false) {
    errors.push("internal_audit.source_map_expose_to_user must be false");
  }
  if (!Array.isArray(packet.internal_audit?.source_map) || packet.internal_audit.source_map.length === 0) {
    errors.push("internal_audit.source_map must not be empty");
  }
  if (deliveryBundle && packet.internal_audit?.source_map?.length !== deliveryBundle.source_map.length) {
    errors.push("internal_audit.source_map must match delivery bundle source_map length");
  }
  if (deliveryBundle && Array.isArray(packet.internal_audit?.source_map)) {
    packet.internal_audit.source_map.forEach((source, index) => {
      const expected = deliveryBundle.source_map[index];
      if (!expected) return;
      if (source.source_id !== expected.source_id) errors.push(`internal_audit.source_map[${index}].source_id must match delivery bundle`);
      if (source.internal_evidence_ref !== expected.internal_evidence_ref) {
        errors.push(`internal_audit.source_map[${index}].internal_evidence_ref must match delivery bundle`);
      }
    });
  }
}

function cloneQuestionRows(rows: StudentLearningMaterialDeliveryBundle["teacher_delivery"]["question_rows"]) {
  return rows.map((row) => ({
    ...row,
    knowledge_points: [...row.knowledge_points],
    mistake_diagnosis: [...row.mistake_diagnosis],
    source_ids: [...row.source_ids]
  }));
}

function cloneMaterialClassification(classification: StudentLearningMaterialDeliveryBundle["teacher_delivery"]["material_classification"]) {
  return {
    ...classification,
    source_ids: [...classification.source_ids]
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (isRecord(value)) return Object.values(value).flatMap(collectStringValues);
  return [];
}
