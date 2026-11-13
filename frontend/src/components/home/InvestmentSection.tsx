/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download, Maximize2, Layers, Bed, Bath, Box, CheckCircle2 } from "lucide-react";
import { Property } from "@/types/property";
import { getMediaUrl } from "@/lib/api/client";
import { useLanguage } from "@/context/LanguageContext";
import { FadeIn, StaggerContainer, StaggerItem, smoothEase } from "@/components/ui/MotionPrimitives";

interface InvestmentSectionProps {
  properties?: Property[];
}

// InvestmentSection showcases EstateVerse 3D presentation impact metrics with animated bars and listings.
export function InvestmentSection({ properties = [] }: InvestmentSectionProps) {
  const { lang, t } = useLanguage();
  const isEn = lang === "en";

  const displayListings = properties.length > 0 ? properties.slice(0, 3) : [];

  return (
    <section id="investments" className="py-14 sm:py-20 bg-white">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Section Heading Split */}
        <FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            <div className="lg:col-span-7">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950 leading-[1.15]">
                <span className="block">{t.investments.titleLine1}</span>
                <span className="block">{t.investments.titleLine2}</span>
              </h2>
            </div>

            <div className="lg:col-span-5 space-y-2">
              <p className="text-sm sm:text-[15px] text-neutral-600 leading-relaxed max-w-xl">
                {t.investments.desc1}
              </p>
              <p className="text-xs sm:text-[13px] text-neutral-400 leading-relaxed max-w-xl">
                {t.investments.desc2}
              </p>
            </div>
          </div>
        </FadeIn>

        {/* 3 Animated Metric Cards */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <StaggerItem className="p-6 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 space-y-3">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              {t.investments.metric1Title}
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight block">
              {t.investments.metric1Val}
            </span>
            <div className="flex items-end gap-1.5 h-10 pt-1">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h * 10}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: smoothEase }}
                  className="flex-1 bg-sage-600 rounded-2xs"
                />
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 pt-1 font-medium leading-relaxed">
              {t.investments.metric1Sub}
            </p>
          </StaggerItem>

          <StaggerItem className="p-6 rounded-2xl border border-sage-200 bg-sage-50/60 space-y-3">
            <span className="text-xs font-semibold text-sage-700 uppercase tracking-wider block">
              {t.investments.metric2Title}
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-sage-900 tracking-tight block">
              {t.investments.metric2Val}
            </span>
            <div className="flex items-end gap-1.5 h-10 pt-1">
              {[10, 10, 10, 10, 10, 10, 10, 10, 10].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h * 10}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: smoothEase }}
                  className="flex-1 bg-sage-600 rounded-2xs"
                />
              ))}
            </div>
            <p className="text-[11px] text-sage-800 pt-1 font-medium leading-relaxed">
              {t.investments.metric2Sub}
            </p>
          </StaggerItem>

          <StaggerItem className="p-6 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 space-y-3 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              {t.investments.metric3Title}
            </span>
            <span className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight block">
              {t.investments.metric3Val}
            </span>
            <div className="flex items-end gap-1.5 h-10 pt-1">
              {[10, 9, 8, 7, 6, 5, 4, 3, 2].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h * 10}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: smoothEase }}
                  className="flex-1 bg-neutral-800 rounded-2xs"
                />
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 pt-1 font-medium leading-relaxed">
              {t.investments.metric3Sub}
            </p>
          </StaggerItem>
        </StaggerContainer>

        {/* Featured 3D Architectural Properties from Database */}
        {displayListings.length > 0 && (
          <div className="space-y-6 pt-2">
            <FadeIn>
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">
                {t.investments.offersTitle}
              </h3>
            </FadeIn>

            <StaggerContainer className="space-y-5 sm:space-y-6">
              {displayListings.map((inv) => {
                const imgUrl = inv.images?.[0]?.file_path
                  ? getMediaUrl(inv.images[0].file_path)
                  : "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80";
                const pricePerM2 = Math.round(inv.price / Math.max(1, inv.building_area));
                return (
                  <StaggerItem
                    key={inv.id}
                    className="bg-white rounded-2xl border border-neutral-200/80 hover:border-sage-300 p-4 sm:p-6 shadow-2xs hover:shadow-md transition-all grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center"
                  >
                    <div className="md:col-span-5 lg:col-span-4 aspect-[16/11] rounded-xl overflow-hidden bg-neutral-100">
                      <img src={imgUrl} alt={inv.title} className="w-full h-full object-cover" />
                    </div>

                    <div className="md:col-span-7 lg:col-span-5 space-y-3">
                      <div>
                        <h4 className="font-bold text-base sm:text-lg text-neutral-950 leading-snug">{inv.title}</h4>
                        <p className="text-xs text-neutral-500">{inv.city}, {inv.province}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 font-medium">
                        <span className="inline-flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5 text-sage-600" />{inv.building_area} m²</span>
                        <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-sage-600" />{inv.floors} {t.investments.floors}</span>
                        <span className="inline-flex items-center gap-1"><Bed className="w-3.5 h-3.5 text-sage-600" />{inv.bedrooms} {t.investments.beds}</span>
                        <span className="inline-flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-sage-600" />{inv.bathrooms} {t.investments.baths}</span>
                      </div>

                      <p className="text-xs text-neutral-600 leading-relaxed font-normal line-clamp-2">{inv.description}</p>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <Link href={`/properties/${inv.slug}`}>
                          <button type="button" className="bg-sage-600 text-white hover:bg-sage-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
                            <Box className="w-3.5 h-3.5" />
                            <span>{t.investments.bookNow}</span>
                          </button>
                        </Link>
                        <a href={`https://wa.me/${inv.whatsapp_number}?text=${encodeURIComponent(`Halo, saya tertarik dengan brosur properti ${inv.title}.`)}`} target="_blank" rel="noreferrer">
                          <button type="button" className="border border-neutral-200 hover:border-sage-600 hover:text-sage-700 text-neutral-800 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer">
                            <span>{t.investments.downloadBrochure}</span>
                            <Download className="w-3 h-3 text-sage-600" />
                          </button>
                        </a>
                      </div>
                    </div>

                    <div className="md:col-span-12 lg:col-span-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-neutral-100 lg:pl-6 flex flex-wrap lg:flex-col justify-between gap-4 lg:space-y-3">
                      <div>
                        <span className="text-[11px] text-neutral-400 block font-medium">{t.investments.priceLabel}</span>
                        <span className="text-lg sm:text-xl font-extrabold text-neutral-950">Rp {inv.price.toLocaleString("id-ID")}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-neutral-400 block font-medium">{t.investments.pricePerM2Label}</span>
                        <span className="text-sm font-semibold text-neutral-700">Rp {pricePerM2.toLocaleString("id-ID")} / m²</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-neutral-400 block font-medium mb-1">{t.investments.modelStatusLabel}</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sage-800 bg-sage-50 border border-sage-200 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-sage-600" />
                          <span>{inv.model_3d_path ? (isEn ? "3D Tour Active" : "3D Tour Aktif") : (isEn ? "Photo Catalog" : "Katalog Foto")}</span>
                        </span>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        )}
      </div>
    </section>
  );
}
