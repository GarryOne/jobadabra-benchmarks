// One score line per run of a judged round (owner via 6e, 27 Oct 2026: the fair round is the one score every filling fix is judged by).
// Per run: right / wrong / empty-but-answerable / not reached, and the score = right / (right + wrong + empty-but-answerable + not reached).
// "Not reached": a question some other tool filled right on that form that this run never saw. The file-twin rule (lib/holds.mjs) applies to
// every tool alike. Reads <round>/<form>/<tool>/<run>/judged.json (judge-blind.mjs). Guard: test/score-round.test.mjs.
// Usage: node score-round.mjs <round dir> [--json <out file>]
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
import {markFileTwins} from './lib/holds.mjs'; import {markChipUploads} from './lib/file-chips.mjs';

const dirs = p => fs.readdirSync(p, {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name).sort();
// A run saw a field when it read the same question OR the same name: a label's text can change while a tool types (a place box's label held its suggestion list,
// 27 Oct 2026, form 105: one box read under 3 texts, the texts only rivals saw counted "not reached"), and some pages name a field anew on each load (Ashby), so neither alone.
const nameKey = f => (f.name ? `${f.type}|${f.name}` : '');
const chipsOf = dir => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'fields.json'), 'utf8')).fileChips || []; } catch { return []; } };

export function scoreRound(round) {
  const runs = [];   // {form, tool, run, judged}
  for (const form of dirs(round)) for (const tool of dirs(path.join(round, form))) for (const run of dirs(path.join(round, form, tool))) {
    const dir = path.join(round, form, tool, run), f = path.join(dir, 'judged.json');
    if (fs.existsSync(f)) runs.push({form, tool, run, judged: markFileTwins(markChipUploads(JSON.parse(fs.readFileSync(f, 'utf8')), chipsOf(dir)))});
  }
  const rightBy = {};   // form -> tool -> fields that tool got right in any run
  for (const r of runs) for (const f of r.judged) if (f.verdict === 'right') ((rightBy[r.form] ||= {})[r.tool] ||= []).push(f);
  const lines = {};   // tool -> run -> counts summed over forms
  for (const r of runs) {
    const seen = new Set(r.judged.flatMap(f => [f.question, nameKey(f)]).filter(Boolean)), others = Object.entries(rightBy[r.form] || {}).filter(([t]) => t !== r.tool);
    const notReached = new Set(others.flatMap(([, fs]) => fs).filter(f => !seen.has(f.question) && !seen.has(nameKey(f))).map(f => f.question)).size;
    const c = ((lines[r.tool] ||= {})[r.run] ||= {right: 0, wrong: 0, emptyAnswerable: 0, notReached: 0, forms: 0});
    c.forms++; c.notReached += notReached;
    for (const f of r.judged) { if (f.verdict === 'right') c.right++; else if (f.verdict === 'wrong') c.wrong++; else if (f.verdict === 'empty' && f.answerable) c.emptyAnswerable++; }
  }
  const out = {};
  for (const [tool, byRun] of Object.entries(lines)) {
    const perRun = Object.entries(byRun).sort().map(([run, c]) => ({run, ...c, score: +(100 * c.right / Math.max(1, c.right + c.wrong + c.emptyAnswerable + c.notReached)).toFixed(1)}));
    const s = perRun.map(r => r.score), mean = s.reduce((a, b) => a + b, 0) / s.length;
    out[tool] = {score: +mean.toFixed(1), spread: [Math.min(...s), Math.max(...s)], runs: perRun};
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [round] = process.argv.slice(2), at = process.argv.indexOf('--json'), result = scoreRound(round);
  for (const [tool, t] of Object.entries(result).sort((a, b) => b[1].score - a[1].score)) {
    console.log(`${tool.padEnd(12)} ${String(t.score).padStart(5)}%  (${t.spread.join('-')})`);
    for (const r of t.runs) console.log(`  run ${r.run}: ${r.score}%  right ${r.right} · wrong ${r.wrong} · empty-but-answerable ${r.emptyAnswerable} · not reached ${r.notReached}  (${r.forms} forms)`);
  }
  if (at > 0) fs.writeFileSync(process.argv[at + 1], JSON.stringify(result, null, 1));
}
