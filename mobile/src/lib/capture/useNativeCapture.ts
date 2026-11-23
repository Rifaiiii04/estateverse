import { useEffect, useMemo, useState, type RefObject } from 'react';
import { AppState } from 'react-native';
import type { CameraView } from 'expo-camera';
import { initialSweepState, NativeSweepSession } from './nativeSweepSession';

// useNativeCapture connects the panorama session to the camera modal and app lifecycle.
export function useNativeCapture(camera: RefObject<CameraView | null>) {
  const [state, setState] = useState(initialSweepState);
  const session = useMemo(() => new NativeSweepSession(camera, setState), [camera]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'background') session.interrupt();
    });
    return () => { subscription.remove(); session.dispose(); };
  }, [session]);
  return { ...state, start: session.start, collect: session.collect, setError: session.setError, calibrate: session.calibrate };
}
