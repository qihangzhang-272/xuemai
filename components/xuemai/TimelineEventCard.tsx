import { Copy, Eye } from "lucide-react";
import type { TimelineItem } from "@/lib/mock/xuemai-types";
import { cn } from "@/lib/utils";

const typeStyles: Record<TimelineItem["type"], string> = {
  feedback: "bg-[#DCFCE7] text-[#166534]",
  mistake: "bg-[#FEF2F2] text-[#DC2626]",
  report: "bg-[#EFF6FF] text-[#1D4ED8]",
  profile_update: "bg-[#F0FDF4] text-[#15803D]",
  class_insight: "bg-[#FFF7ED] text-[#C2410C]",
  teaching_suggestion: "bg-[#DCFCE7] text-[#166534]"
};

export function TimelineEventCard({
  item,
  isLatest,
  onViewDetail,
  onCopy
}: {
  item: TimelineItem;
  isLatest?: boolean;
  onViewDetail: () => void;
  onCopy?: () => void;
}) {
  return (
    <article className="relative grid grid-cols-[18px_1fr] gap-2.5">
      <div className="relative flex justify-center">
        <span className={cn("mt-6 h-3 w-3 rounded-full border-[3px] border-white shadow-sm", isLatest ? "bg-[#16A34A]" : "bg-[#D1D5DB]")} />
        <span className="absolute bottom-[-14px] top-9 w-px bg-[#E5E7EB]" />
      </div>

      <div className="rounded-[20px] border border-[var(--app-line)] bg-white p-4 shadow-[var(--app-shadow-sm)]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", typeStyles[item.type])}>{item.tags[0] ?? item.title}</span>
            <h3 className="mt-2 text-[15px] font-bold text-[#111827]">{item.title}</h3>
          </div>
          <time className="shrink-0 text-xs font-medium text-[var(--app-text-muted)]">{item.displayTime}</time>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--app-text-muted)]">{item.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onViewDetail}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 text-xs font-semibold text-[#166534] transition hover:bg-[#BBF7D0]"
          >
            <Eye size={14} />
            查看详情
          </button>
          {item.copyable ? (
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB]"
              aria-label={`复制${item.title}`}
            >
              <Copy size={14} />
            </button>
          ) : null}
          {item.status === "sent" ? <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold text-[#15803D]">已发送</span> : null}
        </div>
      </div>
    </article>
  );
}
