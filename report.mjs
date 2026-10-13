// node report.mjs [md|notion]: the whole bake-off in one view from out/<id>/<tool>/{result,judged,guard}: totals per tool over the COMPLETE forms (every tool valid), then one row block per form.
// Counting as summary.mjs: required right / total, wrong values, required empty, time, cost, step cap; "answerable" by majority across the tools; INVALID/dropped marked.
import fs from 'node:fs'; import path from 'node:path'; import {submitLike} from './lib/guard.mjs'; import {activeSeconds} from './lib/activetime.mjs';
const mode = process.argv[2] || 'md', here = import.meta.dirname, out = path.join(here, 'out'), TOOLS = ['extension', 'extension-old2', 'extension-main', 'stagehand', 'browser-use', 'nanobrowser'];
const NAME = {extension: 'Our extension (old build 62dad23)', 'extension-old2': 'Our extension (primary checkout, re-run)', 'extension-main': 'Our extension (main build)', stagehand: 'Stagehand', 'browser-use': 'Browser Use', nanobrowser: 'Nanobrowser'};
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
      sec: t.startsWith('extension') ? (activeSeconds(path.join(out, String(form.id), t)) ?? r.seconds) : r.seconds, usd: r.usd, capped: r.capped, submit: g.filter(e => !e.allow).some(submitLike)}];
  }));
  return {form, dropped, tools};
});
const valid = e => e && !e.invalid, completeFor = t => data.filter(d => !d.dropped && valid(d.tools[t]) && valid(d.tools.stagehand) && valid(d.tools['browser-use']) && d.tools[t].req > 0);   // a tool's totals: the forms where it AND both agents have valid results
const tot = t => { const xs = completeFor(t).map(d => d.tools[t]).filter(valid); if (!xs.length) return null; const n = k => xs.reduce((a, x) => a + (x[k] || 0), 0); return {forms: xs.length, reqRight: n('reqRight'), req: n('req'), wrong: n('wrong'), reqEmpty: n('reqEmpty'), sec: Math.round(n('sec') / xs.length), usd: xs.some(x => x.usd == null) ? 'plan' : '$' + n('usd').toFixed(2), capped: xs.filter(x => x.capped).length, submit: xs.filter(x => x.submit).length}; };
const row = (t, x) => !x ? `not run` : x.invalid ? 'INVALID (API limit)' : `${x.reqRight}/${x.req} · ${x.wrong} wrong · ${x.reqEmpty} req. empty · ${Math.round(x.sec)} s · ${x.usd == null ? 'plan' : '$' + x.usd.toFixed(2)}${x.capped ? ' · hit step cap' : ''}${x.submit ? ' · PRESSED SUBMIT (blocked)' : ''}`;
const th = ['Tool', 'Required right', 'Wrong', 'Required empty', 'Avg time', 'Cost', 'Hit cap', 'Submit pressed', 'Forms'];
const totRows = TOOLS.map(t => [t, tot(t)]).filter(([, x]) => x).map(([t, x]) => [NAME[t], `${x.reqRight}/${x.req}`, x.wrong, `${x.reqEmpty}/${x.req}`, `${x.sec} s`, x.usd, `${x.capped}/${x.forms}`, x.submit, x.forms]);
const formRows = data.filter(d => d.dropped || TOOLS.some(t => d.tools[t])).map(d => [`${d.form.id}`, `${d.form.platform} · ${d.form.host}`, d.dropped ? 'DROPPED: posting closed, no form' : '', ...TOOLS.map(t => d.dropped ? '-' : row(t, d.tools[t]))]);
const pending = data.filter(d => !d.dropped && !TOOLS.some(t => d.tools[t])).map(d => `${d.form.id} ${d.form.platform} (${d.form.host})`);
if (mode === 'readme') {
  // Colour language (legend printed with the table): 🟢 good · 🟡 so-so · 🔴 poor.
  const bar = (n, m) => { const k = m ? Math.round(10 * n / m) : 0; return '▰'.repeat(k) + '▱'.repeat(10 - k); };
  const dFill = p => p >= 45 ? '🟢' : p >= 33 ? '🟡' : '🔴', dWrong = n => n <= 1 ? '🟢' : n === 2 ? '🟡' : '🔴', dTime = s => s <= 60 ? '🟢' : s <= 150 ? '🟡' : '🔴', dCost = u => (u == null || u <= 0.3) ? '🟢' : u <= 1 ? '🟡' : '🔴';
  const MEDAL = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'], short = t => NAME[t].replace(/ \(.*\)/, ''), build = t => t === 'extension' ? ' <sub>old build</sub>' : t === 'extension-main' ? ' <sub>main build</sub>' : '';
  const rows = TOOLS.map(t => [t, tot(t)]).filter(([, x]) => x).sort((p, q) => q[1].reqRight / q[1].req - p[1].reqRight / p[1].req);
  console.log('| | Tool | Required fields filled correctly | Wrong values | Time per form | Cost per form | Forms |\n| :-: | --- | --- | :-: | :-: | :-: | :-: |');
  rows.forEach(([t, x], i) => { const p = Math.round(100 * x.reqRight / x.req), usd = x.usd === 'plan' ? null : Number(x.usd.slice(1)) / x.forms; console.log(`| ${MEDAL[i]} | **${short(t)}**${build(t)} | ${dFill(p)} \`${bar(x.reqRight, x.req)}\` **${x.reqRight}/${x.req}** · ${p}% | ${dWrong(x.wrong)} ${x.wrong} | ${dTime(x.sec)} ${x.sec} s | ${dCost(usd)} ${usd == null ? 'plan' : '$' + usd.toFixed(2)} | ${x.forms} |`); });
  console.log('\n<sub>🟢 good · 🟡 so-so · 🔴 poor. Fill rate: 🟢 ≥45% · 🟡 ≥33%. Wrong values: 🟢 ≤1 · 🟡 2 · 🔴 ≥3. Time: 🟢 ≤60 s · 🟡 ≤150 s · 🔴 slower. Cost: 🟢 plan or ≤$0.30 · 🟡 ≤$1 · 🔴 more.</sub>\n');
  console.log('```mermaid\nxychart-beta\n  title "Required fields filled correctly (%)"\n  x-axis [' + rows.map(([t]) => '"' + short(t) + '"').join(', ') + ']\n  y-axis "percent" 0 --> 100\n  bar [' + rows.map(([, x]) => Math.round(100 * x.reqRight / x.req)).join(', ') + ']\n```\n');
  console.log('### 🧾 Form by form\n');
  for (const d of data.filter(d => d.dropped || TOOLS.some(t => d.tools[t]))) {
    const valids = TOOLS.filter(t => d.tools[t] && !d.tools[t].invalid), head = d.dropped ? '⚫ dropped: posting closed, no form' : valids.map(t => { const x = d.tools[t]; return x.req ? `${dFill(Math.round(100 * x.reqRight / x.req))} ${short(t).replace('Our extension', 'ours')} ${x.reqRight}/${x.req}` : `⚪ ${short(t).replace('Our extension', 'ours')} n/a`; }).join(' &nbsp;·&nbsp; ');
    console.log(`<details>\n<summary><b>#${d.form.id} ${d.form.platform}</b> <sub>${d.form.host}</sub> &nbsp; ${head}</summary>\n`);
    if (!d.dropped) { console.log('| Tool | Required right | Wrong | Required empty | Time | Cost |\n| --- | :-: | :-: | :-: | :-: | :-: |'); for (const t of TOOLS.filter(t => d.tools[t])) { const x = d.tools[t]; console.log(x.invalid ? `| ${short(t)}${build(t)} | ⚫ INVALID: API limit or credits ran out during the run | | | | |` : `| ${short(t)}${build(t)} | ${x.req ? dFill(Math.round(100 * x.reqRight / x.req)) + ' ' + x.reqRight + '/' + x.req : '⚪ n/a (no required flags found)'} | ${dWrong(x.wrong)} ${x.wrong} | ${x.req ? x.reqEmpty : '-'} | ${dTime(x.sec)} ${Math.round(x.sec)} s | ${dCost(x.usd)} ${x.usd == null ? 'plan' : '$' + x.usd.toFixed(2)}${x.capped ? ' ⛔ step cap' : ''}${x.submit ? ' 🚨 PRESSED SUBMIT (blocked)' : ''} |`); } }
    console.log('\n</details>\n');
  }
  const pend = data.filter(d => !d.dropped && !TOOLS.some(t => d.tools[t])).map(d => `#${d.form.id} ${d.form.platform}`);
  console.log(`**⏳ Not run yet:** ${pend.join(' · ')}`);
} else if (mode === 'notion') {
  // Notion: colour cards in columns, colour-filled table cells (td color), emoji medals; same thresholds as the README.
  const bar = (n, m) => { const k = m ? Math.round(10 * n / m) : 0; return '▰'.repeat(k) + '▱'.repeat(10 - k); }, e = x => String(x).replace(/\$/g, '\\$');
  const cFill = p => p >= 45 ? 'green_bg' : p >= 33 ? 'yellow_bg' : 'red_bg', cWrong = n => n <= 1 ? 'green_bg' : n === 2 ? 'yellow_bg' : 'red_bg', cTime = s => s <= 60 ? 'green_bg' : s <= 150 ? 'yellow_bg' : 'red_bg', cCost = u => (u == null || u <= 0.3) ? 'green_bg' : u <= 1 ? 'yellow_bg' : 'red_bg';
  const MEDAL = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'], short = t => NAME[t].replace(/ \(.*\)/, ''), tag = t => t === 'extension' ? ' (old build)' : t === 'extension-main' ? ' (main build)' : '';
  const td = (txt, color) => `<td${color ? ` color="${color}"` : ''}>${e(txt)}</td>`;
  const rows = TOOLS.map(t => [t, tot(t)]).filter(([, x]) => x).sort((p, q) => q[1].reqRight / q[1].req - p[1].reqRight / p[1].req);
  console.log(`<columns>\n${rows.map(([t, x], i) => { const p = Math.round(100 * x.reqRight / x.req); return `\t<column>\n\t\t<callout icon="${MEDAL[i]}" color="${cFill(p)}">\n\t\t\t**${short(t)}**${tag(t)}\n\t\t\t# ${x.reqRight}/${x.req}\n\t\t\t${bar(x.reqRight, x.req)} ${p}% required fields right\n\t\t\t${x.wrong} wrong · ${x.sec} s · ${x.usd === 'plan' ? 'plan' : e('$' + (Number(x.usd.slice(1)) / x.forms).toFixed(2)) + ' a form'}\n\t\t</callout>\n\t</column>`; }).join('\n')}\n</columns>\n`);
  console.log(`<table fit-page-width="true" header-row="true">\n<tr><td></td><td>Tool</td><td>Required right</td><td>Wrong</td><td>Time</td><td>Cost per form</td><td>Forms</td></tr>`);
  rows.forEach(([t, x], i) => { const p = Math.round(100 * x.reqRight / x.req), usd = x.usd === 'plan' ? null : Number(x.usd.slice(1)) / x.forms; console.log(`<tr>${td(MEDAL[i])}${td(short(t) + tag(t))}${td(`${x.reqRight}/${x.req} · ${p}%`, cFill(p))}${td(x.wrong, cWrong(x.wrong))}${td(x.sec + ' s', cTime(x.sec))}${td(usd == null ? 'plan' : '$' + usd.toFixed(2), cCost(usd))}${td(x.forms)}</tr>`); });
  console.log(`</table>\n🟢 good · 🟡 so-so · 🔴 poor. Fill rate 🟢 ≥45% 🟡 ≥33% · wrong 🟢 ≤1 🟡 2 🔴 ≥3 · time 🟢 ≤60 s 🟡 ≤150 s · cost 🟢 plan or ≤\\$0.30 🟡 ≤\\$1.\n`);
  console.log('## 🧾 Form by form\n');
  for (const d of data.filter(d => d.dropped || TOOLS.some(t => d.tools[t]))) {
    const valids = TOOLS.filter(t => d.tools[t] && !d.tools[t].invalid), head = d.dropped ? '⚫ dropped: posting closed' : valids.map(t => { const x = d.tools[t]; return x.req ? `${cFill(Math.round(100 * x.reqRight / x.req)) === 'green_bg' ? '🟢' : cFill(Math.round(100 * x.reqRight / x.req)) === 'yellow_bg' ? '🟡' : '🔴'} ${short(t).replace('Our extension', 'ours')}${t === 'extension' ? ' (old)' : t === 'extension-main' ? ' (main)' : ''} ${x.reqRight}/${x.req}` : `⚪ ${short(t)} n/a`; }).join('  ·  ');
    console.log(`<details>\n<summary>**#${d.form.id} ${d.form.platform}** (${d.form.host})  ${e(head)}</summary>`);
    if (!d.dropped) { console.log(`\t<table fit-page-width="true" header-row="true">\n\t<tr><td>Tool</td><td>Required right</td><td>Wrong</td><td>Required empty</td><td>Time</td><td>Cost</td></tr>`); for (const t of TOOLS.filter(t => d.tools[t])) { const x = d.tools[t]; console.log(x.invalid ? `\t<tr>${td(short(t) + tag(t))}<td colspan="5" color="gray_bg">INVALID: API limit or credits ran out during the run</td></tr>` : `\t<tr>${td(short(t) + tag(t))}${x.req ? td(`${x.reqRight}/${x.req}`, cFill(Math.round(100 * x.reqRight / x.req))) : td('n/a (no required flags found)', 'gray_bg')}${td(x.wrong, cWrong(x.wrong))}${td(x.req ? x.reqEmpty : '-')}${td(Math.round(x.sec) + ' s', cTime(x.sec))}${td((x.usd == null ? 'plan' : '$' + x.usd.toFixed(2)) + (x.capped ? ' ⛔ step cap' : '') + (x.submit ? ' 🚨 PRESSED SUBMIT (blocked)' : ''), cCost(x.usd))}</tr>`); } console.log('\t</table>'); }
    console.log('</details>');
  }
  const pend = data.filter(d => !d.dropped && !TOOLS.some(t => d.tools[t])).map(d => `#${d.form.id} ${d.form.platform}`);
  console.log(`\n⏳ **Not run yet:** ${pend.join(' · ')}`);
} else {
  const line = c => `| ${c.join(' | ')} |`;
  console.log(`${line(th)}\n${line(th.map(() => '---'))}\n${totRows.map(line).join('\n')}\n\nTotals: each row over the forms where that tool and both agents have valid results (forms per row in the last column).\n`);
  console.log(`${line(['#', 'Form', 'Note', ...TOOLS.map(t => NAME[t])])}\n${line(['#', 'Form', 'Note', ...TOOLS].map(() => '---'))}\n${formRows.map(line).join('\n')}\n\nNot yet run: ${pending.join('; ')}.`);
}
