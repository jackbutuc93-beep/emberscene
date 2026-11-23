---
name: animatie-3d
description: Creează de la zero o animație video 3D (Three.js + Remotion, cu captions și audio) pornind de la MASTER PROMPT-ul utilizatorului. Folosește când utilizatorul cere o animație nouă, o scenă 3D, un video, sau dă un master prompt completat.
---

# Animație 3D de la zero – flux de lucru

Proiect: `C:\Users\jackb\new video` (Remotion 4 + @remotion/three + @react-three/fiber + drei + @remotion/captions).
Vorbește cu utilizatorul în română.

## Pasul 0 – Scenariu ScriptForge
Dacă există `scripts/<slug>.md` (de la skill-ul `scriptforge`), folosește-l în locul master prompt-ului:
secțiunile devin scene, [SCENE 3D] = ce construiești, [ON-SCREEN] = text mare, [NARRATION] = captions.
Construiește atât `<slug>` (16:9) cât și `<slug>-short` (9:16). Respectă stilul din scriptforge (Preferințe salvate).

## Pasul 1 – Master prompt
Citește `master-prompt.md` (din folderul acestui skill). Dacă utilizatorul nu a dat toate câmpurile,
completează câmpurile lipsă cu valori implicite rezonabile și spune-le într-o listă scurtă — nu bloca
lucrul cu întrebări, decât dacă lipsește ideea de bază (subiectul).

## Pasul 2 – Plan de cadre (shot plan)
Împarte durata în scene: pentru fiecare scenă → interval de frame-uri, ce se vede, mișcarea camerei,
textul/caption-ul. Arată planul pe scurt, apoi construiește.

## Pasul 3 – Construiește
Creează un folder nou `src/videos/<slug>/` cu:
- `index.tsx` – compoziția principală (`<AbsoluteFill>` + `<Sequence>` pentru fiecare scenă + `<Audio>` dacă există)
- `Scene<N>.tsx` – câte un fișier pe scenă, fiecare cu propriul `<ThreeCanvas>`
- `captions.ts` – lista de `Caption[]` (startMs/endMs/timestampMs/confidence)
Înregistrează-l în `src/Root.tsx` ca `<Composition id="<slug>" ...>` cu fps/rezoluție/durată din master prompt
(16:9 = 1920x1080, 9:16 = 1080x1920, 1:1 = 1080x1080). Nu șterge compozițiile existente.

### Reguli obligatorii (altfel randarea iese greșit)
- TOATĂ mișcarea vine din `useCurrentFrame()` + `interpolate()` / `spring()`. NICIODATĂ `useFrame`, `Clock`,
  `Date.now()`, `Math.random()` fără seed (folosește `random("seed")` din remotion).
- `<ThreeCanvas width={width} height={height}>` cu dimensiunile din `useVideoConfig()`.
- În interiorul unui `<Sequence>`, `useCurrentFrame()` pornește de la 0 – folosește asta.
- Fonturi/texturi/modele: pune-le în `public/` și încarcă cu `staticFile()`; modele GLB cu `useGLTF` din drei.
- Fără `OrbitControls` sau interacțiune – camera se animă explicit.
- Easing: `Easing.inOut(Easing.cubic)` pentru camera; `spring({frame, fps, config:{damping:200}})` pentru apariții.
- Captions: refolosește stilul din `src/Captions.tsx` (createTikTokStyleCaptions), dar ca componentă cu props `captions`.
- Audio: `<Audio src={staticFile("...")} />`; dacă există voiceover fără timestamp-uri, propune
  `@remotion/install-whisper-cpp` pentru a genera captions automat.

## Pasul 4 – Verifică (QC)
1. `npx tsc --noEmit` din rădăcina proiectului.
2. Randează 3–4 cadre cheie: `npx remotion still <slug> out/<slug>-f<N>.png --frame=<N>` și uită-te la ele
   (compoziție, lizibilitate captions, nimic tăiat, nu e negru). Repară și re-verifică.
3. Randarea finală: `npx remotion render <slug> out/<slug>.mp4` (rulează în fundal; poate dura).

## Pasul 5 – Iterații
Când utilizatorul cere modificări („mai rapid”, „altă culoare”, „schimbă camera în scena 2”), modifică doar
fișierul scenei respective și re-randează doar cadrele afectate pentru verificare.
Dacă utilizatorul spune că un stil/preferință i-a plăcut, adaug-o în secțiunea „Preferințe salvate” din
`master-prompt.md` ca să fie folosită implicit data viitoare.
