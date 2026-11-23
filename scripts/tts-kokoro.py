# Local, free voice-over with Kokoro TTS (Apache 2.0, OK for monetised videos).
#   .kokoro-env\Scripts\python.exe scripts/tts-kokoro.py <VOICEOVER.md> <out.wav> [--voice am_michael] [--speed 0.95] [--limit 600]
# Reads a docs/*-VOICEOVER.md script: skips the intro notes before the first "## " heading,
# drops headings, turns "(pause)" into 1 s of silence and blank lines into 0.6 s.
# --limit N stops after about N characters (for quick voice tests).
# Then: node scripts/episode.mjs <id> <out.wav>
import argparse, re
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR = 24000
ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--voice", default="am_michael")
ap.add_argument("--speed", type=float, default=0.95)
ap.add_argument("--limit", type=int, default=0)
a = ap.parse_args()

lines = open(a.src, encoding="utf-8").read().splitlines()
start = next((i for i, l in enumerate(lines) if l.startswith("## ")), 0)
items, used = [], 0  # ("text", str) | ("sil", seconds)
for l in lines[start:]:
    s = l.strip()
    if s.startswith("#"): continue
    if not s: items.append(("sil", 0.6)); continue
    if re.fullmatch(r"\*?\(pause\)\*?", s, re.I): items.append(("sil", 1.0)); continue
    s = re.sub(r"\*?\(pause\)\*?", "", s, flags=re.I).replace("*", "").strip()
    if s:
        items.append(("text", s)); used += len(s)
    if a.limit and used >= a.limit: break

pipe = KPipeline(lang_code=a.voice[0])  # 'a' = American, 'b' = British
chunks = [np.zeros(int(SR * 1.5), dtype=np.float32)]
for kind, v in items:
    if kind == "sil":
        chunks.append(np.zeros(int(SR * v), dtype=np.float32)); continue
    for _, _, audio in pipe(v, voice=a.voice, speed=a.speed):
        chunks.append(np.asarray(audio, dtype=np.float32))
    chunks.append(np.zeros(int(SR * 0.25), dtype=np.float32))
chunks.append(np.zeros(int(SR * 1.5), dtype=np.float32))
sf.write(a.out, np.concatenate(chunks), SR)
print(f"wrote {a.out}  voice={a.voice}  speed={a.speed}")
