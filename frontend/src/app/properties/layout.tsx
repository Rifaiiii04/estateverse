import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Katalog Rumah Dijual",
  description: "Cari rumah dijual dengan foto asli, harga jelas, dan tur Walk Inside 360° yang direkam penjual langsung dari HP.",
  openGraph: { title: "Katalog Rumah Dijual | EstateVerse" },
};

// PropertiesLayout only provides catalog metadata; the page itself renders on the client.
export default function PropertiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
