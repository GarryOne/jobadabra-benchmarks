// node flaky-probe.mjs <fixture url> <runs> <sha> [<sha>...]: a timing-dependent bug needs repeats, not one run per commit. For each extension build: <runs> runs on the local fixture, and how many
// of the fixture's 3 question fields each run typed (the Hadrian regression: Claude's answers arriving during the menu clicks are never typed). Harness from JP_REPO (a recent worktree), extension from each commit.
import fs from 'node:fs'; import path from 'node:path'; import {spawnSync} from 'node:child_process'; import {ensureWorktree} from './lib/worktree.mjs';
const here = import.meta.dirname, [url, runs, ...shas] = process.argv.slice(2), harness = process.env.JP_REPO;
if (!url || !harness || !shas.length) { console.error('usage: JP_REPO=<worktree>/desktop/e2e node flaky-probe.mjs <url> <runs> <sha>...'); process.exit(2); }
for (const sha of shas) {
  const wt = ensureWorktree(sha), results = [];
  for (let i = 1; i <= Number(runs); i++) {
    const dir = path.join(here, 'out', 'probe', `${wt.sha}-${i}`); fs.rmSync(dir, {recursive: true, force: true});
    spawnSync('node', ['run.mjs', 'extension', url, dir, '--no-judge'], {cwd: here, stdio: 'ignore', env: {...process.env, JP_REPO: harness, JP_EXT_DIR: path.join(wt.tree, 'extension')}});
    let typed = -1, order = '';
    try { typed = JSON.parse(fs.readFileSync(path.join(dir, 'fields.json'), 'utf8')).fields.filter(x => /aws|kubernetes|linkedin/i.test(x.question) && String(x.value).trim()).length; } catch { /* no result */ }
    try { const log = fs.readFileSync(path.join(dir, 'capture', 'app.log'), 'utf8'), at = s => log.indexOf(s); order = at('Claude answered') >= 0 && at('fill: filling') >= 0 ? (at('Claude answered') < at('fill: filling') ? 'answers before the fill' : 'answers during/after the fill') : '?'; } catch { /* no log */ }
    results.push(typed); console.log(`${wt.sha} run ${i}: ${typed}/3 typed (${order})`);
  }
  console.log(`${wt.sha}: ${results.filter(n => n < 2).length} of ${results.length} runs lost the answers`);
}
