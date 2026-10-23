#!/usr/bin/env node
// Builds the brand asset library from cms/library.mjs: a searchable gallery
// at /library/ (unlisted, noindex), a machine-readable library.json for other
// projects, and standalone brand-red copies of every icon. build.mjs calls
// writeLibrary() on every build; scripts/design-docs.mjs reads the same model
// for the Confluence library page.
//
//   node scripts/library.mjs --check   list assets with no tags in cms/library.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LIBRARY, LIBRARY_EXTENSIONS, LIBRARY_PATH } from "../cms/library.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const RED = "#C0392B";
const extOf = (p) => p.split(".").pop().toLowerCase();
const baseOf = (p) => path.basename(p).replace(/\.[^.]+$/, "");
const humanize = (s) => s.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// ------------------------------------------------------------ image sizes

function imageSize(file) {
  const buf = fs.readFileSync(file);
  const ext = extOf(file);
  try {
    if (ext === "svg") {
      const s = buf.toString("utf8");
      const vb = s.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
      if (vb) return { width: +vb[1], height: +vb[2] };
    }
    if (ext === "png") return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (ext === "jpg" || ext === "jpeg") {
      for (let i = 2; i < buf.length; ) {
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        }
        i += 2 + len;
      }
    }
    if (ext === "webp") {
      const chunk = buf.toString("ascii", 12, 16);
      if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (chunk === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
      }
      if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
  } catch {}
  return {};
}

// ------------------------------------------------------------------ model

function collectionFiles(c, root) {
  const files = [...(c.files ?? [])];
  if (c.dir && fs.existsSync(path.join(root, c.dir))) {
    for (const f of fs.readdirSync(path.join(root, c.dir)).sort()) {
      if (LIBRARY_EXTENSIONS.includes(extOf(f))) files.push(`${c.dir}/${f}`);
    }
  }
  return files;
}

// Which pages use each asset: "/assets/…" values (and icon names) anywhere in
// a page's content JSON. `entries` are the CMS entries from cms/schema.mjs.
export function scanUsage(entries, root = ROOT) {
  const used = new Map();
  const add = (key, page) => {
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(page);
  };
  for (const e of entries) {
    const file = path.join(root, e.path);
    if (!fs.existsSync(file)) continue;
    const page = e.template ? "/" + e.template.replace(/index\.html$/, "") : null;
    const label = page && !e.template.includes(".dc.") ? page : e.label;
    const walk = (v, key) => {
      if (typeof v === "string") {
        if (v.startsWith("/assets/")) add(v.slice(1), label);
        else if (/icon/i.test(key ?? "")) add(`cms/icons/${v}.svg`, label);
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
    };
    try { walk(JSON.parse(fs.readFileSync(file, "utf8"))); } catch {}
  }
  return used;
}

export function loadLibrary({ root = ROOT, usage = new Map() } = {}) {
  const errors = [];
  const untagged = [];
  const collections = LIBRARY.map((c) => {
    const groups = new Map();
    for (const rel of collectionFiles(c, root)) {
      const id = baseOf(rel);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(rel);
    }
    for (const id of Object.keys(c.items ?? {})) {
      if (!groups.has(id)) errors.push(`cms/library.mjs: ${c.id}/${id} has an entry but no file`);
    }
    const items = [...groups].map(([id, rels]) => {
      const meta = c.items?.[id];
      if (!meta?.tags?.length) untagged.push(`${c.id}/${id}`);
      // SVG first: it's the preview and the format pages use.
      rels.sort((a, b) => (extOf(a) === "svg" ? -1 : extOf(b) === "svg" ? 1 : a.localeCompare(b)));
      const files = rels.map((rel) => {
        const abs = path.join(root, rel);
        const publicPath = c.kind === "icon" ? `${LIBRARY_PATH}icons/${id}.svg` : `/${rel}`;
        return { format: extOf(rel), source: rel, path: publicPath, bytes: fs.statSync(abs).size, ...imageSize(abs) };
      });
      const usedOn = [...new Set(rels.flatMap((r) => [...(usage.get(r) ?? [])]))].sort();
      const item = {
        key: `${c.id}/${id}`,
        id,
        collection: c.id,
        title: meta?.title ?? humanize(id),
        tags: meta?.tags ?? [],
        note: meta?.note ?? "",
        files,
        usedOn,
      };
      if (c.kind === "icon") {
        const svg = fs.readFileSync(path.join(root, rels[0]), "utf8");
        const m = svg.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/);
        item.icon = { viewBox: m?.[1] ?? "0 0 24 24", body: (m?.[2] ?? "").trim() };
      }
      return item;
    });
    // Link each icon to its Spot version, when there is one.
    if (c.kind === "icon") {
      const spots = new Set(collectionFiles(LIBRARY.find((x) => x.id === "spots"), root).map(baseOf));
      for (const it of items) if (spots.has(it.id)) it.related = [`spots/${it.id}`];
    }
    const { items: _meta, files: _files, dir, ...rest } = c;
    return { ...rest, items };
  });
  return { collections, errors, untagged };
}

// A standalone icon file: brand-red stroke, explicit size.
export function iconSvg(icon, color = RED, size) {
  const [, , w, h] = icon.viewBox.split(/\s+/).map(Number);
  const s = size ?? w;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" width="${s}" height="${Math.round((s * h) / w)}" ` +
    `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.body}</svg>\n`
  );
}

// ----------------------------------------------------------------- output

export function writeLibrary(dist, lib, { siteUrl, commit = "" }) {
  const out = path.join(dist, LIBRARY_PATH.replace(/^\/|\/$/g, ""));
  fs.mkdirSync(path.join(out, "icons"), { recursive: true });
  for (const c of lib.collections) {
    if (c.kind !== "icon") continue;
    for (const it of c.items) fs.writeFileSync(path.join(out, "icons", `${it.id}.svg`), iconSvg(it.icon));
  }
  const json = libraryJson(lib, { siteUrl, commit });
  fs.writeFileSync(path.join(out, "library.json"), JSON.stringify(json, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "index.html"), renderGallery(json));
}

export function libraryJson(lib, { siteUrl, commit = "" }) {
  return {
    name: "M20 Technology asset library",
    source: "https://github.com/m20tech/m20-website/blob/main/cms/library.mjs",
    siteUrl,
    commit,
    collections: lib.collections.map(({ items, ...c }) => ({
      ...c,
      items: items.map((it) => ({
        ...it,
        files: it.files.map(({ source, ...f }) => ({ ...f, url: siteUrl + f.path, source })),
      })),
    })),
  };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function renderGallery(data) {
  const count = data.collections.reduce((n, c) => n + c.items.length, 0);
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<!-- GENERATED by scripts/library.mjs from cms/library.mjs. Do not edit; see "Asset library" in design.md. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Asset Library · M20 Technology</title>
<link rel="icon" href="/assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Generated tool page: a <style> block rather than the site's inline styles,
     since nothing here is CMS-edited. Tokens are design.md's. */
  :root { --paper:#FAF7F4; --paper-alt:#F3EEE8; --ink:#14171C; --surface:#23282F; --muted:#5A6270;
    --border:#E4DCD3; --red:#C0392B; --red-hover:#96271C; --tint:#F9E9E4; --gold:#E8A04C; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font:400 17px/1.65 'Source Sans 3', system-ui, sans-serif; }
  a { color:var(--red); }
  .wrap { max-width:1180px; margin-inline:auto; padding-inline:clamp(20px,4vw,48px); }
  header.top { position:sticky; top:0; z-index:50; background:rgba(250,247,244,.94); backdrop-filter:blur(10px);
    border-bottom:1px solid var(--border); }
  header.top .wrap { display:flex; align-items:center; gap:16px; min-height:68px; flex-wrap:wrap; padding-block:10px; }
  .lockup { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--ink); }
  .lockup img { width:36px; height:36px; }
  .lockup b { display:block; font:700 20px/1 'Source Sans 3', sans-serif; }
  .lockup span { display:block; margin-top:3px; font:600 10px/1 'Source Sans 3', sans-serif; letter-spacing:.2em; color:var(--muted); }
  .search { flex:1 1 320px; display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid var(--border);
    border-radius:999px; padding:0 18px; min-height:46px; }
  .search:focus-within { border-color:var(--red); }
  .search input { flex:1; border:0; outline:0; font:400 16px 'Source Sans 3', sans-serif; background:transparent; color:var(--ink); min-width:0; }
  .search kbd { font:600 12px 'Source Sans 3'; color:var(--muted); border:1px solid var(--border); border-radius:6px; padding:1px 7px; }
  .hero { padding-block:clamp(36px,4.5vw,52px) 8px; }
  .eyebrow { display:flex; align-items:center; gap:12px; font:600 12.5px 'Source Sans 3'; letter-spacing:.16em; text-transform:uppercase; color:var(--red); margin:0 0 18px; }
  .eyebrow::before { content:""; width:40px; height:2px; background:currentColor; }
  h1 { font:700 clamp(38px,5.4vw,60px)/1.15 'Source Serif 4', Georgia, serif; letter-spacing:-.01em; margin:0 0 20px; }
  h2 { font:600 clamp(24px,3vw,32px)/1.2 'Source Serif 4', Georgia, serif; letter-spacing:-.01em; margin:0 0 6px; }
  .lead { font-size:19px; color:var(--muted); max-width:720px; margin:0; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; padding-block:24px 8px; }
  .chip { font:600 14px 'Source Sans 3'; border:1.5px solid var(--border); background:#fff; color:var(--ink); border-radius:999px;
    padding:6px 14px; cursor:pointer; transition:border-color .18s ease, background .18s ease; }
  .chip:hover { border-color:var(--ink); }
  .chip[aria-pressed="true"] { background:var(--ink); border-color:var(--ink); color:#fff; }
  .chip small { font-weight:500; opacity:.7; margin-left:4px; }
  section.col { padding-block:28px 8px; }
  .col-head p { margin:0; color:var(--muted); max-width:800px; }
  .restricted { margin:10px 0 0; padding:10px 14px; border-radius:12px; background:#fff; border:1px solid var(--border);
    border-top:3px solid var(--gold); font-size:15px; color:var(--muted); }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr)); gap:16px; margin-top:20px; }
  .card { display:flex; flex-direction:column; text-align:left; background:#fff; border:1px solid var(--border); border-radius:18px;
    padding:0; overflow:hidden; cursor:pointer; font:inherit; color:inherit;
    transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
  .card:hover, .card:focus-visible { border-color:var(--red); box-shadow:0 18px 40px rgba(20,23,28,.10); transform:translateY(-4px); outline:0; }
  .thumb { aspect-ratio:1; display:grid; place-items:center; background:var(--paper-alt); padding:16px; }
  .thumb.white { background:#fff; border-bottom:1px solid var(--border); }
  .thumb img { max-width:100%; max-height:100%; object-fit:contain; }
  .thumb.wide { aspect-ratio:16/10; padding:0; }
  .thumb.wide img { width:100%; height:100%; object-fit:cover; }
  .badge { width:64px; height:64px; border-radius:14px; background:var(--tint); display:grid; place-items:center; }
  .badge svg { width:30px; height:30px; }
  .meta { padding:10px 14px 12px; }
  .meta b { display:block; font:600 15px/1.3 'Source Sans 3'; }
  .meta span { font-size:13px; color:var(--muted); }
  .grid.wide { grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr)); }
  .empty { padding:60px 0; text-align:center; color:var(--muted); }
  footer { margin-top:56px; background:var(--ink); color:#C9CDD6; font-size:15px; }
  footer .wrap { padding-block:28px; display:flex; flex-wrap:wrap; gap:8px 24px; justify-content:space-between; }
  footer a { color:#F5C98F; }
  /* Detail dialog */
  dialog { border:0; padding:0; border-radius:22px; width:min(860px, calc(100vw - 32px)); max-height:calc(100vh - 32px);
    box-shadow:0 40px 90px rgba(0,0,0,.4); color:var(--ink); }
  dialog::backdrop { background:rgba(20,23,28,.6); backdrop-filter:blur(2px); }
  .detail { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); }
  .stage { background:var(--paper-alt); display:grid; place-items:center; padding:28px; min-height:300px; position:relative; }
  .stage.dark { background:var(--ink); }
  .stage.white { background:#fff; }
  .stage img { max-width:100%; max-height:440px; object-fit:contain; }
  .stage svg { width:min(200px,60%); height:auto; }
  .info { padding:28px 28px 24px; display:flex; flex-direction:column; gap:14px; }
  .info h3 { font:700 26px/1.2 'Source Serif 4', Georgia, serif; margin:0; }
  .info .sub { color:var(--muted); font-size:15px; margin:-8px 0 0; }
  .tags { display:flex; flex-wrap:wrap; gap:6px; }
  .tags span { font-size:13px; background:var(--paper-alt); border-radius:999px; padding:2px 10px; color:var(--muted); }
  .label { font:600 12px 'Source Sans 3'; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin:0 0 6px; }
  .swatches { display:flex; gap:8px; }
  .swatch { width:34px; height:34px; border-radius:999px; border:2px solid var(--border); cursor:pointer; }
  .swatch[aria-pressed="true"] { outline:2px solid var(--ink); outline-offset:2px; }
  select { font:400 15px 'Source Sans 3'; border:1.5px solid var(--border); border-radius:10px; padding:7px 10px; background:var(--paper); }
  .actions { display:flex; flex-wrap:wrap; gap:8px; }
  .btn { font:600 15px 'Source Sans 3'; letter-spacing:.02em; border-radius:999px; min-height:38px; padding:8px 18px; cursor:pointer;
    border:2px solid var(--ink); background:transparent; color:var(--ink); text-decoration:none; display:inline-flex; align-items:center;
    transition:background .18s ease, color .18s ease, box-shadow .18s ease; }
  .btn:hover { background:var(--ink); color:#fff; }
  .btn.primary { background:var(--red); border-color:var(--red); color:#fff; }
  .btn.primary:hover { background:var(--red-hover); border-color:var(--red-hover); box-shadow:0 8px 24px rgba(192,57,43,.28); }
  .files { width:100%; border-collapse:collapse; font-size:14.5px; }
  .files td { padding:7px 0; border-top:1px solid var(--border); vertical-align:middle; }
  .files td:last-child { text-align:right; white-space:nowrap; }
  .files a { font-weight:600; margin-left:10px; }
  .note { font-size:15px; color:var(--muted); margin:0; }
  .close { position:absolute; top:14px; right:14px; width:38px; height:38px; border-radius:999px; border:0; background:rgba(255,255,255,.9);
    cursor:pointer; font-size:20px; line-height:1; z-index:2; }
  .toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); background:var(--ink); color:#fff; border-radius:999px;
    padding:10px 20px; font:600 15px 'Source Sans 3'; opacity:0; transition:opacity .18s ease; pointer-events:none; z-index:200; }
  .toast.show { opacity:1; }
</style>
</head>
<body>
<header class="top">
  <div class="wrap">
    <a class="lockup" href="${LIBRARY_PATH}">
      <img src="/assets/logo.png" alt="" width="36" height="36">
      <div><b>M20</b><span>ASSET LIBRARY</span></div>
    </a>
    <label class="search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6270" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <input id="q" type="search" placeholder="Search ${count} icons, illustrations, logos…" autocomplete="off" aria-label="Search assets">
      <kbd>/</kbd>
    </label>
  </div>
</header>
<main class="wrap">
  <div class="hero">
    <p class="eyebrow">Brand assets</p>
    <h1>Icons &amp; graphics</h1>
    <p class="lead">
      Every reusable M20 icon, illustration, logo, and background, in one place.
      Click an asset to download it or copy its URL. Icons can be exported in any
      brand color and size.
    </p>
  </div>
  <div class="chips" id="chips" role="group" aria-label="Filter by collection"></div>
  <div id="results"></div>
</main>
<footer>
  <div class="wrap">
    <span>
      Managed by agents from <a href="https://github.com/m20tech/m20-website/blob/main/cms/library.mjs">cms/library.mjs</a>.
      To add an asset, see <b>Asset library</b> in <a href="https://github.com/m20tech/m20-website/blob/main/design.md">design.md</a>.
    </span>
    <span><a href="${LIBRARY_PATH}library.json">library.json</a>${data.commit ? ` · ${esc(data.commit.slice(0, 7))}` : ""}</span>
  </div>
</footer>
<dialog id="dlg" aria-label="Asset details"></dialog>
<div class="toast" id="toast" role="status"></div>
<script type="application/json" id="data">${payload}</script>
<script>
(() => {
  const data = JSON.parse(document.getElementById("data").textContent);
  const COLORS = [["Red", "#C0392B"], ["Ink", "#14171C"], ["Gold", "#E8A04C"], ["White", "#FFFFFF"]];
  const items = data.collections.flatMap((c) => c.items.map((it) => ({ ...it, col: c })));
  const hay = (it) => [it.title, it.id, it.col.label, it.col.id, ...it.tags, it.note].join(" ").toLowerCase();
  items.forEach((it) => (it.hay = hay(it)));
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const kb = (n) => (n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB" : (n / 1048576).toFixed(1) + " MB");
  const iconMarkup = (it, color, size) => {
    const [, , w, h] = it.icon.viewBox.split(/\\s+/).map(Number);
    const attrs = size ? ' width="' + size + '" height="' + Math.round((size * h) / w) + '"' : "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + it.icon.viewBox + '"' + attrs +
      ' fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + it.icon.body + "</svg>";
  };
  let active = "all";

  function thumb(it) {
    if (it.icon) return '<div class="thumb"><div class="badge">' + iconMarkup(it, "#C0392B") + "</div></div>";
    const f = it.files[0];
    const wide = it.col.id === "covers" || it.col.id === "illustrations" || it.col.id === "backgrounds";
    const white = ["partners", "clients", "products"].includes(it.col.id);
    return '<div class="thumb' + (wide ? " wide" : "") + (white ? " white" : "") + '"><img loading="lazy" src="' + f.path + '" alt=""></div>';
  }

  function render() {
    const terms = $("#q").value.toLowerCase().trim().split(/\\s+/).filter(Boolean);
    const match = (it) => (active === "all" || it.col.id === active) && terms.every((t) => it.hay.includes(t));
    const counts = Object.fromEntries(data.collections.map((c) => [c.id, items.filter((it) => it.col === c && terms.every((t) => it.hay.includes(t))).length]));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    $("#chips").innerHTML = [["all", "All", total], ...data.collections.map((c) => [c.id, c.label, counts[c.id]])]
      .map(([id, label, n]) => '<button class="chip" data-col="' + id + '" aria-pressed="' + (active === id) + '">' + esc(label) + "<small>" + n + "</small></button>")
      .join("");
    const html = data.collections.map((c) => {
      const list = items.filter((it) => it.col === c && match(it));
      if (!list.length) return "";
      const wide = ["covers", "illustrations", "backgrounds"].includes(c.id);
      return '<section class="col" id="' + c.id + '"><div class="col-head"><h2>' + esc(c.label) + "</h2><p>" + esc(c.description) + " " + esc(c.usage) + "</p>" +
        (c.restricted ? '<p class="restricted"><b>Usage restriction.</b> ' + esc(c.restricted) + "</p>" : "") +
        '</div><div class="grid' + (wide ? " wide" : "") + '">' +
        list.map((it) => '<button class="card" data-key="' + it.key + '">' + thumb(it) + '<div class="meta"><b>' + esc(it.title) + "</b><span>" +
          esc(it.files.map((f) => f.format.toUpperCase()).join(" · ")) + "</span></div></button>").join("") +
        "</div></section>";
    }).join("");
    $("#results").innerHTML = html || '<p class="empty">No assets match “' + esc($("#q").value) + '”.</p>';
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 1600);
  }
  const copy = (text, msg) => navigator.clipboard.writeText(text).then(() => toast(msg), () => toast("Copy failed"));
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function png(svg, size, name) {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.width; cv.height = img.height;
      cv.getContext("2d").drawImage(img, 0, 0);
      cv.toBlob((b) => download(b, name), "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function open(key, push = true) {
    const it = items.find((x) => x.key === key);
    if (!it) return;
    const dlg = $("#dlg");
    const tags = it.tags.length ? '<div class="tags">' + it.tags.map((t) => "<span>" + esc(t) + "</span>").join("") + "</div>" : "";
    const used = it.usedOn.length ? '<p class="note"><b>Used on:</b> ' + it.usedOn.map(esc).join(", ") + "</p>" : "";
    const related = (it.related || []).map((k) => '<a href="#' + k + '">Spot version</a>').join(" · ");
    const restricted = it.col.restricted ? '<p class="restricted"><b>Usage restriction.</b> ' + esc(it.col.restricted) + "</p>" : "";
    const note = it.note ? '<p class="note">' + esc(it.note) + "</p>" : "";
    let stage, controls;
    if (it.icon) {
      stage = '<div class="stage" id="stage"></div>';
      controls = '<div><p class="label">Color</p><div class="swatches">' +
        COLORS.map(([n, c], i) => '<button class="swatch" title="' + n + '" aria-label="' + n + '" data-color="' + c + '" style="background:' + c + '" aria-pressed="' + (i === 0) + '"></button>').join("") +
        '</div></div><div><p class="label">PNG size</p><select id="size">' + [32, 64, 128, 256, 512].map((s) => "<option" + (s === 256 ? " selected" : "") + ">" + s + "</option>").join("") +
        '</select> px</div><div class="actions"><button class="btn primary" data-act="png">Download PNG</button><button class="btn" data-act="svg">Download SVG</button>' +
        '<button class="btn" data-act="copysvg">Copy SVG</button><button class="btn" data-act="url">Copy URL</button></div>';
    } else {
      const f = it.files[0];
      const dark = it.col.id === "covers";
      const white = ["partners", "clients", "products"].includes(it.col.id);
      stage = '<div class="stage' + (white ? " white" : "") + '"><img src="' + f.path + '" alt="' + esc(it.title) + '"></div>';
      controls = '<table class="files">' + it.files.map((f) => "<tr><td><b>" + f.format.toUpperCase() + "</b> " +
        (f.width ? f.width + "×" + f.height + " · " : "") + kb(f.bytes) + '</td><td><a href="' + f.path + '" download>Download</a><a href="#" data-url="' + f.url + '">Copy URL</a></td></tr>').join("") + "</table>";
    }
    dlg.innerHTML = '<button class="close" aria-label="Close">×</button><div class="detail">' + stage + '<div class="info"><div><h3>' + esc(it.title) + '</h3></div><p class="sub">' +
      esc(it.col.label) + " · <code>" + esc(it.key) + "</code>" + (related ? " · " + related : "") + "</p>" + note + restricted + tags + controls + used + "</div></div>";
    let color = COLORS[0][1];
    const paint = () => {
      const st = $("#stage", dlg);
      if (!st) return;
      st.classList.toggle("dark", color === "#FFFFFF");
      st.innerHTML = iconMarkup(it, color);
    };
    paint();
    dlg.onclick = (e) => {
      if (e.target === dlg || e.target.closest(".close")) return dlg.close();
      const sw = e.target.closest(".swatch");
      if (sw) {
        color = sw.dataset.color;
        dlg.querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-pressed", s === sw));
        paint();
      }
      const u = e.target.closest("[data-url]");
      if (u) { e.preventDefault(); copy(u.dataset.url, "URL copied"); }
      const act = e.target.closest("[data-act]")?.dataset.act;
      const name = it.id + (color === "#C0392B" ? "" : "-" + COLORS.find((c) => c[1] === color)[0].toLowerCase());
      if (act === "svg") download(new Blob([iconMarkup(it, color, 24)], { type: "image/svg+xml" }), name + ".svg");
      if (act === "copysvg") copy(iconMarkup(it, color, 24), "SVG copied");
      if (act === "url") copy(it.files[0].url, "URL copied (brand red)");
      if (act === "png") { const s = +$("#size", dlg).value; png(iconMarkup(it, color, s), s, name + "-" + s + ".png"); }
    };
    dlg.onclose = () => { if (location.hash) history.replaceState(null, "", location.pathname + location.search); };
    if (!dlg.open) dlg.showModal();
    if (push) history.replaceState(null, "", "#" + key);
  }

  $("#q").addEventListener("input", render);
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (b) { active = b.dataset.col; render(); }
  });
  $("#results").addEventListener("click", (e) => {
    const c = e.target.closest(".card");
    if (c) open(c.dataset.key);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== $("#q") && !$("#dlg").open) { e.preventDefault(); $("#q").focus(); }
  });
  const fromHash = () => {
    const k = decodeURIComponent(location.hash.slice(1));
    if (items.some((x) => x.key === k)) open(k, false);
    else if (data.collections.some((c) => c.id === k)) { active = k; render(); }
  };
  window.addEventListener("hashchange", fromHash);
  const q = new URLSearchParams(location.search).get("q");
  if (q) $("#q").value = q;
  render();
  fromHash();
})();
</script>
</body>
</html>
`;
}

// -------------------------------------------------------------------- CLI

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const lib = loadLibrary();
  for (const e of lib.errors) console.error(`✗ ${e}`);
  if (lib.untagged.length) {
    console.log(`Assets with no tags in cms/library.mjs (add a title and tags so they're searchable):`);
    for (const k of lib.untagged) console.log(`  - ${k}`);
  } else {
    console.log(`✓ every library asset has tags (${lib.collections.reduce((n, c) => n + c.items.length, 0)} assets)`);
  }
  process.exit(lib.errors.length ? 1 : 0);
}
