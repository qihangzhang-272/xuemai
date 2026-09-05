import { apiError, session } from "@/lib/xuemai/auth";
import { snapshot } from "@/lib/xuemai/service";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const state = snapshot(await session());
    return new Response(JSON.stringify({ format: "xuemai-export-v1", exportedAt: new Date().toISOString(), ...state }, null, 2), { headers: {
      "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=xuemai-records.json", "Cache-Control": "no-store"
    } });
  } catch (error) { return apiError(error); }
}
