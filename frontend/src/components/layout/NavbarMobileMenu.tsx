"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/Sheet";
import { AccountActions } from "./AccountActions";
import type { MainNavItem } from "./useMainNav";

// Renders the hamburger button and slide-in navigation sheet for small screens.
export function NavbarMobileMenu({ items }: { items: MainNavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Closes the sheet after a link or action is chosen.
  const close = () => setIsOpen(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger render={<Button variant="outline" size="icon" className="size-11 lg:hidden" aria-label="Buka menu" />}>
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>
            <Logo size="sm" tagline="" />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Navigasi seluler" className="flex flex-col px-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-between rounded-lg px-3 text-base font-medium",
                item.isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
              )}
            >
              {item.label}
              {item.pulse && <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <AccountActions layout="stacked" onNavigate={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
