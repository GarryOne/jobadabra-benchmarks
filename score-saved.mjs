// node score-saved.mjs <fields.json saved from a hand-filled page> <out json>: the same judge and counts as the tools get, on a page the owner filled (e.g. with Simplify).
import {scoreFile} from './lib/score.mjs'; import {buildApplicant} from './lib/applicant.mjs'; import path from 'node:path'; import os from 'node:os';
const [fields, out] = process.argv.slice(2), a = await buildApplicant(path.join(os.tmpdir(), 'bakeoff-applicant'));
const r = await scoreFile(fields, a.text, out); console.log(JSON.stringify({right: r.right, wrong: r.wrong, emptyShouldFill: r.emptyShouldFill, emptyRequired: r.emptyRequired, requiredTotal: r.requiredTotal, judgeUsd: r.judgeUsd}));
