# 📜 Iteration log: how the benchmark was built, in order

Every step, including the ones that failed. Raw data for each run is in [`results/`](results/ALL-RUNS.md). Times are local (UTC+2), 13 Oct 2026 unless noted.

| # | Step | What happened | What we changed |
| --: | --- | --- | --- |
| 1 | **Guard v1** on a local form whose Submit posts | Unguarded control: server got 3 posts. Guarded: 0, even from a tab opened by a second CDP client (as the agents do). | A GraphQL rule matched "Posting" as "post" and blocked a read: the word list was narrowed. |
| 2 | **Guard v2** (cc: unreadable GraphQL counts as a write) | 8 rule cases pass. | Persisted/batched/unreadable GraphQL is aborted; a blocked submit-looking write is flagged "pressed submit". |
| 3 | **Our extension on the local fixture** | It filled nothing: the extension runs on https hosts only. | Later: a *copy* of its manifest with `http://127.0.0.1` (the product's extension is untouched). |
| 4 | **Dry run 1** (both agents, local fixture) | Stagehand: `404` (it needs the browser's websocket address). Browser Use: API `400 tool_choice not supported` ×6, then it wandered to linkedin.com (1,538 telemetry writes aborted). | Stagehand gets the ws URL from `/json/version`. Browser Use: one-line patch (Sonnet 5.5 refuses a forced tool choice). Navigation limit added. |
| 5 | **Dry run 2** | Stagehand: custom tools need `experimental` + `disableAPI`. Browser Use ended on `about:blank`, saw no form, tried the applicant's LinkedIn (now blocked, logged). | Flags set; the instruction now says where the form is and "stay on this site". |
| 6 | **Dry run 3** | Stagehand 7/10 right, then API error "Invalid signature in thinking block". Browser Use 5/10, $0.13. | — |
| 7 | **Dry run 4** | Browser Use 7/10, $0.17 (run-to-run variance 5 vs 7). Stagehand: same thinking error. | Browser Use errors kept in a file. |
| 8 | **Dry runs 5–6** | `thinkingEffort: none` ignored; "thinking: disabled" rejected by the API ("use between_tools"). | A local pass-through: `between_tools`, old thinking blocks dropped, exact token metering. |
| 9 | **Dry run 7** | Stagehand 9/10, $0.39, 30 actions. **It pressed Submit** despite the instruction; the guard aborted it (server saw 0). | Per-tool "pressed submit" flag; this is why the guard exists. |
| 10 | **Live: Lever**, 3 tools back to back | Our ext 4/7, Stagehand 5/7, Browser Use 4/7 required right. The ext was first flagged "pressed submit": a false positive (Lever's CV-parse POST). | Submit detection narrowed to submit-looking writes; scorer: required fields first, optional apart. |
| 11 | **Live: Ashby** | Ext 6/9 valid. Agents' runs hit the API **usage limit**: invalid. Batch killed by PID. | Marked INVALID, never counted; owner raised the limit. |
| 12 | **Live: epilot, arpio, urrly** (fresh forms) | arpio's posting was closed: dropped (the ext followed the company page to another opening). urrly: Stagehand hit the step cap. | Drop rule; "hit the step cap" column. |
| 13 | **Step cap** | I lowered it to 30 for cost; cc: that handicaps the agents. | Back to 40 for both; capped runs flagged. |
| 14 | **Nanobrowser** integrated | Release pinned, its model calls pointed at the pass-through, settings seeded, task started over its side-panel port. Fixture: 4/5 right, 9 steps, $0.23, Submit blocked. No file-upload action. | — |
| 15 | **Live: Hadrian, Tether, formlabs** | Hadrian: Stagehand ran out of time (2/16), Browser Use 11/16. Tether: ext 6/13. formlabs: Browser Use's run hit **empty credits**: invalid. | Marked INVALID; the owner topped up. |
| 16 | **Why the ext made wrong values** (read-only analysis) | Phone number in a "mobile" question (a keyword pattern, fixed on main by #623); a gender radio guessed; a yes/no location not checked. | Findings sent to the fixers. |
| 17 | **Time check** | The ext "102 s" included ~50 s of the harness waiting after the last change. | Its own working time is used (48 s average). |
| 18 | **Old build found** (cc) | The extension leg ran `62dad23`, 57 commits behind main. | Own worktree on main (`9a0416d`); every extension result records its commit; old rows marked. |
| 19 | **Form 3 (Teamtailor) on main** | Two attempts left no result: my crash handler swallowed the error. | Stacks now go to the run log; every tool's output is kept per run. |
| 20 | **Wizard fixture** (5 steps, repeatable section, conditional fields, typeahead, date picker, async check, uploads) | A script drives it end to end: the trail merge keeps earlier steps' answers; Submit aborted. Our ext fills 8 of 11 required fields. | `lib/trail.mjs`; extractor distinguishes repeated sections by field name. |
| 21 | **Live: Personio (German)** | Ext on main 5 right, no required flags found on this form. Agents' runs hit the workspace **usage limit** again: invalid. | Marked INVALID; limit raised to $60. |
| 22 | **Live: nebius (Greenhouse)** | Ext main 7/18, Browser Use 7/18, Nanobrowser 5/18 (hit my 8-minute limit, $0.72). | Nanobrowser's timeout recorded as "capped", events kept. |
| 23 | **Live: red-badger (Greenhouse)** | Ext 4/6, Browser Use 5/6 ($0.28), Nanobrowser 4/6 ($0.87, 422 s). | — |
| 24 | **Publishing everything** (owner: "we don't need to miss any run") | All runs, failures included, with raw data and screenshots; an owner-data scan of what tools typed (clean). | `publish-data.mjs`, `results/`, this log. |
| 25 | **The $5 cap** (owner, 23:25) | Enforced in code (stop at $4.60, every result after the start time counts). | `batch.mjs` budget stop. |
| 26 | **Mistake found: the "main build" runs were not on main** | The re-runs I labelled "main build" (forms 1, 7, 9, 10, Lever) ran the primary checkout's code: the repo path was hard-coded in `run.mjs`. The `build` field in each result recorded the truth (62dad23; form 7: e00984f, the primary had moved). | `JP_REPO` honoured (verified: build 9a0416d on the fixture); the old runs renamed "primary checkout, re-run" and kept; real main-build runs started. |
| 27 | **Hadrian regression: main vs old** | Main stalls 40 s after Claude's answers and never types them (2 live runs, also with the address service allowed through the guard). | Gaps file; QA guide (`QA.md`), `qa.mjs` compare/fields/bisect/localbisect. |
| 28 | **Local look-alike + commit hunt** ($0, no site visits) | `fixture/combo.html` reproduces it; the bug is timing-dependent (answers arriving after the fill starts, under load). 3 runs per build: `76b6a32` 0/3, `7e5bc0f` 0/3, **`5afa5a8` 1/3** lost the answers with the Hadrian signature. | First bad commit: **`5afa5a8` "Extension: a Stop button that freezes everything"**; a fixer session takes it (cc's call). |

*Budget:* the owner approved $9, then $10 more, then replaced it with **$5 from 23:25** (code stop at $4.60). *Safety:* 0 live submits in all runs; the guard stopped the only real Submit attempt (on a local test form).
