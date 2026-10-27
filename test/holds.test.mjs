import test from 'node:test'; import assert from 'node:assert/strict';
import {markTwins} from '../lib/holds.mjs';
// 27 Oct 2026, Workable/Ashby/Lever: after an upload the page keeps its first "Choose file" box (or an "Autofill from resume" box) beside the one
// holding cv.pdf; the reader saw an empty file field and every tool that uploaded lost a point (ours 12, Browser Use 11, Stagehand 6).
const f = (question, value, verdict, answerable = true) => ({type: 'file', question, value, verdict, answerable, required: true});
test('an empty file box beside an uploaded CV is not a miss', () => {
  const out = markTwins([f('Resume Choose file', '', 'empty'), f('Resume Replace file', 'cv.pdf', 'right')]);
  assert.equal(out[0].answerable, false); assert.equal(out[0].twin, true); assert.equal(out[1].verdict, 'right');
});
test('no CV uploaded anywhere: the empty file box stays a miss', () => {
  const out = markTwins([f('Attach', '', 'empty'), {type: 'text', question: 'Name', value: 'A', verdict: 'right'}]);
  assert.equal(out[0].answerable, true); assert.equal(out[0].twin, undefined);
});
test('an empty box named like a filled one is its twin (Lever type-ahead); choices sharing a name are not', () => {
  const t = (type, name, value, verdict) => ({type, name, question: name, value, verdict, answerable: true});
  const out = markTwins([t('text', 'location', 'Zürich, CHE', 'right'), t('text', 'location', '', 'empty'), t('text', 'phone', '', 'empty'),
    t('radio', 'auth', 'Yes', 'right'), t('radio', 'auth', '', 'empty')]);
  assert.deepEqual(out.map(f => f.answerable), [true, false, true, true, true]);
  assert.match(out[1].note, /same name/);
});
