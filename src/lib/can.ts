import * as THREE from "three";
import { SPACE } from "@/types/scroll";

/** Real 330ml-ish can, local origin at the body center. */
export const CAN = {
  radius: 0.335,
  height: 1.24,
  windowMin: -0.22,
  windowMax: 0.2,
  innerRadius: 0.308,
} as const;

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface CanPose {
  x: number;
  y: number;
  z: number;
  s: number;
  rotY: number;
  rotX: number;
  aside: number;
}

export function sampleCanPose(
  chapterProgress: number,
  inCatalog: boolean,
  elapsed: number,
  lidOpen: number,
): CanPose {
  const aside = inCatalog ? smoothstep(0.38, 0.72, chapterProgress) : 0;
  const frozen = aside > 0.02 || lidOpen > 0.05;
  const idle = frozen ? 0 : Math.sin(elapsed * 0.5) * 0.01;
  return {
    x: THREE.MathUtils.lerp(SPACE.canHome.x, SPACE.canAside.x, aside),
    y: THREE.MathUtils.lerp(SPACE.canHome.y + idle, SPACE.canAside.y, aside),
    z: THREE.MathUtils.lerp(SPACE.canHome.z, SPACE.canAside.z, aside),
    s: THREE.MathUtils.lerp(1.16, 0.74, aside),
    rotY: THREE.MathUtils.lerp(0.22, -0.18, aside),
    rotX: -0.05,
    aside,
  };
}

export function poseToMatrix(
  pose: CanPose,
  target: THREE.Matrix4,
  p: THREE.Vector3,
  q: THREE.Quaternion,
  s: THREE.Vector3,
  e: THREE.Euler,
) {
  p.set(pose.x, pose.y, pose.z);
  e.set(pose.rotX, pose.rotY, 0, "XYZ");
  q.setFromEuler(e);
  s.set(pose.s, pose.s, pose.s);
  return target.compose(p, q, s);
}

export function createCanBottomGeometry() {
  const r = CAN.radius;
  const yB = -CAN.height / 2;
  const yW = CAN.windowMin;
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.002, yB + 0.018),
      new THREE.Vector2(0.2, yB + 0.018),
      new THREE.Vector2(0.278, yB + 0.036),
      new THREE.Vector2(r + 0.016, yB + 0.068),
      new THREE.Vector2(r + 0.01, yB + 0.1),
      new THREE.Vector2(r, yB + 0.145),
      new THREE.Vector2(r, yW),
    ],
    80,
  );
}

export function createCanTopGeometry() {
  const r = CAN.radius;
  const yW = CAN.windowMax;
  const yT = CAN.height / 2;
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(r, yW),
      new THREE.Vector2(r, yT - 0.165),
      new THREE.Vector2(r - 0.038, yT - 0.108),
      new THREE.Vector2(r - 0.08, yT - 0.055),
      new THREE.Vector2(r - 0.092, yT - 0.016),
      new THREE.Vector2(r - 0.07, yT + 0.004),
      new THREE.Vector2(r - 0.118, yT + 0.004),
      new THREE.Vector2(r - 0.118, yT - 0.018),
    ],
    80,
  );
}
