import type { GeneratedProfileTag, XuemaiClassGroup } from "@/lib/mock/xuemai-types";

export interface GeneratedClassStudent {
  id: string;
  name: string;
  initial: string;
  status: "risk" | "behind" | "good" | "stable";
  note: string;
}

export interface GeneratedClassTimelineItem {
  id: string;
  type: "insight" | "feedback";
  title: string;
  summary: string;
  time: string;
}

export interface GeneratedClassView {
  report: {
    pendingFeedback: number;
    mistakeCount: number;
    activeCount: string;
    progressPercent: number;
    progressRows: Array<{ label: string; value: string; percent: number }>;
  };
  students: GeneratedClassStudent[];
  insight: {
    title: string;
    badge: string;
    summary: string;
    affectedStudents: string[];
    actionLabel: string;
  };
  timeline: GeneratedClassTimelineItem[];
  reminder: string;
  focusStudents: GeneratedClassStudent[];
  quickActions: Array<{ label: string; helper: string }>;
  recentArtifacts: Array<{ title: string; createdAt: string; type: "pdf" | "image" }>;
  focusTags: GeneratedProfileTag[];
}

function tag(label: string, tone: GeneratedProfileTag["tone"]): GeneratedProfileTag {
  return { label, tone };
}

export function generateAiClassView(classGroup: XuemaiClassGroup): GeneratedClassView {
  const focusProblem = classGroup.focusProblem.includes("应用题") ? classGroup.focusProblem : "相似三角形证明";
  const students: GeneratedClassStudent[] = [
    { id: "liu-yangyang", name: "刘洋洋", initial: "刘", status: "risk", note: "连续两周作业评级 C" },
    { id: "zhang-xueer", name: "张雪儿", initial: "张", status: "risk", note: `${focusProblem}连续出错` },
    { id: "wang-xiaogang", name: "王小刚", initial: "王", status: "behind", note: "几何板块进度落后" },
    { id: "zhao-xiaoxue", name: "赵小雪", initial: "赵", status: "behind", note: "证明步骤跳跃" },
    { id: "li-mingxuan", name: "李明轩", initial: "李", status: "good", note: "本周作业全对" },
    { id: "chen-xiaohong", name: "陈晓红", initial: "陈", status: "good", note: "课堂表达稳定" },
    { id: "zhou-jielun", name: "周杰伦", initial: "周", status: "good", note: "订正完成及时" },
    { id: "lin-yuner", name: "林允儿", initial: "林", status: "stable", note: "状态稳定" },
    { id: "he-lingling", name: "何灵灵", initial: "何", status: "stable", note: "按时提交" }
  ];

  const affectedStudents = classGroup.attentionStudentNames.length >= 3 ? classGroup.attentionStudentNames : ["刘洋洋", "张雪儿", "王小刚", "赵小雪", "李明轩"];

  return {
    report: {
      pendingFeedback: 4,
      mistakeCount: 18,
      activeCount: "9/12",
      progressPercent: 66,
      progressRows: [
        { label: "反馈率", value: "8/12", percent: 67 },
        { label: "课后反馈", value: "8/12", percent: 67 },
        { label: "月报状态", value: "8/12", percent: 67 }
      ]
    },
    students,
    insight: {
      title: `${focusProblem} · 共性错误预警`,
      badge: "本周新发现",
      summary: `系统检测到本周作业中，有 ${affectedStudents.length} 名学生在「${focusProblem}」上存在重复错误。主要问题集中在条件提取、证明链条和分步表达不完整。`,
      affectedStudents,
      actionLabel: "生成针对性反馈"
    },
    timeline: [
      {
        id: "class-timeline-insight",
        type: "insight",
        title: "班级洞察生成",
        summary: `系统基于近期作业自动提炼了「${focusProblem}」知识点薄弱项。`,
        time: "今天 10:30"
      },
      {
        id: "class-timeline-feedback",
        type: "feedback",
        title: "批量反馈发送",
        summary: `向 ${classGroup.studentCount} 名学生下发了本周数学测验的 AI 个性化评语。`,
        time: "昨天 16:45"
      }
    ],
    reminder: "期中考试即将来临，建议在下周三前完成阶段性复习报告的下发。",
    focusStudents: students.filter((student) => student.status === "risk" || student.status === "behind").slice(0, 2),
    quickActions: [
      { label: "AI班级洞察", helper: "自动整理共性问题" },
      { label: "批量反馈", helper: "生成家长沟通话术" }
    ],
    recentArtifacts: [
      { title: "第九周数学周报.pdf", createdAt: "2 天前生成", type: "pdf" },
      { title: "期中表彰海报.png", createdAt: "5 天前生成", type: "image" }
    ],
    focusTags: [tag("阶段性复习", "green"), tag("相似三角形", "neutral"), tag("错题预警", "red")]
  };
}
