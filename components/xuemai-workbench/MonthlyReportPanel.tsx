import type React from "react";
import { CalendarDays, CheckCircle2, Copy, Download, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassMonthlyReport, StudentMonthlyReport } from "@/src/skills/monthly-report";
import { createMockMonthlyReport } from "@/src/skills/monthly-report";
import type { Conversation, TaskCard } from "./types";
import { getMonthlyReport } from "./monthly-report-view";
import { normalizeSubjectText } from "./subject-utils";

type MonthlyReportPanelProps = {
  conversation: Conversation;
  task?: TaskCard;
  classMembers?: Conversation[];
};

export function MonthlyReportPanel({ conversation, task, classMembers = [] }: MonthlyReportPanelProps) {
  const report =
    getMonthlyReport(task) ??
    createMockMonthlyReport({
      scope: conversation.kind === "class" ? "class" : "student",
      subjectName: conversation.name,
      subjectArea: conversation.subject,
      inputSummary: conversation.summary
    });
  const subjectLabel = normalizeSubjectText(task?.subject ?? conversation.subject, report.subject_area);

  return report.report_type === "class" ? <ClassMonthlyReportView report={report} classMembers={classMembers} subjectLabel={subjectLabel} /> : <StudentMonthlyReportView report={report} subjectLabel={subjectLabel} />;
}

function StudentMonthlyReportView({ report, subjectLabel }: { report: StudentMonthlyReport; subjectLabel: string }) {
  return (
    <div className="space-y-3 pb-4">
      <MonthlyReportHeader title="学生月报" subtitle={`${report.student_name}｜${subjectLabel}｜${report.month_label}`} status={report.readiness.label} />

      <section className="rounded-[22px] bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black text-[#22c55e]">老师速读</p>
            <h2 className="mt-1 text-[18px] font-black leading-6 text-[#191c1d]">{report.teacher_summary.current_status}</h2>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#5c665f]">{report.teacher_summary.next_month_focus}</p>
          </div>
          <ReadinessPill confidence={report.readiness.confidence_level} />
        </div>
      </section>

      <ReportSection title="本月结论">
        <div className="grid gap-2">
          <Signal title="主要进步" text={report.teacher_summary.main_progress} tone="green" />
          <Signal title="主要问题" text={report.teacher_summary.main_issue} tone="orange" />
          <Signal title="下月重点" text={report.teacher_summary.next_month_focus} tone="green" />
        </div>
      </ReportSection>

      <ReportSection title="能力与习惯变化">
        <div className="grid gap-2">
          {report.growth_signals.map((signal) => (
            <GrowthSignal key={signal.dimension} signal={signal} />
          ))}
        </div>
      </ReportSection>

      <ReportSection title="下月跟进安排">
        <NumberedList items={report.next_month_plan} />
      </ReportSection>

      <ReportSection title="家长可读月报">
        <div className="rounded-[18px] bg-[#f2faf5] px-3 py-3">
          <p className="whitespace-pre-wrap text-[13px] font-semibold leading-7 text-[#26312a]">{report.parent_message}</p>
          <button type="button" onClick={() => void navigator.clipboard?.writeText(report.parent_message)} className="mt-3 inline-flex h-8 items-center gap-1 rounded-full bg-[#22c55e] px-3 text-[12px] font-black text-white transition hover:bg-[#16a34a]">
            <Copy size={13} />
            复制家长版
          </button>
        </div>
      </ReportSection>

    </div>
  );
}

function ClassMonthlyReportView({ report, classMembers, subjectLabel }: { report: ClassMonthlyReport; classMembers: Conversation[]; subjectLabel: string }) {
  const memberNames = classMembers.map((member) => member.name).filter(Boolean);
  const memberCount = memberNames.length;
  const commonWeaknesses = report.common_weaknesses.map((weakness, index) => ({
    ...weakness,
    affected_students: clampAffectedStudents(weakness.affected_students, memberCount, index)
  }));
  const studentSegments = getClassStudentSegments(report.student_segments, memberNames);

  return (
    <div className="space-y-3 pb-4">
      <MonthlyReportHeader title="班级月报" subtitle={`${report.class_name}｜${subjectLabel}｜${report.month_label}`} status={report.readiness.label} teacherOnly />

      <section className="rounded-[22px] bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black text-[#22c55e]">老师复盘</p>
            <h2 className="mt-1 text-[18px] font-black leading-6 text-[#191c1d]">{report.teacher_overview.class_status}</h2>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#5c665f]">{report.teacher_overview.teaching_rhythm}</p>
          </div>
          <ReadinessPill confidence={report.readiness.confidence_level} />
        </div>
      </section>

      <ReportSection title="本月班级判断">
        <div className="grid gap-2">
          <Signal title="共性卡点" text={report.teacher_overview.main_common_issue} tone="orange" />
          <Signal title="下月优先级" text={report.teacher_overview.next_month_priority} tone="green" />
        </div>
      </ReportSection>

      <ReportSection title="共性薄弱点">
        <div className="space-y-2">
          {commonWeaknesses.map((weakness) => (
            <div key={weakness.topic} className="rounded-[18px] bg-[#f8faf9] px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-black text-[#191c1d]">{weakness.topic}</h3>
                <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[11px] font-black text-[#c2410c]">{weakness.affected_students} 人相关</span>
              </div>
              <p className="mt-2 text-[12px] font-semibold leading-5 text-[#5c665f]">依据：{weakness.evidence}</p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#15803d]">教学动作：{weakness.teaching_response}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="学生分层跟进">
        <div className="grid gap-2">
          {studentSegments.map((segment) => (
            <div key={segment.label} className="rounded-[18px] bg-[#f8faf9] px-3 py-3">
              <h3 className="text-[13px] font-black text-[#191c1d]">{segment.label}</h3>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#5c665f]">{segment.students.join("、")}</p>
              <p className="mt-2 text-[12px] font-semibold leading-5 text-[#15803d]">老师动作：{segment.teacher_action}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection title="下月班课安排">
        <div className="space-y-2">
          {report.next_month_teaching_plan.map((item) => (
            <div key={item.layer} className="rounded-[18px] bg-[#f2faf5] px-3 py-3">
              <p className="text-[13px] font-black text-[#191c1d]">{item.layer}｜{item.goal}</p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#15803d]">{item.action}</p>
            </div>
          ))}
        </div>
      </ReportSection>

    </div>
  );
}

function clampAffectedStudents(count: number, memberCount: number, index: number) {
  if (!memberCount) return count;
  if (memberCount === 1) return 1;
  return index === 0 ? memberCount : Math.max(1, memberCount - 1);
}

function getClassStudentSegments(segments: ClassMonthlyReport["student_segments"], memberNames: string[]) {
  if (!memberNames.length) return segments;

  const [firstName, secondName, ...restNames] = memberNames;
  const normalizedSegments: ClassMonthlyReport["student_segments"] = [];

  if (firstName) {
    normalizedSegments.push({
      label: "稳定推进",
      students: [firstName],
      teacher_action: "保持当前训练节奏，月报里记录稳定进步和下一步挑战。"
    });
  }

  if (secondName || restNames.length) {
    normalizedSegments.push({
      label: "需要跟进",
      students: [secondName, ...restNames].filter(Boolean),
      teacher_action: "优先补齐个人反馈和错题证据，下月班课中安排针对性观察。"
    });
  }

  return normalizedSegments;
}

function MonthlyReportHeader({ title, subtitle, status, teacherOnly = false }: { title: string; subtitle: string; status: string; teacherOnly?: boolean }) {
  return (
    <section className="rounded-[22px] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black text-[#22c55e]">{teacherOnly ? "老师内部复盘" : "家长可读草稿"}</p>
          <h1 className="mt-1 truncate text-[19px] font-black tracking-tight text-[#191c1d]">{title}</h1>
          <p className="mt-1 truncate text-[12px] font-semibold text-[#737d76]">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#f2f5f3] px-2.5 text-[11px] font-black text-[#3d4a3d] transition hover:bg-[#e5ebe7]">
            <Download size={13} />
            导出
          </button>
          <StatusBadge label={status} tone="orange" />
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
        <h2 className="text-[14px] font-black text-[#191c1d]">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Signal({ title, text, tone }: { title: string; text: string; tone: "green" | "orange" | "muted" }) {
  return (
    <div className={cn("flex gap-2 rounded-[16px] px-3 py-2.5", tone === "green" ? "bg-[#edf8f1]" : tone === "orange" ? "bg-[#fff7ed]" : "bg-[#f6f8f7]")}>
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", tone === "green" ? "bg-[#22c55e]" : tone === "orange" ? "bg-[#f59e0b]" : "bg-[#c2c8c3]")} />
      <div>
        <p className="text-[12px] font-black text-[#191c1d]">{title}</p>
        <p className="mt-0.5 text-[12px] font-semibold leading-5 text-[#5c665f]">{text}</p>
      </div>
    </div>
  );
}

function GrowthSignal({ signal }: { signal: StudentMonthlyReport["growth_signals"][number] }) {
  const tone = signal.status === "watch" ? "orange" : "green";
  return (
    <div className="rounded-[18px] bg-[#f8faf9] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-black text-[#191c1d]">{signal.dimension}</h3>
        <StatusBadge label={formatSignalStatus(signal.status)} tone={tone} />
      </div>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#5c665f]">依据：{signal.evidence}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5 text-[#15803d]">下步：{signal.next_action}</p>
    </div>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item} className="flex gap-2 rounded-[16px] bg-[#f8faf9] px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-[11px] font-black text-white">{index + 1}</span>
          <p className="text-[12px] font-semibold leading-5 text-[#26312a]">{item}</p>
        </div>
      ))}
    </div>
  );
}

function ReadinessPill({ confidence }: { confidence: "high" | "medium" | "low" }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-[#f2faf5] px-2.5 py-1 text-[11px] font-black text-[#15803d]">
      {confidence === "high" ? <CheckCircle2 size={13} /> : confidence === "medium" ? <CalendarDays size={13} /> : <UsersRound size={13} />}
      {confidence === "high" ? "依据充足" : confidence === "medium" ? "可核对" : "需补充"}
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "green" | "orange" | "muted" }) {
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black", tone === "green" ? "bg-[#dcfce7] text-[#15803d]" : tone === "orange" ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#f3f4f5] text-[#5c665f]")}>{label}</span>;
}

function formatSignalStatus(status: StudentMonthlyReport["growth_signals"][number]["status"]) {
  if (status === "stable") return "稳定";
  if (status === "improving") return "有进步";
  return "需关注";
}
