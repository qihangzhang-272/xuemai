import type { EvaluationQuestionGold, StudentLearningMaterialGoldCase } from "./evaluation";
import {
  validateStudentLearningMaterialGoldLabelPackage,
  type GoldLabelQuestionEvidenceBasis,
  type StudentLearningMaterialGoldLabelPackage
} from "./gold-labeling";
import {
  validateQuestionSegmentationReview,
  type QuestionSegmentationReviewQuestion,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import type { CorrectnessStatus, ValidationResult, VisionEvidencePacket } from "./types";

export type GoldLabelAnnotationImportTool = {
  name: "label_studio" | "cvat" | "x_anylabeling" | "manual" | "other";
  export_ref?: string;
  imported_at?: string;
  notes?: string[];
};

export type GoldLabelAnnotationQuestion = {
  question_id: string;
  definitive_judgement_allowed: boolean;
  expected_correctness?: CorrectnessStatus;
  expected_knowledge_points?: string[];
  expected_mistake_types?: string[];
  student_trace_evidence_refs?: string[];
  answer_key_or_rubric_evidence_refs?: string[];
  teacher_correction_evidence_refs?: string[];
  notes?: string[];
};

export type GoldLabelAnnotationLabel = {
  label_id: string;
  reviewer_id: string;
  reviewer_role: string;
  labeled_at: string;
  material_classification: StudentLearningMaterialGoldCase["material_classification"];
  questions: GoldLabelAnnotationQuestion[];
  notes?: string[];
};

export type GoldLabelAnnotationAdjudication = {
  reviewer_id: string;
  reviewer_role: string;
  adjudicated_at: string;
  material_classification: StudentLearningMaterialGoldCase["material_classification"];
  questions: GoldLabelAnnotationQuestion[];
  notes?: string[];
};

export type StudentLearningMaterialGoldLabelAnnotationImport = {
  fixture_schema: "student_learning_material_gold_label_annotation_import.v0.1";
  package_id?: string;
  case_id: string;
  source_material_id?: string;
  vision_packet_id?: string;
  material_id?: string;
  annotation_tool?: GoldLabelAnnotationImportTool;
  anonymization: StudentLearningMaterialGoldLabelPackage["anonymization"];
  labels: GoldLabelAnnotationLabel[];
  adjudication?: GoldLabelAnnotationAdjudication;
};

export type GoldLabelAnnotationImportConversionOptions = {
  requireAdjudication?: boolean;
  questionSegmentationReview?: StudentLearningMaterialQuestionSegmentationReview;
  allowedExternalEvidenceRefsByQuestionId?: Map<string, string[]>;
};

export type GoldLabelAnnotationImportConversionResult =
  | {
      ok: true;
      package: StudentLearningMaterialGoldLabelPackage;
      validation: ValidationResult;
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

export function createGoldLabelPackageFromAnnotationImport(
  value: unknown,
  packet: VisionEvidencePacket,
  options: GoldLabelAnnotationImportConversionOptions = { requireAdjudication: true }
): GoldLabelAnnotationImportConversionResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["annotation import must be an object"], warnings };
  }

  if (value.fixture_schema !== "student_learning_material_gold_label_annotation_import.v0.1") {
    errors.push("fixture_schema must be student_learning_material_gold_label_annotation_import.v0.1");
  }
  const caseId = readString(value.case_id);
  if (!caseId) errors.push("case_id is required");
  validateOptionalIdMatch(value.source_material_id, packet.source_material_id, "source_material_id", errors);
  validateOptionalIdMatch(value.vision_packet_id, packet.plugin_run_id, "vision_packet_id", errors);
  validateOptionalIdMatch(value.material_id, packet.material_id, "material_id", errors);
  validateNoSourcePacketTextInAnnotationImportNotes(value, packet, errors);

  const questionSegmentationReview = options.questionSegmentationReview;
  if (questionSegmentationReview) {
    const segmentationReviewValidation = validateQuestionSegmentationReview(questionSegmentationReview, packet);
    if (!segmentationReviewValidation.ok) {
      errors.push(...segmentationReviewValidation.errors.map((error) => `question_segmentation_review invalid: ${error}`));
    }
    if (questionSegmentationReview.summary.orphan_evidence_count > 0) {
      errors.push("question_segmentation_review must not contain orphan evidence before final gold package generation");
    }
  }
  const segmentationReviewByQuestionId = questionSegmentationReview
    ? new Map(questionSegmentationReview.questions.map((question) => [question.question_id, question]))
    : undefined;

  const labels = Array.isArray(value.labels) ? value.labels : [];
  if (!Array.isArray(value.labels)) errors.push("labels must be an array");
  if (labels.length < 2) errors.push("annotation import requires at least two independent labels");

  const packetQuestionIds = new Set(packet.questions.map((question) => question.question_id));
  const packetEvidenceRefs = new Set(packet.evidences.map((evidence) => evidence.evidence_ref));
  const importedLabels = labels.map((label, index) =>
    buildHumanLabel(label, index, caseId || `case-${packet.material_id}`, packet, packetQuestionIds, packetEvidenceRefs, segmentationReviewByQuestionId, errors)
  );

  const packageValue: StudentLearningMaterialGoldLabelPackage = {
    fixture_schema: "student_learning_material_gold_label_package.v0.1",
    package_id: readString(value.package_id) || `gold-label-${packet.material_id}`,
    case_id: caseId || `case-${packet.material_id}`,
    source_material_id: packet.source_material_id,
    vision_packet_id: packet.plugin_run_id,
    material_id: packet.material_id,
    anonymization: readAnonymization(value.anonymization, errors),
    labels: importedLabels
  };

  if (isRecord(value.adjudication)) {
    packageValue.adjudicated_gold = buildGoldCaseFromAnnotation(value.adjudication, packageValue.case_id, packet, packetQuestionIds, packetEvidenceRefs, segmentationReviewByQuestionId, errors);
    packageValue.adjudicated_by = {
      reviewer_id: readString(value.adjudication.reviewer_id) || "",
      reviewer_role: readString(value.adjudication.reviewer_role) || "",
      adjudicated_at: readString(value.adjudication.adjudicated_at) || "",
      notes: readStringArray(value.adjudication.notes)
    };
  } else if (options.requireAdjudication !== false) {
    warnings.push("adjudication is missing; generated package can only be an annotation draft until adjudication is added");
  }

  if (errors.length) {
    return { ok: false, errors, warnings };
  }

  const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
    requireAdjudication: options.requireAdjudication !== false,
    sourcePacket: packet,
    allowedExternalEvidenceRefsByQuestionId: options.allowedExternalEvidenceRefsByQuestionId
  });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, warnings: [...warnings, ...validation.warnings] };
  }
  return {
    ok: true,
    package: packageValue,
    validation,
    warnings
  };
}

function validateNoSourcePacketTextInAnnotationImportNotes(value: unknown, packet: VisionEvidencePacket, errors: string[]) {
  const noteText = collectNoteStrings(value).map(normalizeComparableText).filter(Boolean).join(" ");
  if (!noteText) return;
  const leakedEvidenceRefs = new Set<string>();
  for (const evidence of packet.evidences) {
    const snippets = [evidence.raw_ocr_text, evidence.normalized_text, evidence.text]
      .map((text) => normalizeComparableText(text))
      .filter((text): text is string => Boolean(text && text.length >= 4));
    if (snippets.some((snippet) => noteText.includes(snippet))) {
      leakedEvidenceRefs.add(evidence.evidence_ref);
    }
  }
  leakedEvidenceRefs.forEach((evidenceRef) => {
    errors.push(`annotation import notes must not include OCR/text content copied from VisionEvidencePacket evidence_ref=${evidenceRef}`);
  });
}

function collectNoteStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectNoteStrings(item));
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    if (key === "notes") {
      if (typeof child === "string") return [child];
      if (Array.isArray(child)) return child.filter((item): item is string => typeof item === "string");
    }
    return collectNoteStrings(child);
  });
}

function normalizeComparableText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, "") : "";
}

function buildHumanLabel(
  value: unknown,
  index: number,
  caseId: string,
  packet: VisionEvidencePacket,
  packetQuestionIds: Set<string>,
  packetEvidenceRefs: Set<string>,
  segmentationReviewByQuestionId: Map<string, QuestionSegmentationReviewQuestion> | undefined,
  errors: string[]
): StudentLearningMaterialGoldLabelPackage["labels"][number] {
  const prefix = `labels[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return emptyHumanLabel(caseId, index);
  }
  return {
    label_id: readString(value.label_id) || `${caseId}-label-${index + 1}`,
    reviewer_id: readString(value.reviewer_id) || "",
    reviewer_role: readString(value.reviewer_role) || "",
    labeled_at: readString(value.labeled_at) || "",
    gold: buildGoldCaseFromAnnotation(value, caseId, packet, packetQuestionIds, packetEvidenceRefs, segmentationReviewByQuestionId, errors, prefix),
    question_evidence_basis: buildEvidenceBasisFromAnnotation(value.questions, packet, packetQuestionIds, packetEvidenceRefs, errors, prefix),
    notes: readStringArray(value.notes)
  };
}

function buildGoldCaseFromAnnotation(
  value: unknown,
  caseId: string,
  packet: VisionEvidencePacket,
  packetQuestionIds: Set<string>,
  packetEvidenceRefs: Set<string>,
  segmentationReviewByQuestionId: Map<string, QuestionSegmentationReviewQuestion> | undefined,
  errors: string[],
  prefix = "adjudication"
): StudentLearningMaterialGoldCase {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return emptyGoldCase(caseId);
  }
  const rawQuestions = Array.isArray(value.questions) ? value.questions : [];
  if (!Array.isArray(value.questions)) errors.push(`${prefix}.questions must be an array`);
  const questions = rawQuestions.map((question, index) => buildGoldQuestion(question, `${prefix}.questions[${index}]`, packetQuestionIds, packetEvidenceRefs, segmentationReviewByQuestionId, errors));
  const missingPacketQuestions = packet.questions.map((question) => question.question_id).filter((questionId) => !questions.some((question) => question.question_id === questionId));
  if (missingPacketQuestions.length) {
    errors.push(`${prefix}.questions missing VisionEvidencePacket question_id: ${missingPacketQuestions.join(", ")}`);
  }
  return {
    case_id: caseId,
    material_classification: readMaterialClassification(value.material_classification, `${prefix}.material_classification`, errors),
    questions,
    require_safe_parent_feedback: true,
    require_teacher_professional_report: true,
    require_monthly_snapshot: true,
    require_model_contract: true
  };
}

function buildGoldQuestion(
  value: unknown,
  prefix: string,
  packetQuestionIds: Set<string>,
  packetEvidenceRefs: Set<string>,
  segmentationReviewByQuestionId: Map<string, QuestionSegmentationReviewQuestion> | undefined,
  errors: string[]
): EvaluationQuestionGold {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return { question_id: "", definitive_judgement_allowed: false };
  }
  const questionId = readString(value.question_id) || "";
  if (!questionId) errors.push(`${prefix}.question_id is required`);
  if (questionId && !packetQuestionIds.has(questionId)) errors.push(`${prefix}.question_id=${questionId} missing from VisionEvidencePacket`);
  const definitive = value.definitive_judgement_allowed === true;
  if (typeof value.definitive_judgement_allowed !== "boolean") errors.push(`${prefix}.definitive_judgement_allowed must be boolean`);
  const expectedCorrectness = readCorrectness(value.expected_correctness);
  if (definitive && !expectedCorrectness) errors.push(`${prefix}.expected_correctness is required for definitive judgement`);
  if (!definitive && expectedCorrectness) errors.push(`${prefix}.expected_correctness must be omitted when definitive_judgement_allowed is false`);
  if (definitive && segmentationReviewByQuestionId) {
    const segmentationReviewQuestion = segmentationReviewByQuestionId.get(questionId);
    if (!segmentationReviewQuestion) {
      errors.push(`${prefix}.question_id=${questionId} missing from question segmentation review`);
    } else if (segmentationReviewQuestion.status !== "pass") {
      errors.push(`${prefix}.question_id=${questionId} must pass question segmentation review before definitive gold judgement`);
    }
  }
  validateAnnotationQuestionRefs(value, prefix, packetEvidenceRefs, errors);
  return {
    question_id: questionId,
    definitive_judgement_allowed: definitive,
    ...(expectedCorrectness ? { expected_correctness: expectedCorrectness } : {}),
    expected_knowledge_points: readStringArray(value.expected_knowledge_points),
    expected_mistake_types: readStringArray(value.expected_mistake_types)
  };
}

function buildEvidenceBasisFromAnnotation(
  questionsValue: unknown,
  packet: VisionEvidencePacket,
  packetQuestionIds: Set<string>,
  packetEvidenceRefs: Set<string>,
  errors: string[],
  prefix: string
): GoldLabelQuestionEvidenceBasis[] {
  const questions = Array.isArray(questionsValue) ? questionsValue : [];
  return questions
    .filter(isRecord)
    .map((question, index) => {
      const questionId = readString(question.question_id) || "";
      if (questionId && !packetQuestionIds.has(questionId)) errors.push(`${prefix}.questions[${index}].question_id=${questionId} missing from VisionEvidencePacket`);
      validateAnnotationQuestionRefs(question, `${prefix}.questions[${index}]`, packetEvidenceRefs, errors);
      return {
        question_id: questionId,
        student_trace_evidence_refs: readStringArray(question.student_trace_evidence_refs, inferEvidenceRefs(packet, questionId, studentTraceEvidenceTypes)),
        answer_key_or_rubric_evidence_refs: readStringArray(question.answer_key_or_rubric_evidence_refs, inferEvidenceRefs(packet, questionId, answerEvidenceTypes)),
        teacher_correction_evidence_refs: readStringArray(question.teacher_correction_evidence_refs, inferEvidenceRefs(packet, questionId, teacherCorrectionEvidenceTypes)),
        notes: readStringArray(question.notes)
      };
    });
}

function validateAnnotationQuestionRefs(value: Record<string, unknown>, prefix: string, packetEvidenceRefs: Set<string>, errors: string[]) {
  for (const field of ["student_trace_evidence_refs", "answer_key_or_rubric_evidence_refs", "teacher_correction_evidence_refs"]) {
    const refs = readStringArray(value[field]);
    refs.forEach((ref) => {
      if (!packetEvidenceRefs.has(ref) && !ref.startsWith("side_input.")) {
        errors.push(`${prefix}.${field} references unknown evidence_ref=${ref}`);
      }
    });
  }
}

function inferEvidenceRefs(packet: VisionEvidencePacket, questionId: string, evidenceTypes: Set<string>) {
  return packet.evidences.filter((evidence) => evidence.question_id === questionId && evidenceTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref);
}

function readMaterialClassification(value: unknown, prefix: string, errors: string[]): StudentLearningMaterialGoldCase["material_classification"] {
  if (!isRecord(value)) {
    errors.push(`${prefix} is required`);
    return {
      material_type: "other_student_material",
      subject: "其他",
      education_stage: "unknown",
      grade_candidate: "待人工标注",
      region_or_curriculum_candidate: "待人工标注"
    };
  }
  return {
    material_type: readString(value.material_type) as StudentLearningMaterialGoldCase["material_classification"]["material_type"],
    subject: readString(value.subject) as StudentLearningMaterialGoldCase["material_classification"]["subject"],
    education_stage: readString(value.education_stage) as StudentLearningMaterialGoldCase["material_classification"]["education_stage"],
    grade_candidate: readString(value.grade_candidate) || "",
    region_or_curriculum_candidate: readString(value.region_or_curriculum_candidate) || ""
  };
}

function readAnonymization(value: unknown, errors: string[]): StudentLearningMaterialGoldLabelPackage["anonymization"] {
  if (!isRecord(value)) {
    errors.push("anonymization is required");
    return {
      student_identifiers_removed: false,
      teacher_identifiers_removed: false,
      school_identifiers_removed: false,
      raw_images_excluded_from_gold_file: false
    };
  }
  return {
    student_identifiers_removed: value.student_identifiers_removed === true,
    teacher_identifiers_removed: value.teacher_identifiers_removed === true,
    school_identifiers_removed: value.school_identifiers_removed === true,
    raw_images_excluded_from_gold_file: value.raw_images_excluded_from_gold_file === true
  };
}

function emptyHumanLabel(caseId: string, index: number): StudentLearningMaterialGoldLabelPackage["labels"][number] {
  return {
    label_id: `${caseId}-label-${index + 1}`,
    reviewer_id: "",
    reviewer_role: "",
    labeled_at: "",
    gold: emptyGoldCase(caseId),
    question_evidence_basis: []
  };
}

function emptyGoldCase(caseId: string): StudentLearningMaterialGoldCase {
  return {
    case_id: caseId,
    material_classification: {
      material_type: "other_student_material",
      subject: "其他",
      education_stage: "unknown",
      grade_candidate: "",
      region_or_curriculum_candidate: ""
    },
    questions: [],
    require_safe_parent_feedback: true,
    require_teacher_professional_report: true,
    require_monthly_snapshot: true,
    require_model_contract: true
  };
}

function validateOptionalIdMatch(value: unknown, expected: string, fieldName: string, errors: string[]) {
  const actual = readString(value);
  if (actual && actual !== expected) errors.push(`${fieldName} must match VisionEvidencePacket: ${actual} != ${expected}`);
}

function readCorrectness(value: unknown): CorrectnessStatus | undefined {
  return value === "correct" || value === "partially_correct" || value === "incorrect" || value === "unknown" || value === "needs_teacher_review" ? value : undefined;
}

function readStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

const studentTraceEvidenceTypes = new Set(["student_original_answer", "student_revised_answer", "student_process", "student_note", "teacher_mark", "teacher_comment", "teacher_score"]);
const answerEvidenceTypes = new Set(["answer_key", "rubric"]);
const teacherCorrectionEvidenceTypes = new Set(["teacher_mark", "teacher_comment", "teacher_score"]);
