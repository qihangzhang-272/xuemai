import { getSupabaseServerClient } from "./supabase-server-client";

export type StudentLearningRecord = {
  id: string;
  student_id: string | null;
  teacher_id: string;
  class_id: string | null;
  record_type: string;
  title: string | null;
  content: string | null;
  source: string | null;
  subject: string | null;
  knowledge_points: string[] | null;
  mistake_reason: string | null;
  teacher_note: string | null;
  confirmed_by_teacher: boolean | null;
  occurred_at: string | null;
};

export type WrongQuestionRecord = {
  id: string;
  student_id: string | null;
  teacher_id: string;
  class_id: string | null;
  subject: string | null;
  question_text: string | null;
  knowledge_points: string[] | null;
  mistake_type: string | null;
  mistake_reason: string | null;
  analysis_text: string | null;
  status: string | null;
  created_at: string | null;
};

export type LoadStudentRelatedRecordsInput = {
  teacherId: string;
  studentId: string;
  classId?: string;
  limit?: number;
};

export async function loadRecentLearningRecords(input: LoadStudentRelatedRecordsInput) {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("student_learning_records")
    .select(
      "id, student_id, teacher_id, class_id, record_type, title, content, source, subject, knowledge_points, mistake_reason, teacher_note, confirmed_by_teacher, occurred_at"
    )
    .eq("teacher_id", input.teacherId)
    .eq("student_id", input.studentId)
    .eq("confirmed_by_teacher", true)
    .order("occurred_at", { ascending: false })
    .limit(input.limit ?? 8);

  if (input.classId) {
    query = query.eq("class_id", input.classId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load recent learning records: ${error.message}`);
  }

  return (data ?? []) as StudentLearningRecord[];
}

export async function loadRecentWrongQuestions(input: LoadStudentRelatedRecordsInput) {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("wrong_questions")
    .select("id, student_id, teacher_id, class_id, subject, question_text, knowledge_points, mistake_type, mistake_reason, analysis_text, status, created_at")
    .eq("teacher_id", input.teacherId)
    .eq("student_id", input.studentId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 8);

  if (input.classId) {
    query = query.eq("class_id", input.classId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load recent wrong questions: ${error.message}`);
  }

  return (data ?? []) as WrongQuestionRecord[];
}
