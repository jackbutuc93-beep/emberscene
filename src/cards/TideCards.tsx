import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE } from "../studio2d/anim";
import { fitText } from "@remotion/layout-utils";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadSourceSans3 } from "@remotion/google-fonts/SourceSans3";

// ADRIFT cards in the "Driftwood & Tide" style. Same three card types as the Multifilms export
// (number, speech bubble, blueprint), redrawn: paper + ink, teal/coral accents, calm ease-in (no bouncy pop).
export const INK = "#1b2a33", PAPER = "#f4ead7", TEAL = "#25606d", CORAL = "#e0785a", SAND = "#d9b98a";
// Fonts load from Google Fonts at render time, so cards look identical on any machine (old system fonts kept as fallback).
const lora = loadLora("normal", { weights: ["400", "700"], subsets: ["latin"] });
loadLora("italic", { weights: ["400"], subsets: ["latin"] });
const sourceSans = loadSourceSans3("normal", { weights: ["400", "700"], subsets: ["latin"] });
export const SERIF = `${lora.fontFamily}, Georgia, 'Times New Roman', serif`, SANS = `${sourceSans.fontFamily}, 'Trebuchet MS', 'Segoe UI', sans-serif`;
/** font size that keeps one line of text inside `withinWidth` px, never larger than the design size `max` */
const fitSize = (text: string, max: number, withinWidth: number, fontFamily: string, fontWeight?: number, extra?: { fontVariantNumeric?: string; fontStyle?: string }) =>
  Math.min(max, fitText({ text, withinWidth, fontFamily, fontWeight, fontVariantNumeric: extra?.fontVariantNumeric, additionalStyles: extra?.fontStyle ? { fontStyle: extra.fontStyle } : undefined }).fontSize);
/** tabular (equal-width) figures only on the digit runs: steady count-up without the wide spaces Lora's tnum gives words */
const splitNum = (s: string) => s.split(/([\d.,]+)/).filter(Boolean).map((p, i) =>
  /^[\d.,]+$/.test(p) ? <span key={i} style={{ fontVariantNumeric: "tabular-nums" }}>{p}</span> : <span key={i}>{p}</span>);
export type Tone = "ink" | "sea" | "danger" | "hope";
const TONES: Record<Tone, string> = { ink: INK, sea: TEAL, danger: "#b4472f", hope: "#c48a2c" };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** calm reveal 0..1 starting at `at` s, 0.5 s long */
export const rise = (t: number, at: number, d = 0.5) => EASE.out(Math.max(0, Math.min(1, (t - at) / d)));

const Grain: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
    <filter id="cg"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} /><feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.16  0 0 0 0 0.2  0 0 0 0.1 0" /></filter>
    <rect width={w} height={h} filter="url(#cg)" />
  </svg>
);
/** paper background with a soft warm light from up-right and ink-tinted edges */
export const Paper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 75% 25%, #fbf3e3 0%, ${PAPER} 45%, #e6d6b8 100%)` }}>
      {/* faint horizon wave lines, the ADRIFT motif */}
      <svg width={width} height={height} style={{ position: "absolute", opacity: 0.12 }}>
        {[0.78, 0.84, 0.9].map((y, i) => <path key={i} d={`M0 ${y * height} ${Array.from({ length: 13 }, (_, k) => `Q${(k + 0.5) * width / 12} ${y * height - 10 + (i % 2) * 4} ${(k + 1) * width / 12} ${y * height}`).join(" ")}`} stroke={TEAL} strokeWidth={3} fill="none" />)}
      </svg>
      {children}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 60%, ${INK}40 100%)` }} />
      <Grain w={width} h={height} />
    </AbsoluteFill>
  );
};

export type CountUp = { from: number; to: number; prefix?: string; suffix?: string; duration?: number };
const countText = (v: string, c: CountUp | undefined, t: number) => {
  if (!c) return v;
  const p = EASE.out(Math.min(1, t / (c.duration ?? 1.5)));
  return `${c.prefix ?? ""}${Math.round(c.from + (c.to - c.from) * p).toLocaleString("en-US")}${c.suffix ?? ""}`;
};

/** Full-screen number card: kicker, big inked number with a drawn underline, small caption. */
export const TideNumber: React.FC<{ kicker?: string; value: string; caption?: string; tone?: Tone; countUp?: CountUp }> = ({ kicker, value, caption, tone = "sea", countUp }) => {
  const f = useCurrentFrame(), { fps, width, height, durationInFrames } = useVideoConfig(), t = f / fps, u = height / 1080, c = TONES[tone];
  const z = interpolate(f, [0, durationInFrames], [1, 1.03], clamp), a = rise(t, 0.15, 0.6), line = rise(t, 0.6, 0.7);
  // size from the final text (count-up end value) so the number never resizes while counting
  const finalText = countUp ? countText(value, countUp, 1e9) : value, maxW = width * 0.86;
  const numPx = fitSize(finalText, 170 * u, maxW * 0.97, SERIF, 700);
  const capPx = caption ? fitSize(caption, 34 * u, maxW, SERIF, 400, { fontStyle: "italic" }) : 34 * u;
  return (
    <Paper>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${z})`, textAlign: "center", color: INK }}>
          {kicker ? <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26 * u, letterSpacing: 9 * u, opacity: 0.7 * rise(t, 0), marginBottom: 10 * u }}>{kicker.toUpperCase()}</div> : null}
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: numPx, whiteSpace: "nowrap", color: c, opacity: a, transform: `translateY(${(1 - a) * 18 * u}px)`, textShadow: `0 ${4 * u}px 0 ${INK}22` }}>{splitNum(countText(value, countUp, t))}</div>
          <svg width={520 * u} height={24 * u} style={{ display: "block", margin: "0 auto" }}>
            <path d={`M${10 * u} ${14 * u} Q${260 * u} ${2 * u} ${510 * u} ${12 * u}`} stroke={CORAL} strokeWidth={6 * u} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - line} />
          </svg>
          {caption ? <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: capPx, whiteSpace: "nowrap", opacity: 0.8 * rise(t, 0.9), marginTop: 14 * u }}>{caption}</div> : null}
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

/** Speech bubble over the picture (transparent): paper bubble, ink text, a tail toward the speaker. */
export const TideBubble: React.FC<{ text: string; x?: number; y?: number; size?: number; at?: number; tail?: "left" | "right" | "center" }> = ({ text, x = 0.5, y = 0.3, size = 38, at = 0, tail = "center" }) => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), a = rise(f / fps, at, 0.4);
  // bubble = text + 0.85 em padding each side; shrink so the whole bubble stays within 80 % of the frame width
  // text width grows linearly with font size: w = r·px, bubble = (r + 1.7)·px  ->  px <= maxW / (r + 1.7)
  const maxW = width * 0.8, r = maxW / fitText({ text, withinWidth: maxW, fontFamily: SERIF }).fontSize;
  const px = Math.min(size * (height / 1080), maxW / (r + 1.7));
  const tx = tail === "left" ? "22%" : tail === "right" ? "78%" : "50%";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: x * width, top: y * height, transform: `translate(-50%, -100%) translateY(${(1 - a) * 12}px)`, opacity: a }}>
        <div style={{ fontFamily: SERIF, fontSize: px, color: INK, background: PAPER, borderRadius: px * 0.7, padding: `${px * 0.45}px ${px * 0.85}px`, whiteSpace: "nowrap", boxShadow: `0 ${px * 0.18}px 0 ${INK}33` }}>{text}</div>
        <svg width={px * 1.2} height={px * 0.8} style={{ position: "absolute", left: tx, transform: "translateX(-50%)", top: "100%", marginTop: -2 }}>
          <path d={`M0 0 L${px * 1.2} 0 L${px * 0.35} ${px * 0.8} Z`} fill={PAPER} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export type ChartNode = { id: string; x: number; y: number; label: string; sub?: string; tone?: Tone };
/** "Sea chart" (replaces the blueprint): an old nautical-chart look, a dashed course drawing itself between stops. */
export const TideChart: React.FC<{ title?: string; nodes: ChartNode[]; links: [string, string][] }> = ({ title, nodes, links }) => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), t = f / fps, u = height / 1080;
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <Paper>
      <svg width={width} height={height} style={{ position: "absolute" }}>
        {/* chart grid + compass rose */}
        <g opacity={0.14} stroke={TEAL} strokeWidth={1.5}>
          {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} x1={i * width / 12} y1={0} x2={i * width / 12} y2={height} />)}
          {Array.from({ length: 8 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * height / 7} x2={width} y2={i * height / 7} />)}
        </g>
        <g transform={`translate(${width - 170 * u} ${height - 170 * u})`} opacity={0.35}>
          <circle r={90 * u} fill="none" stroke={TEAL} strokeWidth={2} />
          {[0, 90, 180, 270].map((r) => <path key={r} transform={`rotate(${r})`} d={`M0 ${-100 * u} L${12 * u} 0 L${-12 * u} 0 Z`} fill={r === 0 ? CORAL : TEAL} />)}
          <text y={-108 * u} textAnchor="middle" fontFamily={SERIF} fontSize={26 * u} fill={INK}>N</text>
        </g>
        {links.map(([p, q], i) => {
          const A = by[p], B = by[q]; if (!A || !B) return null;
          const x1 = A.x * width, y1 = A.y * height, x2 = B.x * width, y2 = B.y * height, mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 60 * u;
          const k = rise(t, 0.5 + i * 0.6, 0.7);
          return <g key={i}>
            <path d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} stroke={CORAL} strokeWidth={5 * u} fill="none" strokeLinecap="round" strokeDasharray={`${14 * u} ${12 * u}`} mask={`url(#m${i})`} />
            <mask id={`m${i}`}><path d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} stroke="#fff" strokeWidth={12 * u} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} /></mask>
          </g>;
        })}
        {nodes.map((n, i) => { const a = rise(t, 0.2 + i * 0.6, 0.4); return <g key={n.id} transform={`translate(${n.x * width} ${n.y * height}) scale(${a})`}>
          <circle r={16 * u} fill={PAPER} stroke={TONES[n.tone ?? "ink"]} strokeWidth={5 * u} /><circle r={6 * u} fill={TONES[n.tone ?? "ink"]} /></g>; })}
      </svg>
      {nodes.map((n, i) => { const a = rise(t, 0.3 + i * 0.6, 0.45); return (
        <div key={n.id} style={{ position: "absolute", left: n.x * width, top: n.y * height + 30 * u, transform: `translateX(-50%) translateY(${(1 - a) * 10 * u}px)`, opacity: a, textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 24 * u, letterSpacing: 3 * u, color: TONES[n.tone ?? "ink"] }}>{n.label.toUpperCase()}</div>
          {n.sub ? <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 22 * u, color: INK, opacity: 0.75, marginTop: 4 * u }}>{n.sub}</div> : null}
        </div>); })}
      {title ? <div style={{ position: "absolute", left: 90 * u, top: 90 * u, fontFamily: SERIF, fontWeight: 700, fontSize: 52 * u, letterSpacing: 4 * u, color: INK, opacity: rise(t, 0) }}>{title}</div> : null}
    </Paper>
  );
};

/** Drift-route map: the raft's path grows across a paper map, stop by stop, with a day counter.
 *  stops: x/y are 0..1 inside the map; day = day number at that stop. from/to = route progress (0..1) shown at start/end,
 *  so a later chapter can continue the same route (e.g. from 0.4 to 0.7). */
export type RouteStop = { x: number; y: number; day: number; label?: string };
const smoothPath = (p: { x: number; y: number }[]) => {
  let d = `M${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) { const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? c;
    d += ` C${b.x + (c.x - a.x) / 6} ${b.y + (c.y - a.y) / 6} ${c.x - (e.x - b.x) / 6} ${c.y - (e.y - b.y) / 6} ${c.x} ${c.y}`; }
  return d;
};
export const TideRoute: React.FC<{ title?: string; stops: RouteStop[]; from?: number; to?: number; at?: number; duration?: number }> = ({ title, stops, from = 0, to = 1, at = 0.5, duration = 3 }) => {
  const f = useCurrentFrame(), { fps, width, height, durationInFrames } = useVideoConfig(), t = f / fps, u = height / 1080;
  const z = interpolate(f, [0, durationInFrames], [1, 1.03], clamp);
  const mx = 0.12 * width, my = 0.2 * height, mw = 0.76 * width, mh = 0.56 * height;
  const pts = stops.map((s) => ({ x: mx + s.x * mw, y: my + s.y * mh }));
  const d = smoothPath(pts), L = getLength(d);
  // stop positions along the path (fraction of length), found by sampling
  const N = 400, samples = Array.from({ length: N + 1 }, (_, i) => getPointAtLength(d, (i / N) * L)!);
  const stopK = pts.map((p) => { let best = 0, bd = 1e18; samples.forEach((q, i) => { const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (dd < bd) { bd = dd; best = i; } }); return best / N; });
  const k = from + (to - from) * EASE.inOut(Math.max(0, Math.min(1, (t - at) / duration)));
  const boat = getPointAtLength(d, k * L)!, ahead = getPointAtLength(d, Math.min(L, k * L + 4))!, ang = Math.atan2(ahead.y - boat.y, ahead.x - boat.x) * 180 / Math.PI;
  let day = stops[0].day;
  for (let i = 0; i < stops.length - 1; i++) if (k >= stopK[i]) day = stops[i].day + (stops[i + 1].day - stops[i].day) * Math.min(1, (k - stopK[i]) / Math.max(1e-6, stopK[i + 1] - stopK[i]));
  const ev = evolvePath(k, d), a = rise(t, 0.1, 0.6);
  return (
    <Paper>
      <AbsoluteFill style={{ transform: `scale(${z})` }}>
        {title ? <div style={{ position: "absolute", top: 0.07 * height, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 26 * u, letterSpacing: 9 * u, color: INK, opacity: 0.7 * a }}>{title.toUpperCase()}</div> : null}
        <svg width={width} height={height} style={{ position: "absolute", opacity: a }}>
          <rect x={mx - 40 * u} y={my - 40 * u} width={mw + 80 * u} height={mh + 80 * u} rx={18 * u} fill="none" stroke={SAND} strokeWidth={4 * u} />
          {[0.25, 0.5, 0.75].map((g) => <path key={g} d={`M${mx} ${my + g * mh} Q${mx + mw / 2} ${my + g * mh + 14 * u} ${mx + mw} ${my + g * mh}`} stroke={TEAL} strokeOpacity={0.12} strokeWidth={3 * u} fill="none" />)}
          <path d={d} fill="none" stroke={SAND} strokeWidth={5 * u} strokeDasharray={`${4 * u} ${14 * u}`} strokeLinecap="round" />
          <path d={d} fill="none" stroke={TEAL} strokeWidth={7 * u} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
          {stops.map((s, i) => { const on = k >= stopK[i] - 0.002, p = pts[i];
            return <g key={i}>
              <circle cx={p.x} cy={p.y} r={11 * u} fill={on ? TEAL : PAPER} stroke={TEAL} strokeWidth={3.5 * u} />
              {s.label ? <text x={p.x} y={p.y + 44 * u} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={26 * u} fill={INK} opacity={on ? 0.85 : 0.3}>{s.label}</text> : null}
            </g>; })}
          <g transform={`translate(${boat.x} ${boat.y - 16 * u}) rotate(${ang * 0.25})`}>
            <rect x={-26 * u} y={-8 * u} width={52 * u} height={16 * u} rx={4 * u} fill="#6b4524" /><rect x={-26 * u} y={-8 * u} width={52 * u} height={5 * u} rx={3 * u} fill="#8a5c33" />
          </g>
        </svg>
        <div style={{ position: "absolute", bottom: 0.07 * height, width: "100%", textAlign: "center", fontFamily: SERIF, fontWeight: 700, fontSize: 72 * u, color: TEAL, opacity: a }}>
          Day {splitNum(String(Math.round(day)))}
        </div>
      </AbsoluteFill>
    </Paper>
  );
};
