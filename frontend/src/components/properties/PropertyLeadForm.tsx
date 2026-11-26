"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, Calendar } from "lucide-react";
import { submitBuyerInquiry } from "@/lib/api/leads";
import { hasViewedTour } from "@/lib/api/engagement";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Textarea } from "@/components/ui/Textarea";
import { formatWhatsAppDisplay, isValidSubscriber } from "@/lib/utils/whatsapp";

const PHONE_HINT = "Nomor WhatsApp belum lengkap. Ketik tanpa 0 di depan, contoh: 812 3456 7890.";

interface PropertyLeadFormProps {
  propertyId: number;
  propertyTitle: string;
}

// PropertyLeadForm lets buyers request a site visit, noting whether they already explored the virtual tour.
export function PropertyLeadForm({ propertyId, propertyTitle }: PropertyLeadFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // digits after the fixed +62 prefix
  const [phoneError, setPhoneError] = useState("");
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
    if (!name.trim() || !phone) {
      toast.error("Nama dan nomor WhatsApp wajib diisi.");
      return;
    }
    if (!isValidSubscriber(phone)) {
      setPhoneError(PHONE_HINT);
      return;
    }
    setIsSubmitting(true);
    try {
      await submitBuyerInquiry({
        property_id: propertyId,
        name: name.trim(),
        phone: `62${phone}`,
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
        <p className="text-xs text-neutral-700 leading-relaxed">
          Penjual akan menghubungi WhatsApp Anda di <span className="font-semibold whitespace-nowrap">{formatWhatsAppDisplay(`62${phone}`)}</span>.
        </p>
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
        <Input id="lead-name" label="Nama Lengkap" type="text" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Budi Santoso" />
        <PhoneInput
          id="lead-phone"
          label="Nomor WhatsApp"
          required
          autoComplete="tel-national"
          value={phone}
          onValueChange={(digits) => {
            setPhone(digits);
            if (phoneError) setPhoneError("");
          }}
          placeholder="812 3456 7890"
          error={phoneError}
        />
        <Textarea id="lead-note" label="Catatan Tambahan (Opsional)" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kapan waktu luang Anda untuk survei lokasi?" className="resize-none" />
        <Label htmlFor="lead-viewed-tour" className="items-start leading-snug font-normal text-muted-foreground">
          <Checkbox
            id="lead-viewed-tour"
            checked={viewedTour}
            onCheckedChange={(checked) => {
              setTourTouched(true);
              setViewedTour(checked);
            }}
            className="mt-0.5"
          />
          <span>Saya sudah melihat tur virtual rumah ini sebelum meminta survei.</span>
        </Label>
        <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          {!isSubmitting && <Send aria-hidden="true" />}
          <span>{isSubmitting ? "Mengirim..." : "Kirim Permintaan Survei"}</span>
        </Button>
      </form>
    </div>
  );
}
