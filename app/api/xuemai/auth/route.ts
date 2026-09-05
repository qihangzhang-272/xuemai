import { cookies } from "next/headers";
import { apiError, digest, readBody, readPassword, session, sessionCookie, startSession, checkOrigin } from "@/lib/xuemai/auth";
import { AppError, createUser, db, text, userByIdentifier } from "@/lib/xuemai/db";
import { hashPassword, verifyPassword } from "@/lib/mdt/password";
import { mdtLogin } from "@/lib/xuemai/mdt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const attempts = new Map<string, { count: number; until: number }>();

export async function GET() {
  try { return Response.json({ teacher: (await session()).teacher }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const body = await readBody(request, 4096);
    const identifier = text(body.identifier, "账号", 120).toLowerCase();
    const password = readPassword(body.password);
    for (const [key, entry] of attempts) if (entry.until < Date.now()) attempts.delete(key);
    const entry = attempts.get(identifier) || { count: 0, until: Date.now() + 10 * 60_000 };
    if (++entry.count > 12) throw new AppError("尝试次数较多，请十分钟后重试", 429);
    attempts.set(identifier, entry);
    let user;
    let upstreamCookie = "";
    if (body.mode === "mdt") {
      const remote = await mdtLogin(identifier, password);
      const key = `mdt:${remote.user.orgId}:${remote.user.id}`;
      user = userByIdentifier(key) || createUser(key, remote.user.name, "");
      upstreamCookie = remote.cookie;
    } else if (body.mode === "register") {
      if (password.length < 8) throw new AppError("密码至少 8 位");
      if (identifier.startsWith("mdt:")) throw new AppError("该账号前缀不可使用");
      user = createUser(identifier, text(body.name, "老师姓名", 40), await hashPassword(password));
    } else if (body.mode === "local") {
      user = userByIdentifier(identifier);
      if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) throw new AppError("账号或密码不正确", 401);
    } else { throw new AppError("请选择登录方式"); }
    const teacher = { id: user.id, name: user.name, identifier: user.identifier };
    await startSession(teacher, upstreamCookie);
    attempts.delete(identifier);
    return Response.json({ teacher });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const token = (await cookies()).get(sessionCookie)?.value;
    if (token) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(token));
    (await cookies()).delete(sessionCookie);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
