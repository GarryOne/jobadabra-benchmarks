// node report.mjs [md|notion]: the whole bake-off in one view from out/<id>/<tool>/{result,judged,guard}: totals per tool over the COMPLETE forms (every tool valid), then one row block per form.
// Counting as summary.mjs: required right / total, wrong values, required empty, time, cost, step cap; "answerable" by majority across the tools; INVALID/dropped marked.
import fs from 'node:fs'; import path from 'node:path'; import {submitLike} from './lib/guard.mjs';
const mode = process.argv[2] || 'md', here = import.meta.dirname, out = path.join(here, 'out'), TOOLS = ['extension', 'stagehand', 'browser-use', 'nanobrowser'];
const NAME = {extension: 'Our extension', stagehand: 'Stagehand', 'browser-use': 'Browser Use', nanobrowser: 'Nanobrowser'};
const forms = [...JSON.parse(fs.readFileSync(path.join(here, 'forms.json'), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(here, 'forms-fresh.json'), 'utf8'))];
const read = (id, t, f) => { try { return JSON.parse(fs.readFileSync(path.join(out, String(id), t, f), 'utf8')); } catch { return null; } };
const data = forms.map(form => {
  const judged = Object.fromEntries(TOOLS.map(t => [t, read(form.id, t, 'judged.json') || []]));
  const answerable = i => { const js = TOOLS.filter(t => judged[t][i]); return js.filter(t => judged[t][i].answerable).length * 2 > js.length; };
  const dropped = fs.existsSync(path.join(out, String(form.id), 'DROPPED.txt')) || fs.existsSync(path.join(out, String(form.id), 'drop.json'));
  const tools = Object.fromEntries(TOOLS.map(t => {
    if (fs.existsSync(path.join(out, String(form.id), t, 'INVALID.txt'))) return [t, {invalid: true}];
    const r = read(form.id, t, 'result.json'); if (!r) return [t, null];
    const j = judged[t], req = j.filter(f => f.required), g = (fs.readFileSync(path.join(out, String(form.id), t, 'guard.jsonl'), 'utf8').split('\n').filter(Boolean)).map(l => JSON.parse(l));
    return [t, {reqRight: req.filter(f => f.verdict === 'right').length, req: req.length, wrong: j.filter(f => f.verdict === 'wrong').length, reqEmpty: req.filter(f => f.verdict === 'empty').length, optRight: j.filter(f => !f.required && f.verdict === 'right').length,
      sec: r.seconds, usd: r.usd, capped: r.capped, submit: g.filter(e => !e.allow).some(submitLike)}];
  }));
  return {form, dropped, tools};
});
const valid = e => e && !e.invalid, complete = data.filter(d => !d.dropped && ['extension', 'stagehand', 'browser-use'].every(t => valid(d.tools[t])));
const tot = t => { const xs = complete.map(d => d.tools[t]).filter(valid); if (!xs.length) return null; const n = k => xs.reduce((a, x) => a + (x[k] || 0), 0); return {forms: xs.length, reqRight: n('reqRight'), req: n('req'), wrong: n('wrong'), reqEmpty: n('reqEmpty'), sec: Math.round(n('sec') / xs.length), usd: xs.some(x => x.usd == null) ? 'plan' : '$' + n('usd').toFixed(2), capped: xs.filter(x => x.capped).length, submit: xs.filter(x => x.submit).length}; };
const row = (t, x) => !x ? `not run` : x.invalid ? 'INVALID (API limit)' : `${x.reqRight}/${x.req} · ${x.wrong} wrong · ${x.reqEmpty} req. empty · ${Math.round(x.sec)} s · ${x.usd == null ? 'plan' : '$' + x.usd.toFixed(2)}${x.capped ? ' · hit step cap' : ''}${x.submit ? ' · PRESSED SUBMIT (blocked)' : ''}`;
const th = ['Tool', 'Required right', 'Wrong', 'Required empty', 'Avg time', 'Cost', 'Hit cap', 'Submit pressed'];
const totRows = TOOLS.map(t => [t, tot(t)]).filter(([, x]) => x).map(([t, x]) => [NAME[t], `${x.reqRight}/${x.req}`, x.wrong, `${x.reqEmpty}/${x.req}`, `${x.sec} s`, x.usd, `${x.capped}/${x.forms}`, x.submit]);
const formRows = data.filter(d => d.dropped || TOOLS.some(t => d.tools[t])).map(d => [`${d.form.id}`, `${d.form.platform} · ${d.form.host}`, d.dropped ? 'DROPPED: posting closed, no form' : '', ...TOOLS.map(t => d.dropped ? '-' : row(t, d.tools[t]))]);
const pending = data.filter(d => !d.dropped && !TOOLS.some(t => d.tools[t])).map(d => `${d.form.id} ${d.form.platform} (${d.form.host})`);
if (mode === 'notion') {
  const tr = cells => `<tr>${cells.map(c => `<td>${String(c).replace(/\$/g, '\\$')}</td>`).join('')}</tr>`;
  console.log(`<table fit-page-width="true" header-row="true">\n${tr(th)}\n${totRows.map(tr).join('\n')}\n</table>\nTotals over the ${complete.length} complete forms (every tool valid): ${complete.map(d => d.form.host).join(', ')}.\n`);
  console.log(`<table fit-page-width="true" header-row="true">\n${tr(['#', 'Form', 'Note', ...TOOLS.map(t => NAME[t])])}\n${formRows.map(tr).join('\n')}\n</table>\nNot yet run: ${pending.join('; ')}.`);
} else {
  const line = c => `| ${c.join(' | ')} |`;
  console.log(`${line(th)}\n${line(th.map(() => '---'))}\n${totRows.map(line).join('\n')}\n\nTotals over the ${complete.length} complete forms (every tool valid): ${complete.map(d => d.form.host).join(', ')}.\n`);
  console.log(`${line(['#', 'Form', 'Note', ...TOOLS.map(t => NAME[t])])}\n${line(['---', '---', '---', '---', '---', '---', '---'])}\n${formRows.map(line).join('\n')}\n\nNot yet run: ${pending.join('; ')}.`);
}
