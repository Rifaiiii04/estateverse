"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { smoothEase } from "./MotionPrimitives";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: "field" | "pill" | "compact" | "minimal";
  align?: "left" | "right";
}

// CustomSelect renders a custom dropdown with Framer Motion animated popover and styled option cards.
export function CustomSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Pilih opsi...",
  disabled = false,
  className = "",
  variant = "field",
  align = "left",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  // Selects an option value and closes the dropdown menu.
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const triggerVariants = {
    field: `w-full h-10 rounded-xl px-3.5 text-xs sm:text-sm font-medium bg-white border shadow-2xs ${
      isOpen ? "border-sage-600 ring-2 ring-sage-600/15" : "border-neutral-200 hover:border-sage-400 text-neutral-900"
    }`,
    pill: `h-9 rounded-full px-3.5 text-xs sm:text-[13px] font-semibold bg-white border shadow-2xs whitespace-nowrap ${
      isOpen ? "border-sage-600 ring-2 ring-sage-600/15 text-sage-800" : "border-neutral-200 hover:border-sage-400 text-neutral-700"
    }`,
    compact: `h-8 rounded-xl px-3 text-xs font-semibold bg-neutral-50 hover:bg-white border whitespace-nowrap ${
      isOpen ? "border-sage-600 ring-2 ring-sage-600/15 bg-white text-sage-800" : "border-neutral-200 hover:border-sage-400 text-neutral-800"
    }`,
    minimal: `h-8 rounded-xl px-2.5 text-xs sm:text-[13px] font-bold bg-transparent hover:bg-neutral-100/80 border border-transparent whitespace-nowrap ${
      isOpen ? "bg-sage-50/80 text-sage-800 border-sage-200" : "text-neutral-950"
    }`,
  };

  return (
    <div className={`relative ${variant === "field" ? "w-full" : "inline-block"} ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
          {label}
        </label>
      )}

      {/* Styled Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
          triggerVariants[variant]
        } ${disabled ? "opacity-50 cursor-not-allowed bg-neutral-100" : ""}`}
      >
        <span className={`truncate ${selectedOption ? "" : "text-neutral-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-sage-600" : ""
          }`}
        />
      </button>

      {/* Smooth Framer Motion Options Popover Menu */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: smoothEase }}
            className={`absolute top-full mt-1.5 z-50 min-w-[200px] ${
              variant === "field" ? "left-0 right-0" : align === "right" ? "right-0" : "left-0"
            } bg-white border border-neutral-200/90 rounded-2xl shadow-xl shadow-neutral-900/10 p-1.5 max-h-64 overflow-y-auto backdrop-blur-md`}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-neutral-400 text-center">Tidak ada pilihan</div>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all flex items-center justify-between gap-3 cursor-pointer mb-0.5 last:mb-0 ${
                      isSelected
                        ? "bg-sage-600 text-white shadow-2xs font-semibold"
                        : "text-neutral-700 hover:bg-sage-50 hover:text-sage-900"
                    }`}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate">{option.label}</span>
                      {option.description && (
                        <span className={`text-[10px] ${isSelected ? "text-sage-100" : "text-neutral-400"}`}>
                          {option.description}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
