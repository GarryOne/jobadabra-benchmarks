// node update-readme.mjs <README path>: puts the current `report.mjs md` output between the RESULTS markers.
import fs from 'node:fs'; import {execFileSync} from 'node:child_process'; import path from 'node:path';
const file = process.argv[2], md = execFileSync('node', [path.join(import.meta.dirname, 'report.mjs'), 'md'], {encoding: 'utf8'});
const s = fs.readFileSync(file, 'utf8'), a = '<!-- RESULTS-START -->', b = '<!-- RESULTS-END -->';
fs.writeFileSync(file, s.slice(0, s.indexOf(a) + a.length) + '\n' + md + '\n' + s.slice(s.indexOf(b)));
