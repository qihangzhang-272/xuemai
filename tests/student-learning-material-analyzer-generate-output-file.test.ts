import { describe, expect, it } from "vitest";
import { generateStudentLearningMaterialAnalysisOutputFile } from "../src/skills/student-learning-material-analyzer/output-files";

describe("student learning material analyzer output file generator", () => {
  it("generates the analysis file specified by env vars", async () => {
    const visionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const analysisOutputPath = process.env.XUEMAI_ANALYSIS_OUTPUT;

    if (!visionPacketPath || !analysisOutputPath) {
      if (process.env.XUEMAI_GENERATE_REQUIRED === "1") {
        throw new Error("Set XUEMAI_VISION_PACKET=/absolute/path/to/packet.json and XUEMAI_ANALYSIS_OUTPUT=/absolute/path/to/analysis.json");
      }
      expect(visionPacketPath || analysisOutputPath).toBeUndefined();
      return;
    }

    const result = await generateStudentLearningMaterialAnalysisOutputFile({
      visionPacketPath,
      analysisOutputPath,
      answerKeysPath: process.env.XUEMAI_ANSWER_KEYS,
      rubricsPath: process.env.XUEMAI_RUBRICS,
      knowledgePointsPath: process.env.XUEMAI_KNOWLEDGE_POINTS,
      studentProfileHistoryPath: process.env.XUEMAI_STUDENT_PROFILE_HISTORY,
      allowDegraded: process.env.XUEMAI_GENERATE_ALLOW_DEGRADED === "1"
    });

    console.log(
      [
        "StudentLearningMaterialAnalysis output generated",
        `status=${result.status}`,
        `analysisId=${result.analysisId}`,
        `analysisOutputPath=${result.analysisOutputPath}`,
        `validationErrors=${result.validationErrors.length}`,
        `safetyWarnings=${result.safetyWarnings.length}`
      ].join("\n")
    );

    expect(result.analysisOutputPath).toBe(analysisOutputPath);
    if (process.env.XUEMAI_GENERATE_ALLOW_DEGRADED !== "1") {
      expect(result.status).toBe("draft_ready");
    }
  });
});
