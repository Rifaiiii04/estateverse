import { checkAborted } from "../abort.ts";

// Opens the full rear sensor and releases this recording's tracks even if permission or playback finishes late.
export async function startRearCamera(video: HTMLVideoElement, signal?: AbortSignal): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { exact: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      resizeMode: "none",
    } as MediaTrackConstraints,
  });
  let released = false;
  // Detaches only our stream so a late camera response cannot disturb a subsequent recording.
  const release = () => {
    if (released) return;
    released = true;
    signal?.removeEventListener("abort", release);
    if (video.srcObject === stream) video.srcObject = null;
    stream.getTracks().forEach((track) => track.stop());
  };
  try {
    checkAborted(signal);
    signal?.addEventListener("abort", release, { once: true });
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    checkAborted(signal);
    return stream;
  } catch (error) {
    release();
    throw error;
  }
}

// captureSupportIssue explains why this device/browser cannot record, or returns null when it can.
export function captureSupportIssue(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.isSecureContext) return "Perekaman 360° hanya bisa lewat alamat https://.";
  if (!navigator.mediaDevices?.getUserMedia) return "Browser ini tidak mengizinkan akses kamera.";
  if (!("DeviceOrientationEvent" in window)) return "Perangkat ini tidak memiliki sensor gerak.";
  if (/Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent)) {
    return "Buka halaman ini di Chrome atau Safari (bukan browser bawaan aplikasi) untuk merekam.";
  }
  return null;
}

// isLikelyDesktop guesses whether the visitor is on a computer without motion sensors.
export function isLikelyDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(pointer: coarse)").matches;
}
