"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, RotateCcw, Send } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FadeIn } from "@/components/ui/MotionPrimitives";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChatMessageBubble } from "@/components/assistant/ChatMessageBubble";
import { useAssistantChat } from "@/lib/ai/useAssistantChat";

const SUGGESTIONS = [
  "Rumah 350 juta, gaji saya 6 juta — cicilannya aman?",
  "Dokumen apa saja untuk mengajukan KPR?",
  "Biaya tambahan apa saja saat membeli rumah?",
  "Saya mau jual rumah sendiri, mulai dari mana?",
];

// AiConsultantContent hosts the assistant conversation, suggestions, and input form.
function AiConsultantContent() {
  const searchParams = useSearchParams();
  const { messages, isThinking, isOffline, send, reset } = useAssistantChat(searchParams.get("property") ?? undefined);
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    const initial = searchParams.get("q");
    if (initial && !sentInitial.current) {
      sentInitial.current = true;
      void send(initial);
    }
  }, [searchParams, send]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  // Submits the typed question.
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
    setInput("");
  };

  return (
    <FadeIn y={14} className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sage-600 text-white flex items-center justify-center" aria-hidden="true">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-neutral-950">Asisten Pintar EstateVerse</h1>
            <p className="text-xs text-neutral-600">
              Pendamping pembeli rumah pertama &amp; penjual perorangan{isOffline ? " · mode offline" : " · didukung AI"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw aria-hidden="true" />
          <span>Hapus Percakapan</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s}
            variant="secondary"
            onClick={() => void send(s)}
            disabled={isThinking}
            className="h-auto min-h-9 rounded-full px-3.5 py-2 text-left whitespace-normal"
          >
            {s}
          </Button>
        ))}
      </div>

      <div ref={logRef} role="log" aria-live="polite" aria-label="Percakapan dengan asisten" className="bg-neutral-50/70 border border-neutral-200 rounded-3xl p-4 sm:p-6 min-h-[380px] max-h-[520px] overflow-y-auto space-y-4">
        {messages.map((m) => (
          <ChatMessageBubble key={m.id} message={m} />
        ))}
        {isThinking && <p className="text-xs text-neutral-600 pl-10">Asisten sedang mengetik…</p>}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2">
        <label htmlFor="assistant-input" className="sr-only">Tulis pertanyaan</label>
        <Input
          id="assistant-input"
          type="text"
          value={input}
          maxLength={1000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan cicilan, dokumen KPR, biaya, atau tips menjual rumah…"
          className="h-10 flex-1"
        />
        <Button type="submit" size="icon-lg" disabled={isThinking || !input.trim()} aria-label="Kirim pertanyaan">
          <Send aria-hidden="true" />
        </Button>
      </form>
      <p className="text-[11px] text-neutral-600">
        Jawaban asisten bisa keliru dan bukan nasihat keuangan. Angka cicilan dan biaya adalah perkiraan — konfirmasi ke bank atau notaris. Jangan menuliskan data pribadi seperti NIK atau nomor rekening.
      </p>
    </FadeIn>
  );
}

// AiConsultantPage renders the smart assistant page.
export default function AiConsultantPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 bg-white min-h-[85vh]">
        <Suspense fallback={<div className="py-20 text-center text-xs text-neutral-600">Memuat asisten…</div>}>
          <AiConsultantContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
