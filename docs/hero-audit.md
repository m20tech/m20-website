# Hero audit: home and dark-hero pages

Audit of the hero section on the seven in-scope pages before the hero refresh
(`design/hero-refresh`), measured on `preview` at `2257edd`. The re-measure
after the change is at the end.

**Pages:** `/`, `/ai`, `/atlassian-services`, `/ai-value-proposition`,
`/partners`, `/privacy`, `/contact`. All seven have a dark (ink `#14171C`)
hero, so none was skipped.

**Method**

- Rendered with headless Chromium (Playwright) at 390, 768, 1180 and 1440px
  wide from a local build (`npm run build`). The site's runtime loads React
  and Babel from unpkg; the local copy served the same versions from disk.
  Google Fonts were blocked, so text set in the fallback faces, which does
  not change colors or the image.
- Screenshots: `docs/hero-refresh/before/<page>-<width>.jpg`.
- **Contrast:** each hero text element's color against every background
  pixel inside its glyph boxes, with the text made transparent, so the
  worst case is the brightest pixel actually behind a letter. Targets:
  4.5:1 body, 3:1 large (24px+, or 18.66px+ bold).
- **LCP / CLS:** `PerformanceObserver` in the page, plus Lighthouse 12
  (performance only, default mobile and desktop presets) for `/`,
  `/atlassian-services` and `/ai`.

Scores: **Pass** meets the target, **Fix** works but should change,
**Fail** misses the target.

## Summary

| Page | Hero art | Share image | Contrast | LCP | CLS |
|---|---|---|---|---|---|
| `/` | Fix | Fail | Fail | Fail | Pass |
| `/ai` | Fix | Fail | Pass | Pass | Pass |
| `/atlassian-services` | Fix | Fail | Pass | Pass | Pass |
| `/ai-value-proposition` | Fix | Fail | Pass | Pass | Pass |
| `/partners` | Fix | Fail | Pass | Pass | Pass |
| `/privacy` | Fix | Fail | Pass | Pass | Pass |
| `/contact` | Fix | Fail | Pass | Pass | Pass |

## Every page

| Item | Score | Reason |
|---|---|---|
| Hero art (6 non-home pages) | Fix | Plain ink hero with no cover; `design.md` gives dark page heroes a cover (as on the case studies), so these read as unfinished next to them. |
| `og:image` | Fail | All seven pages share `https://m20tech.com/assets/hero-network.jpg` (2752×1536, 1.8 MB): not unique, not 1200×630, heavy for crawlers. |
| `twitter:image` | Fail | Not set on any page; the shared head partial only renders `og:image` (`twitter:card` is `summary_large_image`). |
| Layout shift | Pass | CLS 0.000 on every page and width. The runtime keeps `<x-dc>` hidden until it has rendered, so the hero appears in one step. |

## Per page

### `/` (home)

| Item | Score | Reason |
|---|---|---|
| Hero art | Fix | `assets/hero-network.jpg`, an abstract network photograph; right concept, but see the home-specific items below. |
| Contrast 390px | Fail | A glowing node sits behind the H1 (1.27:1 worst, need 3:1) and the intro (1.10:1, need 4.5:1). Below 760px the image goes full width under the copy. |
| Contrast 768px | Fix | Eyebrow 4.30:1 and intro 2.55:1 at their brightest pixel (5th percentile 7.7 and 12.3); fine on average, not worst case. |
| Contrast 1180 / 1440px | Pass | Lowest: the red CTA at 5.44:1; the copy is 7.6:1 or better. |
| LCP element | Fail | LCP is the hero `<img>`. Lighthouse mobile LCP **12.75 s** (score 71), desktop 2.24 s (88). |
| How it loads | Fail | One 2752×1536 JPG (1.8 MB) for every width; no `srcset`/`sizes`, no AVIF/WebP, no `width`/`height`, no `fetchpriority`, no preload. |
| Layout shift | Pass | CLS 0.000. |
| Focal point | Fix | Glow centroid at 55% across, 46% down: the mesh is centered, not on the right. |
| Safe zone behind copy | Fail | The left half is as busy as the right (mean luma 31 vs 33); bright nodes land behind the headline, intro and CTAs depending on width. |
| Colors outside the palette | Fix | Ground has a blue-navy cast (most pixels round to `#000018`, not ink `#14171C`); nodes are peach/salmon and hot orange-red (`#F5B38A`, `#FF5A3A`-range), none of them palette tokens; strands are a mix of grey and tan. |
| Artefacts, banding, softness | Fix | A bright red line runs along the top and left edges of the file (generation artefact), hidden today only because the mask fades the left. Very high JPEG quality (no blocking or banding), deliberately soft depth of field. |
| File size and dimensions | Fail | 1,799,834 bytes, 2752×1536, one size for every screen. |
| Gradient overlay | Fix | `100deg` ink gradient (.9 → .1) plus a left-fading mask over the right 62%. Works at 1180 and 1440; at 760px and below the image is forced to full width and the overlay alone can't hold contrast behind the copy. |
| Source | Fix | A hand-made JPG with no source file, so it can't be regenerated or retuned. |

### `/ai`, `/atlassian-services`, `/ai-value-proposition`

| Item | Score | Reason |
|---|---|---|
| Hero art | Fix | None (plain ink). |
| Contrast | Pass | Plain ink ground: eyebrow 8.18:1, intro `#D5D9E1` 12.7:1, H1 white 17.96:1; `/ai` red CTA 5.44:1. |
| LCP | Pass | Hero H1 (desktop) or intro (mobile). Lighthouse `/atlassian-services` mobile 3.74 s (85) / desktop 0.84 s (99); `/ai` mobile 3.72 s (85) / desktop 0.86 s (99). The floor is the runtime boot, not the hero. |
| Layout shift | Pass | CLS 0.000. |

### `/partners`, `/privacy`

| Item | Score | Reason |
|---|---|---|
| Hero art | Fix | None (plain ink). |
| Contrast | Pass | Eyebrow 8.18:1; privacy "Last updated" line `#9AA1AD` 6.91:1. |
| LCP | Pass | Body copy below the short hero (279px / 234px tall at 1440). |
| Layout shift | Pass | CLS 0.000. |
| Hero height | Fix | These heroes are shorter than a cover at the documented embed size (about 470px tall at 1440), so a cover would be cropped top and bottom. See Open questions in the PR. |

### `/contact`

| Item | Score | Reason |
|---|---|---|
| Hero art | Fix | None (plain ink). |
| Contrast | Pass | Eyebrow 8.18:1, intro `#C9CDD6` 11.28:1, email link `#F5C98F` 11.66:1. The form is a white card. |
| LCP | Pass | Intro paragraph. |
| Layout shift | Pass | CLS 0.000. |
| Layout | Fix | Two-column hero with the form in the right column, exactly where a cover goes; a cover can only show around the form. |

## After

Re-measured on `design/hero-refresh` with the same method, at 390, 768,
1180 and 1440px, plus 1024, 1320 and 1920px to cover the widths where the
hero text column reaches furthest over the cover. Screenshots:
`docs/hero-refresh/after/<page>-<width>.jpg`; the six covers side by side:
`docs/hero-refresh/covers-contact-sheet.jpg`.

| Page | Hero art | Share image | Contrast | LCP | CLS |
|---|---|---|---|---|---|
| `/` | Pass | Pass | Pass | Pass | Pass |
| `/ai` | Pass | Pass | Pass | Pass | Pass |
| `/atlassian-services` | Pass | Pass | Pass | Pass | Pass |
| `/ai-value-proposition` | Pass | Pass | Pass | Pass | Pass |
| `/partners` | Fix | Pass | Pass | Pass | Pass |
| `/privacy` | Fix | Pass | Pass | Pass | Pass |
| `/contact` | Fix | Pass | Pass | Pass | Pass |

`/partners` and `/privacy` stay **Fix** because their short heroes crop the
cover to its middle band (the art is composed to survive that crop), and
`/contact` because the form card covers most of its cover on desktop. Both
are open questions in the PR.

### Contrast

All 49 page/width combinations pass AA at the worst pixel behind each
letter. Lowest values:

| Element | Worst case | Target |
|---|---|---|
| Red CTA (`/`, `/ai`) | 5.44:1 | 4.5:1 |
| Privacy "Last updated" line | 6.91:1 | 4.5:1 |
| `/atlassian-services` intro over the cover's dark left strip (1180–1440px) | 7.97:1 | 4.5:1 |
| Eyebrows | 8.18:1 | 4.5:1 |
| Home intro at 390px (was 1.10:1) | 12.7:1 or better | 4.5:1 |

### Home hero

| Item | Score | Now |
|---|---|---|
| Source | Pass | `scripts/backgrounds/home-hero.html`, rendered by `home-hero.py` through `render.sh`; seeded, so every render is identical. |
| Colors | Pass | Ink ground, palette greys, maroon `#7A1E15`/`#96271C` glows and brand red `#C0392B` node cores only. No text. |
| Focal point and safe zone | Pass | Density and glow on the right (focus at 75% across); the left 50% is near-empty ink. |
| Mobile | Pass | Under 900px a 1:1 compact variant (glows in the corners, faint mesh) is art-directed via `<picture>` media sources, with a top-down overlay. |
| How it loads | Pass | AVIF/WebP/JPG at 960/1440/1920/2560 (compact: 480/960/1440) via `srcset`/`sizes`, `width`/`height`, `loading="eager"`, `fetchpriority="high"`, and matching `<link rel="preload" imagesrcset>` tags per media range. |
| Weight | Pass | 1920 WebP **12.9 KB** (budget 150 KB); mobile compact-960 WebP **6.1 KB**, AVIF 5.7 KB (budget 80 KB). Was one 1.8 MB JPG. |
| Overlay | Pass | `90deg` ink gradient .7 → .42 → 0 by 56%; under 900px `180deg` .5 → .2 → 0. |

### Lighthouse (performance)

Local build, Lighthouse 12, default presets; fonts and the form service
blocked in both runs.

| Page | Mobile before | Mobile after | Desktop before | Desktop after |
|---|---|---|---|---|
| `/` | 71 · LCP 12.75 s | 84 · LCP 4.02 s | 88 · LCP 2.24 s | 99 · LCP 0.88 s |
| `/atlassian-services` | 85 · LCP 3.74 s | 85 · LCP 3.72 s | 99 · LCP 0.84 s | 99 · LCP 0.84 s |
| `/ai` | 85 · LCP 3.72 s | 85 · LCP 3.79 s | 99 · LCP 0.86 s | 99 · LCP 0.84 s |

CLS is 0.000 in every run. The mobile floor on the inner pages is the
runtime boot (React and Babel from unpkg), not the hero; repeat runs vary
by about ±0.1 s. The covers are not lazy-loaded (they're above the fold
on desktop), so phones still fetch the hidden SVG; it's 7–11 KB.

### Share images

| Page | `og:image` and `twitter:image` |
|---|---|
| `/` | `https://m20tech.com/assets/artwork/covers/network-mesh.png` |
| `/ai` | `…/covers/rovo-find-learn-act.png` |
| `/atlassian-services` | `…/covers/atlassian-work-layers.png` |
| `/ai-value-proposition` | `…/covers/ai-operations-pipeline.png` |
| `/partners` | `…/covers/connected-ecosystem.png` |
| `/privacy` | `…/covers/data-protection.png` |
| `/contact` | `…/covers/meeting-request.png` |

All seven are unique, absolute, 1200×630 PNGs (166–480 KB), and the head
partial now renders `twitter:image` next to `og:image`. They point at the
production domain, so they resolve once this ships to `main`.
