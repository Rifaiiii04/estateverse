"use client";

import React, { useState } from "react";
import { Flag, ShieldAlert } from "lucide-react";
import { reportListing, ReportReason } from "@/lib/api/engagement";

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
        <button type="button" onClick={() => setIsOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:underline cursor-pointer min-h-6">
          <Flag className="w-3.5 h-3.5" aria-hidden="true" /> Laporkan iklan ini
        </button>
      ) : (
        <div className="space-y-2">
          <label htmlFor="report-reason" className="block text-xs font-semibold text-neutral-800">Alasan</label>
          <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} className="w-full h-10 px-3 rounded-xl border border-neutral-300 text-sm bg-white">
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <label htmlFor="report-note" className="block text-xs font-semibold text-neutral-800">Keterangan (opsional)</label>
          <textarea id="report-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-sm bg-white resize-none" />
          {status === "error" && <p role="alert" className="text-xs text-rose-700">Laporan gagal dikirim. Coba lagi.</p>}
          <button type="button" onClick={submit} disabled={status === "sending"} className="h-10 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-60">
            {status === "sending" ? "Mengirim…" : "Kirim Laporan"}
          </button>
        </div>
      )}
    </section>
  );
}
