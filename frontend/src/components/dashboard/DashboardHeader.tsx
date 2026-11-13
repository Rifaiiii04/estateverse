"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, ExternalLink, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface DashboardHeaderProps {
  onOpenMobileMenu?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// DashboardHeader renders the top control bar with debounced search input, property actions, and seller profile.
export function DashboardHeader({
  onOpenMobileMenu,
  searchQuery = "",
  onSearchChange,
}: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(internalQuery, 350);
  const isFirstMount = useRef(true);

  useEffect(() => {
    setInternalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (onSearchChange) {
      onSearchChange(debouncedQuery);
    }
  }, [debouncedQuery, onSearchChange]);

  // Submits the search query to the listings page when enter is pressed without an external change handler.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !onSearchChange && internalQuery.trim()) {
      router.push(`/dashboard/properties?q=${encodeURIComponent(internalQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Trigger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full h-9">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={internalQuery}
            onChange={(e) => setInternalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari listing, alamat, kota..."
            className="w-full h-full bg-neutral-50/80 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-xl pl-9 pr-4 text-xs sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sage-600/15 focus:border-sage-600 transition-all"
          />
        </div>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Link href="/dashboard/properties/new">
          <button
            type="button"
            className="h-9 inline-flex items-center gap-1.5 bg-sage-600 text-white hover:bg-sage-700 text-xs font-semibold px-3.5 rounded-xl transition-all shadow-2xs border border-transparent cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tambah Properti</span>
          </button>
        </Link>

        <Link href="/" target="_blank" className="hidden md:inline-flex">
          <Button size="sm" variant="outline" className="border-neutral-200 text-neutral-700 hover:bg-sage-50 hover:border-sage-400 text-xs rounded-xl gap-1.5">
            <span>Lihat Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-sage-600" />
          </Button>
        </Link>

        <LanguageSwitcher />

        <div className="h-5 w-px bg-neutral-200 hidden sm:block" />

        {/* User Capsule */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-sage-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
            {user?.name ? user.name.charAt(0) : "S"}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-bold text-neutral-950 leading-tight truncate max-w-[120px]">
              {user?.name}
            </span>
            <span className="text-[10px] text-neutral-400 font-medium leading-none mt-0.5">
              Seller Terverifikasi
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Keluar dari akun"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
