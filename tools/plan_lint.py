"""Plan linter (calm episodes). Flags, before rendering:
 - LEGCUT: frame bottom falls between hip and feet of characters on the raft (knee/shin crop)
 - SHORT: shot < 4 s (calm camera rule)
 - LONG: shot > 15 s with no transition/pose change listed (rhythm rule)
 - NEARCUT: a timed key within 0.1 s of a cut (now auto-snapped by Episode.snapToCuts, reported for info)
Geometry from Episode.tsx: RAFT.y=870, feet y≈858, hip≈678 (SC=0.42). Usage: python plan_lint.py <plan.json> [duration]"""
import json, sys
FEET, HIP = 858, 678
plan = json.load(open(sys.argv[1], encoding="utf-8")); S = plan["shots"]; dur = float(sys.argv[2]) if len(sys.argv) > 2 else S[-1]["start"] + 5
bad = 0
for i, s in enumerate(S):
    e = S[i + 1]["start"] if i + 1 < len(S) else dur; L = e - s["start"]
    for c in (s.get("cam") or [])[:1]:
        bottom = c["cy"] + 540 / c["z"]
        if HIP + 25 < bottom < FEET + 10: print(f"LEGCUT  shot {i:3d} {s['camera']:<18} t={s['start']:7.2f} bottom={bottom:.0f} (hip {HIP}, feet {FEET})"); bad += 1
    if plan.get("camera") == "calm" and L < 4: print(f"SHORT   shot {i:3d} {s['camera']:<18} {L:.1f}s")
    if L > 15: print(f"LONG    shot {i:3d} {s['camera']:<18} {L:.1f}s")
cuts = [s["start"] for s in S]
def walk(v):
    global bad
    if isinstance(v, list):
        if len(v) >= 2 and isinstance(v[0], (int, float)) and any(0 < abs(v[0] - c) <= 0.1 for c in cuts): near.append(v[0])
        for x in v: walk(x)
    elif isinstance(v, dict):
        for k, x in v.items():
            if k != "cam": walk(x)
near = []
walk({k: v for k, v in plan.items() if k != "shots"}); [walk(s.get("chars")) for s in S]
print(f"NEARCUT {len(near)} keys within 0.1 s of a cut (auto-snapped by Episode.snapToCuts)")
print(f"-- {bad} LEGCUT warnings (seated characters can be false positives: check the frame)")
