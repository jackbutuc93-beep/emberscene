import React from "react";
import { AbsoluteFill } from "remotion";
import { Teo as Rig, type Look } from "../studio2d/TeoRig2D";

// 15 character style variations (same rig, same characters) for picking a look.
export const STYLES: [string, Look][] = [
  ["Actual", {}],
  ["Contur gros", { ow: 9 }],
  ["Contur subțire", { ow: 2.5 }],
  ["Fără contur", { ow: 0 }],
  ["Contur maro", { line: "#5b3a26", ow: 4 }],
  ["Plat, fără umbre", { shade: false }],
  ["Ochi punct", { eyes: "dot" }],
  ["Ochi ovali", { eyes: "bean", ow: 4 }],
  ["Cap mai mare", { head: 1.16 }],
  ["Pastel", { light: 0.22, sat: 0.8, ow: 3.5 }],
  ["Vibrant", { sat: 1.45, light: 0.05, ow: 6 }],
  ["Vintage", { sat: 0.55, hue: 0.02, line: "#3b2a22", ow: 4 }],
  ["Minimal", { ow: 7, shade: false, eyes: "dot" }],
  ["Moale", { ow: 0, light: 0.2, eyes: "bean", head: 1.08 }],
  ["Comic", { ow: 10, sat: 1.3, eyes: "bean", limb: 1.08 }],
];

// style 4 (no outline) + 15 body builds, from slim to heavy
const B4: Look = { ow: 0 };
export const BODIES: [string, Look][] = [
  ["Foarte slab", { ...B4, wide: 0.8, limb: 0.8 }],
  ["Slab", { ...B4, wide: 0.88, limb: 0.88 }],
  ["Suplu", { ...B4, wide: 0.94, limb: 0.94 }],
  ["Actual", { ...B4 }],
  ["Atletic", { ...B4, wide: 1.12, limb: 1.08 }],
  ["Umeri lați", { ...B4, wide: 1.22, limb: 1.02 }],
  ["Solid", { ...B4, wide: 1.18, limb: 1.18 }],
  ["Plinuț", { ...B4, wide: 1.24, limb: 1.22, belly: 0.4 }],
  ["Gras", { ...B4, wide: 1.32, limb: 1.32, belly: 0.75 }],
  ["Foarte gras", { ...B4, wide: 1.42, limb: 1.45, belly: 1.1 }],
  ["Slab, cap mare", { ...B4, wide: 0.9, limb: 0.88, head: 1.12 }],
  ["Gras, cap mare", { ...B4, wide: 1.3, limb: 1.28, belly: 0.7, head: 1.12 }],
  ["Membre subțiri", { ...B4, wide: 1.1, limb: 0.82 }],
  ["Membre groase", { ...B4, wide: 1.0, limb: 1.3 }],
  ["Rotunjor cartoon", { ...B4, wide: 1.25, limb: 1.15, belly: 0.55, head: 1.08 }],
];
const Grid: React.FC<{ items: [string, Look][]; full?: boolean }> = ({ items, full }) => (
  <AbsoluteFill style={{ background: "#e9e3d8" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, padding: 14, height: "100%", boxSizing: "border-box" }}>
      {items.map(([name, look], i) => (
        <div key={name} style={{ position: "relative", background: "linear-gradient(#bfe6f5, #eaf7fb)", borderRadius: 16, overflow: "hidden" }}>
          <svg viewBox={full ? "-380 -950 760 1060" : "-370 -930 740 600"} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
            {full ? <rect x={-500} y={0} width={1000} height={60} fill="#cdb98f" /> : null}
            <Rig who="teo" look={look} expr="happy" pose={{ view: "tq", gaze: [0.4, 0] }} x={-150} y={0} scale={1} />
            <Rig who="mara" look={look} expr="happy" pose={{ view: "tq", flip: true, gaze: [0.4, 0] }} x={170} y={0} scale={1} />
          </svg>
          <div style={{ position: "absolute", bottom: 6, left: 12, background: "#ffffffd9", padding: "2px 10px", borderRadius: 10, fontFamily: "Arial", fontWeight: 800, fontSize: 22, color: "#1f2a30" }}>{i + 1}. {name}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
/** chosen look: style 4 (no outline) + body 1 (very slim) */
export const CHOSEN: Look = { ow: 0, wide: 0.8, limb: 0.8 };
/** v2 (ADRIFT visual improvement): same look, shoulders +10 %, Teo body v6, refined knees/ankles */
export const CHOSEN_V2: Look = { ow: 0, wide: 0.8, limb: 0.8, shoulders: 1.1, teoBuild: "v6", joints: true };
const HANDS = ["relaxed", "open", "reach", "point", "fist", "hold"] as const;
export const HandSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#e9e3d8" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: 14, height: "100%", boxSizing: "border-box" }}>
      {HANDS.map((h) => (
        <div key={h} style={{ position: "relative", background: "linear-gradient(#bfe6f5, #eaf7fb)", borderRadius: 16, overflow: "hidden" }}>
          <svg viewBox="140 -770 300 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <Rig who="teo" look={CHOSEN} expr="happy" pose={{ view: "tq", armR: { sh: 1.3, el: h === "point" || h === "reach" ? 0.15 : 0.7 }, handR: h }} />
          </svg>
          <div style={{ position: "absolute", bottom: 6, left: 12, background: "#ffffffd9", padding: "2px 10px", borderRadius: 10, fontFamily: "Arial", fontWeight: 800, fontSize: 24 }}>{h}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
export const BodySheet: React.FC = () => <Grid items={BODIES} full />;

export const StyleSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#e9e3d8" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, padding: 14, height: "100%", boxSizing: "border-box" }}>
      {STYLES.map(([name, look], i) => (
        <div key={name} style={{ position: "relative", background: "linear-gradient(#bfe6f5, #eaf7fb)", borderRadius: 16, overflow: "hidden" }}>
          <svg viewBox="-370 -930 740 600" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid slice">
            <Rig who="teo" look={look} expr="happy" pose={{ view: "tq", gaze: [0.4, 0], armR: { sh: 0.5, el: 1.0 }, handR: "open" }} x={-165} y={0} scale={1} />
            <Rig who="mara" look={look} expr="happy" pose={{ view: "tq", flip: true, gaze: [0.4, 0] }} x={175} y={30} scale={1} />
          </svg>
          <div style={{ position: "absolute", bottom: 8, left: 12, background: "#ffffffd9", padding: "2px 10px", borderRadius: 10, fontFamily: "Arial", fontWeight: 800, fontSize: 24, color: "#1f2a30" }}>{i + 1}. {name}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
