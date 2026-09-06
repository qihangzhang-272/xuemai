import { cardSummary } from "@/lib/xuemai/record-content";
import { cn } from "@/lib/utils";
import { getSkillById } from "@/src/skills/registry";
import type { SkillActionId } from "@/src/skills/types";
import { Archive, CheckCircle2, Copy, PencilLine, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { defaultSkillCardDisclosureState, getSkillCardActionPriority, getSkillCardVersionMeta, getTaskActionLabel, getTaskCardStatusCopy, isPrimarySkillCardAction } from "./skill-card-version";
import { crossSubjectLabel, normalizeSubjectText } from "./subject-utils";
import { TeachingContent } from "./TeachingContent";
import { formatChatTimestamp, formatFullTimestamp } from "./time-format";
import type { Conversation, SkillAction, TaskCard } from "./types";

type SkillCardProps = {
  task: TaskCard;
  conversation: Conversation;
  onAction: (task: TaskCard, action: SkillAction) => void;
  onEdit?: (task: TaskCard, value: string) => void | Promise<boolean>;
  onReview?: (task: TaskCard) => void;
};

export function SkillCard({ task, conversation, onAction, onEdit, onReview }: SkillCardProps) {
  const running = task.status === "running";
  const meta = getSkillMeta(task);
  const version = getSkillCardVersionMeta(task);
  const statusCopy = getTaskCardStatusCopy(task.status, task);
  if (task.taskType === "monthly_report" && task.structuredResult?.recordKind === "monthly" && !running && task.status !== "failed") statusCopy.label = task.structuredResult.reportStatus === "final" ? "已定稿" : task.structuredResult.reportStatus === "corrected" ? "已更正" : "月报草稿";
  const fieldValue = normalizeVisibleCardText(version.field.value);
  const preview = normalizeVisibleCardText((task.status === "archived" ? version.archivedText : version.currentText) || getPreview(task));
  const titleText = getSkillCardTitle(conversation, task, meta.title);
  const subjectLabel = getVisibleTaskSubject(task, conversation);
  const reviewLabel = task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis" ? "查看详细报告" : task.skillId === "monthly_report" || task.taskType === "monthly_report" ? "查看报告" : "查看完整内容";
  const timeLabel = formatChatTimestamp(task.createdAt);
  const fullTimeLabel = formatFullTimestamp(task.createdAt);
  const actions = getActions(task)
    .map((action) => normalizeChatCardAction(task, action))
    .filter((action) => shouldShowActionInChatCard(action.value))
    .filter((action) => shouldShowActionForStatus(task, action.value));
  const sortedActions = actions.sort((left, right) => getSkillCardActionPriority(task, left.value) - getSkillCardActionPriority(task, right.value));
  const primaryActions = sortedActions.slice(0, 1);
  const moreActions = sortedActions.slice(1);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(fieldValue);
  const [showEditor, setShowEditor] = useState<boolean>(defaultSkillCardDisclosureState.showEditor);

  useEffect(() => {
    setDraft(fieldValue);
  }, [fieldValue]);

  const canEdit = !running && task.status !== "archived" && task.structuredResult?.locked !== true;
  const hasDraftChange = draft.trim() !== fieldValue.trim();

  async function handleEditorToggle() {
    if (!showEditor) {
      setShowEditor(true);
      return;
    }
    if (canEdit && hasDraftChange) {
      setSaving(true);
      try { if (await onEdit?.(task, draft) === false) return; }
      finally { setSaving(false); }
    }
    setShowEditor(false);
  }

  return (
    <article
      className={cn(
        "w-full rounded-[18px] bg-white p-3 transition-colors",
        running ? "max-w-[420px]" : "max-w-[520px]"
      )}
    >
      <div className="flex items-center gap-2 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-sm font-bold tracking-tight text-[#191c1d]">{titleText}</h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#6b746d]">
            {subjectLabel ? <span className="shrink-0 rounded-full bg-[#edf8f1] px-1.5 py-0.5 text-[10px] font-black text-[#14883b]">{subjectLabel}</span> : null}
            <time className="shrink-0" dateTime={task.createdAt} title={fullTimeLabel}>{timeLabel}</time>
          </div>
        </div>
        <button type="button" onClick={() => onReview?.(task)} className="shrink-0 rounded-full bg-[#f3f5f4] px-2.5 py-1 text-[11px] font-bold text-[#3d4a3d] transition hover:bg-[#e7ece8]">
          {reviewLabel}
        </button>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", getStatusTone(task.status))}>{statusCopy.label}</span>
      </div>

      {running ? (
        <div className="mt-3 space-y-2">
          {task.steps.map((step) => (
            <div key={step.label} className={cn("flex items-center gap-2.5 text-[13px] font-semibold", step.status === "waiting" ? "text-[#c2c8c3]" : "text-[#3d4a3d]")}>
              {step.status === "completed" ? <CheckCircle2 className="text-[#22c55e]" size={16} /> : step.status === "running" ? <Sparkles className="text-[#22c55e]" size={16} /> : <span className="h-4 w-4 rounded-full border border-[#c2c8c3]" />}
              {step.label}
            </div>
          ))}
        </div>
      ) : (
        <>
          {showEditor ? (
            <textarea
              value={draft}
              rows={3}
              aria-label="编辑结果正文"
              disabled={!canEdit || saving}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-2.5 min-h-[160px] w-full resize-y rounded-[12px] border border-[#caead6] bg-[#fbfffd] px-3 py-2.5 text-[13px] font-semibold leading-5 text-[#26312a] outline-none transition focus:border-[#9bd9ad] disabled:bg-[#f3f4f5] disabled:text-[#6b746d]"
            />
          ) : (
            <TeachingContent text={cardSummary(preview)} className="mt-2.5 text-[13px] font-medium leading-6 text-[#3d4a3d]" />
          )}
          {task.status === "failed" ? <p className="mt-1 text-[12px] font-semibold leading-5 text-[#b91c1c]">这次未能完成，原始材料已保留。请点击重新生成。</p> : null}
          {version.isEdited ? <p className="mt-1 text-[11px] font-semibold text-[#c2410c]">{version.editLabel}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {primaryActions.map((action) => (
              <button
                key={action.value}
                type="button"
                disabled={showEditor || saving}
                onClick={() => onAction(task, action.value)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-[12px] font-bold transition disabled:opacity-40",
                  action.primary
                    ? "bg-[#22c55e] text-white shadow-[0_8px_18px_rgba(34,197,94,0.16)] hover:bg-[#16a34a]"
                    : action.soft
                      ? "bg-[#dcfce7] text-[#22c55e] hover:bg-[#caead6]"
                      : "border border-[#bccbb9] bg-white text-[#3d4a3d] hover:bg-[#f3f4f5]"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            {canEdit ? <button type="button" disabled={saving} onClick={handleEditorToggle} className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-bold transition", showEditor && hasDraftChange ? "border-[#22c55e] bg-[#22c55e] text-white hover:bg-[#16a34a]" : "border-[#bccbb9] bg-white text-[#3d4a3d] hover:bg-[#f3f4f5]")}>
              <PencilLine size={13} />
              {saving ? "正在保存…" : showEditor ? (hasDraftChange ? "保存编辑" : "收起编辑") : "修改正文"}
            </button> : null}
            {moreActions.length ? <details className="basis-full text-[12px] text-[#5c665f]">
              <summary className="w-fit cursor-pointer py-2 font-semibold">更多操作</summary>
              <div className="flex flex-wrap gap-2 pb-1">{moreActions.map(action => <button key={action.value} type="button" disabled={hasDraftChange || saving} onClick={() => onAction(task, action.value)} className="rounded-full border border-[#bccbb9] bg-white px-3 py-2 font-semibold disabled:opacity-40">{action.label}</button>)}</div>
            </details> : null}
          </div>
        </>
      )}
    </article>
  );
}

function getSkillCardTitle(conversation: Conversation, task: TaskCard, skillTitle: string) {
  if (conversation.kind === "student") return skillTitle;
  const targetName = task.targetName || conversation.name;
  return targetName ? `${targetName} · ${skillTitle}` : skillTitle;
}

function getVisibleTaskSubject(task: TaskCard, conversation: Conversation) {
  if (!task.subject) return "";
  if (task.subject === crossSubjectLabel) return normalizeSubjectText(conversation.subject, task.subject);
  return normalizeSubjectText(task.subject);
}

function getSkillMeta(task: TaskCard) {
  if (task.taskType === "monthly_report" && task.structuredResult?.recordKind === "monthly") return { title: "学生月报", nextActions: [] };
  if (task.structuredResult?.recordKind === "daily") return { title: "学生日报", nextActions: [] };
  if (task.taskType === "learning_record") return { title: "课堂记录", nextActions: [] };
  const skill = task.skillId ? getSkillById(task.skillId) : undefined;

  if (skill) {
    const title = task.skillId === "generate_feedback" || task.skillId === "parent_communication" || task.taskType === "feedback" ? "微信反馈" : skill.label;
    return {
      title: task.skillId === "monthly_report" && task.structuredResult?.audience === "teacher" ? "班级月报" : title,
      nextActions: skill.nextSuggestions.map((nextSkillId) => getSkillById(nextSkillId)?.label ?? nextSkillId)
    };
  }

  if (task.taskType === "feedback") {
    return {
      title: "微信反馈",
      nextActions: ["老师确认", "复制发送", "入档为长期记录"]
    };
  }
  if (task.taskType === "learning_evidence_analysis") {
    return {
      title: "学习材料分析",
      nextActions: ["生成微信反馈", "生成下次课建议", "确认入档"]
    };
  }
  if (task.taskType === "monthly_report") {
    return {
      title: "月报",
      nextActions: ["补充证据", "月底汇总", "确认入档"]
    };
  }
  if (task.taskType === "batch_feedback") {
    return {
      title: "批量反馈",
      nextActions: ["分组检查", "逐条确认", "标记已发给家长"]
    };
  }
  return {
    title: "下次课建议",
    nextActions: ["转为备课点", "加入学生记录", "生成练习"]
  };
}

function getStatusTone(status: TaskCard["status"]) {
  if (status === "failed") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "archived") return "bg-[#dcfce7] text-[#15803d]";
  if (status === "feedback_done" || status === "copied") return "bg-[#edf8f1] text-[#006e2f]";
  return "bg-[#f3f4f5] text-[#3d4a3d]";
}

function getPreview(task: TaskCard) {
  return task.summary ?? task.feedbackText ?? task.detail ?? "正在整理，请稍候。";
}

function getActions(task: TaskCard): Array<{ label: string; value: SkillAction; primary?: boolean; soft?: boolean; icon?: React.ReactNode }> {
  if (task.actions) {
    return task.actions.map((action) => ({
      label: getTaskActionLabel(task, action),
      value: action,
      primary: isPrimarySkillCardAction(task, action),
      soft: action === "make_warmer" || action === "make_shorter" || action === "generate_practice" || action === "update_weakness" || action === "update_learning_record" || action === "generate_next_lesson" || action === "add_monthly_material",
      icon: getIconForAction(action)
    }));
  }

  if (task.taskType === "feedback") {
    return [
      { label: "复制微信反馈", value: "copy_feedback", primary: true, icon: <Copy size={13} /> },
      { label: "改温和一点", value: "make_warmer", soft: true },
      { label: "改简洁一点", value: "make_shorter", soft: true },
      { label: "标记已发给家长", value: "mark_parent_sent", primary: true },
      { label: "加入学生档案", value: "archive", icon: <Archive size={13} /> },
      { label: "重新生成", value: "regenerate", icon: <RotateCcw size={13} /> }
    ];
  }

  if (task.taskType === "learning_evidence_analysis") {
    return [
      { label: "复制微信反馈", value: "copy_feedback", primary: true, icon: <Copy size={13} /> },
      { label: "生成下次课建议", value: "generate_next_lesson", soft: true },
      { label: "确认入档", value: "archive", icon: <Archive size={13} /> }
    ];
  }

  return [
    { label: "确认入档", value: "archive", primary: true, icon: <Archive size={13} /> },
    { label: "生成微信反馈", value: "generate_feedback", soft: true },
    { label: "重新生成", value: "regenerate", icon: <RotateCcw size={13} /> }
  ];
}

function normalizeChatCardAction(task: TaskCard, action: { label: string; value: SkillAction; primary?: boolean; soft?: boolean; icon?: React.ReactNode }) {
  if ((task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis") && action.value === "archive") {
    return {
      ...action,
      label: "加入学生档案"
    };
  }

  return action;
}

function shouldShowActionInChatCard(action: SkillAction) {
  return action !== "add_monthly_material" && action !== "add_report_material";
}

function shouldShowActionForStatus(task: TaskCard, action: SkillAction) {
  const feedbackTask = task.skillId === "generate_feedback" || task.skillId === "parent_communication" || task.taskType === "feedback";
  if (feedbackTask && task.status === "feedback_done") return action !== "mark_parent_sent";
  return true;
}

function getIconForAction(action: SkillActionId) {
  if (action === "copy_feedback") return <Copy size={13} />;
  if (action === "archive") return <Archive size={13} />;
  if (action === "regenerate") return <RotateCcw size={13} />;
  return undefined;
}

function normalizeVisibleCardText(value: string) {
  return value
    .replaceAll("SkillCard", "AI 结果卡")
    .replaceAll("Skill 工作流", "AI 教学任务")
    .replaceAll("Skill", "教学任务");
}
