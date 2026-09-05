import {
  buildQuestionEvidenceReadiness,
  type QuestionEvidenceReadinessReason,
  type QuestionEvidenceReadinessStatus
} from "./question-evidence-readiness";
import {
  buildQuestionSegmentationReview,
  validateQuestionSegmentationReview,
  type QuestionSegmentationReviewIssue,
  type QuestionSegmentationReviewStatus,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import type { GateStatus, ValidationResult, VisionEvidencePacket, VisionEvidenceType } from "./types";
import { validateVisionEvidencePacket } from "./validators";

export type VisionProviderTrialReadiness = "ready_for_human_labeling" | "needs_evidence_completion" | "blocked";

export type StudentLearningMaterialVisionProviderTrialReport = {
  schema_version: "student_learning_material_vision_provider_trial_report.v0.1";
  source_material_id: string;
  material_id: string;
  vision_packet_id: string;
  plugin_provider: string;
  plugin_model_version: string;
  generated_at: string;
  readiness: VisionProviderTrialReadiness;
  provider_candidates: Array<{
    name: string;
    role: string;
    fit: string;
    license_note?: string;
    evidence_source_url?: string;
    notes?: string[];
  }>;
  summary: {
    page_count: number;
    question_count: number;
    evidence_count: number;
    student_trace_evidence_count: number;
    answer_basis_evidence_count: number;
    gate_statuses: Record<string, GateStatus>;
    segmentation_pass_count: number;
    segmentation_needs_teacher_review_count: number;
    segmentation_blocked_count: number;
    missing_crop_ref_count: number;
    low_confidence_region_count: number;
    orphan_evidence_count: number;
    evidence_without_region_count: number;
    definitive_allowed_count: number;
    teacher_review_required_count: number;
    blocked_question_count: number;
  };
  blockers: string[];
  warnings: string[];
  next_steps: string[];
  questions: Array<{
    question_id: string;
    question_number?: string;
    page_id?: string;
    segmentation_status: QuestionSegmentationReviewStatus;
    readiness_status: QuestionEvidenceReadinessStatus;
    definitive_judgement_allowed: boolean;
    review_required: boolean;
    confidence: number;
    issues: QuestionSegmentationReviewIssue[];
    readiness_reasons: QuestionEvidenceReadinessReason[];
    evidence_refs: string[];
    evidence_type_counts: Partial<Record<VisionEvidenceType, number>>;
  }>;
};

export function buildVisionProviderTrialReport(
  packet: VisionEvidencePacket,
  options?: {
    segmentationReview?: StudentLearningMaterialQuestionSegmentationReview;
    generatedAt?: string;
  }
): StudentLearningMaterialVisionProviderTrialReport {
  const packetValidation = validateVisionEvidencePacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`Vision provider trial report cannot be built because VisionEvidencePacket is invalid: ${packetValidation.errors.join("；")}`);
  }

  const segmentationReview = options?.segmentationReview ?? buildQuestionSegmentationReview(packet, { generatedAt: options?.generatedAt });
  const segmentationValidation = validateQuestionSegmentationReview(segmentationReview, packet);
  if (!segmentationValidation.ok) {
    throw new Error(`Vision provider trial report cannot be built because question segmentation review is invalid: ${segmentationValidation.errors.join("；")}`);
  }

  const readiness = buildQuestionEvidenceReadiness(packet);
  const readinessByQuestionId = new Map(readiness.questions.map((question) => [question.question_id, question]));
  const summary = {
    page_count: packet.pages.length,
    question_count: packet.questions.length,
    evidence_count: packet.evidences.length,
    student_trace_evidence_count: packet.evidences.filter((evidence) => studentTraceTypes.has(evidence.evidence_type)).length,
    answer_basis_evidence_count: packet.evidences.filter((evidence) => answerBasisTypes.has(evidence.evidence_type)).length,
    gate_statuses: Object.fromEntries(packet.gates.map((gate) => [gate.gate_id, gate.status])),
    segmentation_pass_count: segmentationReview.summary.pass_count,
    segmentation_needs_teacher_review_count: segmentationReview.summary.needs_teacher_review_count,
    segmentation_blocked_count: segmentationReview.summary.blocked_count,
    missing_crop_ref_count: segmentationReview.summary.missing_crop_ref_count,
    low_confidence_region_count: segmentationReview.summary.low_confidence_region_count,
    orphan_evidence_count: segmentationReview.summary.orphan_evidence_count,
    evidence_without_region_count: segmentationReview.summary.evidence_without_region_count,
    definitive_allowed_count: readiness.summary.definitive_allowed_count,
    teacher_review_required_count: readiness.summary.teacher_review_required_count,
    blocked_question_count: readiness.summary.blocked_count
  };
  const blockers = buildTrialBlockers(packet, summary);
  const warnings = buildTrialWarnings(packet, summary, packetValidation.warnings, segmentationValidation.warnings);
  const trialReadiness = blockers.length ? "blocked" : warnings.length ? "needs_evidence_completion" : "ready_for_human_labeling";

  return {
    schema_version: "student_learning_material_vision_provider_trial_report.v0.1",
    source_material_id: packet.source_material_id,
    material_id: packet.material_id,
    vision_packet_id: packet.plugin_run_id,
    plugin_provider: packet.plugin_provider,
    plugin_model_version: packet.plugin_model_version,
    generated_at: options?.generatedAt ?? new Date().toISOString(),
    readiness: trialReadiness,
    provider_candidates: (packet.pipeline_trace?.provider_candidates ?? []).map((candidate) => ({
      name: candidate.name,
      role: candidate.role,
      fit: candidate.fit,
      license_note: candidate.license_note,
      evidence_source_url: candidate.evidence_source_url,
      notes: candidate.notes
    })),
    summary,
    blockers,
    warnings,
    next_steps: buildNextSteps(trialReadiness, summary),
    questions: segmentationReview.questions.map((question) => {
      const questionReadiness = readinessByQuestionId.get(question.question_id);
      return {
        question_id: question.question_id,
        question_number: question.question_number,
        page_id: question.page_id,
        segmentation_status: question.status,
        readiness_status: questionReadiness?.status ?? "blocked",
        definitive_judgement_allowed: Boolean(questionReadiness?.definitive_judgement_allowed),
        review_required: question.review_required || questionReadiness?.status !== "definitive_allowed",
        confidence: questionReadiness?.confidence ?? question.confidence,
        issues: question.issues,
        readiness_reasons: questionReadiness?.reasons ?? ["question_segmentation_unstable"],
        evidence_refs: questionReadiness?.evidenceRefs ?? question.evidence_refs,
        evidence_type_counts: question.evidence_type_counts
      };
    })
  };
}

export function validateVisionProviderTrialReport(
  value: unknown,
  packet?: VisionEvidencePacket,
  segmentationReview?: StudentLearningMaterialQuestionSegmentationReview
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["vision provider trial report must be an object"], warnings };
  }
  const report = value as StudentLearningMaterialVisionProviderTrialReport;
  if (report.schema_version !== "student_learning_material_vision_provider_trial_report.v0.1") {
    errors.push("schema_version must be student_learning_material_vision_provider_trial_report.v0.1");
  }
  for (const field of ["source_material_id", "material_id", "vision_packet_id", "plugin_provider", "plugin_model_version", "generated_at"] as const) {
    if (!readString(report[field])) errors.push(`${field} is required`);
  }
  if (report.readiness !== "ready_for_human_labeling" && report.readiness !== "needs_evidence_completion" && report.readiness !== "blocked") {
    errors.push("readiness must be ready_for_human_labeling, needs_evidence_completion, or blocked");
  }
  if (!Array.isArray(report.provider_candidates)) errors.push("provider_candidates must be an array");
  if (!isRecord(report.summary)) errors.push("summary is required");
  if (!Array.isArray(report.blockers)) errors.push("blockers must be an array");
  if (!Array.isArray(report.warnings)) errors.push("warnings must be an array");
  if (!Array.isArray(report.next_steps) || report.next_steps.length === 0) errors.push("next_steps must not be empty");
  if (!Array.isArray(report.questions)) errors.push("questions must be an array");

  if (report.summary && Array.isArray(report.questions) && report.summary.question_count !== report.questions.length) {
    errors.push("summary.question_count must match questions length");
  }
  if (report.readiness === "ready_for_human_labeling" && (report.blockers.length > 0 || report.warnings.length > 0)) {
    errors.push("ready_for_human_labeling report must not have blockers or warnings");
  }
  if (report.readiness === "blocked" && report.blockers.length === 0) {
    errors.push("blocked report must include blockers");
  }

  const serialized = JSON.stringify(report);
  if (serialized.includes("raw_ocr_text") || serialized.includes("normalized_text")) {
    errors.push("vision provider trial report must not include raw OCR text fields");
  }

  if (packet) {
    validateNoPacketTextContentLeak(report, packet, errors);
    validateReportAgainstPacket(report, packet, errors);
    validateReportMatchesPacketDerivedTrial(report, packet, segmentationReview, errors);
  }
  if (segmentationReview && report.summary.question_count !== segmentationReview.summary.question_count) {
    errors.push("summary.question_count must match question segmentation review");
  }

  if (Array.isArray(report.questions)) {
    report.questions.forEach((question, index) => validateReportQuestion(question, index, errors));
  }
  return { ok: errors.length === 0, errors, warnings };
}

function validateNoPacketTextContentLeak(value: unknown, packet: VisionEvidencePacket, errors: string[]) {
  const artifactText = collectStringValues(value).map(normalizeComparableText).filter(Boolean).join(" ");
  const leakedEvidenceRefs = new Set<string>();
  for (const evidence of packet.evidences) {
    const snippets = [evidence.raw_ocr_text, evidence.normalized_text, evidence.text]
      .map((text) => normalizeComparableText(text))
      .filter((text): text is string => Boolean(text && text.length >= 4));
    if (snippets.some((snippet) => artifactText.includes(snippet))) {
      leakedEvidenceRefs.add(evidence.evidence_ref);
    }
  }
  leakedEvidenceRefs.forEach((evidenceRef) => {
    errors.push(`vision provider trial report must not include OCR/text content copied from VisionEvidencePacket evidence_ref=${evidenceRef}`);
  });
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStringValues(item));
  if (!isRecord(value)) return [];
  return Object.values(value).flatMap((item) => collectStringValues(item));
}

function normalizeComparableText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, "") : "";
}

const studentTraceTypes = new Set<VisionEvidenceType>([
  "student_original_answer",
  "student_revised_answer",
  "student_process",
  "student_note",
  "teacher_mark",
  "teacher_comment",
  "teacher_score"
]);
const answerBasisTypes = new Set<VisionEvidenceType>(["answer_key", "rubric"]);

function buildTrialBlockers(packet: VisionEvidencePacket, summary: StudentLearningMaterialVisionProviderTrialReport["summary"]) {
  const blockers: string[] = [];
  if (packet.material_state !== "valid_student_material") blockers.push(`material_state=${packet.material_state} cannot support student performance analysis`);
  if (summary.question_count === 0) blockers.push("no questions were detected");
  if (summary.student_trace_evidence_count === 0) blockers.push("no student answer, correction, note, or teacher-mark evidence was detected");
  if (summary.segmentation_blocked_count > 0) blockers.push("one or more questions have blocked segmentation");
  if (summary.orphan_evidence_count > 0) blockers.push("provider output contains orphan evidence not attached to known questions");
  return blockers;
}

function buildTrialWarnings(
  packet: VisionEvidencePacket,
  summary: StudentLearningMaterialVisionProviderTrialReport["summary"],
  packetWarnings: string[],
  segmentationWarnings: string[]
) {
  const warnings = [...packetWarnings, ...segmentationWarnings];
  if (Object.values(summary.gate_statuses).some((status) => status === "degrade")) warnings.push("one or more VisionEvidencePacket gates are degraded");
  if (summary.segmentation_needs_teacher_review_count > 0) warnings.push("one or more questions need teacher review before definitive gold judgement");
  if (summary.missing_crop_ref_count > 0) warnings.push("missing crop_ref prevents definitive per-question judgement");
  if (summary.low_confidence_region_count > 0) warnings.push("low-confidence regions need OCR/Layout provider review");
  if (summary.evidence_without_region_count > 0) warnings.push("some evidence lacks region_id and needs question attribution review");
  if (summary.answer_basis_evidence_count === 0) warnings.push("no answer key or rubric evidence was detected; add question-mapped side inputs or provider extraction");
  if (summary.definitive_allowed_count === 0 && packet.questions.length > 0) warnings.push("no question currently passes definitive judgement readiness");
  return uniqueStrings(warnings);
}

function buildNextSteps(readiness: VisionProviderTrialReadiness, summary: StudentLearningMaterialVisionProviderTrialReport["summary"]) {
  if (readiness === "ready_for_human_labeling") {
    return [
      "Generate question-segmentation review and redacted annotation task from the same VisionEvidencePacket.",
      "Collect double human labels, adjudicate disagreements, and convert annotation import into a final gold package.",
      "Add analysis/result/monthly/delivery artifacts before running validate:k12-eval-assets."
    ];
  }
  if (readiness === "blocked") {
    return [
      "Fix Provider output before text reasoning: restore student trace evidence, known question ids, and stable segmentation.",
      "Regenerate VisionEvidencePacket and rerun this provider trial report.",
      "Do not include this case in a 99% evaluation asset manifest yet."
    ];
  }
  return [
    summary.missing_crop_ref_count > 0 ? "Add crop_ref for every question region and critical evidence crop." : "",
    summary.answer_basis_evidence_count === 0 ? "Attach question-mapped answer keys or rubrics, or provide a separate side-input file." : "",
    summary.segmentation_needs_teacher_review_count > 0 ? "Review low-confidence or risky question boundaries before final gold labeling." : "",
    "Rerun provider trial report, then generate redacted annotation task only after blockers are gone."
  ].filter((item) => item.length > 0);
}

function validateReportAgainstPacket(report: StudentLearningMaterialVisionProviderTrialReport, packet: VisionEvidencePacket, errors: string[]) {
  if (report.source_material_id !== packet.source_material_id) errors.push("source_material_id must match VisionEvidencePacket");
  if (report.material_id !== packet.material_id) errors.push("material_id must match VisionEvidencePacket");
  if (report.vision_packet_id !== packet.plugin_run_id) errors.push("vision_packet_id must match VisionEvidencePacket plugin_run_id");
  if (report.plugin_provider !== packet.plugin_provider) errors.push("plugin_provider must match VisionEvidencePacket");
  if (report.plugin_model_version !== packet.plugin_model_version) errors.push("plugin_model_version must match VisionEvidencePacket");
  if (report.summary.page_count !== packet.pages.length) errors.push("summary.page_count must match VisionEvidencePacket pages");
  if (report.summary.evidence_count !== packet.evidences.length) errors.push("summary.evidence_count must match VisionEvidencePacket evidences");
  if (!Array.isArray(report.questions)) return;
  const packetQuestionIds = new Set(packet.questions.map((question) => question.question_id));
  report.questions.forEach((question) => {
    if (!packetQuestionIds.has(question.question_id)) errors.push(`questions question_id=${question.question_id} missing from VisionEvidencePacket`);
  });
}

function validateReportMatchesPacketDerivedTrial(
  report: StudentLearningMaterialVisionProviderTrialReport,
  packet: VisionEvidencePacket,
  segmentationReview: StudentLearningMaterialQuestionSegmentationReview | undefined,
  errors: string[]
) {
  let expected: StudentLearningMaterialVisionProviderTrialReport;
  try {
    expected = buildVisionProviderTrialReport(packet, {
      segmentationReview,
      generatedAt: readString(report.generated_at)
    });
  } catch (error) {
    errors.push(`VisionEvidencePacket-derived provider trial report cannot be rebuilt: ${formatError(error)}`);
    return;
  }

  if (report.readiness !== expected.readiness) {
    errors.push("readiness must match VisionEvidencePacket-derived provider trial report");
  }

  for (const field of [
    "page_count",
    "question_count",
    "evidence_count",
    "student_trace_evidence_count",
    "answer_basis_evidence_count",
    "segmentation_pass_count",
    "segmentation_needs_teacher_review_count",
    "segmentation_blocked_count",
    "missing_crop_ref_count",
    "low_confidence_region_count",
    "orphan_evidence_count",
    "evidence_without_region_count",
    "definitive_allowed_count",
    "teacher_review_required_count",
    "blocked_question_count"
  ] as const) {
    if (report.summary[field] !== expected.summary[field]) {
      errors.push(`summary.${field} must match VisionEvidencePacket-derived provider trial report`);
    }
  }

  validateGateStatusesMatchExpected(report.summary.gate_statuses, expected.summary.gate_statuses, errors);
  validateProviderCandidatesMatchExpected(report.provider_candidates, expected.provider_candidates, errors);
  if (joinStringArray(report.blockers) !== expected.blockers.join("|")) {
    errors.push("blockers must match VisionEvidencePacket-derived provider trial report");
  }
  if (joinStringArray(report.warnings) !== expected.warnings.join("|")) {
    errors.push("warnings must match VisionEvidencePacket-derived provider trial report");
  }
  if (joinStringArray(report.next_steps) !== expected.next_steps.join("|")) {
    errors.push("next_steps must match VisionEvidencePacket-derived provider trial report");
  }
  validateReportQuestionsMatchExpected(report.questions, expected.questions, errors);
}

function validateGateStatusesMatchExpected(actual: Record<string, GateStatus>, expected: Record<string, GateStatus>, errors: string[]) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (actualKeys.join("|") !== expectedKeys.join("|")) {
    errors.push("summary.gate_statuses keys must match VisionEvidencePacket-derived provider trial report");
    return;
  }
  expectedKeys.forEach((gateId) => {
    if (actual[gateId] !== expected[gateId]) {
      errors.push(`summary.gate_statuses.${gateId} must match VisionEvidencePacket-derived provider trial report`);
    }
  });
}

function validateProviderCandidatesMatchExpected(
  actual: StudentLearningMaterialVisionProviderTrialReport["provider_candidates"],
  expected: StudentLearningMaterialVisionProviderTrialReport["provider_candidates"],
  errors: string[]
) {
  if (!Array.isArray(actual)) return;
  if (actual.length !== expected.length) {
    errors.push("provider_candidates length must match VisionEvidencePacket-derived provider trial report");
    return;
  }
  actual.forEach((candidate, index) => {
    const expectedCandidate = expected[index];
    if (!expectedCandidate) return;
    for (const field of ["name", "role", "fit", "license_note", "evidence_source_url"] as const) {
      if (candidate[field] !== expectedCandidate[field]) {
        errors.push(`provider_candidates[${index}].${field} must match VisionEvidencePacket-derived provider trial report`);
      }
    }
    if (joinStringArray(candidate.notes) !== (expectedCandidate.notes ?? []).join("|")) {
      errors.push(`provider_candidates[${index}].notes must match VisionEvidencePacket-derived provider trial report`);
    }
  });
}

function validateReportQuestionsMatchExpected(
  actualQuestions: StudentLearningMaterialVisionProviderTrialReport["questions"],
  expectedQuestions: StudentLearningMaterialVisionProviderTrialReport["questions"],
  errors: string[]
) {
  if (!Array.isArray(actualQuestions)) return;
  if (actualQuestions.length !== expectedQuestions.length) {
    errors.push("questions length must match VisionEvidencePacket-derived provider trial report");
  }
  const expectedByQuestionId = new Map(expectedQuestions.map((question) => [question.question_id, question]));
  actualQuestions.forEach((actual, index) => {
    const expected = expectedByQuestionId.get(actual.question_id);
    if (!expected) {
      errors.push(`questions[${index}].question_id must exist in VisionEvidencePacket-derived provider trial report`);
      return;
    }
    for (const field of [
      "segmentation_status",
      "readiness_status",
      "definitive_judgement_allowed",
      "review_required",
      "confidence"
    ] as const) {
      if (actual[field] !== expected[field]) {
        errors.push(`questions[${index}].${field} must match VisionEvidencePacket-derived provider trial report`);
      }
    }
    if (joinStringArray(actual.issues) !== expected.issues.join("|")) {
      errors.push(`questions[${index}].issues must match VisionEvidencePacket-derived provider trial report`);
    }
    if (joinStringArray(actual.readiness_reasons) !== expected.readiness_reasons.join("|")) {
      errors.push(`questions[${index}].readiness_reasons must match VisionEvidencePacket-derived provider trial report`);
    }
    if (joinStringArray(actual.evidence_refs) !== expected.evidence_refs.join("|")) {
      errors.push(`questions[${index}].evidence_refs must match VisionEvidencePacket-derived provider trial report`);
    }
    validateEvidenceTypeCountsMatchExpected(actual.evidence_type_counts, expected.evidence_type_counts, `questions[${index}]`, errors);
  });
}

function validateEvidenceTypeCountsMatchExpected(
  actual: Partial<Record<VisionEvidenceType, number>>,
  expected: Partial<Record<VisionEvidenceType, number>>,
  prefix: string,
  errors: string[]
) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (actualKeys.join("|") !== expectedKeys.join("|")) {
    errors.push(`${prefix}.evidence_type_counts keys must match VisionEvidencePacket-derived provider trial report`);
    return;
  }
  expectedKeys.forEach((key) => {
    const evidenceType = key as VisionEvidenceType;
    if (actual[evidenceType] !== expected[evidenceType]) {
      errors.push(`${prefix}.evidence_type_counts.${evidenceType} must match VisionEvidencePacket-derived provider trial report`);
    }
  });
}

function validateReportQuestion(value: unknown, index: number, errors: string[]) {
  const prefix = `questions[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!readString(value.question_id)) errors.push(`${prefix}.question_id is required`);
  if (value.segmentation_status !== "pass" && value.segmentation_status !== "needs_teacher_review" && value.segmentation_status !== "blocked") {
    errors.push(`${prefix}.segmentation_status must be pass, needs_teacher_review, or blocked`);
  }
  if (
    value.readiness_status !== "definitive_allowed" &&
    value.readiness_status !== "teacher_review_required" &&
    value.readiness_status !== "blocked"
  ) {
    errors.push(`${prefix}.readiness_status must be definitive_allowed, teacher_review_required, or blocked`);
  }
  if (typeof value.definitive_judgement_allowed !== "boolean") errors.push(`${prefix}.definitive_judgement_allowed must be boolean`);
  if (typeof value.review_required !== "boolean") errors.push(`${prefix}.review_required must be boolean`);
  if (!Array.isArray(value.issues)) errors.push(`${prefix}.issues must be an array`);
  if (!Array.isArray(value.readiness_reasons)) errors.push(`${prefix}.readiness_reasons must be an array`);
  if (!Array.isArray(value.evidence_refs)) errors.push(`${prefix}.evidence_refs must be an array`);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function joinStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("|") : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
