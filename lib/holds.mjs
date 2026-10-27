// What counts as a HOLD instead of a miss, one rule for every tool's rows (product-score.mjs, publish-site.mjs): a consent the person ticks (the product never does), and a required upload
// the harness's own safety guard stopped: the guard refuses every write to the form site, so a page that sends the file to its own upload endpoint first (presigned data, an upload POST)
// shows an error in the slot whatever the tool did (15 Oct 2026, Hadrian: "TypeError: Failed to fetch"). Only a blocked request that is the page's upload counts, never an analytics ping.
import fs from 'node:fs'; import path from 'node:path';

// A written answer the product typed as a marked outline ("• Add: ..." lines to finish, owner 16 Oct 2026, 5e16420): it is for the person to complete, so it is a hold, not a wrong value.
export const outlineHold = f => f.verdict === 'wrong' && /(^|[\s•])Add:\s/.test(String(f.value || ''));
export const BLOCKED_UPLOAD = /upload|presign/i;   // the path of a blocked non-GET: the page's own upload call
export const consentHold = f => f.verdict === 'empty' && (f.type === 'checkbox' || /consent|acknowledg|agree|privacy|legal/i.test(`${f.note} ${f.question}`));
export const uploadBlocked = dir => {
  try {
    return fs.readFileSync(path.join(dir, 'guard.jsonl'), 'utf8').split('\n').some(line => { try { const e = JSON.parse(line); return e.allow === false && e.method !== 'GET' && BLOCKED_UPLOAD.test(e.path || ''); } catch { return false; } });
  } catch { return false; }
};
// -> 'consent' | 'upload' | '' for one judged field of the run in `dir`.
export const holdOf = (f, dir) => (consentHold(f) ? 'consent' : f.type === 'file' && f.verdict === 'empty' && uploadBlocked(dir) ? 'upload' : outlineHold(f) ? 'outline' : '');

// An empty file box beside one that holds the uploaded CV is the page's leftover twin, not a miss (27 Oct 2026: Workable keeps its first
// "Choose file" box after the upload, Ashby an "Autofill from resume" box; every tool that uploaded lost a point). Applied to every tool's
// judged fields before scoring (judge-blind.mjs). Guard: test/holds.test.mjs.
export const markFileTwins = judged => {
  const uploaded = judged.some(f => f.type === 'file' && f.verdict === 'right');
  return judged.map(f => uploaded && f.type === 'file' && f.verdict === 'empty' && f.answerable
    ? {...f, answerable: false, twin: true, note: `${f.note ? f.note + '; ' : ''}twin of the uploaded CV box`} : f);
};
