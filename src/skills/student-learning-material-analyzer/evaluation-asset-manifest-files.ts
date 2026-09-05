import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StudentLearningMaterialEvaluationDatasetKind } from "./evaluation";
import {
  validateStudentLearningMaterialEvaluationAssetManifestFromFile,
  type StudentLearningMaterialEvaluationAssetManifest,
  type StudentLearningMaterialEvaluationAssetManifestCase
} from "./evaluation-assets";

export type GenerateStudentLearningMaterialEvaluationAssetManifestFileInput = {
  manifestOutputPath: string;
  datasetId: string;
  datasetKind: StudentLearningMaterialEvaluationDatasetKind;
  description?: string;
  cases: StudentLearningMaterialEvaluationAssetManifestCase[];
  sourceBaseDir?: string;
  makePathsRelativeToManifest?: boolean;
};

export type GenerateStudentLearningMaterialEvaluationAssetManifestFromCasesFileInput = {
  casesInputPath: string;
  manifestOutputPath: string;
  datasetId?: string;
  datasetKind?: StudentLearningMaterialEvaluationDatasetKind;
  description?: string;
  makePathsRelativeToManifest?: boolean;
};

export type GenerateStudentLearningMaterialEvaluationAssetManifestFileResult = {
  manifestOutputPath: string;
  datasetId: string;
  datasetKind: StudentLearningMaterialEvaluationDatasetKind;
  caseCount: number;
  validationOk: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  validationReport: string;
};

type EvaluationAssetManifestCasesInputFile =
  | StudentLearningMaterialEvaluationAssetManifestCase[]
  | {
      dataset_id?: string;
      dataset_kind?: StudentLearningMaterialEvaluationDatasetKind;
      description?: string;
      cases: StudentLearningMaterialEvaluationAssetManifestCase[];
    };

export async function generateStudentLearningMaterialEvaluationAssetManifestFile(
  input: GenerateStudentLearningMaterialEvaluationAssetManifestFileInput
): Promise<GenerateStudentLearningMaterialEvaluationAssetManifestFileResult> {
  const outputDir = path.dirname(path.resolve(input.manifestOutputPath));
  const manifest: StudentLearningMaterialEvaluationAssetManifest = {
    fixture_schema: "student_learning_material_evaluation_assets.v0.1",
    dataset_id: input.datasetId,
    dataset_kind: input.datasetKind,
    ...(input.description ? { description: input.description } : {}),
    cases: input.cases.map((item) => normalizeManifestCasePaths(item, {
      sourceBaseDir: input.sourceBaseDir,
      outputDir,
      makeRelative: input.makePathsRelativeToManifest !== false
    }))
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(input.manifestOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const validation = validateStudentLearningMaterialEvaluationAssetManifestFromFile(input.manifestOutputPath);
  return {
    manifestOutputPath: input.manifestOutputPath,
    datasetId: manifest.dataset_id,
    datasetKind: manifest.dataset_kind,
    caseCount: manifest.cases.length,
    validationOk: validation.ok,
    validationErrors: validation.errors,
    validationWarnings: validation.warnings,
    validationReport: validation.report
  };
}

export async function generateStudentLearningMaterialEvaluationAssetManifestFileFromCasesFile(
  input: GenerateStudentLearningMaterialEvaluationAssetManifestFromCasesFileInput
): Promise<GenerateStudentLearningMaterialEvaluationAssetManifestFileResult> {
  const absoluteCasesPath = path.resolve(input.casesInputPath);
  const raw = JSON.parse(await readFile(absoluteCasesPath, "utf8")) as EvaluationAssetManifestCasesInputFile;
  const cases = Array.isArray(raw) ? raw : raw.cases;
  const casesFileMetadata = Array.isArray(raw) ? undefined : raw;
  const datasetId = resolveCasesFileMetadata("dataset_id", input.datasetId, casesFileMetadata?.dataset_id);
  const datasetKind = resolveCasesFileMetadata("dataset_kind", input.datasetKind, casesFileMetadata?.dataset_kind);
  const description = resolveCasesFileMetadata("description", input.description, casesFileMetadata?.description);

  if (!datasetId) throw new Error("datasetId is required; set input.datasetId or cases file dataset_id");
  if (!datasetKind) throw new Error("datasetKind is required; set input.datasetKind or cases file dataset_kind");
  if (!Array.isArray(cases)) throw new Error("cases input file must be an array or an object with cases[]");

  return generateStudentLearningMaterialEvaluationAssetManifestFile({
    manifestOutputPath: input.manifestOutputPath,
    datasetId,
    datasetKind,
    description,
    cases,
    sourceBaseDir: path.dirname(absoluteCasesPath),
    makePathsRelativeToManifest: input.makePathsRelativeToManifest
  });
}

function resolveCasesFileMetadata<T extends string>(
  fieldName: "dataset_id" | "dataset_kind" | "description",
  inputValue: T | undefined,
  casesFileValue: T | undefined
) {
  if (inputValue && casesFileValue && inputValue !== casesFileValue) {
    throw new Error(`${fieldName} override must match cases file ${fieldName}: ${inputValue} != ${casesFileValue}`);
  }
  return inputValue || casesFileValue;
}

function normalizeManifestCasePaths(
  item: StudentLearningMaterialEvaluationAssetManifestCase,
  options: {
    sourceBaseDir?: string;
    outputDir: string;
    makeRelative: boolean;
  }
): StudentLearningMaterialEvaluationAssetManifestCase {
  return {
    ...item,
    ...(item.external_vision_input_path ? { external_vision_input_path: normalizeManifestPath(item.external_vision_input_path, options) } : {}),
    vision_packet_path: normalizeManifestPath(item.vision_packet_path, options),
    gold_label_package_path: normalizeManifestPath(item.gold_label_package_path, options),
    ...(item.answer_keys_path ? { answer_keys_path: normalizeManifestPath(item.answer_keys_path, options) } : {}),
    ...(item.rubrics_path ? { rubrics_path: normalizeManifestPath(item.rubrics_path, options) } : {}),
    ...(item.provider_trial_report_path ? { provider_trial_report_path: normalizeManifestPath(item.provider_trial_report_path, options) } : {}),
    ...(item.question_segmentation_review_path ? { question_segmentation_review_path: normalizeManifestPath(item.question_segmentation_review_path, options) } : {}),
    ...(item.annotation_task_path ? { annotation_task_path: normalizeManifestPath(item.annotation_task_path, options) } : {}),
    ...(item.annotation_import_path ? { annotation_import_path: normalizeManifestPath(item.annotation_import_path, options) } : {}),
    ...(item.gold_label_review_report_path ? { gold_label_review_report_path: normalizeManifestPath(item.gold_label_review_report_path, options) } : {}),
    ...(item.analysis_path ? { analysis_path: normalizeManifestPath(item.analysis_path, options) } : {}),
    ...(item.result_path ? { result_path: normalizeManifestPath(item.result_path, options) } : {}),
    ...(item.monthly_report_input_path ? { monthly_report_input_path: normalizeManifestPath(item.monthly_report_input_path, options) } : {}),
    ...(item.monthly_report_path ? { monthly_report_path: normalizeManifestPath(item.monthly_report_path, options) } : {}),
    ...(item.delivery_bundle_path ? { delivery_bundle_path: normalizeManifestPath(item.delivery_bundle_path, options) } : {}),
    ...(item.teacher_review_packet_path ? { teacher_review_packet_path: normalizeManifestPath(item.teacher_review_packet_path, options) } : {})
  };
}

function normalizeManifestPath(
  filePath: string,
  options: {
    sourceBaseDir?: string;
    outputDir: string;
    makeRelative: boolean;
  }
) {
  if (!options.makeRelative) return filePath;
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(options.sourceBaseDir || process.cwd(), filePath);
  const relativePath = path.relative(options.outputDir, absolutePath);
  return relativePath || path.basename(absolutePath);
}
