export type CollectType = 'jira' | 'clock' | 'miro' | 'star';

export const COLLECT_TYPES: readonly CollectType[] = ['jira', 'clock', 'miro'];

export const COLLECT_LABELS: Record<CollectType, string> = {
  jira: 'Jira tickets',
  clock: 'Time estimates',
  miro: 'Miro boards',
  star: 'North Stars',
};

/**
 * 2D art for the collectables, drawn in code. Used as the in-world texture and as the HUD icon.
 * To swap one for a real image, replace its draw function with `ctx.drawImage(img, 0, 0, s, s)`.
 */
const DRAW: Record<CollectType, (g: CanvasRenderingContext2D, s: number) => void> = {
  jira: drawJira,
  clock: drawClock,
  miro: drawMiro,
  star: drawStar,
};

export function drawIcon(type: CollectType, size = 256): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, size, size);
  DRAW[type](g, size);
  return cv;
}

/**
 * The Jira logo: a diamond with a square hole, built from two interlocking L-shaped bands in two blues.
 * Drawn in a 100x100 square (hole 34..66), then the whole thing is turned 45 degrees.
 */
function drawJira(g: CanvasRenderingContext2D, s: number) {
  const k = (s / 256) * 1.58;
  const bands = (light: string, dark: string, dx = 0, dy = 0) => {
    g.save();
    g.translate(s / 2 + dx, s / 2 + dy);
    g.rotate(Math.PI / 4);
    g.scale(k, k);
    g.translate(-50, -50);
    g.lineJoin = 'round';
    g.lineWidth = 6;

    const fill = (color: string, draw: () => void) => {
      g.fillStyle = color;
      g.strokeStyle = color;
      g.beginPath();
      draw();
      g.closePath();
      g.fill();
      g.stroke();
    };
    // Darker bands: the two sides the light bands do not cover.
    fill(dark, () => g.rect(3, 3, 31, 94));
    fill(dark, () => g.rect(66, 3, 31, 94));
    // Lighter bands: top and bottom, each sweeping into a curve toward the hole.
    fill(light, () => {
      g.moveTo(3, 3);
      g.lineTo(97, 3);
      g.lineTo(97, 34);
      g.lineTo(34, 34);
      g.quadraticCurveTo(3, 34, 3, 3);
    });
    fill(light, () => {
      g.moveTo(97, 97);
      g.lineTo(3, 97);
      g.lineTo(3, 66);
      g.lineTo(66, 66);
      g.quadraticCurveTo(97, 66, 97, 97);
    });
    g.restore();
  };

  const shadow = 'rgba(9, 30, 66, 0.3)';
  bands(shadow, shadow, 3 * (s / 256), 7 * (s / 256));
  bands('#4c8bf5', '#2d62d8');
}

function drawClock(g: CanvasRenderingContext2D, s: number) {
  const u = s / 256;
  g.scale(u, u);
  const cx = 128;
  const cy = 128;

  g.beginPath();
  g.arc(cx + 4, cy + 6, 108, 0, Math.PI * 2);
  g.fillStyle = 'rgba(9, 30, 66, 0.35)';
  g.fill();

  g.beginPath();
  g.arc(cx, cy, 108, 0, Math.PI * 2);
  g.fillStyle = '#243b6b';
  g.fill();
  g.beginPath();
  g.arc(cx, cy, 92, 0, Math.PI * 2);
  g.fillStyle = '#fbfaf5';
  g.fill();

  g.strokeStyle = '#243b6b';
  g.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    const r0 = major ? 66 : 74;
    g.lineWidth = major ? 9 : 5;
    g.beginPath();
    g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
    g.lineTo(cx + Math.sin(a) * 84, cy - Math.cos(a) * 84);
    g.stroke();
  }

  // Ten past ten.
  const hand = (angle: number, len: number, width: number, color: string) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.sin(angle) * len, cy - Math.cos(angle) * len);
    g.stroke();
  };
  hand(((10 + 10 / 60) / 12) * Math.PI * 2, 46, 12, '#243b6b');
  hand((10 / 60) * Math.PI * 2, 70, 8, '#243b6b');
  hand((38 / 60) * Math.PI * 2, 74, 4, '#e5484d');

  g.beginPath();
  g.arc(cx, cy, 10, 0, Math.PI * 2);
  g.fillStyle = '#e5484d';
  g.fill();
}

function drawMiro(g: CanvasRenderingContext2D, s: number) {
  const u = s / 256;
  g.scale(u, u);

  // Soft shadow, note body, and a darker folded corner.
  g.fillStyle = 'rgba(70, 40, 0, 0.35)';
  g.fillRect(34, 38, 196, 196);

  g.fillStyle = '#ffc531';
  g.beginPath();
  g.moveTo(26, 28);
  g.lineTo(226, 28);
  g.lineTo(226, 170);
  g.lineTo(166, 228);
  g.lineTo(26, 228);
  g.closePath();
  g.fill();

  g.fillStyle = '#ffb000';
  g.beginPath();
  g.moveTo(226, 170);
  g.lineTo(166, 228);
  g.lineTo(166, 170);
  g.closePath();
  g.fill();

  g.fillStyle = '#ffd966';
  g.fillRect(26, 28, 200, 26);

  // Scribbled note text.
  g.strokeStyle = '#7a4b00';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const scribble = (y: number, w: number) => {
    g.beginPath();
    g.moveTo(52, y);
    for (let x = 52; x < 52 + w; x += 14) g.lineTo(x + 7, y + (((x / 14) | 0) % 2 ? 6 : -6));
    g.stroke();
  };
  scribble(98, 130);
  scribble(130, 100);
  scribble(162, 70);
}

function drawStar(g: CanvasRenderingContext2D, s: number) {
  const u = s / 256;
  g.scale(u, u);
  const cx = 128;
  const cy = 132;

  g.beginPath();
  g.arc(cx + 5, cy + 7, 96, 0, Math.PI * 2);
  g.fillStyle = 'rgba(20, 14, 8, 0.28)';
  g.fill();

  const points = 5;
  const outer = 92;
  const inner = 38;
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fillStyle = '#ffc531';
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = '#c98512';
  g.stroke();

  g.beginPath();
  g.arc(cx - 22, cy - 20, 14, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255, 255, 255, 0.45)';
  g.fill();
}
