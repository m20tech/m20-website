#!/usr/bin/env node
// Generates the page hero backgrounds in assets/artwork/heroes/ (1600×900
// SVGs): dark network art in the spirit of the homepage's hero-network.jpg,
// with one idea per page. Seeded, so re-running gives identical files.
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

const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const f = (n) => +n.toFixed(1);

// A scene is nodes + edges. kind: "dim" (grey), "hot" (red glow), "gold".
function render({ nodes, edges, rings = [], extras = "", seed = 1 }) {
  const rand = rng(seed);
  const pal = {
    dim: { fill: "#2A303B", stroke: "#4A5365", glow: null },
    hot: { fill: "#F0654F", stroke: "#FFB3A6", glow: "#E0533F" },
    gold: { fill: "#F5C98F", stroke: "#FFE3BE", glow: "#E8A04C" },
  };
  const edgeColor = (a, b) =>
    a.kind === "hot" || b.kind === "hot" ? "#E0533F" : a.kind === "gold" || b.kind === "gold" ? "#E8A04C" : "#5A6478";
  const lines = edges.map(([i, j]) => {
    const a = nodes[i], b = nodes[j];
    const lit = a.kind !== "dim" || b.kind !== "dim";
    return `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" stroke="${edgeColor(a, b)}" stroke-opacity="${lit ? 0.7 : 0.38}" stroke-width="${lit ? 1.8 : 1.2}"/>`;
  });
  // Depth: nodes flagged `far` are blurred and fainter, like the photo.
  const far = nodes.filter((n) => n.far), near = nodes.filter((n) => !n.far);
  const dot = (n) => {
    const p = pal[n.kind ?? "dim"];
    const halo = p.glow ? `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(n.r * 5)}" fill="url(#g-${n.kind})"/>` : "";
    return `${halo}<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${f(n.r)}" fill="${p.fill}" stroke="${p.stroke}" stroke-opacity=".55" stroke-width="1.5"/>`;
  };
  const ringSvg = rings
    .map((r) => `<circle cx="${r.cx}" cy="${r.cy}" r="${r.r}" fill="none" stroke="${r.color ?? "#5A6478"}" stroke-opacity="${r.o ?? 0.35}" stroke-width="${r.w ?? 1.5}"${r.dash ? ` stroke-dasharray="${r.dash}"` : ""} stroke-linecap="round"/>`)
    .join("\n    ");
  void rand;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="g-hot"><stop offset="0" stop-color="#E0533F" stop-opacity=".55"/><stop offset="1" stop-color="#E0533F" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-gold"><stop offset="0" stop-color="#E8A04C" stop-opacity=".5"/><stop offset="1" stop-color="#E8A04C" stop-opacity="0"/></radialGradient>
    <radialGradient id="wash" cx=".68" cy=".5" r=".6"><stop offset="0" stop-color="#96271C" stop-opacity=".32"/><stop offset="1" stop-color="#96271C" stop-opacity="0"/></radialGradient>
    <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#14171C"/>
  <rect width="${W}" height="${H}" fill="url(#wash)"/>
  <g>
    ${ringSvg}
  </g>
  <g>
    ${lines.join("\n    ")}
  </g>
  <g filter="url(#soft)" opacity=".7">
    ${far.map(dot).join("\n    ")}
  </g>
  <g>
    ${near.map(dot).join("\n    ")}
  </g>
  ${extras}
</svg>
`;
}

// Scatter helper: jittered points in a box, avoiding a list of keep-out discs.
function scatter(rand, n, box, avoid = [], min = 70) {
  const pts = [];
  let guard = 0;
  while (pts.length < n && guard++ < n * 80) {
    const p = { x: box[0] + rand() * (box[2] - box[0]), y: box[1] + rand() * (box[3] - box[1]) };
    if ([...pts, ...avoid].every((q) => Math.hypot(q.x - p.x, q.y - p.y) > (q.min ?? min))) pts.push(p);
  }
  return pts;
}

// Connect each node to its k nearest neighbours (no duplicate edges).
function nearest(nodes, k, maxLen = 330, skip = () => false) {
  const seen = new Set(), edges = [];
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)])
      .filter(([j, d]) => j !== i && d < maxLen)
      .sort((p, q) => p[1] - q[1])
      .slice(0, k)
      .forEach(([j]) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key) && !skip(i, j)) { seen.add(key); edges.push([i, j]); }
      });
  });
  return edges;
}

const sparkle = (x, y, s) =>
  `<path d="M${x} ${y - s} L${x + s * 0.22} ${y - s * 0.22} L${x + s} ${y} L${x + s * 0.22} ${y + s * 0.22} L${x} ${y + s} L${x - s * 0.22} ${y + s * 0.22} L${x - s} ${y} L${x - s * 0.22} ${y - s * 0.22} Z" fill="#F5C98F" fill-opacity=".9"/>`;

const dim = (p, r = 7, far = false) => ({ ...p, r, kind: "dim", far });
const scenes = {};

// Atlassian services — a cycle: five tool hubs round a ring, one linked to the
// centre (train, develop, support, optimize).
scenes["atlassian-services"] = () => {
  const cx = 1130, cy = 450, R = 270, rand = rng(11);
  const hubs = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r: 15, kind: i === 1 ? "hot" : "dim" };
  });
  hubs[3].kind = "gold";
  const nodes = [{ x: cx, y: cy, r: 12, kind: "dim" }, ...hubs];
  const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]];
  hubs.forEach((h, i) => {
    for (let k = 0; k < 3; k++) {
      const a = Math.atan2(h.y - cy, h.x - cx) + (k - 1) * 0.55 + (rand() - 0.5) * 0.2;
      const d = 90 + rand() * 60;
      nodes.push(dim({ x: h.x + d * Math.cos(a), y: h.y + d * Math.sin(a) }, 6 + rand() * 3, rand() > 0.6));
      edges.push([i + 1, nodes.length - 1]);
    }
  });
  scatter(rng(5), 12, [640, 40, 1580, 860], nodes.map((n) => ({ ...n, min: 150 })), 120).forEach((p) => nodes.push(dim(p, 5, true)));
  edges.push(...nearest(nodes.slice(16), 2, 260).map(([a, b]) => [a + 16, b + 16]));
  return render({
    nodes, edges, seed: 11,
    rings: [{ cx, cy, r: R, color: "#E8A04C", o: 0.5, w: 2.5, dash: "2 10" }, { cx, cy, r: R + 150, o: 0.18 }],
  });
};

// AI — hub and spokes: one glowing agent node reaching out to the rest.
scenes["ai"] = () => {
  const cx = 1120, cy = 450, rand = rng(23);
  const nodes = [{ x: cx, y: cy, r: 20, kind: "hot" }];
  const edges = [];
  [[150, 8], [290, 12], [430, 14]].forEach(([r, n], ring) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.4 + (rand() - 0.5) * 0.25;
      const rr = r + (rand() - 0.5) * 40;
      const p = { x: cx + rr * Math.cos(a) * 1.25, y: cy + rr * Math.sin(a) * 0.85 };
      if (p.x < 520 || p.x > 1580 || p.y < 30 || p.y > 870) continue;
      nodes.push(dim(p, ring === 0 ? 10 : 6 + rand() * 3, ring === 2));
    }
  });
  nodes.forEach((n, i) => { if (i && Math.hypot(n.x - cx, n.y - cy) < 200) edges.push([0, i]); });
  edges.push(...nearest(nodes.slice(1), 2, 260).map(([a, b]) => [a + 1, b + 1]));
  [3, 9, 17].forEach((i) => nodes[i] && (nodes[i].kind = i === 9 ? "gold" : "hot"));
  return render({
    nodes, edges, seed: 23,
    rings: [{ cx, cy, r: 190, o: 0.2 }, { cx, cy, r: 370, o: 0.14, dash: "3 9" }],
    extras: sparkle(1390, 250, 20) + sparkle(1310, 300, 11),
  });
};

// AI value proposition — rising tiers: each tier of the network sits higher
// and glows brighter than the one before it.
scenes["ai-value-proposition"] = () => {
  const rand = rng(37);
  const tiers = [
    { x: 700, y: 690, n: 4 }, { x: 900, y: 570, n: 4 }, { x: 1110, y: 440, n: 4 }, { x: 1320, y: 310, n: 3 },
  ];
  const nodes = [], idx = [];
  tiers.forEach((t, ti) => {
    idx.push([]);
    for (let i = 0; i < t.n; i++) {
      const kind = ti === 3 && i === 1 ? "hot" : ti === 2 && i === 2 ? "gold" : "dim";
      nodes.push({ x: t.x + (i - t.n / 2) * 62 + rand() * 24, y: t.y + (i % 2) * 50 + (rand() - 0.5) * 40, r: 7 + ti * 2.2, kind, far: ti === 0 });
      idx[ti].push(nodes.length - 1);
    }
  });
  const edges = [];
  idx.forEach((tier, ti) => {
    for (let i = 0; i < tier.length - 1; i++) edges.push([tier[i], tier[i + 1]]);
    if (ti < idx.length - 1) tier.forEach((a, i) => { edges.push([a, idx[ti + 1][Math.min(i, idx[ti + 1].length - 1)]]); edges.push([a, idx[ti + 1][Math.max(0, i - 1)]]); });
  });
  const base = nodes.length;
  scatter(rng(8), 14, [600, 60, 1580, 860], nodes.map((n) => ({ ...n, min: 120 })), 110).forEach((p) => nodes.push(dim(p, 5, true)));
  edges.push(...nearest(nodes.slice(base), 2, 240).map(([a, b]) => [a + base, b + base]));
  return render({ nodes, edges, seed: 37, extras: sparkle(1480, 190, 18) });
};

// Partners — two clusters joined by a few bright bridges.
scenes["partners"] = () => {
  const rand = rng(53);
  const left = scatter(rand, 11, [640, 200, 1000, 720], [], 85).map((p) => dim(p, 8 + rand() * 3));
  const right = scatter(rand, 11, [1180, 200, 1540, 720], [], 85).map((p) => dim(p, 8 + rand() * 3));
  const nodes = [...left, ...right];
  const edges = [
    ...nearest(left, 3, 230),
    ...nearest(right, 3, 230).map(([a, b]) => [a + left.length, b + left.length]),
  ];
  // Bridges: the closest left/right pairs, lit.
  const pairs = [];
  left.forEach((a, i) => right.forEach((b, j) => pairs.push([i, j + left.length, Math.hypot(a.x - b.x, a.y - b.y)])));
  pairs.sort((p, q) => p[2] - q[2]).slice(0, 3).forEach(([i, j], k) => {
    nodes[i].kind = k === 1 ? "gold" : "hot"; nodes[j].kind = k === 1 ? "gold" : "hot";
    nodes[i].r += 3; nodes[j].r += 3;
    edges.push([i, j]);
  });
  scatter(rng(2), 8, [560, 40, 1590, 860], nodes.map((n) => ({ ...n, min: 120 })), 100).forEach((p) => nodes.push(dim(p, 5, true)));
  return render({ nodes, edges, seed: 53 });
};

// Privacy — a protected core: the lit network sits inside a dashed boundary;
// outside nodes connect only as far as the line.
scenes["privacy"] = () => {
  const cx = 1130, cy = 450, R = 250, rand = rng(71);
  const inner = scatter(rand, 9, [cx - R * 0.75, cy - R * 0.75, cx + R * 0.75, cy + R * 0.75], [], 85)
    .filter((p) => Math.hypot(p.x - cx, p.y - cy) < R - 45)
    .map((p) => dim(p, 9));
  inner[0].kind = "hot"; inner[0].r = 14;
  if (inner[3]) inner[3].kind = "gold";
  const outer = scatter(rand, 16, [580, 40, 1590, 860], [{ x: cx, y: cy, min: R + 60 }], 100).map((p) => dim(p, 5 + rand() * 2, true));
  const nodes = [...inner, ...outer];
  const edges = [
    ...nearest(inner, 3, 240),
    ...nearest(outer, 2, 260).map(([a, b]) => [a + inner.length, b + inner.length]),
  ];
  return render({
    nodes, edges, seed: 71,
    rings: [{ cx, cy, r: R, color: "#E8A04C", o: 0.55, w: 2.5, dash: "2 10" }, { cx, cy, r: R + 42, o: 0.16 }],
  });
};

// Contact — two nodes and the one bright link between them, over a quiet net.
scenes["contact"] = () => {
  const rand = rng(89);
  const a = { x: 930, y: 590, r: 20, kind: "gold" }, b = { x: 1360, y: 310, r: 20, kind: "hot" };
  const nodes = [a, b];
  scatter(rand, 20, [580, 40, 1590, 860], [{ ...a, min: 110 }, { ...b, min: 110 }], 105).forEach((p) => nodes.push(dim(p, 5 + rand() * 4, rand() > 0.5)));
  const edges = [[0, 1], ...nearest(nodes, 2, 260)];
  return render({
    nodes, edges, seed: 89,
    rings: [{ cx: 930, cy: 590, r: 70, color: "#E8A04C", o: 0.35, dash: "2 8" }, { cx: 1360, cy: 310, r: 70, color: "#E0533F", o: 0.35, dash: "2 8" }],
  });
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(scenes)) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), make());
  console.log(`assets/artwork/heroes/${name}.svg`);
}
