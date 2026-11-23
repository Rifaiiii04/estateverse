import type { RefObject } from 'react';
import type { CameraView } from 'expo-camera';
import { buildCaptureTargets, calibratedTargets, type CaptureTarget } from '../../../../shared/capturePolicy.ts';
import { checkSweepImage, type SweepImage } from '../../../../shared/sweepImage.ts';
import { calibrateTourCapture } from '@/lib/api/tours';
import type { CapturedFrame } from '@/types/capture';
import { prepareSweepPhoto, removeCaptureFiles, takeCameraFrame } from './camera';
import { subscribeMotion, type MotionSample } from './motion';
import { readSweepPixels } from './sweepPixels';
import { SweepMotion } from './sweepMotion';

type Phase = 'intro' | 'starting' | 'capturing' | 'calibrating' | 'review';
type CameraRef = RefObject<CameraView | null>;

// initialSweepState creates an empty draft and the first overlapping calibration directions.
export function initialSweepState() {
  return { phase: 'intro' as Phase, targets: buildCaptureTargets(), frames: [] as CapturedFrame[],
    sample: null as MotionSample | null, speed: 0, error: '' };
}
type State = ReturnType<typeof initialSweepState>;

// NativeSweepSession owns one room's JPEGs, hardware listeners and image-guided sweep.
export class NativeSweepSession {
  private state = initialSweepState();
  private history: SweepImage[] = [];
  private motion = new SweepMotion();
  private epoch = 0;
  private busy = false;
  private retryAfter = 0;
  private nextHint = 0;
  private fov: number | null = null;
  private unsubscribe?: () => void;
  private watchdog?: ReturnType<typeof setInterval>;
  private camera: CameraRef;
  private publish: (value: State) => void;

  // Constructs a session for the mounted rear camera and its React state sink.
  constructor(camera: CameraRef, publish: (value: State) => void) {
    this.camera = camera;
    this.publish = publish;
  }

  // update emits a consistent snapshot without mutating anything rendered by React.
  private update(change: Partial<State>) {
    this.state = { ...this.state, ...change };
    this.publish(this.state);
  }

  // setError presents a camera initialization failure in the same status area as capture failures.
  setError = (error: string) => this.update({ error });

  // start opens a fresh sensor session and guards asynchronous permission setup.
  start = async () => {
    this.dispose();
    const session = this.epoch;
    this.motion = new SweepMotion();
    this.busy = false;
    this.retryAfter = this.nextHint = 0;
    this.fov = null;
    this.update({ ...initialSweepState(), phase: 'starting' });
    try {
      const unsubscribe = await subscribeMotion(sample => {
        if (this.epoch === session) this.onSample(sample);
      });
      if (this.epoch !== session) { unsubscribe(); return; }
      this.unsubscribe = unsubscribe;
      const started = performance.now();
      this.watchdog = setInterval(() => {
        const last = this.motion.latest?.timestamp ?? started;
        if (performance.now() - last > 3000) this.abort('Sensor berhenti merespons. Mulai ulang sapuan.');
      }, 750);
      this.update({ phase: 'capturing' });
    } catch (failure) {
      if (session === this.epoch) this.abort(failure instanceof Error ? failure.message : 'Kamera panorama belum siap.');
    }
  };

  // onSample updates the guidance display and takes the next eligible picture once per shutter cycle.
  private onSample(sample: MotionSample) {
    this.motion.observe(sample);
    if (this.state.phase !== 'capturing') return;
    if (sample.orientation !== 0) { this.abort('Pegang HP tegak lalu mulai ulang sapuan.'); return; }
    if (sample.timestamp >= this.nextHint) {
      this.nextHint = sample.timestamp + 100;
      this.update({ sample, speed: this.motion.speed });
    }
    const target = this.state.targets[this.state.frames.length];
    if (this.busy || !target || sample.timestamp < this.retryAfter || !this.motion.canExpose(target)) return;
    void this.takeShot(sample, target);
  }

  // takeShot checks motion before processing and releases every image that cannot enter the room draft.
  private async takeShot(sample: MotionSample, target: CaptureTarget) {
    const camera = this.camera.current, session = this.epoch;
    if (!camera) return;
    this.busy = true;
    const motion = this.motion, speed = motion.speed;
    motion.beginShutter(sample);
    const temporary = new Set<string>();
    try {
      const photo = await takeCameraFrame(camera);
      temporary.add(photo.uri);
      if (session !== this.epoch) return;
      motion.finishShutter(performance.now());
      const upright = await prepareSweepPhoto(photo);
      temporary.add(upright.uri);
      if (session !== this.epoch) return;
      const image = { pixels: await readSweepPixels(upright.uri), pose: sample.quaternion };
      if (session !== this.epoch) return;
      const error = checkSweepImage(image, this.history, this.fov, speed);
      if (error) throw new Error(error);
      this.acceptFrame({ ...upright, orientation: sample.quaternion, targetId: target.id }, image);
      temporary.delete(upright.uri);
      if (this.state.frames.length === 3) await this.calibrate();
      else if (this.state.frames.length === this.state.targets.length) {
        this.releaseHardware();
        this.update({ phase: 'review' });
      }
    } catch (failure) {
      if (session === this.epoch) this.setError(failure instanceof Error ? failure.message : 'Gambar gagal diambil.');
    } finally {
      removeCaptureFiles([...temporary].map(uri => ({ uri })));
      if (session === this.epoch) {
        this.retryAfter = performance.now() + 320;
        this.busy = false;
      }
    }
  }

  // acceptFrame advances the strip only after every image and sensor check has passed.
  private acceptFrame(frame: CapturedFrame, image: SweepImage) {
    const first = this.state.frames[0];
    if (first && (first.width !== frame.width || first.height !== frame.height)) {
      throw new Error('Ukuran gambar berubah. Kembalikan HP ke orientasi awal.');
    }
    this.history.push(image);
    this.update({ frames: [...this.state.frames, frame], error: '' });
  }

  // calibrate retains the first accepted images when the connection fails so the seller can retry.
  calibrate = async () => {
    const session = this.epoch;
    if (this.state.frames.length !== 3 || (this.state.phase === 'calibrating' && !this.state.error)) return;
    this.update({ phase: 'calibrating', error: '' });
    try {
      const plan = await calibrateTourCapture(this.state.frames);
      if (session !== this.epoch) return;
      const targets = calibratedTargets(plan);
      this.fov = plan.calibrated ? plan.horizontal_fov : null;
      this.update({ phase: 'capturing', targets });
    } catch (failure) {
      if (session === this.epoch) this.setError(failure instanceof Error ? failure.message : 'Pengukuran lensa gagal.');
    }
  };

  // interrupt discards a capture whose sensor anchor became invalid while the camera was backgrounded.
  interrupt = () => {
    if (this.state.phase === 'capturing' || this.state.phase === 'calibrating') {
      this.abort('Aplikasi masuk latar belakang. Mulai ulang sapuan dari posisi lensa semula.');
    }
  };

  // abort releases lost hardware and returns to the introduction with the recorded reason.
  private abort(error: string) {
    this.dispose();
    this.update({ ...initialSweepState(), error });
  }

  // releaseHardware invalidates pending shutter calls and drops the sensor listener and thumbnails.
  private releaseHardware() {
    this.epoch++;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    clearInterval(this.watchdog);
    this.history = [];
  }

  // dispose releases files still owned by this room on cancellation, restart or unmount.
  dispose = () => {
    this.releaseHardware();
    removeCaptureFiles(this.state.frames);
    this.state = initialSweepState();
  };

  // collect transfers a completed draft's file ownership to the property editor.
  collect = () => {
    if (this.state.phase !== 'review') throw new Error('Sapuan belum lengkap.');
    const frames = this.state.frames;
    this.update(initialSweepState());
    return frames;
  };
}
