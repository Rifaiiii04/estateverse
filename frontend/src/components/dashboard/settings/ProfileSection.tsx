"use client";

import React, { useState } from "react";
import { User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { updateProfile } from "@/lib/api/account";
import { SettingsSection } from "./SettingsSection";

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

// ProfileSection lets the seller change the display name buyers see on their listings.
export function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const trimmed = name.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if ([...trimmed].length < MIN_NAME_LENGTH) {
      setError(`Nama minimal ${MIN_NAME_LENGTH} karakter.`);
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(trimmed);
      await refreshUser();
      toast.success("Nama akun berhasil diperbarui.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan nama.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection id="profile-title" title="Data Akun" icon={User}>
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="settings-name"
            name="name"
            autoComplete="name"
            label="Nama tampilan"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="settings-email"
            name="email"
            autoComplete="username"
            label="Email"
            type="email"
            value={user?.email ?? ""}
            helperText="Email dipakai untuk masuk dan belum bisa diubah."
            readOnly
          />
        </div>
        <Button type="submit" isLoading={isSaving} disabled={trimmed === (user?.name ?? "")}>
          Simpan Nama
        </Button>
      </form>
    </SettingsSection>
  );
}
