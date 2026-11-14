"use client";

import React from "react";
import Link from "next/link";
import { Box, Cpu, FileText, Bot, ArrowRight, CheckCircle2 } from "lucide-react";

// DashboardHelpPage provides sellers with 3D model asset guidelines and background queue documentation.
export default function DashboardHelpPage() {
  const guides = [
    {
      icon: Box,
      title: "Format File 3D Rumah (.GLB)",
      desc: "Gunakan file 3D berformat .GLB dengan ukuran maksimal 150 MB agar tampilan rumah cepat dibuka di HP maupun komputer calon pembeli.",
    },
    {
      icon: Cpu,
      title: "Penyesuaian Otomatis yang Praktis",
      desc: "Saat Anda mengunggah file 3D, sistem kami akan otomatis merapikan ukuran dan posisi rumah agar langsung siap dijelajahi tanpa perlu pengaturan rumit.",
    },
    {
      icon: FileText,
      title: "Cara Agar Atap Rumah Bisa Dibuka",
      desc: "Agar pembeli bisa melihat denah bagian dalam rumah dari atas, beri nama bagian atap pada desain 3D Anda dengan kata 'Atap' atau 'Roof'.",
    },
    {
      icon: CheckCircle2,
      title: "Tips Agar Mudah Dihubungi Pembeli",
      desc: "Pastikan nomor WhatsApp Anda selalu aktif agar calon pembeli bisa langsung mengirim pesan atau membuat janji survei lokasi.",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="border-b border-neutral-200/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">
          Pusat Bantuan &amp; Panduan Penjual
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal mt-0.5">
          Panduan mudah mengunggah foto dan tampilan rumah 3D agar iklan Anda menarik lebih banyak pembeli.
        </p>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {guides.map((item) => {
          const IconComp = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white rounded-2xl border border-neutral-200/80 p-5 space-y-3 hover:border-neutral-400 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                <IconComp className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-neutral-950">{item.title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* AI Assistant Help Banner */}
      <div className="bg-neutral-950 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <Bot className="w-3.5 h-3.5" />
            <span>Asisten AI EstateVerse</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold">
            Butuh Bantuan Seputar Iklan atau Tampilan 3D?
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Asisten pintar kami siap menjawab pertanyaan seputar cara memasang iklan, perkiraan harga rumah, atau panduan jual beli.
          </p>
        </div>

        <Link href="/ai-consultant">
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-white text-neutral-950 hover:bg-neutral-100 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer shrink-0"
          >
            <span>Konsultasi dengan AI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </div>
  );
}
