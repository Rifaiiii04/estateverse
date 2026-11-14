"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, Calendar } from "lucide-react";
import { submitBuyerInquiry } from "@/lib/api/leads";
import { hasViewedTour } from "@/lib/api/engagement";
import { useToast } from "@/context/ToastContext";

interface PropertyLeadFormProps {
  propertyId: number;
  propertyTitle: string;
}

const fieldClass =
  "w-full text-sm px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-sage-600 focus:ring-2 focus:ring-sage-600/20 bg-white";

// PropertyLeadForm lets buyers request a site visit, noting whether they already explored the virtual tour.
export function PropertyLeadForm({ propertyId, propertyTitle }: PropertyLeadFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [viewedTour, setViewedTour] = useState(false);
  const [tourTouched, setTourTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Pre-ticks "already viewed the tour" when the buyer opened it in this session, unless they changed it.
  const syncTourFlag = () => {
    if (!tourTouched && hasViewedTour(propertyId)) setViewedTour(true);
  };

  // Submits the buyer inquiry to the seller.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Nama dan nomor WhatsApp wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitBuyerInquiry({
        property_id: propertyId,
        name: name.trim(),
        phone: phone.trim(),
        note: note.trim() || `Ingin survei lokasi untuk properti ${propertyTitle}.`,
        viewed_tour: viewedTour,
      });
      setIsSent(true);
      toast.success("Permintaan survei Anda sudah dikirim ke penjual.");
    } catch {
      toast.error("Gagal mengirim permintaan. Silakan hubungi penjual lewat WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div role="status" className="bg-sage-50/70 p-6 rounded-2xl border border-sage-200 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
        </div>
        <h4 className="text-sm font-bold text-neutral-950">Permintaan Terkirim!</h4>
        <p className="text-xs text-neutral-700 leading-relaxed">Penjual akan menghubungi nomor WhatsApp Anda.</p>
        <p className="text-xs text-amber-800 leading-relaxed">Ingat: jangan transfer uang apa pun sebelum survei langsung dan cek sertifikat.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/90 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-sage-600" aria-hidden="true" />
        <h4 className="text-sm font-bold text-neutral-950">Janji Survei Lokasi / Tanya Detail</h4>
      </div>
      <p className="text-xs text-neutral-700 leading-relaxed">
        Sudah cocok setelah melihat tur virtual? Minta jadwal survei langsung ke penjual.
      </p>

      <form onSubmit={handleSubmit} onFocusCapture={syncTourFlag} className="space-y-3 pt-1">
        <div>
          <label htmlFor="lead-name" className="text-xs font-semibold text-neutral-700 block mb-1">Nama Lengkap</label>
          <input id="lead-name" type="text" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Budi Santoso" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="lead-phone" className="text-xs font-semibold text-neutral-700 block mb-1">Nomor WhatsApp</label>
          <input id="lead-phone" type="tel" required maxLength={30} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812xxxxxxxx" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="lead-note" className="text-xs font-semibold text-neutral-700 block mb-1">Catatan Tambahan (Opsional)</label>
          <textarea id="lead-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kapan waktu luang Anda untuk survei lokasi?" className={`${fieldClass} resize-none`} />
        </div>
        <label htmlFor="lead-viewed-tour" className="flex items-start gap-2 text-xs text-neutral-700 cursor-pointer">
          <input
            id="lead-viewed-tour"
            type="checkbox"
            checked={viewedTour}
            onChange={(e) => {
              setTourTouched(true);
              setViewedTour(e.target.checked);
            }}
            className="mt-0.5 w-4 h-4 accent-sage-600"
          />
          <span>Saya sudah melihat tur virtual rumah ini sebelum meminta survei.</span>
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50 text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600/40"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span>{isSubmitting ? "Mengirim..." : "Kirim Permintaan Survei"}</span>
        </button>
      </form>
    </div>
  );
}
