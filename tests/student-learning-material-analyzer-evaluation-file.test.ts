import { describe, expect, it } from "vitest";
import { evaluateStudentLearningMaterialDatasetFile } from "../src/skills/student-learning-material-analyzer/evaluation-files";

describe("student learning material analyzer dataset file runner", () => {
  it("runs the dataset specified by XUEMAI_EVAL_DATASET", () => {
    const datasetPath = process.env.XUEMAI_EVAL_DATASET;
    if (!datasetPath) {
      if (process.env.XUEMAI_EVAL_REQUIRED === "1") {
        throw new Error("Set XUEMAI_EVAL_DATASET=/absolute/path/to/student-learning-material-evaluation-dataset.json");
      }
      expect(datasetPath).toBeUndefined();
      return;
    }

    const run = evaluateStudentLearningMaterialDatasetFile(datasetPath);
    if (run.report) console.log(`\n${run.report}`);

    expect(run.loadErrors).toEqual([]);
    if (!run.result) throw new Error(run.report);
    expect(run.result.ok).toBe(true);

    if (process.env.XUEMAI_EVAL_ALLOW_SMOKE !== "1") {
      expect(run.result.claimable99Correctness).toBe(true);
    }
  });
});
