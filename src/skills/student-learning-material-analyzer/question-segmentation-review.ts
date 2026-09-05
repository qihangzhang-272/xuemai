import {
  buildQuestionEvidenceReadiness,
  type QuestionEvidenceReadinessStatus
} from "./question-evidence-readiness";
import type { BoundingBox, Polygon, ValidationResult, VisionEvidencePacket, VisionEvidenceType } from "./types";

export type QuestionSegmentationReviewStatus = "pass" | "needs_teacher_review" | "blocked";

export type QuestionSegmentationReviewIssue =
  | "question_region_missing"
  | "question_page_missing"
  | "question_low_confidence"
  | "question_risk_flag"
  | "region_low_confidence"
  | "geometry_missing"
  | "crop_ref_missing"
  | "evidence_region_missing"
  | "evidence_region_not_found"
  | "orphan_evidence_question";

export type StudentLearningMaterialQuestionSegmentationReview = {
  schema_version: "student_learning_material_question_segmentation_review.v0.1";
  source_material_id: string;
  material_id: string;
  vision_packet_id: string;
  plugin_provider: string;
  plugin_model_version: string;
  generated_at: string;
  summary: {
    question_count: number;
    pass_count: number;
    needs_teacher_review_count: number;
    blocked_count: number;
    missing_crop_ref_count: number;
    low_confidence_region_count: number;
    orphan_evidence_count: number;
    evidence_without_region_count: number;
  };
  questions: QuestionSegmentationReviewQuestion[];
  orphan_evidences: Array<{
    evidence_ref: string;
    question_id: string;
    evidence_type: VisionEvidenceType;
    reason: "question_id_not_in_packet";
  }>;
  human_review_checklist: string[];
};

export type QuestionSegmentationReviewQuestion = {
  question_id: string;
  question_number?: string;
  page_id?: string;
  status: QuestionSegmentationReviewStatus;
  review_required: boolean;
  issues: QuestionSegmentationReviewIssue[];
  confidence: number;
  readiness_status: QuestionEvidenceReadinessStatus;
  definitive_judgement_allowed: boolean;
  regions: Array<{
    region_id: string;
    region_role: string;
    page_id: string;
    bbox?: BoundingBox;
    polygon?: Polygon;
    crop_ref?: string;
    confidence: number;
    issues: QuestionSegmentationReviewIssue[];
  }>;
  evidence_refs: string[];
  evidence_type_counts: Partial<Record<VisionEvidenceType, number>>;
  evidence_without_region_count: number;
};

const confidenceThreshold = 0.65;

export function buildQuestionSegmentationReview(
  packet: VisionEvidencePacket,
  options?: {
    generatedAt?: string;
  }
): StudentLearningMaterialQuestionSegmentationReview {
  const readiness = buildQuestionEvidenceReadiness(packet);
  const readinessByQuestionId = new Map(readiness.questions.map((question) => [question.question_id, question]));
  const questionIds = new Set(packet.questions.map((question) => question.question_id));
  const pageIds = new Set(packet.pages.map((page) => page.page_id));
  const orphanEvidences = packet.evidences
    .filter((evidence) => !questionIds.has(evidence.question_id))
    .map((evidence) => ({
      evidence_ref: evidence.evidence_ref,
      question_id: evidence.question_id,
      evidence_type: evidence.evidence_type,
      reason: "question_id_not_in_packet" as const
    }));

  const questions = packet.questions.map((question) => {
    const regionIds = new Set(question.regions.map((region) => region.region_id));
    const evidenceForQuestion = packet.evidences.filter((evidence) => evidence.question_id === question.question_id);
    const evidenceRegionIssues = evidenceForQuestion.some((evidence) => evidence.region_id && !regionIds.has(evidence.region_id));
    const evidenceWithoutRegionCount = evidenceForQuestion.filter((evidence) => !evidence.region_id).length;
    const regionSummaries = question.regions.map((region) => {
      const issues = uniqueIssues([
        region.confidence < confidenceThreshold ? "region_low_confidence" : undefined,
        !region.bbox && !region.polygon ? "geometry_missing" : undefined,
        !region.crop_ref ? "crop_ref_missing" : undefined
      ]);
      return {
        region_id: region.region_id,
        region_role: region.region_role,
        page_id: region.page_id,
        bbox: region.bbox,
        polygon: region.polygon,
        crop_ref: region.crop_ref,
        confidence: region.confidence,
        issues
      };
    });
    const issues = uniqueIssues([
      !question.regions.length ? "question_region_missing" : undefined,
      question.page_id && !pageIds.has(question.page_id) ? "question_page_missing" : undefined,
      question.confidence < confidenceThreshold ? "question_low_confidence" : undefined,
      question.risk_flags.length ? "question_risk_flag" : undefined,
      evidenceWithoutRegionCount > 0 ? "evidence_region_missing" : undefined,
      evidenceRegionIssues ? "evidence_region_not_found" : undefined,
      ...regionSummaries.flatMap((region) => region.issues)
    ]);
    const status = computeStatus(issues);
    const questionReadiness = readinessByQuestionId.get(question.question_id);

    return {
      question_id: question.question_id,
      question_number: question.question_number,
      page_id: question.page_id,
      status,
      review_required: status !== "pass",
      issues,
      confidence: question.confidence,
      readiness_status: questionReadiness?.status ?? "blocked",
      definitive_judgement_allowed: questionReadiness?.definitive_judgement_allowed ?? false,
      regions: regionSummaries,
      evidence_refs: evidenceForQuestion.map((evidence) => evidence.evidence_ref),
      evidence_type_counts: countEvidenceTypes(evidenceForQuestion.map((evidence) => evidence.evidence_type)),
      evidence_without_region_count: evidenceWithoutRegionCount
    };
  });

  return {
    schema_version: "student_learning_material_question_segmentation_review.v0.1",
    source_material_id: packet.source_material_id,
    material_id: packet.material_id,
    vision_packet_id: packet.plugin_run_id,
    plugin_provider: packet.plugin_provider,
    plugin_model_version: packet.plugin_model_version,
    generated_at: options?.generatedAt ?? new Date().toISOString(),
    summary: {
      question_count: questions.length,
      pass_count: questions.filter((question) => question.status === "pass").length,
      needs_teacher_review_count: questions.filter((question) => question.status === "needs_teacher_review").length,
      blocked_count: questions.filter((question) => question.status === "blocked").length,
      missing_crop_ref_count: questions.reduce((total, question) => total + question.regions.filter((region) => !region.crop_ref).length, 0),
      low_confidence_region_count: questions.reduce((total, question) => total + question.regions.filter((region) => region.confidence < confidenceThreshold).length, 0),
      orphan_evidence_count: orphanEvidences.length,
      evidence_without_region_count: questions.reduce((total, question) => total + question.evidence_without_region_count, 0)
    },
    questions,
    orphan_evidences: orphanEvidences,
    human_review_checklist: [
      "逐题核对题号是否与原图一致，跨页题必须保留稳定 question_id。",
      "逐题核对题干、学生作答、订正、老师批改、标准答案或评分点是否归到同一个 question_id。",
      "缺少 crop_ref、题内 evidence 未绑定 region_id、题目边界不清、区域重叠或低置信题必须进入老师复核，不能支撑确定性正误判断。",
      "标注工具导出后必须先转成 annotation import，再生成双标、仲裁、脱敏的 gold package。"
    ]
  };
}

export function validateQuestionSegmentationReview(
  value: unknown,
  packet?: VisionEvidencePacket
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["question segmentation review must be an object"], warnings };
  }
  if (value.schema_version !== "student_learning_material_question_segmentation_review.v0.1") {
    errors.push("schema_version must be student_learning_material_question_segmentation_review.v0.1");
  }
  if (!readString(value.source_material_id)) errors.push("source_material_id is required");
  if (!readString(value.material_id)) errors.push("material_id is required");
  if (!readString(value.vision_packet_id)) errors.push("vision_packet_id is required");

  const questions = Array.isArray(value.questions) ? value.questions : [];
  if (!Array.isArray(value.questions)) errors.push("questions must be an array");
  if (isRecord(value.summary) && typeof value.summary.question_count === "number" && value.summary.question_count !== questions.length) {
    errors.push("summary.question_count must match questions length");
  }

  const serialized = JSON.stringify(value);
  if (serialized.includes("raw_ocr_text") || serialized.includes("normalized_text")) {
    errors.push("question segmentation review must not include raw OCR text fields");
  }

  if (packet) {
    validateNoPacketTextContentLeak(value, packet, errors);
    if (value.source_material_id !== packet.source_material_id) errors.push("source_material_id must match VisionEvidencePacket");
    if (value.material_id !== packet.material_id) errors.push("material_id must match VisionEvidencePacket");
    if (value.vision_packet_id !== packet.plugin_run_id) errors.push("vision_packet_id must match VisionEvidencePacket plugin_run_id");

    const packetQuestionIds = new Set(packet.questions.map((question) => question.question_id));
    const packetQuestionIdList = packet.questions.map((question) => question.question_id);
    const reviewQuestionIdList = questions.filter(isRecord).map((question) => readString(question.question_id)).filter((item): item is string => Boolean(item));
    const reviewQuestionIds = new Set(reviewQuestionIdList);
    packetQuestionIds.forEach((questionId) => {
      if (!reviewQuestionIds.has(questionId)) errors.push(`questions missing packet question_id=${questionId}`);
    });
    reviewQuestionIds.forEach((questionId) => {
      if (!packetQuestionIds.has(questionId)) errors.push(`review question_id=${questionId} missing from VisionEvidencePacket`);
    });
    if (reviewQuestionIdList.length === packetQuestionIdList.length && reviewQuestionIdList.join("|") !== packetQuestionIdList.join("|")) {
      errors.push(`questions order must match VisionEvidencePacket questions: expected ${packetQuestionIdList.join(", ")} but got ${reviewQuestionIdList.join(", ")}`);
    }
    validateReviewMatchesPacketDerivedSegmentation(value, packet, errors);
  }

  questions.forEach((question, index) => validateReviewQuestion(question, index, errors, warnings));
  return { ok: errors.length === 0, errors, warnings };
}

function validateReviewMatchesPacketDerivedSegmentation(value: Record<string, unknown>, packet: VisionEvidencePacket, errors: string[]) {
  const expected = buildQuestionSegmentationReview(packet, {
    generatedAt: readString(value.generated_at)
  });
  const summary = isRecord(value.summary) ? value.summary : {};
  for (const field of [
    "question_count",
    "pass_count",
    "needs_teacher_review_count",
    "blocked_count",
    "missing_crop_ref_count",
    "low_confidence_region_count",
    "orphan_evidence_count",
    "evidence_without_region_count"
  ] as const) {
    if (typeof summary[field] === "number" && summary[field] !== expected.summary[field]) {
      errors.push(`summary.${field} must match VisionEvidencePacket-derived segmentation review`);
    }
  }

  const reviewQuestions = Array.isArray(value.questions) ? value.questions.filter(isRecord) : [];
  const reviewByQuestionId = new Map(reviewQuestions.map((question) => [readString(question.question_id), question]));
  expected.questions.forEach((expectedQuestion, index) => {
    const actual = reviewByQuestionId.get(expectedQuestion.question_id);
    if (!actual) return;
    const prefix = `questions[${index}]`;
    if (actual.status !== expectedQuestion.status) errors.push(`${prefix}.status must match VisionEvidencePacket-derived segmentation review`);
    if (actual.review_required !== expectedQuestion.review_required) {
      errors.push(`${prefix}.review_required must match VisionEvidencePacket-derived segmentation review`);
    }
    if (actual.readiness_status !== expectedQuestion.readiness_status) {
      errors.push(`${prefix}.readiness_status must match VisionEvidencePacket-derived evidence readiness`);
    }
    if (actual.definitive_judgement_allowed !== expectedQuestion.definitive_judgement_allowed) {
      errors.push(`${prefix}.definitive_judgement_allowed must match VisionEvidencePacket-derived evidence readiness`);
    }
    if (joinStringArray(actual.issues) !== expectedQuestion.issues.join("|")) {
      errors.push(`${prefix}.issues must match VisionEvidencePacket-derived segmentation review`);
    }
    if (typeof actual.evidence_without_region_count === "number" && actual.evidence_without_region_count !== expectedQuestion.evidence_without_region_count) {
      errors.push(`${prefix}.evidence_without_region_count must match VisionEvidencePacket-derived segmentation review`);
    }
    validateReviewRegionsMatchExpected(actual.regions, expectedQuestion.regions, prefix, errors);
  });
}

function validateReviewRegionsMatchExpected(
  actualRegionsValue: unknown,
  expectedRegions: QuestionSegmentationReviewQuestion["regions"],
  prefix: string,
  errors: string[]
) {
  if (!Array.isArray(actualRegionsValue)) return;
  const actualRegions = actualRegionsValue.filter(isRecord);
  if (actualRegions.length !== expectedRegions.length) {
    errors.push(`${prefix}.regions length must match VisionEvidencePacket-derived segmentation review`);
  }
  const expectedByRegionId = new Map(expectedRegions.map((region) => [region.region_id, region]));
  actualRegions.forEach((actualRegion, regionIndex) => {
    const regionId = readString(actualRegion.region_id);
    const expectedRegion = regionId ? expectedByRegionId.get(regionId) : undefined;
    if (!expectedRegion) {
      errors.push(`${prefix}.regions[${regionIndex}].region_id must exist in VisionEvidencePacket-derived segmentation review`);
      return;
    }
    if (actualRegion.crop_ref !== expectedRegion.crop_ref) {
      errors.push(`${prefix}.regions[${regionIndex}].crop_ref must match VisionEvidencePacket-derived segmentation review`);
    }
    if (joinStringArray(actualRegion.issues) !== expectedRegion.issues.join("|")) {
      errors.push(`${prefix}.regions[${regionIndex}].issues must match VisionEvidencePacket-derived segmentation review`);
    }
  });
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
    errors.push(`question segmentation review must not include OCR/text content copied from VisionEvidencePacket evidence_ref=${evidenceRef}`);
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

function joinStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("|") : "";
}

function validateReviewQuestion(value: unknown, index: number, errors: string[], warnings: string[]) {
  const prefix = `questions[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!readString(value.question_id)) errors.push(`${prefix}.question_id is required`);
  if (value.status !== "pass" && value.status !== "needs_teacher_review" && value.status !== "blocked") {
    errors.push(`${prefix}.status must be pass, needs_teacher_review, or blocked`);
  }
  if (typeof value.review_required !== "boolean") errors.push(`${prefix}.review_required must be boolean`);
  if (!Array.isArray(value.issues)) errors.push(`${prefix}.issues must be an array`);
  const regions = Array.isArray(value.regions) ? value.regions : [];
  if (!Array.isArray(value.regions)) errors.push(`${prefix}.regions must be an array`);
  if (value.status === "pass" && Array.isArray(value.issues) && value.issues.length > 0) {
    errors.push(`${prefix}.status pass cannot have segmentation issues`);
  }
  if (value.status !== "pass" && value.review_required !== true) {
    errors.push(`${prefix}.review_required must be true when status is not pass`);
  }
  if (!regions.length && value.status !== "blocked") {
    warnings.push(`${prefix} has no regions; blocked status is expected`);
  }
}

function computeStatus(issues: QuestionSegmentationReviewIssue[]): QuestionSegmentationReviewStatus {
  if (issues.includes("question_region_missing") || issues.includes("orphan_evidence_question")) return "blocked";
  return issues.length ? "needs_teacher_review" : "pass";
}

function countEvidenceTypes(types: VisionEvidenceType[]) {
  return types.reduce<Partial<Record<VisionEvidenceType, number>>>((counts, type) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

function uniqueIssues(items: Array<QuestionSegmentationReviewIssue | undefined>) {
  return Array.from(new Set(items.filter((item): item is QuestionSegmentationReviewIssue => Boolean(item))));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
