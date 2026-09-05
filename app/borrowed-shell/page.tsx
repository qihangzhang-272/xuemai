import type { Metadata } from "next";
import { BorrowedShellApp } from "@/components/borrowed-shell/BorrowedShellApp";

export const metadata: Metadata = {
  title: "学脉借壳版课后服务工作台",
  description: "以教培 CRM 和课时管理壳承载学脉 AI 反馈、入档和学生时间线闭环的可运行原型。"
};

export default function BorrowedShellPage() {
  return <BorrowedShellApp />;
}
