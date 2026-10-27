// The verdicts a form's dir already holds (verdicts.json from judge-blind.mjs), by answer key, for the judge to reuse (27 Oct 2026: a
// fixed-set before/after judges only the answers it has not seen). An item the judge never answered ('not judged') is asked again; a
// correction's mark stays. Guard: test/verdict-cache.test.mjs.
import fs from 'node:fs'; import path from 'node:path';
export const cachedVerdicts = form => {
  let list; try { list = JSON.parse(fs.readFileSync(path.join(form, 'verdicts.json'), 'utf8')); } catch { return []; }
  return list.filter(v => v.k && ['right', 'wrong', 'empty'].includes(v.verdict) && v.note !== 'not judged')
    .map(({k, verdict, answerable, note, corrected}) => [k, {k, verdict, answerable, note, ...(corrected ? {corrected} : {})}]);
};
