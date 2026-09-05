import type { ProfileUpdateRecord, ProfileUpdateTarget, TimelineRecord } from "./types";

export type StudentTimelineFilter = "all" | "learning_record" | "learning_evidence" | "feedback" | "monthly_source";

export type StudentTimelineItem = {
  id: string;
  title: string;
  summary: string;
  meta: string;
  tone: "green" | "orange" | "gray";
};

export const studentTimelineFilters: Array<{ id: StudentTimelineFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "learning_record", label: "学习记录" },
  { id: "learning_evidence", label: "分析报告" },
  { id: "feedback", label: "家长反馈" },
  { id: "monthly_source", label: "月报素材" }
];

export function getTimelineRecordsForConversation(records: TimelineRecord[], conversationId: string) {
  return records.filter((record) => record.conversationId === conversationId);
}

export function getProfileUpdatesForConversation(records: TimelineRecord[], conversationId: string) {
  return getTimelineRecordsForConversation(records, conversationId).flatMap((record) => record.profileUpdates ?? []);
}

export function getMonthlyReportSourcesForConversation(records: TimelineRecord[], conversationId: string) {
  return getProfileUpdatesForConversation(records, conversationId).filter((update) => update.target === "monthly_report_source");
}

export function buildStudentTimelineItems(records: TimelineRecord[], filter: StudentTimelineFilter = "all"): StudentTimelineItem[] {
  if (filter === "monthly_source") {
    return records.flatMap((record) =>
      (record.profileUpdates ?? [])
        .filter((update) => update.target === "monthly_report_source")
        .map((update) => ({
          id: update.id,
          title: update.label,
          summary: update.value,
          meta: `来自 ${formatTimelineRecordTitle(record)}`,
          tone: "orange" as const
        }))
    );
  }

  return records
    .filter((record) => filter === "all" || inferTimelineFilter(record) === filter)
    .map((record) => ({
      id: record.id,
      title: formatTimelineRecordTitle(record),
      summary: record.summary,
      meta: record.archiveTarget,
      tone: inferTimelineTone(record)
    }));
}

export function countTimelineItemsByFilter(records: TimelineRecord[]) {
  return studentTimelineFilters.reduce<Record<StudentTimelineFilter, number>>(
    (counts, filter) => ({
      ...counts,
      [filter.id]: buildStudentTimelineItems(records, filter.id).length
    }),
    {
      all: 0,
      learning_record: 0,
      learning_evidence: 0,
      feedback: 0,
      monthly_source: 0
    }
  );
}

export function getLatestProfileUpdateValue(items: ProfileUpdateRecord[]) {
  return items.at(-1)?.value;
}

export function simplifyProfileLabel(label: string) {
  return label.replace(/^更新能力画像：/u, "").replace(/^新增薄弱点事件：/u, "").replace(/^新增复发风险：/u, "").replace(/^生成下次跟进：/u, "").replace(/^加入月报素材：/u, "");
}

export function formatProfileTargetForTimeline(target: ProfileUpdateTarget) {
  if (target === "ability_profile") return "能力画像";
  if (target === "weakness_event") return "薄弱点";
  if (target === "recurrence_risk") return "复发风险";
  if (target === "action_plan") return "跟进计划";
  return "月报素材";
}

function inferTimelineFilter(record: TimelineRecord): Exclude<StudentTimelineFilter, "all" | "monthly_source"> {
  if (record.skillId === "generate_feedback" || record.archiveTarget.includes("课后反馈")) return "feedback";
  if (record.skillId === "analyze_learning_evidence" || record.archiveTarget.includes("学习材料分析")) return "learning_evidence";
  return "learning_record";
}

function formatTimelineRecordTitle(record: TimelineRecord) {
  if (record.skillId === "generate_feedback" || record.archiveTarget.includes("课后反馈")) return "微信反馈";
  if (record.skillId === "analyze_learning_evidence" || record.archiveTarget.includes("学习材料分析")) return "学情报告";
  if (record.skillId === "monthly_report" || record.archiveTarget.includes("月报")) return "月报";
  if (record.archiveTarget.includes("学习记录")) return "学习记录";
  return record.title.replace(/^.*? · /u, "").replace(/^生成/u, "");
}

function inferTimelineTone(record: TimelineRecord): StudentTimelineItem["tone"] {
  if (record.profileUpdates?.some((update) => update.target === "monthly_report_source")) return "orange";
  if (record.skillId === "generate_feedback") return "gray";
  return "green";
}
