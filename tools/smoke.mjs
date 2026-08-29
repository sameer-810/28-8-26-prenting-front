/**
 * Browser smoke test for the web build.
 *
 * Runs the EXPORTED bundle against the live API, in a real browser, at two
 * viewport widths. A typecheck and a successful bundle prove the code compiles;
 * only this proves it renders, fetches, and lets a parent sign in.
 *
 *   node tools/smoke.mjs            # headless
 *   node tools/smoke.mjs --headed   # watch it
 */
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = 8099;
const HEADED = process.argv.includes("--headed");

const DEMO = { email: "demo.parent@parentai.app", password: "ParentAI-Demo-2026" };

const pass = [];
const fail = [];
function check(name, ok, detail = "") {
  (ok ? pass : fail).push(name);
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".ttf": "font/ttf", ".png": "image/png",
  ".ico": "image/x-icon", ".svg": "image/svg+xml",
};

/**
 * A static server that falls back to index.html.
 *
 * The app is a single-page build with real routes (/login, /progress), so a
 * deep link must serve the shell rather than 404 — the same rule any host
 * needs, which is why vercel.json carries the equivalent rewrite.
 */
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || "/").split("?")[0]);
      let file = path.join(DIST, url);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(DIST, "index.html");
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

const server = await serve();
const browser = await chromium.launch({ headless: !HEADED });

/** Console errors and failed requests are collected and asserted on at the end. */
const consoleErrors = [];
const failedRequests = [];

const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("requestfailed", (r) => failedRequests.push(`${r.method()} ${r.url()}`));

const base = `http://127.0.0.1:${PORT}`;

console.log("\n=== 1. The app boots ===");
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const bodyText = await page.evaluate(() => document.body.innerText || "");
check("renders something", Boolean(bodyText && bodyText.trim().length > 0));
check("lands on the sign-in screen", /Welcome back/i.test(bodyText || ""));
check("the brand panel renders on a wide viewport", /ParentAI/.test(bodyText || ""));

console.log("\n=== 2. Client-side validation ===");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(500);
const afterEmpty = await page.evaluate(() => document.body.innerText || "");
check(
  "an empty form is refused before any network call",
  /Enter your email|Enter your password/i.test(afterEmpty || ""),
);

console.log("\n=== 3. Wrong credentials ===");
await page.getByPlaceholder("you@example.com").fill(DEMO.email);
await page.locator('input[type="password"]').fill("definitely-not-the-password");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(2500);
const afterBad = await page.evaluate(() => document.body.innerText || "");
check(
  "a wrong password shows the server's message",
  /Incorrect email or password/i.test(afterBad || ""),
);

console.log("\n=== 4. Signing in ===");
await page.locator('input[type="password"]').fill(DEMO.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(4000);
const dash = await page.evaluate(() => document.body.innerText || "");
check("reaches the dashboard", /Good (morning|afternoon|evening)/i.test(dash || ""));
check("the seeded children render", /Aarav/.test(dash || "") && /Diya/.test(dash || ""));
check("real analytics reach the UI", /Sessions/i.test(dash || "") && /Best streak/i.test(dash || ""));
check(
  "the fluency band from the backend is shown",
  /Fluent|Proficient|Growing|Foundations/i.test(dash || ""),
  (dash || "").match(/(Fluent & Confident|Proficient|Growing|Building Foundations)/)?.[0],
);
check("the desktop sidebar is present at 1280px", /Progress/.test(dash || "") && /Settings/.test(dash || ""));

console.log("\n=== 5. Navigation and URLs ===");
await page.getByRole("tab", { name: "Progress" }).click();
await page.waitForTimeout(900);
check("the sidebar navigates", /Not built yet/i.test((await page.evaluate(() => document.body.innerText || "")) || ""));
check("the URL follows the section", page.url().includes("/progress"), page.url());

await page.goto(`${base}/children`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
check(
  "a deep link restores that section after a reload",
  page.url().includes("/children") && !/Welcome back/i.test((await page.evaluate(() => document.body.innerText || "")) || ""),
);

console.log("\n=== 6. The session survives a reload ===");
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const afterReload = await page.evaluate(() => document.body.innerText || "");
check(
  "still signed in after a full page reload",
  !/Welcome back/i.test(afterReload || "") && /Aarav/.test(afterReload || ""),
);

console.log("\n=== 7. Phone viewport ===");
const phone = await context.newPage();
phone.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
await phone.setViewportSize({ width: 390, height: 844 });
await phone.goto(base, { waitUntil: "networkidle" });
await phone.waitForTimeout(3000);
const phoneText = await phone.evaluate(() => document.body.innerText || "");
check("the phone layout renders the same data", /Aarav/.test(phoneText || ""));
const tabs = await phone.getByRole("tab").count();
check("the phone tab bar replaces the sidebar", tabs >= 4, `${tabs} tabs`);

console.log("\n=== 8. Console health ===");
/**
 * Expected noise is filtered by CAUSE, not by pattern-matching whatever showed
 * up — otherwise this assertion quietly stops meaning anything.
 *
 * The 401 is ours: step 3 deliberately signs in with a wrong password, and the
 * browser logs every 4xx to the console regardless of the app handling it.
 * Anything else is a genuine failure.
 */
const realErrors = consoleErrors.filter(
  (e) =>
    !/Download the React DevTools|deprecated|findDOMNode/i.test(e) &&
    !/status of 401/i.test(e),
);
check("no unexpected console errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
const realFailed = failedRequests.filter((r) => !r.includes("favicon"));
check("no failed requests", realFailed.length === 0, realFailed.slice(0, 3).join(" | "));

if (HEADED) await page.waitForTimeout(4000);
await browser.close();
server.close();

console.log("\n" + "=".repeat(58));
console.log(`PASSED ${pass.length} / ${pass.length + fail.length}`);
if (fail.length) console.log("FAILED:\n" + fail.map((f) => `  - ${f}`).join("\n"));
console.log("=".repeat(58));
process.exit(fail.length ? 1 : 0);
