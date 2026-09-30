#!/usr/bin/env node
// Publishes docs/website-guide.md to the "Website" Confluence page. Run by
// .github/workflows/publish-docs.yml after every merge to main.
//
//   node scripts/publish-confluence.mjs            publish (needs env below)
//   node scripts/publish-confluence.mjs --dry-run  print the storage-format body
//
// Env: CONFLUENCE_BASE_URL (https://m20tech.atlassian.net), CONFLUENCE_PAGE_ID,
//      CONFLUENCE_EMAIL + CONFLUENCE_API_TOKEN (an Atlassian API token for an
//      account that can edit the page), GIT_SHA (optional, shown in the footer).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "docs", "website-guide.md");

const esc = (s) => s.replace(/&(?![a-z]+;|#\d+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  // Protect inline code first so its contents aren't formatted.
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  // Bare URLs become links; trailing punctuation stays outside the link.
  s = s.replace(/(^|[\s(|])(https?:\/\/[^\s<|)&]+?)([.,;:]?)(?=$|[\s|)])/g, (_, pre, u, punct) => `${pre}<a href="${u}">${u}</a>${punct}`);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}

// Markdown subset used by the guide: headings, paragraphs, blockquote (→ info
// panel), ordered/unordered lists with one nested level, tables, inline
// code/bold/italic/links. The leading H1 is dropped (it's the page title).
export function toStorage(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  if (/^# /.test(lines[0])) i = 1;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{2,6}) (.*)$/.exec(l))) {
      const n = m[1].length - 1; // ## → h1 on the page, since the title is the H1
      out.push(`<h${n}>${inline(m[2])}</h${n}>`);
      i++;
    } else if (l.startsWith(">")) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<ac:structured-macro ac:name="info"><ac:rich-text-body><p>${inline(buf.join(" "))}</p></ac:rich-text-body></ac:structured-macro>`);
    } else if (l.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(
        "<table><tbody>" +
          `<tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join("")}</tr>` +
          body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") +
          "</tbody></table>",
      );
    } else if (/^(\d+\.|-) /.test(l)) {
      out.push(list(lines, () => i, (v) => (i = v), 0));
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#|>|\||\d+\. |- )/.test(lines[i])) buf.push(lines[i++].trim());
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    }
  }
  return out.join("\n");
}

function list(lines, get, set, indent) {
  const ordered = /^\s*\d+\./.test(lines[get()]);
  const items = [];
  while (get() < lines.length) {
    const l = lines[get()];
    const m = /^(\s*)(\d+\.|-) (.*)$/.exec(l);
    if (!m) break;
    const ind = m[1].length;
    if (ind < indent) break;
    if (ind > indent) {
      items[items.length - 1] += list(lines, get, set, ind);
      continue;
    }
    items.push(inline(m[3]));
    set(get() + 1);
  }
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((x) => `<li>${x}</li>`).join("")}</${tag}>`;
}

function footer() {
  const sha = (process.env.GIT_SHA || "").slice(0, 7);
  const commit = sha ? ` from commit <a href="https://github.com/m20tech/m20-website/commit/${process.env.GIT_SHA}">${sha}</a>` : "";
  const date = new Date().toISOString().slice(0, 10);
  return `\n<hr/>\n<p><em>Published automatically${commit} on ${date}. Source: <a href="https://github.com/m20tech/m20-website/blob/main/docs/website-guide.md">docs/website-guide.md</a>.</em></p>`;
}

async function publish(body) {
  const { CONFLUENCE_BASE_URL: base, CONFLUENCE_PAGE_ID: id, CONFLUENCE_EMAIL: email, CONFLUENCE_API_TOKEN: token } = process.env;
  for (const [k, v] of Object.entries({ CONFLUENCE_BASE_URL: base, CONFLUENCE_PAGE_ID: id, CONFLUENCE_EMAIL: email, CONFLUENCE_API_TOKEN: token })) {
    if (!v) throw new Error(`${k} is not set`);
  }
  const headers = {
    Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const url = `${base}/wiki/api/v2/pages/${id}`;
  const cur = await fetch(url, { headers });
  if (!cur.ok) throw new Error(`GET ${url} → ${cur.status} ${await cur.text()}`);
  const page = await cur.json();
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      id,
      status: "current",
      title: page.title,
      body: { representation: "storage", value: body },
      version: { number: page.version.number + 1, message: `Published from ${(process.env.GIT_SHA || "local").slice(0, 7)}` },
    }),
  });
  if (!res.ok) throw new Error(`PUT ${url} → ${res.status} ${await res.text()}`);
  const done = await res.json();
  console.log(`✓ Published "${done.title}" version ${done.version.number}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const body = toStorage(fs.readFileSync(SOURCE, "utf8")) + footer();
  if (process.argv.includes("--dry-run")) console.log(body);
  else await publish(body).catch((err) => { console.error(err.message); process.exit(1); });
}
