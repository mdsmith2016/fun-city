import * as THREE from 'three';

/** Canvas art on the upper front of a hoodie (optional per skater). */
export type HoodieFrontArt = 'cltChecklist';

/** Must match `PlaneGeometry` size so the texture is not stretched. */
export const HOODIE_PANEL_W = 0.44;
export const HOODIE_PANEL_H = 0.2;

const TEX_W = 512;
const TEX_H = Math.round(TEX_W * (HOODIE_PANEL_H / HOODIE_PANEL_W));

const CACHE_REV = 9;
const materials = new Map<string, THREE.MeshLambertMaterial>();

function drawCltChecklist(g: CanvasRenderingContext2D, w: number, h: number, bg: string): void {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  const names = ['JEFF', 'JOHN', 'JACK', 'MATT'] as const;
  const checked = [true, false, false, false];
  const rows = names.length;
  const padY = h * 0.04;
  const linePitch = (h - padY * 2) / rows;
  const fontSize = Math.round(w * 0.17);
  const bs = Math.round(fontSize * 1.02);
  const marginX = Math.round(w * 0.055);
  const colX = w - marginX - bs;

  g.font = `bold ${fontSize}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  g.textBaseline = 'middle';

  for (let i = 0; i < rows; i++) {
    const cy = padY + linePitch * (i + 0.5);
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.fillText(names[i], marginX, cy);

    const by = cy - bs / 2;
    g.strokeStyle = '#ffffff';
    g.lineWidth = Math.max(3, fontSize * 0.055);
    g.strokeRect(colX, by, bs, bs);

    if (checked[i]) {
      g.strokeStyle = '#ffffff';
      g.lineWidth = Math.max(5, fontSize * 0.09);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(colX + bs * 0.2, cy);
      g.lineTo(colX + bs * 0.38, cy + bs * 0.28);
      g.lineTo(colX + bs * 0.78, cy - bs * 0.32);
      g.stroke();
    }
  }
}

/** Shared flat-shaded hoodie chest panel; `baseColor` tints the canvas to match the hoodie dye. */
export function getHoodieFrontMaterial(art: HoodieFrontArt, baseColor: number): THREE.MeshLambertMaterial {
  const key = `${art}:${CACHE_REV}:${baseColor.toString(16)}`;
  const existing = materials.get(key);
  if (existing) return existing;

  const bg = '#' + new THREE.Color(baseColor).getHexString();
  const cv = document.createElement('canvas');
  cv.width = TEX_W;
  cv.height = TEX_H;
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