import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';
import { AppState } from 'react-native';
import { waitForCaptureForeground } from '../../../../shared/captureLifecycle.ts';
import { multiplyQuat, relativeHeadingRotation } from '../../../../shared/captureMath.ts';
import { nativePose } from './nativePose';
import type { OrientationQuat } from '../../../../shared/capturePolicy.ts';

export interface MotionSample { quaternion: OrientationQuat; timestamp: number; orientation: number }

// subscribeMotion requests live hardware data and anchors only heading while retaining the vertical gravity axis.
export async function subscribeMotion(onSample: (sample: MotionSample) => void): Promise<() => void> {
  const permission = await DeviceMotion.requestPermissionsAsync();
  if (!permission.granted || !(await DeviceMotion.isAvailableAsync())) throw new Error('Sensor gerak tidak tersedia atau izinnya ditolak.');
  await waitForCaptureForeground(AppState);
  let anchor: OrientationQuat | null = null;
  let lastSensorTimestamp = -1;
  DeviceMotion.setUpdateInterval(30);
  const subscription = DeviceMotion.addListener((event: DeviceMotionMeasurement) => {
    if (!event.rotation || event.rotation.timestamp === lastSensorTimestamp) return;
    lastSensorTimestamp = event.rotation.timestamp;
    const raw = nativePose(event.rotation, event.orientation);
    if (!raw.every(Number.isFinite)) return;
    anchor ??= relativeHeadingRotation(raw);
    onSample({ quaternion: multiplyQuat(anchor, raw), timestamp: performance.now(), orientation: event.orientation });
  });
  return () => subscription.remove();
}
