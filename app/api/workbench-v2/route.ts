import { NextResponse } from "next/server";
import { getLessonLedgerSnapshot, LessonLedgerServiceError, resetLessonLedgerDemo, runLessonLedgerActionAsync } from "@/src/lessonledger/service";
import type { LessonLedgerAction } from "@/src/lessonledger/types";

function isLocalDemoApiEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.WORKBENCH_V2_DEMO_ENABLED === "true";
}

function demoDisabledResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "DEMO_DISABLED",
        message: "该本地演示接口未在当前环境启用"
      }
    },
    { status: 404 }
  );
}

export async function GET() {
  if (!isLocalDemoApiEnabled()) return demoDisabledResponse();

  return NextResponse.json({
    success: true,
    mode: "local_file_backend",
    stack: "Next.js Route Handlers + TypeScript service + file-backed repository",
    supportedActions: [
      "createStudent",
      "createLesson",
      "updateLesson",
      "markLessonStatus",
      "saveAttendance",
      "generateFeedback",
      "saveFeedbackDraft",
      "publishFeedback",
      "createFamilyInvite",
      "activateFamilyInvite",
      "generateStudyReport",
      "saveStudyReport",
      "createOpenSlots",
      "addScore",
      "updateScore",
      "addWeakness",
      "updateWeakness",
      "addFinanceEvent",
      "moveLesson",
      "checkUpdate",
      "applyUpdate",
      "submitFeatureRequest",
      "saveStudioProfile",
      "createBooking",
      "updateBooking",
      "createMessageThread",
      "replyMessageThread"
    ],
    data: getLessonLedgerSnapshot()
  });
}

export async function POST(request: Request) {
  if (!isLocalDemoApiEnabled()) return demoDisabledResponse();

  try {
    const body = (await request.json()) as LessonLedgerAction | { action: "resetDemo"; payload?: unknown };

    if (body.action === "resetDemo") {
      return NextResponse.json({
        success: true,
        action: body.action,
        data: resetLessonLedgerDemo()
      });
    }

    const data = await runLessonLedgerActionAsync(body as LessonLedgerAction);

    return NextResponse.json({
      success: true,
      action: body.action,
      data
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "请求体不是合法 JSON"
          }
        },
        { status: 400 }
      );
    }

    if (error instanceof LessonLedgerServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "服务暂时无法完成该操作"
          }
      },
      { status: 500 }
    );
  }
}
