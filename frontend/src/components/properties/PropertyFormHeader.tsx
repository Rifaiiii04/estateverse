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

// PropertyFormHeader is the form's top action bar with back link, title, publish status, and save button.
export function PropertyFormHeader({ editingTitle, status, onStatusChange, isSubmitting }: PropertyFormHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="outline"
          size="icon-lg"
          className="shrink-0"
          aria-label="Kembali ke daftar listing"
          render={<Link href="/dashboard/properties" title="Kembali ke Daftar Listing" />}
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-extrabold text-neutral-950 truncate leading-tight">
            {editingTitle ? `Edit: ${editingTitle}` : "Tambah Listing Properti Baru"}
          </h1>
          <p className="text-xs text-neutral-500 truncate">
            Isi data rumah, rekam Walk Inside 360° dari HP, lalu tambahkan foto.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-center shrink-0">
        <Tabs value={status} onValueChange={(value) => onStatusChange(value as PropertyStatus)}>
          <TabsList aria-label="Status listing">
            {(["draft", "published"] as PropertyStatus[]).map((st) => (
              <TabsTrigger key={st} value={st} className="px-3 py-2 capitalize">
                {st}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button type="submit" size="sm" isLoading={isSubmitting} className="px-4">
          {editingTitle ? "Simpan Perubahan" : "Simpan Properti"}
        </Button>
      </div>
    </div>
  );
}
