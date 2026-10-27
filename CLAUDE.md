# jobadabra-benchmarks: rules

Two benchmarks in one repo (owner, 27 Oct 2026): form filling at the root (`run.mjs`, `judge-blind.mjs`), job search in `search-bench/`.
Public page: jobadabra.top/benchmark (site repo `jobadabra-web`); the full runs stay on /admin.

- **By hand only, rarely** (owner, 27 Oct 2026: "trigger them manually, from time to time. Maybe once in a half a year"): every workflow
  starts on `workflow_dispatch` and nothing else. Guard: `test/workflows.test.mjs`.
- **Cost:** a whole round (both benchmarks) costs at most ~$3, or $0 (owner, 27 Oct 2026). Every tool on one model (`BENCH_MODEL`,
  Haiku 5.5 in the objective round); judges on the Claude plan. Measure a one-form trial before a full round.
- **Fair:** forms drawn by seed (`pick-forms.mjs`) from a list we did not make, minus every company we tested or fixed on; all tools the
  same day, 3 runs each; the judge never sees the tool (`judge-blind.mjs`), a correction applies to the same answer for every tool.
  - **Same place, same AI for every contestant** (owner, 27 Oct 2026: "If using locally, then locally ours and theirs. If using CI, then CI
    ours and theirs. If using Haiku then haiku ours and theirs"): both rounds on CI, every AI contestant on Haiku 5.5 (form round: the
    Benchmarks API key; search round: the owner's plan token). No extra "as shipped" row. A local run is a side note, never the scoreboard.
    Guarded by test/workflows.test.mjs.
  - **A re-run is the whole round, same day** (27 Oct 2026): when ours must run again (a known bug fixed after the round), re-run
    every contestant of that round the same day; never one contestant alone. The earlier result stays as a labelled "before" row.
- **Safe:** never submit a live form (the guard in `lib/guard.mjs`), fake applicant only, no captcha or login wall. The Mac allows 3 visits
  a site a day (the product's site ledger): a full round runs on CI with its own one-day limit (owner's yes, 27 Oct 2026).
- **Keys:** create the API keys a benchmark needs yourself, in Claude in Chrome (owner, 27 Oct 2026), inside an account the owner is already
  signed into; a new sign-up, a password or a payment stays his. The value goes straight to the Keychain and a GitHub secret here, never
  into a message, log, file or PR.
  - How (27 Oct 2026): a key's own Copy button (or a hidden selected textarea + cmd+c) → `pbpaste` → Keychain + `gh secret set` from stdin,
    then clear the clipboard. A CLI that prints a token (`claude setup-token`) runs in a pty writing to a 600 file; read back only status
    lines, never the lines around the token: terminals wrap it, and a mask on one line printed its tail once. Wipe the file after.
  - Which: the agents' API calls use the Benchmarks workspace key ($5/month limit; owner: "a separate API Key for the benchmarks");
    the search round (ours and career-ops' docs run) uses the owner's plan token; in career-ops' run only Claude Code sees it (its scripts
    run as another Linux user; test/workflows).
    Revoke the plan token after each round (claude.ai → Settings → Claude Code).
- Tests: `node --test test/<file>.test.mjs`, one file at a time on the Mac.
