import React from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export function TeachingContent({ text, className = "" }: { text: string; className?: string }) {
  // 兼容模型常用的公式分隔符；代码块里的原文保持不变。
  const content = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => index % 2 ? part : part
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math: string) => `\n$$\n${math}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math: string) => `$${math}$`)).join("");
  return <div className={`teaching-content min-w-0 break-words ${className}`}>
    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, throwOnError: false, maxExpand: 100, maxSize: 10 }]]}
      skipHtml components={{ img: () => null, a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a> }}>
      {content}
    </Markdown>
  </div>;
}
