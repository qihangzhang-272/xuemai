import { AlertTriangle, ArrowRight, Check, FileText, ShieldCheck, Target, X } from "lucide-react";
import type { DemoTask, StudentProfile } from "./types";

export function TeacherDemoAnalysisDrawer({
  task,
  student,
  open,
  onClose
}: {
  task: DemoTask | null;
  student: StudentProfile | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !task || !student) return null;
  const verifiedCount = task.evidence.filter((item) => item.verified).length;

  return (
    <div className="fixed inset-0 z-[80] bg-black/20" role="presentation" onMouseDown={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="analysis-title" onMouseDown={(event) => event.stopPropagation()} className="xuemai-scrollbar absolute inset-y-0 right-0 w-full overflow-y-auto bg-[#f7f8fa] shadow-[-18px_0_50px_rgba(15,23,42,0.14)] sm:max-w-[620px]">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#191c1d]/[0.08] bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-[11px] font-black text-[#16803a]">分析详情</p>
            <h2 id="analysis-title" className="mt-1 text-[19px] font-black text-[#191c1d]">{student.name} · {student.subject}学习反馈</h2>
            <p className="mt-1 text-[11px] text-[#6b7280]">来源：{task.source} · 当前为老师检查中的草稿</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭分析详情" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[#f3f4f5]"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-3 p-4 pb-10 sm:p-6">
          <section className="rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-black text-[#191c1d]">结论总览</h3>
              <span className="rounded-[7px] bg-[#fff7ed] px-2 py-1 text-[11px] font-bold text-[#b45309]">待反馈 · 待入档</span>
            </div>
            <p className="mt-3 text-[13px] font-medium leading-6 text-[#3d4a3d]">{task.summary}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[12px] bg-[#f6fff8] p-3"><span className="text-[10px] font-bold text-[#6b7280]">可核实证据</span><strong className="mt-1 block text-[18px] text-[#16803a]">{verifiedCount}/{task.evidence.length}</strong></div>
              <div className="rounded-[12px] bg-[#f7f8fa] p-3"><span className="text-[10px] font-bold text-[#6b7280]">最近服务</span><strong className="mt-1 block text-[13px] text-[#3d4a3d]">{student.lastService}</strong></div>
            </div>
          </section>

          <section className="rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-[#16803a]" /><h3 className="text-[15px] font-black text-[#191c1d]">本次可确认表现</h3></div>
            <ul className="mt-4 space-y-3">
              <li className="flex gap-2.5 text-[13px] leading-6 text-[#3d4a3d]"><Check className="mt-1 h-4 w-4 shrink-0 text-[#16a34a]" />{task.summary}</li>
              <li className="flex gap-2.5 text-[13px] leading-6 text-[#3d4a3d]"><Check className="mt-1 h-4 w-4 shrink-0 text-[#16a34a]" />当前关注方向为“{student.focus}”，仅结合本次可见材料表达。</li>
            </ul>
          </section>

          <section className="rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#16803a]" /><h3 className="text-[15px] font-black text-[#191c1d]">来源与可信度</h3></div>
            <div className="mt-4 space-y-2">
              {task.evidence.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-[11px] bg-[#f7f8fa] p-3">
                  {item.verified ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16803a]" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" />}
                  <div><strong className="text-[12px] text-[#191c1d]">{item.label}</strong><p className="mt-1 text-[11px] leading-5 text-[#5f6861]">{item.detail}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[16px] border border-[#191c1d]/[0.08] bg-white p-4 sm:p-5">
            <h3 className="text-[15px] font-black text-[#191c1d]">近期巩固方向</h3>
            <p className="mt-3 text-[13px] font-medium leading-6 text-[#3d4a3d]">{task.teacherSuggestion}</p>
            <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-[#fffaf2] p-3 text-[11px] leading-5 text-[#8a5a12]"><AlertTriangle className="h-4 w-4 shrink-0" />单次材料不生成长期能力标签，仍需后续课堂和练习证据验证。</div>
          </section>

          <button type="button" onClick={onClose} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-[#22c55e] text-[13px] font-black text-white hover:bg-[#16a34a]">返回处理反馈 <ArrowRight className="h-4 w-4" /></button>
        </div>
      </aside>
    </div>
  );
}
