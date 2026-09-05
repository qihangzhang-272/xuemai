import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SkillArchiveLogSupabaseInsert,
  SkillCardEditSupabaseInsert,
  SkillCardEventSupabaseInsert,
  SkillCardSupabaseUpsert,
  SkillRunSupabaseUpsert,
  SupabaseSkillPersistencePlan
} from "@/components/xuemai-workbench/supabase-persistence-adapter";

type IdLookupRow = {
  id: string;
};

type SkillRunLookupRow = IdLookupRow & {
  external_run_id: string;
};

type SkillCardLookupRow = IdLookupRow & {
  external_card_id: string;
  external_run_id: string;
};

export type SkillPersistenceWriteResult = {
  mode: "write";
  counts: {
    skill_runs: number;
    skill_cards: number;
    skill_card_events: number;
    skill_card_edits: number;
    skill_archive_logs: number;
  };
};

export type SkillPersistenceRepository = {
  upsertSkillRuns(rows: SkillRunSupabaseUpsert[]): Promise<SkillRunLookupRow[]>;
  upsertSkillCards(rows: Array<SkillCardSupabaseUpsert & { skill_run_id: string | null }>): Promise<SkillCardLookupRow[]>;
  upsertSkillCardEvents(rows: Array<SkillCardEventSupabaseInsert & { skill_card_id: string | null; skill_run_id: string | null }>): Promise<void>;
  upsertSkillCardEdits(rows: Array<SkillCardEditSupabaseInsert & { skill_card_id: string | null; skill_run_id: string | null }>): Promise<void>;
  upsertSkillArchiveLogs(rows: Array<SkillArchiveLogSupabaseInsert & { skill_card_id: string | null; skill_run_id: string | null }>): Promise<void>;
};

export function isSkillPersistenceWriteEnabled(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>) {
  return env.SKILL_PERSISTENCE_WRITE_ENABLED === "true";
}

export async function persistSupabaseSkillPersistencePlan(plan: SupabaseSkillPersistencePlan, repository: SkillPersistenceRepository): Promise<SkillPersistenceWriteResult> {
  const skillRuns = await repository.upsertSkillRuns(plan.skill_runs);
  const runIdByExternalId = new Map(skillRuns.map((run) => [run.external_run_id, run.id]));

  const skillCards = await repository.upsertSkillCards(
    plan.skill_cards.map((card) => ({
      ...card,
      skill_run_id: runIdByExternalId.get(card.external_run_id) ?? null
    }))
  );
  const cardIdByExternalId = new Map(skillCards.map((card) => [card.external_card_id, card.id]));

  await repository.upsertSkillCardEvents(
    plan.skill_card_events.map((event) => ({
      ...event,
      skill_card_id: cardIdByExternalId.get(event.external_card_id) ?? null,
      skill_run_id: runIdByExternalId.get(event.external_run_id) ?? null
    }))
  );

  await repository.upsertSkillCardEdits(
    plan.skill_card_edits.map((edit) => ({
      ...edit,
      skill_card_id: cardIdByExternalId.get(edit.external_card_id) ?? null,
      skill_run_id: runIdByExternalId.get(edit.external_run_id) ?? null
    }))
  );

  await repository.upsertSkillArchiveLogs(
    plan.skill_archive_logs.map((archiveLog) => ({
      ...archiveLog,
      skill_card_id: cardIdByExternalId.get(archiveLog.external_card_id) ?? null,
      skill_run_id: runIdByExternalId.get(archiveLog.external_run_id) ?? null
    }))
  );

  return {
    mode: "write",
    counts: {
      skill_runs: plan.skill_runs.length,
      skill_cards: plan.skill_cards.length,
      skill_card_events: plan.skill_card_events.length,
      skill_card_edits: plan.skill_card_edits.length,
      skill_archive_logs: plan.skill_archive_logs.length
    }
  };
}

export function createSupabaseSkillPersistenceRepository(client: SupabaseClient): SkillPersistenceRepository {
  return {
    async upsertSkillRuns(rows) {
      if (!rows.length) return [];
      const { data, error } = await client.from("skill_runs").upsert(rows, { onConflict: "teacher_id,external_run_id" }).select("id, external_run_id");
      if (error) throw error;
      return (data ?? []) as SkillRunLookupRow[];
    },
    async upsertSkillCards(rows) {
      if (!rows.length) return [];
      const { data, error } = await client.from("skill_cards").upsert(rows, { onConflict: "teacher_id,external_card_id" }).select("id, external_card_id, external_run_id");
      if (error) throw error;
      return (data ?? []) as SkillCardLookupRow[];
    },
    async upsertSkillCardEvents(rows) {
      if (!rows.length) return;
      const { error } = await client.from("skill_card_events").upsert(rows, { onConflict: "teacher_id,external_card_id,external_event_id" });
      if (error) throw error;
    },
    async upsertSkillCardEdits(rows) {
      if (!rows.length) return;
      const { error } = await client.from("skill_card_edits").upsert(rows, { onConflict: "teacher_id,external_card_id,external_edit_id" });
      if (error) throw error;
    },
    async upsertSkillArchiveLogs(rows) {
      if (!rows.length) return;
      const { error } = await client.from("skill_archive_logs").upsert(rows, { onConflict: "teacher_id,external_archive_id" });
      if (error) throw error;
    }
  };
}
