/* eslint-disable @next/next/no-img-element */
"use client";

import { NO_PHOTO_PLACEHOLDER } from "@/lib/utils/media";
import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Edit3, Trash2, ExternalLink, Box, SlidersHorizontal, Layers } from "lucide-react";
import { Property } from "@/types/property";
import { getDashboardProperties, deleteProperty } from "@/lib/api/properties";
import { formatCompactIDR } from "@/lib/utils/formatters";
import { getMediaUrl } from "@/lib/api/client";
import { useToast } from "@/context/ToastContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/MotionPrimitives";
import { useDebounce } from "@/lib/hooks/useDebounce";

// DashboardPropertiesContent lists, filters, and manages the seller's listings.
function DashboardPropertiesContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
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
    if (!confirm(`Hapus listing "${title}" secara permanen?`)) return;
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

        <Button className="self-start sm:self-center" render={<Link href="/dashboard/properties/new" />}>
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
          {filtered.map((item) => {
            const img =
              item.images && item.images.length > 0
                ? getMediaUrl(item.images[0].file_path)
                : NO_PHOTO_PLACEHOLDER;
            return (
              <StaggerItem
                key={item.id}
                className="bg-white rounded-2xl border border-neutral-200/80 hover:border-sage-300 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col hover:-translate-y-1 duration-300"
              >
                <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
                  <img src={img} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white ${
                        item.status === "published" ? "bg-sage-600/95" : "bg-neutral-800/90"
                      }`}
                    >
                      {item.status === "published" ? "Active" : "Draft"}
                    </span>
                    {item.model_3d_path && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-950/85 text-white inline-flex items-center gap-1">
                        <Box className="w-3 h-3 text-sage-300" />
                        <span>3D</span>
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/95 text-neutral-900 inline-flex items-center gap-1">
                      <Layers className="w-3 h-3 text-sage-600" />
                      <span>{item.floors || 1} Lt</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-bold text-neutral-950 truncate">{item.title}</h3>
                      <span className="text-sm font-extrabold text-sage-600 shrink-0">
                        {formatCompactIDR(item.price)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1 truncate">
                      {item.property_type} &middot; {item.bedrooms} KT &middot; {item.bathrooms} KM &middot; LB{" "}
                      {item.building_area} m²
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-neutral-500 font-medium truncate">{item.city}</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Lihat halaman publik"
                        render={<Link href={`/properties/${item.slug}`} target="_blank" title="Lihat halaman publik" />}
                      >
                        <ExternalLink />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Edit listing"
                        render={<Link href={`/dashboard/properties/${item.id}/edit`} title="Edit listing" />}
                      >
                        <Edit3 />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(item.id, item.title)}
                        aria-label="Hapus listing"
                        title="Hapus listing"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
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
