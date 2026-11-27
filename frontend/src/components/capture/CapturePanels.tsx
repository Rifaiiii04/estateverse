"use client";

import React, { useState } from "react";
import { Camera, CheckCircle2, RotateCcw, Ruler, Smartphone, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loadSavedCameraHeight, saveCameraHeight } from "@/lib/capture/useCaptureExtras";

import { SweepThumbnail } from "./SweepThumbnail";

interface CaptureIntroProps {
  onStart: (cameraHeightCm: number) => void;
  isStarting: boolean;
  error: string;
}

// CaptureIntroPanel explains how to record a room and asks the phone height used later to measure the room.
export function CaptureIntroPanel({ onStart, isStarting, error }: CaptureIntroProps) {
  const [heightCm, setHeightCm] = useState(loadSavedCameraHeight);
  const heightValid = heightCm >= 50 && heightCm <= 250;
  // Remembers the height on this device and opens the camera.
  const start = () => {
    saveCameraHeight(heightCm);
    onStart(heightCm);
  };
  const tips = [
    "Berdiri di area terang. Pegang HP tegak setinggi mata dengan kamera belakang menghadap ruangan.",
    "Putar perlahan ke kanan dengan lensa sebagai poros. Gambar akan mengisi pratinjau selama Anda menyapu.",
    "Selesaikan satu putaran penuh di setiap ketinggian. Kamera menyimpan satu panorama tiap putaran, lalu memandu Anda ke bagian atas dan bawah ruangan.",
  ];
  return (
    <div className="absolute inset-0 overflow-y-auto bg-neutral-950/90 text-white p-6 flex flex-col justify-center gap-5">
      <div className="flex items-center gap-3">
        <Smartphone className="w-8 h-8 text-sage-300" aria-hidden="true" />
        <h2 className="text-xl font-extrabold">Kamera Panorama 360°</h2>
      </div>
      <ol className="space-y-2.5 text-sm text-neutral-100 list-decimal list-inside">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="text-sm bg-rose-600/90 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      <CameraHeightField heightCm={heightCm} onChange={setHeightCm} />
      <Button type="button" size="lg" onClick={start} isLoading={isStarting} disabled={!heightValid}>
        <Camera className="w-4 h-4" aria-hidden="true" />
        Mulai Sapuan
      </Button>
      <p className="text-xs text-neutral-300">
        Browser akan meminta izin kamera, sensor gerak, dan lokasi. Lokasi hanya dipakai untuk membuktikan tur direkam di
        rumah ini. Koordinatnya disimpan secara privat.
      </p>
    </div>
  );
}

// Collects the camera height used to measure the recorded room.
function CameraHeightField({ heightCm, onChange }: { heightCm: number; onChange: (cm: number) => void }) {
  return (
      <label className="space-y-1.5 text-sm">
        <span className="flex items-center gap-2 font-semibold"><Ruler className="w-4 h-4 text-sage-300" aria-hidden="true" />Tinggi HP dari lantai saat merekam (cm)</span>
        <input type="number" inputMode="numeric" min={50} max={250} value={heightCm || ""}
          onChange={(e) => onChange(Number(e.target.value))} aria-describedby="capture-height-hint"
          className="w-full rounded-xl bg-white/10 border border-white/25 px-3 py-2.5 text-base text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-300" />
        <span id="capture-height-hint" className="block text-xs text-neutral-300">
          Kira-kira tinggi mata Anda (tinggi badan − 10 cm). Angka ini dipakai untuk mengukur ruangan dari panorama.
        </span>
      </label>
  );
}

interface CaptureReviewPanelProps {
  defaultName: string;
  mode: "upload" | "local";
  phase: "review" | "uploading" | "done";
  progress: number;
  preview: string;
  error: string;
  onSave: (name: string) => void;
  onRetake: () => void;
  onRecordAnother: () => void;
  onClose: () => void;
}

// CaptureReviewPanel names the recorded room, saves or uploads it, and offers to record the next room.
export function CaptureReviewPanel(props: CaptureReviewPanelProps) {
  const { defaultName, mode, phase, progress, error, onSave, onRetake } = props;
  const [name, setName] = useState(defaultName);
  if (phase === "done") return <CaptureDonePanel {...props} />;
  return (
    <div className="absolute inset-0 bg-white p-6 flex flex-col justify-center gap-4">
      <h2 className="text-xl font-extrabold text-neutral-950">Sapuan ruangan selesai</h2>
      <SweepThumbnail preview={props.preview} />
      <Input
        id="capture-room-name"
        label="Nama ruangan"
        value={name}
        maxLength={40}
        disabled={phase === "uploading"}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
        placeholder="Contoh: Ruang Tamu"
      />
      {error && <p role="alert" className="text-sm text-rose-600 font-medium">{error}</p>}
      {phase === "uploading" && (
        <div className="space-y-1" role="status" aria-live="polite">
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div className="h-full bg-sage-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-xs text-neutral-600">Mengunggah {Math.round(progress * 100)}%…</p>
        </div>
      )}
      <Button type="button" size="lg" onClick={() => onSave(name.trim())} isLoading={phase === "uploading"} disabled={!name.trim()}>
        <UploadCloud className="w-4 h-4" aria-hidden="true" />
        {mode === "local" ? "Simpan Ruangan" : "Unggah & Proses Panorama"}
      </Button>
      <Button type="button" variant="outline" onClick={onRetake} disabled={phase === "uploading"}>
        <RotateCcw className="w-4 h-4" aria-hidden="true" />
        Rekam Ulang
      </Button>
    </div>
  );
}

// CaptureDonePanel confirms the room was saved (locally or uploaded) and lets the seller record the next room.
function CaptureDonePanel({ mode, onRecordAnother, onClose }: CaptureReviewPanelProps) {
  return (
    <div className="absolute inset-0 bg-neutral-950/90 text-white p-6 flex flex-col justify-center items-center gap-4 text-center">
      <CheckCircle2 className="w-12 h-12 text-sage-300" aria-hidden="true" />
      <h2 className="text-xl font-extrabold">{mode === "local" ? "Ruangan tersimpan!" : "Rekaman terkirim!"}</h2>
      <p className="text-sm text-neutral-200 max-w-sm">
        {mode === "local"
          ? "Rekaman disimpan sementara di HP ini dan akan diunggah otomatis saat Anda menekan Simpan Properti."
          : "Sistem sedang menyatukan panorama tiap putaran menjadi satu ruangan 360°. Status ruangan akan diperbarui setelah selesai."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button type="button" size="lg" className="flex-1" onClick={onRecordAnother}>
          <Camera className="w-4 h-4" aria-hidden="true" />
          Rekam Ruangan Lain
        </Button>
        <Button type="button" size="lg" variant="outline" className="flex-1" onClick={onClose}>
          Selesai
        </Button>
      </div>
    </div>
  );
}
