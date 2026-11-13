import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "EstateVerse — Interactive 3D Real Estate & Architectural Property Presentation",
  description:
    "Explore luxury villas, architectural homes, and curated properties across Indonesia with interactive 3D exterior orbits and interior Walk Inside tours.",
};

// RootLayout provides global authentication context, toast notifications, typography, and base styles.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white font-sans"
        suppressHydrationWarning
      >
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
