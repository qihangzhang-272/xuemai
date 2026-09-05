import { AppError } from "./db";

export function mdtBase() {
  const value = process.env.MDT_BASE_URL;
  if (!value) throw new AppError("尚未配置教学后端地址", 503);
  return value.replace(/\/$/, "");
}
function addCookies(jar: Map<string, string>, response: Response) {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";", 1)[0];
    const split = pair.indexOf("=");
    jar.set(pair.slice(0, split), pair.slice(split + 1));
  }
}
const header = (jar: Map<string, string>) => [...jar].map(([key, value]) => `${key}=${value}`).join("; ");

export async function mdtLogin(identifier: string, password: string) {
  const base = mdtBase();
  const jar = new Map<string, string>();
  try {
    const csrf = await fetch(`${base}/api/auth/csrf`, { cache: "no-store", signal: AbortSignal.timeout(15_000), redirect: "error" });
    if (!csrf.ok) throw new AppError("教学后端暂时无法登录", 502);
    addCookies(jar, csrf);
    const { csrfToken } = await csrf.json();
    if (typeof csrfToken !== "string") throw new AppError("教学后端登录协议不匹配", 502);
    const login = await fetch(`${base}/api/auth/callback/credentials`, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: header(jar), "X-Auth-Return-Redirect": "1" },
      body: new URLSearchParams({ csrfToken, identifier, password, callbackUrl: base })
    });
    addCookies(jar, login);
    const result = await fetch(`${base}/api/auth/session`, { headers: { Cookie: header(jar) }, cache: "no-store", signal: AbortSignal.timeout(15_000), redirect: "error" });
    const account = (await result.json()).user;
    if (!account?.id && !account?.userId) throw new AppError("教学后端账号或密码不正确", 401);
    if (account.role !== "teacher") throw new AppError("请使用教师账号连接", 403);
    return { cookie: header(jar), user: { id: String(account.userId ?? account.id), orgId: String(account.orgId), name: String(account.name || "老师") } };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("无法连接教学后端，请稍后重试，或使用学脉独立账号", 502);
  }
}

export async function mdtRead(cookie: string, pathname: string) {
  if (!cookie) throw new AppError("请先连接教学后端账号", 401);
  // ponytail: 只保留已核对的读取接口；不提供任意代理或写入原项目的入口。
  if (!/^\/api\/teacher\/(classes(?:\/[1-9]\d*\/analytics\/(?:students|weak-points))?|lessons(?:\/[1-9]\d*\/material)?)$/.test(pathname)) throw new AppError("不支持该后端读取路径", 400);
  let response: Response;
  try {
    response = await fetch(`${mdtBase()}${pathname}`, { headers: { Cookie: cookie }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000) });
  } catch { throw new AppError("教学后端暂时不可用，本地记录不受影响", 502); }
  if (response.status === 401 || response.status === 403) throw new AppError("教学后端连接已过期或无权限，请重新连接", 401);
  if (!response.ok) throw new AppError("教学后端读取失败，请稍后重试", 502);
  return response.json();
}
