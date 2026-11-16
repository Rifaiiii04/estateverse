"use client";

import React, { useState } from "react";
import { Flag, ShieldAlert } from "lucide-react";
import { reportListing, ReportReason } from "@/lib/api/engagement";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Textarea } from "@/components/ui/Textarea";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "scam", label: "Dugaan penipuan (minta transfer dulu, dll.)" },
  { value: "wrong_info", label: "Data rumah tidak sesuai" },
  { value: "sold", label: "Rumah sudah terjual" },
  { value: "other", label: "Lainnya" },
];

// SafetyNotice gives buyers anti-scam guidance and lets them report a suspicious listing.
export function SafetyNotice({ propertyId }: { propertyId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("scam");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Sends the report to the platform for review.
  const submit = async () => {
    setStatus("sending");
    try {
      await reportListing(propertyId, reason, note.trim());
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section aria-labelledby="safety-title" className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 space-y-3">
      <h4 id="safety-title" className="flex items-center gap-2 text-sm font-bold text-neutral-950">
        <ShieldAlert className="w-4 h-4 text-amber-700" aria-hidden="true" /> Tips aman bertransaksi
      </h4>
      <ul className="list-disc list-inside space-y-1 text-xs text-neutral-800">
        <li>Jangan transfer uang (DP, booking, &quot;tanda jadi&quot;) sebelum survei langsung dan bertemu pemilik.</li>
        <li>Cek keaslian sertifikat di kantor BPN atau lewat notaris/PPAT pilihan Anda.</li>
        <li>Waspadai harga jauh di bawah pasaran atau permintaan bayar di luar kesepakatan.</li>
      </ul>

      {status === "sent" ? (
        <p role="status" className="text-xs font-semibold text-sage-800">Terima kasih, laporan Anda sudah kami terima.</p>
      ) : !isOpen ? (
        <Button variant="link" size="sm" className="px-0 text-amber-800" onClick={() => setIsOpen(true)}>
          <Flag aria-hidden="true" /> Laporkan iklan ini
        </Button>
      ) : (
        <div className="space-y-3">
          <CustomSelect
            label="Alasan"
            options={REASONS}
            value={reason}
            onChange={(value) => setReason(value as ReportReason)}
            className="[&_[data-slot=select-trigger]]:bg-background"
          />
          <Textarea
            id="report-note"
            label="Keterangan (opsional)"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none bg-background"
          />
          {status === "error" && <p role="alert" className="text-sm text-destructive">Laporan gagal dikirim. Coba lagi.</p>}
          <Button onClick={submit} isLoading={status === "sending"} className="bg-amber-700 text-white hover:bg-amber-800">
            {status === "sending" ? "Mengirim…" : "Kirim Laporan"}
          </Button>
        </div>
      )}
    </section>
  );
}
