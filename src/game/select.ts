import * as THREE from 'three';
import { addDefaultLights, createCamera, type Lights } from '../core/scene';
import { SkaterRig, neutralPose } from '../entities/skaterModel';
import { ROSTER } from '../entities/roster';
import { damp, lerp } from '../utils/math';

/** Base facing is a side profile; turn it 20 degrees toward the camera so faces show more often. */
const FACE_CAMERA = (20 * Math.PI) / 180;

/** Little stage with the whole roster in a row; the camera slides along to the selected skater. Rendered with the shared renderer while on the select screen. */
export class CharacterSelect {
  readonly scene = new THREE.Scene();
  readonly camera = createCamera(36);
  index = 0;

  private readonly rigs: SkaterRig[] = [];
  private readonly platforms: THREE.Mesh[] = [];
  private readonly scales: number[] = [];
  private time = 0;
  private camX = 0;
  private readonly lights: Lights;

  constructor() {
    this.scene.background = new THREE.Color(0x26354a);
    this.scene.fog = new THREE.Fog(0x26354a, 14, 30);
    this.lights = addDefaultLights(this.scene, 8);
    this.lights.follow(0, 0, 0);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(40, 24).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x33445c }),
    );
    floor.receiveShadow = true;
    this.scene.add(floor);

    ROSTER.forEach((appearance, i) => {
      const rig = new SkaterRig(appearance);
      const x = this.slotX(i);
      rig.root.position.set(x, 0.12, 0);
      this.scene.add(rig.root);
      this.rigs.push(rig);
      this.scales.push(1);

      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.05, 0.12, 10),
        new THREE.MeshLambertMaterial({ color: 0x55657c, flatShading: true }),
      );
      platform.position.set(x, 0.06, 0);
      platform.receiveShadow = true;
      this.scene.add(platform);
      this.platforms.push(platform);
    });

    this.camX = this.slotX(0);
    this.placeCamera();
  }

  private slotX(i: number): number {
    return (i - (ROSTER.length - 1) / 2) * 2.3;
  }

  private placeCamera(): void {
    this.camera.position.set(this.camX, 1.4, 8.8);
    this.camera.lookAt(this.camX, 0.15, 0);
  }

  move(dir: -1 | 1): void {
    this.index = (this.index + dir + ROSTER.length) % ROSTER.length;
  }

  update(dt: number): void {
    this.time += dt;
    this.camX = lerp(this.camX, this.slotX(this.index), damp(6, dt));
    this.placeCamera();
    this.lights.follow(this.camX, 0, 0);
    this.rigs.forEach((rig, i) => {
      const selected = i === this.index;
      // Only the few skaters near the camera can be seen; skip drawing the rest.
      const near = Math.abs(this.slotX(i) - this.camX) < 8;
      rig.root.visible = near;
      this.platforms[i].visible = near;
      if (!near) return;
      const k = damp(10, dt);
      this.scales[i] = lerp(this.scales[i], selected ? 1.12 : 0.92, k);
      rig.root.scale.setScalar(this.scales[i]);

      const sway = Math.sin(this.time * 0.9) * 0.55;
      const lookIn = -Math.sign(rig.root.position.x - this.camX) * 0.3;
      rig.root.rotation.y = Math.PI / 2 - FACE_CAMERA + (selected ? sway : lookIn);

      const pose = neutralPose();
      pose.crouch = selected ? 0.3 + 0.08 * Math.sin(this.time * 3) : 0.2;
      pose.armSpread = selected ? 0.35 + 0.1 * Math.sin(this.time * 2.2) : 0.2;
      rig.apply(pose);

      const mat = this.platforms[i].material as THREE.MeshLambertMaterial;
      mat.color.setHex(selected ? rig.appearance.board : 0x55657c);
    });
  }
}
