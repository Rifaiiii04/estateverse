"use client";

import React from "react";
import { Building2, Home, KeyRound } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { PAGE_CONTAINER } from "@/lib/utils/layout";
import { StaggerContainer, StaggerItem } from "@/components/ui/MotionPrimitives";

const ICONS = [Home, Building2, KeyRound];

// AudienceSection explains who EstateVerse serves: individual sellers, small developers, and first-time buyers.
export function AudienceSection() {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="audience-title" className="py-14 sm:py-16 bg-neutral-50/60 border-y border-neutral-100">
      <div className={cn(PAGE_CONTAINER, "space-y-8")}>
        <h2 id="audience-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
          {t.audience.title}
        </h2>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {t.audience.items.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <StaggerItem key={item.title} className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-sage-600 text-white flex items-center justify-center" aria-hidden="true">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-950">{item.title}</h3>
                <p className="text-sm text-neutral-700 leading-relaxed">{item.desc}</p>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
