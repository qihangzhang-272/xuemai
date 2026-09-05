import { NextResponse } from "next/server";
import { parseParentFeedbackGenerateBody, readJsonRequestBody } from "@/src/agents/parent-feedback/api-contract";
import { getParentFeedbackApiStatus, toParentFeedbackApiError } from "@/src/agents/parent-feedback/api-errors";
import { isAgentError, mapUnknownError } from "@/src/agents/shared/recovery/error-map";
import { assertTeacherOwnsClass, assertTeacherOwnsStudent } from "@/src/agents/shared/auth/ownership";
import { requireTeacherSession } from "@/src/agents/shared/auth/teacher-session";
import { runParentFeedbackAgent } from "@/src/agents/parent-feedback/agent";
import { validateParentFeedbackInput } from "@/src/agents/parent-feedback/workflow";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Parent Feedback Agent API. Use POST to generate an AI draft; this endpoint does not save confirmed feedback.",
    method: "POST",
    url: "/api/agents/parent-feedback",
    requiredFields: ["studentId"],
    optionalFields: ["classId", "classNote", "wrongQuestionSummary", "knowledgePoints", "teacherInstruction"],
    note: "teacherId is derived from the Supabase Auth session. Request-body teacherId is ignored."
  });
}

export async function POST(request: Request) {
  try {
    const session = await requireTeacherSession();
    const input = validateParentFeedbackInput(parseParentFeedbackGenerateBody(await readJsonRequestBody(request), session.teacherId));

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

    const result = await runParentFeedbackAgent(input);

    return NextResponse.json(result);
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
