import test from 'node:test'; import assert from 'node:assert/strict';
import {markFileTwins} from '../lib/holds.mjs';
// 27 Oct 2026, Workable/Ashby/Lever: after an upload the page keeps its first "Choose file" box (or an "Autofill from resume" box) beside the one
// holding cv.pdf; the reader saw an empty file field and every tool that uploaded lost a point (ours 12, Browser Use 11, Stagehand 6).
const f = (question, value, verdict, answerable = true) => ({type: 'file', question, value, verdict, answerable, required: true});
test('an empty file box beside an uploaded CV is not a miss', () => {
  const out = markFileTwins([f('Resume Choose file', '', 'empty'), f('Resume Replace file', 'cv.pdf', 'right')]);
  assert.equal(out[0].answerable, false); assert.equal(out[0].twin, true); assert.equal(out[1].verdict, 'right');
});
test('no CV uploaded anywhere: the empty file box stays a miss', () => {
  const out = markFileTwins([f('Attach', '', 'empty'), {type: 'text', question: 'Name', value: 'A', verdict: 'right'}]);
  assert.equal(out[0].answerable, true); assert.equal(out[0].twin, undefined);
});
