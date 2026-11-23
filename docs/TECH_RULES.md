# EmberScene — validated technical rules (from the v1 → v2 fixes, 2026-11-21)

These are technical rules only. The visual standards are unchanged; changing them needs approval.

## R1. Cuts and staging change on the same frame (automatic)
- **Problem (v1, P1 3:20):** a character or place key at 196.50 s and a cut at 196.52 s → for 1 frame the new staging is seen through the old camera.
- **Fix (in code, automatic):** `snapToCuts()` in `src/episode/Episode.tsx`, called in `calcEpisode`:
  - rounds every cut to a whole frame;
  - aligns onto the cut any key within 0.1 s of it.
- **Test:** `analysis/scripts/scan.py` reports isolated A-B-A frames (`flicker_spikes`). Required: 0, outside intentional lightning.

## R2. No knee or shin crops
- **Problem (v1, 7 shots):** standing characters cut between the hip and the feet.
- **Rule:** for standing characters, the frame bottom is either **below the feet** (full figure) or **above the hip** (mid-torso / chest). Never in between.
  - Medium standing shot: `z ≤ 2.4`, `cy ≈ 680`.
  - Close shot: `cy = 650 − 540/z` (cut at mid-torso).
- **Test:** `python analysis/scripts/plan_lint.py <plan> <duration>` → `LEGCUT`. Run it before every render. For seated characters, check the frame by eye.

## R3. No head peeking in from the bottom of the frame
- **Problem (v1, shots 34, 42):** in a close-up on one character, the other character's head appears in a bottom corner.
- **Rule:** in a close-up, a second character is either fully out of frame or framed from the chest up. Otherwise use a two-shot (`z ≈ 2.3`, `cy ≈ 660`).
- **Test:** the per-shot contact sheet (one frame per shot, labelled with its number) is checked before the final render. `analysis/shots/` shows how it is made.

## R4. Day/night jumps
- Use `"transition": "dip"` on the shot that starts the jump. Available in calm mode.

## R5. Checks before every final render
1. `plan_lint.py`: 0 real LEGCUTs, and shots under 4 s only when intentional.
2. Per-shot contact sheet.
3. After rendering: `scan.py` (A-B-A flicker, strong motion) and `sheets.py` (every 10 s + the first 3 s).
4. Before/after comparison for every changed scene.
