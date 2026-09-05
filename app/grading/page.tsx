import { Camera, CheckCircle2, ClipboardPen, UploadCloud } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function GradingPage() {
  const completedActions = ["已生成微信反馈", "已更新错题记录", "已更新学习画像", "已同步班级洞察"];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <section>
          <p className="text-sm font-semibold text-[#16A34A]">教学事件触发入口</p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight text-[#111827]">AI 批改</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--app-text-muted)]">
            上传试卷、拍照错题或手动录入批改结果后，学脉会把结果整理进学生和班级时间轴。
          </p>
        </section>

        <section className="rounded-[28px] border border-[var(--app-line)] bg-white p-6 shadow-[var(--app-shadow-sm)]">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
              <UploadCloud size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">拍照或上传试卷</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">支持错题识别、知识点提取、反馈生成和档案更新。</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#22C55E] px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(34,197,94,0.18)]">
                  <Camera size={16} />
                  拍照上传
                </button>
                <button type="button" className="inline-flex h-11 items-center rounded-full border border-[var(--app-line-strong)] bg-white px-4 text-sm font-semibold text-[#374151]">
                  选择文件
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--app-line)] bg-white p-6 shadow-[var(--app-shadow-sm)]">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAFBF0] text-[#16A34A]">
              <ClipboardPen size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-[#111827]">手动录入批改结果</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">当前 MVP 可先用固定 mock 结果测试完整入档流程。</p>
              <Link href="/students/mock-student-1" className="mt-5 inline-flex h-11 items-center rounded-full bg-[#DCFCE7] px-4 text-sm font-semibold text-[#166534]">
                查看王一路档案
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-[#16A34A] p-6 text-white shadow-[0_18px_42px_rgba(22,163,74,0.2)]">
          <h2 className="text-lg font-bold">批改完成后的自动入档</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {completedActions.map((action) => (
              <div key={action} className="flex items-center gap-2 rounded-full bg-white/14 px-3 py-2 text-sm font-semibold">
                <CheckCircle2 size={16} />
                {action}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
