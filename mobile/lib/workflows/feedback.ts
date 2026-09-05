import { colors } from '@/theme/tokens';
import {
  ClassGroup,
  FeedbackDraft,
  FeedbackTask,
  FeedbackTaskStatus,
  Student,
  StudentStatus,
} from '@/lib/types/domain';

export function statusLabel(status: StudentStatus) {
  const labels: Record<StudentStatus, string> = {
    no_task: '暂无任务',
    has_class_today: '今日有课',
    in_class: '上课中',
    pending_feedback: '待反馈',
    risk: '需关注',
    completed: '已完成',
  };

  return labels[status];
}

export function feedbackTaskStatusLabel(status: FeedbackTaskStatus) {
  const labels: Record<FeedbackTaskStatus, string> = {
    not_generated: '未生成',
    not_copied: '未复制',
    copied_waiting_confirm: '待确认',
    completed: '已完成',
    overdue: '已逾期',
  };

  return labels[status];
}

export function statusColor(status: StudentStatus) {
  const palette: Record<StudentStatus, string> = {
    no_task: colors.textMuted,
    has_class_today: colors.blue,
    in_class: colors.blue,
    pending_feedback: colors.yellow,
    risk: colors.red,
    completed: colors.primary,
  };

  return palette[status];
}

export function taskStatusColor(status: FeedbackTaskStatus) {
  const palette: Record<FeedbackTaskStatus, string> = {
    not_generated: colors.yellow,
    not_copied: colors.blue,
    copied_waiting_confirm: colors.primaryDark,
    completed: colors.primary,
    overdue: colors.red,
  };

  return palette[status];
}

export function sortStudentsByPriority(students: Student[]) {
  const order: Record<StudentStatus, number> = {
    risk: 0,
    pending_feedback: 1,
    has_class_today: 2,
    in_class: 3,
    completed: 4,
    no_task: 5,
  };

  return [...students].sort((a, b) => order[a.currentStatus] - order[b.currentStatus]);
}

export function getPrimaryTaskForStudent(studentId: string, tasks: FeedbackTask[]) {
  return tasks.find((task) => task.studentId === studentId && task.status !== 'completed');
}

export function classFeedbackProgress(classGroup: ClassGroup, tasks: FeedbackTask[]) {
  const classTasks = tasks.filter((task) => task.classId === classGroup.id);
  const total = Math.max(classTasks.length, 1);
  const completed = classTasks.filter((task) => task.status === 'completed').length;
  const notGenerated = classTasks.filter((task) => task.status === 'not_generated').length;
  const notCopied = classTasks.filter((task) => task.status === 'not_copied').length;
  const waitingConfirm = classTasks.filter((task) => task.status === 'copied_waiting_confirm').length;

  return {
    total,
    completed,
    notGenerated,
    notCopied,
    waitingConfirm,
    ratio: completed / total,
  };
}

export function createFeedbackCopy(student: Student, task?: FeedbackTask) {
  const topic = task?.topic ?? '本次课程';
  const weakness = student.mainWeakness ?? '基础概念需要继续巩固';

  return `${student.name}妈妈您好，我是${student.subject}老师。本次${topic}中，${student.name}整体课堂状态认真，能跟上主要讲解节奏。今天重点暴露的问题是${weakness}，后续我会在课堂里继续通过例题和追问帮助他把思路说清楚。建议这两天复习课堂上的 2 道同类题，先不追求速度，重点把条件、步骤和结论写完整。`;
}

export function buildDraft(student: Student, task: FeedbackTask): FeedbackDraft {
  const now = new Date().toISOString();

  return {
    id: `draft-${task.id}`,
    feedbackTaskId: task.id,
    studentId: student.id,
    version: 1,
    tone: 'warm',
    length: 'standard',
    focus: ['课堂表现', '薄弱点', '下节课建议'],
    content: createFeedbackCopy(student, task),
    source: {
      lesson: true,
      teacherNote: true,
      photoAnalysis: task.photoAssetIds.length > 0,
      studentProfile: true,
      mistakeAnalysis: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}
