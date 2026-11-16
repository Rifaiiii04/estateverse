"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
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
      router.push("/login");
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
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
