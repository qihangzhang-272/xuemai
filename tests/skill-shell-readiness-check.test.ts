import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkPath = "supabase/checks/202606130001_skill_shell_readiness_check.sql";
const checkSql = readFileSync(checkPath, "utf8");
const normalizedSql = checkSql.toLowerCase();
const executableStatements = normalizedSql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const skillTables = ["skill_runs", "skill_cards", "skill_card_events", "skill_card_edits", "skill_archive_logs"];

describe("Skill Shell readiness check SQL", () => {
  it("is read-only and only uses select/with statements", () => {
    expect(executableStatements.length).toBeGreaterThan(0);

    for (const statement of executableStatements) {
      expect(statement).toMatch(/^(select|with)\b/);
      expect(statement).not.toMatch(/\b(insert|update|upsert|delete|truncate|drop|alter|create|rename|grant|revoke)\b/);
    }
  });

  it("checks every Skill Shell table", () => {
    for (const table of skillTables) {
      expect(normalizedSql).toContain(table);
    }
  });

  it("checks schema, unique indexes, RLS, policies, and current auth uid", () => {
    expect(normalizedSql).toContain("information_schema.tables");
    expect(normalizedSql).toContain("information_schema.columns");
    expect(normalizedSql).toContain("pg_indexes");
    expect(normalizedSql).toContain("relrowsecurity");
    expect(normalizedSql).toContain("pg_policies");
    expect(normalizedSql).toContain("auth.uid()");
  });

  it("checks the idempotent external id indexes", () => {
    expect(normalizedSql).toContain("idx_skill_runs_teacher_external_run_unique");
    expect(normalizedSql).toContain("idx_skill_cards_teacher_external_card_unique");
    expect(normalizedSql).toContain("idx_skill_card_events_external_unique");
    expect(normalizedSql).toContain("idx_skill_card_edits_external_unique");
    expect(normalizedSql).toContain("idx_skill_archive_logs_external_unique");
  });
});
