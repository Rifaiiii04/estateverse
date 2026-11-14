"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Model3DMetadata } from "@/types/property";

interface FirstPersonControlsProps {
  metadata?: Model3DMetadata;
}

// FirstPersonControls provides immersive interior walkthrough with mouse look and keyboard navigation.
export function FirstPersonControls({ metadata }: FirstPersonControlsProps) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ yaw: 0, pitch: 0 });
  const moveSpeed = 2.8;

  const spawnX = metadata?.walk_spawn?.x ?? 0.0;
  const spawnY = metadata?.walk_spawn?.y ?? 1.6;
  const spawnZ = metadata?.walk_spawn?.z ?? 0.8;

  const minX = metadata?.walk_bounds?.min_x ?? -4.2;
  const maxX = metadata?.walk_bounds?.max_x ?? 4.2;
  const minZ = metadata?.walk_bounds?.min_z ?? -3.5;
  const maxZ = metadata?.walk_bounds?.max_z ?? 3.5;

  useEffect(() => {
    camera.position.set(spawnX, spawnY, spawnZ);
    rotation.current = { yaw: 0, pitch: 0 };
    camera.rotation.set(0, 0, 0, "YXZ");

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    const canvas = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;
      previousMouse.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.0025;
      rotation.current.yaw -= deltaX * sensitivity;
      rotation.current.pitch -= deltaY * sensitivity;

      const maxPitch = Math.PI / 3;
      rotation.current.pitch = Math.max(-maxPitch, Math.min(maxPitch, rotation.current.pitch));
      camera.rotation.set(rotation.current.pitch, rotation.current.yaw, 0, "YXZ");
    };
    const onPointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [camera, gl.domElement, spawnX, spawnY, spawnZ]);

  useFrame((state, delta) => {
    const camera = state.camera;
    const k = keys.current;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current.yaw);

    const moveVector = new THREE.Vector3();
    if (k["w"] || k["arrowup"]) moveVector.add(forward);
    if (k["s"] || k["arrowdown"]) moveVector.sub(forward);
    if (k["d"] || k["arrowright"]) moveVector.add(right);
    if (k["a"] || k["arrowleft"]) moveVector.sub(right);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed * delta);
      camera.position.add(moveVector);

      camera.position.x = Math.max(minX, Math.min(maxX, camera.position.x));
      camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
      camera.position.y = spawnY;
    }
  });

  return null;
}
