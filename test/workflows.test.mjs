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
// The one exception: the weekly new set runs on a schedule (owner via 6e, 27 Oct 2026: "Yes: fixed set + weekly new set (Recommended)").
const SCHEDULED = {'form-weekly.yml': ['schedule', 'workflow_dispatch']};
for (const f of files) test(`${f} starts by hand only${SCHEDULED[f] ? ', or on its weekly schedule' : ''}`, () =>
  assert.deepEqual(triggersOf(fs.readFileSync(path.join(dir, f), 'utf8')), SCHEDULED[f] || ['workflow_dispatch']));
test('form-weekly.yml: once a week, and it hands its draw to the form round to publish', () => {
  const text = fs.readFileSync(path.join(dir, 'form-weekly.yml'), 'utf8');
  assert.deepEqual([...text.matchAll(/cron: '([^']+)'/g)].map(m => m[1]), ['0 6 * * 1']);
  assert.match(text, /gh workflow run form-round\.yml[\s\S]*-f runs='\[1\]'[\s\S]*-f publish="week-\$WEEK"/, 'all four tools, 1 repeat, published as the week');
  assert.match(text, /tools\/excluded\.sh jp \. picks\/weekly/, 'every company we know and every earlier week left out');
});

// Every round publishes itself as its last step (owner via 6e, 27 Oct 2026): a form round takes `publish` and its last job judges, scores
// and sends the round with publish-fair.mjs; it runs after every contestant's job, on a fresh runner.
test('form-round.yml: the last job judges, scores and publishes the round', () => {
  const text = fs.readFileSync(path.join(dir, 'form-round.yml'), 'utf8'), last = text.slice(text.lastIndexOf('\n  publish:'));
  assert.match(text, /^ {6}publish:\n {8}description:/m, 'a publish input');
  assert.match(last, /needs: run\n/); assert.match(last, /if: \$\{\{ !cancelled\(\) && inputs\.publish != '' \}\}/);
  for (const step of [/node judge-blind\.mjs pool --forms "\$FORMS"/, /node score-round\.mjs pool/, /node publish-fair\.mjs pool --round "\$ROUND"/]) assert.match(last, step);
  assert.match(last, /cp -R rounds\/fixed\/\. pool\//, 'the fixed set judges inside its frozen baseline');
  assert.match(last, /BENCHMARK_PUBLISH_KEY: '\$\{\{ secrets\.BENCHMARK_PUBLISH_KEY \}\}'/);
});

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
    assert.match(text, /gh api "repos\/GarryOne\/jobadabra\/commits\/\$REF"/, 'resolved by the commits API (actions/checkout refuses a short commit)');
    const refs = [...text.matchAll(/repository: GarryOne\/jobadabra,\s*ref: '([^']+)'/g)].map(m => m[1]);
    assert.ok(refs.length >= 1, 'a job checks out the product');
    assert.deepEqual(refs.filter(r => r !== '${{ needs.build.outputs.sha }}'), [], 'every checkout of our product uses the resolved commit, never the input ref');
  });
}

// The form bench asks every tool to fill the application, so ours fills it too: our eligibility stop is off (owner via 6e, 27 Oct 2026:
// "Off for the form bench (Recommended)"; the round had it on, and ours filled only the contact details on North-America jobs).
test('form-round.yml: our eligibility check is off', () =>
  assert.match(fs.readFileSync(path.join(dir, 'form-round.yml'), 'utf8'), /^\s+LIVE_ELIGIBILITY: 'off'/m));
