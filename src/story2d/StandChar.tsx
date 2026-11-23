import React from "react";
import { Teo as Rig, type Hand, type Look, type Mouth, type Pose, type View, type Who } from "../studio2d/TeoRig2D";
import { CHOSEN } from "./Styles";
import { EASE, alive, sampleExpr, sampleTrack, type ExprKey, type Key } from "../studio2d/anim";
import { POSES, mixPose } from "../studio2d/poses";

// story2d: standing characters only. A scene controls: head/eyes (look keys), expression, talking,
// and gestures from a fixed library. Everything else (breath, blinks, eye darts, weight sway) is automatic.

const BASE: Pose = { armL: { sh: -0.26, el: 0.22 }, armR: { sh: 0.12, el: 0.18 }, handL: "relaxed" as Hand, handR: "relaxed" as Hand };

/** Gesture library: each is a pose the arms/shoulders reach, then return to the base pose. */
export const GESTURES = {
  point: { armR: { sh: 1.45, el: 0.12 }, handR: "point", torsoLean: -0.03, headTilt: -0.03 },
  shrug: { shrug: 1, armL: { sh: 0.35, el: 1.35 }, armR: { sh: 0.4, el: 1.35 }, handL: "open", handR: "open", headTilt: 0.12 },
  open: { armR: { sh: 0.85, el: 0.95 }, handR: "open", headTilt: 0.04 },
  bothOpen: { armL: { sh: 0.7, el: 1.0 }, armR: { sh: 0.75, el: 1.0 }, handL: "open", handR: "open", shrug: 0.3 },
  think: { armR: { sh: 0.35, el: 2.35 }, handR: "fist", headTilt: -0.1, gaze: [0.4, -0.5] },
  wave: { armR: { sh: 2.6, el: 0.5 }, handR: "open" },
  startle: { shrug: 0.7, armL: { sh: 0.55, el: 1.3 }, armR: { sh: 0.55, el: 1.3 }, handL: "open", handR: "open", torsoLean: -0.07 },
  fist: { armR: { sh: 0.75, el: 2.1 }, handR: "fist", torsoLean: 0.03 },
  chest: { armR: { sh: 0.45, el: 2.0 }, handR: "open", headTilt: 0.06 },
  scratch: { armR: { sh: 2.35, el: 2.5 }, handR: "relaxed", headTilt: 0.12 },
  balance: { shrug: 0.35, torsoLean: -0.06, armL: { sh: -0.85, el: 0.25 }, armR: { sh: 1.35, el: 0.3 }, handL: "open", handR: "open", headTilt: 0.06 },
  cup: { armL: { sh: 0.55, el: 1.0 }, armR: { sh: 0.65, el: 0.9 }, handL: "open", handR: "open", headTilt: 0.14, gaze: [0.2, 0.7] },
  reach: { armR: { sh: 1.15, el: 0.35 }, handR: "reach", torsoLean: 0.06 },
  drink: { armR: { sh: 0.95, el: 2.45 }, handR: "bottle", headTilt: -0.14, gaze: [0.2, -0.3] },
  raise: { armR: { sh: 2.35, el: 0.4 }, handR: "bottle", headTilt: -0.1, gaze: [0.4, -0.7] },
  holdEdge: { armR: { sh: 0.55, el: 0.35 }, handR: "fist", armL: { sh: 0.3, el: 0.6 }, handL: "fist", torsoLean: 0.08 },
  pullRope: { armR: { sh: 1.05, el: 0.55 }, handR: "fist", armL: { sh: 0.75, el: 0.9 }, handL: "fist", torsoLean: -0.07 },
  paddle: { armR: { sh: 0.55, el: 0.35 }, handR: "oar", armL: { sh: 0.25, el: 0.7 }, handL: "fist", torsoLean: 0.12 },
  fishline: { armR: { sh: 0.95, el: 0.3 }, handR: "fist", torsoLean: 0.05 },
  holdup: { armR: { sh: 2.35, el: 0.4 }, handR: "fist", headTilt: -0.08, gaze: [0.4, -0.7] },
  shade: { armR: { sh: 2.8, el: 1.5 }, handR: "open", headTilt: -0.04 },
  hugknees: { armL: { sh: 0.95, el: 1.55 }, armR: { sh: 1.05, el: 1.6 }, handL: "fist", handR: "fist", torsoLean: 0.08, headTilt: 0.08 },
  offer: { armR: { sh: 1.25, el: 0.5 }, handR: "bottle", torsoLean: 0.04 },
  refuse: { armR: { sh: 1.05, el: 0.45 }, handR: "open", headTilt: 0.06 },
  present: { armL: { sh: 0.5, el: 0.6 }, armR: { sh: 1.35, el: 0.3 }, handL: "open", handR: "open", headTilt: 0.1 },
  crossed: { armL: { sh: 0.5, el: 1.9 }, armR: { sh: 0.55, el: 1.95 }, handL: "fist", handR: "fist" },
} satisfies Record<string, Pose>;
export type GestureName = keyof typeof GESTURES;
export type BodyName = "stand" | "kneel" | "lie" | "sit";
export type Gesture = { at: number; g: GestureName; hold?: number };

const env = (f: number, g: Gesture) => {
  const IN = 9, OUT = 11, hold = g.hold ?? 30, d = f - g.at;
  if (d < 0 || d > IN + hold + OUT) return 0;
  if (d < IN) return EASE.overshoot(d / IN);
  if (d < IN + hold) return 1;
  return 1 - EASE.inOut((d - IN - hold) / OUT);
};

// deterministic mouth shapes while talking
const MOUTHS: Mouth[] = ["A", "E", "M", "O", "A", "U", "E", "rest", "A", "M", "O", "E"];
const mouthAt = (f: number, talk: [number, number][]): Mouth | undefined => {
  for (const [a, b] of talk) if (f >= a && f < b) { const i = Math.floor((f - a) / 3.5); return MOUTHS[(i * 7 + Math.floor(a)) % MOUTHS.length]; }
  return undefined;
};

export const StandChar: React.FC<{
  who: Who; f: number; x: number; y: number; scale: number; view?: View; flip?: boolean; seed?: number;
  look?: Key[]; gestures?: Gesture[]; expr: ExprKey[]; talk?: [number, number][]; style?: Look;
  /** body set by cuts (no animated transition): [frame, "stand" | "kneel" | "lie"] */
  body?: [number, BodyName][];
  /** eyelids: keys with pose.blink (1 = closed, e.g. asleep) */
  lids?: Key[];
  /** raft roll in degrees: the character counter-balances it (gentle, automatic) */
  sway?: number;
  /** 0..1 cold shivering */
  shiver?: number;
  /** 0..1 wind strength (scarf) */
  wind?: number;
}> = ({ who, f, x, y, scale, view = "tq", flip = false, seed = 1, look = [{ f: 0, pose: {} }], gestures = [], expr, talk = [], style = CHOSEN, body = [], lids = [], sway = 0, shiver = 0, wind = 0 }) => {
  const a = alive(f, seed), aLag = alive(f - 6, seed);
  let bn: BodyName = "stand";
  for (const [bf, b] of body) if (f >= bf) bn = b;
  const bodyPose: Pose = bn === "kneel" ? { ...POSES.kneelUp, armL: { sh: -0.2, el: 0.4 }, armR: { sh: 0.25, el: 0.5 } } : bn === "lie" ? { ...POSES.lieProne } : bn === "sit" ? { ...POSES.sit, armL: { sh: -0.5, el: 0.2 }, handL: "open", armR: { sh: 0.5, el: 0.45 }, handR: "relaxed", torsoLean: -0.02 } : {};
  const lk = sampleTrack(look, f); // look track drives only head/eyes
  let p: Pose = { ...BASE, ...bodyPose, gaze: lk.gaze, headYaw: lk.headYaw, headTilt: lk.headTilt ?? bodyPose.headTilt, headNod: lk.headNod, blink: lk.blink };
  if (lids.length) p.blink = sampleTrack(lids, f).blink ?? 0;
  for (const g of gestures) { const k = env(f, g); if (k > 0) {
    let gp: Pose = GESTURES[g.g];
    if (g.g === "wave") gp = { ...gp, armR: { sh: 2.6, el: 0.5 + Math.sin((f - g.at) * 0.45) * 0.35 } };
    if (g.g === "paddle") { const ph = Math.sin((f - g.at) * 0.09); gp = { ...gp, armR: { sh: 0.45 + ph * 0.22, el: 0.4 - ph * 0.1 }, armL: { sh: 0.3 + ph * 0.15, el: 0.7 }, torsoLean: 0.1 + ph * 0.04 }; }
    p = mixPose(p, { ...p, ...gp }, k);
  } }
  const t = f / 30;
  const g0 = p.gaze ?? [0, 0];
  const pose: Pose = {
    ...p, view, flip,
    hipX: (p.hipX ?? 0) + (bn === "stand" ? Math.sin(t * 1.6 + seed) * 5 : 0),                  // small weight sway
    torsoLean: (p.torsoLean ?? 0) + Math.sin(t * 1.6 + seed + 0.6) * 0.012 + shiver * Math.sin(f * 2.6 + seed) * 0.012 - (sway * Math.PI / 180) * 0.6,
    headTilt: (p.headTilt ?? 0) + Math.sin(t * 0.9 + seed * 2) * 0.018 + (sway * Math.PI / 180) * 0.4, // tiny idle head motion, head stays level-ish
    headNod: (p.headNod ?? 0) + Math.sin(t * 1.3 + seed) * 1.5,
    breath: a.breath, blink: Math.max(p.blink ?? 0, a.blink),
    gaze: [g0[0] + a.dart[0] * 0.6, g0[1] + a.dart[1] * 0.6],
    headYaw: (p.headYaw ?? 0) + aLag.dart[0] * 0.4,
    mouth: mouthAt(f, talk) ?? p.mouth,
    scarfSway: Math.sin(t * (2.1 + wind * 7) + seed) * (0.25 + wind * 0.9),
    ...(shiver > 0 ? { shrug: (p.shrug ?? 0) + shiver * (0.25 + Math.sin(f * 2.1 + seed) * 0.12) } : {}),
  };
  return <Rig who={who} look={style} pose={pose} expr={sampleExpr(expr, f)} x={x} y={y} scale={scale} />;
};
