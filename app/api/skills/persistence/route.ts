import { NextResponse } from "next/server";
import { createSupabaseSkillPersistencePlan } from "@/components/xuemai-workbench/supabase-persistence-adapter";
import { assertTeacherOwnsClass, assertTeacherOwnsStudent } from "@/src/agents/shared/auth/ownership";
import { requireTeacherSession } from "@/src/agents/shared/auth/teacher-session";
import { createAgentError, isAgentError, mapUnknownError } from "@/src/agents/shared/recovery/error-map";
import { getSupabaseServerClient } from "@/src/agents/shared/tools/supabase-server-client";
import { parseSkillPersistenceSyncBody, readJsonRequestBody } from "@/src/skills/persistence/api-contract";
import { createSupabaseSkillPersistenceRepository, isSkillPersistenceWriteEnabled, persistSupabaseSkillPersistencePlan } from "@/src/skills/persistence/supabase-sync";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Skill persistence planning API. POST with dryRun=true to validate and preview Supabase-compatible rows.",
    method: "POST",
    requiredFields: ["payload"],
    optionalFields: ["subjectsByConversationId", "dryRun"],
    note: "teacher_id is derived from Supabase Auth session. Real database writes are disabled by default and require the server-side SKILL_PERSISTENCE_WRITE_ENABLED flag after migration/RLS are manually confirmed."
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireTeacherSession();
    const body = parseSkillPersistenceSyncBody(await readJsonRequestBody(request));

    if (!body.dryRun && !isSkillPersistenceWriteEnabled()) {
      throw createAgentError({
        code: "SKILL_PERSISTENCE_SYNC_DISABLED",
        message: "AI 结果真实同步尚未启用。请先人工确认 Supabase migration 与 RLS 边界，再开启写入。",
        recoverable: false
      });
    }

    await assertSubjectOwnership(session.teacherId, body.subjectsByConversationId);

    const plan = createSupabaseSkillPersistencePlan(body.payload, {
      sessionTeacherId: session.teacherId,
      subjectsByConversationId: body.subjectsByConversationId
    });

    if (body.dryRun) {
      return NextResponse.json({
        success: true,
        mode: "dry_run",
        data: {
          counts: {
            skill_runs: plan.skill_runs.length,
            skill_cards: plan.skill_cards.length,
            skill_card_events: plan.skill_card_events.length,
            skill_card_edits: plan.skill_card_edits.length,
            skill_archive_logs: plan.skill_archive_logs.length
          },
          plan
        }
      });
    }

    const result = await persistSupabaseSkillPersistencePlan(plan, createSupabaseSkillPersistenceRepository(getSupabaseServerClient()));

    return NextResponse.json({
      success: true,
      mode: result.mode,
      data: result
    });
  } catch (error) {
    const agentError = isAgentError(error) ? error : mapUnknownError(error);
    const status = getSkillPersistenceApiStatus(agentError.code);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: agentError.code,
          message: agentError.message,
          recoverable: agentError.recoverable
        }
      },
      { status }
    );
  }
}

async function assertSubjectOwnership(teacherId: string, subjectsByConversationId: ReturnType<typeof parseSkillPersistenceSyncBody>["subjectsByConversationId"]) {
  const subjects = Object.values(subjectsByConversationId ?? {});

  for (const subject of subjects) {
    if (subject.studentId) {
      await assertTeacherOwnsStudent({
        teacherId,
        studentId: subject.studentId
      });
    }

    if (subject.classId) {
      await assertTeacherOwnsClass({
        teacherId,
        classId: subject.classId
      });
    }
  }
}

function getSkillPersistenceApiStatus(code: string) {
  if (code === "AUTH_REQUIRED") return 401;
  if (code === "permission_required") return 403;
  if (code === "SKILL_PERSISTENCE_SYNC_DISABLED") return 409;
  if (code === "INVALID_INPUT") return 400;
  return 500;
}
