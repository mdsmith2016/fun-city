import * as THREE from 'three';

/** Canvas art on the upper front of a hoodie (optional per skater). */
export type HoodieFrontArt = 'cltChecklist';

const CACHE_REV = 8;
/** Taller than the name block so large (HEW) is not crushed by bottom clip logic. */
const CANVAS_H = 640;
const materials = new Map<string, THREE.MeshLambertMaterial>();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const m of materials.values()) {
      m.map?.dispose();
      m.dispose();
    }
    materials.clear();
  });
}

function drawCltChecklist(g: CanvasRenderingContext2D, w: number, h: number, bg: string): void {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  const names = ['JEFF', 'JOHN', 'JACK', 'MATT'] as const;
  const checked = [true, false, false, false];
  const fontSize = 104;
  const linePitch = 118;
  const bs = 112;
  const startY = 72;
  const marginX = 28;

  g.font = `bold ${fontSize}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  g.textBaseline = 'middle';

  for (let i = 0; i < names.length; i++) {
    const cy = startY + i * linePitch;
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.fillText(names[i], marginX, cy);

    const bx = w - bs - marginX;
    const by = cy - bs / 2;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 6;
    g.strokeRect(bx, by, bs, bs);

    if (checked[i]) {
      g.strokeStyle = '#ffffff';
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
  const hewTarget = Math.round(fontSize * 1.2);
  let hewSize = hewTarget;
  let hewY = mattY + fontSize * 0.55 + hewSize * 0.5;
  const hewFloor = Math.round(hewTarget * 0.85);
  while (hewY + hewSize * 0.55 > h - 6 && hewSize > hewFloor) {
    hewSize -= 2;
    hewY = mattY + fontSize * 0.55 + hewSize * 0.5;
  }
  g.font = `bold ${hewSize}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.fillText('(HEW)', marginX, hewY);
}

/** Shared flat-shaded hoodie chest panel; `baseColor` tints the canvas to match the hoodie dye. */
export function getHoodieFrontMaterial(art: HoodieFrontArt, baseColor: number): THREE.MeshLambertMaterial {
  const key = `${art}:${CACHE_REV}:${baseColor.toString(16)}`;
  const existing = materials.get(key);
  if (existing) return existing;

  const bg = '#' + new THREE.Color(baseColor).getHexString();
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = CANVAS_H;
  const g = cv.getContext('2d')!;
  if (art === 'cltChecklist') drawCltChecklist(g, cv.width, cv.height, bg);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;

  const mat = new THREE.MeshLambertMaterial({ map: tex, flatShading: true });
  materials.set(key, mat);
  return mat;
}