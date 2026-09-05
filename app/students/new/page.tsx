import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewStudentPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">New student</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">创建学生档案</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">先录入最小必要信息，后续反馈和错题会逐步丰富档案。</p>
        </div>

        <form className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="学生姓名">
              <Input placeholder="例如：林一诺" />
            </Field>
            <Field label="年级">
              <Input placeholder="例如：五年级" />
            </Field>
            <Field label="科目">
              <Input placeholder="例如：数学" />
            </Field>
            <Field label="所在班级">
              <Input placeholder="例如：周三数学提升班" />
            </Field>
            <Field label="家长联系人">
              <Input placeholder="例如：林妈妈" />
            </Field>
            <Field label="当前水平">
              <Input placeholder="例如：基础稳定，应用题薄弱" />
            </Field>
          </div>
          <Field label="学习目标">
            <Textarea placeholder="希望通过课程解决哪些问题" />
          </Field>
          <Button type="button">保存占位</Button>
        </form>
      </div>
    </AppShell>
  );
}
