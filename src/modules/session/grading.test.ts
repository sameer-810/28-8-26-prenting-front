import test from "node:test";
import assert from "node:assert/strict";
import { grade, summarise, normalise, parseNumeric, resolveOption } from "./grading.ts";
import type { Question } from "./grading.ts";

/**
 * The same cases the server's suite covers.
 *
 * That is the point: the device grades for instant feedback and the server
 * grades for the record, and if the two drift a child sees "correct" while
 * their report says otherwise. Running equivalent suites over both is what
 * keeps the duplication honest.
 */
const q = (answer: string, extra: Partial<Question> = {}): Question => ({
  prompt: "?",
  answer,
  ...extra,
});

test("normalise absorbs how a child actually types", () => {
  assert.equal(normalise("  12  "), "12");
  assert.equal(normalise("12."), "12");
  assert.equal(normalise("₹1,200"), "1200");
  assert.equal(normalise("½"), "1/2");
  assert.equal(normalise("= 12"), "12");
});

test('".5" stays 0.5 — the tenfold-error regression', () => {
  assert.equal(parseNumeric(".5")?.value, 0.5);
  assert.equal(grade(".5", q("1/2")).correct, true);
});

test("a child typing 1/2 for a stored ½ is CORRECT", () => {
  assert.equal(grade("1/2", q("½")).correct, true);
});

test("every equivalent form of one half matches", () => {
  for (const given of ["0.5", ".5", "1/2", "2/4", "½", "4/8"]) {
    assert.equal(grade(given, q("1/2")).correct, true, `"${given}"`);
  }
});

test("an unsimplified but correct fraction is RIGHT, with a nudge", () => {
  const r = grade("2/4", q("1/2"));
  assert.equal(r.correct, true);
  assert.equal(r.needsSimplifying, true);
});

test("the nudge fires even when the stored answer is unsimplified too", () => {
  // Generation returns an unsimplified answer roughly 1 question in 12,
  // measured. The child's working is what is being taught.
  const r = grade("3/6", q("3/6"));
  assert.equal(r.correct, true);
  assert.equal(r.needsSimplifying, true);
});

test("units are not required for the mark", () => {
  assert.equal(grade("12", q("12 cm")).correct, true);
  assert.equal(grade("12 cm", q("12")).correct, true);
});

test("filler words and autocorrect punctuation do not fail an answer", () => {
  assert.equal(grade("Delhi.", q("Delhi")).correct, true);
  assert.equal(grade("the sun", q("sun")).correct, true);
});

test("a genuinely wrong answer is still wrong", () => {
  assert.equal(grade("1/3", q("1/2")).correct, false);
  assert.equal(grade("mumbai", q("delhi")).correct, false);
});

const mcq = q("Paris", { options: ["London", "Paris", "Rome", "Berlin"] });

test("multiple choice accepts text, letter and 1-based position", () => {
  for (const given of ["Paris", "paris", "b", "2"]) {
    assert.equal(grade(given, mcq).correct, true, `"${given}"`);
  }
  for (const given of ["Rome", "c", "3"]) {
    assert.equal(grade(given, mcq).correct, false, `"${given}"`);
  }
});

test("resolveOption prefers the 1-based reading a human means", () => {
  const options = ["London", "Paris", "Rome", "Berlin"];
  assert.equal(resolveOption("2", options), 1);
  assert.equal(resolveOption("0", options), 0);
  assert.equal(resolveOption("9", options), -1);
});

test("a malformed options array does not make a right answer wrong", () => {
  assert.equal(grade("7", q("7", { options: ["1", "2", "3"] })).correct, true);
});

test("a blank is SKIPPED, not wrong — the timer is not the child's fault", () => {
  const r = grade("", q("12"));
  assert.equal(r.skipped, true);
  assert.equal(r.correct, false);
  assert.equal(grade(null, q("12")).skipped, true);
  assert.equal(grade(undefined, q("12")).skipped, true);
});

test("a template question with no stored answer is SKIPPED", () => {
  assert.equal(grade("anything", q("", { unscored: true })).skipped, true);
});

test("accuracy is measured over ATTEMPTED questions only", () => {
  const s = summarise([
    { correct: true, skipped: false },
    { correct: true, skipped: false },
    { correct: true, skipped: false },
    { correct: true, skipped: false },
    { correct: false, skipped: true },
    { correct: false, skipped: true },
  ]);
  assert.equal(s.attempted, 4);
  assert.equal(s.accuracy, 1);
  assert.ok(Math.abs(s.completion - 4 / 6) < 1e-9);
});

test("summarising nothing is zero, not NaN", () => {
  assert.equal(summarise([]).accuracy, 0);
  assert.equal(summarise([{ correct: false, skipped: true }]).accuracy, 0);
});
