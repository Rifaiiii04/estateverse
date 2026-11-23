/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Camera, ChevronUp, CircleCheck, CircleX, Rotate3d } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { PAGE_CONTAINER } from "@/lib/utils/layout";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/MotionPrimitives";

/** One interior photo shown both ways, so the comparison is about the format and not about a nicer room. */
const ROOM_PHOTO = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80";

// WalkInsideExplainer tells visitors in plain words what Walk Inside is and compares the same home with and without it.
export function WalkInsideExplainer() {
  const { t } = useLanguage();
  const w = t.walkInside;
  return (
    <section id="walk-inside" aria-labelledby="walk-inside-title" className="py-14 sm:py-20 bg-white">
      <div className={cn(PAGE_CONTAINER, "space-y-8 sm:space-y-10")}>
        <FadeIn className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-start">
          <div className="lg:col-span-6 space-y-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-sage-800 bg-sage-50 border border-sage-200 rounded-full px-3 py-1.5">
              <Rotate3d className="w-3.5 h-3.5" aria-hidden="true" />
              {w.badge}
            </span>
            <h2 id="walk-inside-title" className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-tight">
              {w.title}
            </h2>
          </div>
          <p className="lg:col-span-6 text-sm sm:text-[15px] text-neutral-700 leading-relaxed">{w.desc}</p>
        </FadeIn>

        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-neutral-950">{w.compareTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CompareCard label={w.without.label} caption={w.without.caption} points={w.without.points} good={false}>
              <PlainPhoto />
            </CompareCard>
            <CompareCard label={w.with.label} caption={w.with.caption} points={w.with.points} good>
              <PanoramaPreview rooms={w.rooms} illustration={w.illustration} />
            </CompareCard>
          </div>
        </div>

        <Button size="lg" className="w-full sm:w-auto" render={<Link href="/properties?walkInside=1" />}>
          <span>{w.cta}</span>
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}

interface CompareCardProps {
  label: string;
  caption: string;
  points: string[];
  good: boolean;
  children: React.ReactNode;
}

// CompareCard frames one way of advertising: its visual, a caption, and what the buyer can or cannot learn from it.
function CompareCard({ label, caption, points, good, children }: CompareCardProps) {
  const Mark = good ? CircleCheck : CircleX;
  return (
    <FadeIn className={cn("rounded-2xl border bg-white overflow-hidden flex flex-col", good ? "border-sage-300 ring-1 ring-sage-200" : "border-neutral-200")}>
      <div className="relative aspect-[4/3] lg:aspect-[16/10] bg-neutral-100 overflow-hidden">
        {children}
        <span className={cn("absolute top-3 left-3 text-xs font-bold rounded-full px-3 py-1.5", good ? "bg-sage-600 text-white" : "bg-white/95 text-neutral-800")}>
          {label}
        </span>
      </div>
      <div className="p-5 space-y-3 flex-1">
        <p className="text-xs font-semibold text-neutral-600">{caption}</p>
        <ul className="space-y-2.5">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-neutral-800 leading-relaxed">
              <Mark className={cn("w-5 h-5 shrink-0", good ? "text-sage-600" : "text-neutral-400")} aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </FadeIn>
  );
}

// PlainPhoto is the regular listing: a single fixed photo from one angle.
function PlainPhoto() {
  return (
    <>
      <img src={ROOM_PHOTO} alt="" className="w-full h-full object-cover object-[25%_center]" loading="lazy" />
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/95 text-neutral-800 rounded-full px-2.5 py-1">
        <Camera className="w-3.5 h-3.5" aria-hidden="true" /> 1 / 8
      </span>
    </>
  );
}

// PanoramaPreview illustrates a Walk Inside view: the room slowly turns, with room tabs and a move arrow like the real tour.
function PanoramaPreview({ rooms, illustration }: { rooms: string[]; illustration: string }) {
  return (
    <>
      <div className="group absolute inset-0">
        <div className="absolute inset-y-0 left-0 w-[200%] animate-pan-view group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          <img src={ROOM_PHOTO} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>
      <span className="absolute top-3 right-3 text-[10px] font-semibold bg-white/85 text-neutral-700 rounded-md px-2 py-0.5">{illustration}</span>
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-sage-700 shadow-md flex items-center justify-center" aria-hidden="true">
        <ChevronUp className="w-6 h-6" />
      </span>
      <div className="absolute bottom-3 inset-x-3 flex gap-1.5 overflow-hidden" aria-hidden="true">
        {rooms.map((room, i) => (
          <span key={room} className={cn("text-[11px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap", i === 0 ? "bg-sage-600 text-white" : "bg-white/90 text-neutral-800")}>
            {room}
          </span>
        ))}
      </div>
    </>
  );
}
