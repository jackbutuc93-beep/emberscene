"""Per-video scan with FFmpeg only (no numpy): per-frame luma/sat/contrast, frame-to-frame diff (YDIF),
scene-change scores, isolated diff spikes (flicker candidates). Writes analysis/stats/<name>.json and analysis/scan.csv"""
import json, subprocess, sys, os, re, csv, statistics as st
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ = os.path.dirname(ROOT)
OUT = os.path.join(ROOT, "stats"); os.makedirs(OUT, exist_ok=True)

def probe(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", p], capture_output=True, text=True)
    j = json.loads(r.stdout); s = j["streams"][0]; n, d = s["r_frame_rate"].split("/")
    return s["width"], s["height"], float(n) / float(d), float(j["format"]["duration"])

def scan(p):
    name = os.path.relpath(p, PROJ).replace("\\", "/")
    key = re.sub(r"[^A-Za-z0-9]+", "_", name)
    jp = os.path.join(OUT, key + ".json")
    if os.path.exists(jp): return json.load(open(jp))
    w, h, fps, dur = probe(p)
    vf = "scale=480:-2,signalstats,scdet=threshold=8,metadata=print:file=-"
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-vf", vf, "-an", "-f", "null", "-"], capture_output=True, text=True)
    frames, cur = [], None
    for line in r.stdout.splitlines():
        m = re.match(r"frame:(\d+)\s+pts:\S+\s+pts_time:([\d.]+)", line)
        if m: cur = {"n": int(m.group(1)), "t": float(m.group(2))}; frames.append(cur); continue
        m = re.match(r"lavfi\.(signalstats\.(YAVG|SATAVG|YDIF|YHIGH|YLOW)|scd\.score)=([\d.]+)", line)
        if m and cur is not None: cur[m.group(2) or "scd"] = float(m.group(3))
    yd = [f.get("YDIF", 0) for f in frames]
    med = st.median(yd) if yd else 0
    # cuts: scd score high. flicker: frame differs strongly from BOTH neighbours but neighbours are similar (A-B-A pattern)
    cuts = [round(f["t"], 2) for f in frames if f.get("scd", 0) >= 8]
    spikes = []
    thr = max(6, med * 6)
    for i in range(1, len(frames) - 2):
        # isolated pop: big diff into frame i AND out of it, calm before and after (A-B-A), not a cut
        if yd[i] > thr and yd[i + 1] > thr and yd[i - 1] < thr / 3 and yd[i + 2] < thr / 3 and frames[i].get("scd", 0) < 8 and frames[i + 1].get("scd", 0) < 8:
            spikes.append(round(frames[i]["t"], 2))
    # sustained big motion (aggressive camera / fast changes): runs of >=4 frames with YDIF > 4x median and > 5
    fast, run = [], 0
    for i, v in enumerate(yd):
        run = run + 1 if v > max(5, med * 4) else 0
        if run == 4: fast.append(round(frames[i]["t"], 2))
    shots = [0.0] + cuts + [dur]; lens = [shots[i + 1] - shots[i] for i in range(len(shots) - 1)]
    res = {"file": name, "w": w, "h": h, "fps": round(fps, 2), "dur": round(dur, 2), "frames": len(frames),
           "luma": round(st.mean(f.get("YAVG", 0) for f in frames), 1) if frames else 0,
           "contrast": round(st.mean(f.get("YHIGH", 0) - f.get("YLOW", 0) for f in frames), 1) if frames else 0,
           "sat": round(st.mean(f.get("SATAVG", 0) for f in frames), 1) if frames else 0,
           "ydif_median": round(med, 2), "ydif_p99": round(sorted(yd)[int(len(yd) * 0.99)] if yd else 0, 2),
           "cuts": cuts, "n_cuts": len(cuts), "shot_len_min": round(min(lens), 2) if lens else 0, "shot_len_avg": round(st.mean(lens), 2) if lens else 0,
           "short_shots_lt2s": sum(1 for l in lens if l < 2), "flicker_spikes": spikes, "fast_motion_runs": fast,
           "first3s": {"luma": round(st.mean([f.get("YAVG", 0) for f in frames if f["t"] < 3] or [0]), 1), "ydif_avg": round(st.mean([f.get("YDIF", 0) for f in frames if f["t"] < 3] or [0]), 2), "cuts": [c for c in cuts if c < 3]}}
    json.dump(res, open(jp, "w"), indent=1)
    return res

if __name__ == "__main__":
    vids = [os.path.join(dp, f) for top in ["renders", "out", "reviews", "proofs"] for dp, _, fs in os.walk(os.path.join(PROJ, top)) for f in fs if f.endswith(".mp4")]
    rows = []
    with ThreadPoolExecutor(4) as ex:
        for r in ex.map(scan, vids):
            rows.append(r); print(r["file"], r["dur"], "cuts", r["n_cuts"], "flk", len(r["flicker_spikes"]), "fast", len(r["fast_motion_runs"]), flush=True)
    keys = ["file", "w", "h", "dur", "luma", "contrast", "sat", "ydif_median", "ydif_p99", "n_cuts", "shot_len_min", "shot_len_avg", "short_shots_lt2s"]
    with open(os.path.join(ROOT, "scan.csv"), "w", newline="") as fh:
        wr = csv.writer(fh); wr.writerow(keys + ["n_flicker", "n_fast"])
        for r in sorted(rows, key=lambda r: r["file"]): wr.writerow([r[k] for k in keys] + [len(r["flicker_spikes"]), len(r["fast_motion_runs"])])
