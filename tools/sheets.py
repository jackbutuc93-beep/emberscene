"""Contact sheets: every N s (N=2 for <=90 s, else 10 s) + a first-3-s strip (every 0.5 s). Output analysis/sheets/<key>/"""
import subprocess, sys, os, json
PROJ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def dur(p): return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True).stdout)
for rel in sys.argv[1:]:
    p = os.path.join(PROJ, rel); key = rel.replace("/", "_").replace(".mp4", ""); out = os.path.join(PROJ, "analysis", "sheets", key); os.makedirs(out, exist_ok=True)
    d = dur(p); step = 2 if d <= 90 else 10; n = int(d // step) + 1; cols = 6
    for i in range(0, n, 36):  # 36 thumbs per sheet
        k = min(36, n - i); rows = (k + cols - 1) // cols
        subprocess.run(["ffmpeg","-v","error","-y","-ss",str(i*step),"-i",p,"-vf",f"fps=1/{step},scale=320:-2,drawtext=text='%{{pts\:hms\:{i*step}}}':x=4:y=4:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.5,tile={cols}x{rows}","-frames:v","1",os.path.join(out,f"sheet-{i//36:02d}.png")])
    subprocess.run(["ffmpeg","-v","error","-y","-i",p,"-t","3","-vf","fps=2,scale=320:-2,tile=6x1","-frames:v","1",os.path.join(out,"first3s.png")])
    print(rel, d, flush=True)
