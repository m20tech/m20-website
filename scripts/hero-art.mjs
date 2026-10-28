#!/usr/bin/env node
// Generates the page hero backgrounds in assets/artwork/heroes/ (1600×900
// SVGs): contour-and-flow art, families of fine smooth lines in maroon, grey,
// and gold on ink, with one shape per page. Seeded, so re-running gives
// identical files.
//
//   node scripts/hero-art.mjs        write the SVGs (then: npm run artwork:png)
//
// Design rules live in "Illustrations → Heroes" in design.md. Keep the focal
// point in the right 60%; the left of the image fades out under the text.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "assets", "artwork", "heroes");
const W = 1600, H = 900;

const f = (n) => +n.toFixed(1);
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

const GREY = [90, 100, 120], MAROON = [150, 39, 28], RED = [224, 83, 63], GOLD = [232, 160, 76], PALE = [245, 201, 143];

// Catmull-Rom spline through points -> SVG path data.
function smooth(pts, closed = false) {
  const n = pts.length;
  const p = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    d += `C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d + (closed ? "Z" : "");
}

const line = (pts, { color = GREY, o = 0.4, w = 1.4, dash, closed = false, fill = "none" } = {}) =>
  `<path d="${smooth(pts, closed)}" fill="${fill}" stroke="${rgb(color)}" stroke-opacity="${f(o)}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""} stroke-linecap="round" stroke-linejoin="round"/>`;

function frame(body, { wash = [0.68, 0.5], defs = "" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="wash" cx="${wash[0]}" cy="${wash[1]}" r=".6"><stop offset="0" stop-color="#96271C" stop-opacity=".34"/><stop offset="1" stop-color="#96271C" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="#E8A04C" stop-opacity=".5"/><stop offset="1" stop-color="#E8A04C" stop-opacity="0"/></radialGradient>
    ${defs}
  </defs>
  <rect width="${W}" height="${H}" fill="#14171C"/>
  <rect width="${W}" height="${H}" fill="url(#wash)"/>
  ${body.join("\n  ")}
</svg>
`;
}

// Colour ramp across a family: grey -> maroon -> red, with `hot` lines gold.
const ramp = (t) => (t < 0.5 ? mix(GREY, MAROON, t * 2) : mix(MAROON, RED, (t - 0.5) * 2));

const scenes = {};

// Services — orbits: a family of wobbling rings round one point, the way
// work cycles through train, develop, support, optimize. One ring is gold.
scenes["atlassian-services"] = () => {
  const cx = 1120, cy = 450, out = [];
  const N = 22;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1), r0 = 70 + k * 21;
    const pts = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      const wob = 1 + 0.07 * Math.sin(a * 2 + k * 0.35) + 0.04 * Math.sin(a * 3 - k * 0.2);
      return { x: cx + r0 * wob * Math.cos(a) * 1.18, y: cy + r0 * wob * Math.sin(a) * 0.9 };
    });
    const gold = k === 9;
    out.push(line(pts, { closed: true, color: gold ? GOLD : ramp(t), o: gold ? 0.85 : 0.5 - t * 0.2, w: gold ? 2.6 : 1.4 }));
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="90" fill="url(#halo)"/>`);
  return frame(out);
};

// AI — a fan of rays curving out of one bright source, like light through a
// lens: one agent, many reaches.
scenes["ai"] = () => {
  const sx = 1010, sy = 470, out = [];
  const N = 46;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1);
    const a = lerp(-1.25, 1.25, t);
    const len = 700 + 240 * Math.sin(t * Math.PI);
    const pts = Array.from({ length: 24 }, (_, i) => {
      const u = i / 23, r = 25 + u * len;
      const ang = a + 0.55 * Math.sin(u * 2.4 + t * 5) * u * (a > 0 ? 1 : 0.8);
      return { x: sx + r * Math.cos(ang), y: sy + r * Math.sin(ang) * 0.8 };
    });
    const hot = k % 9 === 4;
    out.push(line(pts, { color: hot ? GOLD : ramp(0.25 + 0.7 * Math.abs(t - 0.5) * 1.4), o: hot ? 0.8 : 0.45, w: hot ? 2.2 : 1.2 }));
  }
  out.push(`<circle cx="${sx}" cy="${sy}" r="130" fill="url(#halo)"/>`);
  out.push(`<circle cx="${sx}" cy="${sy}" r="9" fill="#F5C98F"/>`);
  return frame(out, { wash: [0.62, 0.52] });
};

// AI value — ridgelines that climb: each ridge sits higher and swells more
// than the one in front, the top one in gold. Ridges occlude those behind.
scenes["ai-value-proposition"] = () => {
  const out = [];
  const R = 15;
  for (let k = 0; k < R; k++) {
    const t = k / (R - 1); // 0 = back (top), 1 = front (bottom)
    const base = 380 + t * 480;
    const amp = 70 + (1 - t) * 170;
    const pts = Array.from({ length: 60 }, (_, i) => {
      const u = i / 59, x = u * W;
      const bump = Math.exp(-(((u - (0.78 - (1 - t) * 0.04)) / 0.2) ** 2));
      const ripple = 10 * Math.sin(u * 14 + k * 1.3) * (0.4 + u);
      const climb = u * u * (0.35 + (1 - t) * 0.5) * 120;
      return { x, y: base - amp * bump - climb - ripple };
    });
    const top = k === 0;
    const poly = smooth(pts) + `L${W} ${H}L0 ${H}Z`;
    out.push(`<path d="${poly}" fill="#14171C" fill-opacity=".92" stroke="${rgb(top ? GOLD : ramp(1 - t))}" stroke-opacity="${top ? 0.95 : 0.55 - (1 - t) * 0.1}" stroke-width="${top ? 2.6 : 1.4}" stroke-linejoin="round"/>`);
  }
  return frame(out, { wash: [0.8, 0.3] });
};

// Partners — two streams of lines, one grey and one red, that cross and
// interleave in the middle: separate sources working as one.
scenes["partners"] = () => {
  const out = [], N = 20;
  for (let k = 0; k < N; k++) {
    const t = k / (N - 1);
    for (const dir of [1, -1]) {
      const y0 = dir > 0 ? 80 + t * 300 : 820 - t * 300; // start on the left edge
      const y1 = dir > 0 ? 820 - t * 300 : 80 + t * 300; // end on the right edge
      const pts = Array.from({ length: 30 }, (_, i) => {
        const u = i / 29, s = u * u * (3 - 2 * u);
        return { x: -20 + u * 1640, y: lerp(y0, y1, s) + 18 * Math.sin(u * 6 + t * 4) * Math.sin(u * Math.PI) };
      });
      const hot = k === 10 && dir > 0;
      out.push(line(pts, { color: hot ? GOLD : dir > 0 ? mix(MAROON, RED, t) : GREY, o: hot ? 0.9 : dir > 0 ? 0.55 : 0.4, w: hot ? 2.6 : 1.3 }));
    }
  }
  return frame(out, { wash: [0.7, 0.5] });
};

// Privacy — nested rounded contours closing round a lit core, the outer
// ones fading and the boundary dashed gold: kept inside, kept safe.
scenes["privacy"] = () => {
  const cx = 1120, cy = 450, out = [];
  const N = 20;
  for (let k = N - 1; k >= 0; k--) {
    const t = k / (N - 1), s = 40 + k * 24;
    const n = 4.2 - t * 1.6; // superellipse exponent: squarer inside
    const pts = Array.from({ length: 96 }, (_, i) => {
      const a = (i / 96) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const r = 1 / Math.pow(Math.pow(Math.abs(c), n) + Math.pow(Math.abs(sn), n), 1 / n);
      return { x: cx + s * 1.22 * r * c, y: cy + s * 0.96 * r * sn };
    });
    const boundary = k === 11;
    out.push(line(pts, { closed: true, color: boundary ? GOLD : ramp(1 - t), o: boundary ? 0.9 : 0.5 - t * 0.28, w: boundary ? 2.4 : 1.4, dash: boundary ? "2 10" : undefined }));
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="70" fill="url(#halo)"/>`);
  return frame(out);
};

// Contact — two sets of ripples, gold and red, spreading until they meet:
// a message going out and a reply coming back.
scenes["contact"] = () => {
  const out = [];
  const sources = [{ x: 960, y: 610, c: GOLD }, { x: 1350, y: 290, c: RED }];
  for (const s of sources) {
    for (let k = 0; k < 16; k++) {
      const t = k / 15, r = 36 + k * 44;
      const pts = Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2;
        return { x: s.x + r * Math.cos(a) * (1 + 0.025 * Math.sin(a * 3 + k)), y: s.y + r * Math.sin(a) * (1 + 0.025 * Math.sin(a * 3 + k)) };
      });
      out.push(line(pts, { closed: true, color: mix(s.c, GREY, t * 0.8), o: 0.6 - t * 0.38, w: k === 0 ? 2.4 : 1.3 }));
    }
    out.push(`<circle cx="${s.x}" cy="${s.y}" r="8" fill="${rgb(s.c === GOLD ? PALE : s.c)}"/>`);
    out.push(`<circle cx="${s.x}" cy="${s.y}" r="90" fill="url(#halo)" opacity="${s.c === GOLD ? 0.8 : 0.5}"/>`);
  }
  return frame(out);
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(scenes)) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), make());
  console.log(`assets/artwork/heroes/${name}.svg`);
}
