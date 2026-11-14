"use client";

/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { FadeIn, smoothEase } from "@/components/ui/MotionPrimitives";
import { Logo } from "@/components/ui/Logo";

interface FooterProps {
  showCtaBanner?: boolean;
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
                      alt="Rumah tinggal dengan halaman depan"
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
                      alt="Pemilik baru menerima kunci rumah"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </div>
              </div>
            </FadeIn>

            {/* Pre-Footer Statement */}
            <FadeIn delay={0.08}>
              <div className="border-b border-neutral-100 pb-10 sm:pb-12">
                <h3 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-tight max-w-2xl">
                  {t.footer.statement}
                </h3>
              </div>
            </FadeIn>
          </>
        )}

        {/* 3-Column Footer Directory */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 text-xs sm:text-sm">
          <div className="space-y-1">
            <Logo size="sm" tagline="Walk Inside 360° langsung dari HP" />
          </div>

          <nav aria-label="Tautan footer" className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 font-medium text-neutral-700">
            <Link href="/properties" className="block hover:text-sage-700 transition-colors">Daftar Rumah</Link>
            <Link href="/register" className="block hover:text-sage-700 transition-colors">Jual Rumah Saya</Link>
            <Link href="/ai-consultant" className="block hover:text-sage-700 transition-colors">Asisten Pintar</Link>
            <Link href="/#impact" className="block hover:text-sage-700 transition-colors">Kenapa EstateVerse</Link>
          </nav>
        </div>

        {/* Bottom Copyright & Privacy */}
        <div className="pt-6 sm:pt-8 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
          <p>&copy; {new Date().getFullYear()} EstateVerse. {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
