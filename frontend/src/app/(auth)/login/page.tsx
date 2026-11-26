"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LogoMark } from "@/components/ui/Logo";
import { AuthPageLoading } from "@/components/layout/AuthPageLoading";
import { nextPathFromLocation } from "@/lib/auth/redirect";
import { useGuestOnly } from "@/lib/hooks/useGuestOnly";

// LoginPage renders the seller authentication interface with error handling and redirects.
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const hidePage = useGuestOnly();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setIsLoading(true);
    try {
      await login({ email, password });
      router.push(nextPathFromLocation());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Periksa kembali kredensial Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  if (hidePage) return <AuthPageLoading />;

  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center space-y-1">
            <LogoMark className="w-12 h-12 mx-auto mb-2" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Masuk ke Seller Portal
            </h1>
            <p className="text-sm text-slate-500">
              Kelola iklan rumah dan Walk Inside 360° Anda di EstateVerse.
            </p>
          </div>

          {error && <Alert type="error" message={error} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email"
              name="email"
              autoComplete="email"
              label="Email"
              type="email"
              placeholder="nama@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="login-password"
              name="password"
              autoComplete="current-password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex justify-end -mt-1">
              <Link href="/forgot-password" className="inline-flex min-h-6 items-center text-xs font-semibold text-sage-700 hover:underline">
                Lupa password?
              </Link>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Masuk
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Belum memiliki akun seller?{" "}
            <Link href="/register" className="font-semibold text-neutral-900 hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

