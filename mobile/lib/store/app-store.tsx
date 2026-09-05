import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import {
  mockAiLogs,
  mockAiTasks,
  mockAnalyses,
  mockClasses,
  mockDrafts,
  mockFeedbackTasks,
  mockNotifications,
  mockPhotos,
  mockReports,
  mockStudents,
  mockStudio,
  mockUser,
} from '@/lib/mock/data';
import {
  AIAnalysis,
  AIOperationLog,
  AITask,
  ClassGroup,
  FeedbackDraft,
  FeedbackTask,
  MonthlyReport,
  NotificationItem,
  PhotoAsset,
  Student,
  Studio,
  User,
} from '@/lib/types/domain';
import { buildDraft } from '@/lib/workflows/feedback';

type AppState = {
  user: User;
  studio: Studio;
  students: Student[];
  classes: ClassGroup[];
  feedbackTasks: FeedbackTask[];
  drafts: FeedbackDraft[];
  photos: PhotoAsset[];
  analyses: AIAnalysis[];
  notifications: NotificationItem[];
  aiTasks: AITask[];
  aiLogs: AIOperationLog[];
  reports: MonthlyReport[];
};

type AiCommandResult =
  | { type: 'batch_feedback'; classId: string }
  | { type: 'risk'; studentId: string }
  | { type: 'report'; reportId: string }
  | { type: 'clarify'; message: string };

type AppStore = AppState & {
  addStudent: (input: Pick<Student, 'name' | 'grade' | 'subject' | 'learningGoal'> & { classId?: string }) => Student;
  generateFeedback: (taskId: string) => FeedbackDraft | undefined;
  bulkGenerateFeedback: (taskIds: string[]) => void;
  updateDraftContent: (draftId: string, content: string) => void;
  copyFeedback: (taskId: string) => void;
  confirmFeedbackSent: (taskId: string) => void;
  addMockPhoto: (studentId?: string, taskId?: string, classId?: string) => PhotoAsset;
  createMockAnalysis: (studentId: string, classId?: string) => AIAnalysis;
  runAiCommand: (command: string) => AiCommandResult;
  markNotificationRead: (notificationId: string) => void;
  confirmAiUpdate: (logId: string) => void;
};

const AppStoreContext = createContext<AppStore | undefined>(undefined);

function getNow() {
  return new Date().toISOString();
}

export function AppProvider({ children }: PropsWithChildren) {
  const [students, setStudents] = useState(mockStudents);
  const [classes, setClasses] = useState(mockClasses);
  const [feedbackTasks, setFeedbackTasks] = useState(mockFeedbackTasks);
  const [drafts, setDrafts] = useState(mockDrafts);
  const [photos, setPhotos] = useState(mockPhotos);
  const [analyses, setAnalyses] = useState(mockAnalyses);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [aiTasks, setAiTasks] = useState(mockAiTasks);
  const [aiLogs, setAiLogs] = useState(mockAiLogs);

  const store = useMemo<AppStore>(() => {
    function addLog(log: AIOperationLog) {
      setAiLogs((items) => [log, ...items]);
    }

    return {
      user: mockUser,
      studio: mockStudio,
      students,
      classes,
      feedbackTasks,
      drafts,
      photos,
      analyses,
      notifications,
      aiTasks,
      aiLogs,
      reports: mockReports,
      addStudent(input) {
        const now = getNow();
        const student: Student = {
          id: `stu-${Date.now()}`,
          name: input.name,
          grade: input.grade,
          subject: input.subject,
          classId: input.classId,
          avatarText: input.name.slice(0, 1),
          currentStatus: 'pending_feedback',
          learningGoal: input.learningGoal,
          mainWeakness: '新建档案，等待首次反馈沉淀',
          currentLevel: '待观察',
          stability: 'medium',
          tags: [{ id: `tag-${Date.now()}`, label: '新建档案', source: 'teacher', importance: 'normal' }],
          scheduleRules: [
            {
              id: `schedule-${Date.now()}`,
              frequency: 'weekly',
              weekdays: [2, 5],
              startTime: '18:00',
              durationMinutes: 60,
              repeat: true,
              enabled: true,
            },
          ],
          feedbackRules: [
            {
              id: `feedback-rule-${Date.now()}`,
              needFeedbackAfterEachClass: true,
              triggerType: 'after_class',
              deadlineType: 'same_day_time',
              deadlineTime: '22:00',
              reminderRules: [
                { id: `reminder-${Date.now()}-1`, type: 'after_class', minutesOffset: 0, enabled: true },
                { id: `reminder-${Date.now()}-2`, type: 'before_deadline', minutesOffset: 30, enabled: true },
              ],
            },
          ],
          createdAt: now,
          updatedAt: now,
        };

        const task: FeedbackTask = {
          id: `task-${Date.now()}`,
          studentId: student.id,
          classId: input.classId,
          topic: '新建档案后的首次反馈',
          status: 'not_generated',
          deadlineAt: now,
          photoAssetIds: [],
          createdAt: now,
          updatedAt: now,
        };

        setStudents((items) => [student, ...items]);
        setFeedbackTasks((items) => [task, ...items]);
        setNotifications((items) => [
          {
            id: `notice-${Date.now()}`,
            type: 'pending_feedback',
            title: `${student.name}反馈待生成`,
            description: '已根据建档流程模拟生成课后反馈任务。',
            relatedStudentId: student.id,
            relatedClassId: input.classId,
            relatedTaskId: task.id,
            read: false,
            actionLabel: '立即处理',
            createdAt: now,
          },
          ...items,
        ]);

        return student;
      },
      generateFeedback(taskId) {
        const task = feedbackTasks.find((item) => item.id === taskId);
        if (!task) return undefined;
        const student = students.find((item) => item.id === task.studentId);
        if (!student) return undefined;

        const now = getNow();
        const draft = buildDraft(student, task);
        setDrafts((items) => [draft, ...items.filter((item) => item.id !== draft.id)]);
        setFeedbackTasks((items) =>
          items.map((item) =>
            item.id === taskId
              ? { ...item, status: 'not_copied', generatedAt: now, feedbackDraftId: draft.id, updatedAt: now }
              : item,
          ),
        );
        setAiTasks((items) => [
          {
            id: `ai-task-${Date.now()}`,
            type: 'feedback_generation',
            title: `${student.name}反馈已生成`,
            description: '已生成可复制到微信的家长反馈。',
            relatedStudentId: student.id,
            relatedClassId: task.classId,
            status: 'completed',
            progressText: '等待老师复制确认',
            actionLabel: '预览反馈',
            createdAt: now,
            updatedAt: now,
          },
          ...items,
        ]);
        addLog({
          id: `log-${Date.now()}`,
          type: 'feedback_generated',
          title: `已生成${student.name}家长反馈`,
          relatedStudentId: student.id,
          relatedClassId: task.classId,
          requiresConfirmation: false,
          confirmed: true,
          createdAt: now,
        });

        return draft;
      },
      bulkGenerateFeedback(taskIds) {
        taskIds.forEach((taskId) => {
          const task = feedbackTasks.find((item) => item.id === taskId);
          const student = task ? students.find((item) => item.id === task.studentId) : undefined;
          if (!task || !student) return;
          const draft = buildDraft(student, task);
          const now = getNow();
          setDrafts((items) => [draft, ...items.filter((item) => item.id !== draft.id)]);
          setFeedbackTasks((items) =>
            items.map((item) =>
              item.id === taskId
                ? { ...item, status: 'not_copied', generatedAt: now, feedbackDraftId: draft.id, updatedAt: now }
                : item,
            ),
          );
        });
      },
      updateDraftContent(draftId, content) {
        const now = getNow();
        setDrafts((items) =>
          items.map((item) => (item.id === draftId ? { ...item, content, updatedAt: now } : item)),
        );
      },
      copyFeedback(taskId) {
        const now = getNow();
        setFeedbackTasks((items) =>
          items.map((item) =>
            item.id === taskId ? { ...item, status: 'copied_waiting_confirm', copiedAt: now, updatedAt: now } : item,
          ),
        );
      },
      confirmFeedbackSent(taskId) {
        const now = getNow();
        const task = feedbackTasks.find((item) => item.id === taskId);
        if (!task) return;
        const student = students.find((item) => item.id === task.studentId);
        setFeedbackTasks((items) =>
          items.map((item) =>
            item.id === taskId ? { ...item, status: 'completed', confirmedSentAt: now, updatedAt: now } : item,
          ),
        );
        setStudents((items) =>
          items.map((item) =>
            item.id === task.studentId ? { ...item, currentStatus: 'completed', updatedAt: now } : item,
          ),
        );
        setNotifications((items) =>
          items.map((item) => (item.relatedTaskId === taskId ? { ...item, read: true } : item)),
        );
        if (student) {
          addLog({
            id: `log-${Date.now()}`,
            type: 'report_material_archived',
            title: `已确认${student.name}家长反馈发送，并归档到月报素材`,
            relatedStudentId: student.id,
            relatedClassId: task.classId,
            requiresConfirmation: false,
            confirmed: true,
            createdAt: now,
          });
        }
      },
      addMockPhoto(studentId, taskId, classId) {
        const now = getNow();
        const photo: PhotoAsset = {
          id: `photo-${Date.now()}`,
          studentId,
          classId,
          feedbackTaskId: taskId,
          uri: `mock://photo-${Date.now()}`,
          type: 'homework',
          uploadStatus: 'local',
          aiAnalysisStatus: 'not_started',
          createdAt: now,
        };
        setPhotos((items) => [photo, ...items]);
        if (taskId) {
          setFeedbackTasks((items) =>
            items.map((item) =>
              item.id === taskId ? { ...item, photoAssetIds: [...item.photoAssetIds, photo.id], updatedAt: now } : item,
            ),
          );
        }
        return photo;
      },
      createMockAnalysis(studentId, classId) {
        const now = getNow();
        const analysis: AIAnalysis = {
          id: `analysis-${Date.now()}`,
          studentId,
          classId,
          photoAssetIds: [],
          topic: '拍照作业分析',
          summary: 'AI 模拟分析完成：本次主要问题集中在审题和步骤表达，需要通过同类题巩固。',
          accuracy: 72,
          mainWeaknesses: ['审题不完整', '步骤表达', '知识迁移'],
          knowledgePoints: ['核心概念', '条件转化', '规范书写'],
          mistakes: [
            {
              id: `mistake-${Date.now()}`,
              studentAnswer: '步骤略写',
              correctAnswer: '补全条件与理由',
              mistakeReason: '没有把题目条件转换成可用结论。',
              knowledgePoint: '条件转化',
              teachingSuggestion: '先让学生口述条件，再写出每一步理由。',
              similarPracticeGenerated: true,
            },
          ],
          suggestions: ['下节课先做 2 道同类题', '反馈中提醒家长关注书写完整度'],
          status: 'completed',
          createdAt: now,
        };
        setAnalyses((items) => [analysis, ...items]);
        setAiTasks((items) => [
          {
            id: `ai-task-${Date.now()}`,
            type: 'photo_grading',
            title: '拍照批改已完成',
            description: '已生成错因、知识点和反馈建议。',
            relatedStudentId: studentId,
            relatedClassId: classId,
            status: 'completed',
            progressText: '可查看分析结果',
            actionLabel: '查看结果',
            createdAt: now,
            updatedAt: now,
          },
          ...items,
        ]);
        return analysis;
      },
      runAiCommand(command) {
        const normalized = command.trim();
        const pendingTask = feedbackTasks.find((task) => task.status !== 'completed');
        const firstReport = mockReports[0];

        if (normalized.includes('反馈') || normalized.includes('待处理')) {
          return { type: 'batch_feedback', classId: pendingTask?.classId ?? classes[0]?.id ?? 'class-math-a' };
        }
        if (normalized.includes('风险') || normalized.includes('退步')) {
          return { type: 'risk', studentId: students.find((item) => item.currentStatus === 'risk')?.id ?? students[0].id };
        }
        if (normalized.includes('月报') || normalized.includes('报告')) {
          return { type: 'report', reportId: firstReport.id };
        }

        return { type: 'clarify', message: '我可以帮你处理反馈、查找风险学生或生成月报。' };
      },
      markNotificationRead(notificationId) {
        setNotifications((items) =>
          items.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
        );
      },
      confirmAiUpdate(logId) {
        setAiLogs((items) =>
          items.map((item) => (item.id === logId ? { ...item, confirmed: true } : item)),
        );
      },
    };
  }, [aiLogs, aiTasks, analyses, classes, drafts, feedbackTasks, notifications, photos, students]);

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error('useAppStore must be used inside AppProvider');
  }
  return store;
}
