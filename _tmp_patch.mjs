import fs from "fs";
const f = "tools/sessionSmoke.mjs";
let s = fs.readFileSync(f, "utf8");

const marker = 'console.log("\n=== 2. Capture ===");';
const endMarker = 'check("quick intents are offered", /Test tomorrow/.test(capture));';
const start = s.indexOf(marker);
const end = s.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error("markers not found");

const replacement = `console.log("\n=== 2. Capture ===");
/**
 * Navigated by URL rather than by clicking a card.
 *
 * The first "Plan tonight's session" button on the dashboard belongs to
 * whichever child is listed first — and the ambiguity check below needs a child
 * whose syllabus actually contains several fraction topics. Diya is in Grade 3,
 * where the Maharashtra maths syllabus has none, so "fractions" would correctly
 * resolve as freeform and generate without asking. Addressing the screen
 * directly also exercises the deep link.
 */
const meRes = await page.evaluate(async () => {
  const raw = localStorage.getItem("parentai-auth");
  const token = raw ? JSON.parse(raw).state.token : null;
  const r = await fetch("http://127.0.0.1:5005/api/v1/auth/me", {
    headers: { Authorization: "Bearer " + token },
  });
  return (await r.json()).data;
});
const aarav = meRes.children.find((c) => c.name === "Aarav");
check("Aarav is a Grade 5 child with fraction topics in his syllabus", aarav?.grade === 5);

await page.goto(base + "/plan/new/" + aarav.id, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const capture = await body();
check("the capture screen opens from a deep link", /What are we studying/i.test(capture));
check("it names the child it is for", /For Aarav, Grade 5/.test(capture), capture.match(/For \w+, Grade \d/)?.[0]);
check("quick intents are offered", /Test tomorrow/.test(capture));`;

s = s.slice(0, start) + replacement + s.slice(end + endMarker.length);
fs.writeFileSync(f, s);
console.log("test navigates by URL");
