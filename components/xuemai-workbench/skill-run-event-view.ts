import { skillActionLabels } from "../../src/skills/actions";
import type { SkillActionId, SkillRunEvent, SkillRunEventType } from "../../src/skills/types";

export type SkillRunEventTimelineItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  tone: "green" | "gray" | "orange" | "red";
};

export function buildSkillRunEventTimeline(events: SkillRunEvent[] = [], options: { limit?: number } = {}): SkillRunEventTimelineItem[] {
  const limit = options.limit ?? 6;

  return events.slice(-limit).map((event) => ({
    id: event.id,
    title: getEventTitle(event),
    detail: getEventDetail(event),
    meta: `${getEventTypeLabel(event.event_type)} · ${formatEventTime(event.created_at)}`,
    tone: getEventTone(event.event_type)
  }));
}

function getEventTitle(event: SkillRunEvent) {
  if (event.event_type === "invalid_action") return `未执行：${skillActionLabels[event.action]}`;

  const titleMap: Partial<Record<SkillActionId, string>> = {
    copy_feedback: "已复制微信反馈",
    mark_parent_sent: "已标记已发给家长",
    archive: "已确认入档",
    regenerate: "已请求重新生成",
    make_warmer: "已要求语气更温和",
    make_shorter: "已要求内容更简洁",
    update_learning_record: "已整理为学习记录",
    update_weakness: "已更新薄弱点素材",
    generate_practice: "已生成针对练习",
    generate_feedback: "已生成微信反馈",
    generate_next_lesson: "已生成下次课建议",
    add_report_material: "已加入月报素材",
    add_monthly_material: "已加入月报素材",
    save_note: "已保存为备注"
  };

  return titleMap[event.action] ?? skillActionLabels[event.action];
}

function getEventDetail(event: SkillRunEvent) {
  if (event.action === "archive" && typeof event.metadata?.profile_update_count === "number") {
    return event.metadata.profile_update_count > 0 ? `已写入 ${event.metadata.profile_update_count} 项学生档案建议` : "仅确认报告入档";
  }

  if (event.event_type === "state_transition") {
    return `${getRunStatusLabel(event.status_before)} → ${getRunStatusLabel(event.status_after)}`;
  }

  return event.message;
}

function getEventTypeLabel(type: SkillRunEventType) {
  if (type === "state_transition") return "状态更新";
  if (type === "follow_up_request") return "后续任务";
  if (type === "material_action") return "材料动作";
  if (type === "note_action") return "备注";
  return "未完成";
}

function getEventTone(type: SkillRunEventType): SkillRunEventTimelineItem["tone"] {
  if (type === "invalid_action") return "red";
  if (type === "material_action") return "orange";
  if (type === "note_action") return "gray";
  return "green";
}

function getRunStatusLabel(status: SkillRunEvent["status_before"]) {
  if (status === "created") return "已创建";
  if (status === "needs_input") return "需补充信息";
  if (status === "generating") return "生成中";
  if (status === "draft_ready") return "待确认";
  if (status === "copied") return "已复制";
  if (status === "sent") return "已发送";
  if (status === "archived") return "已入档";
  return "失败";
}

function formatEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}
