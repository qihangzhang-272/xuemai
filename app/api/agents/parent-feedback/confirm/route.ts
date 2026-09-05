import { NextResponse } from "next/server";
import { parseParentFeedbackConfirmBody, readJsonRequestBody } from "@/src/agents/parent-feedback/api-contract";
import { getParentFeedbackApiStatus, toParentFeedbackApiError } from "@/src/agents/parent-feedback/api-errors";
import { confirmParentFeedbackDraft, validateConfirmInput } from "@/src/agents/parent-feedback/confirm";
import { isAgentError, mapUnknownError } from "@/src/agents/shared/recovery/error-map";
import { assertTeacherOwnsAgentOutput, assertTeacherOwnsClass, assertTeacherOwnsStudent } from "@/src/agents/shared/auth/ownership";
import { requireTeacherSession } from "@/src/agents/shared/auth/teacher-session";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Parent Feedback Agent confirm API. Use POST to save a teacher-confirmed draft.",
    method: "POST",
    url: "/api/agents/parent-feedback/confirm",
    requiredFields: ["studentId", "agentOutputId", "finalFeedbackText"],
    optionalFields: ["classId", "agentRunId", "originalFeedbackText", "coreIssue", "nextAction", "qualityScore"],
    note: "teacherId is derived from the Supabase Auth session. This endpoint writes confirmed feedback_history and student_learning_records; it does not update students profile fields."
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireTeacherSession();
    const input = validateConfirmInput(parseParentFeedbackConfirmBody(await readJsonRequestBody(request), session.teacherId));

    await assertTeacherOwnsStudent({
      teacherId: session.teacherId,
      studentId: input.studentId
    });
    if (input.classId) {
      await assertTeacherOwnsClass({
        teacherId: session.teacherId,
        classId: input.classId
      });
    }
    await assertTeacherOwnsAgentOutput({
      teacherId: session.teacherId,
      studentId: input.studentId,
      agentOutputId: input.agentOutputId
    });

    const data = await confirmParentFeedbackDraft(input);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    const agentError = isAgentError(error) ? error : mapUnknownError(error);
    const status = getParentFeedbackApiStatus(agentError);

    return NextResponse.json(
      {
        success: false,
        error: toParentFeedbackApiError(agentError)
      },
      { status }
    );
  }
}
