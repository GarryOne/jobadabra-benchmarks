// lib/verdict-cache.mjs: the judge reuses a form's earlier verdicts by answer key; an unjudged item or a missing file gives nothing to reuse.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import {cachedVerdicts, UNANSWERABLE_RULE} from '../lib/verdict-cache.mjs';
test('earlier verdicts by key; "not judged" is asked again; no file, nothing', () => {
  const form = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-cache-'));
  assert.deepEqual(cachedVerdicts(form), []);
  fs.writeFileSync(path.join(form, 'verdicts.json'), JSON.stringify([
    {k: 'a', question: 'Email', value: 'x@y.test', verdict: 'right', answerable: true, note: 'matches'},
    {k: 'b', question: 'City', value: '', verdict: 'empty', answerable: true, note: 'not judged'},
    {k: 'c', question: 'Name', value: 'Tester', verdict: 'wrong', answerable: true, note: 'last name only', corrected: true}]));
  assert.deepEqual(new Map(cachedVerdicts(form)), new Map([['a', {k: 'a', verdict: 'right', answerable: true, note: 'matches'}],
    ['c', {k: 'c', verdict: 'wrong', answerable: true, note: 'last name only', corrected: true}]]));
});

// The honest-draft rule (owner via 5b, 27 Oct 2026): a value for a question the facts do not answer, judged before the rule, is asked again;
// one judged under it, an empty one, an answerable one or a corrected one stays.
test('an unanswerable value from before the honest-draft rule is asked again, for every tool alike', () => {
  const form = fs.mkdtempSync(path.join(os.tmpdir(), 'verdict-cache-'));
  fs.writeFileSync(path.join(form, 'verdicts.json'), JSON.stringify([
    {k: 'old', question: 'Backlog?', value: 'The closest I can point to is X', verdict: 'wrong', answerable: false, note: 'not answerable'},
    {k: 'new', question: 'Backlog?', value: 'The closest is Y', verdict: 'right', answerable: false, note: 'honest', rule: UNANSWERABLE_RULE},
    {k: 'none', question: 'Backlog?', value: '', verdict: 'empty', answerable: false, note: 'empty ok'},
    {k: 'fix', question: 'Backlog?', value: 'Z', verdict: 'wrong', answerable: false, note: 'invents', corrected: true},
    {k: 'ans', question: 'Email', value: 'x@y.test', verdict: 'right', answerable: true, note: 'matches'}]));
  assert.deepEqual(cachedVerdicts(form).map(([k]) => k), ['new', 'none', 'fix', 'ans']);
});
