import type { MockVisionFixtureId, VisionEvidencePacket, VisionEvidenceType } from "./types";

const defaultCreatedAt = "2026-06-15T00:00:00+08:00";

export const mockVisionFixtureIds: MockVisionFixtureId[] = [
  "clear_exam_with_teacher_correction",
  "wrong_question_final_answer_no_key",
  "blank_question_template",
  "student_notes_only",
  "student_identity_mismatch"
];

export function getMockVisionEvidencePacket(fixtureId: MockVisionFixtureId, input?: { materialId?: string; studentId?: string; teacherId?: string; tenantId?: string }) {
  const materialId = input?.materialId ?? `mat_${fixtureId}`;
  const studentId = input?.studentId ?? "student_mock_001";
  const teacherId = input?.teacherId;
  const tenantId = input?.tenantId;

  if (fixtureId === "clear_exam_with_teacher_correction") {
    return createPacket({
      fixtureId,
      materialId,
      studentId,
      teacherId,
      tenantId,
      materialState: "valid_student_material",
      gates: [
        gate("student_trace", "pass", "包含学生作答和老师批改。", ["ev_exam_answer_001", "ev_exam_mark_001"]),
        gate("answer_key", "pass", "包含标准答案和评分点。", ["ev_exam_key_001"])
      ],
      evidences: [
        evidence(materialId, "ev_exam_stem_001", "question_stem", "一次函数应用题：根据表格建立关系式。"),
        evidence(materialId, "ev_exam_answer_001", "student_original_answer", "y=2x+1，未写取值范围。"),
        evidence(materialId, "ev_exam_mark_001", "teacher_mark", "老师批注：漏取值范围，扣 1 分。", 0.92, true),
        evidence(materialId, "ev_exam_key_001", "answer_key", "标准答案：y=2x+1，x 为非负整数。", 0.96, true)
      ]
    });
  }

  if (fixtureId === "wrong_question_final_answer_no_key") {
    return createPacket({
      fixtureId,
      materialId,
      studentId,
      teacherId,
      tenantId,
      materialState: "valid_student_material",
      gates: [
        gate("student_trace", "pass", "包含学生最终答案。", ["ev_wrong_answer_001"]),
        gate("answer_key", "degrade", "未提供标准答案或评分点，正误判断必须降级。", [])
      ],
      evidences: [
        evidence(materialId, "ev_wrong_stem_001", "question_stem", "解方程并说明步骤。"),
        evidence(materialId, "ev_wrong_answer_001", "student_original_answer", "x=3", 0.85)
      ]
    });
  }

  if (fixtureId === "blank_question_template") {
    return createPacket({
      fixtureId,
      materialId,
      studentId,
      teacherId,
      tenantId,
      materialState: "blank_template",
      gates: [
        gate("student_trace", "block", "空白题目模板，没有学生作答、订正、批改或笔记痕迹。", []),
        gate("analysis_scope", "block", "不能据此推断学生能力。", [])
      ],
      evidences: [evidence(materialId, "ev_blank_stem_001", "question_stem", "阅读材料并回答问题。", 0.94)]
    });
  }

  if (fixtureId === "student_notes_only") {
    return createPacket({
      fixtureId,
      materialId,
      studentId,
      teacherId,
      tenantId,
      materialState: "notes_only",
      gates: [
        gate("student_trace", "degrade", "只有学生笔记，没有明确题目、标准答案或批改。", ["ev_note_001"]),
        gate("correctness", "block", "不能做正误判断。", ["ev_note_001"])
      ],
      evidences: [evidence(materialId, "ev_note_001", "student_note", "一次函数要先找自变量和因变量。", 0.88)]
    });
  }

  return createPacket({
    fixtureId,
    materialId,
    studentId,
    teacherId,
    tenantId,
    materialState: "needs_review",
    studentIdentityStatus: "conflict",
    gates: [
      gate("student_identity", "block", "材料上的学生姓名与当前学生不一致，需要老师确认。", ["ev_identity_001"]),
      gate("student_trace", "degrade", "存在学生答案，但身份未确认。", ["ev_identity_001", "ev_identity_answer_001"])
    ],
    evidences: [
      evidence(materialId, "ev_identity_001", "material_metadata", "图片角落姓名疑似李同学。", 0.78),
      evidence(materialId, "ev_identity_answer_001", "student_original_answer", "答案为 B。", 0.84)
    ]
  });
}

function createPacket(input: {
  fixtureId: MockVisionFixtureId;
  materialId: string;
  studentId: string;
  teacherId?: string;
  tenantId?: string;
  materialState: VisionEvidencePacket["material_state"];
  studentIdentityStatus?: VisionEvidencePacket["student_identity_status"];
  gates: VisionEvidencePacket["gates"];
  evidences: VisionEvidencePacket["evidences"];
}): VisionEvidencePacket {
  const evidenceRefById = new Map(input.evidences.map((item) => [item.evidence_id, item.evidence_ref]));
  return {
    schema_version: "vision_evidence_packet.v0.4",
    plugin_run_id: `mock_vision_${input.fixtureId}`,
    material_id: input.materialId,
    source_material_id: input.materialId,
    tenant_id: input.tenantId,
    teacher_id: input.teacherId,
    student_id: input.studentId,
    student_identity_status: input.studentIdentityStatus ?? "confirmed",
    plugin_provider: "mock_vision_provider",
    plugin_model_version: "mock-v0.4",
    material_state: input.materialState,
    created_at: defaultCreatedAt,
    pages: [
      {
        page_id: "p01",
        page_index: 1,
        page_image_ref: `mock://materials/${input.materialId}/p01.png`,
        width: 1440,
        height: 1920,
        image_quality_confidence: input.materialState === "low_quality" ? 0.52 : 0.91,
        quality_flags: input.materialState === "low_quality" ? ["low_image_quality"] : []
      }
    ],
    questions: [
      {
        question_id: "q001",
        question_number: "1",
        question_type_candidate: "open_response",
        page_id: "p01",
        regions: [
          {
            region_id: "reg_p01_q001",
            region_role: "question_region",
            page_id: "p01",
            bbox: { x1: 0.1, y1: 0.15, x2: 0.88, y2: 0.52, coord_space: "normalized" },
            crop_ref: `crop://${input.materialId}/p01/q001`,
            confidence: 0.9
          }
        ],
        confidence: 0.9,
        risk_flags: []
      }
    ],
    evidences: input.evidences,
    gates: input.gates.map((item) => ({
      ...item,
      evidenceRefs: item.evidenceRefs.map((ref) => evidenceRefById.get(ref) ?? ref)
    })),
    plugin_errors: [],
    metadata: {
      fixture_id: input.fixtureId
    }
  };
}

function evidence(
  materialId: string,
  evidenceId: string,
  evidenceType: VisionEvidenceType,
  text: string,
  confidence = 0.9,
  teacherVerified = false
): VisionEvidencePacket["evidences"][number] {
  return {
    evidence_id: evidenceId,
    evidence_ref: `material.${materialId}.page_p01.question_q001.${evidenceId}`,
    source_material_id: materialId,
    page_id: "p01",
    question_id: "q001",
    region_id: "reg_p01_q001",
    evidence_type: evidenceType,
    text,
    raw_ocr_text: text,
    normalized_text: text,
    bbox: { x1: 0.12, y1: 0.22, x2: 0.82, y2: 0.42, coord_space: "normalized" },
    crop_ref: `crop://${materialId}/p01/q001/${evidenceId}`,
    confidence,
    teacher_verified: teacherVerified,
    risk_flags: confidence < 0.65 ? ["low_confidence"] : []
  };
}

function gate(gateId: string, status: VisionEvidencePacket["gates"][number]["status"], reason: string, evidenceRefs: string[]) {
  return {
    gate_id: gateId,
    status,
    reason,
    evidenceRefs,
    risk_flags: status === "pass" ? [] : [gateId]
  };
}
