import { TimelineEventCard } from "@/components/xuemai/TimelineEventCard";
import type { TimelineItem } from "@/lib/mock/xuemai-types";

export function ClassTimeline({
  items,
  onViewDetail
}: {
  items: TimelineItem[];
  onViewDetail: (item: TimelineItem) => void;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--app-line)] bg-white p-5 shadow-[var(--app-shadow-sm)] md:p-6">
      <h2 className="text-xl font-semibold text-[#111827]">班级时间轴</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">学生事件会同步沉淀为班级层面的共性问题和教学建议。</p>
      <div className="mt-6 space-y-5">
        {items.length ? (
          items.map((item, index) => (
            <TimelineEventCard
              key={item.id}
              item={item}
              isLatest={index === 0}
              onViewDetail={() => onViewDetail(item)}
            />
          ))
        ) : (
          <div className="rounded-[22px] bg-[var(--app-panel-soft)] p-6 text-center text-sm leading-6 text-[var(--app-text-muted)]">
            暂无班级洞察。进入王一路学生档案并点击“模拟批改完成”后，这里会同步出现班级共性问题。
          </div>
        )}
      </div>
    </section>
  );
}
