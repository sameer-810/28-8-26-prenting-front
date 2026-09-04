/**
 * Captures the screenshots the client guide embeds.
 *
 *   npm run build:web && node tools/captureGuideShots.mjs
 *   → tools/guide-shots/*.png
 *
 * Real captures of the running app against the live API, not mockups. A guide
 * illustrated with pictures of something else is worse than one with no
 * pictures — the client checks the app against it.
 *
 * Needs the API up and `npm run seed:demo` done. Port 8099 because that is what
 * the API's local CORS allowlist contains.
 */
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(ROOT, "tools", "guide-shots");
const PORT = 8099;
const DEMO = {
  email: "demo.parent@parentai.app",
  password: "ParentAI-Demo-2026",
};
const STAFF_PASSWORD = process.argv.includes("--staff-password")
  ? process.argv[process.argv.indexOf("--staff-password") + 1]
  : null;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(DIST, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(DIST, "index.html");
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(PORT, r));

fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch();

/** Phone frame: 390×844 at 2x is what a store screenshot and a guide both want. */
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const desktop = await browser.newContext({
  viewport: { width: 1280, height: 860 },
  deviceScaleFactor: 1.5,
});

const shots = [];

/**
 * Screenshot a screen, but only once it has shown `expect`.
 *
 * The waits used to swallow their own timeouts, so a screen that failed to load
 * was photographed anyway and the run still reported success. That put a
 * "Could not sign in" error into a document going to the client. A capture that
 * cannot prove it caught the right screen has to stop the run.
 */
async function shot(page, name, note, expect) {
  if (expect) {
    await page
      .waitForFunction(
        (re) => new RegExp(re).test(document.body.innerText || ""),
        expect.source,
        {
          timeout: 30000,
        },
      )
      .catch(() => {
        throw new Error(
          `${name}: never showed /${expect.source}/. The screen is broken, ` +
            "or its credentials are wrong. Not saving a screenshot of it.",
        );
      });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  shots.push(name);
  console.log(`  ${name.padEnd(24)} ${note}`);
}

async function signIn(page) {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.getByPlaceholder("you@example.com").fill(DEMO.email);
  await page.locator('input[type="password"]').fill(DEMO.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForFunction(
    () => /Aarav/.test(document.body.innerText || ""),
    null,
    { timeout: 30000 },
  );
}

console.log("\ncapturing…\n");

// ---- Sign-in, on a phone -----------------------------------------------
const p = await phone.newPage();
await p.goto(base, { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await shot(p, "01-signin", "the way in", /Welcome back/);

await signIn(p);
await shot(p, "02-home", "PRD 4.4 — daily milestone card", /Aarav/);

/**
 * Progress is captured on "This year" rather than the default.
 *
 * The ranges are calendar periods, so on the 1st of a month "This month" is one
 * day and photographs as a column of zeros — true, but a picture of the empty
 * case in a document explaining the feature.
 */
async function progress(page, name, note) {
  await page.goto(`${base}/progress`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /This year/i }).click();
  await page.waitForTimeout(3500);
  await shot(page, name, note, /studied out of/);
}
await progress(p, "03-progress-phone", "PRD 4.4 — timelines and the day chart");

// ---- Desktop: the wide layout ------------------------------------------
const d = await desktop.newPage();
await signIn(d);
await shot(d, "04-home-web", "the same product on a laptop", /Aarav/);
await progress(
  d,
  "05-progress-web",
  "PRD 4.4 — fluency, Proof of Progress, mastery",
);

await d.goto(`${base}/settings/plans`, { waitUntil: "networkidle" });
await shot(d, "06-plans", "PRD 5 — the three plans", /Family Annual/);

await d.goto(`${base}/settings/privacy`, { waitUntil: "networkidle" });
await shot(
  d,
  "07-privacy",
  "PRD 7 — COPPA/DPDP, export and delete",
  /What ParentAI holds/,
);

// ---- The capture screen, which is where a session starts ----------------
// On the phone: the form is a single narrow column, so a desktop capture is
// mostly empty page.
await p.goto(base, { waitUntil: "networkidle" });
await p.waitForFunction(
  () => /Aarav/.test(document.body.innerText || ""),
  null,
  { timeout: 30000 },
);
await p
  .getByRole("button", { name: /Plan tonight's session/i })
  .first()
  .click();
await shot(
  p,
  "08-capture",
  "PRD 4.1 — zero-prompting input",
  /What are we studying/,
);

// ---- Staff console, if a password was passed ----------------------------
if (STAFF_PASSWORD) {
  const a = await desktop.newPage();
  await a.goto(`${base}/admin`, { waitUntil: "networkidle" });
  await a.waitForTimeout(2000);
  await a.getByLabel("Work email").fill("admin@parentai.app");
  await a.locator('input[type="password"]').fill(STAFF_PASSWORD);
  await a.getByRole("button", { name: "Sign in" }).click();
  await shot(a, "09-admin", "the staff console", /Households/);
} else {
  console.log("\n  09-admin skipped — pass --staff-password to include it.");
}

await browser.close();
server.close();
console.log(`\n  ${shots.length} shots in tools/guide-shots/\n`);
