#!/usr/bin/env node
// Renders the visual design guide (scripts/design-guide.mjs) and the asset
// library gallery (scripts/library.mjs) as self-contained Atlassian Artifacts,
// two per page in docs/design-system.json plus the hub:
//
//   <slug>.full    the page with its header, nav, and title, for reading on its own
//   <slug>.embed   no header, title, or footer, for the Confluence page's Iframe macro
//
// The site doesn't serve these pages (they aren't public). Like
// scripts/design-docs.mjs, this script doesn't talk to Atlassian: it writes
// the HTML and a plan, and the releasing agent publishes them with the
// Atlassian (Rovo) MCP tools (createArtifactsUpload, then publishArtifact).
// docs/design-artifacts.json records each artifact's ID and the checksum of
// what was last published, so only artifacts whose HTML changed are
// republished. See "Publishing the design system" in AGENTS.md.
//
//   node scripts/design-artifacts.mjs                           write .confluence/artifacts/ and plan.json
//   node scripts/design-artifacts.mjs --published <key>[=<id>]… record artifacts you just published

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadLibrary, libraryJson, renderGallery, scanUsage } from "./library.mjs";
import { renderDesignGuide } from "./design-guide.mjs";
import { checkMapping, loadConfig, pageUrl } from "./design-docs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE = path.join(ROOT, "docs", "design-artifacts.json");
const OUT = path.join(ROOT, ".confluence", "artifacts");

// ------------------------------------------------------------------ state

// { "<slug>.<variant>": { id, checksum } }, written only by --published.
export const loadArtifacts = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {});
export const shareUrl = (cloudId, id) => `https://${cloudId}/artifacts/${id}/share`;
// What the Confluence Iframe macro embeds. Not a documented Atlassian URL, but
// unlike the native artifact embed (fixed at 450px) it takes a height.
export const embedUrl = (cloudId, id) => `https://${cloudId}/artifacts/${id}/embed?hideBorder=true`;

// The full-page artifact URL for a slug ("hub", a page slug, or "library"), or "".
export function fullUrl(slug, config = loadConfig(), state = loadArtifacts()) {
  const id = state[`${slug}.full`]?.id;
  return id ? shareUrl(config.cloudId, id) : "";
}

// The hub plus every page, in plan order (hub last, like design-docs).
function sources(config) {
  const pages = config.pages.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, confluenceId: p.id }));
  return [...pages, { slug: "hub", title: config.hub.title, summary: "How M20 Technology looks and sounds on the website and in email, PDFs, and slides.", confluenceId: config.hub.id }];
}

const checksum = (html) => crypto.createHash("sha256").update(html, "utf8").digest("base64");

// ---------------------------------------------------------------- render

export async function renderArtifacts({ config = loadConfig(), state = loadArtifacts() } = {}) {
  const md = fs.readFileSync(path.join(ROOT, "design.md"), "utf8");
  const errors = checkMapping(md, config);
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "components", "site.json"), "utf8"));
  const { entries } = await import("../cms/schema.mjs");
  const lib = loadLibrary({ root: ROOT, usage: scanUsage(entries, ROOT) });
  errors.push(...lib.errors);
  if (errors.length) throw new Error(errors.join("\n"));

  const base = site.siteUrl.replace(/\/$/, "");
  const confluence = new Map(sources(config).map((s) => [s.slug, s.confluenceId ? pageUrl(config, s.confluenceId) : ""]));
  const variants = {
    // Full pages link to each other. Until an artifact exists its links are "#".
    full: { href: (slug) => fullUrl(slug, config, state) || "#", fullHref: () => "" },
    // Embeds sit inside Confluence, so they link to the other Confluence pages.
    embed: { href: (slug) => confluence.get(slug) || "#", fullHref: (slug) => fullUrl(slug, config, state) },
  };

  const out = [];
  for (const [variant, { href, fullHref }] of Object.entries(variants)) {
    const guide = renderDesignGuide({ md, config, lib, site, variant, href, fullHref, base });
    const gallery = renderGallery(libraryJson(lib, { siteUrl: base }), { variant, href, fullHref: fullHref("library"), base });
    for (const s of sources(config)) {
      const html = s.slug === "library" ? gallery : guide.get(s.slug);
      const key = `${s.slug}.${variant}`;
      const name = (s.slug === "hub" ? s.title : `M20 Design System · ${s.title}`) + (variant === "embed" ? " (Confluence embed)" : "");
      const description = `${s.summary} ` +
        (variant === "embed" ? "Embedded on the matching page of the M20 Design System in Confluence. " : "Full-page version of the matching M20 Design System page in Confluence. ") +
        "Generated from design.md and cms/library.mjs in the m20tech/m20-website repo and republished on releases by agents, so don't edit it by hand.";
      out.push({ key, slug: s.slug, variant, name, description, html, checksum: checksum(html), length: Buffer.byteLength(html, "utf8") });
    }
  }
  return out;
}

// ------------------------------------------------------------------- CLI

async function main() {
  const args = process.argv.slice(2);
  const config = loadConfig();
  const state = loadArtifacts();
  const artifacts = await renderArtifacts({ config, state });

  if (args[0] === "--published") {
    const byKey = new Map(artifacts.map((a) => [a.key, a]));
    for (const arg of args.slice(1)) {
      const [key, id] = arg.split("=");
      const a = byKey.get(key);
      if (!a) throw new Error(`unknown artifact "${key}" (expected <slug>.full or <slug>.embed)`);
      if (!id && !state[key]?.id) throw new Error(`${key} has no ID yet: pass ${key}=<artifact id>`);
      state[key] = { id: id || state[key].id, checksum: a.checksum };
    }
    const sorted = Object.fromEntries(Object.keys(state).sort().map((k) => [k, state[k]]));
    fs.writeFileSync(STATE, JSON.stringify(sorted, null, 2) + "\n");
    console.log(`✓ recorded ${args.length - 1} artifact(s) in ${path.relative(ROOT, STATE)}`);
    console.log("  Re-run without --published: artifacts that link to new IDs now show as changed.");
    return;
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  let commit = "";
  try { commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); } catch {}
  const plan = artifacts.map((a) => {
    const file = path.join(OUT, `${a.key}.html`);
    fs.writeFileSync(file, a.html);
    const prev = state[a.key];
    const action = !prev?.id ? "create" : prev.checksum === a.checksum ? "unchanged" : "update";
    return { key: a.key, action, id: prev?.id ?? null, name: a.name, description: a.description, file: path.relative(ROOT, file), length: a.length, checksum: a.checksum };
  });
  fs.writeFileSync(path.join(OUT, "plan.json"), JSON.stringify({ cloudId: config.cloudId, commit, contentType: "text/html", artifacts: plan }, null, 2) + "\n");
  const todo = plan.filter((p) => p.action !== "unchanged");
  console.log(`✓ wrote ${plan.length} artifacts to ${path.relative(ROOT, OUT)}/ (plan.json lists them)`);
  for (const p of todo) console.log(`  ${p.action.padEnd(6)} ${p.key}${p.id ? ` (${p.id})` : ""}`);
  console.log(`  ${plan.length - todo.length} unchanged`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); }
  catch (err) { console.error(`✗ ${err.message}`); process.exit(1); }
}
