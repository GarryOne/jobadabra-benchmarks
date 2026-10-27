// judge-cases.json: the blind judge's fixed case set (owner, 27 Oct 2026: a prompt change adds its case; every prompt change replays the set
// with `node judge-blind.mjs --cases judge-cases.json`). Offline here: the set is well formed, keeps the owner's honest-draft examples,
// and every correction of the fixed set names an answer that exists.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
const root = path.join(import.meta.dirname, '..'), set = JSON.parse(fs.readFileSync(path.join(root, 'judge-cases.json'), 'utf8'));
test('the case set is well formed and keeps the honest-draft examples', () => {
  assert.ok(fs.existsSync(path.join(root, set.factsFrom)), 'its facts exist');
  for (const c of set.cases) { assert.ok(['right', 'wrong', 'empty'].includes(c.expect), c.case); assert.ok(c.question && c.case); }
  const value = c => set.cases.find(x => x.value === c)?.expect;
  assert.equal(value('The closest I can point to for improving backlog cleanliness and Jira structure across multiple teams is the Terraform platform I built at Acme Cloud, used by 120 engineers.'), 'right', "the owner's right example");
  assert.ok(set.cases.some(c => /so I know how to/.test(c.value) && c.expect === 'wrong'), "the owner's wrong example");
  assert.ok(set.cases.some(c => /^• Add:/.test(c.value) && c.expect === 'wrong'), 'a drafting note is no answer');
});
test('every correction of the fixed set names an answer it holds', () => {
  const corrections = JSON.parse(fs.readFileSync(path.join(root, 'rounds/fixed/corrections.json'), 'utf8'));
  for (const [form, byKey] of Object.entries(corrections)) {
    const keys = new Set(JSON.parse(fs.readFileSync(path.join(root, 'rounds/fixed', form, 'verdicts.json'), 'utf8')).map(v => v.k));
    for (const k of Object.keys(byKey)) assert.ok(keys.has(k), `${form}/${k}`);
  }
});
