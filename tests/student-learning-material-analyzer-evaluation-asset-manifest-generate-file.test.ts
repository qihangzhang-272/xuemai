import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateStudentLearningMaterialEvaluationAssetManifestFile,
  generateStudentLearningMaterialEvaluationAssetManifestFileFromCasesFile
} from "../src/skills/student-learning-material-analyzer/evaluation-asset-manifest-files";
import { validateStudentLearningMaterialEvaluationAssetManifestFromFile } from "../src/skills/student-learning-material-analyzer/evaluation-assets";
import { buildGoldLabelAnnotationTask } from "../src/skills/student-learning-material-analyzer/gold-label-annotation-task";
import { buildGoldLabelReviewReport } from "../src/skills/student-learning-material-analyzer/gold-label-review-report";
import type { StudentLearningMaterialGoldLabelPackage } from "../src/skills/student-learning-material-analyzer/gold-labeling";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

const fixtureDir = path.resolve("tests/fixtures/student-learning-material-evaluation/synthetic-asset-manifest");

describe("student learning material evaluation asset manifest file generator", () => {
  it("writes and validates a replayable evaluation asset manifest from case paths", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-assets-manifest-"));
    const manifestPath = path.join(tempDir, "evaluation-assets.json");
    const packetPath = path.join(tempDir, "vision-packet.json");
    const goldPath = path.join(tempDir, "gold-label-package.json");
    const annotationTaskPath = path.join(tempDir, "annotation-task.json");
    const goldReviewPath = path.join(tempDir, "gold-label-review-report.json");
    const monthlyReportInputPath = path.join(tempDir, "monthly-report-input.json");

    try {
      await copyFile(path.join(fixtureDir, "vision-packet.json"), packetPath);
      await copyFile(path.join(fixtureDir, "gold-label-package.json"), goldPath);
      const packet = JSON.parse(await readFile(packetPath, "utf8")) as VisionEvidencePacket;
      const goldPackage = JSON.parse(await readFile(goldPath, "utf8")) as StudentLearningMaterialGoldLabelPackage;
      await writeFile(
        annotationTaskPath,
        `${JSON.stringify(
          buildGoldLabelAnnotationTask(packet, {
            caseId: "synthetic-asset-case-001",
            generatedAt: "2026-06-20T11:20:00+08:00"
          }),
          null,
          2
        )}\n`,
        "utf8"
      );
      await writeFile(
        goldReviewPath,
        `${JSON.stringify(
          buildGoldLabelReviewReport(goldPackage, {
            generatedAt: "2026-06-20T11:25:00+08:00",
            sourcePacket: packet
          }),
          null,
          2
        )}\n`,
        "utf8"
      );
      await writeFile(
        monthlyReportInputPath,
        `${JSON.stringify(
          {
            fixture_schema: "student_monthly_report_input.v0.1",
            student_id: "synthetic.student_001",
            student_name: "脱敏学生",
            current_month: "2026-06",
            previous_month: "2026-05"
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const result = await generateStudentLearningMaterialEvaluationAssetManifestFile({
        manifestOutputPath: manifestPath,
        datasetId: "generated-asset-manifest-smoke",
        datasetKind: "human_labeled",
        description: "Generated manifest smoke test.",
        cases: [
          {
            case_id: "synthetic-asset-case-001",
            vision_packet_path: packetPath,
            gold_label_package_path: goldPath,
            annotation_task_path: annotationTaskPath,
            gold_label_review_report_path: goldReviewPath,
            monthly_report_input_path: monthlyReportInputPath
          }
        ]
      });
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

      expect(result.validationOk, result.validationReport).toBe(true);
      expect(result.caseCount).toBe(1);
      expect(manifest).toEqual(
        expect.objectContaining({
          fixture_schema: "student_learning_material_evaluation_assets.v0.1",
          dataset_id: "generated-asset-manifest-smoke",
          dataset_kind: "human_labeled"
        })
      );
      expect(manifest.cases[0].vision_packet_path).toBe("vision-packet.json");
      expect(manifest.cases[0].gold_label_package_path).toBe("gold-label-package.json");
      expect(manifest.cases[0].annotation_task_path).toBe("annotation-task.json");
      expect(manifest.cases[0].gold_label_review_report_path).toBe("gold-label-review-report.json");
      expect(manifest.cases[0].monthly_report_input_path).toBe("monthly-report-input.json");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects cases-file dataset metadata overrides that would break provenance", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-assets-manifest-metadata-"));
    const casesPath = path.join(tempDir, "evaluation-assets.cases.json");
    const manifestPath = path.join(tempDir, "evaluation-assets.json");
    try {
      await writeFile(
        casesPath,
        `${JSON.stringify(
          {
            dataset_id: "real-provider-pilot",
            dataset_kind: "human_labeled",
            description: "Original case package metadata.",
            cases: [
              {
                case_id: "real-case-001",
                vision_packet_path: "artifacts/vision-packet.json",
                gold_label_package_path: "human-review/gold-label-package.json"
              }
            ]
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      await expect(
        generateStudentLearningMaterialEvaluationAssetManifestFileFromCasesFile({
          casesInputPath: casesPath,
          manifestOutputPath: manifestPath,
          datasetId: "other-dataset"
        })
      ).rejects.toThrow("dataset_id override must match cases file dataset_id: other-dataset != real-provider-pilot");
      await expect(
        generateStudentLearningMaterialEvaluationAssetManifestFileFromCasesFile({
          casesInputPath: casesPath,
          manifestOutputPath: manifestPath,
          datasetKind: "synthetic"
        })
      ).rejects.toThrow("dataset_kind override must match cases file dataset_kind: synthetic != human_labeled");
      await expect(
        generateStudentLearningMaterialEvaluationAssetManifestFileFromCasesFile({
          casesInputPath: casesPath,
          manifestOutputPath: manifestPath,
          description: "Different metadata."
        })
      ).rejects.toThrow("description override must match cases file description");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates the manifest file specified by env vars", async () => {
    const casesInputPath = process.env.XUEMAI_EVAL_ASSET_MANIFEST_CASES;
    const manifestOutputPath = process.env.XUEMAI_EVAL_ASSET_MANIFEST_OUTPUT;

    if (!casesInputPath || !manifestOutputPath) {
      if (process.env.XUEMAI_EVAL_ASSET_MANIFEST_GENERATE_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_EVAL_ASSET_MANIFEST_CASES=/absolute/path/to/cases.json and XUEMAI_EVAL_ASSET_MANIFEST_OUTPUT=/absolute/path/to/evaluation-assets.json"
        );
      }
      expect(casesInputPath || manifestOutputPath).toBeUndefined();
      return;
    }

    const result = await generateStudentLearningMaterialEvaluationAssetManifestFileFromCasesFile({
      casesInputPath,
      manifestOutputPath,
      datasetId: process.env.XUEMAI_EVAL_ASSET_DATASET_ID,
      datasetKind: readDatasetKind(process.env.XUEMAI_EVAL_ASSET_DATASET_KIND),
      description: process.env.XUEMAI_EVAL_ASSET_DESCRIPTION,
      makePathsRelativeToManifest: process.env.XUEMAI_EVAL_ASSET_KEEP_INPUT_PATHS !== "1"
    });

    console.log(
      [
        "StudentLearningMaterialEvaluation asset manifest generated",
        `datasetId=${result.datasetId}`,
        `datasetKind=${result.datasetKind}`,
        `manifestOutputPath=${result.manifestOutputPath}`,
        `caseCount=${result.caseCount}`,
        `validationOk=${result.validationOk}`,
        `validationErrors=${result.validationErrors.length}`,
        `validationWarnings=${result.validationWarnings.length}`
      ].join("\n")
    );

    expect(result.manifestOutputPath).toBe(manifestOutputPath);
    expect(result.validationOk, result.validationReport).toBe(true);
    expect(validateStudentLearningMaterialEvaluationAssetManifestFromFile(manifestOutputPath).ok).toBe(true);
  });
});

function readDatasetKind(value: string | undefined) {
  if (value === "synthetic" || value === "human_labeled" || value === "mixed") return value;
  return undefined;
}
