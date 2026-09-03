# M20 Technology — Website Design System

Source of truth: this repo (`.dc.html` design-canvas files). Live reference: https://m20tech.github.io/m20-website/

## Brand summary

M20 Technology is an Atlassian Gold Solution Partner. The site's tone is editorial and confident rather than typical SaaS-cheerful: a warm, off-white paper background, a deep charcoal-navy for contrast sections, a brick-red accent for action, and a serif display face paired with a clean grotesque for body/UI text. Corners are soft (14–28px radii), pills for buttons, generous whitespace, and a restrained set of thin-stroke line icons in the accent red.

## Color palette

| Token | Hex | Usage |
|---|---|---|
| Paper (background) | `#FAF7F4` | Page background, light section background |
| Paper alt | `#F3EEE8` | Secondary light section background (alternates with paper) |
| Ink (text/dark bg) | `#14171C` | Body text color; also the darkest section background (hero, footer, dark CTA bands) |
| Dark surface | `#23282F` | Card background on dark sections |
| Muted text | `#5A6270` | Secondary/body copy on light backgrounds |
| Muted text on dark | `#D5D9E1` / `#C9CDD6` / `#9AA1AD` | Secondary copy on dark backgrounds (decreasing emphasis) |
| Border (light) | `#E4DCD3` | Card borders, dividers on light sections |
| Brand red (primary action) | `#C0392B` | Primary buttons, links, active nav underline, icon strokes, accent bars |
| Brand red hover | `#96271C` | Button/link hover state, also used as a dark maroon gradient stop |
| Red gradient dark stop | `#7A1E15` | Deep maroon section background (paired with `#96271C`) |
| Red tint (icon chip bg) | `#F9E9E4` | Icon badge backgrounds on light cards |
| Gold/amber accent | `#E8A04C` | Eyebrow labels on dark sections, kicker rules, "Rovo AI" accents |
| Gold tint | `#F5C98F` | Links/emphasis on dark backgrounds (e.g. contact email link) |
| Gold pale | `#F0C9A8` | 4th step in the "Optimization Cycle" ring chart |
| Success green | `#1E7A46` | Form success status text |
| Error/invalid | `#96271C` | Form field invalid border/status text |
| White | `#FFFFFF` | Cards on light sections, button text on red |

Design logic: **paper/ink** for structure, **red** exclusively for calls to action and interactive emphasis, **gold** exclusively as an eyebrow/kicker accent on dark backgrounds. Never mix red-as-decoration and red-as-action — red always means "click here" or "this is active."

## Typography

- **Display serif:** [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) (optical size axis `8..60`, weights 400/600/700) — used for all headings, stat numerals, and pull quotes. Fallback: `Georgia, serif`. Weight 700 for page H1s, 600 for section H2s/card H3s/stat numerals, 400 for pull quotes. Tight letter-spacing (`-0.01em`) on headings, line-height 1.12–1.2.
- **Body/UI sans:** [Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3) (weights 400/500/600/700) — used for body copy, eyebrows, buttons, labels, nav, and form fields. Fallback: `system-ui, sans-serif`.
- Loaded via Google Fonts: `family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Source+Sans+3:wght@400;500;600;700`.
- Font-family values that contain a space must use single quotes (`'Source Serif 4'`), since every declaration lives inside a double-quoted `style="..."` HTML attribute.

Type scale (fluid via `clamp()`):
- H1 (hero): `clamp(44px,7vw,80px)` / 1.12, Source Serif 4 **700**
- H1 (page header): `clamp(38px,5.4vw,60px)` / 1.15, Source Serif 4 **700**
- H2 (section): `clamp(30px,4vw,48px)` / 1.15, Source Serif 4 **600**
- H3 (card title): `20–26px` / 1.12–1.2, Source Serif 4 **600**
- Stat numeral (case-study tiles): `clamp(30px,3.6vw,46px)` / 1, Source Serif 4 **600**
- Pull quote (blockquote): `clamp(19px,2.2vw,24px)` / 1.55, Source Serif 4 **400**
- Body: `17px` base / 1.65 line-height, Source Sans 3 400
- Lead paragraph: `18–22px`, Source Sans 3 400
- Eyebrow/kicker label: `12–13px`, Source Sans 3 600, `letter-spacing: .14em–.2em`, uppercase, paired with a short 2px horizontal rule in the accent color
- Nav/button label: `15px`, Source Sans 3 600, `letter-spacing: .02em`

## Layout & spacing

- Content max-width: `1180px`, centered (`margin-inline:auto`)
- Page gutter: `clamp(20px, 4vw, 48px)` horizontal padding
- Card grid: `repeat(auto-fit, minmax(min(100%, 260–320px), 1fr))` with `gap: clamp(20px,3vw,36px)` — responsive without explicit breakpoints for most grids
- Mobile breakpoint used explicitly in nav logic: `760px`
- Border radius scale: `999px` (pills/buttons), `22px` (primary cards), `18px` (dark-surface cards, agent cards), `14px` (icon badges, small dark cards), `10px` (form inputs), `12px` (dropdown menus)

### Section vertical rhythm

Sections use one of four `padding-block` steps — pick the step, don't invent a new value.
Keeping to the scale is what stops pages growing into needless scrolling.

| Step | Value | Use |
|---|---|---|
| XL | `clamp(44px,5.5vw,72px)` | Page hero / lead section at the top of a page |
| L | `clamp(40px,5vw,64px)` | Standard content section |
| M | `clamp(36px,4.5vw,52px)` | Compact band, closing CTA strip |
| S | `clamp(32px,4vw,44px)` | Tight filler band |

Supporting spacing:
- Two-column section gap: `clamp(28px,4vw,48px)`, up to `clamp(32px,4.5vw,64px)` for a wide split
- Section heading → grid/content below: `32px` (never more)
- Eyebrow → heading: `18px`; heading → lead paragraph: `20px`
- Long-form prose (privacy policy): `1.4em` between blocks, `34px` above an `h2` (margins collapse, so the heading's top margin sets the section break)

## Responsive layout

Most grids are breakpoint-free (`auto-fit` + `minmax`). Add an explicit media query only when a
count matters editorially — the Rovo agents grid on `ai.dc.html` is the one such case, pinned to
3 + 3 via a `.agent-grid` rule in that page's `<style id="reset">` block (3 columns → 2 at
`900px` → 1 at `600px`).

## Components

**Buttons**
- Primary: pill (`border-radius:999px`), `background:#C0392B`, white text, `min-height:38px`, `padding:8px 20px`, Source Sans 3 600 15px. Hover → `background:#96271C` + `box-shadow:0 8px 24px rgba(192,57,43,.28)`.
- Secondary (on dark hero): pill, transparent/translucent fill (`rgba(20,23,28,.4)`), 2px white border. Hover fills white-tinted.
- Outline (on light bg): pill, 2px solid `#14171C` border, dark text. Hover → fills `#14171C` with white text.

**Cards**
- Light service card: white bg, `1px solid #E4DCD3` border, `22px` radius, `36px 32px 30px` padding. Hover: border → red, `box-shadow:0 18px 40px rgba(20,23,28,.10)`, `translateY(-4px)`.
- Icon badge: `52–56px` square, `14px` radius, tint background `#F9E9E4` (light) — 26px stroke SVG icon in `#C0392B`, `stroke-width:1.9–2.2`, rounded caps/joins, no fill.
- Dark surface card (on `#14171C` sections): `#23282F` bg, `1px solid rgba(255,255,255,.08)` border, sometimes `3px solid #E8A04C` top accent. Hover: border → red, lift + shadow.

**Navigation (Header)**
- Sticky header, `rgba(250,247,244,.94)` with `backdrop-filter: blur(10px)`, bottom border `#E4DCD3`.
- Logo: 42px mark + stacked wordmark ("M20" bold 22px / "TECHNOLOGY" 11px letterspaced uppercase muted). Both lines are set `line-height:1` with a `3px` gap between them, so the wordmark reads as one tight unit next to the mark — same treatment in the footer.
- Desktop nav: `Home · AI · Services · Resources ▾ · Partners`, with a 2px red underline under the active page and a `Contact Us` pill at the right.
- **Dropdowns are hover-only.** Resources (→ Case Studies, AI Value Proposition) opens on `mouseenter` and closes on `mouseleave` after a 220ms grace delay. Clicking a top-level nav label does nothing — there is no click-to-toggle and no latched-open state. Keyboard users get the same menu via `onFocus`/`onBlur` on the `<li>`, so the items stay reachable by Tab; `Escape` closes it.
- Mobile (<760px): hamburger (3 bars) toggles a stacked full-width menu that lists every destination flat, including the ones behind the desktop dropdown.

**Footer**
- Dark (`#14171C`) bar, `1px` top border `rgba(255,255,255,.08)`, logo + Atlassian Gold Partner badge + link nav (LinkedIn, email, Contact, Privacy) + copyright line, all in a single wrapping flex row.

**Forms (Contact page)**
- White card on dark hero section, `22px` radius, heavy shadow (`0 40px 90px rgba(0,0,0,.4)`).
- Inputs: `#FAF7F4` fill, `1.5px solid #E4DCD3` border (red on invalid), `10px` radius, `13px 15px` padding, 16px Source Sans 3.
- Labels: 13.5px Source Sans 3 600, required asterisk in red.
- Full-width red pill submit button; inline status message (green success / red error).

**Logo marquee** (home page "Trusted by" strip): auto-scrolling, pointer-draggable row of client logos, edge-masked with a fade gradient, pauses on `prefers-reduced-motion`.

**Data viz motif**: a segmented ring/donut chart ("Optimization Cycle") built from 4 arc segments in the red→gold family (`#C0392B`, `#96271C`, `#E8A04C`, `#F0C9A8`) with a paper-colored center hole and serif label — used as the one illustrative-chart pattern on the site.

## Imagery & iconography

- Icons: custom inline SVGs, 24×24 viewBox, `stroke` only (no fill except small accent dots), `stroke-width` ~1.9–2.2, rounded linecap/linejoin — consistent hand-drawn-technical feel, always in brand red on light backgrounds.
- Photography: one dark, masked hero image (`hero-network.jpg`, an abstract red/dark network mesh) used behind the homepage hero with a left-to-right dark gradient overlay for text legibility.
- Client logos: grayscale-free, contained in their own rounded chip on the paper-alt background, arranged in an infinite marquee.
- Atlassian logos: We have permission to use Atlassian logos within our materials and they should be included where appropriate. We have the logos for products in our [Google Drive](https://drive.google.com/drive/u/0/folders/1tg5lWANCkSzNrXbQKVI72EC3TEz15eIY). Use logos with attribution where possible. Guidelines for Atlassian logo usage are [here](https://atlassian.design/components/logo/usage).

## Logo & lockup

Reference for any deliverable that needs the M20 logo in a header — web, email, or PDF.

- **File:** `assets/logo.png` — 300×300px PNG, transparent background, solid brand red (`#C0392B`) mark. It's opaque, so it reads cleanly on both light (paper) and dark (ink) backgrounds — there's no separate light/dark variant.
- **Lockup:** mark + stacked wordmark — "M20" (Source Sans 3, bold, `line-height:1`) over "TECHNOLOGY" (Source Sans 3, smaller, uppercase, letter-spaced, muted color), `3px` gap between the two lines so they read as one tight unit next to the mark. See `Header.dc.html` / `Footer.dc.html` for the reference markup. Use the full lockup (mark + wordmark) whenever there's room; the mark alone is only for tight spaces (favicon-scale).
- **Sizing:** ~42px mark height in the site header, ~36px in the footer. Scale down proportionally for compact placements (email header, PDF running header) — don't go below ~24px, where the mark starts to lose legibility.
- **Embedding by output type:**
  - **Web pages:** relative path, `assets/logo.png`.
  - **Email:** an absolute, publicly reachable URL — `https://m20tech.github.io/m20-website/assets/logo.png`. Email clients (Gmail, Outlook, Apple Mail) fetch images over the network and commonly strip or block `data:` URIs, so base64-embedding the logo is not reliable here. Always set explicit `width`/`height` on the `<img>` and a plain-text `alt="M20 Technology"` fallback.
  - **PDF:** embed as a base64 data URI in the HTML/CSS that gets rendered to PDF (or reference the local file path directly if the renderer runs inside this repo). That keeps the PDF self-contained and reproducible without a network fetch at render time.

## Motion

- Hover transitions: `border-color`, `box-shadow`, `transform` at `.18s ease`.
- Cards lift `translateY(-4px)` (service/dashboard cards) or `-6px` (case-study cards) on hover with a soft shadow.
- Buttons gain a colored glow shadow on hover (`0 8px 24px rgba(192,57,43,.28)`).
- Logo marquee scrolls continuously (~32px/s), pauses under `prefers-reduced-motion: reduce`, and is draggable via pointer events.

## Page inventory

- `index.html` — Home: hero, 3 service pillars, "Solutions" dark-red gradient band, Rovo AI teaser, client logo marquee, closing CTA.
- `services.dc.html` — Service pillars, "solutions shaped around your needs" icon list, Optimization Cycle chart, Atlassian product stack cards (Jira/Confluence/JSM), Gold Partner CTA band.
- `ai.dc.html` — Rovo AI: Find/Learn/Act cards, 6 Rovo Agent categories (dark panel, pinned 3 + 3), Teamwork Graph blurb, connector logos, CTA band.
- `ai-value-proposition.dc.html` — how M20 runs its own operations on AI: Forge app, agentic workflows, knowledge management, governance. Reached from the Resources nav dropdown.
- `case-studies.dc.html`, `case-study-intranet.dc.html`, `case-study-dashboard.dc.html` — case study index + detail pages.
- `partners.dc.html`, `privacy.dc.html`, `contact.dc.html` — partners, privacy policy, and contact form.
- `Header.dc.html` / `Footer.dc.html` — shared, imported components (`<dc-import>`).

## Voice

Short, confident, benefit-first headlines (Source Serif 4) paired with a calmer explanatory sentence (Source Sans 3). Section eyebrows always follow the pattern: short colored rule + uppercase letter-spaced label (e.g. "What we do", "How we work", "Get in touch").

## Email templates

Emails are HTML, not the site's usual freeform layout — client support is inconsistent, so build defensively rather than porting web patterns directly.

**Structure**
- Single-column, table-based layout, `600px` max width, centered on a neutral surrounding background (`#F3EEE8` works well outside the 600px content table).
- Style every element inline (`style="..."`) — the same convention used across `.dc.html` files, and doubly necessary in email since most clients strip `<style>` blocks.
- No JavaScript, no CSS `:hover` or animation — none of it runs in an email client.

**Fonts**
- Don't rely on Source Serif 4 / Source Sans 3 loading — most email clients block external font requests or ignore `@font-face`/`<link>`. Use the fallback stacks as the primary declaration: `Georgia, 'Times New Roman', serif` for headline text, `Arial, Helvetica, sans-serif` for body/UI text. A `<link>` to the Google Fonts stylesheet can be added for progressive enhancement (Apple Mail and a few others honor it) but never depend on it for legibility.

**Header**
- Brand-red (`#C0392B`) or ink (`#14171C`) band, ~72px min-height.
- Logo lockup (see [Logo & lockup](#logo--lockup)) left-aligned, using the hosted URL, sized ~32px tall with explicit `width`/`height` and `alt="M20 Technology"`.

**Body**
- Paper (`#FAF7F4`) or white background, `24–32px` padding.
- Headline: serif fallback stack, ~22–26px, `#14171C`, bold.
- Body copy: sans fallback stack, ~15–16px / 1.5 line-height, `#14171C` or `#5A6270` for secondary lines.

**Buttons**
- Use the "bulletproof" button pattern — a `<table>`-wrapped, padded, red (`#C0392B`) cell rather than a styled `<a>`/`<button>`. Border-radius on a table cell degrades gracefully (renders square) in Outlook instead of breaking. Text: white, bold, ~15px.

**Footer**
- Small muted text (`#9AA1AD` on dark / `#5A6270` on light): company name and address, plus an unsubscribe link for any marketing send. Match the address block used on the Letterhead PDF template below.

## PDF templates

Generate PDFs from HTML/CSS — a headless-browser print (e.g. Puppeteer/Playwright `page.pdf()`) or an HTML-to-PDF library (e.g. WeasyPrint) — using the same tokens as the site, translated to fixed print values. PDFs can't use `clamp()`/`vw`.

**Page setup**
- Size: US Letter (`8.5in × 11in`), portrait.
- Margins: `1.25in` top (room for the running header), `1in` right/left, `1in` bottom (room for the footer).
- Background: white (`#FFFFFF`) — the paper/off-white web background is a screen convention, not a print one.

**Links**
- Preserve every source URL as a real, clickable `<a href="...">` in the HTML that gets rendered — a headless-browser print or an HTML-to-PDF library carries these through as live link annotations automatically. The failure mode is upstream: don't flatten Markdown links to plain text, strip `href`s, or rasterize content to an image before rendering, all of which silently drop the link.
- Style links `#C0392B` (brand red) and **underlined** — on paper (or a static PDF viewer) there's no hover state to reveal an `<a>`, so unlike the web's no-underline default, the underline is the only affordance a reader gets. Keep the surrounding text's size/weight; don't bold a link just because it's a link.

**Print type scale** — the same weights, letter-spacing, and color tokens as the web [Typography](#typography) scale, just fixed pt instead of `clamp()`:
- Document title: Source Serif 4, 700, 28pt, `#14171C`, tight letter-spacing (`-0.01em`) — the print equivalent of the H1 (page header) token
- Section heading: Source Sans 3, 700, 14pt, `#14171C` — **never Source Serif 4**; headings within the body shouldn't compete with the one display title on the page
- Sub-heading: Source Sans 3, 600, 12pt, `#14171C`
- Body: Source Sans 3, 400, 10.5pt / 1.5 line-height, `#14171C`; secondary/caption text `#5A6270`
- Running header/footer text and stat/callout labels: Source Sans 3, 600, 9pt, uppercase, `letter-spacing:.12em`, `#5A6270` — the same eyebrow/kicker treatment as the web scale, just scaled down for print chrome
- Stat numeral (newsletter "by the numbers" callouts): Source Serif 4, 600, 22pt, `#C0392B` — the print equivalent of the web stat-numeral token

**Logo:** see [Logo & lockup](#logo--lockup) — embed as a base64 data URI in the rendered HTML. Running-header size: ~24px mark height plus wordmark, matching the site header lockup at reduced scale.

### 1. Letterhead

For general correspondence — the header and address are the whole template; the rest of the page is blank canvas for the letter body.

- **Header row** (inside the top margin): logo lockup, small, top-left. Company address, right-aligned, same row, top-right:
  ```
  M20 Technology LLC
  75 South Broadway
  4th Floor
  White Plains, NY 10601
  ```
  Source Sans 3, 400, 9.5pt, `#5A6270`, 1.4 line-height, right-aligned.
- A `1px` `#E4DCD3` rule under the header row, full width, `16px` below the address block.
- No footer is required — letterhead is meant to be typed onto, not templated below the header.

### 2. Document

For reports, proposals, and other multi-page deliverables.

- **Running header** (every page): logo lockup, small, top-left; document title, top-right, in the running-header eyebrow style (not the display title). `1px` `#E4DCD3` rule beneath.
- **Title block** (page 1 only, first element in the body): the document title set in the large Source Serif 4 display style described above. This is the only text on the page that uses the display serif.
- **Body content:** everything below the title — including every section and sub-section heading — uses Source Sans 3 only (see print type scale). Source Serif 4 is reserved for the single document title so it stays the visual anchor of the page.
- **Running footer** (every page): page number, bottom-right, `"Page {n} of {total}"`, in the running-header/footer eyebrow style.

### 3. Newsletter

For a recurring, visually-driven multi-page send (product updates, team news, client digests) — more art-directed than the Document template, but built from the same panel, icon, and color vocabulary as the rest of the site rather than inventing new ones.

- **Running header/footer:** same as Document — logo lockup top-left, issue title + date top-right in the running-header eyebrow style, page number bottom-right (`"Page {n} of {total}"`).
- **Title block** (page 1 only): newsletter name in the Source Serif 4 display style, with the issue date beneath it as a body-weight subtitle — same "one display-serif moment per document" rule as the Document template.

**Sections & callouts**
- Break the body into distinct sections rather than one long scroll of paragraphs — alternate **full-width horizontal bands** (a lead story, a closing CTA) with a **2-up or 3-up card grid** (`repeat(auto-fit, minmax(...))`, same pattern as the site's card grids) for shorter items, so the page has visual rhythm instead of a single monotonous column.
- Each section gets one icon badge as its entry point — reuse the Components icon badge exactly (44–56px square, `14px` radius, `#F9E9E4` tint, 24×24 stroke SVG in `#C0392B`, `stroke-width:1.9–2.2`) — not one icon per bullet. One icon per section/callout is a signpost; one per line item is noise and dilutes the site's "restrained set of line icons" identity.
- Callout panels reuse the existing card/panel vocabulary rather than new colors or styles:
  - **Tip / highlight:** white or `#F3EEE8` panel, `1px #E4DCD3` border, `18–22px` radius, `3px #E8A04C` top accent (same treatment as the dark-surface "gold top accent" card).
  - **Action needed / deadline:** same panel, `3px #C0392B` top accent instead — red is reserved for things that need action, consistent with the site-wide rule that red always means "act on this."
  - **Pull quote / testimonial:** `#14171C` dark panel, white text, Source Serif 4 400 pull-quote size, matching the web pull-quote token.
  - **By the numbers:** a row of stat tiles — Source Serif 4 600 22pt numeral (see print type scale) over a Source Sans 3 label, matching the case-study stat-tile pattern.
- **Emoji → icon translation:** never place literal emoji characters in the PDF — they render inconsistently (or not at all) across PDF viewers and fonts, and don't match the brand's hand-drawn-technical line style. Recreate the same idea as a custom inline SVG using the Icons spec (24×24 viewBox, stroke only, rounded caps/joins, brand red). A few common translations: 💡 idea → outlined lightbulb; ✅ done → checkmark-in-circle; 📈 growth → simple line/arrow chart; 🎉 celebration → a small burst/spark glyph; ⚠️ warning → outlined triangle with a line. When in doubt, design a new line icon in the same stroke style rather than reach for an emoji or a filled/colored icon set.
- **Restraint:** two to four sections per issue is plenty — resist turning every paragraph into its own panel. Keep to the palette's existing logic (red = action, gold = kicker/highlight accent, paper-alt = neutral section break) instead of color-coding sections with new hues; a newsletter that uses five accent colors reads as a different product than the rest of M20's materials.
