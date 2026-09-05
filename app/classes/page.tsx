import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { classes, getStudentsByClass, type Student, type WechatFeedbackStatus } from "@/lib/mock/data";

const statusStyles: Record<WechatFeedbackStatus, string> = {
  needs_feedback: "bg-[var(--app-red)] text-white border-[var(--app-red)]",
  feedback_done: "bg-[var(--app-green)] text-white border-[var(--app-green)]",
  no_submission: "bg-transparent text-[var(--app-text-muted)] border-[var(--app-empty)] border-dashed"
};

function StudentDot({ student }: { student: Student }) {
  return (
    <Link href={`/students/${student.id}`} className="group flex flex-col items-center gap-2 rounded-[18px] p-2 text-center transition hover:bg-white/70">
      <span
        className={`flex h-[74px] w-[74px] items-center justify-center rounded-full border-[1.5px] px-2 text-[13px] font-semibold leading-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition group-hover:scale-[1.04] ${statusStyles[student.wechatFeedbackStatus]}`}
      >
        {student.name}
      </span>
      <span className="max-w-28 text-xs leading-5 text-[var(--app-text-muted)]">
        {student.coreIssue} · {student.currentState}
      </span>
    </Link>
  );
}

export default function ClassesPage() {
  const focusStudents = classes.flatMap((classGroup) => getStudentsByClass(classGroup)).filter((student) => student.wechatFeedbackStatus !== "feedback_done").slice(0, 3);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2 md:absolute md:right-[70px] md:top-24 md:text-right">
        <p className="text-3xl font-medium tracking-tight text-[#191919]">周日</p>
        <p className="text-lg text-[var(--app-text-muted)]">5月31日</p>
      </div>

      <div className="grid gap-10 xl:grid-cols-[280px_1fr] xl:gap-16">
        <CollapsibleSection
          title="重点关注"
          summary="本次需要老师优先处理的学生和操作。"
          className="rounded-[26px] bg-[rgba(242,239,233,0.86)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),var(--app-shadow-sm)]"
        >
          <div className="space-y-3">
            {focusStudents.map((student) => (
              <Link key={student.id} href={`/students/${student.id}`} className="flex h-[70px] items-center gap-3 rounded-2xl border border-black/[0.04] bg-white/75 px-4 transition hover:bg-white">
                <span className="h-9 w-1 rounded-full bg-[#cdc7bd]" />
                <span>
                  <span className="block text-sm font-semibold text-[#191919]">{student.name}</span>
                  <span className="mt-1 block text-xs text-[var(--app-text-muted)]">{student.coreIssue} · {student.currentState}</span>
                </span>
              </Link>
            ))}
          </div>

          <CollapsibleSection
            title="快捷操作"
            defaultOpen={false}
            className="mt-6 rounded-[22px] bg-white/35 p-4 shadow-none"
            bodyClassName="space-y-2"
          >
            {[
              ["新建微信反馈", "/tasks/demo-feedback-task"],
              ["课堂点名", "/classes"],
              ["查看月度总结", "/reports"]
            ].map(([label, href]) => (
              <Link key={label} href={href} className="flex h-12 items-center justify-between rounded-full border border-[var(--app-line)] bg-white/55 px-4 text-sm text-[#56524b] transition hover:bg-white">
                {label}
                <span>›</span>
              </Link>
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            title="状态说明"
            defaultOpen={false}
            className="mt-4 rounded-[22px] bg-white/35 p-4 shadow-none"
            bodyClassName="flex flex-wrap gap-x-3 gap-y-2 text-xs text-[var(--app-text-muted)]"
          >
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-[var(--app-green)]" />已生成</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-[var(--app-red)]" />待反馈</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full border border-dashed border-[var(--app-empty)]" />未提交</span>
          </CollapsibleSection>
        </CollapsibleSection>

        <section className="space-y-7">
          <div>
            <p className="text-sm font-medium text-[var(--app-text-muted)]">班级空间</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#191919]">
              从班级进入每个学生的微信反馈任务
            </h2>
          </div>

          <div className="grid gap-7 lg:grid-cols-2">
            {classes.map((classGroup, index) => {
              const classStudents = getStudentsByClass(classGroup);
              const doneCount = classStudents.filter((student) => student.wechatFeedbackStatus === "feedback_done").length;
              const needsCount = classStudents.filter((student) => student.wechatFeedbackStatus === "needs_feedback").length;
              const emptyCount = classStudents.filter((student) => student.wechatFeedbackStatus === "no_submission").length;

              return (
                <CollapsibleSection
                  key={classGroup.id}
                  title={classGroup.name}
                  summary={`${classGroup.subject} · ${classGroup.schedule}`}
                  defaultOpen={index === 0}
                  className="rounded-[30px] border-[var(--app-line-strong)] bg-white/45 shadow-[var(--app-shadow-sm)]"
                >
                  <div className="rounded-[26px] bg-[rgba(244,242,238,0.86)] p-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
                      {classStudents.map((student) => (
                        <StudentDot key={student.id} student={student} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 text-sm text-[var(--app-text-muted)]">
                    {[
                      { label: "待生成反馈", count: needsCount, color: "bg-[var(--app-red)]" },
                      { label: "已生成反馈", count: doneCount, color: "bg-[var(--app-green)]" },
                      { label: "暂无练习提交", count: emptyCount, color: "border border-dashed border-[var(--app-empty)]" }
                    ].map((item) => (
                      <div key={item.label} className="flex h-11 items-center justify-between rounded-full bg-white/55 px-4">
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                          {item.label}
                        </span>
                        <span className="font-semibold text-[#191919]">{item.count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {index === 0 ? (
                      <ButtonLink href="/classes/mock-class-1" variant="primary" className="w-full" icon={<ArrowRight size={16} />}>
                        查看班级详情
                      </ButtonLink>
                    ) : null}
                    <ButtonLink href="/tasks/demo-feedback-task" variant="secondary" className="w-full bg-white/70" icon={<ArrowRight size={16} />}>
                      生成微信反馈
                    </ButtonLink>
                  </div>
                </CollapsibleSection>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-8 flex min-h-11 items-center rounded-full bg-[rgba(238,235,229,0.8)] px-6 text-sm text-[var(--app-text-muted)]">
        提示：今日共有 24 位学生已生成微信反馈，9 位待生成，3 位暂无练习提交。
      </div>
    </AppShell>
  );
}
