import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runAnalyzeLearningEvidence, type AnalyzeLearningEvidenceRunnerResult } from "./runner";
import {
  checkEvidenceCoverage,
  checkWechatFeedbackSafety,
  validateStudentLearningMaterialAnalysis
} from "./validators";
import {
  createStudentLearningMaterialUserFacingResult,
  validateStudentLearningMaterialUserFacingResult,
  type StudentLearningMaterialUserFacingResult
} from "./user-facing-result";
import type {
  LearningMaterialAnalysisModel,
  StudentLearningMaterialAnalysis,
  TrustedTeacherContext,
  VisionEvidencePacket
} from "./types";

export type GenerateStudentLearningMaterialUserFacingResultFileInput = {
  visionPacketPath: string;
  resultOutputPath: string;
  analysisOutputPath?: string;
  answerKeysPath?: string;
  rubricsPath?: string;
  knowledgePointsPath?: string;
  studentProfileHistoryPath?: string;
  analysisJobId?: string;
  materialId?: string;
  studentId?: string;
  teacherContext?: TrustedTeacherContext;
  allowDegraded?: boolean;
  model?: LearningMaterialAnalysisModel;
};

export type GenerateStudentLearningMaterialUserFacingResultFileResult = {
  status: AnalyzeLearningEvidenceRunnerResult["status"];
  analysisId: string;
  resultOutputPath: string;
  analysisOutputPath?: string;
  teacherReportStatus: StudentLearningMaterialUserFacingResult["teacher_report"]["status"];
  parentFeedbackStatus: StudentLearningMaterialUserFacingResult["parent_feedback"]["status"];
  monthlyMonth: string;
  validationErrors: string[];
  safetyWarnings: string[];
};

export type GenerateStudentLearningMaterialUserFacingResultFromAnalysisFileInput = {
  analysisInputPath: string;
  resultOutputPath: string;
  allowInvalid?: boolean;
};

export type GenerateStudentLearningMaterialUserFacingResultFromAnalysisFileResult = {
  analysisId: string;
  resultOutputPath: string;
  teacherReportStatus: StudentLearningMaterialUserFacingResult["teacher_report"]["status"];
  parentFeedbackStatus: StudentLearningMaterialUserFacingResult["parent_feedback"]["status"];
  monthlyMonth: string;
  validationErrors: string[];
  safetyWarnings: string[];
};

export async function generateStudentLearningMaterialUserFacingResultFile(
  input: GenerateStudentLearningMaterialUserFacingResultFileInput
): Promise<GenerateStudentLearningMaterialUserFacingResultFileResult> {
  const packet = await readJsonFile<VisionEvidencePacket>(input.visionPacketPath);
  const result = await runAnalyzeLearningEvidence({
    analysisJobId: input.analysisJobId || buildFileAnalysisJobId(input.visionPacketPath),
    materialId: input.materialId || packet.material_id,
    studentId: input.studentId || packet.student_id,
    teacherContext: input.teacherContext || buildTeacherContext(packet),
    visionEvidencePacket: packet,
    answerKeys: await readOptionalJsonArray(input.answerKeysPath),
    rubrics: await readOptionalJsonArray(input.rubricsPath),
    knowledgePoints: await readOptionalJsonArray(input.knowledgePointsPath),
    studentProfileHistory: await readOptionalJsonArray(input.studentProfileHistoryPath),
    model: input.model
  });

  if (result.status !== "draft_ready" && input.allowDegraded !== true) {
    throw new Error(
      [
        "StudentLearningMaterialUserFacingResult output was not written because the run did not reach draft_ready.",
        `status=${result.status}`,
        `validationErrors=${result.validationErrors.join("；") || "none"}`,
        `safetyWarnings=${result.safetyWarnings.join("；") || "none"}`
      ].join(" ")
    );
  }

  if (input.analysisOutputPath) {
    await writeJsonFile(input.analysisOutputPath, result.analysis);
  }

  const userFacingResult = await writeStudentLearningMaterialUserFacingResultFile({
    analysis: result.analysis,
    resultOutputPath: input.resultOutputPath,
    allowInvalid: true
  });

  return {
    status: result.status,
    analysisId: result.analysis.analysis_id,
    resultOutputPath: input.resultOutputPath,
    analysisOutputPath: input.analysisOutputPath,
    teacherReportStatus: userFacingResult.teacher_report.status,
    parentFeedbackStatus: userFacingResult.parent_feedback.status,
    monthlyMonth: userFacingResult.monthly_result.month,
    validationErrors: result.validationErrors,
    safetyWarnings: result.safetyWarnings
  };
}

export async function generateStudentLearningMaterialUserFacingResultFromAnalysisFile(
  input: GenerateStudentLearningMaterialUserFacingResultFromAnalysisFileInput
): Promise<GenerateStudentLearningMaterialUserFacingResultFromAnalysisFileResult> {
  const analysis = await readJsonFile<StudentLearningMaterialAnalysis>(input.analysisInputPath);
  const validation = collectStudentLearningMaterialAnalysisIssues(analysis);
  if (validation.validationErrors.length > 0 && input.allowInvalid !== true) {
    throw new Error(
      [
        "StudentLearningMaterialUserFacingResult output was not written because analysis JSON is invalid.",
        `validationErrors=${validation.validationErrors.join("；")}`
      ].join(" ")
    );
  }

  const userFacingResult = await writeStudentLearningMaterialUserFacingResultFile({
    analysis,
    resultOutputPath: input.resultOutputPath,
    allowInvalid: true
  });

  return {
    analysisId: analysis.analysis_id,
    resultOutputPath: input.resultOutputPath,
    teacherReportStatus: userFacingResult.teacher_report.status,
    parentFeedbackStatus: userFacingResult.parent_feedback.status,
    monthlyMonth: userFacingResult.monthly_result.month,
    validationErrors: validation.validationErrors,
    safetyWarnings: validation.safetyWarnings
  };
}

export async function readStudentLearningMaterialUserFacingResultFile(filePath: string): Promise<StudentLearningMaterialUserFacingResult> {
  return readJsonFile<StudentLearningMaterialUserFacingResult>(filePath);
}

async function writeStudentLearningMaterialUserFacingResultFile(input: {
  analysis: StudentLearningMaterialAnalysis;
  resultOutputPath: string;
  allowInvalid?: boolean;
}) {
  const validation = collectStudentLearningMaterialAnalysisIssues(input.analysis);
  if (validation.validationErrors.length > 0 && input.allowInvalid !== true) {
    throw new Error(`StudentLearningMaterialAnalysis is invalid: ${validation.validationErrors.join("；")}`);
  }

  const userFacingResult = createStudentLearningMaterialUserFacingResult(input.analysis);
  const resultValidation = validateStudentLearningMaterialUserFacingResult(userFacingResult, {
    analysis: input.analysis
  });
  if (!resultValidation.ok) {
    throw new Error(`StudentLearningMaterialUserFacingResult is invalid: ${resultValidation.errors.join("；")}`);
  }
  await writeJsonFile(input.resultOutputPath, userFacingResult);
  return userFacingResult;
}

function collectStudentLearningMaterialAnalysisIssues(analysis: StudentLearningMaterialAnalysis) {
  const validation = validateStudentLearningMaterialAnalysis(analysis);
  const coverage = checkEvidenceCoverage(analysis);
  const feedbackSafety = checkWechatFeedbackSafety(analysis.wechat_parent_feedback_draft);

  return {
    validationErrors: uniqueStrings([...validation.errors, ...coverage.errors, ...feedbackSafety.errors]),
    safetyWarnings: uniqueStrings([...validation.warnings, ...coverage.warnings, ...feedbackSafety.warnings])
  };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function readOptionalJsonArray(filePath: string | undefined): Promise<unknown[] | undefined> {
  if (!filePath) return undefined;
  const value = await readJsonFile<unknown>(filePath);
  return Array.isArray(value) ? value : [value];
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildFileAnalysisJobId(visionPacketPath: string) {
  return `user_result_${path.basename(visionPacketPath).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function buildTeacherContext(packet: VisionEvidencePacket): TrustedTeacherContext | undefined {
  if (!packet.teacher_id && !packet.tenant_id) return undefined;
  return {
    teacherId: packet.teacher_id || "server-derived-teacher-id-required",
    tenantId: packet.tenant_id
  };
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)));
}
