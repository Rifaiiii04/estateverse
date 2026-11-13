"use client";

import React, { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, OBJLoader, FBXLoader } from "three-stdlib";
import { Model3DMetadata } from "@/types/property";
import { normalizeModel, applyRoofVisibility } from "./ModelNormalizer";
import { ProceduralHouse } from "./ProceduralHouse";

interface UniversalModelLoaderProps {
  modelUrl?: string;
  roofOff?: boolean;
  metadata?: Model3DMetadata;
}

// UniversalModelLoader loads GLB, glTF, FBX, or OBJ models with normalization and auto-roof detection.
export function UniversalModelLoader({
  modelUrl,
  roofOff = false,
  metadata,
}: UniversalModelLoaderProps) {
  const [sceneObj, setSceneObj] = useState<THREE.Object3D | null>(null);
  const [hasError, setHasError] = useState(false);
  const { invalidate } = useThree();

  useEffect(() => {
    if (!modelUrl) {
      setSceneObj(null);
      setHasError(false);
      return;
    }

    let isMounted = true;
    setHasError(false);

    const ext = modelUrl.split("?")[0].split(".").pop()?.toLowerCase();

    const handleLoadedObject = (obj: THREE.Object3D) => {
      if (!isMounted) return;
      normalizeModel(obj, metadata);
      applyRoofVisibility(obj, roofOff, metadata);
      setSceneObj(obj);
      invalidate();
    };

    const handleError = (err: unknown) => {
      if (!isMounted) return;
      console.error("UniversalModelLoader error:", err);
      setHasError(true);
    };

    if (ext === "glb" || ext === "gltf") {
      new GLTFLoader().load(modelUrl, (gltf) => handleLoadedObject(gltf.scene), undefined, handleError);
    } else if (ext === "fbx") {
      new FBXLoader().load(modelUrl, handleLoadedObject, undefined, handleError);
    } else if (ext === "obj") {
      new OBJLoader().load(modelUrl, handleLoadedObject, undefined, handleError);
    } else {
      new GLTFLoader().load(modelUrl, (gltf) => handleLoadedObject(gltf.scene), undefined, handleError);
    }

    return () => {
      isMounted = false;
    };
  }, [modelUrl, metadata, invalidate]);

  useEffect(() => {
    if (sceneObj) {
      applyRoofVisibility(sceneObj, roofOff, metadata);
      invalidate();
    }
  }, [sceneObj, roofOff, metadata, invalidate]);

  if (!modelUrl || hasError) {
    return <ProceduralHouse roofOff={roofOff} />;
  }

  if (!sceneObj) {
    return (
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[4, 2.5, 4]} />
        <meshStandardMaterial color="#94a3b8" wireframe />
      </mesh>
    );
  }

  return <primitive object={sceneObj} />;
}
