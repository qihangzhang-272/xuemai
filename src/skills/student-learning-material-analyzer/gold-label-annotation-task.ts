import type { StudentLearningMaterialGoldLabelAnnotationImport } from "./gold-label-annotation-import";
import {
  buildQuestionSegmentationReview,
  validateQuestionSegmentationReview,
  type QuestionSegmentationReviewQuestion,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import type { K12EducationStage, K12MaterialType, K12Subject, ValidationResult, VisionEvidencePacket, VisionEvidenceType } from "./types";

export type GoldLabelAnnotationTaskTargetTool = "label_studio" | "cvat" | "manual";

export type StudentLearningMaterialGoldLabelAnnotationTask = {
  schema_version: "student_learning_material_gold_label_annotation_task.v0.1";
  case_id: string;
  source_material_id: string;
  material_id: string;
  vision_packet_id: string;
  generated_at: string;
  target_tool: GoldLabelAnnotationTaskTargetTool;
  privacy: {
    raw_ocr_text_excluded: true;
    normalized_text_excluded: true;
    raw_images_embedded: false;
    crop_refs_only: true;
    requires_anonymized_source_material: true;
  };
  material_classification_options: {
    material_types: K12MaterialType[];
    subjects: K12Subject[];
    education_stages: K12EducationStage[];
  };
  questions: GoldLabelAnnotationTaskQuestion[];
  annotation_import_skeleton: StudentLearningMaterialGoldLabelAnnotationImport;
  tool_payloads: {
    label_studio?: {
      config_xml: string;
      task_data: LabelStudioGoldLabelTaskData;
      export_normalization_target: "student_learning_material_gold_label_annotation_import.v0.1";
    };
    cvat?: {
      labels: Array<{
        name: string;
        type: "rectangle" | "polygon";
      }>;
      export_normalization_target: "student_learning_material_gold_label_annotation_import.v0.1";
      notes: string[];
    };
  };
  human_review_checklist: string[];
};

export type GoldLabelAnnotationTaskQuestion = {
  question_id: string;
  question_number?: string;
  page_id?: string;
  segmentation_status: QuestionSegmentationReviewQuestion["status"];
  review_required: boolean;
  definitive_judgement_allowed_suggestion: boolean;
  issues: string[];
  regions: Array<{
    region_id: string;
    region_role: string;
    page_id: string;
    bbox?: QuestionSegmentationReviewQuestion["regions"][number]["bbox"];
    polygon?: QuestionSegmentationReviewQuestion["regions"][number]["polygon"];
    crop_ref?: string;
    confidence: number;
  }>;
  evidence_summaries: Array<{
    evidence_ref: string;
    evidence_type: VisionEvidenceType;
    page_id: string;
    region_id?: string;
    confidence: number;
    teacher_verified: boolean;
    risk_flags: string[];
  }>;
  evidence_basis_suggestion: {
    student_trace_evidence_refs: string[];
    answer_key_or_rubric_evidence_refs: string[];
    teacher_correction_evidence_refs: string[];
  };
};

export type LabelStudioGoldLabelTaskData = {
  case_id: string;
  material_id: string;
  vision_packet_id: string;
  case_summary: string;
  questions: Array<{
    question_id: string;
    question_number?: string;
    segmentation_status: string;
    review_required: string;
    suggested_definitive_judgement_allowed: string;
    evidence_refs: string;
    crop_refs: string;
    issues: string;
  }>;
};

export type BuildGoldLabelAnnotationTaskOptions = {
  caseId?: string;
  generatedAt?: string;
  targetTool?: GoldLabelAnnotationTaskTargetTool;
  questionSegmentationReview?: StudentLearningMaterialQuestionSegmentationReview;
  reviewerIds?: [string, string];
  reviewerRoles?: [string, string];
};

const materialTypeOptions: K12MaterialType[] = [
  "exam",
  "homework",
  "wrong_question",
  "wrong_question_book",
  "unit_quiz",
  "weekly_test",
  "monthly_test",
  "student_notes",
  "practice_record",
  "other_student_material"
];

const subjectOptions: K12Subject[] = ["语文", "数学", "英语", "物理", "化学", "生物", "生物学", "历史", "地理", "道德与法治", "思想政治", "科学", "信息科技", "信息技术", "通用技术", "其他"];

const stageOptions: K12EducationStage[] = ["primary", "middle", "high", "unknown"];

const studentTraceEvidenceTypes = new Set<VisionEvidenceType>([
  "student_original_answer",
  "student_revised_answer",
  "student_process",
  "student_note",
  "teacher_mark",
  "teacher_comment",
  "teacher_score"
]);
const answerEvidenceTypes = new Set<VisionEvidenceType>(["answer_key", "rubric"]);
const teacherCorrectionEvidenceTypes = new Set<VisionEvidenceType>(["teacher_mark", "teacher_comment", "teacher_score"]);

export function buildGoldLabelAnnotationTask(
  packet: VisionEvidencePacket,
  options: BuildGoldLabelAnnotationTaskOptions = {}
): StudentLearningMaterialGoldLabelAnnotationTask {
  const caseId = options.caseId || `case-${packet.material_id}`;
  const generatedAt = options.generatedAt || packet.created_at;
  const targetTool = options.targetTool || "label_studio";
  const segmentationReview = options.questionSegmentationReview || buildQuestionSegmentationReview(packet, { generatedAt });
  const segmentationValidation = validateQuestionSegmentationReview(segmentationReview, packet);
  if (!segmentationValidation.ok) {
    throw new Error(`questionSegmentationReview must match VisionEvidencePacket: ${segmentationValidation.errors.join("；")}`);
  }
  const segmentationByQuestionId = new Map(segmentationReview.questions.map((question) => [question.question_id, question]));
  const questions = packet.questions.map((question) => buildAnnotationTaskQuestion(packet, question.question_id, segmentationByQuestionId.get(question.question_id)));
  const annotationImportSkeleton = buildAnnotationImportSkeleton(packet, caseId, generatedAt, options, questions);
  const labelStudioTaskData = buildLabelStudioTaskData(packet, caseId, questions);

  return {
    schema_version: "student_learning_material_gold_label_annotation_task.v0.1",
    case_id: caseId,
    source_material_id: packet.source_material_id,
    material_id: packet.material_id,
    vision_packet_id: packet.plugin_run_id,
    generated_at: generatedAt,
    target_tool: targetTool,
    privacy: {
      raw_ocr_text_excluded: true,
      normalized_text_excluded: true,
      raw_images_embedded: false,
      crop_refs_only: true,
      requires_anonymized_source_material: true
    },
    material_classification_options: {
      material_types: materialTypeOptions,
      subjects: subjectOptions,
      education_stages: stageOptions
    },
    questions,
    annotation_import_skeleton: annotationImportSkeleton,
    tool_payloads: {
      label_studio: {
        config_xml: buildLabelStudioConfigXml(),
        task_data: labelStudioTaskData,
        export_normalization_target: "student_learning_material_gold_label_annotation_import.v0.1"
      },
      cvat: {
        labels: [
          { name: "question_region", type: "rectangle" },
          { name: "student_answer_region", type: "rectangle" },
          { name: "teacher_mark_region", type: "rectangle" },
          { name: "answer_key_region", type: "rectangle" },
          { name: "uncertain_boundary", type: "polygon" }
        ],
        export_normalization_target: "student_learning_material_gold_label_annotation_import.v0.1",
        notes: [
          "CVAT 只用于区域 gold / QC；语义标签仍需归一化为 annotation import。",
          "不要把原始学生图片或 OCR 全文写入最终 gold package。"
        ]
      }
    },
    human_review_checklist: [
      "先确认原始材料已脱敏，学生、老师、学校等身份信息不得进入 gold JSON。",
      "逐题核对题号、区域、crop_ref、学生作答、老师批改和答案/评分点是否属于同一个 question_id。",
      "segmentation_status 不是 pass 的题，不得标记 definitive_judgement_allowed=true。",
      "每个 case 必须两名标注员独立标注；分类、正误、知识点或错因有分歧时必须仲裁。",
      "标注完成后，把导出结果归一化为 student_learning_material_gold_label_annotation_import.v0.1，再生成 final gold package。"
    ]
  };
}

export function validateGoldLabelAnnotationTask(
  value: unknown,
  packet?: VisionEvidencePacket
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["gold label annotation task must be an object"], warnings };
  }
  if (value.schema_version !== "student_learning_material_gold_label_annotation_task.v0.1") {
    errors.push("schema_version must be student_learning_material_gold_label_annotation_task.v0.1");
  }
  for (const field of ["case_id", "source_material_id", "material_id", "vision_packet_id", "generated_at"] as const) {
    if (!readString(value[field])) errors.push(`${field} is required`);
  }
  if (value.target_tool !== "label_studio" && value.target_tool !== "cvat" && value.target_tool !== "manual") {
    errors.push("target_tool must be label_studio, cvat, or manual");
  }
  validatePrivacy(value.privacy, errors);
  const questions = Array.isArray(value.questions) ? value.questions : [];
  if (!Array.isArray(value.questions)) errors.push("questions must be an array");
  if (!questions.length) errors.push("questions must not be empty");
  questions.forEach((question, index) => validateAnnotationTaskQuestion(question, index, errors, warnings));
  if (!isRecord(value.annotation_import_skeleton)) {
    errors.push("annotation_import_skeleton is required");
  } else if (value.annotation_import_skeleton.fixture_schema !== "student_learning_material_gold_label_annotation_import.v0.1") {
    errors.push("annotation_import_skeleton.fixture_schema must be student_learning_material_gold_label_annotation_import.v0.1");
  }

  const serialized = JSON.stringify(value);
  for (const forbiddenField of ["raw_ocr_text", "normalized_text"]) {
    const forbiddenFieldPattern = new RegExp(`"${forbiddenField}"\\s*:`);
    if (forbiddenFieldPattern.test(serialized)) errors.push(`annotation task must not include ${forbiddenField}`);
  }

  if (packet) {
    validateNoPacketTextContentLeak(value, packet, errors);
    if (value.source_material_id !== packet.source_material_id) errors.push("source_material_id must match VisionEvidencePacket");
    if (value.material_id !== packet.material_id) errors.push("material_id must match VisionEvidencePacket");
    if (value.vision_packet_id !== packet.plugin_run_id) errors.push("vision_packet_id must match VisionEvidencePacket plugin_run_id");
    const packetQuestionIdList = packet.questions.map((question) => question.question_id);
    const taskQuestionIdList = questions.filter(isRecord).map((question) => readString(question.question_id)).filter(Boolean);
    const packetQuestionIds = new Set(packet.questions.map((question) => question.question_id));
    const taskQuestionIds = new Set(taskQuestionIdList);
    packetQuestionIds.forEach((questionId) => {
      if (!taskQuestionIds.has(questionId)) errors.push(`questions missing VisionEvidencePacket question_id=${questionId}`);
    });
    taskQuestionIds.forEach((questionId) => {
      if (!packetQuestionIds.has(questionId)) errors.push(`questions question_id=${questionId} missing from VisionEvidencePacket`);
    });
    const generatedAt = readString(value.generated_at) || packet.created_at;
    const expectedQuestions = buildPacketDerivedAnnotationTaskQuestions(packet, generatedAt);
    validateQuestionOrder(taskQuestionIdList, packetQuestionIdList, "questions", errors);
    validateAnnotationTaskQuestionsMatchPacketDerivedTask(value, expectedQuestions, errors);
    validateAnnotationImportSkeletonQuestionOrder(value.annotation_import_skeleton, packetQuestionIdList, errors);
    validateAnnotationImportSkeletonMatchesPacketDerivedTask(value.annotation_import_skeleton, expectedQuestions, errors);
    validateLabelStudioTaskDataQuestionOrder(value.tool_payloads, packetQuestionIdList, errors);
    validateLabelStudioTaskDataMatchesPacketDerivedTask(value.tool_payloads, expectedQuestions, errors);
    const packetEvidenceRefs = new Set(packet.evidences.map((evidence) => evidence.evidence_ref));
    questions.filter(isRecord).forEach((question) => {
      const summaries = Array.isArray(question.evidence_summaries) ? question.evidence_summaries : [];
      summaries.filter(isRecord).forEach((summary) => {
        const ref = readString(summary.evidence_ref);
        if (ref && !packetEvidenceRefs.has(ref)) errors.push(`evidence_summaries references unknown evidence_ref=${ref}`);
      });
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

function buildPacketDerivedAnnotationTaskQuestions(packet: VisionEvidencePacket, generatedAt: string) {
  const segmentationReview = buildQuestionSegmentationReview(packet, { generatedAt });
  const segmentationByQuestionId = new Map(segmentationReview.questions.map((question) => [question.question_id, question]));
  return packet.questions.map((question) => buildAnnotationTaskQuestion(packet, question.question_id, segmentationByQuestionId.get(question.question_id)));
}

function validateAnnotationTaskQuestionsMatchPacketDerivedTask(
  value: Record<string, unknown>,
  expectedQuestions: GoldLabelAnnotationTaskQuestion[],
  errors: string[]
) {
  const actualQuestions = Array.isArray(value.questions) ? value.questions.filter(isRecord) : [];
  const actualByQuestionId = new Map(actualQuestions.map((question) => [readString(question.question_id), question]));

  expectedQuestions.forEach((expected, index) => {
    const actual = actualByQuestionId.get(expected.question_id);
    if (!actual) return;
    const prefix = `questions[${index}]`;
    for (const field of [
      "question_number",
      "page_id",
      "segmentation_status",
      "review_required",
      "definitive_judgement_allowed_suggestion"
    ] as const) {
      if (actual[field] !== expected[field]) {
        errors.push(`${prefix}.${field} must match VisionEvidencePacket-derived annotation task`);
      }
    }
    if (joinStringArray(actual.issues) !== expected.issues.join("|")) {
      errors.push(`${prefix}.issues must match VisionEvidencePacket-derived annotation task`);
    }
    validateAnnotationTaskRegionsMatchExpected(actual.regions, expected.regions, prefix, errors);
    validateAnnotationTaskEvidenceSummariesMatchExpected(actual.evidence_summaries, expected.evidence_summaries, prefix, errors);
    validateAnnotationTaskEvidenceBasisSuggestionMatchesExpected(
      actual.evidence_basis_suggestion,
      expected.evidence_basis_suggestion,
      prefix,
      errors
    );
  });
}

function validateAnnotationTaskRegionsMatchExpected(
  actualValue: unknown,
  expectedRegions: GoldLabelAnnotationTaskQuestion["regions"],
  prefix: string,
  errors: string[]
) {
  if (!Array.isArray(actualValue)) return;
  const actualRegions = actualValue.filter(isRecord);
  if (actualRegions.length !== expectedRegions.length) {
    errors.push(`${prefix}.regions length must match VisionEvidencePacket-derived annotation task`);
  }
  const expectedByRegionId = new Map(expectedRegions.map((region) => [region.region_id, region]));
  actualRegions.forEach((actual, regionIndex) => {
    const regionId = readString(actual.region_id);
    const expected = regionId ? expectedByRegionId.get(regionId) : undefined;
    if (!expected) {
      errors.push(`${prefix}.regions[${regionIndex}].region_id must exist in VisionEvidencePacket-derived annotation task`);
      return;
    }
    for (const field of ["region_role", "page_id", "crop_ref", "confidence"] as const) {
      if (actual[field] !== expected[field]) {
        errors.push(`${prefix}.regions[${regionIndex}].${field} must match VisionEvidencePacket-derived annotation task`);
      }
    }
    if (stableJson(actual.bbox) !== stableJson(expected.bbox)) {
      errors.push(`${prefix}.regions[${regionIndex}].bbox must match VisionEvidencePacket-derived annotation task`);
    }
    if (stableJson(actual.polygon) !== stableJson(expected.polygon)) {
      errors.push(`${prefix}.regions[${regionIndex}].polygon must match VisionEvidencePacket-derived annotation task`);
    }
  });
}

function validateAnnotationTaskEvidenceSummariesMatchExpected(
  actualValue: unknown,
  expectedSummaries: GoldLabelAnnotationTaskQuestion["evidence_summaries"],
  prefix: string,
  errors: string[]
) {
  if (!Array.isArray(actualValue)) return;
  const actualSummaries = actualValue.filter(isRecord);
  if (actualSummaries.length !== expectedSummaries.length) {
    errors.push(`${prefix}.evidence_summaries length must match VisionEvidencePacket-derived annotation task`);
  }
  const expectedByEvidenceRef = new Map(expectedSummaries.map((summary) => [summary.evidence_ref, summary]));
  actualSummaries.forEach((actual, summaryIndex) => {
    const evidenceRef = readString(actual.evidence_ref);
    const expected = evidenceRef ? expectedByEvidenceRef.get(evidenceRef) : undefined;
    if (!expected) {
      errors.push(`${prefix}.evidence_summaries[${summaryIndex}].evidence_ref must exist in VisionEvidencePacket-derived annotation task`);
      return;
    }
    for (const field of ["evidence_type", "page_id", "region_id", "confidence", "teacher_verified"] as const) {
      if (actual[field] !== expected[field]) {
        errors.push(`${prefix}.evidence_summaries[${summaryIndex}].${field} must match VisionEvidencePacket-derived annotation task`);
      }
    }
    if (joinStringArray(actual.risk_flags) !== expected.risk_flags.join("|")) {
      errors.push(`${prefix}.evidence_summaries[${summaryIndex}].risk_flags must match VisionEvidencePacket-derived annotation task`);
    }
  });
}

function validateAnnotationTaskEvidenceBasisSuggestionMatchesExpected(
  actualValue: unknown,
  expected: GoldLabelAnnotationTaskQuestion["evidence_basis_suggestion"],
  prefix: string,
  errors: string[]
) {
  if (!isRecord(actualValue)) {
    errors.push(`${prefix}.evidence_basis_suggestion is required`);
    return;
  }
  for (const field of [
    "student_trace_evidence_refs",
    "answer_key_or_rubric_evidence_refs",
    "teacher_correction_evidence_refs"
  ] as const) {
    if (joinStringArray(actualValue[field]) !== expected[field].join("|")) {
      errors.push(`${prefix}.evidence_basis_suggestion.${field} must match VisionEvidencePacket-derived annotation task`);
    }
  }
}

function validateAnnotationImportSkeletonMatchesPacketDerivedTask(
  value: unknown,
  expectedQuestions: GoldLabelAnnotationTaskQuestion[],
  errors: string[]
) {
  if (!isRecord(value) || !Array.isArray(value.labels)) return;
  const expectedByQuestionId = new Map(expectedQuestions.map((question) => [question.question_id, question]));
  value.labels.filter(isRecord).forEach((label, labelIndex) => {
    if (!Array.isArray(label.questions)) return;
    label.questions.filter(isRecord).forEach((actual, questionIndex) => {
      const questionId = readString(actual.question_id);
      const expected = questionId ? expectedByQuestionId.get(questionId) : undefined;
      if (!expected) return;
      const prefix = `annotation_import_skeleton.labels[${labelIndex}].questions[${questionIndex}]`;
      if (actual.definitive_judgement_allowed !== false) {
        errors.push(`${prefix}.definitive_judgement_allowed must remain false in packet-derived annotation task skeleton`);
      }
      validateStringArrayMatches(
        actual.student_trace_evidence_refs,
        expected.evidence_basis_suggestion.student_trace_evidence_refs,
        `${prefix}.student_trace_evidence_refs`,
        errors
      );
      validateStringArrayMatches(
        actual.answer_key_or_rubric_evidence_refs,
        expected.evidence_basis_suggestion.answer_key_or_rubric_evidence_refs,
        `${prefix}.answer_key_or_rubric_evidence_refs`,
        errors
      );
      validateStringArrayMatches(
        actual.teacher_correction_evidence_refs,
        expected.evidence_basis_suggestion.teacher_correction_evidence_refs,
        `${prefix}.teacher_correction_evidence_refs`,
        errors
      );
      validateStringArrayMatches(actual.notes, buildAnnotationQuestionSkeletonNotes(expected), `${prefix}.notes`, errors);
    });
  });
}

function validateLabelStudioTaskDataMatchesPacketDerivedTask(
  value: unknown,
  expectedQuestions: GoldLabelAnnotationTaskQuestion[],
  errors: string[]
) {
  if (!isRecord(value) || !isRecord(value.label_studio) || !isRecord(value.label_studio.task_data)) return;
  const taskData = value.label_studio.task_data;
  if (!Array.isArray(taskData.questions)) return;
  const expectedByQuestionId = new Map(expectedQuestions.map((question) => [question.question_id, question]));
  taskData.questions.filter(isRecord).forEach((actual, index) => {
    const questionId = readString(actual.question_id);
    const expected = questionId ? expectedByQuestionId.get(questionId) : undefined;
    if (!expected) return;
    const prefix = `tool_payloads.label_studio.task_data.questions[${index}]`;
    const expectedPayloadQuestion = buildLabelStudioTaskDataQuestion(expected);
    for (const field of [
      "question_number",
      "segmentation_status",
      "review_required",
      "suggested_definitive_judgement_allowed",
      "evidence_refs",
      "crop_refs",
      "issues"
    ] as const) {
      if (actual[field] !== expectedPayloadQuestion[field]) {
        errors.push(`${prefix}.${field} must match VisionEvidencePacket-derived annotation task payload`);
      }
    }
  });
}

function buildAnnotationQuestionSkeletonNotes(question: GoldLabelAnnotationTaskQuestion) {
  return [
    `segmentation_status=${question.segmentation_status}`,
    `review_required=${question.review_required ? "yes" : "no"}`,
    `definitive_judgement_allowed_suggestion=${question.definitive_judgement_allowed_suggestion ? "yes" : "no"}`,
    ...(question.issues.length ? [`segmentation_issues=${question.issues.join("|")}`] : [])
  ];
}

function validateStringArrayMatches(actual: unknown, expected: string[], prefix: string, errors: string[]) {
  if (joinStringArray(actual) !== expected.join("|")) {
    errors.push(`${prefix} must match VisionEvidencePacket-derived annotation task skeleton`);
  }
}

function validateQuestionOrder(actualQuestionIds: string[], expectedQuestionIds: string[], fieldName: string, errors: string[]) {
  if (actualQuestionIds.length === expectedQuestionIds.length && actualQuestionIds.join("|") !== expectedQuestionIds.join("|")) {
    errors.push(`${fieldName} order must match VisionEvidencePacket questions: expected ${expectedQuestionIds.join(", ")} but got ${actualQuestionIds.join(", ")}`);
  }
}

function validateAnnotationImportSkeletonQuestionOrder(value: unknown, expectedQuestionIds: string[], errors: string[]) {
  if (!isRecord(value) || !Array.isArray(value.labels)) return;
  value.labels.filter(isRecord).forEach((label, labelIndex) => {
    const questionIds = Array.isArray(label.questions) ? label.questions.filter(isRecord).map((question) => readString(question.question_id)).filter(Boolean) : [];
    validateQuestionOrder(questionIds, expectedQuestionIds, `annotation_import_skeleton.labels[${labelIndex}].questions`, errors);
  });
}

function validateLabelStudioTaskDataQuestionOrder(value: unknown, expectedQuestionIds: string[], errors: string[]) {
  if (!isRecord(value) || !isRecord(value.label_studio) || !isRecord(value.label_studio.task_data)) return;
  const questionIds = Array.isArray(value.label_studio.task_data.questions)
    ? value.label_studio.task_data.questions.filter(isRecord).map((question) => readString(question.question_id)).filter(Boolean)
    : [];
  validateQuestionOrder(questionIds, expectedQuestionIds, "tool_payloads.label_studio.task_data.questions", errors);
}

function validateNoPacketTextContentLeak(value: unknown, packet: VisionEvidencePacket, errors: string[]) {
  const taskText = collectStringValues(value).map(normalizeComparableText).filter(Boolean).join(" ");
  const leakedEvidenceRefs = new Set<string>();
  for (const evidence of packet.evidences) {
    const snippets = [evidence.raw_ocr_text, evidence.normalized_text, evidence.text]
      .map((text) => normalizeComparableText(text))
      .filter((text): text is string => Boolean(text && text.length >= 4));
    if (snippets.some((snippet) => taskText.includes(snippet))) {
      leakedEvidenceRefs.add(evidence.evidence_ref);
    }
  }
  leakedEvidenceRefs.forEach((evidenceRef) => {
    errors.push(`annotation task must not include OCR/text content copied from VisionEvidencePacket evidence_ref=${evidenceRef}`);
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

function buildAnnotationTaskQuestion(
  packet: VisionEvidencePacket,
  questionId: string,
  segmentationQuestion?: QuestionSegmentationReviewQuestion
): GoldLabelAnnotationTaskQuestion {
  const packetQuestion = packet.questions.find((question) => question.question_id === questionId);
  const evidences = packet.evidences.filter((evidence) => evidence.question_id === questionId);
  return {
    question_id: questionId,
    question_number: packetQuestion?.question_number,
    page_id: packetQuestion?.page_id,
    segmentation_status: segmentationQuestion?.status || "blocked",
    review_required: segmentationQuestion?.review_required ?? true,
    definitive_judgement_allowed_suggestion: segmentationQuestion?.status === "pass" && segmentationQuestion.definitive_judgement_allowed === true,
    issues: segmentationQuestion?.issues || ["question_region_missing"],
    regions:
      segmentationQuestion?.regions.map((region) => ({
        region_id: region.region_id,
        region_role: region.region_role,
        page_id: region.page_id,
        bbox: region.bbox,
        polygon: region.polygon,
        crop_ref: region.crop_ref,
        confidence: region.confidence
      })) || [],
    evidence_summaries: evidences.map((evidence) => ({
      evidence_ref: evidence.evidence_ref,
      evidence_type: evidence.evidence_type,
      page_id: evidence.page_id,
      region_id: evidence.region_id,
      confidence: evidence.confidence,
      teacher_verified: evidence.teacher_verified,
      risk_flags: evidence.risk_flags
    })),
    evidence_basis_suggestion: {
      student_trace_evidence_refs: evidences.filter((evidence) => studentTraceEvidenceTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref),
      answer_key_or_rubric_evidence_refs: evidences.filter((evidence) => answerEvidenceTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref),
      teacher_correction_evidence_refs: evidences.filter((evidence) => teacherCorrectionEvidenceTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref)
    }
  };
}

function buildAnnotationImportSkeleton(
  packet: VisionEvidencePacket,
  caseId: string,
  generatedAt: string,
  options: BuildGoldLabelAnnotationTaskOptions,
  questions: GoldLabelAnnotationTaskQuestion[]
): StudentLearningMaterialGoldLabelAnnotationImport {
  const reviewerIds = options.reviewerIds || ["reviewer_a", "reviewer_b"];
  const reviewerRoles = options.reviewerRoles || ["教研标注员", "授课老师"];
  const questionSkeletons = questions.map((question) => ({
    question_id: question.question_id,
    definitive_judgement_allowed: false,
    student_trace_evidence_refs: question.evidence_basis_suggestion.student_trace_evidence_refs,
    answer_key_or_rubric_evidence_refs: question.evidence_basis_suggestion.answer_key_or_rubric_evidence_refs,
    teacher_correction_evidence_refs: question.evidence_basis_suggestion.teacher_correction_evidence_refs,
    notes: buildAnnotationQuestionSkeletonNotes(question)
  }));
  return {
    fixture_schema: "student_learning_material_gold_label_annotation_import.v0.1",
    package_id: `gold-label-${packet.material_id}`,
    case_id: caseId,
    source_material_id: packet.source_material_id,
    vision_packet_id: packet.plugin_run_id,
    material_id: packet.material_id,
    annotation_tool: {
      name: options.targetTool === "cvat" ? "cvat" : options.targetTool === "manual" ? "manual" : "label_studio",
      imported_at: generatedAt,
      notes: ["Skeleton generated from redacted annotation task. Fill labels and adjudication after human review."]
    },
    anonymization: {
      student_identifiers_removed: false,
      teacher_identifiers_removed: false,
      school_identifiers_removed: false,
      raw_images_excluded_from_gold_file: false
    },
    labels: reviewerIds.map((reviewerId, index) => ({
      label_id: `${caseId}-label-${index + 1}`,
      reviewer_id: reviewerId,
      reviewer_role: reviewerRoles[index],
      labeled_at: generatedAt,
      material_classification: {
        material_type: "other_student_material",
        subject: "其他",
        education_stage: "unknown",
        grade_candidate: "待人工标注",
        region_or_curriculum_candidate: "待人工标注"
      },
      questions: questionSkeletons.map(cloneAnnotationQuestionSkeleton),
      notes: ["Draft only. Replace classification and per-question labels before final gold package generation."]
    }))
  };
}

function cloneAnnotationQuestionSkeleton(question: StudentLearningMaterialGoldLabelAnnotationImport["labels"][number]["questions"][number]) {
  return {
    ...question,
    student_trace_evidence_refs: [...(question.student_trace_evidence_refs || [])],
    answer_key_or_rubric_evidence_refs: [...(question.answer_key_or_rubric_evidence_refs || [])],
    teacher_correction_evidence_refs: [...(question.teacher_correction_evidence_refs || [])],
    notes: [...(question.notes || [])]
  };
}

function buildLabelStudioTaskData(
  packet: VisionEvidencePacket,
  caseId: string,
  questions: GoldLabelAnnotationTaskQuestion[]
): LabelStudioGoldLabelTaskData {
  return {
    case_id: caseId,
    material_id: packet.material_id,
    vision_packet_id: packet.plugin_run_id,
    case_summary: `material=${packet.material_id}; provider=${packet.plugin_provider}; questions=${questions.length}; raw_text_excluded=yes`,
    questions: questions.map((question) => ({
      question_id: question.question_id,
      question_number: question.question_number,
      segmentation_status: question.segmentation_status,
      review_required: question.review_required ? "yes" : "no",
      suggested_definitive_judgement_allowed: question.definitive_judgement_allowed_suggestion ? "yes" : "no",
      evidence_refs: buildLabelStudioEvidenceRefs(question),
      crop_refs: buildLabelStudioCropRefs(question),
      issues: buildLabelStudioIssues(question)
    }))
  };
}

function buildLabelStudioTaskDataQuestion(question: GoldLabelAnnotationTaskQuestion): LabelStudioGoldLabelTaskData["questions"][number] {
  return {
    question_id: question.question_id,
    question_number: question.question_number,
    segmentation_status: question.segmentation_status,
    review_required: question.review_required ? "yes" : "no",
    suggested_definitive_judgement_allowed: question.definitive_judgement_allowed_suggestion ? "yes" : "no",
    evidence_refs: buildLabelStudioEvidenceRefs(question),
    crop_refs: buildLabelStudioCropRefs(question),
    issues: buildLabelStudioIssues(question)
  };
}

function buildLabelStudioEvidenceRefs(question: GoldLabelAnnotationTaskQuestion) {
  return question.evidence_summaries.map((evidence) => `${evidence.evidence_type}:${evidence.evidence_ref}`).join("\n");
}

function buildLabelStudioCropRefs(question: GoldLabelAnnotationTaskQuestion) {
  return question.regions.map((region) => region.crop_ref).filter((item): item is string => Boolean(item)).join("\n");
}

function buildLabelStudioIssues(question: GoldLabelAnnotationTaskQuestion) {
  return question.issues.join(", ");
}

function buildLabelStudioConfigXml() {
  return [
    "<View>",
    '  <Header value="学脉 K12 学习材料 Gold 标注"/>',
    '  <Text name="case_summary" value="$case_summary"/>',
    '  <Choices name="material_type" toName="case_summary" choice="single" required="true">',
    ...materialTypeOptions.map((option) => `    <Choice value="${option}"/>`),
    "  </Choices>",
    '  <Choices name="subject" toName="case_summary" choice="single" required="true">',
    ...subjectOptions.map((option) => `    <Choice value="${option}"/>`),
    "  </Choices>",
    '  <Choices name="education_stage" toName="case_summary" choice="single" required="true">',
    ...stageOptions.map((option) => `    <Choice value="${option}"/>`),
    "  </Choices>",
    '  <TextArea name="grade_candidate" toName="case_summary" placeholder="年级候选，如 初二 / 高一 / 待确认" required="true"/>',
    '  <TextArea name="region_or_curriculum_candidate" toName="case_summary" placeholder="地区/教材/试卷线索，如 全国乙卷 / 人教版 / 未识别" required="true"/>',
    '  <Paragraphs name="questions" value="$questions" layout="table"/>',
    '  <TextArea name="question_labels_json" toName="case_summary" placeholder="按 annotation import schema 填写每题 judgement/knowledge/mistake/evidence refs" required="true"/>',
    '  <TextArea name="reviewer_notes" toName="case_summary" placeholder="证据不足、需复核、仲裁说明"/>',
    "</View>"
  ].join("\n");
}

function validatePrivacy(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("privacy is required");
    return;
  }
  if (value.raw_ocr_text_excluded !== true) errors.push("privacy.raw_ocr_text_excluded must be true");
  if (value.normalized_text_excluded !== true) errors.push("privacy.normalized_text_excluded must be true");
  if (value.raw_images_embedded !== false) errors.push("privacy.raw_images_embedded must be false");
  if (value.crop_refs_only !== true) errors.push("privacy.crop_refs_only must be true");
  if (value.requires_anonymized_source_material !== true) errors.push("privacy.requires_anonymized_source_material must be true");
}

function validateAnnotationTaskQuestion(value: unknown, index: number, errors: string[], warnings: string[]) {
  const prefix = `questions[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!readString(value.question_id)) errors.push(`${prefix}.question_id is required`);
  if (value.segmentation_status !== "pass" && value.segmentation_status !== "needs_teacher_review" && value.segmentation_status !== "blocked") {
    errors.push(`${prefix}.segmentation_status must be pass, needs_teacher_review, or blocked`);
  }
  if (typeof value.review_required !== "boolean") errors.push(`${prefix}.review_required must be boolean`);
  if (typeof value.definitive_judgement_allowed_suggestion !== "boolean") errors.push(`${prefix}.definitive_judgement_allowed_suggestion must be boolean`);
  if (!Array.isArray(value.regions)) errors.push(`${prefix}.regions must be an array`);
  if (!Array.isArray(value.evidence_summaries)) errors.push(`${prefix}.evidence_summaries must be an array`);
  if (value.definitive_judgement_allowed_suggestion === true && value.segmentation_status !== "pass") {
    errors.push(`${prefix}.definitive_judgement_allowed_suggestion requires pass segmentation`);
  }
  if (Array.isArray(value.regions) && !value.regions.length && value.segmentation_status !== "blocked") {
    warnings.push(`${prefix} has no regions; blocked status is expected`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function joinStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("|") : "";
}

function stableJson(value: unknown) {
  return value === undefined ? "" : JSON.stringify(value);
}
