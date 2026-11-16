import type { Property } from "@/types/property";
import type { TourRoom } from "@/types/tour";
import { getMediaUrl } from "@/lib/api/client";
import { formatIDR } from "@/lib/utils/formatters";
import { formatArea, formatMeters, summarizeRoom } from "@/lib/measure/roomGeometry";
import type { PromoInput } from "./renderPromoVideo";

// buildPromoInput turns a listing and its ready 360° rooms into the texts and panoramas the promo video needs.
export function buildPromoInput(property: Property, rooms: TourRoom[], origin: string): PromoInput {
  const ready = rooms.filter((r) => r.status === "ready" && r.panorama_path);
  return {
    listing: {
      title: property.title,
      priceText: formatIDR(property.price),
      locationText: [property.city, property.province].filter(Boolean).join(", "),
      specsText: `LT ${property.land_area} m² · LB ${property.building_area} m² · ${property.bedrooms} KT · ${property.bathrooms} KM`,
      linkText: `${origin.replace(/^https?:\/\//, "")}/properties/${property.slug}`,
      verifiedRooms: ready.filter((r) => r.location_check === "verified").length,
    },
    rooms: ready.map((room) => ({
      panoramaUrl: getMediaUrl(room.panorama_path),
      caption: { name: room.name, sizeText: roomSizeText(room), note: room.note ?? "" },
    })),
  };
}

// roomSizeText describes a measured room, e.g. "±12,4 m² · 3,00 × 4,10 m", or null when not measured.
function roomSizeText(room: TourRoom): string | null {
  const summary = summarizeRoom(room.floor_outline ?? [], room.camera_height_cm);
  if (!summary) return null;
  const sides = summary.sides ? ` · ${formatMeters(summary.sides[0])} × ${formatMeters(summary.sides[1])}` : "";
  return `±${formatArea(summary.areaM2)}${sides}`;
}
