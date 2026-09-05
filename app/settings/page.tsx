import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#16A34A]">设置中心</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">设置中心</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">账号信息和 AI 输出偏好占位，后续再接真实配置。</p>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-950">账号信息</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="老师姓名">
                <Input placeholder="内部老师" />
              </Field>
              <Field label="机构名称">
                <Input placeholder="例如：启明数学工作室" />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-950">AI 输出偏好</h2>
            <div className="mt-5 space-y-5">
              <Field label="微信反馈语气">
                <Input placeholder="温和、具体、鼓励式" />
              </Field>
              <Field label="常用反馈要求">
                <Textarea placeholder="例如：先说练习表现，再说需要跟进的问题，最后给家长可执行建议" />
              </Field>
            </div>
          </section>

          <Button type="button">保存占位</Button>
        </div>
      </div>
    </AppShell>
  );
}
