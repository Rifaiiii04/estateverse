"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Camera, Calculator } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { PAGE_CONTAINER } from "@/lib/utils/layout";
import { Button } from "@/components/ui/Button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/MotionPrimitives";
import { formatIDR } from "@/lib/utils/formatters";
import { assessAffordability, monthlyInstallment } from "@/lib/utils/mortgage";

type AgentsCopy = ReturnType<typeof useLanguage>["t"]["agents"];

interface PromptPreview {
  query: string;
  response: string;
  category: string;
}

const CAPABILITY_ICONS = [Calculator, ShieldCheck, Camera];

// buildPromptCards prepares example questions in the active language; the affordability answer is computed, not hard-coded.
function buildPromptCards(copy: AgentsCopy): PromptPreview[] {
  const installment = monthlyInstallment({ price: 350_000_000, downPaymentPct: 10, annualRatePct: 7, years: 15 });
  const { ratio } = assessAffordability(installment, 6_000_000);
  const { affordability, documents, costs, sellers } = copy.prompts;
  const computed = affordability.response
    .replace("{installment}", formatIDR(installment))
    .replace("{ratio}", String(Math.round(ratio * 100)));
  return [{ ...affordability, response: computed }, documents, costs, sellers];
}

// AiConsultantSection introduces the smart assistant for first-home buyers and independent sellers.
export function AiConsultantSection() {
  const { t } = useLanguage();
  const promptCards = buildPromptCards(t.agents);
  const capabilities = t.agents.capabilities.map((text, i) => ({ icon: CAPABILITY_ICONS[i] ?? Sparkles, text }));

  return (
    <section id="ai-consultant" aria-labelledby="assistant-title" className="py-14 sm:py-20 bg-sage-50/55 border-y border-sage-200/60">
      <div className={cn(PAGE_CONTAINER, "space-y-10 sm:space-y-12")}>
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-neutral-200/70 pb-6">
            <div className="space-y-2">
              <h2 id="assistant-title" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-[1.15]">
                {t.agents.title}
              </h2>
              <p className="text-sm sm:text-[15px] text-neutral-700 max-w-xl">{t.agents.subtitle}</p>
            </div>
            <Button size="lg" className="w-full sm:w-auto" render={<Link href="/ai-consultant" />}>
              <Sparkles aria-hidden="true" />
              <span>{t.agents.cta}</span>
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {promptCards.map((card) => (
            <StaggerItem key={card.query}>
              <Link
                href={`/ai-consultant?q=${encodeURIComponent(card.query)}`}
                className="group h-full bg-white rounded-2xl p-5 border border-neutral-200/80 hover:border-sage-600 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600"
              >
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sage-700">{card.category}</span>
                  <p className="text-sm font-bold text-neutral-900 group-hover:text-sage-800 leading-snug">&ldquo;{card.query}&rdquo;</p>
                  <p className="text-xs text-neutral-700 leading-relaxed">{card.response}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-800 group-hover:text-sage-700">
                  <span>{t.agents.askLink}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-sage-600" aria-hidden="true" />
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn delay={0.1}>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-2 text-sm text-neutral-800">
            {capabilities.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 bg-white p-4 rounded-xl border border-neutral-200/70">
                <Icon className="w-4 h-4 text-sage-600 shrink-0" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}
