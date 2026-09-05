import { readFile } from "node:fs/promises";
import path from "node:path";
import { apiError, session } from "@/lib/xuemai/auth";
import { dataRoot, get } from "@/lib/xuemai/db";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await session();
    const attachment = get(current.teacher.id, "attachment", (await params).id);
    return new Response(await readFile(path.join(dataRoot(), "uploads", attachment.id)), { headers: {
      "Content-Type": attachment.type, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"
    } });
  } catch (error) { return apiError(error); }
}
