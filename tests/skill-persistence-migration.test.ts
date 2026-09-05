import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/202606120002_skillcard_persistence_contract.sql";
const migrationSql = readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.toLowerCase();
const executableSql = normalizedSql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

const skillTables = ["skill_runs", "skill_cards", "skill_card_events", "skill_card_edits", "skill_archive_logs"];

describe("SkillCard persistence migration contract", () => {
  it("creates every Skill Shell table non-destructively", () => {
    for (const table of skillTables) {
      expect(normalizedSql).toContain(`create table if not exists ${table}`);
    }

    expect(normalizedSql).toContain("alter table skill_runs add column if not exists");
    expect(normalizedSql).toContain("alter table skill_cards add column if not exists");
  });

  it("does not include destructive migration statements", () => {
    expect(executableSql).not.toMatch(/\bdrop\s+/);
    expect(executableSql).not.toMatch(/\bdelete\s+from\b/);
    expect(executableSql).not.toMatch(/\btruncate\b/);
    expect(executableSql).not.toMatch(/\brename\s+/);
  });

  it("keeps original, current, and archived SkillCard outputs separate", () => {
    expect(normalizedSql).toContain("original_output jsonb");
    expect(normalizedSql).toContain("current_output jsonb");
    expect(normalizedSql).toContain("archived_output jsonb");
    expect(normalizedSql).toContain("ai original draft");
    expect(normalizedSql).toContain("teacher current review/edit version");
    expect(normalizedSql).toContain("teacher-confirmed final archived version");
  });

  it("adds unique external id indexes for idempotent sync", () => {
    expect(normalizedSql).toContain("idx_skill_runs_teacher_external_run_unique");
    expect(normalizedSql).toContain("idx_skill_cards_teacher_external_card_unique");
    expect(normalizedSql).toContain("idx_skill_card_events_external_unique");
    expect(normalizedSql).toContain("idx_skill_card_edits_external_unique");
    expect(normalizedSql).toContain("idx_skill_archive_logs_external_unique");
  });

  it("does not enable RLS in the contract migration", () => {
    expect(normalizedSql).not.toContain("enable row level security");
    expect(normalizedSql).toContain("do not enable rls in this draft migration");
  });
});
