import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  evaluateStudentLearningMaterialDatasetBundle,
  formatStudentLearningMaterialEvaluationDatasetReport,
  validateStudentLearningMaterialEvaluationDatasetBundle,
  type StudentLearningMaterialEvaluationCaseArtifactProvenance,
  type StudentLearningMaterialEvaluationClaimPolicy,
  type StudentLearningMaterialEvaluationAssetPreflight,
  type StudentLearningMaterialEvaluationDatasetBundle,
  type StudentLearningMaterialEvaluationDatasetKind,
  type StudentLearningMaterialEvaluationDatasetResult,
  type StudentLearningMaterialEvaluationReviewProtocol,
  type StudentLearningMaterialEvaluationThresholds
} from "./evaluation";
import { extractAdjudicatedGoldCaseFromLabelPackage } from "./gold-labeling";
import type { StudentLearningMaterialAnalysis } from "./types";

export type StudentLearningMaterialEvaluationDatasetFileCase =
  | {
      gold: unknown;
      analysis: unknown;
      asset_manifest_case_id?: string;
      gold_label_package_path?: string;
      analysis_path?: string;
      gold_path?: never;
    }
  | {
      gold?: never;
      analysis?: never;
      asset_manifest_case_id?: string;
      gold_path: string;
      analysis_path: string;
      gold_label_package_path?: string;
    }
  | {
      gold?: never;
      analysis?: never;
      asset_manifest_case_id?: string;
      gold_path?: never;
      gold_label_package_path: string;
      analysis_path: string;
    };

export type StudentLearningMaterialEvaluationDatasetFile = {
  fixture_schema: "student_learning_material_evaluation_dataset.v0.1";
  dataset_id: string;
  dataset_kind: StudentLearningMaterialEvaluationDatasetKind;
  description?: string;
  model_under_test?: {
    provider_name: string;
    model_name: string;
    prompt_version?: string;
  };
  review_protocol: StudentLearningMaterialEvaluationReviewProtocol;
  asset_preflight?: StudentLearningMaterialEvaluationAssetPreflight;
  cases: StudentLearningMaterialEvaluationDatasetFileCase[];
};

export type StudentLearningMaterialEvaluationDatasetLoadResult =
  | {
      ok: true;
      bundle: StudentLearningMaterialEvaluationDatasetBundle;
    }
  | {
      ok: false;
      errors: string[];
    };

export type StudentLearningMaterialEvaluationDatasetFileRunResult = {
  ok: boolean;
  loadErrors: string[];
  result?: StudentLearningMaterialEvaluationDatasetResult;
  report: string;
};

export function loadStudentLearningMaterialEvaluationDatasetBundleFromJsonText(
  jsonText: string,
  options?: { baseDir?: string }
): StudentLearningMaterialEvaluationDatasetLoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return { ok: false, errors: [`Cannot parse evaluation dataset JSON: ${formatError(error)}`] };
  }

  return normalizeStudentLearningMaterialEvaluationDatasetBundle(parsed, options);
}

export function loadStudentLearningMaterialEvaluationDatasetBundleFromFile(
  datasetPath: string
): StudentLearningMaterialEvaluationDatasetLoadResult {
  const absolutePath = resolve(datasetPath);
  try {
    return loadStudentLearningMaterialEvaluationDatasetBundleFromJsonText(readFileSync(absolutePath, "utf8"), {
      baseDir: dirname(absolutePath)
    });
  } catch (error) {
    return { ok: false, errors: [`Cannot read evaluation dataset file: ${formatError(error)}`] };
  }
}

export function evaluateStudentLearningMaterialDatasetFile(
  datasetPath: string,
  thresholds?: StudentLearningMaterialEvaluationThresholds,
  claimPolicy?: StudentLearningMaterialEvaluationClaimPolicy
): StudentLearningMaterialEvaluationDatasetFileRunResult {
  const loaded = loadStudentLearningMaterialEvaluationDatasetBundleFromFile(datasetPath);
  if (!loaded.ok) {
    return {
      ok: false,
      loadErrors: loaded.errors,
      report: [`StudentLearningMaterialAnalysis evaluation: FAIL`, `loadErrors=${loaded.errors.join("；")}`].join("\n")
    };
  }

  const result = evaluateStudentLearningMaterialDatasetBundle(loaded.bundle, thresholds, claimPolicy);
  return {
    ok: result.claimable99Correctness,
    loadErrors: [],
    result,
    report: formatStudentLearningMaterialEvaluationDatasetReport(result)
  };
}

function normalizeStudentLearningMaterialEvaluationDatasetBundle(
  value: unknown,
  options?: { baseDir?: string }
): StudentLearningMaterialEvaluationDatasetLoadResult {
  if (!isRecord(value)) return { ok: false, errors: ["Evaluation dataset must be a JSON object"] };

  const errors: string[] = [];
  const rawCases = Array.isArray(value.cases) ? value.cases : [];
  const cases = rawCases.flatMap((item, index) => {
    const normalized = normalizeCase(item, index, options?.baseDir);
    errors.push(...normalized.errors);
    return normalized.case ? [normalized.case] : [];
  });

  const bundle = {
    ...value,
    cases
  } as StudentLearningMaterialEvaluationDatasetBundle;
  const validation = validateStudentLearningMaterialEvaluationDatasetBundle(bundle);
  errors.push(...validation.errors);

  return errors.length ? { ok: false, errors } : { ok: true, bundle };
}

function normalizeCase(value: unknown, index: number, baseDir?: string) {
  const errors: string[] = [];
  if (!isRecord(value)) return { errors: [`cases[${index}] must be an object`] };

  if (isRecord(value.gold) && isRecord(value.analysis)) {
    return {
      errors,
      case: {
        gold: value.gold,
        analysis: value.analysis as StudentLearningMaterialAnalysis,
        artifact_provenance: buildCaseArtifactProvenance(value)
      }
    };
  }

  if (typeof value.gold_path === "string" && typeof value.analysis_path === "string") {
    const gold = readJsonReference(value.gold_path, index, "gold_path", baseDir);
    const analysis = readJsonReference(value.analysis_path, index, "analysis_path", baseDir);
    errors.push(...gold.errors, ...analysis.errors);
    if (gold.value && analysis.value) {
      return {
        errors,
        case: {
          gold: gold.value,
          analysis: analysis.value as StudentLearningMaterialAnalysis,
          artifact_provenance: buildCaseArtifactProvenance(value, {
            analysisPath: value.analysis_path
          })
        }
      };
    }
  } else if (typeof value.gold_label_package_path === "string" && typeof value.analysis_path === "string") {
    const packageValue = readJsonReference(value.gold_label_package_path, index, "gold_label_package_path", baseDir);
    const analysis = readJsonReference(value.analysis_path, index, "analysis_path", baseDir);
    errors.push(...packageValue.errors, ...analysis.errors);
    if (packageValue.value && analysis.value) {
      const gold = extractAdjudicatedGoldCaseFromLabelPackage(packageValue.value);
      if (!gold.ok) {
        errors.push(...gold.errors.map((error) => `cases[${index}].gold_label_package_path invalid: ${error}`));
      } else {
        return {
          errors,
          case: {
            gold: gold.gold,
            analysis: analysis.value as StudentLearningMaterialAnalysis,
            artifact_provenance: buildCaseArtifactProvenance(value, {
              goldLabelPackagePath: value.gold_label_package_path,
              analysisPath: value.analysis_path
            })
          }
        };
      }
    }
  } else {
    errors.push(`cases[${index}] must include inline gold and analysis objects, gold_path and analysis_path, or gold_label_package_path and analysis_path`);
  }

  return { errors };
}

function buildCaseArtifactProvenance(
  value: Record<string, unknown>,
  paths?: { goldLabelPackagePath?: string; analysisPath?: string }
): StudentLearningMaterialEvaluationCaseArtifactProvenance | undefined {
  const assetManifestCaseId = readString(value.asset_manifest_case_id);
  const goldLabelPackagePath = paths?.goldLabelPackagePath || readString(value.gold_label_package_path);
  const analysisPath = paths?.analysisPath || readString(value.analysis_path);
  if (!assetManifestCaseId && !goldLabelPackagePath && !analysisPath) return undefined;
  return {
    ...(assetManifestCaseId ? { asset_manifest_case_id: assetManifestCaseId } : {}),
    ...(goldLabelPackagePath ? { gold_label_package_path: goldLabelPackagePath } : {}),
    ...(analysisPath ? { analysis_path: analysisPath } : {})
  };
}

function readJsonReference(path: string, caseIndex: number, fieldName: string, baseDir?: string) {
  const filePath = baseDir ? resolve(baseDir, path) : resolve(path);
  try {
    return { value: JSON.parse(readFileSync(filePath, "utf8")) as unknown, errors: [] };
  } catch (error) {
    return { errors: [`cases[${caseIndex}].${fieldName} cannot be read or parsed: ${formatError(error)}`] };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
