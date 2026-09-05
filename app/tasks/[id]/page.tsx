import { AppShell } from "@/components/layout/AppShell";
import { TaskExecutionWorkspace } from "@/components/tasks/TaskExecutionWorkspace";
import { getDemoAgentTaskById } from "@/lib/mock/data";

export default async function TaskDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = getDemoAgentTaskById(id);

  return (
    <AppShell>
      <TaskExecutionWorkspace task={task} />
    </AppShell>
  );
}
