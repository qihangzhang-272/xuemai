import { Search, UserRoundPlus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StudentCard } from "@/components/students/StudentCard";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { students } from "@/lib/mock/data";

export default function StudentsPage() {
  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[#16A34A]">学生档案</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">学生档案</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">系统的核心入口。微信反馈、练习记录和月度总结都会沉淀到这里。</p>
        </div>
        <ButtonLink href="/students/new" icon={<UserRoundPlus size={16} />}>
          创建学生档案
        </ButtonLink>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2">
        <Search size={18} className="text-zinc-400" />
        <Input className="border-0 px-0 focus:ring-0" placeholder="搜索学生姓名、年级或科目" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </AppShell>
  );
}
