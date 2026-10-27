// publish-fair.mjs: one row per tool, form and repeat, named and split as /admin/form-filling/benchmark keeps them; a bad round key is refused;
// a tool we don't name (a side row like ours-after-fix) never goes out.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import {fairRows} from '../publish-fair.mjs';
const put = (root, form, tool, run, judged, manifest = {}) => { const d = path.join(root, form, tool, run); fs.mkdirSync(d, {recursive: true});
  fs.writeFileSync(path.join(d, 'judged.json'), JSON.stringify(judged)); fs.writeFileSync(path.join(d, 'manifest.json'), JSON.stringify(manifest)); };

test('rows carry the round, the repeat, our build and the split; side rows stay home', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-fair-'));
  put(root, '101', 'extension', '2', [{question: 'Name', verdict: 'right'}, {question: 'City', verdict: 'wrong'}, {question: 'Phone', verdict: 'empty', answerable: true}],
    {startedAt: '2026-10-27T09:00:00.123Z', extension: {commit: '01a0d7cabcdef'}});
  put(root, '101', 'browser-use', '1', [{question: 'Name', verdict: 'right'}, {question: 'Salary', verdict: 'right'}, {question: 'Gender', verdict: 'empty', answerable: false}]);
  put(root, '101', 'ours-after-fix', '1', [{question: 'Name', verdict: 'right'}]);
  const rows = fairRows(root, 'fixed').sort((a, b) => a.tool.localeCompare(b.tool));
  assert.deepEqual(rows.map(r => r.tool), ['Browser Use', 'Our extension']);
  const [bu, ours] = rows;
  assert.deepEqual({id: ours.id, at: ours.at, round: ours.round, rep: ours.rep, build: ours.build, ours: ours.ours, form: ours.form},
    {id: 'fixed/101/extension/01a0d7c/2', at: '2026-10-27T09:00:00Z', round: 'fixed', rep: 2, build: '01a0d7c', ours: true, form: 'Form 101'});
  assert.deepEqual([ours.right, ours.wrong, ours.empty, ours.unreached, ours.required], [1, 1, 1, 1, 3]);   // Salary: Browser Use had it, ours never saw it
  assert.deepEqual([bu.right, bu.wrong, bu.empty, bu.unans, bu.build, bu.ours], [2, 0, 0, 1, '', false]);
});

test('a round key other than fixed or week-YYYY-Www is refused', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-fair-'));
  for (const key of ['', 'week-2026-45', 'old', 'Fixed']) assert.throws(() => fairRows(root, key), /round must be/);
  assert.deepEqual(fairRows(root, 'week-2026-W45'), []);
});
