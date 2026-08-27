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
- Section vertical rhythm: `clamp(48px,6vw,72px)` to `clamp(56px,7vw,96px)` block padding, larger for hero/lead sections
- Card grid: `repeat(auto-fit, minmax(min(100%, 260–320px), 1fr))` with `gap: clamp(20px,3vw,36px)` — responsive without explicit breakpoints for most grids
- Mobile breakpoint used explicitly in nav logic: `760px`
- Border radius scale: `999px` (pills/buttons), `22px` (primary cards), `18px` (dark-surface cards, agent cards), `14px` (icon badges, small dark cards), `10px` (form inputs), `12px` (dropdown menus)

## Components

**Buttons**
- Primary: pill (`border-radius:999px`), `background:#C0392B`, white text, `min-height:38px`, `padding:8px 20px`, Inter 600 15px. Hover → `background:#96271C` + `box-shadow:0 8px 24px rgba(192,57,43,.28)`.
- Secondary (on dark hero): pill, transparent/translucent fill (`rgba(20,23,28,.4)`), 2px white border. Hover fills white-tinted.
- Outline (on light bg): pill, 2px solid `#14171C` border, dark text. Hover → fills `#14171C` with white text.

**Cards**
- Light service card: white bg, `1px solid #E4DCD3` border, `22px` radius, `36px 32px 30px` padding. Hover: border → red, `box-shadow:0 18px 40px rgba(20,23,28,.10)`, `translateY(-4px)`.
- Icon badge: `52–56px` square, `14px` radius, tint background `#F9E9E4` (light) — 26px stroke SVG icon in `#C0392B`, `stroke-width:1.9–2.2`, rounded caps/joins, no fill.
- Dark surface card (on `#14171C` sections): `#23282F` bg, `1px solid rgba(255,255,255,.08)` border, sometimes `3px solid #E8A04C` top accent. Hover: border → red, lift + shadow.

**Navigation (Header)**
- Sticky header, `rgba(250,247,244,.94)` with `backdrop-filter: blur(10px)`, bottom border `#E4DCD3`.
- Logo: 42px mark + stacked wordmark ("M20" bold 22px / "TECHNOLOGY" 11px letterspaced uppercase muted).
- Desktop nav: horizontal links, 2px red underline under the active page; two hover/click dropdown menus (Resources → Case Studies; About Us → Partners).
- Mobile (<760px): hamburger (3 bars) toggles a stacked full-width menu.

**Footer**
- Dark (`#14171C`) bar, `1px` top border `rgba(255,255,255,.08)`, logo + Atlassian Gold Partner badge + link nav (LinkedIn, email, Contact, Privacy) + copyright line, all in a single wrapping flex row.

**Forms (Contact page)**
- White card on dark hero section, `22px` radius, heavy shadow (`0 40px 90px rgba(0,0,0,.4)`).
- Inputs: `#FAF7F4` fill, `1.5px solid #E4DCD3` border (red on invalid), `10px` radius, `13px 15px` padding, 16px Inter.
- Labels: 13.5px Inter 600, required asterisk in red.
- Full-width red pill submit button; inline status message (green success / red error).

**Logo marquee** (home page "Trusted by" strip): auto-scrolling, pointer-draggable row of client logos, edge-masked with a fade gradient, pauses on `prefers-reduced-motion`.

**Data viz motif**: a segmented ring/donut chart ("Optimization Cycle") built from 4 arc segments in the red→gold family (`#C0392B`, `#96271C`, `#E8A04C`, `#F0C9A8`) with a paper-colored center hole and serif label — used as the one illustrative-chart pattern on the site.

## Imagery & iconography

- Icons: custom inline SVGs, 24×24 viewBox, `stroke` only (no fill except small accent dots), `stroke-width` ~1.9–2.2, rounded linecap/linejoin — consistent hand-drawn-technical feel, always in brand red on light backgrounds.
- Photography: one dark, masked hero image (`hero-network.jpg`, an abstract red/dark network mesh) used behind the homepage hero with a left-to-right dark gradient overlay for text legibility.
- Client logos: grayscale-free, contained in their own rounded chip on the paper-alt background, arranged in an infinite marquee.

## Motion

- Hover transitions: `border-color`, `box-shadow`, `transform` at `.18s ease`.
- Cards lift `translateY(-4px)` (service/dashboard cards) or `-6px` (case-study cards) on hover with a soft shadow.
- Buttons gain a colored glow shadow on hover (`0 8px 24px rgba(192,57,43,.28)`).
- Logo marquee scrolls continuously (~32px/s), pauses under `prefers-reduced-motion: reduce`, and is draggable via pointer events.

## Page inventory

- `index.html` — Home: hero, 3 service pillars, "Solutions" dark-red gradient band, Rovo AI teaser, client logo marquee, closing CTA.
- `services.dc.html` — Service pillars, "solutions shaped around your needs" icon list, Optimization Cycle chart, Atlassian product stack cards (Jira/Confluence/JSM), Gold Partner CTA band.
- `ai.dc.html` — Rovo AI: Find/Learn/Act cards, 6 Rovo Agent categories (dark panel), Teamwork Graph blurb, connector logos, CTA band.
- `case-studies.dc.html`, `case-study-intranet.dc.html`, `case-study-dashboard.dc.html` — case study index + detail pages.
- `partners.dc.html`, `privacy.dc.html`, `contact.dc.html` — partners, privacy policy, and contact form.
- `Header.dc.html` / `Footer.dc.html` — shared, imported components (`<dc-import>`).

## Voice

Short, confident, benefit-first headlines (Source Serif 4) paired with a calmer explanatory sentence (Source Sans 3). Section eyebrows always follow the pattern: short colored rule + uppercase letter-spaced label (e.g. "What we do", "How we work", "Get in touch").
