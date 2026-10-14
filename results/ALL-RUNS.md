# Every run, in order

69 runs: 54 on live forms, 15 on the local fixture forms (development iterations). Nothing is left out: invalid, crashed and recovered runs are listed with their status. Times are local (UTC+2). "plan" = our extension on the plan (no per-token price).

| # | When | Run (folder) | Tool | Build | Status | Required right | Wrong | Time | Cost | Cap | Submit pressed | Note |
| --: | --- | --- | --- | --- | --- | :-: | :-: | --: | --: | :-: | :-: | --- |
| 1 | 2026-10-13 19:31 | [fixture/iteration-1-extension](runs/fixture/iteration-1-extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid |  |  | 59 s | plan |  |  |  |
| 2 | 2026-10-13 19:33 | [fixture/iteration-1-browser-use](runs/fixture/iteration-1-browser-use) | Browser Use |  | 🟢 valid | 0/2 | 0 | 10 s | $0 |  |  |  |
| 3 | 2026-10-13 19:34 | [fixture/iteration-2-stagehand](runs/fixture/iteration-2-stagehand) | Stagehand |  | 🟢 valid | 0/5 | 0 | 1 s | $0 |  |  |  |
| 4 | 2026-10-13 19:35 | [fixture/iteration-2-browser-use](runs/fixture/iteration-2-browser-use) | Browser Use |  | 🟢 valid | 0/0 | 0 | 24 s | $0.017 |  |  |  |
| 5 | 2026-10-13 19:35 | [fixture/iteration-3-stagehand](runs/fixture/iteration-3-stagehand) | Stagehand |  | 🟢 valid | 4/5 | 0 | 15 s | $0 |  |  |  |
| 6 | 2026-10-13 19:37 | [fixture/iteration-3-browser-use](runs/fixture/iteration-3-browser-use) | Browser Use |  | 🟢 valid | 4/5 | 0 | 91 s | $0.131 |  |  |  |
| 7 | 2026-10-13 19:38 | [fixture/iteration-4-stagehand](runs/fixture/iteration-4-stagehand) | Stagehand |  | 🟢 valid | 4/5 | 0 | 13 s | $0 |  |  |  |
| 8 | 2026-10-13 19:39 | [fixture/iteration-4-browser-use](runs/fixture/iteration-4-browser-use) | Browser Use |  | 🟢 valid | 4/5 | 0 | 47 s | $0.173 |  |  |  |
| 9 | 2026-10-13 19:39 | [fixture/iteration-5-stagehand](runs/fixture/iteration-5-stagehand) | Stagehand |  | 🟢 valid | 4/5 | 0 | 13 s | $0 |  |  |  |
| 10 | 2026-10-13 19:40 | [fixture/iteration-6-stagehand](runs/fixture/iteration-6-stagehand) | Stagehand |  | 🟢 valid | 0/5 | 0 | 1 s | $0 |  |  |  |
| 11 | 2026-10-13 19:41 | [fixture/iteration-7-stagehand](runs/fixture/iteration-7-stagehand) | Stagehand |  | 🟢 valid | 5/5 | 0 | 72 s | $0.391 |  | 🚨 |  |
| 12 | 2026-10-13 19:45 | [form-1/stagehand](runs/form-1/stagehand) | Stagehand |  | 🟢 valid | 5/7 | 0 | 80 s | $0.418 |  |  |  |
| 13 | 2026-10-13 19:47 | [form-1/browser-use](runs/form-1/browser-use) | Browser Use |  | 🟢 valid | 4/7 | 0 | 84 s | $0.149 |  |  |  |
| 14 | 2026-10-13 19:59 | [form-2/stagehand](runs/form-2/stagehand) | Stagehand |  | ⚫ INVALID (API limit/credits) |  |  |  |  |  |  | INVALID: the Anthropic Tests key hit its usage limit while this tool ran (13 Oct 2026, ~19:55 UTC); not a tool result. L |
| 15 | 2026-10-13 19:59 | [form-2/browser-use](runs/form-2/browser-use) | Browser Use |  | ⚫ INVALID (API limit/credits) |  |  |  |  |  |  | INVALID: the Anthropic Tests key hit its usage limit while this tool ran (13 Oct 2026, ~19:55 UTC); not a tool result. L |
| 16 | 2026-10-13 19:59 | [form-3/extension](runs/form-3/extension) | Our extension (old build 62dad23) | 62dad23 | 🔴 no result |  |  |  |  |  |  |  |
| 17 | 2026-10-13 20:09 | [form-11/stagehand](runs/form-11/stagehand) | Stagehand |  | 🟢 valid | 1/7 | 2 | 333 s | $1.762 |  |  |  |
| 18 | 2026-10-13 20:13 | [form-11/browser-use](runs/form-11/browser-use) | Browser Use |  | 🟢 valid | 2/7 | 0 | 80 s | $0.197 |  |  |  |
| 19 | 2026-10-13 20:16 | [form-12/stagehand](runs/form-12/stagehand) | Stagehand |  | 🟢 valid | 0/0 | 0 | 25 s | $0.117 | ⛔ |  | form dropped (posting closed) |
| 20 | 2026-10-13 20:24 | [form-12/browser-use](runs/form-12/browser-use) | Browser Use |  | 🟢 valid | 0/0 | 0 | 16 s | $0.041 |  |  | form dropped (posting closed) |
| 21 | 2026-10-13 20:29 | [form-13/stagehand](runs/form-13/stagehand) | Stagehand |  | 🟢 valid | 7/17 | 0 | 199 s | $1.545 | ⛔ |  |  |
| 22 | 2026-10-13 20:35 | [form-13/browser-use](runs/form-13/browser-use) | Browser Use |  | 🟢 valid | 5/17 | 1 | 56 s | $0.105 |  |  |  |
| 23 | 2026-10-13 20:35 | [fixture/iteration-1-nanobrowser](runs/fixture/iteration-1-nanobrowser) | Nanobrowser |  | 🟢 valid | 2/5 | 0 | 80 s | $0.229 |  |  |  |
| 24 | 2026-10-13 20:45 | [form-4/stagehand](runs/form-4/stagehand) | Stagehand |  | 🟢 valid | 2/16 | 0 | 482 s | $1.393 |  |  |  |
| 25 | 2026-10-13 20:48 | [form-4/browser-use](runs/form-4/browser-use) | Browser Use |  | 🟢 valid | 11/16 | 0 | 180 s | $0.363 |  |  |  |
| 26 | 2026-10-13 20:52 | [form-5/stagehand](runs/form-5/stagehand) | Stagehand |  | 🟢 valid | 5/13 | 0 | 89 s | $0.487 |  |  |  |
| 27 | 2026-10-13 20:53 | [fixture/wizard-wiz-ext](runs/fixture/wizard-wiz-ext) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 4/11 | 0 | 71 s | plan |  |  |  |
| 28 | 2026-10-13 20:59 | [form-5/browser-use](runs/form-5/browser-use) | Browser Use |  | 🟢 valid | 3/13 | 0 | 61 s | $0.106 |  |  |  |
| 29 | 2026-10-13 21:05 | [form-6/stagehand](runs/form-6/stagehand) | Stagehand |  | 🟢 valid | 4/7 | 0 | 125 s | $1.134 |  |  |  |
| 30 | 2026-10-13 21:11 | [form-11/extension](runs/form-11/extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 2/7 | 0 | 83 s | plan |  |  |  |
| 31 | 2026-10-13 21:11 | [form-12/extension](runs/form-12/extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 6/21 | 1 | 121 s | plan |  |  | form dropped (posting closed) |
| 32 | 2026-10-13 21:11 | [form-13/extension](runs/form-13/extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 7/17 | 1 | 120 s | plan |  |  |  |
| 33 | 2026-10-13 21:11 | [form-2/extension](runs/form-2/extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 6/9 | 0 | 113 s | plan |  |  |  |
| 34 | 2026-10-13 21:11 | [form-4/extension](runs/form-4/extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 9/16 | 0 | 111 s | plan |  |  |  |
| 35 | 2026-10-13 21:11 | [form-5/extension](runs/form-5/extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 6/13 | 1 | 87 s | plan |  |  |  |
| 36 | 2026-10-13 21:11 | [form-6/extension](runs/form-6/extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 4/7 | 0 | 150 s | plan |  |  |  |
| 37 | 2026-10-13 21:11 | [form-1/extension](runs/form-1/extension) | Our extension (old build 62dad23) | 62dad23 | 🟢 valid | 4/7 | 1 | 110 s | plan |  |  |  |
| 38 | 2026-10-13 21:15 | [fixture/iteration-1-extension-old2](runs/fixture/iteration-1-extension-old2) | Our extension (primary checkout, re-run) | 62dad23 | 🟢 valid |  |  | 53 s | plan |  |  |  |
| 39 | 2026-10-13 21:17 | [form-3/extension-old2](runs/form-3/extension-old2) | Our extension (primary checkout, re-run) |  | 🔴 crashed, no result |  |  |  |  |  |  |  |
| 40 | 2026-10-13 21:29 | [form-7/extension-old2](runs/form-7/extension-old2) | Our extension (primary checkout, re-run) | e00984f | 🟢 valid | 0/0 | 0 | 138 s | plan |  |  |  |
| 41 | 2026-10-13 21:30 | [form-7/browser-use](runs/form-7/browser-use) | Browser Use |  | ⚫ INVALID (API limit/credits) |  |  |  |  |  |  | INVALID: the Anthropic workspace usage limit was hit during this run (13 Oct 2026 ~23:30); not a tool result. |
| 42 | 2026-10-13 21:31 | [form-7/nanobrowser](runs/form-7/nanobrowser) | Nanobrowser |  | ⚫ INVALID (API limit/credits) |  |  |  |  |  |  | INVALID: the Anthropic workspace usage limit was hit during this run (13 Oct 2026 ~23:30); not a tool result. |
| 43 | 2026-10-13 21:43 | [form-9/extension-old2](runs/form-9/extension-old2) | Our extension (primary checkout, re-run) | 62dad23 | 🟢 valid | 6/18 | 0 | 203 s | plan |  |  |  |
| 44 | 2026-10-13 21:45 | [form-9/browser-use](runs/form-9/browser-use) | Browser Use |  | 🟢 valid | 6/18 | 0 | 106 s | $0.351 |  |  |  |
| 45 | 2026-10-13 21:54 | [form-9/nanobrowser](runs/form-9/nanobrowser) | Nanobrowser |  | 🟢 valid | 4/18 | 0 | 480 s | $0.719 | ⛔ |  |  |
| 46 | 2026-10-13 21:56 | [form-10/extension-old2](runs/form-10/extension-old2) | Our extension (primary checkout, re-run) | 62dad23 | 🟢 valid | 4/6 | 0 | 109 s | plan |  |  |  |
| 47 | 2026-10-13 21:57 | [form-10/browser-use](runs/form-10/browser-use) | Browser Use |  | 🟢 valid | 5/6 | 0 | 85 s | $0.283 |  |  |  |
| 48 | 2026-10-13 22:05 | [form-10/nanobrowser](runs/form-10/nanobrowser) | Nanobrowser |  | 🟢 valid | 4/6 | 0 | 422 s | $0.866 | ⛔ |  |  |
| 49 | 2026-10-13 22:09 | [form-1/extension-old2](runs/form-1/extension-old2) | Our extension (primary checkout, re-run) | 62dad23 | 🟢 valid | 4/7 | 0 | 125 s | plan |  |  |  |
| 50 | 2026-10-13 22:10 | [form-11/extension-old2](runs/form-11/extension-old2) | Our extension (primary checkout, re-run) |  | 🔴 no result |  |  |  |  |  |  |  |
| 51 | 2026-10-13 22:10 | [form-2/extension-old2](runs/form-2/extension-old2) | Our extension (primary checkout, re-run) |  | 🔴 no result |  |  |  |  |  |  |  |
| 52 | 2026-10-13 22:12 | [fixture/iteration-1-extmain2](runs/fixture/iteration-1-extmain2) | undefined | 9a0416d | 🟢 valid |  |  | 72 s | plan |  |  |  |
| 53 | 2026-10-13 22:14 | [form-1/extension-main](runs/form-1/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 5/8 | 0 | 124 s | plan |  |  |  |
| 54 | 2026-10-13 22:18 | [form-2/extension-main](runs/form-2/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 6/9 | 0 | 149 s | plan |  | 🚨 |  |
| 55 | 2026-10-13 22:20 | [form-3/extension-main](runs/form-3/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 3/4 | 0 | 94 s | plan |  |  |  |
| 56 | 2026-10-13 22:23 | [form-4/extension-main](runs/form-4/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 4/16 | 1 | 136 s | plan |  |  |  |
| 57 | 2026-10-13 22:24 | [form-5/extension-main](runs/form-5/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 6/13 | 0 | 93 s | plan |  |  |  |
| 58 | 2026-10-13 22:27 | [form-6/extension-main](runs/form-6/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 4/9 | 0 | 123 s | plan |  |  |  |
| 59 | 2026-10-13 22:29 | [form-7/extension-main](runs/form-7/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 0/0 | 0 | 109 s | plan |  |  |  |
| 60 | 2026-10-13 22:33 | [form-9/extension-main](runs/form-9/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 6/18 | 0 | 150 s | plan |  |  |  |
| 61 | 2026-10-13 22:35 | [form-10/extension-main](runs/form-10/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 4/6 | 0 | 123 s | plan |  |  |  |
| 62 | 2026-10-13 22:38 | [form-11/extension-main](runs/form-11/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 2/7 | 0 | 116 s | plan |  |  |  |
| 63 | 2026-10-13 22:41 | [form-13/extension-main](runs/form-13/extension-main) | Our extension (main build) | 9a0416d | 🟢 valid | 9/18 | 0 | 122 s | plan |  |  |  |
| 64 | 2026-10-13 22:42 | [form-6/browser-use](runs/form-6/browser-use) | Browser Use |  | ⚫ INVALID (API limit/credits) | 3/9 | 0 | 52 s | $0.103 |  |  | INVALID: the Anthropic credit balance ran out during this run (API: 'Your credit balance is too low'), not a tool result |
| 65 | 2026-10-13 22:50 | [form-1/nanobrowser](runs/form-1/nanobrowser) | Nanobrowser |  | 🟢 valid | 5/9 | 3 | 413 s | $0.473 |  |  |  |
| 66 | 2026-10-13 22:57 | [form-4/nanobrowser](runs/form-4/nanobrowser) | Nanobrowser |  | 🟢 valid | 10/16 | 0 | 329 s | $0.797 |  |  |  |
| 67 | 2026-10-13 23:04 | [form-5/nanobrowser](runs/form-5/nanobrowser) | Nanobrowser |  | 🟢 valid | 3/13 | 1 | 271 s | $0.463 |  |  |  |
| 68 | 2026-10-13 23:14 | [form-11/nanobrowser](runs/form-11/nanobrowser) | Nanobrowser |  | 🟢 valid | 2/7 | 0 | 421 s | $0.783 | ⛔ |  |  |
| 69 | 2026-10-13 23:19 | [form-13/nanobrowser](runs/form-13/nanobrowser) | Nanobrowser |  | 🟢 valid | 5/17 | 2 | 192 s | $0.841 |  |  |  |
