#!/usr/bin/env node
/*
 * sync-web.mjs — populate ios-app/www/ from the existing web app.
 *
 * This is a READ-ONLY consumer of the web app: it copies the shared assets
 * from the repo root into ios-app/www/ so Capacitor has a self-contained web
 * bundle. It NEVER writes outside ios-app/. The one transform it applies is to
 * the *copied* index.html — it injects a single <script> tag that loads the
 * native shim layer. The original index.html is left untouched.
 */
import { cp, mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const iosRoot = resolve(here, "..");
const repoRoot = resolve(iosRoot, "..");
const wwwDir = join(iosRoot, "www");

// Assets the app actually needs at runtime. `sw.js` (service worker) and the
// PWA `manifest.webmanifest` are intentionally skipped — inside a Capacitor
// WKWebView they are redundant and the SW can interfere with the capacitor://
// scheme. Everything the app loads is already local.
const ASSETS = [
  "index.html",
  "heart-rate.html",
  "references.html",
  "research.html",
  "css",
  "js",
  "mp3",
  "icon-180.png",
  "icon.svg",
];

const SHIM_TAG = '    <script src="native/ios-shims.js"></script>\n';

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  // Start from a clean www/ so removed source files don't linger.
  await rm(wwwDir, { recursive: true, force: true });
  await mkdir(join(wwwDir, "native"), { recursive: true });

  for (const asset of ASSETS) {
    const from = join(repoRoot, asset);
    if (!(await exists(from))) {
      console.warn(`  ! skipping missing asset: ${asset}`);
      continue;
    }
    await cp(from, join(wwwDir, asset), { recursive: true });
    console.log(`  + ${asset}`);
  }

  // Inject the native shim loader into the COPIED index.html only.
  const indexPath = join(wwwDir, "index.html");
  let html = await readFile(indexPath, "utf8");
  if (!html.includes("native/ios-shims.js")) {
    // Load the shim BEFORE the app scripts so navigator.bluetooth /
    // navigator.vibrate are already patched when the app wires them up.
    html = html.replace(
      /(\s*<script src="js\/programs\.js"><\/script>)/,
      `\n${SHIM_TAG}$1`
    );
    await writeFile(indexPath, html, "utf8");
    console.log("  ~ injected native/ios-shims.js into www/index.html");
  }

  // Ensure a placeholder shim exists so an un-bundled `cap sync` still runs.
  const shimOut = join(wwwDir, "native", "ios-shims.js");
  if (!(await exists(shimOut))) {
    await writeFile(
      shimOut,
      "/* placeholder — run `npm run bundle-native` to build the real shim */\n",
      "utf8"
    );
  }

  console.log("web assets synced -> ios-app/www/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
