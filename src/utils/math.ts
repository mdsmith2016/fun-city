export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing factor. Use as lerp(a, b, damp(rate, dt)). */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
