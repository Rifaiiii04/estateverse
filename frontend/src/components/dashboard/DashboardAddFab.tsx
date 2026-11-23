"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

/** Routes where the floating button would only cover the form's own save button. */
const HIDDEN_ON = [/^\/dashboard\/properties\/new/, /^\/dashboard\/properties\/\d+\/edit/];

// DashboardAddFab is the phone-only floating button for adding a new listing from any dashboard page.
export function DashboardAddFab() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((pattern) => pattern.test(pathname))) return null;
  return (
    <Link
      href="/dashboard/properties/new"
      aria-label="Tambah listing baru"
      title="Tambah listing baru"
      className="md:hidden fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-sage-900/25 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
    >
      <Plus className="size-6" aria-hidden="true" />
    </Link>
  );
}
