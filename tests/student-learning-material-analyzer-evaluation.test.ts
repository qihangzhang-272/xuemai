import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateStudentLearningMaterialDatasetBundle,
  evaluateStudentLearningMaterialBatch,
  evaluateStudentLearningMaterialAnalysis,
  formatStudentLearningMaterialEvaluationBatchReport,
  formatStudentLearningMaterialClaimPolicyRequirements,
  formatStudentLearningMaterialEvaluationDatasetReport,
  listStudentLearningMaterialClaimPolicyRequirements,
  strictStudentLearningMaterialThresholds,
  validateStudentLearningMaterialEvaluationDatasetBundle,
  type StudentLearningMaterialEvaluationClaimPolicy,
  type StudentLearningMaterialGoldCase
} from "../src/skills/student-learning-material-analyzer/evaluation";
import {
  evaluateStudentLearningMaterialDatasetFile,
  loadStudentLearningMaterialEvaluationDatasetBundleFromFile,
  loadStudentLearningMaterialEvaluationDatasetBundleFromJsonText
} from "../src/skills/student-learning-material-analyzer/evaluation-files";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import type { StudentLearningMaterialAnalysis, VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

const studentId = "00000000-0000-0000-0000-000000000301";

describe("student learning material analyzer evaluation", () => {
  it("passes strict 99% policy metrics for a correctly routed annotated case", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000501",
      studentId
    });
    const analysis = createEvaluationAnalysis(packet);
    const result = evaluateStudentLearningMaterialAnalysis(analysis, createGoldCase());

    expect(result.ok).toBe(true);
    expect(result.failedThresholds).toEqual([]);
    expect(result.metrics).toEqual(
      expect.objectContaining({
        materialClassificationAccuracy: 1,
        questionCoverageRecall: 1,
        highConfidenceCorrectnessAccuracy: 1,
        unsupportedDefinitiveJudgementRate: 0,
        teacherReviewRoutingRecall: 1,
        evidenceCoverageRate: 1,
        unsafeFeedbackRate: 0,
        monthlySnapshotCoverage: 1,
        modelContractCoverage: 1,
        teacherProfessionalReportCoverage: 1
      })
    );
  });

  it("fails when an unsupported low-evidence question is hard-judged", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000502",
      studentId
    });
    const analysis = createEvaluationAnalysis(packet);
    analysis.question_analyses[1].correctnessJudgement.status = "incorrect";
    analysis.question_analyses[1].correctnessJudgement.source_basis = "insufficient";
    analysis.question_analyses[1].correctnessJudgement.confidence = 0.44;

    const result = evaluateStudentLearningMaterialAnalysis(analysis, createGoldCase());

    expect(result.ok).toBe(false);
    expect(result.metrics.unsupportedDefinitiveJudgementRate).toBe(1);
    expect(result.metrics.teacherReviewRoutingRecall).toBe(0);
    expect(result.failedThresholds.join(" ")).toContain("unsupportedDefinitiveJudgementRate");
    expect(result.notes.join(" ")).toContain("硬判");
  });

  it("fails when parent feedback safety or monthly evidence coverage regresses", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000503",
      studentId
    });
    const analysis = createEvaluationAnalysis(packet);
    analysis.wechat_parent_feedback_draft.text = "孩子基础很差，家长必须马上加练。";
    analysis.wechat_parent_feedback_draft.sentences[0].text = "孩子基础很差，家长必须马上加练。";
    analysis.monthly_report_snapshot.evidenceRefs = [];

    const result = evaluateStudentLearningMaterialAnalysis(analysis, createGoldCase(), {
      ...strictStudentLearningMaterialThresholds,
      evidenceCoverageRate: 1
    });

    expect(result.ok).toBe(false);
    expect(result.metrics.unsafeFeedbackRate).toBe(1);
    expect(result.metrics.evidenceCoverageRate).toBeLessThan(1);
    expect(result.failedThresholds.join(" ")).toContain("unsafeFeedbackRate");
  });

  it("counts grade and region/curriculum mismatches in material classification accuracy", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000514",
      studentId
    });
    const analysis = createEvaluationAnalysis(packet);
    analysis.material_classification.grade_candidate = "初三";
    analysis.material_classification.region_or_curriculum_candidate = "广东";

    const result = evaluateStudentLearningMaterialAnalysis(analysis, createGoldCase());

    expect(result.ok).toBe(false);
    expect(result.metrics.materialClassificationAccuracy).toBe(0.6);
    expect(result.failedThresholds.join(" ")).toContain("materialClassificationAccuracy");
    expect(result.notes.join(" ")).toContain("年级或地区/教材分类");
  });

  it("evaluates batches conservatively and reports K12 coverage", () => {
    const firstPacket = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000504",
      studentId
    });
    const secondPacket = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000505",
      studentId
    });
    const firstAnalysis = createEvaluationAnalysis(firstPacket);
    const secondAnalysis = createEvaluationAnalysis(secondPacket);
    const secondGold = createGoldCase({
      case_id: "gold-mainland-k12-english-homework-002",
      material_type: "homework",
      subject: "英语",
      education_stage: "primary",
      grade_candidate: "小学五年级",
      region_or_curriculum_candidate: "广东"
    });
    secondAnalysis.material_classification.material_type = "homework";
    secondAnalysis.material_classification.subject = "英语";
    secondAnalysis.material_classification.education_stage = "primary";
    secondAnalysis.material_classification.grade_candidate = "小学五年级";
    secondAnalysis.material_classification.region_or_curriculum_candidate = "广东";
    secondAnalysis.monthly_report_snapshot.material_type = "homework";
    secondAnalysis.monthly_report_snapshot.subject = "英语";

    const result = evaluateStudentLearningMaterialBatch([
      { gold: createGoldCase(), analysis: firstAnalysis },
      { gold: secondGold, analysis: secondAnalysis }
    ]);

    expect(result.ok).toBe(true);
    expect(result.failedCaseIds).toEqual([]);
    expect(result.coverage).toEqual(
      expect.objectContaining({
        caseCount: 2,
        questionCount: 4,
        definitiveAllowedQuestionCount: 2,
        teacherReviewExpectedQuestionCount: 2,
        materialTypes: ["exam", "homework"],
        subjects: ["数学", "英语"],
        educationStages: ["middle", "primary"],
        gradeCandidates: ["初二", "小学五年级"],
        regionsOrCurricula: ["广东", "江苏"],
        regionOrCurriculumGroups: expect.arrayContaining(["华东", "华南"]),
        curriculumVersionFamilies: [],
        examScopeSignals: []
      })
    );
    expect(result.metrics.highConfidenceCorrectnessAccuracy).toBe(1);
    expect(result.metrics.unsupportedDefinitiveJudgementRate).toBe(0);

    const report = formatStudentLearningMaterialEvaluationBatchReport(result);
    expect(report).toContain("StudentLearningMaterialAnalysis evaluation: PASS");
    expect(report).toContain("coverage.regionsOrCurricula=广东, 江苏");
    expect(report).toContain("coverage.regionOrCurriculumGroups=");
    expect(report).toContain("coverage.curriculumVersionFamilies=none");
    expect(report).toContain("coverage.examScopeSignals=none");
    expect(report).toContain("coverage.gradeCandidates=初二, 小学五年级");
    expect(report).toContain("failedCases=none");
  });

  it("fails the batch when any single case violates the 99% hard-judgement gate", () => {
    const goodPacket = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000506",
      studentId
    });
    const badPacket = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000507",
      studentId
    });
    const badAnalysis = createEvaluationAnalysis(badPacket);
    badAnalysis.question_analyses[1].correctnessJudgement.status = "incorrect";
    badAnalysis.question_analyses[1].correctnessJudgement.source_basis = "insufficient";

    const result = evaluateStudentLearningMaterialBatch([
      { gold: createGoldCase(), analysis: createEvaluationAnalysis(goodPacket) },
      { gold: createGoldCase({ case_id: "gold-bad-hard-judge" }), analysis: badAnalysis }
    ]);

    expect(result.ok).toBe(false);
    expect(result.failedCaseIds).toEqual(["gold-bad-hard-judge"]);
    expect(result.metrics.unsupportedDefinitiveJudgementRate).toBe(1);
    expect(result.notes.join(" ")).toContain("硬判");

    const report = formatStudentLearningMaterialEvaluationBatchReport(result);
    expect(report).toContain("StudentLearningMaterialAnalysis evaluation: FAIL");
    expect(report).toContain("failedCases=gold-bad-hard-judge");
  });

  it("does not pass an empty batch", () => {
    const result = evaluateStudentLearningMaterialBatch([]);

    expect(result.ok).toBe(false);
    expect(result.coverage.caseCount).toBe(0);
    expect(result.notes.join(" ")).toContain("评测集为空");
  });

  it("formats the strict 99% claim policy as a reusable report requirement list", () => {
    const requirements = listStudentLearningMaterialClaimPolicyRequirements();
    const formatted = formatStudentLearningMaterialClaimPolicyRequirements();

    expect(requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "minimumCases", required: 100 }),
        expect.objectContaining({ key: "minimumQuestions", required: 500 }),
        expect.objectContaining({ key: "minimumRegionOrCurriculumGroups", required: 4 }),
        expect.objectContaining({ key: "minimumCurriculumVersionFamilies", required: 2 }),
        expect.objectContaining({ key: "requireExamScopeSignal", required: true }),
        expect.objectContaining({ key: "requireHumanLabeledDataset", required: true }),
        expect.objectContaining({ key: "requireAssetPreflightReady", required: true }),
        expect.objectContaining({ key: "requireCaseArtifactProvenance", required: true })
      ])
    );
    expect(formatted).toContain("minimumRegionOrCurriculumGroups:4");
    expect(formatted).toContain("minimumCurriculumVersionFamilies:2");
    expect(formatted).toContain("requireExamScopeSignal:true");
  });

  it("validates dataset bundles before file-based 99% evaluation", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000508",
      studentId
    });
    const analysis = createEvaluationAnalysis(packet);
    const bundle = {
      fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
      dataset_id: "synthetic-smoke-dataset",
      dataset_kind: "synthetic",
      review_protocol: {
        double_labeled: false,
        adjudicated: false,
        anonymized: true,
        reviewer_roles: []
      },
      cases: [
        { gold: createGoldCase(), analysis },
        { gold: createGoldCase(), analysis }
      ]
    };

    const validation = validateStudentLearningMaterialEvaluationDatasetBundle(bundle);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("duplicate gold case_id");
  });

  it("separates synthetic smoke tests from claimable 99% correctness evidence", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000509",
      studentId
    });
    const result = evaluateStudentLearningMaterialDatasetBundle(
      {
        fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
        dataset_id: "synthetic-smoke-dataset",
        dataset_kind: "synthetic",
        model_under_test: {
          provider_name: "mock",
          model_name: "mock-reasoner",
          prompt_version: "v0.4"
        },
        review_protocol: {
          double_labeled: false,
          adjudicated: false,
          anonymized: true,
          reviewer_roles: []
        },
        cases: [
          {
            gold: createGoldCase(),
            analysis: createEvaluationAnalysis(packet),
            artifact_provenance: {
              asset_manifest_case_id: "human-labeled-mini-gold-case-001",
              gold_label_package_path: "human-review/gold-label-package.json",
              analysis_path: "artifacts/analysis.json"
            }
          }
        ]
      },
      strictStudentLearningMaterialThresholds,
      {
        minimum_case_count: 1,
        minimum_question_count: 2,
        require_human_labeled_dataset: true,
        require_double_labeled: true,
        require_adjudicated: true,
        require_anonymized: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.claimable99Correctness).toBe(false);
    expect(result.datasetWarnings.join(" ")).toContain("非人工标注评测集");
    expect(result.datasetWarnings.join(" ")).toContain("双人标注");

    const report = formatStudentLearningMaterialEvaluationDatasetReport(result);
    expect(report).toContain("StudentLearningMaterialAnalysis evaluation: PASS");
    expect(report).toContain("dataset.kind=synthetic");
    expect(report).toContain("claimable99Correctness=no");
  });

  it("allows 99% correctness claims only for reviewed human-labeled datasets that pass strict metrics", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000510",
      studentId
    });
    const result = evaluateStudentLearningMaterialDatasetBundle(
      {
        fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
        dataset_id: "human-labeled-mini-gold",
        dataset_kind: "human_labeled",
        model_under_test: {
          provider_name: "mock",
          model_name: "mock-reasoner"
        },
        review_protocol: {
          double_labeled: true,
          adjudicated: true,
          anonymized: true,
          reviewer_roles: ["教研标注员", "授课老师"]
        },
        asset_preflight: createAssetPreflightReady("human-labeled-mini-gold"),
        cases: [
          {
            gold: createGoldCase(),
            analysis: createEvaluationAnalysis(packet),
            artifact_provenance: {
              asset_manifest_case_id: "human-labeled-mini-gold-case-001",
              gold_label_package_path: "human-review/gold-label-package.json",
              analysis_path: "artifacts/analysis.json"
            }
          }
        ]
      },
      strictStudentLearningMaterialThresholds,
      {
        minimum_case_count: 1,
        minimum_question_count: 2,
        require_human_labeled_dataset: true,
        require_double_labeled: true,
        require_adjudicated: true,
        require_anonymized: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.claimable99Correctness).toBe(true);
    expect(result.datasetWarnings).toEqual([]);

    const report = formatStudentLearningMaterialEvaluationDatasetReport(result);
    expect(report).toContain("dataset.id=human-labeled-mini-gold");
    expect(report).toContain("dataset.model=mock/mock-reasoner");
    expect(report).toContain("claimable99Correctness=yes");
  });

  it("requires claim-ready asset preflight metadata to belong to the current dataset", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000519",
      studentId
    });
    const result = evaluateStudentLearningMaterialDatasetBundle(
      {
        fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
        dataset_id: "human-labeled-current-dataset",
        dataset_kind: "human_labeled",
        review_protocol: {
          double_labeled: true,
          adjudicated: true,
          anonymized: true,
          reviewer_roles: ["教研标注员", "授课老师"]
        },
        asset_preflight: {
          claimable99AssetReady: true,
          manifest_id: "another-asset-manifest",
          blockers: ["stale blocker should not coexist with ready preflight"]
        },
        cases: [{ gold: createGoldCase(), analysis: createEvaluationAnalysis(packet) }]
      },
      strictStudentLearningMaterialThresholds,
      {
        minimum_case_count: 1,
        minimum_question_count: 2,
        require_human_labeled_dataset: true,
        require_double_labeled: true,
        require_adjudicated: true,
        require_anonymized: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.claimable99Correctness).toBe(false);
    expect(result.datasetWarnings.join(" ")).toContain("asset_preflight.manifest_id 必须匹配 dataset_id");
    expect(result.datasetWarnings.join(" ")).toContain("asset_preflight.checked_at 必须记录");
    expect(result.datasetWarnings.join(" ")).toContain("claimable99AssetReady=true 时 blockers 必须为空");
  });

  it("requires asset preflight readiness before dataset-level 99% claims", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000515",
      studentId
    });
    const result = evaluateStudentLearningMaterialDatasetBundle(
      {
        fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
        dataset_id: "human-labeled-no-asset-preflight",
        dataset_kind: "human_labeled",
        review_protocol: {
          double_labeled: true,
          adjudicated: true,
          anonymized: true,
          reviewer_roles: ["教研标注员", "授课老师"]
        },
        cases: [{ gold: createGoldCase(), analysis: createEvaluationAnalysis(packet) }]
      },
      strictStudentLearningMaterialThresholds,
      {
        minimum_case_count: 1,
        minimum_question_count: 2,
        require_human_labeled_dataset: true,
        require_double_labeled: true,
        require_adjudicated: true,
        require_anonymized: true
      }
    );

    expect(result.ok).toBe(true);
    expect(result.claimable99Correctness).toBe(false);
    expect(result.datasetWarnings.join(" ")).toContain("validate:k12-eval-assets");
  });

  it("fails the dataset file runner when metrics pass but asset preflight is missing", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000516",
      studentId
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-eval-no-preflight-"));
    writeFileSync(join(dir, "gold.json"), JSON.stringify(createGoldCase()), "utf8");
    writeFileSync(join(dir, "analysis.json"), JSON.stringify(createEvaluationAnalysis(packet)), "utf8");
    writeFileSync(
      join(dir, "dataset.json"),
      JSON.stringify({
        fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
        dataset_id: "human-labeled-file-no-asset-preflight",
        dataset_kind: "human_labeled",
        review_protocol: {
          double_labeled: true,
          adjudicated: true,
          anonymized: true,
          reviewer_roles: ["教研标注员", "授课老师"]
        },
        cases: [{ gold_path: "gold.json", analysis_path: "analysis.json" }]
      }),
      "utf8"
    );

    const run = evaluateStudentLearningMaterialDatasetFile(
      join(dir, "dataset.json"),
      strictStudentLearningMaterialThresholds,
      {
        minimum_case_count: 1,
        minimum_question_count: 2,
        require_human_labeled_dataset: true,
        require_double_labeled: true,
        require_adjudicated: true,
        require_anonymized: true
      }
    );

    expect(run.loadErrors).toEqual([]);
    expect(run.result?.ok).toBe(true);
    expect(run.result?.claimable99Correctness).toBe(false);
    expect(run.ok).toBe(false);
    expect(run.report).toContain("StudentLearningMaterialAnalysis evaluation: PASS");
    expect(run.report).toContain("claimable99Correctness=no");
    expect(run.report).toContain("validate:k12-eval-assets");
  });

  it("refuses 99% claims when a human-labeled dataset is too narrow for K12 coverage", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000513",
      studentId
    });
    const claimPolicy: StudentLearningMaterialEvaluationClaimPolicy = {
      minimum_case_count: 1,
      minimum_question_count: 2,
      minimum_definitive_allowed_question_count: 2,
      minimum_teacher_review_expected_question_count: 2,
      minimum_material_type_count: 2,
      minimum_subject_count: 2,
      required_education_stages: ["primary", "middle", "high"],
      minimum_region_or_curriculum_count: 2,
      minimum_region_or_curriculum_group_count: 2,
      minimum_curriculum_version_family_count: 1,
      require_exam_scope_signal: true,
      require_human_labeled_dataset: true,
      require_double_labeled: true,
      require_adjudicated: true,
      require_anonymized: true
    };
    const result = evaluateStudentLearningMaterialDatasetBundle(
      {
        fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
        dataset_id: "human-labeled-narrow-gold",
        dataset_kind: "human_labeled",
        model_under_test: {
          provider_name: "mock",
          model_name: "mock-reasoner"
        },
        review_protocol: {
          double_labeled: true,
          adjudicated: true,
          anonymized: true,
          reviewer_roles: ["教研标注员", "授课老师"]
        },
        cases: [{ gold: createGoldCase(), analysis: createEvaluationAnalysis(packet) }]
      },
      strictStudentLearningMaterialThresholds,
      claimPolicy
    );

    expect(result.ok).toBe(true);
    expect(result.claim_policy).toBe(claimPolicy);
    expect(result.claimable99Correctness).toBe(false);
    expect(result.datasetWarnings.join(" ")).toContain("可硬判题目覆盖不足");
    expect(result.datasetWarnings.join(" ")).toContain("需复核题目覆盖不足");
    expect(result.datasetWarnings.join(" ")).toContain("材料类型覆盖不足");
    expect(result.datasetWarnings.join(" ")).toContain("学科覆盖不足");
    expect(result.datasetWarnings.join(" ")).toContain("学段覆盖不足");
    expect(result.datasetWarnings.join(" ")).toContain("地区/教材线索覆盖不足");
    expect(result.datasetWarnings.join(" ")).toContain("大陆区域覆盖不足");
    expect(result.datasetWarnings.join(" ")).toContain("教材版本族覆盖不足");
    expect(result.datasetWarnings.join(" ")).toContain("全国卷/新高考");

    const report = formatStudentLearningMaterialEvaluationDatasetReport(result);
    expect(report).toContain("dataset.id=human-labeled-narrow-gold");
    expect(report).toContain("claimPolicy.requirements=");
    expect(report).toContain("minimumRegionOrCurriculumGroups:2");
    expect(report).toContain("minimumCurriculumVersionFamilies:1");
    expect(report).toContain("requireExamScopeSignal:true");
    expect(report).toContain("claimable99Correctness=no");
  });

  it("loads inline evaluation dataset JSON and runs the same report path", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000511",
      studentId
    });
    const dataset = {
      fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
      dataset_id: "inline-human-labeled-mini-gold",
      dataset_kind: "human_labeled",
      model_under_test: {
        provider_name: "mock",
        model_name: "mock-reasoner"
      },
      review_protocol: {
        double_labeled: true,
        adjudicated: true,
        anonymized: true,
        reviewer_roles: ["教研标注员", "授课老师"]
      },
      asset_preflight: createAssetPreflightReady("inline-human-labeled-mini-gold"),
      cases: [
        {
          gold: createGoldCase(),
          analysis: createEvaluationAnalysis(packet),
          asset_manifest_case_id: "inline-human-labeled-mini-gold-case-001",
          gold_label_package_path: "human-review/gold-label-package.json",
          analysis_path: "artifacts/analysis.json"
        }
      ]
    };

    const loaded = loadStudentLearningMaterialEvaluationDatasetBundleFromJsonText(JSON.stringify(dataset));

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const result = evaluateStudentLearningMaterialDatasetBundle(
      loaded.bundle,
      strictStudentLearningMaterialThresholds,
      {
        minimum_case_count: 1,
        minimum_question_count: 2,
        require_human_labeled_dataset: true,
        require_double_labeled: true,
        require_adjudicated: true,
        require_anonymized: true
      }
    );
    expect(result.claimable99Correctness).toBe(true);
  });

  it("loads dataset files with relative gold and analysis paths", () => {
    const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
      materialId: "00000000-0000-0000-0000-000000000512",
      studentId
    });
    const dir = mkdtempSync(join(tmpdir(), "xuemai-eval-"));
    writeFileSync(join(dir, "gold.json"), JSON.stringify(createGoldCase()), "utf8");
    writeFileSync(join(dir, "analysis.json"), JSON.stringify(createEvaluationAnalysis(packet)), "utf8");
    writeFileSync(
      join(dir, "dataset.json"),
      JSON.stringify({
        fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
        dataset_id: "relative-path-human-labeled-mini-gold",
        dataset_kind: "human_labeled",
        review_protocol: {
          double_labeled: true,
          adjudicated: true,
          anonymized: true,
          reviewer_roles: ["教研标注员", "授课老师"]
        },
        asset_preflight: createAssetPreflightReady("relative-path-human-labeled-mini-gold"),
        cases: [{ asset_manifest_case_id: "relative-path-human-labeled-mini-gold-case-001", gold_path: "gold.json", analysis_path: "analysis.json" }]
      }),
      "utf8"
    );

    const loaded = loadStudentLearningMaterialEvaluationDatasetBundleFromFile(join(dir, "dataset.json"));

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.bundle.cases[0].gold.case_id).toBe("gold-mainland-k12-math-exam-001");

    const run = evaluateStudentLearningMaterialDatasetFile(
      join(dir, "dataset.json"),
      strictStudentLearningMaterialThresholds,
      {
        minimum_case_count: 1,
        minimum_question_count: 2,
        require_human_labeled_dataset: true,
        require_double_labeled: true,
        require_adjudicated: true,
        require_anonymized: true
      }
    );
    expect(run.ok).toBe(false);
    expect(run.loadErrors).toEqual([]);
    expect(run.result?.claimable99Correctness).toBe(false);
    expect(run.report).toContain("dataset.id=relative-path-human-labeled-mini-gold");
    expect(run.report).toContain("claimable99Correctness=no");
    expect(run.report).toContain("asset manifest case provenance");
  });

  it("reports malformed dataset JSON and missing referenced files", () => {
    const badJson = loadStudentLearningMaterialEvaluationDatasetBundleFromJsonText("{not json");
    expect(badJson.ok).toBe(false);
    if (!badJson.ok) expect(badJson.errors.join(" ")).toContain("Cannot parse");

    const dir = mkdtempSync(join(tmpdir(), "xuemai-eval-bad-"));
    writeFileSync(
      join(dir, "dataset.json"),
      JSON.stringify({
        fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
        dataset_id: "missing-reference-dataset",
        dataset_kind: "human_labeled",
        review_protocol: {
          double_labeled: true,
          adjudicated: true,
          anonymized: true,
          reviewer_roles: ["教研标注员"]
        },
        cases: [{ gold_path: "missing-gold.json", analysis_path: "missing-analysis.json" }]
      }),
      "utf8"
    );

    const run = evaluateStudentLearningMaterialDatasetFile(join(dir, "dataset.json"));

    expect(run.ok).toBe(false);
    expect(run.loadErrors.join(" ")).toContain("missing-gold.json");
    expect(run.loadErrors.join(" ")).toContain("missing-analysis.json");
    expect(run.report).toContain("StudentLearningMaterialAnalysis evaluation: FAIL");
  });
});

function createAssetPreflightReady(manifestId: string) {
  return {
    claimable99AssetReady: true,
    manifest_id: manifestId,
    checked_at: "2026-06-20T00:00:00+08:00",
    blockers: []
  };
}

function createGoldCase(overrides?: {
  case_id?: string;
  material_type?: StudentLearningMaterialGoldCase["material_classification"]["material_type"];
  subject?: StudentLearningMaterialGoldCase["material_classification"]["subject"];
  education_stage?: StudentLearningMaterialGoldCase["material_classification"]["education_stage"];
  grade_candidate?: string;
  region_or_curriculum_candidate?: string;
}): StudentLearningMaterialGoldCase {
  return {
    case_id: overrides?.case_id || "gold-mainland-k12-math-exam-001",
    material_classification: {
      material_type: overrides?.material_type || "exam",
      subject: overrides?.subject || "数学",
      education_stage: overrides?.education_stage || "middle",
      grade_candidate: overrides?.grade_candidate || "初二",
      region_or_curriculum_candidate: overrides?.region_or_curriculum_candidate || "江苏"
    },
    questions: [
      {
        question_id: "q001",
        expected_correctness: "partially_correct",
        definitive_judgement_allowed: true,
        expected_knowledge_points: ["一次函数应用"],
        expected_mistake_types: ["condition_extraction_error"]
      },
      {
        question_id: "q002",
        definitive_judgement_allowed: false
      }
    ],
    require_safe_parent_feedback: true,
    require_teacher_professional_report: true,
    require_monthly_snapshot: true,
    require_model_contract: true
  };
}

function createEvaluationAnalysis(packet: VisionEvidencePacket): StudentLearningMaterialAnalysis {
  const evidenceRefs = packet.evidences.map((evidence) => evidence.evidence_ref);
  const primaryEvidenceRef = evidenceRefs[0];

  return {
    schema_version: "student_learning_material_analysis.v0.4",
    analysis_id: `analysis_${packet.material_id}`,
    source_material_id: packet.source_material_id,
    student_id: packet.student_id,
    material_state: packet.material_state,
    material_classification: {
      material_type: "exam",
      subject: "数学",
      education_stage: "middle",
      grade_candidate: "初二",
      region_or_curriculum_candidate: "江苏",
      classification_confidence: 0.92,
      evidenceRefs: [primaryEvidenceRef]
    },
    gates: packet.gates,
    accuracy_policy: {
      high_confidence_target: ">=99%",
      auto_judgement_rule: "证据齐全且置信度达标时才允许确定性判断。",
      refusal_rule: "证据不足时进入老师确认，不能硬判。",
      unsupported_definitive_judgement_allowed: false
    },
    evidence_summary: {
      usableEvidenceRefs: evidenceRefs,
      missing_context: [],
      reliability_notes: ["人工标注评测样例"]
    },
    question_analyses: [
      {
        question_id: "q001",
        question_number: "1",
        material_refs: [primaryEvidenceRef],
        correctnessJudgement: {
          status: "partially_correct",
          source_basis: "mixed",
          explanation: "学生能写出关系式，但遗漏取值范围。",
          evidenceRefs: [primaryEvidenceRef],
          confidence: 0.91
        },
        knowledgeMapping: [
          {
            knowledge_point_label: "一次函数应用",
            mapping_reason: "题干和学生作答指向一次函数建模。",
            evidenceRefs: [primaryEvidenceRef],
            confidence: 0.9
          }
        ],
        mistakeDiagnosis: [
          {
            diagnosis_type: "condition_extraction_error",
            explanation: "遗漏取值范围。",
            evidenceRefs: [primaryEvidenceRef],
            confidence: 0.88
          }
        ],
        nextActions: [
          {
            action_type: "targeted_practice",
            title: "训练条件标注",
            detail: "先圈取值范围，再列关系式。",
            priority: "high",
            verification_method: "同类题能写出取值范围。",
            evidenceRefs: [primaryEvidenceRef]
          }
        ],
        confidence: 0.9,
        evidenceRefs: [primaryEvidenceRef]
      },
      {
        question_id: "q002",
        question_number: "2",
        material_refs: [primaryEvidenceRef],
        correctnessJudgement: {
          status: "needs_teacher_review",
          source_basis: "insufficient",
          explanation: "缺少评分点，不能确定正误。",
          evidenceRefs: [primaryEvidenceRef],
          confidence: 0.42
        },
        knowledgeMapping: [
          {
            knowledge_point_label: "条件提取",
            mapping_reason: "题目线索不足，仅作为待确认标签。",
            evidenceRefs: [primaryEvidenceRef],
            confidence: 0.45
          }
        ],
        mistakeDiagnosis: [
          {
            diagnosis_type: "unknown",
            explanation: "证据不足，不能推断错因。",
            evidenceRefs: [primaryEvidenceRef],
            confidence: 0.4,
            suggested_verification: "请老师补充评分点或清晰答案。"
          }
        ],
        nextActions: [
          {
            action_type: "teacher_review",
            title: "补充评分点",
            detail: "确认题目评分依据后再判断。",
            priority: "high",
            verification_method: "老师补充标准答案或评分点。",
            evidenceRefs: [primaryEvidenceRef]
          }
        ],
        confidence: 0.42,
        evidenceRefs: [primaryEvidenceRef],
        degradeReason: "answer_key_missing"
      }
    ],
    student_profile_update_suggestions: [
      {
        suggestion_type: "monthly_report_source",
        content: "一次函数应用中条件范围提取仍需跟进。",
        evidenceRefs: [primaryEvidenceRef],
        confidence: 0.88,
        teacher_confirmation_required: true,
        status: "draft"
      }
    ],
    next_learning_actions: [
      {
        action_type: "next_lesson_focus",
        title: "下次课先练条件提取",
        detail: "用同类题训练取值范围标注。",
        priority: "high",
        verification_method: "能独立写出限制条件。",
        evidenceRefs: [primaryEvidenceRef]
      }
    ],
    teacher_professional_report: {
      report_title: "初二数学试卷专业测评型学情报告",
      assessment_style: "professional_evaluation",
      material_overview: "本次材料为初中数学试卷，含学生作答和老师批改。",
      overall_conclusion: "学生能抓住一次函数关系式，但条件范围提取不稳定。",
      score_or_completion_summary: "可见一处明确扣分点，完整分数需结合全卷。",
      question_table_summary: "第 1 题部分正确，第 2 题需老师补评分点。",
      knowledge_mastery_summary: "一次函数建模有基础，条件约束表达需加强。",
      ability_dimension_summary: "审题信息提取和自我检查是优先观察维度。",
      error_pattern_summary: "复杂题中容易遗漏限制条件。",
      priority_focus: "先训练条件标注，再训练答案回看。",
      consolidation_suggestions: ["做 3 道同类题，要求先圈限制条件。"],
      teacher_review_boundary: "第 2 题不能进入确定性结论。",
      evidenceRefs: [primaryEvidenceRef]
    },
    wechat_parent_feedback_draft: {
      status: "draft",
      text: "这次能抓住主要关系式，后续重点练习条件范围的提取和表达完整性。",
      sentences: [
        {
          text: "这次能抓住主要关系式，后续重点练习条件范围的提取和表达完整性。",
          evidenceRefs: [primaryEvidenceRef]
        }
      ],
      warnings: [],
      forbidden_terms_found: []
    },
    monthly_report_snapshot: {
      source_analysis_id: `analysis_${packet.material_id}`,
      student_id: packet.student_id,
      month: "2026-06",
      subject: "数学",
      material_type: "exam",
      material_date: "2026-06-19",
      score_summary: "本次可见一处条件范围扣分点。",
      question_count: 2,
      analyzable_question_count: 1,
      knowledge_points: ["一次函数应用"],
      ability_dimensions: ["审题信息提取", "步骤表达"],
      error_patterns: ["条件范围遗漏"],
      main_progress_signal: "能抓住主要关系式。",
      main_issue_signal: "条件范围提取不稳定。",
      first_priority_action: "训练条件标注。",
      parent_visible_summary: "本次能抓住主要关系式，后续重点练条件范围表达。",
      teacher_only_notes: ["第 2 题证据不足，不进入趋势判断。"],
      confidence: 0.88,
      evidenceRefs: [primaryEvidenceRef],
      teacher_confirmed: false
    },
    monthly_comparison_seed: {
      previous_month_snapshot: {
        month: "2026-05",
        main_issue_signal: "读题条件整理不稳定。",
        first_priority_action: "训练题干标注。",
        confidence: 0.78,
        evidenceRefs: ["synthetic.previous_month.2026-05.report_001"]
      },
      current_month_snapshot: {
        month: "2026-06",
        main_progress_signal: "能抓住主要关系式。",
        main_issue_signal: "条件范围提取不稳定。",
        first_priority_action: "训练条件标注。",
        confidence: 0.88
      },
      trend_by_knowledge_point: [
        {
          knowledge_point: "一次函数应用",
          trend: "stable",
          evidenceRefs: [primaryEvidenceRef]
        }
      ],
      trend_by_ability_dimension: [
        {
          dimension: "审题信息提取",
          trend: "watch",
          evidenceRefs: [primaryEvidenceRef]
        }
      ],
      trend_by_error_pattern: [
        {
          pattern: "条件范围遗漏",
          trend: "repeated",
          evidenceRefs: [primaryEvidenceRef]
        }
      ],
      new_issues: [],
      improved_issues: ["主要关系式识别更稳定"],
      repeated_issues: ["条件范围遗漏"],
      confidence_change: "本月证据可与上月谨慎比较。",
      teacher_interpretation: "本月可强调基础关系识别稳定，同时继续跟进条件表达。",
      parent_readable_comparison: "和上月相比，孩子在主要关系式识别上更稳定，但条件范围表达仍需继续练习。",
      evidenceRefs: [primaryEvidenceRef, "synthetic.previous_month.2026-05.report_001"]
    },
    model_contract: {
      input_schema: "VisionEvidencePacket",
      output_schema: "StudentLearningMaterialAnalysis",
      vision_provider_replaceable: true,
      reasoning_model_replaceable: true,
      strict_json_schema_preferred: true,
      provider_name: "mock",
      model_name: "mock-reasoner"
    },
    teacher_review_required: true,
    risk_flags: [],
    audit: {
      runtime_model: "mock-reasoner",
      vision_plugin_run_id: packet.plugin_run_id,
      created_at: "2026-06-19T00:00:00+08:00",
      error_sources: []
    }
  };
}
