"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bot, Send, Sparkles, Box, ArrowRight, RotateCcw, User } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useLanguage } from "@/context/LanguageContext";
import { generateAiAnswer, Message } from "@/lib/ai/consultantAdvisor";
import { AnimatePresence, motion } from "framer-motion";
import { FadeIn, smoothEase } from "@/components/ui/MotionPrimitives";

// AiConsultantContent manages message history, suggested chips, and advisory interactions.
function AiConsultantContent() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const isEn = lang === "en";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: isEn
        ? "Hello! I am your EstateVerse Smart Assistant. Ask me anything about house prices, 3D room tours, monthly mortgage estimates, or home recommendations."
        : "Halo! Saya Asisten Pintar EstateVerse. Silakan tanyakan perkiraan harga rumah, potensi sewa, cara melihat ruangan dalam 3D, atau rekomendasi rumah untuk Anda.",
    },
  ]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialQuery = searchParams.get("q");
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    if (messages.length > 1 && chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = { id: String(Date.now()), sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const response = generateAiAnswer(query, isEn);
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: response.text,
        recommendationLink: response.link,
        recommendationTitle: response.title,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 400);
  };

  const suggestions = [
    isEn ? "Estimate Bali villa rental income" : "Hitung perkiraan hasil sewa villa di Bali",
    isEn ? "How to see inside rooms in 3D" : "Cara melihat seluruh ruangan rumah lewat fitur 3D",
    isEn ? "Monthly payment for Rp 3.4 Billion home" : "Hitung cicilan KPR untuk rumah Rp 3,4 Miliar",
  ];

  return (
    <FadeIn y={14} className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sage-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5 text-sage-100" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-neutral-950 flex items-center gap-2">
              <span>{isEn ? "EstateVerse Smart Assistant" : "Asisten Pintar EstateVerse"}</span>
              <span className="w-2 h-2 rounded-full bg-sage-600 animate-pulse" />
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              {isEn ? "24/7 Home Buying & Property Guide" : "Bantuan Informasi Rumah & Properti 24 Jam"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMessages([messages[0]])}
          className="text-xs text-neutral-500 hover:text-sage-700 flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isEn ? "Clear Chat" : "Hapus Percakapan"}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((sug) => (
          <button
            key={sug}
            type="button"
            onClick={() => handleSend(sug)}
            className="h-9 inline-flex items-center text-xs sm:text-[13px] font-semibold px-3.5 rounded-full bg-sage-50 hover:bg-sage-100 border border-sage-200 text-sage-800 transition-colors cursor-pointer"
          >
            {sug}
          </button>
        ))}
      </div>

      <div
        ref={chatContainerRef}
        className="bg-neutral-50/70 border border-neutral-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 min-h-[380px] max-h-[520px] overflow-y-auto overscroll-contain space-y-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: smoothEase }}
              className={`flex gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.sender === "ai" && (
                <div className="w-7 h-7 rounded-xl bg-sage-600 text-white flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-sage-100" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-sage-600 text-white"
                    : "bg-white text-neutral-800 border border-neutral-200/80 shadow-2xs space-y-3"
                }`}
              >
                <p>{m.text}</p>
                {m.recommendationLink && (
                  <div className="pt-2 border-t border-neutral-100">
                    <Link
                      href={m.recommendationLink}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sage-700 hover:underline"
                    >
                      <Box className="w-3.5 h-3.5 text-sage-600" />
                      <span>{m.recommendationTitle}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
              {m.sender === "user" && (
                <div className="w-7 h-7 rounded-xl bg-sage-100 text-sage-800 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 bg-white border border-neutral-200 rounded-2xl p-1.5 shadow-xs focus-within:border-sage-600 transition-colors"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isEn ? "Ask about houses, 3D tours, rental income, or monthly payments..." : "Tanyakan seputar rumah, tur 3D, hasil sewa, atau cicilan KPR..."}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-sage-600 text-white p-2.5 rounded-xl hover:bg-sage-700 transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </FadeIn>
  );
}

// AiConsultantPage renders the full interactive AI Real Estate Consultant interface.
export default function AiConsultantPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-white min-h-[85vh]">
        <Suspense fallback={<div className="py-20 text-center text-xs text-neutral-400">Loading AI Consultant...</div>}>
          <AiConsultantContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
