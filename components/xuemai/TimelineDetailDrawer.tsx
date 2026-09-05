"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeedbackDetail, TimelineItem } from "@/lib/mock/xuemai-types";

function DetailList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--app-text-soft)]">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded-full bg-[var(--app-panel-soft)] px-3 py-1.5 text-sm text-[#374151]">{value}</span>
        ))}
      </div>
    </div>
  );
}

export function TimelineDetailDrawer({
  item,
  open,
  onOpenChange,
  onCopy,
  onSaveFeedback,
  onMarkSent
}: {
  item: TimelineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (item: TimelineItem) => void;
  onSaveFeedback: (item: TimelineItem, fullText: string) => void;
  onMarkSent: (item: TimelineItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    if (item?.detail.kind === "feedback") {
      setDraftText(item.detail.fullText);
    } else {
      setDraftText("");
    }
    setEditing(false);
  }, [item]);

  if (!open || !item) return null;

  const canCopy = item.copyable;
  const feedbackDetail = item.detail.kind === "feedback" ? (item.detail as FeedbackDetail) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-3 pb-3 pt-16 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#16A34A]">{item.displayTime}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
              {item.detail.kind === "feedback" ? "家长反馈详情" : item.detail.kind === "mistake" ? "错题分析详情" : item.detail.kind === "report" ? "月度报告详情" : item.detail.kind === "profile_update" ? "学习画像更新详情" : "班级洞察详情"}
            </h2>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-panel-soft)] text-[#4B5563]">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {feedbackDetail ? (
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#DCFCE7] px-3 py-1.5 text-sm font-medium text-[#166534]">语气：{feedbackDetail.tone}</span>
                {item.status === "sent" ? <span className="rounded-full bg-[#ECFDF3] px-3 py-1.5 text-sm font-medium text-[#15803D]">已发送</span> : null}
              </div>
              {editing ? (
                <textarea
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  className="mt-4 min-h-44 w-full resize-none rounded-[22px] border border-[var(--app-line-strong)] bg-[#F9FAFB] p-4 text-sm leading-7 outline-none focus:border-[#16A34A]"
                />
              ) : (
                <p className="mt-4 rounded-[22px] bg-[#F9FAFB] p-4 text-sm leading-7 text-[#374151]">{feedbackDetail.fullText}</p>
              )}
            </div>
          ) : null}

          {item.detail.kind === "mistake" ? (
            <div className="space-y-5">
              <div className="rounded-[22px] bg-[#FEF2F2] p-4 text-sm font-semibold text-[#DC2626]">错题数量：{item.detail.wrongQuestionCount} 题</div>
              <DetailList title="主要知识点" values={item.detail.knowledgePoints} />
              <DetailList title="高频错误" values={item.detail.errorPatterns} />
              <DetailList title="建议训练" values={item.detail.suggestedTraining} />
              <p className="rounded-[18px] bg-[var(--app-panel-soft)] p-3 text-sm text-[var(--app-text-muted)]">关联试卷：{item.detail.relatedPaperTitle}</p>
            </div>
          ) : null}

          {item.detail.kind === "report" ? (
            <div className="space-y-5">
              <DetailList title="本月进步点" values={item.detail.progress} />
              <DetailList title="本月主要问题" values={item.detail.problems} />
              <DetailList title="下月训练重点" values={item.detail.nextMonthFocus} />
              <p className="rounded-[22px] bg-[#F9FAFB] p-4 text-sm leading-7 text-[#374151]">{item.detail.summaryText}</p>
            </div>
          ) : null}

          {item.detail.kind === "profile_update" ? (
            <div className="space-y-5">
              <DetailList title="新增薄弱点" values={item.detail.addedWeakPoints} />
              <p className="rounded-[22px] bg-[#F9FAFB] p-4 text-sm leading-7 text-[#374151]">
                状态变化：{item.detail.statusFrom} → {item.detail.statusTo}
              </p>
              <DetailList title="下次课重点" values={item.detail.nextLessonFocus} />
              <p className="rounded-[22px] bg-[#F9FAFB] p-4 text-sm leading-7 text-[#374151]">{item.detail.reason}</p>
            </div>
          ) : null}

          {item.detail.kind === "class_insight" ? (
            <div className="space-y-5">
              <p className="rounded-[22px] bg-[#FFF7ED] p-4 text-sm leading-7 text-[#9A3412]">{item.detail.commonProblem}</p>
              <DetailList title="关联学生" values={item.detail.affectedStudentNames} />
              <p className="rounded-[22px] bg-[#F0FDF4] p-4 text-sm leading-7 text-[#166534]">{item.detail.teachingSuggestion}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {canCopy ? <Button type="button" variant="secondary" icon={<Copy size={16} />} onClick={() => onCopy(item)}>复制</Button> : null}
          {feedbackDetail && editing ? (
            <Button type="button" icon={<CheckCircle2 size={16} />} onClick={() => onSaveFeedback(item, draftText)}>保存修改</Button>
          ) : null}
          {feedbackDetail && !editing ? <Button type="button" variant="secondary" onClick={() => setEditing(true)}>编辑</Button> : null}
          {feedbackDetail ? <Button type="button" icon={<Send size={16} />} onClick={() => onMarkSent(item)}>标记已发送</Button> : null}
        </div>
      </div>
    </div>
  );
}
