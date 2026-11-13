/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Edit3, Trash2, ExternalLink, Box, SlidersHorizontal, Layers } from "lucide-react";
import { Property } from "@/types/property";
import { getDashboardProperties, deleteProperty } from "@/lib/api/properties";
import { formatCompactIDR } from "@/lib/utils/formatters";
import { getMediaUrl } from "@/lib/api/client";
import { useToast } from "@/context/ToastContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/MotionPrimitives";
import { useDebounce } from "@/lib/hooks/useDebounce";

// DashboardPropertiesPage allows sellers to filter, inspect, edit, and delete their listed properties in a responsive grid.
export default function DashboardPropertiesPage() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 300);
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft" | "3d">("all");

  // Fetches current seller listings from the backend database.
  const loadProperties = async () => {
    try {
      const data = await getDashboardProperties();
      setProperties(data);
    } catch {
      toast.error("Gagal memuat daftar properti Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) setKeyword(q);
    }
  }, []);

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

        <Link
          href="/dashboard/properties/new"
          className="h-9 inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-sage-700 text-white text-xs font-bold px-4 rounded-full transition-colors shadow-2xs self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Listing</span>
        </Link>
      </div>

      {/* Pill Filter and Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "Semua", count: counts.all },
            { id: "published", label: "Aktif", count: counts.published },
            { id: "draft", label: "Draft", count: counts.draft },
            { id: "3d", label: "3D Interaktif", count: counts.with3d },
          ].map((tab) => {
            const active = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
                className={`h-9 inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold px-3.5 rounded-full transition-all border cursor-pointer ${
                  active
                    ? "bg-neutral-950 text-white border-neutral-950 shadow-2xs"
                    : "bg-white border-neutral-200 text-neutral-700 hover:border-sage-400"
                }`}
              >
                <span>{tab.label}</span>
                <span className={active ? "text-neutral-300" : "text-neutral-400"}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-80 h-9">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari judul properti, kota..."
            className="w-full h-full bg-white border border-neutral-200 hover:border-sage-400 rounded-full pl-9 pr-4 text-xs sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-sage-600 focus:ring-2 focus:ring-sage-600/15 transition-all"
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
                : "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";
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
                      <Link
                        href={`/properties/${item.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-sage-700 hover:border-sage-300"
                        title="Lihat halaman publik"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/dashboard/properties/${item.id}/edit`}
                        className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-sage-700 hover:border-sage-300"
                        title="Edit listing"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-lg border border-neutral-200 text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Hapus listing"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
