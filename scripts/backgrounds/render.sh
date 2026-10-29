#!/bin/bash
# Render a background source (scripts/backgrounds/*.html) to PNG with headless Chrome.
# The page is laid out at 1920x1080; scale 1.3333 gives 2560x1440.
# Usage: render.sh <source.html[?query]> <out.png> [scale]
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
src="$1"; out="$2"; scale="${3:-1}"
path="${src%%\?*}"; query=""; [[ "$src" == *\?* ]] && query="?${src#*\?}"
perl -e "alarm 90; exec @ARGV" "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor="$scale" --window-size=1920,1080 \
  --virtual-time-budget=8000 --allow-file-access-from-files \
  --screenshot="$(cd "$(dirname "$out")" && pwd)/$(basename "$out")" \
  "file://$(cd "$(dirname "$path")" && pwd)/$(basename "$path")$query" 2>/dev/null
