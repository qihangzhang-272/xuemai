import { createDegradedAnalysis } from "./degraded-analysis";
import { detectExplicitNonK12Scope } from "./material-classifier";
import { createLearningMaterialAnalysisModel } from "./model";
import { buildLearningMaterialAnalysisPrompt } from "./prompt";
import {
  buildQuestionEvidenceReadiness,
  hasQuestionMappedExternalAnswerBasis,
  validateAnalysisAgainstQuestionEvidenceReadiness
} from "./question-evidence-readiness";
import {
  checkEvidenceCoverage,
  checkWechatFeedbackSafety,
  validateStudentLearningMaterialAnalysis,
  validateStudentLearningMaterialAnalysisEvidenceRefsAgainstPacket,
  validateStudentLearningMaterialAnalysisMistakeDiagnosisEvidenceAgainstPacket,
  validateStudentLearningMaterialAnalysisProfileUpdateSuggestionsAgainstPacket,
  validateStudentLearningMaterialAnalysisQuestionCoverageAgainstPacket,
  validateVisionEvidencePacket
} from "./validators";
import type {
  DegradedReason,
  LearningMaterialAnalysisModel,
  LearningMaterialAnalyzerRepository,
  StudentLearningMaterialAnalysis,
  TeacherReviewItem,
  TrustedTeacherContext,
  VisionEvidencePacket
} from "./types";

export type AnalyzeLearningEvidenceRunnerInput = {
  analysisJobId: string;
  materialId: string;
  studentId: string;
  visionEvidencePacket?: VisionEvidencePacket;
  answerKeys?: unknown[];
  rubrics?: unknown[];
  knowledgePoints?: unknown[];
  studentProfileHistory?: unknown[];
  teacherContext?: TrustedTeacherContext;
  repository?: LearningMaterialAnalyzerRepository;
  model?: LearningMaterialAnalysisModel;
};

export type AnalyzeLearningEvidenceRunnerResult = {
  status: "draft_ready" | "degraded";
  analysis: StudentLearningMaterialAnalysis;
  reviewItems: TeacherReviewItem[];
  validationErrors: string[];
  safetyWarnings: string[];
};

export async function runAnalyzeLearningEvidence(input: AnalyzeLearningEvidenceRunnerInput): Promise<AnalyzeLearningEvidenceRunnerResult> {
  const context = input.teacherContext;
  const repository = input.repository;
  await updateJob(repository, context, input.analysisJobId, "running");

  const packet = await loadVisionEvidencePacket(input);
  const packetSave = repository && context ? await repository.saveVisionEvidencePacket(context, packet) : undefined;
  const packetValidation = validateVisionEvidencePacket(packet);
  const questionEvidenceReadiness = buildQuestionEvidenceReadiness(packet, {
    answerKeys: input.answerKeys,
    rubrics: input.rubrics
  });
  const preModelReasons = [
    ...inferDegradedReasons(packet, {
      answerKeys: input.answerKeys,
      rubrics: input.rubrics
    }),
    ...(packetValidation.ok ? [] : (["vision_packet_invalid"] satisfies DegradedReason[]))
  ];

  if (preModelReasons.length > 0) {
    return persistResult({
      input,
      packet,
      packetId: packetSave?.packetId,
      status: "degraded",
      analysis: createDegradedAnalysis({
        analysisId: buildAnalysisId(input.analysisJobId, "degraded"),
        packet,
        reasons: uniqueReasons(preModelReasons),
        message: "当前材料证据不足或存在风险，需要老师先复核后再形成正式分析。",
        validationErrors: packetValidation.errors,
        safetyWarnings: packetValidation.warnings
      }),
      validationErrors: packetValidation.errors,
      safetyWarnings: packetValidation.warnings
    });
  }

  const prompt = buildLearningMaterialAnalysisPrompt({
    packet,
    answerKeys: input.answerKeys,
    rubrics: input.rubrics,
    knowledgePoints: input.knowledgePoints,
    studentProfileHistory: input.studentProfileHistory
  });

  try {
    const model = input.model ?? createLearningMaterialAnalysisModel();
    const rawAnalysis = await model.generateAnalysis({
      packet,
      answerKeys: input.answerKeys,
      rubrics: input.rubrics,
      knowledgePoints: input.knowledgePoints,
      studentProfileHistory: input.studentProfileHistory,
      prompt
    });
    const analysis = rawAnalysis as StudentLearningMaterialAnalysis;
    const validation = validateStudentLearningMaterialAnalysis(analysis);
    const coverage = checkEvidenceCoverage(analysis);
    const feedbackSafety = checkWechatFeedbackSafety(analysis.wechat_parent_feedback_draft);
    const questionReadinessValidation = validateAnalysisAgainstQuestionEvidenceReadiness(analysis, questionEvidenceReadiness);
    const questionCoverageValidation = validateStudentLearningMaterialAnalysisQuestionCoverageAgainstPacket(analysis, packet);
    const allowedExternalEvidenceRefsByQuestionId = buildSideInputRefsByQuestionId(questionEvidenceReadiness);
    const evidenceRefValidation = validateStudentLearningMaterialAnalysisEvidenceRefsAgainstPacket(analysis, packet, {
      allowedExternalEvidenceRefs: [...allowedExternalEvidenceRefsByQuestionId.values()].flat(),
      allowedExternalEvidenceRefsByQuestionId
    });
    const mistakeDiagnosisEvidenceValidation = validateStudentLearningMaterialAnalysisMistakeDiagnosisEvidenceAgainstPacket(analysis, packet);
    const profileUpdateSuggestionValidation = validateStudentLearningMaterialAnalysisProfileUpdateSuggestionsAgainstPacket(analysis, packet);
    const validationErrors = [
      ...validation.errors,
      ...coverage.errors,
      ...feedbackSafety.errors,
      ...questionReadinessValidation.errors,
      ...questionCoverageValidation.errors,
      ...evidenceRefValidation.errors,
      ...mistakeDiagnosisEvidenceValidation.errors,
      ...profileUpdateSuggestionValidation.errors
    ];
    const safetyWarnings = [
      ...validation.warnings,
      ...coverage.warnings,
      ...feedbackSafety.warnings,
      ...questionReadinessValidation.warnings,
      ...questionCoverageValidation.warnings,
      ...evidenceRefValidation.warnings,
      ...mistakeDiagnosisEvidenceValidation.warnings,
      ...profileUpdateSuggestionValidation.warnings
    ];

    if (validationErrors.length > 0) {
      const reasons: DegradedReason[] = validationErrors.some((error) => error.includes("Forbidden feedback"))
        ? ["wechat_feedback_unsafe"]
        : validationErrors.some((error) => error.includes("evidenceRefs"))
          ? ["missing_evidenceRefs"]
          : ["model_output_invalid"];
      return persistResult({
        input,
        packet,
        packetId: packetSave?.packetId,
        status: "degraded",
        analysis: createDegradedAnalysis({
          analysisId: buildAnalysisId(input.analysisJobId, "model_degraded"),
          packet,
          reasons,
          message: "模型输出未通过结构化校验，已降级为老师复核草稿。",
          validationErrors,
          safetyWarnings
        }),
        validationErrors,
        safetyWarnings
      });
    }

    return persistResult({
      input,
      packet,
      packetId: packetSave?.packetId,
      status: "draft_ready",
      analysis,
      validationErrors: [],
      safetyWarnings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return persistResult({
      input,
      packet,
      packetId: packetSave?.packetId,
      status: "degraded",
      analysis: createDegradedAnalysis({
        analysisId: buildAnalysisId(input.analysisJobId, "model_failed"),
        packet,
        reasons: ["model_output_invalid"],
        message: `模型调用或解析失败，已降级为老师复核草稿：${message}`,
        validationErrors: [message]
      }),
      validationErrors: [message],
      safetyWarnings: []
    });
  }
}

async function loadVisionEvidencePacket(input: AnalyzeLearningEvidenceRunnerInput) {
  if (input.visionEvidencePacket) return input.visionEvidencePacket;

  if (input.repository && input.teacherContext) {
    const packet = await input.repository.getVisionEvidencePacket(input.teacherContext, input.materialId);
    if (packet) return packet;
  }

  return createEmptyBlockedPacket(input.materialId, input.studentId, input.teacherContext);
}

async function persistResult(input: {
  input: AnalyzeLearningEvidenceRunnerInput;
  packet: VisionEvidencePacket;
  packetId?: string;
  status: AnalyzeLearningEvidenceRunnerResult["status"];
  analysis: StudentLearningMaterialAnalysis;
  validationErrors: string[];
  safetyWarnings: string[];
}): Promise<AnalyzeLearningEvidenceRunnerResult> {
  const reviewItems = createTeacherReviewItemsFromAnalysis({
    analysis: input.analysis,
    analysisJobId: input.input.analysisJobId,
    materialId: input.input.materialId,
    teacherId: input.input.teacherContext?.teacherId ?? input.packet.teacher_id ?? "server-derived-teacher-id-required"
  });

  if (input.input.repository && input.input.teacherContext) {
    await input.input.repository.saveStudentLearningMaterialAnalysisDraft(input.input.teacherContext, {
      analysisJobId: input.input.analysisJobId,
      materialId: input.input.materialId,
      packetId: input.packetId,
      analysis: input.analysis,
      validationErrors: input.validationErrors,
      safetyWarnings: input.safetyWarnings
    });
    await input.input.repository.createTeacherReviewItems(input.input.teacherContext, reviewItems);
    await input.input.repository.updateAnalysisJobStatus(input.input.teacherContext, input.input.analysisJobId, input.status, {
      analysisId: input.analysis.analysis_id,
      validationErrors: input.validationErrors,
      safetyWarnings: input.safetyWarnings
    });
  }

  return {
    status: input.status,
    analysis: input.analysis,
    reviewItems,
    validationErrors: input.validationErrors,
    safetyWarnings: input.safetyWarnings
  };
}

export function inferDegradedReasons(packet: VisionEvidencePacket, sideInputs?: { answerKeys?: unknown[]; rubrics?: unknown[] }): DegradedReason[] {
  const reasons: DegradedReason[] = [];
  const evidenceTypes = new Set(packet.evidences.map((evidence) => evidence.evidence_type));
  const hasExternalAnswerBasis = hasQuestionMappedExternalAnswerBasis(packet, sideInputs);

  if (
    packet.material_state === "blank_template" ||
    packet.material_state === "insufficient_student_trace" ||
    packet.gates.some((gate) => gate.gate_id === "student_trace" && gate.status === "block")
  ) {
    reasons.push("no_student_trace");
  }
  if (packet.material_state === "teacher_resource" || packet.material_state === "needs_review") {
    reasons.push("unsupported_material_state");
  }
  if (detectExplicitNonK12Scope(packet).outOfScope) {
    reasons.push("out_of_k12_scope");
  }
  if (packet.material_state === "low_quality" || packet.pages.some((page) => page.image_quality_confidence < 0.65 || page.quality_flags.includes("low_image_quality"))) {
    reasons.push("low_image_quality");
  }
  if (packet.evidences.some((evidence) => !evidence.question_id)) {
    reasons.push("missing_question_id");
  }
  if (!hasExternalAnswerBasis && packet.gates.some((gate) => gate.gate_id === "answer_key" && gate.status !== "pass")) {
    reasons.push("answer_key_missing");
  }
  if (packet.gates.some((gate) => gate.gate_id === "teacher_mark_answer_key_conflict")) {
    reasons.push("teacher_mark_answer_key_conflict");
  }
  if (packet.student_identity_status === "uncertain") {
    reasons.push("student_identity_uncertain");
  }
  if (packet.student_identity_status === "conflict") {
    reasons.push("student_identity_conflict");
  }
  if (packet.material_state === "notes_only") {
    reasons.push("notes_only");
  }
  if (evidenceTypes.size > 0 && [...evidenceTypes].every((type) => type === "teacher_mark" || type === "teacher_comment" || type === "teacher_score")) {
    reasons.push("teacher_mark_only");
  }

  return uniqueReasons(reasons);
}

function createTeacherReviewItemsFromAnalysis(input: {
  analysis: StudentLearningMaterialAnalysis;
  analysisJobId: string;
  materialId: string;
  teacherId: string;
}): TeacherReviewItem[] {
  const items: TeacherReviewItem[] = [];
  const base = {
    analysisId: input.analysis.analysis_id,
    analysisJobId: input.analysisJobId,
    materialId: input.materialId,
    studentId: input.analysis.student_id,
    teacherId: input.teacherId,
    status: "pending" as const
  };

  if (input.analysis.risk_flags.length || input.analysis.teacher_review_required) {
    items.push({
      ...base,
      id: `${input.analysis.analysis_id}:risk`,
      itemType: "risk",
      title: "复核分析风险",
      content: { risk_flags: input.analysis.risk_flags, reliability_notes: input.analysis.evidence_summary.reliability_notes },
      evidenceRefs: input.analysis.evidence_summary.usableEvidenceRefs,
      riskFlags: input.analysis.risk_flags
    });
  }

  input.analysis.student_profile_update_suggestions.forEach((suggestion, index) => {
    items.push({
      ...base,
      id: `${input.analysis.analysis_id}:profile:${index}`,
      itemType: "profile_update",
      title: "确认是否写入学生档案",
      content: suggestion as unknown as Record<string, unknown>,
      evidenceRefs: suggestion.evidenceRefs,
      riskFlags: []
    });
  });

  items.push({
    ...base,
    id: `${input.analysis.analysis_id}:wechat`,
    itemType: "wechat_feedback",
    title: "确认微信反馈草稿",
    content: input.analysis.wechat_parent_feedback_draft as unknown as Record<string, unknown>,
    evidenceRefs: input.analysis.wechat_parent_feedback_draft.sentences.flatMap((sentence) => sentence.evidenceRefs),
    riskFlags: input.analysis.wechat_parent_feedback_draft.warnings
  });

  input.analysis.question_analyses
    .filter((question) => question.correctnessJudgement.status === "needs_teacher_review" || question.correctnessJudgement.status === "unknown")
    .forEach((question, index) => {
      items.push({
        ...base,
        id: `${input.analysis.analysis_id}:correctness:${index}`,
        itemType: "correctness_review",
        title: "复核题目正误判断",
        content: question.correctnessJudgement as unknown as Record<string, unknown>,
        evidenceRefs: question.evidenceRefs,
        riskFlags: question.degradeReason ? [question.degradeReason] : []
      });
    });

  input.analysis.next_learning_actions.forEach((action, index) => {
    items.push({
      ...base,
      id: `${input.analysis.analysis_id}:action:${index}`,
      itemType: "next_action",
      title: "确认下一步跟进动作",
      content: action as unknown as Record<string, unknown>,
      evidenceRefs: action.evidenceRefs,
      riskFlags: []
    });
  });

  return items;
}

function createEmptyBlockedPacket(materialId: string, studentId: string, context?: TrustedTeacherContext): VisionEvidencePacket {
  return {
    schema_version: "vision_evidence_packet.v0.4",
    plugin_run_id: `missing_packet_${materialId}`,
    material_id: materialId,
    source_material_id: materialId,
    tenant_id: context?.tenantId,
    teacher_id: context?.teacherId,
    student_id: studentId,
    student_identity_status: "uncertain",
    plugin_provider: "none",
    plugin_model_version: "none",
    material_state: "needs_review",
    created_at: new Date().toISOString(),
    pages: [],
    questions: [],
    evidences: [],
    gates: [
      {
        gate_id: "vision_packet",
        status: "block",
        reason: "缺少 VisionEvidencePacket，不能分析图片/PDF 或学生能力。",
        evidenceRefs: [],
        risk_flags: ["vision_packet_missing"]
      }
    ],
    plugin_errors: [
      {
        code: "VISION_PACKET_MISSING",
        message: "VisionEvidencePacket is required before text reasoning.",
        recoverable: true
      }
    ]
  };
}

function buildAnalysisId(analysisJobId: string, suffix: string) {
  return `${analysisJobId}:${suffix}`;
}

function uniqueReasons(reasons: DegradedReason[]) {
  return [...new Set(reasons)];
}

function buildSideInputRefsByQuestionId(readiness: ReturnType<typeof buildQuestionEvidenceReadiness>) {
  return new Map(
    readiness.questions.map((question) => [question.question_id, question.evidenceRefs.filter((ref) => ref.startsWith("side_input."))])
  );
}

async function updateJob(
  repository: LearningMaterialAnalyzerRepository | undefined,
  context: TrustedTeacherContext | undefined,
  analysisJobId: string,
  status: "running"
) {
  if (!repository || !context) return;
  await repository.updateAnalysisJobStatus(context, analysisJobId, status);
}
