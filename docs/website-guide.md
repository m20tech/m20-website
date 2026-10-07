# M20 Website Guide

How the M20 marketing site is built, how to edit its content, and how changes move from preview to production.

> This page is generated from `docs/website-guide.md` in the [m20tech/m20-website](https://github.com/m20tech/m20-website) repo and republished with every production release. Edit that file, not this page. Edits made here are overwritten on the next release.

## Quick links

| What | Where |
| --- | --- |
| Production site | https://m20-website.mike-124.workers.dev |
| Preview site | https://preview-m20-website.mike-124.workers.dev |
| Content editor (PagesCMS) | https://app.pagescms.org → m20tech/m20-website |
| Source code | https://github.com/m20tech/m20-website |
| Hosting dashboard | Cloudflare → Workers & Pages → m20-website |
| Work tracking | Jira project WEB (under WEB-30 Site redesign) |

## Architecture

The site is a small static website. There is no server-side application and no database: every page is plain HTML, CSS, and JavaScript served from Cloudflare's edge.

### Building blocks

| Piece | Where it lives | What it does |
| --- | --- | --- |
| Page templates | `index.html`, `<page>/index.html` | Layout and styling for each page. Text and images are pulled in from content files through `[[ … ]]` tags. |
| Shared components | `Header.dc.html`, `Footer.dc.html` | Site header and footer, loaded into every page in the browser by the design-canvas runtime (`support.js`). |
| Content | `content/pages/*.json`, `content/components/*.json` | All copy, links, images, and SEO settings — the files PagesCMS edits. |
| CMS schema | `cms/schema.mjs` (generates `.pages.yml`) | Defines exactly which fields editors see for each page. |
| Icon library | `cms/icons/*.svg` | Icons editors can pick for cards. |
| Images | `assets/` | Site images; also where images uploaded through the CMS are stored. |
| Artwork library | `assets/artwork/covers/`, `illustrations/`, `spots/` | Shared cover, illustration, and spot artwork any page can reuse. Each has an SVG (used on pages) and a PNG export (social sharing, email, slides). Defined in `cms/artwork.mjs`. |
| Build script | `scripts/build.mjs` | Renders templates + content into the finished site (`dist/`), runs consistency checks, and writes `sitemap.xml` and `robots.txt`. |
| Hosting config | `wrangler.jsonc` | Tells Cloudflare how to build and serve the site. |

### How a page gets built

1. Cloudflare Workers Builds sees a new commit on GitHub.
2. It runs `node scripts/build.mjs`, which:
   - checks that every template, content file, and CMS field agree with each other (the build stops if they don't),
   - fills each page template with its content,
   - adds SEO tags to every page's `<head>` (title, description, canonical link, social-share tags),
   - writes `sitemap.xml` and `robots.txt`.
3. The finished `dist/` folder is uploaded to Cloudflare and served worldwide.

### Environments

| Environment | Branch | Address | Search engines |
| --- | --- | --- | --- |
| Production | `main` | https://m20-website.mike-124.workers.dev | Indexed |
| Preview | `preview` | https://preview-m20-website.mike-124.workers.dev | Blocked (noindex) |
| Any other branch | `<branch>` | `https://<branch>-m20-website.mike-124.workers.dev` | Blocked (noindex) |

The `m20tech.com` domain still points at the old Squarespace site. When it moves to Cloudflare, update **Site URL** in the CMS (SEO & site settings) so canonical links and the sitemap use the new address.

## Content management (PagesCMS)

Content is edited in [PagesCMS](https://app.pagescms.org), a free, open-source editor that works directly on the GitHub repository. Every save is a Git commit, so there's a full history of who changed what, and any change can be rolled back.

### Getting access

1. Sign in at https://app.pagescms.org with your GitHub account.
2. You need write access to the `m20tech/m20-website` repository (ask a GitHub org admin).
3. Open **m20tech/m20-website**.

### Always edit on the preview branch

Before making changes, use the branch selector at the top of PagesCMS to switch to **preview**. Edits on `preview` show up on the preview site within a couple of minutes and don't affect the live site until they're published (see **Development process** below). Never edit on `main`.

### What you can edit

The sidebar has two groups:

- **Pages** — one entry per page: Home, AI (Rovo), Services, Partners, Case Studies (index), Privacy Policy, Case Study: Intranet, Case Study: Dashboard, AI Value Proposition, Contact.
- **Site-wide** — SEO & site settings, Site header (logo and navigation labels), Site footer (logo, partner badge, footer links, copyright line).

Each page is split into its sections in page order (Hero, What we do, Client logos, …), and every section's text, buttons, and images are fields you can edit.

| You want to… | How |
| --- | --- |
| Change text | Edit the field and save. |
| Change a button | Each button has **Button text** and **Link**. Links are site paths like `/contact` or full `https://…` addresses. |
| Add, remove, or reorder cards, logos, partners, or list items | Use the list controls on the field (add, delete, drag to reorder). |
| Swap an image | Click the image field and upload a new file or pick an existing one. Always update the matching **alt text** field too — it's what screen readers and search engines see. |
| Use artwork (cover, illustration, spot) | Artwork fields open only their own library folder: **Artwork: covers**, **Artwork: illustrations**, or **Artwork: spots**. Pick the `.svg`. Illustrations need alt text; covers and spots are decorative and have none. On the case studies, the spot sits on the index card, the cover is the hero background, and the illustration is beside **The Solution**. The same artwork can be used on any page. New artwork follows the **Illustrations** rules in `design.md` — ask a developer or Claude Code to make it. |
| Change a card icon | Pick from the **Icon** dropdown. New icons need a developer (see below). |
| Bold text or links inside a paragraph | Fields that support it say so. Use `**bold**`, `*italic*`, and `[link text](https://…)`. |
| Edit the privacy policy | It's a list of blocks (Heading, Subheading, Paragraph, Bullet list) — add, remove, and reorder blocks freely. |

### SEO fields

Every page has an **SEO** section:

- **Page title** — shown in search results and browser tabs. Aim for 50–60 characters (70 max).
- **Meta description** — the snippet under the title in search results. Aim for 120–160 characters (170 max).
- **Social share image** — optional. The image shown when the page is shared on LinkedIn, Slack, etc. Defaults to the site-wide share image. The picker opens **Artwork: covers**: choose a cover's `.png` (1200×630). Social sites can't show SVG, so the build rejects it here.
- **Hide from search engines** — adds `noindex` and removes the page from the sitemap.

**SEO & site settings** (under Site-wide) holds the site name, production **Site URL**, the default share image, favicon, logo for search engines, and social profile links.

### What needs a developer

Editors can change anything that's a field. Changing layout, design, or structure — a new section, a new type of card, a new page, a new icon — needs a developer, because the page template and CMS schema change together. Ask in Jira (project WEB).

## Development process

### Workflow at a glance

1. Changes (from developers, AI agents, or PagesCMS editors) are committed to the `preview` branch.
2. Cloudflare automatically builds and deploys the preview site.
3. Someone reviews https://preview-m20-website.mike-124.workers.dev.
4. When it's approved, a pull request from `preview` to `main` is opened.
5. When the approver says to publish, Claude Code merges the pull request, and Cloudflare automatically deploys production.
6. Claude Code confirms the production build, republishes this Confluence page, and resets `preview` for the next round.

### Manual steps (people)

| Step | Who | How |
| --- | --- | --- |
| Track the work | Requester | Create or reuse a ticket in Jira project WEB. Commit messages start with the key, e.g. `WEB-38 …`. |
| Make content changes | Editor | PagesCMS on the `preview` branch. |
| Make code or design changes | Developer / AI agent | Work on the `preview` branch, preview locally with `npm run dev`, commit, and push. |
| Review the preview | Requester / approver | Check https://preview-m20-website.mike-124.workers.dev on desktop and mobile. |
| Request publishing | Approver | Ask Claude Code for a production PR. |
| Approve and publish | Approver | Review the PR on GitHub, then tell Claude Code to publish. Claude Code runs the release: it merges the PR, confirms the production build, republishes this page, and resets `preview`. Merge through Claude Code rather than GitHub's **Merge pull request** button so those release steps run together. |
| Close the ticket | Requester | Move the Jira ticket to Done once the change is live. |

### Automated steps (systems)

| Trigger | What happens | Where to check |
| --- | --- | --- |
| Push to any branch other than `main` | Cloudflare Workers Builds runs the build and uploads a preview version at `https://<branch>-m20-website.mike-124.workers.dev`. | The "Workers Builds: m20-website" check on the GitHub commit or PR |
| Push or merge to `main` | Cloudflare Workers Builds runs the build and deploys production. | Same check, and the Cloudflare dashboard |
| Every build | Consistency checks: every template tag has a CMS field, every CMS field is used, content matches the schema, image files exist, artwork fields point into the right library folder, every artwork SVG has the right size and a PNG export, and `.pages.yml` is current. A failing check stops the deploy, so the live site is never broken by bad content. | Build logs in Cloudflare |
| Production release (run by Claude Code) | Republishes this page from `docs/website-guide.md` through the Atlassian connector. The footer names the commit it was published from. | This page's footer and page history |

### If a build fails

A failed build never replaces the live site — production keeps serving the last good version. Open the failed check's log in Cloudflare; the build prints a list of what's wrong (for example "image /assets/x.png not found in repo" or "field … is required"). Fix it on `preview` (in PagesCMS or code) and the next push rebuilds automatically.

### For developers

- Requirements: Node 20+. No packages to install.
- `npm run dev` — build and serve at http://localhost:8000, rebuilding on every change.
- `npm run check` — run the consistency checks only.
- `npm run cms:sync` — regenerate `.pages.yml` after changing `cms/schema.mjs`.
- `npm run artwork:png` — export PNGs for new or changed artwork SVGs (needs Google Chrome or Chromium; set `CHROME_PATH` if it isn't found).
- Structural changes (a new section, list, field, or page) must update the template, the content JSON, and `cms/schema.mjs` in the same commit, then run `npm run cms:sync`. The full conventions, including design rules and the template tag reference, are in `AGENTS.md` and `design.md` in the repo.
- Update this guide (`docs/website-guide.md`) in the same change whenever the architecture, CMS, or process changes.
