import OpenAI from "openai";
import { apiError, readBody, session } from "@/lib/xuemai/auth";
import { AppError, get, list, text } from "@/lib/xuemai/db";
import { aiModel, safety } from "@/lib/xuemai/ai";

export async function POST(request: Request) {
  try {
    const current = await session();
    const body = await readBody(request, 32000);
    const contact = get(current.teacher.id, "contact", text(body.contactId, "学生或班级", 100));
    const question = text(body.question, "问题", 4000);
    const sourceId = body.sourceId ? text(body.sourceId, "引用记录", 100).replace(/:(feedback|archive)$/, "") : "";
    const source = sourceId ? get(current.teacher.id, "record", sourceId) : undefined;
    if (source && source.contactId !== contact.id) throw new AppError("引用记录不属于当前学生或班级");
    const records = source ? [source] : list(current.teacher.id, "record").filter(r => r.contactId === contact.id && r.content).slice(-10);
    const context = records.map(r => `${r.date} · ${r.archivedAt ? "已入档" : "未确认草稿"} · ${r.evidence}\n${r.archiveContent || r.content}`).join("\n\n");
    if (context.length > 40000) throw new AppError("当前记录较多，请选择一条记录后继续提问");
    if (!process.env.QWEN_API_KEY) throw new AppError("AI 服务尚未配置", 503);
    const client = new OpenAI({ apiKey: process.env.QWEN_API_KEY, baseURL: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1", timeout: 120000, maxRetries: 0 });
    const response = await client.chat.completions.create({
      model: aiModel(), messages: [
        { role: "system", content: safety + "\n根据提供的教学记录回答老师的问题。无记录时说明缺少资料。区分未确认草稿与已入档事实，不执行发送、入档、提醒或其他写入操作。返回 JSON：{\"content\":\"中文回答\"}。" },
        { role: "user", content: `对象：${contact.name} · ${contact.grade} · ${contact.subject}\n资料：\n${context || "暂无记录"}\n老师问题：${question}` },
      ], response_format: { type: "json_object" }, max_tokens: 2500, temperature: 0.3,
      ...({ enable_thinking: false } as Record<string, unknown>),
    });
    if (response.choices[0]?.finish_reason === "length") throw new AppError("回答未完整返回，请缩小问题范围", 502);
    return Response.json({ content: text(JSON.parse(response.choices[0]?.message.content || "{}").content, "回答", 10000) });
  } catch (error) { return apiError(error instanceof AppError ? error : new AppError("回答未完成，请稍后重试", 502)); }
}
