// The bake-off as a regression QA (owner, 14 Oct 2026: "use this mechanism as a QA, to see if we introduce regressions, to have a baseline").
//   node qa.mjs baseline --tool extension            freeze the CURRENT results of that tool folder (default: the old build's) as qa/baseline.json: per form, required right / total, wrong values, seconds, build, run folder.
//   node qa.mjs compare [--tool extension-main]      compare a tool folder's results with the baseline: per form 🟢 same/better, 🔻 REGRESSION, 🆕 no baseline. Exit code 1 when any form regressed.
//   node qa.mjs run --build <git sha|ref> [--forms 1,4,5,11,13]   a worktree at that commit (linked packages like tools/worktree.sh), the extension on each form (plan: no per-token cost; the judge ~$0.015 a form), then compare. One visit per host per run (3 a day).
// Regression = required right drops by 2 or more, or by 15 points of its share or more, or a wrong value appears that the baseline did not have. The baseline is data (qa/baseline.json), not a promise: re-freeze it when a better build is accepted.
import fs from 'node:fs'; import {ensureWorktree} from './lib/worktree.mjs'; import path from 'node:path'; import {execFileSync, spawnSync} from 'node:child_process';
const here = import.meta.dirname, out = path.join(here, 'out'), baseFile = path.join(here, 'qa', 'baseline.json'), [mode, ...rest] = process.argv.slice(2);
const flag = (n, d) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : d; };
const forms = [...JSON.parse(fs.readFileSync(path.join(here, 'forms.json'), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(here, 'forms-fresh.json'), 'utf8'))];
const dirOf = id => path.join(out, id === 1 ? 'lever' : String(id));
const rj = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function measure(id, tool) {   // -> {right, req, wrong, seconds, build, dir} of one run, or null (no valid result)
  const d = path.join(dirOf(id), tool), r = rj(path.join(d, 'result.json')), j = rj(path.join(d, 'judged.json')); if (!r || !j || fs.existsSync(path.join(d, 'INVALID.txt'))) return null;
  const req = j.filter(f => f.required); if (!req.length) return null;   // a form with no required flags found (the German Personio form) cannot be compared on required fields
  return {right: req.filter(f => f.verdict === 'right').length, req: req.length, wrong: j.filter(f => f.verdict === 'wrong').length, seconds: r.seconds, build: r.build || '62dad23', dir: path.relative(here, d)};
}
const regressed = (b, n) => n.right <= b.right - 2 || (n.req && b.req && n.right / n.req <= b.right / b.req - 0.15) || n.wrong > b.wrong;
function compare(tool) {
  const base = rj(baseFile); if (!base) { console.error('no baseline: node qa.mjs baseline first'); process.exit(2); }
  const rows = []; let bad = 0;
  for (const f of forms) { const b = base.forms[f.id], n = measure(f.id, tool); if (!n) continue;
    const status = !b ? '🆕 no baseline' : regressed(b, n) ? '🔻 REGRESSION' : (n.right > b.right || n.wrong < b.wrong) ? '🟢 better' : '🟢 same'; if (status.includes('REGRESSION')) bad++;
    rows.push(`| ${f.id} | ${f.platform} (${f.host}) | ${b ? `${b.right}/${b.req}, ${b.wrong} wrong (${b.build})` : '-'} | ${n.right}/${n.req}, ${n.wrong} wrong (${n.build}) | ${status} |`); }
  console.log(`# QA: ${tool} vs the baseline (${base.tool}, frozen ${base.frozen})\n\n| # | Form | Baseline | Now | Verdict |\n| --: | --- | --- | --- | --- |\n${rows.join('\n')}\n\n${bad ? `🔻 ${bad} form(s) regressed` : '🟢 no regression'} over ${rows.length} forms.`);
  process.exitCode = bad ? 1 : 0; return bad;
}
if (mode === 'baseline') {
  const tool = flag('tool', 'extension'), res = {}; for (const f of forms) { const m = measure(f.id, tool); if (m) res[f.id] = m; }
  fs.mkdirSync(path.dirname(baseFile), {recursive: true}); fs.writeFileSync(baseFile, JSON.stringify({tool, frozen: new Date().toISOString().slice(0, 10), forms: res}, null, 1)); console.log(`baseline frozen from ${tool}: ${Object.keys(res).length} forms`);
} else if (mode === 'compare') compare(flag('tool', 'extension-main'));
else if (mode === 'run') {
  const sha = flag('build'); if (!sha) { console.error('--build <sha>'); process.exit(2); }
  const wt = ensureWorktree(sha);
  const tool = `extension-b${wt.sha}`, ids = flag('forms', '1,4,5,11,13');
  for (const file of ['forms.json', 'forms-fresh.json']) { const r = spawnSync('node', ['batch.mjs', file, ids, '1.0'], {cwd: here, stdio: 'inherit', env: {...process.env, JP_REPO: wt.e2e, BAKEOFF_TOOLS: tool, BAKEOFF_CAP: '100'}}); if (r.status) console.error(`batch ${file}: exit ${r.status}`); }
  compare(tool);
} else { console.error('node qa.mjs baseline|compare|run (see the header)'); process.exit(2); }
