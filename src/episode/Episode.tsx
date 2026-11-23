import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, type CalculateMetadataFunction } from "remotion";
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { EASE, type ExprKey, type Key } from "../studio2d/anim";
import type { Expr } from "../studio2d/TeoRig2D";
import { Door2D, FarSea, Layer, MidSea, NearSea, PALS, Raft2D, Raft2DV2, Sky, mixPal, type Cam, type Pal } from "../story2d/Set";
import { CHOSEN, CHOSEN_V2 } from "../story2d/Styles";
import { CORAL, INK as CINK, PAPER, SANS, SERIF, TEAL } from "../cards/TideCards";
import { StandChar, type BodyName, type Gesture, type GestureName } from "../story2d/StandChar";

// Reusable episode renderer: YOUR voice-over + a shot plan (JSON) -> animated 16:9 video with
// word-synced English subtitles, ambience + SFX mixed under the voice. Nothing here generates or alters the voice.

type CharPlan = { body?: [number, BodyName][]; lids?: [number, number][]; expr?: [number, Expr][]; gestures?: [number, GestureName, number?][]; look?: [number, number, number?, number?][]; talk?: [number, number][] };
export type Shot = { start: number; camera: string; subject?: "teo" | "other"; cam?: [Cam, Cam]; transition?: "cut" | "fade" | "dip" | "wipe" | "punch" | "whip"; text?: string; chars?: Record<string, CharPlan> };
export type Plan = { set: "ocean"; style?: "v1" | "v2"; camera?: "dynamic" | "calm"; grade?: "tide"; mouthMorph?: boolean;
  place?: { teo?: [number, number][]; mara?: [number, "water" | "door" | "raft", number?, ("left" | "right")?][] }; doorX?: [number, number][]; raftTwo?: number; debris?: number;
  rain?: [number, number][];
  parts?: [number, "pallet" | "crate" | "beam" | "planks"][]; floating?: { pallet?: number; crate?: number; beam?: number }; teoPallet?: [number, number]; palletX?: [number, number][]; rope?: [number, number]; knots?: number[]; tarp?: { from: number; until?: number; fill: [number, number] }; bottles?: { from: number; until?: number; fill: [number, number] };
  shade?: [number, number]; shadeFly?: boolean; swell?: [number, number][]; flash?: number[]; wash?: [number, number]; waistRope?: [number, number]; partsLost?: number; shadows?: { from: number; to: number; dir: 1 | -1 }[]; endCard?: { at: number; kicker: string; text: string }; bubbles?: { at: number; dur: number; who: "teo" | "mara"; text: string }[]; fish?: [number, number][]; line?: { from: number; until: number; slip?: number; tight?: number }; trimStart?: number; inserts?: { at: number; dur: number; kind: "hook" | "tarp" | "lash" | "tri" | "anchor" | "still" }[]; anchorLine?: { from: number; tight: number; until?: number }; deckFish?: [number, number]; deckItems?: number; whale?: { from: number; to: number; x: [number, number]; y: [number, number]; s?: [number, number]; dir?: 1 | -1; open?: number }[]; deck2?: boolean | number; acting?: boolean; life?: boolean; ship?: { from: number; to: number; x: [number, number]; s: [number, number] }[]; cloudWall?: number[];
  cards?: { kinds?: ("kicker" | "big" | "caption")[]; at: number; dur: number; lines: string[]; reveal?: number[]; pos?: "right" | "top" | "topRight" | "bottomRight" }[]; items?: { at: number; until: number; icons: [number, "tarp" | "rope" | "knife" | "bottles" | "fish" | "hook"][] }[]; ambience?: string | null; cast?: Record<string, number | [number, number]>; mood?: [number, string, number?][]; dips?: number[]; sunPath?: [number, number][]; shiver?: [number, number]; wet?: [number, number]; wind?: [number, number][]; ropeSag?: boolean; shake?: [number, number, number][];
  titles?: { at: number; dur: number; text: string; sub?: string }[]; sfx?: { at: number; file: string; vol?: number; dur?: number }[]; shots: Shot[] };
export type EpisodeProps = { id: string; planFile?: string; noSfx?: boolean; plan?: Plan; captions?: Caption[]; duration?: number; subtitles?: boolean };

const FPS = 30;
const RAFT = { x: 720, y: 870 }, DOOR = { x: 1380, y: 880 }, SC = 0.42;
const CAMS: Record<string, [Cam, Cam]> = {
  "wide-push": [{ cx: 900, cy: 600, z: 1 }, { cx: 780, cy: 640, z: 1.18 }],
  "wide-pan": [{ cx: 700, cy: 600, z: 1.1 }, { cx: 1150, cy: 600, z: 1.1 }],
  "wide-static": [{ cx: 1000, cy: 600, z: 1.05 }, { cx: 1000, cy: 600, z: 1.08 }],
  "medium-both": [{ cx: 1120, cy: 650, z: 1.55 }, { cx: 1000, cy: 650, z: 1.62 }],
  "medium-teo": [{ cx: 760, cy: 640, z: 2.2 }, { cx: 750, cy: 630, z: 2.4 }],
  "medium-mara": [{ cx: 1380, cy: 650, z: 2.2 }, { cx: 1370, cy: 640, z: 2.4 }],
  "closeup-teo": [{ cx: 790, cy: 548, z: 4.6 }, { cx: 792, cy: 552, z: 5.1 }],
  "closeup-mara": [{ cx: 1330, cy: 560, z: 4.6 }, { cx: 1328, cy: 564, z: 5.1 }],
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixCam = (a: Cam, b: Cam, t: number): Cam => ({ cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), z: lerp(a.z, b.z, t) });
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// whole-episode performance tracks per character (seconds -> frames)
const tracks = (plan: Plan, who: string) => {
  const expr: ExprKey[] = [{ f: 0, e: "neutral" }], gestures: Gesture[] = [], look: Key[] = [], talk: [number, number][] = [], body: [number, BodyName][] = [], lids: Key[] = [];
  for (const s of plan.shots) {
    const c = s.chars?.[who]; if (!c) continue;
    c.expr?.forEach(([t, e]) => expr.push({ f: t * FPS, e, len: 10 }));
    c.gestures?.forEach(([t, g, hold]) => gestures.push({ at: t * FPS, g, hold: hold ? hold * FPS : 30 }));
    c.look?.forEach(([t, gx, gy = 0, tilt = 0]) => look.push({ f: t * FPS, pose: { gaze: [gx, gy], headYaw: gx * 0.6, headTilt: tilt }, ease: plan.grade === "tide" ? EASE.inOut : EASE.overshoot }));
    c.talk?.forEach(([a, b]) => talk.push([a * FPS, b * FPS]));
    c.body?.forEach(([t, b]) => body.push([t * FPS, b]));
    c.lids?.forEach(([t, v]) => lids.push({ f: t * FPS, pose: { blink: v } }));
  }
  if (plan.acting) { // fill quiet stretches: a small gesture every ~4 s and a gaze shift every ~2.5 s (deterministic)
    const IDLE = ["open", "think", "scratch", "shrug", "chest", "bothOpen", "crossed", "point"] as const;
    const h = (n: number) => { const x = Math.sin(n * 12.9898 + (who === "mara" ? 78.2 : 3.1)) * 43758.5453; return x - Math.floor(x); };
    const endF = (plan.shots[plan.shots.length - 1].start + 60) * FPS, bodyAt = (f: number) => body.filter(([bf]) => bf <= f).pop()?.[1] ?? "stand";
    const startF = ((plan as { trimStart?: number }).trimStart ?? 0) * FPS;
    for (let f = startF + 45 + (who === "mara" ? 50 : 0), n = 0; f < endF; f += 110 + Math.round(h(n) * 40), n++) {
      const b = bodyAt(f); if (b !== "stand" && b !== "sit") continue;
      if (gestures.some((g) => Math.abs(g.at - f) < 100)) continue;
      gestures.push({ at: f, g: IDLE[Math.floor(h(n + 7) * IDLE.length)] as Gesture["g"], hold: 36 + Math.round(h(n + 3) * 24) });
    }
    for (let f = startF + 20, n = 0; f < endF; f += 70 + Math.round(h(n + 11) * 30), n++) {
      if (look.some((k) => Math.abs(k.f - f) < 45)) continue;
      const toOther = h(n + 5) > 0.45, gx = toOther ? (who === "mara" ? -0.7 : 0.7) : (h(n + 9) - 0.5) * 1.4, gy = toOther ? 0 : (h(n + 13) - 0.6) * 0.6;
      look.push({ f, pose: { gaze: [gx, gy], headYaw: gx * 0.6, headTilt: (h(n + 17) - 0.5) * 0.12 }, ease: EASE.inOut });
    }
    gestures.sort((a, b) => a.at - b.at);
  }
  expr.sort((a, b) => a.f - b.f); look.sort((a, b) => a.f - b.f);
  if (!look.length) look.push({ f: 0, pose: { gaze: [who === "mara" ? 0.5 : 0.6, 0] } });
  body.sort((a, b) => a[0] - b[0]); lids.sort((a, b) => a.f - b.f);
  return { expr, gestures, look, talk, body, lids };
};

export const palAt = (plan: Plan, t: number): Pal => {
  const m = plan.mood ?? [[0, "day"]];
  let i = 0; while (i + 1 < m.length && t >= m[i + 1][0]) i++;
  const cur = PALS[m[i][1]] ?? PALS.day, prev = i > 0 ? PALS[m[i - 1][1]] ?? PALS.day : cur;
  const bl = m[i][2] ?? 2.5, p = i > 0 ? mixPal(prev, cur, bl <= 0 ? 1 : clamp01((t - m[i][0]) / bl)) : cur;
  const q = plan.grade === "tide" ? mixPal(p, PALS.tide, tideW(p)) : p;
  const sp = plan.sunPath; // sun travelling across the sky (time passing), only inside its window
  return sp && t >= sp[0][0] && t <= sp[sp.length - 1][0] ? { ...q, sunY: trackX(sp, t, q.sunY) } : q;
};
/** spoken words: [normalised word, seconds] built from the caption tokens */
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const spokenWords = (caps: Caption[]) => { const out: [string, number][] = [];
  for (const c of caps) { const txt = c.text; if (out.length && !/^\s/.test(txt) && norm(txt)) { out[out.length - 1][0] += norm(txt); continue; } const n = norm(txt); if (n) out.push([n, c.startMs / 1000]); }
  return out; };
/** time each card word is spoken (searching forward inside the card window); unspoken words take the previous time */
const wordTimes = (words: [string, number][], lines: string[], from: number, to: number, fallback: number[]) => {
  let k = words.findIndex(([, tt]) => tt >= from - 0.6); if (k < 0) k = words.length;
  let last = from; const res: number[][] = [];
  lines.forEach((ln, j) => { const row: number[] = []; let lineStart = fallback[j] ?? last;
    for (const w of ln.split(/\s+/)) { const n = norm(w); let found = -1;
      if (n) for (let q = k; q < words.length && words[q][1] <= to; q++) if (words[q][0] === n || (n.length > 3 && words[q][0].startsWith(n))) { found = q; break; }
      if (found >= 0) { last = Math.max(words[found][1], from); k = found + 1; } else if (!row.length) last = Math.max(last, lineStart);
      row.push(last); }
    res.push(row); });
  return res; };
/** how strongly the TIDE look applies to a mood (by sky brightness): day ≈ 0.7, night 0 */
const tideW = (p: Pal) => { const lum = [1, 3, 5].reduce((a, i) => a + parseInt(p.skyTop.slice(i, i + 2), 16), 0) / 765; return clamp01((lum - 0.2) * 2) * 0.9; };
const INK = "#1b2a33";
/** drawn contact + cast shadow; sun is up-right so it falls to the left on the deck */
const Shade: React.FC<{ x: number; tide: boolean; rx?: number }> = ({ x, tide, rx = 46 }) => tide ? (
  <g opacity={0.32}><ellipse cx={x} cy={-13} rx={rx - 2} ry={6} fill={INK} /><path d={`M${x - 20} -14 L${x + 18} -14 L${x - 70} -4 L${x - 112} -4 Z`} fill={INK} opacity={0.6} /></g>
) : <ellipse cx={x} cy={-13} rx={rx} ry={6} fill="#00000038" />;
/** shake events: [t, amplitude, duration] -> 0..amp, decaying */
export const shakeAt = (plan: Plan, t: number) => (plan.shake ?? []).reduce((acc, [s, a, d]) => (t >= s && t < s + d ? Math.max(acc, a * (1 - (t - s) / d)) : acc), 0);
const lastAt = <T,>(arr: [number, ...T[]][] | undefined, t: number) => { let r: [number, ...T[]] | undefined; for (const e of arr ?? []) if (t >= e[0]) r = e; return r; };
const trackX = (arr: [number, number][] | undefined, t: number, def: number) => {
  if (!arr?.length) return def; if (t <= arr[0][0]) return arr[0][1];
  for (let i = 1; i < arr.length; i++) if (t <= arr[i][0]) return arr[i - 1][1] + (arr[i][1] - arr[i - 1][1]) * EASE.inOut((t - arr[i - 1][0]) / (arr[i][0] - arr[i - 1][0]));
  return arr[arr.length - 1][1];
};
/** small floating wreckage (planks, a crate) */
const Debris2D: React.FC<{ t: number; pal: Pal }> = ({ t, pal }) => (
  <>
    {([[-380, 915, 0, 150], [1720, 935, 1, 120], [2250, 905, 2, 170], [140, 960, 1, 90], [2600, 950, 0, 130]] as number[][]).map(([x, y, k, w], i) => (
      <g key={i} transform={`translate(${x + Math.sin(t * 0.4 + i) * 10} ${y + Math.sin(t * 1.2 + i * 2) * 4}) rotate(${Math.sin(t * 0.7 + i) * 3 + (i % 2 ? 6 : -4)})`}>
        {k === 1 ? <><rect x={-w / 2} y={-34} width={w} height={44} rx={4} fill="#7d6a52" /><rect x={-w / 2} y={-34} width={w} height={10} fill="#998468" /><path d={`M${-w / 2 + 12} -20 L${w / 2 - 12} -20`} stroke="#5f4f3c" strokeWidth={3} /></>
          : <><rect x={-w / 2} y={-10} width={w} height={18} rx={3} fill={k === 2 ? "#8a5a30" : "#9c6a3b"} /><rect x={-w / 2} y={-10} width={w} height={5} fill="#b9864f" /></>}
        <path d={`M${-w / 2 - 14} 10 q${w / 2 + 14} -8 ${w + 28} 0`} stroke={pal.nearLine} strokeWidth={4} fill="none" opacity={0.7} />
      </g>
    ))}
  </>
);

/** wreckage pieces: drawn in local coordinates, top surface at y=0 */
const Pallet: React.FC = () => (<g>
  <rect x={-120} y={0} width={240} height={26} rx={3} fill="#8a6136" />
  {[-100, -50, 0, 50, 100].map((x) => <rect key={x} x={x - 20} y={-10} width={40} height={12} rx={2} fill="#b98a55" />)}
  {[-90, 0, 90].map((x) => <rect key={x} x={x - 14} y={2} width={28} height={22} fill="#6e4a28" />)}
</g>);
const Crate: React.FC = () => (<g>
  <rect x={-46} y={-62} width={92} height={70} rx={6} fill="#5f7d8c" />
  <rect x={-46} y={-62} width={92} height={14} rx={6} fill="#7e9cab" />
  {[-24, 0, 24].map((x) => <rect key={x} x={x - 4} y={-44} width={8} height={46} rx={3} fill="#4c6774" />)}
</g>);
const Beam: React.FC<{ len?: number }> = ({ len = 520 }) => (<g>
  <rect x={-len / 2} y={-8} width={len} height={26} rx={5} fill="#7b4f28" />
  <rect x={-len / 2} y={-8} width={len} height={8} rx={4} fill="#a87444" />
  {[-0.3, 0.1, 0.35].map((k) => <path key={k} d={`M${k * len - 30} 2 q30 4 60 0`} stroke="#5c391b" strokeWidth={2.5} fill="none" />)}
</g>);
const World: React.FC<{ f: number; cam: Cam; plan: Plan; T: Record<string, ReturnType<typeof tracks>> }> = ({ f, cam, plan, T }) => {
  const t = f / FPS, cast = plan.cast ?? { teo: 0 }, pal = palAt(plan, t), sh = shakeAt(plan, t), V2 = plan.style === "v2";
  const lum = [1, 3, 5].reduce((a, i) => a + parseInt(pal.skyTop.slice(i, i + 2), 16), 0) / 765;
  const stars = clamp01((0.3 - lum) * 6);
  const sw = trackX(plan.swell, t, 0), bob = Math.sin(t * 1.4) * 6 + Math.sin(t * 9) * sh * 6 + Math.sin(t * 0.85) * 70 * sw, rock = Math.sin(t * 1.1) * 1.4 + Math.sin(t * 5.5) * sh * 9 + Math.sin(t * 0.85 + 1.1) * 7 * sw, dBob = Math.sin(t * 1.3 + 1.2) * 7, dRock = Math.sin(t * 0.9 + 0.5) * 1.8;
  const on = (w: string) => { const c = cast[w]; if (c === undefined) return false; return Array.isArray(c) ? t >= c[0] && t < c[1] : t >= c; };
  const inR = (r?: [number, number]) => !!r && t >= r[0] && t < r[1];
  const wet = inR(plan.wet), shiv = inR(plan.shiver) ? 1 : 0, wnd = trackX(plan.wind, t, 0);
  const style0 = { ...(V2 ? CHOSEN_V2 : CHOSEN), mouthMorph: plan.mouthMorph }, style = wet ? { ...style0, light: -0.1, sat: 0.85 } : style0, TIDE = plan.grade === "tide", tw = TIDE ? tideW(pal) * pal.sunA : 0;
  const teoX = trackX(plan.place?.teo, t, 0);
  const mp = lastAt<string | number>(plan.place?.mara as [number, ...(string | number)[]][] | undefined, t);
  const maraMode = (mp?.[1] as string | undefined) ?? "door", maraX = (mp?.[2] as number | undefined) ?? 0, maraRight = mp?.[3] === "right";
  const two = plan.raftTwo !== undefined && t >= plan.raftTwo;
  const rain = trackX(plan.rain, t, 0);
  const lost = plan.partsLost !== undefined && t >= plan.partsLost;
  const has = (k: string) => !lost && (plan.parts ?? []).some(([pt, pk]) => pk === k && t >= pt);
  const fl = plan.floating ?? {};
  const onPallet = plan.teoPallet !== undefined && t >= plan.teoPallet[0] && t < plan.teoPallet[1];
  const palletX = trackX(plan.palletX, t, 1500), pBob = Math.sin(t * 1.5 + 2) * 6;
  const doorX = trackX(plan.doorX, t, DOOR.x);
  const showDoor = !two && (on("door") || on("mara") || on("maraHand"));
  const mara = (x: number, y: number, sw: number) => <StandChar who="mara" f={f} x={x} y={y} scale={SC} flip={!maraRight} seed={8} style={style} sway={V2 ? sw : 0} shiver={shiv} wind={wnd} {...T.mara} />;
  return (
    <svg viewBox="0 0 1920 1080" width={1920} height={1080} style={{ position: "absolute" }}>
      <Layer cam={cam} d={0.08}><Sky t={t} pal={pal} stars={stars} />
        {plan.cloudWall && t >= plan.cloudWall[0] ? (() => { const k = EASE.inOut(clamp01((t - plan.cloudWall![0]) / (plan.cloudWall![1] - plan.cloudWall![0]))), x = -900 + k * 2200;
          let d = `M-1300 620 L-1300 -100 L${x - 200} -100`; for (let i = 0; i <= 8; i++) d += ` Q${x + 80 + Math.sin(i * 2.1) * 40} ${-60 + i * 90} ${x + Math.sin(i * 1.3 + t * 0.3) * 30} ${-10 + i * 80}`;
          return <path d={d + " L-1300 620 Z"} fill="#0d1424" opacity={0.96 * (plan.cloudWall![2] ? clamp01((plan.cloudWall![2] - t) / 2) : 1)} />; })() : null}</Layer>
      <Layer cam={cam} d={0.35}><FarSea t={t} pal={pal} />
        {(plan.ship ?? []).filter((sh) => t >= sh.from && t < sh.to).map((sh, i) => { const k = (t - sh.from) / (sh.to - sh.from), x = lerp(sh.x[0], sh.x[1], k), sc = lerp(sh.s[0], sh.s[1], k);
          const op = clamp01((t - sh.from) / 0.6) * clamp01((sh.to - t) / 0.6), hull = "#33424d", top = "#4a5a66";
          // distant cargo ship on the horizon (y 560), bow to the left; containers as flat blocks, bridge at the stern
          return <g key={`ship${i}`} opacity={op} transform={`translate(${x} 561) scale(${sc})`}>
            <path d="M-300 -10 L300 -10 L280 22 L-270 22 Z" fill={hull} /><rect x={-300} y={-14} width={600} height={6} fill="#7a3f36" />
            {[-250, -190, -130, -70, -10, 50, 110].map((cx, q) => <rect key={q} x={cx} y={-14 - (18 + (q % 3) * 8)} width={54} height={18 + (q % 3) * 8} fill={["#5d6e79", "#6b5a52", "#556673"][q % 3]} />)}
            <rect x={175} y={-78} width={70} height={64} fill={top} /><rect x={165} y={-86} width={90} height={10} fill={top} /><rect x={225} y={-110} width={10} height={26} fill={hull} />
            {[185, 203, 221].map((wx) => <rect key={wx} x={wx} y={-70} width={10} height={6} fill="#c9d6dc" opacity={0.7} />)}
          </g>; })}
        {tw > 0.05 ? <g opacity={tw}>{Array.from({ length: 46 }, (_, i) => { const r = i / 46, y = 600 + r * r * 330, w = 10 + r * 60, x = 1500 + Math.sin(i * 12.9) * (20 + r * 190);
          return <rect key={i} x={x - w / 2} y={y} width={w} height={2 + r * 3} rx={2} fill="#fff4d6" opacity={0.25 + 0.65 * Math.max(0, Math.sin(t * 2.2 + i * 1.7))} />; })}</g> : null}</Layer>
      {plan.life && stars < 0.3 ? <Layer cam={cam} d={0.25}>{[0, 1, 2].map((i) => { const per = 23 + i * 7, ph = ((t + i * 9) % per) / per, x = -300 + ph * 2600, y = 230 + i * 70 + Math.sin(t * 0.7 + i) * 25, fl = Math.sin(t * (7 + i)) * 10;
          return <path key={`b${i}`} d={`M${x - 22} ${y - fl} Q${x - 10} ${y - 8} ${x} ${y} Q${x + 10} ${y - 8} ${x + 22} ${y - fl}`} stroke="#2c3e48" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.75} />; })}</Layer> : null}
      {plan.life && stars < 0.3 ? <Layer cam={cam} d={0.7}>{[0, 1].map((i) => { const per = 17 + i * 6, lt = (t + i * 8) % per; if (lt > 1.3) return null; const k = lt / 1.3, x = 200 + i * 1200 + k * 420, y = 760 - Math.sin(k * Math.PI) * 120;
          return <g key={`ff${i}`} transform={`translate(${x} ${y}) rotate(${(k - 0.5) * 50})`}><ellipse cx={0} cy={0} rx={18} ry={5} fill="#7fb3c4" /><path d="M-4 -2 L-14 -16 L6 -3 Z" fill="#a9d4e0" /><path d="M-18 0 L-28 -7 L-28 7 Z" fill="#7fb3c4" /></g>; })}</Layer> : null}
      <Layer cam={cam} d={0.7}><MidSea t={t} pal={pal} amp={1 + sh + sw * 5} calm /></Layer>
      <Layer cam={cam} d={1}>
        {plan.debris !== undefined && t >= plan.debris ? <Debris2D t={t} pal={pal} /> : null}
        {fl.pallet !== undefined && t < fl.pallet && !onPallet ? <g transform={`translate(${1760 + Math.sin(t * 0.3) * 8} ${886 + Math.sin(t * 1.3) * 5}) rotate(${Math.sin(t) * 2})`}><Pallet /></g> : null}
        {fl.crate !== undefined && t < fl.crate ? <g transform={`translate(${2060 + Math.sin(t * 0.35) * 8} ${902 + Math.sin(t * 1.1 + 1) * 5}) rotate(${Math.sin(t * 0.8) * 4})`}><Crate /></g> : null}
        {fl.beam !== undefined && t < fl.beam ? <g transform={`translate(${2380 + Math.sin(t * 0.25) * 10} ${888 + Math.sin(t * 1.2 + 2) * 4}) rotate(${-3 + Math.sin(t * 0.7) * 2})`}><Beam /></g> : null}
        {onPallet ? <g transform={`translate(${palletX} ${893 + pBob}) rotate(${Math.sin(t * 1.2) * 2})`}>
          <Pallet />
          <ellipse cx={0} cy={-11} rx={40} ry={6} fill="#00000038" />
          <StandChar who="teo" f={f} x={0} y={-10} scale={SC} seed={3} style={style} sway={Math.sin(t * 1.2) * 2} {...T.teo} />
        </g> : null}
        {TIDE ? <g opacity={0.3}>{Array.from({ length: 6 }, (_, i) => <rect key={i} x={RAFT.x - 250 + Math.sin(t * 1.5 + i) * 8} y={RAFT.y + 46 + i * 9} width={500 - i * 40} height={4} rx={2} fill={INK} />)}</g> : null}
        <g transform={`translate(${RAFT.x} ${RAFT.y + bob}) rotate(${rock})`}>
          {has("beam") ? <g transform="translate(60 -22)"><Beam len={760} /></g> : null}
          {has("pallet") ? <g transform="translate(-392 -12)"><Pallet /></g> : null}
          {has("planks") ? <><g transform="translate(-575 -6)"><rect x={-70} y={0} width={140} height={20} rx={3} fill="#9c6a3b" /><rect x={-70} y={0} width={140} height={6} fill="#b9864f" /></g>
            <g transform="translate(700 -2)"><rect x={-80} y={0} width={160} height={20} rx={3} fill="#93633a" /><rect x={-80} y={0} width={160} height={6} fill="#b48252" /></g></> : null}
          {two ? (
            <g transform="translate(408 2)">
              <Door2D />
              {/* the knot: rope lashing between the raft and the door */}
              <path d="M-152 -14 L-108 -14 L-110 20 L-150 20 Z" fill="#d8bf8a" />
              {[-10, 0, 10].map((y) => <path key={y} d={`M-152 ${y} L-110 ${y + 5}`} stroke="#ad9361" strokeWidth={3} />)}
              <circle cx={-131} cy={-16} r={9} fill="#cdb27a" />
            </g>
          ) : null}
          {has("crate") ? <g transform="translate(470 -14)"><Crate /></g> : null}
          {V2 ? <Raft2DV2 waterline={pal.near} /> : <><ellipse cx={0} cy={50} rx={270} ry={16} fill="#155a80" opacity={0.6} /><Raft2D /></>}
          {(plan.knots ?? []).filter((k) => t >= k).map((k, i) => <g key={k} transform={`translate(${282 + i * 26} ${2 + (i % 2) * 6})`}><circle r={11} fill="#cdb27a" /><path d="M-8 -3 Q0 6 8 -3" stroke="#9c8150" strokeWidth={3} fill="none" /></g>)}
          {plan.tarp && t >= plan.tarp.from && t < (plan.tarp.until ?? 1e9) ? (() => { const lv = clamp01((t - plan.tarp!.fill[0]) / (plan.tarp!.fill[1] - plan.tarp!.fill[0])), o = clamp01((t - plan.tarp!.from) / 0.5);
            return <g opacity={o}>
              <path d="M10 -16 Q120 40 236 -16 L246 -40 Q120 -6 0 -40 Z" fill="#3f86b6" />
              <path d={`M${30 + (1 - lv) * 60} -16 Q120 ${-16 + 40 - lv * 24} ${216 - (1 - lv) * 60} -16 Z`} fill="#8fd3ea" opacity={lv > 0.02 ? 0.9 : 0} />
              <path d="M0 -40 Q120 -6 246 -40" stroke="#5aa3cf" strokeWidth={6} fill="none" />
              <circle cx={4} cy={-38} r={6} fill="#d8bf8a" /><circle cx={242} cy={-38} r={6} fill="#d8bf8a" />
            </g>; })() : null}
          {plan.bottles && t >= plan.bottles.from && t < (plan.bottles.until ?? 1e9) ? (() => { const lv = clamp01((t - plan.bottles!.fill[0]) / (plan.bottles!.fill[1] - plan.bottles!.fill[0]));
            return [-236, -214, -192].map((x, i) => { const l = clamp01(lv * 3 - i); return <g key={x} transform={`translate(${x} -16)`}>
              <rect x={-8} y={-38} width={16} height={38} rx={6} fill="#cfe9ef" opacity={0.85} /><rect x={-4} y={-50} width={8} height={13} rx={2} fill="#cfe9ef" opacity={0.85} /><rect x={-5} y={-54} width={10} height={6} rx={2} fill="#3d7fa8" />
              <rect x={-7} y={-2 - 34 * l} width={14} height={34 * l + 1} rx={5} fill="#6fbcd9" /></g>; }); })() : null}
          {plan.deck2 === true || (typeof plan.deck2 === "number" && t >= plan.deck2) ? <g>
            {/* Part 2: the two-storey raft, everything on it */}
            <rect x={-680} y={-4} width={1560} height={34} rx={5} fill="#7e5230" /><rect x={-680} y={-4} width={1560} height={10} fill="#a8743f" />
            {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${-680 + i * 120} -4 L${-680 + i * 120} 30`} stroke="#5f3c22" strokeWidth={3} />)}
            {[-560, -330, 330, 760].map((x) => <g key={x}><rect x={x - 11} y={-360} width={22} height={360} fill="#8a5a33" /><rect x={x - 11} y={-360} width={7} height={360} fill="#a97444" />
              {[-60, -200, -330].map((y) => <path key={y} d={`M${x - 13} ${y} L${x + 13} ${y + 10} M${x - 13} ${y + 10} L${x + 13} ${y + 20}`} stroke="#d8bf8a" strokeWidth={4} />)}</g>)}
            <path d="M-560 -40 L-330 -330 M-330 -40 L-560 -330" stroke="#6e4728" strokeWidth={9} opacity={0.8} />
            <rect x={-620} y={-372} width={1430} height={26} rx={4} fill="#8f5d33" /><rect x={-620} y={-372} width={1430} height={8} fill="#b9864f" />
            {/* railing */}
            {Array.from({ length: 12 }, (_, i) => <rect key={i} x={-610 + i * 128} y={-430} width={8} height={60} fill="#a4703f" />)}
            <rect x={-614} y={-436} width={1420} height={9} rx={4} fill="#b9864f" />
            {/* ladder */}
            <g>{[0, 1].map((k) => <rect key={k} x={-180 + k * 70} y={-372} width={10} height={372} fill="#9c6a3b" />)}{Array.from({ length: 7 }, (_, i) => <rect key={i} x={-176} y={-330 + i * 50} width={70} height={9} fill="#b9864f" />)}</g>
            {/* hut on the upper deck: walls of planks, tarp roof */}
            <rect x={60} y={-580} width={420} height={210} fill="#9a683a" />{Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${60 + i * 60} -580 L${60 + i * 60} -372`} stroke="#7a4f2b" strokeWidth={3} />)}
            <rect x={230} y={-520} width={80} height={150} rx={6} fill="#4a2f1b" /><rect x={110} y={-540} width={70} height={60} rx={4} fill="#cfe9ef" opacity={0.85} /><path d="M145 -540 L145 -480 M110 -510 L180 -510" stroke="#7a4f2b" strokeWidth={4} />
            <path d="M20 -575 L270 -680 L520 -575 Z" fill="#3f86b6" /><path d="M20 -575 L270 -680 L270 -664 L44 -568 Z" fill="#5aa3cf" />
            {/* mast and sail */}
            <rect x={660} y={-900} width={16} height={530} fill="#8a5a33" />
            <path d={`M676 -880 Q${790 + Math.sin(t * 1.4) * 14} -760 676 -560 Z`} fill="#f1e6cf" /><path d={`M676 -880 Q${760 + Math.sin(t * 1.4) * 10} -760 676 -560`} stroke="#d9c49a" strokeWidth={4} fill="none" />
            <path d={`M668 -900 L668 -940 L${712 + Math.sin(t * 3) * 6} -926 L668 -912`} fill={CORAL} />
            {/* water: rain catcher funnel + barrels + bottle row */}
            <path d="M-560 -470 L-380 -470 L-440 -400 L-500 -400 Z" fill="#3f86b6" /><rect x={-488} y={-400} width={36} height={30} fill="#5aa3cf" />
            {[-520, -430].map((x) => <g key={x}><rect x={x - 36} y={-90} width={72} height={86} rx={12} fill="#6c8f9c" /><rect x={x - 36} y={-70} width={72} height={8} fill="#4e6b76" /><rect x={x - 36} y={-30} width={72} height={8} fill="#4e6b76" /></g>)}
            {[-250, -232, -214, -196, -178].map((x, i) => <g key={x} transform={`translate(${x + 520} -372)`}><rect x={-7} y={-34} width={14} height={34} rx={5} fill="#cfe9ef" opacity={0.9} /><rect x={-6} y={-22 + (i % 2) * 6} width={12} height={20 - (i % 2) * 6} rx={4} fill="#6fbcd9" /><rect x={-4} y={-40} width={8} height={7} rx={2} fill="#3d7fa8" /></g>)}
            {/* drying fish on a line between posts */}
            <path d="M-330 -250 Q15 -215 330 -250" stroke="#d8bf8a" strokeWidth={3} fill="none" />
            {[-220, -110, 0, 110, 220].map((x, i) => <g key={x} transform={`translate(${x} ${-232 + Math.abs(x) * -0.06}) rotate(${80 + Math.sin(t * 2 + i) * 6})`}><path d="M0 0 Q14 -10 30 0 Q14 10 0 0 Z" fill="#c9d6dc" /><path d="M30 0 L42 -8 L40 0 L42 8 Z" fill="#9fb2bb" /></g>)}
            {/* crates, rope coil, fishing rod, plant pot */}
            <g transform="translate(560 -60)"><rect x={-50} y={-60} width={100} height={64} rx={4} fill="#b07b45" /><path d="M-50 -30 L50 -30 M-20 -60 L-20 4 M20 -60 L20 4" stroke="#8a5a33" strokeWidth={4} /></g>
            <g transform="translate(660 -40)">{[26, 18, 10].map((r, i) => <circle key={r} cx={0} cy={0} r={r} fill="none" stroke={i % 2 ? "#c9ad74" : "#dcc28c"} strokeWidth={7} />)}</g>
            <path d="M820 -10 L960 -260" stroke="#7a4f2b" strokeWidth={6} /><path d={`M960 -260 Q990 -100 ${975 + Math.sin(t) * 4} 60`} stroke="#e8e2d2" strokeWidth={2} fill="none" />
            <g transform="translate(-60 -372)"><path d="M-26 0 L-20 -36 L20 -36 L26 0 Z" fill="#b4472f" /><path d="M0 -36 Q-20 -70 -6 -86 M0 -36 Q16 -66 10 -90 M0 -36 Q0 -70 2 -96" stroke="#5d9b54" strokeWidth={6} fill="none" strokeLinecap="round" /></g>
          </g> : null}
          {on("teo") && !onPallet ? <><Shade x={teoX} tide={TIDE} rx={V2 ? 46 : 60} /><StandChar who="teo" f={f} x={teoX} y={-12} scale={SC} seed={3} style={style} sway={V2 ? rock : 0} shiver={shiv} wind={wnd} {...T.teo} /></> : null}
          {on("mara") && maraMode === "raft" ? <><Shade x={maraX} tide={TIDE} rx={40} />{mara(maraX, -12, rock)}</> : null}
          {plan.shade && t >= plan.shade[0] && t < plan.shade[1] ? <g opacity={clamp01((t - plan.shade[0]) / 0.5)}>
            <ellipse cx={15} cy={-8} rx={240} ry={10} fill={INK} opacity={0.18} />
            {[-215, 245].map((x) => <rect key={x} x={x - 4} y={-282} width={8} height={270} rx={3} fill="#8a5a2e" />)}
            <path d={`M-236 -282 Q10 ${-262 + Math.sin(t * (2 + wnd * 9)) * (4 + wnd * 22)} 266 -282 L262 -268 Q10 ${-248 + Math.sin(t * (2 + wnd * 9)) * (4 + wnd * 22)} -232 -268 Z`} fill="#3f86b6" />
            <path d={`M-236 -282 Q10 ${-262 + Math.sin(t * (2 + wnd * 9)) * (4 + wnd * 22)} 266 -282`} stroke="#5aa3cf" strokeWidth={5} fill="none" />
          </g> : null}
          {plan.deckFish && t >= plan.deckFish[0] && t < plan.deckFish[1] ? <g transform={`translate(${(teoX + maraX) / 2} -22) rotate(${Math.sin(t * 9) * 10 * clamp01(1 - (t - plan.deckFish[0]) / 4)})`}>
            <path d="M-34 0 Q-6 -16 22 0 Q-6 16 -34 0 Z" fill="#c9d6dc" /><path d="M-30 0 L18 0" stroke="#eef4f5" strokeWidth={3} /><path d="M20 0 L40 -12 L36 0 L40 12 Z" fill="#9fb2bb" /><circle cx={-24} cy={-3} r={3} fill={INK} /></g> : null}
          {(plan.items ?? []).filter((it) => plan.deckItems !== undefined && it.at === plan.deckItems && t >= it.at && t < it.until + 0.4).map((it) => it.icons.filter(([at]) => t >= at).map(([at, kk], q) => { const e = EASE.out(clamp01((t - at) / 0.4)), x = maraX - 150 + q * 52;
            return <g key={kk} transform={`translate(${x} ${-14 - (1 - e) * 20})`} opacity={e}>
              {kk === "tarp" ? <><rect x={-24} y={-14} width={48} height={14} rx={3} fill="#3f86b6" /><rect x={-24} y={-14} width={48} height={4} fill="#5aa3cf" /></> : null}
              {kk === "rope" ? [14, 9, 4].map((r, j) => <ellipse key={j} cx={0} cy={-6} rx={r * 1.6} ry={r * 0.6} fill="none" stroke={j % 2 ? "#c9ad74" : "#dcc28c"} strokeWidth={5} />) : null}
              {kk === "knife" ? <g transform="rotate(-8)"><rect x={-4} y={-6} width={22} height={6} rx={2} fill="#7a4a26" /><path d="M-4 -6 L-30 -4 L-4 0 Z" fill="#c9d2d8" /></g> : null}
              {kk === "bottles" ? [-12, 0, 12].map((bx) => <g key={bx}><rect x={bx - 5} y={-30} width={10} height={30} rx={4} fill="#cfe9ef" opacity={0.9} /><rect x={bx - 3} y={-35} width={6} height={6} rx={1} fill="#3d7fa8" /></g>) : null}
            </g>; }))}
          {wet ? [teoX - 10, teoX + 14, maraX - 12, maraX + 10, -230, -120, 40, 190].map((x, i) => { const per = 1.1 + (i % 3) * 0.37, ph = ((t + i * 0.53) % per) / per, top = i < 4 ? -250 : 6;
            return <circle key={`dr${i}`} cx={x} cy={top + ph * (i < 4 ? 230 : 60)} r={3.2} fill="#cfe9ef" opacity={0.8 * (1 - ph)} />; }) : null}
          {plan.waistRope && t >= plan.waistRope[0] && t < plan.waistRope[1] && on("mara") ? <path d={`M${teoX + 8} -88 Q${(teoX + maraX) / 2} ${-40 + Math.sin(t * 2) * 8} ${maraX - 8} -88`} stroke="#d8bf8a" strokeWidth={6} fill="none" strokeLinecap="round" /> : null}
          {plan.shade && plan.shadeFly && t >= plan.shade[1] && t < plan.shade[1] + 1.6 ? (() => { const k = EASE.out((t - plan.shade![1]) / 1.6);
            return <g transform={`translate(${-k * 1100} ${-k * 520}) rotate(${-k * 70} 15 -275)`} opacity={1 - k * 0.6}><path d="M-236 -282 Q10 -240 266 -282 L262 -262 Q10 -226 -232 -262 Z" fill="#3f86b6" /></g>; })() : null}
          {plan.line && t >= plan.line.from && t < plan.line.until ? (() => { const L = plan.line!, hx = teoX + 92, hy = -112, wx = teoX + 230, tight = L.tight !== undefined && t >= L.tight;
            return <path d={tight ? `M${hx} ${hy} L${wx + 10 + Math.sin(t * 38) * 3} 60` : `M${hx} ${hy} Q${hx + 90} ${hy + 40} ${wx} 30 L${wx + 4} 60`} stroke="#e8e2d0" strokeWidth={2.5} fill="none" opacity={0.9} />; })() : null}
        </g>
        {showDoor ? (
          <g transform={`translate(${doorX} ${DOOR.y + dBob}) rotate(${dRock})`}>
            {on("mara") && maraMode === "water" ? mara(-178, 300, 0) : null}
            <ellipse cx={0} cy={34} rx={170} ry={12} fill="#155a80" opacity={0.6} /><Door2D />
            {on("maraHand") || (on("mara") && maraMode === "water") ? (
              <g transform={`translate(-150 ${V2 ? 4 : -6}) rotate(${Math.sin(t * 2) * 3}) scale(${V2 ? "0.68 0.9" : "1"})`}>
                {/* Mara's hand gripping the door edge from the water */}
                <path d="M-46 40 C-40 10 -30 -2 -14 -6 L8 -10 C20 -12 26 -2 18 6 L4 10 C-6 22 -10 40 -12 60 Z" fill="#efbd94" />
                {[-6, 4, 14].map((x, i) => <path key={i} d={`M${x} -9 q4 -10 10 -2`} stroke="#d99b73" strokeWidth={3} fill="none" strokeLinecap="round" />)}
                <path d="M-60 52 q40 -14 80 0" stroke={pal.nearLine} strokeWidth={6} fill="none" opacity={0.8} />
              </g>
            ) : null}
            {on("mara") && maraMode === "door" ? <><ellipse cx={0} cy={-10} rx={50} ry={7} fill="#00000030" />{mara(0, -10, dRock)}</> : null}
          </g>
        ) : null}
        {plan.rope && t >= plan.rope[0] && t < plan.rope[1] ? (() => { const ax = RAFT.x + maraX + (maraRight ? 62 : -62), ay = RAFT.y + bob - 205, bx = onPallet ? palletX : RAFT.x + teoX, by = onPallet ? 893 + pBob - 175 : RAFT.y - 175;
          const sag = plan.ropeSag ? 15 + 75 * (0.5 + 0.5 * Math.sin(t * 1.05)) : 70;
          return <path d={`M${ax} ${ay} Q${(ax + bx) / 2} ${Math.max(ay, by) + sag} ${bx} ${by}`} stroke="#d8bf8a" strokeWidth={5} fill="none" strokeLinecap="round" />; })() : null}
        {lost && t < plan.partsLost! + 14 ? (() => { const k = t - plan.partsLost!, o = clamp01(1 - k / 12);
          return <g opacity={o}>
            <g transform={`translate(${RAFT.x - 420 - k * 70} ${RAFT.y + 10 + Math.sin(t * 0.9) * 40}) rotate(${-k * 9})`}><Pallet /></g>
            <g transform={`translate(${RAFT.x + 560 + k * 85} ${RAFT.y + 6 + Math.sin(t * 0.8 + 1) * 40}) rotate(${k * 14})`}><Crate /></g>
            <g transform={`translate(${RAFT.x + 120 + k * 55} ${RAFT.y + 40 + k * 8 + Math.sin(t * 0.7 + 2) * 30}) rotate(${-4 + k * 6})`}><Beam len={760} /></g>
          </g>; })() : null}
        <NearSea t={t} pal={pal} amp={1 + sh * 1.5 + sw * 7} y={905} calm />
      </Layer>
      <Layer cam={cam} d={1.12}><NearSea t={t + 3} pal={pal} amp={1 + sh} y={1015} calm dark={0.12} /></Layer>
      {plan.anchorLine && t >= plan.anchorLine.from && t < (plan.anchorLine.until ?? 1e9) ? (() => { const A = plan.anchorLine!, tk = EASE.inOut(clamp01((t - A.tight) / 0.6)), ox = doorX + 170, oy = RAFT.y + 6, ex = ox + 260 + tk * 120, ey = 1090 + tk * 40;
        const sag = (1 - tk) * 80, wob = Math.sin(t * 1.4) * 6;
        return <Layer cam={cam} d={1}><path d={`M${ox} ${oy} Q${(ox + ex) / 2} ${(oy + ey) / 2 + sag} ${ex} ${ey + wob}`} stroke="#e1cf9f" strokeWidth={5} fill="none" />
          <g transform={`translate(${ex} ${ey + wob}) rotate(${-60 + tk * 10})`} opacity={0.9}><path d={`M0 0 L-28 ${60 + tk * 10} Q0 ${80 + tk * 30} 28 ${60 + tk * 10} Z`} fill="#3f86b6" /><path d={`M-28 ${60 + tk * 10} Q0 ${80 + tk * 30} 28 ${60 + tk * 10}`} stroke="#5aa3cf" strokeWidth={5} fill="none" /></g></Layer>; })() : null}
      {(plan.whale ?? []).filter((w) => t >= w.from && t < w.to).map((w, i) => { const k = EASE.inOut(clamp01((t - w.from) / (w.to - w.from))), x = w.x[0] + (w.x[1] - w.x[0]) * k, y = w.y[0] + (w.y[1] - w.y[0]) * k, sc = w.s ? w.s[0] + (w.s[1] - w.s[0]) * k : 0.6, dir = w.dir ?? 1;
        const fade = Math.min(1, (t - w.from) / 0.8, (w.to - t) / 0.8), depth = clamp01((y - 1000) / 600);
        return <Layer key={`wh${i}`} cam={cam} d={1}>
          {y < 1250 ? <ellipse cx={x} cy={918} rx={520 * sc * 1.4} ry={34} fill="#9fe0c4" opacity={0.35 * fade * (1 - clamp01((y - 1000) / 250))} /> : null}
          <g opacity={fade * (0.95 - depth * 0.55)} transform={`translate(${x} ${y + Math.sin(t * 0.9) * 8}) scale(${dir * sc} ${sc})`}><WhaleShark t={t} open={w.open} /></g>
        </Layer>; })}
      {(plan.shadows ?? []).filter((sd) => t >= sd.from && t < sd.to).map((sd, i) => { const k = (t - sd.from) / (sd.to - sd.from), x = sd.dir > 0 ? -1400 + k * 4200 : 2800 - k * 4200, deep = cam.cy >= 880;
        return <Layer key={`sd${i}`} cam={cam} d={1}><g opacity={(deep ? 0.55 : 0.32) * Math.min(1, k * 6, (1 - k) * 6)}>
          <g transform={`translate(${x} 1090) scale(${sd.dir} 0.62)`}>
            <path d={`M900 0 Q860 -70 600 -95 Q100 -115 -500 -48 Q-700 -24 -760 -10 L-930 ${-120 + Math.sin(t * 2.4) * 25} Q-870 -20 -875 0 Q-870 20 -930 ${120 + Math.sin(t * 2.4) * 25} L-760 10 Q-700 24 -500 48 Q100 115 600 95 Q860 70 900 0 Z`} fill={INK} />
            <path d="M320 -80 L110 -230 L40 -90 Z M320 80 L110 230 L40 90 Z" fill={INK} />
          </g></g>
          {(() => { const fx = x + sd.dir * 120, wy = 912 + Math.sin(fx / 280 + t * 0.8) * 6, o = Math.min(1, k * 8, (1 - k) * 8);
            return <g opacity={o}>
              <path d={`M${fx - sd.dir * 70} ${wy + 6} Q${fx - sd.dir * 40} ${wy - 40} ${fx + sd.dir * 6} ${wy - 92} Q${fx + sd.dir * 16} ${wy - 40} ${fx + sd.dir * 52} ${wy + 6} Z`} fill="#34454f" />
              <path d={`M${fx - sd.dir * 66} ${wy + 4} Q${fx - sd.dir * 38} ${wy - 36} ${fx + sd.dir * 2} ${wy - 84}`} stroke="#5a6d78" strokeWidth={4} fill="none" />
              <path d={`M${fx - sd.dir * 160} ${wy + 8} q${sd.dir * 40} -8 ${sd.dir * 80} -2 M${fx + sd.dir * 40} ${wy + 6} q${sd.dir * 30} -10 ${sd.dir * 64} 0`} stroke="#f4ead7" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.8} />
            </g>; })()}</Layer>; })}
      {cam.cy >= 880 && (plan.fish || plan.line) ? <Layer cam={cam} d={1}>
        <ellipse cx={RAFT.x} cy={985} rx={520} ry={60} fill={INK} opacity={0.22} />
        {Array.from({ length: Math.round(trackX(plan.fish, t, 0)) }, (_, i) => { const bx = RAFT.x - 380 + ((i * 137) % 760), by = 975 + ((i * 53) % 150), sw = Math.sin(t * (0.6 + (i % 5) * 0.1) + i) * 30, dir = Math.cos(t * (0.6 + (i % 5) * 0.1) + i) > 0 ? 1 : -1, s = 0.7 + (i % 4) * 0.12;
          return <g key={i} transform={`translate(${bx + sw} ${by + Math.sin(t * 1.3 + i) * 5}) scale(${dir * s} ${s})`}><path d="M-22 0 Q-4 -9 14 0 Q-4 9 -22 0 Z" fill="#c9d6dc" opacity={0.92} /><path d="M12 0 L24 -8 L22 0 L24 8 Z" fill="#9fb2bb" /><path d="M-18 -1 L10 -1" stroke="#eef4f5" strokeWidth={2} /></g>; })}
        {plan.line && t >= plan.line.from && t < plan.line.until ? (() => { const L = plan.line!, wx = RAFT.x + trackX(plan.place?.teo, t, 0) + 234, slipped = L.slip !== undefined && t >= L.slip && t < L.slip + 0.6, tight = L.tight !== undefined && t >= L.tight, hy = 1120 + (slipped ? -40 * Math.sin((t - L.slip!) * 5) : 0) + (tight ? Math.sin(t * 14) * 6 : Math.sin(t * 1.5) * 4);
          return <g><path d={`M${wx} 920 L${wx + (tight ? 30 : 0)} ${hy}`} stroke="#e8e2d0" strokeWidth={2} opacity={0.75} />
            <path d={`M${wx + (tight ? 30 : 0)} ${hy} q0 18 -12 16 q-8 -2 -6 -10`} stroke="#aab4bb" strokeWidth={3} fill="none" />
            <path d={`M${wx + (tight ? 30 : 0) - 4} ${hy + 4} l-10 14 l10 -4 l8 12 z`} fill="#e0785a" />
            {tight ? <g transform={`translate(${wx + 30} ${hy + 22}) rotate(${70 + Math.sin(t * 16) * 18})`}><path d="M-22 0 Q-4 -10 16 0 Q-4 10 -22 0 Z" fill="#c9d6dc" /><path d="M14 0 L28 -9 L25 0 L28 9 Z" fill="#9fb2bb" /></g> : null}</g>; })() : null}
      </Layer> : null}
      {(plan.bubbles ?? []).map((bb, i) => {
        const k = clamp01((t - bb.at) / 0.3) * clamp01((bb.at + bb.dur - t) / 0.3); if (k <= 0) return null;
        let bn: string = "stand"; for (const [bf, b] of T[bb.who].body) if (f >= bf) bn = b;
        const head = bn === "sit" ? -265 : bn === "lie" ? -110 : bn === "kneel" ? -330 : -420;
        let wx: number, wy: number;
        if (bb.who === "teo") { wx = onPallet ? palletX : RAFT.x + teoX; wy = (onPallet ? 893 + pBob : RAFT.y + bob) + head; }
        else if (maraMode === "raft") { wx = RAFT.x + maraX; wy = RAFT.y + bob + head; }
        else { wx = doorX; wy = DOOR.y + dBob + head; }
        const hx = (wx - cam.cx) * cam.z + 960, hy = (wy - cam.cy) * cam.z + 540;
        const fs = 38, w = bb.text.length * fs * 0.5 + 60, h = fs + 36, e = EASE.out(k);
        // above the head when there is room, otherwise beside it (Teo: left side, Mara: right side)
        const above = hy - 30 - h > 20;
        const side = bb.who === "teo" ? -1 : 1, faceY = hy + 55 * cam.z;
        let bx = above ? hx : hx + side * (w / 2 + 70 * Math.sqrt(cam.z)), by = above ? hy - 30 - h / 2 : faceY;
        if (!above && (bx - w / 2 < 20 || bx + w / 2 > 1900)) bx = hx - side * (w / 2 + 70 * Math.sqrt(cam.z));
        bx = Math.max(w / 2 + 20, Math.min(1900 - w / 2, bx)); by = Math.max(h / 2 + 20, Math.min(1060 - h / 2, by));
        const toward = above ? `M${bx - 18} ${by + h / 2 - 2} L${bx + 18} ${by + h / 2 - 2} L${hx + (bx - hx) * 0.4} ${by + h / 2 + 30}`
          : (() => { const ex = hx > bx ? bx + w / 2 - 4 : bx - w / 2 + 4, dir = hx > bx ? 1 : -1; return `M${ex} ${by - 14} L${ex} ${by + 14} L${ex + dir * 40} ${by + 6}`; })();
        return <g key={`bb${i}`} opacity={k} transform={`translate(0 ${(1 - e) * 10})`}>
          <rect x={bx - w / 2} y={by - h / 2 + 6} width={w} height={h} rx={h / 2} fill={INK} opacity={0.25} />
          <path d={toward} fill={PAPER} />
          <rect x={bx - w / 2} y={by - h / 2} width={w} height={h} rx={h / 2} fill={PAPER} />
          <text x={bx} y={by + fs * 0.34} textAnchor="middle" fontFamily={SERIF} fontSize={fs} fill={INK}>{bb.text}</text>
        </g>; })}
      {rain > 0.05 ? <Layer cam={cam} d={1}>{Array.from({ length: 22 }, (_, i) => { const per = 0.9 + (i % 4) * 0.2, ph = ((t * 1.3 + i * 0.41) % per) / per, x = RAFT.x - 900 + ((i * 263) % 1900), y = 925 + ((i * 47) % 140);
          return <ellipse key={`rr${i}`} cx={x} cy={y} rx={4 + ph * 26} ry={1.5 + ph * 6} fill="none" stroke="#e6f2f4" strokeWidth={2} opacity={rain * 0.6 * (1 - ph)} />; })}</Layer> : null}
      {rain > 0 ? <g opacity={Math.min(1, rain)}>
        <rect x={0} y={0} width={1920} height={1080} fill="#1d2b36" opacity={0.18 * rain} />
        {Array.from({ length: Math.round(60 + 160 * rain) }, (_, i) => { const sp = 1400, x0 = (i * 397) % 2300 - 200, y0 = ((i * 211) % 1200), y = (y0 + t * sp) % 1200 - 60, x = x0 - (y * 0.18);
          return <path key={i} d={`M${x} ${y} l${-7} ${38}`} stroke="#dbe8ef" strokeWidth={2.2} opacity={0.55} strokeLinecap="round" />; })}
      </g> : null}
    </svg>
  );
};

const Subtitles: React.FC<{ captions: Caption[]; ms: number }> = ({ captions, ms }) => {
  const { pages } = React.useMemo(() => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 1400 }), [captions]);
  const page = pages.find((p) => ms >= p.startMs && ms < p.startMs + p.durationMs);
  if (!page) return null;
  const pin = clamp01((ms - page.startMs) / 120);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
      <div style={{ maxWidth: 1500, textAlign: "center", fontFamily: "'Arial Black', Arial", fontSize: 60, lineHeight: 1.15, color: "#fff",
        WebkitTextStroke: "10px #10161a", paintOrder: "stroke fill", opacity: pin, transform: `translateY(${(1 - pin) * 14}px)` }}>
        {page.tokens.map((tk, i) => <span key={i} style={{ color: ms >= tk.fromMs && ms < tk.toMs ? "#ffd84a" : "#fff" }}>{tk.text}</span>)}
      </div>
    </AbsoluteFill>
  );
};

/** 0..1 how much speech is around this moment (smooth ducking, ±300 ms window) */
const speakAmt = (caps: Caption[], ms: number) => {
  let n = 0;
  for (let d = -300; d <= 300; d += 100) if (caps.some((c) => ms + d >= c.startMs - 100 && ms + d <= c.endMs + 150)) n++;
  return n / 7;
};

/** inventory icons (flat, no outline, matching the characters) */
const Icon: React.FC<{ k: "tarp" | "rope" | "knife" | "bottles" | "fish" | "hook" }> = ({ k }) => (
  <svg viewBox="-60 -60 120 120" width={120} height={120}>
    {k === "tarp" ? <><path d="M-48 -26 L44 -34 L50 28 L-44 34 Z" fill="#3f86b6" /><path d="M-48 -26 L44 -34 L40 -16 L-46 -8 Z" fill="#5aa3cf" /><path d="M-10 -30 L-6 32" stroke="#2c6a93" strokeWidth={3} /></> : null}
    {k === "rope" ? <>{[34, 24, 14].map((r, i) => <circle key={i} cx={0} cy={4} r={r} fill="none" stroke={i % 2 ? "#c9ad74" : "#dcc28c"} strokeWidth={9} />)}<path d="M30 20 q16 10 22 30" stroke="#dcc28c" strokeWidth={8} fill="none" strokeLinecap="round" /></> : null}
    {k === "knife" ? <g transform="rotate(-35)"><path d="M-6 -50 Q14 -30 8 10 L-8 10 Z" fill="#c9d2d8" /><path d="M-6 -50 Q2 -30 0 10 L-8 10 Z" fill="#aab4bb" /><rect x={-10} y={8} width={20} height={44} rx={6} fill="#7a4a26" /><circle cx={0} cy={22} r={3} fill="#d6b06a" /><circle cx={0} cy={38} r={3} fill="#d6b06a" /></g> : null}
    {k === "fish" ? <g><path d="M-44 0 Q-10 -30 30 0 Q-10 30 -44 0 Z" fill="#c9d6dc" /><path d="M-40 0 Q-10 -12 26 0" stroke="#e9f0f2" strokeWidth={5} fill="none" /><path d="M28 0 L52 -18 L48 0 L52 18 Z" fill="#9fb2bb" /><circle cx={-28} cy={-4} r={4} fill="#1b2a33" /></g> : null}
    {k === "hook" ? <path d="M6 -46 L6 18 Q6 44 -16 40 Q-34 36 -30 16 L-24 22" stroke="#8b979e" strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
    {k === "bottles" ? <>{[-32, 0, 32].map((x) => <g key={x} transform={`translate(${x} 0)`}><rect x={-11} y={-14} width={22} height={52} rx={8} fill="#cfe9ef" opacity={0.85} /><rect x={-6} y={-30} width={12} height={18} rx={3} fill="#cfe9ef" opacity={0.85} /><rect x={-7} y={-36} width={14} height={8} rx={2} fill="#3d7fa8" /><path d={`M-6 -6 L-6 30`} stroke="#ffffff" strokeWidth={3} opacity={0.7} /></g>)}</> : null}
  </svg>
);
/** whale shark, flat side view facing +x, ~1400 long at scale 1 (Part 2) */
const WhaleShark: React.FC<{ t: number; open?: number }> = ({ t, open = 0 }) => {
  const tail = Math.sin(t * 1.6) * 40, mo = 10 + open * 26;
  const spots: [number, number, number][] = []; for (let i = 0; i < 46; i++) { const x = -560 + ((i * 97) % 1150), y = -120 + ((i * 53) % 150); if (Math.abs(y + 40) < 120 - Math.abs(x) * 0.05) spots.push([x, y, 6 + (i % 3) * 3]); }
  return <g>
    <path d={`M-640 -20 L-860 ${-200 + tail} Q-800 -20 -830 0 Q-800 40 -880 ${150 + tail} L-640 30 Z`} fill="#34505f" />
    <path d="M-120 -150 Q-40 -300 60 -150 Z" fill="#34505f" />
    <path d="M700 10 Q690 -110 560 -150 Q200 -190 -300 -120 Q-560 -70 -660 -10 Q-560 60 -300 90 Q200 130 560 110 Q690 90 700 10 Z" fill="#3e6072" />
    <path d={`M700 ${10 + mo / 2} Q560 120 200 128 Q-200 120 -560 52 Q-200 70 200 84 Q520 80 690 ${14 + mo / 2} Z`} fill="#b7cfd6" />
    <path d={`M704 -2 Q690 ${8 + mo} 640 ${10 + mo} L640 ${12 - mo / 3}`} fill="#1d2f38" />
    <path d={`M708 -4 Q706 8 650 ${10 + mo} M708 -4 Q650 2 600 -2`} stroke="#1d2f38" strokeWidth={5} fill="none" />
    {[-1, 0, 1].map((k) => <path key={k} d={`M${-500} ${-40 + k * 40} Q100 ${-70 + k * 44} 600 ${-60 + k * 40}`} stroke="#5b7f90" strokeWidth={5} fill="none" opacity={0.6} />)}
    {[0, 1, 2, 3, 4].map((k) => <path key={k} d={`M${470 - k * 26} -110 q-10 60 0 120`} stroke="#2c4552" strokeWidth={4} fill="none" />)}
    {spots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#eef4f5" opacity={0.85} />)}
    <path d="M200 70 Q160 190 40 210 Q120 120 120 70 Z" fill="#34505f" />
    <circle cx={610} cy={-46} r={10} fill="#0f1a20" /><circle cx={613} cy={-49} r={3} fill="#ffffff" />
  </g>;
};
const NAMES = { tarp: "TARP", rope: "ROPE", knife: "KNIFE", bottles: "3 BOTTLES", fish: "1 FISH", hook: "HOOK" } as const;
export const Episode: React.FC<EpisodeProps> = ({ id, plan, captions = [], duration = 10, subtitles = false, noSfx = false }) => {
  // plan.trimStart (s): skip the start of the episode (e.g. a recap) without re-timing voice or plan
  const TR = Math.round((plan?.trimStart ?? 0) * FPS), f = useCurrentFrame() + TR;
  if (!plan) return <AbsoluteFill style={{ background: "#000" }} />;
  const T = React.useMemo(() => ({ teo: tracks(plan, "teo"), mara: tracks(plan, "mara") }), [plan]);
  const WORDS = React.useMemo(() => spokenWords(captions), [captions]);
  const t = f / FPS, ms = t * 1000, end = duration * FPS;
  const idx = Math.max(0, plan.shots.findIndex((s, i) => t >= s.start && (i === plan.shots.length - 1 || t < plan.shots[i + 1].start)));
  const shot = plan.shots[idx], next = plan.shots[idx + 1];
  const s0 = shot.start * FPS, s1 = next ? next.start * FPS : end;
  const CALM = plan.camera === "calm";
  /** calm camera: no lateral move, zoom change clamped to ±5 % over the whole shot, smooth ease in/out */
  const calmPair = (s: Shot): [Cam, Cam] => {
    const [A, B] = s.cam ?? CAMS[s.camera] ?? CAMS["wide-static"];
    return [A, { cx: A.cx, cy: A.cy, z: Math.max(A.z * 0.95, Math.min(A.z * 1.05, B.z)) }];
  };
  const camFor = (s: Shot, a: number, b: number, fr: number) => {
    if (CALM) { const [A, B] = calmPair(s); return mixCam(A, B, EASE.inOut(clamp01((fr - a) / (b - a)))); }
    const [A, B] = s.cam ?? CAMS[s.camera] ?? CAMS["wide-static"];
    const k = s.transition === "punch" ? EASE.out(clamp01((fr - a) / 14)) * 0.6 + EASE.inOut(clamp01((fr - a) / (b - a))) * 0.4 : EASE.inOut(clamp01((fr - a) / (b - a)));
    return mixCam(A, B, k);
  };
  let c = camFor(shot, s0, s1, f);
  if (!CALM && shot.transition === "whip" && plan.shots[idx - 1]) { // fast swing from where the last shot ended
    const p0 = plan.shots[idx - 1], from = camFor(p0, p0.start * FPS, s0, s0), k = EASE.inOut(clamp01((f - s0) / 9));
    c = mixCam(from, c, k);
  }
  const ct = plan.cast?.teo ?? 0, teoOn = Array.isArray(ct) ? t >= ct[0] && t < ct[1] : t >= ct;
  if (CALM && teoOn && shot.subject !== "other") {
    // safe framing: keep Teo's face inside the frame (never crop it during a shot)
    // seated Teo's face is ~142 px lower (QC fix: the standing value pushed every seated close-up upward)
    const tb = T.teo.body.filter(([bf]) => bf <= f).pop()?.[1] ?? "stand", seat = tb === "sit" ? 142 : 0;
    const faceY = RAFT.y - 12 - SC * 770 + seat, faceX = RAFT.x + trackX(plan.place?.teo, t, 0) + 25, m = 150;
    const sy = 540 + (faceY - c.cy) * c.z, sx = 960 + (faceX - c.cx) * c.z;
    if (sy < m) c = { ...c, cy: faceY - (m - 540) / c.z };
    if (sx < m) c = { ...c, cx: faceX - (m - 960) / c.z }; else if (sx > 1920 - m) c = { ...c, cx: faceX - (1920 - m - 960) / c.z };
  }
  const shk = CALM ? 0 : shakeAt(plan, t) * 22 / Math.max(1, c.z * 0.6);
  const hh = CALM ? 0 : 1; // no handheld drift in calm mode
  const cam: Cam = { cx: c.cx + (Math.sin(f * 0.21) * 2.5 + Math.sin(f * 0.53)) * hh + Math.sin(f * 1.7) * shk, cy: c.cy + Math.cos(f * 0.17) * 1.8 * hh + Math.cos(f * 2.3) * shk * 0.7, z: c.z };
  // transitions into the current shot
  // calm mode allows only "fade" (20-frame crossfade) and "dip" (fade through dark, for day/chapter jumps)
  const inK = clamp01((f - s0) / (CALM ? 20 : 10));
  const prev = plan.shots[idx - 1];
  const showPrev = prev && inK < 1 && (CALM ? shot.transition === "fade" : (shot.transition === "wipe" || shot.transition === "fade"));
  const DIP = 14; // frames down + frames up, dark is held ~0 frames at the cut
  const dip = (shot.transition === "dip" ? 1 - clamp01((f - s0) / DIP) : 0) + (next?.transition === "dip" ? clamp01((f - (s1 - DIP)) / DIP) : 0);
  const fadeBlack = (idx === 0 || TR > 0 ? 1 - clamp01((f - TR) / 12) : 0) + clamp01((f - (end - 18)) / 17) + EASE.inOut(clamp01(dip));
  // speaking -> duck ambience
  const speaking = captions.some((cp) => ms >= cp.startMs - 150 && ms <= cp.endMs + 250);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {showPrev ? <World f={f} cam={camFor(prev, prev.start * FPS, s0, s0)} plan={plan} T={T} /> : null}
      <AbsoluteFill style={showPrev ? (shot.transition === "wipe" ? { clipPath: `inset(0 0 0 ${(1 - EASE.inOut(inK)) * 100}%)` } : { opacity: inK }) : {}}>
        <World f={f} cam={cam} plan={plan} T={T} />
      </AbsoluteFill>
      {plan.grade === "tide" ? <>
        <AbsoluteFill style={{ background: "radial-gradient(circle at 78% 30%, #ffd99a55 0%, transparent 55%)", mixBlendMode: "soft-light", opacity: tideW(palAt(plan, t)) / 0.9 }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, #1b2a3366 100%)" }} />
        <AbsoluteFill><svg width={1920} height={1080}><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} /><feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.16  0 0 0 0 0.2  0 0 0 0.09 0" /></filter><rect width={1920} height={1080} filter="url(#grain)" /></svg></AbsoluteFill>
      </> : null}
      {(plan.titles ?? []).map((ti, i) => { const k = clamp01((t - ti.at) / 0.45) * clamp01((ti.at + ti.dur - t) / 0.45); if (k <= 0) return null; const e = EASE.out(k), u = EASE.out(clamp01((t - ti.at - 0.5) / 0.7));
        return <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at center, rgba(27,42,51,${0.45 * k}) 0%, rgba(27,42,51,${0.1 * k}) 70%)` }}>
          <div style={{ opacity: k, transform: `translateY(${(1 - e) * 16}px)`, textAlign: "center", background: PAPER, borderRadius: 22, padding: "34px 80px 28px", boxShadow: `0 10px 0 ${CINK}30, 0 24px 50px ${CINK}55`, color: CINK }}>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, letterSpacing: 10, opacity: 0.7 }}>A SURVIVAL STORY · PART {(((ti as { part?: number }).part) ?? 1)}</div>
            <div style={{ fontFamily: "Cambria, Georgia, serif", fontWeight: 700, fontSize: 104, letterSpacing: 4, color: TEAL, lineHeight: 1.1, marginTop: 6, whiteSpace: "nowrap" }}>{ti.text}</div>
            <svg width={420} height={20} style={{ display: "block", margin: "4px auto 0" }}><path d="M8 10 Q210 2 412 9" stroke={CORAL} strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - u} /></svg>
            {ti.sub ? <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 40, marginTop: 8, opacity: 0.85 }}>{ti.sub}</div> : null}
          </div>
        </AbsoluteFill>; })}
      {(plan.items ?? []).filter((it) => t >= it.at - 0.1 && t < it.until + 0.4).map((it, i) => { const out = clamp01((it.until + 0.4 - t) / 0.4); return (
        <div key={`it${i}`} style={{ position: "absolute", top: 60, right: 70, display: "flex", gap: 18, opacity: out }}>
          {it.icons.filter(([at]) => t >= at).map(([at, k]) => { const p = EASE.out(clamp01((t - at) / 0.35)); return (
            <div key={k} style={plan.grade === "tide" ? { background: PAPER, borderRadius: 16, padding: "10px 14px 10px", textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 10}px)`, boxShadow: `0 6px 0 ${CINK}30, 0 14px 30px ${CINK}40` } : { background: "rgba(12,30,42,0.55)", borderRadius: 22, padding: "10px 14px 8px", textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
              <Icon k={k} /><div style={plan.grade === "tide" ? { fontFamily: SANS, fontWeight: 700, fontSize: 20, color: CINK, letterSpacing: 4 } : { fontFamily: "'Arial Black', Arial", fontSize: 22, color: "#f2efe6", letterSpacing: 2 }}>{NAMES[k]}</div>
            </div>); })}
        </div>); })}
      {plan.grade === "tide" ? (plan.cards ?? []).map((cd, i) => { const ein = EASE.inOut(clamp01((t - cd.at) / 0.6)), eout = EASE.inOut(clamp01((cd.at + cd.dur - t) / 0.45)), k = Math.min(1, ein * 1.6) * eout; if (k <= 0) return null;
        // paper card: unrolls from the top edge with a slight tilt that settles, then lifts away and fades
        const unroll = `inset(0 0 ${((1 - ein) * 100).toFixed(1)}% 0 round 18px)`, tilt = (1 - ein) * -1.6, lift = (1 - eout) * -12;
        const kinds = cd.kinds ?? cd.lines.map(() => "big"), lastR = Math.max(...cd.lines.map((_, j) => Math.max(cd.reveal?.[j] ?? cd.at, cd.at + 0.25))), ul = EASE.out(clamp01((t - lastR - 1.0) / 0.5));
        return (
        <div key={`cd${i}`} style={{ position: "absolute", ...(cd.pos === "top" ? { left: "50%", top: 50, transform: `translateX(-50%) translateY(${lift}px) rotate(${tilt}deg)`, transformOrigin: "50% 0%" } : cd.pos === "topRight" ? { right: 90, top: 60, transform: `translateY(${lift}px) rotate(${tilt}deg)`, transformOrigin: "50% 0%" } : cd.pos === "bottomRight" ? { right: 90, bottom: 70, transform: `translateY(${lift}px) rotate(${tilt}deg)`, transformOrigin: "50% 0%" } : { right: 90, top: "50%", transform: `translateY(-50%) translateY(${lift}px) rotate(${tilt}deg)`, transformOrigin: "50% 0%" }), opacity: k, clipPath: ein < 1 ? unroll : undefined,
          background: PAPER, borderRadius: 18, padding: "30px 46px 26px", boxShadow: `0 8px 0 ${CINK}30, 0 18px 40px ${CINK}40`, textAlign: "center", color: CINK }}>
          {cd.lines.map((ln, j) => { const r = Math.max(cd.reveal?.[j] ?? cd.at, cd.at + 0.25), q = EASE.inOut(clamp01((t - r) / 0.95)); const kd = kinds[j];
            const st: React.CSSProperties = kd === "kicker" ? { fontFamily: SANS, fontWeight: 700, fontSize: 26, letterSpacing: 8, opacity: 0.7 } : kd === "caption" ? { fontFamily: SERIF, fontStyle: "italic", fontSize: 36, marginTop: 6 } : { fontFamily: "Cambria, Georgia, serif", fontWeight: 700, fontSize: 56, color: TEAL, lineHeight: 1.2 };
            const edge = (q * 120 - 10).toFixed(1), wipe = q < 1 ? `linear-gradient(90deg, #000 ${edge}%, transparent ${(+edge + 10).toFixed(1)}%)` : undefined;
            return <div key={j} style={{ ...st, WebkitMaskImage: wipe, maskImage: wipe }}>{kd === "caption" ? ln.charAt(0) + ln.slice(1).toLowerCase() : ln}</div>; })}
          <svg width={300} height={18} style={{ display: "block", margin: "8px auto 0" }}><path d="M8 10 Q150 2 292 9" stroke={CORAL} strokeWidth={5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ul} /></svg>
        </div>); }) : null}
      {(plan.dips ?? []).map((d, i) => { const a3 = t < d ? clamp01(1 - (d - t) / 0.45) : clamp01(1 - (t - d) / 0.7); return a3 > 0 ? <AbsoluteFill key={`dip${i}`} style={{ background: "#0b1218", opacity: EASE.inOut(a3) }} /> : null; })}
      {(plan.grade === "tide" ? [] : plan.cards ?? []).map((cd, i) => { const k = clamp01((t - cd.at) / 0.35) * clamp01((cd.at + cd.dur - t) / 0.35); return k > 0 ? (
        <div key={`cd${i}`} style={{ position: "absolute", ...(cd.pos === "top" ? { left: "50%", top: 56, transform: `translateX(-50%) translateY(${(1 - k) * -20}px)` } : cd.pos === "topRight" ? { right: 90, top: 66, transform: `translateY(${(1 - k) * -20}px)` } : cd.pos === "bottomRight" ? { right: 90, bottom: 76, transform: `translateY(${(1 - k) * 20}px)` } : { right: 90, top: "50%", transform: `translateY(-50%) translateX(${(1 - k) * 30}px)` }), opacity: k,
          background: "rgba(10,26,38,0.72)", borderRadius: 26, padding: "34px 46px", borderLeft: "10px solid #e8673a" }}>
          {cd.lines.map((ln, j) => { const r = cd.reveal?.[j] ?? cd.at, q = clamp01((t - r) / 0.35); if (t < r) return null; return (
            <div key={j} style={{ fontFamily: "'Arial Black', Arial", fontSize: j === 0 && cd.lines.length > 1 && !cd.reveal ? 34 : 54, lineHeight: 1.25, color: "#f4f1e8", opacity: q, transform: `translateX(${(1 - q) * 14}px)` }}>{ln}</div>); })}
        </div>) : null; })}
      {(() => { const fl = (plan.flash ?? []).reduce((a, ft) => Math.max(a, t >= ft && t < ft + 0.5 ? (1 - (t - ft) / 0.5) * (Math.sin((t - ft) * 40) > -0.3 ? 1 : 0.4) : 0), 0);
        return fl > 0 ? <AbsoluteFill style={{ background: "#e8f0ff", opacity: fl * 0.55, mixBlendMode: "screen" }} /> : null; })()}
      {plan.wash && t >= plan.wash[0] && t < plan.wash[1] ? (() => { const [a, b] = plan.wash!, sweep = EASE.inOut(clamp01((t - a) / 1.1)), drain = EASE.inOut(clamp01((t - (b - 1.4)) / 1.4));
        const cx = -500 + sweep * 2900, top = drain * 1150;
        let crest = `M-200 1200 L-200 ${200 + top}`;
        for (let x = -200; x <= cx; x += 40) crest += ` L${x} ${(top + 140 + Math.sin(x / 90 + t * 3) * 26 + Math.sin(x / 37 - t * 5) * 10).toFixed(1)}`;
        crest += ` Q${cx + 160} ${top + 60} ${cx + 120} ${top + 260} Q${cx + 40} ${top + 420} ${cx} 1200 Z`;
        return <AbsoluteFill>
          <svg width={1920} height={1080} style={{ position: "absolute" }}>
            <path d={crest} fill="#1f5662" opacity={0.86} />
            <path d={crest} fill="none" stroke="#f4ead7" strokeWidth={10} opacity={0.85} />
            {Array.from({ length: 34 }, (_, i) => { const x = ((i * 233) % 2100) - 100, y = top + 200 + ((i * 151 + (t - a) * 90 * (1 + (i % 3))) % 900); return x < cx ? <path key={i} d={`M${x} ${y} q30 -12 60 0 q30 12 60 0`} stroke="#dfeef2" strokeWidth={4} fill="none" opacity={0.45} strokeLinecap="round" /> : null; })}
            {Array.from({ length: 26 }, (_, i) => { const x = ((i * 307) % 1920), y = 1080 - (((t - a) * (140 + (i % 4) * 50) + i * 83) % (1080 - top)); return x < cx && y > top + 160 ? <circle key={`b${i}`} cx={x + Math.sin(t * 3 + i) * 10} cy={y} r={4 + (i % 4) * 3} fill="none" stroke="#f4ead7" strokeWidth={2} opacity={0.55} /> : null; })}
          </svg>
        </AbsoluteFill>; })() : null}
      {(plan.inserts ?? []).map((ins, i) => { const k = clamp01((t - ins.at) / 0.45) * clamp01((ins.at + ins.dur - t) / 0.4); if (k <= 0) return null;
        const gap = ins.kind === "hook" ? 1.4 : (ins.dur - 1.4) / 3, st = (j: number) => EASE.out(clamp01((t - ins.at - 0.4 - j * gap) / 0.5));
        const W = "#d8bf8a", G = "#8b979e", B = "#3f86b6", Wd = "#a8723f";
        const title = ins.kind === "hook" ? "A STAPLE BECOMES A HOOK" : ins.kind === "tarp" ? "HOW TO CATCH RAIN" : ins.kind === "tri" ? "TIE IN TRIANGLES" : ins.kind === "anchor" ? "A SEA ANCHOR" : ins.kind === "still" ? "A SOLAR STILL" : "HOW TO LASH THE RAFT";
        const labels = ins.kind === "tri" ? ["side by side", "triangles", "one breaks, holds"] : ins.kind === "anchor" ? ["side-on: flips", "a parachute", "nose to waves"] : ins.kind === "tarp" ? ["spread it", "tie 2 corners", "push centre down"] : ins.kind === "lash" ? ["one to hold", "one to lock", "one just in case"] : ins.kind === "still" ? ["sun heats seawater", "vapor rises, salt stays", "fresh drops"] : [];
        const step = (j: number) => {
          if (ins.kind === "hook") return <path d={["M0 -60 L0 60", "M0 -60 L0 30 Q0 60 -30 55", "M0 -60 L0 30 Q0 66 -34 60 Q-56 52 -48 28 L-38 38"][j]} stroke={j === 2 ? TEAL : G} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
          if (ins.kind === "tri") { const pl = (x1: number, y1: number, x2: number, y2: number, c = Wd) => <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={c} strokeWidth={14} strokeLinecap="round" />;
            if (j === 0) return <g>{pl(-60, -20, 60, -20)}{pl(-60, 10, 60, 10, "#93633a")}<path d="M-6 -30 L-6 20" stroke={CORAL} strokeWidth={4} strokeDasharray="6 5" /><path d="M24 -30 L24 20" stroke={W} strokeWidth={5} /></g>;
            return <g>{pl(-60, 40, 60, 40)}{pl(-60, 40, 0, -50, "#93633a")}{pl(60, 40, 0, -50, "#8a5a33")}
              {[[-60, 40], [60, 40], [0, -50]].map(([x, y], q) => <circle key={q} cx={x} cy={y} r={9} fill={j === 2 && q === 2 ? CORAL : W} />)}
              {j === 2 ? <path d="M-10 -58 l20 16 M10 -58 l-20 16" stroke={CORAL} strokeWidth={4} /> : null}</g>; }
          if (ins.kind === "anchor") { const raft = (rot: number) => <g transform={`rotate(${rot})`}><rect x={-46} y={-10} width={92} height={18} rx={3} fill={Wd} /></g>;
            if (j === 0) return <g><path d="M-80 30 Q-30 -40 30 20 T 90 10" stroke={B} strokeWidth={6} fill="none" /><g transform="translate(0 -8)">{raft(-28)}</g><path d="M40 -50 a24 24 0 1 1 -10 -16" stroke={CORAL} strokeWidth={4} fill="none" /></g>;
            if (j === 1) return <g><path d="M-46 -30 Q0 -70 46 -30 L10 40 L-10 40 Z" fill={B} opacity={0.9} /><path d="M-46 -30 L-6 40 M46 -30 L6 40 M0 -48 L0 40" stroke={W} strokeWidth={3} /><path d="M0 40 L0 70" stroke={W} strokeWidth={5} /></g>;
            return <g><path d="M-90 -10 L90 -10" stroke={B} strokeWidth={4} opacity={0.6} /><g transform="translate(-50 -18)">{raft(0)}</g><path d="M-4 -12 Q30 10 60 34" stroke={W} strokeWidth={4} fill="none" /><path d="M56 26 Q80 20 86 48 L66 54 Z" fill={B} /><path d="M-120 -40 l30 0 m-8 -8 l8 8 l-8 8" stroke={TEAL} strokeWidth={4} fill="none" /></g>; }
          if (ins.kind === "still") { // dark pot of seawater under a clear dome; sun -> vapor -> drops into a cut bottle
            const pot = <g><path d="M-48 20 L48 20 L40 52 L-40 52 Z" fill="#2d3a40" /><path d="M-44 26 L44 26" stroke={B} strokeWidth={6} /></g>;
            const dome = <path d="M-62 22 Q0 -62 62 22" stroke="#bfe3ee" strokeWidth={5} fill="#bfe3ee" fillOpacity={0.18} />;
            if (j === 0) return <g>{pot}<circle cx={0} cy={-46} r={20} fill="#f2c14e" />{[0, 1, 2, 3, 4, 5, 6, 7].map((q) => <path key={q} d={`M${Math.cos(q * 0.785) * 28} ${-46 + Math.sin(q * 0.785) * 28} l${Math.cos(q * 0.785) * 10} ${Math.sin(q * 0.785) * 10}`} stroke="#f2c14e" strokeWidth={4} strokeLinecap="round" />)}</g>;
            if (j === 1) return <g>{pot}{dome}{[-18, 4, 24].map((x, q) => <path key={q} d={`M${x} 14 q-8 -10 0 -20 q8 -10 0 -20`} stroke="#dfeef2" strokeWidth={4} fill="none" strokeLinecap="round" />)}<text x={56} y={48} fontFamily={SANS} fontWeight={700} fontSize={16} fill={G}>salt</text></g>;
            return <g>{dome}<path d="M40 10 Q52 18 56 30" stroke={B} strokeWidth={0} fill="none" /><circle cx={50} cy={16} r={7} fill="#8fd3ea" /><path d="M42 30 L70 30 L66 62 L46 62 Z" fill="#cfe9ef" opacity={0.9} /><path d="M46 52 L66 52 L66 62 L46 62 Z" fill="#8fd3ea" /><circle cx={-20} cy={-14} r={6} fill="#8fd3ea" /><circle cx={14} cy={-26} r={6} fill="#8fd3ea" /></g>; }
          if (ins.kind === "tarp") return <g>
            <rect x={-62} y={j === 2 ? 2 : 10} width={124} height={j === 2 ? 0 : 0} fill="none" />
            <path d="M-70 30 L70 30" stroke={Wd} strokeWidth={10} strokeLinecap="round" />
            {j === 0 ? <path d="M-60 -30 L60 -40 L66 10 L-54 18 Z" fill={B} /> : j === 1 ? <><path d="M-60 22 L60 22 L56 -8 Q0 -2 -56 -8 Z" fill={B} /><circle cx={-58} cy={22} r={7} fill={W} /><circle cx={58} cy={22} r={7} fill={W} /></> :
              <><path d="M-62 -10 Q0 60 62 -10 L56 -14 Q0 40 -56 -14 Z" fill={B} /><path d="M-40 -2 Q0 34 40 -2 Z" fill="#8fd3ea" /><circle cx={-58} cy={-12} r={7} fill={W} /><circle cx={58} cy={-12} r={7} fill={W} />{[-30, 0, 26].map((x) => <path key={x} d={`M${x} -60 l-4 14`} stroke="#8fd3ea" strokeWidth={4} strokeLinecap="round" />)}</>}
          </g>;
          return <g>
            <rect x={-70} y={-34} width={66} height={24} rx={4} fill={Wd} /><rect x={4} y={-34} width={66} height={24} rx={4} fill="#93633a" />
            {Array.from({ length: j + 1 }, (_, q) => <g key={q} transform={`translate(${-22 + q * 22} 0)`}><path d="M-6 -40 L6 -40 L6 -4 L-6 -4 Z" fill={W} />{[-34, -24, -14].map((y) => <path key={y} d={`M-6 ${y} L6 ${y + 4}`} stroke="#ad9361" strokeWidth={2} />)}</g>)}
            <circle cx={-22 + j * 22} cy={4} r={8} fill={j === 2 ? TEAL : W} />
          </g>;
        };
        return <div key={`in${i}`} style={{ position: "absolute", left: "50%", top: 50, transform: `translateX(-50%) translateY(${(1 - EASE.out(k)) * -14}px)`, opacity: k, background: PAPER, borderRadius: 18, padding: "22px 40px 16px", boxShadow: `0 8px 0 ${CINK}30, 0 18px 40px ${CINK}40`, textAlign: "center", color: CINK }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: 8, opacity: 0.7 }}>{title}</div>
          <svg width={600} height={labels.length ? 200 : 170} viewBox={`0 0 600 ${labels.length ? 200 : 170}`}>{[0, 1, 2].map((j) => <g key={j} transform={`translate(${120 + j * 180} 85)`} opacity={st(j)}>
            {step(j)}
            {labels[j] ? <text y={92} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={22} fill={CINK}>{labels[j]}</text> : null}
            {j < 2 ? <path d="M70 0 l22 0 m-8 -8 l8 8 l-8 8" stroke={CORAL} strokeWidth={4} fill="none" opacity={st(j + 1)} /> : null}</g>)}</svg>
        </div>; })}
      {subtitles ? <Subtitles captions={captions} ms={ms} /> : null}
      {plan.endCard && t >= plan.endCard.at ? (() => { const ec = plan.endCard!, k = EASE.out(clamp01((t - ec.at) / 0.6)), k2 = EASE.out(clamp01((t - ec.at - 0.6) / 0.6));
        return <AbsoluteFill style={{ background: CINK, opacity: k, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: 12, color: "#f2d8ae", opacity: 0.8 * k2 }}>{ec.kicker}</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 72, color: PAPER, marginTop: 14, opacity: k2, transform: `translateY(${(1 - k2) * 10}px)` }}>{ec.text}</div>
          <svg width={360} height={20} style={{ marginTop: 16 }}><path d="M8 10 Q180 2 352 9" stroke={CORAL} strokeWidth={5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k2} /></svg>
        </AbsoluteFill>; })() : null}
      <AbsoluteFill style={{ background: "#000", opacity: Math.min(1, fadeBlack) }} />
      {/* audio: your voice at full level; ambience ducked under speech; SFX well below the voice */}
      <Audio src={staticFile(`episodes/${id}/voice.wav`)} trimBefore={TR} volume={1} />
      {plan.ambience && !noSfx ? <Audio src={staticFile(`sfx-lib/${plan.ambience}`)} loop volume={(fr) => clamp01(fr / 30) * interpolate(speakAmt(captions, (fr / FPS) * 1000), [0, 1], [0.16, 0.07]) * (1 - clamp01((fr - (end - 20)) / 19))} /> : null}
      {(noSfx ? [] : plan.sfx ?? []).map((s, i) => (
        <Sequence key={i} from={Math.round(s.at * FPS) - TR} {...(s.dur ? { durationInFrames: Math.round(s.dur * FPS) } : {})}><Audio src={staticFile(`sfx-lib/${s.file}`)} loop={!!s.dur} volume={(fr) => Math.min(0.45, s.vol ?? 0.3) * (1 - 0.3 * speakAmt(captions, (s.at + fr / FPS) * 1000)) * (s.dur ? clamp01(fr / 15) * clamp01((s.dur * FPS - fr) / 30) : 1)} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** QC fix (v2): align every plan time that sits within 0.1 s of a cut onto that cut's frame.
 *  Before, a character/place key at 196.50 and a cut at 196.52 gave one frame of "new staging seen through the old camera". */
export const snapToCuts = (plan: Plan): Plan => {
  const cuts = plan.shots.map((s) => Math.round(s.start * FPS) / FPS);
  plan.shots.forEach((s, i) => { s.start = cuts[i]; });
  const snap = (t: number) => { for (const c of cuts) if (Math.abs(t - c) <= 0.1 && t !== c) return c; return t; };
  const walk = (v: unknown, inShotStart = false): unknown => {
    if (Array.isArray(v)) { if (typeof v[0] === "number" && v.length >= 2) v[0] = snap(v[0]); v.forEach((x) => walk(x)); }
    else if (v && typeof v === "object" && !inShotStart) Object.entries(v as Record<string, unknown>).forEach(([k, x]) => { if (k !== "cam") walk(x); });
    return v;
  };
  const { shots, ...rest } = plan; walk(rest); shots.forEach((s) => walk(s.chars));
  return plan;
};

export const calcEpisode: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const base = `episodes/${props.id}`;
  const [meta, captions, plan] = await Promise.all([
    fetch(staticFile(`${base}/meta.json`)).then((r) => r.json()),
    fetch(staticFile(`${base}/captions.json`)).then((r) => r.json()),
    fetch(staticFile(`${base}/${props.planFile ?? "plan.json"}`)).then((r) => r.json()),
  ]);
  snapToCuts(plan);
  if (plan.camera === "calm") plan.shots.forEach((s: Shot, i: number) => { const nx = plan.shots[i + 1]?.start ?? meta.duration; if (nx - s.start < 4) console.warn(`[calm camera] shot ${i} "${s.camera}" lasts ${(nx - s.start).toFixed(1)} s (< 4 s)`); });
  return { durationInFrames: Math.ceil((meta.duration + 0.6) * FPS) - Math.round((plan.trimStart ?? 0) * FPS), props: { ...props, plan, captions, duration: meta.duration + 0.6 } };
};
