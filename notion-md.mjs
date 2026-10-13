// node notion-md.mjs <out/<id> folder> "<title>": the Notion-markdown block (a toggle with the per-tool table) for one form, from result.json + judged.json + guard.jsonl, same counting as summary.mjs.
import fs from 'node:fs'; import path from 'node:path'; import {submitLike} from './lib/guard.mjs';
const [dir, title] = process.argv.slice(2), TOOLS = ['extension', 'stagehand', 'browser-use', 'nanobrowser'], NAME = {extension: '**Our extension**', stagehand: 'Stagehand', 'browser-use': 'Browser Use', nanobrowser: 'Nanobrowser'};
const read = (t, f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, t, f), 'utf8')); } catch { return null; } };
const judged = Object.fromEntries(TOOLS.map(t => [t, read(t, 'judged.json') || []]));
const answerable = i => { const js = TOOLS.filter(t => judged[t][i]); return js.filter(t => judged[t][i].answerable).length * 2 > js.length; };
const rows = TOOLS.map(t => {
  if (fs.existsSync(path.join(dir, t, 'INVALID.txt'))) return `<tr><td>${NAME[t]}</td><td colspan="8">INVALID (API limit hit during the run)</td></tr>`;
  const r = read(t, 'result.json'), j = judged[t]; if (!r) return `<tr><td>${NAME[t]}</td><td colspan="8">no result (${fs.existsSync(path.join(dir, t, 'no-result.txt')) ? 'crashed or refused' : 'not run'})</td></tr>`;
  const req = j.filter(f => f.required), g = fs.readFileSync(path.join(dir, t, 'guard.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  return `<tr><td>${NAME[t]}</td><td>${req.filter(f => f.verdict === 'right').length}/${req.length}</td><td>${j.filter(f => f.verdict === 'wrong').length}</td><td>${j.filter(f => !f.required && f.verdict === 'right').length}</td><td>${j.filter((f, i) => f.verdict === 'empty' && answerable(i)).length}</td><td>${r.seconds} s</td><td>${r.usd == null ? 'plan' : '\\$' + r.usd.toFixed(2)}</td><td>${r.capped === undefined ? '-' : r.capped ? 'YES' : 'no'}</td><td>${g.filter(e => !e.allow).some(submitLike) ? 'PRESSED (blocked)' : 'no'}</td></tr>`;
});
console.log(`<details>\n<summary>${title}</summary>\n\t<table fit-page-width="true" header-row="true">\n\t<tr><td>Tool</td><td>Required right</td><td>Wrong</td><td>Optional right</td><td>Empty (facts had it)</td><td>Time</td><td>AI cost</td><td>Hit step cap</td><td>Submit</td></tr>\n\t${rows.join('\n\t')}\n\t</table>\n</details>`);
