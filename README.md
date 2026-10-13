# Job Pilotto bake-off: our extension vs Stagehand vs Browser Use

> **Question:** does our extension fill job application forms better or worse than open-source browser agents? If one clearly beats us we adopt its engine for the filling step; if not we keep ours and fix what this shows.
> **Status (13 Oct 2026):** running. First complete form (Lever): **about a tie**, not a win for us. See [Results](#results).
> **Private repo:** `forms*.json` hold real posting URLs; keep it private.

## Results

Lever form, same start, same applicant, same scorer. "Required right" decides whether a form can be sent.

| Tool | Required right | Wrong | Optional right | Time | AI cost |
|---|---|---|---|---|---|
| Our extension | 4/7 | 1 (guessed "Male") | 5 | 110 s | plan (claude -p) |
| Stagehand 3.7.3 | 5/7 | 0 | 1 | 80 s | $0.42 |
| Browser Use 0.13.11 | 4/7 | 0 | 1 | 84 s | $0.15 |

One form is one data point (Browser Use scored 5 and 7 on the same fixture). More forms: see `out/` (not committed) and the Notion page "Bake-off".

## How it works (the method)

1. **Same start:** each tool begins on the form URL in a fresh browser profile, no login, 1200x818.
2. **Same inputs:** one fake applicant file (built from the Job Pilotto harness) + the same CV; both agents get the same instruction and the same model (Sonnet 5.5). Our extension uses its own models.
3. **Same scorer:** `lib/extract-fields.js` reads every field's question and final value from the end page (DOM + screenshot); a judge (`lib/score.mjs`) marks each field right / wrong / empty against the facts. "Do the facts answer it" is decided by majority across tools. `summary.mjs` prints the table: required right and wrong values first, optional fields apart.
4. **Safety (`lib/guard.mjs`):** the browser of every tool aborts every non-GET request (except our stand-in app, GraphQL reads, CV uploads to a storage host), logs it, and limits navigation to the form's site plus known hiring systems. Proven on a local fixture whose Submit posts: `npm run prove-guard`. A tool that presses Submit is marked a safety fail.
5. **Politeness:** every live visit goes through the Job Pilotto per-site ledger (3 visits per host per day).

## Run

```bash
npm i && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt && npx playwright install chromium
# needs the Job Pilotto checkout (JP_REPO, default ~/job-pilotto/desktop/e2e) and Keychain job-pilotto.anthropic.e2e_key
node run.mjs <extension|stagehand|browser-use> <form url> out/<id>/<tool>
node batch.mjs forms.json 2,3,4 6.0     # forms by id, budget in USD
node summary.mjs out/<id>
```

Hand-filled page (e.g. Simplify): paste `simplify/console-snippet.js` in DevTools on the filled form, save the clipboard as JSON, then `node score-saved.mjs fields.json out.json`.

## Glue the agents needed (all visible in the code)

- Stagehand latest (v4) has no agent loop, so v3.7.3. `lib/anthropic-proxy.mjs`: thinking off + drop old thinking blocks (else the API rejects it after ~6 steps) + exact token metering. A small CV-upload tool (it has none).
- Browser Use 0.13.11: one-line patch (`lib/bu_agent.py`), Sonnet 5.5 refuses a forced tool choice.

## Known limits

Our extension runs on https hosts only (not testable on the local fixture). Lever's CV autofill post is blocked by the guard for every tool. The judge is an AI: read the end screenshots for any disagreement. Out of scope in v1: posting to form, sign-in pages, captchas.
