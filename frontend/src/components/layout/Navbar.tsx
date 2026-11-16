"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { AccountActions } from "./AccountActions";
import { NavbarMobileMenu } from "./NavbarMobileMenu";
import { useMainNav, type MainNavItem } from "./useMainNav";

// Renders the desktop navigation links with a sliding highlight behind the active one.
function DesktopNavLinks({ items }: { items: MainNavItem[] }) {
  return (
    <nav aria-label="Navigasi utama" className="ml-6 hidden items-center gap-1 lg:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.isActive ? "page" : undefined}
          className={cn(
            "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            item.isActive ? "text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.isActive && (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-0 rounded-lg bg-secondary"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          )}
          <span className="relative">{item.label}</span>
          {item.pulse && <span className="relative size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />}
        </Link>
      ))}
    </nav>
  );
}

// Renders the sticky public header that gains a border and blur once the page is scrolled.
export function Navbar() {
  const items = useMainNav();
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setIsScrolled(y > 12));

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        isScrolled ? "bg-background/90 backdrop-blur-md" : "border-transparent bg-background"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          aria-label="EstateVerse — beranda"
          className="shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo size="sm" />
        </Link>

        <DesktopNavLinks items={items} />

        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitcher />
          <div className="hidden items-center gap-1.5 lg:flex">
            <AccountActions />
          </div>
          <NavbarMobileMenu items={items} />
        </div>
      </div>
    </header>
  );
}
