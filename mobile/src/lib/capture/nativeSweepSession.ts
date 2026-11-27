import { PanoramaSweep, type PanoramaPixels } from '../../../../shared/panoramaSweep.ts';
import type { SweepPixels } from '../../../../shared/sweepImage.ts';
import { SWEEP_MAX_SPEED_DEG_S } from '../../../../shared/captureSweep.ts';
import type { CapturedBand } from '@/types/capture';
import type { MotionSample } from './motion';
import type { CameraSampleFile } from './camera';
import { SweepMotion } from './sweepMotion.ts';
import { cameraDeadline } from './cameraDeadline.ts';

type Phase = 'intro' | 'starting' | 'capturing' | 'saving' | 'review';
type LocalImage = { uri: string };
export interface SweepHardware {
  listen: (callback: (sample: MotionSample) => void) => Promise<() => void>;
  capture: () => Promise<CameraSampleFile>;
  pixels: (photo: CameraSampleFile) => Promise<SweepPixels>;
  encode: (pixels: PanoramaPixels, quality: number) => Promise<LocalImage>;
  remove: (files: LocalImage[]) => void;
}

// initialSweepState describes a new room before the camera measures the lens and plans its panoramas.
export function initialSweepState() {
  return { phase: 'intro' as Phase, bands: [] as CapturedBand[], count: 0, pitch: 0, progress: 0,
    preview: '', hint: 'Arahkan kamera setinggi mata.', error: '' };
}
type State = ReturnType<typeof initialSweepState>;

// NativeSweepSession streams overlapping camera samples into one spherical strip at a time.
export class NativeSweepSession {
  private state = initialSweepState();
  private sweep: PanoramaSweep | null = null;
  private pending: ReturnType<PanoramaSweep['finish']> | null = null;
  private motion = new SweepMotion();
  private epoch = 0;
  private busy = false;
  private encoding = false;
  private nextExposure = 0;
  private nextHint = 0;
  private unsubscribe?: () => void;
  private watchdog?: ReturnType<typeof setInterval>;
  private hardware: SweepHardware;
  private publish: (value: State) => void;

  // Constructs a recorder bound to the mounted rear camera.
  constructor(hardware: SweepHardware, publish: (value: State) => void) {
    this.hardware = hardware;
    this.publish = publish;
  }

  // update sends an immutable snapshot of the current sweep to the camera controls.
  private update(change: Partial<State>) {
    this.state = { ...this.state, ...change };
    this.publish(this.state);
  }

  // setError displays hardware initialization or recording failures in the camera view.
  setError = (error: string) => this.update({ error });

  // cameraFailed returns a recording with an unavailable camera to the retry screen.
  cameraFailed = (error: string) => {
    if (this.state.phase === 'starting' || this.state.phase === 'capturing') this.abort(error);
    else if (this.state.phase === 'intro') this.setError(error);
  };

  // start opens a fresh offline recording with a bounded panorama buffer and one sensor listener.
  start = async () => {
    if (this.state.phase !== 'intro') return;
    this.dispose();
    const session = this.epoch;
    this.motion = new SweepMotion();
    this.busy = false;
    this.nextHint = this.nextExposure = 0;
    this.update({ ...initialSweepState(), phase: 'starting' });
    try {
      this.sweep = new PanoramaSweep(2048);
      const unsubscribe = await this.hardware.listen(sample => {
        if (session === this.epoch) this.onSample(sample);
      });
      if (session !== this.epoch) { unsubscribe(); return; }
      this.unsubscribe = unsubscribe;
      const started = performance.now();
      this.watchdog = setInterval(() => {
        const last = this.motion.latest?.timestamp ?? started;
        if (this.state.phase === 'capturing' && performance.now() - last > 3000) {
          this.abort('Sensor berhenti merespons. Mulai ulang sapuan.');
        }
      }, 750);
      this.update({ phase: 'capturing' });
    } catch (failure) {
      if (session === this.epoch) this.abort(failure instanceof Error ? failure.message : 'Kamera panorama belum siap.');
    }
  };

  // onSample starts the next useful exposure as the seller sweeps continuously across the current band.
  private onSample(sample: MotionSample) {
    this.motion.observe(sample);
    const sweep = this.sweep;
    if (this.state.phase !== 'capturing' || !sweep) return;
    if (sample.orientation !== 0) { this.abort('Pegang HP tegak lalu mulai ulang sapuan.'); return; }
    if (sample.timestamp >= this.nextHint) {
      this.nextHint = sample.timestamp + 125;
      const hint = this.motion.speed > SWEEP_MAX_SPEED_DEG_S ? 'Perlambat putaran HP.' : sweep.guide(sample.quaternion);
      if (hint !== this.state.hint) this.update({ hint });
    }
    if (this.busy || sample.timestamp < this.nextExposure || !this.motion.canExpose() || !sweep.wants(sample.quaternion)) return;
    void this.capture(sample, sweep);
  }

  // capture checks shutter movement and projects the accepted pixels before discarding the source JPEG.
  private async capture(sample: MotionSample, sweep: PanoramaSweep) {
    const session = this.epoch;
    this.busy = true;
    this.motion.beginShutter(sample);
    let photo: CameraSampleFile | undefined;
    try {
      photo = await cameraDeadline(this.hardware.capture(), 10000, 'Kamera berhenti merespons.', late => this.hardware.remove([late]));
      if (session !== this.epoch) return;
      const pose = this.motion.finishShutter(performance.now());
      const pixels = await cameraDeadline(this.hardware.pixels(photo), 10000, 'Pembacaan gambar kamera terlalu lama.');
      if (session !== this.epoch) return;
      let error: string;
      try { error = sweep.add({ pixels, pose }); }
      catch (failure) { this.abort(failure instanceof Error ? failure.message : 'Mulai ulang rekaman panorama.'); return; }
      if (error) { this.update({ progress: sweep.progress, error }); return; }
      if (sweep.ready) {
        this.pending = sweep.finish();
        await this.saveBand();
        return;
      }
      this.update({ count: sweep.bands.length, pitch: sweep.pitch, progress: sweep.progress, error: '' });
      await this.preview(sweep, session);
    } catch (failure) {
      if (session === this.epoch) this.setError(failure instanceof Error ? failure.message : 'Kamera gagal membaca gambar.');
    } finally {
      if (photo) this.hardware.remove([photo]);
      if (session === this.epoch) {
        this.nextExposure = performance.now() + 120;
        this.busy = false;
      }
    }
  }

  // preview displays a small copy of the actual projected pixels in the current band.
  private async preview(sweep: PanoramaSweep, session: number) {
    const next = await this.encode(sweep.preview(320), 0.75);
    if (session !== this.epoch) { this.hardware.remove([next]); return; }
    const old = this.state.preview;
    this.update({ preview: next.uri });
    if (old) this.hardware.remove([{ uri: old }]);
  }

  // encode discards a late native JPEG when its export has already timed out or been retried.
  private encode(pixels: PanoramaPixels, quality: number) {
    return cameraDeadline(this.hardware.encode(pixels, quality), 15000, 'Penyimpanan gambar terlalu lama. Coba lagi.', late => this.hardware.remove([late]));
  }

  // saveBand keeps the completed pixels available for retry if encoding or disk access fails.
  saveBand = async () => {
    const pending = this.pending, sweep = this.sweep, session = this.epoch;
    if (!pending || !sweep || this.encoding) return;
    this.encoding = true;
    this.update({ phase: 'saving', error: '' });
    try {
      const jpeg = await this.encode(pending.pixels, 0.92);
      if (session !== this.epoch) { this.hardware.remove([jpeg]); return; }
      const bands = [...this.state.bands, { uri: jpeg.uri, meta: pending.meta }];
      if (this.state.preview) this.hardware.remove([{ uri: this.state.preview }]);
      this.pending = null;
      this.update({ bands, count: sweep.bands.length, pitch: sweep.done ? 0 : sweep.pitch, progress: 0,
        preview: '', phase: sweep.done ? 'review' : 'capturing', hint: 'Ikuti arah sapuan berikutnya.' });
      if (sweep.done) this.releaseHardware();
    } catch (failure) {
      if (session === this.epoch) this.setError(failure instanceof Error ? failure.message : 'Panorama gagal disimpan.');
    } finally { if (session === this.epoch) this.encoding = false; }
  };

  // interrupt cancels recording when backgrounding invalidates the common heading reference.
  interrupt = () => {
    if (this.state.phase === 'capturing' || this.state.phase === 'saving') {
      this.abort('Aplikasi masuk latar belakang. Mulai ulang sapuan dari posisi lensa semula.');
    }
  };

  // abort releases the current draft and returns to the introduction with a recovery message.
  private abort(error: string) {
    this.dispose();
    this.update({ ...initialSweepState(), error });
  }

  // releaseHardware invalidates asynchronous samples and releases the sensor and pixel buffers.
  private releaseHardware() {
    this.epoch++;
    this.encoding = false;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    clearInterval(this.watchdog);
    this.sweep = this.pending = null;
  }

  // dispose removes unclaimed local panoramas and the current live thumbnail on cancellation.
  dispose = () => {
    this.releaseHardware();
    if (this.state.preview) this.hardware.remove([{ uri: this.state.preview }]);
    this.hardware.remove(this.state.bands);
    this.state = initialSweepState();
  };

  // collect transfers only finished panorama files to the listing draft.
  collect = () => {
    if (this.state.phase !== 'review') return null;
    const bands = this.state.bands;
    this.update(initialSweepState());
    return bands;
  };
}
