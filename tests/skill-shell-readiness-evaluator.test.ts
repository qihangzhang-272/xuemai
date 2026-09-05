import { describe, expect, it } from "vitest";
import {
  evaluateSkillShellReadiness,
  formatSkillShellReadinessSummary,
  skillShellRequiredColumns,
  skillShellRequiredUniqueIndexes,
  skillShellTables,
  type SkillShellReadinessRow
} from "../src/skills/persistence/readiness";

describe("Skill Shell readiness evaluator", () => {
  it("accepts complete schema, index, RLS, and policy rows while warning about SQL Editor auth context", () => {
    const summary = evaluateSkillShellReadiness(createReadyRows({ currentAuthUid: null }));

    expect(summary.canEnableWriteFlag).toBe(true);
    expect(summary.missingTables).toEqual([]);
    expect(summary.missingColumns).toEqual([]);
    expect(summary.missingUniqueIndexes).toEqual([]);
    expect(summary.missingRlsTables).toEqual([]);
    expect(summary.missingPolicies).toEqual([]);
    expect(summary.unexpectedDeletePolicies).toEqual([]);
    expect(summary.warnings).toEqual([
      "current_auth_uid is empty in the provided rows; this can be normal in SQL Editor, but Auth teacher_id mapping still needs manual confirmation."
    ]);
  });

  it("reports missing schema pieces and does not allow the write flag", () => {
    const rows = createReadyRows().filter(
      (row) =>
        row.table_name !== "skill_cards" &&
        row.column_name !== "current_output" &&
        row.index_name !== "idx_skill_cards_teacher_external_card_unique" &&
        !(row.check_name === "skill_rls_enabled" && row.table_name === "skill_card_events") &&
        !(row.check_name === "skill_policies" && row.tablename === "skill_cards" && row.cmd === "UPDATE")
    );

    const summary = evaluateSkillShellReadiness(rows);

    expect(summary.canEnableWriteFlag).toBe(false);
    expect(summary.missingTables).toContain("skill_cards");
    expect(summary.missingColumns).toContainEqual({ tableName: "skill_cards", columnName: "current_output" });
    expect(summary.missingUniqueIndexes).toContain("idx_skill_cards_teacher_external_card_unique");
    expect(summary.missingRlsTables).toContain("skill_card_events");
    expect(summary.missingPolicies).toContainEqual({ tableName: "skill_cards", command: "UPDATE" });
  });

  it("blocks readiness when delete policies appear in this phase", () => {
    const summary = evaluateSkillShellReadiness([
      ...createReadyRows(),
      {
        check_name: "skill_policies",
        tablename: "skill_cards",
        policyname: "teacher can delete own skill cards",
        cmd: "DELETE"
      }
    ]);

    expect(summary.canEnableWriteFlag).toBe(false);
    expect(summary.unexpectedDeletePolicies).toEqual([
      {
        tableName: "skill_cards",
        policyName: "teacher can delete own skill cards"
      }
    ]);
  });

  it("formats a teacher-readable readiness report", () => {
    const summary = evaluateSkillShellReadiness(
      createReadyRows().filter((row) => row.index_name !== "idx_skill_archive_logs_external_unique")
    );

    expect(formatSkillShellReadinessSummary(summary)).toContain("Missing unique index: idx_skill_archive_logs_external_unique");
  });
});

function createReadyRows(options: { currentAuthUid?: string | null } = {}): SkillShellReadinessRow[] {
  return [
    ...skillShellTables.map((tableName) => ({
      check_name: "skill_tables",
      table_name: tableName,
      status: "ok"
    })),
    ...Object.entries(skillShellRequiredColumns).flatMap(([tableName, columns]) =>
      columns.map((columnName) => ({
        check_name: "skill_columns",
        table_name: tableName,
        column_name: columnName,
        status: "ok"
      }))
    ),
    ...skillShellRequiredUniqueIndexes.map((indexName) => ({
      check_name: "skill_unique_indexes",
      index_name: indexName,
      status: "ok",
      indexdef: `create unique index ${indexName}`
    })),
    ...skillShellTables.map((tableName) => ({
      check_name: "skill_rls_enabled",
      table_name: tableName,
      status: "ok"
    })),
    ...createPolicyRows(),
    {
      check_name: "current_auth_uid",
      current_auth_uid: Object.hasOwn(options, "currentAuthUid") ? options.currentAuthUid : "00000000-0000-4000-8000-000000000001"
    }
  ];
}

function createPolicyRows(): SkillShellReadinessRow[] {
  return [
    ...createPolicyCommands("skill_runs", ["SELECT", "INSERT", "UPDATE"]),
    ...createPolicyCommands("skill_cards", ["SELECT", "INSERT", "UPDATE"]),
    ...createPolicyCommands("skill_card_events", ["SELECT", "INSERT"]),
    ...createPolicyCommands("skill_card_edits", ["SELECT", "INSERT"]),
    ...createPolicyCommands("skill_archive_logs", ["SELECT", "INSERT"])
  ];
}

function createPolicyCommands(tableName: string, commands: string[]): SkillShellReadinessRow[] {
  return commands.map((command) => ({
    check_name: "skill_policies",
    tablename: tableName,
    policyname: `${tableName} ${command.toLowerCase()} policy`,
    cmd: command,
    roles: ["authenticated"],
    qual: "teacher_id = auth.uid()",
    with_check: "teacher_id = auth.uid()"
  }));
}
