"use client";

import { Camera, FileText, Home, Settings, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "今日", icon: Home },
  { href: "/classes", label: "班级", icon: UsersRound },
  { href: "/grading", label: "AI 批改", icon: Camera },
  { href: "/reports", label: "报告", icon: FileText },
  { href: "/settings", label: "我的", icon: Settings }
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[22px] border border-white/80 bg-white/90 px-1.5 py-1.5 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-0.5 rounded-[16px] text-[11px] font-semibold transition",
                active ? "bg-[#DCFCE7] text-[#16A34A]" : "text-[#9CA3AF] hover:bg-[#F8FAF9] hover:text-[#111827]"
              )}
            >
              <Icon size={17} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
