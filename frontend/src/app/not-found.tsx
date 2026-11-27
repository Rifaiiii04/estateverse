import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan",
  robots: { index: false },
};

// NotFound renders the branded 404 page with a way back to the catalog and home page.
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center bg-neutral-50/50">
        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-3 text-neutral-500">
          <SearchX className="w-7 h-7" aria-hidden="true" />
        </div>
        <p className="text-xs font-bold tracking-widest text-sage-700 mb-1">404</p>
        <h1 className="text-xl font-bold text-neutral-900 mb-1.5">Halaman Tidak Ditemukan</h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-md mb-5">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan. Coba cari rumah di katalog atau kembali ke beranda.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="lg" render={<Link href="/properties" />}>
            Lihat Katalog Rumah
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/" />}>
            Kembali ke Beranda
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
