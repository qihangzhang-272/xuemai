import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildGoldLabelReviewReport,
  validateGoldLabelReviewReport,
  type StudentLearningMaterialGoldLabelReviewReport
} from "./gold-label-review-report";
import type { StudentLearningMaterialGoldLabelPackage } from "./gold-labeling";
import { buildQuestionEvidenceReadiness } from "./question-evidence-readiness";
import type { VisionEvidencePacket } from "./types";
import { validateVisionEvidencePacket } from "./validators";

export type GenerateGoldLabelReviewReportFileInput = {
  goldLabelPackagePath: string;
  goldLabelReviewReportOutputPath: string;
  visionPacketPath?: string;
  answerKeysPath?: string;
  rubricsPath?: string;
  generatedAt?: string;
  allowIncomplete?: boolean;
};

export type GenerateGoldLabelReviewReportFileResult = {
  goldLabelPackagePath: string;
  goldLabelReviewReportOutputPath: string;
  visionPacketPath?: string;
  answerKeysPath?: string;
  rubricsPath?: string;
  packageId: string;
  caseId: string;
  labelCount: number;
  reviewerCount: number;
  questionCount: number;
  disagreementCount: number;
  agreementRate: number;
  adjudicationStatus: StudentLearningMaterialGoldLabelReviewReport["adjudication_status"];
  readyFor99Evaluation: boolean;
  blockers: string[];
  warnings: string[];
};

export async function generateGoldLabelReviewReportFile(
  input: GenerateGoldLabelReviewReportFileInput
): Promise<GenerateGoldLabelReviewReportFileResult> {
  const packageValue = await readJsonFile<StudentLearningMaterialGoldLabelPackage>(input.goldLabelPackagePath);
  const packet = input.visionPacketPath ? await readJsonFile<VisionEvidencePacket>(input.visionPacketPath) : undefined;
  const answerKeys = await readOptionalJsonArray(input.answerKeysPath);
  const rubrics = await readOptionalJsonArray(input.rubricsPath);
  if (packet) {
    const packetValidation = validateVisionEvidencePacket(packet);
    if (!packetValidation.ok) {
      throw new Error(`Gold label review report was not written because VisionEvidencePacket is invalid: ${packetValidation.errors.join("；")}`);
    }
  }

  const report = buildGoldLabelReviewReport(packageValue, {
    generatedAt: input.generatedAt,
    sourcePacket: packet,
    allowedExternalEvidenceRefsByQuestionId: packet ? buildExternalSideInputRefsByQuestionId(packet, { answerKeys, rubrics }) : undefined
  });
  const validation = validateGoldLabelReviewReport(report, packageValue, packet, {
    allowedExternalEvidenceRefsByQuestionId: packet ? buildExternalSideInputRefsByQuestionId(packet, { answerKeys, rubrics }) : undefined
  });
  if (!validation.ok) {
    throw new Error(`Gold label review report was not written because report is invalid: ${validation.errors.join("；")}`);
  }
  if (!input.allowIncomplete && !report.readiness.ready_for_99_evaluation) {
    throw new Error(`Gold label review report was not written because human review is not 99%-ready: ${report.readiness.blockers.join("；")}`);
  }

  await writeJsonFile(input.goldLabelReviewReportOutputPath, report);
  return {
    goldLabelPackagePath: input.goldLabelPackagePath,
    goldLabelReviewReportOutputPath: input.goldLabelReviewReportOutputPath,
    visionPacketPath: input.visionPacketPath,
    answerKeysPath: input.answerKeysPath,
    rubricsPath: input.rubricsPath,
    packageId: report.package_id,
    caseId: report.case_id,
    labelCount: report.label_count,
    reviewerCount: report.reviewer_count,
    questionCount: report.question_count,
    disagreementCount: report.agreement.disagreement_count,
    agreementRate: report.agreement.agreement_rate,
    adjudicationStatus: report.adjudication_status,
    readyFor99Evaluation: report.readiness.ready_for_99_evaluation,
    blockers: report.readiness.blockers,
    warnings: report.readiness.warnings
  };
}

export async function readGoldLabelReviewReportFile(filePath: string): Promise<StudentLearningMaterialGoldLabelReviewReport> {
  return readJsonFile<StudentLearningMaterialGoldLabelReviewReport>(filePath);
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
