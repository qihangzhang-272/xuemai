import type { SupabaseSubjectRef } from "@/components/xuemai-workbench/supabase-persistence-adapter";
import { workbenchStorageSchemaVersion, type WorkbenchStoragePayload } from "@/components/xuemai-workbench/persistence";
import { createAgentError } from "@/src/agents/shared/recovery/error-map";

export type SkillPersistenceSyncBody = {
  payload: WorkbenchStoragePayload;
  subjectsByConversationId?: Record<string, SupabaseSubjectRef>;
  dryRun: boolean;
};

export function parseSkillPersistenceSyncBody(raw: unknown): SkillPersistenceSyncBody {
  if (!isRecord(raw)) {
    throwInvalidInput("Request body must be a JSON object.");
  }

  const dryRun = raw.dryRun !== false;
  const payload = raw.payload;

  if (!isRecord(payload) || payload.schema_version !== workbenchStorageSchemaVersion) {
    throwInvalidInput(`payload.schema_version must be ${workbenchStorageSchemaVersion}.`);
  }

  return {
    payload: payload as WorkbenchStoragePayload,
    subjectsByConversationId: parseSubjectMap(raw.subjectsByConversationId),
    dryRun
  };
}

export async function readJsonRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throwInvalidInput("Request body must be valid JSON.");
  }
}

function parseSubjectMap(value: unknown): Record<string, SupabaseSubjectRef> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throwInvalidInput("subjectsByConversationId must be an object when provided.");
  }

  return Object.fromEntries(
    Object.entries(value).map(([conversationId, subject]) => {
      if (!isRecord(subject)) {
        throwInvalidInput(`subjectsByConversationId.${conversationId} must be an object.`);
      }

      const subjectType = subject.subjectType;
      if (subjectType !== "student" && subjectType !== "class" && subjectType !== "teacher") {
        throwInvalidInput(`subjectsByConversationId.${conversationId}.subjectType is invalid.`);
      }

      return [
        conversationId,
        {
          subjectType,
          studentId: nullableString(subject.studentId),
          classId: nullableString(subject.classId),
          subjectExternalId: nullableString(subject.subjectExternalId) ?? conversationId
        } satisfies SupabaseSubjectRef
      ];
    })
  );
}

function nullableString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function throwInvalidInput(message: string): never {
  throw createAgentError({
    code: "INVALID_INPUT",
    message,
    recoverable: false
  });
}
