/**
 * Browser test for the platform console at /admin.
 *
 *   node tools/adminSmoke.mjs --password '…'
 *   node tools/adminSmoke.mjs --headed
 *
 * Set a staff password first:
 *   cd ../28-8-26-prenting-back
 *   npm run seed:admin -- --email admin@parentai.app --reset-password
 *
 * It asserts on what is on screen and, just as deliberately, on what is NOT:
 * that the console never shows a child's session content, and that the parent
 * session and the staff session cannot see each other. Both are enforced by the
 * server; both are checked here anyway, because a promise about a minor's data
 * is worth verifying from both ends.
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

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const ADMIN = {
  email: arg("email", process.env.ADMIN_EMAIL || "admin@parentai.app"),
  password: arg("password", process.env.ADMIN_PASSWORD || ""),
};
const PARENT = {
  email: "demo.parent@parentai.app",
  password: "ParentAI-Demo-2026",
};

if (!ADMIN.password) {
  console.error(
    "\nA staff password is required.\n" +
      "  node tools/adminSmoke.mjs --password '…'\n\n" +
      "Set one with:\n" +
      "  cd ../28-8-26-prenting-back && npm run seed:admin -- --email " +
      ADMIN.email +
      " --reset-password\n",
  );
  process.exit(1);
}

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
  viewport: { width: 1280, height: 1000 },
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
const base = `http://127.0.0.1:${PORT}`;

/**
 * The text a screen reader would reach — skipping anything hidden from the
 * accessibility tree. See tools/smoke.mjs for why `innerText` is not enough
 * once more than one screen is mounted at a time.
 */
const sceneText = () =>
  page.evaluate(() => {
    const out = [];
    const walk = (el) => {
      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const t = (child.nodeValue || "").trim();
          if (t) out.push(t);
          continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        if (child.getAttribute("aria-hidden") === "true") continue;
        const cs = getComputedStyle(child);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        walk(child);
      }
    };
    walk(document.body);
    return out.join("\n");
  });

console.log("\n=== 1. /admin is the staff door, not the parent one ===");
await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
await page.waitForTimeout(1800);
const door = await sceneText();
check("the staff login renders", /Platform console/.test(door));
check(
  "it says plainly this is not the parent sign-in",
  /not the parent sign-in/i.test(door),
);
check(
  "no platform data before signing in",
  !/Households|Entitled MRR/.test(door),
);
check(
  "the absence of a password reset is stated rather than hinted",
  /no password reset/i.test(door),
);

console.log("\n=== 2. A wrong password is refused ===");
await page.getByLabel("Work email").fill(ADMIN.email);
await page.locator('input[type="password"]').fill("definitely-not-it");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(2000);
check(
  "a wrong password shows the server's message",
  /Could not sign in/i.test(await sceneText()),
);

console.log("\n=== 3. Signing in ===");
await page.locator('input[type="password"]').fill(ADMIN.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(4000);
const overview = await sceneText();
check("reaches the overview", /Overview/.test(overview));
check(
  "the signed-in staff member and their role are shown",
  /superadmin|support/.test(overview),
);
check(
  "household, child and parent counts render",
  /Households/.test(overview) &&
    /Children/.test(overview) &&
    /Parents/.test(overview),
);
check(
  "entitled MRR is labelled as entitlement, not revenue",
  /Entitled MRR/.test(overview) && /not cash received/i.test(overview),
  overview.match(/₹[\d,]+/)?.[0],
);
check(
  "AI health is broken down per operation",
  /concept/.test(overview) && /degraded/i.test(overview),
);
check(
  "what 'degraded' means is spelled out, not left as a number",
  /template plan instead of a generated one/i.test(overview),
);

console.log("\n=== 4. Households ===");
await page.getByRole("tab", { name: "Households" }).click();
await page.waitForTimeout(2500);
const families = await sceneText();
check("the household list loads", /Open one to see its health/.test(families));
check("the demo household is listed", /Sharma/.test(families));
check(
  "each row carries its plan and subscription state",
  /Free Trial|Family Annual|Basic Monthly|Family Plus/.test(families),
);

console.log("\n=== 5. Filtering ===");
await page.getByLabel("Search by household name").fill("Sharma");
await page.getByRole("button", { name: "Apply filters" }).click();
await page.waitForTimeout(2500);
const filtered = await sceneText();
check(
  "search narrows the list",
  /Sharma/.test(filtered) && !/GateFam/.test(filtered),
);

console.log("\n=== 6. One household in detail ===");
await page
  .getByRole("button", { name: /^Sharma/ })
  .first()
  .click();
await page.waitForTimeout(3000);
const detail = await sceneText();
check("the household opens", /Sessions done/.test(detail));
check(
  "the URL follows the household",
  /\/admin\/households\//.test(page.url()),
  page.url(),
);
check(
  "children are listed with their progress",
  /Children/.test(detail) && /streak/i.test(detail),
);
check("parents are listed", /Parents/.test(detail) && /@/.test(detail));
check(
  "the consent record is shown",
  /Consent/.test(detail) && /policy version/i.test(detail),
);
check(
  "the AI degradation rate is derived, not blank or wrong",
  /AI degraded/.test(detail) && !/undefined|NaN/.test(detail),
  detail.match(/AI degraded[^\n]*\n[^\n]*/)?.[0]?.replace(/\s+/g, " "),
);
check(
  "the no-session-content guarantee is stated on the screen",
  /No session content, teaching scripts or answers/i.test(detail),
);

/**
 * The guarantee, checked rather than trusted. If somebody ever widens the
 * `familyDetail` payload "to help support", this fails.
 */
check(
  "and no session content is actually present",
  !/workedExample|read aloud|Question \d+ of|The correct answer/i.test(detail),
);

console.log("\n=== 7. Write controls are gated by role ===");
const role = await page.evaluate(() => {
  try {
    return (
      JSON.parse(sessionStorage.getItem("parentai-admin") || "{}")?.state?.admin
        ?.role || null
    );
  } catch {
    return null;
  }
});
check(
  "the staff role is readable from the session",
  Boolean(role),
  role || "none",
);

if (role === "superadmin") {
  check(
    "a superadmin sees the plan controls",
    /Superadmin actions/.test(detail),
  );
  check(
    "a reason is required alongside a plan change",
    /Reason \(recorded/.test(detail),
  );

  await page.getByRole("button", { name: "Change plan" }).click();
  await page.waitForTimeout(1200);
  check(
    "a plan change with no reason is refused before any request",
    /Say why this plan is being changed/.test(await sceneText()),
  );

  await page.getByRole("button", { name: "Disable household" }).click();
  await page.waitForTimeout(1000);
  check(
    "disabling also demands a reason first",
    /Say why/.test(await sceneText()),
  );
} else {
  check(
    "a support account does not see the plan controls",
    !/Superadmin actions/.test(detail),
  );
  check("and is told why", /restricted to superadmins/i.test(detail));
}

console.log("\n=== 8. Curriculum coverage ===");
await page.getByRole("tab", { name: "Curriculum" }).click();
await page.waitForTimeout(3000);
const curriculum = await sceneText();
check("coverage loads grouped by board", /CBSE/.test(curriculum));
check(
  "a total is stated",
  /active topics/.test(curriculum),
  curriculum.match(/[\d,]+ active topics/)?.[0],
);
check(
  "the consequence of a gap is explained, not just its number",
  /no confident topic match/i.test(curriculum),
);

console.log("\n=== 9. Staff ===");
await page.getByRole("tab", { name: "Staff" }).click();
await page.waitForTimeout(2500);
const staff = await sceneText();
check(
  "staff accounts are listed with their roles",
  /superadmin|support/.test(staff),
);
check(
  "who can open the console is visible to every staff member",
  /Who can open this console/i.test(staff),
);
if (role === "superadmin") {
  check("a superadmin can add an account", /Add a staff account/.test(staff));
  check("the role defaults to support, not superadmin", /Support/.test(staff));
}

console.log("\n=== 10. The two sessions do not see each other ===");
/**
 * The core claim of putting the console in this codebase: a parent signing in
 * does not become staff, and a staff session does not leak into the family app.
 */
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const asParent = await sceneText();
check(
  "the parent app is unaffected by the staff session",
  /Welcome back|Good (morning|afternoon|evening)/i.test(asParent),
);

await page.getByPlaceholder("you@example.com").fill(PARENT.email);
await page.locator('input[type="password"]').fill(PARENT.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(4000);
check("a parent can sign in normally", /Aarav/.test(await sceneText()));

const parentSeesAdmin = await page.evaluate(() => {
  try {
    return Boolean(localStorage.getItem("parentai-admin"));
  } catch {
    return false;
  }
});
check("the staff token is never written to localStorage", !parentSeesAdmin);

console.log("\n=== 11. Signing out of the console ===");
await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
check(
  "staff session survived the detour through the parent app",
  /Overview|Households/.test(await sceneText()),
);

await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForTimeout(1500);
check(
  "signing out returns to the staff login",
  /not the parent sign-in/i.test(await sceneText()),
);

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
check(
  "and the parent stays signed in — the two sign-outs are independent",
  /Aarav/.test(await sceneText()),
);

console.log("\n=== 12. Console health ===");
const real = consoleErrors.filter(
  (e) =>
    !/Download the React DevTools|deprecated|findDOMNode|status of 40[13]/i.test(
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

console.log("\n" + "=".repeat(62));
console.log(`PASSED ${pass.length} / ${pass.length + fail.length}`);
if (fail.length)
  console.log("FAILED:\n" + fail.map((f) => `  - ${f}`).join("\n"));
console.log("=".repeat(62));
process.exit(fail.length ? 1 : 0);
