import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildStudentLearningMaterialEvaluationCasePackage,
  generateStudentLearningMaterialEvaluationCasePackage,
  type StudentLearningMaterialEvaluationCasePackage
} from "../src/skills/student-learning-material-analyzer/evaluation-case-package-files";

describe("student learning material evaluation case package generator", () => {
  it("writes a privacy-safe real-sample case package and manifest cases file", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-package-"));
    try {
      const result = await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-001",
        datasetId: "real-provider-pilot",
        datasetKind: "human_labeled",
        description: "Real provider pilot package.",
        createdAt: "2026-06-20T17:00:00+08:00"
      });
      const casePackage = JSON.parse(await readFile(result.casePackagePath, "utf8")) as StudentLearningMaterialEvaluationCasePackage;
      const casesFile = JSON.parse(await readFile(result.evaluationAssetCasesPath, "utf8"));
      const rootEntries = await readdir(tempDir);
      const providerEntries = await readdir(path.join(tempDir, "provider"));
      const providerTemplate = JSON.parse(await readFile(result.externalVisionInputTemplatePath, "utf8"));

      expect(result).toEqual(
        expect.objectContaining({
          packageDir: tempDir,
          caseId: "real-case-001",
          datasetId: "real-provider-pilot",
          datasetKind: "human_labeled",
          artifactPathCount: 15,
          helperPathCount: 1
        })
      );
      expect(rootEntries).toEqual(expect.arrayContaining(["case-package.json", "evaluation-assets.cases.json", "provider"]));
      expect(providerEntries).toEqual(["external-vision-input.template.json"]);
      expect(rootEntries).not.toEqual(expect.arrayContaining(["raw", "raw-images", "source-images"]));
      expect(casePackage.privacy_boundary).toEqual({
        raw_student_materials_allowed_in_package: false,
        raw_images_excluded_from_gold_file: true,
        anonymization_required_before_gold: true,
        do_not_commit_raw_student_materials: true
      });
      expect(casePackage.artifact_paths).toEqual(
        expect.objectContaining({
          external_vision_input_path: "provider/external-vision-input.json",
          annotation_import_path: "human-review/annotation-import.json",
          gold_label_review_report_path: "human-review/gold-label-review-report.json",
          monthly_report_input_path: "human-review/monthly-report-input.json",
          monthly_report_path: "artifacts/monthly-report.json",
          delivery_bundle_path: "artifacts/delivery-bundle.json",
          teacher_review_packet_path: "artifacts/teacher-review-packet.json"
        })
      );
      expect(casePackage.helper_paths).toEqual({
        external_vision_input_template_path: "provider/external-vision-input.template.json"
      });
      expect(casePackage.evaluation_asset_case).toEqual(
        expect.objectContaining({
          case_id: "real-case-001",
          external_vision_input_path: "provider/external-vision-input.json",
          vision_packet_path: "artifacts/vision-packet.json",
          gold_label_package_path: "human-review/gold-label-package.json",
          annotation_import_path: "human-review/annotation-import.json",
          gold_label_review_report_path: "human-review/gold-label-review-report.json",
          monthly_report_input_path: "human-review/monthly-report-input.json",
          monthly_report_path: "artifacts/monthly-report.json",
          delivery_bundle_path: "artifacts/delivery-bundle.json",
          teacher_review_packet_path: "artifacts/teacher-review-packet.json"
        })
      );
      expect(casePackage.evaluation_asset_case).not.toHaveProperty("external_vision_input_template_path");
      expect(providerTemplate).toEqual(
        expect.objectContaining({
          schema_version: "student_learning_material_external_vision_input_mapping_template.v0.1",
          case_id: "real-case-001",
          dataset_id: "real-provider-pilot",
          target_artifact_path: "provider/external-vision-input.json"
        })
      );
      expect(providerTemplate.privacy_boundary).toEqual(
        expect.objectContaining({
          template_is_not_claim_evidence: true,
          do_not_copy_raw_student_materials_into_package: true,
          replace_placeholders_with_real_anonymized_provider_output: true
        })
      );
      expect(providerTemplate.mapping_rules.join(" ")).toContain("not to this template path");
      expect(providerTemplate.provider_trace_requirements.join(" ")).toContain("fallback or benchmark candidate");
      expect(providerTemplate.provider_input_contract.required_provider_candidate_roles).toEqual([
        "document_parser_or_ocr",
        "layout",
        "formula"
      ]);
      expect(providerTemplate.mapping_rules.join(" ")).toContain("OCR/document-parser, layout, and formula roles");
      expect(providerTemplate.provider_trace_requirements.join(" ")).toContain("coverage.providerRoleCoverage");
      expect(JSON.stringify(providerTemplate)).not.toContain("raw-images");
      expect(casePackage.command_sequence.map((step) => step.step_id)).toEqual([
        "normalize_external_vision",
        "provider_trial_report",
        "question_segmentation_review",
        "annotation_task",
        "gold_label_package",
        "gold_label_review_report",
        "analysis_output",
        "user_result",
        "monthly_report",
        "delivery_bundle",
        "teacher_review_packet",
        "evaluation_asset_manifest"
      ]);
      expect(casePackage.command_sequence.map((step) => step.command).join("\n")).toContain("npm run generate:k12-gold-label-review-report");
      expect(casePackage.command_sequence.map((step) => step.command).join("\n")).toContain("npm run generate:k12-monthly-report");
      expect(casePackage.command_sequence.map((step) => step.command).join("\n")).not.toContain("raw-images");
      expect(casePackage.command_sequence.find((step) => step.step_id === "monthly_report")).toEqual(
        expect.objectContaining({
          required_inputs: ["human-review/monthly-report-input.json"],
          outputs: ["artifacts/monthly-report.json"]
        })
      );
      expect(casePackage.command_sequence.find((step) => step.step_id === "delivery_bundle")).toEqual(
        expect.objectContaining({
          required_inputs: ["artifacts/result.json", "artifacts/monthly-report.json"]
        })
      );
      expect(casePackage.command_sequence.find((step) => step.step_id === "teacher_review_packet")).toEqual(
        expect.objectContaining({
          required_inputs: ["artifacts/delivery-bundle.json"],
          outputs: ["artifacts/teacher-review-packet.json"]
        })
      );
      expect(casePackage.checklist.every((item) => item.status === "pending")).toBe(true);
      expect(casePackage.checklist.every((item) => item.required_for_99)).toBe(true);
      expect(casePackage.checklist.map((item) => item.item_id)).toEqual(
        expect.arrayContaining([
          "monthly_report_input_prepared_with_previous_month_evidence",
          "monthly_previous_month_evidence_available_or_explicitly_missing",
          "provider_candidate_role_coverage_document_layout_formula",
          "annotation_import_normalized_and_source_text_safe",
          "teacher_review_packet_actions_safe"
        ])
      );
      expect(casesFile).toEqual(
        expect.objectContaining({
          dataset_id: "real-provider-pilot",
          dataset_kind: "human_labeled",
          cases: [casePackage.evaluation_asset_case]
        })
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates the case package specified by env vars", async () => {
    const packageDir = process.env.XUEMAI_EVAL_CASE_PACKAGE_DIR;
    const caseId = process.env.XUEMAI_EVAL_CASE_ID;
    const datasetId = process.env.XUEMAI_EVAL_CASE_DATASET_ID;

    if (!packageDir || !caseId || !datasetId) {
      if (process.env.XUEMAI_EVAL_CASE_PACKAGE_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_EVAL_CASE_PACKAGE_DIR=/absolute/path/to/case-dir, XUEMAI_EVAL_CASE_ID=case-id, and XUEMAI_EVAL_CASE_DATASET_ID=dataset-id"
        );
      }
      expect(packageDir || caseId || datasetId).toBeUndefined();
      return;
    }

    const result = await generateStudentLearningMaterialEvaluationCasePackage({
      packageDir,
      caseId,
      datasetId,
      datasetKind: readDatasetKind(process.env.XUEMAI_EVAL_CASE_DATASET_KIND) ?? "human_labeled",
      description: process.env.XUEMAI_EVAL_CASE_DESCRIPTION,
      createdAt: process.env.XUEMAI_EVAL_CASE_CREATED_AT,
      answerKeysPath: process.env.XUEMAI_EVAL_CASE_ANSWER_KEYS_PATH,
      rubricsPath: process.env.XUEMAI_EVAL_CASE_RUBRICS_PATH
    });

    console.log(
      [
        "StudentLearningMaterial evaluation case package generated",
        `packageDir=${result.packageDir}`,
        `casePackagePath=${result.casePackagePath}`,
        `evaluationAssetCasesPath=${result.evaluationAssetCasesPath}`,
        `caseId=${result.caseId}`,
        `datasetId=${result.datasetId}`,
        `datasetKind=${result.datasetKind}`
      ].join("\n")
    );

    expect(result.packageDir).toBe(path.resolve(packageDir));
    expect(result.caseId).toBe(caseId);
    expect(result.datasetId).toBe(datasetId);
  });

  it("includes optional answer and rubric side-input paths when provided", () => {
    const casePackage = buildStudentLearningMaterialEvaluationCasePackage({
      packageDir: "/tmp/xuemai-case-package-side-inputs",
      caseId: "real-case-side-inputs",
      datasetId: "real-provider-pilot",
      answerKeysPath: "side-inputs/answer-keys.json",
      rubricsPath: "side-inputs/rubrics.json",
      createdAt: "2026-06-20T17:30:00+08:00"
    });
    const analysisStep = casePackage.command_sequence.find((step) => step.step_id === "analysis_output");
    const goldPackageStep = casePackage.command_sequence.find((step) => step.step_id === "gold_label_package");
    const goldReviewStep = casePackage.command_sequence.find((step) => step.step_id === "gold_label_review_report");

    expect(casePackage.artifact_paths).toEqual(
      expect.objectContaining({
        answer_keys_path: "side-inputs/answer-keys.json",
        rubrics_path: "side-inputs/rubrics.json"
      })
    );
    expect(casePackage.evaluation_asset_case).toEqual(
      expect.objectContaining({
        answer_keys_path: "side-inputs/answer-keys.json",
        rubrics_path: "side-inputs/rubrics.json"
      })
    );
    expect(analysisStep).toEqual(
      expect.objectContaining({
        required_inputs: ["artifacts/vision-packet.json", "side-inputs/answer-keys.json", "side-inputs/rubrics.json"]
      })
    );
    expect(analysisStep?.command).toContain("XUEMAI_ANSWER_KEYS=side-inputs/answer-keys.json");
    expect(analysisStep?.command).toContain("XUEMAI_RUBRICS=side-inputs/rubrics.json");
    expect(goldPackageStep?.required_inputs).toEqual([
      "human-review/annotation-import.json",
      "artifacts/vision-packet.json",
      "artifacts/question-segmentation-review.json",
      "side-inputs/answer-keys.json",
      "side-inputs/rubrics.json"
    ]);
    expect(goldPackageStep?.command).toContain("XUEMAI_ANSWER_KEYS=side-inputs/answer-keys.json");
    expect(goldPackageStep?.command).toContain("XUEMAI_RUBRICS=side-inputs/rubrics.json");
    expect(goldReviewStep?.required_inputs).toEqual([
      "human-review/gold-label-package.json",
      "artifacts/vision-packet.json",
      "side-inputs/answer-keys.json",
      "side-inputs/rubrics.json"
    ]);
    expect(goldReviewStep?.command).toContain("XUEMAI_ANSWER_KEYS=side-inputs/answer-keys.json");
    expect(goldReviewStep?.command).toContain("XUEMAI_RUBRICS=side-inputs/rubrics.json");
  });
});

function readDatasetKind(value: string | undefined) {
  if (value === "synthetic" || value === "human_labeled" || value === "mixed") return value;
  return undefined;
}
