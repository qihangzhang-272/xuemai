"use client";

import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Camera, CheckCircle2, Copy, Loader2, Trash2, WandSparkles } from "lucide-react";
import type { MonthlySummarySeed, PracticeImageInput, PracticeRecognitionDraft } from "@/lib/ai/practice-recognition";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Field, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type StudentForFeedback = {
  name: string;
  grade: string;
  subject: string;
  parent: string;
};

type UploadedImage = PracticeImageInput & {
  id: string;
};

type SavedRecord = {
  savedAt: string;
  imageCount: number;
  draft: PracticeRecognitionDraft;
  wechatFeedback: string;
  monthlySummarySeed: MonthlySummarySeed;
};

type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
const maxImages = 9;

function emptyDraft(): PracticeRecognitionDraft {
  return {
    practiceType: "",
    materialTitle: "",
    detectedScore: "",
    detectedQuestions: [],
    strengths: [],
    errorReasons: [],
    suggestions: [],
    nextPlan: "",
    confidenceNotes: "",
    monthlySummarySeed: {
      mainProblem: "",
      improvement: "",
      nextAction: ""
    }
  };
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join("\n");
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("图片读取失败"));
      }
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export function PracticeFeedbackWorkspace({ student }: { student: StudentForFeedback }) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [materialTitle, setMaterialTitle] = useState("");
  const [scoreText, setScoreText] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [draft, setDraft] = useState<PracticeRecognitionDraft | null>(null);
  const [wechatFeedback, setWechatFeedback] = useState("");
  const [savedRecord, setSavedRecord] = useState<SavedRecord | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState("");

  async function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selectedFiles.length) return;

    setError("");

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setError("一次最多上传 9 张图片。");
      return;
    }

    const nextFiles = selectedFiles.slice(0, remainingSlots);
    const invalidFile = nextFiles.find((file) => !allowedTypes.includes(file.type));
    if (invalidFile) {
      setError("只支持 PNG、JPG 或 WebP 图片。");
      return;
    }

    try {
      const uploadedImages = await Promise.all(
        nextFiles.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
          fileName: file.name,
          mimeType: file.type as PracticeImageInput["mimeType"],
          dataUrl: await fileToDataUrl(file)
        }))
      );

      setImages((current) => [...current, ...uploadedImages]);
      setSavedRecord(null);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "图片读取失败");
    }
  }

  function removeImage(imageId: string) {
    setImages((current) => current.filter((image) => image.id !== imageId));
    setSavedRecord(null);
  }

  function updateDraft(nextDraft: Partial<PracticeRecognitionDraft>) {
    setDraft((current) => ({
      ...(current || emptyDraft()),
      ...nextDraft
    }));
    setSavedRecord(null);
  }

  function updateMonthlySeed(nextSeed: Partial<MonthlySummarySeed>) {
    setDraft((current) => {
      const base = current || emptyDraft();
      return {
        ...base,
        monthlySummarySeed: {
          ...base.monthlySummarySeed,
          ...nextSeed
        }
      };
    });
    setSavedRecord(null);
  }

  async function recognizePractice() {
    if (!images.length) {
      setError("请先上传至少 1 张练习图片。");
      return;
    }

    setError("");
    setIsRecognizing(true);
    setWechatFeedback("");
    setSavedRecord(null);

    try {
      const response = await fetch("/api/ai/practice-recognition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentName: student.name,
          grade: student.grade,
          subject: student.subject,
          materialTitle,
          scoreText,
          teacherNotes,
          nextPlan,
          images
        })
      });

      const result = (await response.json()) as ApiResponse<PracticeRecognitionDraft>;
      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "识别失败" : result.error);
      }

      setDraft(result.data);
    } catch (recognitionError) {
      setError(recognitionError instanceof Error ? recognitionError.message : "识别练习材料失败");
    } finally {
      setIsRecognizing(false);
    }
  }

  async function generateFeedback() {
    if (!draft) {
      setError("请先生成并校正识别结果。");
      return;
    }

    setError("");
    setIsGenerating(true);
    setSavedRecord(null);

    try {
      const response = await fetch("/api/ai/wechat-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentName: student.name,
          parentName: student.parent,
          grade: student.grade,
          subject: student.subject,
          materialTitle,
          scoreText,
          teacherNotes,
          nextPlan,
          correctedDraft: draft
        })
      });

      const result = (await response.json()) as ApiResponse<{ wechatFeedback: string; monthlySummarySeed: MonthlySummarySeed }>;
      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "生成失败" : result.error);
      }

      setWechatFeedback(result.data.wechatFeedback);
      updateMonthlySeed(result.data.monthlySummarySeed);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "生成微信反馈失败");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyFeedback() {
    if (!wechatFeedback) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(wechatFeedback);
    } catch {
      setError("复制失败，请手动选中文案复制。");
    } finally {
      window.setTimeout(() => setIsCopying(false), 800);
    }
  }

  function saveRecord() {
    if (!draft || !wechatFeedback) {
      setError("请先生成微信反馈，再保存本次记录。");
      return;
    }

    setSavedRecord({
      savedAt: new Date().toLocaleString("zh-CN"),
      imageCount: images.length,
      draft,
      wechatFeedback,
      monthlySummarySeed: draft.monthlySummarySeed
    });
    setError("");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-5">
        {error ? (
          <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        {savedRecord ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
            <span>
              已保存本次练习反馈：{savedRecord.imageCount} 张图片，保存时间 {savedRecord.savedAt}。刷新后不保证保留，后续会接入数据库持久化。
            </span>
          </div>
        ) : null}

        <CollapsibleSection title="1. 上传练习材料" summary="支持 PNG、JPG、WebP，最多 9 张。">
          <label className="flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-[#c9c4bb] bg-[rgba(244,242,238,0.86)] p-6 text-center transition hover:bg-white/70">
            <Camera size={24} className="text-[#56524b]" />
            <span className="mt-3 text-base font-semibold text-[#191919]">选择图片</span>
            <span className="mt-2 max-w-md text-sm leading-6 text-[var(--app-text-muted)]">
              可上传试卷、作文、手改练习、阅读题或课堂练习截图。当前页面会把图片发送到服务端 AI 识别。
            </span>
            <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFilesChange} />
          </label>

          {images.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image, index) => (
                <div key={image.id} className="rounded-[20px] border border-[var(--app-line)] bg-white/60 p-3">
                  <Image src={image.dataUrl} alt={`练习材料 ${index + 1}`} width={240} height={128} unoptimized className="h-32 w-full rounded-[14px] object-cover" />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-[var(--app-text-muted)]">{image.fileName}</p>
                    <button type="button" onClick={() => removeImage(image.id)} className="rounded-full p-2 text-[var(--app-text-muted)] transition hover:bg-[#f0eee9] hover:text-[#191919]">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection title="2. 补充老师信息" summary="这些信息会帮助 AI 更稳地识别和生成反馈。">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="练习主题">
              <Input value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} placeholder="例如：英语作文修改 / 分数应用题练习" />
            </Field>
            <Field label="分数或表现">
              <Input value={scoreText} onChange={(event) => setScoreText(event.target.value)} placeholder="例如：80/100，作文语法错误较多" />
            </Field>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="老师备注">
              <Textarea value={teacherNotes} onChange={(event) => setTeacherNotes(event.target.value)} placeholder="补充课堂观察、批改结论或家长需要知道的重点" />
            </Field>
            <Field label="后续安排">
              <Textarea value={nextPlan} onChange={(event) => setNextPlan(event.target.value)} placeholder="下次课或课后计划如何跟进" />
            </Field>
          </div>
          <Button type="button" className="mt-5" onClick={recognizePractice} disabled={isRecognizing || !images.length} icon={isRecognizing ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}>
            {isRecognizing ? "正在识别" : "识别练习材料"}
          </Button>
        </CollapsibleSection>

        <CollapsibleSection title="3. 校正识别结果" summary="老师先确认和修正，再生成微信反馈。">
          {draft ? (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="练习类型">
                  <Input value={draft.practiceType} onChange={(event) => updateDraft({ practiceType: event.target.value })} />
                </Field>
                <Field label="材料标题">
                  <Input value={draft.materialTitle} onChange={(event) => updateDraft({ materialTitle: event.target.value })} />
                </Field>
              </div>
              <Field label="分数或表现">
                <Input value={draft.detectedScore} onChange={(event) => updateDraft({ detectedScore: event.target.value })} />
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="题目或任务要点" hint="每行一条。">
                  <Textarea value={joinLines(draft.detectedQuestions)} onChange={(event) => updateDraft({ detectedQuestions: splitLines(event.target.value) })} />
                </Field>
                <Field label="值得肯定" hint="每行一条。">
                  <Textarea value={joinLines(draft.strengths)} onChange={(event) => updateDraft({ strengths: splitLines(event.target.value) })} />
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="错误原因" hint="每行一条。">
                  <Textarea value={joinLines(draft.errorReasons)} onChange={(event) => updateDraft({ errorReasons: splitLines(event.target.value) })} />
                </Field>
                <Field label="后续建议" hint="每行一条。">
                  <Textarea value={joinLines(draft.suggestions)} onChange={(event) => updateDraft({ suggestions: splitLines(event.target.value) })} />
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="下一步安排">
                  <Textarea value={draft.nextPlan} onChange={(event) => updateDraft({ nextPlan: event.target.value })} />
                </Field>
                <Field label="需要老师确认的地方">
                  <Textarea value={draft.confidenceNotes} onChange={(event) => updateDraft({ confidenceNotes: event.target.value })} />
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="月度素材：主要问题">
                  <Textarea value={draft.monthlySummarySeed.mainProblem} onChange={(event) => updateMonthlySeed({ mainProblem: event.target.value })} />
                </Field>
                <Field label="月度素材：进步点">
                  <Textarea value={draft.monthlySummarySeed.improvement} onChange={(event) => updateMonthlySeed({ improvement: event.target.value })} />
                </Field>
                <Field label="月度素材：后续动作">
                  <Textarea value={draft.monthlySummarySeed.nextAction} onChange={(event) => updateMonthlySeed({ nextAction: event.target.value })} />
                </Field>
              </div>
              <Button type="button" onClick={generateFeedback} disabled={isGenerating} icon={isGenerating ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}>
                {isGenerating ? "正在生成" : "生成微信反馈"}
              </Button>
            </div>
          ) : (
            <p className="rounded-[22px] bg-[var(--app-panel-soft)] p-5 text-sm leading-6 text-[var(--app-text-muted)]">
              上传图片并点击“识别练习材料”后，这里会出现可编辑的识别结果。
            </p>
          )}
        </CollapsibleSection>
      </div>

      <aside className="space-y-5">
        <CollapsibleSection title="微信反馈草稿" eyebrow="单次任务只输出这段文案" summary="生成后可复制、编辑并演示保存。">
          <div className="min-h-[260px] rounded-[26px] bg-[#22201e] p-5 text-sm leading-7 text-white/75 shadow-[0_16px_30px_rgba(0,0,0,0.14)]">
            {wechatFeedback || "校正识别结果后，点击“生成微信反馈”，这里会显示可复制给家长的微信文案。"}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={copyFeedback} disabled={!wechatFeedback || isCopying} icon={<Copy size={16} />}>
              {isCopying ? "已复制" : "复制反馈"}
            </Button>
            <Button type="button" onClick={saveRecord} disabled={!wechatFeedback || !draft} icon={<CheckCircle2 size={16} />}>
              演示保存
            </Button>
          </div>
          {draft ? (
            <div className="mt-5 rounded-[22px] bg-[var(--app-panel-soft)] p-4 text-xs leading-5 text-[var(--app-text-muted)]">
              月度总结素材会随本次记录保存：{draft.monthlySummarySeed.mainProblem || "等待生成或校正"}。
            </div>
          ) : null}
        </CollapsibleSection>
      </aside>
    </div>
  );
}
