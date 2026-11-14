"use client";

import React, { useState } from "react";
import { Check, Plus, X, Sparkles } from "lucide-react";

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
            <button
              key={tpl}
              type="button"
              onClick={() => toggleTemplate(tpl)}
              className={`h-8 px-3 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 border cursor-pointer ${
                isSelected
                  ? "bg-sage-600 text-white border-sage-600 shadow-2xs"
                  : "bg-neutral-50 hover:bg-white text-neutral-700 border-neutral-200 hover:border-sage-400"
              }`}
            >
              {isSelected ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3 h-3 text-neutral-500" />}
              <span>{tpl}</span>
            </button>
          );
        })}

        {/* Toggle "Other / Custom" Input Button */}
        <button
          type="button"
          onClick={() => setShowCustomInput((prev) => !prev)}
          className={`h-8 px-3 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 border cursor-pointer ${
            showCustomInput
              ? "bg-neutral-950 text-white border-neutral-950"
              : "bg-white text-sage-700 border-dashed border-sage-400 hover:bg-sage-50"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Lainnya (Ketik Sendiri)</span>
        </button>
      </div>

      {/* Custom Benefit Input Row when "Other" is active */}
      {showCustomInput && (
        <div className="flex items-center gap-2 bg-neutral-50 p-2 rounded-xl border border-neutral-200">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="Contoh: 5 menit ke Alun-alun, dekat SD negeri, air PDAM lancar..."
            className="flex-1 h-9 bg-white border border-neutral-200 rounded-lg px-3 text-xs text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-sage-600"
          />
          <button
            type="button"
            onClick={handleAddCustom}
            className="h-9 px-3.5 rounded-lg bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>
      )}

      {/* Custom Added Benefits Chips */}
      {customAddedBenefits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-neutral-500 mr-1">Benefit Kustom:</span>
          {customAddedBenefits.map((customItem) => (
            <span
              key={customItem}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sage-50 border border-sage-200 text-sage-800 text-xs font-semibold"
            >
              <span>{customItem}</span>
              <button
                type="button"
                onClick={() => removeBenefit(customItem)}
                className="text-sage-600 hover:text-rose-600 cursor-pointer"
                title="Hapus benefit ini"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
