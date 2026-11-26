/* eslint-disable @next/next/no-img-element */
"use client";

import { NO_PHOTO_PLACEHOLDER, showPlaceholderOnError, virtualTourKind } from "@/lib/utils/media";
import React from "react";
import Link from "next/link";
import { Box } from "lucide-react";
import { Property } from "@/types/property";
import { formatCompactIDR, formatIDR } from "@/lib/utils/formatters";
import { getMediaUrl } from "@/lib/api/client";
import { useLanguage } from "@/context/LanguageContext";

interface PropertyTableViewProps {
  properties: Property[];
}

// PropertyTableView renders a responsive tabular view of properties with sticky headers and internal scrolling.
export function PropertyTableView({ properties }: PropertyTableViewProps) {
  const { lang } = useLanguage();
  const isEn = lang === "en";

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden flex flex-col">
      {/* Scrollable table container: only table rows scroll while the page remains fixed */}
      <div className="overflow-x-auto max-h-[540px] sm:max-h-[580px] overflow-y-auto pr-0.5">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-neutral-50/95 backdrop-blur-xs border-b border-neutral-200/80 shadow-2xs">
            <tr className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              <th className="py-3 px-4 sm:px-6">{isEn ? "Property" : "Properti"}</th>
              <th className="py-3 px-4 hidden md:table-cell">{isEn ? "Location" : "Lokasi"}</th>
              <th className="py-3 px-4 hidden sm:table-cell">{isEn ? "Specs" : "Spesifikasi"}</th>
              <th className="py-3 px-4">{isEn ? "Virtual Tour" : "Tur Virtual"}</th>
              <th className="py-3 px-4 text-right">{isEn ? "Price" : "Harga"}</th>
              <th className="py-3 px-4 sm:px-6 text-right">{isEn ? "Action" : "Aksi"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-xs sm:text-sm">
            {properties.map((item) => {
              const thumb =
                item.images && item.images.length > 0
                  ? getMediaUrl(item.images[0].file_path)
                  : NO_PHOTO_PLACEHOLDER;
              const tourKind = virtualTourKind(item);
              const has3D = tourKind !== "none";

              return (
                <tr key={item.id} className="hover:bg-sage-50/40 transition-colors group">
                  <td className="py-3 px-4 sm:px-6">
                    <Link href={`/properties/${item.slug}`} className="flex items-center gap-3">
                      <img
                        src={thumb}
                        alt={item.title}
                        onError={showPlaceholderOnError}
                        className="w-14 h-10 rounded-lg object-cover bg-neutral-100 shrink-0 border border-neutral-200/60"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-950 group-hover:text-sage-700 truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-neutral-500 md:hidden truncate">
                          {item.city}, {item.province}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 hidden md:table-cell">
                    {item.city}, {item.province}
                  </td>
                  <td className="py-3 px-4 text-neutral-500 hidden sm:table-cell whitespace-nowrap">
                    {item.bedrooms} {isEn ? "bd" : "KT"} &middot; {item.bathrooms} {isEn ? "ba" : "KM"} &middot; LB{" "}
                    {item.building_area} m²
                  </td>
                  <td className="py-3 px-4">
                    {has3D ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sage-50 text-sage-700 border border-sage-200">
                        <Box className="w-3 h-3 text-sage-600" />
                        <span>{tourKind === "tour360" ? (isEn ? "360° tour" : "Tur 360°") : isEn ? "3D model" : "Model 3D"}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-500">
                        2D Photo
                      </span>
                    )}
                  </td>
                  <td
                    title={formatIDR(item.price)}
                    className="py-3 px-4 text-right font-extrabold text-sage-600 whitespace-nowrap"
                  >
                    {formatCompactIDR(item.price, isEn)}
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap">
                    <Link
                      href={`/properties/${item.slug}`}
                      className="inline-flex min-h-6 items-center text-xs font-bold text-sage-600 hover:text-sage-800"
                    >
                      {has3D ? (isEn ? "Open Tour →" : "Buka Tur →") : isEn ? "View →" : "Detail →"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table status footer */}
      <div className="px-4 sm:px-6 py-2.5 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
        <span>{isEn ? `Showing ${properties.length} listings` : `Menampilkan ${properties.length} properti`}</span>
        <span>{isEn ? "Scroll inside table to view more" : "Scroll di dalam tabel untuk melihat lebih banyak"}</span>
      </div>
    </div>
  );
}
