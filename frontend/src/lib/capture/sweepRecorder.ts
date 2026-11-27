import type { RefObject } from "react";
import type { CapturedBand } from "@/types/tour";
import { checkAborted } from "../abort.ts";
import { PanoramaSweep } from "../../../../shared/panoramaSweep.ts";
import { SWEEP_MAX_SPEED_DEG_S } from "../../../../shared/captureSweep.ts";
import { describeStartError, waitForSensor, watchCamera } from "./captureStartup.ts";
import { startRearCamera } from "./frameGrabber.ts";
import { requestMotionPermission, screenAngle, subscribeOrientation, toWireQuat, type OrientationSample } from "./orientation.ts";
import { createSpeedTracker } from "./steadiness.ts";
import { SweepPreview } from "./sweepPreview.ts";
import { VideoSweepSource, encodeBand, watchVideo } from "./videoSweep.ts";
import { ExposurePoses } from "./exposurePose.ts";

export type CapturePhase = "intro" | "starting" | "capturing" | "encoding" | "encodeError" | "review" | "uploading" | "done" | "error";
export const initialSweep = {
  phase: "intro" as CapturePhase, index: 0, total: 0, pitch: 0, progress: 0,
  hint: "", error: "", preview: "",
};

type SweepView = typeof initialSweep;
const READ_INTERVAL_MS = 100;
const PREVIEW_INTERVAL_MS = 330;
const POSE_TIMEOUT_MS = 350;

// Drives the panorama compositor from presented video frames and retains one JPEG per completed turn.
export class SweepRecorder {
  readonly bands: CapturedBand[] = [];
  private live: { sample: OrientationSample | null } = { sample: null };
  private view = initialSweep;
  private token = 0;
  private lastRead = -Infinity;
  private lastPreview = -Infinity;
  private sweep: PanoramaSweep | null = null;
  private pending: ReturnType<PanoramaSweep["finish"]> | null = null;
  private speed = 0;
  private poses = new ExposurePoses();
  private preview: SweepPreview | null = null;
  private camera?: AbortController;
  private saving?: AbortController;
  private stopSensor?: () => void;
  private stopVideo?: () => void;
  private videoRef: RefObject<HTMLVideoElement | null>;
  private publish: (view: SweepView) => void;
  private stopExtras: () => void;

  // Connects optical capture and session cleanup to the seller's camera modal.
  constructor(video: RefObject<HTMLVideoElement | null>, publish: (view: SweepView) => void, stopExtras: () => void) {
    this.videoRef = video;
    this.publish = publish;
    this.stopExtras = stopExtras;
  }

  // Publishes only changed feedback so holding the camera still leaves the interface idle.
  update(changes: Partial<SweepView>) {
    if (!(Object.keys(changes) as (keyof SweepView)[]).some((k) => this.view[k] !== changes[k])) return;
    this.view = { ...this.view, ...changes };
    this.publish(this.view);
  }

  // Invalidates pending encodes and releases every media and sensor subscription.
  stop() {
    this.token++;
    this.camera?.abort();
    this.saving?.abort();
    this.camera = this.saving = undefined;
    this.stopVideo?.();
    this.stopSensor?.();
    this.stopVideo = this.stopSensor = undefined;
    this.stopExtras();
  }

  // Starts a fresh panorama on the rear camera and binds the live video exposure loop.
  async start(beginExtras: () => void) {
    this.reset();
    this.update({ phase: "starting" });
    const token = this.token;
    this.camera = new AbortController();
    const signal = this.camera.signal;
    try {
      const permission = requestMotionPermission();
      beginExtras();
      if (!(await permission)) throw new Error("Izinkan sensor gerak untuk menjaga garis sapuan.");
      if (token !== this.token) return;
      const angle = screenAngle();
      if (angle % 180 !== 0) throw new Error("Pegang HP tegak sebelum mulai merekam.");
      const video = this.videoRef.current;
      if (!video) throw new Error("Kamera belum siap.");
      const stream = await startRearCamera(video, signal);
      checkAborted(signal);
      watchCamera(stream, angle, signal, (error) => this.fail(error),
        () => this.view.phase === "capturing" && performance.now() - this.lastRead > 6000);
      checkAborted(signal);
      this.startSensor();
      await waitForSensor(this.live, signal);
      if (token !== this.token) return;
      const source = new VideoSweepSource(video);
      this.sweep = new PanoramaSweep();
      this.preview = new SweepPreview();
      this.lastRead = performance.now() - READ_INTERVAL_MS;
      this.update({ phase: "capturing", hint: "Hadapkan kamera ke depan dan putar perlahan ke kanan." });
      this.stopVideo = watchVideo(video, (now, exposedAt) => this.frame(video, source, now, exposedAt));
    } catch (err) {
      if (token === this.token) this.fail(describeStartError(err));
    }
  }

  // Uses orientation for the camera projection while video exposures determine when the panorama grows.
  private startSensor() {
    const measureSpeed = createSpeedTracker();
    this.stopSensor = subscribeOrientation((sample) => {
      this.live.sample = sample;
      this.poses.add(sample);
      this.speed = measureSpeed(sample);
    }, true);
  }

  // Clears all local panorama data before another room or a retake.
  reset() {
    this.stop();
    this.bands.length = 0;
    this.live.sample = this.preview = this.sweep = this.pending = null;
    this.speed = 0;
    this.poses = new ExposurePoses();
    this.lastRead = this.lastPreview = -Infinity;
    this.update(initialSweep);
  }

  // Ends an interrupted recording and offers a new capture.
  private fail(error: string) {
    this.stop();
    this.update({ phase: "error", error });
  }

  // Offers each newly presented exposure to the in-progress panoramic strip while preserving its sensor pose.
  private frame(video: HTMLVideoElement, source: VideoSweepSource, now: number, exposedAt: number) {
    const sweep = this.sweep;
    if (!sweep || this.view.phase !== "capturing" || now - this.lastRead < READ_INTERVAL_MS) return;
    this.lastRead = now;
    const sample = this.live.sample;
    if (!sample || performance.now() - sample.timestamp > POSE_TIMEOUT_MS) {
      return this.update({ hint: "Gerakkan HP sedikit agar sensor arah kembali aktif." });
    }
    if (this.speed > SWEEP_MAX_SPEED_DEG_S) return this.update({ hint: "Perlambat putaran HP." });
    const exposedPose = this.poses.at(exposedAt);
    if (!exposedPose) return this.update({ hint: "Perlambat putaran agar gambar dan sensor kembali selaras." });
    const pose = toWireQuat(exposedPose);
    const livePose = toWireQuat(sample.quaternion);
    if (!sweep.wants(pose)) return this.update({ hint: sweep.guide(livePose) });
    try {
      const issue = sweep.add(source.read(video, pose));
      if (issue) return this.update({ hint: issue });
      const meta = sweep.bands[sweep.index];
      const changes = { index: sweep.index, total: sweep.bands.length, pitch: sweep.pitch,
        progress: sweep.progress, hint: sweep.guide(livePose), preview: this.view.preview };
      if (sweep.ready || now - this.lastPreview >= PREVIEW_INTERVAL_MS) {
        changes.preview = this.preview!.show(sweep.preview(360), meta, sweep.ready);
        this.lastPreview = now;
      }
      this.update(changes);
      if (sweep.ready) {
        this.pending = sweep.finish();
        if (sweep.done) this.stop();
        void this.saveBand();
      }
    } catch (err) {
      this.fail(describeStartError(err));
    }
  }

  // Encodes a completed band once and retains its pixels if the browser needs an encoding retry.
  async saveBand() {
    if (!this.pending || !this.sweep || this.view.phase === "encoding") return;
    const token = this.token;
    const { pixels, meta } = this.pending;
    this.update({ phase: "encoding", error: "" });
    try {
      const blob = await encodeBand(pixels);
      if (token !== this.token) return;
      this.bands.push({ blob, meta });
      this.pending = null;
      if (this.sweep.done) {
        this.update({ phase: "review" });
      } else {
        this.lastRead = performance.now() - READ_INTERVAL_MS;
        this.update({ phase: "capturing", pitch: this.sweep.pitch, index: this.sweep.index,
          progress: 0, hint: "Sesuaikan kemiringan HP untuk putaran berikutnya." });
      }
    } catch (err) {
      if (token === this.token) this.update({ phase: "encodeError", error: describeStartError(err) });
    }
  }

  // Claims a completed recording synchronously so simultaneous save actions cannot submit the same review twice.
  takeReview(phase: "uploading" | "done") {
    if (this.view.phase !== "review" || !this.bands.length || this.bands.length !== this.view.total) return null;
    this.update({ phase, error: "" });
    return this.bands.slice();
  }

  // Returns to review on upload failure and suppresses results from a recording that has since closed.
  async uploadReview<T>(send: (bands: CapturedBand[], signal: AbortSignal) => Promise<T>): Promise<T | null> {
    const bands = this.takeReview("uploading");
    if (!bands) return null;
    this.saving = new AbortController();
    const { signal } = this.saving;
    try {
      const result = await send(bands, signal);
      if (signal.aborted) return null;
      this.update({ phase: "done" });
      return result;
    } catch (err) {
      if (!signal.aborted) this.update({ phase: "review", error: err instanceof Error ? err.message : "Gagal mengunggah panorama." });
      return null;
    } finally {
      if (!signal.aborted) this.saving = undefined;
    }
  }
}
