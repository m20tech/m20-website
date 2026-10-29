#!/usr/bin/env python3
"""Render the page hero backgrounds in assets/artwork/heroes/ (2400x1350 JPGs).

Every hero is the homepage's network mesh (assets/hero-network.jpg) in a
different arrangement: slate links and sphere nodes on a plane that recedes
into the distance, depth-of-field blur in front of and behind the focus, and a
few nodes lit red and amber with a soft bloom. Each page lights a different
shape in the mesh, drawn from the page's story (see "Illustrations > Heroes"
in design.md). Seeded, so re-running gives identical files.

  python3 scripts/hero-art.py                 render every page
  python3 scripts/hero-art.py ai contact      render some pages

Needs Pillow only.
"""

import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "artwork" / "heroes"

W, H = 2400, 1350
SS = 2  # supersampling factor for anti-aliased lines and discs

INK = (18, 20, 27)
SLATE = (96, 104, 120)
BRASS = (146, 118, 88)
NODE_RIM, NODE_BODY, NODE_LIGHT = (40, 44, 54), (66, 72, 84), (138, 144, 156)
RED, AMBER, HOT = (255, 84, 56), (255, 166, 78), (255, 228, 200)
WARM = (226, 112, 74)

# Perspective plane: depth z runs from NEAR (bottom of the frame) to FAR (top).
NEAR, FAR = 1.9, 8.0
_B = (1.30 * H) / (1 / NEAR - 1 / FAR)
_A = 1.15 * H - _B / NEAR
F = 1143.0  # horizontal focal length, sets the mesh spacing on screen


def project(x, z):
    return W / 2 + F * x / z, _A + _B / z


def unproject(fx, fy):
    """Screen position as fractions of the frame -> world (x, z) on the plane."""
    z = _B / (fy * H - _A)
    return (fx * W - W / 2) * z / F, z


class Mesh:
    def __init__(self, seed):
        self.rng = random.Random(seed)
        self.nodes = []  # dicts: x, z, lit (None | color), size, spark
        self.edges = {}  # (i, j) -> style: "base" | "lit" | "soft"

    def add(self, x, z, lit=None, size=1.0, scene=True):
        self.nodes.append({"x": x, "z": z, "lit": lit, "size": size, "scene": scene})
        return len(self.nodes) - 1

    def add_screen(self, fx, fy, **kw):
        return self.add(*unproject(fx, fy), **kw)

    def link(self, i, j, style="lit"):
        self.edges[(min(i, j), max(i, j))] = style

    def scatter(self, spacing=0.42, keep_out=()):
        """Poisson-disk nodes over the whole visible plane, avoiding keep_out
        circles [(x, z, r)] so the page's shape reads cleanly."""
        rng, pts, cell = self.rng, [], spacing / math.sqrt(2)
        grid = {}
        existing = [(n["x"], n["z"]) for n in self.nodes]
        for attempt in range(9000):
            z = NEAR * 0.92 + (FAR * 1.06 - NEAR * 0.92) * math.sqrt(rng.random())
            half = (W / 2 * 1.12) * z / F
            x = rng.uniform(-half, half)
            if any((x - kx) ** 2 + (z - kz) ** 2 < kr * kr for kx, kz, kr in keep_out):
                continue
            if any((x - ex) ** 2 + (z - ez) ** 2 < (spacing * 0.8) ** 2 for ex, ez in existing):
                continue
            gx, gz = int(x // cell), int(z // cell)
            ok = True
            for dx in (-2, -1, 0, 1, 2):
                for dz in (-2, -1, 0, 1, 2):
                    for px, pz in grid.get((gx + dx, gz + dz), ()):
                        if (x - px) ** 2 + (z - pz) ** 2 < spacing * spacing:
                            ok = False
                            break
                    if not ok:
                        break
                if not ok:
                    break
            if ok:
                grid.setdefault((gx, gz), []).append((x, z))
                pts.append((x, z))
        for x, z in pts:
            self.add(x, z, scene=False)

    def knit(self, k=4, max_d=0.8):
        """Join every node to its nearest neighbours: the mesh itself."""
        n = self.nodes
        for i, a in enumerate(n):
            near = sorted(
                ((a["x"] - b["x"]) ** 2 + (a["z"] - b["z"]) ** 2, j) for j, b in enumerate(n) if j != i
            )[:k]
            for d2, j in near:
                if d2 <= max_d * max_d and (min(i, j), max(i, j)) not in self.edges:
                    self.link(i, j, "base")

    def sparks(self, count, region=(0.38, 0.98, 0.08, 0.92)):
        """Light a few stray nodes red, like the homepage's scattered embers."""
        x0, x1, y0, y1 = region
        shape = [(n["x"], n["z"]) for n in self.nodes if n["scene"]]
        cands = []
        for i, nd in enumerate(self.nodes):
            sx, sy = project(nd["x"], nd["z"])
            clear = all((nd["x"] - x) ** 2 + (nd["z"] - z) ** 2 > 0.75 ** 2 for x, z in shape)
            if nd["lit"] is None and clear and x0 * W < sx < x1 * W and y0 * H < sy < y1 * H:
                cands.append(i)
        for i in self.rng.sample(cands, min(count, len(cands))):
            self.nodes[i].update(lit=RED, size=0.7, spark=True)


# ---------------------------------------------------------------- scenes
# Screen positions are fractions of the 16:9 frame. The hero shows this image
# over its right 62%, cropped to fit and faded out to the left, so focal
# shapes sit between x 0.40 and 0.92.


def ring(m, fx, fy, rx, rz, count, lit_at, style="lit", colors=None, size=1.0, start=0.0):
    """A closed loop of nodes on the plane (rx across, rz into the distance)."""
    cx, cz = unproject(fx, fy)
    ids = []
    for k in range(count):
        a = start + 2 * math.pi * k / count
        lit = (colors or {}).get(k, RED) if k in lit_at else None
        ids.append(m.add(cx + rx * math.cos(a), cz + rz * math.sin(a), lit=lit, size=size))
    for k in range(count):
        m.link(ids[k], ids[(k + 1) % count], style)
    keep = [(m.nodes[i]["x"], m.nodes[i]["z"], 0.3) for i in ids]
    return (cx, cz), ids, keep


def path(m, points, colors=None, sizes=None, style="lit"):
    ids = [
        m.add_screen(fx, fy, lit=(colors or {}).get(k, RED), size=(sizes or {}).get(k, 0.9))
        for k, (fx, fy) in enumerate(points)
    ]
    for a, b in zip(ids, ids[1:]):
        m.link(a, b, style)
    return ids


def scene_atlassian_services():
    """The optimization cycle: one glowing loop through four lit steps."""
    m = Mesh(301)
    (cx, cz), ids, keep = ring(m, 0.62, 0.46, 0.95, 0.62, 12, {1, 4, 7, 10}, colors={10: AMBER},
                               size=1.05, start=math.pi / 12)
    m.scatter(keep_out=keep + [(cx, cz, 0.3)])
    m.knit()
    m.sparks(4)
    return m, cz


def scene_ai():
    """Rovo: one bright hub reaching out across every app in the mesh."""
    m = Mesh(302)
    hub = m.add_screen(0.62, 0.46, lit=AMBER, size=1.45)
    hx, hz = m.nodes[hub]["x"], m.nodes[hub]["z"]
    m.scatter(keep_out=[(hx, hz, 0.36)])
    m.knit()
    spokes = sorted(
        (math.hypot(nd["x"] - hx, nd["z"] - hz), i) for i, nd in enumerate(m.nodes) if i != hub
    )
    spokes = [i for d, i in spokes if 0.4 < d < 2.6][:16]
    for k, i in enumerate(spokes):
        m.link(hub, i, "lit" if k < 10 else "soft")
        if k in (1, 4, 7, 11, 14):
            m.nodes[i].update(lit=RED, size=0.85)
    m.sparks(3)
    return m, hz


def scene_ai_value_proposition():
    """AI built in, not bolted on: a lit workflow climbing through the mesh."""
    m = Mesh(303)
    pts = [(0.36, 0.80), (0.46, 0.68), (0.55, 0.61), (0.64, 0.50), (0.73, 0.42), (0.82, 0.32), (0.90, 0.25)]
    ids = path(m, pts, colors={6: AMBER}, sizes={6: 1.3, 3: 1.05})
    keep = [(m.nodes[i]["x"], m.nodes[i]["z"], 0.34) for i in ids]
    m.scatter(keep_out=keep)
    m.knit()
    m.sparks(3)
    return m, m.nodes[ids[3]]["z"]


def scene_partners():
    """Working together: three clusters joined by glowing bridges."""
    m = Mesh(304)
    cores = [(0.50, 0.60, RED), (0.68, 0.39, AMBER), (0.85, 0.60, RED)]
    core_ids, keep = [], []
    for fx, fy, col in cores:
        c = m.add_screen(fx, fy, lit=col, size=1.2)
        cx, cz = m.nodes[c]["x"], m.nodes[c]["z"]
        for k in range(9):
            a = 2 * math.pi * k / 9 + m.rng.uniform(-0.25, 0.25)
            r = m.rng.uniform(0.32, 0.62)
            m.add(cx + r * math.cos(a), cz + r * math.sin(a), size=0.85)
        core_ids.append(c)
        keep.append((cx, cz, 0.78))
    for a, b in ((0, 1), (1, 2), (0, 2)):
        na, nb = m.nodes[core_ids[a]], m.nodes[core_ids[b]]
        prev = core_ids[a]
        for t in (1 / 3, 2 / 3):
            mid = m.add(na["x"] + (nb["x"] - na["x"]) * t, na["z"] + (nb["z"] - na["z"]) * t, size=0.8)
            m.link(prev, mid, "lit")
            prev = mid
        m.link(prev, core_ids[b], "lit")
    m.scatter(keep_out=keep)
    m.knit(k=4, max_d=0.75)
    m.sparks(2)
    return m, m.nodes[core_ids[1]]["z"]


def scene_privacy():
    """Protected data: one quiet core inside a softly lit perimeter."""
    m = Mesh(305)
    (cx, cz), _, _ = ring(m, 0.64, 0.50, 0.80, 0.42, 11, set(), style="soft", size=0.9)
    core = m.add(cx, cz, lit=AMBER, size=1.15)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.4
        inner = m.add(cx + 0.45 * math.cos(a), cz + 0.45 * math.sin(a), size=0.8)
        m.link(core, inner, "soft")
    m.scatter(keep_out=[(cx, cz, 1.32)])
    m.knit(k=3, max_d=0.7)
    m.sparks(1)
    return m, cz


def scene_contact():
    """Get in touch: a lit path runs out from behind the contact form (which
    covers the middle of this image) to an amber node in the strip beside it."""
    m = Mesh(306)
    pts = [(0.52, 0.62), (0.60, 0.57), (0.66, 0.52), (0.71, 0.46), (0.75, 0.39), (0.765, 0.30)]
    ids = path(m, pts, colors={5: AMBER}, sizes={5: 1.3})
    for i in ids[:-1]:
        m.nodes[i].update(lit=None, size=0.75)
    m.nodes[ids[3]].update(lit=RED, size=0.85)
    keep = [(m.nodes[i]["x"], m.nodes[i]["z"], 0.33) for i in ids]
    m.scatter(keep_out=keep)
    m.knit()
    m.sparks(3, region=(0.74, 0.95, 0.08, 0.92))
    return m, m.nodes[ids[4]]["z"]


SCENES = {
    "atlassian-services": scene_atlassian_services,
    "ai": scene_ai,
    "ai-value-proposition": scene_ai_value_proposition,
    "partners": scene_partners,
    "privacy": scene_privacy,
    "contact": scene_contact,
}


# ---------------------------------------------------------------- rendering


def lerp(c1, c2, t):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))


def scale(c, t):
    return tuple(min(255, round(v * t)) for v in c)


def render(mesh, focus_z):
    rng = random.Random(7)
    nodes = mesh.nodes
    for nd in nodes:
        nd["sx"], nd["sy"] = project(nd["x"], nd["z"])
        nd["r"] = 56 / nd["z"] * nd["size"]

    def blur_of(z):
        return 55 * abs(1 / z - 1 / focus_z)

    lit_ids = {i for i, nd in enumerate(nodes) if nd["lit"]}
    brass = {e for e in mesh.edges if rng.random() < 0.28}

    # Depth bins, far to near, each blurred by its distance from the focus.
    bins = 12
    inv = [1 / FAR + (1 / NEAR - 1 / FAR) * k / bins for k in range(bins + 1)]

    def bin_of(z):
        v = min(max(1 / z, inv[0]), inv[-1] - 1e-9)
        return int((v - inv[0]) / (inv[-1] - inv[0]) * bins)

    edge_bins = [[] for _ in range(bins)]
    for e, style in mesh.edges.items():
        a, b = nodes[e[0]], nodes[e[1]]
        edge_bins[bin_of((a["z"] + b["z"]) / 2)].append((e, style))
    node_bins = [[] for _ in range(bins)]
    for i, nd in enumerate(nodes):
        node_bins[bin_of(nd["z"])].append(i)

    canvas = Image.new("RGBA", (W * SS, H * SS), INK + (255,))
    glow_tight = Image.new("RGB", (W * SS, H * SS), (0, 0, 0))
    glow_wide = Image.new("RGB", (W * SS, H * SS), (0, 0, 0))
    gt, gw = ImageDraw.Draw(glow_tight), ImageDraw.Draw(glow_wide)

    for b in range(bins):
        if not edge_bins[b] and not node_bins[b]:
            continue
        z_mid = 1 / ((inv[b] + inv[b + 1]) / 2)
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for (i, j), style in edge_bins[b]:
            a, c = nodes[i], nodes[j]
            width = 10 / ((a["z"] + c["z"]) / 2)
            p = [(a["sx"] * SS, a["sy"] * SS), (c["sx"] * SS, c["sy"] * SS)]
            if style == "lit":
                d.line(p, fill=WARM + (255,), width=max(1, round(width * 1.15 * SS)))
                gt.line(p, fill=scale(WARM, 0.6), width=round(width * 3.2 * SS))
                gw.line(p, fill=scale(RED, 0.28), width=round(width * 7 * SS))
            elif style == "soft":
                d.line(p, fill=lerp(BRASS, WARM, 0.45) + (235,), width=max(1, round(width * 1.15 * SS)))
                gt.line(p, fill=scale(WARM, 0.32), width=round(width * 3 * SS))
            else:
                col = BRASS if (i, j) in brass else SLATE
                if i in lit_ids or j in lit_ids:
                    col = lerp(col, WARM, 0.5)
                d.line(p, fill=col + (215,), width=max(1, round(width * SS)))
        for i in node_bins[b]:
            nd = nodes[i]
            x, y, r = nd["sx"] * SS, nd["sy"] * SS, nd["r"] * SS
            if nd["lit"]:
                col = nd["lit"]
                d.ellipse((x - r, y - r, x + r, y + r), fill=col + (255,))
                h = r * 0.5
                d.ellipse((x - h, y - h, x + h, y + h), fill=lerp(col, HOT, 0.75) + (255,))
                strength = 0.45 if nd.get("spark") else 1.0
                t = r * 1.9
                gt.ellipse((x - t, y - t, x + t, y + t), fill=scale(col, 0.9 * strength))
                t = r * 4.2
                gw.ellipse((x - t, y - t, x + t, y + t), fill=scale(col, 0.42 * strength))
            else:
                d.ellipse((x - r, y - r, x + r, y + r), fill=NODE_RIM + (255,))
                o, rb = r * 0.1, r * 0.84
                d.ellipse((x - o - rb, y - o - rb, x - o + rb, y - o + rb), fill=NODE_BODY + (255,))
                hx, hy, hr = x - r * 0.3, y - r * 0.32, r * 0.3
                d.ellipse((hx - hr, hy - hr, hx + hr, hy + hr), fill=NODE_LIGHT + (255,))
        sigma = blur_of(z_mid)
        if sigma > 0.6:
            layer = layer.convert("RGBa").filter(ImageFilter.GaussianBlur(sigma * SS)).convert("RGBA")
        canvas.alpha_composite(layer)

    out = canvas.convert("RGB")
    out = ImageChops.screen(out, glow_tight.filter(ImageFilter.GaussianBlur(9 * SS)))
    out = ImageChops.screen(out, glow_wide.filter(ImageFilter.GaussianBlur(34 * SS)))
    out = out.resize((W, H), Image.LANCZOS)

    vignette = Image.radial_gradient("L").resize((W, H), Image.BICUBIC).point(lambda p: 255 - int(p * 0.42))
    out = ImageChops.multiply(out, Image.merge("RGB", (vignette,) * 3))
    noise = Image.effect_noise((W, H), 5).convert("RGB")
    return ImageChops.add(out, noise, 1.0, -128)


def main(names):
    OUT.mkdir(parents=True, exist_ok=True)
    for name in names or SCENES:
        if name not in SCENES:
            sys.exit(f"unknown page {name!r}; pages: {', '.join(SCENES)}")
        mesh, focus = SCENES[name]()
        path_out = OUT / f"{name}.jpg"
        render(mesh, focus).save(path_out, "JPEG", quality=84, optimize=True, progressive=True)
        print(f"{path_out.relative_to(ROOT)}  {W}x{H}  {path_out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1:])
