/**
 * The Google Play feature graphic — 1024×500.
 *
 *   node scripts/makeFeatureGraphic.mjs
 *   node scripts/makeFeatureGraphic.mjs --guides   # draws the safe zones on top
 *
 * HARD RULES FROM PLAY'S SPEC, all enforced below:
 *
 *  - Exactly 1024×500, JPEG or 24-bit PNG, **no alpha channel**. Alpha is one
 *    of the two most common rejection causes, so this is drawn on an opaque
 *    ground and never screenshotted with `omitBackground`.
 *  - Keep everything that matters inside the centre ~860×480, with a 70–80px
 *    buffer from every edge. Play crops this image differently per surface, and
 *    what looks centred here is not what a phone shows.
 *  - If a promo video is ever attached, Play renders a 96×96 play button dead
 *    centre (x 464–560, y 202–298). That band is left EMPTY, so adding a video
 *    later cannot cover the headline.
 *
 * DESIGN RULES, from what actually converts on a store listing:
 *
 *  - One benefit-led message, five to seven words. This uses six.
 *  - It matches the landing page's headline and the first screenshot, rather
 *    than being a disconnected ad banner.
 *  - No store badges, no "Download now", no price and no ranking claims — all
 *    of those get listings rejected.
 *  - The app icon is NOT repeated here: Play already shows it beside this image.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORE = path.join(ROOT, "store-assets");
const GUIDES = process.argv.includes("--guides");

const MOSS_600 = "#4A7740";
const MOSS_900 = "#1B2A18";
const LEAF = "#E4F0DF";

const HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500&family=Noto+Sans+Devanagari:wght@400&display=swap" rel="stylesheet" />
<style>
  * { margin:0; box-sizing:border-box; }
  body {
    width:1024px; height:500px; overflow:hidden;
    background: linear-gradient(135deg, ${MOSS_900} 0%, ${MOSS_600} 130%);
    font-family: Inter, sans-serif; color:#fff;
    display:flex; align-items:center;
    /* 80px buffer from every edge — the outer band Play may crop. */
    padding: 0 80px;
  }
  /*
   * 360px, not 470px.
   *
   * The copy column starts at x=80 and the play-button dead zone starts at
   * x=464, so the headline has 384px before it collides. At 470px the word
   * "language" ran straight through the middle of that circle — checked with
   * --guides, which is the entire reason --guides exists. A promo video
   * attached later would have covered the most important word on the graphic.
   */
  .copy { width: 360px; }
  h1 {
    font-family: Fraunces, serif; font-weight:600; font-size:40px;
    line-height:1.14; letter-spacing:-0.02em;
  }
  h1 em { font-style:italic; color:${LEAF}; }
  .sub { margin-top:15px; font-size:17px; color:#cfe0c9; line-height:1.45; }

  /* The two-column split, which is the product's whole idea in one picture. */
  .card {
    margin-left:auto; width:330px;
    background:#FFFDF9; color:#1F1C17;
    border-radius:16px; padding:18px;
    box-shadow: 0 20px 44px -20px rgba(0,0,0,.5);
  }
  .lab { font-size:10px; font-weight:600; letter-spacing:.07em;
         text-transform:uppercase; color:#928B7C; margin-bottom:7px; }
  /* 1.65 — Devanagari's shirorekha collides with the line above at Latin's ratio. */
  .hi { font-family:"Noto Sans Devanagari", sans-serif; font-size:14px; line-height:1.65; }
  .split { border-top:1px solid #DED8CA; margin-top:14px; padding-top:14px; }
  .q { font-size:14px; font-weight:500; margin-bottom:8px; }
  .opt { border:1px solid #DED8CA; border-radius:7px; padding:5px 9px;
         font-size:13px; margin-bottom:5px; }
  .ok { border-color:#5E9151; background:#F2F8EF; color:#263D22; font-weight:600; }

  ${
    GUIDES
      ? `
  /* --guides: the safe zone in green, the play-button dead zone in red. */
  body::before {
    content:""; position:fixed; left:82px; top:10px; width:860px; height:480px;
    border:2px solid #00FF00; pointer-events:none; z-index:99;
  }
  body::after {
    content:""; position:fixed; left:464px; top:202px; width:96px; height:96px;
    border:2px solid #FF0000; border-radius:50%; pointer-events:none; z-index:99;
  }`
      : ""
  }
</style>
</head>
<body>
  <div class="copy">
    <h1>Teach your child<br /><em>in your own<br />language</em></h1>
    <p class="sub">A 30-minute plan for tonight's topic, ready in seconds.</p>
  </div>

  <div class="card">
    <p class="lab">You read aloud</p>
    <p class="hi">आज हम भिन्नों को जोड़ना सीखेंगे। याद रखिए — हम तभी जोड़ सकते हैं जब नीचे की संख्या एक जैसी हो।</p>
    <div class="split">
      <p class="lab">They answer</p>
      <p class="q">What is 1/4 + 2/4?</p>
      <div class="opt">3/8</div>
      <div class="opt ok">3/4</div>
    </div>
  </div>
</body>
</html>`;

fs.mkdirSync(STORE, { recursive: true });
const out = path.join(
  STORE,
  GUIDES
    ? "feature-graphic-1024x500-guides.png"
    : "feature-graphic-1024x500.png",
);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1024, height: 500 },
  deviceScaleFactor: 1,
});
await page.setContent(HTML, { waitUntil: "networkidle" });
/** Webfonts settle after networkidle; shooting early bakes in the fallback. */
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

/**
 * `omitBackground` is deliberately NOT set. It would produce an alpha channel,
 * and Play rejects a feature graphic that has one.
 */
await page.screenshot({ path: out });
await browser.close();

console.log(`\n  wrote ${path.relative(ROOT, out)}  (1024×500, no alpha)`);
if (!GUIDES) console.log("  run with --guides to check the safe zones\n");
else
  console.log(
    "  green = safe zone · red = where Play draws a play button if a video is attached\n",
  );
