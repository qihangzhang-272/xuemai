import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { apiError, checkOrigin, session } from "@/lib/xuemai/auth";
import { AppError, dataRoot, put } from "@/lib/xuemai/db";
import { decodeUtf8MaterialText } from "@/lib/material-text-quality";
export const runtime = "nodejs";
const maxBytes = 20 * 1024 * 1024;
const types: Record<string, string> = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", txt: "text/plain", md: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

export async function POST(request: Request) {
  try {
    const current = await session();
    checkOrigin(request);
    const reader = request.body?.getReader();
    if (!reader) throw new AppError("请选择文件");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes + 16384) { await reader.cancel(); throw new AppError("单个文件最多 20 MB", 413); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new AppError("请选择非空文件");
    if (file.size > maxBytes) throw new AppError("单个文件最多 20 MB", 413);
    const name = file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 160);
    const ext = name.split(".").at(-1)?.toLowerCase() || "";
    const type = types[ext];
    if (!type) throw new AppError("支持图片、PDF、DOCX、PPTX、TXT 和 Markdown");
    const bytes = Buffer.from(await file.arrayBuffer());
    const magic = bytes.subarray(0, 12);
    const valid = type === "text/plain" || (ext === "pdf" && magic.subarray(0, 5).toString() === "%PDF-") ||
      (["docx", "pptx"].includes(ext) && magic[0] === 0x50 && magic[1] === 0x4b) ||
      (ext === "png" && magic.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
      (["jpg", "jpeg"].includes(ext) && magic[0] === 0xff && magic[1] === 0xd8) ||
      (ext === "webp" && magic.subarray(0, 4).toString() === "RIFF" && magic.subarray(8, 12).toString() === "WEBP");
    if (!valid) throw new AppError("文件内容与格式不匹配，请重新导出");
    let content = "";
    if (type === "text/plain") {
      try { content = decodeUtf8MaterialText(bytes); } catch { throw new AppError("文字文件需为 UTF-8 编码，且含可读正文"); }
      if (content.length > 40_000) throw new AppError("文字文件最多 4 万字");
    }
    const attachment = { id: randomUUID(), name, type, size: bytes.length, createdAt: new Date().toISOString(), text: content };
    await mkdir(path.join(dataRoot(), "uploads"), { recursive: true });
    await writeFile(path.join(dataRoot(), "uploads", attachment.id), bytes, { flag: "wx" });
    put(current.teacher.id, "attachment", attachment);
    return Response.json({ ...attachment, text: "" });
  } catch (error) { return apiError(error); }
}
