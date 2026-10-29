// Drawing helpers shared by the video-background scenes. Each returns an
// SVG markup string; scenes concatenate them into one <svg>.

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// A row of book spines standing on a shelf whose top surface is at y.
function books(x0, x1, y, seed, colors, { hMin = 110, hMax = 165 } = {}) {
  const r = rng(seed);
  let s = "", x = x0;
  while (x < x1) {
    if (r() < 0.12) { x += 18 + r() * 30; continue; }        // gap
    const w = 16 + r() * 18, h = hMin + r() * (hMax - hMin);
    if (x + w > x1) break;
    const c = colors[Math.floor(r() * colors.length)];
    if (r() < 0.1 && x + h * 0.5 < x1) {                        // leaning book
      s += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="2"
        fill="${c}" transform="rotate(18 ${x + w} ${y})"/>`;
      x += w + h * 0.3;
      continue;
    }
    s += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="2" fill="${c}"/>`;
    s += `<rect x="${x + 3}" y="${y - h + 14}" width="${w - 6}" height="3"
      fill="#fff" opacity=".22"/>`;
    s += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="2"
      fill="url(#spineShade)"/>`;
    x += w + 1.5;
  }
  return s;
}

// A stack of books lying flat, bottom at y.
function stack(x, y, seed, colors, n = 3) {
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) {
    const w = 120 + r() * 50, h = 18 + r() * 8;
    const c = colors[Math.floor(r() * colors.length)];
    y -= h;
    s += `<rect x="${x + (r() - 0.5) * 16}" y="${y}" width="${w}" height="${h}"
      rx="2" fill="${c}"/>`;
  }
  return s;
}

// One leaf: a pointed ellipse from (x,y) along angle a (degrees).
function leaf(x, y, len, a, fill, wid = 0.34) {
  const w = len * wid;
  return `<path transform="translate(${x} ${y}) rotate(${a})"
    d="M0 0 Q ${len * 0.45} ${-w} ${len} 0 Q ${len * 0.45} ${w} 0 0Z" fill="${fill}"/>
    <path transform="translate(${x} ${y}) rotate(${a})" d="M0 0 L${len * 0.9} 0"
    stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>`;
}

// A leafy plant growing up from (x,y): stems fan out with leaves along them.
function plant(x, y, seed, { height = 420, spread = 140, leaves = 26,
  greens = ["#3F5A3C", "#4F6B4A", "#5E7D57", "#6E8C64"], size = 70 } = {}) {
  const r = rng(seed);
  let s = "";
  const stems = 5;
  for (let k = 0; k < stems; k++) {
    const tx = x + (k / (stems - 1) - 0.5) * spread * 1.4;
    const ty = y - height * (0.65 + r() * 0.35);
    s += `<path d="M${x} ${y} Q ${x + (tx - x) * 0.2} ${y - height * 0.5} ${tx} ${ty}"
      stroke="#4A5A3A" stroke-width="4" fill="none"/>`;
    const per = Math.round(leaves / stems);
    for (let i = 0; i < per; i++) {
      const t = 0.3 + (i / per) * 0.7;
      const lx = x + (tx - x) * t * t, ly = y + (ty - y) * t;
      const side = i % 2 ? 1 : -1;
      const a = -90 + side * (35 + r() * 40) + (tx - x) * 0.08;
      const g = greens[Math.floor(r() * greens.length)];
      s += leaf(lx, ly, size * (0.7 + r() * 0.5), a, g, 0.38);
    }
  }
  return s;
}

// A tapered planter centred on x, sitting on y.
function pot(x, y, w, h, fill, rim) {
  return `<path d="M${x - w / 2} ${y - h} L${x + w / 2} ${y - h}
      L${x + w * 0.38} ${y} L${x - w * 0.38} ${y}Z" fill="${fill}"/>
    <rect x="${x - w / 2 - 4}" y="${y - h - 8}" width="${w + 8}" height="12"
      rx="3" fill="${rim}"/>`;
}

// A floating shelf board with its front edge and soft shadow beneath.
function shelf(x, y, w, top, front, shadow = "rgba(20,23,28,.14)") {
  return `<rect x="${x}" y="${y + 18}" width="${w}" height="26" fill="${shadow}"
      filter="url(#soft)"/>
    <rect x="${x}" y="${y}" width="${w}" height="8" fill="${top}"/>
    <rect x="${x}" y="${y + 8}" width="${w}" height="14" fill="${front}"/>`;
}
