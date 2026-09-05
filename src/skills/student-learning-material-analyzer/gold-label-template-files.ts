import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createGoldLabelPackageTemplateFromVisionPacket,
  validateStudentLearningMaterialGoldLabelPackage,
  type StudentLearningMaterialGoldLabelPackage
} from "./gold-labeling";
import {
  validateQuestionSegmentationReview,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import type { VisionEvidencePacket } from "./types";
import { validateVisionEvidencePacket } from "./validators";

export type GenerateGoldLabelPackageTemplateFileInput = {
  visionPacketPath: string;
  questionSegmentationReviewPath?: string;
  goldLabelTemplateOutputPath: string;
  packageId?: string;
  caseId?: string;
  reviewerIds?: [string, string];
  reviewerRoles?: [string, string];
  labeledAt?: string;
};

export type GenerateGoldLabelPackageTemplateFileResult = {
  goldLabelTemplateOutputPath: string;
  packageId: string;
  caseId: string;
  sourceMaterialId: string;
  visionPacketId: string;
  materialId: string;
  questionSegmentationReviewPath?: string;
  segmentationReviewQuestionCount?: number;
  segmentationReviewPassCount?: number;
  segmentationReviewNeedsTeacherReviewCount?: number;
  questionCount: number;
  reviewerIds: [string, string];
  readyForHumanLabeling: true;
  claimable99Correctness: false;
  draftValidationErrors: string[];
  draftValidationWarnings: string[];
};

export async function generateGoldLabelPackageTemplateFile(
  input: GenerateGoldLabelPackageTemplateFileInput
): Promise<GenerateGoldLabelPackageTemplateFileResult> {
  const packet = await readJsonFile<VisionEvidencePacket>(input.visionPacketPath);
  const packetValidation = validateVisionEvidencePacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`Gold label package template was not written because VisionEvidencePacket is invalid: ${packetValidation.errors.join("；")}`);
  }

  const questionSegmentationReview = input.questionSegmentationReviewPath
    ? await readJsonFile<StudentLearningMaterialQuestionSegmentationReview>(input.questionSegmentationReviewPath)
    : undefined;
  if (questionSegmentationReview) {
    const segmentationReviewValidation = validateQuestionSegmentationReview(questionSegmentationReview, packet);
    if (!segmentationReviewValidation.ok) {
      throw new Error(`Gold label package template was not written because question segmentation review is invalid: ${segmentationReviewValidation.errors.join("；")}`);
    }
  }

  const template = createGoldLabelPackageTemplateFromVisionPacket(packet, {
    packageId: input.packageId,
    caseId: input.caseId,
    reviewerIds: input.reviewerIds,
    reviewerRoles: input.reviewerRoles,
    labeledAt: input.labeledAt,
    questionSegmentationReview
  });

  await writeJsonFile(input.goldLabelTemplateOutputPath, template);
  const draftValidation = validateStudentLearningMaterialGoldLabelPackage(template, {
    requireAdjudication: false
  });

  return {
    goldLabelTemplateOutputPath: input.goldLabelTemplateOutputPath,
    packageId: template.package_id,
    caseId: template.case_id,
    sourceMaterialId: template.source_material_id,
    visionPacketId: template.vision_packet_id || packet.plugin_run_id,
    materialId: template.material_id || packet.material_id,
    questionSegmentationReviewPath: input.questionSegmentationReviewPath,
    segmentationReviewQuestionCount: questionSegmentationReview?.summary.question_count,
    segmentationReviewPassCount: questionSegmentationReview?.summary.pass_count,
    segmentationReviewNeedsTeacherReviewCount: questionSegmentationReview?.summary.needs_teacher_review_count,
    questionCount: template.labels[0]?.gold.questions.length ?? 0,
    reviewerIds: [template.labels[0]?.reviewer_id || "reviewer_a", template.labels[1]?.reviewer_id || "reviewer_b"],
    readyForHumanLabeling: true,
    claimable99Correctness: false,
    draftValidationErrors: draftValidation.errors,
    draftValidationWarnings: draftValidation.warnings
  };
}

export async function readGoldLabelPackageTemplateFile(filePath: string): Promise<StudentLearningMaterialGoldLabelPackage> {
  return readJsonFile<StudentLearningMaterialGoldLabelPackage>(filePath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
