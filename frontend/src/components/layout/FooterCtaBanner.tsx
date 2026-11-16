"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";
import { FadeIn, smoothEase } from "@/components/ui/MotionPrimitives";

// Renders the two overlapping house photos beside the CTA copy.
function BannerPhotos() {
  return (
    <div className="relative flex min-h-[200px] items-center justify-center sm:min-h-[260px] lg:col-span-5">
      <motion.div
        initial={{ opacity: 0, x: -24, rotate: -6 }}
        whileInView={{ opacity: 1, x: -28, rotate: -3 }}
        whileHover={{ y: -6, rotate: -1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: smoothEase }}
        className="aspect-[3/4] w-36 overflow-hidden rounded-xl bg-muted shadow-md sm:w-52"
      >
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80"
          alt="Rumah tinggal dengan halaman depan"
          className="h-full w-full object-cover"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 24, rotate: 6 }}
        whileInView={{ opacity: 1, x: 20, rotate: 3 }}
        whileHover={{ y: -6, rotate: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1, ease: smoothEase }}
        className="absolute aspect-[3/4] w-40 overflow-hidden rounded-xl border-4 border-background bg-muted shadow-xl sm:w-56"
      >
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80"
          alt="Pemilik baru menerima kunci rumah"
          className="h-full w-full object-cover"
        />
      </motion.div>
    </div>
  );
}

// Renders the landing-page call-to-action card and closing statement above the footer.
export function FooterCtaBanner() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-14 px-4 pt-12 pb-14 sm:space-y-20 sm:px-6 sm:pt-20 sm:pb-20 lg:px-10">
      <FadeIn y={24}>
        <div className="grid grid-cols-1 items-center gap-8 overflow-hidden rounded-2xl bg-sidebar p-6 ring-1 ring-foreground/10 sm:p-10 lg:grid-cols-12 lg:gap-10 lg:p-12">
          <div className="space-y-5 lg:col-span-7">
            <h2 className="text-2xl leading-[1.15] font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
              <span className="block">{t.footer.bannerTitleLine1}</span>
              <span className="block">{t.footer.bannerTitleLine2}</span>
            </h2>
            <p className="max-w-lg text-base text-pretty text-muted-foreground">{t.footer.bannerDesc}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button size="lg" className="w-full px-4 sm:w-auto" render={<Link href="/properties" />}>
                {t.footer.exploreBtn}
              </Button>
              <Button size="lg" variant="outline" className="w-full px-4 sm:w-auto" render={<Link href="/ai-consultant" />}>
                {t.footer.consultBtn}
              </Button>
            </div>
          </div>
          <BannerPhotos />
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <h3 className="max-w-2xl text-xl leading-tight font-bold tracking-tight text-balance sm:text-3xl lg:text-4xl">
          {t.footer.statement}
        </h3>
      </FadeIn>
    </div>
  );
}
