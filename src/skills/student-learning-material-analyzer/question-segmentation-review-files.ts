import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildQuestionSegmentationReview,
  validateQuestionSegmentationReview,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import type { VisionEvidencePacket } from "./types";
import { validateVisionEvidencePacket } from "./validators";

export type GenerateQuestionSegmentationReviewFileInput = {
  visionPacketPath: string;
  segmentationReviewOutputPath: string;
  generatedAt?: string;
};

export type GenerateQuestionSegmentationReviewFileResult = {
  segmentationReviewOutputPath: string;
  sourceMaterialId: string;
  materialId: string;
  visionPacketId: string;
  questionCount: number;
  passCount: number;
  needsTeacherReviewCount: number;
  blockedCount: number;
  missingCropRefCount: number;
  orphanEvidenceCount: number;
  validationErrors: string[];
  validationWarnings: string[];
};

export async function generateQuestionSegmentationReviewFile(
  input: GenerateQuestionSegmentationReviewFileInput
): Promise<GenerateQuestionSegmentationReviewFileResult> {
  const packet = await readJsonFile<VisionEvidencePacket>(input.visionPacketPath);
  const packetValidation = validateVisionEvidencePacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`Question segmentation review was not written because VisionEvidencePacket is invalid: ${packetValidation.errors.join("；")}`);
  }

  const review = buildQuestionSegmentationReview(packet, {
    generatedAt: input.generatedAt
  });
  const validation = validateQuestionSegmentationReview(review, packet);
  if (!validation.ok) {
    throw new Error(`Question segmentation review was not written because generated review is invalid: ${validation.errors.join("；")}`);
  }
  await writeJsonFile(input.segmentationReviewOutputPath, review);

  return {
    segmentationReviewOutputPath: input.segmentationReviewOutputPath,
    sourceMaterialId: review.source_material_id,
    materialId: review.material_id,
    visionPacketId: review.vision_packet_id,
    questionCount: review.summary.question_count,
    passCount: review.summary.pass_count,
    needsTeacherReviewCount: review.summary.needs_teacher_review_count,
    blockedCount: review.summary.blocked_count,
    missingCropRefCount: review.summary.missing_crop_ref_count,
    orphanEvidenceCount: review.summary.orphan_evidence_count,
    validationErrors: validation.errors,
    validationWarnings: [...packetValidation.warnings, ...validation.warnings]
  };
}

export async function readQuestionSegmentationReviewFile(filePath: string): Promise<StudentLearningMaterialQuestionSegmentationReview> {
  return readJsonFile<StudentLearningMaterialQuestionSegmentationReview>(filePath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
