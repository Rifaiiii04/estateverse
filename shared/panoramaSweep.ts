import { poseAngles, quaternionDistance, targetDistance } from './captureMath.ts';
import type { OrientationQuat } from './capturePolicy.ts';
import { isSweepLevel } from './captureSweep.ts';
import { BandCanvas, planBands, type PanoramaBand, type PanoramaPixels } from './panoramaBand.ts';
import { measureSweepLens, registerView, registrationSample } from './panoramaRegistration.ts';
import { checkSweepImage, isFrozenFrame, type SweepImage, type SweepPixels } from './sweepImage.ts';

export type { PanoramaBand, PanoramaPixels } from './panoramaBand.ts';
const PITCH_WINDOW = 3;
const FULL_TURN = 359;

// Measures a signed heading increment through the wrap between 359° and 0°.
function deltaYaw(current: number, previous: number) {
  return ((current - previous + 540) % 360) - 180;
}

// Streams camera samples into one finished, world-aligned image per complete physical turn.
export class PanoramaSweep {
  readonly width: number;
  bands: readonly PanoramaBand[] = [];
  index = 0;
  private canvas: BandCanvas | null = null;
  private fov = 0;
  private initial: SweepImage[] = [];
  private samples: SweepImage[] = [];
  private lastPixels: SweepPixels | null = null;
  private last: number | null = null;
  private traveled = 0;
  private shape = '';

  // Sets the final longitude resolution shared by every band in this room.
  constructor(width = 3072) {
    if (!Number.isInteger(width) || width % 2 || width < 128 || width > 4096) throw new Error('Ukuran panorama tidak didukung.');
    this.width = width;
  }

  // Returns the camera inclination of the active sweep.
  get pitch() {
    if (this.canvas && this.traveled >= FULL_TURN && this.canvas.coverage < 1) {
      return this.canvas.missingDirection().pitch;
    }
    return this.bands[this.index]?.pitch ?? 0;
  }

  // Reports completion only after returning to the start and capturing every pixel in the crop.
  get ready() { return !!this.canvas && this.traveled >= FULL_TURN && this.canvas.coverage === 1; }

  // Indicates that every completed strip has been handed to its platform encoder.
  get done() { return this.bands.length > 0 && this.index === this.bands.length; }

  // Reports actual motion and observed coverage, reserving completion for a closed turn.
  get progress() {
    if (this.done || this.ready) return 1;
    return Math.min(.99, this.traveled / 360, this.canvas?.coverage ?? 1);
  }

  // Checks that a new camera image would extend the strip or repair its remaining gap.
  wants(pose: OrientationQuat) {
    if (this.ready || this.done) return false;
    const angles = poseAngles(pose);
    if (this.canvas && this.traveled >= FULL_TURN) {
      const gap = this.canvas.missingDirection();
      return targetDistance(pose, gap.yaw, gap.pitch) < this.fov / 4;
    }
    if (Math.abs(angles.pitch - this.pitch) > PITCH_WINDOW || !isSweepLevel(pose, angles.yaw)) return false;
    if (this.last === null) return true;
    const arc = deltaYaw(angles.yaw, this.last);
    if (!this.fov && Math.abs(arc) > this.maxGap()) return true;
    const minStep = this.fov ? Math.min(10, this.fov * .23) : 9;
    return arc >= Math.min(minStep, Math.max(1, FULL_TURN - this.traveled)) && arc <= this.maxGap();
  }

  // Tells the photographer where to resume after tilt, roll, or a skipped sector.
  guide(pose: OrientationQuat) {
    if (this.done) return 'Semua panorama ruangan selesai.';
    const { yaw, pitch } = poseAngles(pose);
    if (this.canvas && this.traveled >= FULL_TURN && !this.ready) {
      const gap = this.canvas.missingDirection();
      if (Math.abs(gap.pitch - pitch) > this.fov / 5) return gap.pitch > pitch ?
        'Angkat kamera untuk melengkapi tepi atas panorama.' : 'Turunkan kamera untuk melengkapi tepi bawah panorama.';
      const offset = deltaYaw(gap.yaw, yaw);
      return this.wants(pose) ? 'Pertahankan arah ini sejenak untuk melengkapi tepi panorama.' :
        offset > 0 ? 'Geser ke kanan untuk mengisi bagian yang kosong.' : 'Geser ke kiri untuk mengisi bagian yang kosong.';
    }
    if (pitch < this.pitch - PITCH_WINDOW) return 'Angkat arah kamera sedikit sampai sejajar dengan panduan.';
    if (pitch > this.pitch + PITCH_WINDOW) return 'Turunkan arah kamera sedikit sampai sejajar dengan panduan.';
    if (!isSweepLevel(pose, yaw)) return 'Luruskan sisi HP agar panorama tetap datar.';
    if (this.last !== null) {
      const delta = deltaYaw(yaw, this.last);
      if (!this.fov && Math.abs(delta) > this.maxGap()) return 'Mulai sapuan dari arah ini dan putar perlahan ke kanan.';
      if (delta > this.maxGap() || delta < -5) {
        const offset = deltaYaw((this.last + 10) % 360, yaw);
        return offset < 0 ? 'Kembali ke kiri ke ujung panorama yang sudah terekam.' : 'Putar ke kanan menuju ujung panorama yang sudah terekam.';
      }
    }
    return 'Putar perlahan ke kanan dengan lensa tetap di satu posisi.';
  }

  // Verifies real camera pixels before advancing travel or modifying the deliverable.
  add(frame: SweepImage): string {
    if (!this.wants(frame.pose)) return this.guide(frame.pose);
    const { pixels } = frame;
    if (pixels.width < 48 || pixels.height <= pixels.width || pixels.data.length !== pixels.width * pixels.height * 4) {
      return 'Pegang HP tegak dan gunakan gambar kamera portrait.';
    }
    const shape = pixels.width + 'x' + pixels.height;
    if (this.shape && this.shape !== shape) throw new Error('Ukuran kamera berubah. Mulai ulang ruangan dengan orientasi yang sama.');
    this.shape = shape;
    const sample = registrationSample(frame);
    const issue = checkSweepImage(sample, [], null, 0);
    if (issue) return issue;
    if (!this.fov) return this.calibrate(frame, sample);
    if (this.lastPixels && isFrozenFrame(sample.pixels, this.lastPixels)) {
      return 'Gambar kamera belum berubah. Periksa kamera, lalu ulangi bagian ini.';
    }
    const nearest = this.samples.reduce<SweepImage | undefined>((best, prior) =>
      !best || quaternionDistance(prior.pose, frame.pose) < quaternionDistance(best.pose, frame.pose) ? prior : best, undefined);
    const pose = nearest ? registerView(sample, nearest, this.fov) : frame.pose;
    if (!pose) return 'Gambar belum menyambung. Kembali ke ujung sapuan dan putar lebih pelan.';
    this.draw({ ...frame, pose }, { ...sample, pose }, poseAngles(frame.pose).yaw);
    return '';
  }

  // Limits the allowed distance between exposures so the same features stay visible in both.
  private maxGap() { return this.fov ? Math.min(32, this.fov * .65) : 23; }

  // Uses the first few moving views to measure the lens locally and replay their original camera pixels.
  private calibrate(frame: SweepImage, sample: SweepImage): string {
    const yaw = poseAngles(frame.pose).yaw;
    if (this.last !== null && Math.abs(deltaYaw(yaw, this.last)) > this.maxGap()) this.clearCalibration();
    const issue = checkSweepImage(sample, this.samples, null, 0);
    if (issue) return issue;
    const initial = [...this.initial, frame], samples = [...this.samples, sample];
    if (samples.length < 3) {
      this.initial = initial;
      this.samples = samples;
      this.advanceHeading(yaw);
      return '';
    }
    const fov = measureSweepLens(samples);
    if (!fov) {
      this.clearCalibration();
      return 'Mulai sapuan dari bagian yang memiliki detail, misalnya pintu atau jendela.';
    }
    this.bands = planBands(fov, frame.pixels.width / frame.pixels.height);
    this.fov = fov;
    this.canvas = new BandCanvas(this.width, this.bands[0]);
    this.clearCalibration();
    initial.forEach((view, i) => this.draw(view, samples[i], poseAngles(view.pose).yaw));
    return '';
  }

  // Discards an unmeasured sequence so the seller can restart on a textured part of the room.
  private clearCalibration() {
    this.initial = [];
    this.samples = [];
    this.last = null;
    this.traveled = 0;
  }

  // Projects one accepted exposure and retains only small reference images for matching and loop closure.
  private draw(frame: SweepImage, sample: SweepImage, yaw: number) {
    this.canvas!.add(frame, this.fov);
    this.lastPixels = sample.pixels;
    if (this.traveled < FULL_TURN) this.samples.push(sample);
    this.advanceHeading(yaw);
  }

  // Counts only consecutive observations in the chosen sweep direction.
  private advanceHeading(yaw: number) {
    if (this.last !== null && this.traveled < FULL_TURN) this.traveled += Math.max(0, deltaYaw(yaw, this.last));
    this.last = yaw;
  }

  // Provides a lightweight live crop without holding a second full-size panorama in memory.
  preview(width = 320): PanoramaPixels {
    if (this.canvas) return this.canvas.preview(width);
    const initial = new BandCanvas(width, { index: 0, pitch: 0, min_pitch: -33, max_pitch: 33 });
    this.initial.forEach(view => initial.add(view, 48));
    return initial.pixels;
  }

  // Transfers the strip while retaining the last thumbnail to detect a stalled camera between passes.
  finish() {
    if (!this.ready || !this.canvas) throw new Error('Lengkapi satu putaran panorama sebelum menyimpan.');
    const result = { meta: this.bands[this.index], pixels: this.canvas.pixels };
    this.index++;
    this.samples = []; this.last = null; this.traveled = 0;
    this.canvas = this.done ? null : new BandCanvas(this.width, this.bands[this.index]);
    if (this.done) this.lastPixels = null;
    return result;
  }
}
