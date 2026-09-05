import { describe, expect, it } from "vitest";
import { resolveLessonLedgerInitialState } from "@/app/workbench-v2/initial-state";

describe("workbench-v2 initial state", () => {
  it("opens the parent booking portal from an explicit parentView URL", () => {
    expect(
      resolveLessonLedgerInitialState({
        role: "parent",
        parentView: "booking"
      })
    ).toMatchObject({
      role: "parent",
      parentView: "booking",
      teacherView: "dashboard"
    });
  });

  it("keeps legacy view=booking working for parent portal links", () => {
    expect(
      resolveLessonLedgerInitialState({
        role: "parent",
        view: "booking"
      })
    ).toMatchObject({
      role: "parent",
      parentView: "booking"
    });
  });

  it("normalizes accidental trailing Chinese punctuation in URL params", () => {
    expect(
      resolveLessonLedgerInitialState({
        role: "parent、",
        view: "feedback，"
      })
    ).toMatchObject({
      role: "parent",
      parentView: "feedback"
    });
  });
});
