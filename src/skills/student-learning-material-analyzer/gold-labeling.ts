import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { StudentLearningMaterialGoldCase } from "./evaluation";
import {
  validateQuestionSegmentationReview,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import type { CorrectnessStatus, ValidationResult, VisionEvidencePacket, VisionEvidenceType } from "./types";

export type GoldLabelQuestionEvidenceBasis = {
  question_id: string;
  student_trace_evidence_refs: string[];
  answer_key_or_rubric_evidence_refs?: string[];
  teacher_correction_evidence_refs?: string[];
  notes?: string[];
};

export type HumanGoldLabel = {
  label_id: string;
  reviewer_id: string;
  reviewer_role: string;
  labeled_at: string;
  gold: StudentLearningMaterialGoldCase;
  question_evidence_basis: GoldLabelQuestionEvidenceBasis[];
  notes?: string[];
};

export type StudentLearningMaterialGoldLabelPackage = {
  fixture_schema: "student_learning_material_gold_label_package.v0.1";
  package_id: string;
  case_id: string;
  source_material_id: string;
  vision_packet_id?: string;
  material_id?: string;
  anonymization: {
    student_identifiers_removed: boolean;
    teacher_identifiers_removed: boolean;
    school_identifiers_removed: boolean;
    raw_images_excluded_from_gold_file: boolean;
  };
  labels: HumanGoldLabel[];
  adjudicated_gold?: StudentLearningMaterialGoldCase;
  adjudicated_by?: {
    reviewer_id: string;
    reviewer_role: string;
    adjudicated_at: string;
    notes?: string[];
  };
};

export type GoldLabelPackageValidationOptions = {
  requireAdjudication?: boolean;
  sourcePacket?: VisionEvidencePacket;
  allowedExternalEvidenceRefsByQuestionId?: Map<string, string[]>;
};

const goldBasisEvidenceFields = ["student_trace_evidence_refs", "answer_key_or_rubric_evidence_refs", "teacher_correction_evidence_refs"] as const;

type GoldBasisEvidenceField = (typeof goldBasisEvidenceFields)[number];

const allowedEvidenceTypesByGoldBasisField: Record<GoldBasisEvidenceField, Set<VisionEvidenceType>> = {
  student_trace_evidence_refs: new Set([
    "student_original_answer",
    "student_revised_answer",
    "student_process",
    "student_note",
    "teacher_mark",
    "teacher_comment",
    "teacher_score"
  ]),
  answer_key_or_rubric_evidence_refs: new Set(["answer_key", "rubric"]),
  teacher_correction_evidence_refs: new Set(["teacher_mark", "teacher_comment", "teacher_score"])
};

const goldBasisEvidenceTypeDescriptions: Record<GoldBasisEvidenceField, string> = {
  student_trace_evidence_refs: "student trace evidence",
  answer_key_or_rubric_evidence_refs: "answer_key or rubric evidence",
  teacher_correction_evidence_refs: "teacher correction evidence"
};

export type GoldLabelDisagreement = {
  field: string;
  message: string;
  reviewer_values: string[];
};

export type GoldLabelAgreementReport = {
  ok: boolean;
  requiresAdjudication: boolean;
  disagreements: GoldLabelDisagreement[];
};

export type GoldLabelPackageExtractionResult =
  | {
      ok: true;
      gold: StudentLearningMaterialGoldCase;
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

export function validateStudentLearningMaterialGoldLabelPackage(
  value: unknown,
  options: GoldLabelPackageValidationOptions = { requireAdjudication: true }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["gold label package must be an object"], warnings };
  }

  if (value.fixture_schema !== "student_learning_material_gold_label_package.v0.1") {
    errors.push("fixture_schema must be student_learning_material_gold_label_package.v0.1");
  }
  const caseId = typeof value.case_id === "string" ? value.case_id : "";
  if (!caseId.trim()) errors.push("case_id is required");
  if (typeof value.package_id !== "string" || !value.package_id.trim()) errors.push("package_id is required");
  if (typeof value.source_material_id !== "string" || !value.source_material_id.trim()) errors.push("source_material_id is required");

  validateAnonymization(value.anonymization, errors);
  if (options.sourcePacket) {
    validateNoSourcePacketTextInNotes(value, options.sourcePacket, errors);
  }

  const labels = Array.isArray(value.labels) ? value.labels : [];
  if (!Array.isArray(value.labels)) {
    errors.push("labels must be an array");
  } else if (labels.length < 2) {
    errors.push("gold label package requires at least two independent labels");
  }

  const labelIds = labels.map((label) => (isRecord(label) ? stringValue(label.label_id) : ""));
  const reviewerIds = labels.map((label) => (isRecord(label) ? stringValue(label.reviewer_id) : ""));
  const duplicateLabelIds = findDuplicates(labelIds.filter(Boolean));
  const duplicateReviewerIds = findDuplicates(reviewerIds.filter(Boolean));
  if (duplicateLabelIds.length) errors.push(`duplicate label_id: ${duplicateLabelIds.join(", ")}`);
  if (duplicateReviewerIds.length) errors.push(`double labeling requires distinct reviewer_id values: ${duplicateReviewerIds.join(", ")}`);

  labels.forEach((label, index) => {
    validateHumanGoldLabel(label, index, caseId, errors, warnings);
  });

  const requireAdjudication = options.requireAdjudication !== false;
  const agreement = buildGoldLabelAgreementReport(labels.filter(isHumanGoldLabelLike));
  if (agreement.requiresAdjudication && !isRecord(value.adjudicated_gold)) {
    errors.push("labels disagree; adjudicated_gold is required");
  }

  if (!isRecord(value.adjudicated_gold)) {
    if (requireAdjudication) {
      errors.push("adjudicated_gold is required for 99% evaluation");
    } else {
      warnings.push("adjudicated_gold is missing; package can only be used as an annotation draft");
    }
  } else {
    validateGoldCase(value.adjudicated_gold, "adjudicated_gold", caseId, errors, warnings);
    validateAdjudicatedGoldDefinitiveQuestionsHaveLabelEvidenceBasis(value.adjudicated_gold, labels, errors);
    if (requireAdjudication && !isRecord(value.adjudicated_by)) {
      errors.push("adjudicated_by is required when adjudicated_gold is present");
    }
  }

  if (isRecord(value.adjudicated_by)) {
    if (!stringValue(value.adjudicated_by.reviewer_id)) errors.push("adjudicated_by.reviewer_id is required");
    if (!stringValue(value.adjudicated_by.reviewer_role)) errors.push("adjudicated_by.reviewer_role is required");
    if (!stringValue(value.adjudicated_by.adjudicated_at)) errors.push("adjudicated_by.adjudicated_at is required");
  }

  if (options.sourcePacket) {
    validateGoldLabelPackageAgainstSourcePacket(value, options.sourcePacket, errors, options.allowedExternalEvidenceRefsByQuestionId);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function buildGoldLabelAgreementReport(labels: HumanGoldLabel[]): GoldLabelAgreementReport {
  const disagreements: GoldLabelDisagreement[] = [];
  if (labels.length < 2) {
    return { ok: false, requiresAdjudication: true, disagreements: [{ field: "labels", message: "at least two labels are required", reviewer_values: [] }] };
  }

  const first = labels[0].gold;
  labels.slice(1).forEach((label, reviewerIndex) => {
    const reviewerName = label.reviewer_id || `reviewer_${reviewerIndex + 2}`;
    compareField(disagreements, "material_classification.material_type", first.material_classification.material_type, label.gold.material_classification.material_type, reviewerName);
    compareField(disagreements, "material_classification.subject", first.material_classification.subject, label.gold.material_classification.subject, reviewerName);
    compareField(disagreements, "material_classification.education_stage", first.material_classification.education_stage, label.gold.material_classification.education_stage, reviewerName);
    compareField(disagreements, "material_classification.grade_candidate", first.material_classification.grade_candidate, label.gold.material_classification.grade_candidate, reviewerName);
    compareField(
      disagreements,
      "material_classification.region_or_curriculum_candidate",
      first.material_classification.region_or_curriculum_candidate,
      label.gold.material_classification.region_or_curriculum_candidate,
      reviewerName
    );

    const firstQuestions = new Map(first.questions.map((question) => [question.question_id, question]));
    const otherQuestions = new Map(label.gold.questions.map((question) => [question.question_id, question]));
    const questionIds = uniqueSorted([...firstQuestions.keys(), ...otherQuestions.keys()]);
    questionIds.forEach((questionId) => {
      const left = firstQuestions.get(questionId);
      const right = otherQuestions.get(questionId);
      if (!left || !right) {
        disagreements.push({
          field: `questions.${questionId}`,
          message: `question id missing in one reviewer label for ${reviewerName}`,
          reviewer_values: [left ? "present" : "missing", right ? "present" : "missing"]
        });
        return;
      }
      compareField(disagreements, `questions.${questionId}.definitive_judgement_allowed`, String(left.definitive_judgement_allowed), String(right.definitive_judgement_allowed), reviewerName);
      compareField(disagreements, `questions.${questionId}.expected_correctness`, left.expected_correctness || "none", right.expected_correctness || "none", reviewerName);
      compareField(
        disagreements,
        `questions.${questionId}.expected_knowledge_points`,
        normalizeStringArray(left.expected_knowledge_points),
        normalizeStringArray(right.expected_knowledge_points),
        reviewerName
      );
      compareField(
        disagreements,
        `questions.${questionId}.expected_mistake_types`,
        normalizeStringArray(left.expected_mistake_types),
        normalizeStringArray(right.expected_mistake_types),
        reviewerName
      );
    });
  });

  return {
    ok: disagreements.length === 0,
    requiresAdjudication: disagreements.length > 0,
    disagreements
  };
}

export function extractAdjudicatedGoldCaseFromLabelPackage(value: unknown): GoldLabelPackageExtractionResult {
  const validation = validateStudentLearningMaterialGoldLabelPackage(value, { requireAdjudication: true });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, warnings: validation.warnings };
  }
  const packageValue = value as StudentLearningMaterialGoldLabelPackage;
  return { ok: true, gold: packageValue.adjudicated_gold!, warnings: validation.warnings };
}

export function loadStudentLearningMaterialGoldLabelPackageFromFile(filePath: string) {
  try {
    return { ok: true as const, package: JSON.parse(readFileSync(resolve(filePath), "utf8")) as unknown };
  } catch (error) {
    return { ok: false as const, errors: [`Cannot read gold label package: ${formatError(error)}`] };
  }
}

export function listGoldLabelPackageProvenanceDifferences(
  left: StudentLearningMaterialGoldLabelPackage,
  right: StudentLearningMaterialGoldLabelPackage
) {
  const differences: string[] = [];
  if (left.case_id !== right.case_id) differences.push("case_id");
  if (left.source_material_id !== right.source_material_id) differences.push("source_material_id");
  if (left.vision_packet_id !== right.vision_packet_id) differences.push("vision_packet_id");
  if (left.material_id !== right.material_id) differences.push("material_id");
  if (left.labels.length !== right.labels.length) differences.push("label count");
  if (JSON.stringify(normalizeHumanGoldLabelsForReplayComparison(left.labels)) !== JSON.stringify(normalizeHumanGoldLabelsForReplayComparison(right.labels))) {
    differences.push("labels");
  }
  if (JSON.stringify(left.adjudicated_gold) !== JSON.stringify(right.adjudicated_gold)) {
    differences.push("adjudicated_gold");
  }
  if (JSON.stringify(normalizeAdjudicatedByForReplayComparison(left.adjudicated_by)) !== JSON.stringify(normalizeAdjudicatedByForReplayComparison(right.adjudicated_by))) {
    differences.push("adjudicated_by");
  }
  return differences;
}

export function createGoldLabelPackageTemplateFromVisionPacket(
  packet: VisionEvidencePacket,
  options?: {
    packageId?: string;
    caseId?: string;
    reviewerIds?: [string, string];
    reviewerRoles?: [string, string];
    labeledAt?: string;
    questionSegmentationReview?: StudentLearningMaterialQuestionSegmentationReview;
  }
): StudentLearningMaterialGoldLabelPackage {
  const segmentationReview = options?.questionSegmentationReview;
  if (segmentationReview) {
    const validation = validateQuestionSegmentationReview(segmentationReview, packet);
    if (!validation.ok) {
      throw new Error(`questionSegmentationReview must match VisionEvidencePacket: ${validation.errors.join("；")}`);
    }
  }
  const caseId = options?.caseId || `gold-${packet.material_id}`;
  const reviewerIds = options?.reviewerIds || ["reviewer_a", "reviewer_b"];
  const reviewerRoles = options?.reviewerRoles || ["教研标注员", "授课老师"];
  const labeledAt = options?.labeledAt || packet.created_at;
  const gold = buildGoldCaseSkeleton(packet, caseId);
  const questionEvidenceBasis = packet.questions.map((question) => buildQuestionEvidenceBasis(packet, question.question_id, segmentationReview));

  return {
    fixture_schema: "student_learning_material_gold_label_package.v0.1",
    package_id: options?.packageId || `gold-label-${packet.material_id}`,
    case_id: caseId,
    source_material_id: packet.source_material_id,
    vision_packet_id: packet.plugin_run_id,
    material_id: packet.material_id,
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
      labeled_at: labeledAt,
      gold,
      question_evidence_basis: questionEvidenceBasis,
      notes: ["Template only. Fill classification, correctness, knowledge points, and mistake types before evaluation."]
    }))
  };
}

function validateHumanGoldLabel(value: unknown, index: number, packageCaseId: string, errors: string[], warnings: string[]) {
  const prefix = `labels[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!stringValue(value.label_id)) errors.push(`${prefix}.label_id is required`);
  if (!stringValue(value.reviewer_id)) errors.push(`${prefix}.reviewer_id is required`);
  if (!stringValue(value.reviewer_role)) errors.push(`${prefix}.reviewer_role is required`);
  if (!stringValue(value.labeled_at)) errors.push(`${prefix}.labeled_at is required`);
  if (!isRecord(value.gold)) {
    errors.push(`${prefix}.gold is required`);
  } else {
    validateGoldCase(value.gold, `${prefix}.gold`, packageCaseId, errors, warnings);
  }

  const bases = Array.isArray(value.question_evidence_basis) ? value.question_evidence_basis : [];
  if (!Array.isArray(value.question_evidence_basis)) errors.push(`${prefix}.question_evidence_basis must be an array`);
  const basisByQuestionId = new Map(bases.filter(isRecord).map((basis) => [stringValue(basis.question_id), basis]));
  const goldQuestions = isRecord(value.gold) && Array.isArray(value.gold.questions) ? value.gold.questions : [];
  goldQuestions.forEach((question) => {
    if (!isRecord(question)) return;
    const questionId = stringValue(question.question_id);
    const basis = basisByQuestionId.get(questionId);
    if (!basis) {
      errors.push(`${prefix}.question_evidence_basis missing question_id=${questionId}`);
      return;
    }
    if (!nonEmptyStringArray(basis.student_trace_evidence_refs)) {
      errors.push(`${prefix}.question_evidence_basis[${questionId}] requires student_trace_evidence_refs`);
    }
    if (question.definitive_judgement_allowed === true) {
      const hasAnswerBasis = nonEmptyStringArray(basis.answer_key_or_rubric_evidence_refs) || nonEmptyStringArray(basis.teacher_correction_evidence_refs);
      if (!hasAnswerBasis) {
        errors.push(`${prefix}.question_evidence_basis[${questionId}] requires answer/rubric or teacher correction evidence for definitive judgement`);
      }
    }
  });
}

function validateGoldCase(value: unknown, prefix: string, packageCaseId: string, errors: string[], warnings: string[]) {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (stringValue(value.case_id) !== packageCaseId) {
    errors.push(`${prefix}.case_id must match package case_id`);
  }
  if (!isRecord(value.material_classification)) {
    errors.push(`${prefix}.material_classification is required`);
  } else {
    for (const field of ["material_type", "subject", "education_stage", "grade_candidate", "region_or_curriculum_candidate"]) {
      if (!stringValue(value.material_classification[field])) errors.push(`${prefix}.material_classification.${field} is required`);
    }
  }
  if (!Array.isArray(value.questions) || !value.questions.length) {
    errors.push(`${prefix}.questions must not be empty`);
  } else {
    const questionIds = value.questions.map((question) => (isRecord(question) ? stringValue(question.question_id) : ""));
    const duplicates = findDuplicates(questionIds.filter(Boolean));
    if (duplicates.length) errors.push(`${prefix}.questions duplicate question_id: ${duplicates.join(", ")}`);
    value.questions.forEach((question, index) => {
      validateGoldQuestion(question, `${prefix}.questions[${index}]`, errors, warnings);
    });
  }
  for (const field of ["require_safe_parent_feedback", "require_teacher_professional_report", "require_monthly_snapshot", "require_model_contract"]) {
    if (typeof value[field] !== "boolean") errors.push(`${prefix}.${field} must be boolean`);
  }
}

function validateGoldQuestion(value: unknown, prefix: string, errors: string[], warnings: string[]) {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!stringValue(value.question_id)) errors.push(`${prefix}.question_id is required`);
  if (typeof value.definitive_judgement_allowed !== "boolean") {
    errors.push(`${prefix}.definitive_judgement_allowed must be boolean`);
  }
  if (value.definitive_judgement_allowed === true && !isCorrectnessStatus(value.expected_correctness)) {
    errors.push(`${prefix}.expected_correctness is required when definitive_judgement_allowed is true`);
  }
  if (value.definitive_judgement_allowed === false && value.expected_correctness) {
    errors.push(`${prefix}.expected_correctness must be omitted when definitive_judgement_allowed is false`);
  }
  if (Array.isArray(value.expected_knowledge_points) && !value.expected_knowledge_points.every((item) => typeof item === "string" && item.trim())) {
    warnings.push(`${prefix}.expected_knowledge_points contains blank values`);
  }
  if (Array.isArray(value.expected_mistake_types) && !value.expected_mistake_types.every((item) => typeof item === "string" && item.trim())) {
    warnings.push(`${prefix}.expected_mistake_types contains blank values`);
  }
}

function validateAdjudicatedGoldDefinitiveQuestionsHaveLabelEvidenceBasis(adjudicatedGold: Record<string, unknown>, labels: unknown[], errors: string[]) {
  const questions = Array.isArray(adjudicatedGold.questions) ? adjudicatedGold.questions : [];
  questions.forEach((question, questionIndex) => {
    if (!isRecord(question) || question.definitive_judgement_allowed !== true) return;
    const questionId = stringValue(question.question_id);
    if (!questionId) return;
    labels.forEach((label, labelIndex) => {
      if (!isRecord(label)) return;
      const bases = Array.isArray(label.question_evidence_basis) ? label.question_evidence_basis : [];
      const basis = bases.find((item) => isRecord(item) && stringValue(item.question_id) === questionId);
      if (!isRecord(basis)) {
        errors.push(`adjudicated_gold.questions[${questionIndex}] definitive question_id=${questionId} missing labels[${labelIndex}].question_evidence_basis`);
        return;
      }
      if (!nonEmptyStringArray(basis.student_trace_evidence_refs)) {
        errors.push(`adjudicated_gold.questions[${questionIndex}] definitive question_id=${questionId} requires labels[${labelIndex}] student_trace_evidence_refs`);
      }
      const hasAnswerBasis = nonEmptyStringArray(basis.answer_key_or_rubric_evidence_refs) || nonEmptyStringArray(basis.teacher_correction_evidence_refs);
      if (!hasAnswerBasis) {
        errors.push(`adjudicated_gold.questions[${questionIndex}] definitive question_id=${questionId} requires labels[${labelIndex}] answer/rubric or teacher correction evidence`);
      }
    });
  });
}

function validateGoldLabelPackageAgainstSourcePacket(
  value: Record<string, unknown>,
  packet: VisionEvidencePacket,
  errors: string[],
  allowedExternalEvidenceRefsByQuestionId?: Map<string, string[]>
) {
  if (stringValue(value.source_material_id) && stringValue(value.source_material_id) !== packet.source_material_id) {
    errors.push("source_material_id must match VisionEvidencePacket source_material_id");
  }
  if (stringValue(value.vision_packet_id) && stringValue(value.vision_packet_id) !== packet.plugin_run_id) {
    errors.push("vision_packet_id must match VisionEvidencePacket plugin_run_id");
  }
  if (stringValue(value.material_id) && stringValue(value.material_id) !== packet.material_id) {
    errors.push("material_id must match VisionEvidencePacket material_id");
  }

  const expectedQuestionIds = packet.questions.map((question) => question.question_id).filter(Boolean);
  const labels = Array.isArray(value.labels) ? value.labels : [];
  labels.forEach((label, index) => {
    if (!isRecord(label)) return;
    if (isRecord(label.gold)) validateGoldCaseQuestionCoverageAgainstSourcePacket(label.gold, `labels[${index}].gold`, expectedQuestionIds, errors);
    validateQuestionEvidenceBasisAgainstSourcePacket(label.question_evidence_basis, `labels[${index}].question_evidence_basis`, packet, errors, allowedExternalEvidenceRefsByQuestionId);
  });

  if (isRecord(value.adjudicated_gold)) {
    validateGoldCaseQuestionCoverageAgainstSourcePacket(value.adjudicated_gold, "adjudicated_gold", expectedQuestionIds, errors);
  }
}

function validateGoldCaseQuestionCoverageAgainstSourcePacket(value: Record<string, unknown>, prefix: string, expectedQuestionIds: string[], errors: string[]) {
  const questions = Array.isArray(value.questions) ? value.questions : [];
  const actualQuestionIds = questions.map((question) => (isRecord(question) ? stringValue(question.question_id) : "")).filter(Boolean);
  validateQuestionIdSequence(actualQuestionIds, expectedQuestionIds, `${prefix}.questions`, errors);
}

function validateQuestionEvidenceBasisAgainstSourcePacket(
  value: unknown,
  prefix: string,
  packet: VisionEvidencePacket,
  errors: string[],
  allowedExternalEvidenceRefsByQuestionId?: Map<string, string[]>
) {
  const bases = Array.isArray(value) ? value : [];
  const actualQuestionIds = bases.map((basis) => (isRecord(basis) ? stringValue(basis.question_id) : "")).filter(Boolean);
  const expectedQuestionIds = packet.questions.map((question) => question.question_id).filter(Boolean);
  const evidenceByRef = new Map(packet.evidences.map((evidence) => [evidence.evidence_ref, evidence]));
  validateQuestionIdSequence(actualQuestionIds, expectedQuestionIds, prefix, errors);

  bases.forEach((basis, index) => {
    if (!isRecord(basis)) return;
    const questionId = stringValue(basis.question_id);
    for (const field of goldBasisEvidenceFields) {
      const refs = Array.isArray(basis[field]) ? basis[field].filter((ref): ref is string => typeof ref === "string" && Boolean(ref.trim())) : [];
      refs.forEach((ref, refIndex) => {
        if (ref.startsWith("side_input.")) {
          if (field !== "answer_key_or_rubric_evidence_refs") {
            errors.push(`${prefix}[${index}].${field}[${refIndex}] side_input refs are only allowed for answer_key_or_rubric_evidence_refs`);
          } else if (!allowedExternalEvidenceRefsByQuestionId) {
            errors.push(
              `${prefix}[${index}].${field}[${refIndex}] side_input evidence_ref requires question-mapped answer/rubric side input map for source-packet validation: ${ref}`
            );
          } else if (!allowedExternalEvidenceRefsByQuestionId.get(questionId)?.includes(ref)) {
            errors.push(`${prefix}[${index}].${field}[${refIndex}] side_input evidence_ref is not mapped to question_id=${questionId}: ${ref}`);
          }
          return;
        }
        const evidence = evidenceByRef.get(ref);
        if (!evidence) {
          errors.push(`${prefix}[${index}].${field}[${refIndex}] evidence_ref=${ref} missing from VisionEvidencePacket`);
          return;
        }
        if (questionId && evidence.question_id !== questionId) {
          errors.push(`${prefix}[${index}].${field}[${refIndex}] evidence_ref=${ref} belongs to question_id=${evidence.question_id}, not ${questionId}`);
        }
        if (!allowedEvidenceTypesByGoldBasisField[field].has(evidence.evidence_type)) {
          errors.push(
            `${prefix}[${index}].${field}[${refIndex}] evidence_ref=${ref} has evidence_type=${evidence.evidence_type}, expected ${goldBasisEvidenceTypeDescriptions[field]}`
          );
        }
      });
    }
  });
}

function validateQuestionIdSequence(actualQuestionIds: string[], expectedQuestionIds: string[], prefix: string, errors: string[]) {
  const expectedQuestionIdSet = new Set(expectedQuestionIds);
  const actualQuestionIdSet = new Set(actualQuestionIds);
  const duplicateQuestionIds = findDuplicates(actualQuestionIds);

  duplicateQuestionIds.forEach((questionId) => {
    errors.push(`${prefix} duplicate question_id=${questionId}`);
  });
  expectedQuestionIds.forEach((questionId) => {
    if (!actualQuestionIdSet.has(questionId)) errors.push(`${prefix} missing VisionEvidencePacket question_id=${questionId}`);
  });
  actualQuestionIds.forEach((questionId, index) => {
    if (!expectedQuestionIdSet.has(questionId)) errors.push(`${prefix}[${index}].question_id=${questionId} missing from VisionEvidencePacket`);
  });

  const sameQuestionSet =
    duplicateQuestionIds.length === 0 &&
    expectedQuestionIds.length === actualQuestionIds.length &&
    expectedQuestionIds.every((questionId) => actualQuestionIdSet.has(questionId));
  if (sameQuestionSet && expectedQuestionIds.some((questionId, index) => actualQuestionIds[index] !== questionId)) {
    errors.push(`${prefix} order must match VisionEvidencePacket questions: expected ${expectedQuestionIds.join(", ")} but got ${actualQuestionIds.join(", ")}`);
  }
}

function validateAnonymization(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("anonymization is required");
    return;
  }
  for (const field of ["student_identifiers_removed", "teacher_identifiers_removed", "school_identifiers_removed", "raw_images_excluded_from_gold_file"]) {
    if (value[field] !== true) errors.push(`anonymization.${field} must be true for evaluation use`);
  }
}

function validateNoSourcePacketTextInNotes(value: unknown, packet: VisionEvidencePacket, errors: string[]) {
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
    errors.push(`gold label package notes must not include OCR/text content copied from VisionEvidencePacket evidence_ref=${evidenceRef}`);
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

function buildGoldCaseSkeleton(packet: VisionEvidencePacket, caseId: string): StudentLearningMaterialGoldCase {
  return {
    case_id: caseId,
    material_classification: {
      material_type: "other_student_material",
      subject: "其他",
      education_stage: "unknown",
      grade_candidate: "待人工标注",
      region_or_curriculum_candidate: "待人工标注"
    },
    questions: packet.questions.map((question) => ({
      question_id: question.question_id,
      definitive_judgement_allowed: false
    })),
    require_safe_parent_feedback: true,
    require_teacher_professional_report: true,
    require_monthly_snapshot: true,
    require_model_contract: true
  };
}

function buildQuestionEvidenceBasis(
  packet: VisionEvidencePacket,
  questionId: string,
  segmentationReview?: StudentLearningMaterialQuestionSegmentationReview
): GoldLabelQuestionEvidenceBasis {
  const evidences = packet.evidences.filter((evidence) => evidence.question_id === questionId);
  const studentTraceEvidenceTypes = new Set(["student_original_answer", "student_revised_answer", "student_process", "student_note", "teacher_mark", "teacher_comment", "teacher_score"]);
  const answerEvidenceTypes = new Set(["answer_key", "rubric"]);
  const teacherCorrectionEvidenceTypes = new Set(["teacher_mark", "teacher_comment", "teacher_score"]);
  const segmentationQuestion = segmentationReview?.questions.find((question) => question.question_id === questionId);
  const notes = segmentationQuestion
    ? [
        `question_segmentation_review_status=${segmentationQuestion.status}`,
        `question_segmentation_review_required=${segmentationQuestion.review_required ? "yes" : "no"}`,
        `question_segmentation_definitive_judgement_allowed=${segmentationQuestion.definitive_judgement_allowed ? "yes" : "no"}`,
        ...(segmentationQuestion.issues.length ? [`question_segmentation_issues=${segmentationQuestion.issues.join("|")}`] : [])
      ]
    : undefined;
  return {
    question_id: questionId,
    student_trace_evidence_refs: evidences.filter((evidence) => studentTraceEvidenceTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref),
    answer_key_or_rubric_evidence_refs: evidences.filter((evidence) => answerEvidenceTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref),
    teacher_correction_evidence_refs: evidences.filter((evidence) => teacherCorrectionEvidenceTypes.has(evidence.evidence_type)).map((evidence) => evidence.evidence_ref),
    ...(notes ? { notes } : {})
  };
}

function compareField(disagreements: GoldLabelDisagreement[], field: string, left: string, right: string, reviewerName: string) {
  if (left !== right) {
    disagreements.push({
      field,
      message: `${field} differs from first reviewer for ${reviewerName}`,
      reviewer_values: [left, right]
    });
  }
}

function isHumanGoldLabelLike(value: unknown): value is HumanGoldLabel {
  return isRecord(value) && isRecord(value.gold) && Array.isArray(value.question_evidence_basis);
}

function isCorrectnessStatus(value: unknown): value is CorrectnessStatus {
  return value === "correct" || value === "partially_correct" || value === "incorrect" || value === "unknown" || value === "needs_teacher_review";
}

function nonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim());
}

function normalizeStringArray(value: string[] | undefined) {
  return uniqueSorted(value || []).join("|") || "none";
}

function normalizeHumanGoldLabelsForReplayComparison(labels: HumanGoldLabel[]) {
  return labels.map((label) => ({
    label_id: label.label_id,
    reviewer_id: label.reviewer_id,
    reviewer_role: label.reviewer_role,
    labeled_at: label.labeled_at,
    gold: label.gold,
    question_evidence_basis: (label.question_evidence_basis ?? []).map((basis) => ({
      question_id: basis.question_id,
      student_trace_evidence_refs: normalizeStringListForReplayComparison(basis.student_trace_evidence_refs),
      answer_key_or_rubric_evidence_refs: normalizeStringListForReplayComparison(basis.answer_key_or_rubric_evidence_refs),
      teacher_correction_evidence_refs: normalizeStringListForReplayComparison(basis.teacher_correction_evidence_refs),
      notes: normalizeStringListForReplayComparison(basis.notes)
    })),
    notes: normalizeStringListForReplayComparison(label.notes)
  }));
}

function normalizeAdjudicatedByForReplayComparison(adjudicatedBy: StudentLearningMaterialGoldLabelPackage["adjudicated_by"]) {
  if (!adjudicatedBy) return undefined;
  return {
    reviewer_id: adjudicatedBy.reviewer_id,
    reviewer_role: adjudicatedBy.reviewer_role,
    adjudicated_at: adjudicatedBy.adjudicated_at,
    notes: normalizeStringListForReplayComparison(adjudicatedBy.notes)
  };
}

function normalizeStringListForReplayComparison(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function uniqueSorted<T extends string>(items: T[]) {
  return Array.from(new Set(items)).sort();
}

function findDuplicates(items: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return Array.from(duplicates);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
