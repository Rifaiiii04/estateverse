"use client";

import React from "react";
import { Input } from "@/components/ui/Input";

interface DimensionsInputGridProps {
  landArea: string;
  buildingArea: string;
  bedrooms: string;
  bathrooms: string;
  floors: string;
  onLandAreaChange: (val: string) => void;
  onBuildingAreaChange: (val: string) => void;
  onBedroomsChange: (val: string) => void;
  onBathroomsChange: (val: string) => void;
  onFloorsChange: (val: string) => void;
}

// Blocks non-numeric key presses on keyboard inputs.
export function preventNonNumericKey(e: React.KeyboardEvent<HTMLInputElement>): void {
  const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Enter", "Home", "End"];
  if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
}

// DimensionsInputGrid renders room count and square meter inputs with strict digit-only validation.
export function DimensionsInputGrid({
  landArea,
  buildingArea,
  bedrooms,
  bathrooms,
  floors,
  onLandAreaChange,
  onBuildingAreaChange,
  onBedroomsChange,
  onBathroomsChange,
  onFloorsChange,
}: DimensionsInputGridProps) {
  const clean = (e: React.ChangeEvent<HTMLInputElement>) => e.target.value.replace(/[^0-9]/g, "");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <Input
        label="L. Tanah (m²)"
        type="text"
        inputMode="numeric"
        value={landArea}
        onKeyDown={preventNonNumericKey}
        onChange={(e) => onLandAreaChange(clean(e))}
        placeholder="120"
        required
      />
      <Input
        label="L. Bangunan (m²)"
        type="text"
        inputMode="numeric"
        value={buildingArea}
        onKeyDown={preventNonNumericKey}
        onChange={(e) => onBuildingAreaChange(clean(e))}
        placeholder="90"
        required
      />
      <Input
        label="Kamar Tidur"
        type="text"
        inputMode="numeric"
        value={bedrooms}
        onKeyDown={preventNonNumericKey}
        onChange={(e) => onBedroomsChange(clean(e))}
        placeholder="3"
        required
      />
      <Input
        label="K. Mandi"
        type="text"
        inputMode="numeric"
        value={bathrooms}
        onKeyDown={preventNonNumericKey}
        onChange={(e) => onBathroomsChange(clean(e))}
        placeholder="2"
        required
      />
      <Input
        label="Lantai"
        type="text"
        inputMode="numeric"
        value={floors}
        onKeyDown={preventNonNumericKey}
        onChange={(e) => onFloorsChange(clean(e))}
        placeholder="1"
        required
      />
    </div>
  );
}
