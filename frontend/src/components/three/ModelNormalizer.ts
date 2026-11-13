import * as THREE from "three";
import { Model3DMetadata } from "@/types/property";

export interface NormalizerResult {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  floorY: number;
  roofMeshCount: number;
  wallMeshCount: number;
}

// Normalizes 3D model scale and centers ground plane at y=0 regardless of CAD origin.
export function normalizeModel(object: THREE.Object3D, metadata?: Model3DMetadata): NormalizerResult {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.z, size.y * 1.3);
  const targetSpan = 10.0;
  const scale = maxDim > 0.001 ? targetSpan / maxDim : 1.0;

  object.scale.set(scale, scale, scale);
  object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  object.updateMatrixWorld(true);

  return classifyArchitectureElements(object, metadata);
}

// Automatically detects roofs, walls, and interior walk boundaries via pre-tagged binary extras and naming.
export function classifyArchitectureElements(
  object: THREE.Object3D,
  metadata?: Model3DMetadata
): NormalizerResult {
  const scaledBox = new THREE.Box3().setFromObject(object);
  const knownRoofSet = new Set((metadata?.roof_nodes || []).map((n) => n.toLowerCase()));

  let roofCount = 0;
  let wallCount = 0;

  object.traverse((child) => {
    const isMesh = Boolean((child as any).isMesh || child.type === "Mesh");
    const nameLower = child.name.toLowerCase();
    const parentNameLower = child.parent?.name.toLowerCase() || "";

    const isBinaryTaggedRoof = Boolean(child.userData?.isRoof);
    const isExplicitRoof = knownRoofSet.has(nameLower) || knownRoofSet.has(parentNameLower);
    const isSemanticRoof = /roof|atap|genteng|canopy|ceiling|truss/i.test(`${nameLower} ${parentNameLower}`);

    if (isBinaryTaggedRoof || isExplicitRoof || isSemanticRoof) {
      child.userData.isRoof = true;
      if (isMesh) roofCount++;
    }

    if (isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m) {
            m.side = THREE.DoubleSide;
            m.needsUpdate = true;
          }
        });
      }

      const isSemanticWall = /wall|dinding|tembok|facade|sekat|siding/i.test(`${nameLower} ${parentNameLower}`);
      if (isSemanticWall || child.userData?.isWall) {
        child.userData.isWall = true;
        wallCount++;
      }
    }
  });

  return {
    bounds: {
      minX: scaledBox.min.x * 0.7,
      maxX: scaledBox.max.x * 0.7,
      minZ: scaledBox.min.z * 0.7,
      maxZ: scaledBox.max.z * 0.7,
    },
    floorY: 1.6,
    roofMeshCount: roofCount,
    wallMeshCount: wallCount,
  };
}

// Toggles visibility of all automatically detected roof meshes and groups for Dollhouse view.
export function applyRoofVisibility(
  object: THREE.Object3D,
  roofOff: boolean,
  metadata?: Model3DMetadata
): void {
  const knownRoofSet = new Set((metadata?.roof_nodes || []).map((n) => n.toLowerCase()));

  object.traverse((child) => {
    const nameLower = child.name.toLowerCase();
    const parentNameLower = child.parent?.name.toLowerCase() || "";

    const isExplicitRoof = knownRoofSet.has(nameLower) || knownRoofSet.has(parentNameLower);
    const isTaggedRoof = Boolean(child.userData?.isRoof);
    const isRegexRoof = /roof|atap|genteng|canopy|ceiling|truss/i.test(`${nameLower} ${parentNameLower}`);

    if (isExplicitRoof || isTaggedRoof || isRegexRoof) {
      child.visible = !roofOff;
    }
  });
}
