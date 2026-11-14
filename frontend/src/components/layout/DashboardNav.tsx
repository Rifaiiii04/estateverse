"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

// DashboardNav renders the authenticated seller navigation bar with status and routes.
export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const links = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/properties/new", label: "Tambah Properti" },
  ];

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-neutral-950 tracking-tight uppercase">
              ESTATEVERSE <span className="text-xs text-neutral-500 font-normal lowercase">portal</span>
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-2">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" target="_blank">
            <Button size="sm" variant="ghost" className="gap-1.5">
              <span>Lihat Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            </Button>
          </Link>
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-neutral-900">{user?.name}</span>
            <span className="text-[11px] text-neutral-500">{user?.email}</span>
          </div>
          <Button size="sm" variant="outline" onClick={logout} className="gap-1.5">
            <LogOut className="w-3.5 h-3.5 text-neutral-500" />
            <span>Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
