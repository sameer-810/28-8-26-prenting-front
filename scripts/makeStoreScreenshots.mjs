/**
 * Play Store phone screenshots — 1080×1920, from the REAL app.
 *
 *   npm run build:web            # dist/ must be current
 *   node scripts/makeStoreScreenshots.mjs
 *   node scripts/makeStoreScreenshots.mjs --raw   # no caption band, just the app
 *
 * Needs the API running and the demo household seeded, because these are
 * captures of the product rather than mockups of it. A store listing built from
 * mockups is the fastest way to earn one-star reviews saying "not as shown".
 *
 * PLAY'S RULES:
 *  - 2 to 8 phone screenshots, 16:9 or 9:16, each side 320–3840px. 1080×1920 is
 *    the safe middle.
 *  - The first two are what almost everyone sees — the listing shows them
 *    without scrolling — so they carry the two things that decide the install.
 *  - No device frames that imply hardware we do not ship, no fake review stars,
 *    no "#1" claims, no price. All of those are rejection causes.
 *
 * The caption band is drawn ABOVE the app capture rather than over it. Text
 * across a screenshot hides the thing it is describing, and at thumbnail size
 * in a store listing the caption is the only part anyone reads.
 */
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "store-assets", "screenshots");
const RAW = path.join(ROOT, "store-assets", "raw-screens");
/**
 * 8099, the same port every browser suite in tools/ uses — because it is in the
 * API's `CORS_ORIGIN` allowlist and an unlisted port is not.
 *
 * This was first written as 8097 and every sign-in failed with "You appear to
 * be offline", on a machine with a perfectly good network. A CORS-blocked
 * request is indistinguishable from a dead one to JavaScript, so the app says
 * the only honest thing it can. Worth the comment: the symptom names the wrong
 * cause, and it will do it again to whoever changes this next.
 */
const PORT = 8099;
const CAPTIONS = !process.argv.includes("--raw");

const DEMO = { email: "demo.parent@parentai.app", password: "ParentAI-Demo-2026" };

const MOSS_900 = "#1B2A18";
const LEAF = "#E4F0DF";

/**
 * A phone-shaped viewport that scales to 1080×1920.
 *
 * 360×640 at deviceScaleFactor 3 gives exactly 1080×1920, and 360 CSS pixels is
 * a real mid-range Android width — so the app lays out the way it will on the
 * device, rather than being a desktop layout squeezed down.
 */
const VIEW = { width: 360, height: 640 };
const SCALE = 3;

/** Space for the caption band, in CSS pixels of the same viewport. */
const BAND = CAPTIONS ? 96 : 0;

const SHOTS = [
  {
    file: "01-tonight.png",
    caption: "Tonight's lesson, in your language",
    path: "/",
  },
  {
    file: "02-progress.png",
    caption: "See whether it's actually working",
    path: "/progress",
  },
  {
    file: "03-children.png",
    caption: "One account. Every child in the house.",
    path: "/children",
  },
  {
    file: "04-settings.png",
    caption: "Your data stays yours",
    path: "/settings/privacy",
  },
];

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("\n  No dist/. Run `npm run build:web` first.\n");
  process.exit(1);
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".ttf": "font/ttf", ".png": "image/png", ".ico": "image/x-icon",
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(DIST, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: VIEW.width, height: VIEW.height - BAND },
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const base = `http://127.0.0.1:${PORT}`;

console.log("\n  signing in as the demo household…");
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByPlaceholder("you@example.com").fill(DEMO.email);
await page.locator('input[type="password"]').fill(DEMO.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(4500);

const body = await page.evaluate(() => document.body.innerText || "");
if (!/Aarav/.test(body)) {
  console.error(
    "\n  Could not reach the demo dashboard. Is the API running and `npm run seed:demo` done?\n",
  );
  await browser.close();
  server.close();
  process.exit(1);
}

for (const shot of SHOTS) {
  await page.goto(base + shot.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2600);

  const rawPath = path.join(RAW, shot.file);
  await page.screenshot({ path: rawPath });

  if (!CAPTIONS) {
    console.log(`  ${shot.file.padEnd(20)} raw`);
    continue;
  }

  /**
   * The band and the capture are composed in a second headless page rather
   * than with an image library, so the caption uses the same fonts and the
   * same palette as everything else that has been generated here.
   */
  const composer = await browser.newPage({
    viewport: { width: VIEW.width, height: VIEW.height },
    deviceScaleFactor: SCALE,
  });
  const dataUri = `data:image/png;base64,${fs.readFileSync(rawPath).toString("base64")}`;
  await composer.setContent(
    `<!doctype html><html><head><meta charset="utf-8" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap" rel="stylesheet" />
     </head>
     <body style="margin:0;background:${MOSS_900}">
       <div style="height:${BAND}px;display:grid;place-items:center;padding:0 26px">
         <p style="margin:0;font-family:Fraunces,serif;font-weight:600;font-size:21px;
                   line-height:1.2;color:${LEAF};text-align:center;letter-spacing:-0.01em">
           ${shot.caption}
         </p>
       </div>
       <img src="${dataUri}" style="display:block;width:${VIEW.width}px" />
     </body></html>`,
    { waitUntil: "load" },
  );
  await composer.evaluate(() => document.fonts.ready);
  await composer.waitForTimeout(300);
  await composer.screenshot({ path: path.join(OUT, shot.file) });
  await composer.close();

  console.log(`  ${shot.file.padEnd(20)} ${VIEW.width * SCALE}×${VIEW.height * SCALE}  "${shot.caption}"`);
}

await browser.close();
server.close();

console.log(
  `\n  ${SHOTS.length} screenshots in store-assets/screenshots/` +
    (CAPTIONS ? "\n  raw captures, uncaptioned, in store-assets/raw-screens/\n" : "\n"),
);
