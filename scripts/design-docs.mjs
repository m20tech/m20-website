#!/usr/bin/env node
// Turns design.md and the asset catalog (cms/library.mjs) into the bodies of
// the M20 Design System pages in Confluence, mapped by docs/design-system.json.
// Each page embeds its visual guide page (/design/<slug>/, built by
// scripts/design-guide.mjs) with the Iframe macro, followed by a collapsed
// text version for Confluence search.
// It doesn't talk to Confluence: it writes one Confluence-HTML file per page
// plus a plan.json, and the releasing agent publishes them with the Atlassian
// (Rovo) MCP tools (contentFormat "html"). See "Publishing the design system" in AGENTS.md.
//
//   node scripts/design-docs.mjs                    write .confluence/design-system/
//   node scripts/design-docs.mjs --since <sha>      also mark which pages changed since <sha>
//   node scripts/design-docs.mjs --base <url>       host for library image/file links (default: Site URL)
//   node scripts/design-docs.mjs --commit <sha>     commit named in the footer (default: HEAD)
//   node scripts/design-docs.mjs --branch <name>    branch named in the footer (default: current)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { LIBRARY_PATH } from "../cms/library.mjs";
import { loadLibrary, libraryJson, scanUsage } from "./library.mjs";
import { GUIDE_PATH, guideHref } from "./design-guide.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = path.join(ROOT, "docs", "design-system.json");
const OUT = path.join(ROOT, ".confluence", "design-system");
const REPO = "https://github.com/m20tech/m20-website";

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
export const loadConfig = () => JSON.parse(fs.readFileSync(CONFIG, "utf8"));

// design.md split into its intro and `##` sections (heading → body). Fenced
// code blocks are skipped so a `##` inside one isn't taken for a heading.
export function sections(md) {
  const out = { intro: "", sections: new Map() };
  let current = null;
  let buf = [];
  let fence = false;
  const flush = () => {
    const text = buf.join("\n").trim();
    if (current) out.sections.set(current, text);
    else out.intro = text;
    buf = [];
  };
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence;
    const m = !fence && line.match(/^## (.+?)\s*$/);
    if (m) { flush(); current = m[1]; continue; }
    buf.push(line);
  }
  flush();
  return out;
}

// Every `##` section mapped to exactly one page, and every mapping real.
export function checkMapping(md = fs.readFileSync(path.join(ROOT, "design.md"), "utf8"), config = loadConfig()) {
  const errors = [];
  const have = [...sections(md).sections.keys()];
  const seen = new Map();
  for (const p of config.pages) for (const s of p.sections) {
    if (seen.has(s)) errors.push(`docs/design-system.json: "${s}" is mapped to both "${seen.get(s)}" and "${p.title}"`);
    seen.set(s, p.title);
    if (!have.includes(s)) errors.push(`docs/design-system.json: page "${p.title}" maps "## ${s}", which isn't in design.md`);
  }
  for (const s of have) {
    if (!seen.has(s)) errors.push(`design.md: "## ${s}" isn't mapped to a Confluence page in docs/design-system.json`);
  }
  return errors;
}

const pageUrl = (config, id) => `https://${config.cloudId}/wiki/spaces/${config.spaceKey}/pages/${id}`;
const slug = (s) => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

// Links in design.md point at other sections (#anchor) or repo files; on a
// Confluence page those become links to the owning page and to GitHub.
function rewriteLinks(text, config, owner) {
  const bySlug = new Map();
  for (const p of config.pages) for (const s of p.sections) bySlug.set(slug(s).replace(/-+/g, "-"), p);
  return text.replace(/\]\(([^)\s]+)\)/g, (all, href) => {
    if (/^(https?:|mailto:)/.test(href)) return all;
    if (href.startsWith("#")) {
      const target = bySlug.get(href.slice(1).replace(/-+/g, "-"));
      if (!target || target === owner) return all;
      return `](${target.id ? pageUrl(config, target.id) : "#"})`;
    }
    return `](${REPO}/blob/main/${href.replace(/^\.?\//, "")})`;
  });
}

const banner = (source) =>
  `> 🤖 **Managed by agents. Don't edit this page.** The visual guide below is embedded live from m20tech.com and always shows production. ` +
  `The page is generated from ${source} in the [m20tech/m20-website](${REPO}) repo and republished on releases, so edits made here are overwritten. ` +
  `To change it, edit the repo (or ask Claude Code to) and release.`;

const footer = (branch, commit, date, source) =>
  `---\n\n*Published from \`${branch}\` at commit [${commit.slice(0, 7)}](${REPO}/commit/${commit}) on ${date}. ` +
  `Source: ${source}.*`;

const kb = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ------------------------------------------------- Markdown → Confluence HTML
// Covers the subset design.md uses: headings, paragraphs, nested lists (with
// code blocks inside items), tables, fenced code, rules, and inline code,
// links, bold, and italics. Blockquotes starting with 🤖 or ⚠️ become info and
// warning panels. A block between <!--raw--> and <!--/raw--> passes through.

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => `<a href="${h.replace(/&amp;/g, "&").replace(/"/g, "%22")}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?=[^\w*]|$)/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}

const LIST = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const indentOf = (l) => l.match(/^\s*/)[0].length;

export function mdToHtml(md) {
  const lines = md.replace(/\t/g, "  ").split("\n");
  const out = [];
  let i = 0;
  const isBlank = (l) => !l || !l.trim();
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }
    if (line.trim() === "<!--raw-->") {
      const end = lines.indexOf("<!--/raw-->", i);
      out.push(lines.slice(i + 1, end).join("\n"));
      i = end + 1;
      continue;
    }
    const fence = line.match(/^\s*```(\w*)/);
    if (fence) {
      const body = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) body.push(lines[i]);
      i++;
      out.push(`<pre><code${fence[1] ? ` class="language-${fence[1]}"` : ""}>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { out.push("<hr>"); i++; continue; }
    if (/^\s*>/.test(line)) {
      const body = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) body.push(lines[i].replace(/^\s*>\s?/, ""));
      const text = body.join("\n").trim();
      const panel = text.startsWith("🤖") ? "info" : text.startsWith("⚠️") ? "warning" : null;
      const inner = mdToHtml(panel ? text.replace(/^(🤖|⚠️)\s*/, "") : text);
      out.push(panel ? `<div data-type="panel-${panel}">${inner}</div>` : `<blockquote>${inner}</blockquote>`);
      continue;
    }
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const row = (l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => inline(c.trim().replace(/\\\|/g, "|")));
      const head = row(line);
      const body = [];
      for (i += 2; i < lines.length && /^\s*\|/.test(lines[i]); i++) body.push(row(lines[i]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th><p>${c}</p></th>`).join("")}</tr></thead><tbody>` +
          body.map((r) => `<tr>${r.map((c) => `<td><p>${c}</p></td>`).join("")}</tr>`).join("") +
          `</tbody></table>`,
      );
      continue;
    }
    const li = line.match(LIST);
    if (li) {
      const base = li[1].length;
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST);
        if (!m || m[1].length !== base || /\d/.test(m[2]) !== ordered) break;
        const contentIndent = base + m[2].length + 1;
        const body = [m[3]];
        for (i++; i < lines.length; i++) {
          const l = lines[i];
          if (isBlank(l)) {
            const next = lines.slice(i + 1).find((x) => !isBlank(x));
            if (next && indentOf(next) > base) { body.push(""); continue; }
            break;
          }
          if (indentOf(l) <= base) break;
          body.push(l.slice(Math.min(indentOf(l), contentIndent)));
        }
        items.push(mdToHtml(body.join("\n")));
        while (i < lines.length && isBlank(lines[i]) && (lines.slice(i + 1).find((x) => !isBlank(x)) ?? "").match(LIST)?.[1].length === base) i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}${ordered ? ' start="1"' : ""}>${items.map((x) => `<li>${x}</li>`).join("")}</${tag}>`);
      continue;
    }
    const para = [];
    for (; i < lines.length && !isBlank(lines[i]); i++) {
      const l = lines[i];
      if (para.length && (LIST.test(l) || /^\s*(```|#{1,6}\s|>|\|)/.test(l))) break;
      para.push(l.trim());
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

// Confluence's native Iframe macro, as the editor stores it.
function iframeMacro(src, height) {
  const params = { macroParams: { src: { value: src }, width: { value: "100%" }, height: { value: String(height) } }, macroMetadata: { schemaVersion: { value: "1" }, title: "Iframe" } };
  return `<div data-type="extension" data-extension-key="iframe" data-extension-type="com.atlassian.confluence.macro.core" data-layout="full-width" data-parameters="${esc(JSON.stringify(params))}"></div>`;
}

// The visual guide page, embedded, with a link out to the full page.
function embed(href, height) {
  return [
    "<!--raw-->",
    iframeMacro(`${href}?embed`, height),
    `<p><a href="${href}">Open the full page</a> to see it at full width.</p>`,
    "<!--/raw-->",
  ].join("\n");
}

// The generated text, collapsed, so Confluence search and Rovo can still
// find everything the embed shows.
function textVersion(html) {
  return ["<!--raw-->", `<details><summary>Text version (from design.md, for search)</summary>${html}</details>`, "<!--/raw-->"].join("\n");
}

// The asset catalog as plain text (titles and tags per collection), so the
// library page stays searchable without repeating the gallery.
function libraryIndex(lib, base) {
  const json = libraryJson(lib, { siteUrl: base });
  return json.collections.map((c) =>
    `<h3>${esc(c.label)}</h3><p>${c.items.map((it) => `<a href="${base}${LIBRARY_PATH}#${it.key}">${esc(it.title)}</a> (${esc(it.tags.join(", "))})`).join("; ")}</p>`,
  ).join("");
}

function hubMarkdown(config, brandSummary, base) {
  const lines = [
    banner(`[design.md](${REPO}/blob/main/design.md)`),
    "",
    "How M20 Technology looks and sounds on the website and in email, PDFs, slides, and everything else we publish. " +
      "Every page shows the real thing: swatches, live type, components you can copy, and templates.",
    "",
    embed(`${base}${GUIDE_PATH}`, config.hub.embedHeight ?? 760),
    "",
    brandSummary,
    "",
    "## Pages",
    "",
    "| Page | What's in it |",
    "|---|---|",
    ...config.pages.map((p) => `| ${p.id ? `[${p.title}](${pageUrl(config, p.id)})` : p.title} | ${p.summary} |`),
    "",
    "## Quick links",
    "",
    `- [Visual design guide](${base}${GUIDE_PATH}): every page of this guide at full width (unlisted, internal)`,
    `- [Asset library gallery](${base}${LIBRARY_PATH}): search and download icons, illustrations, logos, and backgrounds (unlisted, internal)`,
    `- [design.md on GitHub](${REPO}/blob/main/design.md): the source of every page here`,
    `- [Website](https://${config.cloudId}/wiki/x/AoCIcwE): how the site, CMS, and release process work`,
    "",
    "## Team-maintained pages",
    "",
    "These pages are written by people, not generated. Keep them current by hand.",
    "",
    ...config.teamPages.map((p) => `- [${p.title}](${pageUrl(config, p.id)})`),
    ...(config.archive.id ? ["", `Superseded pages and the pre-2026 style guide are kept in [${config.archive.title}](${pageUrl(config, config.archive.id)}).`] : []),
    "",
    "## How these pages are maintained",
    "",
    "- `design.md` in the website repo is the single source of truth for the design system. `cms/library.mjs` catalogs the asset library.",
    "- Each `##` section of design.md belongs to one page here, mapped in `docs/design-system.json`. The site build fails if a new section isn't mapped, so no section goes unpublished.",
    "- The site build renders each page's visual guide at `m20tech.com/design/<page>/` from the same design.md, and each Confluence page embeds it with the Iframe macro. The visuals update on every production deploy without republishing Confluence.",
    "- On every production release, Claude Code runs `npm run docs:design` and republishes the pages whose source changed, plus this page. The footer below names the commit they match.",
    "- To change anything here, edit the repo (or ask Claude Code to) and release. Questions go to the WEB project in Jira.",
  ];
  return lines.join("\n");
}

function changedSince(sha, config, md) {
  const changed = new Set(["hub"]);
  let old;
  try { old = sections(git("show", `${sha}:design.md`)).sections; }
  catch { return null; }
  const now = sections(md).sections;
  for (const p of config.pages) {
    if (p.sections.some((s) => now.get(s) !== old.get(s))) changed.add(p.title);
  }
  const assetsChanged = git("diff", "--name-only", sha, "--", "cms/library.mjs", "cms/icons", "assets", "content").length > 0;
  for (const p of config.pages) if (p.library && assetsChanged) changed.add(p.title);
  return changed;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const config = loadConfig();
  const md = fs.readFileSync(path.join(ROOT, "design.md"), "utf8");
  const errors = checkMapping(md, config);
  if (errors.length) {
    console.error(`✗ ${errors.join("\n✗ ")}`);
    process.exit(1);
  }
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "components", "site.json"), "utf8"));
  const base = (opt("--base") ?? site.siteUrl).replace(/\/$/, "");
  const commit = opt("--commit") ?? git("rev-parse", "HEAD");
  const branch = opt("--branch") ?? git("rev-parse", "--abbrev-ref", "HEAD");
  const date = new Date().toISOString().slice(0, 10);
  const since = opt("--since");
  const changed = since ? changedSince(since, config, md) : null;

  // "Used on" comes from the CMS content, same as the gallery.
  const { entries } = await import("../cms/schema.mjs");
  const lib = loadLibrary({ root: ROOT, usage: scanUsage(entries, ROOT) });
  if (lib.errors.length) {
    console.error(`✗ ${lib.errors.join("\n✗ ")}`);
    process.exit(1);
  }

  const { sections: secs } = sections(md);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const plan = [];
  const write = (name, page, body, source) => {
    const file = path.join(OUT, `${name}.html`);
    fs.writeFileSync(file, mdToHtml(`${body.trim()}\n\n${footer(branch, commit, date, source)}`) + "\n");
    plan.push({
      action: page.id ? "update" : "create",
      id: page.id,
      parentId: page.id === config.hub.id ? undefined : config.hub.id,
      title: page.title,
      file: path.relative(ROOT, file),
      changed: changed ? changed.has(page === config.hub ? "hub" : page.title) : true,
    });
  };

  write("00-hub", config.hub, hubMarkdown(config, secs.get("Brand summary"), base), `[design.md](${REPO}/blob/main/design.md)`);
  config.pages.forEach((p, i) => {
    const single = p.sections.length === 1;
    const text = p.sections
      .map((s) => (single ? "" : `## ${s}\n\n`) + rewriteLinks(secs.get(s), config, p))
      .join("\n\n");
    const parts = [
      banner(`[design.md](${REPO}/blob/main/design.md)` + (p.library ? ` and [cms/library.mjs](${REPO}/blob/main/cms/library.mjs)` : "")),
      "",
      embed(base + guideHref(p), p.embedHeight ?? (p.library ? 800 : 1000)),
      "",
      textVersion(mdToHtml(text) + (p.library ? libraryIndex(lib, base) : "")),
    ];
    const source = p.sections.map((s) => `design.md → ${s}`).join(", ") + (p.library ? ", cms/library.mjs" : "");
    write(`${String(i + 1).padStart(2, "0")}-${slug(p.title)}`, p, parts.join("\n"), source);
  });

  fs.writeFileSync(path.join(OUT, "plan.json"), JSON.stringify({ cloudId: config.cloudId, spaceKey: config.spaceKey, commit, base, pages: plan }, null, 2) + "\n");
  const todo = plan.filter((p) => p.changed);
  console.log(`✓ wrote ${plan.length} page bodies to ${path.relative(ROOT, OUT)}/ (plan.json lists them)`);
  for (const p of todo) console.log(`  ${p.action.padEnd(6)} ${p.title}${p.id ? ` (${p.id})` : ""}  ← ${p.file}`);
  if (changed) console.log(`  ${plan.length - todo.length} unchanged since ${since.slice(0, 7)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
