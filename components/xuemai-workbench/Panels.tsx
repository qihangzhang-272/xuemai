import type React from "react";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AtSign,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Database,
  FileText,
  GraduationCap,
  HelpCircle,
  KeyRound,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageSquareText,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation, TeacherProfile, TaskCard, TimelineRecord, UserPreferences } from "./types";
import { backend } from "./backend-adapter";
import type { Snapshot } from "@/lib/xuemai/types";

type PanelTone = "green" | "yellow" | "blue" | "red" | "gray";

export function LoginScreen({ onLogin }: { onLogin: (profile: TeacherProfile, credentials: { mode: string; password: string }) => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register" | "identity" | "profile" | "forgot">("login");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMode, setAccountMode] = useState("local");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [role, setRole] = useState<TeacherProfile["role"]>("individual");
  const [nickname, setNickname] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [city, setCity] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [teachingStages, setTeachingStages] = useState<string[]>([]);
  const [teachingModes, setTeachingModes] = useState<string[]>([]);
  const canRegister = Boolean(contact.trim() && password.length >= 8 && password === confirmPassword);
  const canFinishProfile = Boolean(nickname.trim() && subjects.length > 0 && teachingStages.length > 0 && teachingModes.length > 0);

  async function finishLogin(nextProfile?: Partial<TeacherProfile>) {
    if (authBusy) return;
    setAuthBusy(true); setAuthError("");
    try { await onLogin({
      contact: contact.trim(),
      nickname: nextProfile?.nickname ?? (nickname.trim() || "老师"),
      role: nextProfile?.role ?? role,
      organizationName: nextProfile?.organizationName ?? organizationName.trim(),
      city: nextProfile?.city ?? city.trim(),
      subjects: nextProfile?.subjects ?? subjects,
      teachingStages: nextProfile?.teachingStages ?? teachingStages,
      teachingModes: nextProfile?.teachingModes ?? teachingModes
    }, { mode: mode === "login" ? accountMode : "register", password });
    } catch (error) { setAuthError(error instanceof Error ? error.message : "登录失败"); } finally { setAuthBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_0%,#eefbf3_0,#f6f8f6_32%,#f6f8f6_100%)] p-6 text-[#191c1d]">
      <div className="grid w-full max-w-[1040px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
        <AuthIntro mode={mode} />
      <section className="w-full rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.09)]">
        {mode !== "login" ? (
          <button type="button" onClick={() => setMode(mode === "identity" ? "register" : mode === "profile" ? "identity" : "login")} className="mb-5 flex h-9 w-9 items-center justify-center rounded-full text-[#34413a] transition hover:bg-[#f3f5f4]" aria-label="返回">
            <ChevronLeft size={22} />
          </button>
        ) : null}

        {mode === "login" ? (
          <>
            <AuthBrand />
            <div className="mt-7 rounded-[24px] bg-[#f8faf8] p-4">
              <div className="space-y-3">
                <AuthField icon={<AtSign size={16} />} label="手机号 / 邮箱" value={contact} onChange={setContact} placeholder="请输入手机号或邮箱" />
                <AuthField icon={<LockKeyhole size={16} />} label="密码" value={password} onChange={setPassword} placeholder="请输入密码" type="password" />
              </div>
              <button type="button" onClick={() => { setAccountMode(value => value === "local" ? "mdt" : "local"); setAuthError(""); }} className="mt-3 block w-full text-right text-[12px] font-bold text-[#16a34a]">
                {accountMode === "local" ? "使用多维度教学助手账号" : "返回学脉账号登录"}
              </button>
              <button type="button" disabled={authBusy || !contact.trim() || !password} onClick={() => void finishLogin()} className="mt-5 flex h-11 w-full items-center justify-center rounded-[16px] bg-[#22c55e] text-sm font-black text-white shadow-[0_14px_26px_rgba(34,197,94,0.18)] transition hover:bg-[#16a34a]">
                {authBusy ? "正在登录…" : accountMode === "mdt" ? "登录多维度教学助手" : "登录"}
              </button>
              <button type="button" onClick={() => setMode("register")} className="mt-5 flex h-10 w-full items-center justify-center rounded-[15px] bg-white text-[13px] font-bold text-[#5c665f] transition hover:bg-[#edf8f1] hover:text-[#16a34a]">
                还没有账号？立即注册
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-[#9aa19d]">账号与记录保存在学脉服务中。</p>
          </>
        ) : null}

        {mode === "register" ? (
          <>
            <AuthTitle title="创建账号" subtitle="开始建立你的 AI 学情追踪系统" />
            <AuthProgress activeStep={1} />
            <div className="mt-6 space-y-3">
              <AuthField icon={<AtSign size={16} />} label="手机号 / 邮箱" value={contact} onChange={setContact} placeholder="请输入手机号或邮箱" />
              <AuthField icon={<LockKeyhole size={16} />} label="设置密码" value={password} onChange={setPassword} placeholder="至少 8 位" type="password" />
              <AuthField icon={<LockKeyhole size={16} />} label="确认密码" value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入密码" type="password" />
            </div>
            <AuthPrimaryButton disabled={!canRegister} onClick={() => setMode("identity")}>
              下一步
            </AuthPrimaryButton>
            <AuthSecondaryButton onClick={() => setMode("login")}>已有账号，去登录</AuthSecondaryButton>
          </>
        ) : null}

        {mode === "identity" ? (
          <>
            <AuthTitle title="选择你的身份" subtitle="我们会根据教学场景优化工作台" />
            <AuthProgress activeStep={2} />
            <div className="mt-6 space-y-3">
              <RoleCard active={role === "individual"} icon={<GraduationCap size={20} />} title="个体老师" description="适合一对一、小班课老师和个人工作室" onClick={() => setRole("individual")} />
              <RoleCard active={role === "organization"} icon={<Building2 size={20} />} title="机构老师" description="适合校区老师、教学负责人和教培机构" onClick={() => setRole("organization")} />
            </div>
            <AuthPrimaryButton onClick={() => setMode("profile")}>继续</AuthPrimaryButton>
            <AuthSecondaryButton onClick={() => finishLogin({ nickname: "老师" })}>稍后再选</AuthSecondaryButton>
          </>
        ) : null}

        {mode === "profile" ? (
          <>
            <AuthTitle title="完善老师信息" subtitle="用于生成更贴近你教学场景的提醒、反馈和月报" />
            <AuthProgress activeStep={3} />
            <div className="mt-6 space-y-4">
              <AuthField icon={<GraduationCap size={16} />} label="老师昵称" value={nickname} onChange={setNickname} placeholder="例如：Eric 老师" />
              <AuthField icon={<BriefcaseBusiness size={16} />} label={role === "organization" ? "机构 / 工作室名称" : "个人工作室名称（可选）"} value={organizationName} onChange={setOrganizationName} placeholder={role === "organization" ? "例如：知迹教育工作室" : "可不填"} />
              <AuthField icon={<MapPin size={16} />} label="所在城市（可选）" value={city} onChange={setCity} placeholder="例如：北京" />
              <AuthOptionGroup label="主要科目" options={["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"]} values={subjects} onToggle={(value) => toggleAuthOption(subjects, setSubjects, value)} />
              <AuthOptionGroup label="授课阶段" options={["小学", "初中", "高中"]} values={teachingStages} onToggle={(value) => toggleAuthOption(teachingStages, setTeachingStages, value)} />
              <AuthOptionGroup label="教学场景" options={["一对一", "小班课", "机构班课", "线上课"]} values={teachingModes} onToggle={(value) => toggleAuthOption(teachingModes, setTeachingModes, value)} />
            </div>
            <AuthPrimaryButton disabled={!canFinishProfile} onClick={() => finishLogin()}>
              进入工作台
            </AuthPrimaryButton>
            <AuthSecondaryButton onClick={() => finishLogin({ nickname: nickname.trim() || "老师" })}>先进入，稍后完善</AuthSecondaryButton>
          </>
        ) : null}

        {mode === "forgot" ? (
          <>
            <AuthTitle title="找回密码" subtitle="输入账号后，我们将发送验证码" />
            <div className="mt-6 space-y-3">
              <AuthField icon={<AtSign size={16} />} label="手机号 / 邮箱" value={contact} onChange={setContact} placeholder="请输入绑定的账号" />
              <AuthField icon={<KeyRound size={16} />} label="验证码" value={code} onChange={setCode} placeholder="6 位验证码" actionLabel="获取验证码" />
              <AuthField icon={<LockKeyhole size={16} />} label="新密码" value={password} onChange={setPassword} placeholder="设置新密码（至少 8 位）" type="password" />
              <AuthField icon={<LockKeyhole size={16} />} label="确认新密码" value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入新密码" type="password" />
            </div>
            <AuthPrimaryButton disabled={!contact.trim() || !code.trim() || password.length < 8 || password !== confirmPassword} onClick={() => setMode("login")}>
              重置密码
            </AuthPrimaryButton>
            <AuthSecondaryButton onClick={() => setMode("login")}>返回登录</AuthSecondaryButton>
          </>
        ) : null}
        {authError ? <p role="alert" className="mt-4 text-center text-[12px] font-semibold leading-5 text-[#dc2626]">{authError}</p> : null}
      </section>
      </div>
    </main>
  );
}

function AuthIntro({ mode }: { mode: "login" | "register" | "identity" | "profile" | "forgot" }) {
  const modeCopy = {
    login: "登录后进入微信式教学工作台，学生是联系人，班级是群聊。",
    register: "创建独立学脉账号，教学记录按老师分别保存。",
    identity: "选择身份后，工作台会优先呈现你最常用的学生、班级和服务规则。",
    profile: "老师资料会用于默认反馈语气、月报署名和自动化提醒。",
    forgot: "账号问题请联系当前学脉服务的管理员。"
  };

  return (
    <aside className="hidden lg:block">
      <div className="max-w-[460px]">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[12px] font-black text-[#16a34a] shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <Sparkles size={15} />
          学脉 AI 教学工作台
        </div>
        <h1 className="mt-6 text-[46px] font-black leading-[1.08] tracking-tight text-[#161a17]">
          建立老师账号，
          <br />
          再进入学生服务闭环。
        </h1>
        <p className="mt-5 text-[17px] font-semibold leading-8 text-[#5f6b63]">{modeCopy[mode]}</p>
        <div className="mt-8 grid gap-3">
          {["注册账号", "选择老师身份", "完善授课信息", "进入工作台"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-[18px] bg-white/80 px-4 py-3 text-sm font-black text-[#34413a]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dcfce7] text-xs text-[#16a34a]">{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function AuthBrand() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] bg-[#eaf8ef]">
        <Image src="/xuemai-logo.png" alt="学脉" width={64} height={64} className="h-full w-full object-cover" priority />
      </div>
      <h1 className="mt-5 text-2xl font-black tracking-tight">学脉 AI</h1>
      <p className="mt-2 text-[13px] font-bold text-[#6b746d]">掌握学习的脉搏</p>
    </div>
  );
}

function AuthTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-[12px] font-black text-[#22c55e]">学脉 AI</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-[#191c1d]">{title}</h1>
      <p className="mt-2 text-[13px] font-semibold leading-5 text-[#6b746d]">{subtitle}</p>
    </div>
  );
}

function AuthProgress({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-2" aria-label="注册进度">
      {[1, 2, 3].map((step) => (
        <span key={step} className={cn("h-1.5 rounded-full", step <= activeStep ? "bg-[#22c55e]" : "bg-[#e8ece9]")} />
      ))}
    </div>
  );
}

function AuthField({ icon, label, value, onChange, placeholder, type = "text", actionLabel }: { icon?: React.ReactNode; label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; actionLabel?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#6b746d]">{label}</span>
      <span className="mt-1.5 flex h-11 items-center gap-2 rounded-[15px] border border-[#edf0ee] bg-[#fbfcfb] px-3.5 transition focus-within:border-[#22c55e]">
        {icon ? <span className="shrink-0 text-[#9aa4af]">{icon}</span> : null}
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#191c1d] outline-none placeholder:text-[#a4aca7]" />
        {actionLabel ? (
          <button type="button" className="shrink-0 text-xs font-black text-[#22c55e]">
            {actionLabel}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function RoleCard({ active, icon, title, description, onClick }: { active: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-4 rounded-[22px] border p-4 text-left transition", active ? "border-[#22c55e] bg-[#eefbf3]" : "border-transparent bg-[#f8faf8] hover:bg-[#f2f7f4]")}>
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", active ? "bg-white text-[#16a34a]" : "bg-[#edf0ee] text-[#748077]")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[15px] font-black text-[#191c1d]">{title}</strong>
        <span className="mt-1 block text-[12px] font-semibold leading-5 text-[#6b746d]">{description}</span>
      </span>
      <span className={cn("h-5 w-5 rounded-full border-2", active ? "border-[#22c55e] bg-[#22c55e]" : "border-[#d7deda] bg-white")} />
    </button>
  );
}

function AuthOptionGroup({ label, options, values, onToggle }: { label: string; options: string[]; values: string[]; onToggle: (value: string) => void }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#6b746d]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onToggle(option)} className={cn("rounded-full px-3 py-2 text-xs font-black transition", values.includes(option) ? "bg-[#22c55e] text-white" : "bg-[#f2f4f3] text-[#3d4a3d] hover:bg-[#eaf8ef]")}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function AuthPrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="mt-6 flex h-11 w-full items-center justify-center rounded-[16px] bg-[#22c55e] text-sm font-black text-white shadow-[0_14px_26px_rgba(34,197,94,0.18)] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:bg-[#c7d2cc] disabled:shadow-none">
      {children}
    </button>
  );
}

function AuthSecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 flex h-10 w-full items-center justify-center rounded-[15px] bg-[#edf8f1] text-sm font-black text-[#16a34a] transition hover:bg-[#dff5e7]">
      {children}
    </button>
  );
}

function toggleAuthOption(values: string[], setValues: (values: string[]) => void, value: string) {
  if (values.includes(value)) {
    if (values.length === 1) return;
    setValues(values.filter((item) => item !== value));
    return;
  }
  setValues([...values, value]);
}

export function TodosPanel({
  taskCards,
  conversations,
  timelineRecords,
  teacherName,
  onEnter
}: {
  taskCards: TaskCard[];
  conversations: Conversation[];
  timelineRecords: TimelineRecord[];
  teacherName: string;
  onEnter: (conversationId: string, taskId?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const teacherLabel = formatTeacherName(teacherName);
  const students = conversations.filter((conversation) => conversation.kind === "student");
  const classes = conversations.filter((conversation) => conversation.kind === "class");
  const attentionStudents = students.filter((conversation) => conversation.attention);
  const firstStudent = attentionStudents[0] ?? students[0];
  const firstClass = classes[0];
  const conversationById = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const actionableTasks = taskCards
    .filter((task) => task.status === "completed" || task.status === "copied" || task.status === "feedback_done" || task.status === "failed")
    .sort((left, right) => getTodoPriority(left) - getTodoPriority(right));
  const pendingFeedbackCount = Math.max(1, taskCards.filter((task) => task.status === "copied" || task.status === "feedback_done").length);
  const monthlyCount = Math.max(1, classes.length);
  const riskCount = Math.max(attentionStudents.length, 1);
  const todoTotal = actionableTasks.length + 4;
  const recentActivities = buildRecentActivities(actionableTasks, timelineRecords, conversationById);
  const todayLessons = buildTodayLessons({ students, classes, firstStudent, firstClass });
  const serviceRisks = buildServiceRisks({ firstStudent, firstClass, attentionStudents, pendingFeedbackCount, monthlyCount });

  const recommendations = [
    {
      id: "review",
      tone: "yellow" as const,
      label: "需要复习",
      title: "课后复盘待生成",
      description: "今天课程已结束，建议整理课堂表现并生成家长反馈。",
      action: "立即生成",
      targetId: firstStudent?.id
    },
    {
      id: "wrong-question",
      tone: "red" as const,
      label: firstStudent ? `${firstStudent.name} 错题` : "错题",
      title: "几何证明重复报错",
      description: "同类证明题出现重复性错误，适合先做材料分析。",
      action: "开始分析",
      targetId: firstStudent?.id
    },
    {
      id: "monthly",
      tone: "blue" as const,
      label: `${monthlyCount} 份月报`,
      title: "月报草稿可生成",
      description: "已有入档记录的学生，可先生成本月阶段总结。",
      action: "生成月报",
      targetId: firstClass?.id ?? firstStudent?.id
    },
    {
      id: "attention",
      tone: "green" as const,
      label: `${riskCount} 名学生`,
      title: "近期学习状态需关注",
      description: "建议先查看重点学生，再决定是否补充学习材料。",
      action: "查看详情",
      targetId: attentionStudents[0]?.id ?? firstStudent?.id
    }
  ];
  const normalizedQuery = query.trim();
  const visibleRecommendations = normalizedQuery
    ? recommendations.filter((item) => `${item.label}${item.title}${item.description}${item.action}${firstStudent?.name ?? ""}${firstClass?.name ?? ""}`.includes(normalizedQuery))
    : recommendations;

  return (
    <div className="h-full overflow-y-auto bg-[#f6f7f6]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-4">
        <header className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-w-0">
            <p className="text-[13px] font-bold text-[#22c55e]">今日</p>
            <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#191c1d]">日安，{teacherLabel}</h1>
            <p className="mt-1 text-[13px] font-medium text-[#6b7280]">今天有 {todayLessons.length} 节课、{todoTotal} 项教学服务待处理，先看会影响反馈、课消和续费的事项。</p>
            <label className="mt-3 flex h-10 max-w-[460px] items-center gap-2 rounded-[14px] bg-white px-3 text-[#8b95a1] ring-1 ring-[#ecefed] transition focus-within:ring-[#22c55e]/40">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生、班级或任务" className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-[#9aa3ad]" />
            </label>
          </section>

          <section className="grid grid-cols-2 gap-2 rounded-[22px] bg-white p-3">
            <DashboardMetric label="本周课程" value={21} tone="blue" />
            <DashboardMetric label="本月实收" value={12250} tone="green" />
            <DashboardMetric label="账户风险" value={riskCount} tone="red" />
            <DashboardMetric label="AI 已生成" value={Math.max(taskCards.length, 2)} tone="gray" />
          </section>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="min-w-0 space-y-4">
            <section className="rounded-[22px] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[17px] font-bold text-[#191c1d]">今日日程</h2>
                  <p className="mt-0.5 text-[12px] font-medium text-[#6b7280]">按上课状态区分：待确认、进行中、稍后开始和已完成。</p>
                </div>
                <span className="rounded-full bg-[#f3f5f4] px-3 py-1 text-[12px] font-bold text-[#5c665f]">共 {todayLessons.length} 节</span>
              </div>
              <div className="mt-3 space-y-2">
                {todayLessons.map((lesson) => (
                  <button key={lesson.id} type="button" onClick={() => onEnter(lesson.targetId)} className="group grid w-full grid-cols-[70px_minmax(0,1fr)_94px] items-center gap-3 rounded-[16px] bg-[#f8faf9] px-3 py-3 text-left transition hover:bg-[#eefaf2]">
                    <span className="text-[16px] font-black text-[#191c1d]">
                      {lesson.start}
                      <span className="mt-0.5 block text-[11px] font-bold text-[#8a948d]">{lesson.end}</span>
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-[14px] font-black text-[#191c1d]">{lesson.title}</strong>
                      <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#6b746d]">{lesson.meta}</span>
                    </span>
                    <span className={cn("justify-self-end rounded-full px-2.5 py-1 text-[11px] font-black", lesson.tone)}>{lesson.status}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-[17px] font-bold text-[#191c1d]">推荐任务</h2>
              <div className="mt-2.5 grid gap-3 md:grid-cols-2">
                {(visibleRecommendations.length ? visibleRecommendations : recommendations).map((item) => (
                  <button key={item.id} type="button" onClick={() => item.targetId && onEnter(item.targetId)} className="group rounded-[18px] bg-white p-3 text-left transition hover:-translate-y-0.5 hover:bg-[#fbfffc]">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", getTonePillClass(item.tone))}>
                      <span className={cn("h-2 w-2 rounded-full", getToneDotClass(item.tone))} />
                      {item.label}
                    </span>
                    <h3 className="mt-2 text-[15px] font-bold text-[#191c1d]">{item.title}</h3>
                    <p className="mt-1 min-h-[36px] text-[12px] font-medium leading-5 text-[#69746d]">{item.description}</p>
                    <span className="mt-3 inline-flex h-8 min-w-[112px] items-center justify-center rounded-full bg-[#dcfce7] px-4 text-[13px] font-bold text-[#15803d] transition group-hover:bg-[#22c55e] group-hover:text-white">{item.action}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] bg-white p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e8f4ff] text-[#2695e8]">
                    <FileText size={20} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-bold text-[#191c1d]">{firstClass?.name ?? "班级"} 月报</h2>
                    <p className="mt-0.5 text-[12px] font-medium text-[#6b7280]">阶段学情统计 · 面向老师复盘</p>
                  </div>
                </div>
                <button type="button" onClick={() => firstClass && onEnter(firstClass.id)} className="h-8 rounded-full bg-[#dcfce7] px-4 text-[13px] font-bold text-[#15803d] transition hover:bg-[#22c55e] hover:text-white">生成报告</button>
              </div>
            </section>

            <section>
              <h2 className="text-[17px] font-bold text-[#191c1d]">最近动态</h2>
              <div className="mt-2.5 rounded-[18px] bg-white p-3.5">
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <button key={activity.id} type="button" onClick={() => onEnter(activity.conversationId, activity.taskId)} className="group flex w-full gap-3 text-left">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2f4f3] text-[#6b746d] transition group-hover:bg-[#dcfce7] group-hover:text-[#15803d]">{activity.icon}</span>
                      <span className="min-w-0 flex-1 border-l border-[#e8ece9] pl-3">
                        <span className="flex items-center justify-between gap-3">
                          <strong className="truncate text-sm text-[#191c1d]">{activity.title}</strong>
                          <span className="shrink-0 text-xs font-medium text-[#9aa3ad]">{activity.time}</span>
                        </span>
                        <span className="mt-1 block truncate text-[13px] font-medium text-[#66716a]">{activity.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </main>

          <aside className="space-y-4">
            <section className="rounded-[22px] bg-white p-4">
              <h2 className="text-[17px] font-bold text-[#191c1d]">今日待处理</h2>
              <div className="mt-3 space-y-2">
                {serviceRisks.map((risk) => (
                  <button key={risk.id} type="button" onClick={() => risk.targetId && onEnter(risk.targetId)} className="flex w-full gap-3 rounded-[16px] bg-[#f8faf9] px-3 py-3 text-left transition hover:bg-[#eefaf2]">
                    <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", getToneDotClass(risk.tone))} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-black", getTonePillClass(risk.tone))}>{risk.label}</span>
                      <strong className="mt-1.5 block text-[13px] text-[#191c1d]">{risk.title}</strong>
                      <span className="mt-1 block text-[12px] font-medium leading-5 text-[#66716a]">{risk.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[22px] bg-white p-4">
              <h2 className="text-[17px] font-bold text-[#191c1d]">今日处理顺序</h2>
              <div className="mt-3 space-y-2">
                {actionableTasks.slice(0, 4).map((task) => {
                  const conversation = conversationById.get(task.conversationId);
                  const todo = getTodoCopy(task);
                  return (
                    <button key={task.id} type="button" onClick={() => onEnter(task.conversationId, task.id)} className="flex w-full items-center gap-3 rounded-[14px] bg-[#f8faf9] px-3 py-3 text-left transition hover:bg-[#eefaf2]">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", todo.tone)}>{todo.icon}</span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[13px] text-[#191c1d]">{task.title}</strong>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-[#6b746d]">{conversation?.name ?? task.targetName} · {todo.label}</span>
                      </span>
                    </button>
                  );
                })}
                {actionableTasks.length === 0 ? <p className="rounded-[14px] bg-[#f8faf9] p-3 text-[13px] font-medium leading-5 text-[#6b746d]">暂无卡住的正式卡片。可以从推荐任务开始生成第一条记录。</p> : null}
              </div>
            </section>

            <section className="rounded-[22px] bg-white p-4">
              <h2 className="text-[17px] font-bold text-[#191c1d]">通知中心</h2>
              <div className="mt-3 space-y-3">
                <NotificationLine tone="yellow" title="王一路课后反馈待处理" description="今天 19:00 下课后已生成反馈任务，请及时发送家长反馈。" action="处理" onClick={() => firstStudent && onEnter(firstStudent.id)} />
                <NotificationLine tone="green" title="6 月月报待生成" description="已有学习记录可用于生成阶段总结。" action="生成" onClick={() => firstClass && onEnter(firstClass.id)} />
                <NotificationLine tone="red" title="李明轩出现学情风险" description="几何证明错误率上升，建议优先关注。" action="查看" onClick={() => attentionStudents[1] ? onEnter(attentionStudents[1].id) : firstStudent && onEnter(firstStudent.id)} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function buildTodayLessons({
  students,
  classes,
  firstStudent,
  firstClass
}: {
  students: Conversation[];
  classes: Conversation[];
  firstStudent?: Conversation;
  firstClass?: Conversation;
}) {
  const secondStudent = students.find((student) => student.id !== firstStudent?.id) ?? firstStudent;
  const secondClass = classes.find((item) => item.id !== firstClass?.id) ?? firstClass;
  return [
    {
      id: "lesson-1",
      targetId: firstClass?.id ?? firstStudent?.id ?? "assistant-global",
      start: "09:00",
      end: "10:30",
      title: firstClass ? `${firstClass.name} 班课` : `${firstStudent?.name ?? "学生"} 课程`,
      meta: `${firstClass?.subject ?? firstStudent?.subject ?? "数学"} · 待确认课后反馈`,
      status: "稍后开始",
      tone: "bg-[#f3f5f4] text-[#5c665f]"
    },
    {
      id: "lesson-2",
      targetId: firstStudent?.id ?? firstClass?.id ?? "assistant-global",
      start: "14:00",
      end: "15:30",
      title: `${firstStudent?.name ?? "重点学生"} 一对一`,
      meta: `${firstStudent?.grade ?? "初二"} · ${firstStudent?.subjectTracks?.[0] ?? "数学"} · 需复盘错题`,
      status: "待备课",
      tone: "bg-[#fff3cf] text-[#8a5a00]"
    },
    {
      id: "lesson-3",
      targetId: secondStudent?.id ?? secondClass?.id ?? "assistant-global",
      start: "17:00",
      end: "18:30",
      title: `${secondStudent?.name ?? secondClass?.name ?? "学生"} 课后跟进`,
      meta: "上次反馈未闭环，建议课前先看记录",
      status: "需关注",
      tone: "bg-[#fee2e2] text-[#dc2626]"
    }
  ];
}

function buildServiceRisks({
  firstStudent,
  firstClass,
  attentionStudents,
  pendingFeedbackCount,
  monthlyCount
}: {
  firstStudent?: Conversation;
  firstClass?: Conversation;
  attentionStudents: Conversation[];
  pendingFeedbackCount: number;
  monthlyCount: number;
}) {
  const riskStudent = attentionStudents[0] ?? firstStudent;
  return [
    {
      id: "risk-feedback",
      targetId: riskStudent?.id,
      tone: "yellow" as const,
      label: "待反馈",
      title: `${riskStudent?.name ?? "学生"} 课后反馈待处理`,
      description: `${pendingFeedbackCount} 条反馈需要老师确认，优先处理当天课程，避免家长沟通滞后。`
    },
    {
      id: "risk-monthly",
      targetId: firstClass?.id ?? riskStudent?.id,
      tone: "green" as const,
      label: "月报",
      title: `${monthlyCount} 份月报可生成`,
      description: firstClass ? `${firstClass.name} 可先生成老师看的班级复盘，再拆到学生。` : "已有学习记录可整理为阶段月报。"
    },
    {
      id: "risk-renewal",
      targetId: riskStudent?.id,
      tone: "red" as const,
      label: "服务风险",
      title: "续费前需要补足过程证据",
      description: "先沉淀学习材料分析、课堂反馈和家长沟通记录，再做续费跟进。"
    }
  ];
}

function DashboardMetric({ label, value, tone }: { label: string; value: number; tone: PanelTone }) {
  return (
    <div className="rounded-[16px] bg-[#f8faf9] px-3 py-3 text-center">
      <p className={cn("text-[22px] font-bold leading-none", getToneTextClass(tone))}>{value}</p>
      <p className="mt-1.5 text-[12px] font-semibold text-[#6b7280]">{label}</p>
    </div>
  );
}

function NotificationLine({ tone, title, description, action, onClick }: { tone: PanelTone; title: string; description: string; action: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full gap-3 rounded-[16px] bg-[#f8faf9] px-3 py-3 text-left transition hover:bg-[#eefaf2]">
      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", getToneDotClass(tone))} />
      <span className="min-w-0 flex-1">
        <strong className="block text-[13px] text-[#191c1d]">{title}</strong>
        <span className="mt-1 block text-[12px] font-medium leading-5 text-[#66716a]">{description}</span>
      </span>
      <span className="self-end rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#15803d]">{action}</span>
    </button>
  );
}

function getTodoPriority(task: TaskCard) {
  if (task.status === "failed") return 0;
  if (task.status === "feedback_done") return 1;
  if (task.status === "copied") return 2;
  return 3;
}

function getTodoCopy(task: TaskCard) {
  if (task.status === "failed") {
    return {
      label: "需检查",
      nextStep: "查看失败原因或重新生成",
      tone: "bg-[#fee2e2] text-[#b91c1c]",
      icon: <AlertCircle size={16} />
    };
  }
  if (task.status === "feedback_done") {
    return {
      label: "可入档",
      nextStep: "已发家长，确认后沉淀到学生档案",
      tone: "bg-[#dcfce7] text-[#15803d]",
      icon: <CheckCircle2 size={16} />
    };
  }
  if (task.status === "copied") {
    return {
      label: "待标记",
      nextStep: "确认反馈状态",
      tone: "bg-[#edf8f1] text-[#006e2f]",
      icon: <MessageSquareText size={16} />
    };
  }
  return {
    label: "待入档",
    nextStep: "检查内容，决定入档或继续修改",
    tone: "bg-[#f3f4f5] text-[#3d4a3d]",
    icon: <Clock3 size={16} />
  };
}

function buildRecentActivities(tasks: TaskCard[], timelineRecords: TimelineRecord[], conversationById: Map<string, Conversation>) {
  const taskActivities = tasks.slice(0, 2).map((task) => {
    const conversation = conversationById.get(task.conversationId);
    const targetName = conversation?.name ?? task.targetName;
    return {
      id: `task-${task.id}`,
      conversationId: task.conversationId,
      taskId: task.id,
      title: joinActivityTitle(targetName, task.title),
      description: getTodoCopy(task).nextStep,
      time: formatTodoTime(task.createdAt),
      icon: <CheckCircle2 size={15} />
    };
  });

  const timelineActivities = timelineRecords.slice(0, 2).map((record) => {
    const conversation = conversationById.get(record.conversationId);
    const targetName = conversation?.name ?? "学生";
    return {
      id: `timeline-${record.id}`,
      conversationId: record.conversationId,
      taskId: record.sourceTaskId,
      title: joinActivityTitle(targetName, record.title),
      description: record.summary,
      time: formatTodoTime(record.createdAt),
      icon: <Database size={15} />
    };
  });

  const fallback = [
    {
      id: "fallback-feedback",
      conversationId: "student-wang",
      taskId: undefined,
      title: "王一路 课堂反馈已保存",
      description: "AI 已整理为可复用的课后反馈依据。",
      time: "18:42",
      icon: <CheckCircle2 size={15} />
    },
    {
      id: "fallback-analysis",
      conversationId: "student-li",
      taskId: undefined,
      title: "李明轩 错题分析已归档",
      description: "本周第三次几何模块强化记录。",
      time: "17:20",
      icon: <Database size={15} />
    }
  ];

  return [...taskActivities, ...timelineActivities, ...fallback].slice(0, 4);
}

function joinActivityTitle(targetName: string, title: string) {
  const cleanTitle = title.trim();
  if (!targetName || cleanTitle.startsWith(targetName)) return cleanTitle;
  return `${targetName} ${cleanTitle}`;
}

function formatTodoTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "刚刚";
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export function SettingsPanel({
  preferences,
  onChange,
  onClearData,
  onLogout,
  teacherName,
  teacherProfile,
  conversations,
  taskCards,
  services,
  onRefresh
}: {
  preferences: UserPreferences;
  onChange: (value: UserPreferences) => void;
  onClearData: () => void;
  onLogout: () => void;
  teacherName: string;
  teacherProfile: TeacherProfile;
  conversations: Conversation[];
  taskCards: TaskCard[];
  services?: Snapshot["services"];
  onRefresh?: () => Promise<void>;
}) {
  const [view, setView] = useState<"space" | "workspace" | "notifications">("space");
  const students = conversations.filter((conversation) => conversation.kind === "student");
  const classes = conversations.filter((conversation) => conversation.kind === "class");
  const pendingFeedback = taskCards.filter((task) => task.taskType === "feedback" && (task.status === "completed" || task.status === "copied")).length;
  const teacherLabel = formatTeacherName(teacherName);
  const organizationLabel = teacherProfile.organizationName?.trim() || (teacherProfile.role === "organization" ? "机构资料未完善" : "个人工作室");
  const roleLabel = teacherProfile.role === "organization" ? "机构老师" : "个体老师";
  const subjectLabel = teacherProfile.subjects?.length ? teacherProfile.subjects.join(" / ") : "未选择科目";
  const stageLabel = teacherProfile.teachingStages?.length ? teacherProfile.teachingStages.join(" / ") : "未选择阶段";
  const modeLabel = teacherProfile.teachingModes?.length ? teacherProfile.teachingModes.join(" / ") : "未选择场景";

  if (view === "workspace") {
    return <WorkspaceProfileView teacherProfile={teacherProfile} studentCount={students.length} classCount={classes.length} onBack={() => setView("space")} />;
  }

  if (view === "notifications") {
    return <NotificationCenterView pendingFeedback={pendingFeedback} monthlyCount={taskCards.filter(task => task.taskType === "monthly_report").length} riskCount={students.filter(student => student.attention).length} aiDone={taskCards.filter(task => task.status !== "running" && task.status !== "failed").length} onBack={() => setView("space")} />;
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f6f7f6] px-6 py-6">
      <div className="mx-auto grid max-w-[1180px] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[24px] bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-[#e9f8ef] text-xl font-bold text-[#15803d]">{teacherLabel.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[24px] font-bold tracking-tight text-[#191c1d]">{teacherLabel}</h1>
                <p className="mt-1 truncate text-[13px] font-semibold text-[#66716a]">{organizationLabel}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-bold text-[#15803d]">{roleLabel}</span>
                  <span className="inline-flex rounded-full bg-[#f2f4f3] px-2.5 py-1 text-[11px] font-bold text-[#5c665f]">体验版</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 rounded-[18px] bg-[#f8faf9] py-3 text-center">
              <MiniStat label="学生" value={students.length} />
              <MiniStat label="班级" value={classes.length} />
              <MiniStat label="待反馈" value={pendingFeedback} />
            </div>
          </section>

          <section className="rounded-[24px] bg-white p-5">
            <h2 className="text-[17px] font-bold text-[#191c1d]">默认反馈语气</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["温和", "严谨", "鼓励型", "简洁型"] as const).map((tone) => (
                <button key={tone} type="button" onClick={() => onChange({ ...preferences, feedbackTone: tone })} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${preferences.feedbackTone === tone ? "bg-[#22c55e] text-white" : "bg-[#f3f4f5] text-[#3d4a3d] hover:bg-[#edf8f1]"}`}>
                  {tone}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-5">
          <header>
            <p className="text-[13px] font-bold text-[#22c55e]">我的空间</p>
            <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#191c1d]">工作室、AI 助教与通知设置</h1>
            <p className="mt-1.5 text-[14px] font-medium text-[#6b7280]">只保留老师日常会用到的设置入口，复杂权限和机构后台先不展开。</p>
          </header>

          <SettingsGroup title="工作室与账号">
            <SettingsRow icon={<Building2 size={19} />} title="工作室资料" description="管理工作室名称、认证信息和展示资料" onClick={() => setView("workspace")} />
            <SettingsRow icon={<ShieldCheck size={19} />} title="账号与安全" description="手机号、登录密码和账号安全设置" />
            <SettingsRow icon={<GraduationCap size={19} />} title="老师授课信息" description={`${stageLabel} · ${subjectLabel} · ${modeLabel}`} />
          </SettingsGroup>

          <SettingsGroup title="AI 助教">
            <SettingsRow icon={<Sparkles size={19} />} title="AI 助教设置" description="设置默认反馈语气、分析深度和生成偏好" />
            <SettingsToggleRow
              icon={<BookOpenCheck size={19} />}
              title="上传材料后自动分析"
              description="打开后，上传试卷或作业图片会优先进入学习材料分析流程"
              checked={preferences.autoAnalyzeUploadedPaper}
              onChange={(checked) => onChange({ ...preferences, autoAnalyzeUploadedPaper: checked })}
            />
            <SettingsToggleRow
              icon={<Database size={19} />}
              title="分析结果自动加入资料库"
              description="老师确认过默认行为后，可把分析草稿先放入资料库；正式学生档案仍需单独确认"
              checked={preferences.autoArchiveLearningEvidence}
              onChange={(checked) => onChange({ ...preferences, autoArchiveLearningEvidence: checked })}
            />
          </SettingsGroup>

          <SettingsGroup title="通知与数据">
            <SettingsRow icon={<Bell size={19} />} title="通知中心" description="查看待反馈、月报、学情风险和已生成内容提醒" onClick={() => setView("notifications")} />
            <SettingsRow icon={<ClipboardList size={19} />} title="反馈模板管理" description="管理家长反馈结构、常用语气和月报模板" />
            <SettingsRow icon={<Database size={19} />} title="学生档案管理" description="管理学生档案、学习记录和历史数据" />
          </SettingsGroup>

          {services && onRefresh ? <SettingsGroup title="多维度教学助手"><BackendConnection connected={services.mdt} onRefresh={onRefresh} /></SettingsGroup> : null}

          <SettingsGroup title="帮助与支持">
            <SettingsRow icon={<HelpCircle size={19} />} title="帮助中心" description="查看常见问题和使用说明" />
            <SettingsRow icon={<MessageSquareText size={19} />} title="意见反馈" description="把你觉得别扭的流程直接告诉我们" />
            <div className="flex flex-wrap gap-2 px-1 pt-2">
              <button type="button" onClick={onClearData} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f3f4f5] px-4 text-sm font-bold text-[#3d4a3d] transition hover:bg-[#e8ece9]">
                <RotateCcw size={15} />
                导出我的记录
              </button>
              <button type="button" onClick={onLogout} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#fff1f1] px-4 text-sm font-bold text-[#dc2626] transition hover:bg-[#fee2e2]">
                <LogOut size={15} />
                退出登录
              </button>
            </div>
          </SettingsGroup>
        </main>
      </div>
    </div>
  );
}

function WorkspaceProfileView({ teacherProfile, studentCount, classCount, onBack }: { teacherProfile: TeacherProfile; studentCount: number; classCount: number; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  const organizationLabel = teacherProfile.organizationName?.trim() || (teacherProfile.role === "organization" ? "机构资料未完善" : "个人工作室");
  const roleLabel = teacherProfile.role === "organization" ? "机构老师" : "个体老师";
  const subjectLabel = teacherProfile.subjects?.length ? teacherProfile.subjects.join(" / ") : "未选择科目";
  const stageLabel = teacherProfile.teachingStages?.length ? teacherProfile.teachingStages.join(" / ") : "未选择阶段";
  const modeLabel = teacherProfile.teachingModes?.length ? teacherProfile.teachingModes.join(" / ") : "未选择场景";

  return (
    <div className="h-full overflow-y-auto bg-[#f6f7f6] px-6 py-6">
      <div className="mx-auto max-w-[1120px]">
        <PanelHeader eyebrow="工作室资料" title={organizationLabel} subtitle="用于老师对外展示与 AI 服务规则识别，当前为 mock 资料。" onBack={onBack} right={<button type="button" onClick={() => setEditing((value) => !value)} className="h-9 rounded-full bg-[#22c55e] px-4 text-sm font-bold text-white">{editing ? "保存" : "编辑资料"}</button>} />
        <div className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="rounded-[24px] bg-white p-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#f1f4f2] text-[#6b7280]">
              <Building2 size={34} />
            </div>
            <h2 className="mt-4 text-center text-[22px] font-bold text-[#191c1d]">{organizationLabel}</h2>
            <p className="mt-1 text-center text-[13px] font-semibold text-[#22c55e]">{roleLabel}</p>
            <div className="mt-5 grid grid-cols-3 rounded-[18px] bg-[#f8faf9] py-3 text-center">
              <MiniStat label="学生" value={studentCount || 32} />
              <MiniStat label="班级" value={classCount || 8} />
              <MiniStat label="账号" value="体验版" />
            </div>
          </section>

          <section className="grid gap-4">
            <InfoRows
              rows={[
                ["所在城市", teacherProfile.city || "未设置"],
                ["授课阶段", stageLabel],
                ["核心科目", subjectLabel],
                ["教学场景", modeLabel]
              ]}
            />
            <InfoRows
              rows={[
                ["教学风格", "专业、温和、重证据"],
                ["AI 助手名称", "学脉助手"],
                ["当前版本", "专业版 Pro"],
                ["到期时间", "2026 年 12 月 31 日"]
              ]}
            />
            <section className="rounded-[22px] bg-[#f2eadc] p-4 text-[13px] font-medium leading-6 text-[#5c5549]">
              <strong className="mb-1 block text-sm text-[#2b2f2d]">说明</strong>
              工作室资料用于统一反馈口径和月报署名。后续接入真实账号后，这里会读取机构信息、老师身份、版本状态和安全设置。
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}

function NotificationCenterView({
  pendingFeedback,
  monthlyCount,
  riskCount,
  aiDone,
  onBack
}: {
  pendingFeedback: number;
  monthlyCount: number;
  riskCount: number;
  aiDone: number;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState("全部");
  const notifications = useMemo(
    () => [
      { id: "n1", type: "待反馈", tone: "yellow" as const, title: "王一路课后反馈待处理", description: "今天 19:00 下课后已自动生成反馈任务，请及时发送家长反馈。", meta: "初二数学 A 班 · 三角形全等", action: "立即处理" },
      { id: "n2", type: "月报", tone: "green" as const, title: "6 月月报待生成", description: "王一路本月学习记录已完整，可以生成家长版月报。", meta: "王一路 · 2026 年 6 月", action: "生成月报" },
      { id: "n3", type: "学情风险", tone: "red" as const, title: "李明轩出现学情风险", description: "近 3 次作业中，几何证明错误率上升，建议优先关注。", meta: "初二数学 A 班 · 几何证明", action: "查看详情" },
      { id: "n4", type: "已生成", tone: "blue" as const, title: "张子涵作业分析已完成", description: "作业分析已生成，可查看错题成因并生成反馈。", meta: "张子涵 · 分式方程", action: "查看分析" }
    ],
    []
  );
  const filters = ["全部", "待反馈", "月报", "学情风险", "已生成"];
  const visible = filter === "全部" ? notifications : notifications.filter((item) => item.type === filter);

  return (
    <div className="h-full overflow-y-auto bg-[#f6f7f6] px-6 py-6">
      <div className="mx-auto max-w-[1080px]">
        <PanelHeader eyebrow="通知中心" title="需要老师处理的服务提醒" subtitle="只展示会影响反馈、月报、学情风险和已生成内容处理的通知。" onBack={onBack} right={<button type="button" className="h-9 rounded-full bg-white px-4 text-sm font-bold text-[#5c665f]">全部已读</button>} />
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <DashboardMetric label="待反馈" value={pendingFeedback} tone="yellow" />
          <DashboardMetric label="月报" value={monthlyCount} tone="green" />
          <DashboardMetric label="学情风险" value={riskCount} tone="red" />
          <DashboardMetric label="已生成" value={aiDone} tone="blue" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={cn("h-9 rounded-full px-4 text-sm font-bold transition", filter === item ? "bg-[#22c55e] text-white" : "bg-white text-[#5c665f] hover:bg-[#edf8f1]")}>{item}</button>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          {visible.map((item) => (
            <section key={item.id} className="rounded-[22px] bg-white p-4">
              <div className="flex gap-3">
                <span className={cn("mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full", getToneSoftClass(item.tone))}>{getNotificationIcon(item.type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", getTonePillClass(item.tone))}>{item.type}</span>
                    <span className="text-xs font-semibold text-[#8a948d]">10 分钟前</span>
                  </div>
                  <h2 className="mt-2 text-[16px] font-bold text-[#191c1d]">{item.title}</h2>
                  <p className="mt-1 text-[13px] font-medium leading-5 text-[#66716a]">{item.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1ef] pt-3">
                    <span className="text-xs font-semibold text-[#9aa3ad]">{item.meta}</span>
                    <button type="button" className="h-8 rounded-full bg-[#22c55e] px-4 text-xs font-bold text-white">{item.action}</button>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ eyebrow, title, subtitle, onBack, right }: { eyebrow: string; title: string; subtitle: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#3d4a3d] transition hover:bg-[#edf8f1]">
          <ChevronLeft size={17} />
          返回
        </button>
        <p className="text-[13px] font-bold text-[#22c55e]">{eyebrow}</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight text-[#191c1d]">{title}</h1>
        <p className="mt-1.5 text-[14px] font-medium text-[#6b7280]">{subtitle}</p>
      </div>
      {right}
    </header>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[13px] font-bold text-[#66716a]">{title}</h2>
      <div className="overflow-hidden rounded-[22px] bg-white">{children}</div>
    </section>
  );
}

function SettingsRow({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-[#edf0ef] px-4 py-4 text-left transition last:border-b-0 hover:bg-[#f8faf9]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2f4f3] text-[#6b746d]">{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm text-[#191c1d]">{title}</strong>
        <span className="mt-0.5 block truncate text-[12px] font-medium text-[#66716a]">{description}</span>
      </span>
      <ChevronRight size={17} className="text-[#a0a8a2]" />
    </button>
  );
}

function BackendConnection({ connected, onRefresh }: { connected: boolean; onRefresh: () => Promise<void> }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [classes, setClasses] = useState<{ classId: string; name: string; _count: { students: number } }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function perform(work: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await work(); await onRefresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "操作未完成，请重试"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 px-1">
    <p className="text-[13px] font-semibold leading-6 text-[#6b746d]">{connected ? "教师账号已连接，可读取班级并导入学脉。" : "使用已有教师账号，导入班级与学生。"}</p>
    {!connected ? <>
      <AuthField label="教师账号" value={identifier} onChange={setIdentifier} placeholder="多维度教学助手账号或邮箱" />
      <AuthField label="教师密码" value={password} onChange={setPassword} placeholder="请输入密码" type="password" />
      <AuthPrimaryButton disabled={busy || !identifier || !password} onClick={() => void perform(async () => { await backend("mdt", { action: "connect", identifier, password }); setPassword(""); setMessage("教师账号已连接"); })}>连接教师账号</AuthPrimaryButton>
    </> : <AuthPrimaryButton disabled={busy} onClick={() => void perform(async () => { const result = await backend<{ classes: typeof classes }>("mdt"); setClasses(result.classes); setMessage(result.classes.length ? "" : "这个账号暂无班级"); })}>{busy ? "正在读取…" : "读取班级列表"}</AuthPrimaryButton>}
    {classes.map(item => <div key={item.classId} className="flex items-center gap-3 rounded-[14px] bg-[#f8faf9] px-3 py-3">
      <span className="min-w-0 flex-1 text-[13px] font-bold text-[#191c1d]">{item.name}<small className="mt-1 block text-[11px] font-medium text-[#6b746d]">{item._count.students} 位学生</small></span>
      <button type="button" disabled={busy} onClick={() => void perform(async () => { await backend("mdt", { action: "import", classId: String(item.classId) }); setMessage("班级与学生已导入"); })} className="h-8 rounded-full bg-[#dcfce7] px-3 text-xs font-bold text-[#15803d]">导入</button>
    </div>)}
    {message ? <p role="status" className="text-[12px] font-semibold leading-5 text-[#6b746d]">{message}</p> : null}
  </div>;
}

function SettingsToggleRow({ icon, title, description, checked, onChange }: { icon: React.ReactNode; title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 border-b border-[#edf0ef] px-4 py-4 last:border-b-0 hover:bg-[#f8faf9]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9f8ef] text-[#16a34a]">{icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm text-[#191c1d]">{title}</strong>
        <span className="mt-0.5 block truncate text-[12px] font-medium text-[#66716a]">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#22c55e]" />
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-r border-[#e4e8e5] last:border-r-0">
      <p className="text-[17px] font-bold text-[#191c1d]">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-[#7a837d]">{label}</p>
    </div>
  );
}

function InfoRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <section className="overflow-hidden rounded-[22px] bg-white">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-5 border-b border-[#edf0ef] px-4 py-4 last:border-b-0">
          <span className="text-sm font-semibold text-[#6b7280]">{label}</span>
          <strong className="text-right text-sm text-[#191c1d]">{value}</strong>
        </div>
      ))}
    </section>
  );
}

function getNotificationIcon(type: string) {
  if (type === "待反馈") return <Bell size={18} />;
  if (type === "月报") return <FileText size={18} />;
  if (type === "学情风险") return <AlertCircle size={18} />;
  return <Sparkles size={18} />;
}

function formatTeacherName(name: string) {
  if (!name.trim()) return "Eric 老师";
  return name.includes("老师") ? name : `${name} 老师`;
}

function getTonePillClass(tone: PanelTone) {
  const tones = {
    green: "bg-[#dcfce7] text-[#15803d]",
    yellow: "bg-[#fff3cf] text-[#8a5a00]",
    blue: "bg-[#e0f2fe] text-[#0369a1]",
    red: "bg-[#fee2e2] text-[#dc2626]",
    gray: "bg-[#f2f4f3] text-[#5c665f]"
  };
  return tones[tone];
}

function getToneSoftClass(tone: PanelTone) {
  const tones = {
    green: "bg-[#dcfce7] text-[#15803d]",
    yellow: "bg-[#fff7df] text-[#b7791f]",
    blue: "bg-[#e0f2fe] text-[#0369a1]",
    red: "bg-[#fee2e2] text-[#dc2626]",
    gray: "bg-[#f2f4f3] text-[#5c665f]"
  };
  return tones[tone];
}

function getToneDotClass(tone: PanelTone) {
  const tones = {
    green: "bg-[#22c55e]",
    yellow: "bg-[#f59e0b]",
    blue: "bg-[#38bdf8]",
    red: "bg-[#ef4444]",
    gray: "bg-[#c2c8c3]"
  };
  return tones[tone];
}

function getToneTextClass(tone: PanelTone) {
  const tones = {
    green: "text-[#16a34a]",
    yellow: "text-[#f59e0b]",
    blue: "text-[#38bdf8]",
    red: "text-[#ef4444]",
    gray: "text-[#6b7280]"
  };
  return tones[tone];
}
