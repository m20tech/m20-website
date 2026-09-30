// Build-time template engine for CMS content.
//
// Templates are the site's own HTML files. `[[ ... ]]` tags pull values from
// the page's content JSON; everything else (including the dc-runtime's
// `{{ ... }}` bindings) passes through untouched.
//
//   [[ path ]]                     HTML-escaped value
//   [[md path a="…" strong="…"]]   inline markdown (**bold**, *italic*,
//                                  [text](url)); attrs become inline styles
//   [[icon path attr="…" …]]       inline SVG from cms/icons/<value>.svg
//   [[json path]]                  JSON literal, for use inside <script>
//   [[#each path]] … [[/each]]     loop over a list; `.` is the current item,
//                                  `@index` / `@number` its 0/1-based position,
//                                  `@first` / `@last` true on the ends
//   [[#if path]] … [[else]] … [[/if]]
//   [[#block name]] … [[/block]]   inside an each over a block list: render
//                                  only items whose `_block` is `name`
//
// A line holding nothing but a block-level tag (#each, /each, #if, else, /if,
// #block, /block) is dropped whole, so loops don't leave blank lines behind.

import fs from "node:fs";
import path from "node:path";

const TAG = /\[\[\s*([\s\S]*?)\s*\]\]/g;
const STANDALONE = new Set(["#each", "/each", "#if", "else", "/if", "#block", "/block"]);

export function parse(src, file) {
  // Drop standalone block-tag lines before tokenizing.
  src = src.replace(/^[ \t]*\[\[\s*([#/]?\w+)[^\]]*\]\][ \t]*\r?\n/gm, (line, kw) =>
    STANDALONE.has(kw) ? line.trim() : line);

  const root = { type: "root", children: [] };
  // Each stack entry is an open node plus the array new children go into
  // (an [[#if]] switches to its else branch at [[else]]).
  const stack = [{ node: root, into: root.children }];
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    const top = stack[stack.length - 1];
    if (m.index > last) top.into.push({ type: "text", value: src.slice(last, m.index) });
    last = m.index + m[0].length;
    const where = `${file}:${src.slice(0, m.index).split("\n").length}`;
    const [head, ...rest] = splitArgs(m[1]);
    if (head === "#each" || head === "#if" || head === "#block") {
      if (!rest[0]) throw new Error(`${where}: [[${head}]] needs an argument`);
      const node = { type: head.slice(1), arg: rest[0], children: [], elseChildren: [], where };
      top.into.push(node);
      stack.push({ node, into: node.children });
    } else if (head === "else") {
      if (top.node.type !== "if") throw new Error(`${where}: [[else]] outside [[#if]]`);
      top.into = top.node.elseChildren;
    } else if (head.startsWith("/")) {
      if (top.node.type !== head.slice(1)) throw new Error(`${where}: unexpected [[${head}]] (open: ${top.node.type})`);
      stack.pop();
    } else if (head === "md" || head === "icon" || head === "json") {
      if (!rest[0]) throw new Error(`${where}: [[${head}]] needs a path`);
      top.into.push({ type: head, path: rest[0], attrs: parseAttrs(rest.slice(1), where), where });
    } else {
      if (rest.length) throw new Error(`${where}: unknown tag [[${m[1]}]]`);
      top.into.push({ type: "var", path: head, where });
    }
  }
  if (stack.length > 1) {
    const open = stack[stack.length - 1].node;
    throw new Error(`${open.where}: unclosed [[#${open.type}]]`);
  }
  if (last < src.length) root.children.push({ type: "text", value: src.slice(last) });
  return root;
}

function splitArgs(s) {
  return s.match(/[^\s"=]+(?:="[^"]*")?|"[^"]*"/g) || [];
}

function parseAttrs(parts, where) {
  const attrs = [];
  for (const p of parts) {
    const m = /^([\w:-]+)="([^"]*)"$/.exec(p);
    if (!m) throw new Error(`${where}: bad attribute ${p}`);
    attrs.push([m[1], m[2]]);
  }
  return attrs;
}

// ---------------------------------------------------------------- rendering

export function render(ast, data, ctx) {
  return renderNodes(ast.children, [data], ctx);
}

function renderNodes(nodes, scopes, ctx) {
  let out = "";
  for (const n of nodes) out += renderNode(n, scopes, ctx);
  return out;
}

function renderNode(n, scopes, ctx) {
  switch (n.type) {
    case "text":
      return n.value;
    case "var":
      return escapeHtml(str(lookup(scopes, n.path, n.where)));
    case "json":
      return JSON.stringify(lookup(scopes, n.path, n.where)).replace(/</g, "\\u003c");
    case "md":
      return inlineMarkdown(str(lookup(scopes, n.path, n.where)), Object.fromEntries(n.attrs));
    case "icon":
      return renderIcon(str(lookup(scopes, n.path, n.where)), n.attrs, ctx, n.where);
    case "each": {
      const list = lookup(scopes, n.arg, n.where);
      if (!Array.isArray(list)) throw new Error(`${n.where}: ${n.arg} is not a list`);
      return list
        .map((item, i) => {
          const loop = { "@index": i, "@number": i + 1, "@first": i === 0, "@last": i === list.length - 1 };
          return renderNodes(n.children, [...scopes, loop, item], ctx);
        })
        .join("");
    }
    case "if": {
      const v = lookup(scopes, n.arg, n.where, true);
      const truthy = Array.isArray(v) ? v.length > 0 : Boolean(v);
      return renderNodes(truthy ? n.children : n.elseChildren, scopes, ctx);
    }
    case "block": {
      const item = scopes[scopes.length - 1];
      return item && item._block === n.arg ? renderNodes(n.children, scopes, ctx) : "";
    }
  }
  throw new Error(`unknown node ${n.type}`);
}

function lookup(scopes, p, where, optional = false) {
  if (p === ".") return scopes[scopes.length - 1];
  const [first, ...rest] = p.split(".");
  for (let i = scopes.length - 1; i >= 0; i--) {
    const s = scopes[i];
    if (s && typeof s === "object" && first in s) {
      let v = s[first];
      for (const k of rest) {
        if (v == null || typeof v !== "object" || !(k in v)) throw new Error(`${where}: missing ${p}`);
        v = v[k];
      }
      return v;
    }
  }
  if (optional) return undefined;
  throw new Error(`${where}: missing ${p}`);
}

function str(v) {
  return v == null ? "" : String(v);
}

export function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// **bold**, *italic*, [text](url). External links open in a new tab, matching
// the site's existing link markup. Attribute styles come from the template so
// content stays free of presentation.
export function inlineMarkdown(s, styles = {}) {
  const st = (tag) => (styles[tag] ? ` style="${styles[tag]}"` : "");
  let html = escapeHtml(s);
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const ext = /^https?:\/\//.test(href) ? ` target="_blank" rel="noopener"` : "";
    return `<a href="${href}"${ext}${st("a")}>${text}</a>`;
  });
  html = html.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong${st("strong")}>${t}</strong>`);
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, (_, pre, t) => `${pre}<em${st("em")}>${t}</em>`);
  return html;
}

const iconCache = new Map();
export function loadIcon(name, iconDir) {
  if (!iconCache.has(name)) {
    const file = path.join(iconDir, `${name}.svg`);
    if (!/^[\w-]+$/.test(name) || !fs.existsSync(file)) return null;
    const src = fs.readFileSync(file, "utf8").trim();
    const m = /^<svg\s+viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>$/.exec(src);
    if (!m) throw new Error(`${file}: expected <svg viewBox="…">…</svg>`);
    iconCache.set(name, { viewBox: m[1], body: m[2].trim() });
  }
  return iconCache.get(name);
}

function renderIcon(name, attrs, ctx, where) {
  const icon = loadIcon(name, ctx.iconDir);
  if (!icon) throw new Error(`${where}: unknown icon "${name}"`);
  const a = attrs.map(([k, v]) => ` ${k}="${v}"`).join("");
  return `<svg viewBox="${icon.viewBox}"${a}>${icon.body}</svg>`;
}

// ------------------------------------------------------------ static checks

// Walks a template against a CMS field list. Returns the set of field paths
// the template uses and throws if a tag points at a field that doesn't exist
// or has the wrong shape for how it's used.
export function checkTemplate(ast, fields) {
  const used = new Set();
  walk(ast.children, [{ fields, path: "" }], null);
  return used;

  function resolve(scopes, p, where) {
    if (["@index", "@number", "@first", "@last"].includes(p)) {
      if (!scopes.some((x) => x.path.endsWith("[]"))) throw new Error(`${where}: ${p} used outside [[#each]]`);
      return { field: { type: "number" }, path: null };
    }
    if (p === ".") {
      const s = scopes[scopes.length - 1];
      if (!s.item) throw new Error(`${where}: "." used outside a list of plain values`);
      return { field: s.item, path: s.path };
    }
    const [first, ...rest] = p.split(".");
    for (let i = scopes.length - 1; i >= 0; i--) {
      let f = (scopes[i].fields || []).find((x) => x.name === first);
      if (!f) continue;
      let fp = join(scopes[i].path, first);
      used.add(fp);
      for (const k of rest) {
        if (f.type !== "object" || f.list) throw new Error(`${where}: ${p}: ${fp} has no fields`);
        f = f.fields.find((x) => x.name === k);
        if (!f) throw new Error(`${where}: ${p}: no field "${k}" in CMS schema`);
        fp = join(fp, k);
        used.add(fp);
      }
      return { field: f, path: fp };
    }
    throw new Error(`${where}: ${p} is not a field in the CMS schema`);
  }

  function walk(nodes, scopes, blocks) {
    for (const n of nodes) {
      if (n.type === "text") continue;
      if (n.type === "var" || n.type === "md" || n.type === "json" || n.type === "icon") {
        const { field } = resolve(scopes, n.path, n.where);
        if (n.type === "icon" && field.type !== "select") throw new Error(`${n.where}: [[icon]] needs an icon select field`);
        if ((n.type === "var" || n.type === "md") && (field.type === "object" || field.type === "block" || field.list))
          throw new Error(`${n.where}: ${n.path} is a ${field.list ? "list" : field.type}, not a value`);
      } else if (n.type === "each") {
        const { field, path: fp } = resolve(scopes, n.arg, n.where);
        if (!field.list) throw new Error(`${n.where}: [[#each ${n.arg}]] but ${n.arg} is not a list`);
        const listPath = `${fp}[]`;
        if (field.type === "block") {
          walk(n.children, [...scopes, { fields: [], path: listPath }], { field, path: listPath });
        } else if (field.type === "object") {
          walk(n.children, [...scopes, { fields: field.fields, path: listPath }], null);
        } else {
          walk(n.children, [...scopes, { fields: [], item: { ...field, list: false }, path: listPath }], null);
        }
      } else if (n.type === "block") {
        if (!blocks) throw new Error(`${n.where}: [[#block]] outside an each over a block list`);
        const b = blocks.field.blocks.find((x) => x.name === n.arg);
        if (!b) throw new Error(`${n.where}: no block "${n.arg}" in ${blocks.path}`);
        const bp = `${blocks.path}<${n.arg}>`;
        used.add(bp);
        walk(n.children, [...scopes.slice(0, -1), { fields: b.fields, path: bp }], null);
      } else if (n.type === "if") {
        resolve(scopes, n.arg, n.where);
        walk(n.children, scopes, blocks);
        walk(n.elseChildren, scopes, blocks);
      }
    }
  }
}

function join(a, b) {
  return a ? `${a}.${b}` : b;
}
