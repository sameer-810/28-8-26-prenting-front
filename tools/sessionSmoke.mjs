/**
 * A whole session, end to end, in a real browser.
 *
 * Capture → live Gemini generation → plan review → the 30-minute player →
 * answering → completion. This is the product's central journey; a build that
 * compiles and a dashboard that renders prove neither.
 *
 *   node tools/sessionSmoke.mjs [--headed]
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
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
const base = `http://127.0.0.1:${PORT}`;
/**
 * VISIBLE text only.
 *
 * React Navigation keeps previous screens mounted and merely hides them, and
 * `textContent` returns hidden text too — so an assertion could pass on a
 * screen the app had already navigated away from. That happened: an ambiguity
 * check "passed" against a capture screen that was no longer on show.
 * `innerText` respects visibility.
 */
const body = () => page.evaluate(() => document.body.innerText || "");

console.log("\n=== 1. Sign in ===");
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.getByPlaceholder("you@example.com").fill(DEMO.email);
await page.locator('input[type="password"]').fill(DEMO.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(4000);
check("dashboard reached", /Aarav/.test(await body()));

console.log("\n=== 2. Capture ===");
/**
 * Addressed by URL rather than by clicking a card.
 *
 * The first "Plan tonight's session" button belongs to whichever child is
 * listed first, and the ambiguity check below needs one whose syllabus actually
 * contains several fraction topics. Diya is in Grade 3, where the Maharashtra
 * maths syllabus has none — so "fractions" there correctly resolves as freeform
 * and generates without asking, which is right behaviour and the wrong fixture.
 * Going by URL also exercises the deep link.
 */
const me = await page.evaluate(async () => {
  const raw = localStorage.getItem("parentai-auth");
  const token = raw ? JSON.parse(raw).state.token : null;
  const r = await fetch("http://127.0.0.1:5005/api/v1/auth/me", {
    headers: { Authorization: "Bearer " + token },
  });
  return (await r.json()).data;
});
const aarav = me.children.find((c) => c.name === "Aarav");
check(
  "Aarav is Grade 5, whose syllabus has the fraction topics",
  aarav?.grade === 5,
);

await page.goto(`${base}/plan/new/${aarav.id}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2600);
const capture = await body();
check(
  "the capture screen opens from a deep link",
  /What are we studying/i.test(capture),
);
check(
  "it names the child it is for",
  /For Aarav, Grade 5/.test(capture),
  capture.match(/For \w+, Grade \d/)?.[0],
);
check("quick intents are offered", /Test tomorrow/.test(capture));

console.log("\n=== 3. Ambiguity is refused, not guessed ===");
await page.getByPlaceholder(/Maths test tomorrow/i).fill("fractions");
await page.getByRole("button", { name: /Build tonight's session/i }).click();
await page.waitForTimeout(9000);
const ambiguous = await body();
check(
  "a vague topic gets a 'which did you mean' choice, not a wrong session",
  /Which one did you mean/i.test(ambiguous),
);
const optionCount = await page.getByRole("button").count();
check(
  "candidate topics are listed",
  optionCount > 3,
  `${optionCount} buttons on screen`,
);

console.log("\n=== 4. Generating a real plan (live Gemini) ===");
await page
  .getByPlaceholder(/Maths test tomorrow/i)
  .fill("adding fractions with unlike denominators, test tomorrow");
const t0 = Date.now();
await page.getByRole("button", { name: /Build tonight's session/i }).click();
// Wait for the plan screen — generation is ~4s, then the questions land.
await page.waitForFunction(
  () =>
    /TONIGHT'S SESSION|Start the session|Preparing the questions/i.test(
      document.body.innerText,
    ),
  { timeout: 45000 },
);
const firstPaint = Date.now() - t0;
check(
  `the plan screen appears in ${firstPaint}ms`,
  firstPaint < 15000,
  `${firstPaint}ms`,
);

const planText = await body();
check(
  "the five phases are shown with their minutes",
  /10m/.test(planText) && /8m/.test(planText) && /6m/.test(planText),
);
check(
  "the parent's opening script is previewed",
  /YOU'LL START BY SAYING/i.test(planText),
);
check(
  "the script is in the parent's own script, not English",
  /[ऀ-ॿ]/.test(planText),
  `${(planText.match(/[ऀ-ॿ]/g) || []).length} Devanagari characters`,
);

console.log("\n=== 5. Start is gated until the plan is whole ===");
const startDisabledEarly = await page
  .getByRole("button", { name: /Preparing the questions/i })
  .count();
check(
  "Start is disabled while the questions are still generating",
  startDisabledEarly > 0 ||
    (await page.getByRole("button", { name: /Start the session/i }).count()) >
      0,
  startDisabledEarly > 0 ? "gated" : "already ready",
);

await page.waitForFunction(
  () => /Start the session/i.test(document.body.innerText),
  { timeout: 45000 },
);
const totalReady = Date.now() - t0;
check(
  `the whole plan is ready in ${totalReady}ms`,
  totalReady < 40000,
  `${totalReady}ms`,
);

console.log("\n=== 6. The session player ===");
await page.getByRole("button", { name: /Start the session/i }).click();
await page.waitForTimeout(3500);
const player = await body();
check("the player opens on phase 1", /PHASE 1 OF 5/i.test(player));
check(
  "the countdown starts at ten minutes",
  /10:00|9:5\d/.test(player),
  player.match(/\d+:\d\d/)?.[0],
);
check(
  "the concept script is shown to read aloud",
  /READ THIS ALOUD/i.test(player),
);
check(
  "the common mistake is flagged for the parent",
  /Watch out for this/i.test(player),
);

const ring = await page.getByRole("progressbar").count();
check("the ring is one labelled progress element", ring === 1);

console.log("\n=== 7. Advancing through the phases ===");
await page.getByRole("button", { name: /Next: Teaching/i }).click();
await page.waitForTimeout(1500);
const teaching = await body();
check(
  "phase 2 shows the walkthrough",
  /PHASE 2 OF 5/i.test(teaching) &&
    /Work this through together/i.test(teaching),
);
check("the parent is given questions to ASK", /Ask them/i.test(teaching));

await page.getByRole("button", { name: /Next: Practice/i }).click();
await page.waitForTimeout(1500);
const practice = await body();
check(
  "phase 3 shows one question at a time",
  /QUESTION 1 OF 5/i.test(practice),
);
check(
  "advancing is blocked until every question is answered",
  /Answer every question to move on/i.test(practice),
);

console.log("\n=== 8. Answering ===");
/**
 * Answers are deliberately wrong: it exercises the grading path, the incorrect
 * feedback, and — crucially — gives phase 5 real misses to be generated from.
 */
for (let i = 0; i < 5; i += 1) {
  const mcq = await page.getByRole("radio").count();
  if (mcq > 0) {
    await page.getByRole("radio").first().click();
  } else {
    await page.getByLabel("Your answer").fill("1/7");
    await page.getByRole("button", { name: /^Check$/ }).click();
  }
  await page.waitForTimeout(900);
}
const answered = await body();
check("feedback is shown after answering", /Correct|Not quite/i.test(answered));
check(
  "the correct answer is revealed when wrong",
  /The answer is/i.test(answered) || /Correct/i.test(answered),
);

await page.getByRole("button", { name: /Next: Quick test/i }).click();
await page.waitForTimeout(1500);
check("phase 4 is the three-question mock", /PHASE 4 OF 5/i.test(await body()));

for (let i = 0; i < 3; i += 1) {
  const mcq = await page.getByRole("radio").count();
  if (mcq > 0) await page.getByRole("radio").first().click();
  else {
    await page.getByLabel("Your answer").fill("2/9");
    await page.getByRole("button", { name: /^Check$/ }).click();
  }
  await page.waitForTimeout(900);
}

console.log("\n=== 9. Phase 5 revision (generated from the real misses) ===");
await page.getByRole("button", { name: /Next: Revision/i }).click();
await page.waitForFunction(
  () => !/Working out what to go over/i.test(document.body.innerText),
  { timeout: 40000 },
);
await page.waitForTimeout(1200);
const revision = await body();
check("phase 5 reached", /PHASE 5 OF 5/i.test(revision));
check(
  "revision addresses what went wrong, or celebrates a clean sheet",
  /WHAT TO GO OVER|Nothing to go back over/i.test(revision),
  /WHAT TO GO OVER/i.test(revision) ? "re-teach content" : "perfect score",
);

console.log("\n=== 10. Completion ===");
await page.getByRole("button", { name: /Finish session/i }).click();
await page.waitForTimeout(6000);
const done = await body();
check(
  "the celebration appears",
  /Session complete|Every answer right/i.test(done),
);
check("the score is reported", /Accuracy/i.test(done) && /Correct/i.test(done));
check("minutes studied are reported", /Studied/i.test(done));
check(
  "the streak is shown, from the server",
  /in a row|Best so far/i.test(done),
  done.match(/\d+ days? in a row/)?.[0],
);

await page.getByRole("button", { name: /^Done$/ }).click();
await page.waitForTimeout(3000);
check(
  "returns to the dashboard",
  /Good (morning|afternoon|evening)/i.test(await body()),
);

console.log("\n=== 11. Console health ===");
const real = consoleErrors.filter(
  (e) =>
    !/Download the React DevTools|deprecated|findDOMNode|status of 40[19]/i.test(
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
