// The verdicts a form's dir already holds (verdicts.json from judge-blind.mjs), by answer key, for the judge to reuse (27 Oct 2026: a
// fixed-set before/after judges only the answers it has not seen). An item the judge never answered ('not judged') is asked again; a
// correction's mark stays. Guard: test/verdict-cache.test.mjs.
// Why (27 Oct 2026, owner via 5b: "Honest draft = right (Recommended)"): a value typed into a question the facts do not answer is judged by
// the honest-draft rule (judge-blind.mjs PROMPT). Such a verdict from before that rule is asked again, once, for every tool alike; every
// other cached verdict stays (re-judging moved unrelated verdicts by noise). A correction's mark always stays.
import fs from 'node:fs'; import path from 'node:path';
// .2: the hedge itself is no claim (the owner's own "right" example was judged wrong); .3: a drafting note ("Add: ...") stays wrong
export const UNANSWERABLE_RULE = 'honest-draft-2026-10-27.3';
const stale = v => v.answerable === false && String(v.value ?? '').trim() !== '' && v.rule !== UNANSWERABLE_RULE && !v.corrected;
export const cachedVerdicts = form => {
  let list; try { list = JSON.parse(fs.readFileSync(path.join(form, 'verdicts.json'), 'utf8')); } catch { return []; }
  return list.filter(v => v.k && ['right', 'wrong', 'empty'].includes(v.verdict) && v.note !== 'not judged' && !stale(v))
    .map(({k, verdict, answerable, note, corrected, rule}) => [k, {k, verdict, answerable, note, ...(corrected ? {corrected} : {}), ...(rule ? {rule} : {})}]);
};
