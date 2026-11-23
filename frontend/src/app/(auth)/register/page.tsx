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

// RegisterPage renders the seller registration interface with validation and instant session initialization.
export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Semua kolom formulir wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal harus 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name,
        email,
        password,
        confirm_password: confirmPassword,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-center space-y-1">
            <LogoMark className="w-12 h-12 mx-auto mb-2" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daftar Sebagai Seller
            </h1>
            <p className="text-sm text-slate-500">
              Pasang iklan rumah dan rekam Walk Inside 360° langsung dari HP.
            </p>
          </div>

          {error && <Alert type="error" message={error} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Lengkap / Agensi"
              type="text"
              placeholder="Budi Pratama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Alamat Email"
              type="email"
              placeholder="budi@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password (min. 8 karakter)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Konfirmasi Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Daftar Sekarang
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Sudah memiliki akun seller?{" "}
            <Link href="/login" className="font-semibold text-neutral-900 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
