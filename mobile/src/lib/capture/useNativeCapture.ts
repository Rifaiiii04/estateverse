import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AppState } from 'react-native';
import type { CameraView } from 'expo-camera';
import { buildCaptureTargets, calibratedTargets, STEADY_HOLD_MS, STEADY_SPEED_DEG_S, toleranceFor } from '../../../../shared/capturePolicy.ts';
import { quaternionDistance, targetDistance } from '../../../../shared/captureMath.ts';
import { shouldInterruptCapture } from '../../../../shared/captureLifecycle.ts';
import { subscribeMotion, type MotionSample } from './motion';
import { removeCaptureFiles, takeCameraFrame } from './camera';
import type { CapturedFrame } from '@/types/capture';
import { calibrateTourCapture } from '@/lib/api/tours';

export type NativeCapturePhase = 'intro' | 'starting' | 'capturing' | 'calibrating' | 'review';

// useNativeCapture records real JPEGs at the shared web targets and leaves all stitching to Go.
export function useNativeCapture(camera: RefObject<CameraView | null>) {
  const [targets,setTargets] = useState(buildCaptureTargets);
  const targetPlan = useRef(buildCaptureTargets());
  const planned = useRef(false);
  const [phase, setPhase] = useState<NativeCapturePhase>('intro');
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [sample, setSample] = useState<MotionSample | null>(null);
  const [error, setError] = useState('');
  const [speed, setSpeed] = useState(0);
  const raw = useRef<CapturedFrame[]>([]);
  const pose = useRef<MotionSample | null>(null);
  const stopSensor = useRef<(() => void) | null>(null);
  const epoch = useRef(0);
  const busy = useRef(false);
  const recording = useRef(false);
  const steady = useRef<number | null>(null);
  const movement = useRef(0);
  const shotPose = useRef<MotionSample | null>(null);
  const maxSpeed = useRef(0);
  const dimensions = useRef('');
  const sensorWatch = useRef<ReturnType<typeof setTimeout> | null>(null);

  // stop invalidates in-flight camera calls before removing the hardware sensor listener.
  const stop = useCallback(() => {
    recording.current = false;
    epoch.current++; stopSensor.current?.(); stopSensor.current = null;
    if (sensorWatch.current) clearTimeout(sensorWatch.current);
    sensorWatch.current = null;
  }, []);

  // planCapture replaces the initial targets with the optimized directions computed from the actual JPEG lens footprint.
  const planCapture = useCallback(async (session: number) => {
    setPhase('calibrating');
    const result = await calibrateTourCapture(raw.current);
    if (session !== epoch.current) return;
    const next = calibratedTargets(result);
    targetPlan.current = next; planned.current = true; setTargets(next); setPhase('capturing');
  }, []);

  // takeShot rejects motion throughout the shutter interval and commits only a genuine stable JPEG.
  const takeShot = useCallback(async (initial: MotionSample, targetId: number) => {
    if (!camera.current) return;
    const session = epoch.current;
    busy.current = true;
    movement.current = 0;
    shotPose.current = initial;
    let uri: string | undefined;
    try {
      const photo = await takeCameraFrame(camera.current);
      uri = photo.uri;
      if (session !== epoch.current) return;
      if (movement.current > 2 || !pose.current || performance.now()-pose.current.timestamp > 250) {
        throw new Error('HP bergerak saat foto diambil. Tahan sampai penghitung bertambah.');
      }
      const size = `${photo.width}x${photo.height}`;
      dimensions.current ||= size;
      if (dimensions.current !== size) throw new Error('Ukuran foto berubah. Mulai ulang dengan HP tegak.');
      raw.current.push({ uri, width: photo.width, height: photo.height, orientation: initial.quaternion, targetId });
      uri = undefined;
      setFrames([...raw.current]);
      setError('');
      if (raw.current.length===3 && !planned.current) await planCapture(session);
      else if (planned.current && raw.current.length === targetPlan.current.length) { stop(); setPhase('review'); }
    } catch (failure) {
      if (session === epoch.current) setError(failure instanceof Error ? failure.message : 'Foto gagal. Coba titik ini lagi.');
      if (session === epoch.current && raw.current.length===3 && !planned.current) { stop(); setPhase('intro'); }
    } finally {
      if (uri) removeCaptureFiles([{ uri }]);
      if (session === epoch.current) { busy.current = false; steady.current = null; shotPose.current = null; }
    }
  }, [camera, stop, planCapture]);

  // handleSample uses full quaternion rotation and the same aiming and hold thresholds as the web recorder.
  const handleSample = useCallback((next: MotionSample) => {
    const previous = pose.current;
    pose.current = next;
    setSample(next);
    if (!recording.current) return;
    if (previous) maxSpeed.current = Math.max(quaternionDistance(previous.quaternion, next.quaternion)*1000/Math.max(1, next.timestamp-previous.timestamp), maxSpeed.current*0.7);
    setSpeed(maxSpeed.current);
    if (next.orientation !== 0) {
      stop(); setPhase('intro'); setError('Pegang HP portrait dan mulai ulang rekaman.'); return;
    }
    if (busy.current) {
      if (shotPose.current) movement.current = Math.max(movement.current, quaternionDistance(shotPose.current.quaternion, next.quaternion));
      return;
    }
    const target = targetPlan.current[raw.current.length];
    if (!target) return;
    const aimed = targetDistance(next.quaternion, target.yaw, target.pitch) <= toleranceFor(target);
    if (!aimed || maxSpeed.current > STEADY_SPEED_DEG_S || (previous && next.timestamp-previous.timestamp > 250)) {
      steady.current = null; return;
    }
    steady.current ??= next.timestamp;
    if (next.timestamp-steady.current >= STEADY_HOLD_MS) void takeShot(next, target.id);
  }, [stop, takeShot]);

  // start opens a fresh, permission-checked sensor session without retaining photos from an abandoned attempt.
  const start = useCallback(async () => {
    stop();
    const session = epoch.current;
    targetPlan.current = buildCaptureTargets(); planned.current = false; setTargets(targetPlan.current);
    removeCaptureFiles(raw.current);
    raw.current = []; pose.current = null; steady.current = null; busy.current = false; maxSpeed.current = 0; dimensions.current = '';
    setFrames([]); setError(''); setPhase('starting');
    try {
      const unsubscribe = await subscribeMotion(handleSample);
      if (session !== epoch.current) { unsubscribe(); return; }
      stopSensor.current = unsubscribe;
      recording.current = true;
      setPhase('capturing');
      sensorWatch.current = setTimeout(() => {
        if (!pose.current && session === epoch.current) {
          stop(); setPhase('intro'); setError('Sensor tidak mengirim orientasi. Periksa izin sensor atau gunakan perangkat lain.');
        }
      }, 3000);
    } catch (failure) {
      if (session === epoch.current) { setError(failure instanceof Error ? failure.message : 'Sensor tidak tersedia.'); setPhase('intro'); }
    }
  }, [handleSample, stop]);

  // collect transfers raw-file ownership to the property draft only after every required photograph exists.
  const collect = useCallback(() => {
    if (!planned.current || raw.current.length !== targetPlan.current.length) throw new Error('Rekaman belum lengkap.');
    const result = raw.current; raw.current = []; setFrames([]); setPhase('intro'); return result;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (shouldInterruptCapture(recording.current, state)) { stop(); setPhase('intro'); setError('Aplikasi masuk latar belakang saat merekam. Buka kembali lalu mulai ulang.'); }
    });
    return () => { subscription.remove(); stop(); removeCaptureFiles(raw.current); };
  }, [stop]);

  return { phase, frames, targets, sample, speed, error, start, stop, collect, setError };
}
