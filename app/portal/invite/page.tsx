import type { Metadata } from "next";
import { FamilyInviteActivationApp } from "@/components/lessonledger/FamilyInviteActivationApp";

export const metadata: Metadata = {
  title: "激活家庭账号 - LessonLedger",
  description: "通过老师发送的家庭邀请 token 激活家长端账号。"
};

type PortalInviteSearchParams = Promise<{
  token?: string | string[];
}>;

function firstToken(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PortalInvitePage({ searchParams }: { searchParams: PortalInviteSearchParams }) {
  const params = await searchParams;
  const token = firstToken(params.token) ?? "";

  return <FamilyInviteActivationApp inviteKey={decodeURIComponent(token)} />;
}
