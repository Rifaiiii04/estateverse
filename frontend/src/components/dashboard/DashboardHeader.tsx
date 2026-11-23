"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Separator } from "@/components/ui/Separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Renders the dashboard top bar with the sidebar toggle, listing search, and quick actions.
export function DashboardHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Opens the listings page filtered by the typed query when Enter is pressed.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && query.trim()) {
      router.push(`/dashboard/properties?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-md max-md:h-16">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4!" />

      <div className="relative w-full max-w-md flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari listing, alamat, kota..."
          aria-label="Cari listing"
          className="pl-8"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Phones use the floating add button (DashboardAddFab) instead. */}
        <Button className="hidden md:inline-flex" render={<Link href="/dashboard/properties/new" />} aria-label="Tambah properti">
          <Plus />
          <span>Tambah Properti</span>
        </Button>
        <Button
          variant="outline"
          className="hidden md:inline-flex"
          render={<Link href="/" target="_blank" rel="noopener noreferrer" />}
        >
          Lihat Website
          <ExternalLink />
        </Button>
        <LanguageSwitcher className="hidden sm:inline-flex" />
      </div>
    </header>
  );
}
