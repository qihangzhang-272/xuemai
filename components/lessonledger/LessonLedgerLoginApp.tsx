"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, CheckCircle2, ClipboardCheck, CreditCard, Loader2, LogIn, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type LoginRole = "teacher" | "parent";
type LoginStatus = "idle" | "loading" | "success" | "error" | "unauthorized" | "network";

const validTeacherAuthCode = "KIN-TRY-2026";

const roleCopy: Record<LoginRole, { title: string; subtitle: string; account: string; password: string; destination: string }> = {
  teacher: {
    title: "教师端登录",
    subtitle: "进入工作台处理课程、反馈、预约和课时流水。",
    account: "admin",
    password: "demo123456",
    destination: "/workbench-v2?role=teacher"
  },
  parent: {
    title: "家长端登录",
    subtitle: "查看课程反馈、学习报告、账务和预约状态。",
    account: "parent",
    password: "demo123456",
    destination: "/workbench-v2?role=parent"
  }
};

export function LessonLedgerLoginApp() {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("teacher");
  const [account, setAccount] = useState(roleCopy.teacher.account);
  const [password, setPassword] = useState(roleCopy.teacher.password);
  const [authCode, setAuthCode] = useState(validTeacherAuthCode);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const accountInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const authCodeInputRef = useRef<HTMLInputElement>(null);
  const activeCopy = roleCopy[role];
  const loginBusy = status === "loading";
  const loginStatusCopy: Record<LoginStatus, { label: string; desc: string; className: string; icon: typeof ShieldCheck }> = {
    idle: {
      label: "请输入账号和密码登录",
      desc: "试用账号已自动填入，也可以切换教师端或家长端。",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      icon: ShieldCheck
    },
    loading: {
      label: "正在登录...",
      desc: "正在校验账号、密码和授权码。",
      className: "border-blue-200 bg-blue-50 text-blue-700",
      icon: Loader2
    },
    success: {
      label: "登录成功",
      desc: "即将进入对应工作台。",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2
    },
    error: {
      label: "账号或密码错误",
      desc: "请检查账号、密码后重试，已保留当前输入。",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      icon: AlertTriangle
    },
    unauthorized: {
      label: "当前账号未授权",
      desc: "请输入授权码或联系管理员开通试用。",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: ShieldCheck
    },
    network: {
      label: "网络异常，请稍后重试",
      desc: "当前页面保留输入内容，不会丢失账号和授权码。",
      className: "border-orange-200 bg-orange-50 text-orange-700",
      icon: AlertTriangle
    }
  };
  const activeStatusCopy = loginStatusCopy[status];
  const ActiveStatusIcon = activeStatusCopy.icon;

  function switchRole(nextRole: LoginRole) {
    setRole(nextRole);
    setAccount(roleCopy[nextRole].account);
    setPassword(roleCopy[nextRole].password);
    setAuthCode(validTeacherAuthCode);
    setError("");
    setStatus("idle");
  }

  function resetTransientState() {
    setStatus("idle");
    setError("");
  }

  function updateAccount(value: string) {
    setAccount(value);
    resetTransientState();
  }

  function updatePassword(value: string) {
    setPassword(value);
    resetTransientState();
  }

  function updateAuthCode(value: string) {
    setAuthCode(value);
    resetTransientState();
  }

  function fillDemo(nextRole = role) {
    setRole(nextRole);
    setAccount(roleCopy[nextRole].account);
    setPassword(roleCopy[nextRole].password);
    setAuthCode(validTeacherAuthCode);
    setError("");
    setStatus("idle");
  }

  function failWith(nextStatus: LoginStatus, message: string) {
    setStatus(nextStatus);
    setError(message);
  }

  function validateAccount(value: string) {
    const trimmed = value.trim();
    if (trimmed === "admin" || trimmed === "parent") {
      return true;
    }

    if (trimmed.length < 6 || trimmed.length > 64) {
      return false;
    }

    return /^1\d{10}$/.test(trimmed) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }

  function submitLogin() {
    if (loginBusy) {
      return;
    }

    setError("");
    const submittedAccount = (accountInputRef.current?.value ?? account).trim();
    const submittedPassword = passwordInputRef.current?.value ?? password;
    const submittedAuthCode = authCodeInputRef.current?.value ?? authCode;

    if (submittedAccount.toLowerCase() === "offline") {
      failWith("network", "网络异常，请稍后重试");
      return;
    }

    if (!validateAccount(submittedAccount)) {
      failWith("error", "请输入正确的手机号或邮箱");
      return;
    }

    if (!submittedPassword.trim()) {
      failWith("error", "请输入密码");
      return;
    }

    if (submittedPassword.length < 8 || submittedPassword.length > 32) {
      failWith("error", "请输入 8-32 位密码");
      return;
    }

    if (role === "teacher") {
      const normalizedAuthCode = submittedAuthCode.trim().toUpperCase();
      if (!normalizedAuthCode) {
        failWith("unauthorized", "当前账号未授权，请输入授权码或联系管理员");
        return;
      }

      if (!/^[A-Z0-9-]{8,64}$/.test(normalizedAuthCode)) {
        failWith("unauthorized", "授权码格式不正确");
        return;
      }

      if (normalizedAuthCode !== validTeacherAuthCode) {
        failWith("unauthorized", "当前账号未授权，请输入授权码或联系管理员");
        return;
      }
    }

    if (submittedAccount !== activeCopy.account || submittedPassword !== activeCopy.password) {
      failWith("error", "账号或密码错误");
      return;
    }

    setStatus("loading");
    window.setTimeout(() => {
      setStatus("success");
      window.setTimeout(() => router.push(activeCopy.destination), 260);
    }, 420);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-6 px-5 py-10 lg:grid-cols-[400px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-zinc-950 text-white shadow-sm">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">LessonLedger</p>
              <p className="mt-1 text-sm text-slate-500">独立老师课时管理系统</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1">
            {(["teacher", "parent"] as LoginRole[]).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => switchRole(item)}
                className={cn(
                  "h-9 rounded text-sm font-medium transition",
                  role === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {item === "teacher" ? "教师端" : "家长端"}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <h1 className="text-xl font-semibold tracking-normal">{activeCopy.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{activeCopy.subtitle}</p>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">账号</span>
              <input
                ref={accountInputRef}
                value={account}
                onChange={(event) => updateAccount(event.currentTarget.value)}
                onInput={(event) => updateAccount(event.currentTarget.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                placeholder={role === "teacher" ? "手机号 / 邮箱 / 管理账号" : "家长手机号 / 家长账号"}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">密码</span>
              <input
                ref={passwordInputRef}
                value={password}
                type="password"
                onChange={(event) => updatePassword(event.currentTarget.value)}
                onInput={(event) => updatePassword(event.currentTarget.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                placeholder="请输入密码"
              />
            </label>
            {role === "teacher" ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">授权码</span>
                <input
                  ref={authCodeInputRef}
                  value={authCode}
                  onChange={(event) => updateAuthCode(event.currentTarget.value)}
                  onInput={(event) => updateAuthCode(event.currentTarget.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  placeholder="例如：KIN-TRY-2026"
                />
              </label>
            ) : null}
          </div>

          <div className={cn("mt-4 rounded-md border px-3 py-2.5", activeStatusCopy.className)}>
            <div className="flex items-start gap-2.5">
              <ActiveStatusIcon className={cn("mt-0.5 size-4 shrink-0", loginBusy ? "animate-spin" : "")} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{error || activeStatusCopy.label}</p>
                <p className="mt-0.5 text-xs leading-5 opacity-80">{activeStatusCopy.desc}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fillDemo("teacher")}
              className="h-8 rounded-md border border-slate-200 bg-slate-50 font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white"
            >
              填入教师演示账号
            </button>
            <button
              type="button"
              onClick={() => fillDemo("parent")}
              className="h-8 rounded-md border border-slate-200 bg-slate-50 font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white"
            >
              填入家长演示账号
            </button>
          </div>

          <button
            type="button"
            onClick={submitLogin}
            disabled={loginBusy}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-70"
          >
            {loginBusy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {loginBusy ? "正在登录..." : "登录并进入系统"}
          </button>

          <p className="mt-3 text-xs leading-5 text-slate-400">试用版本入口；历史课程、课时流水和家庭账号在更新时保留。</p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">试用授权入口</p>
              <p className="mt-1 text-xl font-semibold">{role === "teacher" ? "教师工作台" : "家长门户"}</p>
              <p className="mt-1 text-sm text-slate-500">Kin 数学工作室 · Qrane老师</p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              试用授权有效
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["今日课程", role === "teacher" ? "5 节" : "2 条"],
              ["本周课程", "21 节"],
              ["本月实收", "¥11,250"],
              ["当前版本", "1.0.11"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
            <div className="grid grid-cols-[112px_minmax(0,1fr)_96px] border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
              <span>账号</span>
              <span>入口</span>
              <span className="text-right">状态</span>
            </div>
            {[
              ["admin", "教师端 · 工作台 / 学生 / 排课预约 / 财务记录", "已授权"],
              ["parent", "家长端 · 反馈 / 报告 / 预约 / 留言", "已绑定"]
            ].map(([name, entry, status]) => (
              <div key={name} className="grid grid-cols-[112px_minmax(0,1fr)_96px] items-center border-b border-slate-100 px-3 py-3 last:border-b-0">
                <p className="text-sm font-semibold text-slate-950">{name}</p>
                <p className="truncate text-sm text-slate-500">{entry}</p>
                <p className="text-right text-sm font-semibold text-emerald-700">{status}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              [Calendar, "预约排课", "开放预约时段，家长提交后老师审核冲突。"],
              [CreditCard, "课时流水", "充值、扣课、撤销和余额变化集中记录。"],
              [Users, "家校沟通", "围绕反馈发起沟通，老师回复后状态确认。"],
              [ShieldCheck, "数据保留", "版本更新保留课程、学生、家庭账号和流水。"]
            ].map(([Icon, title, desc]) => {
              const TypedIcon = Icon as typeof Calendar;
              return (
                <div key={title as string} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start gap-3">
                    <TypedIcon className="mt-0.5 size-4 text-slate-700" />
                    <div>
                      <p className="text-sm font-semibold">{title as string}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{desc as string}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
