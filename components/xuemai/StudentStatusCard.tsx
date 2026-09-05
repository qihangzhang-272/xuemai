import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import type { StudentStatus, XuemaiStudent } from "@/lib/mock/xuemai-types";

const statusStyles: Record<StudentStatus, string> = {
  stable: "bg-[#F3F4F6] text-[#4B5563]",
  needs_attention: "bg-[#FEF2F2] text-[#DC2626]",
  improving: "bg-[#E0F2FE] text-[#0369A1]",
  excellent: "bg-[#DCFCE7] text-[#166534]"
};

export function StudentStatusCard({ student }: { student: XuemaiStudent }) {
  const isAttention = student.status === "needs_attention";
  const Icon = isAttention ? AlertCircle : student.status === "improving" ? TrendingUp : CheckCircle2;

  return (
    <section className="rounded-[24px] border border-[var(--app-line)] bg-white p-4 shadow-[var(--app-shadow-sm)] md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--app-text-muted)]">{student.grade} · {student.subject} · {student.className}</p>
          <h2 className="mt-1 text-[22px] font-bold tracking-tight text-[#111827]">{student.name}</h2>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[student.status]}`}>
          <Icon size={14} />
          当前状态：{student.statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
        <div className="rounded-[18px] bg-[var(--app-panel-soft)] p-3">
          <p className="text-xs font-medium text-[var(--app-text-soft)]">最近问题</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#111827]">{student.latestIssueSummary}</p>
        </div>
        <div className="rounded-[18px] bg-[#F8FAFC] px-3 py-2 text-xs text-[var(--app-text-muted)]">
          最近更新：<span className="font-semibold text-[#111827]">{student.lastUpdatedAt}</span>
        </div>
      </div>
    </section>
  );
}
