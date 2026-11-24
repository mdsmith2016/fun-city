import * as THREE from 'three';
import { getHoodieFrontMaterial, type HoodieFrontArt } from './hoodieFront';
import { flatMaterial } from '../utils/lowpoly';

export type HairStyle = 'short' | 'long' | 'ponytail' | 'bob' | 'buzz';
export type TopStyle = 'tee' | 'hoodie' | 'longsleeve';
export type BottomStyle = 'jeans' | 'shorts' | 'skirt';
/** Fabric pattern for the top. Without one the top is the plain `top` colour. */
export type TopPattern = 'check';

export interface Appearance {
  name: string;
  /** If set, the displayed name alternates between `name` and this every second. */
  altName?: string;
  /** Walks on foot with no board (see Player). */
  walks?: boolean;
  gender: 'male' | 'female';
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  cap?: number;
  /** Which way the cap's brim points. Defaults to 'backwards'. */
  capDir?: 'forwards' | 'backwards';
  /** Soft brimless beanie colour (mutually exclusive with cap in practice). */
  beanie?: number;
  /** Black tricorn; replaces other headwear when set. */
  pirateHat?: number;
  /** Show the low-poly pirate ship in the inlet (Pirate James). */
  pirateShip?: boolean;
  top: number;
  topStyle: TopStyle;
  /** 'check' draws a red/black buffalo check (the `top` colour is then only used where plain cloth is needed). */
  topPattern?: TopPattern;
  /** Upper-chest canvas on hoodies (e.g. name checklist). */
  hoodieFront?: HoodieFrontArt;
  bottom: number;
  bottomStyle: BottomStyle;
  glasses?: boolean;
  /** Frame colour when glasses are on. Defaults to dark. */
  glassesColor?: number;
  /** Short stubble beard colour. */
  stubble?: number;
  /** Scarf colour: loops the head/neck and hangs down one side of the chest. */
  scarf?: number;
  /** Which side the scarf tail hangs on (skater-local). Defaults to left (-1). */
  scarfSide?: 1 | -1;
  /** Comic swear text mouth that blinks on/off (Lisa only). */
  swearMouth?: boolean;
  /** X eyes and arms-out-front riding stance (Blind Eli). */
  blind?: boolean;
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
  /** 0..1 arms reaching forward in front of the chest (blind stance). */
  armReach: number;
  /** Walkers only: stride phase (radians) and 0..1 how much of the walk cycle to show. */
  walk: number;
  walkAmt: number;
}

export const neutralPose = (): RigPose => ({
  crouch: 0.2, lean: 0, lift: 0, boardLift: 0, boardRoll: 0, boardYaw: 0, boardPitch: 0,
  armSpread: 0.3, armSwing: 0, push: 0, brake: 0, armReach: 0, walk: 0, walkAmt: 0,
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

/** Buffalo check: red with black bands crossing at half strength. One shared material for every patterned top. */
let checkMaterial: THREE.MeshLambertMaterial | null = null;
const CHECK_TILE = 0.16;

let swearMouthMaterial: THREE.MeshBasicMaterial | null = null;

function getSwearMouthMaterial(): THREE.MeshBasicMaterial {
  if (swearMouthMaterial) return swearMouthMaterial;
  const cv = document.createElement('canvas');
  cv.width = 144;
  cv.height = 52;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, cv.width, cv.height);
  g.font =
    'bold 34px "Arial Unicode MS", "Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols", "DejaVu Sans", sans-serif';
  g.fillStyle = '#8b0000';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('¥#€%', cv.width / 2, cv.height / 2 + 1);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  swearMouthMaterial = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  return swearMouthMaterial;
}

function getCheckMaterial(): THREE.MeshLambertMaterial {
  if (checkMaterial) return checkMaterial;
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#c4231f';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(8, 8, 10, 0.62)';
  g.fillRect(32, 0, 32, 64);
  g.fillRect(0, 32, 64, 32);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.anisotropy = 4;
  checkMaterial = new THREE.MeshLambertMaterial({ map: tex, flatShading: true });
  return checkMaterial;
}

/** A box whose texture repeats at a fixed real-world size, so the check stays square on every face. */
function checkBox(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.getAttribute('uv');
  const faceDims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let i = 0; i < uv.count; i++) {
    const [fu, fv] = faceDims[Math.floor(i / 4)];
    uv.setXY(i, (uv.getX(i) * fu) / CHECK_TILE, (uv.getY(i) * fv) / CHECK_TILE);
  }
  const mesh = new THREE.Mesh(geo, getCheckMaterial());
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
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
  /** On-foot skater: no board, stands upright and faces forward. */
  private readonly walker: boolean;
  private mouth: THREE.Mesh | null = null;

  constructor(readonly appearance: Appearance) {
    const a = appearance;
    this.walker = !!a.walks;
    const female = a.gender === 'female';
    const torsoW = female ? 0.38 : 0.44;
    const shoulderX = torsoW / 2 + 0.06;

    this.root.add(this.lean);
    this.lean.add(this.rider);
    if (!this.walker) {
      this.lean.add(this.board);
      this.buildBoard(a.board);
    }

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
    this.torso.add(this.cloth(torsoW, 0.52, 0.25, 0, 0.26, 0));
    this.torso.add(box(0.1, 0.1, 0.1, a.skin, 0, 0.55, 0));
    if (a.topStyle === 'hoodie') {
      this.torso.add(this.cloth(0.28, 0.16, 0.14, 0, 0.54, -0.12));
      this.torso.add(this.cloth(0.3, 0.12, 0.03, 0, 0.14, 0.135));
      if (a.hoodieFront) {
        const panel = new THREE.Mesh(
          new THREE.PlaneGeometry(0.22, 0.2),
          getHoodieFrontMaterial(a.hoodieFront, a.top),
        );
        panel.position.set(0, 0.38, 0.127);
        panel.castShadow = false;
        panel.receiveShadow = false;
        this.torso.add(panel);
      }
    }
    if (a.scarf !== undefined) {
      const c = a.scarf;
      const side = a.scarfSide ?? -1;
      const loopH = 0.03;
      const loopY = 0.54;
      // Neck loop on the torso (sits on body, not the lower face).
      this.torso.add(box(0.27, loopH, 0.27, c, 0, loopY, -0.02));
      this.torso.add(box(0.29, 0.025, 0.05, c, 0, loopY - 0.004, 0.1));
      const tailH = 0.36;
      const tailY = loopY - loopH / 2 - tailH / 2;
      this.torso.add(box(0.038, tailH, 0.028, c, side * 0.1, tailY, 0.12));
    }
    this.buildHead();
    this.torso.add(this.head);
    this.head.position.set(0, 0.52 + 0.17, 0);

    for (const side of [1, -1] as const) {
      this.buildArm(side, shoulderX);
      this.buildLeg(side);
    }
  }

  /** A piece of the top: plain colour, or the check pattern when the skater wears one. */
  private cloth(w: number, h: number, d: number, x: number, y: number, z: number): THREE.Mesh {
    return this.appearance.topPattern === 'check' ? checkBox(w, h, d, x, y, z) : box(w, h, d, this.appearance.top, x, y, z);
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
    if (a.blind) this.addBlindEyes();
    else for (const x of [-0.06, 0.06]) this.head.add(box(0.035, 0.04, 0.02, 0x1f1f24, x, 0.02, 0.131, false));
    const hair = a.hair;
    const buzz = a.hairStyle === 'buzz';
    if (a.cap !== undefined) {
      this.head.add(box(0.275, 0.1, 0.3, a.cap, 0, 0.15, -0.01));
      const brimZ = a.capDir === 'forwards' ? 0.22 : -0.22;
      this.head.add(box(0.2, 0.025, 0.12, a.cap, 0, 0.115, brimZ));
    } else if (a.pirateHat !== undefined) {
      const c = a.pirateHat;
      this.head.add(box(0.34, 0.025, 0.34, c, 0, 0.165, 0));
      this.head.add(box(0.14, 0.13, 0.14, c, 0, 0.23, 0));
      for (let i = 0; i < 3; i++) {
        const lobe = box(0.15, 0.055, 0.26, c, 0, 0.205, -0.07);
        lobe.rotation.y = (i * Math.PI * 2) / 3;
        lobe.rotation.x = -0.12;
        this.head.add(lobe);
      }
    } else if (a.beanie !== undefined) {
      const c = a.beanie;
      // Soft dome + folded cuff, no brim.
      this.head.add(box(0.285, 0.11, 0.305, c, 0, 0.17, -0.01));
      this.head.add(box(0.29, 0.045, 0.31, c, 0, 0.105, -0.005));
    } else if (buzz) {
      // Close-cropped: a thin shell hugging the skull.
      this.head.add(box(0.25, 0.03, 0.27, hair, 0, 0.14, 0));
    } else {
      this.head.add(box(0.275, 0.09, 0.295, hair, 0, 0.15, -0.005));
    }
    if (buzz) {
      this.head.add(box(0.252, 0.13, 0.02, hair, 0, 0.07, -0.135));
      for (const x of [-1, 1]) this.head.add(box(0.02, 0.1, 0.2, hair, x * 0.125, 0.085, -0.02));
    } else {
      this.head.add(box(0.275, 0.17, 0.07, hair, 0, 0.04, -0.14));
    }
    if (a.stubble !== undefined) {
      const c = a.stubble;
      this.head.add(box(0.16, 0.055, 0.035, c, 0, -0.102, 0.122, false));
      this.head.add(box(0.22, 0.035, 0.028, c, 0, -0.085, 0.128, false));
      for (const x of [-0.075, 0.075]) this.head.add(box(0.042, 0.048, 0.028, c, x, -0.06, 0.108, false));
    }
    if (a.glasses) {
      const frame = a.glassesColor ?? 0x16161a;
      for (const x of [-0.065, 0.065]) {
        this.head.add(box(0.1, 0.012, 0.012, frame, x, 0.062, 0.138, false));
        this.head.add(box(0.1, 0.012, 0.012, frame, x, -0.014, 0.138, false));
        this.head.add(box(0.012, 0.088, 0.012, frame, x - 0.05, 0.024, 0.138, false));
        this.head.add(box(0.012, 0.088, 0.012, frame, x + 0.05, 0.024, 0.138, false));
      }
      this.head.add(box(0.03, 0.012, 0.012, frame, 0, 0.05, 0.138, false));
      for (const x of [-0.126, 0.126]) this.head.add(box(0.012, 0.012, 0.15, frame, x, 0.05, 0.062, false));
    }
    switch (a.hairStyle) {
      case 'short':
      case 'buzz':
        break;
      case 'long':
        // Hang slightly wider and farther back so shoulder sleeves don't z-fight through the hair.
        this.head.add(box(0.295, 0.48, 0.085, hair, 0, -0.16, -0.17));
        this.head.add(box(0.038, 0.3, 0.12, hair, 0.158, -0.02, -0.065));
        this.head.add(box(0.038, 0.3, 0.12, hair, -0.158, -0.02, -0.065));
        break;
      case 'ponytail': {
        const tail = box(0.09, 0.4, 0.09, hair, 0, -0.1, -0.245);
        tail.rotation.x = 0.35;
        this.head.add(tail);
        break;
      }
      case 'bob':
        this.head.add(box(0.31, 0.26, 0.075, hair, 0, -0.03, -0.155));
        this.head.add(box(0.038, 0.22, 0.18, hair, 0.162, -0.01, -0.055));
        this.head.add(box(0.038, 0.22, 0.18, hair, -0.162, -0.01, -0.055));
        break;
    }
    if (a.swearMouth) this.mouth = this.addSwearMouth();
    if (a.blind) {
      // Face the chest / reach direction, not the board's travel axis.
      this.head.rotation.y = 0;
    } else {
      this.head.rotation.y = this.appearance.walks ? 0 : Math.PI / 2;
    }
  }

  private addBlindEyes(): void {
    const ink = 0x1f1f24;
    for (const x of [-0.06, 0.06]) {
      const g = new THREE.Group();
      g.position.set(x, 0.02, 0.131);
      const bar = () => {
        const m = box(0.034, 0.006, 0.012, ink, 0, 0, 0, false);
        m.rotation.z = Math.PI / 4;
        return m;
      };
      g.add(bar());
      const bar2 = box(0.034, 0.006, 0.012, ink, 0, 0, 0, false);
      bar2.rotation.z = -Math.PI / 4;
      g.add(bar2);
      this.head.add(g);
    }
  }

  private applyArms(p: RigPose): void {
    const reach = this.appearance.blind ? p.armReach : 0;
    for (const arm of this.arms) {
      if (reach > 0.01) {
        // Pitch both arms straight forward (+chest), not behind the torso.
        arm.shoulder.rotation.z = arm.side * 0.04;
        arm.shoulder.rotation.x = -(0.52 + reach * 0.82) + Math.min(0.08, p.armSwing * arm.side * 0.5);
        arm.elbow.rotation.x = -0.06 - 0.08 * p.crouch;
      } else {
        arm.shoulder.rotation.z = arm.side * (0.12 + p.armSpread * 1.25);
        arm.shoulder.rotation.x = -p.armSwing * arm.side;
        arm.elbow.rotation.x = -0.35 - 0.2 * p.crouch;
      }
    }
  }

  private addSwearMouth(): THREE.Mesh {
    const mouthW = 0.22;
    const mouthH = 0.07;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(mouthW, mouthH), getSwearMouthMaterial());
    mesh.position.set(0, -0.055, 0.134);
    mesh.rotation.z = (15 * Math.PI) / 180;
    mesh.renderOrder = 2;
    this.head.add(mesh);
    return mesh;
  }

  private updateSwearMouth(): void {
    if (!this.mouth) return;
    this.mouth.visible = Math.floor(performance.now() / 1000) % 2 === 0;
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
    shoulder.add(this.cloth(0.135, sleeveLen, 0.135, 0, -sleeveLen / 2 + 0.02, 0));
    const longSleeve = a.topStyle !== 'tee';
    elbow.add(longSleeve ? this.cloth(0.1, 0.26, 0.1, 0, -0.13, 0) : box(0.1, 0.26, 0.1, a.skin, 0, -0.13, 0));
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

  /**
   * Walker pose. The rider faces forward (+z). boardRoll / boardPitch / boardYaw are reused as whole-body flip
   * angles, pivoting about the hips so a flip doesn't dig into the floor.
   */
  private applyWalker(p: RigPose): void {
    const pivot = 0.9;
    this.lean.rotation.z = 0;
    this.rider.rotation.set(p.boardPitch, p.boardYaw, p.boardRoll);
    this.rider.position.set(
      pivot * Math.sin(p.boardRoll),
      p.lift + pivot * (2 - Math.cos(p.boardRoll) - Math.cos(p.boardPitch)),
      -pivot * Math.sin(p.boardPitch),
    );

    const len = THIGH + SHIN;
    const stride = 0.5 * p.walkAmt * Math.abs(Math.sin(p.walk));
    const hipY = ANKLE + len * (1 - 0.35 * p.crouch) * Math.cos(stride);
    const bend = Math.acos(Math.min(1, (hipY - ANKLE) / len));

    this.hips.position.y = hipY;
    this.torso.position.y = hipY + this.torsoY;
    this.torso.rotation.x = 0.03 + 0.35 * p.crouch;
    if (this.skirt) this.skirt.position.y = hipY - 0.08;

    for (const leg of this.legs) {
      const phase = p.walk + (leg.side === 1 ? 0 : Math.PI);
      const swing = Math.sin(phase) * 0.5 * p.walkAmt;
      const lift = Math.max(0, Math.cos(phase)) * 0.95 * p.walkAmt;
      leg.thigh.position.y = hipY;
      leg.thigh.rotation.set(-bend - swing, 0, 0);
      leg.knee.rotation.x = 2 * bend + lift;
      leg.foot.rotation.x = -(leg.thigh.rotation.x + leg.knee.rotation.x);
      leg.foot.rotation.z = 0;
    }
    this.applyArms(p);
    this.updateSwearMouth();
  }

  apply(p: RigPose): void {
    if (this.walker) {
      this.applyWalker(p);
      return;
    }
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

    this.applyArms(p);
    this.updateSwearMouth();
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
