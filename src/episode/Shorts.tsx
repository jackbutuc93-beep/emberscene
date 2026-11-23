import React from "react";
import { AbsoluteFill, Composition, Sequence, registerRoot, useCurrentFrame } from "remotion";
import { Episode, calcEpisode, type EpisodeProps } from "./Episode";
import { EASE } from "../studio2d/anim";
import { CORAL, INK, PAPER, SANS, TEAL } from "../cards/TideCards";

// YouTube Shorts (1080x1920) cut from Part 1: the 16:9 frame is scaled to fill the height and cropped on the characters;
// cards and speech bubbles are re-laid out for the vertical frame (same Tide style: unroll + left-to-right writing).
const FPS = 30, S = 1920 / 1080; // scale 16:9 frame to full height
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
type Short = { id: string; from: number; to: number; cx: [number, number][]; hook: string; end: string; lift?: number };
export const SHORTS: Short[] = [
  { id: "short-rain", from: 178.8, to: 234.6, cx: [[0, 960]], hook: "HOW TO DRINK RAIN AT SEA", end: "FULL STORY ON EMBERSCENE" },
  { id: "short-hook", from: 367.0, to: 425.2, cx: [[0, 960]], hook: "A FISH HOOK FROM A STAPLE", end: "FULL STORY ON EMBERSCENE" },
  { id: "short-storm", from: 475.4, to: 520.4, cx: [[0, 960]], hook: "THE NIGHT THE SEA TOOK EVERYTHING", end: "FULL STORY ON EMBERSCENE", lift: 1.45 },
  { id: "short-shark", from: 571.3, to: 601.0, cx: [[0, 960]], hook: "SOMETHING TOUCHED THE RAFT", end: "PART 2 · ON EMBERSCENE" },
];

const Card: React.FC<{ t: number; at: number; dur: number; lines: string[]; kinds?: string[]; reveal?: number[]; top: number }> = ({ t, at, dur, lines, kinds, reveal, top }) => {
  const ein = EASE.inOut(clamp01((t - at) / 0.6)), eout = EASE.inOut(clamp01((at + dur - t) / 0.45)), k = Math.min(1, ein * 1.6) * eout; if (k <= 0) return null;
  const rs = lines.map((_, j) => Math.max(reveal?.[j] ?? at, at + 0.25)), last = Math.max(...rs), ul = EASE.out(clamp01((t - last - 1.0) / 0.5));
  return <div style={{ position: "absolute", left: "50%", top, width: 940, transform: `translateX(-50%) translateY(${(1 - eout) * -12}px) rotate(${(1 - ein) * -1.6}deg)`, transformOrigin: "50% 0%", opacity: k,
    clipPath: ein < 1 ? `inset(0 0 ${((1 - ein) * 100).toFixed(1)}% 0 round 18px)` : undefined,
    background: `linear-gradient(180deg, #fbf4e6 0%, ${PAPER} 60%, #efe2c8 100%)`, borderRadius: 18, padding: "28px 40px 22px", boxShadow: `0 8px 0 ${INK}2e, 0 20px 44px ${INK}48`, textAlign: "center", color: INK }}>
    {lines.map((ln, j) => { const kd = kinds?.[j] ?? "big", q = EASE.inOut(clamp01((t - rs[j]) / 0.95)), edge = (q * 120 - 10).toFixed(1), m = q < 1 ? `linear-gradient(90deg, #000 ${edge}%, transparent ${(+edge + 10).toFixed(1)}%)` : undefined;
      const st: React.CSSProperties = kd === "kicker" ? { fontFamily: SANS, fontWeight: 700, fontSize: 34, letterSpacing: 8, opacity: 0.7 } : kd === "caption" ? { fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 44, marginTop: 6 } : { fontFamily: "Cambria, Georgia, serif", fontWeight: 700, fontSize: ln.length > 22 ? 52 : 66, color: TEAL, lineHeight: 1.15 };
      return <div key={j} style={{ ...st, WebkitMaskImage: m, maskImage: m }}>{kd === "caption" ? ln.charAt(0) + ln.slice(1).toLowerCase() : ln}</div>; })}
    <svg width={300} height={18} style={{ display: "block", margin: "10px auto 0" }}><path d="M8 10 Q150 2 292 9" stroke={CORAL} strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ul} /></svg>
  </div>;
};

const Bubble: React.FC<{ t: number; at: number; dur: number; who: "teo" | "mara"; text: string }> = ({ t, at, dur, who, text }) => {
  const k = clamp01((t - at) / 0.3) * clamp01((at + dur - t) / 0.3); if (k <= 0) return null;
  return <div style={{ position: "absolute", left: "46%", top: 300, transform: `translateX(-50%) translateY(${(1 - EASE.out(k)) * 12}px)`, opacity: k, maxWidth: 820, background: "#fffaf0", color: INK, borderRadius: 28, padding: "20px 34px", boxShadow: `0 10px 30px ${INK}55`, textAlign: "center" }}>
    <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 26, letterSpacing: 6, color: who === "teo" ? CORAL : TEAL, marginBottom: 4 }}>{who.toUpperCase()}</div>
    <div style={{ fontFamily: "Georgia, serif", fontSize: 46, lineHeight: 1.2 }}>{text}</div>
    <div style={{ position: "absolute", left: "50%", bottom: -18, width: 36, height: 36, background: "#fffaf0", transform: "translateX(-50%) rotate(45deg)" }} />
  </div>;
};

/** re-aim each shot for the vertical crop: centre on the two characters and zoom out until both fit (calm camera kept) */
const lastBefore = <T,>(arr: [number, ...T[]][] | undefined, t: number) => { let r: [number, ...T[]] | undefined; for (const e of arr ?? []) if (e[0] <= t) r = e; return r; };
const vertCam = (plan: NonNullable<EpisodeProps["plan"]>, s: any) => {
  const cam = s.cam as { cx: number; cy: number; z: number }[] | undefined; if (!cam || cam[0].cy > 830) return s;
  const t = s.start + 0.5, teo = 720 + Number(lastBefore<number>(plan.place?.teo as any, t)?.[1] ?? 0), mp = lastBefore<string | number>(plan.place?.mara as any, t);
  const xs = [teo]; if (mp && mp[1] === "raft") xs.push(720 + Number(mp[2] ?? 0));
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2, spread = Math.max(...xs) - Math.min(...xs), zMax = spread > 0 ? 440 / spread : 2.2;
  // a close-up in the 16:9 plan stays a close-up: centre on the character nearest the original aim instead of squeezing both in
  if (cam[0].z > zMax * 1.15 && xs.length > 1) { const who = xs.reduce((a, b) => (Math.abs(b - cam[0].cx) < Math.abs(a - cam[0].cx) ? b : a));
    return { ...s, cam: cam.map((c) => ({ cx: who, cy: c.cy, z: Math.min(c.z, 3.0) })) }; }
  return { ...s, cam: cam.map((c) => ({ cx: mid, cy: c.cy, z: Math.min(c.z, zMax) })) };
};
/** short captions for Shorts: 3-word groups from the voice timing, the word being said slightly brighter */
const Captions: React.FC<{ caps: { text: string; startMs: number; endMs: number }[]; t: number }> = ({ caps, t }) => {
  const words: { w: string; a: number; b: number }[] = [];
  for (const c of caps) { const txt = c.text; if (words.length && !/^\s/.test(txt)) { words[words.length - 1].w += txt.trim(); words[words.length - 1].b = c.endMs / 1000; continue; } if (txt.trim()) words.push({ w: txt.trim(), a: c.startMs / 1000, b: c.endMs / 1000 }); }
  const groups: typeof words[] = []; let g: typeof words = [];
  for (const w of words) { const gap = g.length ? w.a - g[g.length - 1].b : 0; if (g.length && (g.length >= 3 || gap > 0.45 || /[.?!,]$/.test(g[g.length - 1].w))) { groups.push(g); g = []; } g.push(w); }
  if (g.length) groups.push(g);
  const cur = groups.find((gr) => t >= gr[0].a - 0.05 && t < gr[gr.length - 1].b + 0.25); if (!cur) return null;
  const k = EASE.out(clamp01((t - cur[0].a + 0.05) / 0.15));
  return <div style={{ position: "absolute", top: 1380, left: 60, right: 150, textAlign: "center", transform: `scale(${0.9 + 0.1 * k})`, opacity: k }}>
    {cur.map((w, i) => { const on = t >= w.a && t < w.b + 0.1; return <span key={i} style={{ display: "inline-block", margin: "0 12px", fontFamily: SANS, fontWeight: 800, fontSize: 76, color: on ? "#ffffff" : "#f4ead7c8", textTransform: "uppercase",
      WebkitTextStroke: "10px #13232c", paintOrder: "stroke fill", textShadow: "0 6px 18px #000a", transform: on ? "translateY(-4px)" : undefined }}>{w.w}</span>; })}
  </div>;
};
const ShortComp: React.FC<EpisodeProps & { short: string }> = (p) => {
  const sh = SHORTS.find((s) => s.id === p.short)!, f = useCurrentFrame(), lt = f / FPS, t = sh.from + lt, len = sh.to - sh.from;
  let cx = sh.cx[0][1]; for (const [a, x] of sh.cx) if (lt >= a) cx = x;
  const plan = React.useMemo(() => p.plan ? { ...p.plan, cards: [], bubbles: [], titles: [], endCard: undefined, shots: p.plan.shots.map((s, i, all) => { const v = vertCam(p.plan!, s), end = all[i + 1]?.start ?? 1e9;
    // an explainer insert sits at the top of the frame: lower the characters under it
    const ins = (p.plan!.inserts ?? []).some((n) => n.at < end && n.at + n.dur > s.start);
    return ins && v.cam ? { ...v, cam: v.cam.map((c: { cx: number; cy: number; z: number }) => ({ ...c, cy: c.cy - 140 / c.z })) } : v; }) } : p.plan, [p.plan]);
  const hookK = clamp01((3.6 - lt) / 0.4), hookIn = EASE.out(clamp01(lt / 0.35)), endK = clamp01((lt - (len - 3)) / 0.5), fade = Math.max(clamp01(1 - lt / 0.3), clamp01((lt - (len - 0.3)) / 0.3));
  return <AbsoluteFill style={{ background: "#0b1218" }}>
    <div style={{ position: "absolute", left: 540 - cx * S, top: 0, width: 1920, height: 1080, transform: `scale(${S})`, transformOrigin: "0 0", filter: sh.lift ? `brightness(${sh.lift}) contrast(1.05) saturate(1.1)` : undefined }}>
      <Sequence from={-Math.round(sh.from * FPS)} layout="none"><Episode {...p} plan={plan} /></Sequence>
    </div>
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${INK}88 0%, ${INK}00 22%, ${INK}00 70%, ${INK}aa 100%)` }} />
    {(p.plan?.cards ?? []).filter((c) => c.at < sh.to && c.at + c.dur > sh.from).map((c, i) => <Card key={i} t={t} at={c.at} dur={c.dur} lines={c.lines} kinds={c.kinds} reveal={c.reveal} top={250} />)}
    {(p.plan?.bubbles ?? []).filter((b) => b.at < sh.to && b.at + b.dur > sh.from).map((b, i) => <Bubble key={i} t={t} {...b} />)}
    <Captions caps={(p.captions ?? []) as never} t={t} />
    {/* hook line (first 3 s) and end call-out (last 3 s) */}
    <div style={{ position: "absolute", top: 210, left: "50%", width: 900, transform: `translateX(-50%) scale(${0.94 + 0.06 * hookIn}) rotate(-1deg)`, opacity: hookK, background: `linear-gradient(180deg, #fbf4e6 0%, ${PAPER} 100%)`, borderRadius: 20, padding: "26px 36px", boxShadow: `0 8px 0 ${INK}33, 0 22px 50px ${INK}66`, textAlign: "center", fontFamily: "Cambria, Georgia, serif", fontWeight: 700, fontSize: 78, color: INK, lineHeight: 1.08 }}>{sh.hook}
      <svg width={320} height={18} style={{ display: "block", margin: "12px auto 0" }}><path d="M8 10 Q160 2 312 9" stroke={CORAL} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - EASE.out(clamp01((lt - 0.3) / 0.6))} /></svg></div>
    <div style={{ position: "absolute", top: 0, left: 0, height: 8, width: `${(lt / len) * 100}%`, background: CORAL, opacity: 0.9 }} />
    <div style={{ position: "absolute", bottom: 180, left: "50%", transform: `translateX(-50%) translateY(${(1 - endK) * 20}px)`, opacity: endK, background: CORAL, color: PAPER, borderRadius: 40, padding: "18px 44px", fontFamily: SANS, fontWeight: 700, fontSize: 38, letterSpacing: 4, whiteSpace: "nowrap" }}>{sh.end}</div>
    <AbsoluteFill style={{ background: "#0b1218", opacity: fade }} />
  </AbsoluteFill>;
};

registerRoot(() => <>{SHORTS.map((s) => <Composition key={s.id} id={s.id} component={ShortComp as never} width={1080} height={1920} fps={FPS} durationInFrames={Math.round((s.to - s.from) * FPS)}
  defaultProps={{ id: "adrift-p1", subtitles: false, short: s.id, planFile: "plan-p1-v2.json" } as never}
  calculateMetadata={async (o: never) => { const m = await calcEpisode(o); return { ...m, width: 1080, height: 1920, durationInFrames: Math.round((s.to - s.from) * FPS) }; }} />)}</>);
