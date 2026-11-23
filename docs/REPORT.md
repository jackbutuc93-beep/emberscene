# EmberScene — visual analysis report (2026-11-21)

Read-only analysis. Nothing in the project was changed.

## Method
- `scripts/scan.py` (FFmpeg only, no new installs) went through **all 194 MP4 files** (renders/, out/, reviews/, proofs/), every frame. Per frame it measured:
  - brightness, contrast and saturation;
  - frame-to-frame difference;
  - scene changes;
  - isolated A-B-A "pops" (flicker);
  - sustained runs of strong motion.
- Results: `scan.csv` (one row per video) and `stats/*.json` (details plus timestamps).
- `scripts/sheets.py` made contact sheets for 5 key videos: every 10 s for long videos, every 2 s for short ones, plus the first 3 s. Output in `sheets/`.
- Suspect frames are extracted in `frames/`.

## Main measurements
| Video | Duration | Brightness | Contrast | Saturation | Cuts | Avg shot | Shots <2 s | Flicker | Strong motion |
|---|---|---|---|---|---|---|---|---|---|
| P1 final + hook | 10:05 | 120 | 105 | 19 | 72 | 8.3 s | 18 (storm lightning) | **1 real** (3:20.5) | 29 (lightning, dips, final fade) |
| P2 Ch.1 preview v2 | 1:25 | 114 | 111 | 20 | 12 | 6.6 s | 0 | 0 | 0 |
| P2 Ch.2 preview v2 | 1:05 | 143 | 129 | 22 | 2 | **21.8 s** | 0 | 0 | 0 |
| Short storm | 0:45 | **55** | 56 | 14 | 15 | 2.8 s | 11 | 0 | 0 |
| Short hook / rain / shark | 0:30–0:58 | 120–126 | 135–150 | 15–20 | 0–4 | 6–56 s | 0 | 0 | 2 (fade in/out) |

Across all 194 videos, 19 have flicker candidates. Most are old versions or tests from before the calm camera.

## A. Problems confirmed by measurement
| Scene | Problem | Likely cause | Fix | Priority |
|---|---|---|---|---|
| P1 3:20.5 (Mara "Hold this edge") | **A wrong single frame**: empty sea, Mara's head at the bottom, bubble moved (`frames/flk200.png`) | Boundary frame between shots: the camera of the next shot is applied 1 frame early, while the bubble and character use the old shot | Make the shot index and the camera use the same frame (rounding `start*FPS`); add an automatic A-B-A test | **1 – render error** |
| P1 7:37–8:38 (storm) | 7 white flashes of 3 frames (`frames/micro459.png`) | **Intentional** (lightning) | Keep it; check it stays ≤ 3 flashes/s (photosensitivity) — it does | info |
| P2 Ch.2 | Average shot of 21.8 s, only 2 cuts in 65 s | Plan with very long shots | Break it into 4–6 s shots or change pose every 10–15 s (memory rule) | 4 – camera / rhythm |
| Short storm | Brightness 55/255, contrast 56 (very dark) | Night/storm palette + rain | Lift the characters (rim light / lighter grade) so they read on a phone | 6 – light |
| P1 2:10–2:50 (night) | Brightness drops suddenly from ~145 to ~60 at a cut | Day → night by a plain cut | Use `dip` (now available) for time jumps | 5 – transition |

## B. Visual observations (contact sheets, not measured)
| Scene | Problem | Likely cause | Fix | Priority |
|---|---|---|---|---|
| P1 1:10, 1:50, 4:10 | Characters cut **at the knees/thighs** | Medium shot that is too tight for standing characters | Framing rule: cut at the waist or full figure, never at the knees | 2 – characters |
| P1 3:10, 3:40, 5:00 | Teo's head peeks in from the bottom of the frame; only legs at the left edge | Character outside the "safe" framing (the face-safe rule only applies to Teo in the main shot) | Extend the framing check to both characters and to edges | 2 |
| P1 5:10–5:20 | Characters lying down (risky pose) | `lieProne` pose | "Only with a check" pose; looks OK but stiff | 7 |
| Standing characters | ~7–7.5 heads tall (slim V2) | Approved "very slim" style | Your new brief says "not too tall" → **needs your decision** (6–6.5 heads?) | standard → approval |
| P2 Ch.1 0:20–0:34 + Short storm 0:10–0:18 | 8–14 s underwater without characters, almost static | Long plan for the whale shark / wave | Add a cut or a character reaction mid-way | 4 |
| Short storm 0:06–0:08 | Speech bubble very close to the caption | Both use the bottom area | Rule: the bubble stays in the top half in 9:16 | 6 |
| P2 Ch.1 0:00 | Very strong vignette on the recap (dark corners) | Recap grade | Tone down the vignette to the episode level | 6 |
| Shadows | No round shadows on the face; contact shadows are flat | OK in the current version | — | ok |
| Limbs | Connected in all checked frames | OK | — | ok |

## C. What is good now
- Calm camera respected: 0 isolated flicker and 0 strong motion in the P2 previews.
- Consistent colour: saturation 19–22 across all episodes (the Tide look holds).
- No accidental black frames outside the intended dips and fades.
- The first 3 seconds of P1 are calm: luma 144, motion 0.27, no cut. The split hook is stable.

## D. Research — 16 public sources and the technique to learn
1. Klaus — 2D lighting and texturing on characters so they don't look like "stickers" on the background: https://beforesandafters.com/2019/11/14/heres-what-made-the-2d-animation-in-klaus-look-3d/
2. Klaus — look development, 3D effects simulated in 2D: https://80.lv/articles/klaus-look-development-simulating-3d-effects-in-2d/
3. Klaus — Sergio Pablos on volumetric lighting in 2D: https://www.toonboom.com/?p=12158
4. Hilda (Mercury Filmworks) — limited palette, flat shapes, lighting simplified on purpose, key art before production: https://www.toonboom.com/mercury-filmworks-on-the-craft-and-magic-behind-hilda
5. Wolfwalkers — staging shots, layered backgrounds: https://beforesandafters.com/2020/12/16/wolfwalkers-and-the-art-of-staging-shots/
6. Wolfwalkers — 2D/3D hybrid, 3D as reference only: https://cgw.com/Publications/CGW/2021/Jan-Feb-March-2021/Between-Two-Worlds.aspx
7. Toon Boom Harmony — multiplane: complete layers on the Z axis, "Maintain Size": https://docs.toonboom.com/help/harmony-20/premium/staging/set-up-multiplane.html
8. Kurzgesagt — voice gives the timing, visual metaphor per scene: https://kurzgesagt.org/youtube/
9. 2.5D parallax for music artists — filled-in layers behind elements: https://80.lv/articles/inside-the-making-of-2-5d-parallax-animation-for-music-artist
10. Duolingo — visemes timed from audio, a state machine for the mouth: https://blog.duolingo.com/world-character-visemes
11. Rive — Duolingo's Lily: expressions + lip sync in a state machine: https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life
12. Rive forum — separate visemes from expressions (a full smile blocked lip sync): https://rive.app/community/forums/support/fsnLLkXUaA62/blending-between-inputs/ftNEp8TkjtJb
13. Adobe Character Animator — viseme set and manual correction: https://www.adobe.com/learn/adobe-character-animator/web/lip-sync-mouth-shapes
14. Spine — breathing idle loop separate from the main idle (Owl example): https://jp.esotericsoftware.com/spine-examples-owl
15. Color script — light and colour planned per emotional beat: https://studio.blender.org/blog/color-scripting/
16. LottieFiles — easing: ease-in-out by default, Sine for calm motion; every move must have a purpose: https://lottiefiles.com/blog/working-with-lottie-animations/easing-editor-give-your-animations-the-flow-they-deserve

## E. Changes with the biggest impact (in order)
1. **Fix the shot-boundary bug** (one wrong frame at a cut) plus an automatic A-B-A test after every render. It is cheap and removes a visible error.
2. **Framing rule for both characters**: no knee cuts, no "head peeking from the bottom". It is the most frequent visual defect.
3. **Rhythm**: P2 Ch.2 and the underwater stretches need cuts or reactions every 10–15 s.
4. **Day/night transitions with `dip`**: already implemented, only needs using in plans.
5. **Light on characters in night scenes** (soft rim light inside the silhouette, inspired by Klaus): characters read in the dark Short.
6. **Colour script per chapter** (already partly there with the palettes): written down in the plan.
7. **Proportions 6–6.5 heads**: only if you approve the standard change.
