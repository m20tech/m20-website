// Builds the visual design guide at /design/ (unlisted, noindex): one page
// per M20 Design System page in docs/design-system.json, each with live
// specimens (swatches, type, lockups, components, templates) above the
// design.md text for its sections. design.md stays the only written source;
// the specimens are parsed from its tables and lists where they can be, and
// reuse the site's own markup where they can't. Confluence embeds these pages
// with the Iframe macro (see scripts/design-docs.mjs), and ?embed hides the
// guide's own chrome so they sit cleanly inside a Confluence page.

import fs from "node:fs";
import path from "node:path";
import { LIBRARY_PATH } from "../cms/library.mjs";
import { libraryJson } from "./library.mjs";
import { sections, mdToHtml } from "./design-docs.mjs";

export const GUIDE_PATH = "/design/";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------------------------------------------------------- parsing

// Rows of the first Markdown table in `text` whose first header cell matches.
function table(text, firstHeader) {
  const lines = (text ?? "").split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const row = (l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim());
    if (firstHeader && row(lines[i])[0].replace(/\*/g, "") !== firstHeader) continue;
    const rows = [];
    for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) rows.push(row(lines[j]));
    return rows;
  }
  return [];
}

// Bullet lines that follow the first line matching `after`.
function bulletsAfter(text, after) {
  const lines = (text ?? "").split("\n");
  const start = lines.findIndex((l) => after.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^- /.test(lines[i])) out.push(lines[i].slice(2));
    else if (out.length && !/^\s/.test(lines[i])) break;
  }
  return out;
}

const plain = (s) => s.replace(/\*\*|`/g, "").trim();
const hexes = (s) => s.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
const maxPx = (s) => Math.max(...(s.match(/[\d.]+(?=px)/g) ?? ["16"]).map(Number));

// WCAG contrast ratio between two hex colors.
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// One type-scale bullet ("H2 (section): `clamp(30px,4vw,48px)` / 1.15,
// Source Serif 4 **600**") as CSS for a specimen.
function typeSpec(line, unit = "px") {
  const label = plain(line.split(":")[0]);
  const serif = /Source Serif 4/.test(line);
  const weight = (line.match(/\*\*(\d{3})\*\*/) ?? line.match(/(?:Source (?:Serif 4|Sans 3)),?\s+(\d{3})/) ?? [, "400"])[1];
  let size;
  if (unit === "pt") size = `${(line.match(/([\d.]+)pt/) ?? [, "10"])[1]}pt`;
  else {
    const v = (line.match(/`([^`]+)`/) ?? [, "17px"])[1];
    size = v.startsWith("clamp") ? v : `${maxPx(v)}px`;
  }
  const lh = (line.match(/\/\s*([\d.]+)/) ?? [, serif ? "1.15" : "1.5"])[1];
  const ls = (line.match(/letter-spacing:\s*([-\d.]+em)/) ?? line.match(/\(`(-?[\d.]+em)`\)/) ?? [, serif ? "-0.01em" : "0"])[1];
  const upper = /uppercase/.test(line);
  const color = hexes(line)[0] ?? (/eyebrow|kicker/i.test(label) ? "#C0392B" : "#14171C");
  const css = `font:${weight} ${size}/${lh} '${serif ? "Source Serif 4" : "Source Sans 3"}', ${serif ? "Georgia, serif" : "system-ui, sans-serif"};letter-spacing:${ls};${upper ? "text-transform:uppercase;" : ""}color:${color};`;
  return { label, css, meta: plain(line.slice(line.indexOf(":") + 1)) };
}

// --------------------------------------------------------------- snippets

// A specimen: live markup plus a copyable copy of the same markup. Markup may
// use style-hover="…" like the site; the guide's script applies it on hover.
function specimen(title, html, { note = "", ground = "paper", wide = false } = {}) {
  return `<figure class="spec${wide ? " wide" : ""}">
  <div class="stage ${ground}">${html}</div>
  <figcaption><b>${esc(title)}</b>${note ? `<span>${note}</span>` : ""}
    <details><summary>HTML</summary><pre><code>${esc(html.trim())}</code></pre><button class="copy" type="button">Copy</button></details>
  </figcaption>
</figure>`;
}

const block = (title, intro, body) =>
  `<section class="block"><h2>${esc(title)}</h2>${intro ? `<p class="intro">${intro}</p>` : ""}${body}</section>`;

const SANS = "'Source Sans 3', system-ui, sans-serif";
const SERIF = "'Source Serif 4', Georgia, serif";

const lockup = (size = 42, dark = false) => `<span style="display:inline-flex;align-items:center;gap:${Math.round(size * 0.29)}px;">
  <img src="/assets/logo.png" alt="M20 Technology" style="width:${size}px;height:auto;display:block;">
  <span style="display:flex;flex-direction:column;line-height:1;">
    <span style="font:700 ${Math.round(size * 0.52)}px/1 ${SANS};letter-spacing:.01em;color:${dark ? "#FAF7F4" : "#14171C"};">M20</span>
    <span style="font:500 ${Math.max(7, Math.round(size * 0.26))}px/1 ${SANS};letter-spacing:.24em;text-transform:uppercase;color:${dark ? "#9AA1AD" : "#5A6270"};margin-top:3px;">Technology</span>
  </span>
</span>`;

const eyebrow = (text, color = "#C0392B") =>
  `<p style="font:600 13px ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${color};display:flex;align-items:center;gap:12px;margin:0;">
  <span style="width:34px;height:2px;background:${color};"></span>${text}
</p>`;

const BTN = `display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 20px;font:600 15px ${SANS};letter-spacing:.02em;border-radius:999px;text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .18s ease, box-shadow .18s ease, color .18s ease;`;

// ---------------------------------------------------------------- visuals

const VISUALS = {
  brand({ secs }) {
    const voice = secs.get("Voice");
    const traits = table(voice, "Trait");
    const avoid = table(voice, "Avoid");
    const tone = table(voice, "Context");
    return [
      block("Personality", "Four traits behind every headline, proposal, and how-to.",
        `<div class="cards">${traits.map(([t, d]) => `<div class="card"><h3>${esc(plain(t))}</h3><p>${esc(plain(d))}</p></div>`).join("")}</div>`),
      block("Tone by context", "The voice stays the same; the tone shifts with the audience.",
        `<div class="cards">${tone.map(([c, t, e]) => `<div class="card"><p class="kicker">${esc(plain(c))}</p><h3>${esc(plain(t))}</h3><p class="quote">${esc(plain(e))}</p></div>`).join("")}</div>`),
      block("Say this, not that", "",
        `<div class="pairs">${avoid.map(([a, b]) => `<div class="pair"><p class="no"><span>✕</span>${esc(plain(a))}</p><p class="yes"><span>✓</span>${esc(plain(b))}</p></div>`).join("")}
        <div class="pair"><p class="no"><span>✕</span>Streamline your workflows — we handle the complexity.</p><p class="yes"><span>✓</span>Streamline your workflows. We handle the complexity.</p></div></div>`),
      block("Headline pattern", "Eyebrow, confident serif headline, calmer sans sentence.",
        specimen("Section opener", `<div>
  ${eyebrow("How we work")}
  <h2 style="font:600 clamp(30px,4vw,48px)/1.15 ${SERIF};letter-spacing:-0.01em;margin:18px 0 20px;color:#14171C;">Built with you, not just for you</h2>
  <p style="font:400 19px/1.6 ${SANS};color:#5A6270;margin:0;max-width:560px;">We design around how your teams already work, then make Atlassian fit.</p>
</div>`, { wide: true })),
    ].join("");
  },

  color({ secs }) {
    const rows = table(secs.get("Color palette"), "Token");
    const swatch = (name, hex, usage) => {
      const onPaper = contrast(hex, "#FAF7F4"), onInk = contrast(hex, "#14171C"), white = contrast(hex, "#FFFFFF");
      const badge = (r, label) => `<span class="ratio ${r >= 4.5 ? "pass" : r >= 3 ? "large" : "fail"}" title="${label}">${r.toFixed(1)}:1 ${label}</span>`;
      return `<div class="swatch"><button class="chip" type="button" data-copy="${hex}" style="background:${hex}" aria-label="Copy ${hex}">
        <span style="color:${white >= 4.5 ? "#fff" : "#14171C"}">Aa</span></button>
        <div class="sw-meta"><b>${esc(name)}</b><code>${hex}</code><p>${esc(usage)}</p>${badge(onPaper, "on paper")}${badge(onInk, "on ink")}</div></div>`;
    };
    const grid = rows.flatMap(([t, h, u]) => hexes(h).map((hex, i, all) => swatch(plain(t) + (all.length > 1 ? ` ${i + 1}` : ""), hex.toUpperCase(), plain(u)))).join("");
    return [
      block("Palette", "Click a swatch to copy its hex. Ratios are WCAG contrast against paper <code>#FAF7F4</code> and ink <code>#14171C</code> (4.5:1 for body text, 3:1 for large text).",
        `<div class="swatches">${grid}</div>`),
      block("How the colors work together", "Paper and ink for structure, red only for action, gold only as a kicker on dark.",
        `<div class="cards">
          ${specimen("Light section", `<div style="background:#FAF7F4;padding:24px;border-radius:14px;">${eyebrow("What we do")}<h3 style="font:600 24px/1.2 ${SERIF};margin:14px 0 10px;color:#14171C;">Paper and ink</h3><p style="font:400 16px/1.6 ${SANS};color:#5A6270;margin:0 0 16px;">Muted copy on paper, red for the one action.</p><a style="${BTN}background:#C0392B;color:#fff;" style-hover="background:#96271C;box-shadow:0 8px 24px rgba(192,57,43,.28);">Talk to us</a></div>`)}
          ${specimen("Dark section", `<div style="background:#14171C;padding:24px;border-radius:14px;">${eyebrow("Rovo AI", "#E8A04C")}<h3 style="font:600 24px/1.2 ${SERIF};margin:14px 0 10px;color:#FAF7F4;">Ink with a gold kicker</h3><p style="font:400 16px/1.6 ${SANS};color:#C9CDD6;margin:0 0 16px;">Gold labels, never gold buttons. Links in <span style="color:#F5C98F;">gold tint</span>.</p><a style="${BTN}background:#C0392B;color:#fff;" style-hover="background:#96271C;box-shadow:0 8px 24px rgba(192,57,43,.28);">See the agents</a></div>`, { ground: "ink" })}
          ${specimen("Maroon band", `<div style="background:linear-gradient(135deg,#96271C,#7A1E15);padding:24px;border-radius:14px;"><h3 style="font:600 24px/1.2 ${SERIF};margin:0 0 10px;color:#fff;">Red gradient band</h3><p style="font:400 16px/1.6 ${SANS};color:#F3EEE8;margin:0;">One per page at most, for the brand statement.</p></div>`)}
        </div>`),
      `<p class="see">Status (red, amber, green) colors for artwork are on <a href="${GUIDE_PATH}imagery/#status">Imagery &amp; Illustrations</a>.</p>`,
    ].join("");
  },

  typography({ secs }) {
    const scale = bulletsAfter(secs.get("Typography"), /^Type scale/).map((l) => typeSpec(l));
    const print = bulletsAfter(secs.get("PDF templates"), /Print type scale/).map((l) => typeSpec(l, "pt"));
    const sample = (label) => /eyebrow|kicker/i.test(label) ? "What we do" : /nav|button/i.test(label) ? "Contact Us" : /numeral/i.test(label) ? "100%" : /quote/i.test(label) ? "“They bridged technical constraints and our brand.”" : /body|lead|paragraph/i.test(label) ? "Custom software, training, and support from a Gold Solution Partner." : "Empowering teams. Amplifying results.";
    const rows = (list) => list.map((t) => `<div class="type-row"><div class="type-meta"><b>${esc(t.label)}</b><span>${esc(t.meta)}</span></div><div class="type-sample" style="${t.css}">${esc(sample(t.label))}</div></div>`).join("");
    const family = (name, stack, weights, use) => `<div class="card family"><p class="kicker">${use}</p><div style="font:600 64px/1 ${stack};color:#14171C;">Aa</div><h3 style="font-family:${stack}">${name}</h3>
      <div class="weights">${weights.map((w) => `<span style="font:${w} 20px ${stack}">${w}</span>`).join("")}</div>
      <p style="font:400 15px/1.6 ${stack};color:#5A6270;margin:12px 0 0;">ABCDEFGHIJKLM nopqrstuvwxyz 0123456789</p></div>`;
    return [
      block("Typefaces", "Both from Google Fonts. Serif for headings and numbers, sans for everything else.",
        `<div class="cards two">${family("Source Serif 4", SERIF, [400, 600, 700], "Display")}${family("Source Sans 3", SANS, [400, 500, 600, 700], "Body and UI")}</div>`),
      block("Web type scale", "Live at this window's width. Fluid sizes use <code>clamp()</code>, so resize to see them scale.", `<div class="type-scale">${rows(scale)}</div>`),
      print.length ? block("Print type scale", "PDFs use fixed points. One serif title per document; every other heading is sans.", `<div class="type-scale">${rows(print)}</div>`) : "",
    ].join("");
  },

  logo({ site }) {
    const emailSnippet = `<img src="${site.siteUrl}/assets/logo.png" width="32" height="32" alt="M20 Technology" style="display:block;border:0;">`;
    return [
      block("Lockup", "Mark plus stacked wordmark. Use the full lockup whenever there's room.",
        `<div class="cards">
          ${specimen("On paper", lockup(42))}
          ${specimen("On ink", lockup(42, true), { ground: "ink" })}
          ${specimen("Mark only", `<img src="/assets/logo.png" alt="M20 Technology" style="width:42px;height:auto;display:block;">`, { note: "Favicon-scale and tight spaces only." })}
        </div>`),
      block("Sizes", "",
        `<div class="sizes">${[[42, "Site header"], [36, "Footer"], [32, "Email header"], [24, "Minimum (PDF running header)"]].map(([s, l]) => `<div class="size"><div>${lockup(s)}</div><p><b>${s}px</b> ${l}</p></div>`).join("")}</div>
        <p class="see">Below 24px the mark stops reading. Don't recolor, outline, or add effects to the mark.</p>`),
      block("Embedding", "",
        specimen("Email (hosted URL, explicit size)", emailSnippet, { note: "Email clients block data URIs, so always use the hosted file." })
        + `<p class="see"><a href="/assets/logo.png" download>Download logo.png</a> · 300×300, transparent · <a href="${LIBRARY_PATH}#brand/logo">Library entry</a></p>`),
    ].join("");
  },

  layout({ secs }) {
    const ls = secs.get("Layout & spacing");
    const radiusLine = (ls.match(/Border radius scale:(.*)/) ?? [, ""])[1];
    const radii = [...radiusLine.matchAll(/`(\d+)px`\s*\(([^)]+)\)/g)].map((m) => [m[1], m[2]]);
    const rhythm = table(ls, "Step");
    return [
      block("Container", "Content maxes out at 1180px with a fluid gutter. Most grids need no breakpoints.",
        `<div class="container-demo"><div class="gutter">gutter <code>clamp(20px,4vw,48px)</code></div><div class="content">max-width <code>1180px</code></div><div class="gutter">gutter</div></div>
        <div class="grid-demo">${Array.from({ length: 6 }, (_, i) => `<div>card ${i + 1}</div>`).join("")}</div>
        <p class="see">The grid above is <code>repeat(auto-fit, minmax(min(100%, 260px), 1fr))</code>. Resize the window to watch it reflow.</p>`),
      block("Radius scale", "", `<div class="radii">${radii.map(([r, use]) => `<div class="radius"><div style="border-radius:${Math.min(+r, 60)}px"></div><b>${r}px</b><span>${esc(use)}</span></div>`).join("")}</div>`),
      block("Section rhythm", "Pick a step; don't invent a value. The bars show each step's padding at this window's width.",
        `<div class="rhythm">${rhythm.map(([s, v, u]) => `<div class="rhythm-row"><b>${esc(plain(s))}</b><div class="bar" style="height:${plain(v)}" data-px></div><span><code>${esc(plain(v))}</code> ${esc(plain(u))} · <i class="px"></i></span></div>`).join("")}</div>`),
      block("Motion", "Hover the specimens. Transitions are <code>.18s ease</code>; respect <code>prefers-reduced-motion</code>.",
        `<div class="cards">
          ${specimen("Card lift (−4px)", `<div style="background:#fff;border:1px solid #E4DCD3;border-radius:22px;padding:28px;transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease;" style-hover="border-color:#C0392B;box-shadow:0 18px 40px rgba(20,23,28,.10);transform:translateY(-4px)"><b style="font:600 20px ${SERIF};color:#14171C;">Service card</b></div>`)}
          ${specimen("Case-study lift (−6px)", `<div style="background:#fff;border:1px solid #E4DCD3;border-radius:22px;padding:28px;transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease;" style-hover="border-color:#C0392B;box-shadow:0 18px 40px rgba(20,23,28,.10);transform:translateY(-6px)"><b style="font:600 20px ${SERIF};color:#14171C;">Case study card</b></div>`)}
          ${specimen("Button glow", `<a style="${BTN}background:#C0392B;color:#fff;" style-hover="background:#96271C;box-shadow:0 8px 24px rgba(192,57,43,.28);">Contact Us</a>`)}
        </div>`),
    ].join("");
  },

  components({ lib }) {
    const spot = lib.collections.find((c) => c.id === "spots")?.items.find((i) => i.id === "gear");
    const input = (label, invalid) => `<div style="max-width:320px;">
  <label style="display:block;font:600 13.5px ${SANS};margin-bottom:7px;color:#23282F;">${label} <span style="color:#C0392B;">*</span></label>
  <input type="text" placeholder="${invalid ? "" : "Jordan"}" style="width:100%;font:400 16px ${SANS};color:#14171C;background:#FAF7F4;border:1.5px solid ${invalid ? "#96271C" : "#E4DCD3"};border-radius:10px;padding:13px 15px;box-sizing:border-box;">
  ${invalid ? `<p style="margin:6px 0 0;font:600 13.5px ${SANS};color:#96271C;">Please enter your email.</p>` : ""}
</div>`;
    return [
      block("Buttons", "Pills, Source Sans 3 600 15px. Red means act; there is one primary per view.",
        `<div class="cards">
          ${specimen("Primary", `<a style="${BTN}background:#C0392B;color:#fff;" style-hover="background:#96271C;box-shadow:0 8px 24px rgba(192,57,43,.28);">Contact Us</a>`)}
          ${specimen("Outline (light)", `<a style="${BTN}border:2px solid #14171C;color:#14171C;background:transparent;" style-hover="background:#14171C;color:#fff;">See case studies</a>`)}
          ${specimen("Secondary (dark hero)", `<a style="${BTN}border:2px solid rgba(255,255,255,.85);color:#fff;background:rgba(20,23,28,.4);" style-hover="background:rgba(255,255,255,.14);border-color:#fff;">Explore Rovo AI</a>`, { ground: "ink" })}
        </div>`),
      block("Eyebrows", "Short rule plus uppercase label. Red on light, gold on dark.",
        `<div class="cards two">${specimen("On light", eyebrow("What we do"))}${specimen("On dark", eyebrow("Get in touch", "#E8A04C"), { ground: "ink" })}</div>`),
      block("Cards", "",
        `<div class="cards">
          ${specimen("Service card", `<div style="background:#fff;border:1px solid #E4DCD3;border-radius:22px;padding:36px 32px 30px;transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease;" style-hover="border-color:#C0392B;box-shadow:0 18px 40px rgba(20,23,28,.10);transform:translateY(-4px)">
  ${spot ? `<img src="${spot.files.find((f) => f.format === "svg").path}" alt="" width="96" height="96" style="display:block;margin:0 0 14px -7px;">` : ""}
  <h3 style="font:600 22px/1.2 ${SERIF};margin:0 0 10px;color:#14171C;">Custom development</h3>
  <p style="font:400 16px/1.6 ${SANS};color:#5A6270;margin:0;">Forge apps and integrations built for how you work.</p>
</div>`)}
          ${specimen("Icon badge", `<div style="width:56px;height:56px;border-radius:14px;background:#F9E9E4;display:grid;place-items:center;">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 1.8v3.4M12 18.8v3.4M4.8 4.8l2.4 2.4M16.8 16.8l2.4 2.4M1.8 12h3.4M18.8 12h3.4M4.8 19.2l2.4-2.4M16.8 7.2l2.4-2.4"></path></svg>
</div>`, { note: "Any icon from the library, 26px in red." })}
          ${specimen("Dark surface card", `<div style="background:#23282F;border:1px solid rgba(255,255,255,.08);border-top:3px solid #E8A04C;border-radius:18px;padding:28px;transition:border-color .18s ease, transform .18s ease;" style-hover="border-color:#C0392B;transform:translateY(-4px)">
  <h3 style="font:600 20px/1.2 ${SERIF};margin:0 0 8px;color:#FAF7F4;">Service agents</h3>
  <p style="font:400 15px/1.6 ${SANS};color:#C9CDD6;margin:0;">Triage, route, and resolve requests in JSM.</p>
</div>`, { ground: "ink" })}
        </div>`),
      block("Stats and quotes", "",
        `<div class="cards two">
          ${specimen("Stat tiles", `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:20px;">
  ${[["0", "Content disruption"], ["100%", "Executive buy-in"], ["Pixel", "Perfect UI match"]].map(([v, l]) => `<div><div style="font:600 clamp(30px,3.6vw,46px)/1 ${SERIF};color:#C0392B;margin-bottom:8px;">${v}</div><p style="margin:0;font:500 15px ${SANS};color:#5A6270;">${l}</p></div>`).join("\n  ")}
</div>`)}
          ${specimen("Pull quote", `<blockquote style="margin:0;font:400 clamp(19px,2.2vw,24px)/1.55 ${SERIF};color:#fff;">“M20 understands both the look and feel of a brand and the practical needs of workflow efficiency.”</blockquote>`, { ground: "ink" })}
        </div>`),
      block("Forms", "Paper-filled inputs, 10px radius, red asterisk, inline error in maroon.",
        `<div class="cards two">${specimen("Field", input("First name"))}${specimen("Invalid field", input("Email", true))}</div>`),
      block("Confirmation modal", "Shown static here. On the site it sits on a blurred ink backdrop and closes by button, backdrop click, or Escape.",
        specimen("Modal card", `<div style="background:rgba(20,23,28,.6);padding:32px;border-radius:14px;display:grid;place-items:center;">
  <div style="background:#fff;border-radius:22px;box-shadow:0 40px 90px rgba(0,0,0,.4);padding:32px;max-width:420px;text-align:center;">
    <h3 style="font:700 26px/1.2 ${SERIF};margin:0 0 10px;color:#14171C;">Thanks, we'll be in touch</h3>
    <p style="font:400 16px/1.6 ${SANS};color:#5A6270;margin:0 0 20px;">Someone from our team will reply within one business day.</p>
    <a style="${BTN}background:#C0392B;color:#fff;" style-hover="background:#96271C;box-shadow:0 8px 24px rgba(192,57,43,.28);">Close</a>
  </div>
</div>`, { wide: true })),
      block("Header", "Sticky, translucent paper, 2px red underline on the active page.",
        specimen("Site header (desktop)", `<div style="background:rgba(250,247,244,.94);border-bottom:1px solid #E4DCD3;display:flex;align-items:center;gap:28px;min-height:76px;padding:0 24px;border-radius:14px;flex-wrap:wrap;">
  ${lockup(42)}
  <nav style="margin-left:auto;display:flex;gap:22px;align-items:center;font:600 15px ${SANS};color:#14171C;flex-wrap:wrap;">
    <span style="box-shadow:inset 0 -2px #C0392B;padding:6px 0;">Home</span><span>AI</span><span>Services</span><span>Resources ▾</span><span>Partners</span>
    <a style="${BTN}background:#C0392B;color:#fff;">Contact Us</a>
  </nav>
</div>`, { wide: true })),
    ].join("");
  },

  imagery({ lib, secs }) {
    const coll = (id) => lib.collections.find((c) => c.id === id)?.items ?? [];
    const raster = (it) => (it.files.find((f) => f.format === "svg") ?? it.files[0]).path;
    const rag = table(secs.get("Illustrations"), "Status");
    const icons = coll("icons").slice(0, 10);
    const ico = (it, color) => `<svg width="28" height="28" viewBox="${it.icon.viewBox}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${it.icon.body}</svg>`;
    const pill = (glyph, color, label, dark) => `<span class="pill" style="background:${color}${dark ? "33" : "24"};color:${dark ? "#FAF7F4" : "#14171C"}"><i style="background:${color}">${glyph}</i>${label}</span>`;
    return [
      block("Icons", "24×24, stroke only, 2px, round caps and joins. Red on light, white or gold on dark.",
        `<div class="icon-rows"><div class="icon-row paper">${icons.map((i) => ico(i, "#C0392B")).join("")}</div>
         <div class="icon-row ink">${icons.map((i, n) => ico(i, n % 3 ? "#FAF7F4" : "#E8A04C")).join("")}</div></div>
         <p class="see">All ${coll("icons").length} icons, with color and size export, are in the <a href="${LIBRARY_PATH}#icons">asset library</a>.</p>`),
      block("Spots", "240×240 art, shown at 96px at the top of index cards.",
        `<div class="spots">${coll("spots").map((s) => `<a href="${LIBRARY_PATH}#${s.key}" title="${esc(s.title)}"><img src="${raster(s)}" alt="${esc(s.title)}" loading="lazy"></a>`).join("")}</div>`),
      block("Covers and illustrations", "Covers sit behind dark page heroes and double as share images. Illustrations explain the work beside the text.",
        `<div class="art">${[...coll("covers"), ...coll("illustrations")].map((a) => `<a href="${LIBRARY_PATH}#${a.key}"><img src="${raster(a)}" alt="${esc(a.title)}" loading="lazy"><span>${esc(a.title)}</span></a>`).join("")}</div>`),
      `<section class="block" id="status"><h2>Status (RAG) colors</h2><p class="intro">Status only, never decoration. Every mark carries its glyph so color is never the only signal.</p>
        <div class="cards two">${["paper", "ink"].map((g) => `<div class="stage ${g}" style="display:flex;gap:10px;flex-wrap:wrap;">${rag.map(([s, glyph, light, dark]) => pill(plain(glyph), hexes(g === "ink" ? dark : light)[0], plain(s).split("/")[0].trim(), g === "ink")).join("")}</div>`).join("")}</div></section>`,
      block("Photography and backgrounds", "",
        `<div class="art">${coll("backgrounds").slice(0, 4).map((a) => `<a href="${LIBRARY_PATH}#${a.key}"><img src="${raster(a)}" alt="${esc(a.title)}" loading="lazy"><span>${esc(a.title)}</span></a>`).join("")}</div>`),
    ].join("");
  },

  email({ site }) {
    const logo = `${site.siteUrl}/assets/logo.png`;
    const html = `<!doctype html>
<html><body style="margin:0;background:#F3EEE8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EEE8;"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FAF7F4;">
    <tr><td style="background:#14171C;padding:20px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td><img src="${logo}" width="32" height="32" alt="M20 Technology" style="display:block;border:0;"></td>
        <td style="padding-left:10px;font:700 17px/1 Arial, Helvetica, sans-serif;color:#FAF7F4;">M20<br><span style="font:400 9px/1.6 Arial, Helvetica, sans-serif;letter-spacing:3px;color:#9AA1AD;">TECHNOLOGY</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:32px 28px 8px;">
      <h1 style="margin:0 0 12px;font:bold 24px/1.25 Georgia, 'Times New Roman', serif;color:#14171C;">Your Confluence intranet is live</h1>
      <p style="margin:0 0 20px;font:15px/1.5 Arial, Helvetica, sans-serif;color:#14171C;">Thanks for working with us. Here's what changed and where to find it.</p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#C0392B;border-radius:999px;">
        <a href="https://m20tech.com/" style="display:inline-block;padding:12px 24px;font:bold 15px Arial, Helvetica, sans-serif;color:#FFFFFF;text-decoration:none;">Open the intranet</a>
      </td></tr></table>
      <p style="margin:20px 0 0;font:15px/1.5 Arial, Helvetica, sans-serif;color:#5A6270;">Questions? Reply to this email.</p>
    </td></tr>
    <tr><td style="padding:24px 28px;font:12px/1.5 Arial, Helvetica, sans-serif;color:#5A6270;">© ${new Date().getFullYear()} M20 Technology. Empowering Teams. Amplifying Results.<br><a href="#" style="color:#5A6270;">Unsubscribe</a></td></tr>
  </table>
</td></tr></table>
</body></html>`;
    return block("Starter template", "Table layout, inline styles, fallback fonts, bulletproof button, hosted logo. Copy it as the base for any send.",
      `<div class="email-demo"><iframe title="Email template preview" srcdoc="${esc(html)}" loading="lazy"></iframe></div>
       <details class="code"><summary>HTML</summary><pre><code>${esc(html)}</code></pre><button class="copy" type="button">Copy</button></details>`);
  },

  print() {
    const runHead = (title) => `<div class="p-head">${lockup(24)}<span>${title}</span></div>`;
    const bars = (n, w = [100, 96, 92, 70]) => Array.from({ length: n }, (_, i) => `<i style="width:${w[i % w.length]}%"></i>`).join("");
    const page = (label, cls, inner) => `<figure class="sheet-fig"><div class="sheet ${cls}">${inner}</div><figcaption>${label}</figcaption></figure>`;
    return block("Templates", "US Letter portrait for documents, 16:9 for slides. Shown to scale with placeholder copy.",
      `<div class="sheets">
        ${page("Letterhead", "letter", `<div class="p-head">${lockup(24)}<address>M20 Technology LLC<br>75 South Broadway<br>4th Floor<br>White Plains, NY 10601</address></div><div class="p-body"><div class="lines">${bars(9)}</div></div>`)}
        ${page("Document", "letter", `${runHead("Proposal · Q4 Roadmap")}<div class="p-body"><h1>Q4 Roadmap Proposal</h1><h2>Background</h2><div class="lines">${bars(5)}</div><h2>Recommendation</h2><div class="lines">${bars(6)}</div></div><div class="p-foot">Page 1 of 4</div>`)}
        ${page("Newsletter", "letter", `${runHead("Client Digest · October")}<div class="p-body"><h1>Client Digest</h1><p class="sub">October 2026</p>
          <div class="callout gold"><b>Tip</b><div class="lines">${bars(2)}</div></div>
          <div class="stats"><div><b>12</b><span>Launches</span></div><div><b>98%</b><span>On time</span></div><div><b>4</b><span>New apps</span></div></div>
          <div class="callout red"><b>Action needed</b><div class="lines">${bars(2)}</div></div></div><div class="p-foot">Page 1 of 2</div>`)}
        ${page("Slide", "slide", `${runHead("Teamwork Collection")}<div class="p-body split"><div><h1>Rovo in Jira</h1><div class="lines">${bars(3)}</div></div><div class="quote">“Our backlog finally reads itself.”</div></div><div class="p-foot">Slide 3 of 12</div>`)}
      </div>`);
  },

  website({ secs }) {
    const pages = [...(secs.get("Page inventory") ?? "").matchAll(/\(`(\/[\w-]*)`/g)].map((m) => m[1]);
    const unique = [...new Set(pages)];
    return block("Pages", "Live thumbnails of every public page. Click one to open it.",
      `<div class="thumbs">${unique.map((p) => `<a class="thumb" href="${p}" target="_blank" rel="noopener"><div><iframe src="${p}" title="${p}" loading="lazy" tabindex="-1" scrolling="no"></iframe></div><span>${p}</span></a>`).join("")}</div>`);
  },
};

// Hub-card previews.
const PREVIEW = {
  brand: `<span style="font:600 26px ${SERIF};color:#14171C;">Direct.</span>`,
  color: `<span class="strip">${["#FAF7F4", "#F3EEE8", "#14171C", "#C0392B", "#96271C", "#E8A04C", "#F9E9E4"].map((c) => `<i style="background:${c}"></i>`).join("")}</span>`,
  typography: `<span style="font:600 40px ${SERIF};color:#14171C;">Aa</span><span style="font:600 40px ${SANS};color:#5A6270;">Aa</span>`,
  logo: lockup(30),
  layout: `<span class="strip">${[4, 10, 14, 18, 22].map((r) => `<i style="border-radius:${r}px;border:2px solid #C0392B;background:#fff"></i>`).join("")}</span>`,
  components: `<a style="${BTN}background:#C0392B;color:#fff;">Contact Us</a>`,
  imagery: `<img src="/assets/artwork/spots/sparkles.svg" alt="" width="64" height="64">`,
  library: `<img src="/assets/artwork/spots/layers.svg" alt="" width="64" height="64">`,
  email: `<span style="font:bold 20px Georgia, serif;color:#14171C;">✉ 600px</span>`,
  print: `<span class="strip"><i style="width:22px;height:30px;background:#fff;border:1px solid #E4DCD3"></i><i style="width:44px;height:26px;background:#14171C"></i></span>`,
  website: `<span style="font:600 15px ${SANS};color:#5A6270;">m20tech.com</span>`,
};

// ------------------------------------------------------------------- shell

export const guideHref = (p) => (p.slug === "library" ? LIBRARY_PATH : `${GUIDE_PATH}${p.slug}/`);

function shell({ title, eyebrowText, lead, body, nav, current, commit }) {
  return `<!doctype html>
<!-- GENERATED by scripts/design-guide.mjs from design.md. Do not edit. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title === "M20 Design System" ? esc(title) : `${esc(title)} · M20 Design System`}</title>
<link rel="icon" href="/assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>if (/[?&]embed\\b/.test(location.search)) document.documentElement.classList.add("embed");</script>
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="${GUIDE_PATH}">${lockup(34)}<span class="tag">Design System</span></a>
  <nav aria-label="Design system">${nav.map((p) => `<a href="${guideHref(p)}"${p.slug === current ? ' aria-current="page"' : ""}>${esc(p.title)}</a>`).join("")}</nav>
</div></header>
<main class="wrap">
  <div class="hero"><p class="eyebrow">${esc(eyebrowText)}</p><h1>${esc(title)}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}
    <p class="open-full"><a href="${current ? `${GUIDE_PATH}${current === "hub" ? "" : current + "/"}` : GUIDE_PATH}" target="_blank" rel="noopener">Open full page ↗</a></p></div>
  ${body}
</main>
<footer><div class="wrap">
  <span>Generated from <a href="https://github.com/m20tech/m20-website/blob/main/design.md">design.md</a> and managed by agents. Edit the repo, not this page.</span>
  <span>${commit ? esc(commit.slice(0, 7)) : ""}</span>
</div></footer>
<div class="toast" id="toast" role="status"></div>
<script>${JS}</script>
</body>
</html>
`;
}

// Links in design.md text: #section → the guide page that owns it; repo
// paths → GitHub.
function guideLinks(html, config) {
  const owner = new Map();
  for (const p of config.pages) for (const s of p.sections) owner.set(s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-"), p);
  return html.replace(/href="([^"]+)"/g, (all, h) => {
    if (h.startsWith("#")) {
      const p = owner.get(h.slice(1).replace(/-+/g, "-"));
      return p ? `href="${guideHref(p)}"` : all;
    }
    if (/^(https?:|mailto:|\/)/.test(h)) return all;
    return `href="https://github.com/m20tech/m20-website/blob/main/${h}"`;
  });
}

export function writeDesignGuide(dist, { md, config, lib, site, commit = "" }) {
  const secs = sections(md).sections;
  const libJson = libraryJson(lib, { siteUrl: site.siteUrl });
  const out = path.join(dist, GUIDE_PATH.replace(/^\/|\/$/g, ""));
  fs.mkdirSync(out, { recursive: true });
  const nav = config.pages;
  const ctx = { secs, lib: libJson, site };

  for (const p of config.pages) {
    if (p.slug === "library") continue;
    const visual = VISUALS[p.slug]?.(ctx) ?? "";
    const text = p.sections.map((s) => (p.sections.length > 1 ? `## ${s}\n\n` : "") + secs.get(s)).join("\n\n");
    const body = `${visual}<section class="block guidelines"><h2>Guidelines</h2><p class="intro">The written rules from design.md.</p><div class="prose">${guideLinks(mdToHtml(text), config)}</div></section>`;
    fs.mkdirSync(path.join(out, p.slug), { recursive: true });
    fs.writeFileSync(path.join(out, p.slug, "index.html"), shell({ title: p.title, eyebrowText: "M20 Design System", lead: esc(p.summary), body, nav, current: p.slug, commit }));
  }

  const cards = config.pages.map((p) => `<a class="hub-card" href="${guideHref(p)}"><div class="pv">${PREVIEW[p.slug] ?? ""}</div><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></a>`).join("");
  const summary = mdToHtml(secs.get("Brand summary") ?? "");
  fs.writeFileSync(path.join(out, "index.html"), shell({
    title: "M20 Design System",
    eyebrowText: "Brand guide",
    lead: "How M20 Technology looks and sounds on the website and in email, PDFs, and slides. Every page shows the real thing.",
    body: `<div class="hub">${cards}</div><section class="block guidelines"><h2>In one paragraph</h2><div class="prose">${summary}</div></section>`,
    nav, current: "hub", commit,
  }));
}

// -------------------------------------------------------------- CSS / JS

const CSS = `
:root { --paper:#FAF7F4; --alt:#F3EEE8; --ink:#14171C; --surface:#23282F; --muted:#5A6270; --border:#E4DCD3; --red:#C0392B; --red-h:#96271C; --tint:#F9E9E4; --gold:#E8A04C; }
* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font:400 17px/1.65 'Source Sans 3', system-ui, sans-serif; }
a { color:var(--red); }
code { font:500 .88em ui-monospace, SFMono-Regular, Menlo, monospace; background:var(--alt); padding:1px 5px; border-radius:5px; }
.wrap { max-width:1180px; margin-inline:auto; padding-inline:clamp(16px,4vw,48px); }
header.top { position:sticky; top:0; z-index:50; background:rgba(250,247,244,.94); backdrop-filter:blur(10px); border-bottom:1px solid var(--border); }
header.top .wrap { display:flex; align-items:center; gap:20px; min-height:64px; }
.brand { display:flex; align-items:center; gap:12px; text-decoration:none; flex:none; }
.brand .tag { font:600 11px 'Source Sans 3'; letter-spacing:.16em; text-transform:uppercase; color:var(--red); border-left:1px solid var(--border); padding-left:12px; }
header.top nav { display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; margin-left:auto; }
header.top nav a { font:600 14px 'Source Sans 3'; color:var(--ink); text-decoration:none; padding:8px 10px; border-radius:999px; white-space:nowrap; }
header.top nav a:hover { background:var(--alt); }
header.top nav a[aria-current] { background:var(--ink); color:#fff; }
.hero { padding-block:clamp(32px,4.5vw,52px) 8px; }
.eyebrow { display:flex; align-items:center; gap:12px; font:600 12.5px 'Source Sans 3'; letter-spacing:.16em; text-transform:uppercase; color:var(--red); margin:0 0 16px; }
.eyebrow::before { content:""; width:40px; height:2px; background:currentColor; }
h1 { font:700 clamp(36px,5vw,56px)/1.12 'Source Serif 4', Georgia, serif; letter-spacing:-.01em; margin:0 0 16px; }
.lead { font-size:19px; color:var(--muted); max-width:720px; margin:0; }
.open-full { display:none; margin:10px 0 0; font:600 14px 'Source Sans 3'; }
.block { padding-block:clamp(28px,4vw,44px) 0; }
.block > h2 { font:600 clamp(24px,3vw,32px)/1.2 'Source Serif 4', Georgia, serif; letter-spacing:-.01em; margin:0 0 6px; }
.block .intro { color:var(--muted); margin:0 0 20px; max-width:780px; }
.see { color:var(--muted); font-size:15px; }
.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr)); gap:18px; }
.cards.two { grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr)); }
.card { background:#fff; border:1px solid var(--border); border-radius:18px; padding:22px; }
.card h3 { font:600 20px/1.25 'Source Serif 4', Georgia, serif; margin:0 0 8px; }
.card p { margin:0; color:var(--muted); font-size:16px; }
.card .kicker { font:600 12px 'Source Sans 3'; letter-spacing:.14em; text-transform:uppercase; color:var(--red); margin:0 0 8px; }
.card .quote { margin-top:10px; font:400 16px/1.5 'Source Serif 4', Georgia, serif; color:var(--ink); }
.family .weights { display:flex; gap:16px; flex-wrap:wrap; margin-top:6px; color:var(--ink); }
.spec { margin:0; background:#fff; border:1px solid var(--border); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; }
.spec.wide { grid-column:1/-1; }
.stage { padding:28px; display:flex; align-items:center; justify-content:center; flex:1; min-height:140px; }
.stage.paper { background:var(--paper); }
.stage.ink { background:var(--ink); }
.stage > * { max-width:100%; }
.cards > .stage { border:1px solid var(--border); border-radius:18px; }
.spec.wide .stage { justify-content:flex-start; }
.spec.wide .stage > * { width:100%; }
figcaption { padding:12px 16px 14px; border-top:1px solid var(--border); font-size:15px; }
figcaption b { display:block; }
figcaption span { color:var(--muted); }
details { margin-top:6px; }
details summary { cursor:pointer; font:600 13px 'Source Sans 3'; color:var(--muted); }
details pre { margin:8px 0 6px; max-height:280px; overflow:auto; background:var(--ink); color:#E9E5DF; border-radius:10px; padding:12px; font-size:12.5px; line-height:1.5; }
details pre code { background:none; padding:0; color:inherit; white-space:pre; }
.copy { font:600 13px 'Source Sans 3'; border:1.5px solid var(--ink); background:transparent; border-radius:999px; padding:4px 12px; cursor:pointer; }
.copy:hover { background:var(--ink); color:#fff; }
.swatches { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr)); gap:16px; }
.swatch { background:#fff; border:1px solid var(--border); border-radius:18px; overflow:hidden; }
.swatch .chip { display:flex; align-items:flex-end; width:100%; height:110px; border:0; border-bottom:1px solid var(--border); padding:12px 16px; cursor:copy; font:600 28px 'Source Serif 4', serif; }
.sw-meta { padding:12px 16px 16px; }
.sw-meta b { display:block; font-size:16px; }
.sw-meta p { margin:6px 0 8px; color:var(--muted); font-size:14px; line-height:1.45; }
.ratio { display:inline-block; font:600 12px 'Source Sans 3'; border-radius:999px; padding:2px 8px; margin:0 6px 4px 0; }
.ratio.pass { background:#1E7A4622; color:#1E7A46; }
.ratio.large { background:#E8A04C33; color:#7A4E12; }
.ratio.fail { background:#C0392B1F; color:#96271C; }
.type-scale { background:#fff; border:1px solid var(--border); border-radius:18px; }
.type-row { display:grid; grid-template-columns:minmax(0,240px) 1fr; gap:24px; padding:20px 22px; border-top:1px solid var(--border); align-items:center; }
.type-row:first-child { border-top:0; }
.type-meta b { display:block; }
.type-meta span { color:var(--muted); font-size:13.5px; line-height:1.4; display:block; }
.type-sample { overflow-wrap:anywhere; }
@media (max-width:700px) { .type-row { grid-template-columns:1fr; gap:8px; } }
.sizes { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:18px; }
.size { background:#fff; border:1px solid var(--border); border-radius:18px; padding:22px; }
.size p { margin:12px 0 0; color:var(--muted); font-size:14px; }
.container-demo { display:grid; grid-template-columns:1fr 6fr 1fr; border:1px dashed var(--muted); border-radius:12px; overflow:hidden; font-size:13px; text-align:center; }
.container-demo > div { padding:18px 6px; }
.container-demo .gutter { background:repeating-linear-gradient(45deg,var(--alt),var(--alt) 6px,#fff 6px,#fff 12px); color:var(--muted); }
.container-demo .content { background:var(--tint); }
.grid-demo { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:clamp(20px,3vw,36px); margin-top:16px; }
.grid-demo div { background:#fff; border:1px solid var(--border); border-radius:22px; padding:28px; text-align:center; color:var(--muted); }
.radii { display:flex; flex-wrap:wrap; gap:18px; }
.radius { width:150px; }
.radius div { height:90px; background:#fff; border:2px solid var(--red); margin-bottom:8px; }
.radius b { display:block; }
.radius span { font-size:13.5px; color:var(--muted); }
.rhythm { display:flex; flex-direction:column; gap:12px; }
.rhythm-row { display:grid; grid-template-columns:40px minmax(0,1fr); gap:6px 14px; align-items:center; }
.rhythm-row .bar { background:linear-gradient(var(--tint),var(--tint)) padding-box; border-block:2px solid var(--red); border-radius:4px; }
.rhythm-row span { grid-column:2; font-size:14px; color:var(--muted); }
.rhythm-row i { font-style:normal; font-weight:600; color:var(--ink); }
.pairs { display:grid; gap:12px; }
.pair { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:12px; }
.pair p { margin:0; background:#fff; border:1px solid var(--border); border-radius:14px; padding:14px 16px; display:flex; gap:10px; align-items:flex-start; }
.pair .no { border-left:3px solid var(--red); }
.pair .yes { border-left:3px solid #1E7A46; }
.pair span { font-weight:700; }
.pair .no span { color:var(--red); }
.pair .yes span { color:#1E7A46; }
.icon-rows { border:1px solid var(--border); border-radius:18px; overflow:hidden; }
.icon-row { display:flex; flex-wrap:wrap; gap:26px; padding:24px; }
.icon-row.paper { background:#fff; }
.icon-row.ink { background:var(--ink); }
.spots { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:10px; }
.spots img { width:100%; height:auto; display:block; }
.art { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:18px; }
.art a { text-decoration:none; color:var(--ink); background:#fff; border:1px solid var(--border); border-radius:18px; overflow:hidden; }
.art img { width:100%; height:auto; display:block; aspect-ratio:1200/680; object-fit:cover; background:var(--alt); }
.art span { display:block; padding:10px 14px; font-weight:600; font-size:15px; }
.pill { display:inline-flex; align-items:center; gap:8px; border-radius:999px; padding:4px 12px 4px 4px; font:600 14px 'Source Sans 3'; }
.pill i { width:22px; height:22px; border-radius:999px; color:#fff; display:grid; place-items:center; font:700 12px 'Source Sans 3'; font-style:normal; }
.email-demo { background:var(--alt); border:1px solid var(--border); border-radius:18px; padding:12px; }
.email-demo iframe { width:100%; height:430px; border:0; border-radius:10px; background:#fff; }
details.code { margin-top:12px; }
.sheets { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:22px; align-items:start; }
.sheet-fig { margin:0; }
.sheet-fig figcaption { border:0; padding:8px 2px; font-weight:600; }
.sheet { background:#fff; border:1px solid var(--border); box-shadow:0 18px 40px rgba(20,23,28,.10); position:relative; padding:9% 9% 8%; overflow:hidden; font-size:9px; display:flex; flex-direction:column; gap:10px; }
.sheet.letter { aspect-ratio:8.5/11; }
.sheet.slide { aspect-ratio:16/9; padding:4% 4.5%; grid-column:1/-1; max-width:560px; }
.p-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--border); padding-bottom:8px; }
.p-head > span:last-child, .p-foot { font:600 7px 'Source Sans 3'; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
.p-head address { font:400 7px/1.4 'Source Sans 3'; font-style:normal; color:var(--muted); text-align:right; }
.p-head img { width:18px !important; }
.p-body { flex:1; display:flex; flex-direction:column; gap:7px; }
.p-body h1 { font:700 17px/1.1 'Source Serif 4', serif; margin:4px 0 2px; }
.p-body h2 { font:700 9px 'Source Sans 3'; margin:6px 0 0; }
.p-body .sub { margin:0; color:var(--muted); font-size:8px; }
.p-foot { text-align:right; }
.lines { display:flex; flex-direction:column; gap:4px; }
.lines i { display:block; height:4px; background:#E9E3DC; border-radius:3px; }
.callout { background:var(--alt); border:1px solid var(--border); border-radius:6px; padding:6px 8px; font-size:7.5px; }
.callout.gold { border-top:2px solid var(--gold); }
.callout.red { border-top:2px solid var(--red); }
.callout b { display:block; margin-bottom:4px; }
.stats { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
.stats b { display:block; font:600 14px 'Source Serif 4', serif; color:var(--red); }
.stats span { font:600 6px 'Source Sans 3'; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.split { display:grid; grid-template-columns:1.2fr 1fr; gap:14px; align-items:center; }
.split .quote { background:var(--ink); color:#fff; border-radius:8px; padding:14px; font:400 12px/1.4 'Source Serif 4', serif; }
.thumbs { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr)); gap:18px; }
.thumb { text-decoration:none; color:var(--ink); background:#fff; border:1px solid var(--border); border-radius:14px; overflow:hidden; }
.thumb > div { position:relative; aspect-ratio:16/11; overflow:hidden; background:var(--alt); }
.thumb iframe { position:absolute; top:0; left:0; width:1280px; height:880px; border:0; transform:scale(var(--s, .1875)); transform-origin:0 0; pointer-events:none; }
.thumb span { display:block; padding:10px 14px; font:600 14px ui-monospace, Menlo, monospace; }
.hub { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr)); gap:18px; padding-top:28px; }
.hub-card { background:#fff; border:1px solid var(--border); border-radius:22px; padding:0 0 18px; text-decoration:none; color:var(--ink); overflow:hidden; transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.hub-card:hover { border-color:var(--red); box-shadow:0 18px 40px rgba(20,23,28,.10); transform:translateY(-4px); }
.hub-card .pv { height:110px; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--alt); border-bottom:1px solid var(--border); margin-bottom:14px; }
.hub-card h3 { font:600 20px/1.2 'Source Serif 4', Georgia, serif; margin:0 18px 6px; }
.hub-card p { margin:0 18px; color:var(--muted); font-size:15px; line-height:1.5; }
.strip { display:flex; gap:6px; }
.strip i { display:block; width:28px; height:28px; border-radius:8px; border:1px solid var(--border); }
.guidelines .prose { background:#fff; border:1px solid var(--border); border-radius:18px; padding:clamp(20px,3vw,32px); }
.prose > :first-child { margin-top:0; }
.prose h2 { font:600 24px/1.2 'Source Serif 4', Georgia, serif; margin:28px 0 10px; }
.prose h3 { font:600 19px/1.25 'Source Serif 4', Georgia, serif; margin:22px 0 8px; }
.prose p, .prose li { color:#2A2F37; }
.prose table { border-collapse:collapse; width:100%; margin:12px 0; font-size:15px; display:block; overflow-x:auto; }
.prose th, .prose td { border:1px solid var(--border); padding:8px 10px; text-align:left; vertical-align:top; }
.prose th { background:var(--alt); }
.prose td p, .prose th p, .prose li p { margin:0; }
.prose pre { background:var(--ink); color:#E9E5DF; border-radius:10px; padding:14px; overflow-x:auto; font-size:12.5px; }
.prose pre code { background:none; color:inherit; padding:0; }
.prose [data-type^="panel"] { background:var(--alt); border-left:3px solid var(--gold); border-radius:8px; padding:4px 16px; }
footer { margin-top:56px; background:var(--ink); color:#C9CDD6; font-size:14px; }
footer .wrap { padding-block:24px; display:flex; flex-wrap:wrap; gap:8px 24px; justify-content:space-between; }
footer a { color:#F5C98F; }
.toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); background:var(--ink); color:#fff; border-radius:999px; padding:10px 20px; font:600 15px 'Source Sans 3'; opacity:0; transition:opacity .18s ease; pointer-events:none; z-index:200; }
.toast.show { opacity:1; }
html.embed header.top, html.embed footer { display:none; }
html.embed .hero { padding-top:20px; }
html.embed h1 { font-size:clamp(28px,4vw,40px); }
html.embed .open-full { display:block; }
@media (prefers-reduced-motion: reduce) { * { transition:none !important; } }
`;

const JS = `
(() => {
  const toast = (m) => { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 1500); };
  const copy = (s, m) => navigator.clipboard.writeText(s).then(() => toast(m), () => toast("Copy failed"));
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]");
    if (c) return copy(c.dataset.copy, c.dataset.copy + " copied");
    const b = e.target.closest(".copy");
    if (b) copy(b.parentElement.querySelector("code").textContent, "HTML copied");
  });
  // style-hover="…": the site's hover convention, applied the same way here.
  document.querySelectorAll("[style-hover]").forEach((el) => {
    const base = el.getAttribute("style") || "";
    el.addEventListener("mouseenter", () => el.setAttribute("style", base + ";" + el.getAttribute("style-hover")));
    el.addEventListener("mouseleave", () => el.setAttribute("style", base));
  });
  const px = () => document.querySelectorAll("[data-px]").forEach((b) => { const o = b.parentElement.querySelector(".px"); if (o) o.textContent = Math.round(b.getBoundingClientRect().height) + "px now"; });
  // Website thumbnails: scale each 1280px-wide page to its card.
  const thumbs = () => document.querySelectorAll(".thumb > div").forEach((d) => d.style.setProperty("--s", d.clientWidth / 1280));
  px(); thumbs(); addEventListener("resize", () => { px(); thumbs(); });
  // In an embed, keep links to other guide pages inside the frame.
  if (document.documentElement.classList.contains("embed")) document.querySelectorAll('a[href^="${GUIDE_PATH}"]').forEach((a) => { if (!a.target) a.search = "?embed"; });
})();
`;
