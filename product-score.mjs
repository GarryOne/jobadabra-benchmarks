// node product-score.mjs <tool dir, e.g. extension-b935956c> [forms]: the product score beside the old one; leaves out fields the facts do not answer, consent holds and reader duplicates.
import fs from 'node:fs'; import path from 'node:path';
const tool = process.argv[2], ids = (process.argv[3] || '1,4,5,9,11,13').split(',').map(Number), runs = process.env.RUNS || path.join(import.meta.dirname, 'results', 'runs');
const consent = f => f.verdict === 'empty' && (f.type === 'checkbox' || /consent|acknowledg|agree|privacy|legal/i.test(`${f.note} ${f.question}`)); // a hold by the owner rule, never ticked for the person
const T = {all: 0, right: 0, unans: 0, hold: 0, dup: 0, prod: 0, miss: 0, wrong: 0};
console.log('| Form | Old (right/required) | Not answerable | Consent holds | Duplicates | Product (right/countable) | Missed | Wrong |\n| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |');
for (const id of ids) {
  const req = JSON.parse(fs.readFileSync(path.join(runs, `form-${id}`, tool, 'judged.json'), 'utf8')).filter(f => f.required), seen = new Set(), c = {unans: 0, hold: 0, dup: 0, prod: 0, miss: 0, wrong: 0};
  const right = req.filter(f => f.verdict === 'right').length;
  for (const f of req) {
    const key = `${f.question}|${f.type}`; if (seen.has(key)) { c.dup++; continue; } seen.add(key);
    if (!f.answerable) c.unans++; else if (consent(f)) c.hold++; else { c.prod++; if (f.verdict === 'wrong') c.wrong++; else if (f.verdict === 'empty') c.miss++; }
  }
  console.log(`| ${id} | ${right}/${req.length} | ${c.unans} | ${c.hold} | ${c.dup} | ${right}/${c.prod} | ${c.miss} | ${c.wrong} |`);
  T.all += req.length; T.right += right; for (const k of Object.keys(c)) T[k] += c[k];
}
console.log(`| **All** | ${T.right}/${T.all} (${Math.round(100 * T.right / T.all)}%) | ${T.unans} | ${T.hold} | ${T.dup} | **${T.right}/${T.prod} (${Math.round(100 * T.right / T.prod)}%)** | ${T.miss} | ${T.wrong} |`);
