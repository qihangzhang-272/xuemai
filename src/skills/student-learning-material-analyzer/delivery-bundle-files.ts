import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StudentMonthlyReport } from "../monthly-report";
import {
  createStudentLearningMaterialDeliveryBundle,
  validateStudentLearningMaterialDeliveryBundle,
  type StudentLearningMaterialDeliveryBundle
} from "./delivery-bundle";
import {
  generateStudentLearningMaterialUserFacingResultFile,
  generateStudentLearningMaterialUserFacingResultFromAnalysisFile
} from "./result-files";
import type { LearningMaterialAnalysisModel, TrustedTeacherContext } from "./types";
import type { StudentLearningMaterialUserFacingResult } from "./user-facing-result";

export type GenerateStudentLearningMaterialDeliveryBundleFileInput = {
  resultInputPath?: string;
  analysisInputPath?: string;
  visionPacketPath?: string;
  resultOutputPath?: string;
  analysisOutputPath?: string;
  deliveryBundleOutputPath: string;
  monthlyReportInputPath?: string;
  answerKeysPath?: string;
  rubricsPath?: string;
  knowledgePointsPath?: string;
  studentProfileHistoryPath?: string;
  analysisJobId?: string;
  materialId?: string;
  studentId?: string;
  teacherContext?: TrustedTeacherContext;
  allowDegraded?: boolean;
  allowInvalidAnalysis?: boolean;
  model?: LearningMaterialAnalysisModel;
  feedbackSent?: boolean;
  archived?: boolean;
  generatedAt?: string;
};

export type GenerateStudentLearningMaterialDeliveryBundleFileResult = {
  deliveryBundleOutputPath: string;
  analysisId: string;
  displayStatus: StudentLearningMaterialDeliveryBundle["status"]["display_status"];
  feedbackStatus: StudentLearningMaterialDeliveryBundle["status"]["feedback_status"];
  archiveStatus: StudentLearningMaterialDeliveryBundle["status"]["archive_status"];
  parentFeedbackCopyable: boolean;
  questionCount: number;
  hasMonthlyReportArtifact: boolean;
  sourceKind: "result" | "analysis" | "vision_packet";
  resultOutputPath?: string;
  analysisOutputPath?: string;
};

export async function generateStudentLearningMaterialDeliveryBundleFile(
  input: GenerateStudentLearningMaterialDeliveryBundleFileInput
): Promise<GenerateStudentLearningMaterialDeliveryBundleFileResult> {
  const resolved = await resolveUserFacingResult(input);
  const monthlyReport = input.monthlyReportInputPath ? await readJsonFile<StudentMonthlyReport>(input.monthlyReportInputPath) : undefined;
  const bundle = createStudentLearningMaterialDeliveryBundle({
    result: resolved.result,
    monthlyReport,
    feedbackSent: input.feedbackSent,
    archived: input.archived,
    generatedAt: input.generatedAt
  });
  const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
    result: resolved.result,
    monthlyReport
  });
  if (!validation.ok) {
    throw new Error(`Delivery bundle was not written because generated bundle is invalid: ${validation.errors.join("；")}`);
  }
  await writeJsonFile(input.deliveryBundleOutputPath, bundle);

  return {
    deliveryBundleOutputPath: input.deliveryBundleOutputPath,
    analysisId: bundle.analysis_id,
    displayStatus: bundle.status.display_status,
    feedbackStatus: bundle.status.feedback_status,
    archiveStatus: bundle.status.archive_status,
    parentFeedbackCopyable: bundle.teacher_delivery.parent_feedback_copyable,
    questionCount: bundle.teacher_delivery.question_rows.length,
    hasMonthlyReportArtifact: Boolean(monthlyReport),
    sourceKind: resolved.sourceKind,
    resultOutputPath: resolved.resultOutputPath,
    analysisOutputPath: resolved.analysisOutputPath
  };
}

export async function readStudentLearningMaterialDeliveryBundleFile(filePath: string): Promise<StudentLearningMaterialDeliveryBundle> {
  return readJsonFile<StudentLearningMaterialDeliveryBundle>(filePath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function resolveUserFacingResult(input: GenerateStudentLearningMaterialDeliveryBundleFileInput): Promise<{
  result: StudentLearningMaterialUserFacingResult;
  sourceKind: GenerateStudentLearningMaterialDeliveryBundleFileResult["sourceKind"];
  resultOutputPath?: string;
  analysisOutputPath?: string;
}> {
  if (input.resultInputPath) {
    return {
      result: await readJsonFile<StudentLearningMaterialUserFacingResult>(input.resultInputPath),
      sourceKind: "result",
      resultOutputPath: input.resultInputPath
    };
  }

  const generatedResultPath = input.resultOutputPath || buildSiblingPath(input.deliveryBundleOutputPath, "result");
  if (input.analysisInputPath) {
    const generated = await generateStudentLearningMaterialUserFacingResultFromAnalysisFile({
      analysisInputPath: input.analysisInputPath,
      resultOutputPath: generatedResultPath,
      allowInvalid: input.allowInvalidAnalysis
    });
    return {
      result: await readJsonFile<StudentLearningMaterialUserFacingResult>(generated.resultOutputPath),
      sourceKind: "analysis",
      resultOutputPath: generated.resultOutputPath
    };
  }

  if (input.visionPacketPath) {
    const generated = await generateStudentLearningMaterialUserFacingResultFile({
      visionPacketPath: input.visionPacketPath,
      resultOutputPath: generatedResultPath,
      analysisOutputPath: input.analysisOutputPath,
      answerKeysPath: input.answerKeysPath,
      rubricsPath: input.rubricsPath,
      knowledgePointsPath: input.knowledgePointsPath,
      studentProfileHistoryPath: input.studentProfileHistoryPath,
      analysisJobId: input.analysisJobId,
      materialId: input.materialId,
      studentId: input.studentId,
      teacherContext: input.teacherContext,
      allowDegraded: input.allowDegraded,
      model: input.model
    });
    return {
      result: await readJsonFile<StudentLearningMaterialUserFacingResult>(generated.resultOutputPath),
      sourceKind: "vision_packet",
      resultOutputPath: generated.resultOutputPath,
      analysisOutputPath: generated.analysisOutputPath
    };
  }

  throw new Error("Set resultInputPath, analysisInputPath, or visionPacketPath before generating a delivery bundle.");
}

function buildSiblingPath(outputPath: string, suffix: string) {
  const parsed = path.parse(outputPath);
  return path.join(parsed.dir, `${parsed.name}.${suffix}.json`);
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
