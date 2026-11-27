import type { OrientationSample } from "./orientation";
import { screenAngle } from "./orientation.ts";
import { checkAborted } from "../abort.ts";

// Stops a sweep on page suspension, camera loss or rotation, including when video callbacks have stopped.
export function watchCamera(stream: MediaStream, angle: number, signal: AbortSignal,
  interrupted: (message: string) => void, framesStalled: () => boolean) {
  const track = stream.getVideoTracks()[0];
  // A discontinued camera sequence needs a new recording from a known origin.
  const interrupt = () => interrupted("Kamera terputus atau layar berputar. Pegang HP tegak dan mulai sapuan baru.");
  // Checks device state after a foreground change and catches devices that omit track-ended events.
  const check = () => {
    if (document.hidden || track?.readyState !== "live" || screenAngle() !== angle) interrupt();
    else if (framesStalled()) interrupted("Kamera berhenti mengirim gambar. Buka kembali kamera untuk mengulang sapuan.");
  };
  window.addEventListener("pagehide", interrupt);
  document.addEventListener("visibilitychange", check);
  track?.addEventListener("ended", interrupt);
  const timer = setInterval(check, 500);
  signal.addEventListener("abort", () => {
    clearInterval(timer);
    window.removeEventListener("pagehide", interrupt);
    document.removeEventListener("visibilitychange", check);
    track?.removeEventListener("ended", interrupt);
  }, { once: true });
  check();
}

// waitForSensor resolves once orientation data arrives, or rejects on devices without motion sensors.
export function waitForSensor(live: { sample: OrientationSample | null }, signal: AbortSignal): Promise<void> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    checkAborted(signal);
    let handle = 0;
    // Cancels the pending sensor check when the modal closes or the camera disconnects.
    const cancel = () => {
      cancelAnimationFrame(handle);
      reject(signal.reason);
    };
    signal.addEventListener("abort", cancel, { once: true });
    // poll waits for the first hardware orientation sample within the startup deadline.
    const poll = () => {
      if (live.sample) {
        signal.removeEventListener("abort", cancel);
        return resolve();
      }
      if (performance.now() - started > 2500) {
        signal.removeEventListener("abort", cancel);
        return reject(new Error("Sensor gerak tidak terdeteksi. Gunakan HP (bukan laptop) untuk merekam."));
      }
      handle = requestAnimationFrame(poll);
    };
    poll();
  });
}

// describeStartError turns camera and permission failures into Indonesian guidance.
export function describeStartError(err: unknown): string {
  if (err instanceof DOMException && err.name === "NotAllowedError") {
    return "Izin kamera ditolak. Buka pengaturan browser, izinkan kamera, lalu coba lagi.";
  }
  if (err instanceof DOMException && err.name === "NotFoundError") return "Kamera tidak ditemukan di perangkat ini.";
  return err instanceof Error ? err.message : "Perekaman tidak dapat dimulai.";
}
