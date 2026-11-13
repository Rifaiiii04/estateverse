"use client";

import React from "react";
import { Model3DMetadata } from "@/types/property";
import { UniversalModelLoader } from "./UniversalModelLoader";

interface ModelLoaderProps {
  modelUrl?: string;
  roofOff?: boolean;
  metadata?: Model3DMetadata;
}

// ModelLoader provides backwards-compatible universal 3D loading for all house scenes.
export function ModelLoader({ modelUrl, roofOff = false, metadata }: ModelLoaderProps) {
  return <UniversalModelLoader modelUrl={modelUrl} roofOff={roofOff} metadata={metadata} />;
}
