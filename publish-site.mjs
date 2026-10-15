// node publish-site.mjs [--dry] [--run <dir>] [root...]: sends one summary row per scored run to the owner-only page /admin/benchmark-form-filling (PUT /benchmark/data, Bearer = Keychain job-pilotto.site.selfheal_publish_key or $SELFHEAL_PUBLISH_KEY).
// Reads <root>/<form>/<tool>/{judged.json,result.json,manifest.json} (roots: results/runs/form-N and out/<id>; --run <dir> = one tool dir right after a run). Counts are REQUIRED fields only, as in product-score.mjs:
// right / wrong / empty, not answerable (the facts cannot answer), consent holds (an empty checkbox or consent line, held for the person) and reader duplicates (same question and type twice).
// Forms go out as "Form N" (no hosts), tools by the names below; the site's code is public and holds none of them. Mode = our extension's repair rung: ladderAct on = harness, off = user; a run that did not record it is harness (before 15 Oct 2026 the rung acted in the harness only).
import fs from 'node:fs'; import path from 'node:path'; import {execFileSync} from 'node:child_process';
const here = import.meta.dirname, args = process.argv.slice(2), dry = args.includes('--dry');
const one = args.includes('--run') ? args[args.indexOf('--run') + 1] : null, roots = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--run');
const NAME = {stagehand: 'Stagehand', 'browser-use': 'Browser Use', nanobrowser: 'Nanobrowser'};
const DIR_BUILD = {extension: '62dad23', 'extension-old2': '62dad23', 'extension-main': '9a0416d', 'extension-b935956c': '935956c'};
const rj = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const consent = f => f.verdict === 'empty' && (f.type === 'checkbox' || /consent|acknowledg|agree|privacy|legal/i.test(`${f.note} ${f.question}`));

export function rowOf(dir) {
  const tool = path.basename(dir), formDir = path.basename(path.dirname(dir)), id = formDir === 'lever' ? 1 : Number(formDir.replace(/^form-/, ''));
  const judged = rj(path.join(dir, 'judged.json')), result = rj(path.join(dir, 'result.json')), manifest = rj(path.join(dir, 'manifest.json')) || {};
  if (!judged || !result || !id || !judged.some(f => f.required) || fs.existsSync(path.join(dir, 'INVALID.txt'))) return null;
  const ours = tool.startsWith('extension'); if (!ours && !NAME[tool]) return null;
  const req = judged.filter(f => f.required), seen = new Set(), c = {unans: 0, holds: 0, dups: 0};
  for (const f of req) { const key = `${f.question}|${f.type}`; if (seen.has(key)) { c.dups++; continue; } seen.add(key); if (!f.answerable) c.unans++; else if (consent(f)) c.holds++; }
  const at = manifest.finishedAt || fs.statSync(path.join(dir, 'result.json')).mtime.toISOString(), build = ours ? DIR_BUILD[tool] || manifest.extension?.commit || result.build || '' : '';   // the older folders are named for their build; a backfilled manifest of form 9 says otherwise
  const ladderAct = manifest.flags?.ladderAct ?? result.ladderAct ?? true;
  return {id: `form-${id}/${tool}/${at}`, at, applicant: manifest.applicant || 'thin', mode: ours ? (ladderAct ? 'harness' : 'user') : 'any', tool: ours ? 'Our extension' : NAME[tool], ours, build, form: `Form ${id}`,
    required: req.length, right: req.filter(f => f.verdict === 'right').length, wrong: req.filter(f => f.verdict === 'wrong').length, empty: req.filter(f => f.verdict === 'empty').length, ...c};
}
const toolDirs = root => fs.readdirSync(root, {withFileTypes: true}).filter(d => d.isDirectory()).flatMap(f => fs.readdirSync(path.join(root, f.name), {withFileTypes: true}).filter(d => d.isDirectory() && fs.existsSync(path.join(root, f.name, d.name, 'judged.json'))).map(d => path.join(root, f.name, d.name)));
if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs = one ? [one] : (roots.length ? roots : [path.join(here, 'results', 'runs')]).flatMap(r => fs.existsSync(r) ? toolDirs(r) : []);
  const runs = dirs.map(rowOf).filter(Boolean);
  console.log(`${runs.length} scored runs of ${dirs.length} folders`);
  if (dry) { console.table(runs.map(r => ({run: r.id.slice(0, 30), tool: r.tool, build: r.build, mode: r.mode, required: r.required, right: r.right, wrong: r.wrong, empty: r.empty}))); process.exit(0); }
  const key = process.env.SELFHEAL_PUBLISH_KEY || (() => { try { return execFileSync('security', ['find-generic-password', '-s', 'job-pilotto.site.selfheal_publish_key', '-w'], {encoding: 'utf8'}).trim(); } catch { return ''; } })();
  if (!key) { console.log('no publish key (Keychain job-pilotto.site.selfheal_publish_key): nothing sent'); process.exit(0); }
  for (let i = 0; i < runs.length; i += 200) {
    const res = await fetch(process.env.BENCHMARK_URL || 'https://www.jobpilotto.top/benchmark/data', {method: 'PUT', headers: {Authorization: `Bearer ${key}`}, body: JSON.stringify({runs: runs.slice(i, i + 200)})});
    console.log(res.status, await res.text());
  }
}
