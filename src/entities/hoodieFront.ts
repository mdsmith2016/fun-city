import * as THREE from 'three';

/** Canvas art on the upper front of a hoodie (optional per skater). */
export type HoodieFrontArt = 'cltChecklist';

const CACHE_REV = 13;
const CANVAS_W = 512;
/** Taller than the name block so large (HEW) is not crushed by bottom clip logic. */
const CANVAS_H = 640;
/** Plane matches canvas aspect so UVs align with drawn text. */
export const HOODIE_FRONT_PLANE = { w: 0.4 * (CANVAS_W / CANVAS_H), h: 0.4 } as const;

const materials = new Map<string, THREE.MeshBasicMaterial>();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const m of materials.values()) {
      m.map?.dispose();
      m.dispose();
    }
    materials.clear();
  });
}

function checklistInk(baseColor: number): string {
  const c = new THREE.Color(baseColor);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return lum > 0.55 ? '#2a2e35' : '#ffffff';
}

function drawCltChecklist(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  tickRow: 0 | 1 | 2 | 3,
  ink: string,
): void {
  g.clearRect(0, 0, w, h);

  const names = ['JEFF', 'JOHN', 'JACK', 'MATT'] as const;
  const fontSize = 104;
  const linePitch = 118;
  const bs = 112;
  const startY = 72;
  const marginX = 28;

  g.font = `bold ${fontSize}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  g.textBaseline = 'middle';

  for (let i = 0; i < names.length; i++) {
    const cy = startY + i * linePitch;
    g.fillStyle = ink;
    g.textAlign = 'left';
    g.fillText(names[i], marginX, cy);

    const bx = w - bs - marginX;
    const by = cy - bs / 2;
    g.strokeStyle = ink;
    g.lineWidth = 6;
    g.strokeRect(bx, by, bs, bs);

    if (i === tickRow) {
      g.strokeStyle = ink;
      g.lineWidth = 10;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(bx + 22, cy);
      g.lineTo(bx + 42, cy + 32);
      g.lineTo(bx + 88, cy - 36);
      g.stroke();
    }
  }

  const mattY = startY + (names.length - 1) * linePitch;
  const hewTarget = Math.round(fontSize * 0.6);
  let hewSize = hewTarget;
  let hewY = mattY + fontSize * 0.55 + hewSize * 0.5;
  const hewFloor = Math.round(hewTarget * 0.85);
  while (hewY + hewSize * 0.55 > h - 6 && hewSize > hewFloor) {
    hewSize -= 2;
    hewY = mattY + fontSize * 0.55 + hewSize * 0.5;
  }
  g.font = `bold ${hewSize}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  g.fillStyle = ink;
  g.textAlign = 'left';
  g.fillText('(HEW)', marginX, hewY);
}

/** Transparent ink decal over the chest; hoodie colour comes from the torso mesh behind. */
export function getHoodieFrontMaterial(
  art: HoodieFrontArt,
  baseColor: number,
  tickRow: 0 | 1 | 2 | 3 = 0,
): THREE.MeshBasicMaterial {
  const key = `${art}:${CACHE_REV}:${tickRow}:${baseColor.toString(16)}`;
  const existing = materials.get(key);
  if (existing) return existing;

  const cv = document.createElement('canvas');
  cv.width = CANVAS_W;
  cv.height = CANVAS_H;
  const g = cv.getContext('2d')!;
  if (art === 'cltChecklist') drawCltChecklist(g, cv.width, cv.height, tickRow, checklistInk(baseColor));

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: true,
    toneMapped: false,
  });
  materials.set(key, mat);
  return mat;
}