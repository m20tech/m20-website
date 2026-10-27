// The brand asset library: every reusable icon, illustration, logo, and
// background, grouped into collections. The build turns this into the
// searchable gallery at /library/ (unlisted, noindex) and library.json, and
// scripts/design-docs.mjs turns it into the "Icon & Graphics Library"
// Confluence page. See "Asset library" in design.md.
//
// A collection is either a folder (`dir`, every file in it is an asset) or an
// explicit `files` list (for assets that sit loose in assets/). Files with the
// same basename and different extensions (gear.svg + gear.png) are one asset
// with two formats.
//
// `items` adds a title, search tags, and a note per asset, keyed by basename.
// An asset with no entry still shows up (titled from its filename), but
// `npm run library:check` lists it so its tags get filled in. Entries for
// files that don't exist fail the build.

export const LIBRARY = [
  {
    id: "icons",
    label: "Icons",
    dir: "cms/icons",
    kind: "icon",
    description:
      "Line icons: 24×24 (or 32×32) viewBox, stroke only, 2px stroke, round caps and joins. " +
      "Brand red on light backgrounds, white or gold on dark.",
    usage:
      "Use for icon badges, slides, docs, Jira/Confluence emoji, and anywhere a small glyph is needed. " +
      "Pick a color and size in the gallery to download an SVG or PNG. Most icons also have a Spot version.",
    items: {
      alert: { title: "Alert", tags: ["warning", "attention", "risk", "exception", "issue", "needs attention"] },
      bolt: { title: "Bolt", tags: ["lightning", "fast", "speed", "automation", "power", "energy"] },
      "calendar-check": { title: "Calendar with check", tags: ["schedule", "tasks", "due date", "recurring", "deadline", "planning"] },
      chat: { title: "Chat", tags: ["conversation", "message", "support", "talk", "comments", "rovo chat"] },
      checklist: { title: "Checklist", tags: ["tasks", "todo", "list", "done", "requirements", "audit"] },
      "cloud-bolt": { title: "Cloud bolt", tags: ["cloud", "migration", "power", "saas", "performance"] },
      cycle: { title: "Cycle", tags: ["loop", "continuous", "iteration", "optimization", "refresh", "lifecycle"] },
      "document-clock": { title: "Document with clock", tags: ["history", "pending", "schedule", "timesheet", "deadline", "sla"] },
      gear: { title: "Gear", tags: ["settings", "configuration", "admin", "cog", "custom development", "engineering"] },
      "globe-nodes": { title: "Globe with nodes", tags: ["network", "integration", "connected", "global", "teamwork graph"] },
      globe: { title: "Globe", tags: ["world", "web", "international", "internet", "website"] },
      invoice: { title: "Invoice", tags: ["billing", "finance", "receipt", "licensing", "purchase", "quote"] },
      "invoice-overdue": { title: "Overdue invoice", tags: ["billing", "past due", "unpaid", "collections", "finance", "reminder"] },
      layers: { title: "Layers", tags: ["stack", "platform", "architecture", "products", "tiers"] },
      "org-chart-small": { title: "Org chart (small)", tags: ["hierarchy", "structure", "team", "organization", "reporting"] },
      "org-chart": { title: "Org chart", tags: ["hierarchy", "structure", "team", "organization", "reporting"] },
      "price-tag": { title: "Price tag", tags: ["quote", "pricing", "cost", "sales", "offer", "atlassian quote"] },
      search: { title: "Search", tags: ["find", "magnifier", "discover", "lookup", "rovo search"] },
      sparkles: { title: "Sparkles", tags: ["ai", "rovo", "magic", "new", "smart", "generate"] },
      sync: { title: "Sync", tags: ["refresh", "integration", "update", "two-way", "exchange", "migration"] },
      "team-add": { title: "Add team member", tags: ["people", "onboarding", "users", "invite", "staffing"] },
      "team-flag": { title: "Team with flag", tags: ["people", "goal", "milestone", "leadership", "project team"] },
      "team-partner": { title: "Team partnership", tags: ["people", "collaboration", "partner", "handshake", "together"] },
      ticket: { title: "Ticket", tags: ["work item", "request", "jira", "issue", "service desk", "order"] },
      window: { title: "App window", tags: ["browser", "ui", "application", "screen", "web app", "portal"] },
    },
  },
  {
    id: "spots",
    label: "Spot illustrations",
    dir: "assets/artwork/spots",
    kind: "artwork",
    description: "240×240 spot art: a line icon on the red-tint circle with a gold sparkle. PNG export is 480×480, transparent.",
    usage: "Top of index cards (shown at 96px), slide section markers, newsletter section entry points. Always decorative.",
    items: {
      bolt: { title: "Bolt", tags: ["lightning", "fast", "automation", "power"] },
      chat: { title: "Chat", tags: ["conversation", "support", "message"] },
      checklist: { title: "Checklist", tags: ["tasks", "todo", "done", "requirements"] },
      "cloud-bolt": { title: "Cloud bolt", tags: ["cloud", "migration", "saas"] },
      collaboration: { title: "Collaboration", tags: ["team", "people", "together", "case study", "intranet"] },
      "dashboard-health": { title: "Dashboard health", tags: ["gauge", "meter", "kpi", "status", "jira dashboard", "case study"] },
      "document-clock": { title: "Document with clock", tags: ["history", "schedule", "deadline", "sla"] },
      gear: { title: "Gear", tags: ["settings", "configuration", "custom development"] },
      "globe-nodes": { title: "Globe with nodes", tags: ["network", "integration", "teamwork graph"] },
      globe: { title: "Globe", tags: ["world", "web", "website"] },
      "intranet-events": { title: "Intranet events", tags: ["calendar", "event list", "confluence", "intranet", "case study"] },
      invoice: { title: "Invoice", tags: ["billing", "finance", "licensing"] },
      layers: { title: "Layers", tags: ["stack", "platform", "architecture"] },
      "org-chart-small": { title: "Org chart (small)", tags: ["hierarchy", "team", "organization"] },
      "org-structure": { title: "Org structure", tags: ["hierarchy", "team", "organization", "case study"] },
      search: { title: "Search", tags: ["find", "discover", "rovo search"] },
      sparkles: { title: "Sparkles", tags: ["ai", "rovo", "smart", "new"] },
      sync: { title: "Sync", tags: ["refresh", "integration", "migration"] },
      "team-add": { title: "Add team member", tags: ["people", "onboarding", "users"] },
      "team-partner": { title: "Team partnership", tags: ["people", "partner", "collaboration"] },
      "transformation-loop": { title: "Transformation loop", tags: ["cycle", "change", "iteration", "case study", "dashboard"] },
      window: { title: "App window", tags: ["browser", "ui", "application", "portal"] },
    },
  },
  {
    id: "covers",
    label: "Covers",
    dir: "assets/artwork/covers",
    kind: "artwork",
    description: "1200×630 dark cover art. The SVG is the page hero background; the PNG is the social share image.",
    usage: "Case study heroes, social share images, slide title backgrounds, newsletter headers.",
    items: {
      "intranet-transformation": { title: "Intranet transformation", tags: ["confluence", "intranet", "before and after", "refined", "case study", "hero"] },
      "jira-executive-dashboard": { title: "Jira executive dashboard", tags: ["jira", "dashboard", "kpi", "rag", "reporting", "case study", "hero"] },
    },
  },
  {
    id: "illustrations",
    label: "Illustrations",
    dir: "assets/artwork/illustrations",
    kind: "artwork",
    description: "1200×800 explanatory illustrations on paper. PNG export is 2400×1600.",
    usage: "Half of a two-column section beside the text it explains; slides and proposals. Needs alt text.",
    items: {
      "confluence-intranet-layers": { title: "Confluence intranet layers", tags: ["confluence", "intranet", "architecture", "isometric", "layers", "refined"] },
      "prototype-to-production": { title: "Prototype to production", tags: ["pipeline", "ci/cd", "delivery", "phases", "security review", "jira"] },
    },
  },
  {
    id: "app-icons",
    label: "App icons",
    dir: "assets/artwork/app-icons",
    kind: "artwork",
    description:
      "512×512 app icons: a glyph on a rounded tile whose ground shows the type " +
      "(red gradient = app, ink with glow = agent, paper = plugin). PNG export is 1024×1024.",
    usage:
      "One per M20 app, agent, or plugin: its Confluence parent page, the Apps and Shared Agents Index, " +
      "decks, and Atlassian/Slack emoji. Not for topics or features — use icons and spots for those.",
    items: {
      "agent-policies": { title: "M20 Agent Policies", tags: ["app icon", "plugin", "policies", "claude code", "agents", "clipboard"], note: "Plugin: m20tech/m20-agent-policies." },
      "cllife-approvals": { title: "CL Life Approvals", tags: ["app icon", "app", "forge", "approvals", "jsm", "shield"], note: "App: m20tech/cllife-approvals (client app for CL Life)." },
      "m20-intelligence": { title: "M20 Intelligence", tags: ["app icon", "agent", "rovo", "search", "reports", "jobs"], note: "Agent: m20tech/m20-intelligence." },
      "reselling-tools": { title: "M20 Reselling Tools", tags: ["app icon", "app", "forge", "reselling", "quotes", "invoicing", "price tag"], note: "App: m20tech/reselling." },
    },
  },
  {
    id: "brand",
    label: "Logo & badges",
    files: ["assets/logo.png", "assets/atlassian-gold.png"],
    kind: "image",
    description: "The M20 mark and the Atlassian Gold Solution Partner badge.",
    usage: "See Logo & lockup in the design system for sizing and embedding (web, email, PDF).",
    items: {
      logo: { title: "M20 logo mark", tags: ["logo", "brand", "mark", "favicon", "m20"], note: "300×300 transparent PNG in brand red. Works on light and dark backgrounds." },
      "atlassian-gold": {
        title: "Atlassian Gold Solution Partner badge",
        tags: ["atlassian", "partner", "badge", "gold", "solution partner"],
        note: "Follow Atlassian's partner badge guidelines. Don't recolor or crop.",
      },
    },
  },
  {
    id: "backgrounds",
    label: "Backgrounds",
    dir: "assets/backgrounds",
    files: ["assets/hero-network.jpg"],
    kind: "image",
    description: "Hero photography and 1920×1080 video-call backgrounds in the site palette.",
    usage: "Video-call backgrounds for Zoom, Meet, and Teams (the name-card versions have space for your name), slide backgrounds, hero images.",
    items: {
      "hero-network": { title: "Hero network mesh", tags: ["hero", "photography", "network", "mesh", "dark", "red"], note: "Homepage hero. Pair with a left-to-right dark gradient for text." },
      "video-ink-network": { title: "Video background: ink network", tags: ["video call", "zoom", "teams", "meet", "dark", "network"] },
      "video-ink-minimal": { title: "Video background: ink minimal", tags: ["video call", "zoom", "teams", "meet", "dark", "minimal", "logo"] },
      "video-maroon": { title: "Video background: maroon", tags: ["video call", "zoom", "teams", "meet", "red", "maroon", "gradient"] },
      "video-paper": { title: "Video background: paper", tags: ["video call", "zoom", "teams", "meet", "light", "paper"] },
      "video-paper-optimization-cycle": { title: "Video background: optimization cycle", tags: ["video call", "zoom", "teams", "meet", "light", "optimization cycle"] },
      "video-ink-name-card": { title: "Video background: ink name card", tags: ["video call", "zoom", "teams", "meet", "dark", "name card", "template"], note: "Template: replace \"Your Name\" and \"Your Role\" before use." },
      "video-paper-name-card": { title: "Video background: paper name card", tags: ["video call", "zoom", "teams", "meet", "light", "name card", "template"], note: "Template: replace \"Your Name\" and \"Your Role\" before use." },
    },
  },
  {
    id: "diagrams",
    label: "Diagrams",
    files: ["assets/optimization-cycle.jpg", "assets/rovo-connectors.png"],
    kind: "image",
    description: "Finished diagrams used on the site.",
    usage: "Slides, proposals, and pages that explain how M20 works.",
    items: {
      "optimization-cycle": { title: "Optimization Cycle", tags: ["cycle", "optimize", "train", "develop", "support", "services", "ring"], note: "Background matches paper #FAF7F4, so it needs no frame on paper." },
      "rovo-connectors": { title: "Rovo connectors", tags: ["rovo", "ai", "connectors", "integrations", "teamwork graph"] },
    },
  },
  {
    id: "products",
    label: "Atlassian product logos",
    dir: "assets/products",
    kind: "image",
    restricted: "Atlassian marks. We're permitted to use them; follow https://atlassian.design/components/logo/usage and attribute where possible.",
    description: "Official Atlassian product logos used on the site.",
    usage: "Product stack cards, slides, proposals. Never recolor or redraw them.",
    items: {
      jira: { title: "Jira", tags: ["atlassian", "jira", "product", "logo"] },
      confluence: { title: "Confluence", tags: ["atlassian", "confluence", "product", "logo"] },
      "jira-service-management": { title: "Jira Service Management", tags: ["atlassian", "jsm", "service management", "itsm", "product", "logo"] },
    },
  },
  {
    id: "partners",
    label: "Partner logos",
    dir: "assets/partners",
    kind: "image",
    restricted: "Third-party marks, shown on the Partners page. Check each partner's brand guidelines before using them elsewhere.",
    description: "Marketplace and technology partner logos.",
    usage: "Partner pages, co-sell decks, and proposals.",
    items: {
      adaptavist: { title: "Adaptavist", tags: ["partner", "marketplace", "scriptrunner"] },
      appfire: { title: "Appfire", tags: ["partner", "marketplace"] },
      atlassian: { title: "Atlassian", tags: ["partner", "atlassian", "vendor"] },
      elements: { title: "Elements", tags: ["partner", "marketplace"] },
      exalate: { title: "Exalate", tags: ["partner", "marketplace", "integration", "sync"] },
      jxl: { title: "JXL", tags: ["partner", "marketplace", "spreadsheets"] },
      osc: { title: "Open Source Consulting", tags: ["partner", "consulting"] },
      pledge1: { title: "Pledge 1%", tags: ["partner", "nonprofit", "giving"] },
      qmetry: { title: "QMetry", tags: ["partner", "marketplace", "testing", "qa"] },
      refined: { title: "Refined", tags: ["partner", "marketplace", "intranet", "confluence themes"] },
      revyz: { title: "Revyz", tags: ["partner", "marketplace", "backup"] },
      servicerocket: { title: "ServiceRocket", tags: ["partner", "marketplace"] },
      smartbear: { title: "SmartBear", tags: ["partner", "marketplace", "testing"] },
      squarespace: { title: "Squarespace", tags: ["partner", "website"] },
      tempo: { title: "Tempo", tags: ["partner", "marketplace", "time tracking", "timesheets"] },
    },
  },
  {
    id: "clients",
    label: "Client logos",
    dir: "assets/clients",
    kind: "image",
    restricted: "Client marks, approved for the website's \"Trusted by\" strip only. Get the client's permission before using them anywhere else.",
    description: "Client logos from the homepage marquee.",
    usage: "Website only, unless the client has approved another use.",
    items: {
      admis: { title: "ADMIS", tags: ["client", "finance"] },
      aires: { title: "Aires", tags: ["client", "relocation"] },
      cllife: { title: "CL Life", tags: ["client", "insurance"], note: "Wide wordmark (~4.5:1). Cap at max-width 200px in a logo row." },
      cowan: { title: "Cowan, DeBaets, Abrahams & Sheppard", tags: ["client", "legal", "law firm"] },
      maxim: { title: "Maxim Group", tags: ["client", "finance"] },
      packer: { title: "The Packer Collegiate Institute", tags: ["client", "education", "school"] },
      pagoda: { title: "Pagoda", tags: ["client"] },
      towerhill: { title: "Tower Hill Insurance Group", tags: ["client", "insurance"] },
      vibrant: { title: "Vibrant", tags: ["client"] },
      zebra: { title: "The Zebra", tags: ["client", "insurance"] },
    },
  },
];

export const LIBRARY_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp"];

// Public path of the gallery. Unlisted: not in the nav or sitemap, and
// served with noindex.
export const LIBRARY_PATH = "/library/";
