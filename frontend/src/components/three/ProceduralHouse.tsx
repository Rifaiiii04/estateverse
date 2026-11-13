"use client";

import React from "react";

interface ProceduralHouseProps {
  roofOff?: boolean;
}

// ProceduralHouse renders a modular architectural 3D house with interior layout and toggleable roof.
export function ProceduralHouse({ roofOff = false }: ProceduralHouseProps) {
  return (
    <group position={[0, 0, 0]}>
      {/* Foundation Concrete Slab */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[10, 0.2, 8]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.7} />
      </mesh>

      {/* Modern Oak Parquet Flooring */}
      <mesh position={[0, 0.21, 0]} receiveShadow>
        <boxGeometry args={[9.6, 0.02, 7.6]} />
        <meshStandardMaterial color="#8a7b6b" roughness={0.4} />
      </mesh>

      {/* Exterior Walls */}
      <mesh position={[0, 1.6, -3.9]} castShadow receiveShadow>
        <boxGeometry args={[10, 2.8, 0.2]} />
        <meshStandardMaterial color="#fafaf9" roughness={0.8} />
      </mesh>
      <mesh position={[-4.9, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2.8, 8]} />
        <meshStandardMaterial color="#f5f5f4" roughness={0.8} />
      </mesh>
      <mesh position={[4.9, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 2.8, 8]} />
        <meshStandardMaterial color="#f5f5f4" roughness={0.8} />
      </mesh>
      <mesh position={[-2.8, 1.6, 3.9]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 2.8, 0.2]} />
        <meshStandardMaterial color="#fafaf9" roughness={0.8} />
      </mesh>
      <mesh position={[2.8, 1.6, 3.9]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 2.8, 0.2]} />
        <meshStandardMaterial color="#fafaf9" roughness={0.8} />
      </mesh>
      {/* Front Entrance Header */}
      <mesh position={[0, 2.5, 3.9]} castShadow>
        <boxGeometry args={[1.4, 1.0, 0.2]} />
        <meshStandardMaterial color="#171717" />
      </mesh>

      {/* Interior Dividing Walls */}
      <mesh position={[0, 1.5, -1]} castShadow receiveShadow>
        <boxGeometry args={[0.15, 2.6, 5.8]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.6} />
      </mesh>
      <mesh position={[-2.5, 1.5, -1]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 2.6, 0.15]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.6} />
      </mesh>

      {/* Interior Furniture Elements */}
      {/* Living Room Sofa */}
      <mesh position={[2.5, 0.45, 1.5]} castShadow>
        <boxGeometry args={[2.2, 0.5, 1.0]} />
        <meshStandardMaterial color="#525252" roughness={0.5} />
      </mesh>
      {/* Coffee Table */}
      <mesh position={[2.5, 0.3, 0.2]} castShadow>
        <boxGeometry args={[1.2, 0.2, 0.6]} />
        <meshStandardMaterial color="#262626" roughness={0.3} />
      </mesh>
      {/* Bedroom Bed */}
      <mesh position={[-2.5, 0.45, -2.5]} castShadow>
        <boxGeometry args={[2.0, 0.5, 2.2]} />
        <meshStandardMaterial color="#404040" roughness={0.6} />
      </mesh>
      {/* Kitchen Island */}
      <mesh position={[3.5, 0.55, -2.8]} castShadow>
        <boxGeometry args={[2.4, 0.9, 0.8]} />
        <meshStandardMaterial color="#262626" roughness={0.4} />
      </mesh>

      {/* Detachable Roof for Dollhouse Mode */}
      {!roofOff && (
        <group position={[0, 3.0, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <coneGeometry args={[7.2, 1.8, 4]} />
            <meshStandardMaterial color="#262626" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[10.4, 0.1, 8.4]} />
            <meshStandardMaterial color="#171717" />
          </mesh>
        </group>
      )}

      {/* Architectural Base Landscape */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[18, 0.1, 16]} />
        <meshStandardMaterial color="#3f4f38" roughness={0.9} />
      </mesh>
      {/* Stone Pathway */}
      <mesh position={[0, 0.02, 5.8]} receiveShadow>
        <boxGeometry args={[1.8, 0.04, 3.8]} />
        <meshStandardMaterial color="#d4d4d4" roughness={0.8} />
      </mesh>
    </group>
  );
}
