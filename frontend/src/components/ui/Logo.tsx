import React from "react";

// LogoMark draws the EstateVerse symbol: a house circled by a 360° orbit arrow (same artwork as /logo-mark.svg).
export function LogoMark({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill="#356859" />
      <path d="M20 35V24.5L32 15l12 9.5V35" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 35v-6a4 4 0 0 1 8 0v6z" fill="#ffffff" />
      <path d="M10 36.5c0 5 9.8 9 22 9s22-4 22-9" fill="none" stroke="#c8dcd4" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50 38.2 54 31l4 7.2z" fill="#c8dcd4" />
      <circle cx="50" cy="15" r="3.2" fill="none" stroke="#c8dcd4" strokeWidth="2.2" />
    </svg>
  );
}

interface LogoProps {
  tagline?: string;
  size?: "sm" | "md";
}

// Logo combines the mark with the ESTATEVERSE wordmark and an optional tagline.
export function Logo({ tagline = "Walk Inside 360°", size = "md" }: LogoProps) {
  const markClass = size === "sm" ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10";
  const wordClass = size === "sm" ? "text-base" : "text-lg sm:text-xl";
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={`${markClass} shrink-0`} />
      <span className="flex flex-col">
        <span className={`font-extrabold ${wordClass} tracking-tight text-neutral-950 uppercase leading-none`}>
          Estate<span className="text-sage-600">Verse</span>
        </span>
        {tagline && (
          <span className="text-[10px] tracking-widest text-neutral-600 font-semibold uppercase mt-0.5">{tagline}</span>
        )}
      </span>
    </span>
  );
}
