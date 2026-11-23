// CMS schema — the single source of truth for what's editable in PagesCMS.
//
// Each entry ties a template (an HTML file in the repo) to its content JSON
// and the fields editors see. `npm run cms:sync` turns this into .pages.yml;
// the build fails if templates, content, and this schema disagree.
//
// Adding, removing, or restructuring a section? Update the template, the
// content JSON, and the entry here together, then run `npm run cms:sync`.

import {
  string, text, markdown, image, object, list, strings,
  blocks, block, link, eyebrow, boolean, number, seo, artwork, icon,
} from "./fields.mjs";
import { artworkMedia } from "./artwork.mjs";

// The first folder is the default for image fields; the artwork folders are
// used by artwork() fields so each picker only shows that type.
export const media = [
  { name: "images", label: "Site images", input: "assets", output: "/assets" },
  ...artworkMedia,
];

// Site-wide settings: available to every template as site.* (used by the
// <head> partial for SEO defaults, favicon, and structured data).
export const settings = {
  name: "site",
  label: "SEO & site settings",
  template: null,
  path: "content/components/site.json",
  fields: [
    string("siteName", "Site name"),
    string("siteUrl", "Site URL", {
      description: "Production address, no trailing slash. Used for canonical links, the sitemap, and share images.",
      pattern: { regex: "^https://[^/]+$", message: "Use https://domain with no trailing slash." },
    }),
    image("defaultImage", "Default social share image", { description: "Used when a page has no share image. Best at 1200×630." }),
    image("favicon", "Favicon"),
    image("logo", "Logo for search engines"),
    strings("sameAs", "Social profiles", { description: "Full URLs of official profiles (LinkedIn etc.)." }),
  ],
};

const components = [
  {
    name: "header",
    label: "Site header",
    template: "Header.dc.html",
    path: "content/components/header.json",
    fields: [
      image("logo", "Logo"),
      string("logoAlt", "Logo alt text"),
      object("nav", "Navigation labels", [
        string("home", "Home"),
        string("ai", "AI"),
        string("services", "Services"),
        string("resources", "Resources menu"),
        string("caseStudies", "Case Studies"),
        string("valueProp", "AI Value Proposition"),
        string("partners", "Partners"),
      ]),
      string("cta", "Contact button"),
    ],
  },
  {
    name: "footer",
    label: "Site footer",
    template: "Footer.dc.html",
    path: "content/components/footer.json",
    fields: [
      image("logo", "Logo"),
      string("logoAlt", "Logo alt text"),
      object("badge", "Partner badge", [
        image("image", "Badge image"),
        string("alt", "Alt text"),
        string("href", "Link"),
      ]),
      list("links", "Footer links", [
        string("label", "Label"),
        string("href", "Link", { description: "A site path like /contact, a mailto: address, or a full https:// URL." }),
        boolean("newTab", "Open in new tab"),
      ]),
      string("copyright", "Copyright line", { description: "Shown after “© <current year>”." }),
    ],
  },
];

// Sections shared by the case study pages.
const caseStudyHero = () =>
  object("hero", "Hero", [
    string("title", "Heading"),
    text("intro", "Intro"),
    strings("tags", "Tags"),
    artwork("covers", "cover", "Cover image", { description: "Background art on the right of the hero (decorative). Pick the cover's .svg." }),
  ]);
const overview = () =>
  object("overview", "Company overview", [
    string("title", "Heading"),
    text("text", "Text"),
    list("facts", "Project facts", [string("term", "Label"), string("value", "Value")], {
      description: "Label/value rows beside the overview (industry, focus, key facts). Keep values factual; no stat tiles.",
    }),
  ]);
// Closing buttons at the end of a case study.
const closing = () =>
  object("closing", "Closing buttons", [link("cta", "Main button"), link("indexLink", "Back to case studies link")]);
// Explanatory illustration with its alt text, placed in the solution section.
const illustration = () => [
  artwork("illustrations", "illustration", "Illustration"),
  string("illustrationAlt", "Illustration alt text", { required: false, description: "Describe what the illustration shows." }),
];
const section = (name, label, extra = []) =>
  object(name, label, [string("title", "Heading"), text("text", "Text"), ...extra]);

const pages = [
  {
    name: "home",
    label: "Home",
    template: "index.html",
    path: "content/pages/home.json",
    fields: [
      seo(),
      object("hero", "Hero", [
        artwork("covers", "image", "Cover image", { description: "Art on the right of the hero (decorative). Pick the cover's .svg." }),
        string("title", "Heading"),
        text("intro", "Intro"),
        link("primaryCta", "Primary button"),
        link("secondaryCta", "Secondary button"),
        string("meta", "Meta line", { description: "Small muted line under the buttons, e.g. partner status." }),
      ]),
      object("work", "Featured case study", [
        ...illustration(),
        string("title", "Heading"),
        text("text", "Summary", { description: "Two or three sentences, taken from the case study." }),
        link("link", "Link"),
      ]),
      object("services", "What we do", [
        string("title", "Heading"),
        text("intro", "Intro"),
        list("items", "Services", [
          artwork("spots", "spot", "Spot", { description: "Shown at the start of the row (decorative). Pick the spot's .svg." }),
          string("title", "Name"),
          text("text", "Description"),
        ]),
        link("link", "Link"),
      ]),
      object("howWeWork", "How we work", [
        string("title", "Heading"),
        text("lead", "Lead paragraph"),
        strings("points", "Checklist"),
      ]),
      object("rovo", "Rovo AI", [
        string("title", "Heading"),
        text("intro", "Intro"),
        link("link", "Link"),
        list("items", "Find / Learn / Act", [string("label", "Label"), string("text", "Text")]),
      ]),
      object("clients", "Client logos", [
        string("heading", "Heading"),
        list("logos", "Logos", [
          image("image", "Logo", { options: { path: "assets/clients" } }),
          string("alt", "Company name (alt text)"),
          number("maxWidth", "Max width (px)", { description: "Optional. Only for unusually wide logos." }),
        ]),
      ]),
      object("cta", "Closing call to action", [
        string("title", "Heading"),
        text("text", "Text"),
        link("button", "Button"),
      ]),
    ],
  },
  {
    name: "ai",
    label: "AI (Rovo)",
    template: "ai/index.html",
    path: "content/pages/ai.json",
    fields: [
      seo(),
      object("hero", "Hero", [string("title", "Heading"), text("intro", "Intro"), link("cta", "Button")]),
      object("meet", "Find, learn, act", [
        string("title", "Heading"),
        list("items", "Ledger rows", [
          icon(),
          string("label", "Label", { description: "One word, e.g. Find." }),
          string("title", "Lead line"),
          text("text", "Description"),
        ]),
        link("datasheet", "Datasheet button"),
      ]),
      object("agents", "Rovo agents", [
        string("title", "Heading"),
        list("cards", "Agents", [
          icon(),
          string("title", "Title"),
          text("text", "Description"),
        ], { description: "Laid out three to a row on desktop; six fills two rows." }),
      ]),
      object("foundation", "Foundation", [string("title", "Heading"), text("text", "Text")]),
      object("extend", "Extend", [
        string("title", "Heading"),
        text("text", "Text"),
        image("image", "Image"),
        text("imageAlt", "Image alt text"),
      ]),
      object("cta", "Closing call to action", [text("title", "Heading"), link("button", "Button")]),
    ],
  },
  {
    name: "atlassian-services",
    label: "Services",
    template: "atlassian-services/index.html",
    path: "content/pages/atlassian-services.json",
    fields: [
      seo(),
      object("hero", "Hero", [string("title", "Heading"), text("intro", "Intro")]),
      object("services", "Services ledger", [
        string("title", "Heading"),
        list("items", "Services", [
          string("title", "Service"),
          text("text", "Outcome", { description: "One line on what the client gets." }),
          string("linkLabel", "Link text", { required: false, description: "Optional link under the outcome. Say where it goes." }),
          string("linkHref", "Link", { required: false, description: "A site path like /ai. Leave empty for no link." }),
        ]),
      ]),
      object("cycle", "Optimization cycle", [
        string("title", "Heading"),
        text("text", "Text"),
        string("listLabel", "Cycle name (screen readers)", { description: "Read out before the steps, e.g. \"The M20 optimization cycle\"." }),
        list("steps", "Cycle steps", [string("label", "Step")], {
          description: "Shown clockwise from top left; the cycle reads best with exactly four steps.",
        }),
        link("cta", "Button"),
      ]),
      object("stack", "Atlassian stack", [
        string("title", "Heading"),
        list("products", "Products", [
          image("logo", "Logo", { required: false, description: "Official product logo for dark backgrounds (the -inverse file), shown at the top of the card." }),
          string("name", "Product", { description: "The logo's alt text. Shown as a label only when the card has no logo." }),
          string("title", "Tagline"),
          strings("items", "Checklist"),
        ]),
      ]),
      object("partner", "Partner banner", [
        text("title", "Heading"),
        string("meta", "Partner line", { description: "Small muted line under the heading, e.g. the partner tier." }),
        link("cta", "Button"),
      ]),
    ],
  },
  {
    name: "partners",
    label: "Partners",
    template: "partners/index.html",
    path: "content/pages/partners.json",
    fields: [
      seo(),
      object("hero", "Hero", [string("title", "Heading"), text("intro", "Intro")]),
      list("partners", "Partners", [
        image("logo", "Logo", { options: { path: "assets/partners" } }),
        string("logoAlt", "Logo alt text"),
        string("name", "Name"),
        text("text", "Description"),
        string("url", "Website"),
        string("linkLabel", "Link text"),
      ]),
    ],
  },
  {
    name: "case-studies",
    label: "Case Studies (index)",
    template: "case-studies/index.html",
    path: "content/pages/case-studies.json",
    fields: [
      seo(),
      string("title", "Heading"),
      list("studies", "Case study cards", [
        string("href", "Link", { description: "Path of the case study page, e.g. /case-study-intranet." }),
        string("title", "Title"),
        text("summary", "Summary"),
        string("linkLabel", "Link text"),
        artwork("spots", "spot", "Spot illustration", { description: "Shown at the top of the card (decorative). Pick the spot's .svg." }),
      ]),
    ],
  },
  {
    name: "privacy",
    label: "Privacy Policy",
    template: "privacy/index.html",
    path: "content/pages/privacy.json",
    fields: [
      seo(),
      object("hero", "Hero", [string("title", "Heading"), string("updated", "Last updated line")]),
      blocks("body", "Policy text", [
        block("heading", "Heading", [string("text", "Heading")]),
        block("subheading", "Subheading", [string("text", "Subheading")]),
        block("paragraph", "Paragraph", [markdown("text", "Text")]),
        block("list", "Bullet list", [markdown("items", "Items", { list: true })]),
      ]),
    ],
  },
  {
    name: "not-found",
    label: "404 (page not found)",
    template: "404.html",
    path: "content/pages/404.json",
    fields: [
      seo(),
      string("title", "Heading"),
      text("text", "Text"),
      link("cta", "Button"),
    ],
  },
  {
    name: "case-study-intranet",
    label: "Case Study: Intranet",
    template: "case-study-intranet/index.html",
    path: "content/pages/case-study-intranet.json",
    fields: [
      seo(),
      caseStudyHero(),
      overview(),
      text("quote", "Client quote paragraphs", { list: true }),
      section("challenge", "The challenge", [
        string("listTitle", "Requirements heading"),
        strings("requirements", "Requirements"),
      ]),
      section("solution", "The solution", illustration()),
      section("design", "Design & features"),
      section("outcomes", "Outcomes"),
      closing(),
    ],
  },
  {
    name: "case-study-dashboard",
    label: "Case Study: Dashboard",
    template: "case-study-dashboard/index.html",
    path: "content/pages/case-study-dashboard.json",
    fields: [
      seo(),
      caseStudyHero(),
      overview(),
      object("challenge", "The challenge", [
        string("title", "Heading"),
        text("intro", "Intro"),
        list("items", "Challenges", [string("title", "Title"), text("text", "Text")]),
        text("outro", "Closing paragraph"),
      ]),
      object("solution", "The solution", [
        string("title", "Heading"),
        text("intro", "Intro"),
        ...illustration(),
        list("phases", "Phases", [
          string("title", "Title"),
          string("label", "Stage", { description: "Shown under the title, e.g. POC 1 · Prototype." }),
          list("specs", "Specs", [string("term", "Term"), string("value", "Value")]),
        ]),
      ]),
      object("architecture", "Core architecture", [
        string("title", "Heading"),
        list("parts", "Parts", [string("title", "Title"), markdown("text", "Text")]),
      ]),
      object("principles", "Key design principles", [string("title", "Heading"), markdown("items", "Principles", { list: true })]),
      object("outcomes", "Outcomes", [string("title", "Heading"), text("intro", "Intro"), strings("items", "Outcomes")]),
      object("value", "How M20 helped", [
        string("title", "Heading"),
        text("intro", "Intro"),
        list("items", "Rows", [string("title", "Title"), text("text", "Text")]),
      ]),
      closing(),
    ],
  },
  {
    name: "ai-value-proposition",
    label: "AI Value Proposition",
    template: "ai-value-proposition/index.html",
    path: "content/pages/ai-value-proposition.json",
    fields: [
      seo(),
      object("hero", "Hero", [string("title", "Heading"), text("intro", "Intro"), strings("tags", "Tags")]),
      object("inside", "What's inside", [
        string("label", "Navigation name (screen readers)", { description: "Read out before the section links, e.g. \"What's inside\"." }),
        list("cards", "Section links", [
          string("href", "Link", { description: "Anchor of the section below, e.g. #forge-app." }),
          string("title", "Title"),
          text("text", "Text"),
        ]),
      ]),
      object("forge", "Forge app", [
        string("title", "Heading"),
        strings("tags", "Tags"),
        string("backgroundLabel", "Background heading"),
        text("background", "Background"),
        string("solutionLabel", "Solution heading"),
        text("solution", "Solution"),
        list("features", "Features", [
          icon(),
          string("title", "Title"),
          strings("items", "Items"),
        ]),
        string("outcomesLabel", "Outcomes heading"),
        strings("outcomes", "Outcomes"),
      ]),
      object("workflows", "Agentic workflows", [
        string("title", "Heading"),
        text("intro", "Intro"),
        strings("tags", "Tags"),
        list("cards", "Workflows", [string("title", "Title"), text("text", "Text")]),
      ]),
      object("knowledge", "Knowledge management", [
        string("title", "Heading"),
        text("intro", "Intro"),
        strings("tags", "Tags"),
        object("featured", "Featured agent", [
          string("title", "Title"),
          text("intro", "Intro"),
          list("parts", "Sub-agents", [string("title", "Title"), text("text", "Text")]),
        ]),
        list("cards", "More agents", [string("title", "Title"), text("text", "Text")]),
      ]),
      object("governance", "AI governance", [
        string("title", "Heading"),
        text("intro", "Intro"),
        list("items", "Guardrails", [string("title", "Guardrail"), text("text", "Detail")]),
      ]),
      object("cta", "Closing call to action", [text("title", "Heading"), link("button", "Button")]),
    ],
  },
  {
    name: "contact",
    label: "Contact",
    template: "contact/index.html",
    path: "content/pages/contact.json",
    fields: [
      seo(),
      object("intro", "Intro", [
        string("title", "Heading"),
        text("text", "Text"),
        link("emailLink", "Email link", { description: "Use a mailto: link, e.g. mailto:sales@m20tech.com." }),
      ]),
      object("form", "Form", [
        string("firstNameLabel", "First name label"),
        string("lastNameLabel", "Last name label"),
        string("emailLabel", "Email label"),
        string("subjectLabel", "Subject label"),
        string("messageLabel", "Message label"),
        string("submitLabel", "Submit button"),
        string("sendingLabel", "Submit button while sending"),
        text("invalidText", "Validation message"),
        text("errorText", "Send-failure message"),
      ]),
      object("thanks", "Thank-you popup", [
        string("title", "Heading"),
        text("text", "Text"),
        string("closeLabel", "Close button"),
      ]),
    ],
  },
];

// Sidebar groups in the PagesCMS UI.
export const groups = [
  { name: "pages", label: "Pages", entries: pages },
  { name: "site", label: "Site-wide", entries: [settings, ...components] },
];

export { pages };
export const entries = [...pages, settings, ...components];
