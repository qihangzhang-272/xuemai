"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  Archive,
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  ChevronRight,
  ClipboardPlus,
  FileText,
  GraduationCap,
  Home,
  Image,
  Layers3,
  LineChart,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Target,
  UsersRound,
  X
} from "lucide-react";
import { generateAiClassView } from "@/lib/mock/xuemai-ai-class";
import { getInitialXuemaiState, readXuemaiMockState } from "@/lib/mock/xuemai-workflows";
import type { GeneratedProfileTag, XuemaiMockState } from "@/lib/mock/xuemai-types";

const navItems = [
  { label: "首页", href: "/dashboard", icon: Home },
  { label: "学生档案", href: "/students", icon: Archive },
  { label: "班级空间", href: "/classes", icon: UsersRound, active: true },
  { label: "AI 批改", href: "/grading", icon: Bot },
  { label: "月度报告", href: "/reports", icon: BarChart3 },
  { label: "素材库", href: "/resources", icon: Boxes },
  { label: "设置中心", href: "/settings", icon: Settings }
];

const statusStyles = {
  risk: "bg-[#EF4444] text-white",
  behind: "bg-[#F59E0B] text-white",
  good: "bg-[#22C55E] text-white",
  stable: "bg-[#9CA3AF] text-white"
};

function Pill({ tag }: { tag: GeneratedProfileTag }) {
  const className =
    tag.tone === "red"
      ? "border-[#ffdad6]/70 bg-[#ffdad6]/18 text-[#ba1a1a]"
      : tag.tone === "neutral"
        ? "border-[#bccbb9]/35 bg-[#f3f4f0] text-[#3d4a3d]"
        : "border-[#22C55E]/20 bg-[#22C55E]/10 text-[#22C55E]";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>{tag.label}</span>;
}

function ProgressRow({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm font-medium">
        <span className="text-[#3d4a3d]">{label}</span>
        <span className="text-[#1a1c1a]">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e3df]">
        <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ClassInsightWorkspace() {
  const router = useRouter();
  const [state, setState] = useState<XuemaiMockState>(() => getInitialXuemaiState());
  const [activeFilter, setActiveFilter] = useState<"all" | "insight" | "feedback">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setState(readXuemaiMockState());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const classGroup = state.classGroup;
  const classView = useMemo(() => generateAiClassView(classGroup), [classGroup]);
  const filteredTimeline = activeFilter === "all" ? classView.timeline : classView.timeline.filter((item) => item.type === activeFilter);

  function showToast(message: string) {
    setToast(message);
  }

  function handleBack() {
    const referrer = document.referrer;
    const hasSameOriginReferrer = referrer ? new URL(referrer).origin === window.location.origin : false;

    if (hasSameOriginReferrer && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/classes");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9faf6] text-[#1a1c1a]">
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#bccbb9]/35 bg-[#f3f4f0] p-4 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22C55E] text-[#005321]">
            <GraduationCap size={23} fill="currentColor" />
          </span>
          <span>
            <strong className="block text-base leading-tight text-[#006e2f]">学脉 AI</strong>
            <span className="text-sm text-[#3d4a3d]">AI 助教工作台</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-2 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                  item.active ? "bg-[#e8e2d8] font-semibold text-[#4a463f]" : "text-[#3d4a3d] hover:bg-[#e7e9e5] hover:text-[#1a1c1a]"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#bccbb9]/35 bg-[#f9faf6] px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 text-sm text-[#3d4a3d]">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f3f4f0] px-3 text-sm font-bold text-[#1a1c1a] transition hover:bg-[#e7e9e5]"
              aria-label="返回班级列表"
            >
              <ArrowLeft size={17} />
              返回
            </button>
            <Link href="/classes" className="hover:text-[#1a1c1a]">智教空间</Link>
            <ChevronRight size={16} />
            <span className="truncate font-bold text-[#1a1c1a]">{classGroup.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4a3d]/65" size={19} />
              <input className="h-10 w-72 rounded-full border-0 bg-[#f3f4f0] pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#22C55E]" placeholder="搜索学生、报告或教案..." />
            </div>
            <button type="button" onClick={() => showToast("暂无新通知")} className="rounded-full p-2 text-[#3d4a3d] transition hover:bg-[#f3f4f0]">
              <Bell size={20} />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-7 md:px-8">
            <div className="mx-auto max-w-4xl space-y-8">
              <section className="rounded-3xl border border-[#bccbb9]/30 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h1 className="text-4xl font-bold tracking-tight text-[#1a1c1a]">{classGroup.name}</h1>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#ba1a1a]/20 bg-[#ffdad6] px-2.5 py-1 text-xs font-bold text-[#93000a]">
                        <Target size={14} />
                        需要关注
                      </span>
                    </div>
                    <p className="flex flex-wrap items-center gap-3 text-sm text-[#3d4a3d]">
                      <span className="inline-flex items-center gap-1"><UsersRound size={17} />{classGroup.studentCount} 名学生</span>
                      <span className="text-[#bccbb9]">|</span>
                      <span>需要复习 (4)</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <div className="w-full min-w-[210px] md:w-56">
                      <div className="mb-1 flex justify-between text-sm font-semibold">
                        <span className="text-[#3d4a3d]">月报完成进度</span>
                        <span className="text-[#006e2f]">{classView.report.progressPercent}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2e3df]">
                        <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${classView.report.progressPercent}%` }} />
                      </div>
                    </div>
                    <button type="button" onClick={() => showToast("已生成批量反馈草稿")} className="inline-flex items-center gap-2 rounded-xl bg-[#006e2f] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#005321]">
                      <Sparkles size={17} />
                      批量反馈
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#bccbb9]/30 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div className="mb-6 flex items-end justify-between">
                  <div>
                    <h2 className="text-lg font-bold">班级学生</h2>
                    <p className="mt-1 text-sm text-[#3d4a3d]">按风险优先级排列，点击学生进入详情</p>
                  </div>
                  <span className="text-sm font-medium text-[#6d7b6c]">共 {classGroup.studentCount} 名学生</span>
                </div>
                <div className="grid grid-cols-5 gap-x-4 gap-y-5 md:grid-cols-10">
                  <button type="button" onClick={() => showToast("添加学生入口待接入")} className="group flex flex-col items-center gap-2">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9CA3AF] text-white transition group-hover:scale-105">
                      <Plus size={24} />
                    </span>
                    <span className="text-xs font-medium text-[#3d4a3d]">添加</span>
                  </button>
                  {classView.students.map((student) => (
                    <button key={student.id} type="button" onClick={() => showToast(`${student.name}：${student.note}`)} className="group flex flex-col items-center gap-2">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition group-hover:scale-105 ${statusStyles[student.status]}`}>
                        {student.initial}
                      </span>
                      <span className="max-w-[56px] truncate text-xs font-medium text-[#3d4a3d]">{student.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex items-center gap-1 text-sm font-bold text-[#006e2f] hover:underline">
                    <Layers3 size={16} />
                    查看全部学生
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-[#bccbb9]/30 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LineChart className="text-[#006e2f]" size={22} />
                    <h2 className="text-lg font-bold">班级报告</h2>
                  </div>
                  <span className="text-sm font-medium text-[#6d7b6c]">数据更新于 10:30 AM</span>
                </div>
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      [classView.report.pendingFeedback, "待反馈"],
                      [classView.report.mistakeCount, "错题"],
                      [classView.report.activeCount, "活跃"]
                    ].map(([value, label]) => (
                      <div key={label} className="flex min-h-32 flex-col items-center justify-center rounded-2xl bg-[#f3f4f0] text-center">
                        <span className="text-xl font-bold">{value}</span>
                        <span className="mt-1 text-sm text-[#3d4a3d]">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {classView.report.progressRows.map((row) => <ProgressRow key={row.label} {...row} />)}
                  </div>
                </div>
              </section>

              <section className="relative overflow-hidden rounded-3xl border border-[#22C55E]/30 bg-gradient-to-br from-white to-[#E8F5E9] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                <Sparkles className="absolute right-8 top-8 text-[#22C55E]/10" size={92} fill="currentColor" />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-2">
                    <Bot className="text-[#006e2f]" size={22} />
                    <h2 className="text-lg font-bold">班级 AI 洞察</h2>
                    <span className="rounded-md bg-[#22C55E] px-2 py-0.5 text-[10px] font-bold text-[#005321]">{classView.insight.badge}</span>
                  </div>
                  <div className="mb-5 rounded-2xl border border-[#bccbb9]/20 bg-white/70 p-5 backdrop-blur-sm">
                    <h3 className="mb-2 flex items-center gap-2 font-bold">
                      <span className="h-2 w-2 rounded-full bg-[#006e2f]" />
                      {classView.insight.title}
                    </h3>
                    <p className="text-sm leading-7 text-[#3d4a3d]">{classView.insight.summary}</p>
                  </div>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-[#3d4a3d]">影响学生：</span>
                      <div className="flex -space-x-2">
                        {classView.insight.affectedStudents.slice(0, 3).map((name, index) => (
                          <span
                            key={name}
                            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#ffdad6] text-xs font-bold text-[#93000a]"
                            style={{ zIndex: 30 - index * 10 }}
                          >
                            {name.slice(0, 1)}
                          </span>
                        ))}
                        {classView.insight.affectedStudents.length > 3 ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#e2e3df] text-xs text-[#3d4a3d]">+{classView.insight.affectedStudents.length - 3}</span>
                        ) : null}
                      </div>
                      <button type="button" onClick={() => showToast("已打开教学建议")} className="text-sm font-bold text-[#006e2f] hover:underline">查看教学建议</button>
                    </div>
                    <button type="button" onClick={() => showToast("已生成针对性反馈")} className="rounded-xl bg-[#006e2f] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#005321]">
                      {classView.insight.actionLabel}
                    </button>
                  </div>
                </div>
              </section>

              <section className="pb-12">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold">班级时间轴 <span className="ml-2 text-base font-normal text-[#3d4a3d]">· 自动入档记录</span></h2>
                  <div className="flex rounded-full bg-[#f3f4f0] p-1">
                    {[
                      ["全部", "all"],
                      ["洞察", "insight"],
                      ["反馈", "feedback"]
                    ].map(([label, value]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setActiveFilter(value as typeof activeFilter)}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${activeFilter === value ? "bg-white text-[#1a1c1a] shadow-sm" : "text-[#3d4a3d] hover:text-[#1a1c1a]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative space-y-6 before:absolute before:bottom-0 before:left-5 before:top-0 before:w-0.5 before:bg-gradient-to-b before:from-[#bccbb9] before:to-transparent md:before:left-1/2">
                  {filteredTimeline.map((item, index) => {
                    const Icon = item.type === "insight" ? Bot : Send;
                    return (
                      <div key={item.id} className={`relative flex items-center gap-6 ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                        <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-[#f9faf6] bg-[#22C55E] text-[#005321] shadow-sm md:absolute md:left-1/2 md:-translate-x-1/2">
                          <Icon size={18} />
                        </div>
                        <button type="button" onClick={() => showToast(`${item.title}：${item.summary}`)} className="w-[calc(100%-4rem)] rounded-2xl border border-[#bccbb9]/30 bg-white p-4 text-left shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition hover:border-[#22C55E]/40 md:w-[calc(50%-2.5rem)]">
                          <span className="mb-1 flex items-center justify-between gap-3">
                            <strong>{item.title}</strong>
                            <span className="text-sm text-[#3d4a3d]">{item.time}</span>
                          </span>
                          <span className="block text-sm leading-6 text-[#3d4a3d]">{item.summary}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </main>

          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-[#bccbb9]/35 bg-[#f3f4f0] p-6 xl:block">
            <div className="space-y-8">
              <section>
                <h2 className="mb-4 flex items-center gap-2 font-bold"><AlarmClock size={20} />班级提醒</h2>
                <div className="rounded-2xl border border-[#bccbb9]/20 border-l-4 border-l-[#635e54] bg-white p-4 shadow-sm">
                  <p className="text-sm leading-7 text-[#3d4a3d]">{classView.reminder}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {classView.focusTags.map((tag) => (
                      <Pill key={tag.label} tag={tag} />
                    ))}
                  </div>
                  <button type="button" onClick={() => showToast("已加入排期")} className="mt-3 text-sm font-bold text-[#635e54] hover:text-[#1a1c1a]">立即排期</button>
                </div>
              </section>

              <section>
                <h2 className="mb-4 flex items-center gap-2 font-bold"><Target className="text-[#ba1a1a]" size={20} />重点关注名单</h2>
                <div className="space-y-3">
                  {classView.focusStudents.map((student) => (
                    <button key={student.id} type="button" onClick={() => showToast(`${student.name}：${student.note}`)} className="flex w-full items-center gap-3 rounded-2xl border border-[#bccbb9]/20 bg-white p-3 text-left shadow-sm transition hover:border-[#22C55E]/40">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${statusStyles[student.status]}`}>{student.initial}</span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{student.name}</strong>
                        <span className={`block truncate text-xs ${student.status === "risk" ? "text-[#ba1a1a]" : "text-[#635e54]"}`}>{student.note}</span>
                      </span>
                      <ChevronRight size={18} className="text-[#3d4a3d]" />
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-4 font-bold">快捷操作</h2>
                <div className="grid grid-cols-2 gap-3">
                  {classView.quickActions.map((action) => (
                    <button key={action.label} type="button" onClick={() => showToast(action.helper)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[#bccbb9]/30 bg-white p-4 text-center text-[#3d4a3d] transition hover:bg-[#e7e9e5] hover:text-[#1a1c1a]">
                      <ClipboardPlus size={25} />
                      <span className="text-sm font-semibold">{action.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-4 font-bold">最近产出物</h2>
                <ul className="space-y-4">
                  {classView.recentArtifacts.map((artifact) => {
                    const Icon = artifact.type === "pdf" ? FileText : Image;
                    return (
                      <li key={artifact.title}>
                        <button type="button" onClick={() => showToast(`已打开${artifact.title}`)} className="group flex w-full items-start gap-3 text-left">
                          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#e2e3df] text-[#3d4a3d] transition group-hover:bg-[#22C55E]/15 group-hover:text-[#006e2f]">
                            <Icon size={16} />
                          </span>
                          <span>
                            <strong className="block text-sm font-semibold group-hover:text-[#006e2f]">{artifact.title}</strong>
                            <span className="text-xs text-[#3d4a3d]">{artifact.createdAt}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </aside>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="关闭学生名单" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-[#1a1c1a]/20 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-hidden rounded-t-3xl border-t border-[#bccbb9]/30 bg-[#f9faf6] shadow-[0_-20px_60px_rgba(0,0,0,0.16)]">
            <div className="flex items-center justify-between border-b border-[#bccbb9]/20 bg-white p-6">
              <div className="flex items-center gap-3">
                <UsersRound className="text-[#006e2f]" size={22} />
                <h2 className="text-lg font-bold">全班学生名单</h2>
                <span className="rounded-full bg-[#e2e3df] px-2 py-0.5 text-xs text-[#3d4a3d]">{classGroup.studentCount} 名学生</span>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full p-2 hover:bg-[#f3f4f0]">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-6">
              <div className="overflow-hidden rounded-2xl border border-[#bccbb9]/30 bg-white">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-[#bccbb9]/30 text-xs uppercase tracking-wide text-[#6d7b6c]">
                    <tr>
                      <th className="px-4 py-3 font-medium">姓名</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">近期表现</th>
                      <th className="px-4 py-3 font-medium">最后更新</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classView.students.slice(0, 7).map((student, index) => (
                      <tr key={student.id} className="border-b border-[#bccbb9]/10 last:border-0 hover:bg-[#f3f4f0]">
                        <td className="px-4 py-4">
                          <span className="flex items-center gap-3">
                            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${statusStyles[student.status]}`}>{student.initial}</span>
                            <strong className="text-[#1a1c1a]">{student.name}</strong>
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-md bg-[#f3f4f0] px-2 py-1 text-xs text-[#3d4a3d]">{student.status === "risk" ? "需要关注" : student.status === "behind" ? "进度落后" : student.status === "good" ? "表现优异" : "状态稳定"}</span>
                        </td>
                        <td className="px-4 py-4 text-[#3d4a3d]">{student.note}</td>
                        <td className="px-4 py-4 text-[#3d4a3d]">{index === 0 ? "10:30 AM" : index === 1 ? "昨天" : "2 小时前"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end border-t border-[#bccbb9]/20 bg-[#f3f4f0] p-6">
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-xl bg-[#006e2f] px-6 py-2.5 text-sm font-bold text-white shadow-sm">
                完成查看
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-full bg-[#1a1c1a] px-5 py-3 text-center text-sm font-medium text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
