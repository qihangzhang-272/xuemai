"use client";

import { AlertTriangle, ArrowRight, Check, ClipboardCheck, Phone, User, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type InviteStatus = "待激活" | "已激活" | "已过期" | "已失效";

type FamilyInvite = {
  id: string;
  token: string;
  studentId: string;
  studentName: string;
  parentName: string;
  status: InviteStatus;
  inviteLink: string;
  createdAt: string;
  expiresAt: string;
  activatedAt?: string;
  parentPhone?: string;
};

type LessonLedgerSnapshot = {
  teacher: {
    name: string;
    studioName: string;
    subject: string;
  };
  familyInvites: FamilyInvite[];
};

type ApiResponse =
  | {
      success: true;
      data: LessonLedgerSnapshot;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
    };

export function FamilyInviteActivationApp({ inviteKey }: { inviteKey: string }) {
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [teacher, setTeacher] = useState<LessonLedgerSnapshot["teacher"] | null>(null);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      try {
        const response = await fetch("/api/workbench-v2", { cache: "no-store" });
        const result = (await response.json()) as ApiResponse;

        if (!result.success) {
          throw new Error(result.error.message);
        }

        const nextInvite = result.data.familyInvites.find((item) => item.id === inviteKey || item.token === inviteKey) ?? null;
        if (!cancelled) {
          setInvite(nextInvite);
          setTeacher(result.data.teacher);
          setParentName(nextInvite?.parentName ?? "");
          setParentPhone(nextInvite?.parentPhone ?? "");
          setActivated(nextInvite?.status === "已激活");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "邀请信息加载失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInvite();

    return () => {
      cancelled = true;
    };
  }, [inviteKey]);

  async function activateInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!parentName.trim()) {
      setError("请填写家长姓名");
      return;
    }

    if (!/^1\d{10}$/.test(parentPhone.trim())) {
      setError("请输入 11 位家长手机号");
      return;
    }

    if (!invite) {
      setError("邀请信息不存在或已失效，请联系老师重新生成");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/workbench-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "activateFamilyInvite",
          payload: {
            inviteId: invite.id,
            parentName,
            parentPhone
          }
        })
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "激活失败，请重试" : result.error.message);
      }

      const nextInvite = result.data.familyInvites.find((item) => item.id === invite.id) ?? null;
      setInvite(nextInvite);
      setActivated(nextInvite?.status === "已激活");
      if (nextInvite?.status === "已过期") {
        setError("邀请链接已过期，请联系老师重新生成");
      }
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "激活失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  function goParentPortal() {
    const targetStudentId = invite?.studentId ? `&studentId=${encodeURIComponent(invite.studentId)}` : "";
    window.location.href = `/workbench-v2?role=parent${targetStudentId}`;
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-4 py-8 text-slate-950 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-zinc-950 text-white shadow-sm">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">LessonLedger</p>
              <p className="text-sm text-slate-500">家庭账号激活</p>
            </div>
          </div>
          <button
            type="button"
            onClick={goParentPortal}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            已有账号
            <ArrowRight className="size-4" />
          </button>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="text-sm text-slate-500">老师邀请你加入家庭门户</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">激活后可查看课程反馈、学习报告和预约记录</h1>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">正在加载邀请信息...</div>
              ) : !invite ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="size-4" />
                    邀请链接不可用
                  </div>
                  <p className="mt-2">请联系老师重新生成家庭邀请链接。</p>
                </div>
              ) : activated ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-emerald-600 text-white">
                      <Check className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-950">家庭账号已激活</p>
                      <p className="mt-1 text-sm text-emerald-700">你已经绑定 {invite.studentName}，现在可以进入家长端查看最新反馈。</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={goParentPortal}
                    className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                  >
                    进入家长端
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={activateInvite}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <InfoBox label="绑定学生" value={invite.studentName} icon={User} />
                    <InfoBox label="授课老师" value={teacher?.name ?? "Qrane老师"} icon={ClipboardCheck} />
                    <InfoBox label="账号状态" value={invite.status} tone="amber" icon={AlertTriangle} />
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    邀请有效期至：{formatInviteExpiresAt(invite.expiresAt)}
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">家长姓名</span>
                    <input
                      value={parentName}
                      onChange={(event) => setParentName(event.target.value)}
                      className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-zinc-950"
                      placeholder="请输入家长姓名"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">家长手机号</span>
                    <div className="mt-2 flex h-11 items-center rounded-md border border-slate-200 bg-white px-3 focus-within:border-zinc-950">
                      <Phone className="mr-2 size-4 text-slate-400" />
                      <input
                        value={parentPhone}
                        onChange={(event) => setParentPhone(event.target.value)}
                        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                        placeholder="请输入 11 位手机号"
                      />
                    </div>
                  </label>

                  {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {submitting ? "正在激活..." : "激活家庭账号"}
                    <ArrowRight className="size-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-semibold">激活后可使用</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <FeatureItem title="查看最新反馈" desc="老师发布后，家长端首页会同步显示。" />
              <FeatureItem title="查看学习报告" desc="阶段报告保存后，家庭门户可直接查看。" />
              <FeatureItem title="提交预约申请" desc="选择老师开放的预约时段，等待老师审核。" />
              <FeatureItem title="围绕反馈沟通" desc="问题会自动关联课程反馈，老师端实时处理。" />
            </div>
            <div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs leading-5 text-slate-500">
              工作室：{teacher?.studioName ?? "Kin 数学工作室"}
              <br />
              授课方向：{teacher?.subject ?? "初高中数学"}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function InfoBox({
  label,
  value,
  icon: Icon,
  tone = "slate"
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "slate" | "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <Icon className={tone === "amber" ? "size-4 text-amber-600" : "size-4 text-blue-600"} />
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className={tone === "amber" ? "mt-1 font-semibold text-amber-700" : "mt-1 font-semibold text-slate-950"}>{value}</p>
    </div>
  );
}

function formatInviteExpiresAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "待系统确认";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  })
    .format(date)
    .replace(/\//g, "-");
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="font-medium text-slate-950">{title}</p>
      <p className="mt-1 leading-5">{desc}</p>
    </div>
  );
}
