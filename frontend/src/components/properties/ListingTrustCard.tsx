"use client";

import React from "react";
import { AlertTriangle, BadgeCheck, CircleDashed, Fingerprint } from "lucide-react";
import type { Property } from "@/types/property";
import type { TourRoom } from "@/types/tour";
import { summarizeTourOrigin, TONE_TEXT_CLASS, TrustTone } from "@/lib/trust/originLabels";

interface TrustSignal {
  tone: TrustTone;
  title: string;
  detail: string;
}

const TONE_ICON: Record<TrustTone, typeof BadgeCheck> = {
  good: BadgeCheck,
  warn: AlertTriangle,
  neutral: CircleDashed,
};

// ListingTrustCard lists automatic authenticity checks so buyers can spot fake listings before paying anything.
export function ListingTrustCard({ property, rooms }: { property: Property; rooms: TourRoom[] }) {
  const signals = [tourSignal(rooms), photoSignal(property), pinSignal(property)].filter((s): s is TrustSignal => s !== null);
  return (
    <section aria-labelledby="trust-title" className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-3">
      <h3 id="trust-title" className="flex items-center gap-2 text-sm font-bold text-neutral-950">
        <Fingerprint className="w-4 h-4 text-sage-600" aria-hidden="true" /> Cek Keaslian Iklan
      </h3>
      <ul className="space-y-2.5">
        {signals.map((s) => {
          const Icon = TONE_ICON[s.tone];
          return (
            <li key={s.title} className="flex items-start gap-2">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${TONE_TEXT_CLASS[s.tone]}`} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-neutral-900">{s.title}</p>
                <p className="text-xs text-neutral-600">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-neutral-500 border-t border-neutral-100 pt-2">
        Pemeriksaan otomatis, bukan jaminan. Tetap survei langsung dan cek sertifikat di BPN sebelum membayar apa pun.
      </p>
    </section>
  );
}

// tourSignal reports how many 360° rooms were recorded live at the listing's map pin.
function tourSignal(rooms: TourRoom[]): TrustSignal | null {
  if (rooms.length === 0) return null;
  const origin = summarizeTourOrigin(rooms);
  if (origin.far > 0) {
    return { tone: "warn", title: "Lokasi rekaman tidak cocok", detail: `${origin.far} ruangan direkam jauh dari titik lokasi rumah di peta.` };
  }
  if (origin.verified > 0) {
    const date = origin.latestVerifiedAt ? new Date(origin.latestVerifiedAt).toLocaleDateString("id-ID", { dateStyle: "long" }) : "";
    return { tone: "good", title: "Tur 360° direkam langsung di lokasi", detail: `${origin.verified} dari ${origin.total} ruangan direkam di rumah ini${date ? `, terakhir ${date}` : ""}.` };
  }
  return { tone: "neutral", title: "Belum ada bukti rekam di lokasi", detail: "Tur diunggah tanpa data lokasi rekaman. Pastikan saat survei." };
}

// photoSignal warns when listing photos match photos another seller uploaded earlier.
function photoSignal(property: Property): TrustSignal | null {
  if (!property.images?.length) return null;
  const borrowed = property.borrowed_photo_count ?? 0;
  if (borrowed > 0) {
    return { tone: "warn", title: `${borrowed} foto mirip iklan penjual lain`, detail: "Foto yang sama sudah lebih dulu diunggah penjual lain. Waspadai iklan tiruan." };
  }
  return { tone: "good", title: "Foto tidak ditemukan di iklan lain", detail: "Tidak ada foto yang sama dengan unggahan penjual lain sebelumnya." };
}

// pinSignal tells whether the seller marked the house on the map.
function pinSignal(property: Property): TrustSignal {
  return property.latitude != null
    ? { tone: "good", title: "Lokasi rumah ditandai di peta", detail: "Penjual memasang titik lokasi untuk dicocokkan dengan rekaman tur." }
    : { tone: "neutral", title: "Lokasi rumah belum ditandai", detail: "Tanyakan alamat lengkap dan titik lokasi kepada penjual." };
}
