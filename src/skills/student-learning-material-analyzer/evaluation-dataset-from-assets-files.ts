import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  validateStudentLearningMaterialEvaluationAssetManifestFromFile,
  type StudentLearningMaterialEvaluationAssetManifest
} from "./evaluation-assets";
import {
  evaluateStudentLearningMaterialDatasetFile,
  loadStudentLearningMaterialEvaluationDatasetBundleFromFile,
  type StudentLearningMaterialEvaluationDatasetFile
} from "./evaluation-files";
import type {
  StudentLearningMaterialEvaluationDatasetBundle,
  StudentLearningMaterialEvaluationDatasetKind,
  StudentLearningMaterialEvaluationReviewProtocol
} from "./evaluation";

export type GenerateStudentLearningMaterialEvaluationDatasetFromAssetsInput = {
  manifestInputPath: string;
  datasetOutputPath: string;
  datasetId?: string;
  description?: string;
  modelUnderTest?: StudentLearningMaterialEvaluationDatasetBundle["model_under_test"];
  reviewProtocol?: StudentLearningMaterialEvaluationReviewProtocol;
  checkedAt?: string;
  makePathsRelativeToDataset?: boolean;
};

export type GenerateStudentLearningMaterialEvaluationDatasetFromAssetsResult = {
  datasetOutputPath: string;
  datasetId: string;
  datasetKind: StudentLearningMaterialEvaluationDatasetKind;
  caseCount: number;
  assetPreflightReady: boolean;
  assetPreflightBlockers: string[];
  datasetLoadOk: boolean;
  datasetLoadErrors: string[];
  evaluationOk: boolean;
  claimable99Correctness: boolean;
  evaluationReport: string;
};

const defaultReviewProtocol: StudentLearningMaterialEvaluationReviewProtocol = {
  double_labeled: true,
  adjudicated: true,
  anonymized: true,
  reviewer_roles: ["教研标注员", "授课老师", "教研负责人"]
};

export async function generateStudentLearningMaterialEvaluationDatasetFromAssetsFile(
  input: GenerateStudentLearningMaterialEvaluationDatasetFromAssetsInput
): Promise<GenerateStudentLearningMaterialEvaluationDatasetFromAssetsResult> {
  const manifestInputPath = path.resolve(input.manifestInputPath);
  const datasetOutputPath = path.resolve(input.datasetOutputPath);
  const manifestBaseDir = path.dirname(manifestInputPath);
  const datasetOutputDir = path.dirname(datasetOutputPath);
  const manifest = JSON.parse(await readFile(manifestInputPath, "utf8")) as StudentLearningMaterialEvaluationAssetManifest;
  const assetValidation = validateStudentLearningMaterialEvaluationAssetManifestFromFile(manifestInputPath);
  const errors = [...assetValidation.errors];
  const cases = manifest.cases.map((item, index) => {
    if (!item.analysis_path) {
      errors.push(`cases[${item.case_id || index}] analysis_path is required to generate eval dataset`);
    }
    return {
      asset_manifest_case_id: item.case_id,
      gold_label_package_path: normalizeDatasetPath(item.gold_label_package_path, {
        manifestBaseDir,
        datasetOutputDir,
        makeRelative: input.makePathsRelativeToDataset !== false
      }),
      analysis_path: normalizeDatasetPath(item.analysis_path || "", {
        manifestBaseDir,
        datasetOutputDir,
        makeRelative: input.makePathsRelativeToDataset !== false
      })
    };
  });
  if (errors.length) {
    throw new Error(`Evaluation dataset was not written because asset manifest is not dataset-ready: ${errors.join("；")}`);
  }

  const datasetId = input.datasetId || manifest.dataset_id;
  const sourceManifestId = assetValidation.dataset_id || manifest.dataset_id;
  const dataset: StudentLearningMaterialEvaluationDatasetFile = {
    fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
    dataset_id: datasetId,
    dataset_kind: manifest.dataset_kind,
    ...(input.description || manifest.description ? { description: input.description || manifest.description } : {}),
    ...(input.modelUnderTest ? { model_under_test: input.modelUnderTest } : {}),
    review_protocol: input.reviewProtocol || defaultReviewProtocol,
    asset_preflight: {
      claimable99AssetReady: assetValidation.claimReadiness.claimable99AssetReady,
      manifest_id: datasetId,
      ...(sourceManifestId !== datasetId ? { source_manifest_id: sourceManifestId } : {}),
      checked_at: input.checkedAt || new Date().toISOString(),
      blockers: assetValidation.claimReadiness.blockers
    },
    cases
  };

  await mkdir(datasetOutputDir, { recursive: true });
  await writeFile(datasetOutputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  const loaded = loadStudentLearningMaterialEvaluationDatasetBundleFromFile(datasetOutputPath);
  const evaluation = evaluateStudentLearningMaterialDatasetFile(datasetOutputPath);

  return {
    datasetOutputPath,
    datasetId: dataset.dataset_id,
    datasetKind: dataset.dataset_kind,
    caseCount: dataset.cases.length,
    assetPreflightReady: dataset.asset_preflight?.claimable99AssetReady ?? false,
    assetPreflightBlockers: dataset.asset_preflight?.blockers ?? [],
    datasetLoadOk: loaded.ok,
    datasetLoadErrors: loaded.ok ? [] : loaded.errors,
    evaluationOk: evaluation.result?.ok ?? false,
    claimable99Correctness: evaluation.result?.claimable99Correctness ?? false,
    evaluationReport: evaluation.report
  };
}

function normalizeDatasetPath(
  filePath: string,
  options: {
    manifestBaseDir: string;
    datasetOutputDir: string;
    makeRelative: boolean;
  }
) {
  if (!filePath) return filePath;
  if (!options.makeRelative) return filePath;
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(options.manifestBaseDir, filePath);
  const relativePath = path.relative(options.datasetOutputDir, absolutePath);
  return relativePath || path.basename(absolutePath);
}
