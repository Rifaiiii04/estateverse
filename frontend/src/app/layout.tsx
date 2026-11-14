import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { MotionProvider } from "@/components/ui/MotionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "EstateVerse — Jual & Temukan Rumah dengan Walk Inside 360° dari HP",
  description:
    "EstateVerse membantu penjual perorangan dan developer kecil memasarkan rumah dengan tur virtual 360° yang direkam dari HP, dan membantu pembeli rumah pertama melihat isi rumah sebelum survei.",
};

// RootLayout provides global providers, a skip link for keyboard users, and base styles.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased scroll-smooth" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-white text-neutral-900 selection:bg-sage-700 selection:text-white font-sans"
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-white focus:text-neutral-950 focus:px-4 focus:py-2 focus:rounded-xl focus:ring-2 focus:ring-sage-600"
        >
          Lewati ke konten utama
        </a>
        <MotionProvider>
          <AuthProvider>
            <LanguageProvider>
              <ToastProvider>{children}</ToastProvider>
            </LanguageProvider>
          </AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
