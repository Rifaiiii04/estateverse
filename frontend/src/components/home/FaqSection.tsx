"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ArrowUpRight, MessageSquare } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { FadeIn, StaggerContainer, StaggerItem, smoothEase } from "@/components/ui/MotionPrimitives";

// FaqSection renders an interactive Framer Motion accordion of frequently asked questions above the footer.
export function FaqSection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Toggles the active accordion item by index.
  const toggleItem = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-14 sm:py-20 bg-neutral-50/60 border-t border-neutral-200/70">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Section Heading & Direct AI Consultant Helper Card */}
          <FadeIn className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-[1.15]">
                <span className="block">{t.faq.titleLine1}</span>
                <span className="block">{t.faq.titleLine2}</span>
              </h2>
              <p className="text-sm sm:text-[15px] text-neutral-600 leading-relaxed max-w-md font-normal">
                {t.faq.subtitle}
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3.5 shadow-2xs max-w-md">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-sage-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-950">
                    {t.faq.askAiLabel}
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {t.faq.askAiDesc}
                  </p>
                </div>
              </div>

              <Link href="/ai-consultant" className="inline-block">
                <motion.button
                  type="button"
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.98 }}
                  className="h-9 inline-flex items-center gap-1.5 bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold px-4 rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  <span>{t.faq.askAiBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-sage-100" />
                </motion.button>
              </Link>
            </div>
          </FadeIn>

          {/* Right Column: Smooth Animated Accordion FAQ List */}
          <StaggerContainer className="lg:col-span-7 space-y-3">
            {t.faq.items.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <StaggerItem key={item.q}>
                  <div
                    className={`rounded-2xl border transition-colors overflow-hidden ${
                      isOpen
                        ? "bg-white border-sage-400 shadow-xs"
                        : "bg-white border-neutral-200/90 hover:border-neutral-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(idx)}
                      aria-expanded={isOpen}
                      className="w-full px-5 py-4 sm:px-6 sm:py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span className="text-sm sm:text-[15px] font-bold text-neutral-950 leading-snug">
                        {item.q}
                      </span>
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isOpen
                            ? "bg-sage-600 text-white"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: smoothEase }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
                            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-200/70 pt-3.5">
                              {item.a}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
