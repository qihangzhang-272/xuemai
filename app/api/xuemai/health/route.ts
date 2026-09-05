import { db } from "@/lib/xuemai/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try { db().prepare("SELECT 1").get(); return Response.json({ status: "ok", project: "xuemai", database: "sqlite" }); }
  catch { return Response.json({ status: "error" }, { status: 503 }); }
}
