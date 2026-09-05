import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LessonLedgerAction } from "@/src/lessonledger/types";

const storePaths: string[] = [];

async function loadIsolatedRoute() {
  vi.resetModules();
  const storePath = join(mkdtempSync(join(tmpdir(), "lessonledger-route-")), "store.json");
  storePaths.push(storePath);
  process.env.LESSONLEDGER_STORE_PATH = storePath;
  return import("../app/api/workbench-v2/route");
}

function jsonRequest(body: unknown) {
  return new Request("http://127.0.0.1:3016/api/workbench-v2", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function rawRequest(body: string) {
  return new Request("http://127.0.0.1:3016/api/workbench-v2", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body
  });
}

function action(input: LessonLedgerAction) {
  return input;
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete process.env.LESSONLEDGER_STORE_PATH;
  for (const storePath of storePaths.splice(0)) {
    rmSync(dirname(storePath), { recursive: true, force: true });
  }
});

describe("LessonLedger API route", () => {
  it("keeps the local file-backed demo API disabled in production by default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET, POST } = await loadIsolatedRoute();

    const getResponse = await GET();
    const postResponse = await POST(jsonRequest({ action: "resetDemo" }));

    expect(getResponse.status).toBe(404);
    expect(postResponse.status).toBe(404);
    await expect(getResponse.json()).resolves.toMatchObject({ success: false, error: { code: "DEMO_DISABLED" } });
  });

  it("describes the local backend contract and current snapshot", async () => {
    const { GET } = await loadIsolatedRoute();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      mode: "local_file_backend",
      stack: "Next.js Route Handlers + TypeScript service + file-backed repository"
    });
    expect(body.supportedActions).toEqual(
      expect.arrayContaining(["generateFeedback", "createFamilyInvite", "createBooking", "replyMessageThread", "applyUpdate"])
    );
    expect(body.data.students.length).toBeGreaterThan(0);
    expect(body.data.lessons.length).toBeGreaterThan(0);
  });

  it("executes backend actions through POST and returns the updated snapshot", async () => {
    const { POST } = await loadIsolatedRoute();

    const response = await POST(
      jsonRequest(
        action({
          action: "createMessageThread",
          payload: {
            parent: "李三家长",
            student: "李三",
            title: "想讲讲取值范围",
            issueType: "反馈",
            linkedLesson: "06-20 圆锥曲线离心率反馈",
            body: "孩子对离心率问题里的取值范围还不太会，希望下次课重点讲一下。"
          }
        })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.action).toBe("createMessageThread");
    expect(body.data.messageThreads[0]).toMatchObject({
      parent: "李三家长",
      student: "李三",
      title: "想讲讲取值范围",
      status: "已发送"
    });

    const replyResponse = await POST(
      jsonRequest(
        action({
          action: "replyMessageThread",
          payload: {
            threadId: body.data.messageThreads[0].id,
            body: "好的家长，下次课我们会安排对应的取值范围内容。"
          }
        })
      )
    );
    const replyBody = await replyResponse.json();

    expect(replyResponse.status).toBe(200);
    expect(replyBody.data.messageThreads[0]).toMatchObject({
      status: "已确认",
      messages: [
        expect.objectContaining({ from: "parent" }),
        expect.objectContaining({
          from: "teacher",
          body: "好的家长，下次课我们会安排对应的取值范围内容。"
        })
      ]
    });
  });

  it("awaits async AI actions through the route before returning the snapshot", async () => {
    const route = await loadIsolatedRoute();
    const service = await import("@/src/lessonledger/service");
    service.setLessonLedgerAiProviderForTest({
      async generateFeedback(input) {
        return `${input.lesson.student}家长您好，路由已等待模型反馈：本节课围绕${input.content}推进，课堂状态记录完整，后续会继续安排针对性练习。`;
      },
      async generateStudyReport() {
        return null;
      }
    });

    const response = await route.POST(
      jsonRequest(
        action({
          action: "generateFeedback",
          payload: {
            lessonId: "l1",
            content: "圆锥曲线的离心率问题",
            state: "上课精神集中，解题思路清晰，计算准确率有待提高。",
            homework: "七道圆锥曲线综合小题"
          }
        })
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.feedbackDrafts.find((draft: { lessonId: string }) => draft.lessonId === "l1")?.body).toContain("路由已等待模型反馈");
  });

  it("maps service validation failures and malformed JSON into stable error responses", async () => {
    const { POST } = await loadIsolatedRoute();

    const invalidJsonResponse = await POST(rawRequest("{"));
    const invalidJsonBody = await invalidJsonResponse.json();

    expect(invalidJsonResponse.status).toBe(400);
    expect(invalidJsonBody).toMatchObject({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "请求体不是合法 JSON"
      }
    });

    const conflictResponse = await POST(
      jsonRequest(
        action({
          action: "createBooking",
          payload: {
            student: "李三",
            date: "06-19",
            start: "10:30",
            end: "12:30"
          }
        })
      )
    );
    const conflictBody = await conflictResponse.json();

    expect(conflictResponse.status).toBe(409);
    expect(conflictBody).toMatchObject({
      success: false,
      error: {
        code: "BOOKING_SLOT_NOT_OPEN",
        message: "该时段暂未开放预约，请选择蓝色开放时段"
      }
    });
  });

  it("resets the demo store through the route without changing the route contract", async () => {
    const { POST } = await loadIsolatedRoute();

    const createdResponse = await POST(
      jsonRequest(
        action({
          action: "createStudent",
          payload: {
            name: "测试学生",
            grade: "高二",
            parent: "测试家长",
            remainingLessons: 4,
            latestScore: "暂无成绩",
            focus: "圆锥曲线基础"
          }
        })
      )
    );
    const createdBody = await createdResponse.json();
    expect(createdBody.data.students.some((student: { name: string }) => student.name === "测试学生")).toBe(true);

    const resetResponse = await POST(jsonRequest({ action: "resetDemo" }));
    const resetBody = await resetResponse.json();

    expect(resetResponse.status).toBe(200);
    expect(resetBody.success).toBe(true);
    expect(resetBody.action).toBe("resetDemo");
    expect(resetBody.data.students.some((student: { name: string }) => student.name === "测试学生")).toBe(false);
  });
});
