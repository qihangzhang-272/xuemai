import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  validateStudentLearningMaterialEvaluationAssetManifestFromFile,
  validateStudentLearningMaterialEvaluationAssetManifestFromJsonText
} from "../src/skills/student-learning-material-analyzer/evaluation-assets";
import { createStudentMonthlyReportFromConfirmedSnapshots } from "../src/skills/monthly-report";
import type { StudentMonthlyReportFileInput } from "../src/skills/monthly-report-files";
import { createDegradedAnalysis } from "../src/skills/student-learning-material-analyzer/degraded-analysis";
import { createStudentLearningMaterialDeliveryBundle } from "../src/skills/student-learning-material-analyzer/delivery-bundle";
import { buildGoldLabelAnnotationTask } from "../src/skills/student-learning-material-analyzer/gold-label-annotation-task";
import type { StudentLearningMaterialGoldLabelAnnotationImport } from "../src/skills/student-learning-material-analyzer/gold-label-annotation-import";
import { buildGoldLabelReviewReport } from "../src/skills/student-learning-material-analyzer/gold-label-review-report";
import { createConfirmedMonthlyReportSnapshotCopy } from "../src/skills/student-learning-material-analyzer/monthly-snapshot-archive";
import { buildQuestionSegmentationReview } from "../src/skills/student-learning-material-analyzer/question-segmentation-review";
import { createStudentLearningMaterialTeacherReviewPacket } from "../src/skills/student-learning-material-analyzer/teacher-review-packet";
import { createStudentLearningMaterialUserFacingResult } from "../src/skills/student-learning-material-analyzer/user-facing-result";
import { createVisionEvidencePacketFromExternalProvider, type ExternalVisionAdapterInput } from "../src/skills/student-learning-material-analyzer/vision-adapter";
import { buildVisionProviderTrialReport } from "../src/skills/student-learning-material-analyzer/vision-provider-trial-report";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import type { StudentLearningMaterialGoldCase } from "../src/skills/student-learning-material-analyzer/evaluation";
import type { StudentLearningMaterialGoldLabelPackage } from "../src/skills/student-learning-material-analyzer/gold-labeling";
import type { StudentLearningMaterialTeacherReviewPacket } from "../src/skills/student-learning-material-analyzer/teacher-review-packet";
import type { StudentLearningMaterialAnalysis, VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material evaluation asset validation", () => {
  it("validates a replayable VisionEvidencePacket and adjudicated gold package manifest", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_clear",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-"));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet));

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok, result.report).toBe(true);
    expect(result.summary).toEqual(
      expect.objectContaining({
        case_count: 1,
        question_count: 1,
        definitive_gold_question_count: 1,
        readiness_definitive_allowed_count: 1
      })
    );
    expect(result.coverage).toEqual(
      expect.objectContaining({
        material_states: ["valid_student_material"],
        material_types: ["exam"],
        subjects: ["数学"],
        education_stages: ["middle"],
        grade_candidates: ["初二"],
        regions_or_curricula: ["未识别"],
        region_or_curriculum_groups: [],
        curriculum_version_families: [],
        exam_scope_signals: [],
        plugin_providers: ["mock_vision_provider"],
        mock_or_synthetic_source_case_count: 1,
        external_vision_input_artifact_case_count: 0,
        human_gold_package_count: 1,
        provider_trial_report_ready_case_count: 0,
        provider_trial_report_blocked_case_count: 0,
        provider_candidate_trace_case_count: 0,
        provider_benchmark_candidate_case_count: 0,
        provider_candidate_source_url_case_count: 0,
        provider_license_review_note_case_count: 0
      })
    );
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
    expect(result.claimReadiness.blockers.join(" ")).toContain("样本数不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("analysis_path artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("题目切分 QA artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("脱敏标注任务包覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("人工标注导入 artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("人工双标一致性报告覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("交付包 artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("human_labeled 资产包含 mock/synthetic Vision source");
    expect(result.claimReadiness.blockers.join(" ")).toContain("外部 Provider 输入 artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("Provider 候选评估覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("Provider benchmark/open-source 候选覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("Provider 候选来源 URL 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("Provider 许可/部署复核备注覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("大陆区域覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("教材版本族覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).toContain("全国卷/新高考");
    expect(result.report).toContain("StudentLearningMaterialEvaluation assets: PASS");
    expect(result.report).toContain("coverage.materialTypes=exam");
    expect(result.report).toContain("coverage.gradeCandidates=初二");
    expect(result.report).toContain("coverage.regionOrCurriculumGroups=none");
    expect(result.report).toContain("coverage.curriculumVersionFamilies=none");
    expect(result.report).toContain("coverage.examScopeSignals=none");
    expect(result.report).toContain("coverage.mockOrSyntheticSources=1");
    expect(result.report).toContain("coverage.externalVisionInputs=0");
    expect(result.report).toContain("coverage.providerCandidateTrace=candidateTrace:0, benchmarkCandidates:0, sourceUrls:0, licenseNotes:0");
    expect(result.report).toContain("coverage.goldLabelReview=reports:0, ready:0, withDisagreements:0");
    expect(result.report).toContain("claimPolicy.requirements=");
    expect(result.report).toContain("minimumRegionOrCurriculumGroups:4");
    expect(result.report).toContain("minimumCurriculumVersionFamilies:2");
    expect(result.report).toContain("requireExamScopeSignal:true");
    expect(result.report).toContain("claimable99AssetReady=no");
  });

  it("records provider candidate trace and license review coverage from external OCR/Vision packets", () => {
    const externalVisionInput = readFixtureExternalVisionInput();
    const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-provider-trace-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T15:00:00+08:00"
    });
    const providerTrialReport = buildVisionProviderTrialReport(packet, {
      segmentationReview,
      generatedAt: "2026-06-20T15:05:00+08:00"
    });
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      externalVisionInput,
      providerTrialReport,
      segmentationReview
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok, result.report).toBe(true);
    expect(result.coverage).toEqual(
      expect.objectContaining({
        plugin_providers: ["paddleocr"],
        external_vision_input_artifact_case_count: 1,
        provider_candidate_trace_case_count: 1,
        provider_benchmark_candidate_case_count: 1,
        provider_candidate_source_url_case_count: 1,
        provider_license_review_note_case_count: 1,
        provider_document_or_ocr_candidate_case_count: 1,
        provider_layout_candidate_case_count: 1,
        provider_formula_candidate_case_count: 1
      })
    );
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider 候选评估覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider benchmark/open-source 候选覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider 候选来源 URL 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider 许可/部署复核备注覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider OCR/文档解析候选覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider layout 候选覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider 公式识别候选覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("外部 Provider 输入 artifact 覆盖不足");
    expect(result.report).toContain("coverage.providerCandidateTrace=candidateTrace:1, benchmarkCandidates:1, sourceUrls:1, licenseNotes:1");
    expect(result.report).toContain("coverage.providerRoleCoverage=documentOrOcr:1, layout:1, formula:1");
    expect(result.report).toContain("coverage.externalVisionInputs=1");
  });

  it("blocks 99% asset readiness when a human-labeled manifest uses public benchmark sources", () => {
    const externalVisionInput = {
      ...readFixtureExternalVisionInput(),
      metadata: {
        source_dataset_kind: "public_benchmark",
        source_dataset_name: "K12Vista"
      }
    };
    const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-public-benchmark-"));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      externalVisionInput
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok, result.report).toBe(true);
    expect(result.coverage).toEqual(
      expect.objectContaining({
        public_benchmark_source_case_count: 1,
        mock_or_synthetic_source_case_count: 0
      })
    );
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
    expect(result.claimReadiness.blockers.join(" ")).toContain("human_labeled 资产包含 public benchmark/source dataset");
    expect(result.claimReadiness.blockers.join(" ")).toContain("公开 benchmark 只能作覆盖参考");
    expect(result.report).toContain("coverage.publicBenchmarkSources=1");
  });

  it("rejects non-matching external provider input artifacts", () => {
    const externalVisionInput = readFixtureExternalVisionInput();
    const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-provider-input-mismatch-"));
    const invalidExternalVisionInput = {
      ...externalVisionInput,
      providerRunId: "different-provider-run"
    };
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      externalVisionInput: invalidExternalVisionInput
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("external_vision_input_path providerRunId must match VisionEvidencePacket plugin_run_id");
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
  });

  it("rejects VisionEvidencePacket evidence drift from the external provider input artifact", () => {
    const externalVisionInput = readFixtureExternalVisionInput();
    const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
    packet.evidences[0].text = "被手工改写的 OCR 证据文本";
    packet.evidences[0].crop_ref = "crop://tampered/evidence";
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-provider-evidence-drift-"));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      externalVisionInput
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("external_vision_input_path derived evidences must match VisionEvidencePacket evidences");
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
  });

  it("rejects VisionEvidencePacket gate drift from the external provider input artifact", () => {
    const externalVisionInput = readFixtureExternalVisionInput();
    const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
    packet.gates[0].status = "block";
    packet.gates[0].reason = "手工改写 gate 状态";
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-provider-gate-drift-"));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      externalVisionInput
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("external_vision_input_path derived gates must match VisionEvidencePacket gates");
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
  });

  it("rejects malformed external provider input artifacts", () => {
    const externalVisionInput = readFixtureExternalVisionInput();
    const packet = createVisionEvidencePacketFromExternalProvider(externalVisionInput);
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-invalid-provider-input-"));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      externalVisionInput: {
        ...externalVisionInput,
        pages: [],
        questions: []
      }
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("external_vision_input_path invalid: pages must not be empty");
    expect(result.errors.join(" ")).toContain("external_vision_input_path invalid: questions must not be empty");
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
  });

  it("blocks 99% asset readiness when provider candidates lack source URLs", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(readFixtureExternalVisionInput());
    if (!packet.pipeline_trace?.provider_candidates) throw new Error("expected provider candidates");
    packet.pipeline_trace.provider_candidates = packet.pipeline_trace.provider_candidates.map((candidate) => ({
      ...candidate,
      evidence_source_url: undefined
    }));
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-provider-source-url-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T15:10:00+08:00"
    });
    const providerTrialReport = buildVisionProviderTrialReport(packet, {
      segmentationReview,
      generatedAt: "2026-06-20T15:15:00+08:00"
    });
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      providerTrialReport,
      segmentationReview
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok, result.report).toBe(true);
    expect(result.coverage).toEqual(
      expect.objectContaining({
        provider_candidate_trace_case_count: 1,
        provider_benchmark_candidate_case_count: 1,
        provider_candidate_source_url_case_count: 0,
        provider_license_review_note_case_count: 1
      })
    );
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
    expect(result.claimReadiness.blockers.join(" ")).toContain("Provider 候选来源 URL 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider 许可/部署复核备注覆盖不足");
    expect(result.report).toContain("coverage.providerCandidateTrace=candidateTrace:1, benchmarkCandidates:1, sourceUrls:0, licenseNotes:1");
  });

  it("blocks 99% asset readiness when provider candidates lack formula coverage", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(readFixtureExternalVisionInput());
    if (!packet.pipeline_trace?.provider_candidates) throw new Error("expected provider candidates");
    packet.pipeline_trace.provider_candidates = packet.pipeline_trace.provider_candidates.filter((candidate) => candidate.role !== "formula");
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-provider-formula-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T15:20:00+08:00"
    });
    const providerTrialReport = buildVisionProviderTrialReport(packet, {
      segmentationReview,
      generatedAt: "2026-06-20T15:25:00+08:00"
    });
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      providerTrialReport,
      segmentationReview
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok, result.report).toBe(true);
    expect(result.coverage).toEqual(
      expect.objectContaining({
        provider_candidate_trace_case_count: 1,
        provider_benchmark_candidate_case_count: 1,
        provider_document_or_ocr_candidate_case_count: 1,
        provider_layout_candidate_case_count: 1,
        provider_formula_candidate_case_count: 0
      })
    );
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
    expect(result.claimReadiness.blockers.join(" ")).toContain("Provider 公式识别候选覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider OCR/文档解析候选覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("Provider layout 候选覆盖不足");
    expect(result.report).toContain("coverage.providerRoleCoverage=documentOrOcr:1, layout:1, formula:0");
  });

  it("validates optional analysis, user-facing result, and monthly report artifacts as one delivery bundle", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_full_bundle",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-full-bundle-"));
    const analysis = createAnalysisArtifact(packet);
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-19T20:00:00+08:00"
    });
    const providerTrialReport = buildVisionProviderTrialReport(packet, {
      segmentationReview,
      generatedAt: "2026-06-19T20:00:00+08:00"
    });
    const packageValue = createGoldLabelPackage(packet);
    const annotationTask = buildGoldLabelAnnotationTask(packet, {
      caseId: `case-${packet.material_id}`,
      generatedAt: "2026-06-19T20:00:00+08:00",
      questionSegmentationReview: segmentationReview
    });
    const annotationImport = createAnnotationImportFromPackage(packet, packageValue);
    const userResult = createStudentLearningMaterialUserFacingResult(analysis);
    const monthlyReportInput = createMonthlyReportInputArtifact(analysis);
    const monthlyReport = createMonthlyReportArtifact(analysis);
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result: userResult,
      monthlyReport,
      generatedAt: "2026-06-19T20:00:00+08:00"
    });
    const teacherReviewPacket = createStudentLearningMaterialTeacherReviewPacket({
      deliveryBundle,
      skillRunId: "asset-manifest-full-bundle-review",
      generatedAt: "2026-06-19T20:05:00+08:00"
    });
    const goldLabelReviewReport = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-19T20:00:00+08:00",
      sourcePacket: packet
    });
    writeCaseFiles(dir, packet, packageValue, {
      providerTrialReport,
      segmentationReview,
      annotationTask,
      annotationImport,
      goldLabelReviewReport,
      analysis,
      userResult,
      monthlyReportInput,
      monthlyReport,
      deliveryBundle,
      teacherReviewPacket
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok, result.report).toBe(true);
    expect(result.coverage).toEqual(
      expect.objectContaining({
        analysis_artifact_case_count: 1,
        provider_trial_report_artifact_case_count: 1,
        provider_trial_report_ready_case_count: 1,
        provider_trial_report_blocked_case_count: 0,
        question_segmentation_review_artifact_case_count: 1,
        annotation_task_artifact_case_count: 1,
        annotation_import_artifact_case_count: 1,
        gold_label_review_report_artifact_case_count: 1,
        gold_label_review_ready_case_count: 1,
        gold_label_review_disagreement_case_count: 0,
        user_result_artifact_case_count: 1,
        monthly_report_input_artifact_case_count: 1,
        monthly_report_artifact_case_count: 1,
        monthly_report_previous_month_evidence_case_count: 1,
        delivery_bundle_artifact_case_count: 1,
        teacher_review_packet_artifact_case_count: 1
      })
    );
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("analysis_path artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("题目切分 QA artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("人工标注导入 artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("人工双标一致性报告覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("人工双标一致性报告未全部 ready");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("用户可见 result artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("月报输入 artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("月报 artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("交付包 artifact 覆盖不足");
    expect(result.claimReadiness.blockers.join(" ")).not.toContain("老师复核包 artifact 覆盖不足");
    expect(result.cases[0]).toEqual(
      expect.objectContaining({
        has_analysis_artifact: true,
        has_provider_trial_report_artifact: true,
        has_question_segmentation_review_artifact: true,
        has_annotation_task_artifact: true,
        has_annotation_import_artifact: true,
        has_gold_label_review_report_artifact: true,
        gold_label_review_ready_for_99: true,
        has_user_result_artifact: true,
        has_monthly_report_input_artifact: true,
        has_monthly_report_artifact: true,
        has_delivery_bundle_artifact: true,
        has_teacher_review_packet_artifact: true
      })
    );
    expect(result.report).toContain(
      "coverage.artifacts=providerTrial:1, segmentationReview:1, annotationTask:1, annotationImport:1, analysis:1, userResult:1, monthlyInput:1, monthlyReport:1, deliveryBundle:1, teacherReviewPacket:1"
    );
    expect(result.report).toContain("coverage.goldLabelReview=reports:1, ready:1, withDisagreements:0");
    expect(result.report).toContain("coverage.providerTrialReadiness=ready:1, needsEvidence:0, blocked:0");
  });

  it("rejects provider trial report artifacts whose readiness no longer matches the source packet", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_blocked_provider_trial",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-blocked-provider-trial-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T12:00:00+08:00"
    });
    const providerTrialReport = buildVisionProviderTrialReport(packet, {
      segmentationReview,
      generatedAt: "2026-06-20T12:00:00+08:00"
    });
    providerTrialReport.readiness = "blocked";
    providerTrialReport.blockers = ["provider output still has unresolved blocking issues"];
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      providerTrialReport,
      segmentationReview
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("provider_trial_report_path invalid: readiness must match VisionEvidencePacket-derived provider trial report");
    expect(result.errors.join(" ")).toContain("provider_trial_report_path invalid: blockers must match VisionEvidencePacket-derived provider trial report");
    expect(result.claimReadiness.claimable99AssetReady).toBe(false);
    expect(result.claimReadiness.blockers.join(" ")).toContain("资产清单仍有校验错误或失败 case");
  });

  it("rejects provider trial report artifacts that leak OCR text content", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_provider_trial_text_leak",
      studentId: "student_asset_manifest"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-provider-trial-text-leak-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T12:10:00+08:00"
    });
    const providerTrialReport = buildVisionProviderTrialReport(packet, {
      segmentationReview,
      generatedAt: "2026-06-20T12:10:00+08:00"
    });
    providerTrialReport.next_steps.push(`错误示例：${leakedEvidence.raw_ocr_text}`);
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      providerTrialReport,
      segmentationReview
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("provider_trial_report_path invalid: vision provider trial report must not include OCR/text content copied");
    expect(result.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(result.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("rejects question segmentation review artifacts that leak OCR text content", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_segmentation_text_leak",
      studentId: "student_asset_manifest"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-segmentation-text-leak-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T12:20:00+08:00"
    });
    segmentationReview.human_review_checklist.push(`错误示例：${leakedEvidence.raw_ocr_text}`);
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      segmentationReview
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("question_segmentation_review_path invalid: question segmentation review must not include OCR/text content copied");
    expect(result.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(result.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("rejects monthly report artifacts that claim month-over-month trends without previous-month evidence", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_monthly_no_previous",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-monthly-no-previous-"));
    const analysis = createAnalysisArtifact(packet);
    const monthlyReport = createMonthlyReportArtifact(analysis, { withPreviousEvidence: false });
    monthlyReport.month_over_month_comparison.summary = "和上月相比，本月审题更稳定。";
    monthlyReport.month_over_month_comparison.parent_readable_comparison = "和上个月相比，孩子本月在审题方面有积极变化。";
    monthlyReport.month_over_month_comparison.improved_signals = ["审题更稳定"];
    monthlyReport.month_over_month_comparison.insufficient_evidence = [];
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      analysis,
      monthlyReport
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("monthly_report_path month_over_month_comparison makes a trend claim without replayable previous-month evidence");
  });

  it("rejects monthly report input artifacts that contain unconfirmed learning-material snapshots", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_monthly_unconfirmed_input",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-monthly-unconfirmed-input-"));
    const analysis = createAnalysisArtifact(packet);
    const monthlyReportInput: StudentMonthlyReportFileInput = {
      fixture_schema: "student_monthly_report_input.v0.1",
      student_id: analysis.student_id,
      student_name: "脱敏学生",
      current_month: analysis.monthly_report_snapshot.month,
      snapshots: [analysis.monthly_report_snapshot]
    };
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      analysis,
      monthlyReportInput
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("monthly_report_input_path snapshots[0].teacher_confirmed must be true");
  });

  it("rejects monthly report comparison evidence when previous-month source counts do not match replayable ids", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_monthly_mismatched_previous_sources",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-monthly-mismatched-previous-"));
    const analysis = createAnalysisArtifact(packet);
    const monthlyReport = createMonthlyReportArtifact(analysis, { withPreviousEvidence: true });
    monthlyReport.comparison_evidence.previous_month_source_count = monthlyReport.comparison_evidence.previous_month_source_ids.length + 1;
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      analysis,
      monthlyReport
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "monthly_report_path comparison_evidence.previous_month_source_count must match previous_month_source_ids length"
    );
  });

  it("rejects monthly report artifacts whose source ids do not match the replayable monthly input", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_monthly_wrong_source_ids",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-monthly-wrong-source-ids-"));
    const analysis = createAnalysisArtifact(packet);
    const monthlyReportInput = createMonthlyReportInputArtifact(analysis, { withPreviousEvidence: true });
    const monthlyReport = createMonthlyReportArtifact(analysis, { withPreviousEvidence: true });
    monthlyReport.evidence_timeline[0].id = "wrong-current-source-id";
    monthlyReport.comparison_evidence.previous_month_source_ids = ["wrong-previous-source-id"];
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      analysis,
      monthlyReportInput,
      monthlyReport
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("monthly_report_path evidence_timeline source ids must match monthly_report_input_path current source ids");
    expect(result.errors.join(" ")).toContain(
      "monthly_report_path comparison_evidence.previous_month_source_ids must match monthly_report_input_path previous source ids"
    );
  });

  it("rejects annotation task artifacts that do not belong to the same VisionEvidencePacket", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_wrong_annotation_task",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-wrong-annotation-task-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T11:00:00+08:00"
    });
    const annotationTask = buildGoldLabelAnnotationTask(packet, {
      caseId: `case-${packet.material_id}`,
      questionSegmentationReview: segmentationReview
    });
    annotationTask.annotation_import_skeleton.vision_packet_id = "other-vision-packet";
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      segmentationReview,
      annotationTask
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("annotation_task_path annotation_import_skeleton.vision_packet_id must match VisionEvidencePacket");
  });

  it("rejects annotation task artifacts whose evidence basis drifted from the source packet", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_annotation_task_drift",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-annotation-task-drift-"));
    const annotationTask = buildGoldLabelAnnotationTask(packet, {
      caseId: `case-${packet.material_id}`
    });
    annotationTask.questions[0].evidence_basis_suggestion.student_trace_evidence_refs = [];
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      annotationTask
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "annotation_task_path invalid: questions[0].evidence_basis_suggestion.student_trace_evidence_refs must match VisionEvidencePacket-derived annotation task"
    );
  });

  it("rejects annotation task artifacts whose skeleton drifted from the source packet", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_annotation_task_skeleton_drift",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-annotation-task-skeleton-drift-"));
    const annotationTask = buildGoldLabelAnnotationTask(packet, {
      caseId: `case-${packet.material_id}`
    });
    annotationTask.annotation_import_skeleton.labels[0].questions[0].student_trace_evidence_refs = [];
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      annotationTask
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "annotation_task_path invalid: annotation_import_skeleton.labels[0].questions[0].student_trace_evidence_refs must match VisionEvidencePacket-derived annotation task skeleton"
    );
  });

  it("rejects annotation task artifacts that leak OCR text content", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_annotation_text_leak",
      studentId: "student_asset_manifest"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-annotation-text-leak-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T11:20:00+08:00"
    });
    const annotationTask = buildGoldLabelAnnotationTask(packet, {
      caseId: `case-${packet.material_id}`,
      questionSegmentationReview: segmentationReview
    });
    annotationTask.human_review_checklist.push(`错误示例：${leakedEvidence.raw_ocr_text}`);
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      segmentationReview,
      annotationTask
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("annotation_task_path invalid: annotation task must not include OCR/text content copied");
    expect(result.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(result.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("rejects annotation import artifacts that no longer reproduce the final gold package", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_annotation_import_mismatch",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-annotation-import-mismatch-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T11:30:00+08:00"
    });
    const packageValue = createGoldLabelPackage(packet);
    const annotationImport = createAnnotationImportFromPackage(packet, packageValue);
    annotationImport.adjudication!.questions[0].expected_mistake_types = ["calculation_error"];
    writeCaseFiles(dir, packet, packageValue, {
      segmentationReview,
      annotationImport
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("annotation_import_path generated adjudicated_gold must match gold_label_package_path");
  });

  it("rejects annotation import artifacts that no longer reproduce human label provenance", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_annotation_import_label_mismatch",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-annotation-import-label-mismatch-"));
    const segmentationReview = buildQuestionSegmentationReview(packet, {
      generatedAt: "2026-06-20T11:35:00+08:00"
    });
    const packageValue = createGoldLabelPackage(packet);
    const annotationImport = createAnnotationImportFromPackage(packet, packageValue);
    annotationImport.labels[0].reviewer_id = "reviewer-reassigned";

    writeCaseFiles(dir, packet, packageValue, {
      segmentationReview,
      annotationImport
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("annotation_import_path generated labels must match gold_label_package_path");
  });

  it("rejects gold packages that leak OCR text content into notes", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_gold_text_leak",
      studentId: "student_asset_manifest"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-gold-text-leak-"));
    const packageValue = createGoldLabelPackage(packet);
    packageValue.labels[0].notes = [`错误示例：${leakedEvidence.raw_ocr_text}`];
    writeCaseFiles(dir, packet, packageValue);

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("gold label package invalid: gold label package notes must not include OCR/text content copied");
    expect(result.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(result.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("rejects gold label review reports that leak OCR text content", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_gold_review_text_leak",
      studentId: "student_asset_manifest"
    });
    const leakedEvidence = packet.evidences.find((evidence) => evidence.raw_ocr_text);
    if (!leakedEvidence?.raw_ocr_text) throw new Error("expected fixture evidence with raw OCR text");
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-gold-review-text-leak-"));
    const packageValue = createGoldLabelPackage(packet);
    const goldLabelReviewReport = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:20:00+08:00",
      sourcePacket: packet
    });
    goldLabelReviewReport.readiness.warnings.push(`错误示例：${leakedEvidence.raw_ocr_text}`);
    writeCaseFiles(dir, packet, packageValue, {
      goldLabelReviewReport
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("gold_label_review_report_path invalid: gold label review report must not include OCR/text content copied");
    expect(result.errors.join(" ")).toContain(`evidence_ref=${leakedEvidence.evidence_ref}`);
    expect(result.errors.join(" ")).not.toContain(leakedEvidence.raw_ocr_text);
  });

  it("rejects gold label review reports whose disagreement details no longer match gold labels", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_gold_review_tampered_disagreement",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-gold-review-tampered-disagreement-"));
    const packageValue = createGoldLabelPackage(packet);
    packageValue.labels[1].gold.questions[0].expected_correctness = "incorrect";
    packageValue.adjudicated_gold = cloneGold(packageValue.labels[0].gold);
    const goldLabelReviewReport = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:25:00+08:00",
      sourcePacket: packet
    });
    goldLabelReviewReport.disagreements[0] = {
      ...goldLabelReviewReport.disagreements[0],
      field: "questions.q001.expected_knowledge_points",
      reviewer_value_hashes: ["0000000000000000", "1111111111111111"]
    };
    writeCaseFiles(dir, packet, packageValue, {
      goldLabelReviewReport
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(goldLabelReviewReport.agreement.disagreement_count).toBeGreaterThan(0);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("gold_label_review_report_path invalid: disagreements must match gold label package agreement report");
  });

  it("rejects user-facing result artifacts that do not belong to the same analysis", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_wrong_result",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-wrong-result-"));
    const analysis = createAnalysisArtifact(packet);
    const userResult = {
      ...createStudentLearningMaterialUserFacingResult(analysis),
      analysis_id: "other-analysis-id"
    };
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      analysis,
      userResult
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("result_path analysis_id must match analysis.analysis_id");
  });

  it("rejects incomplete user-facing result artifacts before claim readiness", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_incomplete_result",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-incomplete-result-"));
    const analysis = createAnalysisArtifact(packet);
    const userResult = createStudentLearningMaterialUserFacingResult(analysis);
    userResult.teacher_report.question_rows = [];
    userResult.monthly_result.comparison_to_previous_month = "本月表现记录。";
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      analysis,
      userResult
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("result_path teacher_report.question_rows must not be empty");
    expect(result.errors.join(" ")).toContain("result_path monthly_result.comparison_to_previous_month must state prior-month comparison");
  });

  it("rejects delivery bundle artifacts that do not contain a complete teacher-facing result", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_bad_delivery",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-bad-delivery-"));
    const analysis = createAnalysisArtifact(packet);
    const userResult = createStudentLearningMaterialUserFacingResult(analysis);
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result: userResult,
      generatedAt: "2026-06-19T20:00:00+08:00"
    });
    deliveryBundle.teacher_delivery.question_rows = [];
    deliveryBundle.teacher_delivery.month_over_month_comparison = "本月表现记录。";
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      analysis,
      userResult,
      deliveryBundle
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("delivery_bundle_path teacher_delivery.question_rows must not be empty");
    expect(result.errors.join(" ")).toContain("delivery_bundle_path teacher_delivery.month_over_month_comparison must state prior-month comparison");
  });

  it("rejects teacher review packet artifacts whose actions no longer match the delivery bundle", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_bad_teacher_review",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-bad-teacher-review-"));
    const analysis = createAnalysisArtifact(packet);
    const userResult = createStudentLearningMaterialUserFacingResult(analysis);
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result: userResult,
      generatedAt: "2026-06-19T20:00:00+08:00"
    });
    const teacherReviewPacket = createStudentLearningMaterialTeacherReviewPacket({
      deliveryBundle,
      skillRunId: "bad-teacher-review-packet"
    });
    teacherReviewPacket.review_actions.find((action) => action.action_id === "copy_parent_feedback")!.enabled = true;
    teacherReviewPacket.review_actions.find((action) => action.action_id === "confirm_archive")!.enabled = true;
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), {
      analysis,
      userResult,
      deliveryBundle,
      teacherReviewPacket
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("teacher_review_packet_path review_actions.copy_parent_feedback.enabled must match delivery bundle review blockers");
    expect(result.errors.join(" ")).toContain("teacher_review_packet_path review_actions.confirm_archive.enabled must match delivery bundle review blockers");
  });

  it("rejects analysis artifacts when grade or region/curriculum do not match gold labels", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_wrong_classification_detail",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-wrong-classification-"));
    const analysis = createAnalysisArtifact(packet);
    analysis.material_classification.grade_candidate = "初三";
    analysis.material_classification.region_or_curriculum_candidate = "江苏";
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), { analysis });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("analysis_path grade_candidate must match adjudicated gold");
    expect(result.errors.join(" ")).toContain("analysis_path region_or_curriculum_candidate must match adjudicated gold");
  });

  it("rejects asset cases that contain explicit non-K12 scope signals", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_non_k12",
      studentId: "student_asset_manifest"
    });
    packet.evidences[0] = {
      ...packet.evidences[0],
      evidence_type: "material_metadata",
      text: "大学高等数学期末试卷 学生作答后老师批改。",
      raw_ocr_text: "大学高等数学期末试卷 学生作答后老师批改。",
      normalized_text: "大学高等数学期末试卷 学生作答后老师批改。"
    };
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-non-k12-"));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet));

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("VisionEvidencePacket explicit non-K12 scope detected");
  });

  it("rejects analysis artifacts that cite evidence refs outside the same packet or allowed side inputs", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_unknown_analysis_ref",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-unknown-analysis-ref-"));
    const analysis = createAnalysisArtifact(packet);
    analysis.teacher_professional_report.evidenceRefs = ["analysis.hallucinated.evidence_ref"];
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), { analysis });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("analysis_path teacher_professional_report.evidenceRefs[0] references unknown evidenceRef");
  });

  it("rejects analysis artifacts with duplicate question analyses", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_duplicate_analysis_question",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-duplicate-analysis-question-"));
    const analysis = createAnalysisArtifact(packet);
    analysis.question_analyses.push(JSON.parse(JSON.stringify(analysis.question_analyses[0])));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), { analysis });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("analysis_path question_analyses duplicate question_id=q001");
  });

  it("allows external answer key side inputs to satisfy asset readiness when they are question_id mapped", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_asset_manifest_external_key",
        studentId: "student_asset_manifest"
      })
    );
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-external-"));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet, { answerBasisRefs: ["side_input.answer_key.q001"] }), {
      answerKeys: [{ question_id: "q001", answer: "外部答案只用于题号映射校验，不在报告里展示" }]
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok, result.report).toBe(true);
    expect(result.summary.readiness_definitive_allowed_count).toBe(1);
    expect(result.coverage.external_answer_key_case_count).toBe(1);
  });

  it("rejects external answer key side inputs when gold evidence basis points to a different question", () => {
    const packet = createTwoQuestionPacket(
      removeAnswerBasis(
        getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
          materialId: "mat_asset_manifest_cross_gold_side_input",
          studentId: "student_asset_manifest"
        })
      )
    );
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-cross-gold-side-input-"));
    const packageValue = createGoldLabelPackage(packet, { answerBasisRefs: ["side_input.answer_key.q002"] });
    addGoldQuestion(packageValue, packet, "q002", ["side_input.answer_key.q002"]);
    writeCaseFiles(dir, packet, packageValue, {
      answerKeys: [
        { question_id: "q002", answer: "外部答案只映射到第二题，不能支撑第一题。" }
      ]
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("side input evidence_ref is not mapped to question_id=q001");
  });

  it("blocks gold review reports that were generated without the declared side-input question map", () => {
    const packet = createTwoQuestionPacket(
      removeAnswerBasis(
        getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
          materialId: "mat_asset_manifest_cross_gold_review_side_input",
          studentId: "student_asset_manifest"
        })
      )
    );
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-cross-gold-review-side-input-"));
    const packageValue = createGoldLabelPackage(packet, { answerBasisRefs: ["side_input.answer_key.q002"] });
    addGoldQuestion(packageValue, packet, "q002", ["side_input.answer_key.q002"]);
    const staleGoldReviewReport = buildGoldLabelReviewReport(packageValue, {
      generatedAt: "2026-06-20T16:00:00+08:00",
      sourcePacket: packet
    });
    writeCaseFiles(dir, packet, packageValue, {
      answerKeys: [
        { question_id: "q002", answer: "外部答案只映射到第二题，不能支撑第一题。" }
      ],
      goldLabelReviewReport: staleGoldReviewReport
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(staleGoldReviewReport.readiness.ready_for_99_evaluation).toBe(false);
    expect(staleGoldReviewReport.readiness.blockers.join(" ")).toContain("requires question-mapped answer/rubric side input map");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("gold_label_review_report_path invalid: readiness.blockers must match gold label package validation");
  });

  it("rejects analysis question evidenceRefs when side inputs are mapped to a different question", () => {
    const packet = createTwoQuestionPacket(
      removeAnswerBasis(
        getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
          materialId: "mat_asset_manifest_cross_analysis_side_input",
          studentId: "student_asset_manifest"
        })
      )
    );
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-cross-analysis-side-input-"));
    const packageValue = createGoldLabelPackage(packet, { answerBasisRefs: ["side_input.answer_key.q001"] });
    addGoldQuestion(packageValue, packet, "q002", ["side_input.answer_key.q002"]);
    const analysis = createAnalysisArtifact(packet);
    analysis.question_analyses[0].correctnessJudgement.evidenceRefs = ["side_input.answer_key.q002"];
    writeCaseFiles(dir, packet, packageValue, {
      answerKeys: [
        { question_id: "q001", answer: "第一题答案依据。" },
        { question_id: "q002", answer: "第二题答案依据。" }
      ],
      analysis
    });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("analysis_path question_analyses[0].correctnessJudgement.evidenceRefs[0] references side input evidenceRef=side_input.answer_key.q002 not mapped to question_id=q001");
  });

  it("rejects analysis mistake diagnosis that infers checking habits without same-question process evidence", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_process_mistake_without_evidence",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-process-mistake-without-evidence-"));
    const analysis = createAnalysisArtifact(packet);
    analysis.question_analyses[0].mistakeDiagnosis[0] = {
      ...analysis.question_analyses[0].mistakeDiagnosis[0],
      diagnosis_type: "review_or_checking_gap",
      explanation: "学生这题主要是检查习惯不足，属于粗心漏看条件。"
    };
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), { analysis });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "analysis_path question_analyses[0].mistakeDiagnosis[0] diagnosis_type=review_or_checking_gap requires same-question student_process or student_note evidenceRefs"
    );
  });

  it("rejects profile update drafts that cite teacher-review analysis questions", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "mat_asset_manifest_profile_draft_review_question",
      studentId: "student_asset_manifest"
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-profile-draft-review-"));
    const analysis = createAnalysisArtifact(packet);
    analysis.student_profile_update_suggestions = [
      {
        suggestion_type: "weakness_event",
        content: "一次函数应用题中条件范围提取不稳定。",
        evidenceRefs: [findQuestionEvidenceRef(packet, "q001", "student_original_answer")],
        confidence: 0.8,
        teacher_confirmation_required: true,
        status: "draft"
      }
    ];
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet), { analysis });

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("analysis_path student_profile_update_suggestions[0] status=draft cannot cite teacher-review question_id=q001");
  });

  it("rejects definitive gold labels when the packet and side inputs cannot support per-question readiness", () => {
    const packet = removeAnswerBasis(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "mat_asset_manifest_missing_key",
        studentId: "student_asset_manifest"
      })
    );
    const dir = mkdtempSync(join(tmpdir(), "xuemai-assets-missing-"));
    writeCaseFiles(dir, packet, createGoldLabelPackage(packet, { answerBasisRefs: ["side_input.answer_key.q001"] }));

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(join(dir, "manifest.json"));

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain(
      "gold label package invalid: labels[0].question_evidence_basis[0].answer_key_or_rubric_evidence_refs[0] side_input evidence_ref is not mapped to question_id=q001: side_input.answer_key.q001"
    );
    expect(result.errors.join(" ")).toContain("answer/rubric evidence_ref not found");
    expect(result.errors.join(" ")).toContain("evidence readiness does not");
  });

  it("rejects malformed manifests before they can be used as 99% evidence", () => {
    const result = validateStudentLearningMaterialEvaluationAssetManifestFromJsonText(
      JSON.stringify({
        fixture_schema: "student_learning_material_evaluation_assets.v0.1",
        dataset_id: "empty-assets",
        dataset_kind: "human_labeled",
        cases: []
      })
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("cases must not be empty");
  });
});

function writeCaseFiles(
  dir: string,
  packet: VisionEvidencePacket,
  packageValue: StudentLearningMaterialGoldLabelPackage,
  sideInputs?: {
    externalVisionInput?: unknown;
    answerKeys?: unknown[];
    rubrics?: unknown[];
    providerTrialReport?: unknown;
    segmentationReview?: unknown;
    annotationTask?: unknown;
    annotationImport?: StudentLearningMaterialGoldLabelAnnotationImport;
    goldLabelReviewReport?: unknown;
    analysis?: StudentLearningMaterialAnalysis;
    userResult?: unknown;
    monthlyReportInput?: StudentMonthlyReportFileInput;
    monthlyReport?: unknown;
    deliveryBundle?: unknown;
    teacherReviewPacket?: StudentLearningMaterialTeacherReviewPacket;
  }
) {
  if (sideInputs?.externalVisionInput) writeFileSync(join(dir, "external-vision-input.json"), JSON.stringify(sideInputs.externalVisionInput, null, 2), "utf8");
  writeFileSync(join(dir, "vision-packet.json"), JSON.stringify(packet, null, 2), "utf8");
  writeFileSync(join(dir, "gold-label-package.json"), JSON.stringify(packageValue, null, 2), "utf8");
  if (sideInputs?.answerKeys) writeFileSync(join(dir, "answer-keys.json"), JSON.stringify(sideInputs.answerKeys, null, 2), "utf8");
  if (sideInputs?.rubrics) writeFileSync(join(dir, "rubrics.json"), JSON.stringify(sideInputs.rubrics, null, 2), "utf8");
  if (sideInputs?.providerTrialReport) writeFileSync(join(dir, "provider-trial-report.json"), JSON.stringify(sideInputs.providerTrialReport, null, 2), "utf8");
  if (sideInputs?.segmentationReview) writeFileSync(join(dir, "question-segmentation-review.json"), JSON.stringify(sideInputs.segmentationReview, null, 2), "utf8");
  if (sideInputs?.annotationTask) writeFileSync(join(dir, "annotation-task.json"), JSON.stringify(sideInputs.annotationTask, null, 2), "utf8");
  if (sideInputs?.annotationImport) writeFileSync(join(dir, "annotation-import.json"), JSON.stringify(sideInputs.annotationImport, null, 2), "utf8");
  if (sideInputs?.goldLabelReviewReport) writeFileSync(join(dir, "gold-label-review-report.json"), JSON.stringify(sideInputs.goldLabelReviewReport, null, 2), "utf8");
  if (sideInputs?.analysis) writeFileSync(join(dir, "analysis.json"), JSON.stringify(sideInputs.analysis, null, 2), "utf8");
  if (sideInputs?.userResult) writeFileSync(join(dir, "result.json"), JSON.stringify(sideInputs.userResult, null, 2), "utf8");
  if (sideInputs?.monthlyReportInput) writeFileSync(join(dir, "monthly-report-input.json"), JSON.stringify(sideInputs.monthlyReportInput, null, 2), "utf8");
  if (sideInputs?.monthlyReport) writeFileSync(join(dir, "monthly-report.json"), JSON.stringify(sideInputs.monthlyReport, null, 2), "utf8");
  if (sideInputs?.deliveryBundle) writeFileSync(join(dir, "delivery-bundle.json"), JSON.stringify(sideInputs.deliveryBundle, null, 2), "utf8");
  if (sideInputs?.teacherReviewPacket) {
    writeFileSync(join(dir, "teacher-review-packet.json"), JSON.stringify(sideInputs.teacherReviewPacket, null, 2), "utf8");
  }
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify(
      {
        fixture_schema: "student_learning_material_evaluation_assets.v0.1",
        dataset_id: "asset-manifest-mini",
        dataset_kind: "human_labeled",
        cases: [
          {
            case_id: packageValue.case_id,
            ...(sideInputs?.externalVisionInput ? { external_vision_input_path: "external-vision-input.json" } : {}),
            vision_packet_path: "vision-packet.json",
            gold_label_package_path: "gold-label-package.json",
            ...(sideInputs?.answerKeys ? { answer_keys_path: "answer-keys.json" } : {}),
            ...(sideInputs?.rubrics ? { rubrics_path: "rubrics.json" } : {}),
            ...(sideInputs?.providerTrialReport ? { provider_trial_report_path: "provider-trial-report.json" } : {}),
            ...(sideInputs?.segmentationReview ? { question_segmentation_review_path: "question-segmentation-review.json" } : {}),
            ...(sideInputs?.annotationTask ? { annotation_task_path: "annotation-task.json" } : {}),
            ...(sideInputs?.annotationImport ? { annotation_import_path: "annotation-import.json" } : {}),
            ...(sideInputs?.goldLabelReviewReport ? { gold_label_review_report_path: "gold-label-review-report.json" } : {}),
            ...(sideInputs?.analysis ? { analysis_path: "analysis.json" } : {}),
            ...(sideInputs?.userResult ? { result_path: "result.json" } : {}),
            ...(sideInputs?.monthlyReportInput ? { monthly_report_input_path: "monthly-report-input.json" } : {}),
            ...(sideInputs?.monthlyReport ? { monthly_report_path: "monthly-report.json" } : {}),
            ...(sideInputs?.deliveryBundle ? { delivery_bundle_path: "delivery-bundle.json" } : {}),
            ...(sideInputs?.teacherReviewPacket ? { teacher_review_packet_path: "teacher-review-packet.json" } : {})
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );
}

function readFixtureExternalVisionInput(): ExternalVisionAdapterInput {
  return JSON.parse(
    readFileSync("tests/fixtures/student-learning-material-evaluation/provider-adapter/paddleocr-like-external-vision-input.json", "utf8")
  ) as ExternalVisionAdapterInput;
}

function createGoldLabelPackage(packet: VisionEvidencePacket, options?: { answerBasisRefs?: string[] }): StudentLearningMaterialGoldLabelPackage {
  const caseId = `case-${packet.material_id}`;
  const gold = createGold(caseId);
  const evidenceBasis = createEvidenceBasis(packet, options);
  return {
    fixture_schema: "student_learning_material_gold_label_package.v0.1",
    package_id: `gold-label-${packet.material_id}`,
    case_id: caseId,
    source_material_id: packet.source_material_id,
    vision_packet_id: packet.plugin_run_id,
    material_id: packet.material_id,
    anonymization: {
      student_identifiers_removed: true,
      teacher_identifiers_removed: true,
      school_identifiers_removed: true,
      raw_images_excluded_from_gold_file: true
    },
    labels: [
      {
        label_id: `${caseId}-label-a`,
        reviewer_id: "reviewer-a",
        reviewer_role: "教研标注员",
        labeled_at: "2026-06-19T00:00:00.000Z",
        gold,
        question_evidence_basis: evidenceBasis
      },
      {
        label_id: `${caseId}-label-b`,
        reviewer_id: "reviewer-b",
        reviewer_role: "授课老师",
        labeled_at: "2026-06-19T00:10:00.000Z",
        gold: cloneGold(gold),
        question_evidence_basis: evidenceBasis
      }
    ],
    adjudicated_gold: cloneGold(gold),
    adjudicated_by: {
      reviewer_id: "reviewer-adjudicator",
      reviewer_role: "教研负责人",
      adjudicated_at: "2026-06-19T00:20:00.000Z"
    }
  };
}

function createAnnotationImportFromPackage(
  packet: VisionEvidencePacket,
  packageValue: StudentLearningMaterialGoldLabelPackage
): StudentLearningMaterialGoldLabelAnnotationImport {
  const labels = packageValue.labels.map((label) => ({
    label_id: label.label_id,
    reviewer_id: label.reviewer_id,
    reviewer_role: label.reviewer_role,
    labeled_at: label.labeled_at,
    material_classification: label.gold.material_classification,
    questions: label.gold.questions.map((question) => {
      const basis = label.question_evidence_basis?.find((item) => item.question_id === question.question_id);
      return {
        question_id: question.question_id,
        definitive_judgement_allowed: question.definitive_judgement_allowed,
        expected_correctness: question.expected_correctness,
        expected_knowledge_points: question.expected_knowledge_points,
        expected_mistake_types: question.expected_mistake_types,
        student_trace_evidence_refs: basis?.student_trace_evidence_refs,
        answer_key_or_rubric_evidence_refs: basis?.answer_key_or_rubric_evidence_refs,
        teacher_correction_evidence_refs: basis?.teacher_correction_evidence_refs
      };
    })
  }));
  const adjudicatedGold = packageValue.adjudicated_gold ?? packageValue.labels[0].gold;
  return {
    fixture_schema: "student_learning_material_gold_label_annotation_import.v0.1",
    package_id: packageValue.package_id,
    case_id: packageValue.case_id,
    source_material_id: packet.source_material_id,
    vision_packet_id: packet.plugin_run_id,
    material_id: packet.material_id,
    annotation_tool: {
      name: "manual",
      export_ref: `${packageValue.case_id}-normalized-import.json`,
      imported_at: "2026-06-20T12:00:00.000Z"
    },
    anonymization: packageValue.anonymization,
    labels,
    adjudication: {
      reviewer_id: packageValue.adjudicated_by?.reviewer_id ?? "reviewer-adjudicator",
      reviewer_role: packageValue.adjudicated_by?.reviewer_role ?? "教研负责人",
      adjudicated_at: packageValue.adjudicated_by?.adjudicated_at ?? "2026-06-20T12:10:00.000Z",
      material_classification: adjudicatedGold.material_classification,
      questions: adjudicatedGold.questions.map((question) => ({
        question_id: question.question_id,
        definitive_judgement_allowed: question.definitive_judgement_allowed,
        expected_correctness: question.expected_correctness,
        expected_knowledge_points: question.expected_knowledge_points,
        expected_mistake_types: question.expected_mistake_types
      }))
    }
  };
}

function createGold(caseId: string): StudentLearningMaterialGoldCase {
  return {
    case_id: caseId,
    material_classification: {
      material_type: "exam",
      subject: "数学",
      education_stage: "middle",
      grade_candidate: "初二",
      region_or_curriculum_candidate: "未识别"
    },
    questions: [
      {
        question_id: "q001",
        definitive_judgement_allowed: true,
        expected_correctness: "partially_correct",
        expected_knowledge_points: ["一次函数应用"],
        expected_mistake_types: ["condition_extraction_error"]
      }
    ],
    require_safe_parent_feedback: true,
    require_teacher_professional_report: true,
    require_monthly_snapshot: true,
    require_model_contract: true
  };
}

function createEvidenceBasis(packet: VisionEvidencePacket, options?: { answerBasisRefs?: string[] }) {
  const studentAnswer = packet.evidences.find((evidence) => evidence.evidence_type === "student_original_answer");
  const answerKey = packet.evidences.find((evidence) => evidence.evidence_type === "answer_key" || evidence.evidence_type === "rubric");
  const teacherCorrection = packet.evidences.find((evidence) => evidence.evidence_type.startsWith("teacher_"));
  return [
    {
      question_id: "q001",
      student_trace_evidence_refs: [studentAnswer?.evidence_ref].filter((ref): ref is string => Boolean(ref)),
      answer_key_or_rubric_evidence_refs: options?.answerBasisRefs ?? [answerKey?.evidence_ref].filter((ref): ref is string => Boolean(ref)),
      teacher_correction_evidence_refs: [teacherCorrection?.evidence_ref].filter((ref): ref is string => Boolean(ref))
    }
  ];
}

function removeAnswerBasis(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  clone.evidences = clone.evidences.filter((evidence) => evidence.evidence_type !== "answer_key" && evidence.evidence_type !== "rubric" && !evidence.evidence_type.startsWith("teacher_"));
  clone.gates = clone.gates.filter((gate) => gate.gate_id !== "answer_key" && gate.gate_id !== "teacher_mark_answer_key_conflict");
  keepOnlyExistingGateEvidenceRefs(clone);
  return clone;
}

function keepOnlyExistingGateEvidenceRefs(packet: VisionEvidencePacket) {
  const evidenceRefs = new Set(packet.evidences.map((evidence) => evidence.evidence_ref));
  packet.gates = packet.gates.map((gate) => ({
    ...gate,
    evidenceRefs: gate.evidenceRefs.filter((evidenceRef) => evidenceRefs.has(evidenceRef))
  }));
}

function createTwoQuestionPacket(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
  const materialId = clone.material_id;
  clone.questions.push({
    question_id: "q002",
    question_number: "2",
    question_type_candidate: "open_response",
    page_id: "p01",
    regions: [
      {
        region_id: "reg_p01_q002",
        region_role: "question_region",
        page_id: "p01",
        bbox: { x1: 0.1, y1: 0.56, x2: 0.88, y2: 0.82, coord_space: "normalized" },
        crop_ref: `crop://${materialId}/p01/q002`,
        confidence: 0.9
      }
    ],
    confidence: 0.9,
    risk_flags: []
  });
  clone.evidences.push(
    createQuestionEvidence(clone, "q002", "reg_p01_q002", "ev_exam_stem_002", "question_stem", "第二题：根据图像判断函数单调性。"),
    createQuestionEvidence(clone, "q002", "reg_p01_q002", "ev_exam_answer_002", "student_original_answer", "学生答案：单调递增。")
  );
  return clone;
}

function createQuestionEvidence(
  packet: VisionEvidencePacket,
  questionId: string,
  regionId: string,
  evidenceId: string,
  evidenceType: VisionEvidencePacket["evidences"][number]["evidence_type"],
  text: string
): VisionEvidencePacket["evidences"][number] {
  return {
    evidence_id: evidenceId,
    evidence_ref: `material.${packet.material_id}.page_p01.question_${questionId}.${evidenceId}`,
    source_material_id: packet.source_material_id,
    page_id: "p01",
    question_id: questionId,
    region_id: regionId,
    evidence_type: evidenceType,
    text,
    raw_ocr_text: text,
    normalized_text: text,
    bbox: { x1: 0.12, y1: 0.6, x2: 0.82, y2: 0.75, coord_space: "normalized" },
    crop_ref: `crop://${packet.material_id}/p01/${questionId}/${evidenceId}`,
    confidence: 0.9,
    teacher_verified: false,
    risk_flags: []
  };
}

function addGoldQuestion(packageValue: StudentLearningMaterialGoldLabelPackage, packet: VisionEvidencePacket, questionId: string, answerBasisRefs: string[]) {
  const questionGold = {
    question_id: questionId,
    definitive_judgement_allowed: true,
    expected_correctness: "correct" as const,
    expected_knowledge_points: ["函数图像"],
    expected_mistake_types: []
  };
  const basis = {
    question_id: questionId,
    student_trace_evidence_refs: [findQuestionEvidenceRef(packet, questionId, "student_original_answer")],
    answer_key_or_rubric_evidence_refs: answerBasisRefs,
    teacher_correction_evidence_refs: []
  };
  packageValue.labels.forEach((label) => {
    label.gold.questions.push({ ...questionGold });
    label.question_evidence_basis = [...(label.question_evidence_basis ?? []), { ...basis }];
  });
  packageValue.adjudicated_gold?.questions.push({ ...questionGold });
}

function findQuestionEvidenceRef(packet: VisionEvidencePacket, questionId: string, evidenceType: VisionEvidencePacket["evidences"][number]["evidence_type"]) {
  const evidenceRef = packet.evidences.find((evidence) => evidence.question_id === questionId && evidence.evidence_type === evidenceType)?.evidence_ref;
  if (!evidenceRef) throw new Error(`missing ${evidenceType} evidence for ${questionId}`);
  return evidenceRef;
}

function createAnalysisArtifact(packet: VisionEvidencePacket): StudentLearningMaterialAnalysis {
  const analysis = createDegradedAnalysis({
    analysisId: `analysis-${packet.material_id}`,
    packet,
    reasons: ["answer_key_missing"],
    message: "Synthetic delivery bundle analysis artifact for validation."
  });
  analysis.material_classification = {
    ...analysis.material_classification,
    material_type: "exam",
    subject: "数学",
    education_stage: "middle",
    grade_candidate: "初二"
  };
  analysis.monthly_report_snapshot = {
    ...analysis.monthly_report_snapshot,
    subject: "数学",
    material_type: "exam"
  };
  return analysis;
}

function createMonthlyReportInputArtifact(analysis: StudentLearningMaterialAnalysis, options?: { withPreviousEvidence?: boolean }): StudentMonthlyReportFileInput {
  const confirmed = createConfirmedMonthlyReportSnapshotCopy({
    analysis,
    teacherId: "teacher-asset-validator",
    sourceSkillRunId: "skill-run-asset-validator",
    archiveRecordId: "archive-asset-validator",
    confirmedAt: "2026-06-19T20:00:00+08:00"
  });
  if (!confirmed.ok) throw new Error(confirmed.errors.join("；"));
  const previousMonthSnapshots: NonNullable<StudentMonthlyReportFileInput["previous_month_snapshots"]> = [];
  if (options?.withPreviousEvidence !== false) {
    previousMonthSnapshots.push({
      ...confirmed.snapshot,
      source_analysis_id: `${confirmed.snapshot.source_analysis_id}-previous`,
      month: "2026-05",
      material_date: "2026-05-20",
      score_summary: "上月主要问题是条件范围整理不稳定。",
      main_progress_signal: "能完成基础任务",
      main_issue_signal: "条件范围整理不稳定",
      parent_visible_summary: "上月需要关注条件范围整理。",
      evidenceRefs: ["previous-month-evidence"],
      source_skill_run_id: "skill-run-asset-validator-previous",
      archive_record_id: "archive-asset-validator-previous",
      confirmed_at: "2026-05-20T20:00:00+08:00"
    });
  }
  return {
    fixture_schema: "student_monthly_report_input.v0.1",
    student_id: analysis.student_id,
    student_name: "脱敏学生",
    current_month: analysis.monthly_report_snapshot.month,
    previous_month: "2026-05",
    subject_area: analysis.material_classification.subject,
    snapshots: [confirmed.snapshot],
    previous_month_snapshots: previousMonthSnapshots
  };
}

function createMonthlyReportArtifact(analysis: StudentLearningMaterialAnalysis, options?: { withPreviousEvidence?: boolean }) {
  const input = createMonthlyReportInputArtifact(analysis, options);
  return createStudentMonthlyReportFromConfirmedSnapshots({
    studentId: input.student_id,
    studentName: input.student_name,
    currentMonth: input.current_month,
    previousMonth: input.previous_month,
    subjectArea: input.subject_area,
    snapshots: input.snapshots || [],
    previousMonthSnapshots: input.previous_month_snapshots
  });
}

function cloneGold(gold: StudentLearningMaterialGoldCase): StudentLearningMaterialGoldCase {
  return JSON.parse(JSON.stringify(gold)) as StudentLearningMaterialGoldCase;
}
