import type { ReactNode } from "react";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-0 pb-20 text-[var(--app-text)] md:p-3 md:pb-3">
      <Sidebar />
      <div className="md:pl-[210px]">
        <section className="relative min-h-screen overflow-hidden bg-[rgba(255,255,252,0.84)] md:min-h-[calc(100vh-1.5rem)] md:rounded-[24px] md:border md:border-white/75 md:shadow-[var(--app-shadow-md)] md:backdrop-blur-3xl">
          <Topbar />
          <main className="mx-auto w-full max-w-7xl px-4 pb-5 pt-2 md:px-5 md:pb-6 md:pt-4">{children}</main>
        </section>
      </div>
      <BottomTabBar />
    </div>
  );
}
