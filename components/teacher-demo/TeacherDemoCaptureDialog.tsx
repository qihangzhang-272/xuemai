import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, ImagePlus, MessageCircle, NotebookPen, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaptureKind, CapturePayload, StudentProfile } from "./types";

const captureOptions: Array<{ kind: CaptureKind; description: string; icon: typeof NotebookPen }> = [
  { kind: "课堂记录", description: "记下刚刚发生的课堂事实", icon: NotebookPen },
  { kind: "学生材料", description: "上传作业、试卷或错题照片", icon: ImagePlus },
  { kind: "家长消息", description: "粘贴家长原话，生成回复草稿", icon: MessageCircle }
];

export function TeacherDemoCaptureDialog({
  open,
  students,
  defaultStudentId,
  onClose,
  onSubmit
}: {
  open: boolean;
  students: StudentProfile[];
  defaultStudentId?: string;
  onClose: () => void;
  onSubmit: (payload: CapturePayload) => void;
}) {
  const [kind, setKind] = useState<CaptureKind>("课堂记录");
  const [studentId, setStudentId] = useState(defaultStudentId ?? students[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setStudentId(defaultStudentId ?? students[0]?.id ?? "");
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [defaultStudentId, open, students]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const placeholder = useMemo(() => {
    if (kind === "家长消息") return "粘贴家长原话，例如：老师，孩子最近回家写作业有点拖拉……";
    if (kind === "学生材料") return "补充材料背景，例如：这是今天的数学作业，已由老师批改……";
    return "只写课堂中真实发生的内容，例如：今天讲二次函数，基础题独立完成，应用题漏读两处条件……";
  }, [kind]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!studentId || (!content.trim() && !attachmentName)) return;
    onSubmit({ kind, studentId, content: content.trim(), attachmentName: attachmentName || undefined });
    setContent("");
    setAttachmentName("");
    setKind("课堂记录");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-[620px] sm:rounded-[20px]"
      >
        <header className="flex items-center justify-between border-b border-[#191c1d]/[0.08] px-5 py-4 sm:px-6">
          <div>
            <h2 id="capture-dialog-title" className="text-[18px] font-black text-[#191c1d]">快速记录</h2>
            <p className="mt-1 text-[12px] text-[#6b7280]">先留下事实和材料，再进入对应学生的处理链路</p>
          </div>
          <button type="button" aria-label="关闭快速记录" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#f3f4f5]">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-3">
            {captureOptions.map((option) => {
              const Icon = option.icon;
              const active = option.kind === kind;
              return (
                <button key={option.kind} type="button" onClick={() => setKind(option.kind)} className={cn("rounded-[14px] border p-3 text-left transition", active ? "border-[#22c55e] bg-[#f4fff7]" : "border-[#191c1d]/[0.09] hover:bg-[#f7f8fa]") }>
                  <Icon className={cn("h-4 w-4", active ? "text-[#16803a]" : "text-[#6b7280]")} />
                  <strong className="mt-2 block text-[13px] text-[#191c1d]">{option.kind}</strong>
                  <span className="mt-1 block text-[11px] leading-4 text-[#6b7280]">{option.description}</span>
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="text-[12px] font-black text-[#3d4a3d]">关联学生</span>
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-2 h-11 w-full rounded-[11px] border border-[#191c1d]/[0.1] bg-white px-3 text-[13px] font-bold text-[#303733] outline-none focus:border-[#22c55e]">
              {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.grade} · {student.subject}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-[12px] font-black text-[#3d4a3d]">{kind === "家长消息" ? "家长原话" : kind === "学生材料" ? "材料说明" : "课堂事实"}</span>
            <textarea ref={textareaRef} value={content} onChange={(event) => setContent(event.target.value)} placeholder={placeholder} className="mt-2 min-h-[150px] w-full resize-none rounded-[12px] border border-[#191c1d]/[0.1] p-3 text-[13px] leading-6 text-[#303733] outline-none placeholder:text-[#9ca3af] focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e]/10" />
          </label>

          {kind === "学生材料" ? (
            <label className="flex min-h-[72px] cursor-pointer items-center gap-3 rounded-[13px] border border-dashed border-[#22c55e]/55 bg-[#f8fff9] px-4 transition hover:bg-[#eefbf2]">
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-white text-[#16803a]"><Paperclip className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[13px] text-[#191c1d]">{attachmentName || "选择作业、试卷或错题照片"}</strong>
                <span className="mt-1 block text-[11px] text-[#6b7280]">Demo 中仅模拟选择，不读取真实学生材料</span>
              </span>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(event) => setAttachmentName(event.target.files?.[0]?.name ?? "")} />
            </label>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[#191c1d]/[0.08] px-5 py-4 sm:px-6">
          <span className="hidden items-center gap-1.5 text-[11px] text-[#8b9297] sm:flex"><FileText className="h-3.5 w-3.5" />不会自动发给家长或写入档案</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="min-h-11 rounded-[11px] px-4 text-[13px] font-black text-[#4b5563] hover:bg-[#f3f4f5]">取消</button>
            <button type="button" onClick={handleSubmit} disabled={!studentId || (!content.trim() && !attachmentName)} className="min-h-11 rounded-[11px] bg-[#22c55e] px-5 text-[13px] font-black text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:bg-[#a7dcb8]">保存并生成待处理项</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
