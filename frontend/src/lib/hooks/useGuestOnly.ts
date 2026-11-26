"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { nextPathFromLocation } from "@/lib/auth/redirect";

// useGuestOnly sends a signed-in seller away from login/register pages to their dashboard (or ?next=) and
// reports whether the page should stay hidden while the session is checked or the redirect happens.
export function useGuestOnly(): boolean {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(nextPathFromLocation());
  }, [isLoading, isAuthenticated, router]);

  return isLoading || isAuthenticated;
}
