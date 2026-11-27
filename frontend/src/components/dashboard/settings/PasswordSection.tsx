"use client";

import React, { useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { changePassword } from "@/lib/api/account";
import { MIN_PASSWORD_LENGTH, newPasswordProblem } from "@/lib/auth/password";
import { SettingsSection } from "./SettingsSection";

// PasswordSection changes the password after re-checking the current one; other devices are signed out.
export function PasswordSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const problem = current ? newPasswordProblem(next, confirm) : "Isi password saat ini.";
    if (problem) {
      setError(problem);
      return;
    }
    setIsSaving(true);
    try {
      await changePassword(current, next, confirm);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password diubah. Perangkat lain yang masih masuk sudah dikeluarkan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection id="password-title" title="Ubah Password" icon={KeyRound}>
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lets password managers file the new password under the right account. */}
        <input type="hidden" name="username" autoComplete="username" value={user?.email ?? ""} />
        <Input
          id="settings-current-password"
          name="current_password"
          autoComplete="current-password"
          label="Password saat ini"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="settings-new-password"
            name="new_password"
            autoComplete="new-password"
            label={`Password baru (min. ${MIN_PASSWORD_LENGTH} karakter)`}
            type="password"
            minLength={MIN_PASSWORD_LENGTH}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <Input
            id="settings-confirm-password"
            name="confirm_password"
            autoComplete="new-password"
            label="Konfirmasi password baru"
            type="password"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button type="submit" isLoading={isSaving}>
          Ubah Password
        </Button>
      </form>
    </SettingsSection>
  );
}
