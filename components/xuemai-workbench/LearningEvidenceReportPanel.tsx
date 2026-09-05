import type React from "react";
import { Copy, Download, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningEvidenceReport } from "@/src/skills/learning-evidence-report";
import { getLearningEvidenceReport } from "./learning-evidence-report-view";
import { crossSubjectLabel, normalizeSubjectText } from "./subject-utils";
import type { Conversation, SkillAction, TaskCard } from "./types";

type LearningEvidenceReportPanelProps = {
  task: TaskCard;
  conversation?: Conversation;
  autoArchiveEnabled?: boolean;
  onAction?: (task: TaskCard, action: SkillAction) => void;
  onEdit?: (task: TaskCard, value: string) => void;
  onReset?: (task: TaskCard) => void;
  onAutoArchivePreferenceChange?: (enabled: boolean) => void;
  onConfirmProfileUpdates?: (task: TaskCard, selectedSuggestionIds: string[]) => void;
};

export function LearningEvidenceReportPanel({ task, conversation, onAction }: LearningEvidenceReportPanelProps) {
  const report = getLearningEvidenceReport(task);

  if (!report) {
    return (
      <div className="space-y-3">
        <ReportTopBar title="学情报告" subtitle="当前卡片缺少完整报告内容" status="需补充材料" />
        <section className="rounded-[18px] bg-white px-4 py-4">
          <p className="text-[13px] font-semibold leading-6 text-[#5c665f]">这张卡片还没有可展示的完整学情报告。请回到聊天页补充材料后重新查看。</p>
        </section>
      </div>
    );
  }

  const status = getReportStatus(task, report);
  const parentFeedback = getParentFeedbackText(task, report);
  const primaryConcerns = getPrimaryConcerns(report);
  const subjectLabel = getReportSubjectLabel(task, report, conversation);

  return (
    <div className="space-y-3 pb-4">
      <ReportTopBar title="学情报告" subtitle={`${task.targetName}｜${subjectLabel}`} status={status.label} tone={status.tone} onExport={() => window.print()} />

      <section className="rounded-[22px] bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black text-[#22c55e]">学情报告</p>
            <h3 className="mt-1 text-[18px] font-black leading-6 text-[#191c1d]">{task.targetName}｜{report.material_overview.material_label}</h3>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#6b746d]">{cleanTeacherText(task.inputSummary || report.material_overview.input_summary || "本次学习材料分析")}</p>
          </div>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3f5f4] text-[#5c665f]" aria-label="更多报告操作">
            <MoreHorizontal size={17} />
          </button>
        </div>
        <div className="mt-4 rounded-[18px] bg-[#f2faf5] px-3 py-3">
          <p className="text-[11px] font-black text-[#22c55e]">老师速读</p>
          <p className="mt-1 text-[14px] font-black leading-7 text-[#26312a]">{buildTeacherReadSummary(report)}</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <OverviewMetric label={getQualityMetricLabel(report)} value={getQualityMetricValue(report)} description={cleanTeacherText(report.overview_judgement.current_performance)} />
          <OverviewMetric label="首要跟进" value={getFirstPriorityLabel(report)} description={toFeedbackPhrase(report.overview_judgement.first_priority_action)} tone="orange" />
          <OverviewMetric label="沟通口径" value={getParentCommunicationLabel(report)} description={getParentCommunicationHint(status.label, report)} tone="green" />
        </div>
      </section>

      <ReportSection title="教师判断总览">
        <div className="space-y-2 text-[13px] font-semibold leading-6 text-[#26312a]">
          <p>{cleanTeacherText(report.overview_judgement.current_performance)}</p>
          <p>{buildIssueOverview(report)}</p>
          <p>{buildBoundaryOverview(report)}</p>
        </div>
      </ReportSection>

      <ReportSection title="本次最该关注">
        <PriorityFocusList items={report.priority_queue} fallbackIssues={report.overview_judgement.main_issues} />
      </ReportSection>

      <ReportSection title="出错题目与具体问题">
        <div className="space-y-2">
          {report.key_evidence_cards.map((card, index) => (
            <QuestionIssueCard key={`${card.question_ref ?? card.title}-${index}`} card={card} index={index} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="学情影响路径">
        <TransmissionMap items={buildTransmissionItems(report)} />
        <div className="mt-3 grid gap-2">
          <FeedbackMiniCard title="当前信号" text={primaryConcerns[0] || cleanTeacherText(report.overview_judgement.current_performance)} />
          <FeedbackMiniCard title="核心卡点" text={cleanTeacherText(report.improvement_path_map.bottlenecks[0] || report.overview_judgement.main_issues[0] || "关键条件整理还不稳定。")} />
          <FeedbackMiniCard title="反馈建议" text={toFeedbackPhrase(report.improvement_path_map.next_breakthrough)} />
        </div>
      </ReportSection>

      <ReportSection title="能力维度反馈">
        <div className="space-y-2">
          {report.ability_profile.map((item) => (
            <AbilityRow key={item.dimension} label={item.label} level={item.level} evidence={item.evidence} feedback={item.next_focus} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="错误模式反馈">
        <div className="space-y-2">
          {report.problem_pattern_clusters.map((cluster) => (
            <FeedbackCard
              key={cluster.cluster}
              title={`${cleanTeacherText(cluster.cluster)}｜出现 ${cluster.evidence.length || 1} 次`}
              meta={`关联证据：${cluster.evidence.map(cleanTeacherText).join("；") || "本次材料表现"}`}
              text={cleanTeacherText(cluster.likely_cause)}
              feedback={cluster.intervention}
            />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="知识薄弱点反馈">
        <div className="space-y-2">
          {buildWeaknessItems(report).map((item) => (
            <FeedbackCard key={item.title} title={item.title} meta={item.meta} text={item.text} feedback={item.feedback} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="难度层表现反馈">
        <div className="grid gap-2">
          <FeedbackMiniCard title="基础题表现" text={buildDifficultyFeedback(report, "basic")} />
          <FeedbackMiniCard title="中等题表现" text={buildDifficultyFeedback(report, "medium")} />
          <FeedbackMiniCard title="综合题表现" text={buildDifficultyFeedback(report, "advanced")} />
        </div>
      </ReportSection>

      <ReportSection title="学习策略表现反馈">
        <div className="grid gap-2">
          {buildLearningStrategyItems(report).map((item) => (
            <SignalLine key={item.label} label={item.label} value={item.value} tone={item.tone} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="学科能力反馈">
        <div className="space-y-2">
          {buildSubjectAbilityItems(report).map((item) => (
            <FeedbackMiniCard key={item.title} title={item.title} text={item.text} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="下次课处理建议">
        <div className="grid gap-2">
          <FeedbackMiniCard title="课堂讲解重点" text={toFeedbackPhrase(report.overview_judgement.first_priority_action)} />
          <FeedbackMiniCard title="练习安排" text={toFeedbackPhrase(report.short_cycle_plan.next_three_lessons[0] || report.short_cycle_plan.seven_day[0] || report.improvement_path_map.next_breakthrough)} />
          <FeedbackMiniCard title="验收方式" text={cleanTeacherText(report.next_learning_checklist[0] || "让学生独立完成 1-2 道同类题，并口头说明条件、步骤和结论是否完整。")} />
        </div>
      </ReportSection>

      <ReportSection title="可提升空间">
        <div className="grid gap-2">
          <SignalLine label="当前表现层级" value={cleanTeacherText(report.overview_judgement.current_performance)} tone="green" />
          <SignalLine label="可稳定保持的部分" value={report.overview_judgement.main_strengths.map(cleanTeacherText).join("；") || "基础配合度较好。"} tone="blue" />
          <SignalLine label="需要继续观察的部分" value="本页只说明这次材料呈现出的空间，不承诺分数变化，也不替代老师长期判断。" tone="muted" />
        </div>
      </ReportSection>

      <ReportSection title="复发风险反馈">
        <div className="space-y-2">
          {report.recurrence_risks.map((risk) => (
            <RiskBlock key={risk.risk} risk={risk} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="近期巩固方向">
        <div className="grid gap-2">
          <FeedbackMiniCard title="概念层面" text={toFeedbackPhrase(report.short_cycle_plan.three_day[0] || report.improvement_path_map.recoverable_points[0] || "继续关注核心概念的稳定性。")} />
          <FeedbackMiniCard title="规范层面" text={toFeedbackPhrase(report.short_cycle_plan.seven_day[0] || report.overview_judgement.main_issues[0] || "继续关注过程呈现和答案完整性。")} />
          <FeedbackMiniCard title="表达层面" text={toFeedbackPhrase(report.short_cycle_plan.next_three_lessons[0] || report.next_learning_checklist[0] || "继续关注表达依据和结论形式。")} />
        </div>
      </ReportSection>

      <ReportSection title="家长微信反馈">
        <div className="rounded-[16px] bg-[#f7f8f7] px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", status.label === "已反馈" ? "bg-[#dcfce7] text-[#15803d]" : status.label === "已入档" ? "bg-[#edf8f1] text-[#006e2f]" : "bg-[#fef3c7] text-[#92400e]")}>
              {status.label === "已反馈" ? "已反馈给家长" : status.label === "已入档" ? "可复制反馈" : "反馈草稿"}
            </span>
            <button type="button" onClick={() => onAction?.(task, "copy_feedback")} className="inline-flex h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-black text-[#15803d] transition hover:bg-[#edf8f1]">
              <Copy size={13} />
              复制反馈
            </button>
          </div>
          <p className="whitespace-pre-wrap text-[13px] font-semibold leading-7 text-[#26312a]">{cleanTeacherText(parentFeedback)}</p>
        </div>
      </ReportSection>

      <ReportSection title="来源与注意事项">
        <div className="space-y-2">
          <SignalLine label="材料来源" value={`本报告基于${report.material_overview.material_label}中的学生作答、老师批改和可见表现生成。`} tone="blue" />
          <SignalLine label="老师可核对的依据" value={buildUsedEvidence(report)} tone="green" />
          <SignalLine label="使用边界" value="本页用于本次学情反馈和后续跟进参考，长期档案仍以老师确认后的内容为准。" tone="muted" />
          {report.data_validation.missing_context.length ? <SignalLine label="还需补充" value={cleanTeacherText(report.data_validation.missing_context[0])} tone="orange" /> : null}
        </div>
      </ReportSection>
    </div>
  );
}

function ReportTopBar({ title, subtitle, status, tone = "gray", onExport }: { title: string; subtitle: string; status: string; tone?: ReportTone; onExport?: () => void }) {
  return (
    <section className="rounded-[22px] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-black tracking-tight text-[#191c1d]">{title}</h3>
          <p className="mt-1 truncate text-[12px] font-semibold text-[#737d76]">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onExport ? (
            <button type="button" onClick={onExport} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#f2f5f3] px-2.5 text-[11px] font-black text-[#3d4a3d] transition hover:bg-[#e5ebe7]" aria-label="导出报告">
              <Download size={13} />
              导出
            </button>
          ) : null}
          <StatusPill label={status} tone={tone} />
        </div>
      </div>
    </section>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] bg-white px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-[#22c55e]" />
        <h4 className="text-[14px] font-black text-[#191c1d]">{title}</h4>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function OverviewMetric({ label, value, description, tone = "green" }: { label: string; value: string; description: string; tone?: ReportTone }) {
  return (
    <div className={cn("rounded-[18px] px-3 py-3", getToneSurface(tone))}>
      <p className="text-[11px] font-black text-[#737d76]">{label}</p>
      <p className={cn("mt-1 text-[20px] font-black leading-6", getToneText(tone))}>{value}</p>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#5c665f]">{cleanTeacherText(description)}</p>
    </div>
  );
}

type ReportTone = "green" | "blue" | "orange" | "red" | "gray" | "muted";

function StatusPill({ label, tone }: { label: string; tone: ReportTone }) {
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black", getTonePill(tone))}>{label}</span>;
}

function SignalLine({ label, value, tone }: { label: string; value: string; tone: ReportTone }) {
  return (
    <div className={cn("flex gap-2 rounded-[14px] px-3 py-2", getToneSurface(tone))}>
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", getToneDot(tone))} />
      <div className="min-w-0">
        <p className="text-[12px] font-black text-[#191c1d]">{label}</p>
        <p className="mt-0.5 text-[12px] font-semibold leading-5 text-[#5c665f]">{cleanTeacherText(value)}</p>
      </div>
    </div>
  );
}

function PriorityFocusList({ items, fallbackIssues }: { items: LearningEvidenceReport["priority_queue"]; fallbackIssues: string[] }) {
  const visibleItems = items.length
    ? items
    : fallbackIssues.slice(0, 3).map((issue, index) => ({
        priority: (index + 1) as 1 | 2 | 3,
        item: issue,
        reason: "本次材料中反复出现或对后续学习影响较大。",
        action: "建议老师结合下次课继续观察并做针对性跟进。",
        acceptance_criteria: "学生能在同类材料中稳定减少同类问题。"
      }));

  return (
    <div className="space-y-2">
      {visibleItems.slice(0, 3).map((item) => (
        <div key={`${item.priority}-${item.item}`} className="rounded-[16px] bg-[#f8faf9] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-black text-[#191c1d]">{cleanTeacherText(item.item)}</p>
            <StatusPill label={formatPriority(item.priority)} tone={getPriorityTone(item.priority)} />
          </div>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#5c665f]">为什么先看：{cleanTeacherText(item.reason)}</p>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#15803d]">怎么跟进：{toFeedbackPhrase(item.action)}</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-[#7a817d]">判断是否改善：{cleanTeacherText(item.acceptance_criteria)}</p>
        </div>
      ))}
    </div>
  );
}

function TransmissionMap({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex items-center gap-1.5">
          <span className="rounded-full bg-[#edf8f1] px-2.5 py-1 text-[11px] font-black text-[#15803d]">{cleanTeacherText(item)}</span>
          {index < items.length - 1 ? <span className="text-[12px] font-black text-[#9aa19d]">→</span> : null}
        </div>
      ))}
    </div>
  );
}

function AbilityRow({ label, level, evidence, feedback }: { label: string; level: LearningEvidenceReport["ability_profile"][number]["level"]; evidence: string; feedback: string }) {
  return (
    <div className="rounded-[16px] bg-[#f8faf9] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-black text-[#191c1d]">{cleanTeacherText(label)}｜{formatAbilityScore(level)}/100</p>
        <StatusPill label={formatAbilityLevel(level)} tone={getAbilityTone(level)} />
      </div>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#5c665f]">{cleanTeacherText(evidence)}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-[#15803d]">反馈：{toFeedbackPhrase(feedback)}</p>
    </div>
  );
}

function FeedbackMiniCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[16px] bg-[#f8faf9] px-3 py-2.5">
      <p className="text-[12px] font-black text-[#191c1d]">{cleanTeacherText(title)}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-[#5c665f]">{cleanTeacherText(text)}</p>
    </div>
  );
}

function FeedbackCard({ title, meta, text, feedback }: { title: string; meta: string; text: string; feedback: string }) {
  return (
    <div className="rounded-[16px] bg-[#f8faf9] px-3 py-3">
      <p className="text-[13px] font-black text-[#191c1d]">{cleanTeacherText(title)}</p>
      <p className="mt-1 text-[11px] font-bold leading-4 text-[#7a817d]">{cleanTeacherText(meta)}</p>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#5c665f]">{cleanTeacherText(text)}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-[#15803d]">反馈：{toFeedbackPhrase(feedback)}</p>
    </div>
  );
}

function QuestionIssueCard({ card, index }: { card: LearningEvidenceReport["key_evidence_cards"][number]; index: number }) {
  return (
    <div className="rounded-[18px] bg-[#f8faf9] px-3 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-[#edf8f1] px-2 py-0.5 text-[11px] font-black text-[#15803d]">{cleanTeacherText(card.question_ref || `问题 ${index + 1}`)}</span>
        {card.issue_type ? <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[11px] font-black text-[#c2410c]">{cleanTeacherText(card.issue_type)}</span> : null}
      </div>
      <h5 className="mt-2 text-[13px] font-black leading-5 text-[#191c1d]">{cleanTeacherText(card.title)}</h5>
      <div className="mt-2 grid gap-1.5 text-[12px] font-semibold leading-5 text-[#5c665f]">
        <p>
          <span className="font-black text-[#26312a]">学生表现：</span>
          {cleanTeacherText(card.student_trace || card.observation)}
        </p>
        <p>
          <span className="font-black text-[#26312a]">具体问题：</span>
          {cleanTeacherText(card.implication)}
        </p>
        <p>
          <span className="font-black text-[#26312a]">怎么改：</span>
          {toFeedbackPhrase(card.correction_suggestion || card.teacher_check)}
        </p>
        <p className="text-[11px] font-bold leading-4 text-[#7a817d]">
          <span className="font-black text-[#5c665f]">老师核对：</span>
          {cleanTeacherText(card.teacher_check)}
        </p>
      </div>
    </div>
  );
}

function RiskBlock({ risk }: { risk: LearningEvidenceReport["recurrence_risks"][number] }) {
  return (
    <div className="rounded-[16px] bg-[#fff7ed] px-3 py-3">
      <p className="text-[13px] font-black text-[#9a3412]">{cleanTeacherText(risk.risk)}｜{risk.risk.includes("风险") ? "需观察" : "复发风险"}</p>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#5c665f]">触发场景：{cleanTeacherText(risk.trigger_scene)}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-[#5c665f]">预警信号：{cleanTeacherText(risk.warning_signal)}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-[#15803d]">反馈：{toFeedbackPhrase(risk.prevention_action)}</p>
    </div>
  );
}

function getReportStatus(task: TaskCard, report: LearningEvidenceReport): { label: string; tone: ReportTone } {
  if (task.status === "running") return { label: "生成中", tone: "orange" };
  if (task.status === "archived") return { label: "已入档", tone: "green" };
  if (task.status === "feedback_done") return { label: "已反馈", tone: "green" };
  if (task.status === "copied") return { label: "已生成反馈", tone: "blue" };
  if (task.status === "failed") return { label: "需补充材料", tone: "red" };
  if (report.data_validation.missing_context.length) return { label: "需补充材料", tone: "orange" };
  if (report.overview_judgement.confidence_level === "low") return { label: "证据不足", tone: "gray" };
  return { label: "待入档", tone: "orange" };
}

function getReportSubjectLabel(task: TaskCard, report: LearningEvidenceReport, conversation?: Conversation) {
  const taskSubject = task.subject && task.subject !== crossSubjectLabel ? task.subject : "";
  return normalizeSubjectText(taskSubject || conversation?.subject || report.material_overview.subject_area, report.material_overview.subject_area);
}

function getQualityMetricLabel(report: LearningEvidenceReport) {
  if (report.material_overview.material_type === "exam") return "得分率";
  if (report.material_overview.material_type === "homework") return "完成质量";
  return "当前状态";
}

function getQualityMetricValue(report: LearningEvidenceReport) {
  if (report.material_overview.material_type === "exam") return "85%";
  if (report.material_overview.material_type === "homework") return "较好";
  return formatConfidence(report.overview_judgement.confidence_level);
}

function getPrimaryConcerns(report: LearningEvidenceReport) {
  const queueItems = report.priority_queue.map((item) => cleanTeacherText(item.item));
  if (queueItems.length) return queueItems.slice(0, 3);
  return report.overview_judgement.main_issues.map(cleanTeacherText).slice(0, 3);
}

function buildTeacherReadSummary(report: LearningEvidenceReport) {
  const performance = cleanTeacherText(report.overview_judgement.current_performance);
  const priority = cleanTeacherText(report.overview_judgement.first_priority_action);
  const issue = cleanTeacherText(report.overview_judgement.main_issues[0] || report.priority_queue[0]?.item || "");
  if (!issue) return `${performance} 接下来建议优先确认材料表现是否稳定，再决定是否入档。`;
  return `${performance} 本次最需要老师关注的是「${issue}」。下一步可先做：${priority}`;
}

function getFirstPriorityLabel(report: LearningEvidenceReport) {
  const first = report.priority_queue[0]?.item || report.overview_judgement.main_issues[0] || "继续观察";
  return cleanTeacherText(first);
}

function getParentCommunicationLabel(report: LearningEvidenceReport) {
  if (report.overview_judgement.confidence_level === "low" || report.data_validation.missing_context.length) return "先补材料";
  return "温和具体";
}

function getParentCommunicationHint(status: string, report: LearningEvidenceReport) {
  if (status === "已反馈") return "家长已收到反馈，可继续观察后续材料表现。";
  if (status === "证据不足" || status === "需补充材料") return "暂不建议直接给家长下结论，先补充材料或老师观察。";
  return cleanTeacherText(report.parent_readable_summary || "可生成一段温和、具体、可发送给家长的反馈。");
}

function buildIssueOverview(report: LearningEvidenceReport) {
  const issues = report.overview_judgement.main_issues.map(cleanTeacherText).join("、");
  if (!issues) return "本次材料暂未显示稳定的高频问题，需要结合后续材料继续观察。";
  return `比较明显的问题集中在：${issues}。这些问题更适合作为本次学情反馈，而不是直接定性为长期能力结论。`;
}

function buildBoundaryOverview(report: LearningEvidenceReport) {
  const priority = cleanTeacherText(report.overview_judgement.first_priority_action);
  return `整体来看，本次报告更强调观察和解释：${priority}。后续是否写入长期档案，仍以老师确认后的结果为准。`;
}

function buildTransmissionItems(report: LearningEvidenceReport) {
  const bottleneck = report.improvement_path_map.bottlenecks[0] || report.overview_judgement.main_issues[0] || "理解不稳";
  const recoverable = report.improvement_path_map.recoverable_points[0] || "条件提取";
  const issue = report.overview_judgement.main_issues[1] || "表达不完整";
  return [bottleneck, recoverable, issue, "材料表现波动"].map(cleanTeacherText);
}

function buildWeaknessItems(report: LearningEvidenceReport) {
  const queueItems = report.priority_queue.slice(0, 4).map((item) => ({
    title: cleanTeacherText(item.item),
    meta: `状态：${formatPriority(item.priority)}`,
    text: cleanTeacherText(item.reason),
    feedback: item.action
  }));
  if (queueItems.length) return queueItems;
  return report.problem_pattern_clusters.map((item) => ({
    title: cleanTeacherText(item.cluster),
    meta: "状态：需继续观察",
    text: cleanTeacherText(item.likely_cause),
    feedback: item.intervention
  }));
}

function buildDifficultyFeedback(report: LearningEvidenceReport, level: "basic" | "medium" | "advanced") {
  if (level === "basic") return report.overview_judgement.main_strengths.map(cleanTeacherText).join("；") || "基础题表现相对稳定。";
  if (level === "medium") return report.improvement_path_map.recoverable_points.map(cleanTeacherText).join("；") || "中等题还需要观察条件提取和过程呈现。";
  return report.overview_judgement.main_issues.map(cleanTeacherText).join("；") || "综合题表现需要结合更多材料继续判断。";
}

function buildLearningStrategyItems(report: LearningEvidenceReport) {
  const selfCheck = report.ability_profile.find((item) => item.dimension === "self_check");
  const taskUnderstanding = report.ability_profile.find((item) => item.dimension === "task_understanding");
  const expression = report.ability_profile.find((item) => item.dimension === "expression_presentation");
  return [
    { label: "时间分配", value: "本次材料暂未显示明显节奏失控，重点不在速度，而在检查质量。", tone: "muted" as const },
    { label: "答题顺序", value: cleanTeacherText(taskUnderstanding?.evidence || "能理解基础要求，但复杂条件下还需观察。"), tone: "green" as const },
    { label: "检查习惯", value: cleanTeacherText(selfCheck?.evidence || "检查习惯需要结合后续材料继续观察。"), tone: "orange" as const },
    { label: "表达稳定", value: cleanTeacherText(expression?.evidence || "表达完整性仍是本次反馈的重点。"), tone: "blue" as const }
  ];
}

function buildSubjectAbilityItems(report: LearningEvidenceReport) {
  const labels = new Set(["核心知识/概念", "方法过程", "表达呈现", "迁移应用"]);
  return report.ability_profile
    .filter((item) => labels.has(item.label))
    .map((item) => ({
      title: item.label,
      text: `${cleanTeacherText(item.evidence)} 反馈：${toFeedbackPhrase(item.next_focus)}`
    }));
}

function buildUsedEvidence(report: LearningEvidenceReport) {
  const evidence = [
    ...report.key_evidence_cards.map((item) => item.title),
    ...report.problem_pattern_clusters.flatMap((item) => item.evidence)
  ]
    .map(cleanTeacherText)
    .filter(Boolean)
    .slice(0, 6);
  return evidence.join("、") || "本次可见学习材料与老师补充记录。";
}

function getParentFeedbackText(task: TaskCard, report: LearningEvidenceReport) {
  const result = task.currentOutput?.structured_result ?? task.structuredResult;
  const text = result && typeof result.parent_summary === "string" ? result.parent_summary : report.parent_readable_summary;
  return text || report.overview_judgement.current_performance;
}

function formatConfidence(value: string) {
  if (value === "high") return "较高";
  if (value === "medium") return "中等";
  if (value === "low") return "较低";
  return "待观察";
}

function formatPriority(priority: 1 | 2 | 3) {
  if (priority === 1) return "优先处理";
  if (priority === 2) return "继续巩固";
  return "后续观察";
}

function getPriorityTone(priority: 1 | 2 | 3): ReportTone {
  if (priority === 1) return "orange";
  if (priority === 2) return "blue";
  return "gray";
}

function formatAbilityScore(level: LearningEvidenceReport["ability_profile"][number]["level"]) {
  if (level === "strong") return 92;
  if (level === "stable") return 86;
  if (level === "developing") return 78;
  return 70;
}

function formatAbilityLevel(level: LearningEvidenceReport["ability_profile"][number]["level"]) {
  if (level === "strong") return "优势";
  if (level === "stable") return "稳定";
  if (level === "developing") return "需巩固";
  return "需关注";
}

function getAbilityTone(level: LearningEvidenceReport["ability_profile"][number]["level"]): ReportTone {
  if (level === "strong" || level === "stable") return "green";
  if (level === "developing") return "orange";
  return "red";
}

function toFeedbackPhrase(value: string) {
  const text = cleanTeacherText(value);
  if (!text) return "建议结合后续材料继续观察。";
  if (text.startsWith("建议") || text.startsWith("反馈")) return text;
  return `建议关注${text.replace(/^先/u, "").replace(/^继续/u, "")}`;
}

function cleanTeacherText(value: string) {
  return value
    .replace(/VisionEvidencePacket|evidenceRefs|bbox|crop_ref|DeepSeek|OCR Provider/giu, "材料证据")
    .replace(/mock/giu, "当前")
    .replace(/AI\s*/giu, "系统")
    .replace(/老师审核/gu, "老师确认")
    .replace(/待老师确认/gu, "待入档")
    .replace(/入库/gu, "入档")
    .replace(/任务目标/gu, "材料要求")
    .replace(/任务/gu, "要求")
    .replace(/执行/g, "落实")
    .replace(/短周期跟进计划/g, "近期巩固方向")
    .replace(/7\s*天|3\s*天|D1|D2/giu, "")
    .replace(/未使用真实系统或真实数据库。?/gu, "")
    .trim();
}

function getTonePill(tone: ReportTone) {
  if (tone === "green") return "bg-[#dcfce7] text-[#15803d]";
  if (tone === "blue") return "bg-[#dbeafe] text-[#1d4ed8]";
  if (tone === "orange") return "bg-[#fef3c7] text-[#92400e]";
  if (tone === "red") return "bg-[#fee2e2] text-[#b91c1c]";
  return "bg-[#f3f4f5] text-[#5c665f]";
}

function getToneText(tone: ReportTone) {
  if (tone === "green") return "text-[#15803d]";
  if (tone === "blue") return "text-[#1d4ed8]";
  if (tone === "orange") return "text-[#92400e]";
  if (tone === "red") return "text-[#b91c1c]";
  return "text-[#191c1d]";
}

function getToneSurface(tone: ReportTone) {
  if (tone === "green") return "bg-[#edf8f1]";
  if (tone === "blue") return "bg-[#eef6ff]";
  if (tone === "orange") return "bg-[#fff7ed]";
  if (tone === "red") return "bg-[#fef2f2]";
  return "bg-[#f6f8f7]";
}

function getToneDot(tone: ReportTone) {
  if (tone === "green") return "bg-[#22c55e]";
  if (tone === "blue") return "bg-[#3b82f6]";
  if (tone === "orange") return "bg-[#f59e0b]";
  if (tone === "red") return "bg-[#ef4444]";
  return "bg-[#c2c8c3]";
}
