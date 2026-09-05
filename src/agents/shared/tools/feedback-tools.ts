import { getSupabaseServerClient } from "./supabase-server-client";

export type TeacherPreferencesRecord = {
  id: string;
  teacher_id: string;
  feedback_tone: string | null;
  feedback_length: string | null;
  banned_phrases: string[] | null;
  preferred_structure: string | null;
  custom_style_note: string | null;
  report_style: string | null;
  correction_style: string | null;
};

export async function loadTeacherPreferences(teacherId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("teacher_preferences")
    .select("id, teacher_id, feedback_tone, feedback_length, banned_phrases, preferred_structure, custom_style_note, report_style, correction_style")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load teacher preferences: ${error.message}`);
  }

  return data as TeacherPreferencesRecord | null;
}
