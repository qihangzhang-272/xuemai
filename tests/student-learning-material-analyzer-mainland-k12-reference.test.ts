import { describe, expect, it } from "vitest";
import {
  buildMainlandK12RegionCurriculumCoverage,
  buildMainlandK12PromptReference,
  getMainlandK12StageReference,
  getMainlandK12SubjectReference,
  getStageSubjectCompatibility,
  mainlandK12ReferenceSources
} from "../src/skills/student-learning-material-analyzer/mainland-k12-reference";

describe("mainland K12 public reference", () => {
  it("keeps public curriculum and policy source metadata for prompt grounding", () => {
    expect(mainlandK12ReferenceSources.map((source) => source.title)).toEqual(
      expect.arrayContaining([
        "义务教育课程方案和课程标准（2022年版）",
        "普通高中课程方案和语文等学科课程标准（2017年版2020年修订）",
        "教育部关于加强初中学业水平考试命题工作的意见（教基〔2019〕15号）",
        "深化新时代教育评价改革总体方案"
      ])
    );
    expect(mainlandK12ReferenceSources.every((source) => source.url.startsWith("https://"))).toBe(true);
  });

  it("maps mainland K12 stages to likely academic subjects without pretending all regional variants are known", () => {
    expect(getMainlandK12StageReference("primary")?.common_subjects).toEqual(expect.arrayContaining(["语文", "数学", "英语", "科学"]));
    expect(getMainlandK12StageReference("middle")?.common_subjects).toEqual(expect.arrayContaining(["物理", "化学", "生物学", "历史", "地理"]));
    expect(getMainlandK12StageReference("high")?.common_subjects).toEqual(expect.arrayContaining(["思想政治", "信息技术", "通用技术"]));
  });

  it("provides subject ability dimensions for professional teacher reports", () => {
    expect(getMainlandK12SubjectReference("数学").ability_dimensions).toEqual(expect.arrayContaining(["概念理解", "运算能力", "逻辑推理", "模型建构"]));
    expect(getMainlandK12SubjectReference("历史").report_focus).toEqual(expect.arrayContaining(["材料依据定位", "时空线索"]));
    expect(getMainlandK12SubjectReference("日语").ability_dimensions).toEqual(expect.arrayContaining(["阅读理解", "写作组织"]));
  });

  it("flags stage-subject mismatches for teacher review instead of hard assumptions", () => {
    expect(getStageSubjectCompatibility({ stage: "middle", subject: "物理" })).toEqual({
      compatible: true,
      warning: ""
    });
    const mismatch = getStageSubjectCompatibility({ stage: "primary", subject: "物理" });
    expect(mismatch.compatible).toBe(false);
    expect(mismatch.warning).toContain("需核对材料学段");
  });

  it("builds a compact prompt reference with policy boundaries", () => {
    const promptReference = buildMainlandK12PromptReference();

    expect(promptReference.source_titles).toContain("义务教育课程方案和课程标准（2022年版）");
    expect(promptReference.stage_subjects.some((stage) => stage.stage === "high")).toBe(true);
    expect(promptReference.subject_dimensions.some((subject) => subject.subject === "数学")).toBe(true);
    expect(promptReference.policy_boundaries.join(" ")).toContain("不承诺提分");
  });

  it("groups region, curriculum, and national exam-scope signals for claim coverage", () => {
    const coverage = buildMainlandK12RegionCurriculumCoverage(["广东/人教版", "江苏/苏教版", "全国卷/新高考", "北师大版", "青岛版/北京版/鲁科版", "仁爱版", "西师版"]);

    expect(coverage.region_groups).toEqual(expect.arrayContaining(["华南", "华东"]));
    expect(coverage.curriculum_version_families).toEqual(expect.arrayContaining(["人教系", "地方教材系", "师大系", "外语教材系"]));
    expect(coverage.exam_scope_signals).toEqual(expect.arrayContaining(["全国/新课标", "新高考"]));
  });
});
