import type { TimelineFilter } from "@/lib/mock/xuemai-types";
import { cn } from "@/lib/utils";

const filters: { label: string; value: TimelineFilter }[] = [
  { label: "全部", value: "all" },
  { label: "反馈", value: "feedback" },
  { label: "错题", value: "mistake" },
  { label: "报告", value: "report" },
  { label: "更新", value: "profile_update" }
];

export function TimelineFilterTabs({
  activeFilter,
  onFilterChange
}: {
  activeFilter: TimelineFilter;
  onFilterChange: (filter: TimelineFilter) => void;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {filters.map((filter) => {
        const active = activeFilter === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
              active
                ? "border-[#16A34A] bg-[#16A34A] text-white shadow-[0_10px_20px_rgba(22,163,74,0.18)]"
                : "border-[var(--app-line-strong)] bg-white text-[var(--app-text-muted)] hover:bg-[#F0FDF4] hover:text-[#166534]"
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
