import type { Student } from "@/lib/mock/data";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

export function StudentProfilePanel({ student }: { student: Student }) {
  const items = [
    ["所在班级", student.className],
    ["核心问题", student.coreIssue],
    ["当前状态", student.currentState],
    ["学习目标", student.goal],
    ["家长联系人", student.parent],
    ["最近上课", student.lastLesson],
    ["下一步跟进", student.nextAction]
  ];

  return (
    <CollapsibleSection title={student.name} eyebrow={`${student.grade} · ${student.subject}`} summary={student.level} className="p-5">
      <div className="flex flex-col justify-end gap-4 lg:flex-row lg:items-start">
        <div className="w-full rounded-[22px] bg-[#22201e] p-4 text-white shadow-[0_16px_30px_rgba(0,0,0,0.14)] lg:max-w-sm">
          <p className="text-xs font-medium text-white/50">本次学习摘要</p>
          <p className="mt-2 text-xl font-semibold tracking-tight">{student.coreIssue}</p>
          <p className="mt-1.5 text-[13px] leading-5 text-white/70">{student.currentState} · {student.nextAction}</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-[16px] border border-[var(--app-line)] bg-[rgba(244,242,238,0.72)] px-3 py-2.5">
            <dt className="text-xs text-[var(--app-text-soft)]">{label}</dt>
            <dd className="mt-1 text-[13px] leading-5 text-[#191919]">{value}</dd>
          </div>
        ))}
      </dl>
    </CollapsibleSection>
  );
}
