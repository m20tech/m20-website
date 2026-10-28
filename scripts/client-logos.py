#!/usr/bin/env python3
"""Download client logos from Brandfetch and wire them into the site.

This script does not talk to Jira or Brandfetch's MCP server; Claude does that
(see .claude/skills/refresh-client-logos/SKILL.md) and writes a plan file:

  {
    "clients": [
      {
        "slug": "admis",                  # file basename under assets/clients/
        "name": "ADM Investor Services",  # Jira name
        "alt": "ADMIS",                   # alt text on the site
        "domain": "admis.com",            # from the Jira Website field
        "brandId": "id5sOwbYOy",
        "logos": [ {"theme": "dark", "type": "logo", "format": "png", "src": "https://cdn.brandfetch.io/..."} ],
        "keepImage": "/assets/clients/packer.webp",  # optional: use this file instead
        "maxWidth": 200,                  # optional, passed through to home.json
        "note": "free text for the manifest"
      }
    ]
  }

For each client it writes (into assets/clients/):

  <slug>.<svg|png>          the logo for LIGHT backgrounds (Brandfetch theme "dark")
  <slug>-reverse.<svg|png>  the logo for DARK backgrounds (theme "light"; when
                            Brandfetch has none, a white silhouette derived from
                            the transparent PNG, marked "derived")

then rewrites cms/clients.json (the manifest) and the clients.logos list in
content/pages/home.json. Needs Pillow only for derived reverse logos.

  python3 scripts/client-logos.py plan.json [--dry-run]
"""

import io
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "clients"
MANIFEST = ROOT / "cms" / "clients.json"
HOME = ROOT / "content" / "pages" / "home.json"
FORMAT_RANK = ["svg", "png", "webp", "jpeg", "jpg"]


def fetch(url):
    # curl, not urllib: python.org builds on macOS ship without CA certificates.
    return subprocess.run(["curl", "-fsSL", "--max-time", "30", url], check=True, capture_output=True).stdout


def best_format(formats):
    """The entry in a logo's `formats` list with the preferred file type."""
    ranked = [f for f in formats if f.get("format") in FORMAT_RANK]
    ranked.sort(key=lambda f: (FORMAT_RANK.index(f["format"]), -(f.get("width") or 0)))
    return ranked[0] if ranked else None


def pick(logos, theme, types):
    """Best Brandfetch logo for a theme: the widest (most horizontal) one."""
    cands = [l for l in logos if l.get("theme") == theme and l.get("type") in types and best_format(l.get("formats", []))]
    cands.sort(key=lambda l: -(best_format(l["formats"]).get("width", 0) / max(best_format(l["formats"]).get("height", 1), 1)))
    return cands[0] if cands else None


def png_of(logo):
    f = next((f for f in logo.get("formats", []) if f.get("format") == "png"), None)
    return f["src"] if f else None


def derive_reverse(png_bytes):
    """White silhouette of a transparent logo, or None if it has no transparency."""
    try:
        from PIL import Image
    except ImportError:
        return None
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    alpha = im.getchannel("A")
    if alpha.getextrema()[0] > 200:  # opaque tile or photo: nothing to knock out
        return None
    out = Image.new("RGBA", im.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    out = out.convert("RGBA")
    buf = io.BytesIO()
    out.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def size_of(path):
    try:
        from PIL import Image
        return list(Image.open(path).size)
    except Exception:
        return None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if not args:
        sys.exit(__doc__)
    plan = json.loads(Path(args[0]).read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    manifest, home_logos = [], []

    for c in plan["clients"]:
        slug = c["slug"]
        entry = {
            "slug": slug,
            "name": c["name"],
            "alt": c.get("alt", c["name"]),
            "domain": c.get("domain"),
            "brandId": c.get("brandId"),
            "fetched": str(date.today()),
            "light": None,
            "reverse": None,
            "note": c.get("note", ""),
        }
        image = c.get("keepImage")
        primary = pick(c.get("logos", []), "dark", ("logo",))

        if primary and not c.get("keepImage"):
            f = best_format(primary["formats"])
            ext = "svg" if f["format"] == "svg" else "png" if f["format"] == "png" else f["format"]
            data = fetch(f["src"])
            dest = OUT / f"{slug}.{ext}"
            if not dry:
                dest.write_bytes(data)
            image = f"/assets/clients/{dest.name}"
            entry["light"] = {"file": dest.name, "source": "brandfetch", "format": ext, "size": size_of(dest) if not dry else None}

            # Reverse (for dark backgrounds): Brandfetch's light theme, else derived.
            rev = pick(c["logos"], "light", ("logo", "other", "symbol"))
            if rev:
                rf = best_format(rev["formats"])
                rext = "svg" if rf["format"] == "svg" else "png" if rf["format"] == "png" else rf["format"]
                rdata, rsource = fetch(rf["src"]), "brandfetch"
            else:
                src_png = png_of(primary)
                rdata = derive_reverse(fetch(src_png)) if src_png else None
                rext, rsource = "png", "derived"
            if rdata:
                rdest = OUT / f"{slug}-reverse.{rext}"
                if not dry:
                    rdest.write_bytes(rdata)
                entry["reverse"] = {"file": rdest.name, "source": rsource, "format": rext, "size": size_of(rdest) if not dry else None}
            else:
                entry["note"] = (entry["note"] + " No reverse version (logo has no transparency).").strip()
        elif not image:
            entry["note"] = (entry["note"] + " No Brandfetch logo and no existing file; not shown on the site.").strip()
        else:
            entry["light"] = {"file": Path(image).name, "source": "manual"}

        manifest.append(entry)
        if image:
            item = {"image": image, "alt": entry["alt"]}
            if c.get("maxWidth"):
                item["maxWidth"] = c["maxWidth"]
            home_logos.append(item)
        print(f"{slug:16} light={entry['light'] and entry['light']['file']}  reverse={entry['reverse'] and (entry['reverse']['file'] + ' (' + entry['reverse']['source'] + ')')}")

    if dry:
        print("dry run: nothing written")
        return
    MANIFEST.write_text(json.dumps({"updated": str(date.today()), "clients": manifest}, indent=2) + "\n")
    home = json.loads(HOME.read_text())
    home["clients"]["logos"] = home_logos
    HOME.write_text(json.dumps(home, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {MANIFEST.relative_to(ROOT)} and {len(home_logos)} logos in {HOME.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
