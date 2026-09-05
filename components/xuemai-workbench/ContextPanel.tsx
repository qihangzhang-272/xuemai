import { useEffect, useState } from "react";
import { ChevronRight, PanelRightClose, PanelRightOpen, RotateCcw, Save, UsersRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { skillActionLabels } from "@/src/skills/actions";
import { LearningEvidenceReportPanel } from "./LearningEvidenceReportPanel";
import { LearningMaterialUserResultPanel } from "./LearningMaterialUserResultPanel";
import { getLearningEvidenceReport } from "./learning-evidence-report-view";
import { getStudentLearningMaterialUserFacingResult } from "./learning-material-user-result-view";
import { groupProfileUpdatesByTarget } from "./learning-evidence-profile-updates";
import {
  buildStudentTimelineItems,
  countTimelineItemsByFilter,
  getLatestProfileUpdateValue,
  getMonthlyReportSourcesForConversation,
  getProfileUpdatesForConversation,
  getTimelineRecordsForConversation,
  simplifyProfileLabel,
  studentTimelineFilters,
  type StudentTimelineFilter,
  type StudentTimelineItem
} from "./student-timeline-view";
import { buildSkillRunEventTimeline, type SkillRunEventTimelineItem } from "./skill-run-event-view";
import { getSkillCardVersionMeta, getTaskCardStatusCopy } from "./skill-card-version";
import { allSubjectsLabel, normalizeSubjectText, splitSubjectText } from "./subject-utils";
import type { Conversation, Message, ProfileUpdateRecord, SkillAction, TaskCard, TimelineRecord } from "./types";

type ContextPanelProps = {
  conversation: Conversation;
  members: Conversation[];
  messages: Message[];
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  activeSubject?: string;
  reviewTask?: TaskCard;
  open: boolean;
  onToggle: () => void;
  onSelectStudent: (id: string) => void;
  onCloseReview?: () => void;
  onTaskAction?: (task: TaskCard, action: SkillAction) => void;
  onTaskEdit?: (task: TaskCard, value: string) => void;
  onTaskReset?: (task: TaskCard) => void;
  autoArchiveLearningEvidence?: boolean;
  onAutoArchiveLearningEvidenceChange?: (enabled: boolean) => void;
  onTaskConfirmProfileUpdates?: (task: TaskCard, selectedSuggestionIds: string[]) => void;
};

export function ContextPanel({ conversation, members, messages, taskCards, timelineRecords, activeSubject, reviewTask, open, onToggle, onSelectStudent, onCloseReview, onTaskAction, onTaskEdit, onTaskReset, autoArchiveLearningEvidence, onAutoArchiveLearningEvidenceChange, onTaskConfirmProfileUpdates }: ContextPanelProps) {
  const isLearningEvidenceReview = Boolean(reviewTask && (reviewTask.skillId === "analyze_learning_evidence" || reviewTask.taskType === "learning_evidence_analysis"));
  const reportDetailOpen = Boolean(isLearningEvidenceReview && reviewTask && (getStudentLearningMaterialUserFacingResult(reviewTask) || getLearningEvidenceReport(reviewTask)));

  if (!open) {
    return (
      <aside className="hidden min-h-0 border-l border-[#e3e6e4] bg-[#fbfcfb] xl:flex xl:items-start xl:justify-center xl:pt-4">
        <button type="button" onClick={onToggle} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f5f4] text-[#3d4a3d] transition hover:bg-[#edf8f1]" aria-label="展开上下文">
          <PanelRightOpen size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden min-h-0 border-l border-[#e3e6e4] bg-[#fbfcfb] xl:flex xl:flex-col">
      <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#edf0ee] bg-white/90 px-4">
        <div>
          <p className="text-[11px] font-bold text-[#22c55e]">{reportDetailOpen ? "报告详情" : reviewTask ? "卡片处理" : conversation.kind === "class" ? "班级上下文" : "学生上下文"}</p>
          <h2 className="text-[14px] font-bold text-[#191c1d]">{reportDetailOpen ? "学情报告" : reviewTask ? "结果详情" : conversation.name}</h2>
        </div>
        <div className="flex items-center gap-1">
          {reviewTask ? (
            <button type="button" onClick={onCloseReview} className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b746d] transition hover:bg-[#f3f4f5]" aria-label="关闭详情">
              <X size={16} />
            </button>
          ) : null}
          <button type="button" onClick={onToggle} className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b746d] transition hover:bg-[#f3f4f5]" aria-label="收起上下文">
            <PanelRightClose size={17} />
          </button>
        </div>
      </div>

      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto p-3.5">
        {reviewTask ? (
          <TaskReviewPanel task={reviewTask} autoArchiveLearningEvidence={autoArchiveLearningEvidence} onAction={onTaskAction} onEdit={onTaskEdit} onReset={onTaskReset} onAutoArchiveLearningEvidenceChange={onAutoArchiveLearningEvidenceChange} onConfirmProfileUpdates={onTaskConfirmProfileUpdates} />
        ) : conversation.kind === "class" ? (
          <ClassContext conversation={conversation} members={members} taskCards={taskCards} onSelectStudent={onSelectStudent} />
        ) : (
          <StudentContext conversation={conversation} messages={messages} taskCards={taskCards} timelineRecords={timelineRecords} activeSubject={activeSubject} />
        )}
      </div>
    </aside>
  );
}

export function TaskReviewPanel({ task, autoArchiveLearningEvidence, onAction, onEdit, onReset, onAutoArchiveLearningEvidenceChange, onConfirmProfileUpdates }: { task: TaskCard; autoArchiveLearningEvidence?: boolean; onAction?: (task: TaskCard, action: SkillAction) => void; onEdit?: (task: TaskCard, value: string) => void; onReset?: (task: TaskCard) => void; onAutoArchiveLearningEvidenceChange?: (enabled: boolean) => void; onConfirmProfileUpdates?: (task: TaskCard, selectedSuggestionIds: string[]) => void }) {
  if ((task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis") && getStudentLearningMaterialUserFacingResult(task)) {
    return <LearningMaterialUserResultPanel task={task} onAction={onAction} />;
  }

  if ((task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis") && getLearningEvidenceReport(task)) {
    return <LearningEvidenceReportPanel task={task} autoArchiveEnabled={autoArchiveLearningEvidence} onAction={onAction} onEdit={onEdit} onReset={onReset} onAutoArchivePreferenceChange={onAutoArchiveLearningEvidenceChange} onConfirmProfileUpdates={onConfirmProfileUpdates} />;
  }

  return <GenericTaskReviewPanel task={task} onAction={onAction} onEdit={onEdit} onReset={onReset} />;
}

function GenericTaskReviewPanel({ task, onAction, onEdit, onReset }: { task: TaskCard; onAction?: (task: TaskCard, action: SkillAction) => void; onEdit?: (task: TaskCard, value: string) => void; onReset?: (task: TaskCard) => void }) {
  const version = getSkillCardVersionMeta(task);
  const statusCopy = getTaskCardStatusCopy(task.status, task);
  const reviewText = task.status === "archived" ? version.archivedText ?? version.currentText : version.currentText;
  const [draft, setDraft] = useState(reviewText);

  useEffect(() => {
    setDraft(reviewText);
  }, [reviewText, task.id]);

  const running = task.status === "running";
  const changed = draft.trim() !== reviewText.trim();
  const actions = getReviewActions(task);
  const actionTimeline = buildSkillRunEventTimeline(task.actionEvents, { limit: 6 });

  return (
    <div className="space-y-4">
      <section className="border-b border-[#edeef0] pb-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-[#191c1d]">{getUserFacingTaskTitle(task)}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#6b746d]">{task.inputSummary ?? task.archiveTarget ?? "老师触发的教学任务"}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-bold", getReviewStatusTone(task.status))}>{statusCopy.label}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-[#6b746d]">
          <ReviewMeta label="入档目标" value={task.archiveTarget ?? "待入档"} />
          <ReviewMeta label="编辑状态" value={version.editLabel} />
          <ReviewMeta label="可信度" value={formatConfidence(task.confidenceLevel)} />
          <ReviewMeta label="更新时间" value={formatShortTime(task.updatedAt)} />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#191c1d]">{task.status === "archived" ? "最终入档版" : "当前版本"}</p>
            <p className="mt-0.5 text-[11px] font-medium text-[#8a948d]">{version.field.label} · 保存后不会改写 AI 原稿</p>
          </div>
          {version.isEdited ? <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[11px] font-bold text-[#c2410c]">已编辑</span> : null}
        </div>
        <textarea
          value={draft}
          rows={8}
          disabled={running}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full resize-none rounded-[14px] border border-[#dfe5e1] bg-[#fbfcfb] px-3 py-2.5 text-[13px] font-semibold leading-6 text-[#26312a] outline-none transition focus:border-[#9bd9ad] disabled:bg-[#f3f4f5] disabled:text-[#8a948d]"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" disabled={running || !changed} onClick={() => onEdit?.(task, draft)} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#22c55e] px-3 text-xs font-bold text-white transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:bg-[#c2c8c3]">
            <Save size={14} />
            保存编辑
          </button>
          <button type="button" disabled={running || task.status === "archived" || version.editCount === 0} onClick={() => onReset?.(task)} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#f3f4f5] px-3 text-xs font-bold text-[#3d4a3d] transition hover:bg-[#e7e8e9] disabled:cursor-not-allowed disabled:opacity-40">
            <RotateCcw size={14} />
            重置原稿
          </button>
        </div>
      </section>

      {actions.length ? (
        <section className="border-y border-[#edeef0] py-3">
          <p className="text-xs font-bold text-[#191c1d]">可做操作</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {actions.map((action) => (
              <button key={action} type="button" disabled={running} onClick={() => onAction?.(task, action)} className={cn("inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45", action === "archive" ? "bg-[#22c55e] text-white hover:bg-[#16a34a]" : "bg-[#f3f4f5] text-[#3d4a3d] hover:bg-[#e7e8e9]")}>
                {skillActionLabels[action]}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <ReviewSection title="处理记录">
        <ActionTimeline items={actionTimeline} />
      </ReviewSection>

      <ReviewSection title="AI 原稿">
        <p className="whitespace-pre-wrap text-[13px] font-medium leading-6 text-[#3d4a3d]">{version.originalText || "暂无 AI 原稿。"}</p>
      </ReviewSection>
    </div>
  );
}

function ReviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[#f7f8f7] px-2.5 py-2">
      <p className="text-[10px] font-bold text-[#9aa19d]">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-bold text-[#3d4a3d]">{value}</p>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-bold text-[#191c1d]">{title}</p>
      {children}
    </section>
  );
}

function ActionTimeline({ items }: { items: SkillRunEventTimelineItem[] }) {
  if (!items.length) {
    return <p className="text-[12px] font-medium leading-5 text-[#8a948d]">暂无按钮操作记录。复制、标记发送、加入月报素材等动作会显示在这里。</p>;
  }

  return (
    <ol className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2">
          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", getActionTimelineDot(item.tone))} />
          <div className="min-w-0">
            <p className="text-[12px] font-bold leading-5 text-[#26312a]">{item.title}</p>
            <p className="text-[11px] font-medium leading-4 text-[#8a948d]">{item.meta}</p>
            <p className="mt-0.5 text-[11px] font-medium leading-4 text-[#5c665f]">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function getActionTimelineDot(tone: SkillRunEventTimelineItem["tone"]) {
  if (tone === "red") return "bg-[#ef4444]";
  if (tone === "orange") return "bg-[#f59e0b]";
  if (tone === "gray") return "bg-[#c2c8c3]";
  return "bg-[#22c55e]";
}

function getReviewActions(task: TaskCard): SkillAction[] {
  const actions = task.actions?.length ? task.actions : getFallbackReviewActions(task);
  if (task.status === "archived") {
    return actions.filter((action) => action === "regenerate" || action === "generate_feedback" || action === "generate_next_lesson");
  }
  if (task.status === "running" || task.status === "failed") return actions.filter((action) => action === "regenerate");
  return actions;
}

function getFallbackReviewActions(task: TaskCard): SkillAction[] {
  if (task.taskType === "feedback") return ["copy_feedback", "mark_parent_sent", "archive", "make_warmer", "make_shorter", "regenerate"];
  if (task.taskType === "learning_evidence_analysis") return ["generate_feedback", "generate_next_lesson", "add_monthly_material", "archive"];
  if (task.taskType === "learning_record") return ["archive", "generate_feedback", "generate_next_lesson"];
  return ["archive", "generate_feedback", "regenerate"];
}

function getReviewStatusTone(status: TaskCard["status"]) {
  if (status === "failed") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "archived") return "bg-[#dcfce7] text-[#15803d]";
  if (status === "feedback_done" || status === "copied") return "bg-[#edf8f1] text-[#006e2f]";
  if (status === "running") return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#f3f4f5] text-[#3d4a3d]";
}

function formatConfidence(value: TaskCard["confidenceLevel"]) {
  if (value === "high") return "高";
  if (value === "medium") return "中";
  if (value === "low") return "低";
  return "未标注";
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function getContextSubjectScope(conversation: Conversation, activeSubject?: string) {
  if (conversation.kind !== "student") return normalizeSubjectText(conversation.subject);
  if (activeSubject && activeSubject !== allSubjectsLabel) return activeSubject;
  return normalizeSubjectText(conversation.subject);
}

const subjectFocusTags: Record<string, string[]> = {
  数学: ["条件提取", "应用题建模", "步骤稳定性", "表达完整性"],
  物理: ["单位换算", "受力分析", "物理条件", "过程表达"],
  英语: ["句子结构", "关键词提取", "语法准确性", "表达完整性"],
  语文: ["材料理解", "答题结构", "表达完整性", "概括能力"],
  化学: ["概念辨析", "方程式书写", "实验现象", "条件判断"]
};

const subjectNextActions: Record<string, string> = {
  数学: "题干条件和建模步骤",
  物理: "受力图和单位换算",
  英语: "句子结构和关键词提取",
  语文: "材料概括和答题结构",
  化学: "核心概念和方程式书写"
};

function getSubjectDefaultFocusTags(subject: string) {
  const subjects = getKnownSubjects(subject);
  if (subjects.length) {
    return Array.from(new Set(subjects.flatMap((item) => subjectFocusTags[item]))).slice(0, 4);
  }
  return ["任务理解", "关键信息", "过程完整性", "同类迁移"];
}

function getSubjectDefaultNextAction(subject: string) {
  const subjects = getKnownSubjects(subject);
  if (subjects.length > 1) {
    const parts = subjects.slice(0, 3).map((item) => `${item}先看${subjectNextActions[item]}`);
    return `下次课建议按科目拆开复盘：${parts.join("，")}，再用同类题检查迁移。`;
  }
  if (subjects.length === 1) return `下次课建议先复盘${subjectNextActions[subjects[0]]}，再做同类变式训练。`;
  return "下次课建议先复盘任务要求和关键证据，再做同类材料迁移。";
}

function getEvidenceDrivenFocusTags(conversation: Conversation, messages: Message[], taskCards: TaskCard[], timelineRecords: TimelineRecord[], subjectScope: string) {
  const text = collectStudentEvidenceText(conversation, messages, taskCards, timelineRecords);
  const tags: string[] = [];
  const add = (label: string) => {
    if (!tags.includes(label)) tags.push(label);
  };

  if (/几何|证明/u.test(text)) add("几何证明思路");
  if (/(几何|证明).*(依据|理由|跳过理由)|(依据|理由|跳过理由).*(几何|证明)/u.test(text)) add("证明依据完整性");
  if (/平行线|全等/u.test(text)) add("平行线与全等衔接");
  if (/条件提取|题干|限制条件|二次核对/u.test(text)) add("题干条件核对");
  if (/步骤|过程|表达完整/u.test(text)) add("步骤表达完整性");
  if (/受力|摩擦力/u.test(text)) add("受力分析");
  if (/单位换算|单位/u.test(text)) add("单位换算");
  if (/函数|图像/u.test(text)) add("函数图像理解");

  return tags.length ? tags.slice(0, 4) : getSubjectDefaultFocusTags(subjectScope);
}

function getEvidenceDrivenNextAction(focusTags: string[], subjectScope: string) {
  if (focusTags.some((item) => item.includes("几何") || item.includes("证明"))) {
    return "下次课建议先让学生口述证明思路，再逐步补齐每一步理由，重点检查平行线性质和全等条件之间的衔接。";
  }
  if (focusTags.some((item) => item.includes("受力") || item.includes("单位"))) {
    return "下次课建议先重画条件图或受力图，再逐项核对单位和公式代入过程。";
  }
  if (focusTags.some((item) => item.includes("题干") || item.includes("条件"))) {
    return "下次课建议先训练审题标注和条件二次核对，再做同类变式题检查迁移。";
  }
  return getSubjectDefaultNextAction(subjectScope);
}

function collectStudentEvidenceText(conversation: Conversation, messages: Message[], taskCards: TaskCard[], timelineRecords: TimelineRecord[]) {
  const pieces = [
    conversation.summary,
    ...messages.filter((message) => message.conversationId === conversation.id).map((message) => message.content ?? ""),
    ...taskCards
      .filter((task) => task.conversationId === conversation.id)
      .flatMap((task) => [task.inputSummary, task.summary, task.feedbackText, task.detail, task.currentOutput?.display_content, task.archivedOutput?.display_content]),
    ...timelineRecords.map((record) => record.summary),
    ...timelineRecords.flatMap((record) => record.profileUpdates?.flatMap((update) => [update.label, update.value, update.evidence]) ?? [])
  ];
  return pieces.filter(Boolean).join("\n");
}

function getKnownSubjects(subject: string) {
  const normalized = normalizeSubjectText(subject);
  const exact = splitSubjectText(normalized).filter((item) => item in subjectFocusTags);
  if (exact.length) return Array.from(new Set(exact));
  return Object.keys(subjectFocusTags).filter((item) => normalized.includes(item));
}

function getDisplayStatusLabel(statusLabel: string) {
  if (statusLabel === "课后需反馈") return "待反馈";
  if (statusLabel === "已反馈家长") return "已反馈";
  if (statusLabel === "待标记反馈" || statusLabel === "任务分析完成") return "待入档";
  return statusLabel;
}

function getStudentContextSummary(conversation: Conversation, subjectScope: string) {
  const summary = conversation.summary.trim();
  if (!summary) return `暂无新的${subjectScope}记录，等待老师补充。`;
  if (summary === "任务分析完成") {
    if (conversation.statusLabel === "待反馈") return `${subjectScope}家长反馈待发送，建议先核对表达是否温和、具体。`;
    if (conversation.statusLabel === "已反馈") return `${subjectScope}反馈已处理，可继续观察本周同类问题是否复发。`;
    if (conversation.statusLabel === "已入档") return `${subjectScope}学习记录已入档，可作为下次备课和月报依据。`;
    return `${subjectScope}学习记录待入档，确认后可作为后续反馈和月报依据。`;
  }
  return summary;
}

function StudentContext({ conversation, messages, taskCards, timelineRecords, activeSubject }: { conversation: Conversation; messages: Message[]; taskCards: TaskCard[]; timelineRecords: TimelineRecord[]; activeSubject?: string }) {
  const [timelineFilter, setTimelineFilter] = useState<StudentTimelineFilter>("all");
  const subjectScope = getContextSubjectScope(conversation, activeSubject);
  const conversationTimelineRecords = getTimelineRecordsForConversation(timelineRecords, conversation.id);
  const timelineItems = buildStudentTimelineItems(conversationTimelineRecords, timelineFilter);
  const timelineCounts = countTimelineItemsByFilter(conversationTimelineRecords);
  const pendingTasks = getPendingContextTasks(taskCards, conversationTimelineRecords, conversation.id).slice(-3);
  const hasUploadedMaterial = messages.some((message) => message.conversationId === conversation.id && message.type === "image");
  const archivedCount = conversationTimelineRecords.length;
  const profileUpdates = getProfileUpdatesForConversation(timelineRecords, conversation.id);
  const groupedProfileUpdates = groupProfileUpdatesByTarget(profileUpdates);
  const monthlySources = getMonthlyReportSourcesForConversation(timelineRecords, conversation.id);
  const evidenceFocusTags = getEvidenceDrivenFocusTags(conversation, messages, taskCards, conversationTimelineRecords, subjectScope);
  const nextAction = getLatestProfileUpdateValue(groupedProfileUpdates.action_plan) ?? getEvidenceDrivenNextAction(evidenceFocusTags, subjectScope);
  const focusTags = profileUpdates.length
    ? [...groupedProfileUpdates.weakness_event, ...groupedProfileUpdates.ability_profile].map((item) => simplifyProfileLabel(item.label)).slice(0, 4)
    : evidenceFocusTags;
  const contextSummary = getStudentContextSummary(conversation, subjectScope);
  const rawDisplayStatusLabel = getDisplayStatusLabel(conversation.statusLabel);
  const displayStatusLabel = pendingTasks.length || archivedCount ? rawDisplayStatusLabel : "待补充";

  return (
    <div className="space-y-3">
      <section className="rounded-[16px] bg-white px-3 py-3 shadow-[0_5px_16px_rgba(15,23,42,0.035)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-[#191c1d]">{conversation.name}</h3>
            <p className="mt-1 text-xs font-semibold text-[#6b746d]">
              {conversation.grade} · {subjectScope} · {conversation.className}
            </p>
          </div>
          <StatusPill tone={conversation.attention ? "red" : "green"}>{displayStatusLabel}</StatusPill>
        </div>
        <p className="mt-3 text-[12px] font-medium leading-5 text-[#4e5c52]">{contextSummary}</p>
      </section>

      <TeacherSection title="现在要处理">
        {pendingTasks.length ? (
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <TaskLine key={task.id} title={getUserFacingTaskTitle(task)} meta={getTaskNextStep(task)} />
            ))}
          </div>
        ) : (
          <EmptyLine>暂无待入档或待反馈卡片，可以继续记录课堂表现或上传学习材料。</EmptyLine>
        )}
      </TeacherSection>

      <TeacherSection title="本次可用资料">
        <SignalLine label="已入档记录" value={archivedCount ? `${archivedCount} 条，可用于反馈和月报` : "暂无，需要先确认学习记录"} tone={archivedCount ? "green" : "muted"} />
        <SignalLine label="学习材料" value={hasUploadedMaterial ? "已上传，可做试卷/作业分析" : "未上传，可直接拖入图片"} tone={hasUploadedMaterial ? "green" : "muted"} />
        <SignalLine label="家长沟通" value="反馈建议保持温和，不制造焦虑" tone="green" />
      </TeacherSection>

      <TeacherSection title="教学关注点">
        <TagRow items={focusTags} />
        <p className="mt-2 text-[12px] font-medium leading-5 text-[#6b746d]">{nextAction}</p>
      </TeacherSection>

      <TeacherSection title="学生档案更新">
        {profileUpdates.length ? (
          <div className="space-y-1">
            <SignalLine label="能力画像" value={getLatestProfileUpdateValue(groupedProfileUpdates.ability_profile) ?? "暂无新画像更新"} tone={groupedProfileUpdates.ability_profile.length ? "green" : "muted"} />
            <SignalLine label="薄弱点" value={getLatestProfileUpdateValue(groupedProfileUpdates.weakness_event) ?? "暂无新薄弱点"} tone={groupedProfileUpdates.weakness_event.length ? "red" : "muted"} />
            <SignalLine label="复发风险" value={getLatestProfileUpdateValue(groupedProfileUpdates.recurrence_risk) ?? "暂无新风险"} tone={groupedProfileUpdates.recurrence_risk.length ? "red" : "muted"} />
            <SignalLine label="月报素材" value={groupedProfileUpdates.monthly_report_source.length ? `${groupedProfileUpdates.monthly_report_source.length} 条已加入素材池` : "暂无新素材"} tone={groupedProfileUpdates.monthly_report_source.length ? "green" : "muted"} />
          </div>
        ) : (
          <EmptyLine>完整报告确认后，老师勾选的能力画像、薄弱点和月报素材会出现在这里。</EmptyLine>
        )}
      </TeacherSection>

      <TeacherSection title="月报素材池">
        {monthlySources.length ? <MonthlySourceList items={monthlySources} /> : <EmptyLine>确认分析报告时勾选“月报素材”，这里会沉淀为月报可复用依据。</EmptyLine>}
      </TeacherSection>

      <TeacherSection title="最近入档">
        <StudentTimelineFilterBar value={timelineFilter} counts={timelineCounts} onChange={setTimelineFilter} />
        <StudentTimelineList items={timelineItems} fallback={buildRecentRecords(messages, taskCards, conversationTimelineRecords)} />
      </TeacherSection>
    </div>
  );
}

function getPendingContextTasks(taskCards: TaskCard[], timelineRecords: TimelineRecord[], conversationId: string) {
  const archivedTaskIds = new Set(timelineRecords.map((record) => record.sourceTaskId));
  const archivedTaskSignatures = new Set(
    taskCards
      .filter((task) => archivedTaskIds.has(task.id))
      .map(getTaskDeduplicationSignature)
      .filter(Boolean)
  );

  return taskCards.filter((task) => {
    if (task.conversationId !== conversationId) return false;
    if (task.status !== "completed" && task.status !== "copied" && task.status !== "feedback_done") return false;
    if (archivedTaskIds.has(task.id)) return false;

    const signature = getTaskDeduplicationSignature(task);
    if (signature && archivedTaskSignatures.has(signature)) return false;
    return true;
  });
}

function getTaskDeduplicationSignature(task: TaskCard) {
  const inputSummary = task.inputSummary?.trim();
  if (!inputSummary) return "";
  return [task.skillId ?? task.taskType, task.conversationId, inputSummary].join("::");
}

function ClassContext({ conversation, members, taskCards, onSelectStudent }: { conversation: Conversation; members: Conversation[]; taskCards: TaskCard[]; onSelectStudent: (id: string) => void }) {
  const classTaskCards = taskCards.filter((task) => task.conversationId === conversation.id);
  const pendingCount = classTaskCards.filter((task) => task.status === "completed" || task.status === "copied").length;
  const attentionStudents = getClassAttentionStudents(members, taskCards);

  return (
    <div className="space-y-3">
      <section className="rounded-[16px] bg-white px-3 py-3 shadow-[0_5px_16px_rgba(15,23,42,0.035)]">
        <div className="flex items-start gap-2">
          <UsersRound className="mt-0.5 text-[#22c55e]" size={17} />
          <div>
            <h3 className="text-[15px] font-bold text-[#191c1d]">{conversation.name}</h3>
            <p className="mt-1 text-xs font-semibold text-[#6b746d]">
              {normalizeSubjectText(conversation.subject)} · {conversation.members ?? members.length} 名学生
            </p>
          </div>
        </div>
      </section>

      <TeacherSection title="班课待处理">
        <SignalLine label="当前任务" value={pendingCount ? `${pendingCount} 条班级记录待处理` : "暂无班级待处理记录"} tone={pendingCount ? "red" : "green"} />
        <SignalLine label="班级月报" value="面向老师复盘班课节奏、共性薄弱点和下月分层安排" tone="muted" />
      </TeacherSection>

      <TeacherSection title="共性薄弱点">
        <TagRow items={["函数图像理解", "应用题建模", "证明步骤完整性"]} />
      </TeacherSection>

      <TeacherSection title="需要关注学生">
        <div className="space-y-1.5">
          {attentionStudents.length ? attentionStudents.map(({ student, reason }) => (
            <button key={student.id} type="button" onClick={() => onSelectStudent(student.id)} className="flex w-full items-center justify-between rounded-[10px] bg-[#f7f8f7] px-2.5 py-2 text-left transition hover:bg-[#edf8f1]">
              <span>
                <strong className="block text-xs text-[#191c1d]">{student.name}</strong>
                <span className="block text-[11px] text-[#3d4a3d]">{reason}</span>
              </span>
              <ChevronRight size={15} />
            </button>
          )) : <EmptyLine>暂无需要特别跟进的学生。</EmptyLine>}
        </div>
      </TeacherSection>

      <TeacherSection title="最近班课记录">
        <CompactTimeline items={["本周函数应用题讲评", "错题共性整理", "下周单元测验提醒"]} />
      </TeacherSection>
    </div>
  );
}

function getClassAttentionStudents(members: Conversation[], taskCards: TaskCard[]) {
  return members
    .map((student) => {
      const mentionedTask = taskCards.find((task) => getTaskSearchText(task).includes(student.name));
      if (mentionedTask) {
        return {
          student,
          reason: mentionedTask.taskType === "monthly_report" ? "月报提到，需要安排跟进" : "近期任务中被点名"
        };
      }

      if (student.attention) {
        return {
          student,
          reason: student.statusLabel || "需要关注"
        };
      }

      return null;
    })
    .filter((item): item is { student: Conversation; reason: string } => Boolean(item));
}

function getTaskSearchText(task: TaskCard) {
  return [
    task.title,
    task.targetName,
    task.inputSummary,
    task.summary,
    task.feedbackText,
    task.detail,
    task.currentOutput?.display_content,
    task.archivedOutput?.display_content,
    task.originalOutput?.display_content
  ]
    .filter(Boolean)
    .join("\n");
}

function TeacherSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] bg-white px-3 py-3 shadow-[0_5px_16px_rgba(15,23,42,0.028)]">
      <h3 className="text-[12px] font-bold text-[#191c1d]">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function SignalLine({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "muted" }) {
  return (
    <div className="flex gap-2 py-1">
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone === "green" ? "bg-[#22c55e]" : tone === "red" ? "bg-[#ef4444]" : "bg-[#c2c8c3]")} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[#191c1d]">{label}</p>
        <p className="mt-0.5 text-[12px] font-medium leading-5 text-[#5c665f]">{value}</p>
      </div>
    </div>
  );
}

function TaskLine({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-[10px] bg-[#f7f8f7] px-2.5 py-2">
      <p className="truncate text-xs font-bold text-[#191c1d]">{title}</p>
      <p className="mt-0.5 text-[11px] font-medium text-[#6b746d]">{meta}</p>
    </div>
  );
}

function getUserFacingTaskTitle(task: TaskCard) {
  if (task.skillId === "generate_feedback" || task.skillId === "parent_communication" || task.taskType === "feedback") return "微信反馈";
  if (task.skillId === "update_learning_record" || task.taskType === "learning_record") return "学习记录";
  if (task.skillId === "analyze_learning_evidence" || task.taskType === "learning_evidence_analysis") return "学情报告";
  if (task.skillId === "monthly_report" || task.taskType === "monthly_report") return task.structuredResult?.audience === "teacher" ? "班级月报" : "学生月报";
  return task.title.replace(/^生成/u, "");
}

function CompactTimeline({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.slice(0, 3).map((item, index) => (
        <li key={`${index}-${item}`} className="border-l-2 border-[#d9eadf] pl-2 text-[12px] font-medium leading-5 text-[#4e5c52]">
          {shortenRecord(item)}
        </li>
      ))}
    </ul>
  );
}

function StudentTimelineFilterBar({ value, counts, onChange }: { value: StudentTimelineFilter; counts: Record<StudentTimelineFilter, number>; onChange: (value: StudentTimelineFilter) => void }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {studentTimelineFilters.map((filter) => (
          <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn("rounded-full px-2 py-1 text-[11px] font-bold transition", value === filter.id ? "bg-[#191c1d] text-white" : "bg-[#f3f5f4] text-[#5c665f] hover:bg-[#e7ece8]")}
        >
          {filter.label}
          {counts[filter.id] ? <span className={cn("ml-1", value === filter.id ? "text-[#d7ffdf]" : "text-[#8a948d]")}>{counts[filter.id]}</span> : null}
        </button>
      ))}
    </div>
  );
}

function StudentTimelineList({ items, fallback }: { items: StudentTimelineItem[]; fallback: string[] }) {
  if (!items.length && fallback.length) {
    return <CompactTimeline items={fallback} />;
  }

  if (!items.length) {
    return <EmptyLine>当前筛选下还没有入档记录。</EmptyLine>;
  }

  return (
    <ol className="space-y-2">
      {items.slice(-4).reverse().map((item) => (
        <li key={item.id} className="flex gap-2 rounded-[10px] bg-[#f7f8f7] px-2.5 py-2">
          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.tone === "orange" ? "bg-[#f59e0b]" : item.tone === "gray" ? "bg-[#c2c8c3]" : "bg-[#22c55e]")} />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold text-[#191c1d]">{item.title}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#8a948d]">{shortenRecord(item.meta)}</p>
            <p className="mt-1 text-[12px] font-medium leading-5 text-[#4e5c52]">{shortenRecord(item.summary)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MonthlySourceList({ items }: { items: ProfileUpdateRecord[] }) {
  return (
    <div className="space-y-2">
      {items.slice(-3).reverse().map((item) => (
        <div key={item.id} className="rounded-[10px] bg-[#fff9f0] px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[12px] font-bold text-[#191c1d]">{simplifyProfileLabel(item.label)}</p>
            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">月报</span>
          </div>
          <p className="mt-1 text-[12px] font-medium leading-5 text-[#4e5c52]">{item.value}</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[#8a948d]">依据：{shortenRecord(item.evidence)}</p>
        </div>
      ))}
    </div>
  );
}

function TagRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-[#f3f5f4] px-2 py-1 text-[11px] font-bold text-[#3d4a3d]">
          {item}
        </span>
      ))}
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "green" | "red"; children: React.ReactNode }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", tone === "green" ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]")}>
      {children}
    </span>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[10px] bg-[#f7f8f7] px-2.5 py-2 text-[12px] font-medium leading-5 text-[#6b746d]">
      {children}
    </p>
  );
}

function getTaskNextStep(task: TaskCard) {
  if (task.status === "completed") return task.taskType === "feedback" ? "待反馈，发给家长后标记已发给家长。" : "待入档，确认后可沉淀到学生档案。";
  if (task.status === "copied") return "已复制，发给家长后可标记已发给家长。";
  if (task.status === "feedback_done") return "已反馈，可确认入档。";
  return "等待处理";
}

function shortenRecord(text: string) {
  const normalized = text.replace(/^学生档案\s*>\s*/u, "").replace(/^班级档案\s*>\s*/u, "");
  return normalized.length > 68 ? `${normalized.slice(0, 68)}...` : normalized;
}

function buildRecentRecords(messages: Message[], taskCards: TaskCard[], timelineRecords: TimelineRecord[]) {
  if (timelineRecords.length) {
    return timelineRecords
      .slice(-3)
      .map((record) => `${record.archiveTarget}：${record.summary}`)
      .filter(Boolean);
  }

  const taskById = new Map(taskCards.map((task) => [task.id, task]));
  return messages
    .slice(-8)
    .map((message) => {
      const task = message.taskCardId ? taskById.get(message.taskCardId) : undefined;
      if (message.type === "archive") return message.content ?? "已入档";
      if (task) return task.summary ?? task.title;
      if (message.type === "image") return message.content ?? `${message.attachments?.length ?? 1} 张学习材料图片`;
      return message.content ?? "";
    })
    .filter(Boolean)
    .slice(-3);
}
