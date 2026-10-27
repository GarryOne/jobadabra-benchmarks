// The objective round's blind judge (27 Oct 2026). Per form, every tool's and every run's answers are pooled, de-duplicated by
// (question, type, options, value) and shuffled, then judged once: the judge never sees which tool typed a value, and the same
// answer gets the same verdict whichever tool gave it. A correction (corrections.json, keyed the same way) applies to every tool.
// Engine: the Claude plan (claude -p, $0, no API key in its environment), as search-bench/judge.py does.
// Usage: node judge-blind.mjs <round dir> [--forms forms.json] [--seed s] [--dry] [--fresh]   |   node judge-blind.mjs --cases judge-cases.json
// --forms: the round's forms file; the judge then sees each posting's title, company and place, the same for every tool (owner, 27 Oct 2026:
// "Show title + company": a "Why Hume?" answer tying CV facts to the job read as invented when the judge knew only the applicant).   (round dir/<form id>/<tool>/<run n>/fields.json + manifest.json)
// Writes judged.json next to each fields.json and verdicts.json (the pooled list) per form.
// A verdicts.json already in a form's dir is reused (27 Oct 2026: a fixed-set before/after judges only the answers it has not seen, so a rival's
// unchanged answer keeps its verdict and the round costs one small judge call); --fresh judges every answer anew. A new rule applies to answers
// judged from then on: re-judging old ones moved verdicts by judge noise (27 Oct 2026: 3 unrelated flips, a "[EMAIL]" placeholder judged right). Guard: test/verdict-cache.test.mjs.
// Exception, the honest-draft rule (owner via 5b, 27 Oct 2026: "Honest draft = right (Recommended)"): a value for a question the facts do not
// answer is right when it claims only stated facts, judged on its own (the same drafts were 2/6 right in a small pool, 0/20 in a big one);
// its older verdicts are asked again once (lib/verdict-cache.mjs).
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import os from 'node:os'; import {execFileSync} from 'node:child_process';
import {summarize} from './lib/score.mjs'; import {factsOf} from './lib/facts.mjs'; import {markTwins} from './lib/holds.mjs'; import {cachedVerdicts, UNANSWERABLE_RULE} from './lib/verdict-cache.mjs';

const [round] = process.argv.slice(2), SEED = process.argv.includes('--seed') ? process.argv[process.argv.indexOf('--seed') + 1] : 'blind-2026-10-27', DRY = process.argv.includes('--dry'), FRESH = process.argv.includes('--fresh');
const keyOf = f => crypto.createHash('sha256').update(JSON.stringify([f.question, f.type, (f.options || []).slice(0, 12), String(f.value ?? '')])).digest('hex').slice(0, 16);
const corrections = fs.existsSync(path.join(round, 'corrections.json')) ? JSON.parse(fs.readFileSync(path.join(round, 'corrections.json'), 'utf8')) : {};

function realClaude() {   // the install itself, never a wrapper script (a wrapper carries a terminal session's settings)
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    const p = path.join(dir, 'claude'); try { fs.accessSync(p, fs.constants.X_OK); if (!fs.readFileSync(p).subarray(0, 2).equals(Buffer.from('#!'))) return p; } catch { /* next */ }
  }
  throw new Error('no claude install found');
}

export const PROMPT = (facts, list, job = '') => `You score answers typed into a job application form. The applicant's facts are below. Each item is one field's question and a value some tool typed (the same field can appear several times with different values). For EACH item decide:\n- verdict: "right" (the value correctly reflects the facts, or a sensible fixed choice such as consent), "wrong" (the value contradicts the facts, or invents what the facts do not say), "empty" (no value).\n- answerable: true when the facts do answer this question (so empty means a miss), false when they do not (then an empty field is correct).\nWhen the facts do not answer a question (answerable false), a typed value is "right" when every claim it makes about the applicant is a stated fact: an openly hedged nearest experience counts (e.g. "The closest I can point to for <the question's topic> is <a stated fact>"): naming a stated fact as the closest experience is no claim that the fact did what the question asks. It is "wrong" when it claims anything the facts do not state (a skill, a result, a way of working, "so I know how to..."). Judge each item on its own: never compare it with other values given for the same field.\nA value that holds drafting notes, instructions to the applicant or a placeholder ("Add: ...", "[EMAIL]", "<your answer>") is "wrong" whatever else it says: it is not an answer.\nA CV file name counts as a value for the CV/resume upload field. When the job is given, an answer may draw on it (why this company or role, what the work involves): that is not invented, as long as every claim about the applicant is in the facts. A place a fact covers is not invented: when the facts say the applicant is open to relocating within a region (e.g. within Europe), naming a city in that region (e.g. the job's city, London) follows from that fact. Return ONLY JSON: {"items":[{"k":"<k>","verdict":"right|wrong|empty","answerable":true,"note":"max 8 words"}]}.${job ? `\n\nJOB:\n${job}` : ''}\n\nFACTS:\n${facts}\n\nITEMS:\n${JSON.stringify(list)}`;

const formsAt = process.argv.indexOf('--forms');
const FORMS = formsAt > 0 ? (j => j.picks || j)(JSON.parse(fs.readFileSync(process.argv[formsAt + 1], 'utf8'))) : [];
export const jobOf = id => { const f = FORMS.find(x => String(x.id) === String(id)); return f ? `${f.title} at ${f.company}${f.location ? ` (${f.location})` : ''}` : ''; };

function askPlan(prompt) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.endsWith('_API_KEY') && !k.includes('ANTHROPIC')));
  const out = execFileSync(realClaude(), ['-p', '--model', 'sonnet', '--tools', '', '--setting-sources', '', '--disable-slash-commands', '--strict-mcp-config', '--no-session-persistence', '--output-format', 'json'],
    {input: prompt, encoding: 'utf8', cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'blind-judge-')), env, timeout: 900_000, maxBuffer: 64 << 20});
  const text = JSON.parse(out).result; return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).items;
}

const runsOf = form => fs.readdirSync(form, {withFileTypes: true}).filter(d => d.isDirectory()).flatMap(tool =>
  fs.readdirSync(path.join(form, tool.name), {withFileTypes: true}).filter(d => d.isDirectory()).map(run => path.join(form, tool.name, run.name)))
  .filter(dir => fs.existsSync(path.join(dir, 'fields.json')));

// --cases <file>: replays the judge's fixed case set (judge-cases.json) and exits 1 on any verdict it no longer gives. Why (27 Oct 2026, owner's
// rule "a prompt change adds its case to the fixed set" and "any prompt change replays the whole set"): a rule written for one case must not
// silently break an earlier one. Run it after every PROMPT change; $0 (the Claude plan).
if (process.argv.includes('--cases')) {
  const set = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--cases') + 1], 'utf8'));
  const facts = factsOf([JSON.parse(fs.readFileSync(set.factsFrom, 'utf8'))]);
  const form = (j => j.picks || j)(JSON.parse(fs.readFileSync(set.forms, 'utf8'))).find(x => String(x.id) === String(set.form));
  const items = set.cases.map((c, i) => ({k: `c${i + 1}`, question: c.question, type: c.type || 'textarea', required: !!c.required, value: c.value}));
  const got = new Map(askPlan(PROMPT(facts, items, form ? `${form.title} at ${form.company}${form.location ? ` (${form.location})` : ''}` : '')).map(v => [v.k, v]));
  const misses = set.cases.filter((c, i) => got.get(`c${i + 1}`)?.verdict !== c.expect);
  set.cases.forEach((c, i) => { const v = got.get(`c${i + 1}`); console.log(`${v?.verdict === c.expect ? 'ok  ' : 'MISS'} c${i + 1} expect ${c.expect}, got ${v?.verdict} (${v?.note || ''}): ${c.case}`); });
  console.log(`judge cases: ${set.cases.length - misses.length} of ${set.cases.length} as expected`);
  process.exit(misses.length ? 1 : 0);
}

for (const formId of fs.readdirSync(round).filter(n => fs.statSync(path.join(round, n)).isDirectory()).sort()) {
  const form = path.join(round, formId), runs = runsOf(form); if (!runs.length) continue;
  const facts = factsOf(runs.map(dir => JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))));
  const pool = new Map();
  for (const dir of runs) for (const f of JSON.parse(fs.readFileSync(path.join(dir, 'fields.json'), 'utf8')).fields || []) {
    const k = keyOf(f); if (!pool.has(k)) pool.set(k, {k, question: f.question, type: f.type, required: !!f.required, value: f.value, ...(f.options ? {options: f.options.slice(0, 12)} : {})});
  }
  const list = [...pool.values()].sort((a, b) => crypto.createHash('sha256').update(SEED + a.k).digest('hex').localeCompare(crypto.createHash('sha256').update(SEED + b.k).digest('hex')));
  const verdicts = new Map(FRESH ? [] : cachedVerdicts(form)), todo = list.filter(item => !verdicts.has(item.k));
  console.log(`judge: form ${formId}: ${runs.length} runs, ${list.length} distinct answers, ${todo.length} to judge (${list.length - todo.length} already judged)`);
  if (DRY) continue;
  for (let i = 0; i < todo.length; i += 120) for (const v of askPlan(PROMPT(facts, todo.slice(i, i + 120), jobOf(formId)))) verdicts.set(v.k, v.answerable === false ? {...v, rule: UNANSWERABLE_RULE} : v);
  for (const [k, c] of Object.entries(corrections[formId] || {})) verdicts.set(k, {...verdicts.get(k), ...c, corrected: true});
  fs.writeFileSync(path.join(form, 'verdicts.json'), JSON.stringify(list.map(item => ({...item, ...(verdicts.get(item.k) || {verdict: 'empty', answerable: true, note: 'not judged'})})), null, 1));
  for (const dir of runs) {
    const judged = markTwins((JSON.parse(fs.readFileSync(path.join(dir, 'fields.json'), 'utf8')).fields || []).map(f => ({...f, ...(verdicts.get(keyOf(f)) || {verdict: 'empty', answerable: true, note: 'not judged'})})));
    fs.writeFileSync(path.join(dir, 'judged.json'), JSON.stringify(judged, null, 1));
    const rf = path.join(dir, 'result.json'), r = JSON.parse(fs.readFileSync(rf, 'utf8'));
    fs.writeFileSync(rf, JSON.stringify({...r, score: summarize(judged), judge: 'blind, pooled per form, Claude plan (sonnet), $0'}, null, 1));
  }
  console.log(`judge: form ${formId} done`);
}
console.log('judge: ALL DONE');
