// Does a branch change the website itself, or only the tooling, docs and
// asset library around it? Builds both refs the way production does
// (WORKERS_CI_BRANCH=main) in throwaway git worktrees and compares what
// visitors get:
//
//   - every built file outside assets/ and library/ (pages, shared
//     components, scripts, uploads, sitemap.xml, robots.txt, _headers, and
//     _redirects without the generated design-guide block);
//   - every file under assets/ that one of those files references
//     ("/assets/…" in a page, component, script or stylesheet), on either side;
//   - the hosting config (wrangler.jsonc, .assetsignore), which isn't built.
//
// Not website changes: the asset library feed (library/), assets no page
// uses, design.md, docs, scripts, and the CMS schema when it renders the
// same pages. AGENTS.md uses this to decide whether preview can merge into
// main without a pull request.
//
//   node scripts/site-diff.mjs [base=origin/main] [head=HEAD]
//
// Exits 0 when the website is unchanged, 1 when it changed (listing the
// files), 2 on error.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [base = "origin/main", head = "HEAD"] = process.argv.slice(2);
const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const HOSTING = ["wrangler.jsonc", ".assetsignore"];
const TEXT = /\.(html|js|mjs|css|xml|txt|json|svg|webmanifest)$|^_headers$|^_redirects$/;
const GENERATED_REDIRECTS = /\n# Design guide and asset library → Atlassian Artifacts[\s\S]*$/;

function walk(dir, rel = "") {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...walk(path.join(dir, ent.name), r));
    else out.push(r);
  }
  return out;
}

function build(ref, dir) {
  const sha = git("rev-parse", "--verify", `${ref}^{commit}`);
  git("worktree", "add", "--detach", "--quiet", dir, sha);
  const env = { ...process.env, WORKERS_CI_BRANCH: "main" };
  delete env.WORKERS_CI_COMMIT_SHA;
  execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: dir, env, stdio: "pipe" });
  return sha;
}

// The files visitors get from one build, as { path: Buffer }.
function website(dir) {
  const dist = path.join(dir, "dist");
  const files = walk(dist);
  const out = {};
  const refs = new Set();
  for (const f of files) {
    if (f.startsWith("assets/") || f.startsWith("library/")) continue;
    let buf = fs.readFileSync(path.join(dist, f));
    if (TEXT.test(path.basename(f))) {
      let text = buf.toString("utf8");
      if (f === "_redirects") text = text.replace(GENERATED_REDIRECTS, "\n");
      for (const m of text.matchAll(/\/assets\/[^\s"'()<>?#,\\]+/g)) {
        refs.add(decodeURI(m[0]).slice(1));
      }
      buf = Buffer.from(text);
    }
    out[f] = buf;
  }
  for (const f of HOSTING) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) out[`(hosting) ${f}`] = fs.readFileSync(p);
  }
  return { out, refs, dist };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "site-diff-"));
const dirs = { base: path.join(tmp, "base"), head: path.join(tmp, "head") };
let code = 2;
try {
  const shas = { base: build(base, dirs.base), head: build(head, dirs.head) };
  const a = website(dirs.base), b = website(dirs.head);
  const changed = [];
  for (const f of new Set([...Object.keys(a.out), ...Object.keys(b.out)])) {
    if (!a.out[f]) changed.push(`added    ${f}`);
    else if (!b.out[f]) changed.push(`removed  ${f}`);
    else if (!a.out[f].equals(b.out[f])) changed.push(`changed  ${f}`);
  }
  // assets a page uses, on either side
  for (const f of new Set([...a.refs, ...b.refs])) {
    const pa = path.join(a.dist, f), pb = path.join(b.dist, f);
    const ea = fs.existsSync(pa), eb = fs.existsSync(pb);
    if (ea !== eb) changed.push(`${eb ? "added  " : "removed"}  ${f} (used by a page)`);
    else if (ea && !fs.readFileSync(pa).equals(fs.readFileSync(pb))) {
      changed.push(`changed  ${f} (used by a page)`);
    }
  }
  const label = `${base} (${shas.base.slice(0, 7)}) → ${head} (${shas.head.slice(0, 7)})`;
  if (changed.length) {
    console.log(`✗ Website changes, ${label}:\n` + changed.sort().map((c) => `  ${c}`).join("\n"));
    code = 1;
  } else {
    console.log(`✓ No website changes, ${label}: pages, components, hosting and the assets pages use are identical.`);
    code = 0;
  }
} catch (e) {
  console.error(`site-diff failed: ${e.stderr?.toString() || e.message}`);
} finally {
  for (const d of Object.values(dirs)) {
    if (fs.existsSync(d)) {
      try { git("worktree", "remove", "--force", d); } catch { /* best effort */ }
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(code);
