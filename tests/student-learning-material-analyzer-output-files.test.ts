import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import {
  generateStudentLearningMaterialAnalysisOutputFile,
  readStudentLearningMaterialAnalysisOutputFile
} from "../src/skills/student-learning-material-analyzer/output-files";
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

describe("student learning material analysis output files", () => {
  it("writes provider output as a StudentLearningMaterialAnalysis JSON file for later eval", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-analysis-output-"));
    const packet = appendReviewOnlyQuestion(
      getMockVisionEvidencePacket("clear_exam_with_teacher_correction", {
        materialId: "00000000-0000-0000-0000-000000000501",
        studentId,
        teacherId: teacherContext.teacherId,
        tenantId: teacherContext.tenantId
      })
    );
    const packetPath = path.join(tempDir, "packet.json");
    const outputPath = path.join(tempDir, "analysis", "case-001.analysis.json");
    const model = await createFixtureBackedModel(packet);

    await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

    const result = await generateStudentLearningMaterialAnalysisOutputFile({
      visionPacketPath: packetPath,
      analysisOutputPath: outputPath,
      model
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "draft_ready",
        analysisOutputPath: outputPath,
        validationErrors: [],
        safetyWarnings: []
      })
    );
    const written = await readStudentLearningMaterialAnalysisOutputFile(outputPath);
    expect(written).toEqual(
      expect.objectContaining({
        schema_version: "student_learning_material_analysis.v0.4",
        source_material_id: packet.source_material_id,
        student_id: packet.student_id
      })
    );
    expect(written.model_contract).toEqual(
      expect.objectContaining({
        input_schema: "VisionEvidencePacket",
        output_schema: "StudentLearningMaterialAnalysis",
        reasoning_model_replaceable: true
      })
    );
  });

  it("does not write degraded output unless explicitly allowed", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-analysis-output-"));
    const packet = getMockVisionEvidencePacket("blank_question_template", {
      materialId: "00000000-0000-0000-0000-000000000502",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const packetPath = path.join(tempDir, "packet.json");
    const outputPath = path.join(tempDir, "analysis.json");
    await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

    await expect(
      generateStudentLearningMaterialAnalysisOutputFile({
        visionPacketPath: packetPath,
        analysisOutputPath: outputPath,
        model: {
          async generateAnalysis() {
            throw new Error("Model should not be called for blocked material.");
          }
        }
      })
    ).rejects.toThrow("did not reach draft_ready");
    await expect(stat(outputPath)).rejects.toThrow();
  });

  it("writes degraded output only when allowDegraded is explicit", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-analysis-output-"));
    const packet = getMockVisionEvidencePacket("blank_question_template", {
      materialId: "00000000-0000-0000-0000-000000000503",
      studentId,
      teacherId: teacherContext.teacherId,
      tenantId: teacherContext.tenantId
    });
    const packetPath = path.join(tempDir, "packet.json");
    const outputPath = path.join(tempDir, "analysis.degraded.json");
    await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

    const result = await generateStudentLearningMaterialAnalysisOutputFile({
      visionPacketPath: packetPath,
      analysisOutputPath: outputPath,
      allowDegraded: true
    });

    expect(result.status).toBe("degraded");
    const written = await readStudentLearningMaterialAnalysisOutputFile(outputPath);
    expect(written.risk_flags).toContain("no_student_trace");
    expect(written.wechat_parent_feedback_draft.status).toBe("needs_teacher_review");
  });
});

async function createFixtureBackedModel(packet: VisionEvidencePacket): Promise<LearningMaterialAnalysisModel> {
  const fixturePath = path.join(process.cwd(), "tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json");
  const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as {
    cases: Array<{
      analysis: StudentLearningMaterialAnalysis;
    }>;
  };
  const analysis = normalizeAnalysisForPacket(fixture.cases[0].analysis, packet);

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
