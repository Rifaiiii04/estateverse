"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthCard } from "@/components/layout/AuthCard";
import { AuthPageLoading } from "@/components/layout/AuthPageLoading";
import { requestPasswordReset } from "@/lib/api/account";
import { useGuestOnly } from "@/lib/hooks/useGuestOnly";

// ForgotPasswordPage asks for the account email and sends a one-time password reset link.
export default function ForgotPasswordPage() {
  const hidePage = useGuestOnly();
  const [email, setEmail] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await requestPasswordReset(email.trim());
      setSentMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim tautan reset. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (hidePage) return <AuthPageLoading />;

  return (
    <AuthCard
      title="Lupa Password"
      subtitle="Masukkan email akun penjual Anda. Kami kirim tautan untuk membuat password baru."
    >
      {error && <Alert type="error" message={error} />}

      {sentMessage ? (
        <div className="space-y-4">
          <Alert type="success" message={sentMessage} />
          <p className="text-xs text-slate-500">
            Tautan berlaku 30 menit dan hanya bisa dipakai sekali. Belum ada email setelah beberapa menit? Tunggu
            1 menit, lalu kirim ulang.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setSentMessage("")}>
            Kirim ulang
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="forgot-email"
            name="email"
            autoComplete="email"
            label="Email"
            type="email"
            placeholder="nama@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
            Kirim Tautan Reset
          </Button>
        </form>
      )}

      <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        Sudah ingat password?{" "}
        <Link href="/login" className="font-semibold text-neutral-900 hover:underline">
          Kembali masuk
        </Link>
      </p>
    </AuthCard>
  );
}
