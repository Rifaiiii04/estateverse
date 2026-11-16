/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Layers, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { FadeIn, smoothEase } from "@/components/ui/MotionPrimitives";
import { Button } from "@/components/ui/Button";

// FeatureShowcase renders a responsive process walkthrough with Framer Motion step transitions.
export function FeatureShowcase() {
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(1);
  const steps = t.features.steps;

  return (
    <section id="how-it-works" className="py-14 sm:py-22 bg-white">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Section Heading Split */}
        <FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            <div className="lg:col-span-7">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-[1.15]">
                <span className="block">{t.features.titleLine1}</span>
                <span className="block">{t.features.titleLine2}</span>
              </h2>
            </div>

            <div className="lg:col-span-5">
              <p className="text-sm sm:text-[15px] text-neutral-600 leading-relaxed max-w-xl">
                {t.features.description}
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Feature Split Container */}
        <FadeIn delay={0.08}>
          <div className="bg-neutral-50/80 rounded-2xl sm:rounded-3xl border border-neutral-200 p-5 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Interactive Steps with AnimatePresence */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 sm:space-y-8">
              <div className="space-y-3 sm:space-y-4 min-h-[160px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: smoothEase }}
                    className="space-y-3"
                  >
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-950 tracking-tight">
                      {steps[activeStep].title}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                      {steps[activeStep].desc}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="pt-2">
                  <Button size="lg" className="px-4" render={<Link href="/ai-consultant" />}>
                    <span>{t.features.cta}</span>
                    <ArrowRight />
                  </Button>
                </div>
              </div>

              {/* Stepper Navigation List */}
              <div className="space-y-2 pt-4 border-t border-neutral-200/70">
                {steps.map((st, idx) => (
                  <Button
                    key={st.title}
                    variant={activeStep === idx ? "secondary" : "ghost"}
                    aria-pressed={activeStep === idx}
                    onClick={() => setActiveStep(idx)}
                    className="w-full justify-between text-left"
                  >
                    <span>{st.title}</span>
                    {activeStep === idx && <CheckCircle2 className="text-primary" />}
                  </Button>
                ))}
              </div>
            </div>

            {/* Right Column: Architectural Photography with Animated Blueprint Card */}
            <div className="lg:col-span-7 relative space-y-3 sm:space-y-0">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-200 shadow-md border border-neutral-200">
                <img
                  src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
                  alt="Contoh ruangan yang direkam sebagai tur 360°"
                  className="w-full h-full object-cover"
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2, ease: smoothEase }}
                className="sm:absolute sm:bottom-4 sm:right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-neutral-200 shadow-lg sm:max-w-[280px]"
              >
                <div className="flex items-center justify-between text-xs text-neutral-900 font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sage-600" />
                    <span>{t.features.blueprintTitle}</span>
                  </span>
                  <span className="text-[10px] text-sage-700 font-semibold bg-sage-100 border border-sage-200 px-2 py-0.5 rounded-md">
                    {t.features.blueprintBadge}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-snug">
                  {t.features.blueprintDesc}
                </p>
              </motion.div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
