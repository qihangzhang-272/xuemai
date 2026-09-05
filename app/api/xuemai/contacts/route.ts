import { apiError, readBody, session } from "@/lib/xuemai/auth";
import { saveContact } from "@/lib/xuemai/service";
export async function POST(request: Request) {
  try { const current = await session(); return Response.json(saveContact(current.teacher.id, await readBody(request, 8192))); }
  catch (error) { return apiError(error); }
}
