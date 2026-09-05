import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readQuestionSegmentationReviewFile
} from "./question-segmentation-review-files";
import { readVisionEvidencePacketFile } from "./vision-adapter-files";
import {
  buildVisionProviderTrialReport,
  validateVisionProviderTrialReport,
  type StudentLearningMaterialVisionProviderTrialReport,
  type VisionProviderTrialReadiness
} from "./vision-provider-trial-report";
import { validateVisionEvidencePacket } from "./validators";

export type GenerateVisionProviderTrialReportFileInput = {
  visionPacketPath: string;
  providerTrialReportOutputPath: string;
  segmentationReviewPath?: string;
  generatedAt?: string;
  requireReady?: boolean;
};

export type GenerateVisionProviderTrialReportFileResult = {
  providerTrialReportOutputPath: string;
  sourceMaterialId: string;
  materialId: string;
  visionPacketId: string;
  provider: string;
  readiness: VisionProviderTrialReadiness;
  questionCount: number;
  definitiveAllowedCount: number;
  blockers: string[];
  warnings: string[];
};

export async function generateVisionProviderTrialReportFile(
  input: GenerateVisionProviderTrialReportFileInput
): Promise<GenerateVisionProviderTrialReportFileResult> {
  const packet = await readVisionEvidencePacketFile(input.visionPacketPath);
  const packetValidation = validateVisionEvidencePacket(packet);
  if (!packetValidation.ok) {
    throw new Error(`Vision provider trial report was not written because VisionEvidencePacket is invalid: ${packetValidation.errors.join("；")}`);
  }

  const segmentationReview = input.segmentationReviewPath ? await readQuestionSegmentationReviewFile(input.segmentationReviewPath) : undefined;
  const report = buildVisionProviderTrialReport(packet, {
    segmentationReview,
    generatedAt: input.generatedAt
  });
  const validation = validateVisionProviderTrialReport(report, packet, segmentationReview);
  if (!validation.ok) {
    throw new Error(`Vision provider trial report was not written because generated report is invalid: ${validation.errors.join("；")}`);
  }
  if (input.requireReady && report.readiness !== "ready_for_human_labeling") {
    throw new Error(`Vision provider trial report was not written because readiness=${report.readiness}: ${[...report.blockers, ...report.warnings].join("；")}`);
  }

  await writeJsonFile(input.providerTrialReportOutputPath, report);
  return {
    providerTrialReportOutputPath: input.providerTrialReportOutputPath,
    sourceMaterialId: report.source_material_id,
    materialId: report.material_id,
    visionPacketId: report.vision_packet_id,
    provider: report.plugin_provider,
    readiness: report.readiness,
    questionCount: report.summary.question_count,
    definitiveAllowedCount: report.summary.definitive_allowed_count,
    blockers: report.blockers,
    warnings: report.warnings
  };
}

export async function readVisionProviderTrialReportFile(filePath: string): Promise<StudentLearningMaterialVisionProviderTrialReport> {
  return readJsonFile<StudentLearningMaterialVisionProviderTrialReport>(filePath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
