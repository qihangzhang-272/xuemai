import { getSupabaseServerClient } from "./supabase-server-client";

export type StudentProfileRecord = {
  id: string;
  teacher_id: string;
  primary_class_id: string | null;
  name: string;
  grade: string | null;
  default_subject: string | null;
  status: string | null;
  profile_summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  learning_habits: string[] | null;
  risk_signals: string[] | null;
  next_focus: string | null;
};

export type LoadStudentProfileInput = {
  teacherId: string;
  studentId: string;
};

export async function loadStudentProfile(input: LoadStudentProfileInput) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      "id, teacher_id, primary_class_id, name, grade, default_subject, status, profile_summary, strengths, weaknesses, learning_habits, risk_signals, next_focus"
    )
    .eq("id", input.studentId)
    .eq("teacher_id", input.teacherId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load student profile: ${error.message}`);
  }

  return data as StudentProfileRecord | null;
}
