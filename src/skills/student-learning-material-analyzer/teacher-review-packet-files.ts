import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StudentLearningMaterialDeliveryBundle } from "./delivery-bundle";
import {
  generateStudentLearningMaterialDeliveryBundleFile,
  type GenerateStudentLearningMaterialDeliveryBundleFileInput,
  type GenerateStudentLearningMaterialDeliveryBundleFileResult
} from "./delivery-bundle-files";
import {
  createStudentLearningMaterialTeacherReviewPacket,
  validateStudentLearningMaterialTeacherReviewPacket,
  type StudentLearningMaterialTeacherReviewPacket
} from "./teacher-review-packet";

export type GenerateStudentLearningMaterialTeacherReviewPacketFileInput = Omit<
  GenerateStudentLearningMaterialDeliveryBundleFileInput,
  "deliveryBundleOutputPath"
> & {
  deliveryBundleInputPath?: string;
  deliveryBundleOutputPath?: string;
  teacherReviewPacketOutputPath: string;
  skillRunId?: string;
  generatedAt?: string;
};

export type GenerateStudentLearningMaterialTeacherReviewPacketFileResult = {
  teacherReviewPacketOutputPath: string;
  sourceKind: "delivery_bundle" | GenerateStudentLearningMaterialDeliveryBundleFileResult["sourceKind"];
  deliveryBundleInputPath?: string;
  deliveryBundleOutputPath?: string;
  resultOutputPath?: string;
  analysisOutputPath?: string;
  skillRunId: string;
  displayStatus: StudentLearningMaterialTeacherReviewPacket["skill_card"]["status"]["display_status"];
  feedbackStatus: StudentLearningMaterialTeacherReviewPacket["skill_card"]["status"]["feedback_status"];
  archiveStatus: StudentLearningMaterialTeacherReviewPacket["skill_card"]["status"]["archive_status"];
  questionCount: number;
  reviewRequiredQuestionCount: number;
  parentFeedbackCopyable: boolean;
  actionCount: number;
};

export async function generateStudentLearningMaterialTeacherReviewPacketFile(
  input: GenerateStudentLearningMaterialTeacherReviewPacketFileInput
): Promise<GenerateStudentLearningMaterialTeacherReviewPacketFileResult> {
  const resolved = await resolveDeliveryBundleForTeacherReview(input);
  const packet = createStudentLearningMaterialTeacherReviewPacket({
    deliveryBundle: resolved.deliveryBundle,
    skillRunId: input.skillRunId,
    generatedAt: input.generatedAt
  });
  const validation = validateStudentLearningMaterialTeacherReviewPacket(packet, resolved.deliveryBundle);
  if (!validation.ok) {
    throw new Error(`Teacher review packet was not written because generated packet is invalid: ${validation.errors.join("；")}`);
  }
  await writeJsonFile(input.teacherReviewPacketOutputPath, packet);

  return {
    teacherReviewPacketOutputPath: input.teacherReviewPacketOutputPath,
    sourceKind: resolved.sourceKind,
    deliveryBundleInputPath: resolved.deliveryBundleInputPath,
    deliveryBundleOutputPath: resolved.deliveryBundleOutputPath,
    resultOutputPath: resolved.resultOutputPath,
    analysisOutputPath: resolved.analysisOutputPath,
    skillRunId: packet.skill_card.skill_run_id,
    displayStatus: packet.skill_card.status.display_status,
    feedbackStatus: packet.skill_card.status.feedback_status,
    archiveStatus: packet.skill_card.status.archive_status,
    questionCount: packet.teacher_review_summary.question_count,
    reviewRequiredQuestionCount: packet.teacher_review_summary.review_required_question_count,
    parentFeedbackCopyable: packet.teacher_review_summary.parent_feedback_copyable,
    actionCount: packet.review_actions.length
  };
}

export async function readStudentLearningMaterialTeacherReviewPacketFile(filePath: string): Promise<StudentLearningMaterialTeacherReviewPacket> {
  return readJsonFile<StudentLearningMaterialTeacherReviewPacket>(filePath);
}

async function resolveDeliveryBundleForTeacherReview(input: GenerateStudentLearningMaterialTeacherReviewPacketFileInput): Promise<{
  deliveryBundle: StudentLearningMaterialDeliveryBundle;
  sourceKind: GenerateStudentLearningMaterialTeacherReviewPacketFileResult["sourceKind"];
  deliveryBundleInputPath?: string;
  deliveryBundleOutputPath?: string;
  resultOutputPath?: string;
  analysisOutputPath?: string;
}> {
  if (input.deliveryBundleInputPath) {
    return {
      deliveryBundle: await readJsonFile<StudentLearningMaterialDeliveryBundle>(input.deliveryBundleInputPath),
      sourceKind: "delivery_bundle",
      deliveryBundleInputPath: input.deliveryBundleInputPath
    };
  }

  if (!input.deliveryBundleOutputPath) {
    throw new Error(
      "Set deliveryBundleInputPath, or set deliveryBundleOutputPath with one of resultInputPath, analysisInputPath, or visionPacketPath before generating a teacher review packet."
    );
  }

  const generated = await generateStudentLearningMaterialDeliveryBundleFile({
    resultInputPath: input.resultInputPath,
    analysisInputPath: input.analysisInputPath,
    visionPacketPath: input.visionPacketPath,
    resultOutputPath: input.resultOutputPath,
    analysisOutputPath: input.analysisOutputPath,
    deliveryBundleOutputPath: input.deliveryBundleOutputPath,
    monthlyReportInputPath: input.monthlyReportInputPath,
    answerKeysPath: input.answerKeysPath,
    rubricsPath: input.rubricsPath,
    knowledgePointsPath: input.knowledgePointsPath,
    studentProfileHistoryPath: input.studentProfileHistoryPath,
    analysisJobId: input.analysisJobId,
    materialId: input.materialId,
    studentId: input.studentId,
    teacherContext: input.teacherContext,
    allowDegraded: input.allowDegraded,
    allowInvalidAnalysis: input.allowInvalidAnalysis,
    model: input.model,
    feedbackSent: input.feedbackSent,
    archived: input.archived,
    generatedAt: input.generatedAt
  });

  return {
    deliveryBundle: await readJsonFile<StudentLearningMaterialDeliveryBundle>(generated.deliveryBundleOutputPath),
    sourceKind: generated.sourceKind,
    deliveryBundleOutputPath: generated.deliveryBundleOutputPath,
    resultOutputPath: generated.resultOutputPath,
    analysisOutputPath: generated.analysisOutputPath
  };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
