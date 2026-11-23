"use client";

import React, { useState } from "react";
import { Check, Plus, X, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const TEMPLATE_BENEFITS = [
  "Dekat sekolah & kampus",
  "Dekat pasar & minimarket",
  "Dekat puskesmas / rumah sakit",
  "Dekat stasiun / terminal",
  "Akses jalan muat mobil",
  "Lingkungan aman & tenang",
  "Bebas banjir",
  "Sertifikat SHM siap AJB",
];

interface PropertyBenefitsInputProps {
  benefits: string[];
  onChange: (benefits: string[]) => void;
}

// PropertyBenefitsInput allows sellers to multi-select template benefits and add custom "Other" highlights.
export function PropertyBenefitsInput({
  benefits,
  onChange,
}: PropertyBenefitsInputProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");

  // Toggles a preset template benefit on or off in the selected list.
  const toggleTemplate = (item: string) => {
    const exists = benefits.some((b) => b.toLowerCase() === item.toLowerCase());
    if (exists) {
      onChange(benefits.filter((b) => b.toLowerCase() !== item.toLowerCase()));
    } else if (benefits.length < 20) {
      onChange([...benefits, item]);
    }
  };

  // Appends a user-typed custom benefit to the list.
  const handleAddCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    const exists = benefits.some((b) => b.toLowerCase() === trimmed.toLowerCase());
    if (!exists && benefits.length < 20) {
      onChange([...benefits, trimmed]);
    }
    setCustomText("");
  };

  // Removes a specific benefit chip by value.
  const removeBenefit = (item: string) => {
    onChange(benefits.filter((b) => b !== item));
  };

  const customAddedBenefits = benefits.filter(
    (b) => !TEMPLATE_BENEFITS.some((t) => t.toLowerCase() === b.toLowerCase())
  );

  return (
    <div className="space-y-3 pt-2 border-t border-neutral-100">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sage-600" />
            <span>Keunggulan Lokasi &amp; Benefit Rumah (Bisa Pilih Beberapa)</span>
          </span>
          <span className="text-[11px] text-neutral-500">
            Pilih dari template di bawah atau klik &ldquo;+ Lainnya (Ketik Sendiri)&rdquo;
          </span>
        </div>
        <span className="text-[11px] font-semibold text-neutral-500">
          {benefits.length} dipilih
        </span>
      </div>

      {/* Multi-Select Template Chips */}
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_BENEFITS.map((tpl) => {
          const isSelected = benefits.some((b) => b.toLowerCase() === tpl.toLowerCase());
          return (
            <Button
              key={tpl}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              aria-pressed={isSelected}
              onClick={() => toggleTemplate(tpl)}
            >
              {isSelected ? <Check /> : <Plus />}
              <span>{tpl}</span>
            </Button>
          );
        })}

        {/* Toggle "Other / Custom" Input Button */}
        <Button
          variant={showCustomInput ? "secondary" : "outline"}
          size="sm"
          aria-pressed={showCustomInput}
          className={showCustomInput ? undefined : "border-dashed text-primary"}
          onClick={() => setShowCustomInput((prev) => !prev)}
        >
          <Plus />
          <span>Lainnya (Ketik Sendiri)</span>
        </Button>
      </div>

      {/* Custom Benefit Input Row when "Other" is active */}
      {showCustomInput && (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
          <Input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            aria-label="Benefit lainnya"
            placeholder="Contoh: 5 menit ke Alun-alun, dekat SD negeri, air PDAM lancar..."
            className="flex-1 bg-background"
          />
          <Button onClick={handleAddCustom} className="shrink-0">
            <Plus />
            <span>Tambah</span>
          </Button>
        </div>
      )}

      {/* Custom Added Benefits Chips */}
      {customAddedBenefits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-neutral-500 mr-1">Benefit Kustom:</span>
          {customAddedBenefits.map((customItem) => (
            <Badge key={customItem} variant="secondary" className="h-6 pr-0.5">
              <span>{customItem}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5 hover:text-destructive"
                onClick={() => removeBenefit(customItem)}
                aria-label={`Hapus benefit ${customItem}`}
                title="Hapus benefit ini"
              >
                <X />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
