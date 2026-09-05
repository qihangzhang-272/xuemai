import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Student } from "@/lib/mock/data";

export function StudentCard({ student }: { student: Student }) {
  return (
    <Link href={`/students/${student.id}`} className="block rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/[0.03] transition hover:border-zinc-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">{student.name}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {student.grade} · {student.subject}
          </p>
        </div>
        <ArrowRight className="mt-1 text-zinc-400" size={18} />
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-600">{student.latestScoreSummary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {student.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
