export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing factor. Use as lerp(a, b, damp(rate, dt)). */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Shortest signed angle from a to b, in (-PI, PI]. */
export const angleDiff = (a: number, b: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d <= -Math.PI) d += Math.PI * 2;
  return d;
};

export const lerpAngle = (a: number, b: number, t: number) => a + angleDiff(a, b) * t;

export const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
