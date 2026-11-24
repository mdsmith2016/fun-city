import * as THREE from 'three';

export const SKY_HORIZON = 0xcfe6f4;
export const SKY_TOP = 0x4f93d8;

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_HORIZON);
  // Gentle haze: the distant mountains should read as far away, nearby stuff stays crisp.
  scene.fog = new THREE.Fog(SKY_HORIZON, 350, 4200);
  return scene;
}

export function createCamera(fov = 62): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(fov, 1, 0.6, 5000);
}

export interface Lights {
  sun: THREE.DirectionalLight;
  /** Re-centre the shadow-casting sun on a point (so a small shadow map covers the action). */
  follow(x: number, y: number, z: number): void;
}

/** Hemisphere fill + one shadow-casting directional "sun" with a small, follow-able shadow box. */
const DEFAULT_SUN_OFFSET = new THREE.Vector3(14, 26, 10);

export function addDefaultLights(
  scene: THREE.Scene,
  shadowExtent = 22,
  sunOffset: THREE.Vector3 = DEFAULT_SUN_OFFSET,
): Lights {
  scene.add(new THREE.HemisphereLight(0xdcecff, 0x8a8070, 1.5));

  const sun = new THREE.DirectionalLight(0xfff1d8, 2.4);
  const offset = sunOffset;
  sun.position.copy(offset);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const cam = sun.shadow.camera;
  cam.left = -shadowExtent;
  cam.right = shadowExtent;
  cam.top = shadowExtent;
  cam.bottom = -shadowExtent;
  cam.near = 1;
  cam.far = 80;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  return {
    sun,
    follow(x, y, z) {
      sun.target.position.set(x, y, z);
      sun.position.set(x + offset.x, y + offset.y, z + offset.z);
    },
  };
}
