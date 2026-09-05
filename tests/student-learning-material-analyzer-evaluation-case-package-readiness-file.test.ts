import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createStudentMonthlyReportFromConfirmedSnapshots,
  type StudentMonthlyReport
} from "../src/skills/monthly-report";
import type { StudentMonthlyReportFileInput } from "../src/skills/monthly-report-files";
import { createStudentLearningMaterialDeliveryBundle } from "../src/skills/student-learning-material-analyzer/delivery-bundle";
import { createDegradedAnalysis } from "../src/skills/student-learning-material-analyzer/degraded-analysis";
import {
  generateStudentLearningMaterialEvaluationAssetManifestFileFromCasesFile
} from "../src/skills/student-learning-material-analyzer/evaluation-asset-manifest-files";
import { generateStudentLearningMaterialEvaluationCasePackage } from "../src/skills/student-learning-material-analyzer/evaluation-case-package-files";
import {
  inspectStudentLearningMaterialEvaluationCasePackage,
  type StudentLearningMaterialEvaluationCasePackageReadiness
} from "../src/skills/student-learning-material-analyzer/evaluation-case-package-readiness-files";
import {
  createGoldLabelPackageFromAnnotationImport,
  type StudentLearningMaterialGoldLabelAnnotationImport
} from "../src/skills/student-learning-material-analyzer/gold-label-annotation-import";
import { buildGoldLabelAnnotationTask } from "../src/skills/student-learning-material-analyzer/gold-label-annotation-task";
import { buildGoldLabelReviewReport } from "../src/skills/student-learning-material-analyzer/gold-label-review-report";
import type { StudentLearningMaterialGoldLabelPackage } from "../src/skills/student-learning-material-analyzer/gold-labeling";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import { createConfirmedMonthlyReportSnapshotCopy } from "../src/skills/student-learning-material-analyzer/monthly-snapshot-archive";
import { buildQuestionSegmentationReview } from "../src/skills/student-learning-material-analyzer/question-segmentation-review";
import {
  createStudentLearningMaterialTeacherReviewPacket
} from "../src/skills/student-learning-material-analyzer/teacher-review-packet";
import type { StudentLearningMaterialAnalysis, VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";
import {
  createStudentLearningMaterialUserFacingResult,
  type StudentLearningMaterialUserFacingResult
} from "../src/skills/student-learning-material-analyzer/user-facing-result";
import {
  createVisionEvidencePacketFromExternalProvider,
  type ExternalVisionAdapterInput
} from "../src/skills/student-learning-material-analyzer/vision-adapter";
import { buildVisionProviderTrialReport } from "../src/skills/student-learning-material-analyzer/vision-provider-trial-report";

const validExternalVisionInputFixturePath =
  "tests/fixtures/student-learning-material-evaluation/provider-adapter/paddleocr-like-external-vision-input.json";

describe("student learning material evaluation case package readiness inspector", () => {
  it("reports missing provider input and blocks 99% claims for a fresh scaffold", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-001",
        datasetId: "real-provider-pilot",
        createdAt: "2026-06-20T18:00:00+08:00"
      });

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });

      expect(readiness.privacy_boundary_ok).toBe(true);
      expect(readiness.artifact_statuses.find((item) => item.path_key === "evaluation_asset_cases_path")?.exists).toBe(true);
      expect(readiness.artifact_group_statuses.find((item) => item.group_id === "human_gold")).toEqual(
        expect.objectContaining({
          status: "missing",
          present_count: 0,
          required_count: 4,
          missing_path_keys: [
            "annotation_task_path",
            "annotation_import_path",
            "gold_label_package_path",
            "gold_label_review_report_path"
          ]
        })
      );
      expect(readiness.command_statuses[0]).toEqual(
        expect.objectContaining({
          step_id: "normalize_external_vision",
          status: "blocked_missing_inputs",
          missing_inputs: ["provider/external-vision-input.json"]
        })
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "provide_missing_input",
          step_id: "normalize_external_vision"
        })
      );
      expect(readiness.claim_readiness).toEqual(
        expect.objectContaining({
          claimable99_from_case_package: false,
          asset_preflight_claimable99_ready: false,
          dataset_eval_required: true
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("case package scaffold alone is not 99% evidence");
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("missing required 99 evidence");
      expect(readiness.report).toContain("claimable99.fromCasePackage=no");
      expect(readiness.report).toContain("checklist.present=");
      expect(readiness.report).toContain("providerRoleCoverageChecklist=missing");
      expect(readiness.report).toContain("claimPolicy.requirements=");
      expect(readiness.report).toContain("minimumRegionOrCurriculumGroups:4");
      expect(readiness.report).toContain("minimumCurriculumVersionFamilies:2");
      expect(readiness.report).toContain("requireExamScopeSignal:true");
      expect(readiness.report).toContain("human_gold:missing:0/4");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces evaluation asset cases drift before manifest generation", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-asset-cases-drift-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-asset-cases-drift",
        datasetId: "real-provider-pilot"
      });
      const casePackage = JSON.parse(await readFile(path.join(tempDir, "case-package.json"), "utf8")) as {
        artifact_paths: { evaluation_asset_cases_path: string };
      };
      const casesPath = path.join(tempDir, casePackage.artifact_paths.evaluation_asset_cases_path);
      const casesFile = JSON.parse(await readFile(casesPath, "utf8")) as {
        dataset_id: string;
        cases: Array<Record<string, unknown>>;
      };
      casesFile.dataset_id = "other-dataset";
      casesFile.cases[0].vision_packet_path = "artifacts/other-vision-packet.json";
      await writeFile(casesPath, `${JSON.stringify(casesFile, null, 2)}\n`, "utf8");

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const assetCasesValidation = readiness.artifact_validation_statuses.find(
        (item) => item.path_key === "evaluation_asset_cases_path"
      );

      expect(assetCasesValidation).toEqual(
        expect.objectContaining({
          validator_id: "evaluation_asset_cases",
          validation_ok: false
        })
      );
      expect(assetCasesValidation?.errors.join(" ")).toContain("dataset_id must match case-package dataset_id");
      expect(assetCasesValidation?.errors.join(" ")).toContain(
        "cases[0].vision_packet_path must match case-package evaluation_asset_case.vision_packet_path"
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("evaluation_asset_cases_path validation must pass");
      expect(readiness.report).toContain("evaluation_asset_cases_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces internal case package artifact path drift before downstream commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-package-path-drift-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-package-path-drift",
        datasetId: "real-provider-pilot"
      });
      const casePackagePath = path.join(tempDir, "case-package.json");
      const casePackage = JSON.parse(await readFile(casePackagePath, "utf8")) as {
        artifact_paths: { vision_packet_path: string };
      };
      casePackage.artifact_paths.vision_packet_path = "artifacts/drifted-vision-packet.json";
      await writeFile(casePackagePath, `${JSON.stringify(casePackage, null, 2)}\n`, "utf8");

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const casePackageValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "case_package");

      expect(casePackageValidation).toEqual(
        expect.objectContaining({
          validator_id: "case_package_artifact_paths",
          validation_ok: false
        })
      );
      expect(casePackageValidation?.errors.join(" ")).toContain(
        "evaluation_asset_case.vision_packet_path must match artifact_paths.vision_packet_path"
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("case_package validation must pass");
      expect(readiness.report).toContain("case_package:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces generated command sequence drift before downstream commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-command-drift-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-command-drift",
        datasetId: "real-provider-pilot"
      });
      const casePackagePath = path.join(tempDir, "case-package.json");
      const casePackage = JSON.parse(await readFile(casePackagePath, "utf8")) as {
        command_sequence: Array<{
          step_id: string;
          outputs: string[];
        }>;
      };
      casePackage.command_sequence[0].outputs = ["artifacts/drifted-vision-packet.json"];
      await writeFile(casePackagePath, `${JSON.stringify(casePackage, null, 2)}\n`, "utf8");

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const commandSequenceValidation = readiness.artifact_validation_statuses.find(
        (item) => item.path_key === "case_package_command_sequence"
      );

      expect(commandSequenceValidation).toEqual(
        expect.objectContaining({
          validator_id: "case_package_command_sequence",
          validation_ok: false
        })
      );
      expect(commandSequenceValidation?.errors.join(" ")).toContain("command_sequence[0].outputs must match generated case-package command sequence");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("case_package_command_sequence validation must pass");
      expect(readiness.report).toContain("case_package_command_sequence:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("points to the next runnable command once provider input is present", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-next-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-002",
        datasetId: "real-provider-pilot"
      });
      await mkdir(path.join(tempDir, "provider"), { recursive: true });
      await writeValidExternalVisionInput(tempDir);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const externalVisionInputValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "external_vision_input_path");

      expect(externalVisionInputValidation).toEqual(
        expect.objectContaining({
          validator_id: "external_vision_adapter_input",
          validation_ok: true
        })
      );

      expect(readiness.command_statuses[0]).toEqual(
        expect.objectContaining({
          step_id: "normalize_external_vision",
          status: "ready_to_run",
          missing_inputs: []
        })
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "run_next_command",
          step_id: "normalize_external_vision"
        })
      );
      expect(readiness.next_action.command).toContain("npm run generate:k12-vision-packet");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid external provider input before normalization commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-provider-input-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-provider-input",
        datasetId: "real-provider-pilot"
      });
      await mkdir(path.join(tempDir, "provider"), { recursive: true });
      await writeFile(path.join(tempDir, "provider/external-vision-input.json"), "{}\n", "utf8");

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const externalVisionInputValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "external_vision_input_path");

      expect(externalVisionInputValidation).toEqual(
        expect.objectContaining({
          validator_id: "external_vision_adapter_input",
          validation_ok: false
        })
      );
      expect(externalVisionInputValidation?.errors.join(" ")).toContain("provider is required");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("external_vision_input_path validation must pass");
      expect(readiness.report).toContain("external_vision_input_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid existing VisionEvidencePacket artifacts before downstream commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-vision-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-vision",
        datasetId: "real-provider-pilot"
      });
      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), createInvalidCrossQuestionVisionPacket());

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const visionValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "vision_packet_path");

      expect(visionValidation).toEqual(
        expect.objectContaining({
          validator_id: "vision_evidence_packet",
          validation_ok: false
        })
      );
      expect(visionValidation?.errors.join(" ")).toContain("region_id=reg_p01_q001 belongs to question_id=q001, not evidence.question_id=q002");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("vision_packet_path validation must pass");
      expect(readiness.report).toContain("vision_packet_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps provider role coverage checklist missing when the packet lacks candidate roles", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-provider-roles-missing-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-provider-roles-missing",
        datasetId: "real-provider-pilot"
      });
      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), createTwoQuestionVisionPacket());

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const roleCoverageChecklist = readiness.checklist_statuses.find(
        (item) => item.item_id === "provider_candidate_role_coverage_document_layout_formula"
      );

      expect(roleCoverageChecklist).toEqual(
        expect.objectContaining({
          evidence_path: "artifacts/vision-packet.json",
          status: "missing"
        })
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "complete_checklist_evidence",
          checklist_item_id: "provider_candidate_role_coverage_document_layout_formula"
        })
      );
      expect(readiness.next_action.reason).toContain("OCR/document-parser, layout, and formula candidates");
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("provider_candidate_role_coverage_document_layout_formula");
      expect(readiness.report).toContain(
        "nextAction=complete_checklist_evidence:provider_candidate_role_coverage_document_layout_formula"
      );
      expect(readiness.report).toContain("providerRoleCoverageChecklist=missing");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("marks provider role coverage checklist present when packet trace has OCR layout and formula candidates", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-provider-roles-present-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-provider-roles-present",
        datasetId: "real-provider-pilot"
      });
      const externalVisionInput = await readValidExternalVisionInputFixture();
      const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const roleCoverageChecklist = readiness.checklist_statuses.find(
        (item) => item.item_id === "provider_candidate_role_coverage_document_layout_formula"
      );

      expect(roleCoverageChecklist).toEqual(
        expect.objectContaining({
          evidence_path: "artifacts/vision-packet.json",
          status: "present"
        })
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "run_next_command",
          step_id: "provider_trial_report"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).not.toContain("provider_candidate_role_coverage_document_layout_formula");
      expect(readiness.report).toContain("providerRoleCoverageChecklist=present");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces VisionEvidencePacket drift from external provider input before downstream commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-provider-drift-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-provider-drift",
        datasetId: "real-provider-pilot"
      });
      const externalVisionInput = await readValidExternalVisionInputFixture();
      const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
      packet.evidences[0].text = "被手工改写的 OCR 证据文本";
      await writeJsonFile(path.join(tempDir, "provider/external-vision-input.json"), externalVisionInput);
      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const externalVisionInputValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "external_vision_input_path");
      const visionValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "vision_packet_path");

      expect(visionValidation).toEqual(
        expect.objectContaining({
          validator_id: "vision_evidence_packet",
          validation_ok: true
        })
      );
      expect(externalVisionInputValidation).toEqual(
        expect.objectContaining({
          validator_id: "external_vision_adapter_input",
          validation_ok: false
        })
      );
      expect(externalVisionInputValidation?.errors.join(" ")).toContain(
        "external_vision_input_path derived evidences must match VisionEvidencePacket evidences"
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("external_vision_input_path validation must pass");
      expect(readiness.report).toContain("external_vision_input_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid question-segmentation review artifacts before human labeling commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-seg-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-segmentation",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacketWithoutSecondCropRef();
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:30:00+08:00"
      });
      segmentationReview.questions[1].status = "pass";
      segmentationReview.questions[1].review_required = false;
      segmentationReview.questions[1].issues = [];

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const segmentationValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "question_segmentation_review_path");

      expect(segmentationValidation).toEqual(
        expect.objectContaining({
          validator_id: "question_segmentation_review",
          validation_ok: false
        })
      );
      expect(segmentationValidation?.errors.join(" ")).toContain("questions[1].status must match VisionEvidencePacket-derived segmentation review");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("question_segmentation_review_path validation must pass");
      expect(readiness.report).toContain("question_segmentation_review_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid provider trial report artifacts before analysis commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-provider-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-provider-report",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:40:00+08:00"
      });
      const providerTrialReport = buildVisionProviderTrialReport(packet, {
        segmentationReview,
        generatedAt: "2026-06-20T18:41:00+08:00"
      });
      providerTrialReport.summary.evidence_count += 1;

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "artifacts/provider-trial-report.json"), providerTrialReport);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const providerValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "provider_trial_report_path");

      expect(providerValidation).toEqual(
        expect.objectContaining({
          validator_id: "vision_provider_trial_report",
          validation_ok: false
        })
      );
      expect(providerValidation?.errors.join(" ")).toContain("summary.evidence_count must match VisionEvidencePacket-derived provider trial report");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("provider_trial_report_path validation must pass");
      expect(readiness.report).toContain("provider_trial_report_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("stops downstream labeling when provider trial readiness is blocked", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-provider-blocked-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-blocked-provider-report",
        datasetId: "real-provider-pilot"
      });
      const externalVisionInput = await readValidExternalVisionInputFixture();
      const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
      packet.material_state = "blank_template";
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:45:00+08:00"
      });
      const providerTrialReport = buildVisionProviderTrialReport(packet, {
        segmentationReview,
        generatedAt: "2026-06-20T18:46:00+08:00"
      });

      expect(providerTrialReport.readiness).toBe("blocked");
      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "artifacts/provider-trial-report.json"), providerTrialReport);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const providerValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "provider_trial_report_path");

      expect(providerValidation).toEqual(
        expect.objectContaining({
          validator_id: "vision_provider_trial_report",
          validation_ok: true
        })
      );
      expect(readiness.provider_trial_readiness).toEqual(
        expect.objectContaining({
          readiness: "blocked",
          path: "artifacts/provider-trial-report.json"
        })
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_provider_trial_readiness"
        })
      );
      expect(readiness.next_action.reason).toContain("material_state=blank_template");
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("provider trial report readiness is blocked");
      expect(readiness.report).toContain("providerTrialReadiness=blocked");
      expect(readiness.report).toContain("nextAction=fix_provider_trial_readiness");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid redacted annotation task artifacts before human labeling commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-annotation-task-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-annotation-task",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:42:00+08:00"
      });
      const annotationTask = buildGoldLabelAnnotationTask(packet, {
        caseId: "real-case-readiness-invalid-annotation-task",
        generatedAt: "2026-06-20T18:43:00+08:00",
        questionSegmentationReview: segmentationReview
      });
      annotationTask.questions[0].evidence_summaries[0].evidence_ref = "missing.evidence.ref";

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "artifacts/annotation-task.json"), annotationTask);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const annotationTaskValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "annotation_task_path");

      expect(annotationTaskValidation).toEqual(
        expect.objectContaining({
          validator_id: "gold_label_annotation_task",
          validation_ok: false
        })
      );
      expect(annotationTaskValidation?.errors.join(" ")).toContain("evidence_summaries references unknown evidence_ref=missing.evidence.ref");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("annotation_task_path validation must pass");
      expect(readiness.report).toContain("annotation_task_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid normalized annotation import artifacts before final gold commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-annotation-import-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-annotation-import",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:44:00+08:00"
      });
      const annotationTask = buildGoldLabelAnnotationTask(packet, {
        caseId: "real-case-readiness-invalid-annotation-import",
        generatedAt: "2026-06-20T18:45:00+08:00",
        questionSegmentationReview: segmentationReview
      });
      const annotationImport = createValidAnnotationImport(packet, "real-case-readiness-invalid-annotation-import");
      const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
      if (!leakedEvidence?.raw_ocr_text) throw new Error("Expected fixture evidence with raw OCR text");
      if (!annotationImport.annotation_tool) throw new Error("Expected annotation tool metadata");
      annotationImport.annotation_tool.notes = [`tool note copied source text: ${leakedEvidence.raw_ocr_text}`];

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "artifacts/annotation-task.json"), annotationTask);
      await writeJsonFile(path.join(tempDir, "human-review/annotation-import.json"), annotationImport);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const annotationImportValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "annotation_import_path");

      expect(annotationImportValidation).toEqual(
        expect.objectContaining({
          validator_id: "gold_label_annotation_import",
          validation_ok: false
        })
      );
      expect(annotationImportValidation?.errors.join(" ")).toContain("annotation import notes must not include OCR/text content copied");
      expect(annotationImportValidation?.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
      expect(annotationImportValidation?.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("annotation_import_path validation must pass");
      expect(readiness.report).toContain("annotation_import_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid final gold label package artifacts before analysis commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-gold-package-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-gold-package",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:46:00+08:00"
      });
      const annotationTask = buildGoldLabelAnnotationTask(packet, {
        caseId: "real-case-readiness-invalid-gold-package",
        generatedAt: "2026-06-20T18:47:00+08:00",
        questionSegmentationReview: segmentationReview
      });
      const annotationImport = createValidAnnotationImport(packet, "real-case-readiness-invalid-gold-package");
      const goldLabelPackage = createValidGoldLabelPackage(packet, segmentationReview, annotationImport);
      goldLabelPackage.labels[0].question_evidence_basis[0].student_trace_evidence_refs = ["missing.evidence.ref"];

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "artifacts/annotation-task.json"), annotationTask);
      await writeJsonFile(path.join(tempDir, "human-review/annotation-import.json"), annotationImport);
      await writeJsonFile(path.join(tempDir, "human-review/gold-label-package.json"), goldLabelPackage);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const goldPackageValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "gold_label_package_path");

      expect(goldPackageValidation).toEqual(
        expect.objectContaining({
          validator_id: "gold_label_package",
          validation_ok: false
        })
      );
      expect(goldPackageValidation?.errors.join(" ")).toContain("evidence_ref=missing.evidence.ref missing from VisionEvidencePacket");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("gold_label_package_path validation must pass");
      expect(readiness.report).toContain("gold_label_package_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces final gold packages whose human label provenance no longer matches annotation import", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-gold-provenance-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-gold-provenance-mismatch",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:46:10+08:00"
      });
      const annotationImport = createValidAnnotationImport(packet, "real-case-readiness-gold-provenance-mismatch");
      const goldLabelPackage = createValidGoldLabelPackage(packet, segmentationReview, annotationImport);
      goldLabelPackage.labels[0].reviewer_id = "reviewer-reassigned";

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "human-review/annotation-import.json"), annotationImport);
      await writeJsonFile(path.join(tempDir, "human-review/gold-label-package.json"), goldLabelPackage);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const goldPackageValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "gold_label_package_path");

      expect(goldPackageValidation).toEqual(
        expect.objectContaining({
          validator_id: "gold_label_package",
          validation_ok: false
        })
      );
      expect(goldPackageValidation?.errors.join(" ")).toContain("gold_label_package_path must match package regenerated from annotation_import_path");
      expect(goldPackageValidation?.errors.join(" ")).toContain("gold_label_package_path labels must match package regenerated from annotation_import_path");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("gold_label_package_path validation must pass");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects final gold packages whose side-input answer basis is mapped to another question", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-gold-side-input-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-cross-gold-side-input",
        datasetId: "real-provider-pilot"
      });
      await addSideInputAnswerKeyPath(tempDir);
      const packet = createTwoQuestionVisionPacket();
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:46:30+08:00"
      });
      const annotationImport = createValidAnnotationImport(packet, "real-case-readiness-cross-gold-side-input");
      const goldLabelPackage = createValidGoldLabelPackage(packet, segmentationReview, annotationImport);
      goldLabelPackage.labels.forEach((label) => {
        label.question_evidence_basis[0].answer_key_or_rubric_evidence_refs = ["side_input.answer_key.q002"];
      });

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "side-inputs/answer-keys.json"), [
        { question_id: "q001", answer: "第 1 题外部答案依据。" },
        { question_id: "q002", answer: "第 2 题外部答案依据。" }
      ]);
      await writeJsonFile(path.join(tempDir, "human-review/gold-label-package.json"), goldLabelPackage);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const goldPackageValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "gold_label_package_path");

      expect(goldPackageValidation).toEqual(
        expect.objectContaining({
          validator_id: "gold_label_package",
          validation_ok: false
        })
      );
      expect(goldPackageValidation?.errors.join(" ")).toContain(
        "labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] side_input evidence_ref is not mapped to question_id=q001: side_input.answer_key.q002"
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("gold_label_package_path validation must pass");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid gold label review report artifacts before analysis commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-gold-review-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-gold-review",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:48:00+08:00"
      });
      const annotationTask = buildGoldLabelAnnotationTask(packet, {
        caseId: "real-case-readiness-invalid-gold-review",
        generatedAt: "2026-06-20T18:49:00+08:00",
        questionSegmentationReview: segmentationReview
      });
      const annotationImport = createValidAnnotationImport(packet, "real-case-readiness-invalid-gold-review");
      const goldLabelPackage = createValidGoldLabelPackage(packet, segmentationReview, annotationImport);
      const reviewReport = buildGoldLabelReviewReport(goldLabelPackage, {
        generatedAt: "2026-06-20T18:50:00+08:00",
        sourcePacket: packet
      });
      reviewReport.readiness.ready_for_99_evaluation = false;
      reviewReport.readiness.blockers = ["manual blocker should not be accepted"];

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "artifacts/annotation-task.json"), annotationTask);
      await writeJsonFile(path.join(tempDir, "human-review/annotation-import.json"), annotationImport);
      await writeJsonFile(path.join(tempDir, "human-review/gold-label-package.json"), goldLabelPackage);
      await writeJsonFile(path.join(tempDir, "human-review/gold-label-review-report.json"), reviewReport);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const goldReviewValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "gold_label_review_report_path");

      expect(goldReviewValidation).toEqual(
        expect.objectContaining({
          validator_id: "gold_label_review_report",
          validation_ok: false
        })
      );
      expect(goldReviewValidation?.errors.join(" ")).toContain("readiness.ready_for_99_evaluation must match gold label package validation");
      expect(goldReviewValidation?.errors.join(" ")).toContain("gold_label_review_report_path must be ready_for_99_evaluation");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("gold_label_review_report_path validation must pass");
      expect(readiness.report).toContain("gold_label_review_report_path:fail");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("validates analysis side-input answer refs against declared case-package answer keys", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-side-input-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-side-input",
        datasetId: "real-provider-pilot"
      });
      await addSideInputAnswerKeyPath(tempDir);
      const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_side_input",
        studentId: "student_readiness_side_input",
        teacherId: "teacher_readiness_side_input",
        tenantId: "tenant_readiness_side_input"
      });
      const analysis = createValidAnalysisArtifact(packet);
      analysis.question_analyses[0].correctnessJudgement = {
        status: "partially_correct",
        source_basis: "answer_key",
        explanation: "外部答案键按 q001 映射后，可以作为第 1 题正误依据。",
        evidenceRefs: ["side_input.answer_key.q001"],
        confidence: 0.86
      };
      analysis.question_analyses[0].confidence = 0.86;

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "side-inputs/answer-keys.json"), [{ question_id: "q001", answer: "第 1 题外部答案依据。" }]);
      await writeJsonFile(path.join(tempDir, "artifacts/analysis.json"), analysis);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const answerKeyValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "answer_keys_path");
      const analysisValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "analysis_path");

      expect(answerKeyValidation).toEqual(
        expect.objectContaining({
          validator_id: "answer_keys_side_input",
          validation_ok: true
        })
      );
      expect(analysisValidation).toEqual(
        expect.objectContaining({
          validator_id: "student_learning_material_analysis",
          validation_ok: true
        })
      );
      expect(analysisValidation?.errors.join(" ")).not.toContain("side_input.answer_key.q001");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects declared answer side inputs whose question_id is not in the VisionEvidencePacket", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-bad-side-input-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-bad-side-input",
        datasetId: "real-provider-pilot"
      });
      await addSideInputAnswerKeyPath(tempDir);
      const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_readiness_bad_side_input",
        studentId: "student_readiness_bad_side_input",
        teacherId: "teacher_readiness_bad_side_input",
        tenantId: "tenant_readiness_bad_side_input"
      });

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "side-inputs/answer-keys.json"), [{ question_id: "q999", answer: "不存在题号的答案。" }]);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const answerKeyValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "answer_keys_path");

      expect(answerKeyValidation).toEqual(
        expect.objectContaining({
          validator_id: "answer_keys_side_input",
          validation_ok: false
        })
      );
      expect(answerKeyValidation?.errors.join(" ")).toContain("answer_keys_path[0] question_id=q999 does not exist in VisionEvidencePacket");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("answer_keys_path validation must pass");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("blocks delivery until monthly report input is prepared", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-monthly-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-monthly",
        datasetId: "real-provider-pilot"
      });
      const sourcePacket = createTwoQuestionVisionPacket();
      const externalVisionInput = createExternalVisionInputFromPacket(sourcePacket);
      const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
      const segmentationReview = buildQuestionSegmentationReview(packet, {
        generatedAt: "2026-06-20T18:50:00+08:00"
      });
      const providerTrialReport = buildVisionProviderTrialReport(packet, {
        segmentationReview,
        generatedAt: "2026-06-20T18:51:00+08:00"
      });
      const annotationTask = buildGoldLabelAnnotationTask(packet, {
        caseId: "real-case-readiness-monthly",
        generatedAt: "2026-06-20T18:52:00+08:00",
        questionSegmentationReview: segmentationReview
      });
      const annotationImport = createValidAnnotationImport(packet, "real-case-readiness-monthly");
      const goldLabelPackage = createValidGoldLabelPackage(packet, segmentationReview, annotationImport);
      const goldLabelReviewReport = buildGoldLabelReviewReport(goldLabelPackage, {
        generatedAt: "2026-06-20T18:56:00+08:00",
        sourcePacket: packet
      });
      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "provider/external-vision-input.json"), externalVisionInput);
      await writeJsonFile(path.join(tempDir, "artifacts/question-segmentation-review.json"), segmentationReview);
      await writeJsonFile(path.join(tempDir, "artifacts/provider-trial-report.json"), providerTrialReport);
      await writeJsonFile(path.join(tempDir, "artifacts/annotation-task.json"), annotationTask);
      await writeJsonFile(path.join(tempDir, "human-review/annotation-import.json"), annotationImport);
      await writeJsonFile(path.join(tempDir, "human-review/gold-label-package.json"), goldLabelPackage);
      await writeJsonFile(path.join(tempDir, "human-review/gold-label-review-report.json"), goldLabelReviewReport);
      await writeValidAnalysisAndResultArtifacts(tempDir, packet);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });

      expect(readiness.artifact_group_statuses.find((item) => item.group_id === "human_gold")).toEqual(
        expect.objectContaining({
          status: "complete",
          present_count: 4,
          required_count: 4,
          missing_path_keys: []
        })
      );
      expect(readiness.artifact_group_statuses.find((item) => item.group_id === "monthly_comparison")).toEqual(
        expect.objectContaining({
          status: "missing",
          missing_path_keys: ["monthly_report_input_path", "monthly_report_path"]
        })
      );
      expect(readiness.command_statuses.find((step) => step.step_id === "monthly_report")).toEqual(
        expect.objectContaining({
          status: "blocked_missing_inputs",
          missing_inputs: ["human-review/monthly-report-input.json"],
          missing_outputs: ["artifacts/monthly-report.json"]
        })
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "provide_missing_input",
          step_id: "monthly_report"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("monthly_report_input_prepared_with_previous_month_evidence");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("replays a complete case package chain up to formal asset manifest generation", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-complete-chain-"));
    try {
      const caseId = "real-case-readiness-complete-chain";
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId,
        datasetId: "real-provider-pilot"
      });
      await writeCompleteCasePackageChainArtifacts(tempDir, caseId);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const failedValidations = readiness.artifact_validation_statuses.filter((status) => !status.validation_ok);

      expect(failedValidations).toEqual([]);
      expect(readiness.artifact_group_statuses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ group_id: "ocr_vision", status: "complete" }),
          expect.objectContaining({ group_id: "question_segmentation", status: "complete" }),
          expect.objectContaining({ group_id: "human_gold", status: "complete" }),
          expect.objectContaining({ group_id: "analysis_result", status: "complete" }),
          expect.objectContaining({ group_id: "monthly_comparison", status: "complete" }),
          expect.objectContaining({ group_id: "teacher_delivery", status: "complete" }),
          expect.objectContaining({ group_id: "asset_manifest", status: "complete" })
        ])
      );
      expect(readiness.command_statuses.filter((step) => step.step_id !== "evaluation_asset_manifest")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ step_id: "normalize_external_vision", status: "complete" }),
          expect.objectContaining({ step_id: "gold_label_package", status: "complete" }),
          expect.objectContaining({ step_id: "monthly_report", status: "complete" }),
          expect.objectContaining({ step_id: "teacher_review_packet", status: "complete" })
        ])
      );
      expect(readiness.command_statuses.find((step) => step.step_id === "evaluation_asset_manifest")).toEqual(
        expect.objectContaining({
          status: "ready_to_run",
          missing_inputs: [],
          missing_outputs: ["evaluation-assets.json"]
        })
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "run_next_command",
          step_id: "evaluation_asset_manifest"
        })
      );
      expect(readiness.next_action.command).toContain("npm run generate:k12-eval-assets-manifest");
      expect(readiness.claim_readiness.claimable99_from_case_package).toBe(false);
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("evaluation-assets.json must be generated and validated");
      expect(readiness.report).toContain("nextAction=run_next_command:evaluation_asset_manifest");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("replays the generated evaluation asset manifest and surfaces asset preflight blockers", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-asset-preflight-"));
    try {
      const caseId = "real-case-readiness-asset-preflight";
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId,
        datasetId: "real-provider-pilot"
      });
      await writeCompleteCasePackageChainArtifacts(tempDir, caseId);

      const manifestPath = path.join(tempDir, "evaluation-assets.json");
      const manifestGeneration = await generateStudentLearningMaterialEvaluationAssetManifestFileFromCasesFile({
        casesInputPath: path.join(tempDir, "evaluation-assets.cases.json"),
        manifestOutputPath: manifestPath
      });
      expect(manifestGeneration.validationOk, manifestGeneration.validationReport).toBe(true);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });

      expect(readiness.command_statuses.find((step) => step.step_id === "evaluation_asset_manifest")).toEqual(
        expect.objectContaining({
          status: "complete",
          missing_inputs: [],
          missing_outputs: [],
          outputs_present: ["evaluation-assets.json"]
        })
      );
      expect(readiness.asset_preflight).toEqual(
        expect.objectContaining({
          exists: true,
          validation_ok: true,
          claimable99AssetReady: false
        })
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_asset_preflight"
        })
      );
      expect(readiness.next_action.reason).toContain("human_labeled 资产包含 mock/synthetic Vision source");
      expect(readiness.claim_readiness).toEqual(
        expect.objectContaining({
          claimable99_from_case_package: false,
          asset_preflight_claimable99_ready: false,
          dataset_eval_required: true
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("样本数不足");
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("human_labeled 资产包含 mock/synthetic Vision source");
      expect(readiness.report).toContain("nextAction=fix_asset_preflight");
      expect(readiness.report).toContain("assetPreflight.exists=yes");
      expect(readiness.report).toContain("assetPreflight.claimable99AssetReady=no");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid monthly report artifacts before delivery commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-monthly-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-monthly-report",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const { analysis, result } = await writeValidAnalysisAndResultArtifacts(tempDir, packet);
      const { monthlyReportInput, monthlyReport } = createValidMonthlyReportArtifacts(analysis);
      monthlyReport.comparison_evidence.previous_month_source_count = monthlyReport.comparison_evidence.previous_month_source_ids.length + 1;

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "human-review/monthly-report-input.json"), monthlyReportInput);
      await writeJsonFile(path.join(tempDir, "artifacts/monthly-report.json"), monthlyReport);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const monthlyValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "monthly_report_path");

      expect(result.monthly_result.month).toBe(analysis.monthly_report_snapshot.month);
      expect(monthlyValidation).toEqual(
        expect.objectContaining({
          validator_id: "student_monthly_report",
          validation_ok: false
        })
      );
      expect(monthlyValidation?.errors.join(" ")).toContain("comparison_evidence.previous_month_source_count must match previous_month_source_ids length");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("monthly_report_path validation must pass");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces monthly reports whose source ids do not match the replayable monthly input", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-monthly-source-id-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-monthly-source-id-mismatch",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const { analysis } = await writeValidAnalysisAndResultArtifacts(tempDir, packet);
      const { monthlyReportInput, monthlyReport } = createValidMonthlyReportArtifacts(analysis);
      monthlyReport.evidence_timeline[0].id = "wrong-current-source-id";
      monthlyReport.comparison_evidence.previous_month_source_ids = ["wrong-previous-source-id"];

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "human-review/monthly-report-input.json"), monthlyReportInput);
      await writeJsonFile(path.join(tempDir, "artifacts/monthly-report.json"), monthlyReport);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const monthlyValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "monthly_report_path");

      expect(monthlyValidation).toEqual(
        expect.objectContaining({
          validator_id: "student_monthly_report",
          validation_ok: false
        })
      );
      expect(monthlyValidation?.errors.join(" ")).toContain("evidence_timeline source ids must match monthly_report_input_path current source ids");
      expect(monthlyValidation?.errors.join(" ")).toContain(
        "comparison_evidence.previous_month_source_ids must match monthly_report_input_path previous source ids"
      );
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("monthly_report_path validation must pass");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid delivery bundle artifacts before teacher review commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-delivery-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-delivery",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const { analysis, result } = await writeValidAnalysisAndResultArtifacts(tempDir, packet);
      const { monthlyReportInput, monthlyReport } = createValidMonthlyReportArtifacts(analysis);
      const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
        result,
        monthlyReport,
        generatedAt: "2026-06-20T19:10:00+08:00"
      });
      deliveryBundle.teacher_delivery.question_rows = [];

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "human-review/monthly-report-input.json"), monthlyReportInput);
      await writeJsonFile(path.join(tempDir, "artifacts/monthly-report.json"), monthlyReport);
      await writeJsonFile(path.join(tempDir, "artifacts/delivery-bundle.json"), deliveryBundle);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const deliveryValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "delivery_bundle_path");

      expect(deliveryValidation).toEqual(
        expect.objectContaining({
          validator_id: "student_learning_material_delivery_bundle",
          validation_ok: false
        })
      );
      expect(deliveryValidation?.errors.join(" ")).toContain("teacher_delivery.question_rows must not be empty");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("delivery_bundle_path validation must pass");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("surfaces invalid teacher review packet artifacts before asset manifest commands", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-review-invalid-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-invalid-teacher-review",
        datasetId: "real-provider-pilot"
      });
      const packet = createTwoQuestionVisionPacket();
      const { analysis, result } = await writeValidAnalysisAndResultArtifacts(tempDir, packet);
      const { monthlyReportInput, monthlyReport } = createValidMonthlyReportArtifacts(analysis);
      const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
        result,
        monthlyReport,
        generatedAt: "2026-06-20T19:20:00+08:00"
      });
      const teacherReviewPacket = createStudentLearningMaterialTeacherReviewPacket({
        deliveryBundle,
        skillRunId: "skill-run-readiness-review-invalid",
        generatedAt: "2026-06-20T19:21:00+08:00"
      });
      teacherReviewPacket.review_actions.find((action) => action.action_id === "copy_parent_feedback")!.enabled = true;

      await writeJsonFile(path.join(tempDir, "artifacts/vision-packet.json"), packet);
      await writeJsonFile(path.join(tempDir, "human-review/monthly-report-input.json"), monthlyReportInput);
      await writeJsonFile(path.join(tempDir, "artifacts/monthly-report.json"), monthlyReport);
      await writeJsonFile(path.join(tempDir, "artifacts/delivery-bundle.json"), deliveryBundle);
      await writeJsonFile(path.join(tempDir, "artifacts/teacher-review-packet.json"), teacherReviewPacket);

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });
      const teacherReviewValidation = readiness.artifact_validation_statuses.find((item) => item.path_key === "teacher_review_packet_path");

      expect(teacherReviewValidation).toEqual(
        expect.objectContaining({
          validator_id: "student_learning_material_teacher_review_packet",
          validation_ok: false
        })
      );
      expect(teacherReviewValidation?.errors.join(" ")).toContain("review_actions.copy_parent_feedback.enabled must match delivery bundle review blockers");
      expect(readiness.next_action).toEqual(
        expect.objectContaining({
          status: "fix_artifact_validation"
        })
      );
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("teacher_review_packet_path validation must pass");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("flags raw material directories inside the case package", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-privacy-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-003",
        datasetId: "real-provider-pilot"
      });
      await mkdir(path.join(tempDir, "raw-images"));

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });

      expect(readiness.privacy_boundary_ok).toBe(false);
      expect(readiness.next_action.status).toBe("fix_privacy_boundary");
      expect(readiness.privacy_errors.join(" ")).toContain("raw-images");
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("raw-images");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("flags nested raw material directories and image/pdf files inside the case package", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-case-readiness-privacy-files-"));
    try {
      await generateStudentLearningMaterialEvaluationCasePackage({
        packageDir: tempDir,
        caseId: "real-case-readiness-privacy-files",
        datasetId: "real-provider-pilot"
      });
      await mkdir(path.join(tempDir, "artifacts/review/source-images"), { recursive: true });
      await mkdir(path.join(tempDir, "human-review"), { recursive: true });
      await writeFile(path.join(tempDir, "human-review/student-page.jpg"), "fake raw student page image", "utf8");
      await writeFile(path.join(tempDir, "artifacts/source-material.pdf"), "fake raw student pdf", "utf8");

      const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({ packageDir: tempDir });

      expect(readiness.privacy_boundary_ok).toBe(false);
      expect(readiness.next_action.status).toBe("fix_privacy_boundary");
      expect(readiness.privacy_errors.join(" ")).toContain("artifacts/review/source-images");
      expect(readiness.privacy_errors.join(" ")).toContain("human-review/student-page.jpg");
      expect(readiness.privacy_errors.join(" ")).toContain("artifacts/source-material.pdf");
      expect(readiness.claim_readiness.blockers.join(" ")).toContain("case package must not contain raw student material files");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("inspects the case package specified by env vars", async () => {
    const packageDir = process.env.XUEMAI_EVAL_CASE_PACKAGE_READINESS_DIR;
    const casePackagePath = process.env.XUEMAI_EVAL_CASE_PACKAGE_READINESS_PATH;

    if (!packageDir && !casePackagePath) {
      if (process.env.XUEMAI_EVAL_CASE_PACKAGE_READINESS_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_EVAL_CASE_PACKAGE_READINESS_DIR=/absolute/path/to/case-dir or XUEMAI_EVAL_CASE_PACKAGE_READINESS_PATH=/absolute/path/to/case-package.json"
        );
      }
      expect(packageDir || casePackagePath).toBeUndefined();
      return;
    }

    const readiness = await inspectStudentLearningMaterialEvaluationCasePackage({
      packageDir,
      casePackagePath,
      assetManifestPath: process.env.XUEMAI_EVAL_CASE_PACKAGE_READINESS_ASSET_MANIFEST,
      outputPath: process.env.XUEMAI_EVAL_CASE_PACKAGE_READINESS_OUTPUT
    });

    console.log(`\n${readiness.report}`);
    if (process.env.XUEMAI_EVAL_CASE_PACKAGE_READINESS_OUTPUT) {
      const output = JSON.parse(await readFile(process.env.XUEMAI_EVAL_CASE_PACKAGE_READINESS_OUTPUT, "utf8")) as StudentLearningMaterialEvaluationCasePackageReadiness;
      expect(output.case_id).toBe(readiness.case_id);
    }
    expect(readiness.claim_readiness.claimable99_from_case_package).toBe(false);
  });
});

async function writeValidExternalVisionInput(baseDir: string) {
  await mkdir(path.join(baseDir, "provider"), { recursive: true });
  await writeFile(
    path.join(baseDir, "provider/external-vision-input.json"),
    await readFile(validExternalVisionInputFixturePath, "utf8"),
    "utf8"
  );
}

async function readValidExternalVisionInputFixture(): Promise<ExternalVisionAdapterInput> {
  return JSON.parse(await readFile(validExternalVisionInputFixturePath, "utf8")) as ExternalVisionAdapterInput;
}

function createExternalVisionInputFromPacket(packet: VisionEvidencePacket): ExternalVisionAdapterInput {
  return {
    provider: packet.plugin_provider,
    providerRunId: packet.plugin_run_id,
    providerModelVersion: packet.plugin_model_version,
    materialId: packet.material_id,
    sourceMaterialId: packet.source_material_id,
    studentId: packet.student_id,
    teacherId: packet.teacher_id,
    tenantId: packet.tenant_id,
    studentIdentityStatus: packet.student_identity_status,
    sourceKind: packet.pipeline_trace?.preprocessing?.source_kind ?? "image",
    createdAt: packet.created_at,
    materialStateHint: packet.material_state,
    pages: packet.pages.map((page) => ({
      page_id: page.page_id,
      page_index: page.page_index,
      page_image_ref: page.page_image_ref,
      width: page.width,
      height: page.height,
      image_quality_confidence: page.image_quality_confidence,
      quality_flags: page.quality_flags
    })),
    questions: packet.questions.map((question) => ({
      question_id: question.question_id,
      question_number: question.question_number,
      question_type_candidate: question.question_type_candidate,
      page_id: question.page_id,
      regions: question.regions.map((region) => ({
        region_id: region.region_id,
        region_role: region.region_role,
        page_id: region.page_id,
        bbox: region.bbox,
        polygon: region.polygon,
        crop_ref: region.crop_ref,
        confidence: region.confidence
      })),
      evidences: packet.evidences
        .filter((evidence) => evidence.question_id === question.question_id)
        .map((evidence) => ({
          evidence_id: evidence.evidence_id,
          evidence_ref: evidence.evidence_ref,
          evidence_type: evidence.evidence_type,
          text: evidence.text,
          raw_ocr_text: evidence.raw_ocr_text,
          normalized_text: evidence.normalized_text,
          page_id: evidence.page_id,
          question_id: evidence.question_id,
          region_id: evidence.region_id,
          bbox: evidence.bbox,
          polygon: evidence.polygon,
          crop_ref: evidence.crop_ref,
          confidence: evidence.confidence,
          teacher_verified: evidence.teacher_verified,
          risk_flags: evidence.risk_flags
        })),
      confidence: question.confidence,
      risk_flags: question.risk_flags
    })),
    pluginErrors: packet.plugin_errors,
    metadata: packet.metadata
  };
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeCompleteCasePackageChainArtifacts(baseDir: string, caseId: string) {
  const sourcePacket = createTwoQuestionVisionPacket();
  const externalVisionInput = createExternalVisionInputFromPacket(sourcePacket);
  const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
  const segmentationReview = buildQuestionSegmentationReview(packet, {
    generatedAt: "2026-06-20T19:30:00+08:00"
  });
  const providerTrialReport = buildVisionProviderTrialReport(packet, {
    segmentationReview,
    generatedAt: "2026-06-20T19:31:00+08:00"
  });
  const annotationTask = buildGoldLabelAnnotationTask(packet, {
    caseId,
    generatedAt: "2026-06-20T19:32:00+08:00",
    questionSegmentationReview: segmentationReview
  });
  const annotationImport = createValidAnnotationImport(packet, caseId);
  const goldLabelPackage = createValidGoldLabelPackage(packet, segmentationReview, annotationImport);
  const goldLabelReviewReport = buildGoldLabelReviewReport(goldLabelPackage, {
    generatedAt: "2026-06-20T19:33:00+08:00",
    sourcePacket: packet
  });
  const { analysis, result } = await writeValidAnalysisAndResultArtifacts(baseDir, packet);
  const { monthlyReportInput, monthlyReport } = createValidMonthlyReportArtifacts(analysis);
  const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
    result,
    monthlyReport,
    generatedAt: "2026-06-20T19:34:00+08:00"
  });
  const teacherReviewPacket = createStudentLearningMaterialTeacherReviewPacket({
    deliveryBundle,
    skillRunId: `skill-run-${caseId}`,
    generatedAt: "2026-06-20T19:35:00+08:00"
  });

  await writeJsonFile(path.join(baseDir, "provider/external-vision-input.json"), externalVisionInput);
  await writeJsonFile(path.join(baseDir, "artifacts/vision-packet.json"), packet);
  await writeJsonFile(path.join(baseDir, "artifacts/provider-trial-report.json"), providerTrialReport);
  await writeJsonFile(path.join(baseDir, "artifacts/question-segmentation-review.json"), segmentationReview);
  await writeJsonFile(path.join(baseDir, "artifacts/annotation-task.json"), annotationTask);
  await writeJsonFile(path.join(baseDir, "human-review/annotation-import.json"), annotationImport);
  await writeJsonFile(path.join(baseDir, "human-review/gold-label-package.json"), goldLabelPackage);
  await writeJsonFile(path.join(baseDir, "human-review/gold-label-review-report.json"), goldLabelReviewReport);
  await writeJsonFile(path.join(baseDir, "human-review/monthly-report-input.json"), monthlyReportInput);
  await writeJsonFile(path.join(baseDir, "artifacts/monthly-report.json"), monthlyReport);
  await writeJsonFile(path.join(baseDir, "artifacts/delivery-bundle.json"), deliveryBundle);
  await writeJsonFile(path.join(baseDir, "artifacts/teacher-review-packet.json"), teacherReviewPacket);
}

async function addSideInputAnswerKeyPath(baseDir: string) {
  const casePackagePath = path.join(baseDir, "case-package.json");
  const casePackage = JSON.parse(await readFile(casePackagePath, "utf8"));
  casePackage.artifact_paths.answer_keys_path = "side-inputs/answer-keys.json";
  casePackage.evaluation_asset_case.answer_keys_path = "side-inputs/answer-keys.json";
  await writeJsonFile(casePackagePath, casePackage);
}

async function writeValidAnalysisAndResultArtifacts(baseDir: string, packet: VisionEvidencePacket): Promise<{
  analysis: StudentLearningMaterialAnalysis;
  result: StudentLearningMaterialUserFacingResult;
}> {
  const analysis = createValidAnalysisArtifact(packet);
  const result = createStudentLearningMaterialUserFacingResult(analysis);
  await writeJsonFile(path.join(baseDir, "artifacts/analysis.json"), analysis);
  await writeJsonFile(path.join(baseDir, "artifacts/result.json"), result);
  return { analysis, result };
}

function createValidAnalysisArtifact(packet: VisionEvidencePacket): StudentLearningMaterialAnalysis {
  const analysis = createDegradedAnalysis({
    analysisId: `analysis-${packet.material_id}`,
    packet,
    reasons: ["answer_key_missing"],
    message: "Readiness fixture uses a source-aligned teacher-review draft."
  });
  return {
    ...analysis,
    material_classification: {
      ...analysis.material_classification,
      material_type: "exam",
      subject: "数学",
      education_stage: "middle",
      grade_candidate: "初二",
      region_or_curriculum_candidate: "未识别"
    }
  };
}

function createValidMonthlyReportArtifacts(analysis: StudentLearningMaterialAnalysis): {
  monthlyReportInput: StudentMonthlyReportFileInput;
  monthlyReport: StudentMonthlyReport;
} {
  const currentSnapshot = createConfirmedMonthlyReportSnapshotCopy({
    analysis,
    teacherId: "teacher-readiness",
    sourceSkillRunId: "skill-run-readiness-monthly",
    archiveRecordId: "archive-readiness-monthly",
    confirmedAt: "2026-06-20T19:00:00+08:00"
  });
  if (!currentSnapshot.ok) throw new Error(`Expected valid confirmed monthly snapshot: ${currentSnapshot.errors.join("；")}`);
  const previousMonth = getPreviousMonth(analysis.monthly_report_snapshot.month);
  const previousSnapshot = {
    ...currentSnapshot.snapshot,
    source_analysis_id: `${currentSnapshot.snapshot.source_analysis_id}-previous`,
    month: previousMonth,
    material_date: `${previousMonth}-20`,
    score_summary: "上月主要依据显示需要关注条件提取与表达完整性。",
    main_progress_signal: "能完成基础任务",
    main_issue_signal: "条件提取与表达完整性需要关注",
    first_priority_action: "延续题干条件标注训练",
    parent_visible_summary: "上月主要关注条件提取和表达完整性。",
    evidenceRefs: ["previous-month-readiness-evidence"],
    confirmed_at: `${previousMonth}-20T19:00:00+08:00`,
    source_skill_run_id: "skill-run-readiness-monthly-previous",
    archive_record_id: "archive-readiness-monthly-previous"
  };
  const monthlyReportInput: StudentMonthlyReportFileInput = {
    fixture_schema: "student_monthly_report_input.v0.1",
    student_id: analysis.student_id,
    student_name: "脱敏学生",
    current_month: analysis.monthly_report_snapshot.month,
    previous_month: previousMonth,
    subject_area: analysis.material_classification.subject,
    snapshots: [currentSnapshot.snapshot],
    previous_month_snapshots: [previousSnapshot],
    lesson_count: 4,
    feedback_count: 2,
    archived_record_count: 1
  };
  const monthlyReport = createStudentMonthlyReportFromConfirmedSnapshots({
    studentId: monthlyReportInput.student_id,
    studentName: monthlyReportInput.student_name,
    currentMonth: monthlyReportInput.current_month,
    previousMonth: monthlyReportInput.previous_month,
    subjectArea: monthlyReportInput.subject_area,
    snapshots: monthlyReportInput.snapshots || [],
    previousMonthSnapshots: monthlyReportInput.previous_month_snapshots,
    lessonCount: monthlyReportInput.lesson_count,
    feedbackCount: monthlyReportInput.feedback_count,
    archivedRecordCount: monthlyReportInput.archived_record_count
  });
  return { monthlyReportInput, monthlyReport };
}

function getPreviousMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return "2026-05";
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  const previousDate = new Date(Date.UTC(year, monthIndex - 2, 1));
  return `${previousDate.getUTCFullYear()}-${String(previousDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

function createInvalidCrossQuestionVisionPacket() {
  const packet = createTwoQuestionVisionPacket();
  const q002Evidence = packet.evidences.find((evidence) => evidence.question_id === "q002");
  if (!q002Evidence) throw new Error("Expected q002 evidence");
  q002Evidence.region_id = "reg_p01_q001";
  return packet;
}

function createTwoQuestionVisionPacketWithoutSecondCropRef() {
  const packet = createTwoQuestionVisionPacket();
  const q002Region = packet.questions.find((question) => question.question_id === "q002")?.regions[0];
  if (!q002Region) throw new Error("Expected q002 region");
  delete q002Region.crop_ref;
  return packet;
}

function createTwoQuestionVisionPacket(): VisionEvidencePacket {
  const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
    materialId: "mat_readiness_vision_001",
    studentId: "student_readiness_001",
    teacherId: "teacher_readiness_001",
    tenantId: "tenant_readiness_001"
  });
  const q002Region = {
    region_id: "reg_p01_q002",
    region_role: "question_region" as const,
    page_id: "p01",
    bbox: { x1: 0.1, y1: 0.58, x2: 0.88, y2: 0.78, coord_space: "normalized" as const },
    crop_ref: `crop://${packet.material_id}/p01/q002`,
    confidence: 0.88
  };
  return {
    ...packet,
    questions: [
      ...packet.questions,
      {
        question_id: "q002",
        question_number: "2",
        question_type_candidate: "open_response",
        page_id: "p01",
        regions: [q002Region],
        confidence: 0.88,
        risk_flags: []
      }
    ],
    evidences: [
      ...packet.evidences,
      {
        evidence_id: "ev_readiness_q002_answer_001",
        evidence_ref: `material.${packet.material_id}.page_p01.question_q002.ev_readiness_q002_answer_001`,
        source_material_id: packet.source_material_id,
        page_id: "p01",
        question_id: "q002",
        region_id: "reg_p01_q002",
        evidence_type: "student_original_answer",
        text: "第 2 题学生作答可见。",
        raw_ocr_text: "第 2 题学生作答可见。",
        normalized_text: "第 2 题学生作答可见。",
        bbox: { x1: 0.12, y1: 0.6, x2: 0.82, y2: 0.7, coord_space: "normalized" },
        crop_ref: `crop://${packet.material_id}/p01/q002/ev_readiness_q002_answer_001`,
        confidence: 0.88,
        teacher_verified: false,
        risk_flags: []
      }
    ]
  };
}

function createValidAnnotationImport(packet: VisionEvidencePacket, caseId: string): StudentLearningMaterialGoldLabelAnnotationImport {
  const materialClassification = {
    material_type: "exam" as const,
    subject: "数学" as const,
    education_stage: "middle" as const,
    grade_candidate: "初二",
    region_or_curriculum_candidate: "未识别"
  };
  const questions = packet.questions.map((question, index) => createAnnotationImportQuestion(packet, question.question_id, index));
  const createLabel = (suffix: string, reviewerRole: string) => ({
    label_id: `${caseId}-label-${suffix}`,
    reviewer_id: `reviewer-${suffix}`,
    reviewer_role: reviewerRole,
    labeled_at: "2026-06-20T18:53:00+08:00",
    material_classification: materialClassification,
    questions,
    notes: ["Redacted label uses evidence refs only."]
  });
  return {
    fixture_schema: "student_learning_material_gold_label_annotation_import.v0.1",
    package_id: `gold-label-${packet.material_id}`,
    case_id: caseId,
    source_material_id: packet.source_material_id,
    vision_packet_id: packet.plugin_run_id,
    material_id: packet.material_id,
    annotation_tool: {
      name: "manual",
      export_ref: `${caseId}-manual-import.json`,
      imported_at: "2026-06-20T18:54:00+08:00",
      notes: ["Normalized from redacted annotation task."]
    },
    anonymization: {
      student_identifiers_removed: true,
      teacher_identifiers_removed: true,
      school_identifiers_removed: true,
      raw_images_excluded_from_gold_file: true
    },
    labels: [createLabel("a", "教研标注员"), createLabel("b", "授课老师")],
    adjudication: {
      reviewer_id: "reviewer-adjudicator",
      reviewer_role: "教研负责人",
      adjudicated_at: "2026-06-20T18:55:00+08:00",
      material_classification: materialClassification,
      questions,
      notes: ["Adjudicated with redacted evidence refs only."]
    }
  };
}

function createValidGoldLabelPackage(
  packet: VisionEvidencePacket,
  segmentationReview: ReturnType<typeof buildQuestionSegmentationReview>,
  annotationImport: StudentLearningMaterialGoldLabelAnnotationImport
): StudentLearningMaterialGoldLabelPackage {
  const conversion = createGoldLabelPackageFromAnnotationImport(annotationImport, packet, {
    requireAdjudication: true,
    questionSegmentationReview: segmentationReview
  });
  if (!conversion.ok) throw new Error(`Expected valid annotation import: ${conversion.errors.join("；")}`);
  if (!conversion.validation.ok) throw new Error(`Expected valid gold label package: ${conversion.validation.errors.join("；")}`);
  return conversion.package;
}

function createAnnotationImportQuestion(packet: VisionEvidencePacket, questionId: string, index: number) {
  const studentTraceEvidenceRefs = findEvidenceRefs(packet, questionId, [
    "student_original_answer",
    "student_revised_answer",
    "student_process",
    "student_note",
    "teacher_mark",
    "teacher_comment",
    "teacher_score"
  ]);
  const answerKeyOrRubricEvidenceRefs = findEvidenceRefs(packet, questionId, ["answer_key", "rubric"]);
  const teacherCorrectionEvidenceRefs = findEvidenceRefs(packet, questionId, ["teacher_mark", "teacher_comment", "teacher_score"]);
  const definitive = index === 0 && (answerKeyOrRubricEvidenceRefs.length > 0 || teacherCorrectionEvidenceRefs.length > 0);
  return {
    question_id: questionId,
    definitive_judgement_allowed: definitive,
    ...(definitive
      ? {
          expected_correctness: "partially_correct" as const,
          expected_knowledge_points: ["一次函数应用"],
          expected_mistake_types: ["condition_extraction_error"]
        }
      : {}),
    student_trace_evidence_refs: studentTraceEvidenceRefs,
    answer_key_or_rubric_evidence_refs: answerKeyOrRubricEvidenceRefs,
    teacher_correction_evidence_refs: teacherCorrectionEvidenceRefs,
    notes: [`question_index=${index + 1}; redacted refs only`]
  };
}

function findEvidenceRefs(packet: VisionEvidencePacket, questionId: string, evidenceTypes: string[]) {
  return packet.evidences
    .filter((evidence) => evidence.question_id === questionId && evidenceTypes.includes(evidence.evidence_type))
    .map((evidence) => evidence.evidence_ref);
}
