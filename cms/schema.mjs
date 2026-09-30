// CMS schema — the single source of truth for what's editable in PagesCMS.
//
// Each entry ties a template (an HTML file in the repo) to its content JSON
// and the fields editors see. `npm run cms:sync` turns this into .pages.yml;
// the build fails if templates, content, and this schema disagree.
//
// Adding, removing, or restructuring a section? Update the template, the
// content JSON, and the entry here together, then run `npm run cms:sync`.

import {
  string, text, markdown, image, icon, object, list, strings,
  blocks, block, link, eyebrow, boolean, number,
} from "./fields.mjs";

export const media = {
  input: "assets",
  output: "/assets",
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
    string("eyebrow", "Eyebrow", { description: "Links back to the case studies index." }),
    string("title", "Heading"),
    text("intro", "Intro"),
    strings("tags", "Tags"),
  ]);
const highlights = () =>
  object("highlights", "Project highlights", [
    eyebrow(),
    list("stats", "Stats", [string("value", "Value"), string("label", "Label")]),
  ]);
const overview = () =>
  object("overview", "Company overview", [
    eyebrow(),
    string("title", "Heading"),
    text("text", "Text"),
    string("industryLabel", "Industry label"),
    string("industry", "Industry"),
    string("focusLabel", "Focus label"),
    string("focus", "Focus"),
    string("challengeLabel", "Challenge label"),
    text("challenge", "Core challenge"),
  ]);
const section = (name, label, extra = []) =>
  object(name, label, [eyebrow(), string("title", "Heading"), text("text", "Text"), ...extra]);

const pages = [
  {
    name: "home",
    label: "Home",
    template: "index.html",
    path: "content/pages/home.json",
    fields: [
      object("hero", "Hero", [
        eyebrow(),
        image("image", "Background image", { description: "Decorative network art on the right of the hero." }),
        string("title", "Heading"),
        text("intro", "Intro"),
        link("primaryCta", "Primary button"),
        link("secondaryCta", "Secondary button"),
      ]),
      object("services", "What we do", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        list("cards", "Service cards", [icon(), string("title", "Title"), text("text", "Description")]),
      ]),
      object("howWeWork", "How we work", [
        eyebrow(),
        string("title", "Heading"),
        text("lead", "Lead paragraph"),
        text("body", "Body"),
        strings("points", "Checklist"),
      ]),
      object("rovo", "Rovo AI", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        link("cta", "Button"),
        list("cards", "Cards", [string("label", "Label"), string("text", "Text")]),
      ]),
      object("clients", "Client logos", [
        string("heading", "Heading"),
        list("logos", "Logos", [
          image("image", "Logo", { options: { path: "assets/clients" } }),
          string("alt", "Company name (alt text)"),
          number("maxWidth", "Max width (px)", { description: "Optional — only for unusually wide logos." }),
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
      object("hero", "Hero", [eyebrow(), string("title", "Heading"), text("intro", "Intro"), link("cta", "Button")]),
      object("meet", "Meet Rovo", [
        eyebrow(),
        string("title", "Heading"),
        list("cards", "Cards", [icon(), string("label", "Label"), string("title", "Title"), text("text", "Description")]),
        link("datasheet", "Datasheet button"),
      ]),
      object("agents", "Rovo agents", [
        eyebrow(),
        string("title", "Heading"),
        list("cards", "Agent cards", [icon(), string("title", "Title"), text("text", "Description")]),
      ]),
      object("foundation", "Foundation", [eyebrow(), string("title", "Heading"), text("text", "Text")]),
      object("extend", "Extend", [
        eyebrow(),
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
      object("hero", "Hero", [eyebrow(), string("title", "Heading"), text("intro", "Intro")]),
      object("services", "What we do", [
        eyebrow(),
        string("title", "Heading"),
        list("cards", "Service cards", [icon(), string("title", "Title"), text("text", "Description")]),
      ]),
      object("solutions", "Solutions", [
        eyebrow(),
        string("title", "Heading"),
        list("cards", "Solution cards", [icon(), string("title", "Title"), text("text", "Description")]),
      ]),
      object("cycle", "Optimization cycle", [
        image("image", "Image"),
        string("imageAlt", "Image alt text"),
        eyebrow(),
        string("title", "Heading"),
        text("text", "Text"),
        link("cta", "Button"),
      ]),
      object("stack", "Atlassian stack", [
        string("title", "Heading"),
        list("products", "Products", [
          string("name", "Product"),
          string("title", "Tagline"),
          strings("items", "Checklist"),
        ]),
      ]),
      object("partner", "Partner banner", [eyebrow(), text("title", "Heading"), link("cta", "Button")]),
    ],
  },
  {
    name: "partners",
    label: "Partners",
    template: "partners/index.html",
    path: "content/pages/partners.json",
    fields: [
      object("hero", "Hero", [eyebrow(), string("title", "Heading"), text("intro", "Intro")]),
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
      eyebrow(),
      string("title", "Heading"),
      list("studies", "Case study cards", [
        string("href", "Link", { description: "Path of the case study page, e.g. /case-study-intranet." }),
        string("category", "Category"),
        string("title", "Title"),
        text("summary", "Summary"),
        string("linkLabel", "Link text"),
      ]),
    ],
  },
  {
    name: "privacy",
    label: "Privacy Policy",
    template: "privacy/index.html",
    path: "content/pages/privacy.json",
    fields: [
      object("hero", "Hero", [eyebrow(), string("title", "Heading"), string("updated", "Last updated line")]),
      blocks("body", "Policy text", [
        block("heading", "Heading", [string("text", "Heading")]),
        block("subheading", "Subheading", [string("text", "Subheading")]),
        block("paragraph", "Paragraph", [markdown("text", "Text")]),
        block("list", "Bullet list", [markdown("items", "Items", { list: true })]),
      ]),
    ],
  },
  {
    name: "case-study-intranet",
    label: "Case Study: Intranet",
    template: "case-study-intranet/index.html",
    path: "content/pages/case-study-intranet.json",
    fields: [
      caseStudyHero(),
      highlights(),
      overview(),
      text("quote", "Client quote paragraphs", { list: true }),
      section("challenge", "The challenge", [
        string("listTitle", "Requirements heading"),
        strings("requirements", "Requirements"),
      ]),
      section("solution", "The solution"),
      section("design", "Design & features"),
      section("outcomes", "Outcomes", [link("cta", "Button")]),
    ],
  },
  {
    name: "case-study-dashboard",
    label: "Case Study: Dashboard",
    template: "case-study-dashboard/index.html",
    path: "content/pages/case-study-dashboard.json",
    fields: [
      caseStudyHero(),
      highlights(),
      overview(),
      object("challenge", "The challenge", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        list("cards", "Challenge cards", [string("label", "Label"), string("title", "Title"), text("text", "Text")]),
        text("outro", "Closing paragraph"),
      ]),
      object("solution", "The solution", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        list("phases", "Phases", [
          string("label", "Label"),
          string("title", "Title"),
          list("specs", "Specs", [string("term", "Term"), string("value", "Value")]),
          string("result", "Result"),
        ]),
      ]),
      object("architecture", "Core architecture", [
        eyebrow(),
        list("parts", "Parts", [string("title", "Title"), markdown("text", "Text")]),
      ]),
      object("principles", "Key design principles", [eyebrow(), markdown("items", "Principles", { list: true })]),
      object("value", "Our value", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        list("cards", "Cards", [icon(), string("title", "Title"), text("text", "Text")]),
      ]),
      object("outcomes", "Outcomes", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        strings("items", "Outcomes"),
        link("cta", "Button"),
      ]),
    ],
  },
  {
    name: "ai-value-proposition",
    label: "AI Value Proposition",
    template: "ai-value-proposition/index.html",
    path: "content/pages/ai-value-proposition.json",
    fields: [
      object("hero", "Hero", [eyebrow(), string("title", "Heading"), text("intro", "Intro"), strings("tags", "Tags")]),
      object("inside", "What's inside", [
        eyebrow(),
        list("cards", "Section cards", [
          string("href", "Link", { description: "Anchor of the section below, e.g. #forge-app." }),
          string("number", "Number"),
          string("title", "Title"),
          text("text", "Text"),
        ]),
      ]),
      object("forge", "01 · Forge app", [
        eyebrow(),
        string("title", "Heading"),
        strings("tags", "Tags"),
        string("backgroundLabel", "Background label"),
        text("background", "Background"),
        string("solutionLabel", "Solution label"),
        text("solution", "Solution"),
        list("features", "Feature cards", [icon(), string("title", "Title"), strings("items", "Items")]),
        string("outcomesLabel", "Outcomes label"),
        strings("outcomes", "Outcomes"),
      ]),
      object("workflows", "02 · Agentic workflows", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        strings("tags", "Tags"),
        list("cards", "Cards", [string("title", "Title"), text("text", "Text")]),
      ]),
      object("knowledge", "03 · Knowledge management", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        strings("tags", "Tags"),
        object("featured", "Featured example", [
          string("label", "Label"),
          string("title", "Title"),
          text("intro", "Intro"),
          list("parts", "Sub-agents", [string("title", "Title"), text("text", "Text")]),
        ]),
        list("cards", "Cards", [string("title", "Title"), text("text", "Text")]),
      ]),
      object("governance", "04 · AI governance", [
        eyebrow(),
        string("title", "Heading"),
        text("intro", "Intro"),
        markdown("items", "Items", { list: true }),
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
      object("intro", "Intro", [
        eyebrow(),
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
  { name: "site", label: "Site-wide", entries: components },
];

export const entries = [...pages, ...components];
