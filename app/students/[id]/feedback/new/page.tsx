import { AppShell } from "@/components/layout/AppShell";
import { PracticeFeedbackWorkspace } from "@/components/feedback/PracticeFeedbackWorkspace";
import { getStudentById } from "@/lib/mock/data";

export default async function NewFeedbackPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = getStudentById(id);

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--app-text-muted)]">{student.name} · {student.className}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#191919]">反馈 Agent 单次任务</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-text-muted)]">
            上传练习图片，先让 AI 识别材料并校正，再生成一段可复制给家长的微信反馈。
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#f1efeb] px-3 py-1 text-xs font-medium text-[var(--app-text-muted)]">
          演示型界面
        </span>
      </div>

      <PracticeFeedbackWorkspace
        student={{
          name: student.name,
          grade: student.grade,
          subject: student.subject,
          parent: student.parent
        }}
      />
    </AppShell>
  );
}
