import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { reportSources, type Contact, type LearningRecord } from "@/lib/xuemai/types";

export function ReportDialog({ students, records, initialStudentId, onClose, onGenerate, onOpenStudent }: {
  students: Contact[]; records: LearningRecord[]; initialStudentId?: string;
  onClose: () => void;
  onGenerate: (studentId: string, kind: "daily" | "monthly", period: string) => Promise<boolean>;
  onOpenStudent: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [studentId, setStudentId] = useState(initialStudentId || "");
  const [kind, setKind] = useState<"daily" | "monthly">("monthly");
  const today = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const period = kind === "daily" ? date : month;
  const sources = reportSources(records, studentId, kind, period);
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !studentId || !sources.length) return;
    setBusy(true); setError("");
    try { if (!await onGenerate(studentId, kind, period)) setError("暂时未能创建报告，选择已保留，请重试。"); }
    catch { setError("暂时未能创建报告，选择已保留，请重试。"); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-label="生成学生报告" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} className="w-[min(460px,calc(100%-24px))] rounded-[24px] bg-white p-6 text-[#191c1d] shadow-2xl backdrop:bg-black/30">
    <form onSubmit={submit} className="space-y-4">
      <header className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">生成学生报告</h2><button type="button" disabled={busy} aria-label="关闭报告选择" onClick={onClose} className="rounded-full p-2 hover:bg-[#f3f4f5]"><X size={18} /></button></header>
      <label className="block text-sm font-semibold">学生<select required disabled={busy} value={studentId} onChange={event => setStudentId(event.target.value)} className="mt-2 w-full rounded-[14px] border border-[#dfe5e1] bg-[#fbfcfb] p-3"><option value="">请选择学生</option>{students.map(student => <option key={student.id} value={student.id}>{student.name} · {student.grade} {student.subject}</option>)}</select></label>
      <label className="block text-sm font-semibold">报告类型<select disabled={busy} value={kind} onChange={event => setKind(event.target.value as typeof kind)} className="mt-2 w-full rounded-[14px] border border-[#dfe5e1] bg-[#fbfcfb] p-3"><option value="monthly">学生月报</option><option value="daily">学生日报</option></select></label>
      <label className="block text-sm font-semibold">{kind === "daily" ? "记录日期" : "报告月份"}<input required disabled={busy} type={kind === "daily" ? "date" : "month"} max={kind === "daily" ? today : today.slice(0, 7)} value={period} onChange={event => kind === "daily" ? setDate(event.target.value) : setMonth(event.target.value)} className="mt-2 w-full rounded-[14px] border border-[#dfe5e1] bg-[#fbfcfb] p-3" /></label>
      <p role="status" className="text-sm leading-6 text-[#6b746d]">{!students.length ? "这个班级还没有学生，请先添加学生，再整理个人报告。" : !studentId ? "选好学生和时间后，可以看到可用于报告的记录数量。" : sources.length ? `将根据 ${sources.length} 条已确认入档的学习记录生成报告。` : "所选时间没有已入档记录。请先查看这位学生的记录，确认内容后入档。"}</p>
      {studentId && !sources.length ? <button type="button" disabled={busy} className="text-sm font-bold text-[#15803d] underline" onClick={() => onOpenStudent(studentId)}>查看这位学生的记录</button> : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-full border border-[#bccbb9] px-4 py-2 text-sm font-bold">取消</button><button disabled={busy || !sources.length || !period} className="rounded-full bg-[#22c55e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? "正在创建…" : "生成报告"}</button></div>
    </form>
  </dialog>;
}
