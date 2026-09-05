import { apiError, readBody, session } from "@/lib/xuemai/auth";
import { createRecord } from "@/lib/xuemai/service";
export async function POST(request: Request) {
  try { const current = await session(); return Response.json(createRecord(current.teacher.id, await readBody(request))); }
  catch (error) { return apiError(error); }
}
