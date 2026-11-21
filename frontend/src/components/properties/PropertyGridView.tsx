"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Property } from "@/types/property";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { Button } from "@/components/ui/Button";

interface PropertyGridViewProps {
  properties: Property[];
  isEn: boolean;
}

const INITIAL_GRID_LIMIT = 8;

// PropertyGridView displays a responsive grid of property cards with initial limiting and an internal scrollable container on expand.
export function PropertyGridView({ properties, isEn }: PropertyGridViewProps) {
  // Expansion belongs to one specific result list, so new filter results start collapsed automatically.
  const [expandedList, setExpandedList] = useState<Property[] | null>(null);
  const isExpanded = expandedList === properties;
  const setIsExpanded = (expanded: boolean) => setExpandedList(expanded ? properties : null);

  const shouldLimit = properties.length > INITIAL_GRID_LIMIT;
  const displayedItems = !isExpanded && shouldLimit ? properties.slice(0, INITIAL_GRID_LIMIT) : properties;

  return (
    <div className="space-y-4">
      {/* Expanded on tablets and up: a fixed-height box with its own scroll. Phones keep one natural page scroll. */}
      {isExpanded ? (
        <div className="md:relative md:max-h-[720px] md:overflow-y-auto md:rounded-2xl md:border md:border-neutral-200/60 md:bg-neutral-100/40 md:p-3 md:pr-1.5">
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
            <Button variant="outline" size="lg" className="rounded-full" onClick={() => setIsExpanded(true)}>
              <span>
                {isEn
                  ? `Show More (+${properties.length - INITIAL_GRID_LIMIT} listings)`
                  : `Lihat Lebih Banyak (+${properties.length - INITIAL_GRID_LIMIT} properti)`}
              </span>
              <ChevronDown className="text-primary" />
            </Button>
          ) : (
            <div className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-white rounded-xl border border-neutral-200/80 text-xs text-neutral-600 shadow-2xs">
              <span className="font-medium text-neutral-500">
                {isEn ? `Showing all ${properties.length} listings` : `Menampilkan seluruh ${properties.length} properti`}
              </span>
              <Button variant="link" size="sm" onClick={() => setIsExpanded(false)}>
                <span>{isEn ? "Collapse" : "Perkecil"}</span>
                <ChevronUp />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
