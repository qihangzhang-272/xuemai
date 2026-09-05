import { describe, expect, it } from "vitest";
import { validateStudentLearningMaterialEvaluationAssetManifestFromFile } from "../src/skills/student-learning-material-analyzer/evaluation-assets";

describe("student learning material evaluation asset manifest command", () => {
  it("validates an evaluation asset manifest when XUEMAI_EVAL_ASSET_MANIFEST is provided", () => {
    const manifestPath = process.env.XUEMAI_EVAL_ASSET_MANIFEST;
    if (!manifestPath) {
      if (process.env.XUEMAI_EVAL_ASSETS_REQUIRED === "1") {
        throw new Error("Set XUEMAI_EVAL_ASSET_MANIFEST=/absolute/path/to/student-learning-material-evaluation-assets.json");
      }
      expect(manifestPath).toBeUndefined();
      return;
    }

    const result = validateStudentLearningMaterialEvaluationAssetManifestFromFile(manifestPath);
    if (result.report) console.log(`\n${result.report}`);

    expect(result.ok, result.errors.join("；")).toBe(true);
  });
});
