import { describe, expect, it } from "vitest";
import { createWorkbenchStoragePayload, workbenchStorageSchemaVersion } from "../components/xuemai-workbench/persistence";
import { parseSkillPersistenceSyncBody } from "../src/skills/persistence/api-contract";
import type { ChatState } from "../components/xuemai-workbench/types";

describe("skill persistence API contract", () => {
  it("defaults to dry-run mode and accepts schema-versioned payloads", () => {
    const payload = createWorkbenchStoragePayload(createChatState(), "2026-06-12T00:00:00.000Z");
    const body = parseSkillPersistenceSyncBody({
      payload,
      subjectsByConversationId: {
        "student-wang": {
          subjectType: "student",
          studentId: "00000000-0000-4000-8000-000000000101",
          classId: "00000000-0000-4000-8000-000000000201"
        }
      }
    });

    expect(body.dryRun).toBe(true);
    expect(body.payload.schema_version).toBe(workbenchStorageSchemaVersion);
    expect(body.subjectsByConversationId?.["student-wang"]).toEqual(
      expect.objectContaining({
        subjectType: "student",
        subjectExternalId: "student-wang"
      })
    );
  });

  it("preserves explicit dryRun=false so the route can reject real sync", () => {
    const payload = createWorkbenchStoragePayload(createChatState(), "2026-06-12T00:00:00.000Z");
    const body = parseSkillPersistenceSyncBody({
      payload,
      dryRun: false
    });

    expect(body.dryRun).toBe(false);
  });

  it("rejects payloads without the current schema version", () => {
    expect(() => parseSkillPersistenceSyncBody({ payload: { schema_version: 1 } })).toThrow(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });

  it("rejects invalid subject mapping shapes", () => {
    const payload = createWorkbenchStoragePayload(createChatState(), "2026-06-12T00:00:00.000Z");

    expect(() =>
      parseSkillPersistenceSyncBody({
        payload,
        subjectsByConversationId: {
          "student-wang": {
            subjectType: "unknown"
          }
        }
      })
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );
  });
});

function createChatState(): ChatState {
  return {
    conversations: [],
    messages: [],
    taskCards: [],
    timelineRecords: [],
    preferences: {
      autoAnalyzeUploadedPaper: false,
      autoArchiveLearningEvidence: false,
      feedbackTone: "温和",
      defaultTaskSet: []
    },
    teacher: null,
    currentConversationId: "student-wang"
  };
}
