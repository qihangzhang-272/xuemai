import type { Metadata } from "next";
import { FamilyInviteActivationApp } from "@/components/lessonledger/FamilyInviteActivationApp";

export const metadata: Metadata = {
  title: "激活家庭账号 - LessonLedger",
  description: "通过老师发送的家庭邀请链接激活家长端账号。"
};

type InvitePageParams = Promise<{
  inviteId: string;
}>;

export default async function InviteActivationPage({ params }: { params: InvitePageParams }) {
  const { inviteId } = await params;
  return <FamilyInviteActivationApp inviteKey={decodeURIComponent(inviteId)} />;
}
