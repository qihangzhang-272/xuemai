import { apiError, session } from "@/lib/xuemai/auth";
import { snapshot } from "@/lib/xuemai/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(snapshot(await session()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
