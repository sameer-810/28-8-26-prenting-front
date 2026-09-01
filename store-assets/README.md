# Play Store assets

Everything here is **generated**, not hand-made. Regenerate it rather than
editing a PNG — a hand-edited asset goes out of step with the app the first time
a screen changes, and nobody notices, because the listing looks fine and only
the product has moved.

```bash
npm run assets:icons       # app icons + the 512px Play listing icon
npm run assets:feature     # the 1024×500 feature graphic
npm run assets:feature -- --guides   # same, with the safe zones drawn on
npm run assets:screens     # phone screenshots, from the real running app
npm run assets             # all three
```

| File                           | What it is                     | Play's rule                            |
| ------------------------------ | ------------------------------ | -------------------------------------- |
| `play-icon-512.png`            | Listing icon                   | 512×512, 32-bit PNG, **no alpha**      |
| `feature-graphic-1024x500.png` | Feature graphic                | Exactly 1024×500, **no alpha**         |
| `screenshots/`                 | Captioned phone screenshots    | 2–8, 16:9 or 9:16, 320–3840px per side |
| `raw-screens/`                 | The same captures, uncaptioned | —                                      |

---

## The two things that get listings rejected

**An alpha channel** on the icon or the feature graphic. Both generators draw on
an opaque ground and never screenshot with `omitBackground`, so this cannot
happen by accident.

**A promo video covering the headline.** If a video is ever attached, Play draws
a 96×96 play button dead centre of the feature graphic — x 464–560, y 202–298.
That band is deliberately empty. `--guides` renders it in red so you can check;
the headline originally ran straight through it, which is exactly why the flag
exists.

---

## The screenshots are real

`makeStoreScreenshots.mjs` signs in as the demo household and captures the
actual running app. It needs the API up and `npm run seed:demo` done.

That is deliberate. A listing built from mockups earns one-star reviews saying
"not as shown", and it is the easiest promise in the world to break by accident.

**Before uploading, look at what was captured.** The screenshots show whatever
state the demo data happens to be in — if a test run has left the demo child
with a session they got entirely wrong, screenshot 01 will honestly show that,
and it is a poor advertisement even though it is true. Re-seed
(`npm run seed:demo`) for a clean, representative household and re-capture.

The first two screenshots are the ones almost everybody sees — Play shows them
without scrolling — so those two carry the decision: _what this is_, and
_what you get out of it_.

---

## Still needed before submitting

- [ ] `extra.eas.projectId` in `app.json`
- [ ] A signing keystore in `credentials/` (gitignored) — or let EAS manage it
- [ ] Store listing copy: short description (80 chars) and full description (4000)
- [ ] The **privacy policy URL** — `/privacy-policy.html`, served from the web app
- [ ] The **account deletion URL** — `/delete-account.html`, required under
      Data safety → Account deletion
- [ ] Data safety declaration, which must match what the privacy policy says
- [ ] Content rating questionnaire — this app is used by adults on behalf of
      children, which changes the answers
- [ ] Tablet screenshots, if tablet support is claimed (`supportsTablet: true`
      is set in `app.json`, so it is)
