/**
 * What the web app costs a parent to open.
 *
 *   node tools/perf.mjs
 *   node tools/perf.mjs --headed
 *
 * The API side of the budget is measured in the backend's `npm run benchmark`.
 * This is the other half: bytes over the wire, when the first pixel lands, and
 * how long after sign-in the dashboard is actually readable.
 *
 * SERVED COMPRESSED, ON PURPOSE
 *
 * The other suites here serve `dist` raw because they are testing behaviour and
 * compression cannot change it. A performance number CAN be changed by it, and
 * badly: the bundle is 4MB uncompressed and roughly a quarter of that gzipped,
 * so measuring raw bytes would report a download nobody in production performs
 * and would make the app look four times more expensive than it is. Vercel
 * serves these files compressed; so does this.
 */
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = 8099;
const HEADED = process.argv.includes("--headed");
const DEMO = {
  email: "demo.parent@parentai.app",
  password: "ParentAI-Demo-2026",
};

const pass = [];
const fail = [];
function check(name, ok, detail = "") {
  (ok ? pass : fail).push(name);
  console.log(
    `${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
}

/**
 * The budgets, and where each number comes from.
 *
 * These are not the PRD's — it does not set web performance targets — so they
 * are set against the audience the PRD DOES describe: Indian households on
 * mid-range Android phones and ordinary broadband, at 8pm. A 1MB compressed
 * first load is about three seconds on a slow connection, which is the most
 * that can be asked of somebody opening the app to teach their child.
 */
const BUDGETS = {
  firstLoadKb: 1400,
  firstContentfulPaintMs: 2500,
  dashboardReadyMs: 6000,
};

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};
/**
 * Everything except the formats that are already compressed internally.
 *
 * `.ttf` belongs here and was initially left out, which cost the measurement
 * its meaning: TrueType is plain uncompressed data and every real host gzips
 * it, so excluding it reported the font payload at roughly double what a parent
 * downloads and failed a budget that was not actually being missed.
 */
const PRECOMPRESSED = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".gz",
]);

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(DIST, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(DIST, "index.html");
  const ext = path.extname(file);
  const body = fs.readFileSync(file);
  const wantsGzip =
    /\bgzip\b/.test(req.headers["accept-encoding"] || "") &&
    !PRECOMPRESSED.has(ext);
  const payload = wantsGzip ? zlib.gzipSync(body, { level: 6 }) : body;
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": payload.length,
    ...(wantsGzip ? { "Content-Encoding": "gzip" } : {}),
  });
  res.end(payload);
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ headless: !HEADED });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();
const base = `http://127.0.0.1:${PORT}`;

/**
 * Bytes are counted from the response headers rather than from disk, so what
 * is reported is what actually crossed the wire — compressed, and only the
 * files the app chose to request.
 */
const transferred = [];
page.on("response", async (res) => {
  const len = Number(res.headers()["content-length"] || 0);
  if (len) transferred.push({ url: res.url(), bytes: len });
});

console.log("\n=== 1. First load — a parent opening the app cold ===");
const t0 = Date.now();
await page.goto(base, { waitUntil: "load" });
await page.waitForSelector("text=Welcome back", { timeout: 20000 });
const signInVisibleMs = Date.now() - t0;

const paint = await page.evaluate(() => {
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  const nav = performance.getEntriesByType("navigation")[0];
  return {
    fcp: fcp ? Math.round(fcp.startTime) : null,
    domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    load: nav ? Math.round(nav.loadEventEnd) : null,
  };
});

const firstLoadKb = Math.round(
  transferred.reduce((s, r) => s + r.bytes, 0) / 1024,
);
const jsKb = Math.round(
  transferred
    .filter((r) => r.url.endsWith(".js"))
    .reduce((s, r) => s + r.bytes, 0) / 1024,
);
const fontKb = Math.round(
  transferred
    .filter((r) => r.url.endsWith(".ttf"))
    .reduce((s, r) => s + r.bytes, 0) / 1024,
);

console.log(
  `  transferred ${firstLoadKb} KB  (js ${jsKb} KB, fonts ${fontKb} KB, ${transferred.length} requests)`,
);
console.log(
  `  first contentful paint ${paint.fcp}ms · DOM ready ${paint.domContentLoaded}ms · load ${paint.load}ms`,
);
console.log(`  sign-in screen usable at ${signInVisibleMs}ms`);

check(
  "the first load stays within its byte budget",
  firstLoadKb <= BUDGETS.firstLoadKb,
  `${firstLoadKb} KB of ${BUDGETS.firstLoadKb} KB`,
);
check(
  "something is on screen quickly",
  paint.fcp !== null && paint.fcp <= BUDGETS.firstContentfulPaintMs,
  `${paint.fcp}ms of ${BUDGETS.firstContentfulPaintMs}ms`,
);

console.log("\n=== 2. Fonts are fetched, not shipped ===");
/**
 * The eight scripts this product supports are ~3.6MB of font files on disk.
 * Sending them to every parent would cost more than the application itself, so
 * they load per weight and per script, and this is the assertion that the lazy
 * loading is still lazy: a refactor that innocently imports the font map at
 * module scope would undo it silently.
 *
 * It checks WHICH fonts arrived, not how many kilobytes of them. An earlier
 * version asserted a byte ceiling and called it the Indic check, so it failed
 * on the weight of the Latin faces — which are supposed to be there — and said
 * "the Indic library shipped" about a load that contained none of it. An
 * assertion that reports the wrong cause is worse than no assertion.
 */
const indicFonts = transferred
  .filter((r) => /Noto(Sans|Nastaliq)/i.test(r.url))
  .map((r) => r.url.split("/").pop().split(".")[0]);
check(
  "no Indic font is downloaded before a language is known",
  indicFonts.length === 0,
  indicFonts.join(", "),
);

/**
 * The Latin faces, which every parent does need. Five files: Inter at three
 * weights and Fraunces at two. The budget is set just above what they cost
 * today so that ADDING a sixth is a decision somebody makes on purpose.
 *
 * They are large because @expo-google-fonts ships full-Unicode TTFs — Inter is
 * 336KB per weight before compression, most of it Cyrillic, Greek and Vietnamese
 * this product will never render. Subsetting to Latin plus the punctuation the
 * design uses would take roughly 60% off, and belongs with the hosting
 * configuration rather than here.
 */
check(
  "the Latin font set stays within its budget",
  fontKb <= 620,
  `${fontKb} KB across ${transferred.filter((r) => r.url.endsWith(".ttf")).length} faces`,
);

console.log("\n=== 3. Signing in to a readable dashboard ===");
await page.getByPlaceholder("you@example.com").fill(DEMO.email);
await page.locator('input[type="password"]').fill(DEMO.password);
const t1 = Date.now();
await page.getByRole("button", { name: "Sign in" }).click();
/**
 * Waits for a child's NAME, not for the spinner to stop. The dashboard frame
 * renders before the data does, and a parent has not arrived anywhere useful
 * until their own child is on the screen.
 */
await page.waitForSelector("text=Aarav", { timeout: 30000 });
const dashboardReadyMs = Date.now() - t1;
console.log(`  dashboard readable ${dashboardReadyMs}ms after tapping Sign in`);
check(
  "the dashboard is readable soon after signing in",
  dashboardReadyMs <= BUDGETS.dashboardReadyMs,
  `${dashboardReadyMs}ms of ${BUDGETS.dashboardReadyMs}ms`,
);

console.log("\n=== 4. Moving between sections is instant ===");
/**
 * Tab switching should cost nothing — the screens are already mounted. If this
 * ever regresses it means something remounts on navigation, which is the same
 * fault that would throw away a half-filled form.
 */
const navTimings = [];
for (const tab of ["Progress", "Children", "Settings", "Home"]) {
  const t = Date.now();
  await page.getByRole("tab", { name: tab }).click();
  await page.waitForFunction(
    (name) =>
      window.location.pathname.includes(name.toLowerCase()) || name === "Home",
    tab,
    { timeout: 5000 },
  );
  navTimings.push(Date.now() - t);
}
const worstNav = Math.max(...navTimings);
console.log(`  tab switches: ${navTimings.join("ms, ")}ms`);
check(
  "switching sections is immediate",
  worstNav <= 400,
  `worst ${worstNav}ms`,
);

console.log("\n=== 5. A returning parent ===");
const t2 = Date.now();
await page.reload({ waitUntil: "load" });
await page.waitForSelector("text=Aarav", { timeout: 30000 });
const returnMs = Date.now() - t2;
console.log(`  dashboard back in ${returnMs}ms on a warm cache`);
check(
  "a reload is faster than a cold start",
  returnMs <= signInVisibleMs + dashboardReadyMs,
  `${returnMs}ms`,
);

if (HEADED) await page.waitForTimeout(4000);
await browser.close();
server.close();

console.log("\n" + "=".repeat(60));
console.log(`PASSED ${pass.length} / ${pass.length + fail.length}`);
if (fail.length)
  console.log("FAILED:\n" + fail.map((f) => `  - ${f}`).join("\n"));
console.log("=".repeat(60));
process.exit(fail.length ? 1 : 0);
