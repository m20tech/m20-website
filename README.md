# M20 Website

Source for [m20tech.com](https://m20-website.mike-124.workers.dev/), the marketing site for M20 Technology, an Atlassian Gold Solution Partner## Repo structure

Page HTML files are templates; their copy and images live in `content/` and are edited through [PagesCMS](https://app.pagescms.org). A zero-dependency Node script renders them into `dist/`, which Cloudflare deploys.

- `index.html` — homepage template
- `<page>/index.html` — every other page, one folder per clean URL (e.g. `atlassian-services/index.html` serves at `/atlassian-services`)
- `Header.dc.html`, `Footer.dc.html` — shared "design canvas" components fetched at runtime via `<dc-import>`
- `content/` — page and component content (JSON), edited via PagesCMS
- `cms/schema.mjs` — what's editable in the CMS; generates `.pages.yml`. `cms/icons/` — icon library
- `scripts/build.mjs` — build, CMS consistency checks, and local dev server
- `image-slot.js`, `support.js` — shared client-side scripts
- `assets/` — site images (also the CMS media folder); `uploads/` — additional media
- `design.md` — the design system reference (see below)

## Local development

```
npm run dev        # build, serve dist/ at http://localhost:8000, rebuild on change
npm run check      # CMS consistency checks only
npm run cms:sync   # regenerate .pages.yml after editing cms/schema.mjs
```

## Content editing & previews

- Sign in at [app.pagescms.org](https://app.pagescms.org) with GitHub, open `m20tech/m20-website`, and switch to the `preview` branch before editing.
- Every push to a non-`main` branch deploys a preview at `https://<branch>-m20-website.mike-124.workers.dev` — the shared one is **https://preview-m20-website.mike-124.workers.dev**.
- Production deploys from `main` via a PR from `preview`. See the **Preview & release workflow** in [AGENTS.md](AGENTS.md).

)

## Design system

**`design.md` is the golden source for this site's design system** — colors, typography, spacing, component patterns (buttons, cards, nav, forms), imagery, and motion rules. Read it before adding or restyling anything, and keep it in sync if a change introduces a new pattern or token.

## AI tooling setup: TWG CLI & Rovo MCP

These give AI coding agents access to this org's Atlassian data (Jira, Confluence, Bitbucket) via the Teamwork Graph. Full instructions live in Jira issue [MRA-6](https://m20tech.atlassian.net/browse/MRA-6); summarized here for convenience.

### Teamwork Graph CLI (terminal / Claude Code)

Use this to have your agent install, authenticate, and configure TWG CLI for you. In your agent's terminal (e.g. Claude Code), paste:

```
Install/setup TWG using https://teamwork-graph.atlassian.com/cli/AGENTS.md
```

Once installed, verify with:

```
twg doctor
```

This checks authentication, connectivity, and build info, and works the same on macOS, Linux, PowerShell, and cmd.

### Atlassian Rovo MCP (VS Code)

This repo already includes [.vscode/mcp.json](.vscode/mcp.json) configuring the Atlassian Rovo MCP server for VS Code:

```json
{
  "servers": {
    "atlassian-mcp-server": {
      "url": "https://mcp.atlassian.com/v1/mcp/authv2",
      "type": "http"
    }
  },
  "inputs": []
}
```

To use it:

1. Confirm GitHub Copilot is enabled in VS Code.
2. Reload the VS Code window (or restart VS Code) so the MCP config is picked up.
3. When prompted, complete the Atlassian authentication flow in your browser.
4. Confirm the Atlassian Rovo MCP server is available to Copilot.

**Note:** GitHub Copilot in VS Code uses a native HTTP MCP connection — don't switch this to the Claude Desktop `mcpServers` format or an `mcp-remote` proxy.

### Atlassian Rovo MCP (Claude Code)

Claude Code can connect to the same remote server directly over HTTP:

```
claude mcp add --transport http atlassian-mcp-server https://mcp.atlassian.com/v1/mcp/authv2
```

Complete the Atlassian authentication flow in your browser when prompted, then confirm the server is listed via `claude mcp list`.

See MRA-6 for setup steps for other tools (Cursor, Codex, Claude Desktop), plus the [IDE setup guide](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/setting-up-ides/) and [troubleshooting](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/troubleshooting-and-verifying-your-setup/).
