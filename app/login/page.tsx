"use client";

import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/xuemai-workbench/Panels";
import { parseWorkbenchStoragePayload, stringifyWorkbenchStoragePayload } from "@/components/xuemai-workbench/persistence";
import { storageKey } from "@/components/xuemai-workbench/storage";
import type { TeacherProfile } from "@/components/xuemai-workbench/types";

export default function LoginPage() {
  const router = useRouter();

  function handleLogin(profile: TeacherProfile) {
    try {
      window.localStorage.setItem("xuemai:teacher-profile", JSON.stringify(profile));
      const storedWorkbench = parseWorkbenchStoragePayload(window.localStorage.getItem(storageKey));
      window.localStorage.setItem(storageKey, stringifyWorkbenchStoragePayload({ ...storedWorkbench, teacher: profile }));
    } catch {
      // 本阶段是前端 mock 登录；浏览器禁止 localStorage 时仍允许进入工作台预览。
    }
    router.push("/dashboard");
  }

  return <LoginScreen onLogin={handleLogin} />;
}
