// The one Telegram message a weekly round ends with (owner, 27 Oct 2026: "It should send to telegram, as notification the results, and
// compare with a baseline"). Our score and wrong values per form, against the baseline (the last by-hand full round, ours and Browser Use)
// and last week's note, with an up/down per form. Only scores, counts and form ids: no answer, no applicant fact, no page text.
// Guard: test/weekly-note.test.mjs.
const NAME = {extension: 'Ours', 'browser-use': 'Browser Use', stagehand: 'Stagehand', nanobrowser: 'Nanobrowser'};
const pct = (right, all) => (all ? Math.round(1000 * right / all) / 10 : null);

// scoreRound(round, {rows: true}) -> {at, round, build, tools: {tool: score}, forms: {form: {score, wrong}}} (forms: ours only)
export function noteOf({tools, rows}, {round, build = '', at = new Date().toISOString()}) {
  const forms = {};
  for (const r of rows.filter(r => r.tool === 'extension')) {
    const f = (forms[r.form] ||= {right: 0, all: 0, wrong: 0});
    f.right += r.right; f.all += r.right + r.wrong + r.emptyAnswerable + r.notReached; f.wrong += r.wrong;
  }
  return {at, round, build, tools: Object.fromEntries(Object.entries(tools).map(([t, s]) => [t, s.score])),
    forms: Object.fromEntries(Object.entries(forms).map(([form, f]) => [form, {score: pct(f.right, f.all), wrong: f.wrong}]))};
}

const arrow = (now, then) => (then == null || now == null ? '' : now > then ? ` ▲${+(now - then).toFixed(1)}` : now < then ? ` ▼${+(then - now).toFixed(1)}` : ' =');

// note, baseline (a note, or null), last (last week's note of the same kind, or null), url -> text
export function noteText(note, baseline, last, url = '') {
  const kind = note.round === 'fixed' ? 'fixed set (our regression check)' : `new set, week ${note.round.slice(5)}`;
  const ours = note.tools.extension;
  const lines = [`📏 Weekly fair round · ${kind}${note.build ? ` · build ${note.build}` : ''}`,
    `Ours ${ours ?? '–'}%${baseline ? ` (${arrow(ours, baseline.tools.extension).trim() || '='} vs baseline ${baseline.tools.extension}%)` : ''}${last ? ` (${arrow(ours, last.tools.extension).trim() || '='} vs last week ${last.tools.extension}%)` : ''}`];
  const rivals = Object.entries(note.tools).filter(([t]) => t !== 'extension');
  if (rivals.length) lines.push(rivals.map(([t, s]) => `${NAME[t] || t} ${s}%`).join(' · '));
  else if (baseline?.tools['browser-use'] != null) lines.push(`Browser Use ${baseline.tools['browser-use']}% (baseline, by hand)`);
  for (const [form, f] of Object.entries(note.forms).sort()) {
    const ref = baseline?.forms?.[form] || last?.forms?.[form];
    lines.push(`Form ${form}: ${f.score}%${arrow(f.score, ref?.score)}${f.wrong ? ` · wrong ${f.wrong}${ref ? arrow(f.wrong, ref.wrong).replace('▲', '+').replace('▼', '−') : ''}` : ''}`);
  }
  if (baseline?.label) lines.push(`Baseline: ${baseline.label}`);
  if (url) lines.push(url);
  return lines.join('\n');
}
