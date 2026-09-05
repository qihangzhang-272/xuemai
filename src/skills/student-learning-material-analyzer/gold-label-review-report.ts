import { createHash } from "node:crypto";
import type { ValidationResult, VisionEvidencePacket } from "./types";
import {
  buildGoldLabelAgreementReport,
  validateStudentLearningMaterialGoldLabelPackage,
  type GoldLabelDisagreement,
  type StudentLearningMaterialGoldLabelPackage
} from "./gold-labeling";

export type StudentLearningMaterialGoldLabelReviewReport = {
  schema_version: "student_learning_material_gold_label_review_report.v0.1";
  package_id: string;
  case_id: string;
  source_material_id: string;
  vision_packet_id?: string;
  material_id?: string;
  generated_at: string;
  reviewer_count: number;
  label_count: number;
  question_count: number;
  definitive_question_count: number;
  adjudication_status: "not_required_no_disagreement" | "required_and_present" | "required_missing" | "missing";
  agreement: {
    compared_field_count: number;
    disagreement_count: number;
    agreement_rate: number;
    classification_disagreement_count: number;
    question_disagreement_count: number;
    requires_adjudication: boolean;
  };
  disagreements: Array<{
    field: string;
    message: string;
    reviewer_value_hashes: string[];
  }>;
  readiness: {
    ready_for_99_evaluation: boolean;
    blockers: string[];
    warnings: string[];
  };
};

export function buildGoldLabelReviewReport(
  packageValue: StudentLearningMaterialGoldLabelPackage,
  options?: {
    generatedAt?: string;
    sourcePacket?: VisionEvidencePacket;
    allowedExternalEvidenceRefsByQuestionId?: Map<string, string[]>;
  }
): StudentLearningMaterialGoldLabelReviewReport {
  const packageValidation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
    sourcePacket: options?.sourcePacket,
    allowedExternalEvidenceRefsByQuestionId: options?.allowedExternalEvidenceRefsByQuestionId
  });
  const labels = Array.isArray(packageValue.labels) ? packageValue.labels : [];
  const agreement = buildGoldLabelAgreementReport(labels);
  const comparedFieldCount = countComparedFields(packageValue);
  const disagreementCount = agreement.disagreements.length;
  const hasAdjudicatedGold = Boolean(packageValue.adjudicated_gold);
  const hasAdjudicatedBy = Boolean(packageValue.adjudicated_by);
  const adjudicationStatus = readAdjudicationStatus({
    requiresAdjudication: agreement.requiresAdjudication,
    hasAdjudicatedGold,
    hasAdjudicatedBy
  });
  const blockers = buildReadinessBlockers({
    packageValidation,
    requiresAdjudication: agreement.requiresAdjudication,
    hasAdjudicatedGold,
    hasAdjudicatedBy
  });

  return {
    schema_version: "student_learning_material_gold_label_review_report.v0.1",
    package_id: packageValue.package_id,
    case_id: packageValue.case_id,
    source_material_id: packageValue.source_material_id,
    vision_packet_id: packageValue.vision_packet_id,
    material_id: packageValue.material_id,
    generated_at: options?.generatedAt ?? new Date().toISOString(),
    reviewer_count: new Set(labels.map((label) => label.reviewer_id).filter(Boolean)).size,
    label_count: labels.length,
    question_count: packageValue.adjudicated_gold?.questions.length ?? labels[0]?.gold.questions.length ?? 0,
    definitive_question_count: (packageValue.adjudicated_gold?.questions ?? labels[0]?.gold.questions ?? []).filter(
      (question) => question.definitive_judgement_allowed
    ).length,
    adjudication_status: adjudicationStatus,
    agreement: {
      compared_field_count: comparedFieldCount,
      disagreement_count: disagreementCount,
      agreement_rate: comparedFieldCount > 0 ? roundAgreementRate((comparedFieldCount - disagreementCount) / comparedFieldCount) : 0,
      classification_disagreement_count: agreement.disagreements.filter((item) => item.field.startsWith("material_classification.")).length,
      question_disagreement_count: agreement.disagreements.filter((item) => item.field.startsWith("questions.")).length,
      requires_adjudication: agreement.requiresAdjudication
    },
    disagreements: agreement.disagreements.map(redactDisagreementValues),
    readiness: {
      ready_for_99_evaluation: blockers.length === 0,
      blockers,
      warnings: packageValidation.warnings
    }
  };
}

export function validateGoldLabelReviewReport(
  value: unknown,
  packageValue?: StudentLearningMaterialGoldLabelPackage,
  sourcePacket?: VisionEvidencePacket,
  options?: {
    allowedExternalEvidenceRefsByQuestionId?: Map<string, string[]>;
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["gold label review report must be an object"], warnings };
  }
  const report = value as StudentLearningMaterialGoldLabelReviewReport;
  if (report.schema_version !== "student_learning_material_gold_label_review_report.v0.1") {
    errors.push("schema_version must be student_learning_material_gold_label_review_report.v0.1");
  }
  for (const field of ["package_id", "case_id", "source_material_id", "generated_at"] as const) {
    if (!readString(report[field])) errors.push(`${field} is required`);
  }
  for (const field of ["reviewer_count", "label_count", "question_count", "definitive_question_count"] as const) {
    if (!Number.isInteger(report[field]) || report[field] < 0) errors.push(`${field} must be a non-negative integer`);
  }
  if (
    report.adjudication_status !== "not_required_no_disagreement" &&
    report.adjudication_status !== "required_and_present" &&
    report.adjudication_status !== "required_missing" &&
    report.adjudication_status !== "missing"
  ) {
    errors.push("adjudication_status is invalid");
  }
  validateAgreementShape(report.agreement, errors);
  validateDisagreementShape(report.disagreements, errors);
  if (!isRecord(report.readiness)) {
    errors.push("readiness is required");
  } else {
    if (typeof report.readiness.ready_for_99_evaluation !== "boolean") errors.push("readiness.ready_for_99_evaluation must be boolean");
    if (!Array.isArray(report.readiness.blockers)) errors.push("readiness.blockers must be an array");
    if (!Array.isArray(report.readiness.warnings)) errors.push("readiness.warnings must be an array");
    if (report.readiness.ready_for_99_evaluation && report.readiness.blockers.length > 0) {
      errors.push("ready_for_99_evaluation report must not include blockers");
    }
    if (!report.readiness.ready_for_99_evaluation && report.readiness.blockers.length === 0) {
      errors.push("not-ready report must include at least one blocker");
    }
  }

  if (packageValue) {
    validateReportAgainstPackage(report, packageValue, sourcePacket, errors, warnings, {
      allowedExternalEvidenceRefsByQuestionId: options?.allowedExternalEvidenceRefsByQuestionId
    });
  }
  if (sourcePacket) validateNoPacketTextContentLeak(report, sourcePacket, errors);
  return { ok: errors.length === 0, errors, warnings };
}

function validateReportAgainstPackage(
  report: StudentLearningMaterialGoldLabelReviewReport,
  packageValue: StudentLearningMaterialGoldLabelPackage,
  sourcePacket: VisionEvidencePacket | undefined,
  errors: string[],
  warnings: string[],
  options?: {
    allowedExternalEvidenceRefsByQuestionId?: Map<string, string[]>;
  }
) {
  const expected = buildGoldLabelReviewReport(packageValue, {
    generatedAt: report.generated_at,
    sourcePacket,
    allowedExternalEvidenceRefsByQuestionId: options?.allowedExternalEvidenceRefsByQuestionId
  });
  if (report.package_id !== packageValue.package_id) errors.push("package_id must match gold label package");
  if (report.case_id !== packageValue.case_id) errors.push("case_id must match gold label package");
  if (report.source_material_id !== packageValue.source_material_id) errors.push("source_material_id must match gold label package");
  if (packageValue.vision_packet_id && report.vision_packet_id !== packageValue.vision_packet_id) {
    errors.push("vision_packet_id must match gold label package");
  }
  if (packageValue.material_id && report.material_id !== packageValue.material_id) {
    errors.push("material_id must match gold label package");
  }
  for (const field of ["reviewer_count", "label_count", "question_count", "definitive_question_count"] as const) {
    if (report[field] !== expected[field]) errors.push(`${field} must match gold label package`);
  }
  if (report.adjudication_status !== expected.adjudication_status) errors.push("adjudication_status must match gold label package");
  for (const field of [
    "compared_field_count",
    "disagreement_count",
    "agreement_rate",
    "classification_disagreement_count",
    "question_disagreement_count",
    "requires_adjudication"
  ] as const) {
    if (report.agreement[field] !== expected.agreement[field]) errors.push(`agreement.${field} must match gold label package`);
  }
  if (report.readiness.ready_for_99_evaluation !== expected.readiness.ready_for_99_evaluation) {
    errors.push("readiness.ready_for_99_evaluation must match gold label package validation");
  }
  if (JSON.stringify(normalizeDisagreementsForComparison(report.disagreements)) !== JSON.stringify(normalizeDisagreementsForComparison(expected.disagreements))) {
    errors.push("disagreements must match gold label package agreement report");
  }
  const reportBlockers = normalizeStringArray(report.readiness.blockers);
  const expectedBlockers = normalizeStringArray(expected.readiness.blockers);
  if (reportBlockers !== expectedBlockers) errors.push("readiness.blockers must match gold label package validation");
  const reportWarnings = normalizeStringArray(report.readiness.warnings);
  const expectedWarnings = normalizeStringArray(expected.readiness.warnings);
  if (reportWarnings !== expectedWarnings) errors.push("readiness.warnings must match gold label package validation");
  warnings.push(...expected.readiness.warnings.map((warning) => `gold_label_review_report package warning: ${warning}`));
}

function validateAgreementShape(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("agreement is required");
    return;
  }
  for (const field of [
    "compared_field_count",
    "disagreement_count",
    "classification_disagreement_count",
    "question_disagreement_count"
  ] as const) {
    if (!Number.isInteger(value[field]) || (value[field] as number) < 0) errors.push(`agreement.${field} must be a non-negative integer`);
  }
  if (typeof value.agreement_rate !== "number" || value.agreement_rate < 0 || value.agreement_rate > 1) {
    errors.push("agreement.agreement_rate must be a number between 0 and 1");
  }
  if (typeof value.requires_adjudication !== "boolean") errors.push("agreement.requires_adjudication must be boolean");
}

function validateDisagreementShape(value: unknown, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push("disagreements must be an array");
    return;
  }
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`disagreements[${index}] must be an object`);
      return;
    }
    if (!readString(item.field)) errors.push(`disagreements[${index}].field is required`);
    if (!readString(item.message)) errors.push(`disagreements[${index}].message is required`);
    if (!Array.isArray(item.reviewer_value_hashes) || !item.reviewer_value_hashes.every((hash) => typeof hash === "string" && /^[a-f0-9]{16}$/.test(hash))) {
      errors.push(`disagreements[${index}].reviewer_value_hashes must contain 16-character hex hashes`);
    }
  });
}

function normalizeDisagreementsForComparison(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!isRecord(item)) return item;
    return {
      field: readString(item.field),
      message: readString(item.message),
      reviewer_value_hashes: Array.isArray(item.reviewer_value_hashes)
        ? item.reviewer_value_hashes.filter((hash): hash is string => typeof hash === "string")
        : []
    };
  });
}

function countComparedFields(packageValue: StudentLearningMaterialGoldLabelPackage) {
  const labels = Array.isArray(packageValue.labels) ? packageValue.labels : [];
  if (labels.length < 2) return 0;
  const first = labels[0]?.gold;
  if (!first) return 0;
  return labels.slice(1).reduce((total, label) => {
    const questionIds = new Set([
      ...first.questions.map((question) => question.question_id),
      ...label.gold.questions.map((question) => question.question_id)
    ]);
    return total + 5 + questionIds.size * 4;
  }, 0);
}

function buildReadinessBlockers(input: {
  packageValidation: ValidationResult;
  requiresAdjudication: boolean;
  hasAdjudicatedGold: boolean;
  hasAdjudicatedBy: boolean;
}) {
  const blockers = [...input.packageValidation.errors];
  if (input.requiresAdjudication && (!input.hasAdjudicatedGold || !input.hasAdjudicatedBy)) {
    blockers.push("labels disagree and adjudication is not complete");
  }
  return uniqueStrings(blockers);
}

function readAdjudicationStatus(input: {
  requiresAdjudication: boolean;
  hasAdjudicatedGold: boolean;
  hasAdjudicatedBy: boolean;
}): StudentLearningMaterialGoldLabelReviewReport["adjudication_status"] {
  if (input.requiresAdjudication && input.hasAdjudicatedGold && input.hasAdjudicatedBy) return "required_and_present";
  if (input.requiresAdjudication) return "required_missing";
  if (input.hasAdjudicatedGold || input.hasAdjudicatedBy) return "not_required_no_disagreement";
  return "missing";
}

function redactDisagreementValues(disagreement: GoldLabelDisagreement) {
  return {
    field: disagreement.field,
    message: disagreement.message,
    reviewer_value_hashes: disagreement.reviewer_values.map(hashValue)
  };
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
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
    errors.push(`gold label review report must not include OCR/text content copied from VisionEvidencePacket evidence_ref=${evidenceRef}`);
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

function roundAgreementRate(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function normalizeStringArray(values: string[]) {
  return [...values].sort().join("|");
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
