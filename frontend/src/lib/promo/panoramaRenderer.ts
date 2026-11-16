import {
  Euler,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  WebGLRenderer,
} from "three";
import type { PromoCamera } from "./promoTimeline";

const DEG = Math.PI / 180;
const SPHERE_RADIUS = 500;

export interface PanoramaRenderer {
  canvas: HTMLCanvasElement;
  setPanorama: (texture: Texture) => void;
  render: (camera: PromoCamera) => void;
  dispose: () => void;
}

// createPanoramaRenderer draws perspective views of an equirectangular panorama, mapped exactly like the tour viewer.
export function createPanoramaRenderer(width: number, height: number): PanoramaRenderer {
  const canvas = document.createElement("canvas");
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  const geometry = new SphereGeometry(SPHERE_RADIUS, 96, 64);
  geometry.scale(-1, 1, 1);
  const material = new MeshBasicMaterial({ toneMapped: false });
  const sphere = new Mesh(geometry, material);
  sphere.rotation.y = -Math.PI / 2;
  const scene = new Scene();
  scene.add(sphere);
  const camera = new PerspectiveCamera(75, width / height, 0.1, 2000);

  return {
    canvas,
    setPanorama: (texture) => {
      if (material.map === texture) return;
      material.map = texture;
      material.needsUpdate = true;
    },
    render: ({ yaw, pitch, fov }) => {
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.quaternion.setFromEuler(new Euler(pitch * DEG, -yaw * DEG, 0, "YXZ"));
      renderer.render(scene, camera);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}

// loadPanoramaTextures downloads panoramas as CORS-clean sRGB textures so frames can be read back for encoding.
export function loadPanoramaTextures(urls: string[]): Promise<Texture[]> {
  const loader = new TextureLoader();
  loader.setCrossOrigin("anonymous");
  return Promise.all(
    urls.map(async (url) => {
      const texture = await loader.loadAsync(url);
      texture.colorSpace = SRGBColorSpace;
      return texture;
    })
  );
}
