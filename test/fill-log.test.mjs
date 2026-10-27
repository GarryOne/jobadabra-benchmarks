// lib/fill-log.mjs keeps only the fill-summary lines of the app log, never a line that carries an answer.
import test from 'node:test'; import assert from 'node:assert/strict';
import {fillLog, postLines} from '../lib/fill-log.mjs';
test('the fill summary, menus, waits and tries stay; answers and everything else go', () => {
  const log = ['[extension 102] fields: 9 filled, 2 left {"fields":[{"label":"Degree","outcome":"empty","reason":"dropdown not clicked"}]}',
    '[extension 102] a menu showed no choice that matched {"label":"School","choices":["Other"]}',
    '[extension 102] a dropdown did not settle: given up {"label":"School"}', '[extension 102] tries per control {"School":3}',
    '[extension 102] button by meaning {"meaning":"Yes, I am authorized"}', '[extension 102] step 4: typed Ada', 'POST /extension/answer fields: 1 filled, 0 left'];
  assert.deepEqual(fillLog(log.join('\n')).split('\n').map(l => l.replace(/^\[extension \d+\] /, '').slice(0, 24)), ['fields: 9 filled, 2 left', 'a menu showed no choice ', 'a dropdown did not settl', 'tries per control {"Scho']);
  assert.equal(fillLog(undefined), '');
});
test('a post body becomes its lines', () => {
  assert.deepEqual(postLines(JSON.stringify({text: 'fields: 1 filled, 0 left', fields: {n: 1}})), ['fields: 1 filled, 0 left {"n":1}']);
  assert.deepEqual(postLines(JSON.stringify({entries: [{text: 'a'}, 'b']})), ['a', 'b']);
  assert.deepEqual(postLines('x\ny'), ['x', 'y']);
});
