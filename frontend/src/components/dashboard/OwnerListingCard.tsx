/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import { Box, Edit3, ExternalLink, Layers, Trash2 } from "lucide-react";
import type { Property } from "@/types/property";
import { getMediaUrl } from "@/lib/api/client";
import { formatCompactIDR } from "@/lib/utils/formatters";
import { NO_PHOTO_PLACEHOLDER, showPlaceholderOnError } from "@/lib/utils/media";
import { propertyTypeLabel } from "@/lib/utils/propertyType";
import { Button } from "@/components/ui/Button";
import { StaggerItem } from "@/components/ui/MotionPrimitives";

interface OwnerListingCardProps {
  item: Property;
  onDelete: (id: number, title: string) => void;
}

// OwnerListingCard shows one of the seller's listings with status badges and view, edit, and delete actions.
export function OwnerListingCard({ item, onDelete }: OwnerListingCardProps) {
  const img = item.images && item.images.length > 0 ? getMediaUrl(item.images[0].file_path) : NO_PHOTO_PLACEHOLDER;
  return (
    <StaggerItem
      className="bg-white rounded-2xl border border-neutral-200/80 hover:border-sage-300 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col hover:-translate-y-1 duration-300"
    >
      <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
        <img src={img} alt={item.title} onError={showPlaceholderOnError} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white ${
              item.status === "published" ? "bg-sage-600/95" : "bg-neutral-800/90"
            }`}
          >
            {item.status === "published" ? "Active" : "Draft"}
          </span>
          {item.model_3d_path && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-950/85 text-white inline-flex items-center gap-1">
              <Box className="w-3 h-3 text-sage-300" />
              <span>3D</span>
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/95 text-neutral-900 inline-flex items-center gap-1">
            <Layers className="w-3 h-3 text-sage-600" />
            <span>{item.floors || 1} Lt</span>
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-neutral-950 truncate">{item.title}</h3>
            <span className="text-sm font-extrabold text-sage-600 shrink-0">
              {formatCompactIDR(item.price)}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 truncate">
            {propertyTypeLabel(item.property_type)} &middot; {item.bedrooms} KT &middot; {item.bathrooms} KM &middot; LB{" "}
            {item.building_area} m²
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-medium truncate">{item.city}</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Lihat halaman publik"
              render={<Link href={`/properties/${item.slug}`} target="_blank" title="Lihat halaman publik" />}
            >
              <ExternalLink />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Edit listing"
              render={<Link href={`/dashboard/properties/${item.id}/edit`} title="Edit listing" />}
            >
              <Edit3 />
            </Button>
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={() => onDelete(item.id, item.title)}
              aria-label="Hapus listing"
              title="Hapus listing"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>
    </StaggerItem>
  );
}
