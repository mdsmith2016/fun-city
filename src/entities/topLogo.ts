import * as THREE from 'three';
import pikachuUrl from '../assets/angela-top-logo-pikachu.png';

/** Printed graphic on long-sleeve tops (chest + back). */
export type LongsleeveLogo = 'pikachu';

const LOGO_REV = 1;
/** Square print patch on torso (low-poly decal). */
export const LONGSLEEVE_LOGO_PLANE = { w: 0.24, h: 0.24 } as const;

const materials = new Map<string, THREE.MeshBasicMaterial>();
const textures = new Map<LongsleeveLogo, THREE.Texture>();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const m of materials.values()) {
      m.map?.dispose();
      m.dispose();
    }
    for (const t of textures.values()) t.dispose();
    materials.clear();
    textures.clear();
  });
}

function sourceUrl(logo: LongsleeveLogo): string {
  if (logo === 'pikachu') return pikachuUrl;
  return pikachuUrl;
}

function getLogoTexture(logo: LongsleeveLogo): THREE.Texture {
  let tex = textures.get(logo);
  if (tex) return tex;

  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const keyed = new THREE.CanvasTexture(cv);
  keyed.colorSpace = THREE.SRGBColorSpace;
  keyed.magFilter = THREE.LinearFilter;
  keyed.minFilter = THREE.LinearFilter;

  const img = new Image();
  const bake = () => {
    cv.width = img.width;
    cv.height = img.height;
    const g = cv.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, cv.width, cv.height);
    for (let i = 0; i < data.data.length; i += 4) {
      const r = data.data[i];
      const gr = data.data[i + 1];
      const b = data.data[i + 2];
      if (r < 42 && gr < 42 && b < 42) data.data[i + 3] = 0;
    }
    g.putImageData(data, 0, 0);
    keyed.needsUpdate = true;
  };
  img.onload = bake;
  img.src = sourceUrl(logo);
  if (img.complete) bake();

  textures.set(logo, keyed);
  return keyed;
}

export function getLongsleeveLogoMaterial(logo: LongsleeveLogo): THREE.MeshBasicMaterial {
  const key = `${logo}:${LOGO_REV}`;
  const existing = materials.get(key);
  if (existing) return existing;

  const mat = new THREE.MeshBasicMaterial({
    map: getLogoTexture(logo),
    transparent: true,
    alphaTest: 0.12,
    depthWrite: true,
    toneMapped: false,
  });
  materials.set(key, mat);
  return mat;
}