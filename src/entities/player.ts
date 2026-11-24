import type { Keyboard } from '../input/keyboard';
import { TRICKS, classifyGrind, type GrindInfo, type TrickDef } from '../game/tricks';
import type { Obstacle, World } from '../world/types';
import { clamp, damp, lerp, lerpAngle, smoothstep } from '../utils/math';
import { SkaterRig, neutralPose, type Appearance, type RigPose } from './skaterModel';

export interface PlayerEvents {
  /** Player popped an ollie from the ground. */
  ollie(): void;
  /** Touched down (ground or rail/ledge) after being airborne. `tricks` are the air tricks done on the way. */
  landed(tricks: TrickDef[], airTime: number, ollied: boolean, onto: 'ground' | 'grind'): void;
  grindStart(info: GrindInfo): void;
  grindTick(dt: number, rate: number): void;
  grindEnd(): void;
}

export type Mode = 'ground' | 'air' | 'grind';

const MAX_SPEED = 9.5;
const PUSH_ACCEL = 5.5;
const BRAKE = 15;
const GRAVITY = 19;
const OLLIE_VY = 6.4;
const JUMP_BUFFER = 0.14;
const RADIUS = 0.35;
const MIN_GRIND_SPEED = 4.5;
/** Extra reach when landing near a rail/ledge, so near misses still stick. */
const LAND_FORGIVENESS = 0.4;
/** While descending, anything within this height above a surface's top gets sucked onto it. */
const STICK_HEIGHT = 0.6;

const WALK_SPEED = 3.4;
const WALK_BACK_SPEED = 2.0;
const WALK_ACCEL = 16;
const WALK_TURN = 2.6;

interface ActiveTrick {
  def: TrickDef;
  t: number;
  done: boolean;
}

/**
 * Arcade skater controller. Flat world: the ground is y = 0 and the only vertical surfaces are the obstacles' flat tops.
 * Three modes: rolling on the ground, flying through the air, and locked to an obstacle (grind/slide).
 * Landings never fail: tricks always complete, you never fall off the board.
 */
export class Player {
  rig: SkaterRig;

  x = 0;
  y = 0;
  z = 0;
  heading = 0;
  speed = 0;
  vy = 0;
  mode: Mode = 'ground';

  private prev = { x: 0, y: 0, z: 0, h: 0 };
  private readonly pose: RigPose = neutralPose();
  private spinYaw = 0;

  private jumpBuf = 0;
  private airTime = 0;
  private ollied = false;
  private ollieT = 99;
  private crouchKick = 0;
  private airTricks: TrickDef[] = [];
  private trick: ActiveTrick | null = null;
  private pushPhase = 0;
  private walkPhase = 0;
  private walkAmt = 0;
  private pushAmt = 0;
  private time = 0;

  private grindObs: Obstacle | null = null;
  private grindDir = 1;
  private grindT = 0;
  private grindLat = 0;
  private grindInfo: GrindInfo | null = null;
  private lastObs: Obstacle | null = null;
  private lockUntil = 0;

  constructor(
    appearance: Appearance,
    private readonly world: World,
    private readonly events: PlayerEvents,
  ) {
    this.rig = new SkaterRig(appearance);
  }

  /** Swap the clothes. The caller moves the new rig's root into the scene. */
  setAppearance(appearance: Appearance): void {
    this.rig.dispose();
    this.rig = new SkaterRig(appearance);
  }

  /** Walkers (e.g. Viviana) go on foot: no board, walk speed, jump instead of ollie. */
  private get walks(): boolean {
    return !!this.rig.appearance.walks;
  }

  reset(x: number, z: number, heading: number): void {
    this.walkPhase = 0;
    this.walkAmt = 0;
    this.x = x;
    this.y = 0;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.vy = 0;
    this.mode = 'ground';
    this.trick = null;
    this.airTricks = [];
    this.grindObs = null;
    this.grindInfo = null;
    this.spinYaw = 0;
    this.pushAmt = 0;
    Object.assign(this.pose, neutralPose());
    this.prev = { x, y: 0, z, h: heading };
    this.render(1);
  }

  /** Live trick label for the HUD ('' when there's nothing to show). */
  get displayName(): string {
    if (this.mode === 'grind') return this.grindInfo?.name ?? '';
    if (this.mode === 'air') {
      const names = this.airTricks.map((t) => t.name);
      if (names.length) return names.join(' + ');
      return this.ollied ? 'Ollie' : '';
    }
    return '';
  }

  /** Interpolated state for the camera, valid after render(). */
  readonly view = { x: 0, y: 0, z: 0, h: 0 };

  update(dt: number, keys: Keyboard): void {
    this.time += dt;
    this.prev.x = this.x;
    this.prev.y = this.y;
    this.prev.z = this.z;
    this.prev.h = this.heading;

    const steer = keys.axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']);
    if (keys.justPressed('Space')) this.jumpBuf = JUMP_BUFFER;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);

    switch (this.mode) {
      case 'ground':
        this.updateGround(dt, keys, steer);
        break;
      case 'air':
        this.updateAir(dt, keys, steer);
        break;
      case 'grind':
        this.updateGrind(dt, keys);
        break;
    }
    this.updatePose(dt, keys, steer);
  }

  render(alpha: number): void {
    const v = this.view;
    v.x = lerp(this.prev.x, this.x, alpha);
    v.y = lerp(this.prev.y, this.y, alpha);
    v.z = lerp(this.prev.z, this.z, alpha);
    v.h = lerpAngle(this.prev.h, this.heading, alpha);
    this.rig.root.position.set(v.x, v.y, v.z);
    this.rig.root.rotation.y = v.h + this.spinYaw;
    this.rig.apply(this.pose);
  }

  // --- ground ---------------------------------------------------------------

  private updateWalk(dt: number, keys: Keyboard, steer: number): void {
    const fwd = keys.isDown('KeyW') || keys.isDown('ArrowUp');
    const back = keys.isDown('KeyS') || keys.isDown('ArrowDown');
    const target = fwd === back ? 0 : fwd ? WALK_SPEED : -WALK_BACK_SPEED;
    const a = WALK_ACCEL * dt;
    this.speed += clamp(target - this.speed, -a, a);
    this.heading += steer * WALK_TURN * dt;
    this.move(dt);
    this.resolveStatics();
    this.clampBounds();
    if (this.jumpBuf > 0) this.ollie();
  }

  private updateGround(dt: number, keys: Keyboard, steer: number): void {
    if (this.walks) {
      this.updateWalk(dt, keys, steer);
      return;
    }
    if (keys.isDown('KeyW') || keys.isDown('ArrowUp')) {
      if (this.speed < MAX_SPEED) this.speed = Math.min(MAX_SPEED, this.speed + PUSH_ACCEL * dt);
    } else {
      this.speed = Math.max(0, this.speed - (0.3 * this.speed + 0.25) * dt);
    }
    if (keys.isDown('KeyS') || keys.isDown('ArrowDown')) this.speed = Math.max(0, this.speed - BRAKE * dt);

    this.turn(dt, steer, 1);
    this.move(dt);
    this.resolveStatics();
    this.clampBounds();

    if (this.jumpBuf > 0) this.ollie();
  }

  private turn(dt: number, steer: number, scale: number): void {
    const base = 2.5 - 1.0 * (this.speed / MAX_SPEED);
    const rate = base * (0.45 + 0.55 * Math.min(1, this.speed / 4)) * scale;
    this.heading += steer * rate * dt;
  }

  private move(dt: number): void {
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;
  }

  private ollie(): void {
    this.vy = this.walks ? OLLIE_VY : OLLIE_VY + this.speed * 0.04;
    this.mode = 'air';
    this.airTime = 0;
    this.ollied = true;
    this.ollieT = 0;
    this.crouchKick = 1;
    this.airTricks = [];
    this.trick = null;
    this.jumpBuf = 0;
    this.events.ollie();
  }

  // --- air --------------------------------------------------------------------

  private updateAir(dt: number, keys: Keyboard, steer: number): void {
    this.airTime += dt;
    if (this.walks) {
      const fwd = keys.isDown('KeyW') || keys.isDown('ArrowUp');
      const back = keys.isDown('KeyS') || keys.isDown('ArrowDown');
      const target = fwd === back ? 0 : fwd ? WALK_SPEED * 0.7 : -WALK_BACK_SPEED * 0.7;
      this.speed += (target - this.speed) * damp(3, dt);
      this.heading += steer * WALK_TURN * 0.6 * dt;
    } else {
      this.turn(dt, steer, 0.35);
    }

    if (!this.trick || this.trick.done) {
      for (const def of TRICKS) {
        if (keys.justPressed(def.code)) {
          this.trick = { def, t: 0, done: false };
          this.airTricks.push(def);
          break;
        }
      }
    }
    if (this.trick && !this.trick.done) {
      this.trick.t += dt;
      if (this.trick.t >= this.trick.def.dur) {
        this.trick.t = this.trick.def.dur;
        this.trick.done = true;
      }
    }

    this.move(dt);
    const prevY = this.y;
    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    this.clampBounds();

    if (this.vy < 0) this.tryLand(prevY);
  }

  private tryLand(prevY: number): void {
    let best: Obstacle | null = null;
    let bestT = 0;
    let bestLat = 0;
    let bestScore = Infinity;
    for (const o of this.world.obstacles) {
      if (prevY < o.top - 0.35 || this.y > o.top + STICK_HEIGHT) continue;
      if (o === this.lastObs && this.time < this.lockUntil) continue;
      const rx = this.x - o.ax;
      const rz = this.z - o.az;
      const t = rx * o.dx + rz * o.dz;
      const lat = -rx * o.dz + rz * o.dx;
      if (t < -LAND_FORGIVENESS || t > o.len + LAND_FORGIVENESS) continue;
      if (Math.abs(lat) > o.hw + LAND_FORGIVENESS) continue;
      const score = Math.abs(lat) - o.top * 0.1;
      if (score < bestScore) {
        best = o;
        bestT = t;
        bestLat = lat;
        bestScore = score;
      }
    }
    if (best) {
      this.startGrind(best, bestT, bestLat);
    } else if (this.y <= 0) {
      this.landOnGround();
    }
  }

  private landOnGround(): void {
    this.y = 0;
    this.vy = 0;
    this.mode = 'ground';
    this.crouchKick = Math.max(this.crouchKick, 0.7);
    this.finishTrickVisuals();
    const tricks = this.airTricks;
    this.airTricks = [];
    this.events.landed(tricks, this.airTime, this.ollied, 'ground');
    this.ollied = false;
    this.resolveStatics();
  }

  /** Forgiving landings: an unfinished trick snaps to its (symmetric) end pose instead of unwinding. */
  private finishTrickVisuals(): void {
    this.trick = null;
    this.spinYaw = 0;
    this.pose.boardRoll = 0;
    this.pose.boardYaw = 0;
  }

  // --- grind / slide --------------------------------------------------------------

  private startGrind(o: Obstacle, t: number, lat: number): void {
    const dot = Math.sin(this.heading) * o.dx + Math.cos(this.heading) * o.dz;
    const dir = dot >= 0 ? 1 : -1;
    const theta = Math.acos(Math.min(1, Math.abs(dot)));
    const side = dir === 1 ? lat : -lat;

    this.mode = 'grind';
    this.grindObs = o;
    this.grindDir = dir;
    this.grindT = clamp(t, 0, o.len);
    this.grindLat = clamp(lat, -(o.hw + LAND_FORGIVENESS), o.hw + LAND_FORGIVENESS);
    this.grindInfo = classifyGrind(o.kind, theta, side);
    this.y = o.top;
    this.vy = 0;
    this.speed = Math.max(this.speed, MIN_GRIND_SPEED);
    this.finishTrickVisuals();
    this.jumpBuf = 0;

    const tricks = this.airTricks;
    this.airTricks = [];
    this.events.landed(tricks, this.airTime, this.ollied, 'grind');
    this.ollied = false;
    this.events.grindStart(this.grindInfo);
  }

  private updateGrind(dt: number, keys: Keyboard): void {
    const o = this.grindObs!;
    const info = this.grindInfo!;

    if (keys.isDown('KeyW') || keys.isDown('ArrowUp')) this.speed = Math.min(MAX_SPEED, this.speed + 2.5 * dt);
    else this.speed = Math.max(MIN_GRIND_SPEED, this.speed - 0.6 * dt);

    this.grindT += this.grindDir * this.speed * dt;
    this.grindLat *= Math.exp(-9 * dt);
    const t = clamp(this.grindT, 0, o.len);
    this.x = o.ax + o.dx * t - o.dz * this.grindLat;
    this.z = o.az + o.dz * t + o.dx * this.grindLat;
    this.y = o.top;
    this.heading = lerpAngle(this.heading, Math.atan2(o.dx * this.grindDir, o.dz * this.grindDir), damp(12, dt));
    this.events.grindTick(dt, info.rate);

    if (this.jumpBuf > 0) {
      this.leaveGrind(6.0);
      this.ollied = false;
      this.jumpBuf = 0;
    } else if (this.grindT < 0 || this.grindT > o.len) {
      this.leaveGrind(o.kind === 'rail' ? 2.4 : 1.2);
    }
  }

  private leaveGrind(vy: number): void {
    this.lastObs = this.grindObs;
    this.lockUntil = this.time + 0.4;
    this.grindObs = null;
    this.grindInfo = null;
    this.mode = 'air';
    this.vy = vy;
    this.airTime = 0;
    this.airTricks = [];
    this.trick = null;
    this.ollied = false;
    this.ollieT = 0;
    this.events.grindEnd();
  }

  // --- collisions ---------------------------------------------------------------------

  /** Cancel velocity into a surface (unit normal pointing away from it) and slide along it. */
  private pushVelocity(nx: number, nz: number): void {
    const vx = Math.sin(this.heading) * this.speed;
    const vz = Math.cos(this.heading) * this.speed;
    const vn = vx * nx + vz * nz;
    if (vn >= 0) return;
    const tx = vx - vn * nx;
    const tz = vz - vn * nz;
    if (this.walks) {
      const along = tx * Math.sin(this.heading) + tz * Math.cos(this.heading);
      this.speed = Math.abs(along) < 0.3 ? 0 : along;
      return;
    }
    const sp = Math.hypot(tx, tz);
    if (sp < 0.4) {
      this.speed = 0;
    } else {
      this.heading = Math.atan2(tx, tz);
      this.speed = sp;
    }
  }

  /** Ground riders can't pass through ledges, walls, benches, trees or lamps. Airborne riders go over. */
  private resolveStatics(): void {
    for (const o of this.world.obstacles) {
      const rx = this.x - o.ax;
      const rz = this.z - o.az;
      const t = clamp(rx * o.dx + rz * o.dz, 0, o.len);
      const cx = o.ax + o.dx * t;
      const cz = o.az + o.dz * t;
      let ox = this.x - cx;
      let oz = this.z - cz;
      const min = o.hw + RADIUS;
      const d2 = ox * ox + oz * oz;
      if (d2 >= min * min) continue;
      let d = Math.sqrt(d2);
      if (d < 1e-4) {
        ox = -o.dz;
        oz = o.dx;
        d = 1;
      }
      const nx = ox / d;
      const nz = oz / d;
      this.x = cx + nx * min;
      this.z = cz + nz * min;
      this.pushVelocity(nx, nz);
    }
    for (const c of this.world.circles) {
      const ox = this.x - c.x;
      const oz = this.z - c.z;
      const min = c.r + RADIUS;
      const d2 = ox * ox + oz * oz;
      if (d2 >= min * min || d2 < 1e-8) continue;
      const d = Math.sqrt(d2);
      this.x = c.x + (ox / d) * min;
      this.z = c.z + (oz / d) * min;
      this.pushVelocity(ox / d, oz / d);
    }
  }

  private clampBounds(): void {
    const b = this.world.bounds;
    if (this.x < b.minX) {
      this.x = b.minX;
      this.pushVelocity(1, 0);
    } else if (this.x > b.maxX) {
      this.x = b.maxX;
      this.pushVelocity(-1, 0);
    }
    if (this.z < b.minZ) {
      this.z = b.minZ;
      this.pushVelocity(0, 1);
    } else if (this.z > b.maxZ) {
      this.z = b.maxZ;
      this.pushVelocity(0, -1);
    }
  }

  // --- animation ------------------------------------------------------------------------

  /** On-foot pose: walk cycle on the ground, tucked jump in the air, upright slide on obstacles. Flips reuse the board-trick fields. */
  private updateWalkerPose(dt: number, steer: number): void {
    const p = this.pose;
    this.crouchKick = Math.max(0, this.crouchKick - dt * 4.5);
    this.ollieT += dt;

    let crouch = 0.02;
    let spread = 0.08 + 0.12 * Math.abs(steer);
    let walkTarget = 0;
    if (this.mode === 'ground') {
      this.walkPhase += dt * this.speed * 2.3;
      walkTarget = Math.min(1, Math.abs(this.speed) / 1.2);
      crouch = Math.max(crouch, this.crouchKick * 0.6);
    } else if (this.mode === 'air') {
      crouch = Math.max(0.5 + (this.trick && !this.trick.done ? 0.15 : 0), 0.3 + this.crouchKick * 0.4);
      spread = 0.7;
    } else {
      crouch = 0.14 + 0.03 * Math.sin(this.time * 7);
      spread = 0.55 + 0.1 * Math.sin(this.time * 5);
    }
    this.walkAmt = lerp(this.walkAmt, walkTarget, damp(10, dt));

    p.walk = this.walkPhase;
    p.walkAmt = this.walkAmt;
    p.crouch = lerp(p.crouch, crouch, damp(16, dt));
    p.lean = 0;
    p.lift = 0;
    p.boardLift = 0;
    p.armSpread = lerp(p.armSpread, spread, damp(10, dt));
    p.armSwing = -Math.sin(this.walkPhase) * 0.6 * this.walkAmt;
    p.push = 0;
    p.brake = 0;

    this.spinYaw = 0;
    p.boardRoll = 0;
    p.boardYaw = 0;
    p.boardPitch = 0;
    if (this.mode === 'air' && this.trick && !this.trick.done) {
      const tr = this.trick;
      const e = smoothstep(tr.t / tr.def.dur);
      p.boardRoll = tr.def.roll * e;
      p.boardYaw = tr.def.yaw * e;
      p.boardPitch = tr.def.pitch * e;
      this.spinYaw = tr.def.spin * e;
    }
  }

  private updatePose(dt: number, keys: Keyboard, steer: number): void {
    if (this.walks) {
      this.updateWalkerPose(dt, steer);
      return;
    }
    const p = this.pose;
    const k = damp(14, dt);
    const speedK = Math.min(1, this.speed / 6);

    let crouch = 0.18 + 0.1 * (this.speed / MAX_SPEED);
    let lean = -steer * 0.26 * (0.3 + 0.7 * speedK);
    let spread = 0.25 + 0.2 * Math.abs(steer);
    let swing = 0;
    let lift = 0;
    let targetPitch = 0;
    let targetYaw = 0;
    let push = 0;
    let brake = 0;

    this.crouchKick = Math.max(0, this.crouchKick - dt * 4.5);
    this.ollieT += dt;

    if (this.mode === 'ground') {
      const braking = (keys.isDown('KeyS') || keys.isDown('ArrowDown')) && this.speed > 0.3;
      brake = braking ? 1 : 0;
      const pushing = !braking && (keys.isDown('KeyW') || keys.isDown('ArrowUp')) && this.speed < MAX_SPEED * 0.88;
      if (pushing) this.pushPhase += dt * 6.5;
      this.pushAmt = lerp(this.pushAmt, pushing ? 1 : 0, damp(10, dt));
      const wave = Math.max(0, Math.sin(this.pushPhase));
      push = this.pushAmt * wave;
      crouch += 0.12 * this.pushAmt + 0.12 * brake;
      swing = this.pushAmt * Math.sin(this.pushPhase) * 0.5;
      crouch = Math.max(crouch, this.crouchKick);
    } else if (this.mode === 'air') {
      crouch = 0.62 + (this.trick && !this.trick.done ? 0.2 : 0);
      crouch = Math.max(crouch, 0.35 + this.crouchKick * 0.4);
      spread = 0.75;
      targetPitch = this.ollieT < 0.4 ? -0.5 * Math.sin((this.ollieT / 0.4) * Math.PI) : 0;
      lean *= 0.5;
    } else {
      const info = this.grindInfo!;
      crouch = 0.5 + 0.05 * Math.sin(this.time * 7);
      spread = 0.6 + 0.15 * Math.sin(this.time * 5);
      lean = 0.04 * Math.sin(this.time * 9);
      lift = this.grindObs!.kind === 'rail' ? -0.045 : -0.02;
      if (info.style === 'nose') targetPitch = 0.45;
      else if (info.style === 'tail') targetPitch = -0.45;
      else if (info.style === 'board') targetYaw = Math.PI / 2;
      else if (info.style === 'lip') targetYaw = -Math.PI / 2;
    }

    p.crouch = lerp(p.crouch, crouch, damp(16, dt));
    p.lean = lerp(p.lean, lean, k);
    p.armSpread = lerp(p.armSpread, spread, damp(10, dt));
    p.armSwing = lerp(p.armSwing, swing, damp(12, dt));
    p.lift = lerp(p.lift, lift, damp(20, dt));
    p.push = push;
    p.brake = lerp(p.brake, brake, damp(16, dt));

    let targetReach = 0;
    if (this.rig.appearance.blind) {
      if (this.mode === 'ground') targetReach = 0.9 - push * 0.12;
      else if (this.mode === 'grind') targetReach = 0.42;
      else if (this.trick && !this.trick.done) targetReach = 0.22;
      else targetReach = 0.48;
      swing *= 0.25;
      p.armSwing = lerp(p.armSwing, swing, damp(12, dt));
    }
    p.armReach = lerp(p.armReach, targetReach, damp(10, dt));

    // Board orientation: trick animation in the air, grind stance on obstacles, eased back to neutral otherwise.
    const ease = damp(18, dt);
    let roll = lerp(p.boardRoll, 0, ease);
    let yaw: number;
    let pitch: number;
    let boardLift = 0;
    this.spinYaw = 0;
    if (this.mode === 'grind') {
      yaw = lerp(p.boardYaw, targetYaw, ease);
      pitch = lerp(p.boardPitch, targetPitch, ease);
    } else if (this.mode === 'air' && this.trick && !this.trick.done) {
      const tr = this.trick;
      const progress = tr.t / tr.def.dur;
      const e = smoothstep(progress);
      roll = tr.def.roll * e;
      yaw = tr.def.yaw * e;
      pitch = targetPitch + tr.def.pitch * e;
      this.spinYaw = tr.def.spin * e;
      boardLift = Math.sin(Math.PI * progress) * 0.16;
    } else if (this.mode === 'air' && this.trick) {
      roll = 0;
      yaw = 0;
      pitch = targetPitch;
    } else {
      yaw = lerp(p.boardYaw, 0, ease);
      pitch = lerp(p.boardPitch, targetPitch, ease);
    }
    p.boardRoll = roll;
    p.boardYaw = yaw;
    p.boardPitch = pitch;
    p.boardLift = boardLift;
  }
}
