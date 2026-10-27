// search-bench/tools.mjs: every tool in a round's judged rows is published, ours first, rivals by name; an unknown tool keeps its own name.
import test from 'node:test'; import assert from 'node:assert/strict';
import {NAME, toolsOf} from '../search-bench/tools.mjs';
test('ours first, then the rivals present, in a fixed order; unknown tools last', () => {
  const rows = ['career-ops-docs', 'eures', 'jobspy', 'new-tool', 'adzuna', 'career-ops'].map(tool => ({tool}));
  assert.deepEqual(toolsOf(rows), ['ours', 'jobspy', 'eures', 'adzuna', 'career-ops', 'career-ops-docs', 'new-tool']);
  assert.deepEqual(toolsOf([]), ['ours']);   // ours always gets its row, even with nothing found
  assert.equal(NAME['career-ops-docs'], 'career-ops (set up per its docs)');
});
