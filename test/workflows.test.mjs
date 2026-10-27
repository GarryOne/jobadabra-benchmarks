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

// The owner's Claude plan token reaches Claude Code only, never a rival's own scripts (owner via 6e, 27 Oct 2026). Every workflow that
// hands out the token secret AND checks out someone else's code must run that code's node as another user (the shim on PATH) and prove
// it first with a dummy token. Our own product (GarryOne/...) and this repo are not third-party.
const thirdParty = text => [...text.matchAll(/repository:\s*([\w.-]+)\//g)].some(m => m[1] !== 'GarryOne');
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!/secrets\.CLAUDE_CODE_OAUTH_TOKEN/.test(text) || !thirdParty(text)) continue;
  test(`${f}: the plan token stays with Claude Code`, () => {
    const check = text.indexOf('- name: Isolation check'), use = text.indexOf('secrets.CLAUDE_CODE_OAUTH_TOKEN');
    assert.ok(check > 0 && check < use, 'an isolation check runs before the token is used');
    assert.match(text, /sudo -n -u scanner -H -- env -i PATH=/, 'node runs as another user with an emptied environment (sudo on the runner keeps it: 27 Oct smoke)');
    assert.match(text.slice(use), /export PATH="\$RUNNER_TEMP\/shim:\$PATH"/, 'the step with the token puts the shim first');
    assert.match(text.slice(check, use), /EACCES/, 'the check proves /proc is denied');
    assert.doesNotMatch(text.slice(use), /claude -p[\s\S]*?; true\s*$/m, 'a failed Claude run fails the job (no swallowed exit code)');
  });
}

// One AI for every contestant (owner, 27 Oct 2026: "why we don't use objectively, the same AI for all? ... If using Haiku then haiku ours
// and theirs"): every workflow holding an AI secret pins the round's model, Haiku 5.5, through BENCH_MODEL or the app's override.
const AI_SECRETS = /secrets\.(BENCH_ANTHROPIC_KEY|CLAUDE_CODE_OAUTH_TOKEN)/;
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!AI_SECRETS.test(text)) continue;
  test(`${f}: every contestant on Haiku 5.5`, () => {
    assert.match(text, /^\s*(BENCH_MODEL|JOB_PILOTTO_MODEL_OVERRIDE): claude-haiku-5-5\b/m, 'the round model is pinned');
    assert.doesNotMatch(text, /extension-shipped|claude-sonnet|claude-opus/, 'no contestant on another model');
    if (/claude -p/.test(text)) assert.match(text, /claude -p [^\n]*--model "\$(BENCH_MODEL|JOB_PILOTTO_MODEL_OVERRIDE)"/, 'Claude Code is told the model');
  });
}

// One build for the whole round (27 Oct 2026: the round passed a branch, the branch was deleted on merge, every job failed at checkout;
// a branch that moves mid-round would also hand jobs different builds). A workflow that takes product_ref resolves it ONCE, in a
// `build` job, to a commit; every job that checks out our product checks out that commit.
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  if (!/^\s+product_ref:/m.test(text)) continue;
  test(`${f}: every job runs one resolved product commit`, () => {
    assert.match(text, /^ {2}build:.*\n[\s\S]*?outputs:\n\s+sha:/m, 'a build job outputs the resolved commit');
    const refs = [...text.matchAll(/repository: GarryOne\/jobadabra,\s*ref: '([^']+)'/g)].map(m => m[1]);
    assert.ok(refs.length >= 2, 'the build job and the matrix job check out the product');
    assert.deepEqual(refs.slice(1).filter(r => r !== '${{ needs.build.outputs.sha }}'), [], 'jobs after the build use its commit, never the input ref');
  });
}
