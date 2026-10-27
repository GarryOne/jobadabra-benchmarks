import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import {scoreRound} from '../score-round.mjs';
const put = (root, form, tool, run, judged) => { const d = path.join(root, form, tool, run); fs.mkdirSync(d, {recursive: true}); fs.writeFileSync(path.join(d, 'judged.json'), JSON.stringify(judged)); };
test('one line per run: right, wrong, empty-but-answerable, not reached; the twin rule for every tool', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'score-round-'));
  put(root, '1', 'a', '1', [{question: 'Name', verdict: 'right'}, {question: 'City', verdict: 'wrong'}, {question: 'Phone', verdict: 'empty', answerable: true},
    {type: 'file', question: 'Choose file', verdict: 'empty', answerable: true}, {type: 'file', question: 'Replace file', verdict: 'right'}]);
  put(root, '1', 'b', '1', [{question: 'Name', verdict: 'right'}, {question: 'Salary', verdict: 'right'}, {question: 'Gender', verdict: 'empty', answerable: false}]);
  const s = scoreRound(root);
  assert.deepEqual(s.a.runs[0], {run: '1', right: 2, wrong: 1, emptyAnswerable: 1, notReached: 1, forms: 1, score: 40});   // Salary: b had it, a never saw it
  assert.deepEqual(s.b.runs[0], {run: '1', right: 2, wrong: 0, emptyAnswerable: 0, notReached: 1, forms: 1, score: 66.7});   // Replace file: a got it right, b never saw it; Gender is unanswerable
});
