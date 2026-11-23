import { mixExpr, type ED, type Expr, type Pose } from "./TeoRig2D";
import { mixPose } from "./poses";

// studio2d animation system: keyframed pose tracks + principles (ease, anticipation, overshoot,
// overlapping action, follow-through) + an always-on "alive" layer (breath, blinks, eye darts).

export type Ease = (t: number) => number;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const EASE = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  /** overshoot then settle (weight carried past the target) */
  overshoot: (t: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  /** small pull back before the move (anticipation) */
  anticipate: (t: number) => { const c = 1.6; return t * t * ((c + 1) * t - c); },
  /** anticipation + overshoot */
  snap: (t: number) => { const c = 1.4 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2; },
} satisfies Record<string, Ease>;

export type Key = { f: number; pose: Pose; ease?: Ease };
/** pose at frame f: blend between surrounding keys with the destination key's ease */
export const sampleTrack = (keys: Key[], f: number): Pose => {
  if (f <= keys[0].f) return keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (f <= b.f) return mixPose(a.pose, b.pose, (b.ease ?? EASE.inOut)(clamp01((f - a.f) / (b.f - a.f))));
  }
  return keys[keys.length - 1].pose;
};

/** Overlapping action: body parts sample the track at different times.
 *  lead > 0 = part moves earlier (head/eyes lead), lead < 0 = part drags behind (arms follow). */
export type Overlap = { head: number; chest: number; arms: number };
export const DEFAULT_OVERLAP: Overlap = { head: 5, chest: 2, arms: -4 };
export const sampleLayered = (keys: Key[], f: number, o: Overlap = DEFAULT_OVERLAP): Pose => {
  const base = sampleTrack(keys, f), h = sampleTrack(keys, f + o.head), c = sampleTrack(keys, f + o.chest), a = sampleTrack(keys, f + o.arms);
  return { ...base, headTilt: h.headTilt, headNod: h.headNod, headYaw: h.headYaw, gaze: h.gaze ?? base.gaze, chest: c.chest, shrug: c.shrug,
    armL: a.armL, armR: a.armR, handL: a.handL ?? base.handL, handR: a.handR ?? base.handR };
};

/** Follow-through: damped spring response to how fast a body signal changes (scarf, hem, hair). */
export const follow = (signal: (f: number) => number, f: number, damp = 7, freq = 0.45, gain = 1) => {
  let s = 0;
  for (let k = 1; k <= 28; k++) { const v = signal(f - k + 1) - signal(f - k); s += v * Math.exp(-k / damp) * Math.cos(k * freq); }
  return Math.max(-1, Math.min(1, s * gain));
};

// deterministic pseudo-random (same frame -> same result, required by Remotion)
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Alive layer: breathing, natural blink timing (2-5 s, occasional double blink), eye darts held for 0.6-2 s. */
export const alive = (f: number, seed = 1, fps = 30) => {
  const breath = Math.sin((f / fps) * Math.PI * 2 / 3.6 + seed) * 0.5 + 0.5;
  let t = Math.floor(rnd(seed) * 40), blink = 0, i = 0;
  while (t <= f + 8 && i < 400) {
    const d = f - t;
    if (d >= 0 && d < 7) blink = Math.max(blink, [0.4, 0.95, 1, 0.7, 0.35, 0.1, 0][d]);
    if (rnd(seed * 31 + i) < 0.18) { const d2 = d - 9; if (d2 >= 0 && d2 < 7) blink = Math.max(blink, [0.4, 0.95, 1, 0.7, 0.35, 0.1, 0][d2]); }
    t += Math.round(fps * (2 + rnd(seed * 7 + i) * 3)); i++;
  }
  let g0 = 0, gs: [number, number] = [0, 0], prev: [number, number] = [0, 0], j = 0;
  while (j < 400) {
    const len = Math.round(fps * (0.6 + rnd(seed * 13 + j) * 1.4));
    if (g0 + len > f) break;
    prev = gs; gs = [(rnd(seed * 17 + j) - 0.5) * 0.5, (rnd(seed * 19 + j) - 0.5) * 0.25]; g0 += len; j++;
  }
  const k = Math.min(1, (f - g0) / 3); // eyes dart fast (3 frames)
  const dart: [number, number] = [prev[0] + (gs[0] - prev[0]) * k, prev[1] + (gs[1] - prev[1]) * k];
  return { breath, blink, dart };
};

export type ExprKey = { f: number; e: Expr; ease?: Ease; len?: number };
/** expression changes blend over `len` frames (default 8) */
export const sampleExpr = (keys: ExprKey[], f: number): ED => {
  let cur = keys[0].e, from = keys[0].e, t = 1;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f >= k.f) { from = keys[i - 1].e; cur = k.e; t = clamp01((f - k.f) / (k.len ?? 8)); }
  }
  return mixExpr(from, cur, (keys[0].ease ?? EASE.inOut)(t));
};
