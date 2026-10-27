// The objective round's blind judge (27 Oct 2026). Per form, every tool's and every run's answers are pooled, de-duplicated by
// (question, type, options, value) and shuffled, then judged once: the judge never sees which tool typed a value, and the same
// answer gets the same verdict whichever tool gave it. A correction (corrections.json, keyed the same way) applies to every tool.
// Engine: the Claude plan (claude -p, $0, no API key in its environment), as search-bench/judge.py does.
// Usage: node judge-blind.mjs <round dir> [--seed s] [--dry]   (round dir/<form id>/<tool>/<run n>/fields.json + manifest.json)
// Writes judged.json next to each fields.json and verdicts.json (the pooled list) per form.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import os from 'node:os'; import {execFileSync} from 'node:child_process';
import {summarize} from './lib/score.mjs'; import {factsOf} from './lib/facts.mjs';

const [round] = process.argv.slice(2), SEED = process.argv.includes('--seed') ? process.argv[process.argv.indexOf('--seed') + 1] : 'blind-2026-10-27', DRY = process.argv.includes('--dry');
const keyOf = f => crypto.createHash('sha256').update(JSON.stringify([f.question, f.type, (f.options || []).slice(0, 12), String(f.value ?? '')])).digest('hex').slice(0, 16);
const corrections = fs.existsSync(path.join(round, 'corrections.json')) ? JSON.parse(fs.readFileSync(path.join(round, 'corrections.json'), 'utf8')) : {};

function realClaude() {   // the install itself, never a wrapper script (a wrapper carries a terminal session's settings)
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    const p = path.join(dir, 'claude'); try { fs.accessSync(p, fs.constants.X_OK); if (!fs.readFileSync(p).subarray(0, 2).equals(Buffer.from('#!'))) return p; } catch { /* next */ }
  }
  throw new Error('no claude install found');
}

export const PROMPT = (facts, list) => `You score answers typed into a job application form. The applicant's facts are below. Each item is one field's question and a value some tool typed (the same field can appear several times with different values). For EACH item decide:\n- verdict: "right" (the value correctly reflects the facts, or a sensible fixed choice such as consent), "wrong" (the value contradicts the facts, or invents what the facts do not say), "empty" (no value).\n- answerable: true when the facts do answer this question (so empty means a miss), false when they do not (then an empty field is correct).\nA CV file name counts as a value for the CV/resume upload field. Return ONLY JSON: {"items":[{"k":"<k>","verdict":"right|wrong|empty","answerable":true,"note":"max 8 words"}]}.\n\nFACTS:\n${facts}\n\nITEMS:\n${JSON.stringify(list)}`;

function askPlan(prompt) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.endsWith('_API_KEY') && !k.includes('ANTHROPIC')));
  const out = execFileSync(realClaude(), ['-p', '--model', 'sonnet', '--tools', '', '--setting-sources', '', '--disable-slash-commands', '--strict-mcp-config', '--no-session-persistence', '--output-format', 'json'],
    {input: prompt, encoding: 'utf8', cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'blind-judge-')), env, timeout: 900_000, maxBuffer: 64 << 20});
  const text = JSON.parse(out).result; return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).items;
}

const runsOf = form => fs.readdirSync(form, {withFileTypes: true}).filter(d => d.isDirectory()).flatMap(tool =>
  fs.readdirSync(path.join(form, tool.name), {withFileTypes: true}).filter(d => d.isDirectory()).map(run => path.join(form, tool.name, run.name)))
  .filter(dir => fs.existsSync(path.join(dir, 'fields.json')));

for (const formId of fs.readdirSync(round).filter(n => fs.statSync(path.join(round, n)).isDirectory()).sort()) {
  const form = path.join(round, formId), runs = runsOf(form); if (!runs.length) continue;
  const facts = factsOf(runs.map(dir => JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))));
  const pool = new Map();
  for (const dir of runs) for (const f of JSON.parse(fs.readFileSync(path.join(dir, 'fields.json'), 'utf8')).fields || []) {
    const k = keyOf(f); if (!pool.has(k)) pool.set(k, {k, question: f.question, type: f.type, required: !!f.required, value: f.value, ...(f.options ? {options: f.options.slice(0, 12)} : {})});
  }
  const list = [...pool.values()].sort((a, b) => crypto.createHash('sha256').update(SEED + a.k).digest('hex').localeCompare(crypto.createHash('sha256').update(SEED + b.k).digest('hex')));
  console.log(`judge: form ${formId}: ${runs.length} runs, ${list.length} distinct answers`);
  if (DRY) continue;
  const verdicts = new Map();
  for (let i = 0; i < list.length; i += 120) for (const v of askPlan(PROMPT(facts, list.slice(i, i + 120)))) verdicts.set(v.k, v);
  for (const [k, c] of Object.entries(corrections[formId] || {})) verdicts.set(k, {...verdicts.get(k), ...c, corrected: true});
  fs.writeFileSync(path.join(form, 'verdicts.json'), JSON.stringify(list.map(item => ({...item, ...(verdicts.get(item.k) || {verdict: 'empty', answerable: true, note: 'not judged'})})), null, 1));
  for (const dir of runs) {
    const judged = (JSON.parse(fs.readFileSync(path.join(dir, 'fields.json'), 'utf8')).fields || []).map(f => ({...f, ...(verdicts.get(keyOf(f)) || {verdict: 'empty', answerable: true, note: 'not judged'})}));
    fs.writeFileSync(path.join(dir, 'judged.json'), JSON.stringify(judged, null, 1));
    const rf = path.join(dir, 'result.json'), r = JSON.parse(fs.readFileSync(rf, 'utf8'));
    fs.writeFileSync(rf, JSON.stringify({...r, score: summarize(judged), judge: 'blind, pooled per form, Claude plan (sonnet), $0'}, null, 1));
  }
  console.log(`judge: form ${formId} done`);
}
console.log('judge: ALL DONE');
