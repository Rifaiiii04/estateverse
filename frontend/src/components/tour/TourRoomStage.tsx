"use client";

import React, { useMemo } from "react";
import type { TourRoom } from "@/types/tour";
import { cameraHeightMeters, DEFAULT_CAMERA_HEIGHT_CM, outlineToFloor } from "@/lib/measure/roomGeometry";
import { SphereViewer, ViewerHotspot } from "./SphereViewer";
import { panoramaUrlFor } from "./tourImage";
import type { LookHandle } from "./useLookControls";
import { MeasureOverlay } from "./measure/MeasureOverlay";
import { MeasurePanel } from "./measure/MeasurePanel";
import { useMeasureTool } from "./measure/useMeasureTool";

interface TourRoomStageProps {
  room: TourRoom;
  hotspots: ViewerHotspot[];
  gyro: boolean;
  controls: React.RefObject<LookHandle | null>;
  measuring: boolean;
  raised: boolean;
  ariaLabel: string;
}

// TourRoomStage shows one room's panorama and, in measuring mode, the true-scale measuring tools for that room.
export function TourRoomStage({ room, hotspots, gyro, controls, measuring, raised, ariaLabel }: TourRoomStageProps) {
  const cameraHeightCm = room.camera_height_cm || DEFAULT_CAMERA_HEIGHT_CM;
  const cameraHeightM = cameraHeightMeters(cameraHeightCm);
  const measure = useMeasureTool(cameraHeightM);
  const outline = useMemo(() => outlineToFloor(room.floor_outline ?? [], cameraHeightM), [room.floor_outline, cameraHeightM]);

  return (
    <>
      <SphereViewer
        imageUrl={panoramaUrlFor(room)}
        hotspots={hotspots}
        gyro={gyro}
        controlRef={controls}
        onPick={measuring ? measure.pick : undefined}
        ariaLabel={ariaLabel}
      >
        {measuring && <MeasureOverlay cameraHeightM={cameraHeightM} state={measure.state} outline={outline} />}
      </SphereViewer>
      {measuring && (
        <MeasurePanel
          state={measure.state}
          cameraHeightCm={cameraHeightCm}
          calibrated={room.camera_height_cm > 0}
          raised={raised}
          onMode={measure.setMode}
          onPreset={measure.setPreset}
          onRotate={measure.rotateLast}
          onClear={measure.clear}
        />
      )}
    </>
  );
}
