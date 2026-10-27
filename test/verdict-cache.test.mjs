// lib/verdict-cache.mjs: the judge reuses a form's earlier verdicts by answer key; an unjudged item or a missing file gives nothing to reuse.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import {cachedVerdicts} from '../lib/verdict-cache.mjs';
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
