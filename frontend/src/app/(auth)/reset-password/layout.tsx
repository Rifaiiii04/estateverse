import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buat Password Baru",
  robots: { index: false, follow: false },
  // The reset token is in this page's URL: never send it to another site in a Referer header.
  referrer: "no-referrer",
};

// ResetPasswordLayout only provides metadata for the page opened from a reset email.
export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
