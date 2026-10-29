#!/bin/bash
# Render a background source (scripts/backgrounds/*.html) to PNG with headless Chrome.
# The page is laid out at 1920x1080 unless a window size is given; scale 1.3333
# gives 2560x1440. Set CHROME_PATH if Chrome isn't at the macOS default.
# Usage: render.sh <source.html[?query]> <out.png> [scale] [width,height]
CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
src="$1"; out="$2"; scale="${3:-1}"; size="${4:-1920,1080}"
path="${src%%\?*}"; query=""; [[ "$src" == *\?* ]] && query="?${src#*\?}"
sandbox=""; [ "$(id -u)" = 0 ] && sandbox="--no-sandbox"
perl -e "alarm 90; exec @ARGV" "$CHROME" --headless=new --disable-gpu --hide-scrollbars $sandbox \
  --force-device-scale-factor="$scale" --window-size="$size" \
  --virtual-time-budget=8000 --allow-file-access-from-files \
  --screenshot="$(cd "$(dirname "$out")" && pwd)/$(basename "$out")" \
  "file://$(cd "$(dirname "$path")" && pwd)/$(basename "$path")$query" 2>/dev/null
