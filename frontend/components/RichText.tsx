"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { autoMath } from "@/lib/math";
import { uiText } from "@/lib/text";

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`rich-text ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
      >
        {autoMath(uiText(text))}
      </ReactMarkdown>
    </div>
  );
}
