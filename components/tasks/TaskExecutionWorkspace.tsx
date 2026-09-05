"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clipboard, Clock3, Copy, FilePenLine, Pause, RefreshCw, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import type { DemoAgentTask, DemoExecutionStatus } from "@/lib/mock/data";
import { Button } from "@/components/ui/button";

type ConfirmedAnswers = Record<string, string>;
type ResultMap = Record<string, string>;
type CopyStatusMap = Record<string, "已复制" | "复制失败">;

const stepStyle: Record<DemoExecutionStatus, string> = {
  已完成: "border-[#BBF7D0] bg-[#ECFDF3] text-[#166534]",
  进行中: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
  等待中: "border-[#E5E7EB] bg-white text-[#6B7280]"
};

function StepIcon({ status }: { status: DemoExecutionStatus }) {
  if (status === "已完成") return <CheckCircle2 size={18} />;
  if (status === "进行中") return <Clock3 size={18} />;
  return <Sparkles size={18} />;
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#DCFCE7] bg-white px-5 py-3 text-sm font-medium text-[#166534] shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
      {message}
    </div>
  );
}

export function TaskExecutionWorkspace({ task }: { task: DemoAgentTask }) {
  const [toast, setToast] = useState("");
  const [confirmedAnswers, setConfirmedAnswers] = useState<ConfirmedAnswers>({});
  const [customAnswer, setCustomAnswer] = useState("");
  const [activeStudent, setActiveStudent] = useState(task.generatedResults[0]?.studentName ?? "");
  const [editingStudent, setEditingStudent] = useState("");
  const [savedStudents, setSavedStudents] = useState<string[]>([]);
  const [copyStatusMap, setCopyStatusMap] = useState<CopyStatusMap>({});
  const [resultMap, setResultMap] = useState<ResultMap>(() =>
    Object.fromEntries(task.generatedResults.map((result) => [result.studentName, result.content]))
  );

  const activeResult = useMemo(
    () => task.generatedResults.find((result) => result.studentName === activeStudent) ?? task.generatedResults[0],
    [activeStudent, task.generatedResults]
  );
  const activeContent = resultMap[activeResult.studentName] ?? activeResult.content;
  const isEditing = editingStudent === activeResult.studentName;
  const isSaved = savedStudents.includes(activeResult.studentName);
  const copyStatus = copyStatusMap[activeResult.studentName];

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function confirmQuestion(questionId: string, answer: string) {
    if (answer === "自定义输入") {
      setConfirmedAnswers((current) => ({ ...current, [questionId]: "等待自定义输入" }));
      return;
    }

    setConfirmedAnswers((current) => ({ ...current, [questionId]: answer }));
    showToast("已确认");
  }

  function saveCustomAnswer(questionId: string) {
    const answer = customAnswer.trim();
    if (!answer) {
      showToast("请先输入自定义内容");
      return;
    }

    setConfirmedAnswers((current) => ({ ...current, [questionId]: answer }));
    setCustomAnswer("");
    showToast("已确认");
  }

  async function copyResult() {
    let didCopy = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeContent);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    if (!didCopy) {
      const fallbackTextarea = document.createElement("textarea");
      fallbackTextarea.value = activeContent;
      fallbackTextarea.setAttribute("readonly", "true");
      fallbackTextarea.style.position = "fixed";
      fallbackTextarea.style.left = "-9999px";
      document.body.appendChild(fallbackTextarea);
      fallbackTextarea.select();
      didCopy = document.execCommand("copy");
      document.body.removeChild(fallbackTextarea);
    }

    if (didCopy) {
      setCopyStatusMap((current) => ({ ...current, [activeResult.studentName]: "已复制" }));
      showToast("已复制到剪贴板");
    } else {
      setCopyStatusMap((current) => ({ ...current, [activeResult.studentName]: "复制失败" }));
      showToast("复制失败，请手动复制");
    }
  }

  function saveToArchive() {
    setSavedStudents((current) => (current.includes(activeResult.studentName) ? current : [...current, activeResult.studentName]));
    showToast("已保存到学生档案");
  }

  function appendToneChange(label: string) {
    setResultMap((current) => ({
      ...current,
      [activeResult.studentName]: `${activeContent}\n\n已按“${label}”方向调整：这是一条演示语气变化，后续会由真实 AI 重新生成。`
    }));
    showToast("已调整语气");
  }

  function regenerateResult() {
    setResultMap((current) => ({
      ...current,
      [activeResult.studentName]: `${activeResult.studentName}本次反馈已重新生成：课堂表现整体稳定，接下来建议继续围绕本节课核心问题做短频训练，并保持作业反馈节奏。`
    }));
    setSavedStudents((current) => current.filter((studentName) => studentName !== activeResult.studentName));
    showToast("已重新生成模拟结果");
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}

      <header className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#6B7280] transition hover:text-[#111827]">
              <ArrowLeft size={16} />
              返回首页
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">{task.title}</h1>
              <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#166534]">{task.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6B7280]">
              {task.agentType} · {task.currentProgress}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" icon={<Pause size={16} />} onClick={() => showToast("任务已暂停")}>
              暂停任务
            </Button>
            <Button type="button" variant="secondary" icon={<RefreshCw size={16} />} onClick={regenerateResult}>
              重新生成
            </Button>
            <Button type="button" icon={<Save size={16} />} onClick={saveToArchive}>
              保存结果
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[290px_1fr_360px]">
        <aside className="space-y-5">
          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-[#111827]">任务目标</p>
            <p className="mt-3 text-sm leading-7 text-[#6B7280]">{task.goal}</p>
          </section>

          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-[#111827]">关联班级</p>
            <div className="mt-3 rounded-[18px] bg-[#F7F8FA] p-4">
              <p className="text-base font-semibold text-[#111827]">{task.className}</p>
              <p className="mt-2 text-sm text-[#6B7280]">{task.relatedStudents.length} 位学生</p>
              <p className="mt-1 text-sm text-[#6B7280]">本次课程：{task.courseTopic}</p>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-[#111827]">关联学生</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {task.relatedStudents.slice(0, 5).map((studentName) => (
                <span key={studentName} className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs text-[#4B5563]">
                  {studentName}
                </span>
              ))}
              {task.relatedStudents.length > 5 ? (
                <span className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs text-[#4B5563]">+{task.relatedStudents.length - 5} 人</span>
              ) : null}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-[#111827]">已使用资料</p>
            <div className="mt-3 space-y-2">
              {task.usedMaterials.map((material) => (
                <div key={material} className="flex items-center gap-2 rounded-[16px] bg-[#F7F8FA] px-3 py-2 text-sm text-[#6B7280]">
                  <Clipboard size={15} className="text-[#16A34A]" />
                  {material}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-[#111827]">输出格式</p>
            <p className="mt-3 text-sm leading-7 text-[#6B7280]">{task.outputFormat}</p>
          </section>
        </aside>

        <main className="space-y-5">
          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">AI 执行过程</h2>
                <p className="mt-1 text-sm text-[#6B7280]">不是普通加载状态，而是展示 Agent 正在如何完成任务。</p>
              </div>
              <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#166534]">透明执行</span>
            </div>
            <div className="mt-5 space-y-3">
              {task.steps.map((step) => (
                <article key={step.id} className={`flex items-start gap-3 rounded-[18px] border p-4 ${stepStyle[step.status]}`}>
                  <StepIcon status={step.status} />
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="mt-1 text-xs opacity-75">状态：{step.status}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-[#111827]">执行日志</h2>
            <div className="mt-5 space-y-4">
              {task.logs.map((log) => (
                <article key={log.id} className="grid grid-cols-[56px_1fr] gap-3">
                  <time className="text-sm font-semibold text-[#16A34A]">{log.time}</time>
                  <p className="border-l border-[#E5E7EB] pl-4 text-sm leading-6 text-[#6B7280]">{log.content}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-[#111827]">需要老师确认</h2>
            <div className="mt-5 space-y-4">
              {task.confirmationQuestions.map((item) => {
                const answer = confirmedAnswers[item.id];
                const needsCustomInput = answer === "等待自定义输入";

                return (
                  <article key={item.id} className="rounded-[20px] border border-[#E5E7EB] bg-[#F7F8FA] p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <p className="text-sm font-semibold leading-6 text-[#111827]">{item.question}</p>
                      {answer && !needsCustomInput ? (
                        <span className="w-fit rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#166534]">已确认：{answer}</span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          data-testid={`confirm-${item.id}-${option}`}
                          onClick={() => confirmQuestion(item.id, option)}
                          className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                            answer === option
                              ? "border-[#16A34A] bg-[#ECFDF3] text-[#166534]"
                              : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#16A34A]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {needsCustomInput ? (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={customAnswer}
                          onChange={(event) => setCustomAnswer(event.target.value)}
                          placeholder="请输入老师补充判断"
                          className="h-11 flex-1 rounded-[14px] border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#DCFCE7]"
                        />
                        <Button type="button" onClick={() => saveCustomAnswer(item.id)}>
                          确认
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#111827]">生成结果预览</h2>
              {isSaved ? <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#166534]">已保存到学生档案</span> : null}
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {task.generatedResults.map((result) => (
                <button
                  key={result.studentName}
                  type="button"
                  onClick={() => {
                    setActiveStudent(result.studentName);
                    setEditingStudent("");
                  }}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition ${
                    activeStudent === result.studentName ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                  }`}
                >
                  {result.studentName}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-[#111827]">{activeResult.studentName}</p>
              {isEditing ? (
                <textarea
                  value={activeContent}
                  onChange={(event) =>
                    setResultMap((current) => ({
                      ...current,
                      [activeResult.studentName]: event.target.value
                    }))
                  }
                  className="mt-3 min-h-[260px] w-full resize-none rounded-[18px] border border-[#E5E7EB] bg-[#F7F8FA] p-4 text-sm leading-7 text-[#111827] outline-none focus:border-[#16A34A] focus:ring-2 focus:ring-[#DCFCE7]"
                />
              ) : (
                <p className="mt-3 min-h-[260px] rounded-[18px] bg-[#111827] p-5 text-sm leading-7 text-white/80">{activeContent}</p>
              )}
              {copyStatus ? (
                <div
                  className={`mt-3 rounded-[16px] px-4 py-3 text-sm font-medium ${
                    copyStatus === "已复制" ? "bg-[#ECFDF3] text-[#166534]" : "bg-[#FEF2F2] text-[#B91C1C]"
                  }`}
                >
                  {copyStatus === "已复制" ? "已复制到剪贴板，可以直接粘贴到微信。" : "复制失败，请手动选中文案复制。"}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {["更温和", "更简短", "更具体", "加一点鼓励"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => appendToneChange(label)}
                  className="rounded-full border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-xs font-medium text-[#4B5563] transition hover:border-[#16A34A]"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={regenerateResult}
                className="rounded-full border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-xs font-medium text-[#4B5563] transition hover:border-[#16A34A]"
              >
                重新生成
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {isEditing ? (
                <Button
                  type="button"
                  data-testid="save-edit-result"
                  icon={<Save size={16} />}
                  onClick={() => {
                    setEditingStudent("");
                    showToast("编辑已保存");
                  }}
                >
                  保存编辑
                </Button>
              ) : (
                <Button type="button" variant="secondary" data-testid="edit-result" icon={<FilePenLine size={16} />} onClick={() => setEditingStudent(activeResult.studentName)}>
                  编辑
                </Button>
              )}
              <Button type="button" variant="secondary" data-testid="copy-result" icon={<Copy size={16} />} onClick={copyResult}>
                {copyStatus === "已复制" ? "已复制" : "复制微信反馈"}
              </Button>
              <Button type="button" data-testid="save-result-to-archive" icon={<CheckCircle2 size={16} />} onClick={saveToArchive}>
                {isSaved ? "已保存" : "保存到学生档案"}
              </Button>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#DCFCE7] bg-[#ECFDF3] p-5">
            <p className="text-sm font-semibold text-[#166534]">保存后会沉淀到档案</p>
            <p className="mt-2 text-sm leading-6 text-[#166534]/80">
              当前为演示模式，暂未接入数据库。后续会保存为课堂记录、家长反馈和月报素材。
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
