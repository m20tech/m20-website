# AGENTS.md

Coding conventions for agents working in this repo. See [README.md](README.md) for a repo overview and AI tooling setup (TWG CLI, Rovo MCP).

## Design system

**[design.md](design.md) is the golden source for this site's design system** — colors, typography, spacing, component patterns, imagery, and motion. Read it before styling or restyling anything. If a change introduces a new pattern, token, or component, update `design.md` to match.

## Site structure

- The site is static — no bundler, no build step. Pages are edited and served directly.
- Pages and shared components live in `*.dc.html` files (a "design canvas" format): `index.html` is the homepage, other pages/components are named e.g. `services.dc.html`, `Header.dc.html`, `Footer.dc.html`.
- Every page wraps content in `<x-dc>...</x-dc>`, includes `./support.js` and `./image-slot.js`, and pulls in shared components via `<dc-import name="Header" ...>` / `<dc-import name="Footer" ...>` rather than duplicating markup.
- `<dc-import>` resolves by fetching `./<Name>.dc.html` at runtime — it only works when the page is served over `http(s)://`. Preview pages with a local static server (e.g. `python3 -m http.server`), not by opening the file directly (`file://`).
- Styling is inline (`style="..."`) using the tokens and values documented in `design.md` — there is no external stylesheet to add classes to.
- Hover states use the custom `style-hover="..."` attribute (inline styles applied on hover), not CSS `:hover` classes.

## HTML formatting guidelines

- **HTML text wrapping**: Do not write long sentences or paragraphs on a single horizontal line inside HTML tags.
- Break text content into multiple indented lines (aim for a ~80-character width limit per line) inside parent tags to make source code editing easier.
- Maintain appropriate HTML tag opening/closing indentation.

BAD:
```html
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
```

GOOD:
```html
<p>
  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Sed do eiusmod tempor incididunt ut labore et dolore
  magna aliqua. Ut enim ad minim veniam, quis nostrud
  exercitation ullamco laboris.
</p>
```
