import { apiError, readBody, session } from "@/lib/xuemai/auth";
import { recordAction } from "@/lib/xuemai/service";
import { AppError, list } from "@/lib/xuemai/db";
export const runtime = "nodejs";
export const maxDuration = 660;
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await session();
    const body = await readBody(request);
    if (["generate", "feedback"].includes(String(body.action)) && list(current.teacher.id, "record").filter(r => r.status === "running").length >= 3) throw new AppError("已有三项处理中的任务，请稍候再提交", 429);
    return Response.json(await recordAction(current.teacher.id, (await params).id, body));
  } catch (error) { return apiError(error); }
}
