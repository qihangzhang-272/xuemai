import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runAnalyzeLearningEvidence, type AnalyzeLearningEvidenceRunnerResult } from "./runner";
import type {
  LearningMaterialAnalysisModel,
  StudentLearningMaterialAnalysis,
  TrustedTeacherContext,
  VisionEvidencePacket
} from "./types";

export type GenerateStudentLearningMaterialAnalysisOutputFileInput = {
  visionPacketPath: string;
  analysisOutputPath: string;
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

export type GenerateStudentLearningMaterialAnalysisOutputFileResult = {
  status: AnalyzeLearningEvidenceRunnerResult["status"];
  analysisId: string;
  analysisOutputPath: string;
  validationErrors: string[];
  safetyWarnings: string[];
};

export async function generateStudentLearningMaterialAnalysisOutputFile(
  input: GenerateStudentLearningMaterialAnalysisOutputFileInput
): Promise<GenerateStudentLearningMaterialAnalysisOutputFileResult> {
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
        "StudentLearningMaterialAnalysis output was not written because the run did not reach draft_ready.",
        `status=${result.status}`,
        `validationErrors=${result.validationErrors.join("；") || "none"}`,
        `safetyWarnings=${result.safetyWarnings.join("；") || "none"}`
      ].join(" ")
    );
  }

  await mkdir(path.dirname(input.analysisOutputPath), { recursive: true });
  await writeFile(input.analysisOutputPath, `${JSON.stringify(result.analysis, null, 2)}\n`, "utf8");

  return {
    status: result.status,
    analysisId: result.analysis.analysis_id,
    analysisOutputPath: input.analysisOutputPath,
    validationErrors: result.validationErrors,
    safetyWarnings: result.safetyWarnings
  };
}

export async function readStudentLearningMaterialAnalysisOutputFile(filePath: string): Promise<StudentLearningMaterialAnalysis> {
  return readJsonFile<StudentLearningMaterialAnalysis>(filePath);
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

function buildFileAnalysisJobId(visionPacketPath: string) {
  return `file_output_${path.basename(visionPacketPath).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function buildTeacherContext(packet: VisionEvidencePacket): TrustedTeacherContext | undefined {
  if (!packet.teacher_id && !packet.tenant_id) return undefined;
  return {
    teacherId: packet.teacher_id || "server-derived-teacher-id-required",
    tenantId: packet.tenant_id
  };
}
