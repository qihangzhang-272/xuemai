import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "./shared";
import type { CreationMode, CreationPayload } from "./types";

const gradeOptions = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级", "初一", "初二", "初三", "高一", "高二", "高三"];
const subjectOptions = ["语文", "数学", "英语", "物理", "化学", "生物", "政治", "历史", "地理", "科学", "信息技术", "全科"];

export function CreateDialog({ mode, onClose, onCreate, classOptions = [], initialPayload, title, primaryLabel }: {
  mode: Exclude<CreationMode, null>;
  onClose: () => void;
  onCreate: (payload: CreationPayload) => void | Promise<void>;
  classOptions?: string[];
  initialPayload?: Partial<CreationPayload>;
  eyebrow?: string;
  title?: string;
  primaryLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const saveRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<CreationPayload>(() => ({ name: "", grade: "", subject: "数学", className: "", ...initialPayload }));
  const isStudent = mode === "student";
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  function updateField(key: keyof CreationPayload, value: string) { setPayload(current => ({ ...current, [key]: value })); }
  async function save() {
    if (saveRef.current) return;
    if (!payload.name.trim()) { setError(isStudent ? "请填写学生姓名。" : "请填写班级名称。"); return; }
    if (isStudent && !payload.grade) { setError("请选择学生年级。"); return; }
    saveRef.current = true; setSaving(true); setError("");
    try { await onCreate({ ...payload, name: payload.name.trim() }); }
    catch (error) { setError(error instanceof Error ? error.message : "资料未保存，请重试。"); }
    finally { saveRef.current = false; setSaving(false); }
  }
  return <dialog ref={dialogRef} aria-labelledby="create-contact-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-[640px] overflow-y-auto rounded-[30px] bg-white p-0 text-[#191c1d] shadow-[0_28px_70px_rgba(15,23,42,0.18)] backdrop:bg-[#191c1d]/28">
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <header className="flex min-h-[62px] items-center justify-between gap-2 border-b border-[#edf0ee] px-5 py-3">
        <h2 id="create-contact-title" className="text-[18px] font-bold tracking-tight">{title || (isStudent ? "建立学生档案" : "新建班级")}</h2>
        <IconButton label="关闭" onClick={() => { if (!saving) onClose(); }}><X size={20} /></IconButton>
      </header>
      <div className="space-y-4 bg-[#f7f8f7] p-4">
        <section className="rounded-[18px] bg-white p-4">
          <p className="mb-3 text-[13px] leading-6 text-[#5c665f]">{isStudent ? "先填姓名、年级和科目，创建后就可以记录这节课。" : "班级用于整理共同教学内容；个人表现记在学生档案里。"}</p>
          <TextRow label={isStudent ? "学生姓名" : "班级名称"} value={payload.name} onChange={value => updateField("name", value)} placeholder={isStudent ? "填写学生姓名" : "填写班级名称"} required />
          <SelectRow label="科目" value={payload.subject} options={subjectOptions.includes(payload.subject) ? subjectOptions : [payload.subject, ...subjectOptions]} onChange={value => updateField("subject", value)} />
          <SelectRow label={isStudent ? "年级" : "年级（选填）"} value={payload.grade} options={gradeOptions} empty={isStudent ? "请选择年级" : "暂不填写"} onChange={value => updateField("grade", value)} />
          {isStudent && classOptions.length ? <SelectRow label="所属班级" value={payload.className || ""} options={classOptions} empty="暂不分班" onChange={value => updateField("className", value)} /> : null}
          {initialPayload ? <label className="flex items-center gap-3 py-3 text-sm">服务状态<select className="rounded-xl border p-2" value={payload.status || "active"} onChange={event => updateField("status", event.target.value)}><option value="active">在读</option><option value="paused">暂停</option><option value="archived">归档</option></select></label> : null}
          {isStudent ? <details className="mt-2 text-sm"><summary className="cursor-pointer py-2 font-semibold">家长关系（选填）</summary>{(payload.parents || []).map((parent, index) => <div key={parent.id} className="my-3 rounded-xl border p-3">{(["name", "relation", "contact"] as const).map((field, fieldIndex) => <TextRow key={field} label={["家长称呼", "与学生关系", "联系方式"][fieldIndex]} value={parent[field]} placeholder={["例如：林女士", "例如：母亲", "手机号或微信号"][fieldIndex]} onChange={value => setPayload(current => ({ ...current, parents: current.parents?.map((item, i) => i === index ? { ...item, [field]: value } : item) }))} />)}<button type="button" className="mt-2 text-red-700" onClick={() => setPayload(current => ({ ...current, parents: current.parents?.filter((_, i) => i !== index) }))}>移除这位家长</button></div>)}<button type="button" disabled={(payload.parents?.length || 0) >= 6} className="rounded-full border px-3 py-2" onClick={() => setPayload(current => ({ ...current, parents: [...(current.parents || []), { id: crypto.randomUUID(), name: "", relation: "", contact: "" }] }))}>添加家长</button></details> : null}
          {isStudent ? <details className="mt-2 text-[13px] text-[#5c665f]"><summary className="cursor-pointer py-2 font-semibold">补充学习目标（选填）</summary><TextRow label="学习目标" value={payload.learningGoal || ""} onChange={value => updateField("learningGoal", value)} placeholder="例如：养成计算后检查的习惯" /></details> : null}
        </section>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      </div>
      <footer className="flex justify-end gap-2 border-t border-[#edf0ee] px-5 py-4">
        <button type="button" disabled={saving} onClick={onClose} className="min-h-10 rounded-full border border-[#bccbb9] px-4 text-[13px] font-semibold disabled:opacity-40">取消</button>
        <button type="submit" disabled={saving} className="min-h-10 rounded-full bg-[#22c55e] px-5 text-[13px] font-bold text-white hover:bg-[#16a34a] disabled:opacity-40">{saving ? "正在保存…" : primaryLabel || (isStudent ? "建立档案，开始记录" : "创建班级")}</button>
      </footer>
    </form>
  </dialog>;
}

function TextRow({ label, value, placeholder, onChange, required = false }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="flex min-h-[48px] flex-wrap items-center gap-3 border-b border-[#edf0ee] py-3">
    <span className="w-24 shrink-0 text-[13px] font-bold text-[#5c665f]">{label}</span>
    <input value={value} required={required} autoFocus={required} maxLength={required ? 60 : 240} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-[#191c1d] outline-none placeholder:text-[#6b746d] focus-visible:ring-2 focus-visible:ring-[#22c55e]/30" />
  </label>;
}
function SelectRow({ label, value, options, empty, onChange }: { label: string; value: string; options: string[]; empty?: string; onChange: (value: string) => void }) {
  return <label className="flex min-h-[48px] items-center gap-3 border-b border-[#edf0ee] py-3">
    <span className="w-24 shrink-0 text-[13px] font-bold text-[#5c665f]">{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-[#191c1d] outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/30">
      {empty ? <option value="">{empty}</option> : null}{options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>;
}
