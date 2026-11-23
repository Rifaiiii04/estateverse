"use client";

import React from "react";
import { CircleAlert, CircleCheck, KeyRound, Search, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { PAGE_CONTAINER } from "@/lib/utils/layout";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/MotionPrimitives";

/** Icon per audience group, in the order of t.problems.groups: buyers, then sellers. */
const GROUP_ICONS = [Search, KeyRound];

// ProblemSolutionSection leads with the frustrations buyers and sellers actually have, each paired with what EstateVerse does about it.
export function ProblemSolutionSection() {
  const { t } = useLanguage();
  const p = t.problems;
  return (
    <section id="why" aria-labelledby="problems-title" className="py-14 sm:py-20 bg-neutral-50/60 border-y border-neutral-100">
      <div className={cn(PAGE_CONTAINER, "space-y-8 sm:space-y-10")}>
        <FadeIn className="space-y-3 max-w-3xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-sage-800 bg-sage-50 border border-sage-200 rounded-full px-3 py-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {p.badge}
          </span>
          <h2 id="problems-title" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-tight">
            <span className="block">{p.titleLine1}</span>
            <span className="block text-sage-700">{p.titleLine2}</span>
          </h2>
          <p className="text-sm sm:text-[15px] text-neutral-700 leading-relaxed">{p.subtitle}</p>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {p.groups.map((group, i) => {
            const Icon = GROUP_ICONS[i % GROUP_ICONS.length];
            return (
              <StaggerItem key={group.audience} className="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 space-y-5">
                <h3 className="flex items-center gap-3 text-lg font-bold text-neutral-950">
                  <span className="w-11 h-11 rounded-xl bg-sage-600 text-white flex items-center justify-center shrink-0" aria-hidden="true">
                    <Icon className="w-5 h-5" />
                  </span>
                  {group.audience}
                </h3>
                <ul className="divide-y divide-neutral-100">
                  {group.items.map((item) => (
                    <ProblemRow key={item.problem} problem={item.problem} solution={item.solution} labels={p} />
                  ))}
                </ul>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}

interface ProblemRowProps {
  problem: string;
  solution: string;
  labels: { problemLabel: string; solutionLabel: string };
}

// ProblemRow shows one frustration and, right under it, how EstateVerse helps with it.
function ProblemRow({ problem, solution, labels }: ProblemRowProps) {
  return (
    <li className="py-4 first:pt-0 last:pb-0 space-y-2">
      <p className="flex items-start gap-2.5 text-[15px] font-bold text-neutral-950">
        <CircleAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <span className="sr-only">{labels.problemLabel}: </span>
          {problem}
        </span>
      </p>
      <p className="flex items-start gap-2.5 text-sm text-neutral-700 leading-relaxed">
        <CircleCheck className="w-5 h-5 text-sage-600 shrink-0" aria-hidden="true" />
        <span>
          <span className="sr-only">{labels.solutionLabel}: </span>
          {solution}
        </span>
      </p>
    </li>
  );
}
