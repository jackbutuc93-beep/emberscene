# EMBERSCENE — STYLE BIBLE (draft v1, 2026-11-21)

Proposal. It does not replace the root `STYLE_BIBLE.md` until you approve it.
It is built from the analysis in `analysis/` and from the decisions already approved: calm camera, Tide look, Tide cards, no subtitles in 16:9, 9:16 Shorts with captions, user's own voice, real SFX, and a pose/camera change every 10–15 s.

Look: 2D characters + subtle 2.5D depth + cinematic environments. No volumetric 3D characters.

---

## 1. CHARACTERS

### Proportions (measured and target)
| Measure | Now (measured from frames) | Target |
|---|---|---|
| Total height | ~7–7.5 heads (slim V2) | **6–6.5 heads** (adult, stylized, not too tall) |
| Head | small relative to the body | head = **1/6.25** of the height (±0.25) |
| Legs (hip→sole) | ~50 % of the height | **45–48 %** |
| Arms | elbow at the waist, hand at mid-thigh | same (keep) |
| Shoulders | narrow | Teo: 1.6 heads; Mara: 1.45 heads |

- Teo and Mara keep the same scale in the same shot; the height difference is fixed (Mara ≈ 0.96 × Teo).
- **Both legs and feet always exist in the rig.** If the framing cuts them, the cut is at the waist or chest (medium shot), **never at the knees, ankles or the bottom of the head**.
- An automatic test checks each proportion before rendering (see QUALITY §5.2).

### Outline
- Current no-outline style (approved): shapes defined by colour plus one thin interior line on the face.
- If the outline is turned on: a single thickness, 3 px at 1080p for a character at 1.0 scale, scaled with the character. Never a thickness that varies from frame to frame.
- Facial lines (brows, mouth) are 0.6–1 × K, the same as in the rig.

### Expressions
- 7 base expressions: neutral, happy, surprised, sad, determined, curious, angry/scream.
- Order of the change: **brows → eyes → mouth**, 0–3 frames apart.
- Expression change lasts 8–12 frames. The mouth morphs (`mouthMorph`) and never snaps.
- Maximum one expression change every 1.5 s, except surprise reactions.
- Speech: visemes only on the speaking character; the listener reacts (blink, slight nod).

### Poses and gestures
- **Allowed:** standing, sitting on the raft, sitting with knees up, pointing, waving, holding a rope or bottle, tilting the head, turning the torso slightly.
- **Only with a check** (a dedicated proof render plus a contact sheet before use): lying down, kneeling, getting up from the floor, a full walk, a jump into the water.
- **Forbidden** unless explicitly requested: running, falling, fast acrobatics.
- One gesture = anticipation (3–4 frames) → action (8–14 frames) → settle (6–10 frames).

---

## 2. ENVIRONMENTS

- **Palettes:** the 8 from `Set.tsx` (day, dawn, noon, sunset, night, storm, tide, grey). The **tide** palette is the default. Each chapter has a short colour script, for example day → sunset → night, and the palette changes only through a cut, fade or dip, never abruptly.
- **Light:** one main source (sun or moon) whose position matches the palette. Warm light on characters from the sun's side; the grade (warm soft-light + vignette + grain 0.09) is the same for the whole episode.
- **Depth:** 4–6 layers: sky (d 0.05) → clouds (0.2) → far sea (0.35) → mid sea (0.7) → action (1.0) → near sea / debris (1.1–1.35). Atmosphere lightens and desaturates distant layers.
- **Shadows:**
  - Only flat contact shadows: a thin, wide ellipse under the raft or objects, opacity ≤ 0.35, the colour of the water darkened. **No round shadows on the face or body.**
  - Shading on characters (if added) is a clipPath inside the character's silhouette. It never goes past the outline.
- **Set pieces:** raft, bottles, tarp, crate, rope, whale shark, debris. Each object has a **persistence**: once it appears, it stays until the story removes it (state tracked in the plan, not per shot).

---

## 3. CAMERA

| Rule | Value |
|---|---|
| Shot length | **4–6 s** (minimum 2 s; only a quick storm montage goes below) |
| Allowed moves | static; slow push-in or pull-out; parallax drift (proof, not yet approved) |
| Zoom | ≤ **5 %** over the whole shot, ease in-out |
| Lateral drift (parallax) | ≤ 70 px / 6 s (≈ 12 px/s); **max speed 20 px/s** |
| Stability | no shake, no handheld, no whip, no punch |
| Transitions | cut (default); **fade** 20 frames only between near-identical framings; **dip** 14+14 frames for day or chapter jumps; fade to black at the end |
| Rhythm | change camera or pose every 10–15 s; never more than 15 s without a visual change |
| Framing | the face is never cropped; the character takes 35–70 % of the frame height in medium shots; a 5 % margin to the edges for faces and hands |

---

## 4. ANIMATION

- **Timing:** 30 fps. Teo: 8–12 frame actions; Mara: 12–18 frames. The visual beat lands on the key word (Whisper timestamps).
- **Easing:** `EASE.inOut` for all moves; `EASE.out` for appearances; linear is never used for character motion.
- **Anticipation:** 3–4 frames in the opposite direction before an arm or torso gesture.
- **Follow-through:** hair, scarf and rope settle 4–8 frames after the body stops (small overshoot ≤ 5°).
- **Idle (always active):**
  - breathing 1–2 % over ~3 s (noise2D, not a perfect sine);
  - a blink every 3–5 s, lasting 3 frames;
  - sway following the raft's rock;
  - the eyes look at whoever is speaking.
- **Emotional reaction:** brows (0 frames) → posture (2–4 frames) → mouth (4–6 frames); hold the reaction ≥ 1 s.

---

## 5. QUALITY (automatic tests)

1. **No unintended flicker:** an A-B-A pattern (frame differs from both neighbours while the neighbours match each other) = error. Script: `analysis/scripts/scan.py`.
2. **No deformation:** proportion test on the rig (head/height, legs present, joints connected) at each pose used.
3. **No clipping:**
   - Shadows and shading are clipped to the silhouette.
   - Faces and hands stay inside the 5 % margin of the frame.
   - Objects are not cut at the frame edge except in intentional framings.
4. **No disappearing objects:** the persistent state from the plan is checked across consecutive shots (same object, same position, unless the story moves it).
5. **No aggressive camera:** no sustained run of large frame-to-frame diffs outside cuts; no shot under 2 s outside montages.
6. **Final contact sheet:** every 2 s (Shorts) or 10 s (long videos), plus a separate first-3-seconds strip, reviewed before export.
