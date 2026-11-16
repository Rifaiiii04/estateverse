"use client";

import React from "react";
import { Compass, ShieldCheck } from "lucide-react";
import type { Property } from "@/types/property";
import { formatIDR } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/Button";
import { WhatsAppButton } from "./WhatsAppButton";

interface PropertyPriceCardProps {
  property: Property;
  showTourButton: boolean;
  onOpenTour: () => void;
}

// PropertyPriceCard shows the asking price, a shortcut to the 360° tour, and the seller's direct WhatsApp contact.
export function PropertyPriceCard({ property, showTourButton, onOpenTour }: PropertyPriceCardProps) {
  const pricePerM2 = property.building_area > 0 ? Math.round(property.price / property.building_area) : 0;
  return (
    <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
      <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3.5">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">Harga Penawaran</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-sage-700 tracking-tight mt-0.5">{formatIDR(property.price)}</div>
          <span className="text-xs text-neutral-500 font-medium">Estimasi Rp {pricePerM2.toLocaleString("id-ID")} / m²</span>
        </div>
        {showTourButton && (
          <Button variant="secondary" className="shrink-0" onClick={onOpenTour}>
            <Compass aria-hidden="true" />
            <span>Buka Walk Inside 360°</span>
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-600 block">Dijual Langsung Oleh</span>
            <span className="text-sm font-bold text-neutral-950">{property.owner_name || "Pemilik rumah"}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sage-700 bg-sage-50 border border-sage-200 px-2 py-0.5 rounded-md">
            <ShieldCheck className="w-3 h-3 text-sage-600" aria-hidden="true" />
            <span>Tanpa perantara</span>
          </span>
        </div>
        <WhatsAppButton phone={property.whatsapp_number} propertyTitle={property.title} size="lg" className="w-full" />
      </div>
    </div>
  );
}
