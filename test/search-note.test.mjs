// search-bench/note.mjs: the search round's Telegram message (owner, 27 Oct 2026): relevant jobs per tool and ours per persona, against the
// previous run and the baseline; a failed job is said, not shown as 0; only counts and persona labels, never a job.
import test from 'node:test'; import assert from 'node:assert/strict';
import {noteOf, noteText} from '../search-bench/note.mjs';
const job = (tool, role, place, title = 'Job') => ({tool, title, company: 'Co', location: 'Town', role, place});

test('ours against the previous run and the baseline, rivals ranked, a line per persona, missing jobs named', () => {
  const labels = {1: 'Nurse · Townville', 2: 'Coder · Cityburg'};
  const note = noteOf({1: [job('ours', 'yes', 'yes'), job('ours', 'yes', 'no'), job('jobspy', 'yes', 'yes')], 2: [job('eures', 'yes', 'yes'), job('eures', 'yes', 'yes')]}, {round: '2026-10-30', build: 'abc1234', labels});
  assert.deepEqual(note.tools, {ours: {relevant: 1, found: 2}, jobspy: {relevant: 1, found: 1}, eures: {relevant: 2, found: 2}});
  assert.deepEqual(note.personas, {1: {label: 'Nurse · Townville', relevant: 1, found: 2}, 2: {label: 'Coder · Cityburg', relevant: 0, found: 0}});
  const last = {tools: {ours: {relevant: 3}, eures: {relevant: 2}}, personas: {1: {relevant: 3}}}, baseline = {tools: {ours: {relevant: 1}}, personas: {}};
  const text = noteText(note, baseline, last, {missing: ['ours p2'], url: 'https://x/run'});
  assert.match(text, /^🔎 Search round · 2026-10-30 · build abc1234$/m);
  assert.match(text, /^Ours 1 relevant of 2 shown \(▼2 vs the previous run 3\) \(= vs baseline 1\)$/m);
  assert.match(text, /^EURES 2 = · JobSpy 1$/m);
  assert.match(text, /^Searches with none: 1 of 2$/m);
  assert.match(text, /^Nurse · Townville: 1 of 2 shown ▼2$/m);
  assert.match(text, /^⚠ Missing \(a job failed, not a 0\): ours p2$/m);
  assert.doesNotMatch(text, /\bJob\b|Co\b|https:\/\/y/, 'no job title or employer');
});

test('the first run has no previous note: it compares with the baseline only', () => {
  const note = noteOf({1: [job('ours', 'yes', 'yes')]}, {round: 'r'});
  const text = noteText(note, {tools: {ours: {relevant: 0}}, personas: {1: {relevant: 0}}}, null);
  assert.match(text, /^Ours 1 relevant of 1 shown \(▲1 vs baseline 0\)$/m);
  assert.match(text, /^Persona 1: 1 of 1 shown ▲1$/m);
});
