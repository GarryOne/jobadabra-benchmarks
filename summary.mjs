// node summary.mjs <out folder with one sub folder per tool>: the per-tool table for one form, from result.json + guard.jsonl (submit flag recomputed with the current guard rule) + judged.json.
import fs from 'node:fs'; import path from 'node:path'; import {submitLike} from './lib/guard.mjs';
const dir = process.argv[2], rows = [], TOOLS = ['extension', 'stagehand', 'browser-use'];
// "answerable" (do the facts answer this question?) is a property of the question, not of the tool: majority of the tools' judge calls, so the judge's noise does not move one tool's empty count.
const judged = Object.fromEntries(TOOLS.map(t => [t, fs.existsSync(path.join(dir, t, 'judged.json')) ? JSON.parse(fs.readFileSync(path.join(dir, t, 'judged.json'), 'utf8')) : []]));
const answerable = i => TOOLS.filter(t => judged[t][i]).map(t => judged[t][i].answerable).filter(Boolean).length * 2 > TOOLS.filter(t => judged[t][i]).length;
const count = t => { const j = judged[t]; return {right: j.filter(f => f.verdict === 'right').length, wrong: j.filter(f => f.verdict === 'wrong').length, emptyFill: j.filter((f, i) => f.verdict === 'empty' && answerable(i)).length, emptyReq: j.filter(f => f.verdict === 'empty' && f.required).length, reqRight: j.filter(f => f.required && f.verdict === 'right').length, optRight: j.filter(f => !f.required && f.verdict === 'right').length, req: j.filter(f => f.required).length, fields: j.length}; };
for (const tool of ['extension', 'stagehand', 'browser-use']) {
  if (fs.existsSync(path.join(dir, tool, 'INVALID.txt'))) { rows.push({tool, 'required right': 'INVALID (API limit)'}); continue; }
  const f = path.join(dir, tool, 'result.json'); if (!fs.existsSync(f)) continue;
  const r = JSON.parse(fs.readFileSync(f, 'utf8')), g = fs.readFileSync(path.join(dir, tool, 'guard.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const aborted = g.filter(e => !e.allow), s = count(tool);
  rows.push({tool, 'required right': `${s.reqRight}/${s.req}`, wrong: s.wrong, 'optional right': s.optRight, emptyFill: s.emptyFill, emptyReq: `${s.emptyReq}/${s.req}`, fields: s.fields, sec: r.seconds, steps: r.steps, usd: r.usd == null ? 'plan' : r.usd.toFixed(2), capped: r.capped === undefined ? 'n/a' : r.capped ? 'YES (stopped at step cap)' : 'no', submit: aborted.some(submitLike) ? 'PRESSED (blocked)' : 'no', nav: (g.filter(e => e.method === 'NAV').map(e => e.host).join(',') || '-'), abortedN: aborted.length,
    writes: [...new Set(g.filter(e => e.allow && e.why !== 'read' && e.why !== 'stand-in app').map(e => `${e.method} ${e.host} (${e.why})`))].join('; ') || '-', cloud: [...new Set(aborted.filter(e => !submitLike(e)).map(e => `${e.method} ${e.host}${e.path.slice(0, 25)}`))].slice(0, 4).join('; ')});
}
console.table(rows.map(({writes, cloud, ...r}) => r)); console.log(JSON.stringify(rows.filter(r => r.writes !== undefined).map(r => ({tool: r.tool, writes: r.writes, aborted: r.cloud})), null, 1));
