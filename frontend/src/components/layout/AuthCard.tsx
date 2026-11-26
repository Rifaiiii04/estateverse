import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LogoMark } from "@/components/ui/Logo";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

// AuthCard frames a small account form (forgot or reset password) with the site navigation and footer.
export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center space-y-1">
            <LogoMark className="w-12 h-12 mx-auto mb-2" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
