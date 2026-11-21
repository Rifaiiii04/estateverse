"use client";

import React, { useState, useEffect } from "react";
import { Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { getOwnerLeads, updateLeadStatus, Lead } from "@/lib/api/leads";
import { useToast } from "@/context/ToastContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
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

  // Fetches real buyer inquiries for the seller once on mount.
  useEffect(() => {
    let active = true;
    getOwnerLeads()
      .then((data) => active && setLeads(data))
      .catch(() => toast.error("Gagal memuat data minat pembeli."))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [toast]);

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
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pembeli, properti..."
            aria-label="Cari prospek"
            className="pl-8"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(String(value))}>
          <TabsList className="max-w-full overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "Semua" },
              { id: "new", label: "Baru" },
              { id: "contacted", label: "Dihubungi" },
              { id: "scheduled", label: "Jadwal Tur" },
              { id: "closed", label: "Deal" },
            ].map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-3 py-2">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Leads Content */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner text="Memuat daftar calon pembeli..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-12 text-center space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-neutral-500 mx-auto" />
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
                    <span className="text-[11px] text-neutral-500">&bull; {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
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

                  <Button
                    size="sm"
                    render={
                      <a
                        href={`https://wa.me/${item.phone}?text=${encodeURIComponent(`Halo Bapak/Ibu ${item.name}, saya pemilik properti ${item.property_title || ""}. Terima kasih atas minat Anda melalui EstateVerse.`)}`}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <WhatsAppIcon />
                    <span>Chat WA</span>
                    <ArrowUpRight />
                  </Button>
                </div>
              </div>

              {item.viewed_tour && (
                <span className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-sage-800 bg-sage-50 border border-sage-200 rounded-md px-2 py-0.5">
                  Sudah melihat tur virtual sebelum meminta survei
                </span>
              )}

              {item.note && (
                <p className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-xl border border-neutral-100 leading-relaxed font-normal">
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
