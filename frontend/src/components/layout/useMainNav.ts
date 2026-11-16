"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export interface MainNavItem {
  href: string;
  label: string;
  pulse?: boolean;
  isActive: boolean;
}

// Checks whether a nav link matches the current route; the home link only matches "/" exactly.
function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Builds the translated public navigation links with their active state.
export function useMainNav(): MainNavItem[] {
  const pathname = usePathname();
  const { t } = useLanguage();

  const links = [
    { href: "/", label: t.nav.home },
    { href: "/properties", label: t.nav.properties },
    { href: "/ai-consultant", label: t.nav.agents, pulse: true },
  ];

  return links.map((link) => ({ ...link, isActive: isActivePath(pathname, link.href) }));
}
