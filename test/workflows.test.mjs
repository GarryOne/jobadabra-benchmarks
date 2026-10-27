// Benchmarks run by hand only (owner, 27 Oct 2026: "We don't want to run this benchmarks daily on the CI. We want to trigger them
// manually, from time to time. Maybe once in a half a year"): every workflow here starts on workflow_dispatch and nothing else.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';

const dir = path.join(import.meta.dirname, '..', '.github', 'workflows');
const triggersOf = text => {   // the keys directly under `on:` (block form), or the inline value
  const lines = text.split('\n'), i = lines.findIndex(l => /^on:/.test(l));
  if (i < 0) return [];
  const inline = lines[i].replace(/^on:\s*/, '').trim(); if (inline) return inline.replace(/[[\]]/g, '').split(',').map(s => s.trim());
  const keys = []; for (const l of lines.slice(i + 1)) { if (/^\S/.test(l)) break; const m = l.match(/^ {2}([a-z_]+):/); if (m) keys.push(m[1]); }
  return keys;
};
const files = fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f));
test('there are workflows to check', () => assert.ok(files.length > 0));
for (const f of files) test(`${f} starts by hand only`, () => assert.deepEqual(triggersOf(fs.readFileSync(path.join(dir, f), 'utf8')), ['workflow_dispatch']));

// The owner's Claude plan token reaches Claude Code only, never the rival's own scripts (owner via 6e, 27 Oct 2026). Every workflow that
// hands out the token secret must run the rival's node as another user (the shim on PATH) and prove it first with a dummy token.
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!/secrets\.CLAUDE_CODE_OAUTH_TOKEN/.test(text)) continue;
  test(`${f}: the plan token stays with Claude Code`, () => {
    const check = text.indexOf('- name: Isolation check'), use = text.indexOf('secrets.CLAUDE_CODE_OAUTH_TOKEN');
    assert.ok(check > 0 && check < use, 'an isolation check runs before the token is used');
    assert.match(text, /sudo -n -u scanner -H -- env PATH=/, 'node runs as another user, with a clean environment');
    assert.match(text.slice(use), /export PATH="\$RUNNER_TEMP\/shim:\$PATH"/, 'the step with the token puts the shim first');
    assert.match(text.slice(check, use), /EACCES/, 'the check proves /proc is denied');
  });
}
