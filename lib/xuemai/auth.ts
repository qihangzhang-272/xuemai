import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { AppError, db, type UserRow } from "./db";
import type { Teacher } from "./types";
import { isPasswordWithinLimit } from "../mdt/password";

export const sessionCookie = "xuemai_session";
export const digest = (token: string) => createHash("sha256").update(token).digest("hex");
export type Session = { tokenHash: string; teacher: Teacher };

export function readPassword(value: unknown): string {
  if (typeof value !== "string" || !value.length) throw new AppError("请输入密码");
  if (!isPasswordWithinLimit(value)) throw new AppError("密码不能超过 72 字节");
  return value;
}

export async function session(): Promise<Session> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) throw new AppError("请先登录学脉", 401);
  const row = db().prepare(`SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?`).get(digest(token), Date.now()) as UserRow | undefined;
  if (!row) throw new AppError("登录已过期，请重新登录", 401);
  return { tokenHash: digest(token), teacher: { id: row.id, name: row.name, identifier: row.identifier } };
}

export async function startSession(teacher: Teacher) {
  const token = randomBytes(32).toString("hex");
  const maxAge = 7 * 24 * 60 * 60;
  db().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  db().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(digest(token), teacher.id, Date.now() + maxAge * 1000);
  (await cookies()).set(sessionCookie, token, { httpOnly: true, sameSite: "strict", secure: process.env.XUEMAI_HTTPS === "true", path: "/", maxAge });
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next 的内部 URL 可能使用 localhost；校验浏览器实际请求的 Host，避免误拒绝 127.0.0.1。
  const requestOrigin = `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (origin && origin !== requestOrigin && origin !== process.env.XUEMAI_ORIGIN) throw new AppError("请求来源不匹配", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new AppError("不允许跨站操作", 403);
}

export async function readBody(request: Request, max = 180_000): Promise<Record<string, unknown>> {
  checkOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new AppError("需要 JSON 请求", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("请求为空");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > max) { await reader.cancel(); throw new AppError("请求内容过大", 413); }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new AppError("请求格式不正确"); }
}

export function apiError(error: unknown) {
  const known = error instanceof AppError;
  if (!known) console.error("[xuemai] request failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: known ? error.message : "服务暂时无法完成操作，请重试" }, { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}
