// node update-readme.mjs <README path>: puts the current `report.mjs md` output between the RESULTS markers.
import fs from 'node:fs'; import {execFileSync} from 'node:child_process'; import path from 'node:path';
const file = process.argv[2], md = execFileSync('node', [path.join(import.meta.dirname, 'report.mjs'), 'readme'], {encoding: 'utf8'});
const s = fs.readFileSync(file, 'utf8'), a = '<!-- RESULTS-START -->', b = '<!-- RESULTS-END -->';
const runsFile = path.join(path.dirname(file), 'results', 'ALL-RUNS.md');
let withRuns = '';
if (fs.existsSync(runsFile)) { const body = fs.readFileSync(runsFile, 'utf8'), table = body.slice(body.indexOf('| # |')), count = (body.match(/^\d+ runs[^\n]*/m) || [''])[0]; withRuns = `<details>\n<summary><b>${count.split(':')[0]}: click to open the full table</b></summary>\n\n${table.replace(/\]\(runs\//g, '](results/runs/')}\n</details>`; }
const put = (text, a, b, md) => text.slice(0, text.indexOf(a) + a.length) + '\n' + md + '\n' + text.slice(text.indexOf(b));
fs.writeFileSync(file, (() => { let t = put(s, a, b, md); if (withRuns && t.includes('<!-- RUNS-START -->')) t = put(t, '<!-- RUNS-START -->', '<!-- RUNS-END -->', withRuns); return t; })());
