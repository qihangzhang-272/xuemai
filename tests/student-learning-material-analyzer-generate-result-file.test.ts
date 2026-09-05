import { describe, expect, it } from "vitest";
import {
  generateStudentLearningMaterialUserFacingResultFile,
  generateStudentLearningMaterialUserFacingResultFromAnalysisFile
} from "../src/skills/student-learning-material-analyzer/result-files";

describe("student learning material analyzer user-facing result file generator", () => {
  it("generates the user-facing result file specified by env vars", async () => {
    const analysisInputPath = process.env.XUEMAI_ANALYSIS_INPUT;
    const visionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const resultOutputPath = process.env.XUEMAI_RESULT_OUTPUT;

    if (!resultOutputPath || (!analysisInputPath && !visionPacketPath)) {
      if (process.env.XUEMAI_RESULT_REQUIRED === "1") {
        throw new Error(
          "Set XUEMAI_RESULT_OUTPUT=/absolute/path/to/result.json and either XUEMAI_ANALYSIS_INPUT=/absolute/path/to/analysis.json or XUEMAI_VISION_PACKET=/absolute/path/to/packet.json"
        );
      }
      expect(resultOutputPath || analysisInputPath || visionPacketPath).toBeUndefined();
      return;
    }

    const result = analysisInputPath
      ? await generateStudentLearningMaterialUserFacingResultFromAnalysisFile({
          analysisInputPath,
          resultOutputPath,
          allowInvalid: process.env.XUEMAI_RESULT_ALLOW_INVALID === "1"
        })
      : await generateStudentLearningMaterialUserFacingResultFile({
          visionPacketPath: visionPacketPath as string,
          resultOutputPath,
          analysisOutputPath: process.env.XUEMAI_ANALYSIS_OUTPUT,
          answerKeysPath: process.env.XUEMAI_ANSWER_KEYS,
          rubricsPath: process.env.XUEMAI_RUBRICS,
          knowledgePointsPath: process.env.XUEMAI_KNOWLEDGE_POINTS,
          studentProfileHistoryPath: process.env.XUEMAI_STUDENT_PROFILE_HISTORY,
          allowDegraded: process.env.XUEMAI_RESULT_ALLOW_DEGRADED === "1"
        });

    console.log(
      [
        "StudentLearningMaterialUserFacingResult output generated",
        `analysisId=${result.analysisId}`,
        `resultOutputPath=${result.resultOutputPath}`,
        `teacherReportStatus=${result.teacherReportStatus}`,
        `parentFeedbackStatus=${result.parentFeedbackStatus}`,
        `monthlyMonth=${result.monthlyMonth}`,
        `validationErrors=${result.validationErrors.length}`,
        `safetyWarnings=${result.safetyWarnings.length}`
      ].join("\n")
    );

    expect(result.resultOutputPath).toBe(resultOutputPath);
  });
});
