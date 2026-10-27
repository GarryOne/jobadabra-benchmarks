# jobadabra-benchmarks: rules

Two benchmarks in one repo (owner, 27 Oct 2026): form filling at the root (`run.mjs`, `judge-blind.mjs`), job search in `search-bench/`.
Public page: jobadabra.top/benchmark (site repo `jobadabra-web`); the full runs stay on /admin.

- **By hand only, rarely** (owner, 27 Oct 2026: "trigger them manually, from time to time. Maybe once in a half a year"): every workflow
  starts on `workflow_dispatch` and nothing else. Guard: `test/workflows.test.mjs`.
- **Cost:** a whole round (both benchmarks) costs at most ~$3, or $0 (owner, 27 Oct 2026). Every tool on one model (`BENCH_MODEL`,
  Haiku 5.5 in the objective round); judges on the Claude plan. Measure a one-form trial before a full round.
- **Fair:** forms drawn by seed (`pick-forms.mjs`) from a list we did not make, minus every company we tested or fixed on; all tools the
  same day, 3 runs each; the judge never sees the tool (`judge-blind.mjs`), a correction applies to the same answer for every tool.
- **Safe:** never submit a live form (the guard in `lib/guard.mjs`), fake applicant only, no captcha or login wall. The Mac allows 3 visits
  a site a day (the product's site ledger): a full round runs on CI with its own one-day limit (owner's yes, 27 Oct 2026).
- **Keys:** create the API keys a benchmark needs yourself, in Claude in Chrome (owner, 27 Oct 2026), inside an account the owner is already
  signed into; a new sign-up, a password or a payment stays his. The value goes straight to the Keychain and a GitHub secret here, never
  into a message, log, file or PR.
- Tests: `node --test test/<file>.test.mjs`, one file at a time on the Mac.
