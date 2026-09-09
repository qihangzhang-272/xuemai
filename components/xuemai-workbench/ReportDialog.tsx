import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { reportSources, type Contact, type LearningRecord } from "@/lib/xuemai/types";

export function ReportDialog({ students, records, initialStudentId, onClose, onGenerate, onOpenStudent }: {
  students: Contact[]; records: LearningRecord[]; initialStudentId?: string;
  onClose: () => void;
  onGenerate: (studentId: string, kind: "monthly", period: string, sourceIds: string[]) => Promise<boolean>;
  onOpenStudent: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [studentId, setStudentId] = useState(initialStudentId || "");
  const kind = "monthly";
  const [excluded, setExcluded] = useState<string[]>([]);
  const today = new Date().toLocaleDateString("en-CA");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const period = month;
  const sources = reportSources(records, studentId, kind, period);
  const selected = sources.filter(source => !excluded.includes(source.id));
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !studentId || !selected.length) return;
    setBusy(true); setError("");
    try { if (!await onGenerate(studentId, kind, period, selected.map(source => source.id))) setError("报告未生成，请重试。"); }
    catch { setError("报告未生成，请重试。"); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-label="生成学生月报" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} className="max-h-[90dvh] w-[min(460px,calc(100%-24px))] overflow-y-auto rounded-[24px] bg-white p-6 text-[#191c1d] shadow-2xl backdrop:bg-black/30">
    <form onSubmit={submit} className="space-y-4">
      <header className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">生成学生月报</h2><button type="button" disabled={busy} aria-label="关闭报告选择" onClick={onClose} className="rounded-full p-2 hover:bg-[#f3f4f5]"><X size={18} /></button></header>
      <label className="block text-sm font-semibold">学生<select required disabled={busy} value={studentId} onChange={event => setStudentId(event.target.value)} className="mt-2 w-full rounded-[14px] border border-[#dfe5e1] bg-[#fbfcfb] p-3"><option value="">请选择学生</option>{students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.grade} {student.subject}</option>)}</select></label>
      <label className="block text-sm font-semibold">报告月份<input required disabled={busy} type="month" max={today.slice(0, 7)} value={month} onChange={event => setMonth(event.target.value)} className="mt-2 w-full rounded-[14px] border border-[#dfe5e1] bg-[#fbfcfb] p-3" /></label>
      {sources.length ? <fieldset className="max-h-60 space-y-2 overflow-y-auto rounded-xl border p-3"><legend className="text-sm font-semibold">选择月报素材</legend>{sources.map(source => <label key={source.id} className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" disabled={busy} checked={!excluded.includes(source.id)} onChange={event => setExcluded(ids => event.target.checked ? ids.filter(id => id !== source.id) : [...ids, source.id])} /><span>{source.date} · {source.title}<details><summary className="cursor-pointer text-[#15803d]">查看入档正文</summary><p className="whitespace-pre-wrap">{source.archiveContent}</p></details></span></label>)}</fieldset> : null}
      <p role="status" className="text-sm leading-6 text-[#6b746d]">{!students.length ? "请先添加学生。" : !studentId ? "请选择学生。" : sources.length ? selected.length ? `已选 ${selected.length} 条记录` : "请至少选择一条记录。" : "本月暂无入档记录，请先将课堂记录入档。"}</p>
      {studentId && !sources.length ? <button type="button" disabled={busy} className="text-sm font-bold text-[#15803d] underline" onClick={() => onOpenStudent(studentId)}>查看这位学生的记录</button> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-full border border-[#bccbb9] px-4 py-2 text-sm font-bold">取消</button><button disabled={busy || !selected.length || !period} className="rounded-full bg-[#22c55e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? "正在创建…" : "生成报告"}</button></div>
    </form>
  </dialog>;
}
