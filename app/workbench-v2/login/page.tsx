import type { Metadata } from "next";
import { LessonLedgerLoginApp } from "@/components/lessonledger/LessonLedgerLoginApp";

export const metadata: Metadata = {
  title: "登录 - LessonLedger 课时管理系统",
  description: "登录 LessonLedger 教师端或家长端。"
};

export default function WorkbenchV2LoginPage() {
  return <LessonLedgerLoginApp />;
}
