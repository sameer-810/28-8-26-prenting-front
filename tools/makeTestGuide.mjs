/**
 * Builds the client test guide as a PDF.
 *
 *   node tools/makeTestGuide.mjs
 *   → ../ParentAI-Test-Guide.pdf
 *
 * HTML rendered through Playwright's Chromium rather than PDFKit: this is a
 * document a client reads, so it needs real typography and page breaks, and the
 * product's own type and colour make it look like the thing it describes.
 *
 * The URLs and credentials live in ONE object at the top. Change them there.
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(ROOT, "..", "ParentAI-Test-Guide.pdf");

const CFG = {
  version: "1.0",
  date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
  api: "https://two8-8-26-prenting-back.onrender.com",
  /** Not deployed yet — see the "Before you start" section. */
  web: null,
  parent: { email: "demo.parent@parentai.app", password: "ParentAI-Demo-2026" },
  staff: { email: "admin@parentai.app" },
};

const webUrl = CFG.web || "(not deployed yet — see §1)";

const css = `
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Inter, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #1F1C17; font-size: 10.5pt; line-height: 1.55; margin: 0;
  }
  h1, h2, h3 { font-family: Fraunces, Georgia, serif; letter-spacing: -0.01em; }

  .cover {
    height: 247mm; display: flex; flex-direction: column; justify-content: center;
    page-break-after: always; background: linear-gradient(160deg,#F2F8EF,#FFFDF9 60%);
    margin: -16mm -15mm 0; padding: 0 22mm;
  }
  .cover h1 { font-size: 40pt; margin: 0 0 6mm; color: #1B2A18; }
  .cover .sub { font-size: 14pt; color: #3B372F; max-width: 120mm; }
  .cover .meta { margin-top: 16mm; font-size: 10pt; color: #6B6559; }
  .mark { width: 46px; height: 46px; margin-bottom: 10mm; }

  h2 {
    font-size: 17pt; margin: 10mm 0 3mm; color: #263D22;
    padding-bottom: 2mm; border-bottom: 1.5px solid #DED8CA;
    page-break-after: avoid;
  }
  h3 { font-size: 12pt; margin: 6mm 0 2mm; color: #375A31; page-break-after: avoid; }
  p { margin: 0 0 3mm; }
  ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
  li { margin-bottom: 1.5mm; }

  code {
    font-family: "SF Mono", Consolas, monospace; font-size: 9pt;
    background: #EDE9DF; padding: 0.5mm 1.5mm; border-radius: 2px;
  }
  table { width: 100%; border-collapse: collapse; margin: 0 0 4mm; font-size: 9.5pt; }
  th, td { border: 1px solid #DED8CA; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
  th { background: #F2F8EF; font-weight: 600; }

  .box { border-radius: 3mm; padding: 3.5mm 4mm; margin: 0 0 4mm; page-break-inside: avoid; }
  .warn { background: #FBF0DA; border-left: 3px solid #8A5A11; }
  .info { background: #E5EEF5; border-left: 3px solid #2C5F86; }
  .good { background: #E4F0DF; border-left: 3px solid #356B2B; }
  .box p:last-child { margin-bottom: 0; }
  .box strong { color: #1F1C17; }

  /* A checkbox per step, so the client can work down the page. */
  .steps { list-style: none; padding-left: 0; counter-reset: s; }
  .steps li {
    position: relative; padding-left: 11mm; margin-bottom: 3mm;
    page-break-inside: avoid;
  }
  .steps li::before {
    content: ""; position: absolute; left: 0; top: 0.6mm;
    width: 4.5mm; height: 4.5mm; border: 1.2px solid #928B7C; border-radius: 1mm;
  }
  .steps li::after {
    counter-increment: s; content: counter(s);
    position: absolute; left: 6mm; top: 0; font-weight: 600; color: #375A31;
  }
  .expect { display: block; color: #6B6559; font-size: 9.5pt; margin-top: 0.8mm; }
  .expect b { color: #356B2B; font-weight: 600; }

  .section { page-break-inside: avoid; }
  footer {
    margin-top: 10mm; padding-top: 3mm; border-top: 1px solid #DED8CA;
    font-size: 9pt; color: #6B6559;
  }
`;

const mark = `<svg class="mark" viewBox="8.5 9.5 15 15" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 22c0-7 5-12 14-12 0 9-5 13-11 13-1.1 0-2-.4-3-1z" fill="#4A7740"/>
  <path d="M10 23c3-4 6-6 9-7" stroke="#E4F0DF" stroke-width="1.4" stroke-linecap="round" fill="none"/>
</svg>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400&display=swap" rel="stylesheet"/>
<style>${css}</style></head><body>

<div class="cover">
  ${mark}
  <h1>ParentAI<br/>Test Guide</h1>
  <p class="sub">Everything to try, in the order that makes sense — on the web and on a phone.</p>
  <p class="meta">Version ${CFG.version} · ${CFG.date}<br/>Written for the client. No technical background assumed.</p>
</div>

<h2>1. Before you start</h2>

<div class="warn box">
  <p><strong>The web app is not deployed yet.</strong> There is no address to open in a
  browser. The API is live, the code is finished and tested, but nobody has pushed the
  web build to a host. That is a 10-minute job for your developer — until it is done,
  testing has to happen on a machine that runs the project locally.</p>
</div>

<div class="warn box">
  <p><strong>parentai.app is not yours.</strong> That domain currently serves somebody
  else's website. Any address in this guide using it is a placeholder. Decide on the real
  domain before launch — it also has to go into the Play Store listing and the privacy
  policy, so changing it later means resubmitting.</p>
</div>

<div class="info box">
  <p><strong>The first request each day is slow.</strong> The API sleeps when idle on its
  current hosting plan and takes <strong>up to a minute</strong> to wake. That is the
  hosting tier, not the product. If the first sign-in seems stuck, wait a minute and try
  again — everything after it is fast. A paid plan removes this.</p>
</div>

<h3>What is live right now</h3>
<table>
  <tr><th style="width:26%">Piece</th><th style="width:32%">Address</th><th>Status</th></tr>
  <tr><td>The API</td><td><code>${CFG.api}</code></td><td>Live and working</td></tr>
  <tr><td>Web app</td><td>${webUrl}</td><td>Built and tested; not hosted</td></tr>
  <tr><td>Android app</td><td>—</td><td>Build pipeline ready; no build made yet</td></tr>
  <tr><td>iOS app</td><td>—</td><td>Needs a Mac once, for signing</td></tr>
  <tr><td>Marketing site</td><td>—</td><td>Built; not hosted</td></tr>
</table>

<h3>Sign-in details</h3>
<table>
  <tr><th style="width:26%">For</th><th style="width:37%">Email</th><th>Password</th></tr>
  <tr><td>Demo family<br/><span class="expect">Three months of history</span></td>
      <td><code>${CFG.parent.email}</code></td><td><code>${CFG.parent.password}</code></td></tr>
  <tr><td>Staff console<br/><span class="expect">Ask your developer</span></td>
      <td><code>${CFG.staff.email}</code></td><td>Sent separately</td></tr>
</table>

<p>The demo family is called <strong>Sharma (demo)</strong> and has two children, Aarav and
Diya, with real study history behind them. Use it for anything about progress and reports.
For everything about first impressions, create your own account instead — it takes a minute
and shows you exactly what a new parent sees.</p>

<h2>2. Test as a brand-new parent</h2>
<p>This is the most valuable half hour you can spend. Do it first, on a phone-sized window
if you can, and notice anything that makes you hesitate.</p>

<ol class="steps">
  <li>Open the app and choose <strong>Create an account</strong>.
    <span class="expect">Expect: name, email, password, home language, and a privacy tick you cannot skip.</span></li>
  <li>Pick a home language that is <strong>not English</strong> — Hindi or Marathi.
    <span class="expect">This is the whole product. Picking English hides what you are paying for.</span></li>
  <li>Add a child. Give a name and a grade, and nothing else.
    <span class="expect"><b>Check:</b> board, school medium and subjects are filled in for you. You should not have to think.</span></li>
  <li>On the home screen, tap <strong>Plan tonight's session</strong>.</li>
  <li>Type what they are studying in your own words — <em>"fractions"</em>, or
      <em>"he's stuck on long division"</em>.
    <span class="expect"><b>Check:</b> it works out the topic without you knowing its official name.</span></li>
  <li>Wait for the plan. <strong>Time it.</strong>
    <span class="expect"><b>Check:</b> around four seconds. The promise is under four and a half.</span></li>
  <li>Read the plan preview, then tap <strong>Start the session</strong>.
    <span class="expect">If it says "Preparing the questions…", that is the rest of the plan still being written. A few more seconds.</span></li>
  <li>Read the phase-1 script out loud.
    <span class="expect"><b>Check this closely:</b> is it in your language, in the right script, and could you read it to a child without rehearsing?</span></li>
  <li>Work through all five phases. Answer some questions wrong on purpose.
    <span class="expect"><b>Check:</b> the last phase is built from what you got wrong, not a repeat.</span></li>
  <li>Finish, and look at the celebration screen.</li>
</ol>

<div class="good box">
  <p><strong>The one thing to judge hardest:</strong> the parent's script. Everything else
  is software anyone can build. Whether a parent who does not know the topic can pick this
  up and teach from it — in their own language, without preparing — is the product.</p>
</div>

<h2>3. Test the two-language display</h2>
<p>Two audiences on one screen is the central claim. It is worth checking on its own.</p>
<ol class="steps">
  <li>During a session, look at the teaching screen.
    <span class="expect"><b>Check:</b> your column and the child's column are clearly labelled, and stack readably on a phone.</span></li>
  <li>Read the Hindi or Marathi aloud.
    <span class="expect"><b>Check:</b> it reads like someone wrote it in that language, not like a translation from English.</span></li>
  <li>Look at the child's questions.
    <span class="expect"><b>Check:</b> they are in the school medium and phrased the way an exam would ask.</span></li>
  <li>Try Urdu on another child, if you read it.
    <span class="expect"><b>Check:</b> the column flips right-to-left while the English one does not.</span></li>
</ol>

<h2>4. Test progress and reports</h2>
<p>Sign in as the demo family — a new account has no history to show.</p>
<ol class="steps">
  <li>Open <strong>Progress</strong> and switch between Today, This week, This month and This year.
    <span class="expect">These are calendar periods. Early in a month, "This month" is genuinely short.</span></li>
  <li>Look at the day-by-day chart and tap a bar.
    <span class="expect"><b>Check:</b> days with no session are drawn as gaps, not skipped. A missed fortnight should look missed.</span></li>
  <li>Read the fluency rating and its three parts.
    <span class="expect"><b>Check:</b> does the wording match what the numbers say? It should never flatter.</span></li>
  <li>Find the before-and-after comparison.
    <span class="expect"><b>Check:</b> it says so plainly if a child has slipped.</span></li>
  <li>Download the yearly report and the readiness certificate.
    <span class="expect"><b>Check:</b> both open as PDFs and are something you would show a teacher.</span></li>
</ol>

<h2>5. Test what happens when things go wrong</h2>
<ol class="steps">
  <li>Start a session, then turn off wifi and mobile data mid-phase.
    <span class="expect"><b>Check:</b> the timer keeps running and answers still register. Nothing should be lost.</span></li>
  <li>Turn the network back on and finish.
    <span class="expect"><b>Check:</b> the session appears in Progress afterwards.</span></li>
  <li>Sign in with a deliberately wrong password.
    <span class="expect"><b>Check:</b> the message is clear and does not reveal whether the email exists.</span></li>
  <li>Ask for something nonsensical — <em>"asdfgh"</em>.
    <span class="expect"><b>Check:</b> it asks what you meant rather than inventing a lesson.</span></li>
</ol>

<h2>6. Test settings, billing and your data</h2>
<ol class="steps">
  <li><strong>Settings</strong> — change the study window and a reminder, then reload.
    <span class="expect"><b>Check:</b> the change survived.</span></li>
  <li>Open <strong>Plans</strong>.
    <span class="expect"><b>Check:</b> prices are correct, and a plan too small for your children says so instead of hiding.</span></li>
  <li>Open <strong>Data and privacy</strong> and tap <strong>Export everything</strong>.
    <span class="expect"><b>Check:</b> a file downloads with everything in it.</span></li>
  <li>Start the delete flow on a <em>throwaway</em> account, not the demo one.
    <span class="expect"><b>Check:</b> it makes you type the household name, and refuses a wrong one.</span></li>
</ol>

<div class="warn box">
  <p><strong>Payments are not live.</strong> There are no Razorpay keys yet, so nothing can
  be bought. The Plans screen says so on the screen rather than failing at the tap. This is
  the last thing to wire up before launch.</p>
</div>

<h2>7. Test the staff console</h2>
<p>Your own view of the business, at <code>/admin</code>. Separate password from a parent
account — one cannot be used for the other.</p>
<ol class="steps">
  <li>Sign in with the staff details.</li>
  <li>Read the <strong>Overview</strong>.
    <span class="expect"><b>The number that matters:</b> "AI degraded". Above about 5%, families are quietly getting generic lessons — it is invisible everywhere else.</span></li>
  <li>Open <strong>Households</strong>, search, and open one.
    <span class="expect"><b>Check:</b> you can see whether a family is healthy — and cannot read any child's schoolwork. That is on purpose.</span></li>
  <li>Look at <strong>Curriculum</strong>.
    <span class="expect"><b>Check:</b> any board with a missing grade is flagged. Families on it cannot be matched to a topic.</span></li>
</ol>

<h2>8. What is not finished</h2>
<p>Listed plainly so nothing surprises you.</p>
<table>
  <tr><th style="width:34%">What</th><th>Where it stands</th></tr>
  <tr><td>Payments</td><td>Written, never run against a live gateway. Needs Razorpay keys.</td></tr>
  <tr><td>Photograph the page</td><td>Labelled placeholder in the app. Typing and choosing a topic both work.</td></tr>
  <tr><td>Voice input</td><td>Not built. Typing works.</td></tr>
  <tr><td>Offline on a real phone</td><td>Built and unit-tested; not yet proven on a physical device.</td></tr>
  <tr><td>Web hosting</td><td>Not deployed.</td></tr>
  <tr><td>App store listings</td><td>Icons, graphics and screenshots generated. Nothing submitted.</td></tr>
  <tr><td>Error monitoring</td><td>None. You will hear about problems from families, not from a dashboard.</td></tr>
  <tr><td>Staging environment</td><td>None. One live API.</td></tr>
</table>

<h2>9. Reporting a problem</h2>
<p>The more of this you can give, the faster it is fixed.</p>
<ul>
  <li><strong>What you did</strong>, step by step, from signing in.</li>
  <li><strong>What you expected</strong>, and what happened instead.</li>
  <li><strong>A screenshot</strong> — worth more than a description.</li>
  <li><strong>Which device</strong>, and roughly what time.</li>
  <li>Which account: the demo family, or one you made.</li>
</ul>

<div class="info box">
  <p><strong>"You appear to be offline" while your internet is fine</strong> almost always
  means the API is asleep or the web address has not been added to its allowed list. Worth
  saying if you see it — it is a configuration fix, not a bug in the app.</p>
</div>

<footer>
  ParentAI — Test Guide v${CFG.version}, ${CFG.date}.<br/>
  The demo household is test data and should be removed before real families sign up.
</footer>

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

/**
 * `--preview` writes a PNG of the same HTML at A4 width.
 *
 * Headless Chromium DOWNLOADS a PDF rather than rendering it, so the output
 * cannot be checked by opening it. This renders the source instead, which is
 * what the PDF is made from.
 */
if (process.argv.includes("--preview")) {
  const shot = await browser.newPage({ viewport: { width: 794, height: 1400 } });
  await shot.setContent(html, { waitUntil: "networkidle" });
  await shot.evaluate(() => document.fonts.ready);
  await shot.waitForTimeout(400);
  await shot.screenshot({ path: path.join(ROOT, "_guide-preview.png"), fullPage: true });
  await shot.close();
  console.log("  preview: _guide-preview.png");
}
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;font-size:8pt;color:#928B7C;font-family:Inter,sans-serif;padding:0 15mm;text-align:right">' +
    'ParentAI Test Guide · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
});
await browser.close();

console.log(`\n  wrote ${path.relative(process.cwd(), OUT)}\n`);
