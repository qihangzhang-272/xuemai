import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import {
  generateStudentLearningMaterialUserFacingResultFile,
  generateStudentLearningMaterialUserFacingResultFromAnalysisFile,
  readStudentLearningMaterialUserFacingResultFile
} from "../src/skills/student-learning-material-analyzer/result-files";
import type {
  LearningMaterialAnalysisModel,
  StudentLearningMaterialAnalysis,
  VisionEvidencePacket
} from "../src/skills/student-learning-material-analyzer/types";

const teacherContext = {
  teacherId: "00000000-0000-0000-0000-000000000101",
  tenantId: "00000000-0000-0000-0000-000000000201"
};

const studentId = "00000000-0000-0000-0000-000000000301";

describe("student learning material user-facing result files", () => {
  it("writes the final teacher report, parent feedback, and monthly result artifact", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-user-result-"));
    const packet = appendReviewOnlyQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "00000000-0000-0000-0000-000000000601",
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      })
    );
    const packetPath = path.join(tempDir, "packet.json");
    const resultPath = path.join(tempDir, "result", "case-001.user-facing-result.json");
    const analysisPath = path.join(tempDir, "analysis", "case-001.analysis.json");
    const model = await createFixtureBackedModel(packet);

    await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

    const result = await generateStudentLearningMaterialUserFacingResultFile({
      visionPacketPath: packetPath,
      resultOutputPath: resultPath,
      analysisOutputPath: analysisPath,
      model
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "draft_ready",
        resultOutputPath: resultPath,
        analysisOutputPath: analysisPath,
        teacherReportStatus: "needs_teacher_review",
        parentFeedbackStatus: "needs_teacher_review",
        validationErrors: [],
        safetyWarnings: []
      })
    );
    const written = await readStudentLearningMaterialUserFacingResultFile(resultPath);
    expect(written.schema_version).toBe("student_learning_material_user_facing_result.v0.1");
    expect(written.teacher_report.assessment_style).toBe("professional_evaluation");
    expect(written.teacher_report.question_rows.length).toBeGreaterThan(0);
    expect(written.teacher_report.markdown).toContain("## 逐题分析");
    expect(written.teacher_report.markdown).toContain("## 家长反馈草稿");
    expect(written.teacher_report.markdown).not.toContain("evidenceRefs");
    expect(written.parent_feedback.copyable).toBe(false);
    expect(written.parent_feedback.warnings).toContain("teacher_review_required");
    expect(written.monthly_result.comparison_to_previous_month).toContain("和上月相比");
    await expect(stat(analysisPath)).resolves.toEqual(expect.objectContaining({ size: expect.any(Number) }));
  });

  it("assembles the final result from an existing analysis artifact", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-user-result-from-analysis-"));
    const analysisPath = path.join(tempDir, "analysis.json");
    const resultPath = path.join(tempDir, "result.json");
    const analysis = await readSyntheticAnalysis();
    await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");

    const result = await generateStudentLearningMaterialUserFacingResultFromAnalysisFile({
      analysisInputPath: analysisPath,
      resultOutputPath: resultPath
    });

    expect(result).toEqual(
      expect.objectContaining({
        analysisId: analysis.analysis_id,
        resultOutputPath: resultPath,
        parentFeedbackStatus: "needs_teacher_review",
        validationErrors: [],
        safetyWarnings: []
      })
    );
    const written = await readStudentLearningMaterialUserFacingResultFile(resultPath);
    expect(written.analysis_id).toBe(analysis.analysis_id);
    expect(written.teacher_report.title).toContain("专业测评型学情报告");
    expect(written.parent_feedback.copyable).toBe(false);
    expect(written.parent_feedback.warnings).toContain("teacher_review_required");
  });

  it("does not write a degraded final result unless explicitly allowed", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-user-result-degraded-"));
    const packet = getMockVisionEvidencePacket("blank_question_template", {
      materialId: "00000000-0000-0000-0000-000000000602",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const packetPath = path.join(tempDir, "packet.json");
    const resultPath = path.join(tempDir, "result.json");
    await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

    await expect(
      generateStudentLearningMaterialUserFacingResultFile({
        visionPacketPath: packetPath,
        resultOutputPath: resultPath
      })
    ).rejects.toThrow("did not reach draft_ready");
    await expect(stat(resultPath)).rejects.toThrow();
  });

  it("writes a degraded review result when allowDegraded is explicit", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-user-result-degraded-"));
    const packet = getMockVisionEvidencePacket("blank_question_template", {
      materialId: "00000000-0000-0000-0000-000000000603",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const packetPath = path.join(tempDir, "packet.json");
    const resultPath = path.join(tempDir, "result.json");
    await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

    const result = await generateStudentLearningMaterialUserFacingResultFile({
      visionPacketPath: packetPath,
      resultOutputPath: resultPath,
      allowDegraded: true
    });

    expect(result.status).toBe("degraded");
    const written = await readStudentLearningMaterialUserFacingResultFile(resultPath);
    expect(written.teacher_report.status).toBe("needs_teacher_review");
    expect(written.parent_feedback.copyable).toBe(false);
    expect(written.parent_feedback.text).toContain("暂不生成可发送给家长的反馈");
  });
});

async function createFixtureBackedModel(packet: VisionEvidencePacket): Promise<LearningMaterialAnalysisModel> {
  const analysis = normalizeAnalysisForPacket(await readSyntheticAnalysis(), packet);
  return {
    async generateAnalysis() {
      return analysis;
    }
  };
}

function appendReviewOnlyQuestion(packet: VisionEvidencePacket): VisionEvidencePacket {
  const clone = JSON.parse(JSON.stringify(packet)) as VisionEvidencePacket;
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
        bbox: { x1: 0.1, y1: 0.55, x2: 0.88, y2: 0.72, coord_space: "normalized" },
        crop_ref: `crop://${clone.material_id}/p01/q002`,
        confidence: 0.88
      }
    ],
    confidence: 0.88,
    risk_flags: []
  });
  clone.evidences.push({
    evidence_id: "ev_q002_stem_001",
    evidence_ref: "synthetic.material_001.q002.stem",
    source_material_id: clone.material_id,
    page_id: "p01",
    question_id: "q002",
    region_id: "reg_p01_q002",
    evidence_type: "question_stem",
    text: "第 2 题题干可见，但缺少学生答案或答案依据。",
    raw_ocr_text: "第 2 题题干可见，但缺少学生答案或答案依据。",
    normalized_text: "第 2 题题干可见，但缺少学生答案或答案依据。",
    bbox: { x1: 0.12, y1: 0.56, x2: 0.82, y2: 0.68, coord_space: "normalized" },
    crop_ref: `crop://${clone.material_id}/p01/q002/stem`,
    confidence: 0.86,
    teacher_verified: false,
    risk_flags: []
  });
  return clone;
}

async function readSyntheticAnalysis(): Promise<StudentLearningMaterialAnalysis> {
  const fixturePath = path.join(process.cwd(), "tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
    cases: Array<{
      analysis: StudentLearningMaterialAnalysis;
    }>;
  };
  return JSON.parse(JSON.stringify(fixture.cases[0].analysis)) as StudentLearningMaterialAnalysis;
}

function normalizeAnalysisForPacket(
  analysis: StudentLearningMaterialAnalysis,
  packet: VisionEvidencePacket
): StudentLearningMaterialAnalysis {
  const mappedAnalysis = remapLegacyFixtureEvidenceRefs(analysis, packet);
  return {
    ...mappedAnalysis,
    analysis_id: `analysis_${packet.material_id}`,
    source_material_id: packet.source_material_id,
    student_id: packet.student_id,
    material_state: packet.material_state,
    gates: packet.gates,
    monthly_report_snapshot: {
      ...mappedAnalysis.monthly_report_snapshot,
      source_analysis_id: `analysis_${packet.material_id}`,
      student_id: packet.student_id
    },
    audit: {
      ...mappedAnalysis.audit,
      vision_plugin_run_id: packet.plugin_run_id
    }
  };
}

function remapLegacyFixtureEvidenceRefs<T>(value: T, packet: VisionEvidencePacket): T {
  const byLegacyRef = new Map(
    [
      ["synthetic.material_001.q001.stem", findEvidenceRef(packet, "question_stem")],
      ["synthetic.material_001.q001.answer", findEvidenceRef(packet, "student_original_answer")],
      ["synthetic.material_001.q001.teacher_mark", findEvidenceRef(packet, "teacher_mark")],
      ["synthetic.material_001.q001.answer_key", findEvidenceRef(packet, "answer_key")]
    ].filter((item): item is [string, string] => Boolean(item[1]))
  );

  return JSON.parse(
    JSON.stringify(value),
    (_key, nestedValue) => (typeof nestedValue === "string" ? byLegacyRef.get(nestedValue) ?? nestedValue : nestedValue)
  ) as T;
}

function findEvidenceRef(packet: VisionEvidencePacket, evidenceType: string) {
  return packet.evidences.find((evidence) => evidence.question_id === "q001" && evidence.evidence_type === evidenceType)?.evidence_ref;
}
