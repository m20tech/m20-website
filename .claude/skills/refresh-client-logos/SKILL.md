---
name: refresh-client-logos
description: Refresh the website's client logos from Brandfetch, using the Jira Assets Clients list as the source of clients and its Website field as the domain. Use when asked to refresh, update, or re-pull client logos, or when a client is added to or removed from the Trusted-by strip.
---

# Refresh client logos

Pulls each client's logo from Brandfetch (both versions: for light and for dark backgrounds), saves them in `assets/clients/`, and rewrites the homepage "Trusted by" list. Claude does the Jira and Brandfetch lookups (MCP); `scripts/client-logos.py` does the downloading and file work.

## 1. Get the clients from Jira Assets

Atlassian MCP, site `m20tech.atlassian.net` (cloudId `5e746b06-8b36-4248-91d5-d175a3417a2b`). The source is object type **Clients** (id 30, schema 2, https://m20tech.atlassian.net/jira/assets/object-schema/2?typeId=30&view=list):

`executeRead` → `queryAssetsObjectsUsingAql` with `aql: "objectType = Clients"`, `limit: "200"`. The result is large and is saved to a file, so read it with `python3 -I` (`json.load`). Attributes come back by id, not name:

| id | Field | Use |
|---|---|---|
| 211 | Name | Legal name |
| 278 | Nickname | Alt text on the site, when it reads well |
| 277 | **Website** | The domain to look up (strip protocol, `www.`, path) |
| 274 | Status | Active / Inactive / Pending |
| 290 | **Can Advertise** | "Does the client allow us to use their name/logo in our marketing?" |

**Who is shown:** Can Advertise = `true` only. Never show a client whose flag is false or blank without the user saying so. Clients already on the site but not flagged (check `cms/clients.json` notes) are kept until the user decides; list them in your report. Don't add inactive clients that aren't already shown without asking.

A flagged client with no Website can't be looked up: keep its existing file (`keepImage` in the plan) and report it so someone can fill in the Website field in Jira.

## 2. Look up each domain in Brandfetch

For each domain call `get_brand_data` with `identifier: "<domain>"` (the Brandfetch MCP; `get_brands` needs a paid plan, so one call per brand, in parallel). From each result keep `id` (brandId) and `logos` (theme, type, formats with `src`, `format`, `width`, `height`).

How Brandfetch names things: **theme `dark` = the logo for light backgrounds** (dark artwork), **theme `light` = the logo for dark backgrounds** (light artwork). Most brands only have the `dark` theme. Only use `src` URLs that appear in the result: Brandfetch answers a made-up variant with a generic placeholder image, not an error.

If a brand has only an `icon` (no `logo`), don't use the icon: keep the existing file and report it.

## 3. Write the plan and run the script

Write a plan JSON in the scratchpad (format at the top of `scripts/client-logos.py`): one entry per client to show, in display order, with `slug` (lowercase, no spaces; reuse the existing file's name, e.g. `cowan`, `towerhill`), `name`, `alt`, `domain`, `brandId`, the `logos` array from step 2, and optionally `keepImage` (existing path to keep instead of a download), `maxWidth` (very wide wordmarks, px) and `note`. Then:

```bash
python3 scripts/client-logos.py <plan.json> --dry-run   # check what it will pick
python3 scripts/client-logos.py <plan.json>
```

It writes `assets/clients/<slug>.<svg|png>` (light backgrounds) and `<slug>-reverse.<svg|png>` (dark backgrounds: Brandfetch's light theme when there is one, otherwise a white silhouette derived from the logo, marked `derived`; opaque tiles get none), `cms/clients.json` (the manifest), and `clients.logos` in `content/pages/home.json`. It prefers SVG, then PNG. Old `.webp` files are left in place so existing links keep working.

## 4. Check and ship

1. Add or update the entries for new files in the `clients` collection in `cms/library.mjs` (title, 3–8 tags, note; mark reverse files `dark background` and say if derived). `npm run library:check` lists anything untagged.
2. Look at the result: `npm run dev`, then the homepage strip (and the reverse files on a dark background, e.g. at `/library/`). Derived silhouettes of busy logos can look poor; say so rather than shipping a bad one.
3. `npm run check`, then commit on `preview` with the ticket key, push, and give the user the preview URL (see AGENTS.md).

## Report back

Always tell the user: who was added/removed/kept, which logos are low resolution (Brandfetch sometimes only has ~100px), which reverse versions are derived, clients shown without Can Advertise = true, and flagged clients missing a Website in Jira.
