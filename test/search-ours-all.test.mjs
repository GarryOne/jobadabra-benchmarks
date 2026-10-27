// "Ours" without the rivals' sources and "ours-all" with them (owner, 27 Oct 2026): both lines reach the note and the published rows.
import test from 'node:test'; import assert from 'node:assert/strict';
import {noteOf, noteText} from '../search-bench/note.mjs';

const rows = [
  {tool: 'ours', title: 'Cook', company: 'A', location: 'Krakow', role: 'yes', place: 'yes'},
  {tool: 'ours-all', title: 'Cook', company: 'A', location: 'Krakow', role: 'yes', place: 'yes'},
  {tool: 'ours-all', title: 'Chef', company: 'B', location: 'Krakow', role: 'yes', place: 'yes'},
  {tool: 'eures', title: 'Chef', company: 'B', location: 'Krakow', role: 'yes', place: 'yes'},
  {tool: 'eures', title: 'Aide', company: 'C', location: 'Krakow', role: 'yes', place: 'yes'},
];
test('the note shows ours without the rivals, ours with everything and the relevant jobs we add beyond each rival', () => {
  const note = noteOf({1: rows}, {round: '2026-10-30'});
  assert.deepEqual(note.beyond.eures, 1, 'A is not in EURES');
  assert.equal(note.beyond.jobspy, 2, 'nothing from JobSpy: both ours-all jobs are beyond it');
  const text = noteText(note, null, null);
  assert.match(text, /Ours \(rivals' sources off\) 1 relevant of 1/);
  assert.match(text, /Ours with every source 2 relevant of 2 shown; we add beyond .*EURES 1/);
  assert.doesNotMatch(text.split('\n')[2] || '', /ours-all/, 'the rivals line holds only rivals');
});
