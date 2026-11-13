import React from "react";
import { Search } from "lucide-react";
import { Property } from "@/types/property";
import { PropertyCard } from "./PropertyCard";

interface PropertyGridProps {
  properties: Property[];
  isLoading?: boolean;
  emptyMessage?: string;
  showStatus?: boolean;
}

// PropertyGrid renders a responsive collection of property cards with loading and empty states.
export function PropertyGrid({
  properties,
  isLoading = false,
  emptyMessage = "Belum ada properti yang tersedia saat ini.",
  showStatus = false,
}: PropertyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-neutral-200 overflow-hidden animate-pulse h-[360px]"
          >
            <div className="bg-neutral-200 aspect-[16/10] w-full" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-neutral-200 rounded w-1/3" />
              <div className="h-6 bg-neutral-200 rounded w-3/4" />
              <div className="h-5 bg-neutral-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-2xl border border-neutral-200 max-w-lg mx-auto space-y-3">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900">Tidak Ditemukan Properti</h3>
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((prop) => (
        <PropertyCard key={prop.id} property={prop} showStatus={showStatus} />
      ))}
    </div>
  );
}
