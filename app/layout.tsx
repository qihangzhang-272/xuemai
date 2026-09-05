import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学脉 AI",
  description: "老师专属的 AI 学情追踪与教学服务工作台",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
