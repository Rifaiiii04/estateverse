"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Property } from "@/types/property";
import { PropertyCard } from "@/components/properties/PropertyCard";

interface PropertyGridViewProps {
  properties: Property[];
  isEn: boolean;
}

const INITIAL_GRID_LIMIT = 8;

// PropertyGridView displays a responsive grid of property cards with initial limiting and an internal scrollable container on expand.
export function PropertyGridView({ properties, isEn }: PropertyGridViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Resets the expansion state whenever filter criteria or search queries update the properties list.
  useEffect(() => {
    setIsExpanded(false);
  }, [properties]);

  const shouldLimit = properties.length > INITIAL_GRID_LIMIT;
  const displayedItems = !isExpanded && shouldLimit ? properties.slice(0, INITIAL_GRID_LIMIT) : properties;

  return (
    <div className="space-y-4">
      {/* If expanded and scrollable, wrap in a fixed max-height container with internal scroll */}
      {isExpanded ? (
        <div className="relative max-h-[660px] sm:max-h-[720px] overflow-y-auto pr-1.5 pb-2 rounded-2xl border border-neutral-200/60 p-2 sm:p-3 bg-neutral-100/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
            {displayedItems.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
          {displayedItems.map((prop) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>
      )}

      {/* Show More Trigger or Collapse Control Bar */}
      {shouldLimit && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isExpanded ? (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-sage-50 text-neutral-800 hover:text-sage-700 text-xs font-bold border border-neutral-200/90 hover:border-sage-300 shadow-2xs transition-all cursor-pointer"
            >
              <span>
                {isEn
                  ? `Show More (+${properties.length - INITIAL_GRID_LIMIT} listings)`
                  : `Lihat Lebih Banyak (+${properties.length - INITIAL_GRID_LIMIT} properti)`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-sage-600 group-hover:translate-y-0.5 transition-transform" />
            </button>
          ) : (
            <div className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-neutral-200/80 text-xs text-neutral-600 shadow-2xs">
              <span className="font-medium text-neutral-500">
                {isEn
                  ? `Showing all ${properties.length} listings. Scroll inside container to explore.`
                  : `Menampilkan seluruh ${properties.length} properti. Scroll di dalam kontainer untuk melihat selengkapnya.`}
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-1 text-sage-700 hover:text-sage-900 font-bold transition-colors cursor-pointer"
              >
                <span>{isEn ? "Collapse" : "Perkecil"}</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
