// ADRIFT episode pipeline (reusable for every video).
//   node scripts/episode.mjs <id> <path-to-your-voiceover>
// 1. converts your voice-over (never altered or replaced) to public/episodes/<id>/voice.wav (48 kHz) + a 16 kHz copy for Whisper
// 2. transcribes it locally with whisper.cpp (word-level timestamps) -> public/episodes/<id>/captions.json
// 3. writes public/episodes/<id>/meta.json (duration) and, if missing, a draft shot plan public/episodes/<id>/plan.json
// Then: preview in Remotion Studio (composition "episode") or render with scripts/render-episode.mjs.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { transcribe, toCaptions } from "@remotion/install-whisper-cpp";

const [id, src] = process.argv.slice(2);
if (!id || !src) { console.error("usage: node scripts/episode.mjs <id> <voiceover file>"); process.exit(1); }
if (!fs.existsSync(src)) { console.error("voice-over not found:", src); process.exit(1); }
const dir = path.join("public", "episodes", id);
fs.mkdirSync(dir, { recursive: true });
const voice = path.join(dir, "voice.wav"), v16 = path.join(dir, "voice16k.wav");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ar", "48000", "-ac", "2", voice]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ar", "16000", "-ac", "1", v16]);
const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice]).toString());

console.log("transcribing (local whisper.cpp)...");
const out = await transcribe({ inputPath: path.resolve(v16), whisperPath: path.resolve("whisper.cpp"), whisperCppVersion: "1.5.5", model: "small.en", tokenLevelTimestamps: true });
const { captions } = toCaptions({ whisperCppOutput: out });
fs.writeFileSync(path.join(dir, "captions.json"), JSON.stringify(captions, null, 1));
fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ id, duration: dur, fps: 30 }, null, 1));
fs.rmSync(v16);

const planPath = path.join(dir, "plan.json");
if (!fs.existsSync(planPath)) {
  // draft: one shot per sentence, rotating shot types; edit it to direct the episode
  const shots = []; let start = 0, words = [];
  const types = ["wide-push", "closeup-teo", "medium-both", "wide-pan", "closeup-mara", "medium-teo"];
  captions.forEach((c, i) => {
    words.push(c.text.trim());
    const end = /[.!?]$/.test(c.text.trim()) || i === captions.length - 1;
    if (end) { shots.push({ start: +start.toFixed(2), camera: types[shots.length % types.length], transition: shots.length ? "cut" : "fade", text: words.join(" "), chars: { teo: { expr: [[start, "neutral"]], gestures: [] } } }); start = c.endMs / 1000; words = []; }
  });
  fs.writeFileSync(planPath, JSON.stringify({ set: "ocean", ambience: null, sfx: [], shots }, null, 1));
  console.log("draft plan written:", planPath);
}
console.log(`done: ${captions.length} words, ${dur.toFixed(1)} s`);
