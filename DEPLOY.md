# Deploying the client

One codebase, two artefacts: a static web bundle and a native binary.

## Web

```bash
EXPO_PUBLIC_API_URL=https://two8-8-26-prenting-back.onrender.com npx expo export -p web --clear
# → dist/
```

### Three things that will bite you

**1. `--clear` is not optional when the API URL changes.**
`EXPO_PUBLIC_*` values are inlined into the bundle at build time by Babel, and
**Metro's transform cache is not keyed on them**. A rebuild after changing
`EXPO_PUBLIC_API_URL` silently reuses the previous value and ships a bundle
pointing at the old API. This was observed, not theorised: a build with the
variable correctly loaded (`env: export EXPO_PUBLIC_API_URL` in the log) still
emitted the fallback URL until the cache was cleared.

**2. `localhost` and `127.0.0.1` are different origins.**
The API's `CORS_ORIGIN` allowlist must contain the exact origin the browser
sends. A mismatch surfaces in the app as _"You appear to be offline"_ — because
a CORS-blocked request is indistinguishable from a dead network to JavaScript —
not as anything mentioning CORS.

**3. The SPA needs a catch-all rewrite.**
Routes like `/progress` and `/children/add` are real URLs. Without the rewrite
in `vercel.json`, a refresh or a shared link 404s.

## Native (Android / iOS)

`app.json` carries the bundle identifiers and permission strings. Builds go
through EAS:

```bash
npx eas build -p android --profile production
```

Before the first build:

- set `extra.eas.projectId` in `app.json` (currently empty)
- set `EXPO_PUBLIC_API_URL` in the EAS build environment
- replace the placeholder artwork in `assets/` — those are generated
  solid-colour marks, not brand assets

## Verifying a build

`tools/smoke.mjs` runs the exported bundle in a real browser against a live API,
at desktop and phone widths — sign-in, dashboard data, navigation, URL routing,
session persistence across a reload, and console health.

```bash
# with the API running on :5005 and its CORS allowlist including :8099
node tools/smoke.mjs
node tools/smoke.mjs --headed   # watch it
```
