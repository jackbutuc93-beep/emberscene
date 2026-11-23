import React from "react";
import { AbsoluteFill, Composition, Sequence, registerRoot, useCurrentFrame } from "remotion";
import { Episode, calcEpisode, type EpisodeProps } from "./Episode";
import { EASE } from "../studio2d/anim";
import { CORAL, INK, PAPER, SANS, TEAL } from "../cards/TideCards";

// Hook: split screen. Left = the beginning (two pieces of wood), right = what the raft becomes.
const LEFT_T = 83.2, RIGHT_T = 303.6, LEN = 120;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const Half: React.FC<{ p: EpisodeProps; at: number; side: "l" | "r"; cx: number; z: number; extra?: object }> = ({ p, at, side, cx, z, extra = {} }) => (
  <div style={{ position: "absolute", top: 0, [side === "l" ? "left" : "right"]: 0, width: 958, height: 1080, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 479 - cx * z, top: 540 - 540 * z, width: 1920, height: 1080, transform: `scale(${z})`, transformOrigin: "0 0" }}>
      <Sequence from={-Math.round(at * 30)} layout="none"><Episode {...p} plan={p.plan ? { ...p.plan, cards: [], bubbles: [], titles: [], items: [], ...extra } : p.plan} noSfx /></Sequence>
    </div>
  </div>
);

const Label: React.FC<{ kicker: string; text: string; x: number; at: number }> = ({ kicker, text, x, at }) => {
  const t = useCurrentFrame() / 30, e = EASE.inOut(clamp01((t - at) / 0.6)), w = EASE.inOut(clamp01((t - at - 0.35) / 0.8));
  const mask = w < 1 ? `linear-gradient(90deg, #000 ${(w * 120 - 10).toFixed(1)}%, transparent ${(w * 120).toFixed(1)}%)` : undefined;
  return <div style={{ position: "absolute", left: x, top: 60, transform: `translateX(-50%) rotate(${(1 - e) * -1.6}deg)`, transformOrigin: "50% 0%", clipPath: e < 1 ? `inset(0 0 ${((1 - e) * 100).toFixed(1)}% 0 round 16px)` : undefined, opacity: Math.min(1, e * 1.6),
    background: `linear-gradient(180deg, #fbf4e6 0%, ${PAPER} 60%, #efe2c8 100%)`, borderRadius: 16, padding: "20px 44px 16px", boxShadow: `0 8px 0 ${INK}2e, 0 20px 44px ${INK}48`, textAlign: "center", color: INK }}>
    <div style={{ WebkitMaskImage: mask, maskImage: mask }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: 7, opacity: 0.7 }}>{kicker}</div>
      <div style={{ fontFamily: "Cambria, Georgia, serif", fontWeight: 700, fontSize: 52, color: TEAL, lineHeight: 1.2, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  </div>;
};

const Hook: React.FC<EpisodeProps> = (p) => {
  const t = useCurrentFrame() / 30, out = clamp01((t - (LEN / 30 - 0.5)) / 0.5);
  return <AbsoluteFill style={{ background: "#0b1218" }}>
    <Half p={p} at={LEFT_T} side="l" cx={830} z={1.15} />
    <Half p={p} at={RIGHT_T} side="r" cx={960} z={1} extra={{ deck2: true, shots: (p.plan?.shots ?? []).map((sh) => ({ ...sh, cam: [{ cx: 840, cy: 560, z: 0.6 }, { cx: 840, cy: 560, z: 0.62 }] })), tarp: undefined, bottles: undefined, mood: [[0, "day"]] }} />
    <div style={{ position: "absolute", left: 956, top: 0, width: 8, height: 1080, background: PAPER, boxShadow: `0 0 18px ${INK}66` }} />
    <div style={{ position: "absolute", left: 952, top: 520, width: 16, height: 40, background: CORAL, borderRadius: 4 }} />
    <Label kicker="DAY 1" text="TWO PIECES OF WOOD" x={479} at={0.3} />
    <Label kicker="SOON" text="A FLOATING KINGDOM" x={1441} at={1.3} />
    <AbsoluteFill style={{ background: "#0b1218", opacity: EASE.inOut(out) }} />
  </AbsoluteFill>;
};

registerRoot(() => <Composition id="hook" component={Hook} calculateMetadata={async (o) => { const m = await calcEpisode(o as never); return { ...m, durationInFrames: LEN }; }}
  defaultProps={{ id: "adrift-p1", subtitles: false } as EpisodeProps} durationInFrames={LEN} fps={30} width={1920} height={1080} />);
