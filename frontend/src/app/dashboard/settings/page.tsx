"use client";

import React from "react";
import Link from "next/link";
import { Smartphone } from "lucide-react";
import { ProfileSection } from "@/components/dashboard/settings/ProfileSection";
import { PasswordSection } from "@/components/dashboard/settings/PasswordSection";
import { DeleteAccountSection } from "@/components/dashboard/settings/DeleteAccountSection";
import { SettingsSection } from "@/components/dashboard/settings/SettingsSection";

// DashboardSettingsPage lets the seller edit their name, change the password, or delete the account.
export default function DashboardSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-neutral-200/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">Akun Penjual</h1>
        <p className="text-sm text-neutral-700 mt-0.5">Atur akun yang Anda pakai untuk memasang iklan di EstateVerse.</p>
      </div>

      <ProfileSection />
      <PasswordSection />

      <SettingsSection
        id="contact-title"
        title="Nomor WhatsApp"
        icon={Smartphone}
        description="Nomor WhatsApp diatur di setiap iklan, sehingga Anda bisa memakai nomor berbeda untuk rumah yang berbeda. Pembeli menghubungi nomor tersebut secara langsung tanpa perantara."
      >
        <Link href="/dashboard/properties" className="inline-flex min-h-6 items-center text-sm font-semibold text-sage-700 hover:underline">
          Kelola iklan dan nomor WhatsApp →
        </Link>
      </SettingsSection>

      <DeleteAccountSection />
    </div>
  );
}
