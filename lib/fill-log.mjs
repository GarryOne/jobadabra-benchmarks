// Why a box was left empty, kept in each run folder as fill.log (1a, 27 Oct 2026: "why was Degree empty" needed an offline rebuild). The
// artifacts are public, so only the app log's fill-summary lines go in: per field its label, outcome and a fixed reason, a menu's own choices,
// the dropdown waits and tries per control. Never a value: "button by meaning" (its meaning is the answer) and answer bodies stay out.
// Guard: test/fill-log.test.mjs.
const KEEP = /(fields: \d+ filled, \d+ left|a menu showed no choice that matched|a dropdown (did not settle: given up|kept the wait going)|tries per control)/;
const DROP = /button by meaning|\/extension\/answer/;
export const fillLog = appLog => String(appLog || '').split('\n').filter(line => KEEP.test(line) && !DROP.test(line)).join('\n');
// A post body to /extension/log as its lines: {text, fields}, a list of them, or {entries|lines: [...]}; anything else as raw text.
export const postLines = body => {
  let j; try { j = JSON.parse(body); } catch { return String(body || '').split('\n'); }
  const list = Array.isArray(j) ? j : j?.entries || j?.lines || [j];
  return list.map(e => (typeof e === 'string' ? e : `${e?.text ?? ''} ${e?.fields ? JSON.stringify(e.fields) : ''}`.trim()));
};
