import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asisten KPR & Beli Rumah",
  description: "Hitung perkiraan cicilan KPR, cek kemampuan bayar, dan pelajari dokumen serta biaya membeli rumah.",
  openGraph: { title: "Asisten KPR & Beli Rumah | EstateVerse" },
};

// AiConsultantLayout only provides metadata for the assistant page.
export default function AiConsultantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
