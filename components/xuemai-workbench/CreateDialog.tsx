import { useState } from "react";
import { CalendarClock, ChevronRight, Clock3, Info, MessageSquareText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./shared";
import type { CreationMode, CreationPayload } from "./types";

const weekdayOptions = ["一", "二", "三", "四", "五", "六", "日"];
const gradeOptions = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级", "初一", "初二", "初三", "高一", "高二", "高三"];
const subjectOptions = ["语文", "数学", "英语", "物理", "化学", "生物", "政治", "历史", "地理", "科学", "信息技术", "全科"];
const studentDefaultFeedbackTrigger = "下课后自动生成";
const studentDefaultFeedbackDeadline = "当天 22:00 前";
const classDefaultFeedbackTrigger = "下课后立即";
const classDefaultFeedbackDeadline = "下次课前 24H";

export function CreateDialog({
  mode,
  onClose,
  onCreate,
  classOptions = [],
  initialPayload,
  eyebrow,
  title,
  primaryLabel
}: {
  mode: Exclude<CreationMode, null>;
  onClose: () => void;
  onCreate: (payload: CreationPayload) => void;
  classOptions?: string[];
  initialPayload?: Partial<CreationPayload>;
  eyebrow?: string;
  title?: string;
  primaryLabel?: string;
}) {
  const isStudent = mode === "student";
  const [classDrawerOpen, setClassDrawerOpen] = useState(false);
  const [payload, setPayload] = useState<CreationPayload>(() => ({
    name: "",
    grade: "",
    subject: "",
    className: "",
    classType: "",
    learningGoal: "",
    frequency: "",
    courseDay: "",
    courseTime: "",
    duration: "",
    repeatSchedule: true,
    totalLessons: "",
    needsFeedback: true,
    feedbackTrigger: isStudent ? studentDefaultFeedbackTrigger : classDefaultFeedbackTrigger,
    feedbackDeadline: isStudent ? studentDefaultFeedbackDeadline : classDefaultFeedbackDeadline,
    reminder: "弹窗通知",
    appReminder: true,
    wechatPush: false,
    ...initialPayload
  }));
  const previewPayload = normalizeCreationPayload(payload, mode, Boolean(payload.needsFeedback));

  function updateField(key: keyof CreationPayload, value: string | boolean) {
    setPayload((current) => ({ ...current, [key]: value }));
  }

  function toggleCourseDay(day: string) {
    setPayload((current) => {
      const days = splitCourseDays(current.courseDay);
      const nextDays = days.includes(day) ? days.filter((item) => item !== day) : [...days, day];
      return { ...current, courseDay: nextDays.join("、") };
    });
  }

  function toggleSubject(subject: string) {
    setPayload((current) => {
      const subjects = splitMultiValue(current.subject);
      if (subject === "全科") {
        return { ...current, subject: subjects.includes("全科") ? "" : "全科" };
      }
      const nextSubjects = subjects.includes(subject)
        ? subjects.filter((item) => item !== subject)
        : [...subjects.filter((item) => item !== "全科"), subject];
      return { ...current, subject: nextSubjects.join("、") };
    });
  }

  function createWithRules(enabled: boolean) {
    onCreate(normalizeCreationPayload(payload, mode, enabled));
  }

  if (!isStudent) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#191c1d]/28 p-6 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-[980px] overflow-hidden rounded-[30px] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
          <div className="flex h-[62px] items-center justify-between border-b border-[#edf0ee] px-5">
            <div>
              <p className="text-[12px] font-bold text-[#22c55e]">{eyebrow ?? "新建班级"}</p>
              <h2 className="text-[18px] font-black tracking-tight text-[#191c1d]">{title ?? "创建班级群聊与课后服务规则"}</h2>
            </div>
            <IconButton label="关闭" onClick={onClose}>
              <X size={20} />
            </IconButton>
          </div>

          <div className="grid max-h-[calc(90vh-62px)] grid-cols-1 overflow-y-auto bg-[#f7f8f7] lg:grid-cols-[minmax(0,1fr)_340px]">
            <main className="space-y-3 p-4">
              <FormSection title="基础信息" description="班级会作为群聊工作台，用于班课记录、批量反馈和班级月报。">
                <TextRow label="班级名称" value={payload.name} placeholder="输入班级名称" onChange={(value) => updateField("name", value)} />
                <ChoiceRow label="年级" value={payload.grade} options={gradeOptions} onChange={(value) => updateField("grade", value)} />
                <MultiChoiceRow label="科目" value={payload.subject} options={subjectOptions} onToggle={toggleSubject} />
                <SegmentRow label="班级类型" value={payload.classType ?? ""} options={["一对一", "小班课", "机构班课"]} onChange={(value) => updateField("classType", value)} />
              </FormSection>

              <FormSection title="固定上课时间" description="保存班级的授课安排，当前由老师手动生成记录与反馈。">
                <ChoiceRow label="上课频率" value={payload.frequency ?? ""} options={["每周", "隔周"]} onChange={(value) => updateField("frequency", value)} />
                <div className="border-b border-[#edf0ee] py-3">
                  <p className="text-[12px] font-bold text-[#7a817d]">每周上课日</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {weekdayOptions.map((day) => {
                      const selected = splitCourseDays(payload.courseDay).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleCourseDay(day)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-bold transition",
                            selected ? "border-[#22c55e] bg-[#22c55e] text-white" : "border-[#dfe5e1] bg-white text-[#7a817d] hover:bg-[#eaf8ef]"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="上课时间" type="time" value={payload.courseTime ?? ""} onChange={(value) => updateField("courseTime", value)} />
                  <TextField label="课程时长" value={payload.duration ?? ""} suffix="分钟" onChange={(value) => updateField("duration", value)} />
                </div>
                <ToggleRow label="是否重复" checked={Boolean(payload.repeatSchedule)} onChange={(checked) => updateField("repeatSchedule", checked)} />
              </FormSection>

              <FormSection title="课后反馈规则" description="班级反馈是给老师看的任务队列，不会自动发给家长。">
                <ToggleRow label="课后自动生成反馈任务" checked={Boolean(payload.needsFeedback)} onChange={(checked) => updateField("needsFeedback", checked)} />
                <ChoiceRow label="反馈触发时间" value={payload.feedbackTrigger ?? ""} options={["下课后立即", "下课后 1 小时", "第二天早上"]} onChange={(value) => updateField("feedbackTrigger", value)} disabled={!payload.needsFeedback} />
                <ChoiceRow label="反馈截止时间" value={payload.feedbackDeadline ?? ""} options={["下次课前 24H", "下次课前 12H", "不设截止"]} onChange={(value) => updateField("feedbackDeadline", value)} disabled={!payload.needsFeedback} />
                <ReadOnlyRow label="提醒方式" value={payload.needsFeedback ? "弹窗通知" : "关闭"} disabled={!payload.needsFeedback} />
              </FormSection>
            </main>

            <aside className="border-t border-[#edf0ee] bg-white p-4 lg:border-l lg:border-t-0">
              <div className="space-y-3 lg:sticky lg:top-4">
                <ClassPreviewCard payload={previewPayload} />
                <section className="rounded-[18px] bg-[#f1eadf] p-3">
                  <div className="flex items-center gap-2 text-[#3d4a3d]">
                    <Info size={16} />
                    <h3 className="text-[13px] font-black text-[#191c1d]">状态自动切换规则</h3>
                  </div>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#5c665f]">
                    授课时间和反馈规则会保存到班级资料。当前尚未接入定时任务，反馈与入档由老师在会话中操作。
                  </p>
                </section>
                <div className="space-y-2 pt-1">
                  <button type="button" onClick={() => createWithRules(Boolean(payload.needsFeedback))} className="h-10 w-full rounded-[15px] bg-[#22c55e] text-[13px] font-black text-white transition hover:bg-[#16a34a]">
                    {primaryLabel ?? "创建班级"}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#191c1d]/28 p-6 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-[980px] overflow-hidden rounded-[30px] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
        <div className="flex h-[62px] items-center justify-between border-b border-[#edf0ee] px-5">
          <div>
            <p className="text-[12px] font-bold text-[#22c55e]">{eyebrow ?? "学生建档"}</p>
            <h2 className="text-[18px] font-black tracking-tight text-[#191c1d]">{title ?? "创建学生会话与服务规则"}</h2>
          </div>
          <IconButton label="关闭" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>

        <div className="grid max-h-[calc(90vh-62px)] grid-cols-1 overflow-y-auto bg-[#f7f8f7] lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-3 p-4">
            <FormSection title="基础信息" description="先建立学生联系人，后续所有学习记录和 AI 结果卡都会沉淀到这里。">
              <TextRow label="学生姓名" value={payload.name} placeholder="输入真实姓名" onChange={(value) => updateField("name", value)} />
              <ChoiceRow label="年级" value={payload.grade} options={gradeOptions} onChange={(value) => updateField("grade", value)} />
              <MultiChoiceRow label="科目" value={payload.subject} options={subjectOptions} onToggle={toggleSubject} />
              <SelectRow label="所属班级" value={payload.className ?? ""} placeholder="选择班级" onClick={() => setClassDrawerOpen(true)} />
              <TextRow label="自定义目标" value={payload.learningGoal ?? ""} placeholder="输入本阶段目标" onChange={(value) => updateField("learningGoal", value)} />
            </FormSection>

            <FormSection title="固定上课时间" description="保存授课安排，当前由老师手动生成记录与反馈。">
              <ChoiceRow label="上课频率" value={payload.frequency ?? ""} options={["每周", "隔周"]} onChange={(value) => updateField("frequency", value)} />
              <div className="border-b border-[#edf0ee] py-3">
                <p className="text-[12px] font-bold text-[#7a817d]">每周上课日</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {weekdayOptions.map((day) => {
                    const selected = splitCourseDays(payload.courseDay).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleCourseDay(day)}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition",
                          selected ? "bg-[#22c55e] text-white" : "bg-[#f0f2f1] text-[#7a817d] hover:bg-[#e5eee8]"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="上课时间" type="time" value={payload.courseTime ?? ""} onChange={(value) => updateField("courseTime", value)} />
                <TextField label="课程时长" value={payload.duration ?? ""} suffix="min" onChange={(value) => updateField("duration", value)} />
              </div>
              <ToggleRow label="是否重复" checked={Boolean(payload.repeatSchedule)} onChange={(checked) => updateField("repeatSchedule", checked)} />
            </FormSection>

            <FormSection title="课时与反馈规则" description="反馈规则可以现在设置，也可以只建档，稍后由老师补全。">
              <TextRow label="总课时数" value={payload.totalLessons ?? ""} suffix="课时" onChange={(value) => updateField("totalLessons", value)} />
              <ToggleRow label="每节课后都需要反馈" checked={Boolean(payload.needsFeedback)} onChange={(checked) => updateField("needsFeedback", checked)} />
              <ChoiceRow label="反馈触发时间" value={payload.feedbackTrigger ?? ""} options={["下课后自动生成", "老师手动触发", "当天晚上生成"]} onChange={(value) => updateField("feedbackTrigger", value)} disabled={!payload.needsFeedback} />
              <ChoiceRow label="反馈截止时间" value={payload.feedbackDeadline ?? ""} options={["当天 22:00 前", "次日 12:00 前", "不设截止"]} onChange={(value) => updateField("feedbackDeadline", value)} disabled={!payload.needsFeedback} />
              <ReadOnlyRow label="提醒方式" value={payload.needsFeedback ? "弹窗通知" : "关闭"} disabled={!payload.needsFeedback} />
            </FormSection>
          </main>

          <aside className="border-t border-[#edf0ee] bg-white p-4 lg:border-l lg:border-t-0">
            <div className="space-y-3 lg:sticky lg:top-4">
              <PreviewCard payload={previewPayload} />
              <section className="rounded-[18px] bg-[#f1eadf] p-3">
                <div className="flex items-center gap-2 text-[#3d4a3d]">
                  <Info size={16} />
                  <h3 className="text-[13px] font-black text-[#191c1d]">状态自动切换规则</h3>
                </div>
                <p className="mt-2 text-[12px] font-medium leading-5 text-[#5c665f]">
                  授课时间和反馈规则会保存到学生资料。当前尚未接入定时任务；生成反馈后显示待反馈，老师标记发送后显示已反馈。
                </p>
              </section>
              <div className="space-y-2 pt-1">
                <button type="button" onClick={() => createWithRules(Boolean(payload.needsFeedback))} className="h-10 w-full rounded-[15px] bg-[#22c55e] text-[13px] font-black text-white transition hover:bg-[#16a34a]">
                  {primaryLabel ?? "完成建档"}
                </button>
              </div>
            </div>
          </aside>
        </div>
        {classDrawerOpen ? (
          <ClassSelectDrawer
            options={classOptions}
            selected={payload.className}
            onClose={() => setClassDrawerOpen(false)}
            onSelect={(value) => {
              updateField("className", value);
              setClassDrawerOpen(false);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] bg-white px-4 py-3">
      <div className="mb-1">
        <h3 className="text-[15px] font-black text-[#191c1d]">{title}</h3>
        <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[#8a948d]">{description}</p>
      </div>
      <div className="divide-y divide-[#edf0ee]">{children}</div>
    </section>
  );
}

function TextRow({ label, value, placeholder, suffix, onChange }: { label: string; value?: string; placeholder?: string; suffix?: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-[44px] items-center gap-3 py-2">
      <span className="w-24 shrink-0 text-[13px] font-bold text-[#7a817d]">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-1">
        <input value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-right text-[13px] font-bold text-[#191c1d] outline-none placeholder:text-[#a7aca9]" />
        {suffix ? <span className="shrink-0 text-[12px] font-bold text-[#7a817d]">{suffix}</span> : null}
      </span>
    </label>
  );
}

function SelectRow({ label, value, placeholder, onClick }: { label: string; value?: string; placeholder: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[44px] w-full items-center gap-3 py-2 text-left">
      <span className="w-24 shrink-0 text-[13px] font-bold text-[#7a817d]">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-1 text-[13px] font-bold">
        <span className={cn("truncate", value ? "text-[#191c1d]" : "text-[#a7aca9]")}>{value || placeholder}</span>
        <ChevronRight size={16} className="shrink-0 text-[#a7aca9]" />
      </span>
    </button>
  );
}

function ReadOnlyRow({ label, value, disabled }: { label: string; value: string; disabled?: boolean }) {
  return (
    <div className={cn("flex min-h-[44px] items-center gap-3 py-2", disabled ? "opacity-45" : "")}>
      <span className="w-24 shrink-0 text-[13px] font-bold text-[#7a817d]">{label}</span>
      <span className="min-w-0 flex-1 text-right text-[13px] font-bold text-[#191c1d]">{value}</span>
    </div>
  );
}

function ChoiceRow({ label, value, options, onChange, disabled }: { label: string; value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <div className={cn("flex min-h-[44px] items-center gap-3 py-2", disabled ? "opacity-45" : "")}>
      <span className="w-24 shrink-0 text-[13px] font-bold text-[#7a817d]">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              "h-7 rounded-full px-2.5 text-[12px] font-bold transition disabled:cursor-not-allowed",
              value === option ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f3f5f4] text-[#69736d] hover:bg-[#eaf8ef]"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiChoiceRow({ label, value, options, onToggle }: { label: string; value: string; options: string[]; onToggle: (value: string) => void }) {
  const selectedValues = splitMultiValue(value);
  return (
    <div className="flex min-h-[44px] items-center gap-3 py-2">
      <span className="w-24 shrink-0 text-[13px] font-bold text-[#7a817d]">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1.5">
        {options.map((option) => {
          const selected = selectedValues.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={cn(
                "h-7 rounded-full px-2.5 text-[12px] font-bold transition",
                selected ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f3f5f4] text-[#69736d] hover:bg-[#eaf8ef]"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentRow({ label, value, options, onChange }: { label: string; value?: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="py-3">
      <p className="text-[12px] font-bold text-[#7a817d]">{label}</p>
      <div className="mt-2 grid grid-cols-3 rounded-[14px] bg-[#f0f2f1] p-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn("h-8 rounded-[11px] text-[12px] font-black transition", value === option ? "bg-white text-[#191c1d] shadow-[0_1px_3px_rgba(15,23,42,0.08)]" : "text-[#69736d] hover:bg-white/60")}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 py-2">
      <span className="text-[13px] font-bold text-[#7a817d]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 rounded-full transition", checked ? "bg-[#22c55e]" : "bg-[#dfe3e1]")}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.22)] transition", checked ? "left-6" : "left-1")} />
      </button>
    </div>
  );
}

function ClassPreviewCard({ payload }: { payload: CreationPayload }) {
  const days = splitCourseDays(payload.courseDay).map((day) => `周${day}`).join("、") || "未设置";

  return (
    <section className="rounded-[20px] bg-[#f7f8f7] p-3">
      <p className="text-[11px] font-bold text-[#22c55e]">班级预览</p>
      <h3 className="mt-1 text-[17px] font-black text-[#191c1d]">{payload.name || "未命名班级"}</h3>
      <p className="mt-1 text-[12px] font-bold text-[#6b746d]">
        {payload.grade || "未选年级"} · {payload.subject || "未选科目"} · {payload.classType || "未选班型"}
      </p>
      <div className="mt-3 space-y-2">
        <PreviewLine icon={<CalendarClock size={14} />} label="上课节奏" value={compactPreviewText(payload.frequency, days, payload.courseTime) || "未设置"} />
        <PreviewLine icon={<Clock3 size={14} />} label="课时设置" value={`${payload.duration || "未设置"} 分钟 · ${payload.repeatSchedule === false ? "不重复" : "重复"}`} />
        <PreviewLine icon={<MessageSquareText size={14} />} label="反馈待办" value={payload.needsFeedback ? compactPreviewText(payload.feedbackTrigger, payload.feedbackDeadline) || "待设置" : "稍后设置"} />
      </div>
      <p className="mt-3 rounded-[14px] bg-white px-3 py-2 text-[12px] font-semibold leading-5 text-[#3d4a3d]">
        提醒：{payload.needsFeedback ? "弹窗通知" : "稍后设置"}。班级月报面向老师汇总，不会直接发送给家长。
      </p>
    </section>
  );
}

function PreviewCard({ payload }: { payload: CreationPayload }) {
  const days = splitCourseDays(payload.courseDay).map((day) => `周${day}`).join("、") || "未设置";
  return (
    <section className="rounded-[20px] bg-[#f7f8f7] p-3">
      <p className="text-[11px] font-bold text-[#22c55e]">建档预览</p>
      <h3 className="mt-1 text-[17px] font-black text-[#191c1d]">{payload.name || "未命名学生"}</h3>
      <p className="mt-1 text-[12px] font-bold text-[#6b746d]">
        {payload.grade || "未选年级"} · {payload.subject || "未选科目"} · {payload.className || "未分班"}
      </p>
      <div className="mt-3 space-y-2">
        <PreviewLine icon={<CalendarClock size={14} />} label="上课节奏" value={compactPreviewText(payload.frequency, days, payload.courseTime) || "未设置"} />
        <PreviewLine icon={<Clock3 size={14} />} label="课时包" value={`${payload.totalLessons || "未设置"} 课时 · ${payload.duration || "未设置"} min`} />
        <PreviewLine icon={<MessageSquareText size={14} />} label="课后反馈" value={payload.needsFeedback ? compactPreviewText(payload.feedbackTrigger, payload.feedbackDeadline) || "待设置" : "稍后设置"} />
      </div>
      {payload.learningGoal ? <p className="mt-3 rounded-[14px] bg-white px-3 py-2 text-[12px] font-semibold leading-5 text-[#3d4a3d]">目标：{payload.learningGoal}</p> : null}
    </section>
  );
}

function PreviewLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#5c665f]">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#22c55e]">{icon}</span>
      <span className="w-14 shrink-0 text-[#8a948d]">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-[#26312a]">{value}</span>
    </div>
  );
}

function TextField({
  label,
  value,
  suffix,
  type = "text",
  onChange
}: {
  label: string;
  value?: string;
  suffix?: string;
  type?: "text" | "time";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#6b746d]">{label}</span>
      <span className="mt-2 flex h-11 items-center rounded-[14px] border border-[#e1e3e4] bg-white px-3 transition focus-within:border-[#22c55e]">
        <input
          type={type}
          step={type === "time" ? 300 : undefined}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#191c1d] outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60"
        />
        {suffix ? <span className="text-xs font-bold text-[#8a948d]">{suffix}</span> : null}
      </span>
    </label>
  );
}

function ClassSelectDrawer({
  options,
  selected,
  onSelect,
  onClose
}: {
  options: string[];
  selected?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const uniqueOptions = Array.from(new Set(options.filter(Boolean)));

  return (
    <div className="absolute inset-0 z-10 flex justify-end bg-[#191c1d]/18">
      <aside className="h-full w-full max-w-[330px] border-l border-[#edf0ee] bg-white p-4 shadow-[0_0_42px_rgba(15,23,42,0.14)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-[#22c55e]">所属班级</p>
            <h3 className="text-[16px] font-black text-[#191c1d]">选择已有班级</h3>
          </div>
          <IconButton label="关闭班级选择" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="space-y-2">
          {uniqueOptions.length ? (
            uniqueOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between rounded-[14px] px-3 text-left text-[13px] font-black transition",
                  selected === option ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#f7f8f7] text-[#26312a] hover:bg-[#eaf8ef]"
                )}
              >
                {option}
                {selected === option ? <span className="text-[11px]">已选</span> : null}
              </button>
            ))
          ) : (
            <p className="rounded-[14px] bg-[#f7f8f7] p-3 text-[12px] font-semibold leading-5 text-[#6b746d]">当前还没有班级。可以先不分班，稍后在班级资料里添加学生。</p>
          )}
          <button type="button" onClick={() => onSelect("")} className="flex h-11 w-full items-center justify-between rounded-[14px] bg-[#f3f5f4] px-3 text-left text-[13px] font-black text-[#69736d] transition hover:bg-[#e9eeeb]">
            暂不分班
            {!selected ? <span className="text-[11px]">已选</span> : null}
          </button>
        </div>
      </aside>
    </div>
  );
}

function compactPreviewText(...parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" ");
}

function normalizeCreationPayload(payload: CreationPayload, mode: Exclude<CreationMode, null>, enabled: boolean): CreationPayload {
  if (!enabled) {
    return {
      ...payload,
      needsFeedback: false,
      feedbackTrigger: "稍后设置",
      feedbackDeadline: "",
      reminder: "",
      appReminder: false,
      wechatPush: false
    };
  }

  const isStudent = mode === "student";
  return {
    ...payload,
    needsFeedback: true,
    feedbackTrigger: payload.feedbackTrigger || (isStudent ? studentDefaultFeedbackTrigger : classDefaultFeedbackTrigger),
    feedbackDeadline: payload.feedbackDeadline || (isStudent ? studentDefaultFeedbackDeadline : classDefaultFeedbackDeadline),
    reminder: "弹窗通知",
    appReminder: true,
    wechatPush: false
  };
}

function splitMultiValue(value?: string) {
  if (!value) return [];
  return value
    .split(/[、,，\s]+/u)
    .map((item) => item.trim())
    .filter((item) => Boolean(item) && item !== "未选科目");
}

function splitCourseDays(value?: string) {
  if (!value) return [];
  return value
    .replace(/周/g, "")
    .split(/[、,，\s]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}
