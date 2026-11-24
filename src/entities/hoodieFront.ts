import * as THREE from 'three';

/** Canvas art on the upper front of a hoodie (optional per skater). */
export type HoodieFrontArt = 'cltChecklist';

/** Must match `PlaneGeometry` size so the texture is not stretched. */
export const HOODIE_PANEL_W = 0.44;
export const HOODIE_PANEL_H = 0.4;

const TEX_W = 512;
const TEX_H = Math.round(TEX_W * (HOODIE_PANEL_H / HOODIE_PANEL_W));
const DESIGN_H = 600;

const CACHE_REV = 6;
const materials = new Map<string, THREE.MeshLambertMaterial>();

function drawCltChecklist(g: CanvasRenderingContext2D, w: number, h: number, bg: string): void {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.save();
  g.scale(w / TEX_W, h / DESIGN_H);

  const names = ['JEFF', 'JOHN', 'JACK', 'MATT'] as const;
  const checked = [true, false, false, false];
  const fontSize = 104;
  const linePitch = 118;
  const bs = 112;
  const marginX = 28;
  const yNudge = fontSize * 0.25;
  const startY = 72 + yNudge;

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

  const mattY = startY + 3 * linePitch;
  g.font = `bold ${Math.round(fontSize * 0.72)}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  g.fillStyle = '#ffffff';
  g.fillText('(HEW)', marginX, mattY + linePitch * 0.52);
  g.restore();
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