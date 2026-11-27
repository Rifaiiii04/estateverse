import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar sebagai Penjual",
  description: "Pasang iklan rumah gratis dan rekam tur Walk Inside 360° langsung dari HP.",
};

// RegisterLayout only provides metadata for the seller sign-up page.
export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
