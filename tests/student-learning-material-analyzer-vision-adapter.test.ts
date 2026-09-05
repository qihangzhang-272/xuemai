import { describe, expect, it } from "vitest";
import { buildQuestionEvidenceReadiness } from "../src/skills/student-learning-material-analyzer/question-evidence-readiness";
import {
  createVisionEvidencePacketFromExternalProvider,
  validateExternalVisionAdapterInput,
  type ExternalVisionAdapterInput
} from "../src/skills/student-learning-material-analyzer/vision-adapter";
import { validateVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/validators";

const studentId = "00000000-0000-0000-0000-000000000301";
const teacherId = "00000000-0000-0000-0000-000000000101";
const tenantId = "00000000-0000-0000-0000-000000000201";

describe("external vision provider adapter", () => {
  it("converts provider output into a valid VisionEvidencePacket with pipeline trace", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(createProviderInput());
    const validation = validateVisionEvidencePacket(packet);
    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(validation).toEqual(
      expect.objectContaining({
        ok: true,
        errors: []
      })
    );
    expect(packet).toEqual(
      expect.objectContaining({
        schema_version: "vision_evidence_packet.v0.4",
        plugin_provider: "paddleocr",
        plugin_model_version: "PP-StructureV3-test",
        material_state: "valid_student_material"
      })
    );
    expect(packet.pipeline_trace).toEqual(
      expect.objectContaining({
        selected_provider: "paddleocr",
        provider_candidates: expect.arrayContaining([
          expect.objectContaining({
            name: "paddleocr",
            fit: "primary_candidate",
            evidence_source_url: "https://github.com/PaddlePaddle/PaddleOCR"
          }),
          expect.objectContaining({
            name: "paddlex",
            fit: "fallback_candidate",
            evidence_source_url: "https://github.com/PaddlePaddle/PaddleX"
          }),
          expect.objectContaining({
            name: "docling",
            fit: "benchmark_only",
            evidence_source_url: "https://github.com/docling-project/docling"
          }),
          expect.objectContaining({
            name: "monkeyocr",
            fit: "benchmark_only",
            license_note: expect.stringContaining("academic/non-commercial")
          }),
          expect.objectContaining({
            name: "olmocr",
            fit: "benchmark_only",
            evidence_source_url: "https://github.com/allenai/olmocr"
          }),
          expect.objectContaining({
            name: "deepseek-ocr",
            fit: "benchmark_only",
            notes: expect.arrayContaining([expect.stringContaining("VisionEvidencePacket")])
          }),
          expect.objectContaining({
            name: "dots.mocr",
            fit: "benchmark_only",
            evidence_source_url: "https://github.com/rednote-hilab/dots.mocr",
            notes: expect.arrayContaining([expect.stringContaining("human-gold gates")])
          }),
          expect.objectContaining({
            name: "pix2text",
            fit: "benchmark_only"
          }),
          expect.objectContaining({
            name: "surya",
            fit: "benchmark_only",
            license_note: expect.stringContaining("commercial-use conditions")
          }),
          expect.objectContaining({
            name: "mineru",
            fit: "benchmark_only"
          }),
          expect.objectContaining({
            name: "easyocr",
            fit: "benchmark_only"
          }),
          expect.objectContaining({
            name: "latex-ocr",
            fit: "benchmark_only"
          }),
          expect.objectContaining({
            name: "unimernet",
            fit: "benchmark_only",
            evidence_source_url: "https://github.com/opendatalab/UniMERNet"
          })
        ]),
        question_segmentation_policy: expect.objectContaining({
          definitive_question_requires_crop_ref: true,
          uncertain_boundary_routes_to_review: true
        }),
        evaluation_asset_policy: expect.objectContaining({
          human_gold_required_for_99_claim: true,
          provider_change_requires_dataset_rerun: true
        })
      })
    );
    expect(packet.gates.find((gate) => gate.gate_id === "student_trace")?.status).toBe("pass");
    expect(packet.pipeline_trace?.provider_candidates?.filter((candidate) => candidate.fit === "primary_candidate")).toHaveLength(1);
    expect(readiness.summary.definitive_allowed_count).toBe(1);
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "definitive_allowed",
        definitive_judgement_allowed: true,
        reasons: []
      })
    );
  });

  it("keeps bbox-only provider output structurally valid but routes it to teacher review", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(createProviderInput({ includeCropRefs: false }));
    const validation = validateVisionEvidencePacket(packet);
    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(validation.ok).toBe(true);
    expect(validation.warnings.join(" ")).toContain("missing crop_ref");
    expect(packet.gates.find((gate) => gate.gate_id === "question_segmentation")?.status).toBe("degrade");
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "teacher_review_required",
        definitive_judgement_allowed: false,
        reasons: expect.arrayContaining(["question_segmentation_unstable"])
      })
    );
  });

  it("blocks provider output without student trace before ability inference", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(createProviderInput({ includeStudentTrace: false }));
    const validation = validateVisionEvidencePacket(packet);
    const readiness = buildQuestionEvidenceReadiness(packet);

    expect(validation.ok).toBe(true);
    expect(packet.material_state).toBe("insufficient_student_trace");
    expect(packet.gates.find((gate) => gate.gate_id === "student_trace")?.status).toBe("block");
    expect(readiness.questions[0]).toEqual(
      expect.objectContaining({
        status: "blocked",
        definitive_judgement_allowed: false,
        reasons: expect.arrayContaining(["student_answer_missing"])
      })
    );
  });

  it("records an unknown selected provider as primary while preserving benchmark candidates", () => {
    const packet = createVisionEvidencePacketFromExternalProvider({
      ...createProviderInput(),
      provider: "internal_k12_layout_ocr",
      providerRunId: "internal_provider_run_001",
      providerModelVersion: "internal-k12-layout-ocr-test"
    });

    expect(packet.pipeline_trace?.provider_candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "internal_k12_layout_ocr",
          fit: "primary_candidate",
          role: "ocr"
        }),
        expect.objectContaining({
          name: "paddleocr",
          fit: "fallback_candidate"
        }),
        expect.objectContaining({
          name: "surya",
          fit: "benchmark_only"
        }),
        expect.objectContaining({
          name: "dots.mocr",
          fit: "benchmark_only"
        })
      ])
    );
    expect(validateVisionEvidencePacket(packet).ok).toBe(true);
  });

  it("rejects orphan and duplicate provider references before text reasoning", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(createProviderInput());
    packet.evidences[0].question_id = "q_missing";
    packet.evidences[1].evidence_ref = packet.evidences[0].evidence_ref;
    packet.gates[0].evidenceRefs = ["missing.evidence.ref"];
    if (packet.pipeline_trace) {
      packet.pipeline_trace.stages[0].output_refs = ["missing.page.ref"];
    }

    const validation = validateVisionEvidencePacket(packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("question_id=q_missing missing from questions");
    expect(validation.errors.join(" ")).toContain("evidences duplicate evidence_ref");
    expect(validation.errors.join(" ")).toContain("gates[0].evidenceRefs[0]=missing.evidence.ref missing from evidences");
    expect(validation.errors.join(" ")).toContain("pipeline_trace.stages[0].output_refs[0]=missing.page.ref missing from packet");
  });

  it("rejects external provider evidence whose region belongs to another question", () => {
    const invalidInput = appendSecondQuestion(createProviderInput());
    invalidInput.questions[1].evidences![0].region_id = "reg_p01_q001";

    const validation = validateExternalVisionAdapterInput(invalidInput);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("region_id=reg_p01_q001 belongs to question_id=q001, not parent question_id=q002");
    expect(() => createVisionEvidencePacketFromExternalProvider(invalidInput)).toThrow("ExternalVisionAdapterInput is invalid");
  });

  it("rejects external provider evidence whose region belongs to another page", () => {
    const invalidInput = appendSecondPage(createProviderInput());
    invalidInput.questions[0].evidences![0].page_id = "p02";

    const validation = validateExternalVisionAdapterInput(invalidInput);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("region_id=reg_p01_q001 belongs to page_id=p01, not evidence.page_id=p02");
    expect(() => createVisionEvidencePacketFromExternalProvider(invalidInput)).toThrow("ExternalVisionAdapterInput is invalid");
  });

  it("rejects VisionEvidencePacket evidence whose region belongs to another question", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(appendSecondQuestion(createProviderInput()));
    const q002Evidence = packet.evidences.find((evidence) => evidence.question_id === "q002");
    if (!q002Evidence) throw new Error("Expected q002 evidence");
    q002Evidence.region_id = "reg_p01_q001";

    const validation = validateVisionEvidencePacket(packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("region_id=reg_p01_q001 belongs to question_id=q001, not evidence.question_id=q002");
  });

  it("rejects VisionEvidencePacket evidence whose region belongs to another page", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(appendSecondPage(createProviderInput()));
    packet.evidences[0].page_id = "p02";

    const validation = validateVisionEvidencePacket(packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("region_id=reg_p01_q001 belongs to page_id=p01, not evidence.page_id=p02");
  });

  it("rejects a pipeline trace whose selected provider no longer matches the packet provider", () => {
    const packet = createVisionEvidencePacketFromExternalProvider(createProviderInput());
    if (!packet.pipeline_trace) throw new Error("Expected pipeline trace");
    packet.pipeline_trace.selected_provider = "other-provider";

    const validation = validateVisionEvidencePacket(packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("pipeline_trace.selected_provider must match plugin_provider");
  });

  it("rejects malformed external provider input before packet creation", () => {
    const invalidInput = createProviderInput();
    invalidInput.provider = "";
    invalidInput.pages.push({ ...invalidInput.pages[0], page_id: "p01" });
    invalidInput.questions[0].evidences = [
      ...(invalidInput.questions[0].evidences ?? []),
      {
        evidence_id: "ev_provider_answer_001",
        evidence_type: "student_original_answer",
        question_id: "q999",
        region_id: "reg_missing",
        text: "重复 evidence id 且题号不匹配。",
        confidence: 1.2
      }
    ];

    const validation = validateExternalVisionAdapterInput(invalidInput);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("provider is required");
    expect(validation.errors.join(" ")).toContain("pages duplicate page_id=p01");
    expect(validation.errors.join(" ")).toContain("evidences duplicate evidence_id=ev_provider_answer_001");
    expect(validation.errors.join(" ")).toContain("question_id=q999 must match parent question_id=q001");
    expect(validation.errors.join(" ")).toContain("region_id=reg_missing missing from question regions");
    expect(validation.errors.join(" ")).toContain("confidence must be a number between 0 and 1");
    expect(() => createVisionEvidencePacketFromExternalProvider(invalidInput)).toThrow("ExternalVisionAdapterInput is invalid");
  });

  it("rejects helper-template placeholders and invalid geometry before packet creation", () => {
    const invalidInput = createProviderInput();
    invalidInput.providerRunId = "<real-provider-run-id>";
    invalidInput.pages[0].page_image_ref = "<redacted-or-private-storage-ref-outside-gold-json>";
    invalidInput.questions[0].regions![0].crop_ref = "<crop-ref-created-by-provider-or-review-tool>";
    invalidInput.questions[0].regions![0].bbox = { x1: 0.4, y1: 0.2, x2: 0.4, y2: 0.6, coord_space: "normalized" };
    invalidInput.questions[0].regions![0].polygon = {
      coord_space: "normalized",
      points: [
        { x: 0.1, y: 0.1 },
        { x: 1.2, y: 0.2 },
        { x: 0.2, y: 0.8 }
      ]
    };
    invalidInput.questions[0].evidences![0].crop_ref = "<stem-crop-ref>";
    invalidInput.questions[0].evidences![0].bbox = { x1: 0.12, y1: 0.4, x2: 0.82, y2: 0.4, coord_space: "normalized" };

    const validation = validateExternalVisionAdapterInput(invalidInput);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("providerRunId contains template placeholder");
    expect(validation.errors.join(" ")).toContain("pages[0].page_image_ref contains template placeholder");
    expect(validation.errors.join(" ")).toContain("regions[0].crop_ref contains template placeholder");
    expect(validation.errors.join(" ")).toContain("evidences[0].crop_ref contains template placeholder");
    expect(validation.errors.join(" ")).toContain("regions[0].bbox must have x2 > x1 and y2 > y1");
    expect(validation.errors.join(" ")).toContain("regions[0].polygon.points[1] normalized coordinates must be between 0 and 1");
    expect(validation.errors.join(" ")).toContain("evidences[0].bbox must have x2 > x1 and y2 > y1");
    expect(() => createVisionEvidencePacketFromExternalProvider(invalidInput)).toThrow("ExternalVisionAdapterInput is invalid");
  });

  it("does not treat math inequality text as a helper-template placeholder", () => {
    const input = createProviderInput();
    input.questions[0].evidences![0].text = "若 x<2，判断一次函数图像所在象限。";

    const validation = validateExternalVisionAdapterInput(input);

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
  });
});

function createProviderInput(options?: { includeCropRefs?: boolean; includeStudentTrace?: boolean }): ExternalVisionAdapterInput {
  const includeCropRefs = options?.includeCropRefs ?? true;
  const includeStudentTrace = options?.includeStudentTrace ?? true;
  const cropRef = (name: string) => (includeCropRefs ? `crop://external-provider/mat_provider_001/p01/q001/${name}` : undefined);

  return {
    provider: "paddleocr",
    providerRunId: "paddleocr_run_001",
    providerModelVersion: "PP-StructureV3-test",
    materialId: "mat_provider_001",
    sourceMaterialId: "src_mat_provider_001",
    studentId,
    teacherId,
    tenantId,
    sourceKind: "image",
    createdAt: "2026-06-19T10:00:00+08:00",
    pages: [
      {
        page_id: "p01",
        page_index: 1,
        page_image_ref: "storage://materials/mat_provider_001/p01.png",
        width: 1440,
        height: 1920,
        image_quality_confidence: 0.91,
        quality_flags: []
      }
    ],
    questions: [
      {
        question_id: "q001",
        question_number: "1",
        question_type_candidate: "open_response",
        page_id: "p01",
        confidence: 0.9,
        risk_flags: [],
        regions: [
          {
            region_id: "reg_p01_q001",
            region_role: "question_region",
            page_id: "p01",
            bbox: { x1: 0.1, y1: 0.15, x2: 0.9, y2: 0.55, coord_space: "normalized" },
            polygon: {
              coord_space: "normalized",
              points: [
                { x: 0.1, y: 0.15 },
                { x: 0.9, y: 0.15 },
                { x: 0.9, y: 0.55 },
                { x: 0.1, y: 0.55 }
              ]
            },
            crop_ref: cropRef("region"),
            confidence: 0.91
          }
        ],
        evidences: [
          {
            evidence_id: "ev_provider_stem_001",
            evidence_type: "question_stem",
            text: "一次函数应用题：根据表格建立关系式。",
            page_id: "p01",
            region_id: "reg_p01_q001",
            bbox: { x1: 0.12, y1: 0.18, x2: 0.82, y2: 0.26, coord_space: "normalized" },
            crop_ref: cropRef("stem"),
            confidence: 0.94
          },
          ...(includeStudentTrace
            ? [
                {
                  evidence_id: "ev_provider_answer_001",
                  evidence_type: "student_original_answer" as const,
                  text: "y=2x+1，未写取值范围。",
                  page_id: "p01",
                  region_id: "reg_p01_q001",
                  bbox: { x1: 0.12, y1: 0.3, x2: 0.82, y2: 0.38, coord_space: "normalized" as const },
                  crop_ref: cropRef("answer"),
                  confidence: 0.9
                },
                {
                  evidence_id: "ev_provider_mark_001",
                  evidence_type: "teacher_mark" as const,
                  text: "老师批注：漏取值范围，扣 1 分。",
                  page_id: "p01",
                  region_id: "reg_p01_q001",
                  bbox: { x1: 0.12, y1: 0.4, x2: 0.82, y2: 0.46, coord_space: "normalized" as const },
                  crop_ref: cropRef("teacher-mark"),
                  confidence: 0.91,
                  teacher_verified: true
                }
              ]
            : []),
          {
            evidence_id: "ev_provider_key_001",
            evidence_type: "answer_key",
            text: "标准答案：y=2x+1，x 为非负整数。",
            page_id: "p01",
            region_id: "reg_p01_q001",
            bbox: { x1: 0.12, y1: 0.47, x2: 0.82, y2: 0.52, coord_space: "normalized" },
            crop_ref: cropRef("answer-key"),
            confidence: 0.95,
            teacher_verified: true
          }
        ]
      }
    ],
    metadata: {
      source_note: "synthetic provider adapter test"
    }
  };
}

function appendSecondQuestion(input: ExternalVisionAdapterInput): ExternalVisionAdapterInput {
  return {
    ...input,
    questions: [
      ...input.questions,
      {
        question_id: "q002",
        question_number: "2",
        question_type_candidate: "open_response",
        page_id: "p01",
        confidence: 0.88,
        regions: [
          {
            region_id: "reg_p01_q002",
            region_role: "question_region",
            page_id: "p01",
            bbox: { x1: 0.1, y1: 0.58, x2: 0.9, y2: 0.78, coord_space: "normalized" },
            crop_ref: "crop://external-provider/mat_provider_001/p01/q002/region",
            confidence: 0.88
          }
        ],
        evidences: [
          {
            evidence_id: "ev_provider_q002_answer_001",
            evidence_type: "student_original_answer",
            text: "第 2 题学生作答可见。",
            page_id: "p01",
            region_id: "reg_p01_q002",
            bbox: { x1: 0.12, y1: 0.6, x2: 0.82, y2: 0.7, coord_space: "normalized" },
            crop_ref: "crop://external-provider/mat_provider_001/p01/q002/answer",
            confidence: 0.86
          }
        ]
      }
    ]
  };
}

function appendSecondPage(input: ExternalVisionAdapterInput): ExternalVisionAdapterInput {
  return {
    ...input,
    pages: [
      ...input.pages,
      {
        page_id: "p02",
        page_index: 2,
        page_image_ref: "storage://materials/mat_provider_001/p02.png",
        width: 1440,
        height: 1920,
        image_quality_confidence: 0.9,
        quality_flags: []
      }
    ]
  };
}
