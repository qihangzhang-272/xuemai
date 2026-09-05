"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2, MessageSquareText, Save, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ParentFeedbackPanelProps = {
  student: {
    id: string;
    name: string;
    subject: string;
    classId?: string;
    coreIssue?: string;
    nextAction?: string;
  };
};

type GeneratedFeedback = {
  feedbackText: string;
  studentStatus: "excellent" | "stable" | "needs_attention";
  coreIssue: string;
  nextAction: string;
  relatedKnowledgePoints: string[];
  shouldUpdateStudentProfile: boolean;
  suggestedProfileUpdate?: {
    weaknesses?: string[];
    learningHabits?: string[];
    nextFocus?: string;
    riskSignals?: string[];
  };
  qualityScore: number;
  warnings: string[];
  revised: boolean;
  agentRunId?: string;
  agentOutputId?: string;
};

type AgentStage = "idle" | "reading_profile" | "analyzing_records" | "generating" | "checking_quality" | "ready" | "saving" | "saved" | "failed";

type FeedbackFormState = {
  classNote: string;
  wrongQuestionSummary: string;
  teacherInstruction: string;
};

const MOCK_TEACHER_ID = "11111111-1111-4111-8111-111111111111";
const PHASE_45_TEST_STUDENT_ID = "33333333-3333-4333-8333-333333333333";
const PHASE_45_TEST_CLASS_ID = "22222222-2222-4222-8222-222222222222";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function ParentFeedbackPanel({ student }: ParentFeedbackPanelProps) {
  const [form, setForm] = useState<FeedbackFormState>({
    classNote: "",
    wrongQuestionSummary: student.coreIssue ?? "",
    teacherInstruction: "语气温和一点，不要太长，适合直接发微信。"
  });
  const [stage, setStage] = useState<AgentStage>("idle");
  const [feedback, setFeedback] = useState<GeneratedFeedback | null>(null);
  const [editedFeedbackText, setEditedFeedbackText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const agentIds = useMemo(
    () => ({
      // TODO(auth): derive teacherId from Supabase Auth session instead of using this temporary seed teacher.
      teacherId: MOCK_TEACHER_ID,
      studentId: isUuid(student.id) ? student.id : PHASE_45_TEST_STUDENT_ID,
      classId: student.classId && isUuid(student.classId) ? student.classId : PHASE_45_TEST_CLASS_ID
    }),
    [student.classId, student.id]
  );

  async function generateFeedback() {
    setError(null);
    setToast(null);
    setFeedback(null);
    setEditedFeedbackText("");
    setStage("reading_profile");

    window.setTimeout(() => setStage("analyzing_records"), 180);
    window.setTimeout(() => setStage("generating"), 360);
    window.setTimeout(() => setStage("checking_quality"), 540);

    try {
      const response = await fetch("/api/agents/parent-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teacherId: agentIds.teacherId,
          studentId: agentIds.studentId,
          classId: agentIds.classId,
          classNote: form.classNote,
          wrongQuestionSummary: form.wrongQuestionSummary,
          knowledgePoints: extractKnowledgePoints(form.wrongQuestionSummary),
          teacherInstruction: form.teacherInstruction
        })
      });
      const payload = (await response.json()) as { success: true; data: GeneratedFeedback } | { success: false; error?: { message?: string } };

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "生成失败" : payload.error?.message || "生成失败");
      }

      setFeedback(payload.data);
      setEditedFeedbackText(payload.data.feedbackText);
      setStage("ready");
      setToast("反馈草稿已生成");
    } catch (generateError) {
      setStage("failed");
      setError(generateError instanceof Error ? generateError.message : "生成失败，请稍后重试。");
    }
  }

  async function copyFeedback() {
    if (!editedFeedbackText.trim()) return;

    try {
      await navigator.clipboard.writeText(editedFeedbackText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = editedFeedbackText;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setToast("已复制到剪贴板");
  }

  async function saveConfirmedFeedback() {
    if (!feedback?.agentOutputId || !editedFeedbackText.trim() || stage === "saving") return;

    setError(null);
    setToast(null);
    setStage("saving");

    try {
      const response = await fetch("/api/agents/parent-feedback/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teacherId: agentIds.teacherId,
          studentId: agentIds.studentId,
          classId: agentIds.classId,
          agentRunId: feedback.agentRunId,
          agentOutputId: feedback.agentOutputId,
          originalFeedbackText: feedback.feedbackText,
          finalFeedbackText: editedFeedbackText,
          coreIssue: feedback.coreIssue,
          nextAction: feedback.nextAction,
          qualityScore: feedback.qualityScore
        })
      });
      const payload = (await response.json()) as { success: boolean; error?: { message?: string } };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "保存失败，请稍后重试。");
      }

      setStage("saved");
      setToast("已保存到学生记录，可用于后续月报");
    } catch (saveError) {
      setStage("ready");
      setError(saveError instanceof Error ? saveError.message : "保存失败，请稍后重试。");
    }
  }

  const isGenerating = stage === "reading_profile" || stage === "analyzing_records" || stage === "generating" || stage === "checking_quality";
  const isSaving = stage === "saving";

  return (
    <section className="rounded-[22px] border border-white/75 bg-white/65 p-4 shadow-[var(--app-shadow-sm)]">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-medium text-[var(--app-text-muted)]">Parent Feedback Agent</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-[#191919]">生成家长反馈</h2>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-[var(--app-text-muted)]">
            先生成 AI 草稿，老师编辑确认后才会保存到反馈历史和学生长期记录。
          </p>
        </div>
        <span className="w-fit rounded-full bg-[var(--app-panel-soft)] px-3 py-1 text-xs font-medium text-[var(--app-text-muted)]">不自动发送微信</span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FeedbackGenerateForm form={form} onChange={setForm} disabled={isGenerating || isSaving} onGenerate={generateFeedback} />

        <div className="space-y-3">
          <AgentRunStatus stage={stage} />
          <FeedbackPreviewCard feedback={feedback} error={error} />
          <FeedbackEditor value={editedFeedbackText} onChange={setEditedFeedbackText} disabled={!feedback || isSaving} />
          <FeedbackActionBar
            canCopy={Boolean(editedFeedbackText.trim())}
            canSave={Boolean(feedback?.agentOutputId && editedFeedbackText.trim())}
            isSaving={isSaving}
            saved={stage === "saved"}
            onCopy={copyFeedback}
            onSave={saveConfirmedFeedback}
          />
          {toast ? <p className="rounded-[16px] bg-[#ECFDF3] px-3 py-2.5 text-[13px] font-medium text-[#15803D]">{toast}</p> : null}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--app-text-soft)]">
        当前临时 teacherId 使用 Phase 4.5 测试种子：{MOCK_TEACHER_ID}。后续接入 Auth 后必须从 session 派生。
      </p>
    </section>
  );
}

function FeedbackGenerateForm({
  form,
  disabled,
  onChange,
  onGenerate
}: {
  form: FeedbackFormState;
  disabled: boolean;
  onChange: (form: FeedbackFormState) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[18px] bg-[var(--app-panel-soft)] p-3.5">
      <Field label="课堂表现">
        <Textarea
          value={form.classNote}
          onChange={(event) => onChange({ ...form, classNote: event.target.value })}
          disabled={disabled}
          placeholder="例如：今天能听懂一次函数应用题，但独立做题时容易漏条件。"
        />
      </Field>
      <Field label="错题 / 薄弱点">
        <Textarea
          value={form.wrongQuestionSummary}
          onChange={(event) => onChange({ ...form, wrongQuestionSummary: event.target.value })}
          disabled={disabled}
          placeholder="例如：一次函数应用题漏掉自变量取值范围。"
        />
      </Field>
      <Field label="老师要求">
        <Textarea value={form.teacherInstruction} onChange={(event) => onChange({ ...form, teacherInstruction: event.target.value })} disabled={disabled} />
      </Field>
      <Button type="button" onClick={onGenerate} disabled={disabled || (!form.classNote.trim() && !form.wrongQuestionSummary.trim())} icon={disabled ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}>
        生成家长反馈
      </Button>
    </div>
  );
}

function FeedbackPreviewCard({ feedback, error }: { feedback: GeneratedFeedback | null; error: string | null }) {
  if (error) {
    return <div className="rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] leading-5 text-[#991B1B]">{error}</div>;
  }

  if (!feedback) {
    return (
      <div className="rounded-[18px] border border-[var(--app-line-strong)] bg-white/70 p-3 text-[13px] leading-5 text-[var(--app-text-muted)]">
        生成后会展示反馈文本、质量分、核心问题、下一步动作和系统提醒。
      </div>
    );
  }

  return (
    <article className="rounded-[18px] border border-[var(--app-line-strong)] bg-white/80 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#15803D]">质量分 {feedback.qualityScore}</span>
        <span className="rounded-full bg-[var(--app-panel-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-text-muted)]">{feedback.revised ? "已自动修订" : "初稿通过"}</span>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-[#191919]">{feedback.feedbackText}</p>
      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
        <MetaBlock label="核心问题" value={feedback.coreIssue} />
        <MetaBlock label="下一步建议" value={feedback.nextAction} />
      </div>
      {feedback.warnings.length ? (
        <div className="mt-3 rounded-[16px] bg-[#FFF7ED] p-2.5 text-xs leading-5 text-[#9A3412]">
          {feedback.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function FeedbackEditor({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <Field label="老师确认 / 编辑后的反馈">
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder="生成后可在这里微调，确认后再保存。" />
    </Field>
  );
}

function FeedbackActionBar({
  canCopy,
  canSave,
  isSaving,
  saved,
  onCopy,
  onSave
}: {
  canCopy: boolean;
  canSave: boolean;
  isSaving: boolean;
  saved: boolean;
  onCopy: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={onCopy} disabled={!canCopy || isSaving} icon={<Copy size={16} />}>
        复制
      </Button>
      <Button type="button" onClick={onSave} disabled={!canSave || isSaving || saved} icon={isSaving ? <Loader2 className="animate-spin" size={16} /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}>
        {saved ? "已保存" : isSaving ? "保存中" : "保存到学生记录"}
      </Button>
    </div>
  );
}

function AgentRunStatus({ stage }: { stage: AgentStage }) {
  const steps = [
    ["reading_profile", "读取档案"],
    ["analyzing_records", "分析记录"],
    ["generating", "生成反馈"],
    ["checking_quality", "检查质量"]
  ] as const;
  const activeIndex = steps.findIndex(([step]) => step === stage);

  return (
    <div className="rounded-[18px] bg-[var(--app-panel-soft)] p-3">
      <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#191919]">
        <MessageSquareText size={16} />
        Agent 运行状态
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {steps.map(([step, label], index) => {
          const complete = stage === "ready" || stage === "saving" || stage === "saved" || (activeIndex > -1 && index < activeIndex);
          const active = step === stage;

          return (
            <div key={step} className="rounded-[12px] bg-white/70 px-2.5 py-2 text-xs">
              <span className={complete ? "font-semibold text-[#15803D]" : active ? "font-semibold text-[#191919]" : "text-[var(--app-text-soft)]"}>
                {complete ? "完成" : active ? "进行中" : "等待"}
              </span>
              <p className="mt-1 font-medium text-[#191919]">{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[var(--app-panel-soft)] p-2.5">
      <p className="text-xs text-[var(--app-text-muted)]">{label}</p>
      <p className="mt-1 text-[13px] font-medium leading-5 text-[#191919]">{value}</p>
    </div>
  );
}

function extractKnowledgePoints(text: string) {
  return text
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}
