import { ArrowLeft, FileSearch } from "lucide-react";
import { TaskReviewPanel } from "./ContextPanel";
import type { SkillAction, TaskCard } from "./types";

type TaskReviewWorkspaceProps = {
  task: TaskCard;
  autoArchiveLearningEvidence: boolean;
  onBack: () => void;
  onAction?: (task: TaskCard, action: SkillAction) => void;
  onEdit?: (task: TaskCard, value: string) => void;
  onReset?: (task: TaskCard) => void;
  onAutoArchiveLearningEvidenceChange?: (enabled: boolean) => void;
  onConfirmProfileUpdates?: (task: TaskCard, selectedSuggestionIds: string[]) => void;
};

export function TaskReviewWorkspace({
  task,
  autoArchiveLearningEvidence,
  onBack,
  onAction,
  onEdit,
  onReset,
  onAutoArchiveLearningEvidenceChange,
  onConfirmProfileUpdates
}: TaskReviewWorkspaceProps) {
  return (
    <section className="flex min-h-0 w-full flex-col bg-[#f7f8f7]">
      <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#edf0ee] bg-white/96 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5c665f] transition hover:bg-[#f3f4f5]" aria-label="返回聊天">
            <ArrowLeft size={18} />
          </button>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[#edf8f1] text-[#15803d]">
            <FileSearch size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold text-[#191c1d]">{task.title}</h1>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#6b746d]">详情工作区 · 确认、编辑、入档和追踪操作</p>
          </div>
        </div>
        <span className="rounded-full bg-[#f3f5f4] px-2.5 py-1 text-[11px] font-bold text-[#3d4a3d]">不会自动发给家长</span>
      </header>

      <div className="xuemai-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto w-full max-w-[760px]">
          <TaskReviewPanel
            task={task}
            autoArchiveLearningEvidence={autoArchiveLearningEvidence}
            onAction={onAction}
            onEdit={onEdit}
            onReset={onReset}
            onAutoArchiveLearningEvidenceChange={onAutoArchiveLearningEvidenceChange}
            onConfirmProfileUpdates={onConfirmProfileUpdates}
          />
        </div>
      </div>
    </section>
  );
}
