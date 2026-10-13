// node recover.mjs <out/<id>/browser-use>: a run whose process was stopped after the agent finished (bu.json + fields.json exist, result.json does not): judge the saved end page and write result.json as run.mjs would.
import fs from 'node:fs'; import path from 'node:path';
import {judge, summarize, PRICE} from './lib/score.mjs'; import {buildApplicant} from './lib/applicant.mjs'; import {submitLike} from './lib/guard.mjs';
const dir = process.argv[2], bu = JSON.parse(fs.readFileSync(path.join(dir, 'bu.json'), 'utf8')), data = JSON.parse(fs.readFileSync(path.join(dir, 'fields.json'), 'utf8'));
const a = await buildApplicant(path.dirname(path.dirname(dir))), j = await judge(data.fields, a.text), g = fs.readFileSync(path.join(dir, 'guard.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)), aborted = g.filter(e => !e.allow);
const tokens = bu.usage ? {in: bu.usage.in, out: bu.usage.out} : null;
const result = {tool: 'browser-use', model: 'claude-sonnet-5-5', recovered: 'process stopped after the agent finished; end page judged afterwards', capped: !bu.done && (bu.steps ?? 0) >= 40, steps: bu.steps ?? null, final: bu.final || bu.error || '', completed: !!bu.done, tokens, usd: tokens ? tokens.in * PRICE.in + tokens.out * PRICE.out : null, seconds: bu.seconds,
  submitPressed: aborted.some(submitLike), guard: {aborted: aborted.map(e => `${e.method} ${e.host}${e.path} (${e.why})`), writesLetThrough: []}, score: summarize(j.judged), judgeUsd: j.usd, fileChips: data.fileChips};
fs.writeFileSync(path.join(dir, 'judged.json'), JSON.stringify(j.judged, null, 1)); fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(result, null, 1)); console.log(JSON.stringify({score: result.score, seconds: result.seconds, usd: result.usd}));
