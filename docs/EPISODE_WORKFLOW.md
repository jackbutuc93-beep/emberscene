# ADRIFT – flux de lucru pentru fiecare episod

Vocea e întotdeauna a ta. Fluxul nu generează și nu modifică narațiunea.

## O singură dată
```
node scripts/setup-whisper.mjs        # whisper.cpp + modelul small.en, local (deja instalat)
```

## Pentru fiecare video
1. **Scenariul** – îl scriem împreună.
2. **Vocea** – înregistrezi narațiunea și îmi trimiți fișierul (.wav, .mp3 sau .m4a).
3. **Import + transcriere**
   ```
   node scripts/episode.mjs <id> "<cale-voce>"
   ```
   Rezultatul ajunge în `public/episodes/<id>/`:
   - `voice.wav` – vocea ta, convertită doar ca format, la 48 kHz;
   - `captions.json` – cuvintele cu momentul exact în care sunt rostite, transcrise local;
   - `meta.json` – durata;
   - `plan.json` – o ciornă cu un cadru pe propoziție, dacă nu există deja un plan.
4. **Regia** (`plan.json`), cu toate timpii în secunde din audio:
   - `shots[]` – fiecare cadru are:
     - `start`;
     - `camera`: `wide-push`, `wide-pan`, `wide-static`, `medium-both`, `medium-teo`, `medium-mara`, `closeup-teo` sau `closeup-mara`;
     - `transition`: `cut`, `fade`, `wipe` sau `punch`;
     - `chars`, adică ce face fiecare personaj:
       - `expr`: [[t, "curious"]];
       - `gestures`: [[t, "point", durată]];
       - `look`: [[t, privire x, privire y, înclinare]];
       - `talk`: [[de la, până la]].
   - `cast` – din ce secundă apare fiecare personaj.
   - `ambience` și `sfx[]` – fișiere din `public/sfx-lib/`.
   - Gesturile disponibile: point, shrug, open, bothOpen, think, wave, startle, fist, chest, scratch și crossed.
5. **Previzualizare**: `npx remotion studio src/episode/index.tsx`, compoziția `episode`, cu props `{ "id": "<id>" }`.
6. **Export final**
   ```
   node scripts/render-episode.mjs <id>          # fără subtitrări (implicit)
   node scripts/render-episode.mjs <id> --subs   # doar dacă vrei subtitrări
   ```
   Rezultatul e `out/<id>/<id>-final-<dată>.mp4`. Exportul nu suprascrie nimic.

## Mixajul audio
| Strat | Nivel |
|---|---|
| Vocea ta | 100%, nemodificată |
| Ambianță (valuri, vânt) | 16%, coboară la 7% când vorbești |
| Efecte sonore | maximum 45%, coborâte cu încă 30% sub voce |
| Master | două treceri EBU R128 → −14 LUFS, vârf −1 dBTP, AAC 320 kbps, 48 kHz (nivelul YouTube) |

## Efecte sonore
- Se iau doar fișiere reale, cu licență liberă, descărcate în `public/sfx-lib/`.
- Pentru fiecare fișier îți arăt înainte sursa, licența și mărimea.
- Nu se folosesc sunete generate sintetic.

## Stil
- Codul e în `src/story2d` (`CHOSEN` = fără contur + corpuri foarte slabe).
- Rigul comun e `src/studio2d/TeoRig2D.tsx`.
