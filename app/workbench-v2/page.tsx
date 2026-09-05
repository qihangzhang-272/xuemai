import type { Metadata } from "next";
import { LessonLedgerApp } from "@/components/lessonledger/LessonLedgerApp";
import { resolveLessonLedgerInitialState } from "./initial-state";

export const metadata: Metadata = {
  title: "LessonLedger 课时管理系统",
  description: "面向独立老师和教培老师的课时、排课、反馈、家校沟通与学习报告管理系统。"
};

type WorkbenchV2SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WorkbenchV2Page({ searchParams }: { searchParams?: WorkbenchV2SearchParams }) {
  const params = searchParams ? await searchParams : {};
  return <LessonLedgerApp initialState={resolveLessonLedgerInitialState(params)} />;
}
