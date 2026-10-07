#!/usr/bin/env node
// Exports every SVG in the artwork library (assets/artwork/<type>/) to a PNG
// next to it, at the size cms/artwork.mjs sets for its type. PNGs are what
// social share images, email, slides, and PDFs use; pages use the SVG.
//
//   npm run artwork:png            export SVGs whose PNG is missing or older
//   npm run artwork:png -- --all   re-export everything
//
// Needs Google Chrome or Chromium (set CHROME_PATH if it isn't found). It
// drives Chrome over the DevTools protocol on a pipe, so there are no npm
// dependencies.

import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ARTWORK } from "../cms/artwork.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALL = process.argv.includes("--all");

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const bin of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try { candidates.push(execFileSync("which", [bin], { encoding: "utf8" }).trim()); } catch {}
  }
  const pw = "/opt/pw-browsers";
  if (fs.existsSync(pw)) {
    for (const d of fs.readdirSync(pw)) if (/^chromium-\d+$/.test(d)) candidates.push(path.join(pw, d, "chrome-linux", "chrome"));
  }
  return candidates.find((c) => c && fs.existsSync(c));
}

// Minimal DevTools-protocol client over --remote-debugging-pipe.
function launch(bin) {
  const args = ["--headless=new", "--remote-debugging-pipe", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "about:blank"];
  if (process.getuid?.() === 0) args.unshift("--no-sandbox");
  const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
  const out = proc.stdio[3], inp = proc.stdio[4];
  let id = 0, buf = "";
  const pending = new Map(), waiters = [];
  inp.on("data", (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\0")) >= 0) {
      const msg = JSON.parse(buf.slice(0, i));
      buf = buf.slice(i + 1);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        for (const w of waiters.splice(0)) if (!w(msg)) waiters.push(w);
      }
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      out.write(JSON.stringify({ id, method, params, sessionId }) + "\0");
    });
  const once = (method) => new Promise((resolve) => waiters.push((m) => (m.method === method ? (resolve(m), true) : false)));
  return { proc, send, once };
}

async function main() {
  const jobs = [];
  for (const [type, a] of Object.entries(ARTWORK)) {
    const dir = path.join(ROOT, "assets", "artwork", type);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".svg"))) {
      const svg = path.join(dir, f), png = svg.replace(/\.svg$/, ".png");
      if (ALL || !fs.existsSync(png) || fs.statSync(png).mtimeMs < fs.statSync(svg).mtimeMs) jobs.push({ svg, png, a });
    }
  }
  if (!jobs.length) return console.log("All artwork PNGs are up to date.");

  const bin = findChrome();
  if (!bin) throw new Error("Chrome or Chromium not found. Install Chrome or set CHROME_PATH.");
  const { proc, send, once } = launch(bin);
  try {
    const { targetInfos } = await send("Target.getTargets");
    const page = targetInfos.find((t) => t.type === "page");
    const { sessionId } = await send("Target.attachToTarget", { targetId: page.targetId, flatten: true });
    await send("Page.enable", {}, sessionId);
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } }, sessionId);
    for (const { svg, png, a } of jobs) {
      await send("Emulation.setDeviceMetricsOverride", { width: a.width, height: a.height, deviceScaleFactor: a.pngScale, mobile: false }, sessionId);
      const loaded = once("Page.loadEventFired");
      await send("Page.navigate", { url: pathToFileURL(svg).href }, sessionId);
      await loaded;
      const { data } = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: a.width, height: a.height, scale: 1 } }, sessionId);
      fs.writeFileSync(png, Buffer.from(data, "base64"));
      console.log(`${path.relative(ROOT, png)}  ${a.width * a.pngScale}×${a.height * a.pngScale}`);
    }
  } finally {
    proc.kill();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
