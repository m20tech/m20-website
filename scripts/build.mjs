#!/usr/bin/env node
// Builds the site into dist/: renders every CMS-backed template with its
// content JSON and copies everything else as-is. Before writing anything it
// checks that templates, content, and the PagesCMS config (.pages.yml) all
// agree, so a structural change can't ship without its CMS counterpart.
//
//   node scripts/build.mjs              check + build
//   node scripts/build.mjs --check      check only
//   node scripts/build.mjs --sync-cms   regenerate .pages.yml from cms/schema.mjs
//   node scripts/build.mjs --serve      build, serve dist/ on :8000, rebuild on change

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { parse, render, checkTemplate } from "./template.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const ICONS = path.join(ROOT, "cms", "icons");
const PARTIALS = path.join(ROOT, "cms", "partials");
const PAGES_YML = path.join(ROOT, ".pages.yml");

// Repo paths that are tooling or source-of-truth rather than site files.
const EXCLUDE = new Set([
  ".git", ".github", ".claude", "docs", ".vscode", ".wrangler", "node_modules", "dist",
  "cms", "content", "scripts", ".pages.yml", ".gitignore", ".assetsignore",
  "package.json", "package-lock.json", "wrangler.jsonc",
]);
const excluded = (rel) => EXCLUDE.has(rel.split("/")[0]) || (!rel.includes("/") && rel.endsWith(".md"));

async function loadSchema() {
  // Cache-bust so --serve picks up schema edits.
  const mod = await import(`../cms/schema.mjs?t=${Date.now()}`);
  return mod;
}

// ------------------------------------------------------------- .pages.yml

function pagesConfig(schema) {
  const entry = (e) => ({
    name: e.name,
    label: e.label,
    type: "file",
    path: e.path,
    format: "json",
    fields: e.fields.map(cleanField),
  });
  return {
    media: schema.media,
    content: schema.groups.map((g) => ({ name: g.name, label: g.label, type: "group", items: g.entries.map(entry) })),
  };
}

// Strip build-only keys ($-prefixed) so .pages.yml holds only PagesCMS config.
function cleanField(f) {
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if (k.startsWith("$")) continue;
    if (k === "fields") out.fields = v.map(cleanField);
    else if (k === "blocks") out.blocks = v.map(cleanField);
    else out[k] = v;
  }
  return out;
}

function toYaml(value, indent = "") {
  if (Array.isArray(value)) {
    if (!value.length) return " []";
    return value
      .map((v) => {
        const body = isPlain(v) ? ` ${scalar(v)}` : toYaml(v, indent + "  ").replace(/^\n\s*/, " ");
        return `\n${indent}-${body}`;
      })
      .join("");
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `\n${indent}${k}:${isPlain(v) ? ` ${scalar(v)}` : toYaml(v, indent + "  ")}`)
      .join("");
  }
  return ` ${scalar(value)}`;
}
const isPlain = (v) => v === null || typeof v !== "object" || (Array.isArray(v) && !v.length);
function scalar(v) {
  if (Array.isArray(v)) return "[]";
  if (typeof v === "string") return /^[A-Za-z_/][\w ./()&-]*$/.test(v) && !/^(true|false|null|yes|no|on|off)$/i.test(v) && !v.endsWith(" ") ? v : JSON.stringify(v);
  return String(v);
}

function renderPagesYml(schema) {
  return (
    "# GENERATED from cms/schema.mjs by `npm run cms:sync` — do not edit by hand.\n" +
    "# PagesCMS (https://pagescms.org) reads this file to build the editing UI.\n" +
    toYaml(pagesConfig(schema)).trimStart() +
    "\n"
  );
}

// ------------------------------------------------------ content validation

function validate(value, field, where, errors) {
  const at = `${where}.${field.name}`;
  if (field.list) {
    if (!Array.isArray(value)) return errors.push(`${at}: expected a list`);
    const { min, max } = typeof field.list === "object" ? field.list : {};
    if (min != null && value.length < min) errors.push(`${at}: needs at least ${min} items`);
    if (max != null && value.length > max) errors.push(`${at}: allows at most ${max} items`);
    value.forEach((v, i) => validate(v, { ...field, list: false, name: `${field.name}[${i}]` }, where, errors));
    return;
  }
  const required = field.required === true;
  if (value == null || value === "") {
    if (required) errors.push(`${at}: required`);
    return;
  }
  switch (field.type) {
    case "string":
    case "text":
      if (typeof value !== "string") { errors.push(`${at}: expected text`); break; }
      if (field.options?.maxlength && value.length > field.options.maxlength)
        errors.push(`${at}: ${value.length} characters, max ${field.options.maxlength}`);
      if (field.pattern && !new RegExp(field.pattern.regex ?? field.pattern).test(value))
        errors.push(`${at}: ${field.pattern.message ?? "doesn't match the required format"}`);
      break;
    case "select":
      if (!field.options.values.includes(value)) errors.push(`${at}: "${value}" is not one of the options`);
      break;
    case "image":
      if (typeof value !== "string" || !value.startsWith("/")) errors.push(`${at}: expected a root-relative image path`);
      else if (!fs.existsSync(path.join(ROOT, decodeURI(value)))) errors.push(`${at}: image ${value} not found in repo`);
      break;
    case "boolean":
      if (typeof value !== "boolean") errors.push(`${at}: expected true/false`);
      break;
    case "number":
      if (typeof value !== "number") errors.push(`${at}: expected a number`);
      break;
    case "object":
      validateObject(value, field.fields, at, errors);
      break;
    case "block": {
      const b = field.blocks.find((x) => x.name === value?._block);
      if (!b) return errors.push(`${at}: unknown block type "${value?._block}"`);
      const { _block, ...rest } = value;
      validateObject(rest, b.fields, at, errors);
      break;
    }
    default:
      errors.push(`${at}: unsupported field type ${field.type}`);
  }
}

function validateObject(obj, fields, at, errors) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return errors.push(`${at}: expected an object`);
  for (const f of fields) validate(obj[f.name], f, at, errors);
  for (const k of Object.keys(obj)) {
    if (!fields.some((f) => f.name === k)) errors.push(`${at}.${k}: not in the CMS schema (add it to cms/schema.mjs or remove it)`);
  }
}

// Every schema field path, in the same notation checkTemplate reports.
function fieldPaths(fields, prefix = "") {
  const out = [];
  for (const f of fields) {
    const p = prefix ? `${prefix}.${f.name}` : f.name;
    out.push(p);
    if (f.type === "object") out.push(...fieldPaths(f.fields, f.list ? `${p}[]` : p));
    if (f.type === "block") for (const b of f.blocks) {
      out.push(`${p}[]<${b.name}>`);
      out.push(...fieldPaths(b.fields, `${p}[]<${b.name}>`));
    }
  }
  return out;
}

// ------------------------------------------------------------------ build

function walkFiles(dir, rel = "") {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (excluded(r) || ent.name === ".DS_Store") continue;
    if (ent.isDirectory()) out.push(...walkFiles(path.join(dir, ent.name), r));
    else out.push(r);
  }
  return out;
}

// Only `main` builds on Cloudflare are production; every other branch, and
// local builds, are previews and get noindex.
const BRANCH = process.env.WORKERS_CI_BRANCH || "";
const PREVIEW = BRANCH !== "main";

// Values the build computes for each page, available to templates as build.*.
const BUILD_FIELDS = [
  { name: "build", type: "object", fields: [
    { name: "url", type: "string" },
    { name: "path", type: "string" },
    { name: "preview", type: "boolean" },
    { name: "isHome", type: "boolean" },
  ] },
];

// URL path a template serves at: index.html → "/", ai/index.html → "/ai/".
const urlPath = (template) => "/" + template.replace(/index\.html$/, "");

function readJson(file, errors) {
  if (!fs.existsSync(path.join(ROOT, file))) { errors.push(`${file}: missing content file`); return null; }
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8")); }
  catch (err) { errors.push(`${file}: invalid JSON — ${err.message}`); return null; }
}

export async function build({ write = true } = {}) {
  const schema = await loadSchema();
  const errors = [];

  const yml = renderPagesYml(schema);
  const onDisk = fs.existsSync(PAGES_YML) ? fs.readFileSync(PAGES_YML, "utf8") : "";
  if (yml !== onDisk) errors.push(".pages.yml is out of date with cms/schema.mjs — run `npm run cms:sync`");

  // Site-wide settings (SEO defaults etc.) are available to every template as site.*.
  const siteEntry = schema.settings;
  const site = readJson(siteEntry.path, errors);
  if (site) validateObject(site, siteEntry.fields, siteEntry.path, errors);
  const globals = [{ name: "site", type: "object", fields: siteEntry.fields }, ...BUILD_FIELDS];
  const siteUsed = new Set();

  const rendered = new Map();
  const sitemap = [];
  const names = new Set();
  const templates = new Set(schema.entries.map((e) => e.template).filter(Boolean));
  const pageNames = new Set(schema.pages.map((e) => e.name));
  for (const e of schema.entries.filter((x) => x !== siteEntry)) {
    if (names.has(e.name)) errors.push(`duplicate CMS entry name "${e.name}"`);
    names.add(e.name);
    for (const f of e.fields) {
      if (f.name === "site" || f.name === "build") errors.push(`${e.name}: field name "${f.name}" is reserved`);
    }
    if (pageNames.has(e.name) && !e.fields.some((f) => f.name === "seo")) {
      errors.push(`${e.name}: pages need an seo() field and [[> head]] in the template's <head>`);
    }
    const templateFile = path.join(ROOT, e.template);
    const data = readJson(e.path, errors);
    if (!data) continue;
    if (!fs.existsSync(templateFile)) { errors.push(`${e.template}: missing template`); continue; }
    validateObject(data, e.fields, e.path, errors);

    try {
      const ast = parse(fs.readFileSync(templateFile, "utf8"), e.template, { partialDir: PARTIALS });
      const used = checkTemplate(ast, e.fields, globals);
      for (const p of used) if (p.startsWith("site.")) siteUsed.add(p);
      for (const p of fieldPaths(e.fields)) {
        if (!used.has(p)) errors.push(`${e.template}: CMS field "${p}" is never used by the template`);
      }
      if (!errors.length) {
        const pathname = urlPath(e.template);
        const buildVals = { url: site.siteUrl + pathname, path: pathname, preview: PREVIEW, isHome: pathname === "/" };
        rendered.set(e.template, render(ast, { ...data, site, build: buildVals }, { iconDir: ICONS }));
        if (pageNames.has(e.name) && !data.seo.noindex) sitemap.push(buildVals.url);
      }
    } catch (err) {
      errors.push(err.message);
    }
  }
  for (const p of fieldPaths(siteEntry.fields)) {
    if (!siteUsed.has(`site.${p}`)) errors.push(`${siteEntry.path}: CMS field "site.${p}" is never used by any template`);
  }

  const files = walkFiles(ROOT);
  for (const f of files) {
    if (!f.endsWith(".html") || templates.has(f) || f.startsWith("uploads/")) continue;
    if (fs.readFileSync(path.join(ROOT, f), "utf8").includes("[[")) {
      errors.push(`${f}: has [[ ]] tags but no CMS entry in cms/schema.mjs`);
    }
  }

  if (errors.length) {
    const msg = `CMS check failed:\n  - ${errors.join("\n  - ")}`;
    throw Object.assign(new Error(msg), { cmsErrors: errors });
  }
  if (!write) return { files: files.length, pages: rendered.size };

  fs.rmSync(DIST, { recursive: true, force: true });
  for (const f of files) {
    const dest = path.join(DIST, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (rendered.has(f)) fs.writeFileSync(dest, rendered.get(f));
    else fs.copyFileSync(path.join(ROOT, f), dest);
  }
  writeSeoFiles(site, sitemap);
  return { files: files.length, pages: rendered.size };
}

// robots.txt, sitemap.xml, and (previews only) a noindex header on every response.
function writeSeoFiles(site, urls) {
  if (PREVIEW) {
    fs.writeFileSync(path.join(DIST, "robots.txt"), "User-agent: *\nDisallow: /\n");
    fs.writeFileSync(path.join(DIST, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow\n");
  } else {
    fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`);
  }
  const body = urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join("\n");
  fs.writeFileSync(
    path.join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  );
}
const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ------------------------------------------------------------- dev server

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf",
};

function serve(port) {
  http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(DIST, p);
    if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    else if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    if (!fs.existsSync(file)) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`Serving dist/ at http://localhost:${port}`));
}

async function run(write) {
  try {
    const r = await build({ write });
    console.log(`✓ CMS check passed — ${r.pages} CMS pages${write ? `, ${r.files} files written to dist/` : ""}`);
    return true;
  } catch (err) {
    console.error(err.cmsErrors ? err.message : err);
    return false;
  }
}

const args = process.argv.slice(2);
if (args.includes("--sync-cms")) {
  const schema = await loadSchema();
  fs.writeFileSync(PAGES_YML, renderPagesYml(schema));
  console.log("✓ wrote .pages.yml");
} else if (args.includes("--serve")) {
  await run(true);
  const port = Number(args[args.indexOf("--serve") + 1]) || 8000;
  serve(port);
  let timer;
  fs.watch(ROOT, { recursive: true }, (_, name) => {
    if (!name || excluded(name) && !/^(cms|content|scripts)\//.test(name)) return;
    if (name.startsWith("dist/") || name.startsWith(".git/")) return;
    clearTimeout(timer);
    timer = setTimeout(() => run(true), 150);
  });
} else {
  process.exit((await run(!args.includes("--check"))) ? 0 : 1);
}
