import * as THREE from 'three';

/** Canvas art on the upper front of a hoodie (optional per skater). */
export type HoodieFrontArt = 'cltChecklist';

const materials = new Map<HoodieFrontArt, THREE.MeshLambertMaterial>();

function drawCltChecklist(g: CanvasRenderingContext2D, w: number, h: number, bg: string): void {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  const names = ['JEFF', 'JOHN', 'JACK', 'MATTHEW'] as const;
  const checked = [true, false, false, false];
  const row = h / 4;

  g.font = 'bold 26px "Arial Narrow", Arial, Helvetica, sans-serif';
  g.textBaseline = 'middle';

  for (let i = 0; i < names.length; i++) {
    const cy = row * i + row * 0.52;
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.fillText(names[i], 18, cy);

    const bx = w - 58;
    const by = cy - 16;
    const bs = 30;
    g.strokeStyle = '#f5f5f5';
    g.lineWidth = 2.5;
    g.strokeRect(bx, by, bs, bs);

    if (checked[i]) {
      g.strokeStyle = '#e5201b';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(bx + 7, cy);
      g.lineTo(bx + 13, cy + 9);
      g.lineTo(bx + 24, cy - 9);
      g.stroke();
    }
  }
}

/** Shared flat-shaded hoodie chest panel; `baseColor` tints the canvas to match the hoodie dye. */
export function getHoodieFrontMaterial(art: HoodieFrontArt, baseColor: number): THREE.MeshLambertMaterial {
  const key = art;
  const bg = '#' + new THREE.Color(baseColor).getHexString();
  const existing = materials.get(key);
  if (existing) return existing;

  const cv = document.createElement('canvas');
  cv.width = 280;
  cv.height = 300;
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