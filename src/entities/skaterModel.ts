import * as THREE from 'three';
import { flatMaterial } from '../utils/lowpoly';

export type HairStyle = 'short' | 'long' | 'ponytail' | 'bob';
export type TopStyle = 'tee' | 'hoodie' | 'longsleeve';
export type BottomStyle = 'jeans' | 'shorts' | 'skirt';

export interface Appearance {
  name: string;
  gender: 'male' | 'female';
  blurb: string;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  cap?: number;
  top: number;
  topStyle: TopStyle;
  bottom: number;
  bottomStyle: BottomStyle;
  shoes: number;
  board: number;
}

/** Everything the controller can ask the rig to do. All angles in radians. */
export interface RigPose {
  /** 0 upright .. 1 deep crouch. */
  crouch: number;
  /** Roll of board+rider about the travel axis (lean into turns). */
  lean: number;
  /** Raise everything (board + rider), e.g. sitting on a rail. */
  lift: number;
  /** Extra board-only lift, e.g. mid-flip. */
  boardLift: number;
  boardRoll: number;
  boardYaw: number;
  boardPitch: number;
  /** 0 arms by sides .. 1 arms out. */
  armSpread: number;
  /** Arms swing forward/back. */
  armSwing: number;
  /** 0..1 back leg swings out to push. */
  push: number;
  /** 0..1 back foot comes down on the ground (foot brake). */
  brake: number;
}

export const neutralPose = (): RigPose => ({
  crouch: 0.2, lean: 0, lift: 0, boardLift: 0, boardRoll: 0, boardYaw: 0, boardPitch: 0,
  armSpread: 0.3, armSwing: 0, push: 0, brake: 0,
});

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const WHEEL = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8);
const SKIRT = new THREE.CylinderGeometry(0.2, 0.3, 0.24, 8);
/** Geometries reused across every rig instance; never dispose these per-rig. */
const SHARED_GEOS = new Set([UNIT_BOX, WHEEL, SKIRT]);

function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, cast = true): THREE.Mesh {
  const mesh = new THREE.Mesh(UNIT_BOX, flatMaterial(color));
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  return mesh;
}

const THIGH = 0.45;
const SHIN = 0.45;
const ANKLE = 0.11;
const DECK_Y = 0.11;
/** Ankle height above the deck top when the shoe sole rests on the ground (ground is 0.125 below the deck top). */
const DECK_TOP_TO_GROUND_ANKLE = ANKLE - 0.125;

interface Leg {
  thigh: THREE.Group;
  knee: THREE.Group;
  foot: THREE.Group;
  side: 1 | -1;
}

interface Arm {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  side: 1 | -1;
}

/**
 * Low-poly skater + board built from boxes. Rider faces sideways on the board (regular stance):
 * rider +X is board-forward, rider +Z is the chest direction. Poses are applied procedurally,
 * so there are no assets and no skeleton: legs use a tiny 2-bone IK so feet stay planted on the deck.
 */
export class SkaterRig {
  readonly root = new THREE.Group();
  private readonly lean = new THREE.Group();
  private readonly board = new THREE.Group();
  private readonly rider = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly hips: THREE.Mesh;
  private readonly head = new THREE.Group();
  private readonly legs: Leg[] = [];
  private readonly arms: Arm[] = [];
  private readonly skirt?: THREE.Mesh;
  private readonly torsoY = 0.08;

  constructor(readonly appearance: Appearance) {
    const a = appearance;
    const female = a.gender === 'female';
    const torsoW = female ? 0.38 : 0.44;
    const shoulderX = torsoW / 2 + 0.06;

    this.root.add(this.lean);
    this.lean.add(this.board, this.rider);
    this.buildBoard(a.board);

    this.rider.rotation.order = 'YXZ';
    if (female) this.rider.scale.setScalar(0.95);

    this.hips = box(torsoW - 0.04, 0.2, 0.24, a.bottomStyle === 'skirt' ? a.top : a.bottom);
    this.rider.add(this.hips);
    if (a.bottomStyle === 'skirt') {
      this.skirt = new THREE.Mesh(SKIRT, flatMaterial(a.bottom));
      this.skirt.castShadow = true;
      this.rider.add(this.skirt);
    }

    this.rider.add(this.torso);
    this.torso.add(box(torsoW, 0.52, 0.25, a.top, 0, 0.26, 0));
    this.torso.add(box(0.1, 0.1, 0.1, a.skin, 0, 0.55, 0));
    if (a.topStyle === 'hoodie') {
      this.torso.add(box(0.28, 0.16, 0.14, a.top, 0, 0.54, -0.12));
      this.torso.add(box(0.3, 0.12, 0.03, a.top, 0, 0.14, 0.135));
    }
    this.buildHead();
    this.torso.add(this.head);
    this.head.position.set(0, 0.52 + 0.17, 0);

    for (const side of [1, -1] as const) {
      this.buildArm(side, shoulderX);
      this.buildLeg(side);
    }
  }

  private buildBoard(color: number): void {
    this.board.position.y = DECK_Y;
    this.board.rotation.order = 'YXZ';
    this.board.add(box(0.22, 0.03, 0.78, color));
    for (const end of [1, -1]) {
      const kick = box(0.22, 0.03, 0.17, color, 0, 0.035, end * 0.45);
      kick.rotation.x = end * -0.38;
      this.board.add(kick);
      this.board.add(box(0.14, 0.035, 0.07, 0x7b838c, 0, -0.035, end * 0.27, false));
      for (const side of [1, -1]) {
        const wheel = new THREE.Mesh(WHEEL, flatMaterial(0xf2efe6));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.13, -0.05, end * 0.27);
        wheel.castShadow = true;
        this.board.add(wheel);
      }
    }
    this.rider.position.y = DECK_Y + 0.015;
  }

  private buildHead(): void {
    const a = this.appearance;
    this.head.add(box(0.24, 0.27, 0.26, a.skin));
    for (const x of [-0.06, 0.06]) this.head.add(box(0.035, 0.04, 0.02, 0x1f1f24, x, 0.02, 0.131, false));
    const hair = a.hair;
    if (a.cap !== undefined) {
      this.head.add(box(0.275, 0.1, 0.3, a.cap, 0, 0.15, -0.01));
      this.head.add(box(0.2, 0.025, 0.12, a.cap, 0, 0.115, -0.22));
    } else {
      this.head.add(box(0.275, 0.09, 0.295, hair, 0, 0.15, -0.005));
    }
    this.head.add(box(0.275, 0.17, 0.07, hair, 0, 0.04, -0.14));
    switch (a.hairStyle) {
      case 'short':
        break;
      case 'long':
        this.head.add(box(0.27, 0.48, 0.08, hair, 0, -0.16, -0.15));
        this.head.add(box(0.04, 0.3, 0.14, hair, 0.135, -0.02, -0.04));
        this.head.add(box(0.04, 0.3, 0.14, hair, -0.135, -0.02, -0.04));
        break;
      case 'ponytail': {
        const tail = box(0.09, 0.4, 0.09, hair, 0, -0.1, -0.22);
        tail.rotation.x = 0.35;
        this.head.add(tail);
        break;
      }
      case 'bob':
        this.head.add(box(0.3, 0.26, 0.07, hair, 0, -0.03, -0.14));
        this.head.add(box(0.04, 0.22, 0.2, hair, 0.145, -0.01, -0.03));
        this.head.add(box(0.04, 0.22, 0.2, hair, -0.145, -0.01, -0.03));
        break;
    }
    this.head.rotation.y = Math.PI / 2;
  }

  private buildArm(side: 1 | -1, shoulderX: number): void {
    const a = this.appearance;
    const sleeveLen = a.topStyle === 'tee' ? 0.15 : 0.27;
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderX, 0.47, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.27;
    shoulder.add(elbow);
    shoulder.add(box(0.12, 0.27, 0.12, a.skin, 0, -0.135, 0));
    shoulder.add(box(0.135, sleeveLen, 0.135, a.top, 0, -sleeveLen / 2 + 0.02, 0));
    const longSleeve = a.topStyle !== 'tee';
    elbow.add(box(0.1, 0.26, 0.1, longSleeve ? a.top : a.skin, 0, -0.13, 0));
    if (longSleeve) elbow.add(box(0.095, 0.07, 0.095, a.skin, 0, -0.29, 0));
    this.torso.add(shoulder);
    this.arms.push({ shoulder, elbow, side });
  }

  private buildLeg(side: 1 | -1): void {
    const a = this.appearance;
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.17, 0, 0);
    thigh.rotation.order = 'ZXY';
    const knee = new THREE.Group();
    knee.position.y = -THIGH;
    const foot = new THREE.Group();
    foot.position.y = -SHIN;
    thigh.add(knee);
    knee.add(foot);

    const longPants = a.bottomStyle === 'jeans';
    if (a.bottomStyle === 'shorts') {
      thigh.add(box(0.16, 0.3, 0.16, a.bottom, 0, -0.15, 0));
      thigh.add(box(0.13, 0.16, 0.13, a.skin, 0, -0.37, 0));
    } else {
      thigh.add(box(0.16, THIGH, 0.16, longPants ? a.bottom : a.skin, 0, -THIGH / 2, 0));
    }
    knee.add(box(0.135, SHIN, 0.135, longPants ? a.bottom : a.skin, 0, -SHIN / 2, 0));
    foot.add(box(0.15, 0.07, 0.3, a.shoes, 0, -0.045, 0.06));
    foot.add(box(0.155, 0.03, 0.31, 0xf1efe8, 0, -0.095, 0.06));

    this.rider.add(thigh);
    this.legs.push({ thigh, knee, foot, side });
  }

  apply(p: RigPose): void {
    this.lean.rotation.z = p.lean;

    this.board.position.y = DECK_Y + p.lift + p.boardLift;
    this.board.rotation.set(p.boardPitch, p.boardYaw, p.boardRoll);
    this.rider.position.y = DECK_Y + 0.015 + p.lift;
    this.rider.rotation.y = -Math.PI / 2;

    const hipY = 0.9 - 0.32 * p.crouch;
    const reach = Math.min(1, (hipY - ANKLE) / (THIGH + SHIN));
    const bend = Math.acos(reach);

    this.hips.position.y = hipY;
    this.torso.position.y = hipY + this.torsoY;
    this.torso.rotation.x = 0.08 + 0.55 * p.crouch;
    if (this.skirt) this.skirt.position.y = hipY - 0.08;

    // Foot brake: back leg straightens and swings out until the shoe touches the ground.
    const brakeAngle = Math.acos(Math.min(1, (hipY + DECK_TOP_TO_GROUND_ANKLE) / (THIGH + SHIN)));

    for (const leg of this.legs) {
      leg.thigh.position.y = hipY;
      const back = leg.side === -1;
      const push = back ? p.push : 0;
      const brake = back ? p.brake : 0;
      const straight = 1 - Math.max(push, brake);
      leg.thigh.rotation.set(-bend * straight, 0, -(push * 0.75 * (1 - brake) + brake * brakeAngle));
      leg.knee.rotation.x = 2 * bend * straight + push * 0.5 * (1 - brake);
      leg.foot.rotation.x = -bend * straight - push * 0.3 * (1 - brake);
      leg.foot.rotation.z = brake * brakeAngle;
    }

    for (const arm of this.arms) {
      arm.shoulder.rotation.z = arm.side * (0.12 + p.armSpread * 1.25);
      arm.shoulder.rotation.x = -p.armSwing * arm.side;
      arm.elbow.rotation.x = -0.35 - 0.2 * p.crouch;
    }
  }

  /** Drop GPU resources when swapping outfits. Materials stay in the colour cache; only non-shared geometry is disposed. */
  dispose(): void {
    this.root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const g = obj.geometry;
      if (g && !SHARED_GEOS.has(g)) g.dispose();
    });
  }
}
