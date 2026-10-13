# Job Pilotto bake-off: our extension vs Stagehand vs Browser Use (+ Nanobrowser)

> **Question:** does our extension fill job application forms better or worse than open-source browser agents? If one clearly beats us we adopt its engine for the filling step; if not we keep ours and fix what this shows.
> **Verdict so far (13 Oct 2026, 5 complete forms): a tie, with a twist.** Required fields filled correctly: **our extension 28/60, Browser Use 25/60, Stagehand 20/60**. All three leave half of the required fields empty. Browser Use costs ~$0.20 a form, Stagehand ~$1.10 for the worst result, ours runs on the plan. Our extension's time is its own working time (48 s on average; the harness waits another ~50 s after the last change, which is not counted). Nobody pressed Submit on a live form.
> **IMPORTANT: the extension rows are the OLD build `62dad23`** (the primary checkout, 57 commits behind main; it lacks the fix that stops a contact detail going into a question). Re-runs on current main (`9a0416d`, in a worktree) come as a second extension column; the agents' results are unaffected. Every extension result records its commit.
> **Status:** running, paused on the Anthropic credit balance; this block is regenerated after each batch (`node report.mjs md`). **Private repo:** `forms*.json` hold real posting URLs.

## Results

<!-- RESULTS-START -->
| Tool | Required right | Wrong | Required empty | Avg time | Cost | Hit cap | Submit pressed | Forms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Our extension (old build 62dad23) | 28/60 | 3 | 30/60 | 48 s | plan | 0/5 | 0 | 5 |
| Stagehand | 20/60 | 2 | 39/60 | 237 s | $5.60 | 1/5 | 0 | 5 |
| Browser Use | 25/60 | 1 | 34/60 | 92 s | $0.92 | 0/5 | 0 | 5 |

Totals: each row over the forms where that tool and both agents have valid results (forms per row in the last column).

| # | Form | Note | Our extension (old build 62dad23) | Our extension (main build) | Stagehand | Browser Use | Nanobrowser |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Lever · jobs.lever.co |  | 4/7 · 1 wrong · 3 req. empty · 55 s · plan | not run | 5/7 · 0 wrong · 2 req. empty · 80 s · $0.42 | 4/7 · 0 wrong · 3 req. empty · 84 s · $0.15 | not run |
| 2 | Ashby · jobs.ashbyhq.com |  | 6/9 · 0 wrong · 3 req. empty · 60 s · plan | not run | INVALID (API limit) | INVALID (API limit) | not run |
| 4 | Teamtailor (own domain) · careers.hadrian.io |  | 9/16 · 0 wrong · 7 req. empty · 59 s · plan | not run | 2/16 · 0 wrong · 14 req. empty · 482 s · $1.39 | 11/16 · 0 wrong · 5 req. empty · 180 s · $0.36 | not run |
| 5 | Recruitee (own domain) · careers.tether.io |  | 6/13 · 1 wrong · 6 req. empty · 30 s · plan | not run | 5/13 · 0 wrong · 8 req. empty · 89 s · $0.49 | 3/13 · 0 wrong · 10 req. empty · 61 s · $0.11 | not run |
| 6 | Greenhouse embed · careers.formlabs.com |  | 4/7 · 0 wrong · 3 req. empty · 88 s · plan | not run | 4/7 · 0 wrong · 3 req. empty · 125 s · $1.13 | INVALID (API limit) | not run |
| 11 | Recruitee (fresh, never in pool) · epilot.recruitee.com |  | 2/7 · 0 wrong · 5 req. empty · 29 s · plan | not run | 1/7 · 2 wrong · 5 req. empty · 333 s · $1.76 | 2/7 · 0 wrong · 5 req. empty · 80 s · $0.20 | not run |
| 12 | Breezy HR (fresh, never in pool) · arpio.breezy.hr | DROPPED: posting closed, no form | - | - | - | - | - |
| 13 | Breezy HR (fresh, never in pool) · urrly.breezy.hr |  | 7/17 · 1 wrong · 9 req. empty · 67 s · plan | not run | 7/17 · 0 wrong · 10 req. empty · 199 s · $1.54 · hit step cap | 5/17 · 1 wrong · 11 req. empty · 56 s · $0.11 | not run |

Not yet run: 3 Teamtailor (career.teamtailor.com); 7 Personio (German) (seitenbau-gmbh.jobs.personio.de); 8 own job board (jobs.techtree.dev); 9 Greenhouse embed (careers.nebius.com); 10 Greenhouse embed (own site) (content.red-badger.com).

<!-- RESULTS-END -->

**Why our extension made wrong values (found by reading its logs):** (1) a phone pattern `/phone|mobile|.../` in `extension/page/fill-read.js` put the phone number into the question "Have you automated mobile (iOS/Android) ... workflows?" (fixed on main by #623); (2) a gender radio group was answered "Male" though the facts are silent (the gender dropdown on the same form was handled); (3) "Are you currently based in Austin, San Antonio, or elsewhere?" was answered "Yes" (the applicant is in Zurich). (2) and (3) are re-checked on main.

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
