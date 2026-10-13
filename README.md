# Job Pilotto bake-off: our extension vs Stagehand vs Browser Use (+ Nanobrowser)

> **Question:** does our extension fill job application forms better or worse than open-source browser agents? If one clearly beats us we adopt its engine for the filling step; if not we keep ours and fix what this shows.
> **Verdict so far (13 Oct 2026, 3 complete forms): about a tie, no clear winner.** Required fields filled correctly: ours 13/31, Stagehand 13/31, Browser Use 11/31. All three leave over half of the required fields empty. Stagehand costs about 8x Browser Use for no better result; ours runs on the plan (no per-token price). Nobody pressed Submit on a live form.
> **Status:** running; this block is regenerated after each batch (`node report.mjs md`). **Private repo:** `forms*.json` hold real posting URLs.

## Results

<!-- RESULTS-START -->
| Tool | Required right | Wrong | Required empty | Avg time | Cost | Hit cap | Submit pressed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Our extension | 13/31 | 2 | 17/31 | 104 s | plan | 0/3 | 0 |
| Stagehand | 13/31 | 2 | 17/31 | 204 s | $3.73 | 1/3 | 0 |
| Browser Use | 11/31 | 1 | 19/31 | 74 s | $0.45 | 0/3 | 0 |

Totals over the 3 complete forms (every tool valid): jobs.lever.co, epilot.recruitee.com, urrly.breezy.hr.

| # | Form | Note | Our extension | Stagehand | Browser Use | Nanobrowser |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Lever · jobs.lever.co |  | 4/7 · 1 wrong · 3 req. empty · 110 s · plan | 5/7 · 0 wrong · 2 req. empty · 80 s · $0.42 | 4/7 · 0 wrong · 3 req. empty · 84 s · $0.15 | not run |
| 2 | Ashby · jobs.ashbyhq.com |  | 6/9 · 0 wrong · 3 req. empty · 113 s · plan | INVALID (API limit) | INVALID (API limit) | not run |
| 4 | Teamtailor (own domain) · careers.hadrian.io |  | 9/16 · 0 wrong · 7 req. empty · 111 s · plan | not run | not run | not run |
| 11 | Recruitee (fresh, never in pool) · epilot.recruitee.com |  | 2/7 · 0 wrong · 5 req. empty · 83 s · plan | 1/7 · 2 wrong · 5 req. empty · 333 s · $1.76 | 2/7 · 0 wrong · 5 req. empty · 80 s · $0.20 | not run |
| 12 | Breezy HR (fresh, never in pool) · arpio.breezy.hr | DROPPED: posting closed, no form | - | - | - | - |
| 13 | Breezy HR (fresh, never in pool) · urrly.breezy.hr |  | 7/17 · 1 wrong · 9 req. empty · 120 s · plan | 7/17 · 0 wrong · 10 req. empty · 199 s · $1.54 · hit step cap | 5/17 · 1 wrong · 11 req. empty · 56 s · $0.11 | not run |

Not yet run: 3 Teamtailor (career.teamtailor.com); 5 Recruitee (own domain) (careers.tether.io); 6 Greenhouse embed (careers.formlabs.com); 7 Personio (German) (seitenbau-gmbh.jobs.personio.de); 8 own job board (jobs.techtree.dev); 9 Greenhouse embed (careers.nebius.com); 10 Greenhouse embed (own site) (content.red-badger.com).

<!-- RESULTS-END -->

**Caveats:** "required right" counts form controls, so one question can count several times (the same for every tool). Ashby's two agent runs are INVALID (the Anthropic key hit its usage limit during them, not a tool failure). Nanobrowser has no file-upload action, so its CV field stays empty (a capability gap). Lever's CV-autofill post (`/parseResume`) is blocked by the guard for every tool. Forms are single-page, no login, no captcha, mostly English tech jobs: the hard multi-step and account forms (Workday, SuccessFactors) are not covered. One form is one data point; agents vary run to run.

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
- Nanobrowser v0.2.0 (4th tool, `lib/nanobrowser.mjs`): unpacked pinned release in `~/bakeoff-tools/nb-0.2.0` (`gh release download v0.2.0 -R nanobrowser/nanobrowser`), its Anthropic client pointed at the metering pass-through (a one-string patch of a copy), settings seeded in chrome.storage (Sonnet 5.5, max 40 steps), task started over its side-panel port. It has no file-upload action, so the CV field stays empty (a capability gap, reported as such). `BAKEOFF_TOOLS=nanobrowser node batch.mjs ...` runs it on a later day (site limit: 3 visits per host per day).

## Known limits

Our extension runs on https hosts only (not testable on the local fixture). Lever's CV autofill post is blocked by the guard for every tool. The judge is an AI: read the end screenshots for any disagreement. Out of scope in v1: posting to form, sign-in pages, captchas.
