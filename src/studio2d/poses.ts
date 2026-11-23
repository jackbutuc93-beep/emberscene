import type { Pose } from "./TeoRig2D";

// Reusable body poses (side/3-4 body frame, facing screen-right). Contact with the ground is built in
// via rootY/foot targets, so a pose never floats and limbs never stretch (spine length is constant).
export const POSES = {
  stand: { armL: { sh: 0.1, el: 0.15 }, armR: { sh: 0.12, el: 0.18 } },
  lieProne: { rootRot: 90, rootY: 386, armL: { sh: 2.9, el: 0.2 }, armR: { sh: 2.75, el: 0.35 }, headTilt: -0.25, chest: 0, toeL: 0.6, toeR: 0.6 },
  pushUp: { rootRot: 74, rootY: 360, rootX: -30, chest: -0.3, armL: { sh: 1.24, el: 0.2 }, armR: { sh: 1.32, el: 0.26 }, headTilt: -0.35, toeL: 0.8, toeR: 0.8, handL: "open", handR: "open" },
  kneelSit: { rootY: 212, hipY: 70, footL: [-70, -190], footR: [-45, -190], torsoLean: 0, chest: 0.12, armL: { sh: 0.5, el: 0.9 }, armR: { sh: 0.6, el: 0.9 } },
  kneelUp: { rootY: 212, footL: [-205, -212], footR: [-180, -212], armL: { sh: 0.25, el: 0.3 }, armR: { sh: 0.3, el: 0.3 } },
  crouch: { hipY: 150, hipX: -20, footL: [-40, 0], footR: [60, 0], torsoLean: 0.35, chest: 0.15, armL: { sh: 0.7, el: 0.6 }, armR: { sh: 0.8, el: 0.5 } },
  sit: { hipY: 392, footL: [170, 0], footR: [210, 0], torsoLean: -0.08, armL: { sh: -0.5, el: 0.2 }, armR: { sh: -0.45, el: 0.25 } },
  balance: { rootY: 212, footL: [-205, -212], footR: [-180, -212], torsoLean: -0.12, chest: -0.1, shrug: 0.6, armL: { sh: -0.9, el: 0.3 }, armR: { sh: 1.6, el: 0.25 }, handL: "open", handR: "open" },
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixAny = (a: unknown, b: unknown, t: number): unknown => {
  if (typeof a === "number" || typeof b === "number") return lerp((a as number) ?? 0, (b as number) ?? 0, t);
  if (Array.isArray(a) || Array.isArray(b)) {
    const A = (a as number[]) ?? (b as number[]), B = (b as number[]) ?? (a as number[]);
    return A.map((v, i) => lerp(v, B[i], t));
  }
  if ((a && typeof a === "object") || (b && typeof b === "object")) {
    const o: Record<string, unknown> = {};
    const A = (a ?? {}) as Record<string, unknown>, B = (b ?? {}) as Record<string, unknown>;
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) o[k] = mixAny(A[k], B[k], t);
    return o;
  }
  return t < 0.5 ? a : b;
};
/** Blend two poses (numbers/arrays interpolate, discrete fields like hand shapes switch at the midpoint). */
const BASE: Pose = { footL: [-14, 0], footR: [20, 0] };
export const mixPose = (a: Pose, b: Pose, t: number): Pose => mixAny({ ...BASE, ...a }, { ...BASE, ...b }, t) as Pose;
