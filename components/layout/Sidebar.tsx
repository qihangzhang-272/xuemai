"use client";

import { BookOpenCheck, Camera, FileText, LayoutDashboard, Settings, Sparkles, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "今日", icon: LayoutDashboard },
  { href: "/students", label: "学生档案", icon: UsersRound },
  { href: "/classes", label: "班级", icon: BookOpenCheck },
  { href: "/grading", label: "AI 批改", icon: Camera },
  { href: "/reports", label: "报告", icon: FileText },
  { href: "/settings", label: "我的", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const [showTaskModal, setShowTaskModal] = useState(false);

  return (
    <>
      <aside className="fixed bottom-3 left-3 top-3 hidden w-[190px] rounded-[24px] border border-white/75 bg-[rgba(255,255,252,0.88)] px-3 py-4 shadow-[var(--app-shadow-md)] backdrop-blur-3xl md:flex md:flex-col">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-[#111827] text-white">
            <Sparkles size={15} />
          </span>
          <span className="text-lg font-semibold tracking-tight text-[#111827]">学脉 AI</span>
        </Link>

        <button
          type="button"
          onClick={() => setShowTaskModal(true)}
          className="mt-5 flex h-9 items-center justify-center gap-1.5 rounded-[12px] bg-[#16A34A] px-3 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(22,163,74,0.18)] transition hover:bg-[#15803D]"
        >
          <Sparkles size={14} />
          记录教学事件
        </button>

        <nav className="mt-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-9 items-center gap-2 rounded-[12px] px-3 text-[13px] font-medium transition ${
                  active ? "bg-[#ECFDF3] text-[#166534]" : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                }`}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex h-[54px] items-center gap-2 rounded-[16px] bg-[#F3F4F6] p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827]">E</div>
          <div>
            <p className="text-[13px] font-semibold text-[#111827]">Eric 老师</p>
            <p className="mt-0.5 text-[11px] text-[#6B7280]">个体老师版</p>
          </div>
        </div>
      </aside>

      {showTaskModal ? (
        <div className="fixed inset-0 z-50 hidden items-center justify-center bg-black/20 px-5 backdrop-blur-sm md:flex">
          <div className="w-full max-w-md rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#16A34A]">教学事件</p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[#111827]">记录一次课后处理</h2>
                <p className="mt-1.5 text-[13px] leading-5 text-[#6B7280]">当前阶段先用演示流程，把批改、反馈和学情更新沉淀到学生档案。</p>
              </div>
              <button type="button" onClick={() => setShowTaskModal(false)} className="rounded-full p-2 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["事件类型", "课后反馈"],
                ["选择班级", "初二数学 A 班"],
                ["选择学生", "王一路、李明轩、张子涵等 8 人"],
                ["处理要求", "生成温和、具体、带鼓励的微信短反馈"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[16px] border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2.5">
                  <p className="text-xs text-[#6B7280]">{label}</p>
                  <p className="mt-1 text-sm font-medium text-[#111827]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowTaskModal(false)} className="h-9 rounded-[12px] px-3 text-sm font-medium text-[#6B7280] transition hover:bg-[#F3F4F6]">
                取消
              </button>
              <ButtonLink href="/tasks/demo-feedback-task" onClick={() => setShowTaskModal(false)}>
                开始处理
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
