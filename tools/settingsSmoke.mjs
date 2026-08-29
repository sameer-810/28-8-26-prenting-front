/**
 * Settings, billing, data rights — and an accessibility audit across the app.
 *
 *   node tools/settingsSmoke.mjs [--headed]
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

const browser = await chromium.launch({ headless: !HEADED });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
const base = `http://127.0.0.1:${PORT}`;
const body = () => page.evaluate(() => document.body.innerText || "");

console.log("\n=== 1. Sign in ===");
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.getByPlaceholder("you@example.com").fill(DEMO.email);
await page.locator('input[type="password"]').fill(DEMO.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(4000);
check("dashboard reached", /Aarav/.test(await body()));

console.log("\n=== 2. Settings ===");
await page.goto(`${base}/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
const settings = await body();
check("settings loads", /Your plan/.test(settings));
check("the plan state is explained in words", /Renews on|Free trial|subscription has ended|couldn't take/i.test(settings), settings.match(/(Renews on [^\n]+|Free trial[^\n]*)/)?.[0]);
check("the study window is editable", /When you study/.test(settings) && /From/.test(settings) && /Until/.test(settings));
check("reminder toggles are present", /Evening study nudge/.test(settings) && /Weekly summary/.test(settings));
check(
  "marketing email is separate from service email",
  /News about ParentAI/.test(settings) && /Off by default/.test(settings),
);

const switches = await page.getByRole("switch").count();
check("toggles expose a switch role", switches >= 4, `${switches} switches`);

console.log("\n=== 3. A toggle actually persists ===");
const weekly = page.getByRole("switch", { name: /Weekly summary/i });
const before = await weekly.getAttribute("aria-checked");
await weekly.click();
await page.waitForTimeout(2000);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(3000);
const after = await page.getByRole("switch", { name: /Weekly summary/i }).getAttribute("aria-checked");
check("a preference survives a reload", before !== after, `${before} → ${after}`);
// Put it back, so the demo household is left as it was found.
await page.getByRole("switch", { name: /Weekly summary/i }).click();
await page.waitForTimeout(1500);

console.log("\n=== 4. Plans and billing ===");
await page.goto(`${base}/settings/plans`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
const plans = await body();
check("all three paid plans are listed", /Basic Monthly/.test(plans) && /Family Annual/.test(plans) && /Family Plus/.test(plans));
check("prices come from the API, formatted for India", /₹499/.test(plans) && /₹4,999/.test(plans), plans.match(/₹[\d,]+/g)?.slice(0, 3).join(" "));
check("the current plan is marked", /Current/.test(plans));
check(
  "a plan too small for this family says so rather than hiding",
  /Covers 1 child — you have 2/.test(plans),
);
check(
  "payments being unconfigured is stated up front",
  /Payments aren't live yet/.test(plans),
);

console.log("\n=== 5. Data and privacy ===");
await page.goto(`${base}/settings/privacy`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
const privacy = await body();
check("what is held is listed plainly", /What ParentAI holds/.test(privacy));
check(
  "the no-child-contact-details guarantee is stated",
  /no accounts, no logins and no contact details/i.test(privacy),
);
check("the consent record is shown with its date and version", /YOUR CONSENT/.test(privacy) && /policy version/i.test(privacy));
check("deletion is owner-gated and explained", /Delete everything/.test(privacy) && /cannot be undone/i.test(privacy));

const exportDownload = page.waitForEvent("download", { timeout: 30000 });
await page.getByRole("button", { name: /Export everything/i }).click();
const exported = await exportDownload;
check("the data export downloads", exported.suggestedFilename().endsWith(".json"), exported.suggestedFilename());

console.log("\n=== 6. Deletion is guarded ===");
await page.getByRole("button", { name: /Delete my household/i }).click();
await page.waitForTimeout(700);
const deleteDisabled = await page
  .getByRole("button", { name: /Delete permanently/i })
  .isDisabled();
check("delete is disabled until the household name is typed", deleteDisabled);
await page.getByLabel(/Type "Sharma \(demo\)" to confirm/i).fill("wrong name");
await page.waitForTimeout(500);
check(
  "a wrong name keeps it disabled",
  await page.getByRole("button", { name: /Delete permanently/i }).isDisabled(),
);
await page.getByRole("button", { name: /Keep my data/i }).click();

console.log("\n=== 7. Account ===");
await page.goto(`${base}/settings/account`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const account = await body();
check("password change is offered", /Change your password/.test(account));
check("signed-in devices are listed", /Where you're signed in/.test(account));
check(
  "the consequence of changing a password is stated",
  /frees a slot|signed out/i.test(account),
);

console.log("\n=== 8. Accessibility audit ===");
/**
 * Walks the app's main screens and checks the things that actually lock
 * somebody out: an interactive element with no accessible name, an image with
 * no alternative, a heading structure that is missing, and whether the whole
 * app can be reached with a keyboard.
 */
const audited = [];
for (const [name, url] of [
  ["dashboard", base],
  ["progress", `${base}/progress`],
  ["children", `${base}/children`],
  ["settings", `${base}/settings`],
  ["plans", `${base}/settings/plans`],
  ["privacy", `${base}/settings/privacy`],
]) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  const report = await page.evaluate(() => {
    const interactive = Array.from(
      document.querySelectorAll(
        '[role="button"],[role="switch"],[role="tab"],[role="link"],[role="radio"],[role="checkbox"],button,a[href],input,textarea,select',
      ),
    );
    const nameless = interactive.filter((el) => {
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.getAttribute("placeholder") ||
        (el.textContent || "").trim();
      // Elements hidden from the accessibility tree do not need a name.
      const hidden =
        el.getAttribute("aria-hidden") === "true" ||
        el.closest('[aria-hidden="true"]') !== null;
      return !hidden && !label;
    });
    const imagesWithoutAlt = Array.from(document.querySelectorAll("img")).filter(
      (i) => !i.getAttribute("alt") && i.getAttribute("role") !== "presentation",
    );

    /**
     * A role that carries STATE must expose it.
     *
     * React Native Web does not map `accessibilityState` onto a Pressable, so a
     * `role="switch"` shipped with no `aria-checked` — announced as a switch
     * with no indication of on or off, which is worse than having no role at
     * all. The name audit above could not see it, so this checks separately.
     */
    const statefulRoles = { switch: "aria-checked", checkbox: "aria-checked", radio: "aria-checked", tab: "aria-selected" };
    const stateless = Array.from(document.querySelectorAll('[role="switch"],[role="checkbox"],[role="radio"],[role="tab"]')).filter(
      (el) => el.getAttribute(statefulRoles[el.getAttribute("role")]) === null,
    );

    return {
      interactive: interactive.length,
      nameless: nameless.length,
      namelessTags: nameless.slice(0, 3).map((e) => e.tagName + (e.getAttribute("role") ? `[${e.getAttribute("role")}]` : "")),
      imagesWithoutAlt: imagesWithoutAlt.length,
      stateless: stateless.length,
      statelessRoles: [...new Set(stateless.map((e) => e.getAttribute("role")))],
    };
  });
  audited.push({ name, ...report });
}

const totalNameless = audited.reduce((s, a) => s + a.nameless, 0);
const totalInteractive = audited.reduce((s, a) => s + a.interactive, 0);
check(
  "every interactive element has an accessible name",
  totalNameless === 0,
  totalNameless === 0
    ? `${totalInteractive} elements checked across ${audited.length} screens`
    : audited.filter((a) => a.nameless).map((a) => `${a.name}: ${a.nameless} (${a.namelessTags.join(", ")})`).join(" | "),
);
check(
  "no images without alternative text",
  audited.every((a) => a.imagesWithoutAlt === 0),
);

const totalStateless = audited.reduce((s, a) => s + a.stateless, 0);
check(
  "switches, checkboxes, radios and tabs expose their state",
  totalStateless === 0,
  totalStateless === 0
    ? "aria-checked / aria-selected present on every stateful role"
    : audited.filter((a) => a.stateless).map((a) => `${a.name}: ${a.stateless} ${a.statelessRoles.join(",")}`).join(" | "),
);

console.log("\n=== 9. Keyboard navigation ===");
await page.goto(`${base}/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(2600);
const reachable = await page.evaluate(async () => {
  const seen = new Set();
  for (let i = 0; i < 40; i += 1) {
    const el = document.activeElement;
    if (el && el !== document.body) seen.add(el.getAttribute("aria-label") || el.tagName);
    // Tab is dispatched by Playwright below; this only samples focus.
    break;
  }
  return seen.size;
});
let focusable = 0;
for (let i = 0; i < 25; i += 1) {
  await page.keyboard.press("Tab");
  const label = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    return el.getAttribute("aria-label") || el.tagName;
  });
  if (label) focusable += 1;
}
check("the settings screen is reachable by keyboard", focusable >= 15, `${focusable} of 25 tab stops landed on something focusable`);

console.log("\n=== 10. Reduced motion ===");
const rm = await ctx.newPage();
await rm.emulateMedia({ reducedMotion: "reduce" });
await rm.goto(base, { waitUntil: "networkidle" });
await rm.waitForTimeout(3000);
const rmText = await rm.evaluate(() => document.body.innerText || "");
check("the app renders normally under prefers-reduced-motion", /Aarav/.test(rmText));

console.log("\n=== 11. Console health ===");
const real = consoleErrors.filter(
  (e) => !/Download the React DevTools|deprecated|findDOMNode|status of 40[139]/i.test(e),
);
check("no unexpected console errors", real.length === 0, real.slice(0, 2).join(" | "));

if (HEADED) await page.waitForTimeout(4000);
await browser.close();
server.close();

console.log("\n" + "=".repeat(62));
console.log(`PASSED ${pass.length} / ${pass.length + fail.length}`);
if (fail.length) console.log("FAILED:\n" + fail.map((f) => `  - ${f}`).join("\n"));
console.log("=".repeat(62));
process.exit(fail.length ? 1 : 0);
