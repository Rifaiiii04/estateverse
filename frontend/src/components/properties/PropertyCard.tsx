/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Box, Layers } from "lucide-react";
import { Property } from "@/types/property";
import { formatCompactIDR, formatIDR } from "@/lib/utils/formatters";
import { getMediaUrl } from "@/lib/api/client";
import { useLanguage } from "@/context/LanguageContext";
import { smoothEase } from "@/components/ui/MotionPrimitives";

interface PropertyCardProps {
  property: Property;
  showStatus?: boolean;
}

// Formats property_type into a readable label in the active language.
function getTypeLabel(type: string, isEn: boolean): string {
  const key = (type || "house").toLowerCase();
  if (key === "villa") return "Villa";
  if (key === "apartment") return isEn ? "Apartment" : "Apartemen";
  if (key === "commercial") return isEn ? "Commercial" : "Komersial";
  if (key === "land") return isEn ? "Land" : "Kavling";
  return isEn ? "Modern House" : "Rumah Modern";
}

// PropertyCard renders a compact animated architectural property listing card with hover elevation.
export function PropertyCard({ property }: PropertyCardProps) {
  const { lang } = useLanguage();
  const isEn = lang === "en";

  const primaryImage =
    property.images && property.images.length > 0
      ? getMediaUrl(property.images[0].file_path)
      : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80";

  const has3D = Boolean(property.model_3d_path);
  const typeLabel = getTypeLabel(property.property_type, isEn);

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
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Top-Left Status / 3D Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
          {has3D ? (
            <span className="h-5 px-2 rounded-full text-[10px] font-bold bg-sage-600/95 backdrop-blur-xs text-white shadow-2xs inline-flex items-center gap-1">
              <Box className="w-2.5 h-2.5 text-sage-100" />
              <span>{isEn ? "3D Interactive" : "Tur 3D"}</span>
            </span>
          ) : (
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
                has3D ? "bg-sage-600" : "bg-neutral-400"
              }`}
            />
            <span className="truncate font-semibold text-neutral-800">{property.city}</span>
            <span className="text-neutral-300">|</span>
            <span className="truncate text-neutral-500">
              {has3D
                ? isEn
                  ? "3D Tour"
                  : "Tur 3D"
                : isEn
                ? "Photos"
                : "Foto"}
            </span>
          </div>

          <Link
            href={`/properties/${property.slug}`}
            className="text-sage-600 group-hover:text-sage-800 font-bold shrink-0 inline-flex items-center gap-0.5 transition-colors text-[11px]"
          >
            <span>{has3D ? (isEn ? "Explore 3D" : "Buka 3D") : isEn ? "Details" : "Detail"}</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
