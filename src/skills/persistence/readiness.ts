export const skillShellTables = ["skill_runs", "skill_cards", "skill_card_events", "skill_card_edits", "skill_archive_logs"] as const;

export const skillShellRequiredColumns: Record<(typeof skillShellTables)[number], string[]> = {
  skill_runs: ["teacher_id", "external_run_id", "runner_status"],
  skill_cards: ["teacher_id", "external_card_id", "original_output", "current_output", "archived_output"],
  skill_card_events: ["external_event_id"],
  skill_card_edits: ["external_edit_id"],
  skill_archive_logs: ["external_archive_id"]
};

export const skillShellRequiredUniqueIndexes = [
  "idx_skill_runs_teacher_external_run_unique",
  "idx_skill_cards_teacher_external_card_unique",
  "idx_skill_card_events_external_unique",
  "idx_skill_card_edits_external_unique",
  "idx_skill_archive_logs_external_unique"
] as const;

const requiredPolicyCommands: Record<(typeof skillShellTables)[number], string[]> = {
  skill_runs: ["SELECT", "INSERT", "UPDATE"],
  skill_cards: ["SELECT", "INSERT", "UPDATE"],
  skill_card_events: ["SELECT", "INSERT"],
  skill_card_edits: ["SELECT", "INSERT"],
  skill_archive_logs: ["SELECT", "INSERT"]
};

export type SkillShellReadinessRow = Record<string, unknown>;

export type SkillShellReadinessSummary = {
  canEnableWriteFlag: boolean;
  missingTables: string[];
  missingColumns: Array<{ tableName: string; columnName: string }>;
  missingUniqueIndexes: string[];
  missingRlsTables: string[];
  missingPolicies: Array<{ tableName: string; command: string }>;
  unexpectedDeletePolicies: Array<{ tableName: string; policyName: string }>;
  warnings: string[];
};

export function evaluateSkillShellReadiness(rows: SkillShellReadinessRow[]): SkillShellReadinessSummary {
  const missingTables = findMissingTables(rows);
  const missingColumns = findMissingColumns(rows);
  const missingUniqueIndexes = findMissingUniqueIndexes(rows);
  const missingRlsTables = findMissingRlsTables(rows);
  const { missingPolicies, unexpectedDeletePolicies } = evaluatePolicies(rows);
  const warnings = collectWarnings(rows);

  return {
    canEnableWriteFlag:
      missingTables.length === 0 &&
      missingColumns.length === 0 &&
      missingUniqueIndexes.length === 0 &&
      missingRlsTables.length === 0 &&
      missingPolicies.length === 0 &&
      unexpectedDeletePolicies.length === 0,
    missingTables,
    missingColumns,
    missingUniqueIndexes,
    missingRlsTables,
    missingPolicies,
    unexpectedDeletePolicies,
    warnings
  };
}

export function formatSkillShellReadinessSummary(summary: SkillShellReadinessSummary): string[] {
  const lines: string[] = [];

  if (summary.canEnableWriteFlag) {
    lines.push("Skill Shell schema/RLS/policy checks passed. Keep final Auth mapping confirmation before enabling writes.");
  } else {
    lines.push("Skill Shell is not ready for real writes.");
  }

  for (const tableName of summary.missingTables) {
    lines.push(`Missing table: ${tableName}`);
  }

  for (const column of summary.missingColumns) {
    lines.push(`Missing column: ${column.tableName}.${column.columnName}`);
  }

  for (const indexName of summary.missingUniqueIndexes) {
    lines.push(`Missing unique index: ${indexName}`);
  }

  for (const tableName of summary.missingRlsTables) {
    lines.push(`RLS not enabled: ${tableName}`);
  }

  for (const policy of summary.missingPolicies) {
    lines.push(`Missing policy command: ${policy.tableName}.${policy.command}`);
  }

  for (const policy of summary.unexpectedDeletePolicies) {
    lines.push(`Unexpected delete policy: ${policy.tableName}.${policy.policyName}`);
  }

  for (const warning of summary.warnings) {
    lines.push(`Warning: ${warning}`);
  }

  return lines;
}

function findMissingTables(rows: SkillShellReadinessRow[]) {
  const okTables = new Set(
    rows
      .filter((row) => normalizeString(row.check_name) === "skill_tables" && normalizeString(row.status) === "ok")
      .map((row) => normalizeString(row.table_name))
      .filter(Boolean)
  );

  return skillShellTables.filter((tableName) => !okTables.has(tableName));
}

function findMissingColumns(rows: SkillShellReadinessRow[]) {
  const okColumns = new Set(
    rows
      .filter((row) => normalizeString(row.check_name) === "skill_columns" && normalizeString(row.status) === "ok")
      .map((row) => `${normalizeString(row.table_name)}.${normalizeString(row.column_name)}`)
  );

  return Object.entries(skillShellRequiredColumns).flatMap(([tableName, columnNames]) =>
    columnNames
      .filter((columnName) => !okColumns.has(`${tableName}.${columnName}`))
      .map((columnName) => ({
        tableName,
        columnName
      }))
  );
}

function findMissingUniqueIndexes(rows: SkillShellReadinessRow[]) {
  const okIndexes = new Set(
    rows
      .filter((row) => normalizeString(row.check_name) === "skill_unique_indexes" && normalizeString(row.status) === "ok")
      .map((row) => normalizeString(row.index_name))
      .filter(Boolean)
  );

  return skillShellRequiredUniqueIndexes.filter((indexName) => !okIndexes.has(indexName));
}

function findMissingRlsTables(rows: SkillShellReadinessRow[]) {
  const okRlsTables = new Set(
    rows
      .filter((row) => normalizeString(row.check_name) === "skill_rls_enabled" && normalizeString(row.status) === "ok")
      .map((row) => normalizeString(row.table_name))
      .filter(Boolean)
  );

  return skillShellTables.filter((tableName) => !okRlsTables.has(tableName));
}

function evaluatePolicies(rows: SkillShellReadinessRow[]) {
  const policyRows = rows.filter((row) => normalizeString(row.check_name) === "skill_policies");
  const commandsByTable = new Map<string, Set<string>>();
  const unexpectedDeletePolicies: Array<{ tableName: string; policyName: string }> = [];

  for (const row of policyRows) {
    const tableName = normalizeString(row.tablename);
    const command = normalizeCommand(row.cmd);
    if (!tableName || !command) continue;

    if (!commandsByTable.has(tableName)) {
      commandsByTable.set(tableName, new Set());
    }
    commandsByTable.get(tableName)?.add(command);

    if (command === "DELETE") {
      unexpectedDeletePolicies.push({
        tableName,
        policyName: normalizeDisplayString(row.policyname) || "unnamed policy"
      });
    }
  }

  const missingPolicies = Object.entries(requiredPolicyCommands).flatMap(([tableName, commands]) => {
    const tableCommands = commandsByTable.get(tableName) ?? new Set<string>();
    return commands
      .filter((command) => !tableCommands.has(command))
      .map((command) => ({
        tableName,
        command
      }));
  });

  return {
    missingPolicies,
    unexpectedDeletePolicies
  };
}

function collectWarnings(rows: SkillShellReadinessRow[]) {
  const warnings: string[] = [];
  const authUidRows = rows.filter((row) => normalizeString(row.check_name) === "current_auth_uid");

  if (authUidRows.length === 0) {
    warnings.push("current_auth_uid was not included; run the readiness SQL in Supabase and manually confirm Auth teacher_id mapping.");
    return warnings;
  }

  if (authUidRows.every((row) => !normalizeDisplayString(row.current_auth_uid))) {
    warnings.push("current_auth_uid is empty in the provided rows; this can be normal in SQL Editor, but Auth teacher_id mapping still needs manual confirmation.");
  }

  return warnings;
}

function normalizeCommand(value: unknown) {
  const command = normalizeDisplayString(value).toUpperCase();
  if (command === "ALL") return "ALL";
  if (command === "SELECT" || command === "INSERT" || command === "UPDATE" || command === "DELETE") return command;
  return command;
}

function normalizeString(value: unknown) {
  return normalizeDisplayString(value).toLowerCase();
}

function normalizeDisplayString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
