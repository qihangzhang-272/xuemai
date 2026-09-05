import type React from "react";
import { Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  StudentLearningMaterialQuestionReportRow,
  StudentLearningMaterialTeacherReportResult
} from "@/src/skills/student-learning-material-analyzer/user-facing-result";
import { skillActionLabels } from "@/src/skills/actions";
import {
  getStudentLearningMaterialUserFacingResult,
  getStudentLearningMaterialUserResultActions
} from "./learning-material-user-result-view";
import type { SkillAction, TaskCard } from "./types";

type LearningMaterialUserResultPanelProps = {
  task: TaskCard;
  onAction?: (task: TaskCard, action: SkillAction) => void;
};

export function LearningMaterialUserResultPanel({ task, onAction }: LearningMaterialUserResultPanelProps) {
  const result = getStudentLearningMaterialUserFacingResult(task);

  if (!result) {
    return (
      <div className="space-y-3">
        <ResultTopBar title="学情报告" subtitle="当前卡片缺少最终结果对象" status="需补充材料" />
        <section className="rounded-[18px] bg-white px-4 py-4">
          <p className="text-[13px] font-semibold leading-6 text-[#5c665f]">这张卡片还没有可展示的老师报告、家长反馈和月报结果。请先重新生成学习材料分析结果。</p>
        </section>
      </div>
    );
  }

  const report = result.teacher_report;
  const actions = getStudentLearningMaterialUserResultActions(task);
  const status = buildDisplayStatus(task, report);

  return (
    <div className="space-y-3 pb-4">
      <ResultTopBar title="学情报告" subtitle={`${task.targetName}｜${report.material_summary}`} status={status.label} tone={status.tone} onExport={() => window.print()} />

      <section className="rounded-[22px] bg-white px-4 py-4">
        <p className="text-[11px] font-black text-[#22c55e]">专业测评型报告</p>
        <h3 className="mt-1 text-[18px] font-black leading-6 text-[#191c1d]">{report.title}</h3>
        <p className="mt-2 text-[12px] font-semibold leading-5 text-[#6b746d]">{report.material_summary}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Metric label="数据可信度" value={formatCredibility(report.data_credibility.level)} description={report.data_credibility.summary} tone={getCredibilityTone(report.data_credibility.level)} />
          <Metric label="需复核题目" value={`${report.data_credibility.review_required_count} 道`} description="证据不足、低置信或需要老师确认的题目会在逐题分析中标出。" tone={report.data_credibility.review_required_count ? "orange" : "green"} />
          <Metric label="家长反馈" value={formatParentFeedbackStatus(result.parent_feedback.status)} description={result.parent_feedback.copyable ? "当前反馈可复制，仍需老师确认后发送。" : "当前反馈需要老师复核后再使用。"} tone={result.parent_feedback.copyable ? "green" : "orange"} />
        </div>
      </section>

      <ResultSection title="结论总览">
        <div className="space-y-2">
          {report.conclusion_sections.map((section) => (
            <section key={section.title} className="rounded-[16px] bg-[#f8faf9] px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[13px] font-black text-[#191c1d]">{section.title}</h4>
                <SourceLabels sourceIds={section.source_ids} />
              </div>
              <p className="mt-2 text-[12px] font-semibold leading-6 text-[#4e5c52]">{section.body}</p>
            </section>
          ))}
        </div>
      </ResultSection>

      <ResultSection title="逐题分析">
        <div className="space-y-2">
          {report.question_rows.map((row) => (
            <QuestionRow key={row.question_id} row={row} />
          ))}
        </div>
      </ResultSection>

      <ResultSection title={report.monthly_note.title}>
        <div className="rounded-[16px] bg-[#fff9f0] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-black text-[#191c1d]">{result.monthly_result.month} 月报素材</p>
            <SourceLabels sourceIds={result.monthly_result.source_ids} />
          </div>
          <p className="mt-2 text-[12px] font-semibold leading-6 text-[#4e5c52]">{result.monthly_result.current_month_summary}</p>
          <p className="mt-2 text-[12px] font-semibold leading-6 text-[#92400e]">{result.monthly_result.comparison_to_previous_month}</p>
          <p className="mt-2 text-[12px] font-black leading-5 text-[#15803d]">下月优先：{result.monthly_result.first_priority_action}</p>
        </div>
      </ResultSection>

      <ResultSection title="家长反馈评语">
        <div className="rounded-[16px] bg-[#f7f8f7] px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", result.parent_feedback.copyable ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fef3c7] text-[#92400e]")}>
              {result.parent_feedback.copyable ? "可复制草稿" : "需老师复核"}
            </span>
            <button type="button" onClick={() => onAction?.(task, "copy_feedback")} className="inline-flex h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-black text-[#15803d] transition hover:bg-[#edf8f1]">
              <Copy size={13} />
              复制反馈
            </button>
          </div>
          <p className="whitespace-pre-wrap text-[13px] font-semibold leading-7 text-[#26312a]">{result.parent_feedback.text}</p>
          {result.parent_feedback.warnings.length ? <p className="mt-2 text-[11px] font-bold leading-5 text-[#92400e]">提示：{result.parent_feedback.warnings.join("；")}</p> : null}
        </div>
      </ResultSection>

      <ResultSection title="可做操作">
        <div className="flex flex-wrap gap-1.5">
          {actions.map((action) => (
            <button key={action} type="button" onClick={() => onAction?.(task, action)} className={cn("inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition", action === "archive" ? "bg-[#22c55e] text-white hover:bg-[#16a34a]" : "bg-[#f3f4f5] text-[#3d4a3d] hover:bg-[#e7e8e9]")}>
              {skillActionLabels[action]}
            </button>
          ))}
        </div>
      </ResultSection>

      <ResultSection title="来源与边界">
        <div className="space-y-2">
          <BoundaryLine label="来源标签" value={report.source_map.map((source) => source.source_id).join("、") || "待老师复核"} />
          <BoundaryLine label="内部证据" value="内部证据引用已保留在 source_map 中，用户可见正文只显示来源标签。" />
          <BoundaryLine label="入档边界" value="AI 只生成草稿；老师确认入档后，才进入学生长期档案和月报素材池。" />
        </div>
      </ResultSection>
    </div>
  );
}

function QuestionRow({ row }: { row: StudentLearningMaterialQuestionReportRow }) {
  return (
    <article className="rounded-[16px] bg-[#f8faf9] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-black text-[#191c1d]">{row.question_number || row.question_id}｜{row.judgement}</h4>
        <StatusPill label={row.needs_teacher_review ? "需复核" : "可参考"} tone={row.needs_teacher_review ? "orange" : "green"} />
      </div>
      <p className="mt-2 text-[12px] font-semibold leading-6 text-[#4e5c52]">{row.basis}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-[#6b746d]">知识点：{row.knowledge_points.join("、") || "待补充"}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-[#6b746d]">错因：{row.mistake_diagnosis.join("、") || "暂无稳定错因"}</p>
      <p className="mt-1 text-[12px] font-bold leading-5 text-[#15803d]">下一步：{row.next_action}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#8a948d]">置信度 {Math.round(row.confidence * 100)}%</span>
        <SourceLabels sourceIds={row.source_ids} />
      </div>
    </article>
  );
}

function ResultTopBar({ title, subtitle, status, tone = "gray", onExport }: { title: string; subtitle: string; status: string; tone?: Tone; onExport?: () => void }) {
  return (
    <section className="rounded-[22px] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-black tracking-tight text-[#191c1d]">{title}</h3>
          <p className="mt-1 truncate text-[12px] font-semibold text-[#737d76]">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onExport ? (
            <button type="button" onClick={onExport} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#f2f5f3] px-2.5 text-[11px] font-black text-[#3d4a3d] transition hover:bg-[#e5ebe7]">
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

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
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

function Metric({ label, value, description, tone = "green" }: { label: string; value: string; description: string; tone?: Tone }) {
  return (
    <div className={cn("rounded-[18px] px-3 py-3", getToneSurface(tone))}>
      <p className="text-[11px] font-black text-[#737d76]">{label}</p>
      <p className={cn("mt-1 text-[20px] font-black leading-6", getToneText(tone))}>{value}</p>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#5c665f]">{description}</p>
    </div>
  );
}

function BoundaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[#f7f8f7] px-3 py-2">
      <p className="text-[12px] font-black text-[#191c1d]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold leading-5 text-[#5c665f]">{value}</p>
    </div>
  );
}

function SourceLabels({ sourceIds }: { sourceIds: string[] }) {
  if (!sourceIds.length) {
    return <span className="shrink-0 rounded-full bg-[#f3f4f5] px-2 py-0.5 text-[10px] font-black text-[#8a948d]">来源待复核</span>;
  }
  return <span className="shrink-0 rounded-full bg-[#edf8f1] px-2 py-0.5 text-[10px] font-black text-[#15803d]">来源 {sourceIds.slice(0, 3).join("、")}</span>;
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black", getTonePill(tone))}>{label}</span>;
}

type Tone = "green" | "blue" | "orange" | "red" | "gray" | "muted";

function buildDisplayStatus(task: TaskCard, report: StudentLearningMaterialTeacherReportResult): { label: string; tone: Tone } {
  if (task.status === "archived") return { label: "已入档", tone: "green" };
  if (task.status === "feedback_done") return { label: "已反馈", tone: "green" };
  if (task.status === "copied") return { label: "待反馈", tone: "blue" };
  if (report.status === "needs_teacher_review") return { label: "需补充材料", tone: "orange" };
  return { label: "待入档", tone: "gray" };
}

function formatCredibility(level: "high" | "medium" | "low") {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "低";
}

function getCredibilityTone(level: "high" | "medium" | "low"): Tone {
  if (level === "high") return "green";
  if (level === "medium") return "blue";
  return "orange";
}

function formatParentFeedbackStatus(status: "draft" | "blocked" | "needs_teacher_review") {
  if (status === "draft") return "草稿";
  if (status === "blocked") return "已阻断";
  return "需复核";
}

function getToneSurface(tone: Tone) {
  if (tone === "green") return "bg-[#edf8f1]";
  if (tone === "blue") return "bg-[#eff6ff]";
  if (tone === "orange") return "bg-[#fff7ed]";
  if (tone === "red") return "bg-[#fef2f2]";
  return "bg-[#f7f8f7]";
}

function getToneText(tone: Tone) {
  if (tone === "green") return "text-[#15803d]";
  if (tone === "blue") return "text-[#1d4ed8]";
  if (tone === "orange") return "text-[#c2410c]";
  if (tone === "red") return "text-[#b91c1c]";
  return "text-[#3d4a3d]";
}

function getTonePill(tone: Tone) {
  if (tone === "green") return "bg-[#dcfce7] text-[#15803d]";
  if (tone === "blue") return "bg-[#dbeafe] text-[#1d4ed8]";
  if (tone === "orange") return "bg-[#ffedd5] text-[#c2410c]";
  if (tone === "red") return "bg-[#fee2e2] text-[#b91c1c]";
  return "bg-[#f3f4f5] text-[#3d4a3d]";
}
