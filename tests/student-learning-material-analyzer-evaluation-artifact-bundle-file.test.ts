import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDegradedAnalysis } from "../src/skills/student-learning-material-analyzer/degraded-analysis";
import { generateStudentLearningMaterialEvaluationArtifactBundle } from "../src/skills/student-learning-material-analyzer/evaluation-artifact-bundle-files";
import { validateStudentLearningMaterialEvaluationAssetManifestFromFile } from "../src/skills/student-learning-material-analyzer/evaluation-assets";
import { createConfirmedMonthlyReportSnapshotCopy } from "../src/skills/student-learning-material-analyzer/monthly-snapshot-archive";
import { createVisionEvidencePacketFromExternalProvider } from "../src/skills/student-learning-material-analyzer/vision-adapter";
import type { StudentLearningMaterialAnalysis, VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

const fixtureDir = path.resolve("tests/fixtures/student-learning-material-evaluation/synthetic-asset-manifest");

describe("student learning material evaluation artifact bundle generator", () => {
  it("generates result and monthly artifacts from an analysis-backed manifest", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-artifacts-"));
    const manifestPath = path.join(tempDir, "manifest.json");
    const outputManifestPath = path.join(tempDir, "manifest-with-artifacts.json");
    const externalVisionInputPath = path.join(tempDir, "external-vision-input.json");
    const packetPath = path.join(tempDir, "vision-packet.json");
    const goldPath = path.join(tempDir, "gold-label-package.json");
    const analysisPath = path.join(tempDir, "analysis.json");

    try {
      await copyFile(path.join(fixtureDir, "gold-label-package.json"), goldPath);
      const fixturePacket = JSON.parse(await readFile(path.join(fixtureDir, "vision-packet.json"), "utf8")) as VisionEvidencePacket;
      const externalVisionInput = createMinimalExternalVisionInputFromPacket(fixturePacket);
      const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
      await writeFile(externalVisionInputPath, `${JSON.stringify(externalVisionInput, null, 2)}\n`, "utf8");
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(analysisPath, `${JSON.stringify(createAnalysisForBundle(packet), null, 2)}\n`, "utf8");
      await writeFile(
        manifestPath,
        `${JSON.stringify(
          {
            fixture_schema: "student_learning_material_evaluation_assets.v0.1",
            dataset_id: "artifact-bundle-smoke",
            dataset_kind: "human_labeled",
            cases: [
              {
                case_id: "synthetic-asset-case-001",
                external_vision_input_path: "external-vision-input.json",
                vision_packet_path: "vision-packet.json",
                gold_label_package_path: "gold-label-package.json",
                analysis_path: "analysis.json"
              }
            ]
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const result = await generateStudentLearningMaterialEvaluationArtifactBundle({
        manifestInputPath: manifestPath,
        manifestOutputPath: outputManifestPath,
        generateMonthlyReports: true,
        monthlyReport: {
          teacherId: "teacher-artifact-reviewer",
          confirmedAt: "2026-06-19T20:00:00+08:00",
          studentName: "脱敏学生"
        }
      });
      const outputManifest = JSON.parse(await readFile(outputManifestPath, "utf8"));

      expect(result.validationOk, result.validationReport).toBe(true);
      expect(result.generatedProviderTrialReportCount).toBe(1);
      expect(result.generatedQuestionSegmentationReviewCount).toBe(1);
      expect(result.generatedAnnotationTaskCount).toBe(1);
      expect(result.generatedGoldLabelReviewReportCount).toBe(1);
      expect(result.generatedUserResultCount).toBe(1);
      expect(result.generatedMonthlyReportCount).toBe(1);
      expect(result.generatedDeliveryBundleCount).toBe(1);
      expect(result.generatedTeacherReviewPacketCount).toBe(1);
      expect(outputManifest.cases[0].external_vision_input_path).toBe("external-vision-input.json");
      expect(outputManifest.cases[0].provider_trial_report_path).toBe(
        "generated-artifacts/synthetic-asset-case-001/provider-trial-report.json"
      );
      expect(outputManifest.cases[0].question_segmentation_review_path).toBe(
        "generated-artifacts/synthetic-asset-case-001/question-segmentation-review.json"
      );
      expect(outputManifest.cases[0].annotation_task_path).toBe("generated-artifacts/synthetic-asset-case-001/annotation-task.json");
      expect(outputManifest.cases[0].gold_label_review_report_path).toBe(
        "generated-artifacts/synthetic-asset-case-001/gold-label-review-report.json"
      );
      expect(outputManifest.cases[0].result_path).toBe("generated-artifacts/synthetic-asset-case-001/result.json");
      expect(outputManifest.cases[0].monthly_report_input_path).toBe("generated-artifacts/synthetic-asset-case-001/monthly-input.json");
      expect(outputManifest.cases[0].monthly_report_path).toBe("generated-artifacts/synthetic-asset-case-001/monthly-report.json");
      expect(outputManifest.cases[0].delivery_bundle_path).toBe("generated-artifacts/synthetic-asset-case-001/delivery-bundle.json");
      expect(outputManifest.cases[0].teacher_review_packet_path).toBe(
        "generated-artifacts/synthetic-asset-case-001/teacher-review-packet.json"
      );
      expect(validateStudentLearningMaterialEvaluationAssetManifestFromFile(outputManifestPath).ok).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates upstream human-gold artifacts before analysis output exists", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-artifacts-upstream-only-"));
    const manifestPath = path.join(tempDir, "manifest.json");
    const outputManifestPath = path.join(tempDir, "manifest-with-upstream-artifacts.json");
    const externalVisionInputPath = path.join(tempDir, "external-vision-input.json");
    const packetPath = path.join(tempDir, "vision-packet.json");
    const goldPath = path.join(tempDir, "gold-label-package.json");

    try {
      await copyFile(path.join(fixtureDir, "gold-label-package.json"), goldPath);
      const fixturePacket = JSON.parse(await readFile(path.join(fixtureDir, "vision-packet.json"), "utf8")) as VisionEvidencePacket;
      const externalVisionInput = createMinimalExternalVisionInputFromPacket(fixturePacket);
      const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
      await writeFile(externalVisionInputPath, `${JSON.stringify(externalVisionInput, null, 2)}\n`, "utf8");
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(
        manifestPath,
        `${JSON.stringify(
          {
            fixture_schema: "student_learning_material_evaluation_assets.v0.1",
            dataset_id: "artifact-bundle-upstream-before-analysis",
            dataset_kind: "human_labeled",
            cases: [
              {
                case_id: "synthetic-asset-case-001",
                external_vision_input_path: "external-vision-input.json",
                vision_packet_path: "vision-packet.json",
                gold_label_package_path: "gold-label-package.json"
              }
            ]
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const result = await generateStudentLearningMaterialEvaluationArtifactBundle({
        manifestInputPath: manifestPath,
        manifestOutputPath: outputManifestPath,
        generateUserResults: false,
        generateMonthlyReports: false,
        generateDeliveryBundles: false,
        generateTeacherReviewPackets: false
      });
      const outputManifest = JSON.parse(await readFile(outputManifestPath, "utf8"));

      expect(result.validationOk, result.validationReport).toBe(true);
      expect(result.generatedProviderTrialReportCount).toBe(1);
      expect(result.generatedQuestionSegmentationReviewCount).toBe(1);
      expect(result.generatedAnnotationTaskCount).toBe(1);
      expect(result.generatedGoldLabelReviewReportCount).toBe(1);
      expect(result.generatedUserResultCount).toBe(0);
      expect(result.generatedDeliveryBundleCount).toBe(0);
      expect(outputManifest.cases[0].analysis_path).toBeUndefined();
      expect(outputManifest.cases[0].provider_trial_report_path).toBe(
        "generated-artifacts/synthetic-asset-case-001/provider-trial-report.json"
      );
      expect(outputManifest.cases[0].question_segmentation_review_path).toBe(
        "generated-artifacts/synthetic-asset-case-001/question-segmentation-review.json"
      );
      expect(outputManifest.cases[0].annotation_task_path).toBe("generated-artifacts/synthetic-asset-case-001/annotation-task.json");
      expect(outputManifest.cases[0].gold_label_review_report_path).toBe(
        "generated-artifacts/synthetic-asset-case-001/gold-label-review-report.json"
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("uses an existing monthly_report_input_path without overwriting teacher-prepared input", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-artifacts-existing-monthly-input-"));
    const manifestPath = path.join(tempDir, "manifest.json");
    const outputManifestPath = path.join(tempDir, "manifest-with-artifacts.json");
    const externalVisionInputPath = path.join(tempDir, "external-vision-input.json");
    const packetPath = path.join(tempDir, "vision-packet.json");
    const goldPath = path.join(tempDir, "gold-label-package.json");
    const analysisPath = path.join(tempDir, "analysis.json");
    const existingMonthlyInputPath = path.join(tempDir, "human-review/monthly-input.json");

    try {
      await copyFile(path.join(fixtureDir, "gold-label-package.json"), goldPath);
      const fixturePacket = JSON.parse(await readFile(path.join(fixtureDir, "vision-packet.json"), "utf8")) as VisionEvidencePacket;
      const externalVisionInput = createMinimalExternalVisionInputFromPacket(fixturePacket);
      const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
      const analysis = createAnalysisForBundle(packet);
      const confirmed = createConfirmedMonthlyReportSnapshotCopy({
        analysis,
        teacherId: "teacher-human-monthly-reviewer",
        sourceSkillRunId: "manual-monthly-input-skill-run",
        archiveRecordId: "manual-monthly-input-archive",
        confirmedAt: "2026-06-20T20:00:00+08:00",
        feedbackSent: true
      });
      if (!confirmed.ok) throw new Error(confirmed.errors.join("；"));
      const teacherPreparedMonthlyInput = {
        fixture_schema: "student_monthly_report_input.v0.1",
        student_id: analysis.student_id,
        student_name: "人工月报输入学生",
        current_month: analysis.monthly_report_snapshot.month,
        subject_area: analysis.material_classification.subject,
        snapshots: [confirmed.snapshot]
      };
      await writeFile(externalVisionInputPath, `${JSON.stringify(externalVisionInput, null, 2)}\n`, "utf8");
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
      await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
      await mkdir(path.dirname(existingMonthlyInputPath), { recursive: true });
      await writeFile(existingMonthlyInputPath, `${JSON.stringify(teacherPreparedMonthlyInput, null, 2)}\n`, "utf8");
      await writeFile(
        manifestPath,
        `${JSON.stringify(
          {
            fixture_schema: "student_learning_material_evaluation_assets.v0.1",
            dataset_id: "artifact-bundle-existing-monthly-input",
            dataset_kind: "human_labeled",
            cases: [
              {
                case_id: "synthetic-asset-case-001",
                external_vision_input_path: "external-vision-input.json",
                vision_packet_path: "vision-packet.json",
                gold_label_package_path: "gold-label-package.json",
                analysis_path: "analysis.json",
                monthly_report_input_path: "human-review/monthly-input.json"
              }
            ]
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const result = await generateStudentLearningMaterialEvaluationArtifactBundle({
        manifestInputPath: manifestPath,
        manifestOutputPath: outputManifestPath,
        generateMonthlyReports: true
      });
      const outputManifest = JSON.parse(await readFile(outputManifestPath, "utf8"));
      const preservedMonthlyInput = JSON.parse(await readFile(existingMonthlyInputPath, "utf8"));
      const monthlyReportPath = path.join(tempDir, outputManifest.cases[0].monthly_report_path);
      const monthlyReport = JSON.parse(await readFile(monthlyReportPath, "utf8"));

      expect(result.validationOk, result.validationReport).toBe(true);
      expect(result.generatedMonthlyReportCount).toBe(1);
      expect(outputManifest.cases[0].monthly_report_input_path).toBe("human-review/monthly-input.json");
      expect(outputManifest.cases[0].monthly_report_path).toBe("generated-artifacts/synthetic-asset-case-001/monthly-report.json");
      expect(preservedMonthlyInput.student_name).toBe("人工月报输入学生");
      expect(preservedMonthlyInput.snapshots[0].source_skill_run_id).toBe("manual-monthly-input-skill-run");
      expect(monthlyReport.student_name).toBe("人工月报输入学生");
      expect(monthlyReport.evidence_timeline.map((source: { id: string }) => source.id)).toEqual(["manual-monthly-input-skill-run"]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates the artifact bundle specified by env vars", async () => {
    const manifestInputPath = process.env.XUEMAI_EVAL_ARTIFACT_MANIFEST_INPUT;
    const manifestOutputPath = process.env.XUEMAI_EVAL_ARTIFACT_MANIFEST_OUTPUT;

    if (!manifestInputPath || !manifestOutputPath) {
      if (process.env.XUEMAI_EVAL_ARTIFACTS_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_EVAL_ARTIFACT_MANIFEST_INPUT=/absolute/path/to/manifest.json and XUEMAI_EVAL_ARTIFACT_MANIFEST_OUTPUT=/absolute/path/to/manifest-with-artifacts.json"
        );
      }
      expect(manifestInputPath || manifestOutputPath).toBeUndefined();
      return;
    }

    const result = await generateStudentLearningMaterialEvaluationArtifactBundle({
      manifestInputPath,
      manifestOutputPath,
      artifactOutputDir: process.env.XUEMAI_EVAL_ARTIFACT_OUTPUT_DIR,
      generateQuestionSegmentationReviews: process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_SEGMENTATION_REVIEW !== "0",
      generateProviderTrialReports: process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_PROVIDER_TRIAL !== "0",
      generateAnnotationTasks: process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_ANNOTATION_TASK !== "0",
      generateGoldLabelReviewReports: process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_GOLD_REVIEW !== "0",
      generateMonthlyReports: process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_MONTHLY === "1",
      generateDeliveryBundles: process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_DELIVERY !== "0",
      generateTeacherReviewPackets:
        process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_TEACHER_REVIEW === "1"
          ? true
          : process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_TEACHER_REVIEW === "0"
            ? false
            : process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_DELIVERY !== "0",
      overwriteExisting: process.env.XUEMAI_EVAL_ARTIFACT_OVERWRITE === "1",
      monthlyReport:
        process.env.XUEMAI_EVAL_ARTIFACT_GENERATE_MONTHLY === "1"
          ? {
              teacherId: process.env.XUEMAI_EVAL_ARTIFACT_TEACHER_ID || "",
              confirmedAt: process.env.XUEMAI_EVAL_ARTIFACT_CONFIRMED_AT || "",
              studentName: process.env.XUEMAI_EVAL_ARTIFACT_STUDENT_NAME,
              previousMonth: process.env.XUEMAI_EVAL_ARTIFACT_PREVIOUS_MONTH,
              previousMonthLabel: process.env.XUEMAI_EVAL_ARTIFACT_PREVIOUS_MONTH_LABEL
            }
          : undefined
    });

    console.log(
      [
        "StudentLearningMaterialEvaluation artifact bundle generated",
        `manifestOutputPath=${result.manifestOutputPath}`,
        `caseCount=${result.caseCount}`,
        `generatedProviderTrialReports=${result.generatedProviderTrialReportCount}`,
        `generatedQuestionSegmentationReviews=${result.generatedQuestionSegmentationReviewCount}`,
        `generatedAnnotationTasks=${result.generatedAnnotationTaskCount}`,
        `generatedGoldLabelReviewReports=${result.generatedGoldLabelReviewReportCount}`,
        `generatedUserResults=${result.generatedUserResultCount}`,
        `generatedMonthlyReports=${result.generatedMonthlyReportCount}`,
        `generatedDeliveryBundles=${result.generatedDeliveryBundleCount}`,
        `generatedTeacherReviewPackets=${result.generatedTeacherReviewPacketCount}`,
        `validationOk=${result.validationOk}`,
        `validationErrors=${result.validationErrors.length}`,
        `validationWarnings=${result.validationWarnings.length}`
      ].join("\n")
    );

    expect(result.manifestOutputPath).toBe(path.resolve(manifestOutputPath));
    expect(result.validationOk, result.validationReport).toBe(true);
  });
});

function createMinimalExternalVisionInputFromPacket(packet: VisionEvidencePacket) {
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

function createAnalysisForBundle(packet: VisionEvidencePacket): StudentLearningMaterialAnalysis {
  const analysis = createDegradedAnalysis({
    analysisId: "analysis-synthetic-asset-case-001",
    packet,
    reasons: ["model_output_invalid"],
    message: "Synthetic analysis artifact for bundle generation."
  });
  analysis.material_classification = {
    material_type: "exam",
    subject: "数学",
    education_stage: "middle",
    grade_candidate: "初二",
    region_or_curriculum_candidate: "未识别",
    classification_confidence: 0.9,
    evidenceRefs: ["synthetic.asset.q001.stem"]
  };
  analysis.teacher_professional_report.report_title = "初二数学试卷专业测评型学情报告";
  analysis.monthly_report_snapshot.subject = "数学";
  analysis.monthly_report_snapshot.material_type = "exam";
  return analysis;
}
