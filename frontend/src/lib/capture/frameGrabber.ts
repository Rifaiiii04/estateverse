/** Long edge (px) of uploaded frames: sharp enough for a 4096 px panorama, small enough for mobile data. */
export const FRAME_LONG_SIDE = 1280;
const FRAME_JPEG_QUALITY = 0.85;

// startRearCamera opens the back camera at high resolution and plays it inline in the video element.
export async function startRearCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  return stream;
}

// stopStream releases the camera so the phone's camera indicator turns off.
export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

// grabFrame snapshots the current video frame, scaled so its long edge is FRAME_LONG_SIDE, as a JPEG blob.
export function grabFrame(video: HTMLVideoElement): Promise<Blob> {
  const scale = Math.min(1, FRAME_LONG_SIDE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas tidak tersedia di browser ini."));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal mengambil foto dari kamera."))),
      "image/jpeg",
      FRAME_JPEG_QUALITY
    );
  });
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
