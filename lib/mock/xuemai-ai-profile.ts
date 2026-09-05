import type { GeneratedProfileTag, GeneratedProfileView, XuemaiStudent } from "@/lib/mock/xuemai-types";

function tag(label: string, tone: GeneratedProfileTag["tone"]): GeneratedProfileTag {
  return { label, tone };
}

function uniqueTags(tags: GeneratedProfileTag[]) {
  const seen = new Set<string>();
  return tags.filter((item) => {
    if (seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });
}

function inferWeaknessDimension(student: XuemaiStudent) {
  const source = [student.latestIssueSummary, student.profile.weakPoints.join("、")].join("、");
  if (source.includes("条件") || source.includes("读题") || source.includes("信息")) return "信息提取";
  if (source.includes("建模") || source.includes("应用题")) return "应用迁移";
  if (source.includes("证明") || source.includes("逻辑")) return "逻辑思维";
  return student.profile.weakPoints[0] ?? "待观察";
}

function inferStrengthTags(student: XuemaiStudent) {
  const state = student.profile.recentState;
  const tags = [tag("知识理解", "green")];
  if (state.includes("课堂能跟上") || state.includes("表达")) tags.push(tag("表达呈现", "green"));
  if (state.includes("稳定")) tags.push(tag("学习执行", "green"));
  return uniqueTags(tags).slice(0, 3);
}

function inferRecentStateTags(student: XuemaiStudent) {
  const state = student.profile.recentState;
  const tags: GeneratedProfileTag[] = [];
  if (state.includes("独立解题")) tags.push(tag("独立解题波动", "red"));
  if (state.includes("课堂能跟上")) tags.push(tag("课堂能跟上", "green"));
  if (state.includes("不够稳定")) tags.push(tag("稳定性待加强", "red"));
  return tags.length > 0 ? tags : [tag("继续观察", "neutral")];
}

function inferHomeworkTags(student: XuemaiStudent) {
  const homework = student.profile.homeworkStatus;
  if (homework.includes("未按时") || homework.includes("未交")) return [tag(homework, "red")];
  if (homework.includes("完成")) return [tag(homework, "green")];
  return [tag(homework, "neutral")];
}

export function generateAiProfileView(student: XuemaiStudent): GeneratedProfileView {
  const weaknessDimension = inferWeaknessDimension(student);
  const weakPoints = uniqueTags([
    ...student.profile.weakPoints.slice(0, 3).map((point) => tag(point, "red")),
    student.weaknessEvidence ? tag(student.weaknessEvidence.label, student.weaknessEvidence.severity === "high" ? "red" : "neutral") : tag(weaknessDimension, "red")
  ]).slice(0, 4);

  const nextLessonFocus = uniqueTags(
    student.profile.nextLessonFocus.map((focus) => tag(focus, "green")).concat(student.status === "needs_attention" ? [tag("基础题信心恢复", "neutral")] : [])
  ).slice(0, 3);

  return {
    currentWeakness: [tag(weaknessDimension, "red")],
    currentStrengths: inferStrengthTags(student),
    recentFocus: `提升题干关键信息提取与情境应用能力`,
    summarySections: [
      {
        title: "高频薄弱点",
        tags: weakPoints
      },
      {
        title: "最近状态",
        tags: inferRecentStateTags(student)
      },
      {
        title: "作业情况",
        tags: inferHomeworkTags(student)
      },
      {
        title: "下节课重点",
        tags: nextLessonFocus
      }
    ],
    nextLessonFocus
  };
}
