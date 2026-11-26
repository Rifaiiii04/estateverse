"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { loginUrlFor } from "@/lib/auth/redirect";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardAddFab } from "@/components/dashboard/DashboardAddFab";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// DashboardLayout protects seller portal routes and renders the sidebar layout.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Remember the requested page so the seller lands back on it after signing in.
      router.replace(loginUrlFor(window.location.pathname + window.location.search));
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner text="Memeriksa sesi seller..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      {/* min-w-0 keeps wide content (tables) from stretching the main column into horizontal scroll. */}
      <SidebarInset className="min-w-0 bg-[#f8f9fa]">
        <DashboardHeader />
        {/* Extra bottom padding on phones keeps the last card clear of the floating add button. */}
        <main id="main-content" className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6 lg:p-8 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
        <DashboardAddFab />
      </SidebarInset>
    </SidebarProvider>
  );
}
