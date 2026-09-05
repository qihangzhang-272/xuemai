import { mockGradingResult, mockXuemaiClass, mockXuemaiStudent } from "@/lib/mock/xuemai-data";
import type { TimelineItem, XuemaiMockState } from "@/lib/mock/xuemai-types";

const XUEMAI_STORAGE_KEY = "xuemai_mock_state_v2";

function cloneState(state: XuemaiMockState): XuemaiMockState {
  return JSON.parse(JSON.stringify(state)) as XuemaiMockState;
}

export function getInitialXuemaiState(): XuemaiMockState {
  return cloneState({
    student: mockXuemaiStudent,
    classGroup: mockXuemaiClass
  });
}

export function readXuemaiMockState(): XuemaiMockState {
  if (typeof window === "undefined") return getInitialXuemaiState();

  const raw = window.localStorage.getItem(XUEMAI_STORAGE_KEY);
  if (!raw) return getInitialXuemaiState();

  try {
    return JSON.parse(raw) as XuemaiMockState;
  } catch {
    return getInitialXuemaiState();
  }
}

export function writeXuemaiMockState(state: XuemaiMockState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(XUEMAI_STORAGE_KEY, JSON.stringify(state));
}

export function copyTimelineItemText(item: TimelineItem) {
  if (item.detail.kind === "feedback") return item.detail.fullText;
  if (item.detail.kind === "mistake") {
    return [
      item.summary,
      `错题数量：${item.detail.wrongQuestionCount}`,
      `主要知识点：${item.detail.knowledgePoints.join("、")}`,
      `建议训练：${item.detail.suggestedTraining.join("、")}`
    ].join("\n");
  }
  if (item.detail.kind === "report") return item.detail.summaryText;
  if (item.detail.kind === "profile_update") return `${item.summary} 下次课重点：${item.detail.nextLessonFocus.join("、")}`;
  if (item.detail.kind === "class_insight") return `${item.summary} ${item.detail.teachingSuggestion}`;
  return item.summary;
}

export function runGradingCompletedWorkflow(studentId: string, currentState?: XuemaiMockState): XuemaiMockState {
  const state = cloneState(currentState ?? readXuemaiMockState());
  if (studentId !== state.student.id) return state;

  const generatedIds = new Set(["timeline-mistake-generated", "timeline-feedback-generated", "timeline-profile-update-generated"]);
  const existingItems = state.student.timelineItems.filter((item) => !generatedIds.has(item.id));

  const generatedStudentItems: TimelineItem[] = [
    {
      id: "timeline-mistake-generated",
      type: "mistake",
      title: "错题分析",
      summary: "函数应用题出现 3 次错误，主要问题是漏看条件。",
      createdAt: mockGradingResult.createdAt,
      displayTime: "今日 18:42",
      tags: ["错题", "自动更新"],
      copyable: true,
      status: "saved",
      detail: {
        kind: "mistake",
        wrongQuestionCount: mockGradingResult.wrongQuestionCount,
        knowledgePoints: ["一次函数", "函数应用题"],
        errorPatterns: ["漏看条件", "坐标关系混淆", "建模表达不完整"],
        suggestedTraining: ["条件提取专项 3-5 题", "分步建模训练"],
        relatedPaperTitle: mockGradingResult.paperTitle
      }
    },
    {
      id: "timeline-feedback-generated",
      type: "feedback",
      title: "家长反馈",
      summary: "已生成一条适合微信发送的课堂反馈。",
      createdAt: mockGradingResult.createdAt,
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
      createdAt: mockGradingResult.createdAt,
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
    }
  ];

  state.student = {
    ...state.student,
    status: "needs_attention",
    statusLabel: "需要关注",
    latestIssueSummary: "函数应用题条件提取不稳定",
    lastUpdatedAt: "今日 18:42",
    profile: {
      ...state.student.profile,
      weakPoints: ["一次函数", "函数应用题条件提取", "应用题建模"],
      recentState: "课堂能跟上，独立解题时条件提取不够稳定",
      nextLessonFocus: ["读题拆解", "分步建模表达"]
    },
    timelineItems: [...generatedStudentItems, ...existingItems],
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

  const classInsightItem: TimelineItem = {
    id: "class-insight-generated",
    type: "class_insight",
    title: "班级共性问题已更新",
    summary: "本周 4 名学生在一次函数应用题中出现条件提取问题。",
    createdAt: mockGradingResult.createdAt,
    displayTime: "今日 18:42",
    tags: ["班级洞察", "教学建议"],
    copyable: false,
    status: "updated",
    detail: {
      kind: "class_insight",
      className: "初二数学 A 班",
      commonProblem: "一次函数应用题条件提取不稳定",
      affectedStudentNames: ["王一路", "李明轩", "张子涵", "陈思远"],
      teachingSuggestion: "建议下节课增加 15 分钟读题拆解与分步建模专项训练。"
    }
  };

  state.classGroup = {
    ...state.classGroup,
    focusProblem: "一次函数应用题条件提取",
    attentionStudentNames: ["王一路", "李明轩", "张子涵", "陈思远"],
    timelineItems: [classInsightItem],
    insights: [
      {
        id: "class-insight-generated",
        title: classInsightItem.title,
        summary: classInsightItem.summary,
        commonProblem: "一次函数应用题条件提取不稳定",
        affectedStudentNames: ["王一路", "李明轩", "张子涵", "陈思远"],
        teachingSuggestion: "建议下节课增加 15 分钟读题拆解与分步建模专项训练。",
        createdAt: "今日 18:42"
      }
    ]
  };

  writeXuemaiMockState(state);
  return state;
}

export function updateTimelineItemInState(state: XuemaiMockState, item: TimelineItem): XuemaiMockState {
  const next = cloneState(state);
  next.student.timelineItems = next.student.timelineItems.map((timelineItem) => (timelineItem.id === item.id ? item : timelineItem));
  writeXuemaiMockState(next);
  return next;
}
