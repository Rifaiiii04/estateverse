"use client";

import Link from "next/link";
import { LayoutDashboard, LogIn, LogOut, PlusCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

interface AccountActionsProps {
  layout?: "inline" | "stacked";
  onNavigate?: () => void;
}

// Renders the login/register or dashboard/logout actions for the public header.
export function AccountActions({ layout = "inline", onNavigate }: AccountActionsProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const isStacked = layout === "stacked";
  const buttonClass = cn(isStacked && "h-11 w-full justify-center text-base");

  // Closes the surrounding menu, then signs the seller out.
  const handleLogout = () => {
    onNavigate?.();
    logout();
  };

  if (isAuthenticated) {
    return (
      <>
        <Button variant="ghost" className={buttonClass} onClick={onNavigate} render={<Link href="/dashboard" />}>
          <LayoutDashboard />
          {t.nav.dashboard} ({user?.name.split(" ")[0]})
        </Button>
        <Button variant={isStacked ? "outline" : "ghost"} className={buttonClass} onClick={handleLogout}>
          <LogOut />
          {t.nav.logout}
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="ghost" className={buttonClass} onClick={onNavigate} render={<Link href="/login" />}>
        <LogIn />
        {t.nav.login}
      </Button>
      <Button className={buttonClass} onClick={onNavigate} render={<Link href="/register" />}>
        <PlusCircle />
        {t.nav.postProperty}
      </Button>
    </>
  );
}
