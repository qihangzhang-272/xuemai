import { createAgentError } from "../recovery/error-map";
import { getSupabaseServerClient } from "../tools/supabase-server-client";
import { createPermissionRequiredError } from "./teacher-session";

export async function assertTeacherOwnsStudent(input: { teacherId: string; studentId: string }) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("students").select("id").eq("id", input.studentId).eq("teacher_id", input.teacherId).maybeSingle();

  if (error) {
    throw createAgentError({
      code: "tool_unavailable",
      message: `校验学生归属失败：${error.message}`,
      recoverable: true,
      cause: error
    });
  }

  if (!data) {
    throw createPermissionRequiredError("无权访问该学生，或该学生不存在。");
  }
}

export async function assertTeacherOwnsClass(input: { teacherId: string; classId: string }) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("classes").select("id").eq("id", input.classId).eq("teacher_id", input.teacherId).maybeSingle();

  if (error) {
    throw createAgentError({
      code: "tool_unavailable",
      message: `校验班级归属失败：${error.message}`,
      recoverable: true,
      cause: error
    });
  }

  if (!data) {
    throw createPermissionRequiredError("无权访问该班级，或该班级不存在。");
  }
}

export async function assertTeacherOwnsAgentOutput(input: { teacherId: string; agentOutputId: string; studentId?: string }) {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("agent_outputs").select("id").eq("id", input.agentOutputId).eq("teacher_id", input.teacherId);

  if (input.studentId) {
    query = query.eq("student_id", input.studentId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw createAgentError({
      code: "tool_unavailable",
      message: `校验 AI 草稿归属失败：${error.message}`,
      recoverable: true,
      cause: error
    });
  }

  if (!data) {
    throw createPermissionRequiredError("无权访问该 AI 草稿，或该草稿不存在。");
  }
}
