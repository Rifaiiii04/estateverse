import type { OrientationQuat } from '../../../shared/capturePolicy.ts';
export type { OrientationQuat };

export interface CapturedFrame {
  uri: string;
  orientation: OrientationQuat;
  targetId: number;
  width: number;
  height: number;
}

export interface DraftTourRoom {
  id?: number;
  name: string;
  roomSpecs: string;
  panoramaUrl: string;
  frames?: CapturedFrame[];
  status?: 'processing' | 'ready' | 'failed';
  errorMessage?: string;
}
