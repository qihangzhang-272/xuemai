import type React from "react";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, BarChart3, Bot, CheckCircle2, Copy, Database, FileText, Mic, Pencil, PlusCircle, SendHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, ProfileUpdateRecord, ProfileUpdateTarget, TaskCard, TimelineRecord } from "./types";
import { allSubjectsLabel, getSelectedSubjectTrack, getSubjectTracks } from "./subject-utils";

type StudentDetailModalProps = {
  student: Conversation;
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  onClose: () => void;
  onOpenTask?: (taskId: string) => void;
  onEditProfile?: (student: Conversation) => void;
  activeSubject?: string;
  onSubjectChange?: (subject: string) => void;
};

type StudentProfileWorkspaceProps = {
  student: Conversation;
  taskCards: TaskCard[];
  timelineRecords: TimelineRecord[];
  onClose?: () => void;
  onOpenTask?: (taskId: string) => void;
  onEditProfile?: (student: Conversation) => void;
  activeSubject?: string;
  onSubjectChange?: (subject: string) => void;
};

type TimelineFilter = "全部" | "反馈" | "错题" | "报告" | "更新";
type TagTone = "green" | "red" | "blue" | "amber" | "gray";

type AiProfileTag = {
  id: string;
  label: string;
  source: string;
  tone: TagTone;
};

export function StudentDetailModal(props: StudentDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/24 p-4">
      <section className="relative flex h-[min(900px,calc(100vh-32px))] w-full max-w-[560px] overflow-hidden rounded-[26px] bg-[#f7f8f7] shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <StudentProfileWorkspace {...props} />
      </section>
    </div>
  );
}

export function StudentProfileWorkspace({ student, taskCards, timelineRecords, onClose, onOpenTask, onEditProfile, activeSubject, onSubjectChange }: StudentProfileWorkspaceProps) {
  const [filter, setFilter] = useState<TimelineFilter>("全部");
  const subjectTracks = useMemo(() => getSubjectTracks(student), [student]);
  const selectedSubject = getSelectedSubjectTrack(student, activeSubject);
  const subjectScope = selectedSubject === allSubjectsLabel ? "全部科目" : selectedSubject;
  const profileSubjectLabel = subjectTracks.filter((subject) => subject !== allSubjectsLabel).join("、") || student.subject;
  const studentTasks = useMemo(
    () => taskCards.filter((task) => task.conversationId === student.id && (selectedSubject === allSubjectsLabel || !task.subject || task.subject === selectedSubject || task.subject === "综合")),
    [selectedSubject, student.id, taskCards]
  );
  const studentRecords = useMemo(() => timelineRecords.filter((record) => record.conversationId === student.id), [student.id, timelineRecords]);
  const classMentions = useMemo(() => buildClassMentionHints(student, taskCards), [student, taskCards]);
  const timelineItems = useMemo(() => buildTimelineItems(studentTasks, studentRecords), [studentTasks, studentRecords]);
  const aiTags = useMemo(() => buildAiProfileTags(student, studentTasks, studentRecords, subjectScope), [student, studentTasks, studentRecords, subjectScope]);
  const filteredTimelineItems = filter === "全部" ? timelineItems : timelineItems.filter((item) => item.type === filter);
  const latestSummary = getLatestTeachingSummary(studentTasks, studentRecords);
  const learningStatus = getStudentLearningStatus(student, studentTasks, studentRecords);
  const teachingSignals = buildTeachingSignals(studentTasks, studentRecords, subjectScope);
  const attentionReason = buildAttentionReason(student, aiTags, latestSummary);
  const latestUpdateLabel = getLatestUpdateLabel(studentTasks, studentRecords);
  const evidenceTag = aiTags.find((tag) => tag.tone === "red" || tag.tone === "amber") ?? aiTags[0];

  return (
        <div className="relative flex min-h-0 w-full flex-1 flex-col bg-[#f7f8f7]">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e8e6] bg-white/92 px-5 backdrop-blur-xl">
            <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-start rounded-full text-[#26312a] transition hover:bg-[#f3f5f4]" aria-label="返回">
              <ArrowLeft size={22} />
            </button>
            <div className="text-center">
              <h2 className="text-[17px] font-black tracking-tight text-[#191c1d]">学生档案</h2>
              <p className="mt-0.5 text-[10px] font-bold text-[#8a948d]">确认档案 · 教学跟进</p>
            </div>
            <button type="button" onClick={() => onEditProfile?.(student)} className="flex h-10 items-center gap-1.5 rounded-full bg-[#f3f5f4] px-3 text-[12px] font-black text-[#3d4a3d] transition hover:bg-[#eaf8ef] hover:text-[#15803d]">
              <Pencil size={14} />
              修改
            </button>
          </header>

          <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-[112px] pt-5">
            <div className="space-y-4">
              <section className="rounded-[22px] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf8ef] text-[20px] font-black text-[#14883b]">
                      {student.avatar}
                      {student.attention ? <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[#ff4d4f]" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="truncate text-[21px] font-black tracking-tight text-[#191c1d]">{student.name}</h3>
                        <StatusBadge attention={student.attention} label={learningStatus} />
                      </div>
                      <p className="mt-0.5 truncate text-[12px] font-semibold text-[#6b746d]">
                        {student.grade} · {profileSubjectLabel} · {student.className}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-right text-[11px] font-bold text-[#9aa19d]">{latestUpdateLabel}</p>
                </div>

                {subjectTracks.length > 1 ? (
                  <div className="mt-4 flex gap-2 overflow-x-auto">
                    {subjectTracks.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => onSubjectChange?.(subject)}
                        className={cn(
                          "h-8 shrink-0 rounded-full px-3 text-[12px] font-black transition",
                          subject === selectedSubject ? "bg-[#22c55e] text-white" : "bg-[#f3f5f4] text-[#5f6963] hover:bg-[#eaf8ef] hover:text-[#14883b]"
                        )}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 rounded-[16px] bg-[#f7f8f7] p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles size={16} className="mt-0.5 shrink-0 text-[#22c55e]" />
                    <div>
                      <p className="text-[12px] font-black text-[#26312a]">当前档案判断</p>
                      <p className="mt-0.5 text-[10px] font-black text-[#8a948d]">当前查看：{subjectScope}</p>
                      <p className="mt-1 text-[13px] font-semibold leading-6 text-[#4e5c52]">{attentionReason}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <TeachingSignal label="下次课先看" value={teachingSignals.nextLessonFocus} />
                  <TeachingSignal label="家长沟通重点" value={teachingSignals.parentCommunicationFocus} />
                </div>
              </section>

              <section className="rounded-[22px] bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-black text-[#191c1d]">AI 沉淀标签</h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#8a948d]">来自已入档记录、报告建议和老师确认结果</p>
                  </div>
                  <span className="rounded-full bg-[#f3f5f4] px-2.5 py-1 text-[10px] font-black text-[#6b746d]">可追溯</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {aiTags.map((tag) => (
                    <AiTag key={tag.id} tag={tag} />
                  ))}
                </div>
              </section>

              {classMentions.length ? (
                <section className="rounded-[22px] bg-white p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-black text-[#191c1d]">班级线索待确认</h3>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#8a948d]">来自班课/月报点名，不会自动写入学生档案</p>
                    </div>
                    <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[10px] font-black text-[#c2410c]">待拆分</span>
                  </div>
                  <div className="space-y-2">
                    {classMentions.map((hint) => (
                      <article key={hint.id} className="rounded-[16px] bg-[#f8f9fa] p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className="mt-0.5 shrink-0 text-[#f59e0b]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-black text-[#191c1d]">{hint.title}</p>
                            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#4e5c52]">{hint.reason}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => onOpenTask?.(hint.taskId)} className="mt-2 h-8 w-full rounded-[10px] bg-white text-[12px] font-black text-[#168f42] transition hover:bg-[#eaf8ef]">
                          查看来源
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rounded-[22px] bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[15px] font-black text-[#191c1d]">最近学习记录</h3>
                  <button type="button" className="text-[12px] font-black text-[#22c55e]">查看全部</button>
                </div>
                <div className="space-y-2.5">
                  <RecentRecord text={shortenDetailText(latestSummary, 42)} badge={latestSummary.includes("还没有") ? "待补充" : "记录"} tone={latestSummary.includes("还没有") ? "gray" : "green"} />
                  <RecentRecord text={evidenceTag ? `${evidenceTag.label} · ${evidenceTag.source}` : "暂无明确薄弱点证据"} badge="标签" tone={evidenceTag?.tone === "red" ? "orange" : "green"} />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-end justify-between px-1">
                  <div>
                    <h3 className="text-[18px] font-black text-[#191c1d]">档案时间线</h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#8a948d]">只展示可追溯的记录节点</p>
                  </div>
                </div>
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                  {(["全部", "反馈", "错题", "报告", "更新"] as TimelineFilter[]).map((item) => (
                    <button key={item} type="button" onClick={() => setFilter(item)} className={cn("h-9 shrink-0 rounded-full px-4 text-[13px] font-bold transition", filter === item ? "bg-[#22c55e] text-white shadow-[0_10px_20px_rgba(34,197,94,0.18)]" : "bg-white text-[#667085] hover:bg-[#edf8f1]")}>
                      {item}
                    </button>
                  ))}
                </div>

                <div className="relative ml-2 flex flex-col gap-3 border-l-2 border-[#e1e7e3] pl-6">
                  {filteredTimelineItems.map((item, index) => (
                    <div key={item.id} className="relative">
                      <span className={cn("absolute -left-[33px] top-5 h-5 w-5 rounded-full ring-4", index === 0 ? "bg-[#22c55e] ring-[#dcfce7]" : "bg-[#dfe5e1] ring-[#f7f8f7]")} />
                      <article className="rounded-[22px] bg-white p-4">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <h4 className="text-[14px] font-black text-[#191c1d]">{item.title}</h4>
                          <p className={cn("shrink-0 text-[11px] font-black", index === 0 ? "text-[#22c55e]" : "text-[#98a2b3]")}>{item.time}</p>
                        </div>
                        <p className="mb-3 line-clamp-2 text-[13px] font-semibold leading-6 text-[#4e5c52]">{item.summary}</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => item.taskId && onOpenTask?.(item.taskId)} className="h-8 flex-1 rounded-[10px] bg-[#dcfce7] text-[12px] font-black text-[#22c55e] transition hover:bg-[#c8f7d7]">查看详情</button>
                          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#f3f4f5] text-[#667085] transition hover:bg-[#e9eceb]" aria-label="复制">
                            <Copy size={15} />
                          </button>
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-[1fr_1.05fr]">
                <div className="rounded-[20px] bg-white p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-[#ef4444]" />
                    <h3 className="text-[14px] font-black text-[#191c1d]">薄弱点证据</h3>
                  </div>
                  <p className="mt-3 text-[13px] font-bold leading-6 text-[#4e5c52]">{evidenceTag?.label ?? "暂无明确证据"}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#98a2b3]">{evidenceTag?.source ?? "等待 AI 从确认记录中沉淀"}</p>
                </div>

                <div className="rounded-[20px] bg-[#22c55e] p-4 text-white">
                  <div className="flex items-center gap-2">
                    <Bot size={18} />
                    <h3 className="text-[14px] font-black">AI 建议下一步</h3>
                  </div>
                  <p className="mt-3 text-[12px] font-semibold leading-5 text-white/95">优先补齐本周课堂证据，再回到聊天页生成可确认的下次课建议或家长反馈。</p>
                </div>
              </section>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-[#e5e8e6] bg-[#f7f8f7]/88 px-5 pb-4 pt-3 backdrop-blur-xl">
            <div className="flex h-[52px] items-center gap-3 rounded-full bg-white px-4 shadow-sm">
              <button type="button" className="text-[#98a2b3]" aria-label="添加">
                <PlusCircle size={22} />
              </button>
              <input className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#191c1d] outline-none placeholder:text-[#98a2b3]" placeholder={`询问 AI 助教关于${student.name}的问题`} />
              <button type="button" className="text-[#98a2b3]" aria-label="语音">
                <Mic size={20} />
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_8px_16px_rgba(34,197,94,0.24)]" aria-label="发送">
                <SendHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>
  );
}

function StatusBadge({ attention, label }: { attention?: boolean; label: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-black", attention ? "bg-[#fef4d5] text-[#784e1a]" : "bg-[#eaf8ef] text-[#14883b]")}>
      {attention ? "需关注" : label}
    </span>
  );
}

function AiTag({ tag }: { tag: AiProfileTag }) {
  const styles = {
    green: "bg-[#eaf8ef] text-[#14883b]",
    red: "bg-[#fff1f1] text-[#dc2626]",
    blue: "bg-[#eef5ff] text-[#2563eb]",
    amber: "bg-[#fef4d5] text-[#784e1a]",
    gray: "bg-[#f3f5f4] text-[#5f6963]"
  };
  return (
    <span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-black", styles[tag.tone])}>
      {getTagIcon(tag.tone)}
      <span>{tag.label}</span>
      <span className="text-[10px] font-bold opacity-60">· {tag.source}</span>
    </span>
  );
}

function getTagIcon(tone: TagTone) {
  if (tone === "green") return <CheckCircle2 size={13} />;
  if (tone === "red" || tone === "amber") return <AlertCircle size={13} />;
  if (tone === "blue") return <FileText size={13} />;
  return <Database size={13} />;
}

function RecentRecord({ text, badge, tone }: { text: string; badge: string; tone: "green" | "orange" | "gray" }) {
  const styles = {
    green: "bg-[#dcfce7] text-[#22c55e]",
    orange: "bg-orange-50 text-orange-600",
    gray: "bg-[#f3f5f4] text-[#6b746d]"
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#667085]">{text}</p>
      <span className={cn("rounded-md px-2 py-1 text-[10px] font-black", styles[tone])}>{badge}</span>
    </div>
  );
}

function TeachingSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[#fbfcfb] px-3 py-3">
      <p className="text-[10px] font-black text-[#8a948d]">{label}</p>
      <p className="mt-1 text-[12px] font-bold leading-5 text-[#26312a]">{value}</p>
    </div>
  );
}

function buildClassMentionHints(student: Conversation, taskCards: TaskCard[]) {
  return taskCards
    .filter((task) => task.conversationId !== student.id && getTaskMentionText(task).includes(student.name))
    .map((task) => ({
      id: `${student.id}-${task.id}`,
      taskId: task.id,
      title: task.taskType === "monthly_report" ? "班级月报提到该学生" : "班课任务提到该学生",
      reason: buildClassMentionReason(student.name, task)
    }))
    .slice(0, 2);
}

function getTaskMentionText(task: TaskCard) {
  return [
    task.title,
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

function buildClassMentionReason(studentName: string, task: TaskCard) {
  const sourceText = task.inputSummary || task.summary || task.currentOutput?.display_content || task.feedbackText || "";
  const sentence = findMentionSentence(sourceText, studentName);
  if (sentence) return `${sentence} 需要老师确认后再拆分到个人档案。`;
  return "班级记录中出现了该学生，需要老师确认是否拆分为个人跟进事项。";
}

function findMentionSentence(text: string, studentName: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const sentence = normalized.split(/[。！？!?]/).find((item) => item.includes(studentName));
  return sentence ? shortenDetailText(sentence, 46) : "";
}

function buildAiProfileTags(student: Conversation, tasks: TaskCard[], records: TimelineRecord[], subjectScope: string): AiProfileTag[] {
  const confirmedUpdates = records.flatMap((record) => record.profileUpdates ?? []);
  const updateTags = confirmedUpdates.map((update) => profileUpdateToTag(update));
  const archivedFeedbackCount = tasks.filter((task) => task.taskType === "feedback" && task.status === "archived").length + records.filter((record) => record.skillId === "generate_feedback").length;
  const hasEvidenceAnalysis = tasks.some((task) => task.taskType === "learning_evidence_analysis") || records.some((record) => record.skillId === "analyze_learning_evidence");
  const learningStatus = getStudentLearningStatus(student, tasks, records);
  const tags: AiProfileTag[] = [
    {
      id: `${student.id}-status`,
      label: `学习状态: ${learningStatus}`,
      source: "当前档案",
      tone: learningStatus === "需关注" ? "amber" : learningStatus === "待补充" ? "gray" : "green"
    },
    ...updateTags
  ];

  if (archivedFeedbackCount > 0) {
    tags.push({
      id: `${student.id}-feedback`,
      label: `微信反馈 · ${archivedFeedbackCount}次`,
      source: "确认记录",
      tone: "green"
    });
  }

  if (hasEvidenceAnalysis && !tags.some((tag) => tag.label.includes("材料") || tag.label.includes("错题"))) {
    tags.push({
      id: `${student.id}-evidence`,
      label: "学习材料已分析",
      source: "分析卡片",
      tone: "blue"
    });
  }

  if (tags.length < 4) {
    tags.push(...buildEvidenceBackedFallbackTags(student.id, collectTeachingText(tasks, records), subjectScope, Boolean(student.attention)));
  }

  return dedupeTags(tags).slice(0, 7);
}

function buildEvidenceBackedFallbackTags(studentId: string, text: string, subjectScope: string, attention: boolean): AiProfileTag[] {
  const tags: AiProfileTag[] = [];
  const addTag = (suffix: string, label: string, source: string, tone: TagTone) => {
    if (!tags.some((tag) => tag.label === label)) tags.push({ id: `${studentId}-${suffix}`, label, source, tone });
  };

  if (/几何|证明/u.test(text)) addTag("geometry-proof", "几何证明思路复盘", "已入档记录", attention ? "red" : "blue");
  if (/依据|理由|跳过理由/u.test(text)) addTag("proof-reason", "证明依据完整性", "已入档记录", attention ? "red" : "blue");
  if (/平行线|全等/u.test(text)) addTag("geometry-connection", "平行线与全等条件衔接", "已入档记录", attention ? "red" : "blue");
  if (/限制条件|条件提取|题干/u.test(text)) addTag("condition", "题干条件二次核对", "已入档记录", attention ? "red" : "blue");
  if (/受力|摩擦力/u.test(text)) addTag("force", "受力图逐项标注", "已入档记录", attention ? "red" : "blue");
  if (/单位换算|单位/u.test(text)) addTag("unit", "单位换算检查", "已入档记录", "blue");
  if (/表达完整|步骤|过程/u.test(text)) addTag("steps", "步骤表达完整性", "已入档记录", "blue");

  if (!tags.length) {
    addTag("weakness-fallback", subjectScope === "数学" || subjectScope === "全部科目" ? "题干条件二次核对" : `${subjectScope}关键证据`, "待复核", attention ? "red" : "blue");
    addTag("habit-fallback", "独立练习稳定性", "待复核", "blue");
  }

  addTag("monthly-fallback", "月报可引用", "确认后", "gray");
  return tags;
}

function profileUpdateToTag(update: ProfileUpdateRecord): AiProfileTag {
  return {
    id: update.id,
    label: cleanupProfileUpdateLabel(update.label || update.value),
    source: getProfileUpdateSource(update.target),
    tone: getProfileUpdateTone(update.target)
  };
}

function cleanupProfileUpdateLabel(label: string) {
  return label
    .replace(/^更新能力画像：/u, "")
    .replace(/^新增薄弱点事件：/u, "")
    .replace(/^新增复发风险：/u, "")
    .replace(/^生成下次跟进：/u, "")
    .replace(/^加入月报素材：/u, "");
}

function getProfileUpdateSource(target: ProfileUpdateTarget) {
  if (target === "ability_profile") return "能力画像";
  if (target === "weakness_event") return "薄弱点";
  if (target === "recurrence_risk") return "复发风险";
  if (target === "action_plan") return "行动计划";
  return "月报素材";
}

function getProfileUpdateTone(target: ProfileUpdateTarget): TagTone {
  if (target === "weakness_event" || target === "recurrence_risk") return "red";
  if (target === "action_plan") return "blue";
  if (target === "monthly_report_source") return "gray";
  return "green";
}

function dedupeTags(tags: AiProfileTag[]) {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    if (seen.has(tag.label)) return false;
    seen.add(tag.label);
    return true;
  });
}

function buildAttentionReason(student: Conversation, tags: AiProfileTag[], latestSummary: string) {
  const riskTag = tags.find((tag) => (tag.tone === "red" || tag.tone === "amber") && !tag.label.startsWith("学习状态"));
  if (riskTag && student.attention) {
    return `当前主要关注「${riskTag.label}」。下次课先用 1-2 道同类题复核，再决定是否写入长期薄弱点。`;
  }
  if (riskTag) {
    return `当前可把「${riskTag.label}」作为备课线索，但长期标签仍以老师确认后的记录为准。`;
  }
  return `${shortenDetailText(latestSummary, 46)} 后续继续用课堂记录和材料分析补齐证据。`;
}

function buildTimelineItems(tasks: TaskCard[], records: TimelineRecord[]) {
  const taskItems = tasks
    .filter((task) => task.status !== "running")
    .map((task) => ({
      id: task.id,
      taskId: task.id,
      title: getTimelineTitle(task),
      summary: getProfileTimelineSummary(task.taskType, task.summary ?? task.feedbackText ?? task.currentOutput?.display_content ?? "已生成一条可确认学习记录。"),
      type: getTimelineType(task),
      time: formatRelativeDay(task.updatedAt),
      sortAt: task.updatedAt
    }));
  const recordItems = records.map((record) => ({
    id: record.id,
    taskId: record.sourceTaskId,
    title: record.skillId === "generate_feedback" ? "微信反馈" : record.title.replace(/^.*? · /u, ""),
    summary: getProfileTimelineSummary(record.skillId === "generate_feedback" ? "feedback" : "learning_record", record.summary),
    type: record.skillId === "analyze_learning_evidence" ? ("报告" as TimelineFilter) : ("更新" as TimelineFilter),
    time: formatRelativeDay(record.createdAt),
    sortAt: record.createdAt
  }));

  const items = dedupeTimelineItems([...taskItems, ...recordItems].sort((a, b) => b.sortAt.localeCompare(a.sortAt)));
  if (items.length) {
    return items.slice(0, 6).map((item) => ({
      id: item.id,
      taskId: item.taskId,
      title: item.title,
      summary: item.summary,
      type: item.type,
      time: item.time
    }));
  }

  return [
    {
      id: "fallback-profile",
      taskId: undefined,
      title: "等待学习记录",
      summary: "还没有足够的确认记录。可以先上传学习材料或整理课堂记录。",
      type: "更新" as TimelineFilter,
      time: "暂无"
    }
  ];
}

function getTimelineTitle(task: TaskCard) {
  if (task.taskType === "learning_evidence_analysis") return "学习材料分析";
  if (task.taskType === "feedback") return "微信反馈";
  if (task.taskType === "monthly_report") return "月报";
  if (task.taskType === "learning_record") return "学习记录";
  return task.title.replace(/^.*? · /u, "");
}

function getTimelineType(task: TaskCard): TimelineFilter {
  if (task.taskType === "feedback") return "反馈";
  if (task.taskType === "learning_evidence_analysis") return "错题";
  if (task.taskType === "monthly_report") return "报告";
  return "更新";
}

function getLatestUpdateLabel(tasks: TaskCard[], records: TimelineRecord[]) {
  const latestRecord = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latestRecord) return formatRelativeDay(latestRecord.createdAt);
  const latestTask = [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (latestTask) return formatRelativeDay(latestTask.updatedAt);
  return "等待更新";
}

function formatRelativeDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shortenDetailText(text: string, maxLength: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

function getStudentLearningStatus(student: Conversation, tasks: TaskCard[], records: TimelineRecord[]) {
  const text = collectTeachingText(tasks, records);
  if (!tasks.length && !records.length) return "待补充";
  if (student.attention || /需关注|不稳|漏|错|风险|薄弱|条件|摩擦力|单位换算/u.test(text)) return "需关注";
  return "稳定跟进";
}

function getLatestTeachingSummary(tasks: TaskCard[], records: TimelineRecord[]) {
  const learningRecord = [...records]
    .reverse()
    .find((record) => record.skillId !== "generate_feedback" && record.summary && !looksLikeParentFeedback(record.summary));
  if (learningRecord) return cleanProfileSummary(learningRecord.summary);

  const learningTask = [...tasks]
    .reverse()
    .find((task) => task.taskType !== "feedback" && (task.summary || task.detail || task.currentOutput?.display_content));
  if (learningTask) return cleanProfileSummary(learningTask.summary ?? learningTask.detail ?? learningTask.currentOutput?.display_content ?? "");

  return "近期还没有足够的已确认学习记录，建议先补充课堂表现或学习材料。";
}

function buildTeachingSignals(tasks: TaskCard[], records: TimelineRecord[], subjectScope: string) {
  const text = collectTeachingText(tasks, records);
  const focus: string[] = [];
  if (/限制条件|条件提取|题干/u.test(text)) focus.push("题干条件二次核对");
  if (/受力|摩擦力/u.test(text)) focus.push("受力图逐项标注");
  if (/单位换算|单位/u.test(text)) focus.push("单位换算检查");
  if (/表达完整|步骤|过程/u.test(text)) focus.push("步骤表达完整性");
  if (/几何|证明/u.test(text)) focus.push("几何证明思路复盘");

  const fallbackFocus =
    subjectScope === "物理"
      ? ["受力过程复述", "单位换算检查"]
      : subjectScope === "数学"
        ? ["题干条件标注", "同类题迁移"]
        : ["关键条件提取", "步骤复盘"];

  const nextLessonFocus = (focus.length ? focus : fallbackFocus).slice(0, 3).join("、");
  const parentCommunicationFocus = focus.length
    ? `反馈时说清正在练「${focus[0]}」，避免制造焦虑。`
    : "先说明课堂观察和下一步训练方向，不做长期定性。";

  return { nextLessonFocus, parentCommunicationFocus };
}

function collectTeachingText(tasks: TaskCard[], records: TimelineRecord[]) {
  return [
    ...tasks.flatMap((task) => [task.title, task.inputSummary, task.summary, task.feedbackText, task.detail, task.currentOutput?.display_content, task.archivedOutput?.display_content]),
    ...records.flatMap((record) => [record.title, record.summary, ...(record.profileUpdates ?? []).flatMap((update) => [update.label, update.value, update.evidence])])
  ]
    .filter(Boolean)
    .join("\n");
}

function looksLikeParentFeedback(text: string) {
  return /家长您好|我会继续|不用着急|后续我会/u.test(text);
}

function getProfileTimelineSummary(taskType: TaskCard["taskType"] | "feedback", summary: string) {
  if (taskType === "feedback") return summarizeFeedbackForProfile(summary);
  return cleanProfileSummary(summary);
}

function summarizeFeedbackForProfile(text: string) {
  const signals = buildSignalsFromText(text);
  if (signals.length) return `已反馈：本次重点沟通 ${signals.slice(0, 3).join("、")}。`;
  return `已反馈：${shortenDetailText(text.replace(/^家长您好，?/u, ""), 48)}`;
}

function buildSignalsFromText(text: string) {
  const signals: string[] = [];
  if (/限制条件|条件提取|题干/u.test(text)) signals.push("题干条件二次核对");
  if (/受力|摩擦力/u.test(text)) signals.push("受力图逐项标注");
  if (/单位换算|单位/u.test(text)) signals.push("单位换算检查");
  if (/表达完整|步骤|过程/u.test(text)) signals.push("步骤表达完整性");
  if (/几何|证明/u.test(text)) signals.push("几何证明思路复盘");
  return Array.from(new Set(signals));
}

function cleanProfileSummary(text: string) {
  return text
    .replace(/^已整理为学习记录草稿：/u, "")
    .replace(/^已生成学习证据分析草稿：/u, "")
    .replace(/^已生成一条可审核的 AI 工作流结果，?/u, "")
    .trim();
}

function dedupeTimelineItems<T extends { title: string; summary: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}|${item.summary.replace(/\s+/g, "").slice(0, 42)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
