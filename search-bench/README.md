# search-bench: Jobadabra's job search against other tools

Same random role × city searches for both tools, a blind judge, one page: `/admin/benchmark-job-search` (private site repo). The form-filling twin of this folder is the repo root (`qa.mjs`, `publish-site.mjs`).

| Step | File |
|---|---|
| Pick personas (seeded, 5 non-tech + 5 tech, one city per country) | `pick.py` → `personas.json` |
| Other tool: zero-token scan on a GitHub runner, pinned, no secrets, persona N | `.github/workflows/search-bench-career-ops.yml`, config rule `make-config.py` |
| Ours: the repo's own search on a throwaway install, fictional CV | `make-cv.py` + `tools/persona-search/run.mjs` (public repo) |
| One round, personas N..M, both tools, extract, judge | `WORK=<scratch> bash round.sh 1 10` |
| Pool, shuffle, judge blind (role, place) | `extract.py`, `judge.py` (needs `BENCH_JUDGE_KEY`, an eval key, never the production account) |
| Rows to the admin page + judged lists to `results/<round>/` | `node publish.mjs <WORK> --round YYYY-MM-DD --build <sha>` (`--dry` first) |

Rules: career-ops never runs on a Mac; its job gets no secrets. Only the role keyword and the place change in its config, by script. Compare discovery (jobs found in places) so neither tool's scoring is in it.
Results hold titles, employers, places and job systems only, never posting texts. Judge cost is about $0.06 a persona on the API, but it scales with the pooled list: the judge refuses a list over 400 jobs and counts the round's spend in `judge-spend.json`, stopping at the approved cap (`BENCH_JUDGE_CAP_USD`, default $1.00, change it only with the owner's yes); `BENCH_JUDGE_ENGINE=plan` judges on the Claude plan at $0 (tests: `search-bench/test_judge_cap.py`).
