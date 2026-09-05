"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-4">
      <section className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-950">页面暂时无法加载</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">第一阶段是演示界面，如果看到这里，通常是本地开发服务需要重启。</p>
        <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500">{error.message}</p>
        <div className="mt-5">
          <Button type="button" onClick={reset}>
            重新加载
          </Button>
        </div>
      </section>
    </main>
  );
}
