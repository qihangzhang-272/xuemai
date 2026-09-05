import { notFound } from "next/navigation";
import { ClassInsightWorkspace } from "@/components/xuemai/ClassInsightWorkspace";

export default async function ClassDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id !== "mock-class-1") {
    notFound();
  }

  return <ClassInsightWorkspace />;
}
