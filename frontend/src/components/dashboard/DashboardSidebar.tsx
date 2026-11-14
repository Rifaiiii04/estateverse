"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Megaphone, Users, TrendingUp, MessageSquare, Settings, HelpCircle, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeListingCount?: number;
}

// DashboardSidebar renders the luxury architectural seller navigation sidebar matching the reference layout.
export function DashboardSidebar({
  isOpen = false,
  onClose,
  activeListingCount = 0,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/properties", label: "Listing & Iklan", icon: Megaphone, badge: activeListingCount },
    { href: "/dashboard/leads", label: "Minat Pembeli", icon: Users },
    { href: "/dashboard/analytics", label: "Statistik Portofolio", icon: TrendingUp },
  ];

  const secondaryNav = [
    { href: "/dashboard/messages", label: "Pesan WhatsApp", icon: MessageSquare },
  ];

  const bottomNav = [
    { href: "/dashboard/settings", label: "Pengaturan Akun", icon: Settings },
    { href: "/dashboard/help", label: "Bantuan & FAQ", icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-neutral-200/80 flex flex-col justify-between py-6 px-4 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:self-start lg:h-screen lg:overflow-y-auto lg:overscroll-contain shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2">
            <Link href="/" aria-label="EstateVerse — ke website" className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-600">
              <Logo size="sm" tagline="Portal Penjual" />
            </Link>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Main Navigation Group */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-3 block mb-2">
              Menu Utama
            </span>
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-sage-600 text-white shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-950 hover:bg-sage-50/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-neutral-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-sage-700 text-white"
                          : "bg-sage-50 text-sage-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Activity Navigation Group */}
          <div className="space-y-1 pt-2 border-t border-neutral-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-3 block mb-2">
              Komunikasi
            </span>
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-sage-600 text-white font-semibold shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-950 hover:bg-sage-50/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-neutral-500"}`} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Utility Navigation */}
        <div className="space-y-1 pt-4 border-t border-neutral-100">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-sage-600 text-white font-semibold"
                    : "text-neutral-500 hover:text-neutral-950 hover:bg-sage-50/70"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-neutral-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
