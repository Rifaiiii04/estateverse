/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { smoothEase } from "@/components/ui/MotionPrimitives";
import { Button } from "@/components/ui/Button";

// HeroSection renders the responsive architectural hero showcase with smooth Framer Motion entrance animations.
export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="pt-8 pb-8 sm:pt-10 sm:pb-10 lg:pt-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Typography Headline Split — Responsive across Mobile, Tablet, Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-end mb-8 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: smoothEase }}
            className="lg:col-span-7"
          >
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-neutral-950 leading-[1.08]">
              <span className="block">{t.hero.titleLine1}</span>
              <span className="block">{t.hero.titleLine2}</span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: smoothEase }}
            className="lg:col-span-5 flex flex-col justify-between items-start space-y-5"
          >
            <p className="text-sm sm:text-[15px] text-neutral-600 leading-relaxed font-normal">
              {t.hero.description}
            </p>

            <Button size="lg" className="h-11 w-full px-5 sm:w-auto" render={<Link href="/properties" />}>
              <span>{t.hero.ctaPrimary}</span>
              <ArrowUpRight />
            </Button>
          </motion.div>
        </div>

        {/* Hero house banner */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.18, ease: smoothEase }}
          className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[16/8] rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-100 shadow-lg border border-neutral-200/80"
        >
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85"
            alt="Rumah yang dipasarkan lewat tur virtual 360° EstateVerse"
            className="w-full h-full object-cover object-center transform hover:scale-102 transition-transform duration-700 ease-out"
          />
        </motion.div>
      </div>
    </section>
  );
}
