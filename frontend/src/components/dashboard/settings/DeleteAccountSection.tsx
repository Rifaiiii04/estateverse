"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteAccount } from "@/lib/api/account";
import { SettingsSection } from "./SettingsSection";

const WHAT_IS_DELETED = "Semua iklan, foto, tur 360°, dan data minat pembeli Anda ikut terhapus.";

// DeleteAccountSection permanently removes the seller account after the password and a confirmation dialog.
export function DeleteAccountSection() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Masukkan password untuk menghapus akun.");
      return;
    }
    const ok = await confirm({
      title: "Hapus akun ini secara permanen?",
      description: `${WHAT_IS_DELETED} Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Ya, hapus akun",
      destructive: true,
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await deleteAccount(password);
      // A full reload drops all signed-in state; the server has already cleared the session cookie.
      window.location.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus akun.");
      setIsDeleting(false);
    }
  };

  return (
    <SettingsSection
      id="delete-account-title"
      title="Hapus Akun"
      icon={Trash2}
      tone="danger"
      description={`${WHAT_IS_DELETED} Tidak bisa dibatalkan.`}
    >
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <Input
            id="settings-delete-password"
            name="password"
            autoComplete="current-password"
            label="Password untuk konfirmasi"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="destructive" isLoading={isDeleting}>
          Hapus Akun
        </Button>
      </form>
      {confirmDialog}
    </SettingsSection>
  );
}
