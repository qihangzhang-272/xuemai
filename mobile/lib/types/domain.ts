export type UserRole = 'individual_teacher' | 'institution_teacher';

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  studioId: string;
  plan: 'trial' | 'pro' | 'institution';
  createdAt: string;
}

export interface Studio {
  id: string;
  name: string;
  type: 'personal_studio' | 'small_institution' | 'education_institution';
  city?: string;
  mainSubjects: string[];
  displayName: string;
  ownerUserId: string;
}

export type StudentStatus =
  | 'no_task'
  | 'has_class_today'
  | 'in_class'
  | 'pending_feedback'
  | 'risk'
  | 'completed';

export type StudentTag = {
  id: string;
  label: string;
  source: 'teacher' | 'ai';
  importance: 'normal' | 'important';
};

export interface LessonScheduleRule {
  id: string;
  studentId?: string;
  classId?: string;
  frequency: 'weekly' | 'biweekly' | 'custom';
  weekdays: number[];
  startTime: string;
  durationMinutes: number;
  repeat: boolean;
  enabled: boolean;
}

export interface ReminderRule {
  id: string;
  type: 'after_class' | 'before_deadline';
  minutesOffset: number;
  enabled: boolean;
}

export interface FeedbackRule {
  id: string;
  studentId?: string;
  classId?: string;
  needFeedbackAfterEachClass: boolean;
  triggerType: 'after_class' | 'manual' | 'after_upload' | 'after_ai_analysis';
  deadlineType: 'same_day_time' | 'hours_after_class';
  deadlineTime?: string;
  deadlineHoursAfterClass?: number;
  reminderRules: ReminderRule[];
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  subject: string;
  classId?: string;
  avatarText?: string;
  currentStatus: StudentStatus;
  learningGoal?: string;
  mainWeakness?: string;
  currentLevel?: string;
  stability?: 'low' | 'medium' | 'high';
  tags: StudentTag[];
  scheduleRules: LessonScheduleRule[];
  feedbackRules: FeedbackRule[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  subject: string;
  grade?: string;
  teacherId: string;
  studentIds: string[];
  pendingFeedbackCount: number;
  monthlyReportProgress: number;
  status: 'normal' | 'pending' | 'risk' | 'completed';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type FeedbackTaskStatus =
  | 'not_generated'
  | 'not_copied'
  | 'copied_waiting_confirm'
  | 'completed'
  | 'overdue';

export interface FeedbackTask {
  id: string;
  studentId: string;
  classId?: string;
  lessonId?: string;
  topic?: string;
  status: FeedbackTaskStatus;
  deadlineAt?: string;
  generatedAt?: string;
  copiedAt?: string;
  confirmedSentAt?: string;
  feedbackDraftId?: string;
  photoAssetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackDraft {
  id: string;
  feedbackTaskId: string;
  studentId: string;
  version: number;
  tone: 'warm' | 'professional' | 'encouraging' | 'brief' | 'detailed';
  length: 'short' | 'standard' | 'detailed';
  focus: string[];
  content: string;
  source: {
    lesson?: boolean;
    teacherNote?: boolean;
    photoAnalysis?: boolean;
    studentProfile?: boolean;
    mistakeAnalysis?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PhotoAsset {
  id: string;
  studentId?: string;
  classId?: string;
  feedbackTaskId?: string;
  uri: string;
  type: 'homework' | 'test_paper' | 'mistake' | 'classwork';
  uploadStatus: 'local' | 'uploading' | 'uploaded' | 'failed';
  aiAnalysisStatus: 'not_started' | 'analyzing' | 'completed' | 'failed';
  createdAt: string;
}

export interface MistakeItem {
  id: string;
  questionImageUrl?: string;
  studentAnswer?: string;
  correctAnswer?: string;
  mistakeReason: string;
  knowledgePoint: string;
  teachingSuggestion: string;
  similarPracticeGenerated: boolean;
}

export interface AIAnalysis {
  id: string;
  studentId: string;
  classId?: string;
  photoAssetIds: string[];
  topic?: string;
  summary: string;
  accuracy?: number;
  mainWeaknesses: string[];
  knowledgePoints: string[];
  mistakes: MistakeItem[];
  suggestions: string[];
  status: 'analyzing' | 'completed' | 'failed';
  createdAt: string;
}

export interface ReportContent {
  overview: string;
  abilityChanges: { label: string; before: number; after: number }[];
  progressPoints: string[];
  weaknesses: string[];
  nextMonthSuggestions: string[];
  teacherReview?: string[];
}

export interface MonthlyReport {
  id: string;
  studentId: string;
  classId?: string;
  month: string;
  parentVersion: ReportContent;
  teacherReviewVersion: ReportContent;
  status: 'not_generated' | 'draft' | 'generated' | 'exported';
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'pending_feedback'
  | 'monthly_report'
  | 'learning_risk'
  | 'ai_grading_completed';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  relatedStudentId?: string;
  relatedClassId?: string;
  relatedTaskId?: string;
  read: boolean;
  actionLabel: string;
  createdAt: string;
}

export type AITaskType =
  | 'photo_grading'
  | 'feedback_generation'
  | 'monthly_report_generation'
  | 'risk_detection'
  | 'profile_update'
  | 'tag_update';

export type AITaskStatus =
  | 'pending'
  | 'running'
  | 'waiting_confirmation'
  | 'completed'
  | 'failed';

export interface AITask {
  id: string;
  type: AITaskType;
  title: string;
  description: string;
  relatedStudentId?: string;
  relatedClassId?: string;
  status: AITaskStatus;
  progressText?: string;
  actionLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export type AIOperationType =
  | 'auto_tag_added'
  | 'profile_updated'
  | 'report_material_archived'
  | 'risk_suggestion'
  | 'feedback_generated';

export interface AIOperationLog {
  id: string;
  type: AIOperationType;
  title: string;
  description?: string;
  relatedStudentId?: string;
  relatedClassId?: string;
  requiresConfirmation: boolean;
  confirmed?: boolean;
  createdAt: string;
}
