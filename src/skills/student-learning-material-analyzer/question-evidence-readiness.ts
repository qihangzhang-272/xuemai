import type {
  CorrectnessStatus,
  ValidationResult,
  VisionEvidence,
  VisionEvidencePacket,
  VisionEvidenceQuestion
} from "./types";

export type QuestionEvidenceReadinessStatus = "definitive_allowed" | "teacher_review_required" | "blocked";

export type QuestionEvidenceReadinessReason =
  | "question_segmentation_unstable"
  | "question_stem_missing"
  | "student_answer_missing"
  | "answer_basis_missing"
  | "critical_evidence_low_confidence"
  | "critical_evidence_region_missing"
  | "teacher_correction_ambiguous";

export type QuestionEvidenceReadiness = {
  question_id: string;
  question_number?: string;
  status: QuestionEvidenceReadinessStatus;
  definitive_judgement_allowed: boolean;
  reasons: QuestionEvidenceReadinessReason[];
  evidenceRefs: string[];
  confidence: number;
  evidence_summary: {
    has_question_stem: boolean;
    has_student_answer: boolean;
    has_student_process: boolean;
    has_teacher_correction: boolean;
    has_answer_key_or_rubric: boolean;
    has_external_answer_key: boolean;
    has_external_rubric: boolean;
    lowest_critical_confidence: number;
  };
};

export type QuestionEvidenceReadinessSideInputs = {
  answerKeys?: unknown[];
  rubrics?: unknown[];
};

export type QuestionEvidenceReadinessReport = {
  questions: QuestionEvidenceReadiness[];
  summary: {
    question_count: number;
    definitive_allowed_count: number;
    teacher_review_required_count: number;
    blocked_count: number;
    definitive_allowed_question_ids: string[];
    teacher_review_question_ids: string[];
    blocked_question_ids: string[];
  };
};

const criticalConfidenceThreshold = 0.65;
const unstableQuestionRiskFlags = new Set(["missing_question_number", "ambiguous_question_boundary", "overlapping_regions", "low_layout_confidence", "crop_missing"]);

export function buildQuestionEvidenceReadiness(packet: VisionEvidencePacket, sideInputs?: QuestionEvidenceReadinessSideInputs): QuestionEvidenceReadinessReport {
  const sideInputBasis = buildSideInputBasisByQuestionId(sideInputs);
  const questions = packet.questions.map((question) => buildSingleQuestionReadiness(packet, question, sideInputBasis.get(question.question_id)));
  const definitiveAllowed = questions.filter((question) => question.status === "definitive_allowed");
  const teacherReview = questions.filter((question) => question.status === "teacher_review_required");
  const blocked = questions.filter((question) => question.status === "blocked");

  return {
    questions,
    summary: {
      question_count: questions.length,
      definitive_allowed_count: definitiveAllowed.length,
      teacher_review_required_count: teacherReview.length,
      blocked_count: blocked.length,
      definitive_allowed_question_ids: definitiveAllowed.map((question) => question.question_id),
      teacher_review_question_ids: teacherReview.map((question) => question.question_id),
      blocked_question_ids: blocked.map((question) => question.question_id)
    }
  };
}

export function validateAnalysisAgainstQuestionEvidenceReadiness(
  analysis: { question_analyses?: Array<{ question_id: string; correctnessJudgement: { status: CorrectnessStatus } }> },
  readinessReport: QuestionEvidenceReadinessReport
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const readinessByQuestionId = new Map(readinessReport.questions.map((question) => [question.question_id, question]));

  const questionAnalyses = Array.isArray(analysis.question_analyses) ? analysis.question_analyses : [];
  questionAnalyses.forEach((question, index) => {
    const readiness = readinessByQuestionId.get(question.question_id);
    const prefix = `question_analyses[${index}]`;

    if (!readiness) {
      errors.push(`${prefix} references question_id not found in VisionEvidencePacket readiness: ${question.question_id}`);
      return;
    }

    if (isDefinitiveJudgement(question.correctnessJudgement.status) && !readiness.definitive_judgement_allowed) {
      errors.push(
        `${prefix}.correctnessJudgement definitive judgement is not allowed by question evidence readiness for ${question.question_id}: ${readiness.reasons.join(", ")}`
      );
    }

    if (readiness.status === "teacher_review_required" && question.correctnessJudgement.status !== "needs_teacher_review" && question.correctnessJudgement.status !== "unknown") {
      warnings.push(`${prefix}.correctnessJudgement should route to teacher review for ${question.question_id}: ${readiness.reasons.join(", ")}`);
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}

export function hasQuestionMappedExternalAnswerBasis(packet: VisionEvidencePacket, sideInputs?: QuestionEvidenceReadinessSideInputs): boolean {
  const sideInputBasis = buildSideInputBasisByQuestionId(sideInputs);
  return packet.questions.some((question) => {
    const basis = sideInputBasis.get(question.question_id);
    return Boolean(basis && (basis.answerKeyRefs.length > 0 || basis.rubricRefs.length > 0));
  });
}

function buildSingleQuestionReadiness(
  packet: VisionEvidencePacket,
  question: VisionEvidenceQuestion,
  externalBasis: SideInputQuestionBasis = emptySideInputQuestionBasis()
): QuestionEvidenceReadiness {
  const evidences = packet.evidences.filter((evidence) => evidence.question_id === question.question_id);
  const stemEvidence = evidences.filter((evidence) => evidence.evidence_type === "question_stem");
  const studentAnswerEvidence = evidences.filter((evidence) => evidence.evidence_type === "student_original_answer" || evidence.evidence_type === "student_revised_answer");
  const studentProcessEvidence = evidences.filter((evidence) => evidence.evidence_type === "student_process" || evidence.evidence_type === "student_note");
  const answerBasisEvidence = evidences.filter((evidence) => evidence.evidence_type === "answer_key" || evidence.evidence_type === "rubric");
  const teacherCorrectionEvidence = evidences.filter((evidence) => evidence.evidence_type === "teacher_mark" || evidence.evidence_type === "teacher_comment" || evidence.evidence_type === "teacher_score");
  const sideInputEvidenceRefs = [...externalBasis.answerKeyRefs, ...externalBasis.rubricRefs];
  const hasExternalAnswerKey = externalBasis.answerKeyRefs.length > 0;
  const hasExternalRubric = externalBasis.rubricRefs.length > 0;
  const criticalEvidence = [...stemEvidence, ...studentAnswerEvidence, ...answerBasisEvidence, ...teacherCorrectionEvidence];
  const lowestCriticalConfidence = criticalEvidence.length ? Math.min(...criticalEvidence.map((evidence) => evidence.confidence)) : 0;
  const reasons = buildReadinessReasons({
    question,
    stemEvidence,
    studentAnswerEvidence,
    answerBasisEvidence,
    teacherCorrectionEvidence,
    hasExternalAnswerKey,
    hasExternalRubric,
    criticalEvidence,
    lowestCriticalConfidence
  });
  const hasAnswerBasis = answerBasisEvidence.length > 0 || teacherCorrectionEvidence.length > 0 || hasExternalAnswerKey || hasExternalRubric;
  const definitiveAllowed =
    reasons.length === 0 &&
    stemEvidence.length > 0 &&
    studentAnswerEvidence.length > 0 &&
    hasAnswerBasis &&
    lowestCriticalConfidence >= criticalConfidenceThreshold;

  return {
    question_id: question.question_id,
    question_number: question.question_number,
    status: definitiveAllowed ? "definitive_allowed" : studentAnswerEvidence.length ? "teacher_review_required" : "blocked",
    definitive_judgement_allowed: definitiveAllowed,
    reasons,
    evidenceRefs: uniqueRefs([...evidences.map((evidence) => evidence.evidence_ref), ...sideInputEvidenceRefs]),
    confidence: computeReadinessConfidence({
      question,
      evidences,
      reasons,
      definitiveAllowed
    }),
    evidence_summary: {
      has_question_stem: stemEvidence.length > 0,
      has_student_answer: studentAnswerEvidence.length > 0,
      has_student_process: studentProcessEvidence.length > 0,
      has_teacher_correction: teacherCorrectionEvidence.length > 0,
      has_answer_key_or_rubric: answerBasisEvidence.length > 0 || hasExternalAnswerKey || hasExternalRubric,
      has_external_answer_key: hasExternalAnswerKey,
      has_external_rubric: hasExternalRubric,
      lowest_critical_confidence: round(lowestCriticalConfidence)
    }
  };
}

function buildReadinessReasons(input: {
  question: VisionEvidenceQuestion;
  stemEvidence: VisionEvidence[];
  studentAnswerEvidence: VisionEvidence[];
  answerBasisEvidence: VisionEvidence[];
  teacherCorrectionEvidence: VisionEvidence[];
  hasExternalAnswerKey: boolean;
  hasExternalRubric: boolean;
  criticalEvidence: VisionEvidence[];
  lowestCriticalConfidence: number;
}) {
  const reasons: QuestionEvidenceReadinessReason[] = [];
  if (isQuestionSegmentationUnstable(input.question)) reasons.push("question_segmentation_unstable");
  if (!input.stemEvidence.length) reasons.push("question_stem_missing");
  if (!input.studentAnswerEvidence.length) reasons.push("student_answer_missing");
  if (!input.answerBasisEvidence.length && !input.teacherCorrectionEvidence.length && !input.hasExternalAnswerKey && !input.hasExternalRubric) {
    reasons.push("answer_basis_missing");
  }
  if (input.criticalEvidence.length && input.lowestCriticalConfidence < criticalConfidenceThreshold) reasons.push("critical_evidence_low_confidence");
  if (input.criticalEvidence.some((evidence) => !evidence.region_id)) reasons.push("critical_evidence_region_missing");
  if (input.teacherCorrectionEvidence.some((evidence) => evidence.confidence < 0.8 || evidence.risk_flags.length > 0)) reasons.push("teacher_correction_ambiguous");
  return [...new Set(reasons)];
}

function isQuestionSegmentationUnstable(question: VisionEvidenceQuestion) {
  if (question.confidence < criticalConfidenceThreshold) return true;
  if (!question.regions.length) return true;
  if (question.risk_flags.some((flag) => unstableQuestionRiskFlags.has(flag))) return true;
  return question.regions.some((region) => region.confidence < criticalConfidenceThreshold || !region.crop_ref || (!region.bbox && !region.polygon));
}

function computeReadinessConfidence(input: {
  question: VisionEvidenceQuestion;
  evidences: VisionEvidence[];
  reasons: QuestionEvidenceReadinessReason[];
  definitiveAllowed: boolean;
}) {
  const evidenceConfidence = input.evidences.length ? input.evidences.reduce((sum, evidence) => sum + evidence.confidence, 0) / input.evidences.length : 0.2;
  const confidence = input.definitiveAllowed
    ? Math.min(0.95, (input.question.confidence + evidenceConfidence) / 2)
    : Math.max(0.2, Math.min(0.72, evidenceConfidence - input.reasons.length * 0.08));
  return round(confidence);
}

function isDefinitiveJudgement(status: CorrectnessStatus) {
  return status === "correct" || status === "partially_correct" || status === "incorrect";
}

function uniqueRefs(refs: string[]) {
  return [...new Set(refs.filter(Boolean))];
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

type SideInputQuestionBasis = {
  answerKeyRefs: string[];
  rubricRefs: string[];
};

function buildSideInputBasisByQuestionId(sideInputs?: QuestionEvidenceReadinessSideInputs) {
  const byQuestionId = new Map<string, SideInputQuestionBasis>();
  collectQuestionMappedSideInputRefs(sideInputs?.answerKeys, "answer_key", byQuestionId);
  collectQuestionMappedSideInputRefs(sideInputs?.rubrics, "rubric", byQuestionId);
  return byQuestionId;
}

function collectQuestionMappedSideInputRefs(values: unknown[] | undefined, kind: "answer_key" | "rubric", byQuestionId: Map<string, SideInputQuestionBasis>) {
  if (!Array.isArray(values)) return;

  values.forEach((value) => {
    const questionId = extractExplicitQuestionId(value);
    if (!questionId) return;
    const basis = byQuestionId.get(questionId) ?? emptySideInputQuestionBasis();
    const ref = `side_input.${kind}.${sanitizeEvidenceRefSegment(questionId)}`;
    if (kind === "answer_key") {
      basis.answerKeyRefs = uniqueRefs([...basis.answerKeyRefs, ref]);
    } else {
      basis.rubricRefs = uniqueRefs([...basis.rubricRefs, ref]);
    }
    byQuestionId.set(questionId, basis);
  });
}

function extractExplicitQuestionId(value: unknown) {
  if (!isRecord(value)) return undefined;
  return readNonEmptyString(value.question_id) ?? readNonEmptyString(value.questionId);
}

function emptySideInputQuestionBasis(): SideInputQuestionBasis {
  return {
    answerKeyRefs: [],
    rubricRefs: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sanitizeEvidenceRefSegment(value: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return normalized || "question";
}
