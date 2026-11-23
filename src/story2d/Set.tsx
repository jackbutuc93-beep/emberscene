import React from "react";

// story2d world: layered 2D ocean set with parallax. World space = 1920x1080; the camera looks at (cx,cy) with zoom z.
export type Cam = { cx: number; cy: number; z: number };
/** a layer at depth d (0 = infinitely far, 1 = the action plane, >1 = foreground) */
export const Layer: React.FC<{ cam: Cam; d: number; children: React.ReactNode }> = ({ cam, d, children }) => {
  if (d > 1 && cam.z < 1) d = 1; // zoomed out: foreground stays locked to the action plane
  const zd = 1 + (cam.z - 1) * d, ox = 960 + (cam.cx - 960) * d, oy = 540 + (cam.cy - 540) * d;
  return <g transform={`translate(960 540) scale(${zd}) translate(${-ox} ${-oy})`}>{children}</g>;
};

const OUT = "none"; // style 4: no outlines on props either
export const wavePath = (y: number, amp: number, len: number, ph: number, x0 = -800, x1 = 2800, bottom = 1700) => {
  let d = `M${x0} ${bottom} L${x0} ${y}`;
  for (let x = x0; x <= x1; x += 24) d += ` L${x} ${(y + Math.sin(x / len + ph) * amp + Math.sin(x / (len * 0.43) + ph * 1.7) * amp * 0.35).toFixed(1)}`;
  return d + ` L${x1} ${bottom} Z`;
};

/** colour moods for the ocean set; blend between them over time with mixPal */
export type Pal = { skyTop: string; skyBot: string; sun: string; sunY: number; sunA: number; cloud: string; cloudSh: string; cloudA: number; far: string; farLine: string; mid: string; midLine: string; near: string; nearLine: string; foam: string; fog: number };
export const PALS: Record<string, Pal> = {
  day: { skyTop: "#7cc6ea", skyBot: "#d8f0f7", sun: "#fff6d8", sunY: 210, sunA: 0.95, cloud: "#ffffff", cloudSh: "#eaf6fb", cloudA: 0.95, far: "#3a9cc8", farLine: "#8fd0ea", mid: "#2a86b5", midLine: "#9fdaf0", near: "#1f74a3", nearLine: "#bfe9f7", foam: "#e6f7fc", fog: 0 },
  dawn: { skyTop: "#8fa9bb", skyBot: "#e3e4df", sun: "#fff1d6", sunY: 470, sunA: 0.7, cloud: "#e9edf0", cloudSh: "#cdd7de", cloudA: 0.8, far: "#6e95ab", farLine: "#a9c4d2", mid: "#58819a", midLine: "#a3bfce", near: "#456f89", nearLine: "#b9d0dc", foam: "#dbe7ed", fog: 0.55 },
  noon: { skyTop: "#5db8ea", skyBot: "#f3f6e8", sun: "#fffbe6", sunY: 120, sunA: 1, cloud: "#ffffff", cloudSh: "#eef7fb", cloudA: 0.7, far: "#2f97c9", farLine: "#97d6ee", mid: "#2083b6", midLine: "#a5def2", near: "#1a6fa1", nearLine: "#c4ecf8", foam: "#effafd", fog: 0 },
  sunset: { skyTop: "#5a5f9a", skyBot: "#f6b07a", sun: "#ffd27a", sunY: 480, sunA: 1, cloud: "#f2a07e", cloudSh: "#c9707a", cloudA: 0.9, far: "#4f6f9c", farLine: "#f0a27f", mid: "#3d5b88", midLine: "#d99a86", near: "#2f4a74", nearLine: "#e8b59a", foam: "#f3d6c6", fog: 0.1 },
  night: { skyTop: "#0c1430", skyBot: "#26365e", sun: "#f3f1df", sunY: 170, sunA: 0.9, cloud: "#2b3a60", cloudSh: "#1e2a48", cloudA: 0.6, far: "#1b2b4a", farLine: "#45618c", mid: "#152340", midLine: "#3b5580", near: "#0f1b33", nearLine: "#5f7ea8", foam: "#7f97ba", fog: 0 },
  storm: { skyTop: "#252c33", skyBot: "#56606a", sun: "#cfd6dc", sunY: -300, sunA: 0, cloud: "#3c454e", cloudSh: "#2a3138", cloudA: 0.95, far: "#2c3c47", farLine: "#6f8796", mid: "#22323d", midLine: "#90a8b6", near: "#192731", nearLine: "#d5e2ea", foam: "#e9f0f4", fog: 0.2 },
  tide: { skyTop: "#6fa9b4", skyBot: "#f2d8ae", sun: "#fff1cf", sunY: 330, sunA: 1, cloud: "#fbeedb", cloudSh: "#d9b9a0", cloudA: 0.92, far: "#5f9ea3", farLine: "#f4ead7", mid: "#3c7f88", midLine: "#f4ead7", near: "#25606d", nearLine: "#f4ead7", foam: "#f4ead7", fog: 0.35 },
  grey: { skyTop: "#9aa5ad", skyBot: "#d9dcdc", sun: "#f2f0e6", sunY: 380, sunA: 0.35, cloud: "#c6ccd0", cloudSh: "#aeb6bc", cloudA: 0.9, far: "#667d8b", farLine: "#a9b9c2", mid: "#556c7a", midLine: "#a3b4be", near: "#435966", nearLine: "#c3d0d7", foam: "#dfe6ea", fog: 0.3 },
};
const hx = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, t: number) => "#" + hx(a).map((v, i) => Math.round(v + (hx(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
export const mixPal = (a: Pal, b: Pal, t: number): Pal => {
  const o: Record<string, string | number> = {};
  for (const k of Object.keys(a) as (keyof Pal)[]) { const va = a[k], vb = b[k]; o[k] = typeof va === "number" ? va + ((vb as number) - va) * t : mixHex(va, vb as string, t); }
  return o as Pal;
};
const D = PALS.day;

export const Sky: React.FC<{ t: number; pal?: Pal; stars?: number }> = ({ t, pal = D, stars = 0 }) => (
  <>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.skyTop} /><stop offset="1" stopColor={pal.skyBot} /></linearGradient>
    </defs>
    <rect x={-1200} y={-800} width={4400} height={1800} fill="url(#sky)" />
    {stars > 0 ? (
      <g opacity={stars}>
        {/* Milky Way: soft diagonal band + dense small stars along it */}
        <defs><radialGradient id="mw"><stop offset="0" stopColor="#c9d4f2" stopOpacity={0.32} /><stop offset="0.5" stopColor="#9fb0dd" stopOpacity={0.14} /><stop offset="1" stopColor="#9fb0dd" stopOpacity={0} /></radialGradient></defs>
        <ellipse cx={1000} cy={160} rx={1500} ry={170} fill="url(#mw)" transform="rotate(-14 1000 160)" />
        <ellipse cx={850} cy={190} rx={900} ry={70} fill="url(#mw)" transform="rotate(-14 1000 160)" />
        {Array.from({ length: 420 }, (_, i) => { const u = ((i * 733) % 3000) - 500, v = (((i * 389) % 300) - 150) * (0.4 + ((i * 17) % 10) / 10);
          const a = -14 * Math.PI / 180, x = 1000 + (u - 1000) * Math.cos(a) - v * Math.sin(a), y = 160 + (u - 1000) * Math.sin(a) + v * Math.cos(a);
          return <circle key={`m${i}`} cx={x} cy={y} r={i % 9 === 0 ? 1.8 : 1} fill="#eef2ff" opacity={0.35 + 0.5 * Math.abs(Math.sin(t * 0.8 + i))} />; })}
        {/* an occasional shooting star */}
        {(() => { const c = (t % 9) / 9; if (c > 0.12) return null; const k = c / 0.12, x = 300 + k * 700, y = -120 + k * 260;
          return <path d={`M${x} ${y} l-130 -48`} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={(1 - k) * 0.9} />; })()}
      </g>) : null}
    {stars > 0 ? Array.from({ length: 160 }, (_, i) => { const x = ((i * 977) % 4000) - 1100, y = ((i * 613) % 1100) - 650; return <circle key={i} cx={x} cy={y} r={i % 7 === 0 ? 2.6 : 1.4} fill="#fff" opacity={stars * (0.45 + 0.55 * Math.abs(Math.sin(t * (0.6 + (i % 5) * 0.2) + i)))} />; }) : null}
    <circle cx={1500} cy={pal.sunY} r={70} fill={pal.sun} opacity={pal.sunA} />
    <circle cx={1500} cy={pal.sunY} r={110} fill={pal.sun} opacity={pal.sunA * 0.26} />
    {[[200, 170, 1.0], [820, 110, 0.8], [1250, 260, 0.7], [-300, 240, 0.9], [1900, 140, 1.1]].map(([x, y, s], i) => {
      const xx = ((x + t * (6 + i * 2) + 600) % 3000) - 600;
      return (
        <g key={i} transform={`translate(${xx} ${y}) scale(${s})`} opacity={pal.cloudA}>
          <ellipse cx={0} cy={0} rx={90} ry={34} fill={pal.cloud} /><ellipse cx={60} cy={-20} rx={60} ry={40} fill={pal.cloud} /><ellipse cx={-55} cy={-12} rx={50} ry={30} fill={pal.cloud} /><ellipse cx={20} cy={14} rx={110} ry={22} fill={pal.cloudSh} />
        </g>
      );
    })}
  </>
);
export const FarSea: React.FC<{ t: number; pal?: Pal }> = ({ t, pal = D }) => (
  <>
    <rect x={-1200} y={560} width={4400} height={1200} fill={pal.far} />
    {Array.from({ length: 14 }, (_, i) => { const x = ((i * 233 + t * 12) % 2600) - 400, y = 600 + (i % 4) * 22; return <path key={i} d={`M${x} ${y} q20 -6 40 0`} stroke={pal.farLine} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />; })}
    {pal.fog > 0 ? <rect x={-1200} y={420} width={4400} height={260} fill="url(#fog)" opacity={pal.fog} /> : null}
    <defs><linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={pal.skyBot} stopOpacity={0} /><stop offset="0.55" stopColor={pal.skyBot} stopOpacity={1} /><stop offset="1" stopColor={pal.skyBot} stopOpacity={0} /></linearGradient></defs>
  </>
);
export const MidSea: React.FC<{ t: number; pal?: Pal; amp?: number; calm?: boolean }> = ({ t, pal = D, amp = 1, calm = false }) => (
  <>
    <path d={calm ? wavePath(700, 4 * amp, 240, t * 0.55) : wavePath(700, 10 * amp, 120, t * 1.1)} fill={pal.mid} />
    {Array.from({ length: 10 }, (_, i) => { const x = (((i * 311 - t * 20) % 2800) + 2800) % 2800 - 500; return <path key={i} d={`M${x} ${745 + (i % 3) * 30} q26 -10 52 0`} stroke={pal.midLine} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.6} />; })}
  </>
);
/** near water. Defaults = the original story test; the episode uses calm=true + y below the raft deck. */
export const NearSea: React.FC<{ t: number; pal?: Pal; amp?: number; y?: number; calm?: boolean; dark?: number }> = ({ t, pal = D, amp = 1, y = 900, calm = false, dark = 0 }) => {
  const A = (calm ? 6 : 16) * amp, L = calm ? 280 : 150, S = calm ? 0.8 : 1.6;
  return (
  <>
    <path d={wavePath(y, A, L, t * S)} fill={pal.near} />
    {dark > 0 ? <path d={wavePath(y, A, L, t * S)} fill="#000" opacity={dark} /> : null}
    <path d={wavePath(y - 2, A, L, t * S)} fill="none" stroke={pal.nearLine} strokeWidth={calm ? 4 : 5} opacity={0.8} />
    {Array.from({ length: 9 }, (_, i) => { const x = ((i * 290 + t * (calm ? 14 : 28)) % 2800) - 500; return <ellipse key={i} cx={x} cy={y + 18 + Math.sin(x / L + t * S) * A} rx={calm ? 16 : 22} ry={calm ? 3.5 : 5} fill={pal.foam} opacity={0.85} />; })}
  </>
  );
};

/** side-view 2D raft (planks + ropes); deck top at y=0, centered at x=0 */
export const Raft2D: React.FC = () => (
  <g>
    <path d="M-250 4 L250 4 L236 46 L-236 46 Z" fill="#7a4a24" stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
    {[-180, -60, 60, 180].map((x) => <line key={x} x1={x} y1={8} x2={x - 3} y2={44} stroke="#5f3818" strokeWidth={4} />)}
    <path d="M-262 -14 L262 -14 L254 6 L-254 6 Z" fill="#b07a46" stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
    {[-150, 30, 170].map((x) => <path key={x} d={`M${x} -10 q30 4 60 0`} stroke="#8c5a2c" strokeWidth={3} fill="none" />)}
    {[-200, 200].map((x) => <g key={x}><rect x={x - 8} y={-16} width={16} height={62} rx={4} fill="#d9c08a" stroke={OUT} strokeWidth={3} /><line x1={x - 8} y1={8} x2={x + 8} y2={14} stroke="#a88a52" strokeWidth={3} /></g>)}
  </g>
);
/** floating door seen from the side; top at y=0 */
export const Door2D: React.FC = () => (
  <g>
    <path d="M-150 4 L150 4 L144 30 L-144 30 Z" fill="#6b3f1f" stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
    <path d="M-158 -12 L158 -12 L152 6 L-152 6 Z" fill="#9a6235" stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
    <circle cx={110} cy={-3} r={7} fill="#e2b84a" stroke={OUT} strokeWidth={3} />
  </g>
);

/** Raft v2 (ADRIFT visual improvement): five lashed planks seen slightly from above, end grain, rope bands,
 *  lit top edge, darker hull and a soft contact shadow in the water. Deck top at y=0, centred at x=0. Same geometry in every shot. */
export const Raft2DV2: React.FC<{ waterline?: string }> = ({ waterline = "#103d57" }) => {
  const planks = [-208, -104, 0, 104, 208];
  return (
    <g>
      <ellipse cx={0} cy={44} rx={292} ry={20} fill={waterline} opacity={0.45} />
      {/* hull (front faces of the planks) */}
      <path d="M-262 2 L262 2 L252 40 Q0 50 -252 40 Z" fill="#6e4220" />
      <path d="M-262 2 L262 2 L258 12 L-258 12 Z" fill="#5b3418" />
      {planks.map((x) => <path key={x} d={`M${x - 50} 4 L${x - 49} 40`} stroke="#4c2b13" strokeWidth={3} />)}
      {/* deck */}
      <path d="M-270 -16 L270 -16 L262 4 L-262 4 Z" fill="#a8723f" />
      {planks.map((x, i) => (
        <g key={x}>
          <path d={`M${x - 50} -16 L${x + 50} -16 L${x + 49} 3 L${x - 49} 3 Z`} fill={i % 2 ? "#ad7843" : "#a26b39"} />
          <path d={`M${x - 46} -13 L${x + 46} -13`} stroke="#c99863" strokeWidth={2.5} strokeLinecap="round" />
          <path d={`M${x - 30} -6 q14 3 28 0 M${x + 6} -2 q10 2 20 0`} stroke="#8a5a2e" strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d={`M${x + 50} -16 L${x + 49} 3`} stroke="#6b411f" strokeWidth={3} />
        </g>
      ))}
      {/* rope lashings */}
      {[-176, 176].map((x) => (
        <g key={x}>
          <path d={`M${x - 9} -18 L${x + 9} -18 L${x + 8} 40 L${x - 8} 40 Z`} fill="#d8bf8a" />
          {[-12, -2, 8, 18, 28].map((y) => <path key={y} d={`M${x - 9} ${y} L${x + 9} ${y + 5}`} stroke="#ad9361" strokeWidth={2.5} />)}
        </g>
      ))}
    </g>
  );
};
