import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildGoldLabelAnnotationTask,
  validateGoldLabelAnnotationTask,
  type GoldLabelAnnotationTaskTargetTool,
  type StudentLearningMaterialGoldLabelAnnotationTask
} from "./gold-label-annotation-task";
import {
  validateQuestionSegmentationReview,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import type { VisionEvidencePacket } from "./types";
import { validateVisionEvidencePacket } from "./validators";

export type GenerateGoldLabelAnnotationTaskFileInput = {
  visionPacketPath: string;
  questionSegmentationReviewPath?: string;
  annotationTaskOutputPath: string;
  caseId?: string;
  generatedAt?: string;
  targetTool?: GoldLabelAnnotationTaskTargetTool;
  reviewerIds?: [string, string];
  reviewerRoles?: [string, string];
};

export type GenerateGoldLabelAnnotationTaskFileResult = {
  annotationTaskOutputPath: string;
  caseId: string;
  sourceMaterialId: string;
  visionPacketId: string;
  materialId: string;
  targetTool: GoldLabelAnnotationTaskTargetTool;
  questionSegmentationReviewPath?: string;
  questionCount: number;
  passCount: number;
  needsTeacherReviewCount: number;
  blockedCount: number;
  annotationImportSkeletonLabelCount: number;
  rawTextExcluded: true;
  claimable99Correctness: false;
  validationWarnings: string[];
};

export async function generateGoldLabelAnnotationTaskFile(
  input: GenerateGoldLabelAnnotationTaskFileInput
): Promise<GenerateGoldLabelAnnotationTaskFileResult> {
  const packet = await readJsonFile<VisionEvidencePacket>(input.visionPacketPath);
  const packetValidation = validateVisionEvidencePacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`Gold label annotation task was not written because VisionEvidencePacket is invalid: ${packetValidation.errors.join("；")}`);
  }

  const questionSegmentationReview = input.questionSegmentationReviewPath
    ? await readJsonFile<StudentLearningMaterialQuestionSegmentationReview>(input.questionSegmentationReviewPath)
    : undefined;
  if (questionSegmentationReview) {
    const segmentationValidation = validateQuestionSegmentationReview(questionSegmentationReview, packet);
    if (!segmentationValidation.ok) {
      throw new Error(`Gold label annotation task was not written because question segmentation review is invalid: ${segmentationValidation.errors.join("；")}`);
    }
  }

  const task = buildGoldLabelAnnotationTask(packet, {
    caseId: input.caseId,
    generatedAt: input.generatedAt,
    targetTool: input.targetTool,
    reviewerIds: input.reviewerIds,
    reviewerRoles: input.reviewerRoles,
    questionSegmentationReview
  });
  const validation = validateGoldLabelAnnotationTask(task, packet);
  if (!validation.ok) {
    throw new Error(`Gold label annotation task was not written because generated task is invalid: ${validation.errors.join("；")}`);
  }

  await writeJsonFile(input.annotationTaskOutputPath, task);
  return {
    annotationTaskOutputPath: input.annotationTaskOutputPath,
    caseId: task.case_id,
    sourceMaterialId: task.source_material_id,
    visionPacketId: task.vision_packet_id,
    materialId: task.material_id,
    targetTool: task.target_tool,
    questionSegmentationReviewPath: input.questionSegmentationReviewPath,
    questionCount: task.questions.length,
    passCount: task.questions.filter((question) => question.segmentation_status === "pass").length,
    needsTeacherReviewCount: task.questions.filter((question) => question.segmentation_status === "needs_teacher_review").length,
    blockedCount: task.questions.filter((question) => question.segmentation_status === "blocked").length,
    annotationImportSkeletonLabelCount: task.annotation_import_skeleton.labels.length,
    rawTextExcluded: true,
    claimable99Correctness: false,
    validationWarnings: [...packetValidation.warnings, ...validation.warnings]
  };
}

export async function readGoldLabelAnnotationTaskFile(filePath: string): Promise<StudentLearningMaterialGoldLabelAnnotationTask> {
  return readJsonFile<StudentLearningMaterialGoldLabelAnnotationTask>(filePath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
