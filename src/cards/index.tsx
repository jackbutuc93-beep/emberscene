import React from "react";
import { AbsoluteFill, Composition, Img, Sequence, registerRoot, staticFile } from "remotion";
import { TideBubble, TideChart, TideNumber, TideRoute } from "./TideCards";

// Preview of the ADRIFT cards (examples from the Part 1 story). The bubble is shown over a still frame of the episode.
const Demo: React.FC = () => (
  <>
    <Sequence durationInFrames={120}><TideNumber kicker="1942 · Poon Lim" value="133" caption="days alone on a raft" tone="sea" countUp={{ from: 0, to: 133, duration: 1.6 }} /></Sequence>
    <Sequence from={120} durationInFrames={150}><TideChart title="Day three" nodes={[
      { id: "a", x: 0.16, y: 0.55, label: "Tarp", sub: "stretched into a bowl" },
      { id: "b", x: 0.4, y: 0.35, label: "Rain", sub: "one short shower" },
      { id: "c", x: 0.63, y: 0.62, label: "3 bottles", sub: "filled to the top" },
      { id: "d", x: 0.85, y: 0.42, label: "3 more days", tone: "hope" },
    ]} links={[["a", "b"], ["b", "c"], ["c", "d"]]} /></Sequence>
    <Sequence from={270} durationInFrames={120}>
      <AbsoluteFill><Img src={staticFile("cards-demo/bg.png")} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>
      <TideBubble text="Floating kingdom. Population: two." x={0.72} y={0.13} at={0.3} tail="left" />
    </Sequence>
    <Sequence from={480} durationInFrames={180}><TideRoute title="The drift" stops={[
      { x: 0.02, y: 0.85, day: 1, label: "Day 1" }, { x: 0.3, y: 0.45, day: 22, label: "storm" },
      { x: 0.55, y: 0.6, day: 48, label: "the reef" }, { x: 0.78, y: 0.3, day: 75 }, { x: 0.98, y: 0.1, day: 100, label: "land?" },
    ]} at={0.6} duration={4} /></Sequence>
    <Sequence from={390} durationInFrames={90}><TideNumber kicker="Water left" value="0" caption="the third day" tone="danger" countUp={{ from: 3, to: 0, suffix: " bottles", duration: 1.2 }} /></Sequence>
  </>
);
// overflow test: deliberately long texts, must stay inside the frame (layout-utils)
const Overflow: React.FC = () => (
  <>
    <Sequence durationInFrames={60}><TideNumber kicker="Total distance" value="0" caption="the longest stretch of open water they had ever crossed together" countUp={{ from: 0, to: 1250000, suffix: " nautical miles", duration: 1 }} /></Sequence>
    <Sequence from={60} durationInFrames={60}>
      <AbsoluteFill style={{ background: "#3c7f88" }} />
      <TideBubble text="We have two planks, one rope, and absolutely no idea where the nearest land is." x={0.5} y={0.4} />
    </Sequence>
  </>
);
const Root: React.FC = () => (
  <>
    <Composition id="cards-overflow-test" component={Overflow} durationInFrames={120} fps={30} width={1920} height={1080} />
    <Composition id="cards-demo" component={Demo} durationInFrames={660} fps={30} width={1920} height={1080} />
  </>
);
registerRoot(Root);
