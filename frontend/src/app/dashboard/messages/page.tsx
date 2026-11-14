"use client";

import React, { useState } from "react";
import { MessageSquare, Copy, ExternalLink, Check, Sparkles } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface Template {
  id: string;
  title: string;
  category: string;
  body: string;
}

const templates: Template[] = [
  {
    id: "tpl-1",
    title: "Kirim Tautan Walk Inside 360°",
    category: "Tur Virtual",
    body: "Halo Bapak/Ibu [Nama Pembeli], terima kasih sudah tertarik dengan [Nama Properti]. Sebelum survei, silakan lihat dulu isi rumahnya lewat Walk Inside 360° di tautan ini: [Link Properti]. Kalau ada ruangan yang ingin ditanyakan, kabari saya ya.",
  },
  {
    id: "tpl-2",
    title: "Atur Jadwal Survei",
    category: "Jadwal Kunjungan",
    body: "Halo Bapak/Ibu [Nama Pembeli], kapan waktu yang cocok untuk survei ke [Nama Properti]? Saya bisa menemani pada [Hari/Jam]. Alamat lengkap: [Alamat].",
  },
  {
    id: "tpl-3",
    title: "Rincian Rumah & Harga",
    category: "Informasi Detail",
    body: "Halo Bapak/Ibu [Nama Pembeli], rincian [Nama Properti]: luas tanah [LT] m², luas bangunan [LB] m², [Jumlah] kamar tidur, sertifikat [SHM/HGB]. Harga [Harga], masih bisa dibicarakan. Pembayaran bisa tunai atau KPR lewat bank pilihan Anda.",
  },
  {
    id: "tpl-4",
    title: "Kesiapan Dokumen",
    category: "Legalitas",
    body: "Halo Bapak/Ibu [Nama Pembeli], dokumen [Nama Properti] yang sudah siap: [SHM/HGB], PBB tahun terakhir, dan [IMB/PBG]. Proses AJB bisa dilakukan di notaris/PPAT yang kita sepakati bersama.",
  },
];

// DashboardMessagesPage provides WhatsApp fast-reply templates and buyer communication tools.
export default function DashboardMessagesPage() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTemplate = (tpl: Template) => {
    navigator.clipboard.writeText(tpl.body);
    setCopiedId(tpl.id);
    toast.success(`Template "${tpl.title}" berhasil disalin.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">
            Pusat Pesan &amp; Template WhatsApp
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal mt-0.5">
            Gunakan template respon cepat untuk menindaklanjuti calon pembeli secara profesional.
          </p>
        </div>

        <a
          href="https://web.whatsapp.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-neutral-950 text-white hover:bg-neutral-800 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>Buka WhatsApp Web</span>
          <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
        </a>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white rounded-2xl border border-neutral-200/80 p-5 space-y-4 hover:border-neutral-400 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {tpl.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Siap Pakai</span>
                </span>
              </div>
              <h3 className="text-sm font-bold text-neutral-950">{tpl.title}</h3>
              <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100 leading-relaxed font-normal">
                {tpl.body}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => copyTemplate(tpl)}
                className="w-full inline-flex items-center justify-center gap-2 border border-neutral-200 hover:border-neutral-950 text-neutral-800 text-xs font-semibold px-4 py-2 rounded-xl transition-all hover:bg-neutral-50 cursor-pointer"
              >
                {copiedId === tpl.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-500" />
                    <span>Salin Pesan Template</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
