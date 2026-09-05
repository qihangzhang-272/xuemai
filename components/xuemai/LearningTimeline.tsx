import { TimelineEventCard } from "@/components/xuemai/TimelineEventCard";
import { TimelineFilterTabs } from "@/components/xuemai/TimelineFilterTabs";
import type { TimelineFilter, TimelineItem } from "@/lib/mock/xuemai-types";

export function LearningTimeline({
  items,
  activeFilter,
  onFilterChange,
  onViewDetail,
  onCopy
}: {
  items: TimelineItem[];
  activeFilter: TimelineFilter;
  onFilterChange: (filter: TimelineFilter) => void;
  onViewDetail: (item: TimelineItem) => void;
  onCopy: (item: TimelineItem) => void;
}) {
  const filteredItems = activeFilter === "all" ? items : items.filter((item) => item.type === activeFilter);

  return (
    <section className="rounded-[24px] border border-[var(--app-line)] bg-white p-4 shadow-[var(--app-shadow-sm)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">学情时间轴</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">反馈、错题、报告和画像更新沉淀在这里。</p>
        </div>
        <TimelineFilterTabs activeFilter={activeFilter} onFilterChange={onFilterChange} />
      </div>

      <div className="mt-4 space-y-3">
        {filteredItems.length ? (
          filteredItems.map((item, index) => (
            <TimelineEventCard
              key={item.id}
              item={item}
              isLatest={index === 0 && activeFilter === "all"}
              onViewDetail={() => onViewDetail(item)}
              onCopy={() => onCopy(item)}
            />
          ))
        ) : (
          <div className="rounded-[18px] bg-[var(--app-panel-soft)] p-4 text-center text-sm text-[var(--app-text-muted)]">
            当前筛选下还没有学情事件。
          </div>
        )}
      </div>
    </section>
  );
}
