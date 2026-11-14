"use client";

import React from "react";
import Link from "next/link";
import { Info, Smartphone, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// DashboardSettingsPage shows the seller's account details and where each setting is managed.
export default function DashboardSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-neutral-200/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">Akun Penjual</h1>
        <p className="text-sm text-neutral-700 mt-0.5">Informasi akun yang Anda pakai untuk memasang iklan di EstateVerse.</p>
      </div>

      <section aria-labelledby="account-title" className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4">
        <h2 id="account-title" className="flex items-center gap-2 text-base font-bold text-neutral-950">
          <User className="w-4 h-4 text-sage-600" aria-hidden="true" /> Data Akun
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-neutral-600">Nama</dt>
            <dd className="font-semibold text-neutral-950">{user?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-neutral-600">Email</dt>
            <dd className="font-semibold text-neutral-950">{user?.email ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="contact-title" className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-3">
        <h2 id="contact-title" className="flex items-center gap-2 text-base font-bold text-neutral-950">
          <Smartphone className="w-4 h-4 text-sage-600" aria-hidden="true" /> Nomor WhatsApp
        </h2>
        <p className="text-sm text-neutral-700">
          Nomor WhatsApp diatur di setiap iklan, sehingga Anda bisa memakai nomor berbeda untuk rumah yang berbeda.
          Pembeli menghubungi nomor tersebut secara langsung tanpa perantara.
        </p>
        <Link href="/dashboard/properties" className="inline-flex text-sm font-semibold text-sage-700 hover:underline">
          Kelola iklan dan nomor WhatsApp →
        </Link>
      </section>

      <p className="flex items-start gap-2 text-xs text-neutral-600">
        <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
        Perubahan nama atau email akun belum tersedia di versi MVP ini.
      </p>
    </div>
  );
}
