# 🧪 QA guide: use the bake-off to catch regressions in the extension

The benchmark's forms, scorer and safety net double as a **regression test for the extension**. Run any build of the extension on the same forms, compare with a **baseline**, and get a per-form verdict: 🟢 same or better, 🔻 regression, 🆕 no baseline yet.

> [!IMPORTANT]
> **Never test with the primary checkout** (`~/job-pilotto`, the owner's live app runs from it). QA always makes its own **worktree at one commit** (`~/job-pilotto/.claude/worktrees/bakeoff-at-<sha>`), so "which build" is always an exact commit, and every result records it.

---

## ⚡ Quick start (3 commands)

```bash
git -C ~/job-pilotto fetch origin                       # 1. get the latest commits (never pull in the primary checkout)
node qa.mjs run --build origin/main                     # 2. latest main on the QA forms, then the comparison with the baseline
node qa.mjs fields 4 extension extension-b<sha>         # 3. if a form regressed: which fields changed (use the short sha printed in step 2)
```

Step 2 prints a table and exits **1 if any form regressed**, **0** otherwise:

```
| # | Form | Baseline | Now | Verdict |
| 1 | Lever (jobs.lever.co)        | 4/7, 1 wrong (62dad23) | 5/8, 0 wrong (9a0416d) | 🟢 better |
| 4 | Teamtailor (careers.hadrian.io) | 9/16, 0 wrong (62dad23) | 4/16, 1 wrong (9a0416d) | 🔻 REGRESSION |
🔻 1 form(s) regressed over 5 forms.
```

---

## 🧭 How it works

| Piece | What it is |
| --- | --- |
| **Forms** | `forms.json`, `forms-fresh.json`: public no-login forms, one per host. Default QA set: forms **1, 4, 5, 11, 13** (`--forms` to change). |
| **Build** | An exact commit of the Job Pilotto repo. `--build` takes a sha, a branch, `origin/main`, or a PR head (`git fetch origin pull/123/head`, then `--build FETCH_HEAD`). |
| **Run** | The extension on the form in a fresh headless browser, **fake applicant**, never Submit (every write is aborted by the guard). Uses the plan (`claude -p`): no per-token cost. |
| **Score** | One field reader + a judge (Sonnet 5.5, ~$0.015 a form) → required fields right / total, wrong values. |
| **Baseline** | `qa/baseline.json`: the per-form scores of a build we accepted (now: the old build `62dad23`). |
| **Regression** | required right drops by **2 or more**, or by **15 points** of its share, or a **new wrong value** appears. |

---

## 📖 Recipes

### 1. Test a specific build of the extension

```bash
node qa.mjs run --build 9a0416d                  # a commit
node qa.mjs run --build origin/main              # latest main (fetch first)
node qa.mjs run --build my-branch --forms 4,5    # a branch, only some forms
```

Results land in `out/<form>/extension-b<sha>/` (`result.json`, `judged.json`, `fields.json`, `manifest.json`, screenshots, the page captures).

### 2. Compare with the baseline

```bash
node qa.mjs compare --tool extension-b9a0416d
```

### 3. Compare two builds head to head (no baseline file)

```bash
node qa.mjs run --build 62dad23
node qa.mjs run --build 9a0416d
node qa.mjs compare --tool extension-b9a0416d --against extension-b62dad23
```

### 4. See exactly which fields changed

```bash
node qa.mjs fields 4 extension-b62dad23 extension-b9a0416d
```

Example (Hadrian, the regression found on 14 Oct 2026): the old build filled *Where are you based*, *LinkedIn URL* and three experience answers; main left them empty and put a street value in *Address*.

### 4b. Find the commit that caused it (bisect)

```bash
node qa.mjs bisect --good 62dad23 --bad 9a0416d --form 4
```

It binary-searches the commits that touch `extension/` between the two builds (about 4 steps for 11 commits), one **site visit** per step. If the day's visits are used it stops cleanly and prints how to resume (steps already done are kept).

### 5. Accept a build as the new baseline

```bash
node qa.mjs baseline --tool extension-b9a0416d
git add qa/baseline.json && git commit -m "Baseline: main 9a0416d"
```

Only do this after the owner accepted the build; the baseline is data, not a promise.

### 6. Repeat one recorded run (same inputs), maybe on another build

```bash
node rerun.mjs 4 extension --build 62dad23       # Hadrian again, on the old build
node rerun.mjs 13 stagehand                       # an agent again
```

It reads the run's `manifest.json` (URL, tool + version, flags, instruction, extension commit) and writes `out/<form>/<tool>-rerun-<n>/`. Runs from before 14 Oct 2026 have a *backfilled* manifest (it says what is unknown).

### 7. An exact repeat, offline (no site visit)

`results/captures/<run>.tar.gz` holds the page snapshots the extension saw. With the Job Pilotto repo's replay tool:

```bash
tar -xzf results/captures/form-4__extension-main.tar.gz -C /tmp/hadrian-capture
cd ~/job-pilotto/.claude/worktrees/<a worktree>/desktop/e2e
node row.mjs /tmp/hadrian-capture                              # the build in this worktree
node row.mjs /tmp/hadrian-capture --old <other extension dir>  # another build on the same page
```

It shows time, number of AI asks and where the run ended, but **not** the filled values; for field accuracy use a live run (recipe 1).

---

## 🧑‍⚖️ Reading the verdict

| Verdict | Meaning | What to do |
| --- | --- | --- |
| 🟢 same / better | within the rule | nothing |
| 🔻 REGRESSION | worse than the baseline by the rule | **repeat once** (recipe 6) before concluding: agents and pages vary; then `fields` + `bisect` |
| 🆕 no baseline | the form has no baseline yet | freeze one (recipe 5) once the build is accepted |

A regression that reproduces on a second run is a real finding: send the form, the two builds, the `fields` table and the log lines (`out/<form>/<tool>/capture/app.log`) to the fixer.

---

## 💸 Cost, limits, safety

| | |
| --- | --- |
| **Cost** | plan + judge ≈ **$0.015 a form** → a 5-form pass ≈ $0.08. Agents are not part of QA. |
| **Time** | ~2 min a form, one form at a time, headless. |
| **Site limit** | **3 visits per host per day** (a machine-wide ledger). A QA pass is 1 visit per host; a repeat or a bisect step is another. Never override it. |
| **Safety** | the guard aborts every write to the form site (so nothing is submitted); fake applicant; no login/captcha; never the owner's browser or data; a privacy scan runs before anything is published. |
| **Needs** | Keychain `job-pilotto.anthropic.e2e_key` (judge), `~/job-pilotto` repo (to make worktrees), Node + the packages in `package.json`. |

---

## ⚠️ Known limits (read before trusting a verdict)

- **Live sites change**: a posting can close (the form disappears) or a field can be added. If a form's field count changes, compare `fields` before blaming the build.
- **The guard blocks harmless writes** (a page's address autocomplete, the CV presign request): this breaks some page features for every build. `BAKEOFF_READPOSTS=1` lets read-like requests through for a diagnosis run; keep it off for baselines so numbers stay comparable.
- **Run-to-run variance**: the extension's AI steps vary; one run is one sample. Repeat a regression once.
- **Required flags**: some forms (German Personio) show no required markers to the reader, so they cannot be compared on required fields and are skipped.
- **Counts are per control**: a question with several controls counts several times, the same for every build.

---

## ➕ Adding a form to the QA set

1. Pick a public, no-login application form (the form URL itself, not the posting) on a host not already in the set.
2. Add it to `forms-fresh.json`: `{"id": 14, "platform": "…", "host": "…", "url": "…"}`.
3. Run the baseline build on it, check the field reader found the required fields (`fields.json`), then freeze the baseline.

---

## 🗂️ Where things are

`qa.mjs` the QA commands · `rerun.mjs` repeat a run · `batch.mjs` / `run.mjs` the runners · `report.mjs` the scoreboard · `publish-data.mjs` publish every run · `qa/baseline.json` the baseline · `results/` every run published (manifests, per-field verdicts, screenshots, page captures) · `ITERATIONS.md` how the benchmark was built.
