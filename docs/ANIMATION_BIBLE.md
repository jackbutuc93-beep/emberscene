# ANIMATION BIBLE – ADRIFT (draft v1)

## Reguli tehnice (obligatorii)
- Totul derivă din `useCurrentFrame()` → randări identice de fiecare dată. Fără `useFrame`, `Clock`, `Math.random()` (se folosește `random(seed)` din Remotion).
- Valurile: funcție pură `waveHeight(x, z, t)`; pluta și personajele urmează valul (bob + înclinare).

## Personaje
- Respirație: corpul se scalează 1–2% pe un ciclu de ~3 s, mereu (nimic nu e complet static).
- Clipit: la 3–5 s, 3 frame-uri.
- Gesturi: ease-in-out (cubic); anticipație scurtă înainte de mișcări mari; settle (mică depășire) la final.
- Teo: mișcări mai rapide (8–12 frame-uri), mai ample. Mara: mai lente (12–18 frame-uri), mai mici.
- Emoția vine întâi din sprâncene, apoi din postură, apoi din gură.

## Cameră
- Fiecare cadru are un „bob” mic de cameră (0,02–0,05 unități) legat de val.
- Mișcări lungi: Easing.inOut(Easing.cubic). Fără mișcare de cameră fără motiv.
- Durată minimă a unui cadru: 2 s (excepție: montaje și furtună).

## Obiecte
- Piesă nouă de plută: apare plutind, e trasă, se „așază” cu un mic recul + sunet „thunk”.
- Picături, ploaie, spumă: particule cu seed fix.

## Tranziții
Val care acoperă cadrul (8–12 frame-uri), flash alb (fulger, 2–4 frame-uri), coborâre sub apă, match cut, fade la negru doar la final de parte.

## Timing
30 fps. Narațiunea dictează ritmul: momentul vizual-cheie cade pe cuvântul-cheie (sincronizat cu timestamp-urile cuvintelor).
