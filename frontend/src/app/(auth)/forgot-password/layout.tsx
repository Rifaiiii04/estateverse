import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lupa Password",
  robots: { index: false, follow: true },
};

// ForgotPasswordLayout only provides metadata for the password reset request page.
export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
