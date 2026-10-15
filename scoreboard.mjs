// node scoreboard.mjs <today tool dir, e.g. extension-b935956c> [forms]: same-forms table, our extension today vs the 14 Oct build (extension-main) vs the agents' 13-14 Oct runs; right from facts vs by guess, wrong, left empty.
import fs from 'node:fs'; import path from 'node:path';
const now = process.argv[2], ids = (process.argv[3] || '1,4,5,9,11,13').split(',').map(Number), out = path.join(import.meta.dirname, 'out');
const TOOLS = [[now, 'ours today'], ['extension-main', 'ours 14 Oct (9a0416d)'], ['stagehand', 'Stagehand'], ['browser-use', 'Browser Use'], ['nanobrowser', 'Nanobrowser']];
const rj = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const rows = {}, tot = {};
for (const id of ids) {
  const d = path.join(out, id === 1 ? 'lever' : String(id)), J = Object.fromEntries(TOOLS.map(([t]) => [t, fs.existsSync(path.join(d, t, 'INVALID.txt')) ? null : rj(path.join(d, t, 'judged.json'))]));
  const have = TOOLS.map(([t]) => t).filter(t => J[t]), ans = i => have.filter(t => J[t][i]).filter(t => J[t][i].answerable).length * 2 > have.filter(t => J[t][i]).length;
  for (const [t, label] of TOOLS) { const j = J[t]; if (!j) { (rows[id] ||= []).push(`| ${label} | n/a | | | | |`); continue; }
    const req = j.filter(f => f.required), right = req.filter(f => f.verdict === 'right'), facts = right.filter(f => ans(j.indexOf(f))).length, wrong = j.filter(f => f.verdict === 'wrong').length, empty = req.filter(f => f.verdict === 'empty').length;
    (rows[id] ||= []).push(`| ${label} | ${right.length}/${req.length} | ${facts} | ${right.length - facts} | ${wrong} | ${empty} |`);
    const T = tot[label] ||= {right: 0, req: 0, facts: 0, wrong: 0, empty: 0, forms: 0}; T.right += right.length; T.req += req.length; T.facts += facts; T.wrong += wrong; T.empty += empty; T.forms++; }
}
// overall only over forms every listed tool has, so the totals compare like with like
console.log(`## Per form\n`); for (const id of ids) console.log(`**Form ${id}**\n\n| Tool | Required right | From facts | By guess | Wrong | Required empty |\n| --- | :-: | :-: | :-: | :-: | :-: |\n${rows[id].join('\n')}\n`);
console.log(`## Overall (each tool over the forms it has a valid run on)\n\n| Tool | Forms | Required right | % | From facts | By guess | Wrong | Required empty |\n| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |`);
for (const [label, T] of Object.entries(tot)) console.log(`| ${label} | ${T.forms} | ${T.right}/${T.req} | ${Math.round(100 * T.right / T.req)}% | ${T.facts} | ${T.right - T.facts} | ${T.wrong} | ${T.empty} |`);
