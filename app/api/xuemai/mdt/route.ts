import { apiError, readBody, readPassword, session } from "@/lib/xuemai/auth";
import { AppError, db, list, put, text } from "@/lib/xuemai/db";
import { mdtLogin, mdtRead } from "@/lib/xuemai/mdt";
import { preferences } from "@/lib/xuemai/service";
import type { Contact } from "@/lib/xuemai/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const current = await session();
    const classId = new URL(request.url).searchParams.get("classId");
    if (classId && !/^[1-9]\d*$/.test(classId)) throw new AppError("班级 ID 不正确");
    return Response.json(await mdtRead(current.upstreamCookie, classId ? `/api/teacher/classes/${classId}/analytics/students` : "/api/teacher/classes"), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const current = await session();
    const owner = current.teacher.id;
    const body = await readBody(request, 8192);
    if (body.action === "connect") {
      const remote = await mdtLogin(text(body.identifier, "账号", 120), readPassword(body.password));
      db().prepare("UPDATE sessions SET upstream_cookie = ? WHERE token_hash = ?").run(remote.cookie, current.tokenHash);
      return Response.json({ connected: true, name: remote.user.name });
    }
    if (body.action !== "import") throw new AppError("不支持的操作");
    const classId = text(body.classId, "班级", 30);
    if (!/^[1-9]\d*$/.test(classId)) throw new AppError("班级 ID 不正确");
    const remote = await mdtRead(current.upstreamCookie, "/api/teacher/classes");
    const klass = remote.classes.find((item: { classId: string }) => String(item.classId) === classId);
    if (!klass) throw new AppError("班级不属于当前老师", 403);
    const response = await mdtRead(current.upstreamCookie, `/api/teacher/classes/${classId}/analytics/students`);
    const pref = preferences(owner);
    const classContactId = `mdt-class-${classId}`;
    const contacts = list(owner, "contact");
    const existingClass = contacts.find(c => c.id === classContactId);
    db().exec("BEGIN IMMEDIATE");
    try {
      put(owner, "contact", existingClass || { id: classContactId, kind: "class", name: klass.name, subject: pref.subject, grade: pref.grade, classIds: [], mdtId: classId, createdAt: new Date().toISOString() });
      for (const student of response.students) {
        const id = `mdt-student-${student.studentId}`;
        const existing = contacts.find(c => c.id === id);
        const contact: Contact = existing || { id, kind: "student", name: student.name, subject: pref.subject, grade: pref.grade, classIds: [], mdtId: String(student.studentId), createdAt: new Date().toISOString() };
        contact.classIds = [...new Set([...contact.classIds, classContactId])];
        put(owner, "contact", contact);
      }
      db().exec("COMMIT");
    } catch (error) { db().exec("ROLLBACK"); throw error; }
    return Response.json({ classId: classContactId, imported: response.students.length });
  } catch (error) { return apiError(error); }
}
