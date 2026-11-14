"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bot, User } from "lucide-react";
import type { Message } from "@/lib/ai/consultantAdvisor";

const LISTING_LINK = /(\/properties\/[a-z0-9-]+)/g;

// ChatMessageBubble renders one chat turn, turning listing paths in AI answers into links.
export function ChatMessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-sage-600 text-white flex items-center justify-center shrink-0 mt-1" aria-hidden="true">
          <Bot className="w-3.5 h-3.5" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed space-y-3 ${
          isUser ? "bg-sage-600 text-white" : "bg-white text-neutral-800 border border-neutral-200/80 shadow-2xs"
        }`}
      >
        <span className="sr-only">{isUser ? "Anda:" : "Asisten:"}</span>
        <p className="whitespace-pre-line">{isUser ? message.text : linkify(stripMarkdown(message.text))}</p>
        {message.offline && <p className="text-[11px] text-amber-700">Mode offline — jawaban dari panduan bawaan.</p>}
        {message.recommendationLink && (
          <Link href={message.recommendationLink} className="inline-flex items-center gap-1.5 text-xs font-bold text-sage-700 hover:underline">
            <span>{message.recommendationTitle}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center shrink-0 mt-1" aria-hidden="true">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}

// stripMarkdown removes bold/heading markers the model may emit so plain text reads cleanly.
function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "");
}

// linkify converts /properties/slug mentions into in-app links.
function linkify(text: string): React.ReactNode[] {
  return text.split(LISTING_LINK).map((part, i) =>
    i % 2 === 1 ? (
      <Link key={i} href={part} className="font-semibold text-sage-700 underline">
        {part}
      </Link>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}
