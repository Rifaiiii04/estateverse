"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { PAGE_CONTAINER } from "@/lib/utils/layout";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { FooterCtaBanner } from "./FooterCtaBanner";

const FOOTER_LINKS = [
  { href: "/properties", label: "Daftar Rumah" },
  { href: "/register", label: "Jual Rumah Saya" },
  { href: "/ai-consultant", label: "Asisten Pintar" },
  { href: "/#why", label: "Kenapa EstateVerse" },
];

const linkClass = "inline-block py-2 opacity-90 hover:underline hover:opacity-100";

interface FooterProps {
  showCtaBanner?: boolean;
}

// Scrolls smoothly back to the top of the page.
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Renders the site footer, with the CTA banner on the landing page unless overridden.
export function Footer({ showCtaBanner }: FooterProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isLandingPage = showCtaBanner ?? pathname === "/";

  return (
    <footer className="mt-auto">
      {isLandingPage && <FooterCtaBanner />}

      <div className="bg-sage-900 text-white">
        <div className={cn(PAGE_CONTAINER, "grid gap-10 py-12 md:grid-cols-[1.2fr_1fr]")}>
          <div>
            <Logo size="sm" tone="light" tagline="Walk Inside 360° langsung dari HP" />
          </div>

          <nav aria-label="Tautan footer">
            <h2 className="font-semibold">Tautan</h2>
            <ul className="mt-2 grid grid-cols-2 gap-x-4">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/15">
          <div className={cn(PAGE_CONTAINER, "flex items-center justify-between gap-4 py-4 text-sm")}>
            <p className="opacity-90">
              &copy; {new Date().getFullYear()} EstateVerse. {t.footer.rights}
            </p>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollToTop}
              aria-label="Kembali ke atas"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowUp />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
