# Pickle Party 🥒💍

An Apples-to-Apples-style party game for Miranda's bachelorette.

- **Player link (text this to guests):** `https://<username>.github.io/pickle-party/`
- **Host screen (open on a laptop):** `https://<username>.github.io/pickle-party/host`

## How it works

Guests open the player link on their phones, enter their name, and submit an
answer to each prompt. Each submission pops onto the host screen as a face-down
pickle card. The host clicks **Reveal answers** to flip the cards in a random,
anonymous order, adjusts scores with the +/− buttons, and clicks **Next prompt**.
After 20 prompts, a winner is crowned. **reset game** (bottom of host screen)
wipes everything for a fresh start.

## Editing the prompts

Edit `src/prompts.js` (one string per prompt), then rebuild and redeploy:

```bash
npm install
BASE_PATH=/pickle-party/ npx vite build
mkdir -p dist/host && cp dist/index.html dist/host/index.html
# push the contents of dist/ to the gh-pages branch
```

## Tech

Vite + React single-page app. Realtime sync via Firebase Realtime Database
(free Spark plan) — config in `src/firebaseConfig.js`, security rules in
`database.rules.json` (the database is open only under `games/pickle-party`).
Static hosting on GitHub Pages (`gh-pages` branch). On localhost the app talks
to the mock realtime server in `test/mock-server.js` instead of Firebase;
`test/e2e.js` runs a full simulated game (host + 7 phones) with Playwright.
