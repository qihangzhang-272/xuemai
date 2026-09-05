import type { Metadata } from "next";
import { TeacherPainDemo } from "@/components/teacher-demo/TeacherPainDemo";

export const metadata: Metadata = {
  title: "学脉 · 教培老师工作台 Demo",
  description: "围绕课堂记录、家长沟通和学生连续服务的教培老师工作台产品 Demo"
};

export default function TeacherDemoPage() {
  return <TeacherPainDemo />;
}
