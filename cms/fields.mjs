// Field helpers for cms/schema.mjs. Each returns a PagesCMS field definition
// (https://pagescms.org/docs/configuration/fields/). Keys starting with `$`
// are build-only and stripped from the generated .pages.yml.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICON_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "icons");
export const iconNames = fs
  .readdirSync(ICON_DIR)
  .filter((f) => f.endsWith(".svg"))
  .map((f) => f.slice(0, -4))
  .sort();

const opt = (o) => o || {};

export const string = (name, label, o) => ({ name, label, type: "string", required: true, ...opt(o) });

export const text = (name, label, o) => ({ name, label, type: "text", required: true, ...opt(o) });

// Plain text with inline markdown, rendered by the template's [[md]] tag.
export const markdown = (name, label, o) => ({
  name,
  label,
  type: "text",
  description: "Supports **bold**, *italic*, and [link text](https://…).",
  required: true,
  ...opt(o),
});

export const image = (name, label, o) => ({ name, label, type: "image", required: true, ...opt(o) });

export const icon = (name = "icon", label = "Icon") => ({
  name,
  label,
  type: "select",
  description: "Icons live in cms/icons/ — ask a developer to add a new one.",
  required: true,
  options: { values: iconNames },
});

export const object = (name, label, fields, o) => ({ name, label, type: "object", fields, ...opt(o) });

export const list = (name, label, fields, o) => ({ name, label, type: "object", list: true, fields, ...opt(o) });

export const strings = (name, label, o) => ({ name, label, type: "string", list: true, ...opt(o) });

export const blocks = (name, label, blockDefs, o) => ({ name, label, type: "block", list: true, blocks: blockDefs, ...opt(o) });

export const block = (name, label, fields) => ({ name, label, fields });

export const link = (name, label, o) =>
  object(name, label, [
    string("label", "Button text"),
    string("href", "Link", { description: "A site path like /contact, or a full https:// URL." }),
  ], o);

// The small uppercase label above most section headings.
export const eyebrow = (name = "eyebrow") => string(name, "Eyebrow", { description: "Small uppercase label above the heading." });

export const boolean = (name, label, o) => ({ name, label, type: "boolean", ...opt(o) });

export const number = (name, label, o) => ({ name, label, type: "number", ...opt(o) });

// Per-page search & social metadata, rendered into <head> by cms/partials/head.html.
export const seo = () =>
  object("seo", "SEO", [
    string("title", "Page title", {
      description: "Shown in search results and browser tabs. Aim for 50–60 characters.",
      options: { maxlength: 70 },
    }),
    text("description", "Meta description", {
      description: "Search result snippet. Aim for 120–160 characters.",
      options: { maxlength: 170 },
    }),
    image("image", "Social share image", {
      required: false,
      description: "Optional — defaults to the site-wide share image. Best at 1200×630.",
    }),
    boolean("noindex", "Hide from search engines", { description: "Adds noindex and leaves the page out of sitemap.xml." }),
  ]);
