"use client";

import React, { useEffect, useState } from "react";
import { Clapperboard, Download, Share2 } from "lucide-react";
import type { Property } from "@/types/property";
import { getOwnerTourRooms } from "@/lib/api/tours";
import { buildPromoInput } from "@/lib/promo/promoInput";
import { promoVideoSupported, renderPromoVideo } from "@/lib/promo/renderPromoVideo";
import { Button, buttonVariants } from "@/components/ui/Button";

type Phase = "idle" | "rendering" | "done" | "error";

// PromoVideoCard turns the listing's 360° rooms into a ready-to-share 9:16 promo video for WhatsApp Status, Reels, or TikTok.
export function PromoVideoCard({ property }: { property: Property }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [video, setVideo] = useState<{ file: File; url: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    promoVideoSupported().then(setSupported).catch(() => setSupported(false));
  }, []);
  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video.url);
  }, [video]);

  // Renders the video from the latest ready rooms and keeps it for preview, sharing, and download.
  const generate = async () => {
    setPhase("rendering");
    setProgress(0);
    setMessage("");
    try {
      const input = buildPromoInput(property, await getOwnerTourRooms(property.id), window.location.origin);
      if (input.rooms.length === 0) throw new Error("Rekam minimal satu ruangan 360° yang sudah selesai diproses.");
      const blob = await renderPromoVideo(input, setProgress);
      const file = new File([blob], `${property.slug}-promo.mp4`, { type: "video/mp4" });
      setVideo({ file, url: URL.createObjectURL(file) });
      setPhase("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Video gagal dibuat.");
      setPhase("error");
    }
  };

  // Opens the phone's share sheet (WhatsApp, Instagram, TikTok) with the video file attached.
  const share = async () => {
    if (!video) return;
    try {
      await navigator.share({ files: [video.file], title: property.title, text: `${property.title} — lihat tur 360° di EstateVerse` });
    } catch {
      // The seller closed the share sheet; nothing to report.
    }
  };

  const canShare = Boolean(video && typeof navigator !== "undefined" && navigator.canShare?.({ files: [video.file] }));

  return (
    <section aria-labelledby="promo-title" className="bg-white border border-sage-200 rounded-2xl p-5 shadow-2xs space-y-3">
      <div className="space-y-1 border-b border-neutral-100 pb-2.5">
        <h2 id="promo-title" className="flex items-center gap-2 text-sm font-bold text-neutral-950">
          <Clapperboard className="w-4 h-4 text-sage-600" aria-hidden="true" /> Video Promosi Otomatis
        </h2>
        <p className="text-xs text-neutral-700">
          Satu klik mengubah tur 360° menjadi video vertikal ±20 detik berisi harga, ukuran ruangan, dan tautan listing — siap
          dibagikan ke Status WhatsApp, Reels, atau TikTok. Diproses di HP/laptop Anda, tanpa biaya.
        </p>
      </div>
      {supported === false && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Browser ini belum bisa membuat video. Gunakan Chrome atau Safari versi terbaru.
        </p>
      )}
      <Button type="button" onClick={generate} isLoading={phase === "rendering"} disabled={!supported}>
        <Clapperboard aria-hidden="true" /> {video ? "Buat Ulang Video" : "Buat Video Promosi"}
      </Button>
      {phase === "rendering" && (
        <div role="status" aria-live="polite" className="space-y-1">
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div className="h-full bg-sage-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-xs text-neutral-600">Merender video {Math.round(progress * 100)}%… jangan tutup halaman ini.</p>
        </div>
      )}
      {phase === "error" && <p role="alert" className="text-xs text-rose-700">{message}</p>}
      {video && phase === "done" && (
        <div className="space-y-2">
          <video src={video.url} controls playsInline className="w-full max-w-[220px] aspect-[9/16] rounded-xl bg-black" aria-label="Pratinjau video promosi" />
          <div className="flex flex-wrap gap-2">
            {canShare && (
              <Button type="button" onClick={share}><Share2 aria-hidden="true" /> Bagikan</Button>
            )}
            <a href={video.url} download={video.file.name} className={buttonVariants({ variant: "outline" })}>
              <Download aria-hidden="true" /> Unduh MP4
            </a>
          </div>
          {property.status !== "published" && (
            <p className="text-xs text-amber-800">Listing masih draft. Publish dulu agar tautan di video bisa dibuka pembeli.</p>
          )}
        </div>
      )}
    </section>
  );
}
