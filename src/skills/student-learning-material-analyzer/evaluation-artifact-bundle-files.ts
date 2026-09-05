import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  validateStudentLearningMaterialEvaluationAssetManifestFromFile,
  type StudentLearningMaterialEvaluationAssetManifest,
  type StudentLearningMaterialEvaluationAssetManifestCase
} from "./evaluation-assets";
import { generateStudentLearningMaterialDeliveryBundleFile } from "./delivery-bundle-files";
import { createConfirmedMonthlyReportSnapshotCopy } from "./monthly-snapshot-archive";
import { generateGoldLabelAnnotationTaskFile } from "./gold-label-annotation-task-files";
import { generateGoldLabelReviewReportFile } from "./gold-label-review-report-files";
import { generateQuestionSegmentationReviewFile } from "./question-segmentation-review-files";
import { generateStudentLearningMaterialUserFacingResultFromAnalysisFile } from "./result-files";
import { generateStudentLearningMaterialTeacherReviewPacketFile } from "./teacher-review-packet-files";
import { generateVisionProviderTrialReportFile } from "./vision-provider-trial-report-files";
import type { StudentLearningMaterialAnalysis } from "./types";
import {
  generateStudentMonthlyReportFile,
  type StudentMonthlyReportFileInput
} from "../monthly-report-files";

export type GenerateStudentLearningMaterialEvaluationArtifactBundleInput = {
  manifestInputPath: string;
  manifestOutputPath: string;
  artifactOutputDir?: string;
  generateProviderTrialReports?: boolean;
  generateQuestionSegmentationReviews?: boolean;
  generateAnnotationTasks?: boolean;
  generateGoldLabelReviewReports?: boolean;
  generateUserResults?: boolean;
  generateDeliveryBundles?: boolean;
  generateTeacherReviewPackets?: boolean;
  generateMonthlyReports?: boolean;
  overwriteExisting?: boolean;
  monthlyReport?: {
    teacherId: string;
    confirmedAt: string;
    studentName?: string;
    previousMonth?: string;
    previousMonthLabel?: string;
  };
};

export type GenerateStudentLearningMaterialEvaluationArtifactBundleResult = {
  manifestOutputPath: string;
  caseCount: number;
  generatedProviderTrialReportCount: number;
  generatedQuestionSegmentationReviewCount: number;
  generatedAnnotationTaskCount: number;
  generatedGoldLabelReviewReportCount: number;
  generatedUserResultCount: number;
  generatedMonthlyReportCount: number;
  generatedDeliveryBundleCount: number;
  generatedTeacherReviewPacketCount: number;
  skippedProviderTrialReportCount: number;
  skippedQuestionSegmentationReviewCount: number;
  skippedAnnotationTaskCount: number;
  skippedGoldLabelReviewReportCount: number;
  skippedUserResultCount: number;
  skippedMonthlyReportCount: number;
  skippedDeliveryBundleCount: number;
  skippedTeacherReviewPacketCount: number;
  validationOk: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  validationReport: string;
};

export async function generateStudentLearningMaterialEvaluationArtifactBundle(
  input: GenerateStudentLearningMaterialEvaluationArtifactBundleInput
): Promise<GenerateStudentLearningMaterialEvaluationArtifactBundleResult> {
  const inputManifestPath = path.resolve(input.manifestInputPath);
  const outputManifestPath = path.resolve(input.manifestOutputPath);
  const inputBaseDir = path.dirname(inputManifestPath);
  const outputBaseDir = path.dirname(outputManifestPath);
  const artifactBaseDir = input.artifactOutputDir
    ? path.resolve(input.artifactOutputDir)
    : path.join(outputBaseDir, "generated-artifacts");
  const generateUserResults = input.generateUserResults !== false;
  const generateProviderTrialReports = input.generateProviderTrialReports !== false;
  const generateQuestionSegmentationReviews = input.generateQuestionSegmentationReviews !== false;
  const generateAnnotationTasks = input.generateAnnotationTasks !== false;
  const generateGoldLabelReviewReports = input.generateGoldLabelReviewReports !== false;
  const generateDeliveryBundles = input.generateDeliveryBundles !== false;
  const generateTeacherReviewPackets = input.generateTeacherReviewPackets ?? generateDeliveryBundles;
  const generateMonthlyReports = input.generateMonthlyReports === true;
  const manifest = await readManifestFile(inputManifestPath);

  let generatedProviderTrialReportCount = 0;
  let generatedQuestionSegmentationReviewCount = 0;
  let generatedAnnotationTaskCount = 0;
  let generatedGoldLabelReviewReportCount = 0;
  let generatedUserResultCount = 0;
  let generatedMonthlyReportCount = 0;
  let generatedDeliveryBundleCount = 0;
  let generatedTeacherReviewPacketCount = 0;
  let skippedProviderTrialReportCount = 0;
  let skippedQuestionSegmentationReviewCount = 0;
  let skippedAnnotationTaskCount = 0;
  let skippedGoldLabelReviewReportCount = 0;
  let skippedUserResultCount = 0;
  let skippedMonthlyReportCount = 0;
  let skippedDeliveryBundleCount = 0;
  let skippedTeacherReviewPacketCount = 0;

  const cases: StudentLearningMaterialEvaluationAssetManifestCase[] = [];
  for (const item of manifest.cases) {
    const updated = normalizeExistingManifestCasePaths(item, inputBaseDir, outputBaseDir);
    const caseDir = path.join(artifactBaseDir, safePathSegment(item.case_id));
    const visionPacketPath = resolveRequiredCasePath(item.vision_packet_path, inputBaseDir, item.case_id, "vision_packet_path");
    const goldLabelPackagePath = resolveRequiredCasePath(item.gold_label_package_path, inputBaseDir, item.case_id, "gold_label_package_path");
    let analysisPath: string | undefined;
    const getAnalysisPath = () => {
      analysisPath ||= resolveRequiredCasePath(item.analysis_path, inputBaseDir, item.case_id, "analysis_path");
      return analysisPath;
    };

    if (generateQuestionSegmentationReviews) {
      if (updated.question_segmentation_review_path && !input.overwriteExisting) {
        skippedQuestionSegmentationReviewCount += 1;
      } else {
        const segmentationReviewPath = updated.question_segmentation_review_path
          ? path.resolve(outputBaseDir, updated.question_segmentation_review_path)
          : path.join(caseDir, "question-segmentation-review.json");
        await generateQuestionSegmentationReviewFile({
          visionPacketPath,
          segmentationReviewOutputPath: segmentationReviewPath
        });
        updated.question_segmentation_review_path = makeManifestRelativePath(segmentationReviewPath, outputBaseDir);
        generatedQuestionSegmentationReviewCount += 1;
      }
    }

    if (generateProviderTrialReports) {
      if (updated.provider_trial_report_path && !input.overwriteExisting) {
        skippedProviderTrialReportCount += 1;
      } else {
        const providerTrialReportPath = updated.provider_trial_report_path
          ? path.resolve(outputBaseDir, updated.provider_trial_report_path)
          : path.join(caseDir, "provider-trial-report.json");
        await generateVisionProviderTrialReportFile({
          visionPacketPath,
          segmentationReviewPath: updated.question_segmentation_review_path
            ? path.resolve(outputBaseDir, updated.question_segmentation_review_path)
            : undefined,
          providerTrialReportOutputPath: providerTrialReportPath
        });
        updated.provider_trial_report_path = makeManifestRelativePath(providerTrialReportPath, outputBaseDir);
        generatedProviderTrialReportCount += 1;
      }
    }

    if (generateAnnotationTasks) {
      if (updated.annotation_task_path && !input.overwriteExisting) {
        skippedAnnotationTaskCount += 1;
      } else {
        const annotationTaskPath = updated.annotation_task_path
          ? path.resolve(outputBaseDir, updated.annotation_task_path)
          : path.join(caseDir, "annotation-task.json");
        const segmentationReviewPath = updated.question_segmentation_review_path
          ? path.resolve(outputBaseDir, updated.question_segmentation_review_path)
          : undefined;
        await generateGoldLabelAnnotationTaskFile({
          visionPacketPath,
          questionSegmentationReviewPath: segmentationReviewPath,
          annotationTaskOutputPath: annotationTaskPath,
          caseId: item.case_id
        });
        updated.annotation_task_path = makeManifestRelativePath(annotationTaskPath, outputBaseDir);
        generatedAnnotationTaskCount += 1;
      }
    }

    if (generateGoldLabelReviewReports) {
      if (updated.gold_label_review_report_path && !input.overwriteExisting) {
        skippedGoldLabelReviewReportCount += 1;
      } else {
        const goldLabelReviewReportPath = updated.gold_label_review_report_path
          ? path.resolve(outputBaseDir, updated.gold_label_review_report_path)
          : path.join(caseDir, "gold-label-review-report.json");
        await generateGoldLabelReviewReportFile({
          goldLabelPackagePath,
          visionPacketPath,
          answerKeysPath: updated.answer_keys_path ? path.resolve(outputBaseDir, updated.answer_keys_path) : undefined,
          rubricsPath: updated.rubrics_path ? path.resolve(outputBaseDir, updated.rubrics_path) : undefined,
          goldLabelReviewReportOutputPath: goldLabelReviewReportPath
        });
        updated.gold_label_review_report_path = makeManifestRelativePath(goldLabelReviewReportPath, outputBaseDir);
        generatedGoldLabelReviewReportCount += 1;
      }
    }

    if (generateUserResults) {
      if (updated.result_path && !input.overwriteExisting) {
        skippedUserResultCount += 1;
      } else {
        const resultPath = updated.result_path
          ? path.resolve(outputBaseDir, updated.result_path)
          : path.join(caseDir, "result.json");
        await generateStudentLearningMaterialUserFacingResultFromAnalysisFile({
          analysisInputPath: getAnalysisPath(),
          resultOutputPath: resultPath
        });
        updated.result_path = makeManifestRelativePath(resultPath, outputBaseDir);
        generatedUserResultCount += 1;
      }
    }

    if (generateMonthlyReports) {
      if (updated.monthly_report_path && updated.monthly_report_input_path && !input.overwriteExisting) {
        skippedMonthlyReportCount += 1;
      } else {
        const hasExistingMonthlyReportInputPath = Boolean(updated.monthly_report_input_path);
        const shouldWriteMonthlyReportInput = !hasExistingMonthlyReportInputPath || input.overwriteExisting === true;
        if (shouldWriteMonthlyReportInput && (!input.monthlyReport?.teacherId || !input.monthlyReport.confirmedAt)) {
          throw new Error("monthlyReport.teacherId and monthlyReport.confirmedAt are required when generating monthly report input");
        }
        const monthlyInputPath = updated.monthly_report_input_path
          ? path.resolve(outputBaseDir, updated.monthly_report_input_path)
          : path.join(caseDir, "monthly-input.json");
        const monthlyReportPath = updated.monthly_report_path
          ? path.resolve(outputBaseDir, updated.monthly_report_path)
          : path.join(caseDir, "monthly-report.json");
        if (shouldWriteMonthlyReportInput) {
          const analysis = await readJsonFile<StudentLearningMaterialAnalysis>(getAnalysisPath());
          await writeMonthlyReportInputFile({
            analysis,
            caseId: item.case_id,
            monthlyInputPath,
            teacherId: input.monthlyReport?.teacherId || "",
            confirmedAt: input.monthlyReport?.confirmedAt || "",
            studentName: input.monthlyReport?.studentName,
            previousMonth: input.monthlyReport?.previousMonth,
            previousMonthLabel: input.monthlyReport?.previousMonthLabel
          });
        }
        await generateStudentMonthlyReportFile({
          monthlyReportInputPath: monthlyInputPath,
          monthlyReportOutputPath: monthlyReportPath
        });
        updated.monthly_report_input_path = makeManifestRelativePath(monthlyInputPath, outputBaseDir);
        updated.monthly_report_path = makeManifestRelativePath(monthlyReportPath, outputBaseDir);
        generatedMonthlyReportCount += 1;
      }
    }

    if (generateDeliveryBundles) {
      if (updated.delivery_bundle_path && !input.overwriteExisting) {
        skippedDeliveryBundleCount += 1;
      } else {
        const resultPath = updated.result_path
          ? path.resolve(outputBaseDir, updated.result_path)
          : path.join(caseDir, "result.json");
        const monthlyReportPath = updated.monthly_report_path ? path.resolve(outputBaseDir, updated.monthly_report_path) : undefined;
        const deliveryBundlePath = updated.delivery_bundle_path
          ? path.resolve(outputBaseDir, updated.delivery_bundle_path)
          : path.join(caseDir, "delivery-bundle.json");
        await generateStudentLearningMaterialDeliveryBundleFile({
          resultInputPath: updated.result_path ? resultPath : undefined,
          analysisInputPath: updated.result_path ? undefined : getAnalysisPath(),
          resultOutputPath: resultPath,
          monthlyReportInputPath: monthlyReportPath,
          deliveryBundleOutputPath: deliveryBundlePath
        });
        if (!updated.result_path) updated.result_path = makeManifestRelativePath(resultPath, outputBaseDir);
        updated.delivery_bundle_path = makeManifestRelativePath(deliveryBundlePath, outputBaseDir);
        generatedDeliveryBundleCount += 1;
      }
    }

    if (generateTeacherReviewPackets) {
      if (updated.teacher_review_packet_path && !input.overwriteExisting) {
        skippedTeacherReviewPacketCount += 1;
      } else {
        if (!updated.delivery_bundle_path) {
          throw new Error(`case_id=${item.case_id} requires delivery_bundle_path before generating teacher review packet`);
        }
        const deliveryBundlePath = path.resolve(outputBaseDir, updated.delivery_bundle_path);
        const teacherReviewPacketPath = updated.teacher_review_packet_path
          ? path.resolve(outputBaseDir, updated.teacher_review_packet_path)
          : path.join(caseDir, "teacher-review-packet.json");
        await generateStudentLearningMaterialTeacherReviewPacketFile({
          deliveryBundleInputPath: deliveryBundlePath,
          teacherReviewPacketOutputPath: teacherReviewPacketPath,
          skillRunId: item.case_id
        });
        updated.teacher_review_packet_path = makeManifestRelativePath(teacherReviewPacketPath, outputBaseDir);
        generatedTeacherReviewPacketCount += 1;
      }
    }

    cases.push(updated);
  }

  const outputManifest: StudentLearningMaterialEvaluationAssetManifest = {
    ...manifest,
    cases
  };
  await mkdir(outputBaseDir, { recursive: true });
  await writeFile(outputManifestPath, `${JSON.stringify(outputManifest, null, 2)}\n`, "utf8");

  const validation = validateStudentLearningMaterialEvaluationAssetManifestFromFile(outputManifestPath);
  return {
    manifestOutputPath: outputManifestPath,
    caseCount: outputManifest.cases.length,
    generatedProviderTrialReportCount,
    generatedQuestionSegmentationReviewCount,
    generatedAnnotationTaskCount,
    generatedGoldLabelReviewReportCount,
    generatedUserResultCount,
    generatedMonthlyReportCount,
    generatedDeliveryBundleCount,
    generatedTeacherReviewPacketCount,
    skippedProviderTrialReportCount,
    skippedQuestionSegmentationReviewCount,
    skippedAnnotationTaskCount,
    skippedGoldLabelReviewReportCount,
    skippedUserResultCount,
    skippedMonthlyReportCount,
    skippedDeliveryBundleCount,
    skippedTeacherReviewPacketCount,
    validationOk: validation.ok,
    validationErrors: validation.errors,
    validationWarnings: validation.warnings,
    validationReport: validation.report
  };
}

async function readManifestFile(filePath: string): Promise<StudentLearningMaterialEvaluationAssetManifest> {
  const manifest = await readJsonFile<StudentLearningMaterialEvaluationAssetManifest>(filePath);
  if (manifest.fixture_schema !== "student_learning_material_evaluation_assets.v0.1") {
    throw new Error("fixture_schema must be student_learning_material_evaluation_assets.v0.1");
  }
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    throw new Error("manifest.cases must be a non-empty array");
  }
  return manifest;
}

function normalizeExistingManifestCasePaths(
  item: StudentLearningMaterialEvaluationAssetManifestCase,
  inputBaseDir: string,
  outputBaseDir: string
): StudentLearningMaterialEvaluationAssetManifestCase {
  return {
    ...item,
    ...(item.external_vision_input_path ? { external_vision_input_path: rebaseManifestPath(item.external_vision_input_path, inputBaseDir, outputBaseDir) } : {}),
    vision_packet_path: rebaseManifestPath(item.vision_packet_path, inputBaseDir, outputBaseDir),
    gold_label_package_path: rebaseManifestPath(item.gold_label_package_path, inputBaseDir, outputBaseDir),
    ...(item.answer_keys_path ? { answer_keys_path: rebaseManifestPath(item.answer_keys_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.rubrics_path ? { rubrics_path: rebaseManifestPath(item.rubrics_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.provider_trial_report_path ? { provider_trial_report_path: rebaseManifestPath(item.provider_trial_report_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.question_segmentation_review_path ? { question_segmentation_review_path: rebaseManifestPath(item.question_segmentation_review_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.annotation_task_path ? { annotation_task_path: rebaseManifestPath(item.annotation_task_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.annotation_import_path ? { annotation_import_path: rebaseManifestPath(item.annotation_import_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.gold_label_review_report_path ? { gold_label_review_report_path: rebaseManifestPath(item.gold_label_review_report_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.analysis_path ? { analysis_path: rebaseManifestPath(item.analysis_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.result_path ? { result_path: rebaseManifestPath(item.result_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.monthly_report_input_path ? { monthly_report_input_path: rebaseManifestPath(item.monthly_report_input_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.monthly_report_path ? { monthly_report_path: rebaseManifestPath(item.monthly_report_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.delivery_bundle_path ? { delivery_bundle_path: rebaseManifestPath(item.delivery_bundle_path, inputBaseDir, outputBaseDir) } : {}),
    ...(item.teacher_review_packet_path ? { teacher_review_packet_path: rebaseManifestPath(item.teacher_review_packet_path, inputBaseDir, outputBaseDir) } : {})
  };
}

function resolveRequiredCasePath(filePath: string | undefined, baseDir: string, caseId: string, fieldName = "analysis_path") {
  if (!filePath) {
    throw new Error(`case_id=${caseId} requires ${fieldName} before generating evaluation artifacts`);
  }
  return path.isAbsolute(filePath) ? filePath : path.resolve(baseDir, filePath);
}

async function writeMonthlyReportInputFile(input: {
  analysis: StudentLearningMaterialAnalysis;
  caseId: string;
  monthlyInputPath: string;
  teacherId: string;
  confirmedAt: string;
  studentName?: string;
  previousMonth?: string;
  previousMonthLabel?: string;
}) {
  const confirmed = createConfirmedMonthlyReportSnapshotCopy({
    analysis: input.analysis,
    teacherId: input.teacherId,
    sourceSkillRunId: `${input.caseId}:skill-run`,
    archiveRecordId: `${input.caseId}:archive-record`,
    confirmedAt: input.confirmedAt,
    feedbackSent: true
  });
  if (!confirmed.ok) {
    throw new Error(`case_id=${input.caseId} cannot create confirmed monthly snapshot: ${confirmed.errors.join("；")}`);
  }

  const monthlyInput: StudentMonthlyReportFileInput = {
    fixture_schema: "student_monthly_report_input.v0.1",
    student_id: input.analysis.student_id,
    student_name: input.studentName || "脱敏学生",
    current_month: input.analysis.monthly_report_snapshot.month,
    previous_month: input.previousMonth,
    previous_month_label: input.previousMonthLabel,
    subject_area: input.analysis.material_classification.subject,
    snapshots: [confirmed.snapshot]
  };
  await mkdir(path.dirname(input.monthlyInputPath), { recursive: true });
  await writeFile(input.monthlyInputPath, `${JSON.stringify(monthlyInput, null, 2)}\n`, "utf8");
}

function rebaseManifestPath(filePath: string, inputBaseDir: string, outputBaseDir: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(inputBaseDir, filePath);
  return makeManifestRelativePath(absolutePath, outputBaseDir);
}

function makeManifestRelativePath(filePath: string, outputBaseDir: string) {
  const relativePath = path.relative(outputBaseDir, filePath);
  return relativePath || path.basename(filePath);
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}
