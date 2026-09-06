import { apiError, readBody, session } from "@/lib/xuemai/auth";
import { AppError, db, text } from "@/lib/xuemai/db";
export async function PATCH(request: Request) {
  try {
    const current = await session();
    const body = await readBody(request, 4096);
    const length = body.length || "适中";
    if (!["简短", "适中", "详细"].includes(String(length))) throw new AppError("请选择反馈长度");
    const preferences = { length, parentSummaryFirst: body.parentSummaryFirst !== false, subject: text(body.subject, "常教学科", 30), grade: text(body.grade ?? "", "年级", 30, false), tone: text(body.tone, "反馈语气", 80), address: text(body.address, "家长称呼", 30) };
    db().prepare("UPDATE users SET preferences = ? WHERE id = ?").run(JSON.stringify(preferences), current.teacher.id);
    return Response.json(preferences);
  } catch (error) { return apiError(error); }
}
