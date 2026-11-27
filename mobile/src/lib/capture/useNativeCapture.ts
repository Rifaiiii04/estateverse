import { useEffect, useMemo, useState, type RefObject } from 'react';
import { AppState } from 'react-native';
import type { CameraView } from 'expo-camera';
import { initialSweepState, NativeSweepSession } from './nativeSweepSession';
import { removeCaptureFiles, takeCameraFrame } from './camera';
import { subscribeMotion } from './motion';
import { readSweepPixels, saveSweepJPEG } from './sweepPixels';

// useNativeCapture connects the panorama session to the camera modal and app lifecycle.
export function useNativeCapture(camera: RefObject<CameraView | null>) {
  const [state, setState] = useState(initialSweepState);
  const session = useMemo(() => new NativeSweepSession({
    listen: subscribeMotion, remove: removeCaptureFiles, pixels: readSweepPixels, encode: saveSweepJPEG,
    capture: async () => {
      if (!camera.current) throw new Error('Kamera belum siap.');
      return takeCameraFrame(camera.current);
    },
  }, setState), [camera]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'background') session.interrupt();
    });
    return () => { subscription.remove(); session.dispose(); };
  }, [session]);
  return { ...state, start: session.start, collect: session.collect, cameraFailed: session.cameraFailed, saveBand: session.saveBand };
}
