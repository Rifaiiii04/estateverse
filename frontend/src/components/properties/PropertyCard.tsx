/* eslint-disable @next/next/no-img-element */
"use client";

import { NO_PHOTO_PLACEHOLDER, showPlaceholderOnError, virtualTourKind } from "@/lib/utils/media";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Box, Layers, Orbit } from "lucide-react";
import { Property } from "@/types/property";
import { formatCompactIDR, formatIDR } from "@/lib/utils/formatters";
import { getMediaUrl } from "@/lib/api/client";
import { useLanguage } from "@/context/LanguageContext";
import { smoothEase } from "@/components/ui/MotionPrimitives";
import { propertyTypeLabel } from "@/lib/utils/propertyType";

interface PropertyCardProps {
  property: Property;
  showStatus?: boolean;
}

// PropertyCard renders a compact animated architectural property listing card with hover elevation.
export function PropertyCard({ property }: PropertyCardProps) {
  const { lang } = useLanguage();
  const isEn = lang === "en";

  const primaryImage =
    property.images && property.images.length > 0
      ? getMediaUrl(property.images[0].file_path)
      : NO_PHOTO_PLACEHOLDER;

  const tourKind = virtualTourKind(property);
  const hasTour = tourKind !== "none";
  const typeLabel = propertyTypeLabel(property.property_type, isEn);
  const mediaLabel = { tour360: isEn ? "360° tour" : "Tur 360°", model3d: isEn ? "3D model" : "Model 3D", none: isEn ? "Photos" : "Foto" }[tourKind];

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, ease: smoothEase }}
      className="group flex flex-col bg-white rounded-xl border border-neutral-200 hover:border-sage-400/80 shadow-2xs hover:shadow-md transition-colors duration-300 overflow-hidden"
    >
      {/* Edge-to-Edge Top Image with Compact Pill Overlays */}
      <Link
        href={`/properties/${property.slug}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-neutral-100 border-b border-neutral-100"
      >
        <img
          src={primaryImage}
          alt={property.title}
          onError={showPlaceholderOnError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Top-Left Status / 3D Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
          {tourKind === "tour360" && (
            <span className="h-5 px-2 rounded-full text-[10px] font-bold bg-sage-600/95 backdrop-blur-xs text-white shadow-2xs inline-flex items-center gap-1">
              <Orbit className="w-2.5 h-2.5 text-sage-100" aria-hidden="true" />
              <span>Walk Inside 360°</span>
            </span>
          )}
          {tourKind === "model3d" && (
            <span className="h-5 px-2 rounded-full text-[10px] font-bold bg-neutral-900/85 backdrop-blur-xs text-white shadow-2xs inline-flex items-center gap-1">
              <Box className="w-2.5 h-2.5 text-sage-100" aria-hidden="true" />
              <span>{isEn ? "3D Model" : "Model 3D"}</span>
            </span>
          )}
          {tourKind === "none" && (
            <span className="h-5 px-2 rounded-full text-[10px] font-semibold bg-neutral-900/80 backdrop-blur-xs text-white shadow-2xs inline-flex items-center">
              {typeLabel}
            </span>
          )}
        </div>

        {/* Top-Right Architectural Metric Pill */}
        <div className="absolute top-2.5 right-2.5">
          <span className="h-5 px-2 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-xs text-neutral-900 shadow-2xs inline-flex items-center gap-0.5">
            <Layers className="w-2.5 h-2.5 text-sage-600" />
            <span>
              {property.floors || 1} {isEn ? "Fl" : "Lt"}
            </span>
          </span>
        </div>
      </Link>

      {/* Card Content Body */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Row 1: Property Title & Compact Sage Price */}
          <div className="flex items-baseline justify-between gap-2">
            <Link href={`/properties/${property.slug}`} className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-[15px] text-neutral-950 group-hover:text-sage-700 transition-colors truncate leading-tight">
                {property.title}
              </h3>
            </Link>
            <span
              title={formatIDR(property.price)}
              className="font-extrabold text-sm sm:text-[15px] text-sage-600 shrink-0 tracking-tight leading-tight"
            >
              {formatCompactIDR(property.price, isEn)}
            </span>
          </div>

          {/* Row 2: Dot-Separated Architectural Specs */}
          <p className="text-[11px] sm:text-xs text-neutral-500 font-medium mt-1 truncate">
            {typeLabel} &middot; {property.bedrooms} {isEn ? "bd" : "KT"} &middot;{" "}
            {property.bathrooms} {isEn ? "ba" : "KM"} &middot; LB {property.building_area} m² &middot; LT{" "}
            {property.land_area} m²
          </p>
        </div>

        {/* Row 3: Footer Status Bar & Action Link */}
        <div className="mt-2.5 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0 text-neutral-600 font-medium truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                hasTour ? "bg-sage-600" : "bg-neutral-400"
              }`}
            />
            <span className="truncate font-semibold text-neutral-800">{property.city}</span>
            <span className="text-neutral-300">|</span>
            <span className="truncate text-neutral-500">{mediaLabel}</span>
          </div>

          <Link
            href={`/properties/${property.slug}`}
            className="text-sage-600 group-hover:text-sage-800 font-bold shrink-0 inline-flex min-h-6 items-center gap-0.5 px-1.5 -mr-1.5 transition-colors text-[11px]"
          >
            <span>{hasTour ? (isEn ? "Open Tour" : "Buka Tur") : isEn ? "Details" : "Detail"}</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
