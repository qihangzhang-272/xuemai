import { assembleContext, createContextBlock } from "../shared/context/context-builder";
import { loadTeacherPreferences } from "../shared/tools/feedback-tools";
import { loadRecentLearningRecords, loadRecentWrongQuestions } from "../shared/tools/learning-record-tools";
import { loadStudentProfile } from "../shared/tools/student-tools";
import { createAgentError } from "../shared/recovery/error-map";
import type { ParentFeedbackContextData, ParentFeedbackInput } from "./types";

export async function buildParentFeedbackContext(input: ParentFeedbackInput): Promise<ParentFeedbackContextData> {
  const [student, learningRecords, wrongQuestions, teacherPreferences] = await Promise.all([
    loadStudentProfile({
      teacherId: input.teacherId,
      studentId: input.studentId
    }),
    loadRecentLearningRecords({
      teacherId: input.teacherId,
      studentId: input.studentId,
      classId: input.classId
    }),
    loadRecentWrongQuestions({
      teacherId: input.teacherId,
      studentId: input.studentId,
      classId: input.classId
    }),
    loadTeacherPreferences(input.teacherId)
  ]);

  if (!student) {
    throw createAgentError({
      code: "STUDENT_NOT_FOUND",
      message: "未找到该学生，请先创建学生档案。",
      recoverable: false
    });
  }

  const assembledContext = assembleContext(
    [
      createContextBlock({
        id: `student:${student.id}`,
        source: "student_profile",
        title: "学生档案摘要",
        priority: "required",
        content: [
          student.profile_summary,
          student.weaknesses?.join("、"),
          student.learning_habits?.join("、"),
          student.next_focus
        ]
          .filter(Boolean)
          .join("\n"),
        recordIds: [{ source: "student_profile", table: "students", id: student.id }]
      }),
      ...learningRecords.map((record) =>
        createContextBlock({
          id: `learning-record:${record.id}`,
          source: "learning_record",
          title: record.title || record.record_type,
          priority: "high",
          content: [record.content, record.teacher_note, record.mistake_reason].filter(Boolean).join("\n"),
          recordIds: [{ source: "learning_record", table: "student_learning_records", id: record.id }]
        })
      ),
      ...wrongQuestions.map((question) =>
        createContextBlock({
          id: `wrong-question:${question.id}`,
          source: "wrong_question",
          title: question.question_text || "错题记录",
          priority: "high",
          content: [question.mistake_type, question.mistake_reason, question.analysis_text, question.knowledge_points?.join("、")].filter(Boolean).join("\n"),
          recordIds: [{ source: "wrong_question", table: "wrong_questions", id: question.id }]
        })
      ),
      createContextBlock({
        id: "teacher-input:current",
        source: "teacher_input",
        title: "本次老师输入",
        priority: "required",
        content: [input.classNote, input.wrongQuestionSummary, input.knowledgePoints?.join("、"), input.teacherInstruction].filter(Boolean).join("\n")
      }),
      ...(teacherPreferences
        ? [
            createContextBlock({
              id: `teacher-preferences:${teacherPreferences.id}`,
              source: "teacher_preference" as const,
              title: "老师反馈偏好",
              priority: "medium" as const,
              content: [
                teacherPreferences.feedback_tone,
                teacherPreferences.feedback_length,
                teacherPreferences.banned_phrases?.join("、"),
                teacherPreferences.custom_style_note
              ]
                .filter(Boolean)
                .join("\n"),
              recordIds: [{ source: "teacher_preference" as const, table: "teacher_preferences", id: teacherPreferences.id }]
            })
          ]
        : [])
    ],
    {
      includeSensitive: true,
      maxBlocks: 18,
      metadata: {
        agent: "parent-feedback"
      }
    }
  );

  return {
    student,
    learningRecords,
    wrongQuestions,
    teacherPreferences,
    assembledContext
  };
}
