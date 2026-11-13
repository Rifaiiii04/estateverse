"use client";

/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { FadeIn, smoothEase } from "@/components/ui/MotionPrimitives";

interface FooterProps {
  showCtaBanner?: boolean;
}

// TrustpilotBadge renders the verified customer rating widget with calming sage star boxes.
function TrustpilotBadge({ reviewsText }: { reviewsText: string }) {
  return (
    <div className="flex flex-col items-start lg:items-end gap-1.5">
      <div className="flex items-center gap-1 text-sm font-bold text-neutral-950">
        <Star className="w-4 h-4 text-sage-600 fill-sage-600" />
        <span>Trustpilot</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-5 h-5 bg-sage-600 flex items-center justify-center rounded-2xs">
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          ))}
        </div>
        <span className="text-xs text-neutral-500 font-medium">{reviewsText}</span>
      </div>
    </div>
  );
}

// Footer renders brand statements, directory links, and an animated smart selection CTA banner for the landing page.
export function Footer({ showCtaBanner }: FooterProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Displays the floating CTA banner only on the home landing page unless explicitly overridden.
  const isLandingPage = showCtaBanner ?? (pathname === "/");

  return (
    <footer className="bg-white text-neutral-900 border-t border-neutral-200/80 mt-auto">
      <div
        className={`w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 ${
          isLandingPage ? "py-12 sm:py-20 space-y-14 sm:space-y-20" : "py-10 sm:py-16 space-y-10 sm:space-y-12"
        }`}
      >
        {/* Top Floating Smart Selection CTA Banner Card - Landing Page Only */}
        {isLandingPage && (
          <>
            <FadeIn y={24}>
              <div className="bg-neutral-50/70 border border-neutral-200 rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center overflow-hidden shadow-2xs">
                <div className="lg:col-span-7 space-y-5">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-[1.15]">
                    <span className="block">{t.footer.bannerTitleLine1}</span>
                    <span className="block">{t.footer.bannerTitleLine2}</span>
                  </h2>

                  <p className="text-sm sm:text-[15px] text-neutral-600 leading-relaxed max-w-lg font-normal">
                    {t.footer.bannerDesc}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link href="/properties" className="w-full sm:w-auto">
                      <motion.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full sm:w-auto h-10 bg-sage-600 text-white hover:bg-sage-700 text-xs sm:text-sm font-semibold px-5 rounded-xl transition-colors shadow-2xs border border-transparent cursor-pointer inline-flex items-center justify-center"
                      >
                        {t.footer.exploreBtn}
                      </motion.button>
                    </Link>
                    <Link href="/ai-consultant" className="w-full sm:w-auto">
                      <motion.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full sm:w-auto h-10 border border-neutral-200 hover:border-sage-600 hover:text-sage-700 text-neutral-900 text-xs sm:text-sm font-semibold px-5 rounded-xl transition-colors bg-white cursor-pointer inline-flex items-center justify-center"
                      >
                        {t.footer.consultBtn}
                      </motion.button>
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5 relative flex items-center justify-center min-h-[200px] sm:min-h-[260px]">
                  <motion.div
                    initial={{ opacity: 0, x: -24, rotate: -6 }}
                    whileInView={{ opacity: 1, x: -28, rotate: -3 }}
                    whileHover={{ y: -6, rotate: -1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: smoothEase }}
                    className="w-36 sm:w-52 aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-200 shadow-md"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80"
                      alt="Luxury Modern Architecture Villa"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 24, rotate: 6 }}
                    whileInView={{ opacity: 1, x: 20, rotate: 3 }}
                    whileHover={{ y: -6, rotate: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1, ease: smoothEase }}
                    className="w-40 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-200 shadow-xl border-4 border-white absolute"
                  >
                    <img
                      src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80"
                      alt="Happy Homeowners Celebrating New Key"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </div>
              </div>
            </FadeIn>

            {/* Pre-Footer Statement & Trustpilot Row */}
            <FadeIn delay={0.08}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-end border-b border-neutral-100 pb-10 sm:pb-12">
                <div className="lg:col-span-8">
                  <h3 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-tight max-w-xl">
                    {t.footer.statement}
                  </h3>
                </div>
                <div className="lg:col-span-4 flex lg:justify-end">
                  <TrustpilotBadge reviewsText={t.footer.reviews} />
                </div>
              </div>
            </FadeIn>
          </>
        )}

        {/* 3-Column Footer Directory */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 text-xs sm:text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 rounded-full bg-sage-600" />
              <span className="font-extrabold text-base tracking-tight text-neutral-950 uppercase block">
                ESTATEVERSE
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block pl-4">
              Architecture &amp; 3D Interactive
            </span>
          </div>

          <div className="space-y-1.5 font-medium text-neutral-600">
            <a href="mailto:sales@estateverse.com" className="block hover:text-sage-700 transition-colors">
              sales@estateverse.com
            </a>
            <a href="tel:+6281234567890" className="block hover:text-sage-700 transition-colors">
              +62 812 3456 7890
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 font-medium text-neutral-600">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="block hover:text-sage-700 transition-colors">
              Instagram
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="block hover:text-sage-700 transition-colors">
              Facebook
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="block hover:text-sage-700 transition-colors">
              X.com
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="block hover:text-sage-700 transition-colors">
              LinkedIn
            </a>
          </div>
        </div>

        {/* Bottom Copyright & Privacy */}
        <div className="pt-6 sm:pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
          <p>&copy; {new Date().getFullYear()} EstateVerse. {t.footer.rights}</p>
          <Link href="/#properties" className="hover:text-sage-700 transition-colors">
            {t.footer.privacy}
          </Link>
        </div>
      </div>
    </footer>
  );
}
