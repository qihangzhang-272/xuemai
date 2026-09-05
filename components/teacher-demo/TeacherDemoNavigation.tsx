import { CalendarDays, MessageCircle, School, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoView, NavigationItem } from "./types";

const navigation: NavigationItem[] = [
  { id: "today", label: "今日", icon: CalendarDays },
  { id: "messages", label: "消息", icon: MessageCircle },
  { id: "students", label: "学生", icon: Users },
  { id: "classes", label: "班级", icon: School }
];

export function TeacherDemoNavigation({
  view,
  onChange,
  mobileOpen,
  onCloseMobile
}: {
  view: DemoView;
  onChange: (view: DemoView) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {mobileOpen ? <button aria-label="关闭导航" className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onCloseMobile} /> : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-[#191c1d]/[0.08] bg-white px-3 py-5 transition-transform lg:static lg:w-[84px] lg:translate-x-0 lg:items-center lg:px-2",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex w-full items-center justify-between px-2 lg:justify-center lg:px-0">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#22c55e] text-lg font-black text-white">脉</span>
            <span className="text-[18px] font-black text-[#191c1d] lg:hidden">学脉</span>
          </div>
          <button type="button" aria-label="关闭导航" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#f3f4f5] lg:hidden" onClick={onCloseMobile}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 flex w-full flex-1 flex-col gap-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.id === view;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  onCloseMobile();
                }}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-[14px] px-3 text-[14px] font-bold transition lg:min-h-[64px] lg:flex-col lg:justify-center lg:gap-1 lg:px-1 lg:text-[12px]",
                  active ? "bg-[#eefbf2] text-[#006e2f]" : "text-[#4b5563] hover:bg-[#f3f4f5] hover:text-[#191c1d]"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button type="button" className="flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left transition hover:bg-[#f3f4f5] lg:flex-col lg:gap-1 lg:px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcfce7] text-[13px] font-black text-[#006e2f]">李</span>
          <span className="text-[13px] font-bold text-[#3d4a3d] lg:text-[11px]">李老师</span>
        </button>
      </aside>
    </>
  );
}

export function TeacherDemoBottomNavigation({ view, onChange }: { view: DemoView; onChange: (view: DemoView) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t border-[#191c1d]/[0.08] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = item.id === view;
        return (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} className={cn("flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-bold", active ? "text-[#006e2f]" : "text-[#6b7280]")}>
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
