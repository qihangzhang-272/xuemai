"use client";

import { BookOpenCheck, ChevronDown, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/layout/BackButton";

const topLevelRoutes = new Set(["/dashboard", "/classes", "/students", "/reports", "/settings", "/tasks", "/resources", "/feedback/batch", "/mistakes", "/grading"]);

function getPageLabel(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "今日";
  if (pathname.startsWith("/classes")) return "班级";
  if (pathname.startsWith("/students")) return "学生档案";
  if (pathname.startsWith("/feedback")) return "AI 反馈";
  if (pathname.startsWith("/grading")) return "AI 批改";
  if (pathname.startsWith("/mistakes")) return "AI 错题";
  if (pathname.startsWith("/reports")) return "月度报告";
  if (pathname.startsWith("/tasks")) return "任务记录";
  if (pathname.startsWith("/resources")) return "素材库";
  if (pathname.startsWith("/settings")) return "我的";
  return "学脉 AI";
}

export function Topbar() {
  const pathname = usePathname();
  const showBack = !topLevelRoutes.has(pathname);
  const showClassControls = pathname === "/classes";
  const showAiStatus = pathname === "/dashboard" || pathname === "/classes" || pathname.endsWith("/feedback/new");
  const pageLabel = getPageLabel(pathname);
  const MobileIcon = pathname.startsWith("/dashboard") ? LayoutDashboard : BookOpenCheck;

  return (
    <header className="sticky top-0 z-10 bg-transparent">
      <div className="grid min-h-12 items-center gap-2 px-4 pt-3 md:grid-cols-[auto_1fr_auto] md:px-5 md:pt-2.5">
        <div className="flex items-center justify-between gap-3 md:justify-start">
          {showBack ? <BackButton /> : null}
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-zinc-950 md:hidden">
            <MobileIcon size={18} />
            {pageLabel}
          </Link>
        </div>

        {showClassControls ? (
          <div className="hidden items-center justify-center gap-3 md:flex">
            <div className="flex h-9 w-fit min-w-[132px] items-center justify-center gap-1.5 rounded-[14px] bg-[#f1efeb] px-3 text-base font-semibold tracking-tight text-[#191919] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              初二 5 班
              <ChevronDown size={16} className="text-[var(--app-text-muted)]" />
            </div>
            <div className="rounded-full border border-[var(--app-line-strong)] bg-white/70 p-1 shadow-[var(--app-shadow-sm)]">
              <span className="flex h-8 w-[104px] items-center justify-center rounded-full bg-[#22201e] text-xs font-medium text-white shadow-[0_10px_22px_rgba(0,0,0,0.18)]">
                班级空间
              </span>
            </div>
          </div>
        ) : (
          <div className="hidden text-center text-sm text-[var(--app-text-muted)] md:block">{pageLabel}</div>
        )}

        <div className="flex justify-end">
          {showAiStatus ? (
            <div className="hidden h-8 items-center rounded-full border border-[var(--app-line-strong)] bg-white/70 px-3 text-xs text-[var(--app-text-muted)] md:flex">
              <span className="mr-2 h-2 w-2 rounded-full bg-[var(--app-green)]" />
              AI 已连接
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between rounded-full bg-white/70 px-3 py-2 md:hidden">
          <span className="text-sm font-medium text-[#191919]">{showClassControls ? "班级空间" : pageLabel}</span>
          {showAiStatus ? (
            <span className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--app-green)]" />
              AI 已连接
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
