"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthCard } from "@/components/layout/AuthCard";
import { AuthPageLoading } from "@/components/layout/AuthPageLoading";
import { resetPassword } from "@/lib/api/account";
import { MIN_PASSWORD_LENGTH, newPasswordProblem } from "@/lib/auth/password";

const SUBTITLE = "Buat password baru untuk akun penjual EstateVerse Anda.";

// ResetPasswordPage reads the one-time token of the emailed link inside a Suspense boundary.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthPageLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

// ResetPasswordForm lets the visitor choose a new password with the token from the reset link.
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [token] = useState(() => searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Drops the token from the address bar so it does not linger in the browser history.
  useEffect(() => {
    if (token) window.history.replaceState(null, "", "/reset-password");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const problem = newPasswordProblem(password, confirmPassword);
    if (problem) {
      setError(problem);
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(token, password, confirmPassword);
      setIsDone(true);
      await refreshUser(); // a reset signs the account out on every device, this one included
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan password baru. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Tautan Tidak Valid" subtitle={SUBTITLE}>
        <Alert type="error" message="Tautan reset password tidak lengkap atau sudah dipakai. Minta tautan baru." />
        <Button size="lg" className="w-full" render={<Link href="/forgot-password" />}>
          Minta Tautan Baru
        </Button>
      </AuthCard>
    );
  }

  if (isDone) {
    return (
      <AuthCard title="Password Tersimpan" subtitle={SUBTITLE}>
        <Alert type="success" message="Password baru tersimpan. Semua perangkat sudah dikeluarkan; silakan masuk lagi." />
        <Button size="lg" className="w-full" render={<Link href="/login" />}>
          Masuk
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Buat Password Baru" subtitle={SUBTITLE}>
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="reset-password"
          name="new_password"
          autoComplete="new-password"
          label={`Password baru (min. ${MIN_PASSWORD_LENGTH} karakter)`}
          type="password"
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          id="reset-confirm-password"
          name="confirm_password"
          autoComplete="new-password"
          label="Konfirmasi password baru"
          type="password"
          minLength={MIN_PASSWORD_LENGTH}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Simpan Password Baru
        </Button>
      </form>
      <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
        Tautan kedaluwarsa?{" "}
        <Link href="/forgot-password" className="font-semibold text-neutral-900 hover:underline">
          Minta tautan baru
        </Link>
      </p>
    </AuthCard>
  );
}
