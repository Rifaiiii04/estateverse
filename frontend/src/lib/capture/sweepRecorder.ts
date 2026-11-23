import type { RefObject } from "react";
import type { CapturedFrame } from "@/types/tour";
import { buildCaptureTargets, calibratedTargets, type CaptureCalibration } from "../../../../shared/capturePolicy.ts";
import { SWEEP_MAX_SPEED_DEG_S } from "../../../../shared/captureSweep.ts";
import type { SweepImage } from "../../../../shared/sweepImage.ts";
import { describeStartError, waitForSensor } from "./captureStartup.ts";
import { startRearCamera, stopStream } from "./frameGrabber.ts";
import { requestMotionPermission, screenAngle, subscribeOrientation, type OrientationSample } from "./orientation.ts";
import { createSpeedTracker } from "./steadiness.ts";
import { recordExposure, STALE_POSE_MS, withinSweepWindow, type LiveSweep } from "./sweepAcquisition.ts";
import { SweepPreview } from "./sweepPreview.ts";

export type CapturePhase = "intro" | "starting" | "capturing" | "calibrating" | "calibrationError" | "review" | "uploading" | "done" | "error";

export const initialSweep = {
  phase: "intro" as CapturePhase,
  targets: buildCaptureTargets(),
  count: 0,
  error: "",
  preview: "",
};

type SweepView = typeof initialSweep;
type MeasureLens = (frames: CapturedFrame[]) => Promise<CaptureCalibration>;
const DEFAULT_PREVIEW_FOV = 48;
const RETRY_DELAY_MS = 220;

// Owns one camera and its accepted images until the room is saved or retaken.
export class SweepRecorder {
  readonly live: LiveSweep = { sample: null, speed: 0 };
  readonly frames: CapturedFrame[] = [];
  private history: SweepImage[] = [];
  private view = initialSweep;
  private token = 0;
  private grabbing = false;
  private lastShot = 0;
  private angle = 0;
  private calibrated = false;
  private measuredFov: number | null = null;
  private previewFov = DEFAULT_PREVIEW_FOV;
  private preview: SweepPreview | null = null;
  private stream: MediaStream | null = null;
  private size = "";
  private unsubscribe?: () => void;
  private watchdog?: ReturnType<typeof setInterval>;
  private speed = createSpeedTracker();
  private videoRef: RefObject<HTMLVideoElement | null>;
  private publish: (view: SweepView) => void;
  private stopExtras: () => void;
  private measureLens: MeasureLens;

  // Connects the recording lifecycle to the live video element and modal state.
  constructor(video: RefObject<HTMLVideoElement | null>, publish: (view: SweepView) => void, stopExtras: () => void, measureLens: MeasureLens) {
    this.videoRef = video;
    this.publish = publish;
    this.stopExtras = stopExtras;
    this.measureLens = measureLens;
  }

  // Publishes one consistent view of phase, preview and progress.
  update(changes: Partial<SweepView>) {
    this.view = { ...this.view, ...changes };
    this.publish(this.view);
  }

  // Invalidates in-flight camera operations before releasing media tracks and sensors.
  stop() {
    this.token++;
    clearInterval(this.watchdog);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    stopStream(this.stream);
    this.stream = null;
    this.stopExtras();
  }

  // Opens a fresh sweep with no images or device state retained from the previous attempt.
  async start(beginExtras: () => void) {
    this.reset();
    this.update({ phase: "starting" });
    const token = this.token;
    try {
      const permission = requestMotionPermission();
      beginExtras();
      if (!(await permission)) throw new Error("Izinkan sensor gerak agar kamera dapat menentukan arah sapuan.");
      if (token !== this.token) return;
      this.angle = screenAngle();
      if (this.angle % 180 !== 0) throw new Error("Pegang HP tegak (portrait) sebelum mulai merekam.");
      const video = this.videoRef.current;
      if (!video) throw new Error("Kamera belum siap.");
      const stream = await startRearCamera(video);
      if (token !== this.token) return stopStream(stream);
      this.stream = stream;
      this.preview = new SweepPreview();
      this.unsubscribe = subscribeOrientation((s) => this.onSample(s), true);
      await waitForSensor(this.live);
      if (token !== this.token) return;
      this.watchdog = setInterval(() => this.checkDevices(), STALE_POSE_MS);
      this.update({ phase: "capturing" });
    } catch (err) {
      if (token === this.token) this.fail(describeStartError(err));
    }
  }

  // Releases recording resources and returns the modal to the introduction.
  reset() {
    this.stop();
    this.grabbing = false;
    this.frames.length = this.history.length = 0;
    this.live.sample = null;
    this.live.speed = 0;
    this.speed = createSpeedTracker();
    this.calibrated = false;
    this.measuredFov = null;
    this.previewFov = DEFAULT_PREVIEW_FOV;
    this.preview = null;
    this.size = "";
    this.lastShot = -Infinity;
    this.update(initialSweep);
  }

  // Ends an interrupted capture with an actionable recovery message.
  private fail(message: string) {
    this.stop();
    this.update({ phase: "error", error: message });
  }

  // Detects interruptions even when the camera or sensor stops sending events entirely.
  private checkDevices() {
    if (document.hidden || this.stream?.getVideoTracks()[0]?.readyState !== "live") {
      return this.fail("Kamera terputus. Buka kamera panorama dan mulai sapuan baru.");
    }
  }

  // Opens the shutter while the camera passes a required heading slowly with the correct tilt.
  private onSample(sample: OrientationSample) {
    this.live.sample = sample;
    this.live.speed = this.speed(sample);
    if (this.view.phase !== "capturing" || this.grabbing || !this.videoRef.current) return;
    if (screenAngle() !== this.angle) return this.fail("Layar berputar. Pegang HP tegak dan mulai ulang sapuan.");
    const target = this.view.targets[this.frames.length];
    if (!target || this.live.speed > SWEEP_MAX_SPEED_DEG_S || !withinSweepWindow(sample, target)) return;
    if (sample.timestamp - this.lastShot < RETRY_DELAY_MS) return;
    this.lastShot = sample.timestamp;
    void this.takeFrame(this.videoRef.current, sample);
  }

  // Advances the sequential plan only after both frame pixels and exposure pose pass verification.
  private async takeFrame(video: HTMLVideoElement, startPose: OrientationSample) {
    const token = this.token;
    const target = this.view.targets[this.frames.length];
    this.grabbing = true;
    const size = video.videoWidth + "x" + video.videoHeight;
    if (this.size && size !== this.size) return this.fail("Ukuran gambar berubah. Mulai sapuan baru dengan HP tegak.");
    try {
      const { image, frame } = await recordExposure({
        video, target, startPose, live: this.live, history: this.history, hfov: this.measuredFov,
        active: () => token === this.token && screenAngle() === this.angle,
      });
      if (token !== this.token) return;
      this.size = size;
      this.frames.push(frame);
      this.history.push(image);
      this.preview!.add(image, this.previewFov);
      this.update({ count: this.frames.length, preview: this.preview!.thumbnail(), error: "" });
      if (this.frames.length === 3 && !this.calibrated) await this.calibrate(token);
      else if (this.frames.length === this.view.targets.length) {
        this.stop();
        this.update({ phase: "review" });
      }
    } catch (err) {
      if (token !== this.token) return;
      const error = err instanceof Error ? err.message : "Foto gagal diambil. Ulangi bagian sapuan ini.";
      this.update({ error });
    } finally {
      if (token === this.token) this.grabbing = false;
    }
  }

  // Reuses the three calibration frames when connectivity returns, without repeating the first sweep.
  retryCalibration() {
    if (this.view.phase === "calibrationError") void this.calibrate(this.token);
  }

  // Reuses the first exposures in the full plan and reprojects their preview with the measured lens.
  private async calibrate(token: number) {
    this.update({ phase: "calibrating", error: "" });
    try {
      const result = await this.measureLens(this.frames);
      if (token === this.token) this.applyCalibration(result);
    } catch (err) {
      if (token === this.token) this.update({ phase: "calibrationError", error: describeStartError(err) });
    }
  }

  // Restores the full path and an updated projection only after the returned measurements validate.
  private applyCalibration(result: CaptureCalibration) {
    const targets = calibratedTargets(result);
    if (!Number.isFinite(result.horizontal_fov) || result.horizontal_fov < 25 || result.horizontal_fov > 140) {
      throw new Error("Pengukuran lensa gagal. Mulai lagi dari bagian ruangan yang memiliki detail.");
    }
    this.calibrated = true;
    this.previewFov = result.horizontal_fov;
    this.measuredFov = result.calibrated ? result.horizontal_fov : null;
    this.preview = new SweepPreview();
    this.history.forEach((image) => this.preview!.add(image, this.previewFov));
    this.update({ phase: "capturing", targets, preview: this.preview.thumbnail() });
  }
}
