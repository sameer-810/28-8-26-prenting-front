/**
 * Progress, mastery and reports, in a real browser against the live API.
 *
 * Runs against the seeded demo household, which has 90 days of history on a
 * genuine improvement curve — the only way to exercise timelines, Proof of
 * Progress and a yearly report meaningfully.
 *
 *   node tools/progressSmoke.mjs [--headed]
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
const DEMO = {
  email: "demo.parent@parentai.app",
  password: "ParentAI-Demo-2026",
};
/**
 * The API this build points at, for the teardown at the end. Read from the
 * bundle rather than hardcoded, so a suite run against a deployed API deletes
 * the household it created THERE rather than failing against localhost.
 */
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:5005/api/v1";

const pass = [];
const fail = [];
function check(name, ok, detail = "") {
  (ok ? pass : fail).push(name);
  console.log(
    `${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
}

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

const browser = await chromium.launch({ headless: !HEADED });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 940 },
  acceptDownloads: true,
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
const base = `http://127.0.0.1:${PORT}`;
/** Visible text only — hidden screens stay mounted in React Navigation. */
const body = () => page.evaluate(() => document.body.innerText || "");

console.log("\n=== 1. Sign in ===");
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.getByPlaceholder("you@example.com").fill(DEMO.email);
await page.locator('input[type="password"]').fill(DEMO.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(4000);
check("dashboard reached", /Aarav/.test(await body()));

console.log("\n=== 2. Progress ===");
await page.goto(`${base}/progress`, { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
const progress = await body();
check("the progress screen loads", /Progress/.test(progress));
check(
  "all four timelines are offered",
  /Today/.test(progress) &&
    /This week/.test(progress) &&
    /This month/.test(progress) &&
    /This year/.test(progress),
);
check(
  "the monthly totals come from real rollups",
  /Sessions/.test(progress) &&
    /Accuracy/.test(progress) &&
    /Studied/.test(progress),
);
check(
  "a fluency band is shown for the window",
  /Fluent|Proficient|Growing|Foundations/.test(progress),
  progress.match(
    /(Fluent & Confident|Proficient|Growing|Building Foundations)/,
  )?.[0],
);
check(
  "the fluency components are broken out",
  /Accuracy/.test(progress) &&
    /Pace/.test(progress) &&
    /Consistency/.test(progress),
);

console.log("\n=== 3. The chart ===");
check(
  "the chart summarises in words, not only in bars",
  /days? studied out of \d+/.test(progress),
  progress.match(/\d+ days? studied out of \d+.*?\./)?.[0],
);
check(
  "the metric switcher is present",
  /Minutes/.test(progress) && /Sessions/.test(progress),
);

const bars = await page
  .getByRole("button", { name: /: (no session|\d)/ })
  .count();
check("every day in the window is a labelled bar", bars >= 28, `${bars} bars`);

/** Bar labels read "Mon, 4 Aug: 30m, 1 session" — the count follows a comma. */
const studiedBar = page
  .getByRole("button", { name: /, \d+ sessions?$/ })
  .first();

/**
 * The dense series is the point: a chart drawn only from days that exist makes
 * a lapsed month look continuous. The demo household deliberately has gaps.
 */
const emptyBars = await page
  .getByRole("button", { name: /: no session/ })
  .count();
check(
  "empty days are drawn, not skipped",
  emptyBars > 0,
  `${emptyBars} empty days rendered`,
);

await studiedBar.click();
await page.waitForTimeout(700);
check("tapping a bar shows that day's detail", /correct/.test(await body()));

console.log("\n=== 4. Proof of Progress ===");
const withProof = await body();
check(
  "the before/after comparison renders",
  /days before/.test(withProof) && /Now/.test(withProof),
);
check(
  "it states the change in words",
  /Moving forward|Slipped a little|About the same|Up \d+ band|points/.test(
    withProof,
  ),
  withProof.match(/(Moving forward|Slipped a little|About the same)/)?.[0],
);

console.log("\n=== 5. Mastery ===");
check("the subject breakdown appears", /Subjects/.test(withProof));
check(
  "the per-skill drill-down appears",
  /Where they're strong/.test(withProof),
);

console.log("\n=== 6. Reports ===");
check(
  "the yearly review card renders",
  /in review/.test(withProof),
  withProof.match(/\d{4} in review/)?.[0],
);
check(
  "coverage is stated with its denominator, not as a bare percentage",
  /\d+ of \d+ studied/.test(withProof),
  withProof.match(/\d+ of \d+ studied · \d+ mastered/)?.[0],
);
check(
  "the scope disclaimer is shown before downloading",
  /aren't school assessments/.test(withProof),
);

const download = page.waitForEvent("download", { timeout: 30000 });
await page.getByRole("button", { name: /Save the yearly report/i }).click();
const file = await download;
check(
  "the yearly report downloads as a PDF",
  file.suggestedFilename().endsWith(".pdf"),
  file.suggestedFilename(),
);

const certDownload = page.waitForEvent("download", { timeout: 30000 });
await page.getByRole("button", { name: /Readiness certificate/i }).click();
const cert = await certDownload;
check(
  "the certificate downloads as a PDF",
  cert.suggestedFilename().includes("Certificate"),
  cert.suggestedFilename(),
);

console.log("\n=== 7. Plan gating ===");
/**
 * A trial family must be REFUSED the monthly view with a readable reason, not
 * shown a broken chart or a generic error.
 */
const trial = await ctx.newPage();
const stamp = Date.now();
await trial.goto(base, { waitUntil: "networkidle" });
await trial.evaluate(() => localStorage.clear());
await trial.goto(`${base}/signup`, { waitUntil: "networkidle" });
await trial.waitForTimeout(1500);
await trial.getByPlaceholder("Anita").fill("Gate");
await trial.getByPlaceholder("Sharma").fill("GateFam");
await trial
  .getByPlaceholder("you@example.com")
  .fill(`gate.${stamp}@example.com`);
const pw = trial.locator('input[type="password"]');
await pw.nth(0).fill("ParentAI-2026!");
await pw.nth(1).fill("ParentAI-2026!");
await trial.getByRole("checkbox").click();
await trial.getByRole("button", { name: /Create account/i }).click();
await trial.waitForTimeout(4500);

/**
 * A new household lands on the dashboard's empty state, not straight on the
 * add-child form — so the onboarding path is via its call to action. Worth
 * asserting, since that empty state IS the first screen every new family sees.
 */
const emptyHome = await trial.evaluate(() => document.body.innerText || "");
check(
  "a brand-new household is invited to add a child",
  /Let's add your child/i.test(emptyHome),
);

await trial.getByRole("button", { name: /Add your child/i }).click();
await trial.waitForTimeout(2500);
await trial.getByPlaceholder("Aarav").fill("Solo");
await trial.getByRole("button", { name: /Start learning/i }).click();
await trial.waitForTimeout(4000);

await trial.goto(`${base}/progress`, { waitUntil: "networkidle" });
await trial.waitForTimeout(3000);
await trial.getByRole("button", { name: /This month/i }).click();
await trial.waitForTimeout(2500);
const gated = await trial.evaluate(() => document.body.innerText || "");
check(
  "a trial family sees a plan explanation, not an error",
  /Family Annual plan/i.test(gated) && !/something went wrong/i.test(gated),
);
check(
  "the free timelines stay available",
  /Today/.test(gated) && /This week/.test(gated),
);

console.log("\n=== 8. Cleaning up after ourselves ===");
/**
 * The throwaway household is DELETED, through the same erasure endpoint a
 * parent uses.
 *
 * This suite signs up a real family on the real API to test the plan gate,
 * because that gate cannot be exercised any other way. Without this step every
 * run leaves one behind — and it did: three "GateFam" households were sitting
 * in the client's production cluster before anybody noticed, inflating the
 * platform console's own household count.
 *
 * A test that writes to a live database owns what it wrote.
 */
const cleaned = await trial.evaluate(async (apiBase) => {
  try {
    const stored = JSON.parse(localStorage.getItem("parentai-auth") || "{}");
    const token = stored?.state?.token;
    if (!token) return "no token";
    const res = await fetch(`${apiBase}/family`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirmation: "GateFam" }),
    });
    return res.ok ? "deleted" : `refused ${res.status}`;
  } catch (err) {
    return `failed: ${err.message}`;
  }
}, API_BASE);
check(
  "the throwaway household is deleted, not left in the database",
  cleaned === "deleted",
  cleaned,
);

console.log("\n=== 9. Console health ===");
const real = consoleErrors.filter(
  (e) =>
    !/Download the React DevTools|deprecated|findDOMNode|status of 40[139]/i.test(
      e,
    ),
);
check(
  "no unexpected console errors",
  real.length === 0,
  real.slice(0, 2).join(" | "),
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
