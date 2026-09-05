import { FileText, Loader2, MessageCircle, NotebookPen, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentActionBar({
  isWorkflowRunning,
  onRunWorkflow,
  onToast
}: {
  isWorkflowRunning: boolean;
  onRunWorkflow: () => void;
  onToast: (message: string) => void;
}) {
  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Button
        type="button"
        onClick={onRunWorkflow}
        disabled={isWorkflowRunning}
        className="h-11 justify-center rounded-[15px] px-3"
        icon={isWorkflowRunning ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
      >
        {isWorkflowRunning ? "AI 助教正在更新档案..." : "模拟批改完成"}
      </Button>
      <Button type="button" variant="secondary" className="h-11 rounded-[15px] px-3" icon={<MessageCircle size={16} />} onClick={() => onToast("已生成微信反馈草稿")}>
        生成微信反馈
      </Button>
      <Button type="button" variant="secondary" className="h-11 rounded-[15px] px-3" icon={<NotebookPen size={16} />} onClick={() => onToast("已生成下次课建议")}>
        生成下次课建议
      </Button>
      <Button type="button" variant="secondary" className="h-11 rounded-[15px] px-3" icon={<FileText size={16} />} onClick={() => onToast("已生成月度报告草稿")}>
        生成月度报告
      </Button>
    </section>
  );
}
