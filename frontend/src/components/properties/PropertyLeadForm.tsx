"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, Calendar } from "lucide-react";
import { submitBuyerInquiry } from "@/lib/api/leads";
import { useToast } from "@/context/ToastContext";

interface PropertyLeadFormProps {
  propertyId: number;
  propertyTitle: string;
}

// PropertyLeadForm captures buyer inquiries and scheduled visits, storing them directly in the database.
export function PropertyLeadForm({ propertyId, propertyTitle }: PropertyLeadFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Submits the buyer lead payload to the backend database API.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Nama dan nomor kontak WhatsApp wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBuyerInquiry({
        property_id: propertyId,
        name: name.trim(),
        phone: phone.trim(),
        note: note.trim() || `Tertarik dengan jadwal visit 3D untuk properti ${propertyTitle}.`,
      });
      setIsSent(true);
      toast.success("Permintaan visit & konsultasi Anda berhasil dikirim ke pemilik properti.");
    } catch {
      toast.error("Gagal mengirim permintaan. Silakan hubungi via WhatsApp langsung.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="bg-sage-50/70 p-6 rounded-2xl border border-sage-200 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-neutral-950">Permintaan Terkirim!</h4>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Pemilik properti atau konsultan kami akan segera menghubungi nomor WhatsApp Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/90 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-sage-600" />
        <h4 className="text-sm font-bold text-neutral-950">Janji Survei Lokasi / Tanya Detail</h4>
      </div>
      <p className="text-xs text-neutral-600 leading-relaxed">
        Ingin datang melihat langsung ke lokasi atau bertanya lebih lanjut ke pemilik rumah?
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        <div>
          <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
            Nama Lengkap
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-sage-600 bg-neutral-50/50"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
            Nomor WhatsApp
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0812xxxxxxxx"
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-sage-600 bg-neutral-50/50"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
            Catatan Tambahan (Opsional)
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kapan waktu luang Anda untuk survei lokasi?"
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-sage-600 bg-neutral-50/50 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-50 text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSubmitting ? "Mengirim Data..." : "Kirim Jadwal Visit"}</span>
        </button>
      </form>
    </div>
  );
}
