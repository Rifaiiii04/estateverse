/** Long edge (px) of uploaded frames: sharp enough for a 4096 px panorama, small enough for mobile data. */
import { FRAME_LONG_SIDE, FRAME_JPEG_QUALITY } from "../../../../shared/capturePolicy.ts";
export { FRAME_LONG_SIDE } from "../../../../shared/capturePolicy.ts";

// startRearCamera opens the back camera in a native, uncropped mode and plays it inline in the video element.
// Sizes are matched against the sensor's landscape formats (the browser rotates them to portrait), so asking for a
// portrait 1080×1920 made Chrome Android crop a narrow strip that looked zoomed; resizeMode "none" forbids cropping.
export async function startRearCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { exact: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      resizeMode: "none",
    } as MediaTrackConstraints,
  });
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
    return stream;
  } catch (error) {
    stopStream(stream);
    throw error;
  }
}

// stopStream releases the camera so the phone's camera indicator turns off.
export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

// grabFrame snapshots a newly presented video frame and records its pose immediately before copying pixels.
export function grabFrame(video: HTMLVideoElement, onSnapshot: () => void = () => {}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let callback: number | undefined;
    const timer = setTimeout(() => {
      if (callback !== undefined) video.cancelVideoFrameCallback(callback);
      reject(new Error("Kamera tidak mengirim foto baru. Coba mulai ulang rekaman."));
    }, 1500);
    // Copies pixels and pose in the same browser turn before asynchronous JPEG encoding.
    const snapshot = () => {
      clearTimeout(timer);
      try {
        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) throw new Error("Kamera belum siap.");
        onSnapshot();
        encodeFrame(video).then(resolve, reject);
      } catch (error) {
        reject(error);
      }
    };
    if (typeof video.requestVideoFrameCallback === "function") callback = video.requestVideoFrameCallback(snapshot);
    else snapshot();
  });
}

// encodeFrame scales the current camera pixels to a bounded JPEG without cropping or mirroring them.
function encodeFrame(video: HTMLVideoElement): Promise<Blob> {
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
