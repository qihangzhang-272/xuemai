import { FileText, MessageSquareText, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ParentFeedbackPanel } from "@/components/parent-feedback/ParentFeedbackPanel";
import { StudentProfilePanel } from "@/components/students/StudentProfilePanel";
import { ButtonLink } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { StudentLearningWorkspace } from "@/components/xuemai/StudentLearningWorkspace";
import { getStudentById, lessonRecords, reports, wrongQuestions } from "@/lib/mock/data";

export default async function StudentDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "mock-student-1") {
    return <StudentLearningWorkspace />;
  }

  const student = getStudentById(id);
  const studentReports = reports.filter((report) => report.studentId === student.id);

  return (
    <AppShell>
      <div className="space-y-5">
        <StudentProfilePanel student={student} />

        <CollapsibleSection title="档案统计" summary="快速查看微信反馈、错题和月度总结沉淀。">
          <section className="grid gap-3 md:grid-cols-3">
            {[
              ["微信反馈", "6", "本月已沉淀记录"],
              ["错题记录", "8", "待复盘核心问题"],
              ["月度总结", String(studentReports.length || 1), "月底集中整理"]
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-[20px] border border-white/75 bg-white/60 p-4 shadow-[var(--app-shadow-sm)]">
                <p className="text-xs text-[var(--app-text-muted)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#191919]">{value}</p>
                <p className="mt-1.5 text-xs text-[var(--app-text-muted)]">{hint}</p>
              </div>
            ))}
          </section>
        </CollapsibleSection>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <CollapsibleSection title="练习记录" summary="每次生成微信反馈后，记录都会沉淀到学习档案。">
            <div className="mb-4">
              <ParentFeedbackPanel
                student={{
                  id: student.id,
                  name: student.name,
                  subject: student.subject,
                  classId: student.classId,
                  coreIssue: student.coreIssue,
                  nextAction: student.nextAction
                }}
              />
            </div>
            <div className="mb-4 flex justify-end">
              <ButtonLink href={`/students/${student.id}/feedback/new`} variant="secondary" icon={<Plus size={16} />}>新建反馈</ButtonLink>
            </div>
            <div className="space-y-2.5">
              {lessonRecords.map((record) => (
                <article key={record.id} className="rounded-[18px] bg-[var(--app-panel-soft)] p-4">
                  <p className="text-xs text-[var(--app-text-muted)]">{record.date}</p>
                  <h3 className="mt-1.5 text-sm font-semibold text-[#191919]">{record.topic}</h3>
                  <p className="mt-1.5 text-[13px] leading-5 text-[var(--app-text-muted)]">{record.summary}</p>
                </article>
              ))}
            </div>
          </CollapsibleSection>

          <div className="space-y-4">
            <CollapsibleSection title="错题沉淀" summary="围绕核心问题形成可追踪记录。">
              <div className="mb-3 flex justify-end">
                <MessageSquareText size={18} className="text-[var(--app-text-soft)]" />
              </div>
              <div className="space-y-2.5">
                {wrongQuestions.map((question) => (
                  <article key={question.id} className="rounded-[18px] bg-[var(--app-panel-soft)] p-4">
                    <h3 className="text-sm font-semibold text-[#191919]">{question.point}</h3>
                    <p className="mt-2 text-[13px] leading-5 text-[var(--app-text-muted)]">{question.reason}</p>
                    <p className="mt-2 rounded-[15px] bg-white/70 p-2.5 text-[13px] leading-5 text-[#56524b]">{question.suggestion}</p>
                  </article>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="月度总结沉淀结果" eyebrow="月底提醒" summary="月度总结不在单次任务里生成，只在学生档案和报告页集中管理。">
              <div className="mb-3 flex justify-end">
                <FileText size={18} className="text-[var(--app-text-soft)]" />
              </div>
              <div className="mt-4 space-y-2.5">
                {(studentReports.length ? studentReports : reports.slice(0, 1)).map((report) => (
                  <ButtonLink key={report.id} href={`/reports/${report.id}`} variant="secondary" className="w-full justify-between">
                    {report.title}
                  </ButtonLink>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
