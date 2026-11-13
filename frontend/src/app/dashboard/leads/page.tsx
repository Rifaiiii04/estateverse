"use client";

import React, { useState, useEffect } from "react";
import { Users, Phone, MessageSquare, Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { getOwnerLeads, updateLeadStatus, Lead } from "@/lib/api/leads";
import { useToast } from "@/context/ToastContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/MotionPrimitives";
import { useDebounce } from "@/lib/hooks/useDebounce";

const leadStatusOptions: SelectOption[] = [
  { value: "new", label: "Baru" },
  { value: "contacted", label: "Sudah Dihubungi" },
  { value: "scheduled", label: "Jadwal Tur 3D" },
  { value: "closed", label: "Deal Selesai" },
];

// DashboardLeadsPage tracks real buyer inquiries, 3D tour requests, and WhatsApp follow-ups from the database.
export default function DashboardLeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Fetches real buyer inquiries for the seller from the database.
  const loadLeads = async () => {
    try {
      const data = await getOwnerLeads();
      setLeads(data);
    } catch {
      toast.error("Gagal memuat data minat pembeli.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Updates the buyer pipeline stage in the database.
  const handleStatusChange = async (id: number, newStatus: Lead["status"]) => {
    try {
      await updateLeadStatus(id, newStatus);
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead))
      );
      toast.success("Status prospek pembeli berhasil diperbarui.");
    } catch {
      toast.error("Gagal memperbarui status prospek.");
    }
  };

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      const matchName = l.name.toLowerCase().includes(q);
      const matchProp = (l.property_title || "").toLowerCase().includes(q);
      return matchName || matchProp;
    }
    return true;
  });

  const closedCount = leads.filter((l) => l.status === "closed").length;

  return (
    <FadeIn y={14} className="space-y-6">
      {/* Page Title & Pipeline Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">
            Minat Pembeli &amp; Prospek Real-Time
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal mt-0.5">
            Daftar calon pembeli yang tertarik dan siap Anda hubungi lewat WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-neutral-950 text-white">
            {leads.length} Total Prospek
          </span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            {closedCount} Deal Selesai
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-neutral-200/80">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pembeli, properti..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: "all", label: "Semua" },
            { id: "new", label: "Baru" },
            { id: "contacted", label: "Dihubungi" },
            { id: "scheduled", label: "Jadwal Tur" },
            { id: "closed", label: "Deal" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Content */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner text="Memuat daftar calon pembeli..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-12 text-center space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-neutral-400 mx-auto" />
          <p className="text-sm font-bold text-neutral-900">Belum ada data prospek pembeli</p>
          <p className="text-xs text-neutral-500">Prospek akan otomatis muncul saat pembeli mengirimkan minat.</p>
        </div>
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((item) => (
            <StaggerItem
              key={item.id}
              className="bg-white rounded-2xl border border-neutral-200/80 p-5 space-y-4 hover:border-neutral-400 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-950">{item.name}</span>
                    <span className="text-[11px] text-neutral-400">&bull; {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-xs text-neutral-600 font-medium">
                    Minat Properti: <span className="text-neutral-950 font-bold">{item.property_title || `Properti #${item.property_id}`}</span> {item.budget ? `(${item.budget})` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <CustomSelect
                    variant="compact"
                    align="right"
                    options={leadStatusOptions}
                    value={item.status}
                    onChange={(val) => handleStatusChange(item.id, val as Lead["status"])}
                  />

                  <a
                    href={`https://wa.me/${item.phone}?text=${encodeURIComponent(`Halo Bapak/Ibu ${item.name}, saya pemilik properti ${item.property_title || ""}. Terima kasih atas minat Anda melalui EstateVerse.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chat WA</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400" />
                  </a>
                </div>
              </div>

              {item.note && (
                <p className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-xl border border-neutral-100 leading-relaxed font-normal">
                  &ldquo;{item.note}&rdquo;
                </p>
              )}
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </FadeIn>
  );
}
