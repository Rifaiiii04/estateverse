/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Edit3, Trash2, Eye, Box, Bed, Bath, Maximize2 } from "lucide-react";
import { Property } from "@/types/property";
import { formatIDR } from "@/lib/utils/formatters";
import { getMediaUrl } from "@/lib/api/client";

interface ActiveAdvertisementsProps {
  properties: Property[];
  onDelete: (id: number, title: string) => void;
}

// calculateDaysActive computes how many days a property listing has been active.
function calculateDaysActive(createdAt: string): number {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

// ActiveAdvertisements renders the active property listing cards with interactive actions and metrics.
export function ActiveAdvertisements({ properties, onDelete }: ActiveAdvertisementsProps) {
  const [filterTab, setFilterTab] = useState("all");

  const filteredProperties = properties.filter((p) => {
    if (filterTab === "all") return true;
    if (filterTab === "draft") return p.status === "draft";
    return p.property_type === filterTab;
  });

  const houseCount = properties.filter((p) => p.property_type === "house").length;
  const villaCount = properties.filter((p) => p.property_type === "villa").length;

  return (
    <div id="advertisements" className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-2xs space-y-6">
      {/* Header and Filter Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-950">
            Iklan &amp; Listing Aktif
          </h2>
          <p className="text-xs text-neutral-500">
            Pantau status penayangan, model 3D, dan statistik penelusuran calon pembeli.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/properties/new">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Listing Baru</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filterTab === "all" ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          Semua ({properties.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("house")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filterTab === "house" ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          Rumah ({houseCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("villa")}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filterTab === "villa" ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          Villa ({villaCount})
        </button>
      </div>

      {/* Listings List */}
      <div className="space-y-4">
        {filteredProperties.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            Belum ada properti dalam kategori ini.
          </div>
        ) : (
          filteredProperties.map((property) => {
            const daysActive = calculateDaysActive(property.created_at);
            const firstImg = property.images && property.images.length > 0 ? getMediaUrl(property.images[0].file_path) : null;
            const has3D = Boolean(property.model_3d_path);

            return (
              <div
                key={property.id}
                className="p-4 rounded-xl border border-neutral-200/80 hover:border-neutral-400/80 bg-white transition-all shadow-2xs hover:shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left Thumbnail & Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                    {firstImg ? (
                      <img src={firstImg} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                        <Box className="w-8 h-8" />
                      </div>
                    )}
                    {has3D && (
                      <span className="absolute bottom-1 right-1 bg-neutral-950/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs">
                        <Box className="w-2.5 h-2.5" />
                        <span>3D</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-extrabold text-neutral-950 tracking-tight truncate">
                        {formatIDR(property.price)}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        &bull; Aktif {daysActive} hari
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-neutral-800 truncate">
                      {property.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Bed className="w-3 h-3 text-neutral-500" />
                        <span>{property.bedrooms} KT</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bath className="w-3 h-3 text-neutral-500" />
                        <span>{property.bathrooms} KM</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Maximize2 className="w-3 h-3 text-neutral-500" />
                        <span>{property.building_area} m²</span>
                      </span>
                      <span className="text-neutral-500">&bull; {property.city}</span>
                    </div>
                  </div>
                </div>

                {/* Right Actions & Status */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
                  {property.status === "published" && (
                    <Link href={`/properties/${property.slug}`} target="_blank">
                      <button
                        type="button"
                        title="Lihat Tampilan Publik 3D"
                        className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </Link>
                  )}

                  <Link href={`/dashboard/properties/${property.id}/edit`}>
                    <button
                      type="button"
                      title="Edit Properti & Model 3D"
                      className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </Link>

                  <button
                    type="button"
                    onClick={() => onDelete(property.id, property.title)}
                    title="Hapus Properti"
                    className="p-2 rounded-lg border border-neutral-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
