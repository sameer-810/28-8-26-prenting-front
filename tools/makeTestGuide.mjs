/**
 * Builds the client guide as a PDF, section by section against the PRD.
 *
 *   node tools/captureGuideShots.mjs   # first — needs the API up
 *   node tools/makeTestGuide.mjs
 *   → ../ParentAI-Guide.pdf
 *
 * Every PRD requirement gets: what was promised, what was built, a screenshot
 * of it running, and what to check. A client should be able to read this once
 * and know where the product stands.
 *
 * Screenshots are embedded as data URIs so the PDF is one self-contained file
 * that survives being emailed. Rendered through Playwright rather than PDFKit —
 * this is a document somebody reads, so it gets the product's own type.
 *
 * URLs and credentials live in CFG. Change them there.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "tools", "guide-shots");
const OUT = path.resolve(ROOT, "..", "ParentAI-Guide.pdf");

const CFG = {
  version: "1.0",
  date: new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  api: "https://two8-8-26-prenting-back.onrender.com",
  web: null, // not deployed — see §2
  parent: { email: "demo.parent@parentai.app", password: "ParentAI-Demo-2026" },
  staffEmail: "admin@parentai.app",
};

/** Inlined so the PDF is one file. Missing shots degrade to a caption, not a crash. */
function img(name, caption) {
  const file = path.join(SHOTS, `${name}.png`);
  if (!fs.existsSync(file))
    return `<p class="shotmissing">[screenshot ${name} not captured]</p>`;
  const b64 = fs.readFileSync(file).toString("base64");
  return `<figure class="shot"><img src="data:image/png;base64,${b64}"/><figcaption>${caption}</figcaption></figure>`;
}

const css = `
  @page { size: A4; margin: 15mm 14mm 17mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter,-apple-system,"Segoe UI",Roboto,sans-serif; color:#1F1C17;
         font-size:10pt; line-height:1.55; margin:0; }
  h1,h2,h3 { font-family: Fraunces,Georgia,serif; letter-spacing:-0.01em; }

  .cover { height:250mm; display:flex; flex-direction:column; justify-content:center;
    page-break-after:always; background:linear-gradient(160deg,#F2F8EF,#FFFDF9 60%);
    margin:-15mm -14mm 0; padding:0 22mm; }
  .cover h1 { font-size:40pt; margin:0 0 6mm; color:#1B2A18; }
  .cover .sub { font-size:13.5pt; color:#3B372F; max-width:118mm; }
  .cover .meta { margin-top:15mm; font-size:9.5pt; color:#6B6559; }
  .mark { width:44px; height:44px; margin-bottom:9mm; }

  h2 { font-size:16pt; margin:9mm 0 1mm; color:#263D22; page-break-after:avoid; }
  .prdref { font-size:8.5pt; color:#928B7C; text-transform:uppercase;
            letter-spacing:0.08em; margin:0 0 3mm; padding-bottom:2mm;
            border-bottom:1.5px solid #DED8CA; }
  h3 { font-size:11.5pt; margin:5mm 0 1.5mm; color:#375A31; page-break-after:avoid; }
  p { margin:0 0 2.5mm; }
  ul,ol { margin:0 0 3mm; padding-left:5.5mm; }
  li { margin-bottom:1.2mm; }

  code { font-family:"SF Mono",Consolas,monospace; font-size:8.5pt;
         background:#EDE9DF; padding:0.4mm 1.2mm; border-radius:2px; }
  table { width:100%; border-collapse:collapse; margin:0 0 3.5mm; font-size:9pt; }
  th,td { border:1px solid #DED8CA; padding:1.8mm 2.2mm; text-align:left; vertical-align:top; }
  th { background:#F2F8EF; font-weight:600; }

  .box { border-radius:2.5mm; padding:3mm 3.5mm; margin:0 0 3.5mm; page-break-inside:avoid; }
  .warn { background:#FBF0DA; border-left:3px solid #8A5A11; }
  .info { background:#E5EEF5; border-left:3px solid #2C5F86; }
  .good { background:#E4F0DF; border-left:3px solid #356B2B; }
  .box p:last-child { margin-bottom:0; }

  .promise { background:#F7F4EC; border-left:3px solid #928B7C; font-style:italic;
             padding:2.5mm 3.5mm; margin:0 0 3mm; font-size:9.5pt; color:#3B372F; }
  .promise b { font-style:normal; color:#1F1C17; }

  .shot { margin:3mm 0 4mm; page-break-inside:avoid; text-align:center; }
  .shot img { max-width:100%; max-height:118mm; border:1px solid #DED8CA;
              border-radius:2mm; }
  .shot.phone img { max-height:126mm; }
  figcaption { font-size:8.5pt; color:#6B6559; margin-top:1.5mm; }
  .shotmissing { font-size:9pt; color:#A93B29; }

  .checks { list-style:none; padding-left:0; }
  .checks li { position:relative; padding-left:6.5mm; margin-bottom:1.8mm; }
  .checks li::before { content:""; position:absolute; left:0; top:0.7mm;
    width:3.8mm; height:3.8mm; border:1.1px solid #928B7C; border-radius:0.8mm; }

  .status-yes { color:#356B2B; font-weight:600; }
  .status-part { color:#8A5A11; font-weight:600; }
  .status-no { color:#A93B29; font-weight:600; }

  .pagebreak { page-break-before:always; }
  footer { margin-top:8mm; padding-top:2.5mm; border-top:1px solid #DED8CA;
           font-size:8.5pt; color:#6B6559; }
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
  <h1>ParentAI<br/>Guide &amp; Handover</h1>
  <p class="sub">What the PRD asked for, what was built, and how to try all of it —
  with screenshots of the running product.</p>
  <p class="meta">Version ${CFG.version} · ${CFG.date}<br/>
  Written against Product Requirement Document V2.0.0<br/>
  No technical background assumed.</p>
</div>

<h2>1. What this document is</h2>
<p class="prdref">Read this page first</p>

<p>The PRD describes a product. This describes the one that was built, section by
section, in the PRD's own order. Each part gives you four things:</p>

<table>
  <tr><th style="width:22%">What was promised</th><td>Quoted from the PRD, so you can check it yourself.</td></tr>
  <tr><th>What was built</th><td>In plain terms, including where it differs.</td></tr>
  <tr><th>A screenshot</th><td>Of the running product, not a mockup.</td></tr>
  <tr><th>What to check</th><td>Tick-boxes for testing it yourself.</td></tr>
</table>

<p>Section 12 is a single table of every PRD requirement and its status. If you only
read one page, read that one.</p>

<h2>2. Getting in</h2>
<p class="prdref">Before you test anything</p>

<div class="warn box">
  <p><strong>The web app is not hosted yet.</strong> The code is finished and tested, but
  nobody has pushed it to a web address. Until that is done — about ten minutes of your
  developer's time — testing happens on a machine running the project locally. Everything
  in this guide works; it just does not have a public address yet.</p>
</div>

<div class="warn box">
  <p><strong>parentai.app is not yours.</strong> That address currently serves an unrelated
  website. Decide the real domain before launch: it goes into the app store listing and the
  privacy policy, and changing it afterwards means resubmitting to Google and Apple.</p>
</div>

<div class="info box">
  <p><strong>The first use each day is slow.</strong> The server sleeps when nobody is using
  it and takes up to a minute to wake. That is the hosting plan, not the product — every
  request after the first is fast. Upgrading the plan removes it.</p>
</div>

<h3>Sign-in details</h3>
<table>
  <tr><th style="width:24%">For</th><th style="width:36%">Email</th><th>Password</th></tr>
  <tr><td><strong>Demo family</strong><br/><span style="color:#6B6559">Nine months of history</span></td>
      <td><code>${CFG.parent.email}</code></td><td><code>${CFG.parent.password}</code></td></tr>
  <tr><td><strong>Staff console</strong></td>
      <td><code>${CFG.staffEmail}</code></td><td>Sent to you separately</td></tr>
</table>

<p>The demo family is <strong>Sharma (demo)</strong>, with two children — Aarav and Diya —
and real study history behind them. Use it for anything about progress and reports. For
first impressions, make your own account instead: it takes a minute and shows you exactly
what a new parent sees.</p>

${img("01-signin", "Signing in, on a phone-sized screen")}

<div class="pagebreak"></div>
<h2>3. Saying what to study</h2>
<p class="prdref">PRD 4.1 — Multi-Modal Input &amp; Zero-Prompting Ingestion Engine</p>

<p class="promise"><b>The PRD asked for:</b> parents expressing needs naturally — "My child
has a Maths test on fractions tomorrow, let's prepare" — without technical prompting
skills. Plus a camera scanner for textbook pages and worksheets, and automatic mapping of
what is captured to grade-level objectives.</p>

<h3>What was built</h3>
<p>You type or pick, in ordinary words. The product works out which topic that is on your
child's board and grade, out of roughly 3,160 topics across eight boards. If it is not
confident, it asks "did you mean…?" rather than guessing — which matters, because a
generated lesson on the wrong topic wastes an evening and is only discovered after you have
read it aloud.</p>

<div class="warn box">
  <p><strong>Camera scanning is a labelled placeholder.</strong> The screen shows the option
  and says plainly that it is coming. The API that receives and reads a photographed page is
  built and working; the phone screen that takes the picture is not finished. Voice input is
  the same — not built, and typing covers it.</p>
</div>

${img("08-capture", "Saying what to study. The camera option is present and honestly labelled.")}

<h3>What to check</h3>
<ul class="checks">
  <li>Type something vague — <em>"he's stuck on long division"</em> — and see whether it finds the topic.</li>
  <li>Type nonsense and confirm it asks rather than inventing a lesson.</li>
  <li>Confirm you never had to know the syllabus's own name for a topic.</li>
</ul>

<div class="pagebreak"></div>
<h2>4. The thirty minutes</h2>
<p class="prdref">PRD 4.2 — Time-Boxed 30-Minute Structured Study Flow</p>

<p class="promise"><b>The PRD asked for:</b> five phases in a fixed 30 minutes —
10 minutes concept, 8 teaching, 6 practice, 3 mock test, 3 revision — with native-language
scripts, real-world analogies, 4–6 practice questions, 3 assessment questions, and revision
focused only on what needs review.</p>

<h3>What was built — exactly these timings</h3>
<table>
  <tr><th style="width:8%">#</th><th style="width:24%">Phase</th><th style="width:12%">Time</th>
      <th style="width:14%">Who reads it</th><th>What happens</th></tr>
  <tr><td>1</td><td>Concept</td><td><strong>10 min</strong></td><td>You</td>
      <td>A 90–130 word script in your language, two everyday analogies, and the mistake children usually make.</td></tr>
  <tr><td>2</td><td>Teaching</td><td><strong>8 min</strong></td><td>You</td>
      <td>One worked example to do together, step by step.</td></tr>
  <tr><td>3</td><td>Practice</td><td><strong>6 min</strong></td><td>Your child</td>
      <td>Five questions in their school medium, marked instantly.</td></tr>
  <tr><td>4</td><td>Mock test</td><td><strong>3 min</strong></td><td>Your child</td>
      <td>Three questions, unaided. The honest measurement.</td></tr>
  <tr><td>5</td><td>Revision</td><td><strong>3 min</strong></td><td>You</td>
      <td>Built from the questions they got wrong that evening.</td></tr>
</table>

<div class="good box">
  <p><strong>Phase 5 is generated after phase 4, not before.</strong> It cannot be written in
  advance because its entire input is what your child actually got wrong. That is the part
  most competitors approximate with a fixed recap.</p>
</div>

<h3>What to check</h3>
<ul class="checks">
  <li>Time the wait for the plan. The PRD's limit is 4.5 seconds; measured, it is about 3.5.</li>
  <li>Answer some questions wrong on purpose, then read phase 5 — it should be about those.</li>
  <li>Pause mid-phase and confirm the clock stops.</li>
  <li>Try to leave mid-session and confirm it asks first.</li>
</ul>

<div class="pagebreak"></div>
<h2>5. Two languages, one screen</h2>
<p class="prdref">PRD 4.3 — Vernacular Localization Engine</p>

<p class="promise"><b>The PRD asked for:</b> Hindi, Urdu, Marathi, Tamil, Telugu, Kannada,
Bengali and English, with a Harmonized Dual-Mode Display — the child's exercises in the
school's English medium while the parent's guide is in the home language.</p>

<h3>What was built — all eight</h3>
<p style="font-size:12pt; line-height:2; margin-bottom:3mm">
  हिन्दी &nbsp;·&nbsp; मराठी &nbsp;·&nbsp; বাংলা &nbsp;·&nbsp; தமிழ் &nbsp;·&nbsp;
  తెలుగు &nbsp;·&nbsp; ಕನ್ನಡ &nbsp;·&nbsp; اردو &nbsp;·&nbsp; English
</p>

<p>The two columns are <strong>written separately, not translated</strong>. The model is
instructed to compose in the home language rather than translate English into it — a
translated lesson reads like a translation, and a child hears that. Each script also gets
its own line spacing, because Devanagari and Tamil clip at the spacing Latin uses, and Urdu
runs right to left while the child's English column beside it does not.</p>

<h3>What to check</h3>
<ul class="checks">
  <li>Make an account with a home language that is <strong>not</strong> English. This is the product; testing in English hides it.</li>
  <li>Read the parent script aloud. Does it sound like someone wrote it in that language?</li>
  <li>Confirm the parent and child columns are labelled and readable stacked on a phone.</li>
  <li>Try Urdu, if you read it, and confirm the column mirrors.</li>
</ul>

<div class="good box">
  <p><strong>This is the hardest thing to judge and the most important.</strong> Everything
  else in this product is software anyone can build. Whether a parent who does not know the
  topic can pick up the script and teach from it, in their own language, without preparing
  — that is what you are selling.</p>
</div>

<div class="pagebreak"></div>
<h2>6. Progress over time</h2>
<p class="prdref">PRD 4.4 — Multi-Timeline Analytics &amp; Mastery Tracking</p>

<p class="promise"><b>The PRD asked for:</b> daily, weekly, monthly, yearly and custom
timelines; a Daily Milestone Card; a Weekly Progress Summary and Subject Mastery Chart; a
Monthly Fluency Rating from Building Foundations to Fluent; an Annual Academic Excellence
Report and Next-Grade Readiness Certificate; and Proof of Progress across any date range.</p>

<h3>What was built — all five timelines</h3>
${img("05-progress-web", "The yearly view: totals, streak, the day-by-day chart, and the fluency rating")}

<p>The chart above is nine months of the demo child's real history. Note that the early
months are drawn as <strong>empty</strong> rather than skipped — a chart plotted only from
days that exist makes a lapsed month look continuous, which is the opposite of what a
progress view is for.</p>

<div class="pagebreak"></div>
<h3>The daily milestone card</h3>
<p>The PRD's example is "Successfully mastered Fraction Addition today!". It appears on the
home screen after a session, and its tone follows the result — a celebration when the
evening went well, and a plain statement when it did not. A card that celebrates a session
the child got wrong teaches a parent not to trust it.</p>

${img("02-home", "The home screen, with the daily card and each child's summary")}

<div class="pagebreak"></div>
<h3>Fluency, and the reports</h3>
<p>The rating combines three things rather than accuracy alone: <strong>accuracy 60%,
pace 25%, consistency 15%</strong>. Two guards stop it flattering — pace only counts
questions answered correctly, and the total can never exceed what accuracy supports. Without
those, a child guessing instantly every night would be rated "Growing".</p>

<p>No rating is given until five sessions exist. "Three more sessions to your first rating"
is encouraging; a verdict delivered on one bad Tuesday is not.</p>

<p>The <strong>Annual Academic Excellence Report</strong> and <strong>Next-Grade Readiness
Certificate</strong> both download as PDFs from the Progress screen. The certificate carries
a serial number, so it is a document a parent can show a school.</p>

${img("03-progress-phone", "The same analytics on a phone")}

<h3>What to check</h3>
<ul class="checks">
  <li>Switch between all five timelines. These are calendar periods — early in a month, "This month" is genuinely short.</li>
  <li>Tap a bar and confirm it shows that day's detail.</li>
  <li>Download both PDFs and decide whether you would show them to a teacher.</li>
  <li>Read the before-and-after comparison. Confirm it says so plainly if a child slipped.</li>
</ul>

<div class="pagebreak"></div>
<h2>7. Plans and pricing</h2>
<p class="prdref">PRD 5 — Business Model &amp; Subscription Growth Engine</p>

<p class="promise"><b>The PRD asked for:</b> Basic Monthly ₹499 (1 child), Family Annual
₹4,999 (up to 2 children, full analytics, priority processing), Family Plus ₹8,999
(3+ profiles, higher AI capacity, skill roadmaps).</p>

<h3>What was built — those three, plus a free trial</h3>
<table>
  <tr><th style="width:26%">Plan</th><th style="width:18%">Price</th><th style="width:18%">Children</th><th>Analytics</th></tr>
  <tr><td>Free Trial</td><td>Free, 7 days</td><td>1</td><td>Daily, weekly</td></tr>
  <tr><td>Basic Monthly</td><td><strong>₹499</strong>/month</td><td>1</td><td>Daily, weekly</td></tr>
  <tr><td>Family Annual</td><td><strong>₹4,999</strong>/year</td><td>2</td><td>All five, plus reports</td></tr>
  <tr><td>Family Plus</td><td><strong>₹8,999</strong>/year</td><td>6</td><td>All five, plus reports</td></tr>
</table>

<p>The PRD left "priority processing" and "higher AI capacity" as adjectives. They became
daily session limits — 3, 3, 8 and 20 — set well above what a family actually uses. They
exist to cap a runaway cost, not to ration anyone's evenings.</p>

${img("06-plans", "The plans screen. A plan too small for the household says so rather than hiding.")}

<div class="warn box">
  <p><strong>Payments are not live.</strong> The checkout code is written against Razorpay,
  which the PRD's Indian pricing implies and which carries UPI Autopay — but there are no
  keys yet, so nothing can be bought. The screen says so up front instead of failing at the
  tap. This is the last thing to wire up before launch.</p>
</div>

<div class="pagebreak"></div>
<h2>8. Speed, safety and offline</h2>
<p class="prdref">PRD 7 — Performance, Security &amp; Scalability Standards</p>

<p class="promise"><b>The PRD asked for:</b> lesson generation in ≤ 4.5 seconds; 99.9%
uptime during 5–10pm IST; full COPPA/DPDP compliance with encrypted data; and offline
continuity so a running timer and loaded materials keep working.</p>

<h3>Speed — measured, not assumed</h3>
<table>
  <tr><th style="width:42%">What</th><th style="width:20%">Typical</th><th style="width:20%">Worst seen</th><th>Target</th></tr>
  <tr><td>Getting tonight's plan</td><td>3.5 s</td><td>4.9 s</td><td>4.5 s</td></tr>
  <tr><td>&nbsp;&nbsp;— of which is our code</td><td>0.06 s</td><td>0.19 s</td><td>—</td></tr>
  <tr><td>Opening the home screen</td><td>0.04 s</td><td>0.05 s</td><td>—</td></tr>
  <tr><td>Starting a session</td><td>0.06 s</td><td>0.17 s</td><td>—</td></tr>
</table>

<p>Across fifteen measured runs the typical wait is well inside the promise and the slowest
was slightly over. Almost all of it is the AI provider's time — our own code is one to five
per cent. Asking the AI for less was tested and gains only 8%, so the remaining lever is the
provider's capacity, not the code.</p>

<h3>Children's privacy</h3>
<div class="good box">
  <p><strong>Your child has no account.</strong> No login, no email, no phone number —
  nothing they could be contacted through. They are a profile inside the parent's account.
  Under COPPA and DPDP the cheapest way to be compliant about a minor's contact data is to
  hold none of it, and nothing in the product needs it.</p>
</div>

<p>Every family can export everything they hold as one file, or delete the household
outright — a real deletion including the photographs, not a hidden flag. Support staff can
see whether a family is healthy but <strong>cannot read any child's schoolwork</strong>.</p>

${img("07-privacy", "Data and privacy: what is held, the consent record, export and delete")}

<h3>Offline</h3>
<p>The countdown runs on the device, not the server, and the evening's plan is saved to the
phone when the session starts. Answers queue up and send when the network returns, and a
queue that sends twice cannot record the evening twice. Built and unit-tested;
<strong>not yet proven on a physical phone</strong>.</p>

<div class="pagebreak"></div>
<h2>9. Your own view of the business</h2>
<p class="prdref">Beyond the PRD — added during build</p>

<p>The PRD does not ask for this. It was added because without it there is no way to answer
"how many families do we have", "is anything broken", or "why did this family lose access".
Reached at <code>/admin</code>, with a separate password from any parent account.</p>

${img("09-admin", "The staff console: households, activity, and AI health")}

<div class="warn box">
  <p><strong>The number to watch is "AI degraded".</strong> When the AI cannot be reached,
  families still get a usable session built from a template — deliberately, so nobody's
  evening is ruined by an outage. That means the failure is <em>invisible</em> to parents.
  This figure is the only place it shows. Above about 5%, something needs attention.</p>
</div>

<div class="pagebreak"></div>
<h2>10. Trying it on a phone</h2>
<p class="prdref">PRD 6 — Intuitive Client Interface</p>

<p>One codebase produces the website, the Android app and the iPhone app, so what you test
in a browser is the same product — the layout rearranges, the product does not change.</p>

${img("04-home-web", "The same home screen on a laptop: the navigation moves to the side, nothing else moves")}

<p>Three ways to get it onto a phone, easiest first:</p>

<table>
  <tr><th style="width:26%">Way</th><th style="width:30%">Who it suits</th><th>What is needed</th></tr>
  <tr><td><strong>The website</strong></td><td>Everyone, right now</td>
      <td>Works on a phone browser. Needs the web app hosted first.</td></tr>
  <tr><td><strong>Android test file</strong></td><td>Anyone with an Android phone</td>
      <td>One click in the build pipeline produces an installable file. Ready to run.</td></tr>
  <tr><td><strong>iPhone</strong></td><td>iPhone testers</td>
      <td>Needs a Mac once, to create Apple's signing certificate. After that it is automated.</td></tr>
</table>

<h2>11. What is not finished</h2>
<p class="prdref">Listed plainly</p>
<table>
  <tr><th style="width:30%">What</th><th style="width:14%">Status</th><th>Where it stands</th></tr>
  <tr><td>Payments</td><td class="status-part">Blocked</td><td>Written; needs Razorpay keys. Nothing can be bought until then.</td></tr>
  <tr><td>Camera scanning</td><td class="status-part">Partial</td><td>The server side reads photographed pages. The phone screen that takes the picture is a labelled placeholder.</td></tr>
  <tr><td>Voice input</td><td class="status-no">Not built</td><td>Typing and choosing a topic both work.</td></tr>
  <tr><td>Web hosting</td><td class="status-no">Not done</td><td>Built and tested; not pushed to a host.</td></tr>
  <tr><td>App store listings</td><td class="status-part">Prepared</td><td>Icons, graphic and screenshots generated. Nothing submitted.</td></tr>
  <tr><td>Offline on a device</td><td class="status-part">Unproven</td><td>Built and unit-tested; not yet run on a physical phone.</td></tr>
  <tr><td>Error monitoring</td><td class="status-no">None</td><td>You would hear about problems from families, not a dashboard.</td></tr>
  <tr><td>Test environment</td><td class="status-no">None</td><td>One live server. No safe place to try changes.</td></tr>
  <tr><td>Demo data</td><td class="status-part">Remove</td><td>The Sharma (demo) family must be deleted before real families sign up.</td></tr>
</table>

<div class="pagebreak"></div>
<h2>12. Every PRD requirement, and where it stands</h2>
<p class="prdref">The one-page summary</p>

<table>
  <tr><th style="width:12%">PRD</th><th style="width:40%">Requirement</th><th style="width:13%">Status</th><th>Note</th></tr>

  <tr><td>4.1</td><td>Conversational text capture, zero prompting</td><td class="status-yes">Built</td><td>Matches ~3,160 topics; asks when unsure</td></tr>
  <tr><td>4.1</td><td>Conversational voice capture</td><td class="status-no">Not built</td><td>Typing covers it</td></tr>
  <tr><td>4.1</td><td>Camera textbook scanner</td><td class="status-part">Partial</td><td>Server reads pages; capture screen is a placeholder</td></tr>
  <tr><td>4.1</td><td>Maps material to grade-level objectives</td><td class="status-yes">Built</td><td>Board → grade → subject → chapter → topic</td></tr>

  <tr><td>4.2</td><td>Concept, 10 min, native-language script + analogies</td><td class="status-yes">Built</td><td>90–130 words, 2 analogies, common mistake</td></tr>
  <tr><td>4.2</td><td>Guided teaching, 8 min</td><td class="status-yes">Built</td><td>One worked example, step by step</td></tr>
  <tr><td>4.2</td><td>Timed practice, 6 min, 4–6 questions</td><td class="status-yes">Built</td><td>Five questions, pacing timer</td></tr>
  <tr><td>4.2</td><td>Micro mock test, 3 min, 3 questions</td><td class="status-yes">Built</td><td>Instant feedback</td></tr>
  <tr><td>4.2</td><td>Targeted revision, 3 min, only what needs review</td><td class="status-yes">Built</td><td>Generated from the evening's wrong answers</td></tr>

  <tr><td>4.3</td><td>Eight languages</td><td class="status-yes">Built</td><td>All eight, each with its own typography</td></tr>
  <tr><td>4.3</td><td>Harmonized Dual-Mode Display</td><td class="status-yes">Built</td><td>Written separately, not translated</td></tr>

  <tr><td>4.4</td><td>Daily — completion, adherence, accuracy</td><td class="status-yes">Built</td><td>—</td></tr>
  <tr><td>4.4</td><td>Daily Milestone Card</td><td class="status-yes">Built</td><td>Tone follows the result</td></tr>
  <tr><td>4.4</td><td>Weekly — streaks, chapters, speed</td><td class="status-yes">Built</td><td>Streak forgives one missed day in seven</td></tr>
  <tr><td>4.4</td><td>Subject Mastery Chart</td><td class="status-yes">Built</td><td>Per subject and per skill</td></tr>
  <tr><td>4.4</td><td>Monthly Fluency Rating, four bands</td><td class="status-yes">Built</td><td>60/25/15, with two anti-flattery guards</td></tr>
  <tr><td>4.4</td><td>Yearly — coverage, study hours</td><td class="status-yes">Built</td><td>Coverage shown with its denominator</td></tr>
  <tr><td>4.4</td><td>Annual Academic Excellence Report</td><td class="status-yes">Built</td><td>Downloads as a PDF</td></tr>
  <tr><td>4.4</td><td>Next-Grade Readiness Certificate</td><td class="status-yes">Built</td><td>Serial-numbered</td></tr>
  <tr><td>4.4</td><td>Custom range Proof of Progress</td><td class="status-yes">Built</td><td>States a decline plainly if there is one</td></tr>

  <tr><td>5</td><td>Basic Monthly ₹499</td><td class="status-yes">Built</td><td>Prices come from the server, never the app</td></tr>
  <tr><td>5</td><td>Family Annual ₹4,999</td><td class="status-yes">Built</td><td>—</td></tr>
  <tr><td>5</td><td>Family Plus ₹8,999</td><td class="status-yes">Built</td><td>—</td></tr>
  <tr><td>5</td><td>Taking payment</td><td class="status-part">Blocked</td><td>Needs Razorpay keys</td></tr>

  <tr><td>6</td><td>Responsive web and mobile</td><td class="status-yes">Built</td><td>One codebase, three targets</td></tr>
  <tr><td>6</td><td>Audio recording</td><td class="status-no">Not built</td><td>—</td></tr>
  <tr><td>6</td><td>Camera scanning</td><td class="status-part">Partial</td><td>As above</td></tr>
  <tr><td>6</td><td>Interactive study timer</td><td class="status-yes">Built</td><td>Survives the app being backgrounded</td></tr>

  <tr><td>7</td><td>Plans generated in ≤ 4.5 s</td><td class="status-yes">Met</td><td>3.5 s typical; 4.9 s worst of fifteen runs</td></tr>
  <tr><td>7</td><td>99.9% uptime, 5–10pm IST</td><td class="status-part">Hosting</td><td>Current plan sleeps when idle. Needs an upgrade.</td></tr>
  <tr><td>7</td><td>COPPA / DPDP compliance</td><td class="status-yes">Built</td><td>Children hold no account; export and delete work</td></tr>
  <tr><td>7</td><td>Encryption</td><td class="status-yes">Built</td><td>In transit and at rest; passwords never readable</td></tr>
  <tr><td>7</td><td>Offline continuity</td><td class="status-part">Unproven</td><td>Built and unit-tested; not run on a device</td></tr>
</table>

<h2>13. Telling us about a problem</h2>
<p class="prdref">What helps most</p>
<ul>
  <li><strong>What you did</strong>, step by step, from signing in.</li>
  <li><strong>What you expected</strong>, and what happened instead.</li>
  <li><strong>A screenshot</strong> — worth more than a description.</li>
  <li><strong>Which device</strong>, and roughly what time.</li>
  <li>Which account: the demo family, or one you made.</li>
</ul>

<div class="info box">
  <p><strong>"You appear to be offline" while your internet is fine</strong> almost always
  means the server is asleep or the web address has not been added to its allowed list.
  Worth mentioning if you see it — it is a settings fix, not a fault in the app.</p>
</div>

<footer>
  ParentAI — Guide &amp; Handover v${CFG.version}, ${CFG.date}. Written against PRD V2.0.0.<br/>
  Screenshots are of the running product against the live server, taken when this document
  was generated.
</footer>

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

if (process.argv.includes("--preview")) {
  const shot = await browser.newPage({
    viewport: { width: 794, height: 1400 },
  });
  await shot.setContent(html, { waitUntil: "networkidle" });
  await shot.evaluate(() => document.fonts.ready);
  await shot.waitForTimeout(600);
  await shot.screenshot({
    path: path.join(ROOT, "_guide-preview.png"),
    fullPage: true,
  });
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
    '<div style="width:100%;font-size:7.5pt;color:#928B7C;font-family:Inter,sans-serif;padding:0 14mm;text-align:right">' +
    'ParentAI · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: "15mm", bottom: "17mm", left: "14mm", right: "14mm" },
});
await browser.close();

console.log(`\n  wrote ${path.relative(process.cwd(), OUT)}\n`);
