import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
import "./globals.css";

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  title: {
    default: "EstateVerse — Jual & Temukan Rumah dengan Walk Inside 360° dari HP",
    template: "%s | EstateVerse",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "id_ID",
    title: "EstateVerse — Rumah dengan Walk Inside 360° dari HP",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
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
