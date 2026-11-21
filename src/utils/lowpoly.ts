import * as THREE from 'three';

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/** Shared flat-shaded, untextured material per colour/roughness combo. */
export function flatMaterial(
  color: THREE.ColorRepresentation,
  opts: { roughness?: number; metalness?: number } = {},
): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  const roughness = opts.roughness ?? 0.9;
  const metalness = opts.metalness ?? 0;
  const key = `${c.getHexString()}|${roughness}|${metalness}`;
  let mat = materialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color: c, roughness, metalness, flatShading: true });
    materialCache.set(key, mat);
  }
  return mat;
}

/** Wrap a geometry in a flat-shaded mesh that casts/receives shadows by default. */
export function lowPolyMesh(
  geometry: THREE.BufferGeometry,
  color: THREE.ColorRepresentation,
  opts: { castShadow?: boolean; receiveShadow?: boolean } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, flatMaterial(color));
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  return mesh;
}

/** Randomly displace vertices for a hand-made, faceted look. Merges shared verts first so faces stay closed. */
export function jitter(geometry: THREE.BufferGeometry, amount: number, seed = 1): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const pos = geometry.getAttribute('position');
  const offsets = new Map<string, THREE.Vector3>();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    let o = offsets.get(key);
    if (!o) {
      o = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(amount * 2);
      offsets.set(key, o);
    }
    pos.setXYZ(i, v.x + o.x, v.y + o.y, v.z + o.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Small deterministic PRNG so procedural art is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
