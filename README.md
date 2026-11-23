# EmberScene: clean project

A clean copy of the "new video" project, made on 2026-11-23. The old folder is kept as a backup.

## Structure
- `src/episode/`
  - `index.tsx`: the 16:9 episode renderer (`Episode.tsx`).
  - `Shorts.tsx`: 9:16 Shorts.
  - `Hook.tsx`: the Part 1 hook.
  - `HookP2.tsx`: the Part 2 hooks and thumbnails.
- `src/story2d`, `src/studio2d`: Teo and Mara (the rig), the raft and the sea.
- `src/cards`: Tide cards (cards demo: `src/cards/index.tsx`).
- `public/episodes/adrift-p1|p2`: voice, captions, plans (`plan-p1-v2.json`, `plan-p2-v2.json`).
- `public/sfx-lib`: real SFX.
- `scripts/`:
  - `episode.mjs`: new voiceover → Whisper timing.
  - `render-episode.mjs`: final render plus -14 LUFS normalisation.
- `tools/`: QC.
  - `scan.py`: flicker and abrupt motion.
  - `sheets.py`: contact sheets.
  - `plan_lint.py`: framing and shot length.
- `docs/`: bibles, scripts, technical rules, the QC report.
- `final/`: finished videos (Part 1 v2, Part 2 with hook, Shorts v2), thumbnails, YouTube texts.
- `brand/`: logo, banner, watermark.

## Commands
```powershell
node scripts/render-episode.mjs adrift-p2 --plan plan-p2-v2.json
```
```powershell
npx remotion render src/episode/Shorts.tsx short-rain out/short-rain.mp4
```
```powershell
python tools/plan_lint.py public/episodes/adrift-p2/plan-p2-v2.json 499
```
