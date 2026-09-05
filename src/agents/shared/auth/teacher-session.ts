import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAgentError, type AgentError } from "../recovery/error-map";

export type TeacherSession = {
  teacherId: string;
  userId: string;
  email?: string | null;
};

export function createAuthRequiredError(message = "请先登录后再使用该功能。"): AgentError {
  return createAgentError({
    code: "AUTH_REQUIRED",
    message,
    recoverable: false
  });
}

export function createPermissionRequiredError(message = "无权访问该学生或 AI 草稿。"): AgentError {
  return createAgentError({
    code: "permission_required",
    message,
    recoverable: false
  });
}

export async function requireTeacherSession(): Promise<TeacherSession> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createAuthRequiredError("缺少 Supabase Auth 环境配置，无法确认老师身份。");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // This helper only reads the current session. Login/refresh cookie writes
        // should live in dedicated auth routes.
      }
    }
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id) {
    throw createAuthRequiredError();
  }

  return {
    teacherId: data.user.id,
    userId: data.user.id,
    email: data.user.email ?? null
  };
}
