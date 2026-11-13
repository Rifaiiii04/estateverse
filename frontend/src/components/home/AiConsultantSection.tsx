"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ShieldCheck, Cpu, Calculator } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/MotionPrimitives";

interface PromptPreview {
  query: string;
  response: string;
  category: string;
}

// AiConsultantSection showcases the 24/7 AI property advisor with staggered Framer Motion card reveals.
export function AiConsultantSection() {
  const { lang, t } = useLanguage();
  const isEn = lang === "en";

  const promptCards: PromptPreview[] = [
    {
      query: isEn ? "Estimate Bali villa rental income" : "Hitung perkiraan hasil sewa villa di Bali",
      response: isEn
        ? "Average 10-14% yearly rental return in Uluwatu & Canggu with high holiday demand."
        : "Rata-rata potensi sewa 10-14% per tahun di Uluwatu & Canggu dengan tingkat sewa liburan tinggi.",
      category: isEn ? "Rental Income" : "Potensi Sewa",
    },
    {
      query: isEn ? "How to see inside rooms in 3D" : "Cara melihat seluruh ruangan rumah lewat fitur 3D",
      response: isEn
        ? "You can open the roof view to check room layouts from above before visiting in person."
        : "Anda bisa membuka tampilan atap rumah untuk melihat susunan kamar sebelum datang langsung.",
      category: isEn ? "3D Home Tour" : "Tur Rumah 3D",
    },
    {
      query: isEn ? "Monthly payment for Rp 3.4 Billion home" : "Hitung cicilan KPR untuk rumah Rp 3,4 Miliar",
      response: isEn
        ? "Down payment 10% (Rp 340M) with estimated monthly payment around Rp 23.5M for 20 years."
        : "Uang muka 10% (Rp 340 Jt) dengan perkiraan cicilan Rp 23,5 Jt/bulan selama 20 tahun.",
      category: isEn ? "KPR & Payment" : "Cicilan & KPR",
    },
    {
      query: isEn ? "Best family homes in Sentul" : "Rekomendasi rumah keluarga nyaman di Sentul",
      response: isEn
        ? "Serenity Tower & Bukit Indah offer 24-hour security, mountain air, and 5-minute toll access."
        : "Kawasan Serenity Tower & Bukit Indah punya keamanan 24 jam, udara sejuk, dan dekat akses tol.",
      category: isEn ? "Area Guide" : "Info Lokasi",
    },
  ];

  return (
    <section id="ai-consultant" className="py-14 sm:py-20 bg-sage-50/55 border-y border-sage-200/60">
      <div className="w-full max-w-[1840px] mx-auto px-4 sm:px-8 lg:px-14 space-y-10 sm:space-y-12">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-neutral-200/70 pb-6">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-[1.15]">
                {t.agents.title}
              </h2>
              <p className="text-sm sm:text-[15px] text-neutral-600 font-normal max-w-xl">
                {t.agents.subtitle}
              </p>
            </div>

            <Link href="/ai-consultant" className="w-full sm:w-auto">
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sage-600 text-white hover:bg-sage-700 text-xs sm:text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-sage-100" />
                <span>{isEn ? "Open AI Consultant Chat" : "Mulai Konsultasi AI"}</span>
                <ArrowRight className="w-3.5 h-3.5 text-sage-200" />
              </motion.button>
            </Link>
          </div>
        </FadeIn>

        {/* 4 Interactive Sample Query Cards */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {promptCards.map((card) => (
            <StaggerItem key={card.query}>
              <Link
                href={`/ai-consultant?q=${encodeURIComponent(card.query)}`}
                className="group h-full bg-white rounded-2xl p-5 border border-neutral-200/80 hover:border-sage-600 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between hover:-translate-y-1 duration-300"
              >
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sage-600 transition-colors">
                    {card.category}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-sage-800 leading-snug">
                    &ldquo;{card.query}&rdquo;
                  </p>
                  <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                    {card.response}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-semibold text-neutral-700 group-hover:text-sage-700">
                  <span>{isEn ? "Ask this question" : "Tanyakan ke AI"}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-sage-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* AI Capabilities Footnote */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-2 text-xs text-neutral-700">
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-neutral-200/70">
              <Cpu className="w-4 h-4 text-sage-600 shrink-0" />
              <span>{isEn ? "Clear guide on 3D room sizes and layouts" : "Bantu jelaskan ukuran dan denah ruangan 3D"}</span>
            </div>
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-neutral-200/70">
              <Calculator className="w-4 h-4 text-sage-600 shrink-0" />
              <span>{isEn ? "Easy monthly payment and rental estimates" : "Hitung perkiraan cicilan KPR dan hasil sewa"}</span>
            </div>
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-neutral-200/70">
              <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0" />
              <span>{isEn ? "Helpful guide on official home ownership papers" : "Panduan surat kepemilikan rumah (SHM/AJB)"}</span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
