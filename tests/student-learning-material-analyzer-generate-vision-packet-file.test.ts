import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildQuestionEvidenceReadiness } from "../src/skills/student-learning-material-analyzer/question-evidence-readiness";
import {
  generateVisionEvidencePacketFile,
  readVisionEvidencePacketFile
} from "../src/skills/student-learning-material-analyzer/vision-adapter-files";
import { validateVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/validators";

const fixtureInputPath = path.resolve(
  "tests/fixtures/student-learning-material-evaluation/provider-adapter/paddleocr-like-external-vision-input.json"
);

describe("student learning material analyzer VisionEvidencePacket file generator", () => {
  it("generates a VisionEvidencePacket from a provider adapter fixture", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-vision-adapter-"));
    const outputPath = path.join(tempDir, "vision-packet.json");

    try {
      const result = await generateVisionEvidencePacketFile({
        externalVisionInputPath: fixtureInputPath,
        visionPacketOutputPath: outputPath,
        failOnWarnings: true
      });
      const packet = await readVisionEvidencePacketFile(outputPath);
      const validation = validateVisionEvidencePacket(packet);
      const readiness = buildQuestionEvidenceReadiness(packet);

      expect(result).toEqual(
        expect.objectContaining({
          visionPacketOutputPath: outputPath,
          provider: "paddleocr",
          providerRunId: "paddleocr_like_fixture_run_001",
          materialId: "provider_adapter_material_001",
          materialState: "valid_student_material",
          questionCount: 1,
          evidenceCount: 4,
          validationWarnings: []
        })
      );
      expect(validation.ok).toBe(true);
      expect(readiness.summary.definitive_allowed_count).toBe(1);
      expect(packet.pipeline_trace?.selected_provider).toBe("paddleocr");
      expect(packet.pipeline_trace?.provider_candidates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "paddleocr",
            fit: "primary_candidate"
          }),
          expect.objectContaining({
            name: "paddlex",
            fit: "fallback_candidate"
          }),
          expect.objectContaining({
            name: "surya",
            fit: "benchmark_only",
            license_note: expect.stringContaining("commercial-use conditions")
          }),
          expect.objectContaining({
            name: "docling",
            fit: "benchmark_only"
          }),
          expect.objectContaining({
            name: "deepseek-ocr",
            fit: "benchmark_only",
            evidence_source_url: "https://github.com/deepseek-ai/DeepSeek-OCR"
          })
        ])
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates the VisionEvidencePacket file specified by env vars", async () => {
    const externalVisionInputPath = process.env.XUEMAI_EXTERNAL_VISION_INPUT;
    const visionPacketOutputPath = process.env.XUEMAI_VISION_PACKET_OUTPUT;

    if (!externalVisionInputPath || !visionPacketOutputPath) {
      if (process.env.XUEMAI_VISION_ADAPTER_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_EXTERNAL_VISION_INPUT=/absolute/path/to/external-vision-input.json and XUEMAI_VISION_PACKET_OUTPUT=/absolute/path/to/vision-packet.json"
        );
      }
      expect(externalVisionInputPath || visionPacketOutputPath).toBeUndefined();
      return;
    }

    const result = await generateVisionEvidencePacketFile({
      externalVisionInputPath,
      visionPacketOutputPath,
      failOnWarnings: process.env.XUEMAI_VISION_ADAPTER_FAIL_ON_WARNINGS === "1"
    });

    console.log(
      [
        "VisionEvidencePacket output generated",
        `provider=${result.provider}`,
        `providerRunId=${result.providerRunId}`,
        `materialId=${result.materialId}`,
        `materialState=${result.materialState}`,
        `visionPacketOutputPath=${result.visionPacketOutputPath}`,
        `questionCount=${result.questionCount}`,
        `evidenceCount=${result.evidenceCount}`,
        `validationWarnings=${result.validationWarnings.length}`
      ].join("\n")
    );

    expect(result.visionPacketOutputPath).toBe(visionPacketOutputPath);
  });

  it("rejects malformed external provider input before writing a packet", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-vision-adapter-invalid-"));
    const inputPath = path.join(tempDir, "invalid-external-vision-input.json");
    const outputPath = path.join(tempDir, "vision-packet.json");

    try {
      await writeFile(
        inputPath,
        JSON.stringify(
          {
            provider: "",
            providerRunId: "bad-run",
            providerModelVersion: "bad-model",
            materialId: "bad-material",
            studentId: "bad-student",
            pages: [],
            questions: []
          },
          null,
          2
        ),
        "utf8"
      );

      await expect(
        generateVisionEvidencePacketFile({
          externalVisionInputPath: inputPath,
          visionPacketOutputPath: outputPath
        })
      ).rejects.toThrow("external provider input is invalid");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
