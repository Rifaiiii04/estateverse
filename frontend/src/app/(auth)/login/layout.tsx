import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk Penjual",
  robots: { index: false, follow: true },
};

// LoginLayout only provides metadata for the sign-in page.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
