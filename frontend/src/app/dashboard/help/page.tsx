"use client";

import React from "react";
import Link from "next/link";
import { Box, Cpu, FileText, Bot, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
              <div className="w-10 h-10 rounded-xl bg-sage-600 text-white flex items-center justify-center" aria-hidden="true">
                <IconComp className="w-5 h-5" />
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
      <div className="bg-sage-50 border border-sage-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4 max-w-xl">
          <div className="w-11 h-11 rounded-xl bg-sage-600 text-white flex items-center justify-center shrink-0" aria-hidden="true">
            <Bot className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-sage-700">Asisten AI EstateVerse</span>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-950">
              Butuh Bantuan Seputar Iklan atau Tampilan 3D?
            </h2>
            <p className="text-xs text-neutral-700 leading-relaxed">
              Asisten pintar kami siap menjawab pertanyaan seputar cara memasang iklan, perkiraan harga rumah, atau panduan jual beli.
            </p>
          </div>
        </div>

        <Button size="lg" className="shrink-0 w-full sm:w-auto" render={<Link href="/ai-consultant" />}>
          <span>Konsultasi dengan AI</span>
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
