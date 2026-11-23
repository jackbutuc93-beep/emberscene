import React from "react";
import { interpolate as flubberMorph } from "flubber";

// ═══════════════════════════════════════════════════════════════════════════
// TEO — 2D character rig V2 (polish: continuous limbs, hand poses, shoes, profile head, v3 build). V1 kept in TeoRig.tsx.
// TEO — 2D character rig V1 (layered SVG, deterministic, Remotion-friendly)
// Young adult (~23), ≈6.6 heads tall. Pure 2D vector shapes, dark outline, flat colour + one cel shade.
// "2.5D" depth = view-dependent widths/offsets, near/far limb tinting and draw order — no 3D anywhere.
// Units: ground at y = 0, up is negative. Full height ≈ 900 units.
// ═══════════════════════════════════════════════════════════════════════════

export type View = "front" | "tq" | "side" | "back";
export type Expr = "neutral" | "happy" | "curious" | "surprised" | "afraid" | "confused" | "sad" | "determined";
export type Mouth = "rest" | "A" | "E" | "O" | "U" | "M" | "F";
export type Arm = { sh: number; el: number; wr?: number }; // shoulder angle (0 = down, + = forward), elbow bend (+), wrist
export type Hand = "relaxed" | "open" | "fist" | "point" | "hold" | "reach" | "bottle" | "oar";
export type Pose = {
  handL?: Hand; handR?: Hand;
  view?: View; flip?: boolean;
  headYaw?: number;   // -1..1 extra turn of the head toward screen-right (eyes/features slide)
  headTilt?: number;  // radians
  headNod?: number;   // px down
  torsoLean?: number; // radians (around the pelvis)
  torsoTwist?: number; // -1..1 shoulders turn (narrows/shifts the chest)
  hipX?: number; hipY?: number; // pelvis offset (weight shift / crouch)
  footL?: [number, number]; footR?: [number, number]; // foot (ankle) targets in local x, height above ground (y<=0)
  toeL?: number; toeR?: number; // ankle angle (heel lift)
  armL?: Arm; armR?: Arm;
  gaze?: [number, number]; blink?: number; mouth?: Mouth; breath?: number;
  hemSway?: number; // -1..1 tunic hem trails the body (secondary motion)
  // studio2d additions
  chest?: number;     // radians: upper-spine bend relative to the lower spine (curl forward + / arch back -)
  shrug?: number;     // 0..1 shoulders lift toward the ears
  rootRot?: number;   // degrees: whole-body rotation around the pelvis (lying, falling)
  rootX?: number; rootY?: number; // whole-body offset (keeps contact with the ground when lying/kneeling)
  scarfSway?: number; // -1..1 scarf tails trail (secondary motion)
  ground?: boolean;   // false = allow airborne / below-ground (default: keep contact)
};

const C_TEO = {
  line: "#1e1612", skin: "#9a5d38", skinSh: "#7c4527", skinHi: "#a96a43", hair: "#16110f", hairSh: "#2c201a", curl: "#3a2b23",
  shirt: "#f1ebdf", shirtSh: "#d6ccba", scarf: "#d9622f", scarfSh: "#a9461f", shorts: "#6e4429", shortsSh: "#56331d",
  shoe: "#4a3020", shoeSh: "#342116", sole: "#2a1a10", white: "#fbf8f1", iris: "#3b2316", mouth: "#3a1512", tongue: "#c9635f",
};
const C_MARA = {
  line: "#17110e", skin: "#efbd94", skinSh: "#d99b73", skinHi: "#f6cba6", hair: "#c0442a", hairSh: "#86281a", curl: "#a3361f",
  shirt: "#1f8277", shirtSh: "#145e56", scarf: "#e2c486", scarfSh: "#bb9a5c", shorts: "#3a4652", shortsSh: "#2b343e",
  shoe: "#4b3121", shoeSh: "#352217", sole: "#22160e", white: "#fbf8f1", iris: "#2a7a4f", mouth: "#5a1d18", tongue: "#d06a64",
};
export type Who = "teo" | "mara";
/** visual style knobs (same rig, different look) */
export type Look = { ow?: number; line?: string; shade?: boolean; eyes?: "full" | "dot" | "bean"; head?: number; limb?: number; wide?: number; belly?: number; shoulders?: number; teoBuild?: Build; joints?: boolean; sat?: number; light?: number; hue?: number;
  /** opt-in: mouth flows between expression shapes (flubber) instead of swapping at the midpoint */
  mouthMorph?: boolean };
const hexToHsl = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, ss = 0;
  if (mx !== mn) { const d = mx - mn; ss = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; }
  return [hh, ss, l];
};
const hslToHex = (h: number, s: number, l: number) => {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const t = (x: number) => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
  return "#" + [t(h + 1 / 3), t(h), t(h - 1 / 3)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
};
const styled = <T extends Record<string, string>>(c: T, lk: Look): T => {
  if (!lk.sat && !lk.light && !lk.hue && !lk.line) return c;
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(c)) {
    if (k === "white" || k === "line") { o[k] = v; continue; }
    const [h, sa, l] = hexToHsl(v);
    o[k] = hslToHex(h + (lk.hue ?? 0), Math.max(0, Math.min(1, sa * (lk.sat ?? 1))), Math.max(0, Math.min(0.97, l + (lk.light ?? 0) * (1 - l))));
  }
  if (lk.line) o.line = lk.line;
  return o as T;
};
const OW = 5; // outline width

// ---------------- geometry helpers ----------------
type P = [number, number];
const f = (n: number) => n.toFixed(1);
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const pol = (len: number, ang: number): P => [Math.sin(ang) * len, Math.cos(ang) * len]; // ang 0 = straight down
/** tapered limb between a and b (widths wa → wb), with round ends — reads as a drawn limb, not a cylinder */
const limb = (a: P, b: P, wa: number, wb: number) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const p1: P = [a[0] + nx * wa / 2, a[1] + ny * wa / 2], p2: P = [b[0] + nx * wb / 2, b[1] + ny * wb / 2];
  const p3: P = [b[0] - nx * wb / 2, b[1] - ny * wb / 2], p4: P = [a[0] - nx * wa / 2, a[1] - ny * wa / 2];
  return `M${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}A${f(wb / 2)} ${f(wb / 2)} 0 0 1 ${f(p3[0])} ${f(p3[1])}L${f(p4[0])} ${f(p4[1])}A${f(wa / 2)} ${f(wa / 2)} 0 0 1 ${f(p1[0])} ${f(p1[1])}Z`;
};
const smooth = (pts: P[]) => {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
};
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
/** one continuous outlined limb through a -> b -> c (joint b bends smoothly; muscle swell at bulgeA/bulgeB) - no visible joint shapes */
const bentLimb = (a: P, b: P, c: P, wa: number, wb: number, wc: number, bulgeA = 1.08, bulgeB = 1.06) => {
  const nrm = (p: P, q: P): P => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const n1 = nrm(a, b), n2 = nrm(b, c); let nb: P = [n1[0] + n2[0], n1[1] + n2[1]]; const nl = Math.hypot(nb[0], nb[1]) || 1; nb = [nb[0] / nl, nb[1] / nl];
  const mid = (p: P, q: P, t: number): P => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const m1 = mid(a, b, 0.42), m2 = mid(b, c, 0.35);
  const w1 = (wa + wb) / 2 * bulgeA, w2 = (wb + wc) / 2 * bulgeB;
  const off = (p: P, n: P, w: number, sgn: number): P => [p[0] + n[0] * w / 2 * sgn, p[1] + n[1] * w / 2 * sgn];
  const pts: P[] = [off(a, n1, wa, 1), off(m1, n1, w1, 1), off(b, nb, wb, 1), off(m2, n2, w2, 1), off(c, n2, wc, 1),
    [c[0] + (c[0] - b[0]) * 0.04, c[1] + (c[1] - b[1]) * 0.04],
    off(c, n2, wc, -1), off(m2, n2, w2, -1), off(b, nb, wb, -1), off(m1, n1, w1, -1), off(a, n1, wa, -1)];
  return smooth(pts);
};
/** two-bone IK: hip → knee → ankle, knee bends toward `bend` (+1 = screen-right) */
const ik = (h: P, a: P, l1: number, l2: number, bend: number): P => {
  const dx = a[0] - h[0], dy = a[1] - h[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.5);
  const base = Math.atan2(dy, dx);
  const k = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = base - bend * k;
  return [h[0] + Math.cos(ang) * l1, h[1] + Math.sin(ang) * l1];
};

// ---------------- expressions ----------------
export type ED = { browR: [number, number]; browA: [number, number]; lid: number; lower: number; pupil: number; mouth: string; open: number; tilt?: number; sweat?: boolean;
  /** set by mixExpr: the two mouth shapes and progress, used only when look.mouthMorph is on */
  mouthFrom?: string; mouthTo?: string; mouthK?: number };
export const EXPR: Record<Expr, ED> = {
  neutral:    { browR: [0, 0], browA: [0, 0], lid: 0.22, lower: 0, pupil: 1, mouth: "flat", open: 0 },
  happy:      { browR: [5, 5], browA: [-0.05, -0.05], lid: 0.15, lower: 0.45, pupil: 1, mouth: "smile", open: 0.45 },
  curious:    { browR: [9, 1], browA: [0.1, -0.2], lid: 0.05, lower: 0, pupil: 1.12, mouth: "small", open: 0.15, tilt: -0.07 },
  surprised:  { browR: [18, 18], browA: [0.15, 0.15], lid: -0.3, lower: 0, pupil: 0.72, mouth: "O", open: 0.8 },
  afraid:     { browR: [12, 12], browA: [0.85, 0.85], lid: -0.25, lower: 0, pupil: 0.5, mouth: "grimace", open: 0.5, sweat: true, tilt: 0.04 },
  confused:   { browR: [11, -3], browA: [0.35, -0.35], lid: 0.2, lower: 0.1, pupil: 1, mouth: "wavy", open: 0, tilt: 0.09 },
  sad:        { browR: [6, 6], browA: [0.95, 0.95], lid: 0.5, lower: 0, pupil: 1.1, mouth: "frown", open: 0, tilt: 0.1 },
  determined: { browR: [-6, -6], browA: [-0.7, -0.7], lid: 0.38, lower: 0.2, pupil: 0.95, mouth: "set", open: 0 },
};
/** smooth transition between two expressions (numeric parts interpolate, mouth shape swaps at the midpoint) */
export const mixExpr = (a: Expr, b: Expr, k: number): ED => {
  const A = EXPR[a], B = EXPR[b], l = (x: number, y: number) => x + (y - x) * k;
  return {
    browR: [l(A.browR[0], B.browR[0]), l(A.browR[1], B.browR[1])], browA: [l(A.browA[0], B.browA[0]), l(A.browA[1], B.browA[1])],
    lid: l(A.lid, B.lid), lower: l(A.lower, B.lower), pupil: l(A.pupil, B.pupil), mouth: k < 0.5 ? A.mouth : B.mouth,
    open: l(A.open, B.open), tilt: l(A.tilt ?? 0, B.tilt ?? 0), sweat: k < 0.5 ? A.sweat : B.sweat,
    mouthFrom: A.mouth, mouthTo: B.mouth, mouthK: k,
  };
};

// ---------------- mouth morph (opt-in) ----------------
/** a stroked curve chain [p0, c1, p1, c2, p2, ...] (quadratic) -> thin closed ribbon, so line mouths can morph into filled ones */
const ribbon = (pts: P[], w: number) => {
  const top: P[] = [], bot: P[] = [];
  for (let i = 0; i + 2 < pts.length; i += 2) {
    const [a, c, b] = [pts[i], pts[i + 1], pts[i + 2]];
    for (let s = i === 0 ? 0 : 1; s <= 8; s++) { const t = s / 8, u = 1 - t, x = u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], y = u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]; top.push([x, y - w / 2]); bot.push([x, y + w / 2]); }
  }
  return "M" + [...top, ...bot.reverse()].map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";
};
type MS = { d: string; fill: "line" | "mouth"; sw: number };
/** each expression mouth as one closed shape; mirrors the drawing in the face switch below */
const mouthShape = (name: string, mx: number, my: number, mw: number, lw: number): MS => {
  const L = (pts: P[], w: number): MS => ({ d: ribbon(pts, w * lw), fill: "line", sw: 0 });
  switch (name) {
    case "smile": return { d: `M${f(mx - mw * 1.2)} ${f(my - 4)}Q${f(mx)} ${f(my)} ${f(mx + mw * 1.2)} ${f(my - 5)}Q${f(mx + mw * 0.6)} ${f(my + 18)} ${f(mx)} ${f(my + 18)}Q${f(mx - mw * 0.6)} ${f(my + 18)} ${f(mx - mw * 1.2)} ${f(my - 4)}Z`, fill: "mouth", sw: 3.5 };
    case "small": return { d: ell(mx + 2, my + 2, mw * 0.32, 5), fill: "mouth", sw: 3.5 };
    case "O": return { d: ell(mx, my + 6, mw * 0.5, 14), fill: "mouth", sw: 3.5 };
    case "grimace": return { d: `M${f(mx - mw)} ${f(my + 4)}Q${f(mx)} ${f(my - 6)} ${f(mx + mw)} ${f(my + 4)}L${f(mx + mw * 0.8)} ${f(my + 12)}Q${f(mx)} ${f(my + 4)} ${f(mx - mw * 0.8)} ${f(my + 12)}Z`, fill: "mouth", sw: 3.5 };
    case "wavy": return L([[mx - mw, my + 2], [mx - mw / 2, my - 4], [mx, my + 2], [mx + mw / 2, my + 8], [mx + mw, my]], 4);
    case "frown": return L([[mx - mw, my + 8], [mx, my - 8], [mx + mw, my + 8]], 4.5);
    case "set": return L([[mx - mw, my + 1], [mx, my], [mx + mw, my - 1]], 5);
    default: return L([[mx - mw, my], [mx, my + 2], [mx + mw, my - 1]], 4); // flat
  }
};
const hexRGB = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixRGB = (a: string, b: string, t: number) => "#" + hexRGB(a).map((v, i) => Math.round(v + (hexRGB(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
const morphCache = new Map<string, (t: number) => string>();
const morphAt = (a: string, b: string, t: number) => {
  const key = a + "|" + b; let fn = morphCache.get(key);
  if (!fn) { fn = flubberMorph(a, b, { maxSegmentLength: 2 }); if (morphCache.size > 200) morphCache.clear(); morphCache.set(key, fn); }
  return fn(t);
};

// ---------------- proportions ----------------
const HEAD_W = 104, HEAD_H = 132;
/** Body builds. v1 = original rig; v2 = balanced (shorter legs, wider torso, matching arms). Head/face/hair identical. */
export const BUILDS = {
  v1: { HIP_Y: -490, NECK_Y: -780, HEAD_CY: -850, THIGH: 238, SHIN: 226, UPPER: 168, FORE: 150, wide: 1, limb: 1 },
  v2: { HIP_Y: -440, NECK_Y: -735, HEAD_CY: -805, THIGH: 214, SHIN: 200, UPPER: 152, FORE: 138, wide: 1.13, limb: 1.1 },
  // v3: ~5.8 heads - v2 widths, balanced legs (~50%), longer torso, head scaled 0.9 (same face/hair design)
  // v4 (Teo V3 redesign): torso -25% (245 vs 327), wider shoulders, shorter arms, slightly sturdier limbs
  // v5 (Teo V4 sheet): 5.5 heads; torso NOT longer (245); visible neck; broader rounded shoulders
  mara: { HIP_Y: -402, NECK_Y: -628, HEAD_CY: -730, THIGH: 196, SHIN: 186, UPPER: 120, FORE: 108, wide: 1.06, limb: 0.98, hs: 0.86 },
  // v6 (ADRIFT visual improvement): legs -4 %, torso unchanged (245), forearm a bit shorter than upper arm -> ~5.4 heads
  v6: { HIP_Y: -418, NECK_Y: -663, HEAD_CY: -770, THIGH: 202, SHIN: 194, UPPER: 132, FORE: 112, wide: 1.26, limb: 1.12, hs: 0.87 },
  v5: { HIP_Y: -434, NECK_Y: -679, HEAD_CY: -786, THIGH: 210, SHIN: 202, UPPER: 130, FORE: 118, wide: 1.26, limb: 1.12, hs: 0.87 },
  v4: { HIP_Y: -424, NECK_Y: -669, HEAD_CY: -772, THIGH: 205, SHIN: 197, UPPER: 128, FORE: 116, wide: 1.2, limb: 1.12, hs: 0.93 },
  v3: { HIP_Y: -470, NECK_Y: -797, HEAD_CY: -860, THIGH: 228, SHIN: 216, UPPER: 160, FORE: 146, wide: 1.13, limb: 1.1, hs: 0.9 },
};
export type Build = keyof typeof BUILDS;
/** measured proportions (skull crown → chin = 1 head; hair excluded, standard figure-drawing convention) */
export const measure = (b: Build) => { const B = BUILDS[b] as { HIP_Y: number; HEAD_CY: number; hs?: number }; const hs = B.hs ?? 1; const head = HEAD_H * hs * (0.75 + 0.63); const top = -(B.HEAD_CY - 0.75 * HEAD_H * hs); return { head, total: top, heads: top / head, legShare: -B.HIP_Y / top }; };

let uid = 0;
export const Teo: React.FC<{ pose?: Pose; expr?: Expr | ED; x?: number; y?: number; scale?: number; showJoints?: boolean; build?: Build; who?: Who; look?: Look }> = ({ pose = {}, expr = "neutral", x = 0, y = 0, scale = 1, showJoints, who = "teo", build: buildIn, look = {} }) => {
  const MARA = who === "mara";
  const C = styled(MARA ? C_MARA : C_TEO, look);
  const BEL = look.belly ?? 0;
  const K = (look.ow ?? 5) / 5, SH = look.shade !== false;
  const build: Build = buildIn ?? (MARA ? "mara" : look.teoBuild ?? "v5");
  const { HIP_Y, NECK_Y, HEAD_CY, THIGH, SHIN, UPPER, FORE, wide: WD0, limb: LB0 } = BUILDS[build];
  const WD = WD0 * (look.wide ?? 1);
  const LB = LB0 * (look.limb ?? 1);
  const HS = ((BUILDS[build] as { hs?: number }).hs ?? 1) * (look.head ?? 1);
  // poses are authored on Teo's legs (thigh+shin = 412); rescale vertical contact values for other builds
  const LS = (THIGH + SHIN) / 412;
  if (LS !== 1) pose = { ...pose, rootY: (pose.rootY ?? 0) * LS, hipY: (pose.hipY ?? 0) * LS,
    footL: pose.footL ? [pose.footL[0] * LS, pose.footL[1] * LS] : undefined, footR: pose.footR ? [pose.footR[0] * LS, pose.footR[1] * LS] : undefined };
  const id = React.useMemo(() => `teo${uid++}`, []);
  const v = pose.view ?? "tq";
  const E: ED = typeof expr === "string" ? EXPR[expr] : expr;
  const side = v === "side", back = v === "back", front = v === "front";
  const W = front || back ? 1 : v === "tq" ? 0.82 : 0.52;   // body width factor
  const dir = front || back ? 0 : v === "tq" ? 0.55 : 1;      // facing toward screen-right
  const breath = pose.breath ?? 0;
  const twist = pose.torsoTwist ?? 0;
  const TL = (HIP_Y - NECK_Y) / 327; // torso length relative to v3

  // ---- skeleton ----
  const hip: P = [pose.hipX ?? 0, HIP_Y + (pose.hipY ?? 0)];
  const lean = pose.torsoLean ?? 0;
  // 2-segment spine with constant length (never stretches): lower spine follows lean, upper spine adds chest bend
  const TLEN = HIP_Y - NECK_Y, chest = pose.chest ?? 0;
  const mid: P = [hip[0] + Math.sin(lean) * TLEN * 0.5, hip[1] - Math.cos(lean) * TLEN * 0.5];
  const neck: P = [mid[0] + Math.sin(lean + chest) * TLEN * 0.5, mid[1] - Math.cos(lean + chest) * TLEN * 0.5 - breath * 3];
  const shW = 76 * WD * (look.shoulders ?? 1) * (W + Math.abs(twist) * 0.15), chestShift = twist * 22 + dir * 4;
  const shY = neck[1] + 30 - (pose.shrug ?? 0) * 16 - breath * 2;
  const shL: P = [neck[0] - shW * 0.86 + chestShift, shY], shR: P = [neck[0] + shW * 0.86 + chestShift, shY];
  const hipW = 44 * W * WD * (MARA ? 1.12 : 1);
  const hipL: P = [hip[0] - hipW, hip[1] + 6], hipR: P = [hip[0] + hipW, hip[1] + 6];
  const fl = pose.footL ?? [-(front || back ? 46 : 16 * W + 6), 0], fr = pose.footR ?? [(front || back ? 46 : 16 * W + 12), 0];
  const ankL: P = [fl[0], fl[1] - 22], ankR: P = [fr[0], fr[1] - 22];
  const bend = front || back ? 0.25 : 1;
  const kneeL = ik(hipL, ankL, THIGH, SHIN, front || back ? -bend : bend), kneeR = ik(hipR, ankR, THIGH, SHIN, bend);

  // ---- arms (FK) ----
  const armPts = (s: P, a: Arm, sideSign: number) => {
    const fwd = front || back ? sideSign : 1; // in front/back views "forward" spreads the arm sideways
    const e = add(s, [Math.sin(a.sh) * UPPER * fwd, Math.cos(a.sh) * UPPER]);
    const ang2 = a.sh + a.el;
    const w = add(e, [Math.sin(ang2) * FORE * fwd, Math.cos(ang2) * FORE]);
    const ang3 = ang2 + (a.wr ?? 0);
    const h = add(w, [Math.sin(ang3) * 34 * fwd, Math.cos(ang3) * 34]);
    return { e, w, h, ang3, fwd };
  };
  const aL = armPts(shL, pose.armL ?? { sh: 0.12, el: 0.18 }, -1), aR = armPts(shR, pose.armR ?? { sh: 0.12, el: 0.18 }, 1);

  // ---- parts ----
  const els: React.ReactNode[] = [];
  const P_ = (d: string, fill: string, sw = OW, extra: Partial<React.SVGProps<SVGPathElement>> = {}) => els.push(<path key={els.length} d={d} fill={fill} stroke={C.line} strokeWidth={sw * K} strokeLinejoin="round" {...extra} />);
  const S_ = (d: string, stroke: string, sw: number) => els.push(<path key={els.length} d={d} fill="none" stroke={stroke} strokeWidth={stroke === C.line ? sw * Math.max(K, 0.6) : sw} strokeLinecap="round" />);
  const far = (c: string) => c; // (kept for clarity; far limbs get a darker cel tone below)

  const leg = (h: P, k: P, a: P, foot: [number, number], toe: number, sd: number, isFar: boolean) => {
    const skin = isFar ? C.skinSh : C.skin;
    if (MARA) { P_(bentLimb(h, k, [a[0], a[1] - 4], 70 * LB, 46 * LB, 36 * LB, 1.04, 1.06), isFar ? C.shortsSh : C.shorts); S_(`M${f(k[0] + (front || back ? -8 : 8))} ${f(k[1] - 2)}q${front || back ? 8 : -6} 8 ${front || back ? 14 : 2} 14`, C.shortsSh, 3); }
    else P_(look.joints ? bentLimb(h, k, [a[0], a[1] - 4], 62 * LB, 33 * LB, 20 * LB, 1.1, 1.3) : bentLimb(h, k, [a[0], a[1] - 6], 62 * LB, 38 * LB, 23 * LB, 1.08, 1.24), skin);
    if (!MARA) S_(`M${f(k[0] + (front || back ? -6 : 6))} ${f(k[1] - 4)}q${front || back ? 6 : -4} 6 ${front || back ? 12 : 2} 10`, C.skinSh, 3);
    const fx = foot[0], fy = foot[1];
    if (front || back) {
      P_(smooth([[fx - 20, fy - 30], [fx + 20, fy - 30], [fx + 27, fy - 12], [fx + 25, fy - 2], [fx - 25, fy - 2], [fx - 27, fy - 12]]), isFar ? C.shoeSh : C.shoe);
      els.push(<path key={els.length} d={`M${f(fx - 25)} ${f(fy - 7)}L${f(fx + 25)} ${f(fy - 7)}L${f(fx + 24)} ${f(fy - 1)}L${f(fx - 24)} ${f(fy - 1)}Z`} fill={C.sole} />);
      if (front) { S_(`M${f(fx - 9)} ${f(fy - 27)}q9 6 18 0`, C.shoeSh, 3); S_(`M${f(fx - 7)} ${f(fy - 33)}l14 0M${f(fx - 6)} ${f(fy - 38)}l12 0`, "#e6dccb", 2.5); }
    } else {
      // profile shoe: heel block, flat sole, rounded toe cap, instep rising to the ankle; toe lift pivots at the ball
      const L = 84, lift = toe * 26;
      const heelX = fx - L * 0.32, ballX = fx + L * 0.42, tipX = fx + L * 0.66;
      const pts: P[] = [[a[0] - 14, fy - 40 - lift * 0.4], [a[0] + 14, fy - 38 - lift * 0.5], [ballX - 6, fy - 22 - lift * 0.2], [tipX - 4, fy - 16], [tipX + 2, fy - 7], [tipX - 6, fy - 1], [ballX, fy - 1], [heelX + 6, fy - 1 - lift], [heelX - 2, fy - 8 - lift], [heelX + 2, fy - 28 - lift]];
      P_(smooth(pts), isFar ? C.shoeSh : C.shoe);
      els.push(<path key={els.length} d={`M${f(heelX - 1)} ${f(fy - 9 - lift)}L${f(ballX)} ${f(fy - 9)}L${f(tipX - 2)} ${f(fy - 9)}Q${f(tipX + 3)} ${f(fy - 5)} ${f(tipX - 5)} ${f(fy - 1)}L${f(heelX + 4)} ${f(fy - 1 - lift)}Z`} fill={C.sole} stroke={C.line} strokeWidth={2.5} strokeLinejoin="round" />);
      S_(`M${f(a[0] + 4)} ${f(fy - 34 - lift * 0.5)}l12 4M${f(a[0] + 10)} ${f(fy - 28 - lift * 0.4)}l12 4`, "#e6dccb", 2.5);
      S_(`M${f(ballX - 8)} ${f(fy - 23 - lift * 0.2)}q8 4 14 10`, C.shoeSh, 3);
    }
    const m: P = [h[0] + (k[0] - h[0]) * 0.66, h[1] + (k[1] - h[1]) * 0.66];
    if (!MARA) P_(limb(h, m, 72 * LB, 66 * LB), isFar ? C.shortsSh : C.shorts);
    else S_(`M${f(a[0] - 16)} ${f(a[1] - 8)}L${f(a[0] + 16)} ${f(a[1] - 10)}`, C.shortsSh, 4);
  };
  /** reusable hand poses drawn in the wrist frame (y along the hand, x across; th = thumb side) */
  /** reusable hand poses in the wrist frame (y along the hand, x across; th = thumb side).
   *  Each hand is ONE clean silhouette (fingers are bumps of the outline, separated by soft crease lines),
   *  so it reads well with or without outlines and never looks spiky. */
  const drawHand = (w: P, ang: number, kind: Hand, th: number, skin: string) => {
    const r = 21 * LB0 * Math.sqrt(look.limb ?? 1);
    const rp = (px: number, py: number): P => [w[0] + px * Math.cos(ang) - py * Math.sin(ang), w[1] + px * Math.sin(ang) + py * Math.cos(ang)];
    const poly = (pts: [number, number][], mx = 1) => smooth(pts.map(([x2, y2]) => rp(x2 * r * mx * th, y2 * r)));
    const crease = (x2: number, y1: number, y2: number) => S_(`M${f(rp(x2 * r * th, y1 * r)[0])} ${f(rp(x2 * r * th, y1 * r)[1])}L${f(rp(x2 * r * th, y2 * r)[0])} ${f(rp(x2 * r * th, y2 * r)[1])}`, C.skinSh, 3);
    const thumbOpen: [number, number][] = [[0.6, 0.15], [1.35, 0.5], [1.7, 0.95], [1.5, 1.15], [0.85, 0.95]];
    switch (kind) {
      case "fist":
        P_(poly([[0.5, 0.3], [0.1, 1.05], [-0.35, 1.1], [-0.25, 0.75], [0.25, 0.45]]), skin);
        P_(poly([[-0.85, -0.1], [-1.0, 0.85], [-0.8, 1.5], [0.0, 1.62], [0.8, 1.5], [1.0, 0.85], [0.85, -0.1]]), skin);
        [-0.45, 0.05, 0.5].forEach((x2) => crease(x2, 1.2, 1.55));
        P_(poly([[0.55, 0.45], [0.15, 1.05], [-0.3, 1.08], [-0.2, 0.82], [0.3, 0.55]]), skin, 3);
        break;
      case "point":
        P_(poly([[0.2, 1.0], [0.25, 2.55], [0.45, 2.75], [0.68, 2.55], [0.78, 1.0]]), skin);
        P_(poly([[0.75, 0.25], [1.3, 0.75], [1.15, 1.1], [0.7, 0.9]]), skin);
        P_(poly([[-0.85, -0.1], [-1.0, 0.85], [-0.75, 1.45], [0.0, 1.5], [0.6, 1.25], [0.9, 0.8], [0.85, -0.1]]), skin);
        [-0.45, -0.05].forEach((x2) => crease(x2, 1.1, 1.45));
        break;
      case "open": case "reach": {
        const mx = kind === "open" ? 1 : 0.8;
        P_(poly(thumbOpen, mx), skin);
        P_(poly([[-0.85, -0.1], [-1.0, 0.85], [-1.2, 1.5], [-1.08, 1.82], [-0.82, 1.62], [-0.72, 2.0], [-0.5, 2.25], [-0.27, 1.95], [-0.16, 2.3], [0.1, 2.42], [0.3, 2.05], [0.4, 2.15], [0.66, 2.2], [0.8, 1.6], [0.95, 0.9], [0.88, -0.1]], mx), skin);
        [[-0.78, 1.25, 1.6], [-0.27, 1.35, 1.85], [0.32, 1.35, 1.9]].forEach(([x2, y1, y2]) => crease(x2 * mx, y1, y2));
        break;
      }
      case "bottle": {
        // a plastic bottle held upright in the fist (drawn first, the fingers wrap over it)
        const b0 = rp(-0.2 * r, 0.9 * r);
        els.push(<g key={els.length} transform={`translate(${f(b0[0])} ${f(b0[1])}) rotate(${f((ang * 180) / Math.PI + 180)})`}>
          <rect x={-r * 0.55} y={-r * 1.6} width={r * 1.1} height={r * 3.1} rx={r * 0.4} fill="#cfe9ef" opacity={0.9} />
          <rect x={-r * 0.3} y={-r * 2.3} width={r * 0.6} height={r * 0.8} rx={r * 0.15} fill="#cfe9ef" opacity={0.9} />
          <rect x={-r * 0.34} y={-r * 2.55} width={r * 0.68} height={r * 0.35} rx={r * 0.1} fill="#3d7fa8" />
          <rect x={-r * 0.5} y={-r * 0.2} width={r * 1.0} height={r * 1.45} rx={r * 0.3} fill="#7fc3dd" opacity={0.8} />
        </g>);
        P_(poly([[-0.85, -0.1], [-1.0, 0.85], [-0.8, 1.5], [0.0, 1.62], [0.8, 1.5], [1.0, 0.85], [0.85, -0.1]]), skin);
        [-0.45, 0.05, 0.5].forEach((x2) => crease(x2, 1.2, 1.55));
        break;
      }
      case "oar": {
        // broken plank used as an oar: long board through the fist, blade at the far end
        const a0 = rp(-0.1 * r, -2.6 * r), a1 = rp(-0.1 * r, 6.2 * r), bl = rp(-0.1 * r, 4.8 * r);
        els.push(<path key={els.length} d={limb(a0, a1, 10, 10)} fill="#9c6a3b" />);
        els.push(<path key={els.length} d={limb(bl, a1, 26, 24)} fill="#8a5a30" />);
        P_(poly([[-0.85, -0.1], [-1.0, 0.85], [-0.8, 1.5], [0.0, 1.62], [0.8, 1.5], [1.0, 0.85], [0.85, -0.1]]), skin);
        [-0.45, 0.05, 0.5].forEach((x2) => crease(x2, 1.2, 1.55));
        break;
      }
      case "hold":
        P_(poly([[-0.85, -0.1], [-1.05, 0.9], [-0.6, 1.6], [0.6, 1.6], [1.0, 0.9], [0.85, -0.1]]), skin);
        els.push(<path key={els.length} d={limb(rp(-1.6 * r, 1.0 * r), rp(1.8 * r, 1.0 * r), 9, 9)} fill="#c9a86a" stroke={C.line} strokeWidth={3 * K} />);
        [-0.5, 0, 0.5].forEach((x2) => crease(x2, 1.2, 1.6));
        P_(poly([[0.7, 0.3], [1.2, 0.85], [0.7, 1.05], [0.4, 0.7]]), skin);
        break;
      default:
        // relaxed: thumb first (palm covers its base), one finger mass with rounded tips, soft creases
        P_(poly([[0.65, 0.25], [1.2, 0.7], [1.25, 1.12], [1.0, 1.22], [0.7, 0.9]]), skin);
        P_(poly([[-0.88, -0.15], [-1.0, 0.8], [-0.95, 1.5], [-0.66, 1.92], [-0.3, 2.06], [0.06, 2.1], [0.42, 1.98], [0.7, 1.72], [0.9, 1.25], [0.88, -0.15]]), skin);
        [-0.48, -0.08, 0.32].forEach((x2) => crease(x2, 1.45, 1.95));
    }
  };
  const arm = (s: P, A: ReturnType<typeof armPts>, isFar: boolean, part: "all" | "upper" | "lower" = "all", hand: Hand = "relaxed") => {
    const skin = isFar ? C.skinSh : C.skin;
    if (part !== "lower") {
      // continuous shoulder -> elbow -> wrist silhouette (deltoid/bicep and forearm swell); joints are internal only
      P_(bentLimb(s, A.e, A.w, 40 * LB, 27 * LB, 22 * LB, 1.1, 1.14), skin);
      const sl: P = [s[0] + (A.e[0] - s[0]) * 0.42, s[1] + (A.e[1] - s[1]) * 0.42];
      P_(limb([s[0] + (s[0] - A.e[0]) * 0.08, s[1] + (s[1] - A.e[1]) * 0.08], sl, 50 * LB, 52 * LB), isFar ? C.shirtSh : C.shirt);
    }
    if (part === "upper") return;
    const ang = Math.atan2(A.h[1] - A.w[1], A.h[0] - A.w[0]) - Math.PI / 2;
    const th = front ? -A.fwd : back ? A.fwd : 1;
    drawHand(A.w, ang, hand, th, skin);
  };
  const torso = () => {
    const tw = 78 * W * WD, hw = 62 * W * WD, cx = neck[0] + chestShift * 0.6, hs = (pose.hemSway ?? 0) * 16;
    // shorts waist (shows below the shorter shirt)
    P_(smooth([[hip[0] - hw - 2, hip[1] - 24], [hip[0] + hw + 2, hip[1] - 24], [hip[0] + hw + 12, hip[1] + 40], [hip[0] - hw - 12, hip[1] + 40]]), C.shorts);
    const hemY = hip[1] - 4;
    const wst: P = [hip[0] + (mid[0] - hip[0]) * 0.73, hip[1] + (mid[1] - hip[1]) * 0.73];
    const pts: P[] = [[shL[0] - 24, shL[1] + 14], [shL[0] - 12, shL[1] - 14], [shL[0] + 12, neck[1] - 2], [cx, neck[1] - 6], [shR[0] - 12, neck[1] - 2], [shR[0] + 12, shR[1] - 14], [shR[0] + 24, shR[1] + 14],
      [wst[0] + hw - 4 + BEL * 40, wst[1] + BEL * 26], [hip[0] + hw + 8 + hs + BEL * 30, hemY - 4], [hip[0] + hs * 0.8, hemY + 6 + BEL * 8], [hip[0] - hw - 8 + hs - BEL * 30, hemY - 4], [wst[0] - hw + 4 - BEL * 40, wst[1] + BEL * 26]];
    const body = smooth(pts);
    P_(body, C.shirt);
    // cel shade on the side away from the light (clipped to the shirt)
    els.push(<clipPath key={`cp${els.length}`} id={`${id}-torso`}><path d={body} /></clipPath>);
    els.push(<path key={els.length} d={`M${f(cx + tw * 0.25)} ${f(neck[1] - 10)}L${f(hip[0] + hw + 30)} ${f(neck[1] - 10)}L${f(hip[0] + hw + 30)} ${f(hip[1] + 40)}L${f(hip[0] + hw * 0.45)} ${f(hip[1] + 40)}Z`} fill={C.shirtSh} clipPath={`url(#${id}-torso)`} opacity={SH ? 1 : 0} />);
    if (!back) {
      // folds
      S_(`M${f(cx - tw * 0.3)} ${f(neck[1] + 120 * TL)}Q${f(cx - tw * 0.18)} ${f(neck[1] + 170 * TL)} ${f(cx - tw * 0.32)} ${f(neck[1] + 220 * TL)}`, C.shirtSh, 4);
      S_(`M${f(cx + tw * 0.05)} ${f(neck[1] + 190 * TL)}Q${f(cx + tw * 0.14)} ${f(neck[1] + 230 * TL)} ${f(cx + tw * 0.06)} ${f(neck[1] + 262 * TL)}`, C.shirtSh, 4);
      if (MARA) {
        const vx = front ? [-1, 1] : v === "tq" ? [-1, 0.6] : [0.35];
        vx.forEach((sg) => P_(smooth([[cx + sg * tw * 0.5, neck[1] + 4], [cx + sg * tw * 0.12, neck[1] + 14], [hip[0] + sg * hw * 0.2 + hs * 0.6, hemY], [hip[0] + sg * hw * 0.95 + hs * 0.6, hemY - 4], [wst[0] + sg * (hw - 6), wst[1]]]), C.scarf));
        if (!side) P_(ell(cx + tw * 0.3 * (v === "tq" ? 0.6 : 1), neck[1] + 120 * TL, 7, 6), C.scarfSh, 3);
      }
      if (!MARA) {
      // placket + buttons, small torn nick at the hem
      const px2 = cx + dir * 10;
      S_(`M${f(px2)} ${f(neck[1] + 18)}L${f(px2 + hs * 0.6)} ${f(hemY + 2)}`, C.shirtSh, 4);
      [0.3, 0.55, 0.8].forEach((t) => els.push(<circle key={els.length} cx={f(px2 + 6 + hs * 0.6 * t)} cy={f(neck[1] + 18 + (hemY - neck[1] - 18) * t)} r={3.2} fill="#cbbfa8" stroke={C.line} strokeWidth={1.5} />));
      S_(`M${f(hip[0] - hw * 0.45)} ${f(hemY + 1)}l7 -12l7 12`, C.line, 3);
      }
    } else if (MARA) P_(smooth([[shL[0] + 6, neck[1] + 6], [shR[0] - 6, neck[1] + 6], [hip[0] + hw + 4, hemY - 2], [hip[0] - hw - 4, hemY - 2]]), C.scarf);
    // neck
    P_(limb([neck[0] + dir * 6, neck[1] + 22], [neck[0] + dir * 8, neck[1] - 62], 38, 33), C.skin);
    if (MARA) { // rounded collar instead of a scarf
      if (!back) [-1, 1].forEach((sg) => P_(smooth([[neck[0] + dir * 6, neck[1] + 4], [neck[0] + dir * 6 + sg * 30 * W, neck[1] - 4], [neck[0] + dir * 6 + sg * 36 * W, neck[1] + 12], [neck[0] + dir * 6 + sg * 10, neck[1] + 20]]), C.shirt, 3.5));
      return;
    }
    // scarf: wrapped band + knot + two tails (front/3-4/side), band only from the back
    const sx = neck[0] + dir * 8;
    P_(smooth([[sx - 46 * W, neck[1] - 6], [sx + 46 * W, neck[1] - 8], [sx + 48 * W, neck[1] + 14], [sx - 48 * W, neck[1] + 16]]), C.scarf);
    if (!back) {
      const kx = sx + 18 * W + dir * 10, ky = neck[1] + 12, ss = pose.scarfSway ?? 0;
      P_(smooth([[kx - 4, ky], [kx + 14, ky + 6], [kx + 20 + ss * 16, ky + 70 - Math.abs(ss) * 6], [kx + 8 + ss * 16, ky + 74 - Math.abs(ss) * 6], [kx + 2, ky + 24]]), C.scarf);
      P_(smooth([[kx - 10, ky + 4], [kx + 2, ky + 10], [kx - 4 + ss * 12, ky + 60], [kx - 16 + ss * 12, ky + 56]]), C.scarfSh);
      P_(ell(kx, ky, 11, 9), C.scarf);
    }
  };
  const head = () => {
    const hx = neck[0] + dir * 10 + (pose.headYaw ?? 0) * 6, hy = HEAD_CY + (neck[1] - NECK_Y) + (pose.headNod ?? 0) - ((look.head ?? 1) - 1) * 90;
    const tilt = (pose.headTilt ?? 0) + (E.tilt ?? 0);
    const hw = HEAD_W * (side ? 0.92 : 1);
    // mature head: wider cranium, defined cheekbone, jaw tapering to a chin (not a round baby head)
    const shape: P[] = side
      ? [[-0.5, -0.12], [-0.44, -0.55], [-0.05, -0.76], [0.36, -0.62], [0.47, -0.3], [0.46, -0.12], [0.6, 0.06], [0.49, 0.14], [0.5, 0.27], [0.47, 0.36], [0.48, 0.47], [0.4, 0.58], [0.18, 0.6], [-0.08, 0.42], [-0.36, 0.3], [-0.5, 0.1]]
      : [[-0.5, -0.25], [-0.42, -0.62], [0, -0.75], [0.42, -0.62], [0.5, -0.25], [0.47, 0.12], [0.36, 0.42], [0.14, 0.6], [0, 0.63], [-0.14, 0.6], [-0.36, 0.42], [-0.47, 0.12]];
    const yaw = dir * 0.2 + (pose.headYaw ?? 0) * 0.12; // features slide toward the facing side
    const pt = (u: number, w: number): P => [u * hw, w * HEAD_H];
    const headD = smooth(shape.map(([u, w]) => pt(u, w)));
    const g: React.ReactNode[] = [];
    const gp = (d: string, fill: string, sw = OW) => g.push(<path key={g.length} d={d} fill={fill} stroke={C.line} strokeWidth={sw * K} strokeLinejoin="round" />);
    const gs = (d: string, stroke: string, sw: number) => g.push(<path key={g.length} d={d} fill="none" stroke={stroke} strokeWidth={stroke === C.line ? sw * Math.max(K, 0.6) : sw} strokeLinecap="round" />);
    // ears (behind the head contour; on the head in side view)
    const earX = side ? -0.06 : v === "tq" ? -0.44 : 0.5;
    const ears = front || back ? [-1, 1] : [1];
    if (MARA) gp(smooth(side
      ? [pt(-0.66, -0.3), pt(-0.3, -0.84), pt(0.3, -0.8), pt(0.5, -0.4), pt(0.1, 0.0), pt(-0.06, 0.34), pt(-0.5, 0.42), pt(-0.74, 0.5), pt(-0.68, 0.2)]
      : [pt(-0.64, -0.3), pt(-0.5, -0.7), pt(0, -0.88), pt(0.5, -0.7), pt(0.64, -0.3), pt(0.66, 0.26), pt(0.8, 0.46), pt(0.5, 0.38), pt(-0.5, 0.38), pt(-0.8, 0.46), pt(-0.66, 0.26)]), C.hair);
    if (!side && !MARA) ears.forEach((s) => gp(ell(front || back ? s * earX * hw : earX * hw, 6, 13, 19), C.skin));
    gp(headD, back ? C.hairSh : C.skin);
    if (!back) {
      // cel shade clipped to the head silhouette (never leaves the outline)
      g.push(<clipPath key="hc" id={`${id}-head`}><path d={headD} /></clipPath>);
      g.push(<path key="hs" d={`M${f(hw * (0.12 + yaw))} ${f(-HEAD_H)}L${f(hw)} ${f(-HEAD_H)}L${f(hw)} ${f(HEAD_H)}L${f(hw * (0.0 + yaw))} ${f(HEAD_H)}Z`} fill={C.skinSh} opacity={SH ? 0.55 : 0} clipPath={`url(#${id}-head)`} />);
      g.push(<path key="ho" d={headD} fill="none" stroke={C.line} strokeWidth={OW * K} />);
      if (side) { gp(ell(-0.06 * hw, 6, 12, 17), C.skin, 4); gs(`M${f(-0.06 * hw - 3)} ${f(-2)}q6 8 0 16`, C.skinSh, 3); }
      // face
      const fx = yaw * hw;
      const eyeY = -0.08 * HEAD_H, gap = 0.21 * hw;
      const eyes = side ? [1] : v === "tq" ? [-0.8, 1.05] : [-1, 1];
      const gz = pose.gaze ?? [0, 0];
      const blink = Math.max(0, Math.min(1, pose.blink ?? 0));
      eyes.forEach((e, i) => {
        const s = e < 0 ? -1 : 1, sc = side ? 0.9 : Math.abs(e);
        const ex = side ? 0.3 * hw : fx + e * gap, ew = 18 * sc, eh = 13.5;
        const open = Math.max(0.06, (1 - Math.max(E.lid, -0.15)) * (1 - blink));
        if (open < 0.2) gs(`M${f(ex - ew)} ${f(eyeY)}Q${f(ex)} ${f(eyeY + 5)} ${f(ex + ew)} ${f(eyeY)}`, C.line, 4);
        else if (look.eyes === "dot" || look.eyes === "bean") {
          const ix = ex + (gz[0] + dir * 0.3) * ew * 0.3, iy = eyeY + gz[1] * 3, bean = look.eyes === "bean";
          const ry = (bean ? 13 : 8) * Math.min(1, open * 1.1);
          g.push(<path key={`de${i}`} d={ell(ix, iy, bean ? 7.5 : 7, ry)} fill="#120c0a" />);
          g.push(<path key={`dh${i}`} d={ell(ix + 2.5, iy - ry * 0.45, 2.2, 2.4)} fill="#fff" />);
        }
        else {
          const top = eyeY - eh * open * 1.15, bot = eyeY + eh * (0.9 - E.lower * 0.55);
          const eyeD = `M${f(ex - ew)} ${f(eyeY)}C${f(ex - ew * 0.7)} ${f(top)} ${f(ex + ew * 0.6)} ${f(top)} ${f(ex + ew)} ${f(eyeY - 1)}C${f(ex + ew * 0.6)} ${f(bot)} ${f(ex - ew * 0.6)} ${f(bot)} ${f(ex - ew)} ${f(eyeY)}Z`;
          gp(eyeD, C.white, 3.5);
          g.push(<clipPath key={`ec${i}`} id={`${id}-eye${i}`}><path d={eyeD} /></clipPath>);
          const ix = ex + (gz[0] + dir * 0.3) * ew * 0.45, iy = eyeY + gz[1] * 4;
          g.push(<g key={`ei${i}`} clipPath={`url(#${id}-eye${i})`}><path d={ell(ix, iy, 8.5, 9)} fill={C.iris} /><path d={ell(ix, iy, 4.2 * E.pupil, 4.6 * E.pupil)} fill="#0e0a08" /><path d={ell(ix + 3, iy - 3.5, 2.4, 2.4)} fill="#fff" /></g>);
          if (MARA) gs(`M${f(ex + s * ew * (side ? 1 : 1))} ${f(eyeY - 2)}l${f(s * 7 * (side ? 1 : 1))} -6`, C.line, 3.5);
          gs(`M${f(ex - ew - 2)} ${f(eyeY)}C${f(ex - ew * 0.7)} ${f(top - 1)} ${f(ex + ew * 0.6)} ${f(top - 1)} ${f(ex + ew + 2)} ${f(eyeY - 2)}`, C.line, 5); // upper lash line
        }
        // brow: thick, angled — main emotion carrier
        const bi = s < 0 ? 0 : 1, raise = E.browR[bi], ang = E.browA[bi];
        const by = eyeY - 24 - raise * 1.4, inner = -s; // inner end toward the nose
        const b1: P = [ex - ew - 2, by + (inner < 0 ? -ang * 24 : ang * 24) * 0.5], b2: P = [ex + ew + 2, by - (inner < 0 ? -ang * 24 : ang * 24) * 0.5];
        gs(`M${f(b1[0])} ${f(b1[1])}Q${f((b1[0] + b2[0]) / 2)} ${f((b1[1] + b2[1]) / 2 - 4)} ${f(b2[0])} ${f(b2[1])}`, MARA ? C.hairSh : C.hair, MARA ? 7 : 9);
      });
      // nose with a little bridge (adult), cheek line
      const nx = side ? 0.47 * hw : fx + dir * 0.12 * hw;
      if (side) gs(`M${f(0.5 * hw)} ${f(eyeY + 30)}q-6 2 -8 -4`, C.line, 3);
      else gs(`M${f(nx - 2)} ${f(eyeY + 6)}Q${f(nx + 3 + dir * 8)} ${f(eyeY + 30)} ${f(nx - 6)} ${f(eyeY + 36)}`, C.line, 3.5);
      gs(`M${f(nx - 12)} ${f(eyeY + 38)}q6 3 12 0`, C.skinSh, 3);
      // mouth
      const mx = side ? 0.4 * hw : fx + dir * 0.08 * hw, my = 0.33 * HEAD_H, mw = side ? 10 : 17;
      const vis = pose.mouth && pose.mouth !== "rest" ? pose.mouth : null;
      const open = (pts: string) => gp(pts, C.mouth, 3.5);
      if (vis === "A") { open(ell(mx, my + 4, mw * 0.75, 12)); g.push(<path key="tg" d={ell(mx, my + 10, mw * 0.4, 4)} fill={C.tongue} />); }
      else if (vis === "E") { open(`M${f(mx - mw)} ${f(my)}L${f(mx + mw)} ${f(my)}L${f(mx + mw * 0.8)} ${f(my + 9)}L${f(mx - mw * 0.8)} ${f(my + 9)}Z`); g.push(<path key="tt" d={`M${f(mx - mw * 0.8)} ${f(my + 1)}h${f(mw * 1.6)}v4h${f(-mw * 1.6)}Z`} fill="#fff" />); }
      else if (vis === "O") open(ell(mx, my + 4, mw * 0.45, 10));
      else if (vis === "U") open(ell(mx, my + 3, mw * 0.3, 6));
      else if (vis === "M") gs(`M${f(mx - mw * 0.8)} ${f(my + 1)}L${f(mx + mw * 0.8)} ${f(my + 1)}`, C.line, 5);
      else if (vis === "F") { gs(`M${f(mx - mw * 0.8)} ${f(my)}L${f(mx + mw * 0.8)} ${f(my)}`, C.line, 4); g.push(<path key="ft" d={`M${f(mx - mw * 0.6)} ${f(my)}h${f(mw * 1.2)}v4h${f(-mw * 1.2)}Z`} fill="#fff" />); }
      else if (look.mouthMorph && E.mouthFrom && E.mouthTo && E.mouthFrom !== E.mouthTo && (E.mouthK ?? 1) > 0 && (E.mouthK ?? 1) < 1) {
        const k = E.mouthK!, lw = Math.max(K, 0.6);
        const A = mouthShape(E.mouthFrom, mx, my, mw, lw), B = mouthShape(E.mouthTo, mx, my, mw, lw);
        const col = (m: MS) => (m.fill === "line" ? C.line : C.mouth);
        g.push(<path key={g.length} d={morphAt(A.d, B.d, k)} fill={mixRGB(col(A), col(B), k)} stroke={C.line} strokeWidth={(A.sw + (B.sw - A.sw) * k) * K} strokeLinejoin="round" />);
        const teeth = E.mouthTo === "smile" ? k : E.mouthFrom === "smile" ? 1 - k : 0; // smile teeth fade instead of popping
        if (teeth > 0.05) g.push(<path key="tth" opacity={teeth * teeth} d={`M${f(mx - mw)} ${f(my - 2)}Q${f(mx)} ${f(my + 3)} ${f(mx + mw)} ${f(my - 3)}L${f(mx + mw * 0.8)} ${f(my + 3)}Q${f(mx)} ${f(my + 7)} ${f(mx - mw * 0.8)} ${f(my + 3)}Z`} fill="#fff" />);
      }
      else switch (E.mouth) {
        case "flat": gs(`M${f(mx - mw)} ${f(my)}Q${f(mx)} ${f(my + 2)} ${f(mx + mw)} ${f(my - 1)}`, C.line, 4); break;
        case "smile": open(`M${f(mx - mw * 1.2)} ${f(my - 4)}Q${f(mx)} ${f(my)} ${f(mx + mw * 1.2)} ${f(my - 5)}Q${f(mx + mw * 0.6)} ${f(my + 18)} ${f(mx)} ${f(my + 18)}Q${f(mx - mw * 0.6)} ${f(my + 18)} ${f(mx - mw * 1.2)} ${f(my - 4)}Z`); g.push(<path key="tth" d={`M${f(mx - mw)} ${f(my - 2)}Q${f(mx)} ${f(my + 3)} ${f(mx + mw)} ${f(my - 3)}L${f(mx + mw * 0.8)} ${f(my + 3)}Q${f(mx)} ${f(my + 7)} ${f(mx - mw * 0.8)} ${f(my + 3)}Z`} fill="#fff" />); break;
        case "small": open(ell(mx + 2, my + 2, mw * 0.32, 5)); break;
        case "O": open(ell(mx, my + 6, mw * 0.5, 14)); break;
        case "grimace": open(`M${f(mx - mw)} ${f(my + 4)}Q${f(mx)} ${f(my - 6)} ${f(mx + mw)} ${f(my + 4)}L${f(mx + mw * 0.8)} ${f(my + 12)}Q${f(mx)} ${f(my + 4)} ${f(mx - mw * 0.8)} ${f(my + 12)}Z`); break;
        case "wavy": gs(`M${f(mx - mw)} ${f(my + 2)}q${f(mw / 2)} -6 ${f(mw)} 0t${f(mw)} -2`, C.line, 4); break;
        case "frown": gs(`M${f(mx - mw)} ${f(my + 8)}Q${f(mx)} ${f(my - 8)} ${f(mx + mw)} ${f(my + 8)}`, C.line, 4.5); break;
        case "set": gs(`M${f(mx - mw)} ${f(my + 1)}L${f(mx + mw)} ${f(my - 1)}`, C.line, 5); gs(`M${f(mx + mw)} ${f(my - 1)}l3 3`, C.line, 3); break;
      }
      if (MARA) {
        const fx2 = yaw * hw, fy2 = 0.12 * HEAD_H;
        (side ? [0.28] : v === "tq" ? [-0.18, 0.3] : [-0.24, 0.24]).forEach((cxr) => [[-7, 0], [0, -4], [6, 1], [-2, 6], [5, 7]].forEach(([dx, dy], j) => g.push(<circle key={`fr${cxr}${j}`} cx={f(fx2 * (side ? 0 : 1) + cxr * hw + dx)} cy={f(fy2 + dy)} r={2.3} fill="#c96f4f" />)));
      }
      if (E.sweat) gp(`M${f(-0.42 * hw)} ${f(-0.3 * HEAD_H)}q-6 14 0 16q6 -2 0 -16Z`, "#bfe4f7", 3);
      // short sideburn inside the contour (connects hair to the head, no oval)
      if (!MARA) [-1, 1].forEach((s) => { if (!front && s > 0) return; const sx2 = s * (side ? 0.02 : v === "tq" ? 0.4 : 0.44) * hw;
        g.push(<path key={`sb${s}`} d={smooth([[sx2 - 5, -0.42 * HEAD_H], [sx2 + 5, -0.42 * HEAD_H], [sx2 + 5, -0.1 * HEAD_H], [sx2 - 3, -0.06 * HEAD_H]])} fill={C.hairSh} clipPath={`url(#${id}-head)`} />); });
    }
    // hair: a dome of big curls + small curls breaking the silhouette, swirl lines inside each curl
    if (MARA) {
      const hairD = back
        ? smooth([pt(-0.62, -0.3), pt(-0.5, -0.7), pt(0, -0.88), pt(0.5, -0.7), pt(0.62, -0.3), pt(0.66, 0.3), pt(0.82, 0.48), pt(0.4, 0.42), pt(-0.4, 0.42), pt(-0.82, 0.48), pt(-0.66, 0.3)])
        : side
          ? smooth([pt(-0.62, -0.3), pt(-0.2, -0.84), pt(0.36, -0.74), pt(0.54, -0.44), pt(0.3, -0.54), pt(0.12, -0.44), pt(-0.1, -0.5), pt(-0.14, -0.1), pt(-0.3, 0.16), pt(-0.62, 0.0)])
          : smooth([pt(-0.6, -0.1), pt(-0.52, -0.6), pt(0, -0.86), pt(0.52, -0.6), pt(0.58, -0.3), pt(0.3 + yaw, -0.5), pt(0.05 + yaw, -0.44), pt(-0.25 + yaw, -0.54), pt(-0.48, -0.4)]);
      gp(hairD, C.hair);
      if (!back && !side) [-1, 1].forEach((sg) => { const sx3 = sg * (v === "tq" && sg > 0 ? 0.46 : 0.54) + (v === "tq" ? yaw * 0.4 : 0);
        gp(smooth([pt(sx3 - sg * 0.06, -0.4), pt(sx3 + sg * 0.1, -0.1), pt(sx3 + sg * 0.12, 0.3), pt(sx3 + sg * 0.24, 0.46), pt(sx3 - sg * 0.02, 0.38), pt(sx3 - sg * 0.1, 0.0)]), C.hair); });
      // strand lines
      [[-0.3, -0.7, -0.4, -0.45], [0.05, -0.78, 0.0, -0.4], [0.32, -0.66, 0.38, -0.42]].forEach(([a1, b1, a2, b2], i) => gs(`M${f(a1 * hw)} ${f(b1 * HEAD_H)}Q${f((a1 + a2) * 0.5 * hw + 6)} ${f((b1 + b2) * 0.5 * HEAD_H)} ${f(a2 * hw)} ${f(b2 * HEAD_H)}`, C.hairSh, 3 + (i % 2)));
      els.push(<g key={els.length} transform={`translate(${f(hx)} ${f(hy)}) rotate(${f(tilt * 57.3)}) scale(${HS})`}>{g}</g>);
      return;
    }
    const curls: [number, number, number][] = back
      ? [[-0.46, -0.5, 0.28], [0, -0.72, 0.32], [0.46, -0.5, 0.28], [-0.26, -0.3, 0.26], [0.26, -0.3, 0.26], [0, -0.14, 0.24], [-0.48, -0.18, 0.2], [0.48, -0.18, 0.2], [0, -0.95, 0.2]]
      : [[-0.46, -0.58, 0.27], [-0.2, -0.78, 0.3], [0.16, -0.8, 0.3], [0.46, -0.6, 0.26], [-0.52, -0.3, 0.18], [0.52, -0.36, 0.15], [-0.24 + yaw, -0.64, 0.2], [0.16 + yaw, -0.66, 0.2], [-0.02, -0.92, 0.2],
        ...(side ? [[-0.42, -0.2, 0.26], [-0.5, 0.02, 0.2], [-0.3, -0.5, 0.26]] as [number, number, number][] : v === "tq" ? [[-0.56, -0.1, 0.17]] as [number, number, number][] : [])];
    if (back) curls.push([-0.38, 0.04, 0.2], [0.38, 0.04, 0.2], [-0.14, 0.12, 0.19], [0.14, 0.12, 0.19], [-0.3, 0.3, 0.17], [0.3, 0.3, 0.17], [0, 0.36, 0.17]);
    const smalls: [number, number][] = back ? [[-0.25, -0.86], [0.25, -0.86], [0, -0.95]] : [[-0.36, -0.9], [0.34, -0.92], [-0.58, -0.4], [0.58, -0.44], [0.0, -1.05]];
    if (!back) gp(smooth([pt(-0.5, -0.3), pt(-0.4, -0.66), pt(0, -0.8), pt(0.4, -0.66), pt(0.5, -0.3), pt(0.3, -0.5), pt(-0.3, -0.5)]), C.hairSh, 0);
    curls.forEach(([u, w, r]) => gp(ell(u * hw, w * HEAD_H, r * hw, r * hw * 0.9), C.hair));
    smalls.forEach(([u, w]) => gp(ell(u * hw, w * HEAD_H, 0.12 * hw, 0.11 * hw), C.hair));
    curls.forEach(([u, w, r], i) => { const rr = r * hw * 0.5, px = u * hw, py = w * HEAD_H; gs(`M${f(px - rr)} ${f(py)}A${f(rr)} ${f(rr * 0.85)} 0 1 1 ${f(px + rr * 0.3)} ${f(py + rr * 0.7)}`, i % 2 ? C.curl : C.hairSh, 3.5); });
    els.push(<g key={els.length} transform={`translate(${f(hx)} ${f(hy)}) rotate(${f(tilt * 57.3)}) scale(${HS})`}>{g}</g>);
  };

  // ---- draw order (2.5D: far side darker and behind) ----
  const nearIsRight = !(pose.flip);
  if (front) {
    leg(hipL, kneeL, ankL, fl, pose.toeL ?? 0, -1, false); leg(hipR, kneeR, ankR, fr, pose.toeR ?? 0, 1, false);
    arm(shL, aL, false, "upper"); arm(shR, aR, false, "upper"); torso(); arm(shL, aL, false, "lower", pose.handL); arm(shR, aR, false, "lower", pose.handR); head();
  } else if (back) {
    leg(hipL, kneeL, ankL, fl, pose.toeL ?? 0, -1, false); leg(hipR, kneeR, ankR, fr, pose.toeR ?? 0, 1, false);
    arm(shL, aL, false, "upper"); arm(shR, aR, false, "upper"); torso(); head(); arm(shL, aL, false, "lower", pose.handL); arm(shR, aR, false, "lower", pose.handR);
  } else {
    // facing right: left limbs are the far side
    arm(shL, aL, true, "all", pose.handL); leg(hipL, kneeL, ankL, fl, pose.toeL ?? 0, -1, true);
    leg(hipR, kneeR, ankR, fr, pose.toeR ?? 0, 1, false); arm(shR, aR, false, "upper"); torso(); head(); arm(shR, aR, false, "lower", pose.handR);
  }
  void nearIsRight; void far;
  // ground contact: nothing (feet, knees) may sink below y=0 after the whole-body transform; lift the body if needed
  const rr = ((pose.rootRot ?? 0) * Math.PI) / 180, rX = pose.rootX ?? 0;
  const xf = (q: P, dy = 0): number => hip[1] + (q[0] - hip[0]) * Math.sin(rr) + (q[1] + dy - hip[1]) * Math.cos(rr) + (pose.rootY ?? 0);
  const pen = pose.ground === false ? 0 : Math.max(0, xf(fl), xf(fr), xf([fl[0] + 56, fl[1]]), xf([fr[0] + 56, fr[1]]), xf([fl[0] - 30, fl[1]]), xf([fr[0] - 30, fr[1]]), xf(kneeL, 21 * LB), xf(kneeR, 21 * LB));
  const rootY = (pose.rootY ?? 0) - pen; void rX;
  const joints: P[] = [hip, neck, shL, shR, aL.e, aR.e, aL.w, aR.w, hipL, hipR, kneeL, kneeR, ankL, ankR];
  return (
    <g transform={`translate(${f(x)} ${f(y)}) scale(${pose.flip ? -scale : scale} ${scale})`}>
      <g transform={`translate(${f(pose.rootX ?? 0)} ${f(rootY)}) rotate(${f(pose.rootRot ?? 0)} ${f(hip[0])} ${f(hip[1])})`}>{els}</g>
      {showJoints ? joints.map((j, i) => <circle key={`j${i}`} cx={j[0]} cy={j[1]} r={7} fill="#ff3b6b" stroke="#fff" strokeWidth={2} />) : null}
    </g>
  );
};
