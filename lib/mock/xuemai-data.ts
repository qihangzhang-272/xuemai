import type { GradingResult, XuemaiClassGroup, XuemaiStudent } from "@/lib/mock/xuemai-types";

export const mockXuemaiStudent: XuemaiStudent = {
  id: "mock-student-1",
  name: "王一路",
  grade: "初二",
  subject: "数学",
  classId: "mock-class-1",
  className: "初二数学 A 班",
  status: "needs_attention",
  statusLabel: "需要关注",
  latestIssueSummary: "函数应用题条件提取不稳定",
  lastUpdatedAt: "今日 18:42",
  profile: {
    weakPoints: ["一次函数", "函数应用题条件提取", "应用题建模"],
    recentState: "课堂能跟上，独立解题时条件提取不够稳定",
    homeworkStatus: "本周 1 次未按时提交",
    parentFeedbackStyle: "简洁、鼓励式",
    nextLessonFocus: ["读题拆解", "分步建模表达"]
  },
  timelineItems: [
    {
      id: "timeline-mistake-generated",
      type: "mistake",
      title: "错题分析",
      summary: "函数应用题出现 3 次错误，主要问题是漏看条件。",
      createdAt: "2026-06-05T18:42:00",
      displayTime: "今日 18:42",
      tags: ["错题", "自动更新"],
      copyable: true,
      status: "saved",
      detail: {
        kind: "mistake",
        wrongQuestionCount: 5,
        knowledgePoints: ["一次函数", "函数应用题"],
        errorPatterns: ["漏看条件", "坐标关系混淆", "建模表达不完整"],
        suggestedTraining: ["条件提取专项 3-5 题", "分步建模训练"],
        relatedPaperTitle: "一次函数应用题小测"
      }
    },
    {
      id: "timeline-feedback-generated",
      type: "feedback",
      title: "家长反馈",
      summary: "已生成一条适合微信发送的课堂反馈。",
      createdAt: "2026-06-05T18:42:00",
      displayTime: "今日 18:42",
      tags: ["反馈", "可复制"],
      copyable: true,
      status: "draft",
      detail: {
        kind: "feedback",
        tone: "简洁、鼓励式",
        target: "parent",
        fullText:
          "王一路这次一次函数小测整体基础思路能跟上，但在应用题里容易漏看条件，导致后续建模不够稳定。建议这周在家重点练 3-5 道条件较多的函数应用题，我下节课也会继续带他做读题拆解和分步建模训练。"
      }
    },
    {
      id: "timeline-profile-update-generated",
      type: "profile_update",
      title: "学习画像更新",
      summary: "薄弱点新增：函数应用题条件提取。",
      createdAt: "2026-06-05T18:42:00",
      displayTime: "今日 18:42",
      tags: ["更新"],
      copyable: false,
      status: "updated",
      detail: {
        kind: "profile_update",
        addedWeakPoints: ["函数应用题条件提取"],
        statusFrom: "稳定",
        statusTo: "需要关注",
        nextLessonFocus: ["读题拆解", "分步建模表达"],
        reason: "一次函数应用题小测中多次出现漏看条件和建模表达不完整。"
      }
    },
    {
      id: "timeline-1",
      type: "feedback",
      title: "课堂反馈",
      summary: "函数应用题课堂表现良好，独立练习时漏看条件。",
      createdAt: "2026-06-05T18:42:00",
      displayTime: "今日 18:42",
      tags: ["反馈"],
      copyable: true,
      status: "saved",
      detail: {
        kind: "feedback",
        tone: "鼓励式",
        target: "parent",
        fullText: "王一路这节课整体状态不错，函数应用题的基本思路能够跟上，但在独立练习时偶尔会漏看题目条件。下节课我会继续带他做读题拆解训练。"
      }
    },
    {
      id: "timeline-2",
      type: "mistake",
      title: "错题分析",
      summary: "几何证明思路不稳定。",
      createdAt: "2026-06-04T20:10:00",
      displayTime: "昨天 20:10",
      tags: ["错题"],
      copyable: true,
      status: "saved",
      detail: {
        kind: "mistake",
        wrongQuestionCount: 4,
        knowledgePoints: ["几何证明"],
        errorPatterns: ["辅助线思路不稳定", "证明步骤跳跃"],
        suggestedTraining: ["基础证明链条训练", "辅助线专项 3 题"],
        relatedPaperTitle: "几何证明小测"
      }
    },
    {
      id: "timeline-3",
      type: "report",
      title: "月报更新",
      summary: "本月学习报告已自动更新，新增错题趋势和训练建议。",
      createdAt: "2026-05-28T19:30:00",
      displayTime: "5月28日",
      tags: ["报告"],
      copyable: true,
      status: "saved",
      detail: {
        kind: "report",
        progress: ["课堂专注度更稳定", "基础计算准确率提升"],
        problems: ["几何证明步骤跳跃", "应用题建模表达不完整"],
        nextMonthFocus: ["证明链条训练", "应用题读题拆解"],
        summaryText: "王一路本月基础状态较稳定，后续重点放在几何证明链条和应用题建模表达。"
      }
    }
  ],
  weaknessEvidence: {
    label: "函数应用题",
    count: 3,
    severity: "high"
  },
  aiSuggestion: {
    text: "建议：下节课重点训练读题拆解与分步建模。",
    primaryActionLabel: "生成教案",
    secondaryActionLabel: "同步"
  }
};

export const mockXuemaiClass: XuemaiClassGroup = {
  id: "mock-class-1",
  name: "初二数学 A 班",
  grade: "初二",
  subject: "数学",
  studentCount: 12,
  focusProblem: "应用题建模不稳定",
  attentionStudentNames: ["王一路", "李明轩"],
  timelineItems: [],
  insights: []
};

export const mockGradingResult: GradingResult = {
  id: "grading-1",
  studentId: "mock-student-1",
  paperTitle: "一次函数应用题小测",
  score: 82,
  wrongQuestionCount: 5,
  knowledgePoints: ["一次函数", "函数应用题", "条件提取"],
  errorPatterns: ["漏看条件", "坐标关系混淆", "建模表达不完整"],
  suggestedTraining: ["条件提取专项 3-5 题", "函数应用题分步建模训练"],
  createdAt: "2026-06-05T18:42:00"
};
