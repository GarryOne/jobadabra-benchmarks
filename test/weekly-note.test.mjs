// lib/weekly-note.mjs: the weekly Telegram message says our score against the baseline and last week, an up/down per form, and never an
// answer or a fact (only scores, counts, form ids).
import test from 'node:test'; import assert from 'node:assert/strict';
import {noteOf, noteText} from '../lib/weekly-note.mjs';
const row = (form, tool, right, wrong, emptyAnswerable = 0) => ({form, tool, run: '1', right, wrong, emptyAnswerable, notReached: 0, unanswerable: 0});
test('per form score and wrong, up/down against the baseline and last week', () => {
  const note = noteOf({tools: {extension: {score: 90}}, rows: [row('101', 'extension', 9, 1), row('102', 'extension', 10, 0), row('101', 'browser-use', 5, 5)]}, {round: 'fixed', build: 'abc1234'});
  assert.deepEqual(note.forms, {101: {score: 90, wrong: 1}, 102: {score: 100, wrong: 0}});
  const baseline = {tools: {extension: 97, 'browser-use': 87.3}, forms: {101: {score: 100, wrong: 0}, 102: {score: 100, wrong: 0}}, label: 'by-hand round'};
  const text = noteText(note, baseline, {tools: {extension: 85}, forms: {}}, 'https://x/run');
  assert.match(text, /fixed set \(our regression check\) · build abc1234/);
  assert.match(text, /Ours 90% \(▼7 vs baseline 97%\) \(▲5 vs last week 85%\)/);
  assert.match(text, /Browser Use 87\.3% \(baseline, by hand\)/);
  assert.match(text, /Form 101: 90% ▼10 · wrong 1 \+1/);
  assert.match(text, /Form 102: 100% =/);
  assert.doesNotMatch(text, /Ada|example\.test|Zurich/);
});
test('a new set: every tool on its own line, no baseline', () => {
  const note = noteOf({tools: {extension: {score: 80}, 'browser-use': {score: 75}}, rows: [row('264501', 'extension', 8, 2)]}, {round: 'week-2026-W45'});
  const text = noteText(note, null, null);
  assert.match(text, /new set, week 2026-W45/); assert.match(text, /^Ours 80%$/m); assert.match(text, /Browser Use 75%/);
});
