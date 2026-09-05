import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createGoldLabelPackageFromAnnotationImport,
  type StudentLearningMaterialGoldLabelAnnotationImport
} from "./gold-label-annotation-import";
import type { StudentLearningMaterialGoldLabelPackage } from "./gold-labeling";
import { buildQuestionEvidenceReadiness } from "./question-evidence-readiness";
import type { StudentLearningMaterialQuestionSegmentationReview } from "./question-segmentation-review";
import type { VisionEvidencePacket } from "./types";
import { validateVisionEvidencePacket } from "./validators";

export type GenerateGoldLabelPackageFromAnnotationImportFileInput = {
  annotationImportPath: string;
  visionPacketPath: string;
  questionSegmentationReviewPath?: string;
  answerKeysPath?: string;
  rubricsPath?: string;
  goldLabelPackageOutputPath: string;
  allowIncomplete?: boolean;
};

export type GenerateGoldLabelPackageFromAnnotationImportFileResult = {
  annotationImportPath: string;
  visionPacketPath: string;
  questionSegmentationReviewPath?: string;
  answerKeysPath?: string;
  rubricsPath?: string;
  goldLabelPackageOutputPath: string;
  packageId: string;
  caseId: string;
  sourceMaterialId: string;
  visionPacketId: string;
  materialId: string;
  labelCount: number;
  questionCount: number;
  claimable99Correctness: boolean;
  validationErrors: string[];
  validationWarnings: string[];
};

export async function generateGoldLabelPackageFromAnnotationImportFile(
  input: GenerateGoldLabelPackageFromAnnotationImportFileInput
): Promise<GenerateGoldLabelPackageFromAnnotationImportFileResult> {
  const packet = await readJsonFile<VisionEvidencePacket>(input.visionPacketPath);
  const packetValidation = validateVisionEvidencePacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`Gold label package was not written because VisionEvidencePacket is invalid: ${packetValidation.errors.join("；")}`);
  }

  const annotationImport = await readJsonFile<StudentLearningMaterialGoldLabelAnnotationImport>(input.annotationImportPath);
  const questionSegmentationReview = input.questionSegmentationReviewPath
    ? await readJsonFile<StudentLearningMaterialQuestionSegmentationReview>(input.questionSegmentationReviewPath)
    : undefined;
  const answerKeys = await readOptionalJsonArray(input.answerKeysPath);
  const rubrics = await readOptionalJsonArray(input.rubricsPath);
  const conversion = createGoldLabelPackageFromAnnotationImport(annotationImport, packet, {
    requireAdjudication: !input.allowIncomplete,
    questionSegmentationReview,
    allowedExternalEvidenceRefsByQuestionId: buildExternalSideInputRefsByQuestionId(packet, { answerKeys, rubrics })
  });
  if (!conversion.ok) {
    throw new Error(`Gold label package was not written because annotation import is invalid: ${conversion.errors.join("；")}`);
  }

  if (!input.allowIncomplete && !conversion.validation.ok) {
    throw new Error(`Gold label package was not written because final package is not claimable: ${conversion.validation.errors.join("；")}`);
  }

  const claimable99Correctness = !input.allowIncomplete && conversion.validation.ok;
  await writeJsonFile(input.goldLabelPackageOutputPath, conversion.package);
  return {
    annotationImportPath: input.annotationImportPath,
    visionPacketPath: input.visionPacketPath,
    questionSegmentationReviewPath: input.questionSegmentationReviewPath,
    answerKeysPath: input.answerKeysPath,
    rubricsPath: input.rubricsPath,
    goldLabelPackageOutputPath: input.goldLabelPackageOutputPath,
    packageId: conversion.package.package_id,
    caseId: conversion.package.case_id,
    sourceMaterialId: conversion.package.source_material_id,
    visionPacketId: conversion.package.vision_packet_id || packet.plugin_run_id,
    materialId: conversion.package.material_id || packet.material_id,
    labelCount: conversion.package.labels.length,
    questionCount: conversion.package.adjudicated_gold?.questions.length ?? conversion.package.labels[0]?.gold.questions.length ?? 0,
    claimable99Correctness,
    validationErrors: conversion.validation.errors,
    validationWarnings: [...conversion.warnings, ...conversion.validation.warnings]
  };
}

export async function readGoldLabelPackageFromAnnotationImportFile(filePath: string): Promise<StudentLearningMaterialGoldLabelPackage> {
  return readJsonFile<StudentLearningMaterialGoldLabelPackage>(filePath);
}

function buildExternalSideInputRefsByQuestionId(
  packet: VisionEvidencePacket,
  sideInputs: { answerKeys?: unknown[]; rubrics?: unknown[] }
) {
  if (!sideInputs.answerKeys?.length && !sideInputs.rubrics?.length) return undefined;
  const readiness = buildQuestionEvidenceReadiness(packet, sideInputs);
  return new Map(readiness.questions.map((question) => [question.question_id, question.evidenceRefs.filter((ref) => ref.startsWith("side_input."))]));
}

async function readOptionalJsonArray(filePath: string | undefined) {
  if (!filePath) return undefined;
  const value = await readJsonFile<unknown>(filePath);
  return Array.isArray(value) ? value : [value];
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
