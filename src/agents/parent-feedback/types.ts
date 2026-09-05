import type { AgentRunBaseInput } from "../types";
import type { AssembledContext } from "../shared/context/context-types";
import type { TeacherPreferencesRecord } from "../shared/tools/feedback-tools";
import type { StudentLearningRecord, WrongQuestionRecord } from "../shared/tools/learning-record-tools";
import type { StudentProfileRecord } from "../shared/tools/student-tools";

export type ParentFeedbackInput = AgentRunBaseInput & {
  studentId: string;
  classNote?: string;
  wrongQuestionSummary?: string;
  knowledgePoints?: string[];
  teacherInstruction?: string;
  outputPreference?: {
    length?: "short" | "medium" | "long";
    tone?: "warm_professional" | "concise_direct" | "encouraging" | "calm_objective";
  };
};

export type ParentFeedbackOutput = {
  feedbackText: string;
  studentStatus: "excellent" | "stable" | "needs_attention";
  coreIssue: string;
  nextAction: string;
  relatedKnowledgePoints: string[];
  shouldUpdateStudentProfile: boolean;
  suggestedProfileUpdate?: {
    weaknesses?: string[];
    learningHabits?: string[];
    nextFocus?: string;
    riskSignals?: string[];
  };
  qualityScore: number;
  warnings: string[];
  revised: boolean;
  agentRunId?: string;
  agentOutputId?: string;
};

export type ParentFeedbackModelOutput = Omit<ParentFeedbackOutput, "qualityScore" | "warnings" | "revised" | "agentRunId" | "agentOutputId">;

export type ParentFeedbackContextData = {
  student: StudentProfileRecord;
  learningRecords: StudentLearningRecord[];
  wrongQuestions: WrongQuestionRecord[];
  teacherPreferences: TeacherPreferencesRecord | null;
  assembledContext: AssembledContext;
};

export type ParentFeedbackApiResponse =
  | {
      success: true;
      data: ParentFeedbackOutput;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        recoverable: boolean;
      };
    };

export type ParentFeedbackConfirmInput = {
  teacherId: string;
  studentId: string;
  classId?: string;
  agentRunId?: string;
  agentOutputId: string;
  finalFeedbackText: string;
  originalFeedbackText?: string;
  coreIssue?: string;
  nextAction?: string;
  qualityScore?: number;
};

export type ParentFeedbackConfirmOutput = {
  feedbackHistoryId: string;
  learningRecordId: string;
  agentOutputId: string;
  agentRunId?: string;
  status: "confirmed" | "edited";
  teacherEdited: boolean;
  editEventId?: string;
};
