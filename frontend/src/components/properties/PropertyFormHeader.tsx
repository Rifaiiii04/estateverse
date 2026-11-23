"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PropertyStatus } from "@/types/property";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

interface PropertyFormHeaderProps {
  editingTitle?: string;
  status: PropertyStatus;
  onStatusChange: (status: PropertyStatus) => void;
  isSubmitting: boolean;
}

// PropertyFormHeader is the form's top bar: back link, title, publish status, and (on wider screens) the save button.
// Phones get a labelled "Kembali" button above the card and the save button at the bottom of the form instead.
export function PropertyFormHeader({ editingTitle, status, onStatusChange, isSubmitting }: PropertyFormHeaderProps) {
  return (
    <div className="space-y-3">
      <Button variant="outline" className="md:hidden" render={<Link href="/dashboard/properties" />}>
        <ArrowLeft aria-hidden="true" />
        Kembali
      </Button>

      <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon-lg"
            className="shrink-0 hidden md:inline-flex"
            aria-label="Kembali ke daftar listing"
            render={<Link href="/dashboard/properties" title="Kembali ke Daftar Listing" />}
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-neutral-950 truncate leading-tight">
              {editingTitle ? `Edit: ${editingTitle}` : "Tambah Listing Properti Baru"}
            </h1>
            <p className="text-xs text-neutral-500 md:truncate">
              Isi data rumah, rekam Walk Inside 360° dari HP, lalu tambahkan foto.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto md:shrink-0">
          <Tabs value={status} onValueChange={(value) => onStatusChange(value as PropertyStatus)} className="w-full md:w-auto">
            <TabsList aria-label="Status listing" className="w-full md:w-fit">
              {(["draft", "published"] as PropertyStatus[]).map((st) => (
                <TabsTrigger key={st} value={st} className="flex-1 md:flex-none px-3 py-2 capitalize">
                  {st}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <PropertySaveButton editing={Boolean(editingTitle)} isSubmitting={isSubmitting} className="hidden md:inline-flex px-4" size="sm" />
        </div>
      </div>
    </div>
  );
}

interface PropertySaveButtonProps {
  editing: boolean;
  isSubmitting: boolean;
  className?: string;
  size?: "sm" | "lg";
}

// PropertySaveButton submits the surrounding property form; shared by the header (desktop) and form bottom (phones).
export function PropertySaveButton({ editing, isSubmitting, className, size = "lg" }: PropertySaveButtonProps) {
  return (
    <Button type="submit" size={size} isLoading={isSubmitting} className={className}>
      {editing ? "Simpan Perubahan" : "Simpan Properti"}
    </Button>
  );
}
