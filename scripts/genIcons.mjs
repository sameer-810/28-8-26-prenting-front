/**
 * ParentAI app icons, generated from one on-brand vector mark.
 *
 * THE MARK: a leaf, opening. The whole product is a cultivation metaphor —
 * "Building Foundations → Fluent" — and moss green is the semantic colour of
 * that promise rather than decoration (docs/03-design-system.md). It is the same
 * mark the landing site and the platform console use, so the three surfaces read
 * as one company.
 *
 * Deliberately NOT a book, a graduation cap, a lightbulb or a robot. Every
 * ed-tech icon in the Play Store is one of those, and the point of this product
 * is that it is not another app for the child.
 *
 * Outputs:
 *   assets/icon.png            1024  full-bleed, moss ground (iOS rounds it)
 *   assets/adaptive-icon.png   1024  transparent, mark inside Android's safe zone
 *   assets/splash-icon.png     1024  self-contained badge on the warm canvas
 *   assets/favicon.png           48  web favicon
 *   store-assets/play-icon-512.png  512  Play Console listing icon, NO alpha
 *
 * Run:  node scripts/genIcons.mjs
 *
 * Playwright rather than `sharp`, because Playwright is already a dev
 * dependency for the browser suites and `sharp` would be a native build nobody
 * needs for five images.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "assets");
const STORE = path.join(ROOT, "store-assets");

/** designSystem.ts — palette.moss and palette.surface. */
const MOSS_600 = "#4A7740";
const MOSS_800 = "#263D22";
const LEAF = "#E4F0DF";
const CANVAS = "#F7F4EC";

/**
 * The leaf, as a path on a 32-unit grid.
 *
 * One shape plus one stroke for the vein. Anything more disappears at 48px,
 * which is the size that actually matters — a launcher icon on a mid-range
 * Android phone.
 */
function leaf(color = LEAF, vein = MOSS_600) {
  return `
    <path d="M9 22c0-7 5-12 14-12 0 9-5 13-11 13-1.1 0-2-.4-3-1z" fill="${color}"/>
    <path d="M10 23c3-4 6-6 9-7" stroke="${vein}" stroke-width="1.4"
          stroke-linecap="round" fill="none"/>`;
}

/**
 * The viewBox is CROPPED TO THE MARK, not left at the 32-unit grid it was drawn
 * on.
 *
 * The path occupies roughly x 9–23 and y 10–23 of that grid, so rendering it at
 * `viewBox="0 0 32 32"` left the leaf filling under half the canvas and sitting
 * low and right of centre. At 48px that reads as a small smudge, and it would
 * have gone to the Play Console that way. This is the tight square around it.
 */
const VIEWBOX = "8.5 9.5 15 15";

/**
 * Each icon is a full HTML page screenshotted at an exact size — which is how
 * the transparency of the adaptive icon is controlled precisely, rather than
 * hoped for.
 */
const ICONS = [
  {
    file: path.join(ASSETS, "icon.png"),
    size: 1024,
    /** Full bleed. iOS applies its own rounding, so no corner radius here. */
    html: `<div style="width:1024px;height:1024px;background:linear-gradient(150deg,${MOSS_600} 0%,${MOSS_800} 100%);display:grid;place-items:center">
      <svg width="620" height="620" viewBox="${VIEWBOX}">${leaf(LEAF, MOSS_600)}</svg>
    </div>`,
  },
  {
    file: path.join(ASSETS, "adaptive-icon.png"),
    size: 1024,
    /**
     * TRANSPARENT, and the mark sits inside the centre ~66%.
     *
     * Android masks this to a circle, squircle or teardrop depending on the
     * launcher, and crops hard. Anything outside the safe zone is cut off on
     * some phones and not others — which is exactly the bug nobody sees until
     * a user posts a screenshot.
     */
    html: `<div style="width:1024px;height:1024px;background:transparent;display:grid;place-items:center">
      <svg width="500" height="500" viewBox="${VIEWBOX}">${leaf("#FFFFFF", MOSS_600)}</svg>
    </div>`,
    transparent: true,
  },
  {
    file: path.join(ASSETS, "splash-icon.png"),
    size: 1024,
    /** Self-contained badge — the splash background is the warm canvas. */
    html: `<div style="width:1024px;height:1024px;background:${CANVAS};display:grid;place-items:center">
      <div style="width:520px;height:520px;border-radius:130px;background:${MOSS_600};display:grid;place-items:center">
        <svg width="330" height="330" viewBox="${VIEWBOX}">${leaf(LEAF, MOSS_600)}</svg>
      </div>
    </div>`,
  },
  {
    file: path.join(ASSETS, "favicon.png"),
    size: 48,
    html: `<div style="width:48px;height:48px;background:${MOSS_600};display:grid;place-items:center">
      <svg width="38" height="38" viewBox="${VIEWBOX}">${leaf(LEAF, MOSS_600)}</svg>
    </div>`,
  },
  {
    file: path.join(STORE, "play-icon-512.png"),
    size: 512,
    /**
     * NO ALPHA. Play rejects a listing icon with an alpha channel, and it is
     * one of the two most common rejection causes — so this one is drawn on an
     * opaque ground with a square canvas, never transparent.
     */
    html: `<div style="width:512px;height:512px;background:linear-gradient(150deg,${MOSS_600} 0%,${MOSS_800} 100%);display:grid;place-items:center">
      <svg width="310" height="310" viewBox="${VIEWBOX}">${leaf(LEAF, MOSS_600)}</svg>
    </div>`,
  },
];

fs.mkdirSync(ASSETS, { recursive: true });
fs.mkdirSync(STORE, { recursive: true });

const browser = await chromium.launch();

for (const icon of ICONS) {
  const page = await browser.newPage({
    viewport: { width: icon.size, height: icon.size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${icon.html}</body></html>`,
    { waitUntil: "load" },
  );
  await page.screenshot({
    path: icon.file,
    omitBackground: Boolean(icon.transparent),
  });
  await page.close();
  console.log(`  ${path.relative(ROOT, icon.file).padEnd(34)} ${icon.size}×${icon.size}`);
}

await browser.close();
console.log("\n  Icons written. `npx expo prebuild --clean` to pick them up in a native build.\n");
