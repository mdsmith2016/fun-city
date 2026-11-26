import * as THREE from 'three';
import type { SkaterRig } from '../entities/skaterModel';
import type { Appearance } from '../entities/skaterModel';
import { flatMaterial } from '../utils/lowpoly';
import { clamp, smoothstep } from '../utils/math';

/** Fun CLTy Angela only — score multiplier morph, not a shared system. */
const ROYGBIV = [0xe40303, 0xff8c00, 0xffed00, 0x008026, 0x004dff, 0x732982, 0x750787] as const;
const EXIT_SEC = 0.34;

function bandAmt(mult: number, at: number): number {
  const lo = at - 0.22;
  const hi = at + 0.05;
  const t = clamp((mult - lo) / (hi - lo), 0, 1);
  return smoothstep(t);
}

function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const m = new THREE.Mesh(g, flatMaterial(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export class CltAngelaUnicornFx {
  private horn = new THREE.Group();
  private rainbow = new THREE.Group();
  private flowHair = new THREE.Group();
  private horse = new THREE.Group();
  private capMeshes: THREE.Mesh[] = [];
  private hairMeshes: THREE.Mesh[] = [];
  private legHide: THREE.Mesh[] = [];
  private hairBase = new Map<THREE.Object3D, { sy: number; sz: number; pos: THREE.Vector3 }>();
  private prevMult = 1;
  private exitT = 0;
  private ready = false;
  private time = 0;

  bind(rig: SkaterRig, a: Appearance): void {
    if (!a.cltUnicorn) return;
    rig.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (o.userData.angelaCap) this.capMeshes.push(o);
      if (o.userData.angelaHair) {
        this.hairMeshes.push(o);
        this.hairBase.set(o, { sy: o.scale.y, sz: o.scale.z, pos: o.position.clone() });
      }
      if (o.userData.angelaLegHide) this.legHide.push(o);
    });

    for (let i = 0; i < ROYGBIV.length; i++) {
      const t = (i + 0.5) / ROYGBIV.length;
      this.rainbow.add(box(0.29, 0.028, 0.31, ROYGBIV[i], 0, 0.2 - t * 0.14, -0.02 - t * 0.04));
    }

    this.horn.add(box(0.055, 0.1, 0.055, 0xf2ece4, 0, 0.05, 0));
    this.horn.add(box(0.038, 0.22, 0.038, 0xfff4d6, 0, 0.2, 0));
    this.horn.position.set(0, 0.22, 0.06);
    this.horn.rotation.x = -0.12;

    this.flowHair.add(box(0.27, 0.42, 0.08, a.hair, 0, -0.28, -0.22));
    this.flowHair.add(box(0.24, 0.55, 0.07, a.hair, 0, -0.38, -0.38));
    this.flowHair.add(box(0.2, 0.38, 0.06, a.hair, 0, -0.12, -0.48));
    for (const i of [0, 1, 2] as const) {
      const c = ROYGBIV[(i * 2 + 3) % ROYGBIV.length];
      this.flowHair.add(box(0.22 - i * 0.04, 0.06, 0.18, c, 0, -0.15 - i * 0.22, -0.32 - i * 0.18));
    }

    const top = a.top;
    this.horse.add(box(0.46, 0.38, 0.62, top, 0, 0.12, -0.08));
    this.horse.add(box(0.32, 0.32, 0.5, top, 0, 0.38, -0.32));
    this.horse.add(box(0.14, 0.14, 0.14, 0xf2efe6, 0, 0.52, -0.08));
    for (const side of [-1, 1] as const) {
      this.horse.add(box(0.14, 0.36, 0.16, a.bottom, side * 0.22, -0.1, -0.05));
    }

    rig.addHeadOverlay(this.rainbow);
    rig.addHeadOverlay(this.horn);
    rig.addHeadOverlay(this.flowHair);
    rig.addRiderOverlay(this.horse);
    this.rainbow.visible = false;
    this.horn.visible = false;
    this.flowHair.visible = false;
    this.horse.visible = false;
    this.ready = true;
  }

  dispose(): void {
    this.ready = false;
    this.capMeshes = [];
    this.hairMeshes = [];
    this.legHide = [];
    this.hairBase.clear();
  }

  update(mult: number, dt: number): void {
    if (!this.ready) return;
    this.time += dt;

    if (this.prevMult >= 4.92 && mult < 4.92) this.exitT = EXIT_SEC;
    this.prevMult = mult;

    let rainbow = bandAmt(mult, 2);
    let long = bandAmt(mult, 3);
    let flow = bandAmt(mult, 4);
    let horse = bandAmt(mult, 5);

    if (this.exitT > 0) {
      this.exitT = Math.max(0, this.exitT - dt);
      const snap = 1 - this.exitT / EXIT_SEC;
      rainbow *= 1 - snap;
      long *= 1 - snap;
      flow *= 1 - snap;
      horse *= 1 - snap;
    }

    this.rainbow.visible = rainbow > 0.02;
    this.rainbow.children.forEach((c) => (c.visible = rainbow > 0.02));

    for (const m of this.hairMeshes) {
      const base = this.hairBase.get(m)!;
      const longScale = 1 + long * 0.85 + flow * 0.55;
      m.scale.y = base.sy * longScale;
      m.scale.z = base.sz * (1 + flow * 0.2);
      m.position.y = base.pos.y - flow * 0.06;
      m.position.z = base.pos.z - flow * 0.04;
      const mat = m.material as THREE.MeshLambertMaterial;
      const ink = new THREE.Color(0x151515);
      const band = new THREE.Color(ROYGBIV[Math.floor(this.time * 1.4) % ROYGBIV.length]);
      mat.color.copy(ink).lerp(band, rainbow);
    }

    for (let i = 0; i < this.rainbow.children.length; i++) {
      const band = this.rainbow.children[i] as THREE.Mesh;
      const mat = band.material as THREE.MeshLambertMaterial;
      const c = new THREE.Color(ROYGBIV[i]);
      const ink = new THREE.Color(0x151515);
      mat.color.copy(ink).lerp(c, rainbow);
    }

    const hornAmt = Math.max(flow, horse * 0.35);
    this.horn.visible = hornAmt > 0.03;
    this.horn.scale.setScalar(0.4 + hornAmt * 0.85);
    for (const c of this.capMeshes) {
      c.visible = hornAmt < 0.55;
    }

    this.flowHair.visible = flow + horse * 0.2 > 0.03;
    this.flowHair.scale.set(1, 0.7 + flow * 0.65 + horse * 0.25, 1 + flow * 0.35);

    this.horse.visible = horse > 0.03;
    this.horse.scale.set(0.85 + horse * 0.2, 0.7 + horse * 0.35, 0.8 + horse * 0.25);
    this.horse.position.y = horse * 0.05;

    for (const m of this.legHide) {
      m.visible = horse < 0.65;
    }
  }
}