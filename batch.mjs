// node batch.mjs <forms.json> <ids comma list> <budget usd>: for each form, the extension then Stagehand then Browser Use, back to back (run.mjs); stops before a form when the spend so far (agents + judges) reaches the budget.
// A form where the extension's end page has no fields at all is dropped and named (its reason in out/<id>/drop.json) and the agents are not run on it, so no money goes to a page that is not a form.
import fs from 'node:fs'; import path from 'node:path'; import {spawnSync} from 'node:child_process';
const [file, ids, budget] = process.argv.slice(2), forms = JSON.parse(fs.readFileSync(file, 'utf8')).filter(f => ids.split(',').map(Number).includes(f.id));
// The $9 cap is for everything since the owner's "ok" (13 Oct 2026, key limit raised): every result.json of forms 4+ counts, whatever batch wrote it; a form starts only below CAP.
const CAP = Number(process.env.BAKEOFF_CAP || 7.5), allSpent = () => { let t = 0; const o = path.join(import.meta.dirname, 'out'); for (const id of fs.readdirSync(o)) { if (!/^\d+$/.test(id) || Number(id) < 4) continue; for (const tool of ['extension', 'stagehand', 'browser-use']) { try { const r = JSON.parse(fs.readFileSync(path.join(o, id, tool, 'result.json'), 'utf8')); t += (r.usd || 0) + (r.judgeUsd || 0); } catch { /* not run */ } } } return t; };
let spent = 0; const here = import.meta.dirname;
for (const form of forms) {
  if (spent >= Number(budget) || allSpent() >= CAP) { console.log(`BUDGET reached ($${spent.toFixed(2)} of ${budget}; all forms since the ok: $${allSpent().toFixed(2)} of cap ${CAP}): form ${form.id} (${form.platform}) not run`); continue; }
  console.log(`FORM ${form.id} ${form.platform} ${form.host} start ${new Date().toTimeString().slice(0, 8)} spent so far $${spent.toFixed(2)}`);
  for (const tool of ['extension', 'stagehand', 'browser-use']) {
    const out = path.join(here, 'out', String(form.id), tool); fs.mkdirSync(out, {recursive: true});
    const r = spawnSync('node', ['run.mjs', tool, form.url, out], {cwd: here, encoding: 'utf8', env: {...process.env, JOB_PILOTTO_SESSION: 'bake-off'}, timeout: 15 * 60 * 1000});
    const resFile = path.join(out, 'result.json');
    if (!fs.existsSync(resFile)) { const why = (r.stderr || r.stdout || '').split('\n').filter(l => /Error|refus|limit|SiteLimit/i.test(l)).slice(0, 2).join(' | ').slice(0, 300); console.log(`  ${tool}: NO RESULT ${why}`); fs.writeFileSync(path.join(out, 'no-result.txt'), why); if (tool === 'extension') break; continue; }
    const res = JSON.parse(fs.readFileSync(resFile, 'utf8')); spent += (res.usd || 0) + (res.judgeUsd || 0);
    console.log(`  ${tool}: ${JSON.stringify({score: res.score, sec: res.seconds, steps: res.steps, usd: res.usd, submit: res.submitPressed, navBlocked: res.navBlocked})}`);
    if (tool === 'extension') {
      const f = path.join(out, 'fields.json'), n = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).fields.length : 0;
      if (n === 0) { console.log(`  DROPPED form ${form.id}: the end page has no form fields (not a no-login form at this URL)`); fs.writeFileSync(path.join(here, 'out', String(form.id), 'drop.json'), JSON.stringify({reason: 'no form fields on the page'})); break; }
    }
  }
}
console.log(`BATCH DONE spent $${spent.toFixed(2)}`);
