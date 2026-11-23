# STYLE BIBLE – ADRIFT (v2)

**Ales de utilizator (2026-11-16): stilul 7 „Clay Diorama”** – materiale mate ca plastilina, fără contur, lumină caldă și moale.
Setări în cod: `VARIANTS[6]` din `src/adrift/StyleVariants.tsx` (look: clay, outline 0; cer #e8d3b9; mare #4fa3a5; soare #ffe6c4).
**DECIS (2026-11-16): lumea REALISTĂ este stilul oficial** – mod „realistic” în `DetailTest` (`real: true`): cer fizic (drei Sky) + reflexii din cer (Environment), apă netedă și lucioasă cu spumă moale, scânduri cu muchii rotunjite, nituri, frânghii. Personajele rămân în stil Noodle, mate. Teste: `frames/real-*.png`.
Secțiunile de mai jos despre contur sunt înlocuite de această alegere: fără contur (outline 0).

Numele stilului: **„Carved Sea”** – o lume 3D low-poly cu fețe plate (flat-shaded), ca sculptată în lemn,
cu personaje rotunjite, prietenoase, și o paletă restrânsă inspirată de lemn ud, mare și soare.
Decizii originale: nu e stick-figure, nu e realist, nu e stil de joc; e o diorama caldă, ușor de citit pe telefon.

## 1. Personaje
- Proporții „chunky”: capul ≈ 1/3 din înălțime; mâini simple (fără degete detaliate).
- Fețe minimale: ochi ovali negri, sprâncene groase (purtătoarele principale ale emoției), gură simplă.
- Contur subțire închis (#1d1a17) DOAR pe personaje → ies mereu în evidență față de decor.
- Fiecare personaj are o culoare-semnătură (Mara = verde-marin, Teo = portocaliu-coral).

## 2. Paleta
| Rol | Culoare |
|---|---|
| Ocean adânc | #0f4c5c |
| Ocean suprafață | #2a8c99 |
| Spumă / creste | #e6f2ef |
| Lemn ud | #8a5a3b |
| Lemn uscat | #c08b5c |
| Cer zi | #a9d6e5 |
| Soare / accent cald | #f4b860 |
| Mara (semnătură) | #2f6f62 |
| Teo (semnătură) | #e2725b |
| Contur / cerneală | #1d1a17 |
Regulă: maximum 2 culori saturate într-un cadru; restul desaturat.

## 3. Contur
Contur prin „inverted hull” (copie ușor mărită, fețe din spate, culoare cerneală) pe personaje și pe piesele plutei. Decorul (ocean, cer, nori) fără contur.

## 4. Mediu
Low-poly cu fațete vizibile; ocean din fațete animate; nori ca forme rotunjite simple; fără texturi fotografice.

## 5. Lumină
Un singur „soare” principal (directional) + lumină de cer (hemisferă) care colorează umbrele în albastru.
Fiecare capitol are o temperatură de culoare (dimineață rece, amiază albă, apus auriu, noapte albastru adânc, furtună gri-verde).

## 6. Umbre și materiale
Umbre clare, puțin estompate. Materiale mate (rugozitate mare); lucios doar apa și plasticul.

## 7. Limbajul camerei
- Cadrul-semnătură: **top-down** pe plută, cu contorul „PLATFORM: N PIECES”.
- Contrast de scară: plan foarte larg (plută minusculă) ↔ close-up pe fețe.
- Mișcări lente, motivate; camera „plutește” ușor (bob mic) ca să simți marea.
- Cadre de sub apă privind în sus spre silueta plutei.

## 8. Principii de animație
Vezi ANIMATION_BIBLE.md. Pe scurt: mișcare intenționată, pauze lungi, ease-in-out, nimic nu se mișcă fără motiv.

## 9. Compoziție
16:9: pluta în treimea de jos, orizontul pe treimea de sus sau de jos, niciodată la mijloc.
9:16: subiectul în centru, captions în treimea de jos, text ON-SCREEN sus.

## 10. Tranziții
Prin elemente naturale: val care acoperă cadrul, picătură care cade, fulger alb, coborâre sub apă, match cut pe ochi/mâini.

## 11. Efecte vizuale
Spumă stilizată (particule albe simple), ploaie din linii, fulgere ca flash de ecran, raze de lumină sub apă.

## 12. Identitate audio
Temă principală simplă (un motiv de 4 note), ticăit de ceas pentru „timpul care trece”, „thunk” de lemn la fiecare piesă nouă de plută,
sunete înfundate sub apă. Muzică originală sau licențiată.

## Decizie 2026-11-16 — lumea în stil What-If (provizoriu)
- **Lumea/mediul:** stilul What-If: mare albastră plată, cer uni cu nori-cerc și soare simplu, dungi de spumă care alunecă, plută din scânduri drepte cu spumă albă dedesubt, culori vii, contrast mare. Referință: `src/concepts-2d/StyleCompare.tsx` (`look="whatif"`), cadru `renders/compare/whatif.png`.
- **Personajele:** rămân Driftline Refined (2D, aprobat) — Mara și Teo neschimbați.
- **Povestea/ideea:** neschimbate (ADRIFT, scenariile aprobate).
- **Format:** 16:9, fără subtitluri, fără efectele sonore generate.
- Decizie provizorie: se poate schimba mai târziu.
