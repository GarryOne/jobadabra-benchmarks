import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import {scoreRound} from '../score-round.mjs';
const put = (root, form, tool, run, judged, fileChips) => { const d = path.join(root, form, tool, run); fs.mkdirSync(d, {recursive: true}); fs.writeFileSync(path.join(d, 'judged.json'), JSON.stringify(judged));
  if (fileChips) fs.writeFileSync(path.join(d, 'fields.json'), JSON.stringify({fields: [], fileChips})); };
test('one line per run: right, wrong, empty-but-answerable, not reached; the twin rule for every tool', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'score-round-'));
  put(root, '1', 'a', '1', [{question: 'Name', verdict: 'right'}, {question: 'City', verdict: 'wrong'}, {question: 'Phone', verdict: 'empty', answerable: true},
    {type: 'file', question: 'Choose file', verdict: 'empty', answerable: true}, {type: 'file', question: 'Replace file', verdict: 'right'}]);
  put(root, '1', 'b', '1', [{question: 'Name', verdict: 'right'}, {question: 'Salary', verdict: 'right'}, {question: 'Gender', verdict: 'empty', answerable: false}]);
  const s = scoreRound(root);
  assert.deepEqual(s.a.runs[0], {run: '1', right: 2, wrong: 1, emptyAnswerable: 1, notReached: 1, forms: 1, score: 40});   // Salary: b had it, a never saw it
  assert.deepEqual(s.b.runs[0], {run: '1', right: 2, wrong: 0, emptyAnswerable: 0, notReached: 1, forms: 1, score: 66.7});   // Replace file: a got it right, b never saw it; Gender is unanswerable
});
test('one field is one field: a label that changed while a tool typed is not "not reached", and a CV shown as a chip in its slot is filled', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'score-round-'));
  // form 105's shape: the place box's label held its suggestion list, so each tool read it under another text; same name, so the same field
  put(root, '1', 'a', '1', [{type: 'text', name: 'location', question: 'Current location ✱Zürich, CHE No location found', verdict: 'right', answerable: true}]);
  put(root, '1', 'b', '1', [{type: 'text', name: 'location', question: 'Current location ✱Click to choose: Zurich', verdict: 'right', answerable: true}]);
  // forms 101/102's shape: the page dropped its file box after the upload and drew the file as a chip; the saved fields kept the box's empty "Attach" reading
  put(root, '2', 'a', '1', [{type: 'file', name: 'resume', question: 'Attach', verdict: 'empty', answerable: true}, {type: 'file', name: 'cover_letter', question: 'Attach', verdict: 'empty', answerable: true}],
    ['Resume/CV*cv.pdf', 'cv.pdf']);
  put(root, '2', 'b', '1', [{type: 'file', name: 'resume', question: 'Attach', verdict: 'empty', answerable: true}], ['Accepted file types: pdf, doc']);
  const s = scoreRound(root);
  assert.deepEqual(s.a.runs[0], {run: '1', right: 2, wrong: 0, emptyAnswerable: 0, notReached: 0, forms: 2, score: 100});   // CV from its chip; the cover letter box is its twin
  assert.deepEqual(s.b.runs[0], {run: '1', right: 1, wrong: 0, emptyAnswerable: 1, notReached: 0, forms: 2, score: 50});    // no file named in b's chips: still a miss
});
test('one slot, one file: a chip the reader already read as a filled row is not counted again on its emptied box', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'score-round-'));
  // form 102 after PR #4's reader: the chip row "Resume/CV*" cv.pdf, and the emptied "resume" box under the same words
  put(root, '1', 'a', '1', [{type: 'file', name: 'resume', question: 'Resume/CV*', verdict: 'empty', answerable: false, twin: true},
    {type: 'file', name: '', question: 'Resume/CV*', value: 'cv.pdf', verdict: 'right', answerable: true}], ['Resume/CV*cv.pdf', 'cv.pdf']);
  // b, read by the older reader, saw the same slot as "Attach" named resume: the chip row is no question b never reached
  put(root, '1', 'b', '1', [{type: 'file', name: 'resume', question: 'Attach', verdict: 'empty', answerable: true}], ['Resume/CV*cv.pdf']);
  const s = scoreRound(root);
  assert.deepEqual(s.a.runs[0], {run: '1', right: 1, wrong: 0, emptyAnswerable: 0, notReached: 0, forms: 1, score: 100});
  assert.deepEqual(s.b.runs[0], {run: '1', right: 1, wrong: 0, emptyAnswerable: 0, notReached: 0, forms: 1, score: 100});
});
