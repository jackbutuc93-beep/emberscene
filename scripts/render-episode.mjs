// Render + master an episode:  node scripts/render-episode.mjs <id> [--no-subs]
// 1. Remotion render (video + mixed audio)  2. two-pass EBU R128 loudness normalisation to YouTube level
//    (-14 LUFS integrated, -1 dBTP), AAC 320 kbps, 48 kHz. Output: out/<id>/<id>-final.mp4 (never overwrites: adds a timestamp).
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const id = process.argv[2];
const subs = process.argv.includes("--subs"); // subtitles OFF by default (user preference)
const pi = process.argv.indexOf("--plan"), planFile = pi > 0 ? process.argv[pi + 1] : undefined; // e.g. --plan plan-p1-tide.json
if (!id) { console.error("usage: node scripts/render-episode.mjs <id> [--no-subs]"); process.exit(1); }
const dir = path.join("out", id); fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const raw = path.join(dir, `${id}-raw-${stamp}.mp4`), fin = path.join(dir, `${id}-final-${stamp}.mp4`);
const propsFile = path.join(dir, "props.json");
fs.writeFileSync(propsFile, JSON.stringify({ id, subtitles: subs, ...(planFile ? { planFile } : {}) }));
execFileSync("npx", ["remotion", "render", "src/episode/index.tsx", "episode", raw, `--props=${propsFile}`, "--audio-codec=aac", "--audio-bitrate=320k"], { stdio: "inherit", shell: true });

// loudness: pass 1 measures (ffmpeg prints the JSON to stderr), pass 2 applies linear normalisation
const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", raw, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
const af = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`;
execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", raw, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "320k", fin]);
console.log("final:", fin, `(input ${m.input_i} LUFS -> -14 LUFS)`);
