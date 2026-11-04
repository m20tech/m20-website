#!/usr/bin/env python3
"""Render the home hero image set from scripts/backgrounds/home-hero.html.

Renders each variant with render.sh (headless Chrome; set CHROME_PATH if it
isn't at the macOS default), then encodes the responsive set the home hero's
<picture> uses:

  assets/hero/network-mesh-{960,1440,1920,2560}.{avif,webp,jpg}         wide, > 900px
  assets/hero/network-mesh-compact-{480,960,1440}.{avif,webp,jpg}       900px and below
  assets/artwork/covers/network-mesh.png                                 1200x630 share image

  python3 scripts/backgrounds/home-hero.py

Needs Pillow built with AVIF and WebP (Pillow 11+). Prints each file's size
against the budgets in design.md (1920 WebP <= 150 KB, mobile <= 80 KB).
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
HERE = ROOT / "scripts" / "backgrounds"
OUT = ROOT / "assets" / "hero"
SHARE = ROOT / "assets" / "artwork" / "covers" / "network-mesh.png"

# variant -> (layout size, render scale, export widths)
VARIANTS = {
    "wide": ((1920, 800), 1.3334, [960, 1440, 1920, 2560]),
    "compact": ((1200, 1200), 1.2, [480, 960, 1440]),
}
QUALITY = {"avif": 50, "webp": 74, "jpg": 80}
BUDGET = {("wide", 1920, "webp"): 150, ("compact", 960, "webp"): 80, ("compact", 960, "avif"): 80}


def render(variant, size, scale, dest):
    w, h = size
    subprocess.run(
        [str(HERE / "render.sh"), f"{HERE / 'home-hero.html'}?v={variant}", str(dest), str(scale), f"{w},{h}"],
        check=True,
    )
    im = Image.open(dest).convert("RGB")
    target = (round(w * scale), round(h * scale))
    if im.size != target:
        im = im.crop((0, 0, *target)) if im.width >= target[0] and im.height >= target[1] else im
    return im


def save(im, path, fmt):
    if fmt == "avif":
        im.save(path, "AVIF", quality=QUALITY["avif"], speed=4)
    elif fmt == "webp":
        im.save(path, "WEBP", quality=QUALITY["webp"], method=6)
    else:
        im.save(path, "JPEG", quality=QUALITY["jpg"], optimize=True, progressive=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    over = False
    with tempfile.TemporaryDirectory() as tmp:
        for variant, (size, scale, widths) in VARIANTS.items():
            master = render(variant, size, scale, Path(tmp) / f"{variant}.png")
            base = "network-mesh" if variant == "wide" else "network-mesh-compact"
            for width in widths:
                im = master.resize((width, round(master.height * width / master.width)), Image.LANCZOS)
                for fmt in ("avif", "webp", "jpg"):
                    path = OUT / f"{base}-{width}.{fmt}"
                    save(im, path, fmt)
                    kb = path.stat().st_size / 1024
                    limit = BUDGET.get((variant, width, fmt))
                    flag = ""
                    if limit:
                        flag = f"  (budget {limit} KB: {'ok' if kb <= limit else 'OVER'})"
                        over |= kb > limit
                    print(f"{path.relative_to(ROOT)}  {im.width}x{im.height}  {kb:.0f} KB{flag}")
        share = render("share", (1200, 630), 1, Path(tmp) / "share.png")
        share.save(SHARE, "PNG", optimize=True)
        print(f"{SHARE.relative_to(ROOT)}  {share.width}x{share.height}  {SHARE.stat().st_size / 1024:.0f} KB")
    if over:
        sys.exit("over budget: lower QUALITY or simplify the source")


if __name__ == "__main__":
    main()
