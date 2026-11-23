import type { OrientationSample } from "./orientation";

// waitForSensor resolves once orientation data arrives, or rejects on devices without motion sensors.
export function waitForSensor(live: { sample: OrientationSample | null }): Promise<void> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    // poll waits for the first hardware orientation sample within the startup deadline.
    const poll = () => {
      if (live.sample) return resolve();
      if (performance.now() - started > 2500) {
        return reject(new Error("Sensor gerak tidak terdeteksi. Gunakan HP (bukan laptop) untuk merekam."));
      }
      requestAnimationFrame(poll);
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
