"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PlusCircle, User, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { smoothEase } from "@/components/ui/MotionPrimitives";

// Navbar renders the responsive architectural navigation bar with Framer Motion active underline and mobile drawer.
export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { href: string; label: string; badge?: string; pulse?: boolean }[] = [
    { href: "/", label: t.nav.home },
    { href: "/properties", label: t.nav.properties },
    { href: "/ai-consultant", label: t.nav.agents, pulse: true },
  ];

  // Closes the mobile navigation drawer when a route link is selected.
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-2.5 group shrink-0">
          <motion.span
            whileHover={{ scaleY: 1.15 }}
            className="w-2.5 h-6 rounded-full bg-sage-600 group-hover:bg-sage-700 transition-colors"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-neutral-950 uppercase leading-none">
              ESTATEVERSE
            </span>
            <span className="text-[9px] tracking-widest text-neutral-500 font-semibold uppercase mt-0.5">
              3D Architecture
            </span>
          </div>
        </Link>

        {/* Desktop Center Navigation Links with Shared Layout Active Indicator */}
        <nav className="hidden lg:flex items-center gap-7 xl:gap-8 text-[13px] xl:text-sm font-semibold text-neutral-600">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative transition-colors flex items-center gap-1.5 py-2 ${
                  isActive ? "text-sage-700 font-bold" : "hover:text-sage-600"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="h-5 px-1.5 rounded-md bg-sage-100 text-sage-800 border border-sage-200 text-[10px] font-bold uppercase tracking-wider inline-flex items-center">
                    {item.badge}
                  </span>
                )}
                {item.pulse && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-600 animate-pulse" />
                )}
                {isActive && (
                  <motion.span
                    layoutId="navbar-active-underline"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage-600 rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right CTA Actions */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <LanguageSwitcher />

          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-neutral-200 text-neutral-800 hover:border-sage-600 hover:text-sage-700 gap-1.5 rounded-xl text-xs font-semibold"
                >
                  <User className="w-3.5 h-3.5 text-sage-600" />
                  <span>{t.nav.dashboard} ({user?.name.split(" ")[0]})</span>
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                className="text-neutral-500 hover:text-neutral-950 text-xs"
              >
                {t.nav.logout}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="h-9 inline-flex items-center text-xs font-semibold text-neutral-600 hover:text-sage-700 transition-colors px-3 rounded-xl hover:bg-neutral-50"
              >
                {t.nav.login}
              </Link>
              <Link href="/register">
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="h-9 inline-flex items-center gap-2 bg-sage-600 hover:bg-sage-700 rounded-xl px-4 text-xs font-semibold text-white transition-colors shadow-2xs border border-transparent cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-sage-100" />
                  <span>{t.nav.postProperty}</span>
                </motion.button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile & Tablet Controls */}
        <div className="flex lg:hidden items-center gap-2.5">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-sage-50 hover:border-sage-300 transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile & Tablet Navigation Drawer with AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: smoothEase }}
            className="lg:hidden bg-white border-b border-neutral-200 overflow-hidden shadow-lg"
          >
            <div className="px-4 pt-3 pb-6 space-y-4">
              <nav className="flex flex-col space-y-1">
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-sage-50 text-sage-800 border border-sage-200"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.pulse && (
                        <span className="w-2 h-2 rounded-full bg-sage-600 animate-pulse" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row gap-2.5">
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard" onClick={closeMobileMenu} className="flex-1">
                      <Button variant="primary" className="w-full justify-center">
                        <User className="w-4 h-4" />
                        <span>{t.nav.dashboard} ({user?.name.split(" ")[0]})</span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => {
                        closeMobileMenu();
                        logout();
                      }}
                      className="w-full sm:w-auto justify-center"
                    >
                      {t.nav.logout}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={closeMobileMenu} className="flex-1">
                      <Button variant="outline" className="w-full justify-center">
                        {t.nav.login}
                      </Button>
                    </Link>
                    <Link href="/register" onClick={closeMobileMenu} className="flex-1">
                      <Button variant="primary" className="w-full justify-center">
                        <PlusCircle className="w-4 h-4" />
                        <span>{t.nav.postProperty}</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
