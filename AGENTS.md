# AGENTS.md

Coding conventions for agents working in this repo. See [README.md](README.md) for a repo overview and AI tooling setup (TWG CLI, Rovo MCP).

## Project settings

- **Ticket project:** `WEB` (Jira, m20tech.atlassian.net). Website work usually sits under the `WEB-30` "Site redesign" project. Commit messages start with the ticket key (`WEB-123 <summary>`).
- **Working branch:** `preview` — see **Preview & release workflow** below.

## Design system

**[design.md](design.md) is the golden source for this site's design system** — colors, typography, spacing, component patterns, imagery, and motion. Read it before styling or restyling anything. If a change introduces a new pattern, token, or component, update `design.md` to match.

`design.md` also covers non-web deliverables: **Logo & lockup** (how to embed the M20 logo in a header for web, email, or PDF output) and dedicated **Email templates** / **PDF templates** sections. Read those before generating an email message or a PDF.

`design.md` is published to Confluence as the [M20 Design System](https://m20tech.atlassian.net/wiki/x/T4DrNAE) pages, one page per group of `##` sections as mapped in `docs/design-system.json`. Adding, renaming, or removing a `##` section means updating that mapping in the same change (the build fails otherwise); a new page gets `"id": null` and is created at the next release. Never edit those Confluence pages directly — they're regenerated on every release (see **Publishing the design system** below).

### Asset library

Every reusable icon, illustration, logo, and background is catalogued in `cms/library.mjs` and published as an unlisted, noindexed gallery at `/library/` (plus `/library/library.json`), and as the **Icon & Graphics Library** Confluence page. See **Asset library** in `design.md`.

- **Any new asset gets a catalog entry in the same change:** a title, 3–8 search tags, and a note for usage caveats, under its collection's `items`. Run `npm run library:check` to find assets with no tags (for example, files an editor uploaded through PagesCMS) and fill them in before a release.
- An entry for a file that doesn't exist fails the build; a file with no entry doesn't (so CMS uploads never block a deploy) but is listed by `library:check`.
- Don't rename or delete an asset other projects might hotlink (`https://m20tech.com/assets/…`, `/library/icons/…`); add a new file instead.
- Never link `/library/` from a public page or add it to the sitemap. The build adds the noindex header.

## Site structure

- Pages live in `.dc.html`/`.html` files (a "design canvas" format), each in its own folder as `index.html` for a clean URL: `index.html` at the repo root is the homepage, other pages are e.g. `atlassian-services/index.html`, `contact/index.html`. Shared components (`Header.dc.html`, `Footer.dc.html`) stay flat at the repo root — see **URL structure** in `design.md` before adding, renaming, or moving a page.
- Every page wraps content in `<x-dc>...</x-dc>`, includes `support.js` and `image-slot.js`, and pulls in shared components via `<dc-import name="Header" ...>` / `<dc-import name="Footer" ...>` rather than duplicating markup.
- `<dc-import>` resolves by fetching `<Name>.dc.html` at runtime. Every internal `href`/`src`, and the `dc-import` fetch itself, uses a **root-relative absolute path** (`href="/contact"`, `src="/assets/logo.png"`) rather than a relative one — needed because shared components render at whatever depth the importing page sits at. This assumes the host serves the site from domain root; see **URL structure** in `design.md` before hosting it under a subpath.
- Styling is inline (`style="..."`) using the tokens and values documented in `design.md` — there is no external stylesheet to add classes to.
- Hover states use the custom `style-hover="..."` attribute (inline styles applied on hover), not CSS `:hover` classes.

## Build & local preview

- The page HTML files are **templates**: their text and images come from `content/**/*.json` through `[[ … ]]` tags, rendered by `scripts/build.mjs` into `dist/` (git-ignored). There are no npm dependencies — Node 20+ is all it needs.
- Preview locally with `npm run dev` (builds, serves `dist/` at http://localhost:8000, and rebuilds on change). Opening the source HTML directly shows raw `[[ … ]]` tags.
- `npm run check` runs the CMS consistency checks without writing `dist/`. Cloudflare runs the same build on every deploy, so a failing check blocks the deploy.
- Template tags (full reference at the top of `scripts/template.mjs`): `[[ path ]]` (escaped text), `[[md path a="…" strong="…"]]` (inline markdown with the template supplying inline styles), `[[icon path …svg attrs]]` (inline SVG from `cms/icons/`), `[[json path]]` (inside `<script>`), `[[#each list]]…[[/each]]`, `[[#if path]]…[[else]]…[[/if]]`, `[[#block name]]…[[/block]]`. The runtime's own `{{ … }}` bindings are unrelated and pass through untouched.

## Content & CMS (PagesCMS)

Editors change content through [PagesCMS](https://app.pagescms.org), which edits the JSON in `content/` and commits it to GitHub. **Every piece of visible copy and every image on the site must be CMS-editable** — don't hardcode new text or `<img src>` in a template.

- `cms/schema.mjs` is the source of truth for what's editable: one entry per template, naming its content file and fields (helpers in `cms/fields.mjs`). `.pages.yml` is **generated** from it — never edit it by hand.
- **Any structural change must be reflected in the CMS in the same commit.** When you add, remove, rename, or restructure a section, card, list, or page: update the template, the content JSON, and `cms/schema.mjs` together, then run `npm run cms:sync` and `npm run check`. The build fails if a template tag has no schema field, a schema field is unused by its template, content doesn't match the schema, an image path doesn't exist, or `.pages.yml` is stale.
- New page: create `<slug>/index.html` as a template, add `content/pages/<slug>.json`, and add an entry to the `pages` list in `cms/schema.mjs`.
- Repeating items (cards, logos, list items) are `list(...)` fields rendered with `[[#each]]`, so editors can add, remove, and reorder them. Keep one template body per list — no per-item markup.
- Images: use `image(...)` fields. Values are root-relative paths under `/assets` (the CMS media folder); uploads from the CMS land in `assets/`. Keep alt text as its own field next to each image.
- Artwork (covers, illustrations, spots): use `artwork("covers" | "illustrations" | "spots", …)` fields, which scope the CMS picker to the shared library in `assets/artwork/<type>/`. Make new artwork by the **Illustrations** rules in `design.md` (tables, meters, event lists, and RAG charts only; no line graphs; no words), then run `npm run artwork:png` and commit the SVG and PNG together.
- Icons: card icons are `icon()` select fields backed by `cms/icons/<name>.svg` (a bare `<svg viewBox="…">` whose inner markup is inlined; the template supplies size, stroke, and color). To offer a new icon, add the SVG file there, give it a catalog entry in `cms/library.mjs` (see **Asset library**), and run `npm run cms:sync`.
- Text with bold/links: use `markdown(...)` fields with `[[md …]]`, passing the inline styles for `a`/`strong` from the template.

### SEO

- Every page entry in `cms/schema.mjs` has an `seo()` field (title, meta description, optional share image, noindex), and every page template has `[[> head]]` right after the viewport `<meta>`. That partial (`cms/partials/head.html`) renders the title, description, canonical URL, Open Graph/Twitter tags, favicon, and (homepage only) Organization JSON-LD. The build enforces both.
- Site-wide SEO settings (site name, production **Site URL**, default share image, favicon, logo, social profiles) live in `content/components/site.json` and are available to every template as `site.*`. Build-computed values are available as `build.*` (`url`, `path`, `preview`, `isHome`).
- The build writes `sitemap.xml` (pages without noindex) and `robots.txt`. Builds for any branch other than `main` (and local builds) are previews: every page gets `noindex`, `robots.txt` disallows everything, and a `_headers` file adds `X-Robots-Tag: noindex`.
- Keep titles ≤ 70 characters (aim 50–60) and descriptions ≤ 170 (aim 120–160); the build enforces the maximums. Give every page a unique title and description.

## Preview & release workflow

Hosting is Cloudflare Workers (static assets) with Workers Builds connected to this GitHub repo; `wrangler.jsonc` holds the config. `main` deploys to production; **every other branch gets a preview URL** at `https://<branch>-m20-website.mike-124.workers.dev`.

1. **All changes go to the `preview` branch** unless the user names a different branch. Commit there and **push after every change** — don't leave work unpushed and don't commit to `main` directly.
2. After pushing, wait for the "Workers Builds: m20-website" check on the commit (`gh api repos/m20tech/m20-website/commits/<sha>/check-runs`) and **give the user the preview URL**: `https://preview-m20-website.mike-124.workers.dev` (or `https://<branch>-m20-website.mike-124.workers.dev` for another branch). If the build failed, report it with the reason.
3. **Only when the user asks**, open a PR from `preview` into `main` for production (`gh pr create --base main --head preview`), summarizing everything on `preview` that isn't on `main`, and give the user the PR link.
4. **Merge only when the user tells you to publish.** Production merges go through Claude Code so the release steps below always run together:
   1. Merge with a merge commit, keeping the branch: `gh pr merge <n> --merge`.
   2. Wait for the "Workers Builds: m20-website" check on the merge commit to succeed, and give the user the production URL, https://m20-website.mike-124.workers.dev.
   3. **Publish the user guide to Confluence.** Use the Atlassian (Rovo) MCP tool `updateConfluencePage` with cloudId `m20tech.atlassian.net`, pageId `6233292802` ([Website](https://m20tech.atlassian.net/wiki/x/AoCIcwE)), `contentFormat: "markdown"`, and a version message naming the merge commit. The body is `docs/website-guide.md` as it is on `main`, without its `# M20 Website Guide` heading (the page title is "Website"), followed by `---` and an italic footer: *Published from `main` at commit [<short sha>](https://github.com/m20tech/m20-website/commit/<sha>) on <date>. Source: [docs/website-guide.md](https://github.com/m20tech/m20-website/blob/main/docs/website-guide.md).* Publish every release, even if the guide didn't change, so the footer matches production. If the Atlassian tools aren't available, say so. Don't skip this step silently.
   4. **Publish the design system to Confluence** — see **Publishing the design system** below. Run it every release; it only republishes the pages whose source changed, plus the hub.
   5. Fast-forward `preview`: `git checkout preview && git fetch && git merge --ff-only origin/main && git push`.
   6. Move the Jira ticket to Done and add the commit hashes.
   If someone merged on GitHub directly, run steps 2–6 as soon as you notice (for example, `main` has commits that the Confluence footers don't mention).
5. **Keep the user guide current:** `docs/website-guide.md` is the user-facing documentation (architecture, CMS, process). Update it in the same change whenever any of those change. Never edit the Confluence page directly — it's overwritten on every release.
6. CMS editors follow the same flow: in PagesCMS, switch the branch selector to `preview`, make edits (each save is a commit that rebuilds the preview), then ask for a production PR.

### Publishing the design system

The [M20 Design System](https://m20tech.atlassian.net/wiki/x/T4DrNAE) pages in Confluence (space `Team`) are generated from `design.md` and `cms/library.mjs` and are **managed by agents**: every page carries a "Managed by agents" banner and a footer naming the commit it was published from. `scripts/design-docs.mjs` renders the page bodies; you publish them with the Atlassian (Rovo) MCP tools. This keeps an Atlassian API token out of GitHub, same as the user guide.

1. On `main` at the merge commit (`git checkout main && git pull`), find the commit the pages were last published from: read the hub page (`getConfluencePage`, cloudId `m20tech.atlassian.net`, pageId `5182816335`, `contentFormat: "markdown"`) and take the sha from its footer.
2. Run `npm run docs:design -- --since <that sha>` (omit `--since` to republish everything, e.g. if the footer is missing). It writes one Confluence-HTML body per page to `.confluence/design-system/` and lists the pages to publish; `plan.json` there has each page's `action`, `id`, `title`, `file`, and `changed` flag.
3. For every page with `changed: true`, in plan order, hub last:
   - `update`: `updateConfluencePage` with cloudId `m20tech.atlassian.net`, the page's `id`, its `title`, `contentFormat: "html"`, the file's contents as `body`, and `versionMessage: "Sync from design.md at <short sha>"`.
   - `create`: `createConfluencePage` with cloudId `m20tech.atlassian.net`, `spaceId: "Team"`, `parentId: "5182816335"`, the `title`, `contentFormat: "html"`, and the file's contents. Write the new page ID into that page's `id` in `docs/design-system.json`, re-run step 2 (so the hub links to it), and commit the ID on `preview` (`WEB-<n> Record Confluence page ID for <title>`) after the release's fast-forward.
4. If an update is rejected (for example, invalid HTML), stop and report it; don't fall back to pasting Markdown or editing the page by hand. If the Atlassian tools aren't available, say so. Don't skip this step silently.
5. Before the release PR, run `npm run library:check` on `preview` and tag any untagged assets, so the gallery and the library page stay searchable.

`docs/design-system.json` also lists the **team-maintained** pages under the hub (written by people; agents don't touch them) and the **archive** page holding the legacy (pre-2026) style guide. Leave both alone unless the user asks.

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
