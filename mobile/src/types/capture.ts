import type { OrientationQuat } from '../../../shared/capturePolicy.ts';
import type { PanoramaBand } from '../../../shared/panoramaSweep.ts';
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
  captureId?: string;
  name: string;
  roomSpecs: string;
  panoramaUrl: string;
  frames?: CapturedFrame[];
  bands?: CapturedBand[];
  status?: 'processing' | 'ready' | 'failed';
  errorMessage?: string;
}

export interface CapturedBand { uri: string; meta: PanoramaBand }
export const MAX_TOUR_ROOMS = 8;

// localTourFiles lists only the uploads still owned by a local room draft.
export function localTourFiles(room: DraftTourRoom) {
  return room.bands ?? room.frames ?? [];
}
