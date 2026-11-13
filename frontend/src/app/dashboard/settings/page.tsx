"use client";

import React, { useState } from "react";
import { User, Phone, Mail, Building, Bell, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

// DashboardSettingsPage provides account profile management and WhatsApp inquiry channel configuration.
export default function DashboardSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [agencyName, setAgencyName] = useState("Horizon Luxury Realty");
  const [whatsapp, setWhatsapp] = useState("628123456789");
  const [city, setCity] = useState("Bogor & Bali");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [waAlerts, setWaAlerts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Pengaturan profil penjual dan nomor WhatsApp berhasil disimpan.");
    }, 500);
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page Header */}
      <div className="border-b border-neutral-200/80 pb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">
          Pengaturan Akun &amp; Kontak Penjual
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal mt-0.5">
          Atur identitas bisnis dan nomor WhatsApp aktif yang menerima prospek dari halaman 3D.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Details Card */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-neutral-950 flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-900" />
            <span>Identitas Seller Terverifikasi</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                defaultValue={user?.name || "Admin Seller"}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Nama Agensi / Developer
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Email Terdaftar
              </label>
              <input
                type="email"
                disabled
                defaultValue={user?.email || "seller@estateverse.com"}
                className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-500 font-medium cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Nomor WhatsApp untuk Prospek
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="62812xxxxxxxx"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 font-medium"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Gunakan format internasional tanpa spasi (contoh: 628123456789).
              </span>
            </div>
          </div>
        </div>

        {/* Notifications Preference Card */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-neutral-950 flex items-center gap-2">
            <Bell className="w-4 h-4 text-neutral-900" />
            <span>Notifikasi Prospek Masuk</span>
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-neutral-950 accent-neutral-950"
              />
              <span className="text-neutral-700 font-medium">
                Terima email ringkasan harian saat calon pembeli mengajukan jadwal survei.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={waAlerts}
                onChange={(e) => setWaAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-neutral-950 accent-neutral-950"
              />
              <span className="text-neutral-700 font-medium">
                Aktifkan tombol kontak langsung WhatsApp di setiap detail listing publik.
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-neutral-950 text-white hover:bg-neutral-800 text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Pengaturan"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
