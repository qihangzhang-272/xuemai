import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/202606120003_skill_shell_rls_policies.sql";
const migrationSql = readFileSync(migrationPath, "utf8");

const skillTables = ["skill_runs", "skill_cards", "skill_card_events", "skill_card_edits", "skill_archive_logs"];

describe("skill shell RLS migration", () => {
  it("enables row level security for every Skill Shell table", () => {
    for (const table of skillTables) {
      expect(migrationSql).toContain(`alter table ${table} enable row level security;`);
    }
  });

  it("scopes policies to authenticated teachers by auth.uid", () => {
    for (const table of skillTables) {
      expect(migrationSql).toContain(`on ${table} for select`);
    }

    expect(migrationSql.match(/teacher_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(skillTables.length * 2);
    expect(migrationSql).toContain("to authenticated");
  });

  it("does not add delete policies for SkillCard records", () => {
    expect(migrationSql.toLowerCase()).not.toContain(" for delete");
  });
});
