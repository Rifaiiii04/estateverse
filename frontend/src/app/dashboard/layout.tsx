"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// DashboardLayout protects seller portal routes and renders the professional sidebar layout.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen flex bg-[#f8f9fa] text-neutral-900">
      {/* Left Sidebar */}
      <DashboardSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <DashboardHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
