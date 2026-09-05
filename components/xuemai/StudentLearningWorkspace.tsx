"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Copy,
  Eye,
  FileText,
  Home,
  Lightbulb,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  TrendingUp,
  UsersRound,
  Zap
} from "lucide-react";
import { TimelineDetailDrawer } from "@/components/xuemai/TimelineDetailDrawer";
import { generateAiProfileView } from "@/lib/mock/xuemai-ai-profile";
import {
  copyTimelineItemText,
  getInitialXuemaiState,
  readXuemaiMockState,
  runGradingCompletedWorkflow,
  updateTimelineItemInState,
  writeXuemaiMockState
} from "@/lib/mock/xuemai-workflows";
import type { FeedbackDetail, TimelineFilter, TimelineItem, XuemaiMockState, XuemaiTagTone } from "@/lib/mock/xuemai-types";

const navItems = [
  { label: "首页", href: "/dashboard", icon: Home },
  { label: "学生档案", href: "/students", icon: ClipboardList, active: true },
  { label: "班级空间", href: "/classes", icon: UsersRound },
  { label: "AI 反馈", href: "/feedback/batch", icon: MessageSquareText },
  { label: "AI 错题", href: "/mistakes", icon: AlertCircle },
  { label: "月度报告", href: "/reports", icon: BarChart3 },
  { label: "任务记录", href: "/tasks", icon: TrendingUp }
];

const filterTabs: { label: string; value: TimelineFilter }[] = [
  { label: "全部", value: "all" },
  { label: "错题", value: "mistake" },
  { label: "反馈", value: "feedback" },
  { label: "报告", value: "report" },
  { label: "画像更新", value: "profile_update" }
];

const axisLabels = ["表达呈现", "知识理解", "学习执行", "信息提取", "逻辑思维", "应用迁移"];

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function getCopyToast(item: TimelineItem) {
  if (item.detail.kind === "feedback") return "已复制微信反馈";
  if (item.detail.kind === "mistake") return "已复制错题摘要";
  if (item.detail.kind === "report") return "已复制月报摘要";
  return "已复制";
}

function RadarChart() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center">
      <svg viewBox="-28 -28 256 256" className="h-full w-full">
        {[20, 40, 60, 80].map((offset) => {
          const scale = (100 - offset) / 80;
          const points = [
            [100, 20 + offset],
            [169.3 - offset * 0.65, 60 + offset * 0.5],
            [169.3 - offset * 0.65, 140 - offset * 0.5],
            [100, 180 - offset],
            [30.7 + offset * 0.65, 140 - offset * 0.5],
            [30.7 + offset * 0.65, 60 + offset * 0.5]
          ]
            .map(([x, y]) => `${x},${y}`)
            .join(" ");
          return <polygon key={scale} points={points} fill="none" stroke="#bccbb9" strokeWidth="0.5" opacity="0.35" />;
        })}
        {[
          [100, 20],
          [169.3, 60],
          [169.3, 140],
          [100, 180],
          [30.7, 140],
          [30.7, 60]
        ].map(([x, y]) => (
          <line key={`${x}-${y}`} x1="100" y1="100" x2={x} y2={y} stroke="#bccbb9" strokeWidth="0.5" opacity="0.55" />
        ))}
        <polygon
          points="100,37.6 152.6,69.6 142.9,124.8 100,141.6 51.5,128 61.9,78"
          fill="#22C55E"
          fillOpacity="0.15"
          stroke="#22C55E"
          strokeWidth="2"
        />
        {[
          [100, 8, "middle"],
          [175, 58, "start"],
          [175, 148, "start"],
          [100, 196, "middle"],
          [25, 148, "end"],
          [25, 58, "end"]
        ].map(([x, y, anchor], index) => (
          <text key={axisLabels[index]} x={x} y={y} textAnchor={anchor as "start" | "middle" | "end"} className="fill-[#3d4a3d] text-[11px] font-bold">
            {axisLabels[index]}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Pill({ children, tone = "green" }: { children: React.ReactNode; tone?: XuemaiTagTone }) {
  const className =
    tone === "red"
      ? "border-[#ffdad6]/70 bg-[#ffdad6]/18 text-[#ba1a1a]"
      : tone === "neutral"
        ? "border-[#bccbb9]/35 bg-[#f3f4f0] text-[#3d4a3d]"
        : "border-[#22C55E]/20 bg-[#22C55E]/10 text-[#22C55E]";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function TimelineCard({
  item,
  isLatest,
  onView,
  onCopy
}: {
  item: TimelineItem;
  isLatest: boolean;
  onView: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="relative pl-8">
      <div className={`absolute left-[3px] top-1.5 z-10 h-2 w-2 rounded-full ring-4 ring-[#f9faf6] ${isLatest ? "bg-[#22C55E]" : "bg-[#b2ab9f]"}`} />
      <article className="rounded-xl border border-[#bccbb9]/30 bg-white p-3 shadow-sm transition hover:border-[#22C55E]/35 hover:shadow-md">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-[#1a1c1a]">{item.title}</h4>
            <span className="text-xs text-[#3d4a3d]/75">{item.displayTime}</span>
            {item.status ? <Pill tone={item.status === "sent" || item.status === "saved" || item.status === "updated" ? "green" : "neutral"}>{item.status === "sent" ? "已发送" : item.status === "draft" ? "草稿" : "已入档"}</Pill> : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={onView} className="flex items-center gap-0.5 text-xs font-bold text-[#22C55E] hover:text-[#16A34A]">
              <Eye size={14} />
              查看
            </button>
            {item.copyable ? (
              <button type="button" onClick={onCopy} className="flex items-center gap-0.5 text-xs font-bold text-[#3d4a3d]/75 hover:text-[#1a1c1a]">
                <Copy size={14} />
                复制
              </button>
            ) : null}
          </div>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-[#3d4a3d]">{item.summary}</p>
      </article>
    </div>
  );
}

export function StudentLearningWorkspace() {
  const router = useRouter();
  const [state, setState] = useState<XuemaiMockState>(() => getInitialXuemaiState());
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>("all");
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setState(readXuemaiMockState());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const student = state.student;
  const aiProfile = useMemo(() => generateAiProfileView(student), [student]);
  const filteredItems = useMemo(() => {
    return activeFilter === "all" ? student.timelineItems : student.timelineItems.filter((item) => item.type === activeFilter);
  }, [activeFilter, student.timelineItems]);

  function showToast(message: string) {
    setToast(message);
  }

  function handleRunWorkflow() {
    setIsWorkflowRunning(true);
    window.setTimeout(() => {
      const nextState = runGradingCompletedWorkflow(student.id, state);
      setState(nextState);
      setIsWorkflowRunning(false);
      showToast("已自动更新学生档案和班级报告");
    }, 900);
  }

  function handleViewDetail(item: TimelineItem) {
    setSelectedItem(item);
    setDrawerOpen(true);
  }

  async function handleCopy(item: TimelineItem) {
    await copyText(copyTimelineItemText(item));
    showToast(getCopyToast(item));
  }

  function handleSaveFeedback(item: TimelineItem, fullText: string) {
    if (item.detail.kind !== "feedback") return;
    const updatedItem: TimelineItem = {
      ...item,
      status: "saved",
      tags: Array.from(new Set([...item.tags, "已保存"])),
      detail: {
        ...(item.detail as FeedbackDetail),
        fullText
      }
    };
    const nextState = updateTimelineItemInState(state, updatedItem);
    setState(nextState);
    setSelectedItem(updatedItem);
    showToast("已保存修改");
  }

  function handleMarkSent(item: TimelineItem) {
    if (item.detail.kind !== "feedback") return;
    const updatedItem: TimelineItem = {
      ...item,
      status: "sent",
      tags: Array.from(new Set([...item.tags, "已发送"]))
    };
    const nextState = updateTimelineItemInState(state, updatedItem);
    setState(nextState);
    setSelectedItem(updatedItem);
    showToast("已标记为已发送");
  }

  function handleSyncSuggestion() {
    writeXuemaiMockState(state);
    showToast("已同步到学生档案");
  }

  function handleBack() {
    const referrer = document.referrer;
    const hasSameOriginReferrer = referrer ? new URL(referrer).origin === window.location.origin : false;

    if (hasSameOriginReferrer && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/students");
  }

  const highRisk = student.status === "needs_attention";

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8F4] font-sans text-[#1a1c1a]">
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-[#bccbb9]/30 bg-[#f9faf6] lg:flex">
        <div className="flex h-full flex-col p-4">
          <Link href="/dashboard" className="mb-2 flex items-center gap-3 px-2 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22C55E] text-white">
              <Brain size={18} />
            </span>
            <span>
              <strong className="block text-lg leading-tight text-[#1a1c1a]">学脉 AI</strong>
              <span className="text-xs text-[#3d4a3d]/80">AI 助教工作台</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={handleRunWorkflow}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#16A34A]"
          >
            <Plus size={18} />
            {isWorkflowRunning ? "更新中..." : "新建任务"}
          </button>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                    item.active ? "bg-[#22C55E]/10 font-bold text-[#22C55E]" : "text-[#3d4a3d] hover:bg-[#22C55E]/5 hover:text-[#22C55E]"
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
            <Link href="/settings" className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#3d4a3d] transition hover:bg-[#22C55E]/5 hover:text-[#22C55E]">
              <Settings size={20} />
              设置
            </Link>
          </nav>
        </div>
      </aside>

      <div className="flex h-screen flex-1 flex-col lg:ml-64">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-[#bccbb9]/30 bg-[#f9faf6]/80 px-4 backdrop-blur-md lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#f3f4f0] px-3 text-sm font-bold text-[#1a1c1a] transition hover:bg-[#e7e9e5]"
              aria-label="返回学生列表"
            >
              <ArrowLeft size={17} />
              返回
            </button>
            <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3d4a3d]/65" size={20} />
            <input
              className="h-10 w-full rounded-full border-none bg-[#f3f4f0] pl-10 pr-4 text-sm text-[#1a1c1a] outline-none ring-0 transition placeholder:text-[#3d4a3d]/65 focus:bg-white focus:ring-2 focus:ring-[#22C55E]"
              placeholder="搜索学生、班级、任务..."
            />
            </div>
          </div>
          <button type="button" className="relative ml-4 text-[#3d4a3d] transition hover:text-[#22C55E]" aria-label="通知">
            <Bell size={24} fill="currentColor" />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-[#f9faf6] bg-[#ba1a1a]" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
              <section className="rounded-2xl border border-[#bccbb9]/30 bg-[#f9faf6] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffdad6] text-xl font-bold text-[#93000a] shadow-inner">王</div>
                    <div className="space-y-1.5">
                      <h1 className="text-xl font-bold text-[#1a1c1a]">{student.name}</h1>
                      <p className="text-xs text-[#3d4a3d]">{student.grade}数学 · A 班 · 学号 20230812</p>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone={highRisk ? "red" : "neutral"}>状态：{highRisk ? "需关注" : student.statusLabel}</Pill>
                        <Pill tone="red">最近问题：{student.latestIssueSummary}</Pill>
                      </div>
                      <p className="text-[10px] text-[#3d4a3d]/65">今日 10:30 更新</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#bccbb9]/20 pt-3">
                  <button
                    type="button"
                    onClick={handleRunWorkflow}
                    disabled={isWorkflowRunning}
                    className="flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#16A34A] disabled:opacity-60"
                  >
                    <CheckCircle2 size={18} />
                    {isWorkflowRunning ? "更新档案中" : "AI批改"}
                  </button>
                  {[
                    ["生成微信反馈", MessageSquareText, () => showToast("已生成微信反馈草稿")],
                    ["生成下次课建议", Lightbulb, () => showToast("已生成下次课建议")],
                    ["生成月度报告", BarChart3, () => showToast("已生成月度报告草稿")]
                  ].map(([label, Icon, action]) => {
                    const ActionIcon = Icon as typeof MessageSquareText;
                    return (
                      <button
                        key={label as string}
                        type="button"
                        onClick={action as () => void}
                        className="flex items-center gap-1.5 rounded-xl bg-[#f3f4f0] px-4 py-2 text-sm font-semibold text-[#1a1c1a] transition hover:bg-[#edeeea]"
                      >
                        <ActionIcon size={18} />
                        {label as string}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-[#bccbb9]/30 bg-[#f9faf6] p-5 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[#1a1c1a]">
                  <Brain className="text-[#22C55E]" size={24} />
                  学习画像
                </h2>
                <div className="flex flex-col items-start gap-8 md:flex-row">
                  <div className="w-full flex-1 md:w-[45%]">
                    <h3 className="mb-4 text-base font-bold text-[#1a1c1a]">综合学习能力画像</h3>
                    <RadarChart />
                  </div>
                  <div className="flex w-full flex-[1.2] flex-col gap-4 md:w-[55%]">
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#1a1c1a]">能力摘要</h3>
                      <div className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-xs font-bold text-[#ba1a1a]">当前薄弱:</span>
                        <div className="flex flex-wrap gap-2">
                          {aiProfile.currentWeakness.map((profileTag) => (
                            <Pill key={profileTag.label} tone={profileTag.tone}>
                              {profileTag.label}
                            </Pill>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-xs font-bold text-[#22C55E]">当前优势:</span>
                        <div className="flex flex-wrap gap-2">
                          {aiProfile.currentStrengths.map((profileTag) => (
                            <Pill key={profileTag.label} tone={profileTag.tone}>
                              {profileTag.label}
                            </Pill>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 w-16 shrink-0 text-xs font-bold text-[#3d4a3d]">近期重点:</span>
                        <p className="text-sm font-medium leading-relaxed text-[#1a1c1a]">{aiProfile.recentFocus}</p>
                      </div>
                    </div>

                    <div className="h-px bg-[#bccbb9]/20" />

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      {aiProfile.summarySections.map((section) => (
                        <div key={section.title} className="space-y-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#3d4a3d]">{section.title}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {section.tags.map((profileTag) => (
                              <Pill key={profileTag.label} tone={profileTag.tone}>
                                {profileTag.label}
                              </Pill>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="min-h-[300px] rounded-2xl border border-[#bccbb9]/30 bg-[#f9faf6] p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#1a1c1a]">
                    <TrendingUp className="text-[#22C55E]" size={20} />
                    学情时间轴 · 自动入档记录
                  </h2>
                  <div className="flex gap-1 rounded-full bg-[#f3f4f0] p-1">
                    {filterTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveFilter(tab.value)}
                        className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                          activeFilter === tab.value ? "bg-[#22C55E] text-white shadow-sm" : "text-[#3d4a3d] hover:text-[#1a1c1a]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative max-h-[400px] space-y-4 overflow-y-auto pl-3 pr-2 before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-[#bccbb9]/30">
                  {filteredItems.map((item, index) => (
                    <TimelineCard
                      key={item.id}
                      item={item}
                      isLatest={index === 0}
                      onView={() => handleViewDetail(item)}
                      onCopy={() => handleCopy(item)}
                    />
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
                <section className="flex h-full items-start gap-4 rounded-2xl border border-[#ffdad6]/55 bg-[#ffdad6]/12 p-5 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffdad6] text-[#93000a]">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="mb-0.5 text-xs text-[#3d4a3d]">核心薄弱点证据</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#ba1a1a]">{state.student.weaknessEvidence?.label ?? "函数应用题"}</span>
                      <span className="rounded-md border border-[#bccbb9]/20 bg-white px-2 py-0.5 text-xs font-bold text-[#1a1c1a] shadow-sm">近期出错 {state.student.weaknessEvidence?.count ?? 3} 次</span>
                    </div>
                  </div>
                </section>

                <section className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-[#22C55E] p-5 text-white shadow-sm">
                  <Brain className="absolute -right-4 -top-4 opacity-10" size={82} fill="currentColor" />
                  <div className="relative z-10 mb-4">
                    <h3 className="mb-1.5 flex items-center gap-1 text-sm font-bold">
                      <Lightbulb size={16} />
                      AI 洞察推荐
                    </h3>
                    <p className="text-xs leading-relaxed opacity-90">{state.student.aiSuggestion?.text ?? "建议下节课重点训练读题拆解与分步建模。"}</p>
                  </div>
                  <div className="relative z-10 mt-auto flex gap-2">
                    <button type="button" onClick={() => showToast("已生成下节课教案草稿")} className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-xs font-bold text-[#22C55E] shadow-sm transition hover:bg-[#f3f4f0]">
                      生成专属教案
                    </button>
                    <button type="button" onClick={handleSyncSuggestion} className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/20">
                      同步至计划
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </main>

          <aside className="hidden h-full w-[300px] shrink-0 flex-col border-l border-[#bccbb9]/30 bg-[#f9faf6] shadow-[-4px_0_24px_rgba(0,0,0,0.02)] xl:flex">
            <div className="sticky top-0 z-10 border-b border-[#bccbb9]/30 bg-[#f9faf6]/80 p-4 backdrop-blur-md">
              <div className="relative">
                <select className="w-full appearance-none rounded-xl border border-[#bccbb9]/30 bg-[#f3f4f0] py-2 pl-3 pr-8 text-sm font-bold text-[#1a1c1a] outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]">
                  <option>王一路 (需关注)</option>
                  <option>李明轩 (稳定)</option>
                  <option>陈思远 (需跟进)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#3d4a3d]" size={18} />
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#3d4a3d]">下节课建议焦点</h3>
                <div className="flex flex-wrap gap-2">
                  {aiProfile.nextLessonFocus.map((profileTag) => (
                    <Pill key={profileTag.label} tone={profileTag.tone}>
                      {profileTag.label}
                    </Pill>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#3d4a3d]">快捷操作</h3>
                <div className="flex flex-col gap-3">
                  {[
                    ["生成家长反馈", MessageSquareText, () => showToast("已生成微信反馈草稿")],
                    ["深入分析错题", Search, () => showToast("已生成错题分析草稿")]
                  ].map(([label, Icon, action]) => {
                    const ActionIcon = Icon as typeof MessageSquareText;
                    return (
                      <button
                        key={label as string}
                        type="button"
                        onClick={action as () => void}
                        className="group flex w-full items-center justify-between rounded-2xl border border-[#bccbb9]/30 bg-white p-3 text-left shadow-sm transition hover:border-[#22C55E]/50 hover:shadow-md"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F6EFE5] text-[#3d4a3d] transition group-hover:text-[#22C55E]">
                            <ActionIcon size={16} />
                          </span>
                          <span className="text-sm font-semibold text-[#1a1c1a] transition group-hover:text-[#22C55E]">{label as string}</span>
                        </span>
                        <ArrowRight className="text-[#bccbb9] transition group-hover:text-[#22C55E]" size={18} />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#3d4a3d]">待确认</h3>
                <div className="flex items-start gap-3 rounded-2xl border border-[#b2ab9f]/30 bg-[#b2ab9f]/10 p-4">
                  <CircleHelp className="mt-0.5 text-[#635e54]" size={18} />
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-semibold text-[#1a1c1a]">课后作业情况</p>
                    <p className="mb-3 text-xs leading-snug text-[#3d4a3d]">昨晚补充练习尚未收到提交。</p>
                    <button type="button" onClick={() => showToast("已进入确认状态")} className="rounded-lg bg-[#22C55E] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#16A34A]">
                      去确认
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#3d4a3d]">最近生成记录</h3>
                <div className="flex flex-col gap-3">
                  {[
                    ["错题分析报告", "今日 10:30", "二次函数随堂测验分析", FileText],
                    ["微信家长沟通", "昨日 18:45", "周结反馈及周末建议", MessageSquareText]
                  ].map(([title, time, desc, Icon]) => {
                    const RecordIcon = Icon as typeof FileText;
                    return (
                      <button
                        key={title as string}
                        type="button"
                        onClick={() => showToast(`已打开${title}`)}
                        className="block rounded-2xl border border-[#bccbb9]/20 bg-white p-3 text-left shadow-sm transition hover:border-[#22C55E]/30 hover:shadow-md"
                      >
                        <span className="mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-bold text-[#1a1c1a]">
                            <RecordIcon size={14} />
                            {title as string}
                          </span>
                          <span className="text-[10px] text-[#3d4a3d]">{time as string}</span>
                        </span>
                        <span className="block truncate text-xs text-[#3d4a3d]">{desc as string}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <TimelineDetailDrawer
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCopy={handleCopy}
        onSaveFeedback={handleSaveFeedback}
        onMarkSent={handleMarkSent}
      />

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-full bg-[#1a1c1a] px-5 py-3 text-center text-sm font-medium text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
