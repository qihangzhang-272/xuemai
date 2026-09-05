import { describe, expect, it } from "vitest";
import { getSkillById, getSkillsForSubject, skillRegistry } from "../src/skills/registry";
import type { SkillDefinition, SkillId, SkillSubjectType } from "../src/skills/types";

const coreSkillIds: SkillId[] = [
  "update_learning_record",
  "analyze_learning_evidence",
  "generate_feedback",
  "next_lesson_plan",
  "monthly_report",
  "batch_feedback"
];

function expectSkillContract(skill: SkillDefinition) {
  const contract = {
    id: skill.id,
    title: skill.label,
    scope: skill.subjectTypes,
    requiredInputs: skill.requiredInput,
    actions: skill.actions
  };

  expect(contract.id).toBeTruthy();
  expect(contract.title).toBeTruthy();
  expect(contract.scope.length).toBeGreaterThan(0);
  expect(contract.requiredInputs.length).toBeGreaterThan(0);
  expect(contract.actions.length).toBeGreaterThan(0);
}

describe("skill registry", () => {
  it("contains the core workflow skills", () => {
    for (const skillId of coreSkillIds) {
      expect(getSkillById(skillId)?.id).toBe(skillId);
    }
  });

  it("keeps every skill definition structurally complete", () => {
    expect(skillRegistry.length).toBeGreaterThan(0);

    for (const skill of skillRegistry) {
      expectSkillContract(skill);
      expect(skill.triggerLabels.length).toBeGreaterThan(0);
      expect(skill.contextSources.length).toBeGreaterThan(0);
      expect(skill.steps.length).toBeGreaterThan(0);
      expect(skill.archiveTarget).toBeTruthy();
    }
  });

  it("returns context-aware skills for each supported subject type", () => {
    const subjectTypes: SkillSubjectType[] = ["student", "class", "teacher_workspace"];

    for (const subjectType of subjectTypes) {
      const skills = getSkillsForSubject(subjectType);

      expect(skills.length).toBeGreaterThan(0);
      expect(skills.every((skill) => skill.subjectTypes.includes(subjectType))).toBe(true);
    }
  });

  it("keeps parent communication outputs on the same send-before-archive path as feedback", () => {
    expect(getSkillById("generate_feedback")?.actions).toEqual(expect.arrayContaining(["copy_feedback", "mark_parent_sent", "archive"]));
    expect(getSkillById("parent_communication")?.actions).toEqual(expect.arrayContaining(["copy_feedback", "mark_parent_sent", "archive"]));
  });
});
