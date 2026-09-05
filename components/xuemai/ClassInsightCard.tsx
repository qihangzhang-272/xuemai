import { UsersRound } from "lucide-react";
import type { ClassInsight } from "@/lib/mock/xuemai-types";

export function ClassInsightCard({ insight }: { insight: ClassInsight }) {
  return (
    <article className="rounded-[28px] border border-[var(--app-line)] bg-white p-5 shadow-[var(--app-shadow-sm)] md:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-[#C2410C]">
          <UsersRound size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#16A34A]">班级洞察 / 教学建议</p>
              <h3 className="mt-2 text-lg font-semibold text-[#111827]">{insight.title}</h3>
            </div>
            <span className="text-sm text-[var(--app-text-muted)]">{insight.createdAt}</span>
          </div>
          <p className="mt-4 rounded-[22px] bg-[#FFF7ED] p-4 text-sm leading-7 text-[#9A3412]">{insight.summary}</p>
          <p className="mt-3 rounded-[22px] bg-[#F0FDF4] p-4 text-sm leading-7 text-[#166534]">{insight.teachingSuggestion}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {insight.affectedStudentNames.map((name) => (
              <span key={name} className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1.5 text-sm text-[#166534]">{name}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
