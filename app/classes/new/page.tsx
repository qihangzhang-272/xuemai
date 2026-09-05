import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewClassPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">New class</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">新建班级</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">仅为 UI 占位，后续 Phase 3 接入真实保存。</p>
        </div>

        <form className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6">
          <Field label="班级名称">
            <Input placeholder="例如：周三数学提升班" />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="科目">
              <Input placeholder="数学" />
            </Field>
            <Field label="上课时间">
              <Input placeholder="每周三 19:00" />
            </Field>
          </div>
          <Field label="班级重点">
            <Textarea placeholder="这个班级近期主要解决什么学习问题" />
          </Field>
          <Button type="button">保存占位</Button>
        </form>
      </div>
    </AppShell>
  );
}
