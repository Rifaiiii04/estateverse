"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { Property } from "@/types/property";
import { getDashboardProperties, deleteProperty } from "@/lib/api/properties";
import { formatCompactIDR } from "@/lib/utils/formatters";
import { useToast } from "@/context/ToastContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { FadeIn, StaggerContainer } from "@/components/ui/MotionPrimitives";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { OwnerListingCard } from "@/components/dashboard/OwnerListingCard";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

// DashboardPropertiesContent lists, filters, and manages the seller's listings.
function DashboardPropertiesContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const debouncedKeyword = useDebounce(keyword, 300);
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft" | "3d">("all");

  // Fetches the seller's current listings once on mount.
  useEffect(() => {
    let active = true;
    getDashboardProperties()
      .then((data) => active && setProperties(data))
      .catch(() => toast.error("Gagal memuat daftar properti Anda."))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [toast]);

  // Removes a property listing permanently after user confirmation.
  const handleDelete = async (id: number, title: string) => {
    const ok = await confirm({
      title: "Hapus listing?",
      description: `"${title}" beserta foto dan tur 360°-nya akan dihapus permanen.`,
      confirmLabel: "Hapus",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProperty(id);
      toast.success(`Listing "${title}" berhasil dihapus.`);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Gagal menghapus properti.");
    }
  };

  const counts = useMemo(() => {
    const all = properties.length;
    const published = properties.filter((p) => p.status === "published").length;
    const draft = properties.filter((p) => p.status === "draft").length;
    const with3d = properties.filter((p) => Boolean(p.model_3d_path)).length;
    const totalVal = properties.reduce((acc, p) => acc + (p.price || 0), 0);
    return { all, published, draft, with3d, totalVal };
  }, [properties]);

  const filtered = properties.filter((p) => {
    if (filterStatus === "published" && p.status !== "published") return false;
    if (filterStatus === "draft" && p.status !== "draft") return false;
    if (filterStatus === "3d" && !p.model_3d_path) return false;
    if (debouncedKeyword.trim()) {
      const q = debouncedKeyword.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <FadeIn y={14} className="space-y-6">
      {/* Top Summary & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950">
            Listings &amp; Inventaris
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span>
              <strong className="text-neutral-950">{counts.published}</strong> aktif &middot;{" "}
              {formatCompactIDR(counts.totalVal)}
            </span>
            <span>
              <strong className="text-neutral-950">{counts.with3d}</strong> dengan Model 3D
            </span>
            <span className="text-sage-700 font-semibold">
              {counts.draft} draft menunggu publikasi
            </span>
          </div>
        </div>

        <Button className="hidden md:inline-flex self-center" render={<Link href="/dashboard/properties/new" />}>
          <Plus />
          <span>Tambah Listing</span>
        </Button>
      </div>

      {/* Pill Filter and Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}>
          <TabsList className="max-w-full overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "Semua", count: counts.all },
              { id: "published", label: "Aktif", count: counts.published },
              { id: "draft", label: "Draft", count: counts.draft },
              { id: "3d", label: "3D Interaktif", count: counts.with3d },
            ].map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-3 py-2">
                <span>{tab.label}</span>
                <Badge variant="secondary">{tab.count}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari judul properti, kota..."
            aria-label="Cari listing"
            className="bg-background pl-8"
          />
        </div>
      </div>

      {/* Property Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner text="Memuat daftar listing properti..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-12 text-center space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-sage-600 mx-auto" />
          <p className="text-sm font-bold text-neutral-900">Belum ada properti yang sesuai</p>
          <p className="text-xs text-neutral-500">Coba ubah status filter atau tambahkan listing baru.</p>
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item) => (
            <OwnerListingCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </StaggerContainer>
      )}
      {confirmDialog}
    </FadeIn>
  );
}

// DashboardPropertiesPage wraps the listing manager in Suspense because it reads URL search params.
export default function DashboardPropertiesPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Memuat daftar properti..." />}>
      <DashboardPropertiesContent />
    </Suspense>
  );
}
