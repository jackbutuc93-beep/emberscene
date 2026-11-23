import React from "react";
import { AbsoluteFill, Composition, Sequence, registerRoot, useCurrentFrame } from "remotion";
import { Episode, calcEpisode, type EpisodeProps } from "./Episode";
import { EASE } from "../studio2d/anim";
import { CORAL, INK, PAPER, SANS, TEAL } from "../cards/TideCards";

// Part 2 hook options (4 s each). Times are Part 2 voice times; the plan's trimStart is ignored here.
const LEN = 120, clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clean = (p: EpisodeProps, extra: object = {}) => (p.plan ? { ...p.plan, trimStart: 0, cards: [], bubbles: [], titles: [], inserts: [], endCard: undefined, ...extra } : p.plan) as EpisodeProps["plan"];

const Scene: React.FC<{ p: EpisodeProps; at: number; extra?: object }> = ({ p, at, extra }) => (
  <Sequence from={-Math.round(at * 30)} layout="none"><Episode {...p} plan={clean(p, extra)} noSfx /></Sequence>
);
const Half: React.FC<{ p: EpisodeProps; at: number; side: "l" | "r"; cx: number; z: number }> = ({ p, at, side, cx, z }) => (
  <div style={{ position: "absolute", top: 0, [side === "l" ? "left" : "right"]: 0, width: 958, height: 1080, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 479 - cx * z, top: 540 - 540 * z, width: 1920, height: 1080, transform: `scale(${z})`, transformOrigin: "0 0" }}><Scene p={p} at={at} /></div>
  </div>
);
const Label: React.FC<{ kicker: string; text: string; x: number; at: number; top?: number }> = ({ kicker, text, x, at, top = 60 }) => {
  const t = useCurrentFrame() / 30, e = EASE.inOut(clamp01((t - at) / 0.6)), w = EASE.inOut(clamp01((t - at - 0.35) / 0.8));
  const mask = w < 1 ? `linear-gradient(90deg, #000 ${(w * 120 - 10).toFixed(1)}%, transparent ${(w * 120).toFixed(1)}%)` : undefined;
  return <div style={{ position: "absolute", left: x, top, transform: `translateX(-50%) rotate(${(1 - e) * -1.6}deg)`, transformOrigin: "50% 0%", clipPath: e < 1 ? `inset(0 0 ${((1 - e) * 100).toFixed(1)}% 0 round 16px)` : undefined, opacity: e,
    background: `linear-gradient(180deg, #fbf4e6 0%, ${PAPER} 60%, #efe2c8 100%)`, borderRadius: 16, padding: "20px 44px 16px", boxShadow: `0 8px 0 ${INK}2e, 0 20px 44px ${INK}48`, textAlign: "center", color: INK }}>
    <div style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: 7, opacity: 0.7 }}>{kicker}</div>
      <div style={{ fontFamily: "Cambria, Georgia, serif", fontWeight: 700, fontSize: 56, color: TEAL, lineHeight: 1.2, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  </div>;
};
const Out: React.FC = () => { const t = useCurrentFrame() / 30; return <AbsoluteFill style={{ background: "#0b1218", opacity: EASE.inOut(clamp01((t - 3.5) / 0.5)) }} />; };

const A: React.FC<EpisodeProps> = (p) => <AbsoluteFill style={{ background: "#0b1218" }}>
  <Half p={p} at={86} side="l" cx={760} z={1.1} /><Half p={p} at={466} side="r" cx={800} z={1.05} />
  <div style={{ position: "absolute", left: 956, top: 0, width: 8, height: 1080, background: PAPER, boxShadow: `0 0 18px ${INK}66` }} />
  <Label kicker="A MONTH AGO" text="ONE PLANK" x={479} at={0.3} /><Label kicker="NOW" text="A HOME" x={1441} at={1.3} /><Out /></AbsoluteFill>;
const B: React.FC<EpisodeProps> = (p) => <AbsoluteFill><Scene p={p} at={43.5} /><Label kicker="UNDER THE RAFT" text="IT CAME BACK." x={960} at={0.6} /><Out /></AbsoluteFill>;
const C: React.FC<EpisodeProps> = (p) => <AbsoluteFill><Scene p={p} at={385} /><Label kicker="2–3 MILES AWAY" text="A SHIP. IT DIDN'T STOP." x={700} at={0.6} /><Out /></AbsoluteFill>;
const D: React.FC<EpisodeProps> = (p) => <AbsoluteFill><Scene p={p} at={326.5} /><Label kicker="NO MAP · NO GPS" text="JUST ONE STAR." x={560} at={0.6} top={200} /><Out /></AbsoluteFill>;

const Big: React.FC<{ a: string; b: string; x: number; y: number; col?: string }> = ({ a, b, x, y, col = "#ffd36b" }) => <div style={{ position: "absolute", left: x, top: y, transform: "rotate(-2deg)", textAlign: "left" }}>
  <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, letterSpacing: 6, color: PAPER, textShadow: `0 4px 12px ${INK}` }}>{a}</div>
  <div style={{ fontFamily: "Cambria, Georgia, serif", fontWeight: 800, fontSize: 150, lineHeight: 0.95, color: col, WebkitTextStroke: `14px ${INK}`, paintOrder: "stroke fill", textShadow: `0 10px 30px ${INK}aa` }}>{b.split("|").map((l, i) => <div key={i}>{l}</div>)}</div></div>;
const ThumbA: React.FC<EpisodeProps> = (p) => <AbsoluteFill><div style={{ position: "absolute", left: -60, top: -60, width: 1920, height: 1080, transform: "scale(1.25)", transformOrigin: "0 0" }}><Scene p={p} at={386.2} /></div>
  <AbsoluteFill style={{ background: `linear-gradient(90deg, ${INK}cc 0%, ${INK}00 55%)` }} />
  <Big a="A SHIP. 2 MILES AWAY." b="IT DIDN'T|STOP." x={70} y={520} />
  <div style={{ position: "absolute", right: 60, top: 50, background: CORAL, color: PAPER, borderRadius: 14, padding: "10px 26px", fontFamily: SANS, fontWeight: 800, fontSize: 48, letterSpacing: 4 }}>PART 2</div></AbsoluteFill>;
const ThumbB: React.FC<EpisodeProps> = (p) => <AbsoluteFill style={{ background: "#0b1218" }}>
  <Half p={p} at={84.6} side="l" cx={760} z={1.25} /><Half p={p} at={466} side="r" cx={800} z={1.15} />
  <div style={{ position: "absolute", left: 952, top: 0, width: 16, height: 1080, background: PAPER }} />
  <Big a="DAY 1" b="1 PLANK" x={60} y={760} col={PAPER} /><Big a="1 MONTH LATER" b="A HOME" x={1010} y={760} />
  <div style={{ position: "absolute", left: 960, top: 380, transform: "translateX(-50%)", width: 130, height: 130, borderRadius: 65, background: CORAL, color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 90, fontWeight: 800, fontFamily: SANS }}>→</div></AbsoluteFill>;
const meta = async (o: Parameters<typeof calcEpisode>[0]) => { const m = await calcEpisode(o); return { ...m, durationInFrames: LEN }; };
const dp = { id: "adrift-p2", subtitles: false, planFile: "plan-p2-v2.json" } as EpisodeProps;
registerRoot(() => <>
  {([["hook2-a-split", A], ["hook2-b-whale", B], ["hook2-c-ship", C], ["hook2-d-star", D]] as const).map(([id, c]) =>
    <Composition key={id} id={id} component={c} calculateMetadata={meta} defaultProps={dp} durationInFrames={LEN} fps={30} width={1920} height={1080} />)}
  <Composition id="thumb2-a-ship" component={ThumbA} calculateMetadata={meta} defaultProps={dp} durationInFrames={1} fps={30} width={1920} height={1080} />
  <Composition id="thumb2-b-split" component={ThumbB} calculateMetadata={meta} defaultProps={dp} durationInFrames={1} fps={30} width={1920} height={1080} />
</>);
