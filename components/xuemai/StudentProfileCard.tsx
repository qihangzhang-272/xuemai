import { BookOpenCheck } from "lucide-react";
import type { XuemaiStudent } from "@/lib/mock/xuemai-types";

export function StudentProfileCard({ student }: { student: XuemaiStudent }) {
  const items = [
    { label: "高频薄弱点", value: student.profile.weakPoints.join("、") },
    { label: "最近状态", value: student.profile.recentState },
    { label: "作业情况", value: student.profile.homeworkStatus },
    { label: "家长沟通风格", value: student.profile.parentFeedbackStyle },
    { label: "下次课重点", value: student.profile.nextLessonFocus.join("、") }
  ];

  return (
    <section className="rounded-[24px] border border-[var(--app-line)] bg-white p-4 shadow-[var(--app-shadow-sm)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCFCE7] text-[#16A34A]">
          <BookOpenCheck size={17} />
        </span>
        <div>
          <h2 className="text-base font-bold text-[#111827]">学习画像</h2>
          <p className="text-xs text-[var(--app-text-muted)]">快速判断的标签</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item.label} className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1.5 text-xs leading-5 text-[#14532D]">
            <strong className="font-semibold">{item.label}：</strong>{item.value}
          </span>
        ))}
      </div>
    </section>
  );
}
