"""Draw the vector hero network mesh in VectorCraft.

Writes VectorCraft commands, runs them headless with vectorcraft-cli
(`brew install vectorcraft-cli`), and exports hero-network-mesh.svg and .png
into assets/backgrounds/. Pass --native to also write the editable
.vectorcraft file next to them (not committed). Change the seed for a
different mesh.

Usage: python3 -I scripts/backgrounds/hero-network-mesh.py [--native]
"""
import json, os, random, subprocess, sys, tempfile

W, H = 2752, 1536
random.seed(20)

cmds = []
next_id = [2]  # file.new makes layer 1; every created object takes the next id


def cmd(c, **p):
    cmds.append({"command": c, "params": p})


def new_obj():
    i = next_id[0]
    next_id[0] += 1
    return i


# ---- layout: jittered grid on a plane tilted away at the top -------------
ROWS, COLS = 11, 17
pts = {}
for r in range(ROWS):
    t = r / (ROWS - 1)
    # perspective: rows bunch up toward the top
    y = -90 + (H + 200) * (0.18 * t + 0.82 * t ** 1.25)
    spread = 0.82 + 0.38 * t  # columns spread out toward the viewer
    for c in range(COLS):
        u = (c - (COLS - 1) / 2) / ((COLS - 1) / 2)
        x = W * 0.5 + u * W * 0.62 * spread
        jx = random.uniform(-0.36, 0.36) * (W / COLS) * spread
        jy = random.uniform(-0.34, 0.34) * (H / ROWS) * (0.7 + 0.5 * t)
        pts[(r, c)] = (x + jx, y + jy)

edges = set()


def add(a, b):
    if a in pts and b in pts and a != b:
        edges.add(tuple(sorted((a, b))))


for (r, c) in pts:
    add((r, c), (r, c + 1))
    add((r, c), (r + 1, c))
    if random.random() < 0.5:  # one diagonal per cell makes triangles
        add((r, c), (r + 1, c + 1))
    else:
        add((r, c + 1), (r + 1, c))
    # occasional longer strands that cross the mesh, as in the photo
    if random.random() < 0.34:
        add((r, c), (r + 1, c + 2 * random.choice((-1, 1))))
    if random.random() < 0.12:
        add((r, c), (r, c + 2))
edges = {e for e in edges if random.random() > 0.07}

# ---- depth of field: sharp band through the middle -----------------------
FOCUS_Y = 0.47 * H


def depth(y):
    return min(1.0, abs(y - FOCUS_Y) / (0.55 * H))


def bucket(y):
    d = depth(y)
    return 0 if d < 0.42 else (1 if d < 0.7 else 2)


BLUR = {1: 5.0, 2: 12.0}


def scale(y):  # nearer (lower) things are bigger
    return 0.7 + 0.75 * max(0.0, min(1.0, (y + 90) / (H + 200)))


# ---- hot (glowing) nodes: a cluster right of centre plus a few strays ----
def near(cx, cy, k):
    return sorted(pts, key=lambda p: (pts[p][0] - cx) ** 2 + (pts[p][1] - cy) ** 2)[:k]


on_canvas = sorted(p for p in pts if 30 < pts[p][0] < W - 30 and 30 < pts[p][1] < H - 30)
cluster = set(near(0.6 * W, 0.47 * H, 5))
hot = cluster | set(random.sample(on_canvas, 20))

# ---- draw ----------------------------------------------------------------
cmd("file.new", name="Hero network mesh", width=W, height=H, units="Pixels",
    backgroundContents="transparent")

bg = new_obj()
cmd("shape.rectangle", x=0, y=0, width=W, height=H)
cmd("paint.setStroke", none=True)
cmd("paint.setFill", gradient={
    "kind": "radial", "start": [0.58 * W, 0.5 * H], "end": [1.25 * W, 0.5 * H],
    "stops": [{"offset": 0, "color": "#1a1e29"}, {"offset": 0.55, "color": "#12151d"},
              {"offset": 1, "color": "#0a0c11"}]})
cmd("object.setProps", id=bg, name="Background", locked=True)

GREY = ["#8b93a5", "#7d8596", "#a08a7c"]  # cool steel, plus a warm copper strand
groups = {0: [], 1: [], 2: []}
hot_edges = {0: [], 1: [], 2: []}

for (a, b) in sorted(edges):
    (x1, y1), (x2, y2) = pts[a], pts[b]
    my = (y1 + y2) / 2
    k = bucket(my)
    # only the central cluster's strands burn red; other lit nodes just warm theirs
    is_hot = (a in cluster or b in cluster) and (a in hot and b in hot or random.random() < 0.4)
    lit = not is_hot and (a in hot or b in hot)
    i = new_obj()
    cmd("shape.line", x1=round(x1, 1), y1=round(y1, 1), x2=round(x2, 1), y2=round(y2, 1))
    if is_hot:
        cmd("paint.setStroke", color="#ff6a3d")
        cmd("stroke.set", weight=round(2.4 * scale(my), 2), cap="round")
        cmd("transparency.set", opacity=80)
        hot_edges[k].append(i)
    else:
        warm = lit or random.random() < 0.28
        cmd("paint.setStroke", color="#c98468" if lit else GREY[2] if warm else random.choice(GREY[:2]))
        cmd("stroke.set", weight=round(2.1 * scale(my), 2), cap="round")
        cmd("transparency.set", opacity=round(55 - 22 * depth(my)))
        groups[k].append(i)

# the hot strands glow: group them per depth band and add Outer Glow
for k, ids in hot_edges.items():
    if not ids:
        continue
    cmd("select.set", ids=ids)
    g = new_obj()
    cmd("object.group")
    cmd("effect.apply", effect="stylize.outerGlow",
        params={"color": "#ff3b1f", "blur": 12, "opacity": 70, "mode": "screen"})
    groups[k].append(g)

halos = []
for p in sorted(pts):
    x, y = pts[p]
    k = bucket(y)
    s = scale(y)
    if p in hot:
        r = 11 * s
        h = new_obj()
        R = r * (7.5 if p in cluster else 6)
        cmd("shape.ellipse", x=round(x - R, 1), y=round(y - R, 1), width=round(2 * R, 1),
            height=round(2 * R, 1))
        cmd("paint.setStroke", none=True)
        cmd("paint.setFill", gradient={"kind": "radial", "stops": [
            {"offset": 0, "color": "#ff5a30", "opacity": 0.85},
            {"offset": 0.18, "color": "#ff3b1f", "opacity": 0.45},
            {"offset": 0.45, "color": "#d42f1c", "opacity": 0.14},
            {"offset": 1, "color": "#c0392b", "opacity": 0}]})
        halos.append(h)
        i = new_obj()
        cmd("shape.ellipse", x=round(x - r, 1), y=round(y - r, 1), width=round(2 * r, 1),
            height=round(2 * r, 1))
        cmd("paint.setStroke", none=True)
        cmd("paint.setFill", gradient={"kind": "radial", "stops": [
            {"offset": 0, "color": "#ffe2c4"}, {"offset": 0.45, "color": "#ff8a55"},
            {"offset": 1, "color": "#e8452a"}]})
    else:
        r = 13 * s
        i = new_obj()
        cmd("shape.ellipse", x=round(x - r, 1), y=round(y - r, 1), width=round(2 * r, 1),
            height=round(2 * r, 1))
        cmd("paint.setStroke", color="#5d6473")
        cmd("stroke.set", weight=1)
        cmd("paint.setFill", gradient={
            "kind": "radial", "start": [round(x - 0.35 * r, 1), round(y - 0.4 * r, 1)],
            "end": [round(x + r * 1.1, 1), round(y + r * 0.2, 1)],
            "stops": [{"offset": 0, "color": "#6f7685"}, {"offset": 0.5, "color": "#3a3f4b"},
                      {"offset": 1, "color": "#1d2027"}]})
    groups[k].append(i)

# depth bands: far/near blur, named for the Layers panel
NAMES = {0: "In focus", 1: "Soft focus", 2: "Out of focus"}
for k in (2, 1, 0):
    ids = groups[k]
    if not ids:
        continue
    cmd("select.set", ids=ids)
    g = new_obj()
    cmd("object.group")
    cmd("object.setProps", id=g, name=NAMES[k])
    if k in BLUR:
        cmd("effect.apply", effect="blur.gaussian", params={"radius": BLUR[k]})

# glow halos on top, screened so they light the strands beneath
cmd("select.set", ids=halos)
g = new_obj()
cmd("object.group")
cmd("object.setProps", id=g, name="Glow")
cmd("transparency.set", blend="screen")
cmd("select.none")

print(f"{len(pts)} nodes, {len(edges)} edges, {len(hot)} hot, {len(cmds)} commands",
      file=sys.stderr)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "backgrounds")
base = os.path.join(os.path.normpath(out), "hero-network-mesh")
exts = ["svg", "png"] + (["vectorcraft"] if "--native" in sys.argv else [])
with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False) as f:
    for c in cmds:
        f.write(json.dumps(c) + "\n")
args = ["vectorcraft-cli", "run", "--commands", f.name]
for e in exts:
    args += ["--export", f"{base}.{e}"]
try:
    res = subprocess.run(args, capture_output=True, text=True)
finally:
    os.unlink(f.name)
if res.returncode or '"error"' in res.stdout:
    sys.exit(res.stdout[-2000:] + res.stderr)
# object ids are predicted above for select.set; fail loudly if VectorCraft disagrees
made = [json.loads(l)["result"]["id"] for l in res.stdout.splitlines()
        if l.startswith("{") and isinstance(json.loads(l).get("result"), dict)
        and "id" in json.loads(l)["result"]]
if made != list(range(2, next_id[0])):
    sys.exit("object ids differ from the ones the script predicted")
for e in exts:
    print(f"wrote {base}.{e}", file=sys.stderr)
