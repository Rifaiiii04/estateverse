// Common Indonesian furniture sizes buyers can drop into a room to check whether they fit.

export interface FurniturePreset {
  id: string;
  label: string;
  widthM: number;
  depthM: number;
  heightM: number;
}

export const FURNITURE_PRESETS: FurniturePreset[] = [
  { id: "bed-160", label: "Kasur 160×200", widthM: 1.6, depthM: 2.0, heightM: 0.5 },
  { id: "bed-180", label: "Kasur 180×200", widthM: 1.8, depthM: 2.0, heightM: 0.5 },
  { id: "bed-90", label: "Kasur single 90×200", widthM: 0.9, depthM: 2.0, heightM: 0.45 },
  { id: "sofa-3", label: "Sofa 3 dudukan 200×85", widthM: 2.0, depthM: 0.85, heightM: 0.85 },
  { id: "dining-4", label: "Meja makan 4 kursi 120×80", widthM: 1.2, depthM: 0.8, heightM: 0.75 },
  { id: "wardrobe-2", label: "Lemari 2 pintu 100×55", widthM: 1.0, depthM: 0.55, heightM: 1.9 },
  { id: "desk", label: "Meja kerja 120×60", widthM: 1.2, depthM: 0.6, heightM: 0.75 },
];

// presetById finds a furniture preset, falling back to the first one.
export function presetById(id: string): FurniturePreset {
  return FURNITURE_PRESETS.find((p) => p.id === id) ?? FURNITURE_PRESETS[0];
}
