// The one Telegram message a scheduled search round ends with (owner, 27 Oct 2026: "I want job search benchmarks to run on the CI and me
// getting telegram notifications"; "every 3 days"). Relevant jobs (right role AND in place) per tool, ours per persona, each against the
// previous run and the 27 Oct baseline round. Only counts, tool names and the made-up personas' title and city: no job, no URL.
// Usage: node search-bench/note.mjs <work dir> --round YYYY-MM-DD [--build abc1234] [--baseline search-bench/results/2026-10-27]
//          [--last <dir of earlier notes>] [--out note.json] [--url <run url>]
// Telegram: $BENCH_TELEGRAM_BOT_TOKEN and $BENCH_TELEGRAM_CHAT_ID (the benchmarks bot); unset: printed only. Guard: test/search-note.test.mjs.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
import {NAME} from './tools.mjs';

const rj = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const relevant = row => row.role === 'yes' && row.place === 'yes';

/** rowsByPersona: {N: judged rows of persona N} (judge.py's rows) -> {round, build, tools: {tool: {relevant, found}}, personas: {N: {label, relevant, found}}} (personas: ours only) */
export function noteOf(rowsByPersona, {round = '', build = '', labels = {}} = {}) {
  const tools = {}, personas = {};
  for (const [n, rows] of Object.entries(rowsByPersona)) {
    for (const row of rows) { const t = (tools[row.tool] ||= {relevant: 0, found: 0}); t.found++; if (relevant(row)) t.relevant++; }
    const ours = rows.filter(row => row.tool === 'ours');
    personas[n] = {label: labels[n] || `Persona ${n}`, relevant: ours.filter(relevant).length, found: ours.length};
  }
  tools.ours ||= {relevant: 0, found: 0};
  return {round, build, tools, personas};
}

/** Reads judged<N>.json (a work dir) or persona-<N>.json (a results/<round> dir) into {N: rows}. */
export function readRound(dir) {
  const out = {};
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) { const m = f.match(/^(?:judged|persona-)(\d+)\.json$/); if (m) out[m[1]] = rj(path.join(dir, f))?.rows || []; }
  return out;
}

const diff = (now, then) => (then == null ? '' : now > then ? ` ▲${now - then}` : now < then ? ` ▼${then - now}` : ' =');

/** note, baseline and last (notes or null), {missing: ["ours p3"], url} -> the message text */
export function noteText(note, baseline, last, {missing = [], url = ''} = {}) {
  const ours = note.tools.ours, none = Object.values(note.personas).filter(p => p.relevant === 0).length;
  const vs = (ref, label) => (ref ? ` (${diff(ours.relevant, ref.tools.ours?.relevant).trim()} vs ${label} ${ref.tools.ours?.relevant})` : '');
  const lines = [`🔎 Search round · ${note.round}${note.build ? ` · build ${note.build}` : ''}`,
    `Ours ${ours.relevant} relevant of ${ours.found} shown${vs(last, 'the previous run')}${vs(baseline, 'baseline')}`];
  const rivals = Object.entries(note.tools).filter(([t]) => t !== 'ours').sort((a, b) => b[1].relevant - a[1].relevant);
  if (rivals.length) lines.push(rivals.map(([t, s]) => `${NAME[t] || t} ${s.relevant}${diff(s.relevant, (last || baseline)?.tools[t]?.relevant)}`).join(' · '));
  lines.push(`Searches with none: ${none} of ${Object.keys(note.personas).length}`);
  for (const [n, p] of Object.entries(note.personas).sort((a, b) => a[0] - b[0])) {
    const ref = (last || baseline)?.personas?.[n];
    lines.push(`${p.label}: ${p.relevant} of ${p.found} shown${diff(p.relevant, ref?.relevant)}`);
  }
  if (missing.length) lines.push(`⚠ Missing (a job failed, not a 0): ${missing.join(', ')}`);
  if (url) lines.push(url);
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const work = process.argv[2], arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : ''; };
  const personas = rj(path.join(import.meta.dirname, 'personas.json')).personas;
  const labels = Object.fromEntries(personas.map((p, i) => [i + 1, `${p.title} · ${p.city}`]));
  const note = noteOf(readRound(work), {round: arg('round'), build: arg('build'), labels});
  const baseline = arg('baseline') ? noteOf(readRound(arg('baseline')), {labels}) : null;
  const lastDir = arg('last'), lastFile = lastDir && fs.existsSync(lastDir) ? fs.readdirSync(lastDir).filter(f => f.endsWith('.json')).sort().at(-1) : '';
  const last = lastFile ? rj(path.join(lastDir, lastFile)) : null;
  const unjudged = personas.map((_, i) => i + 1).filter(n => !fs.existsSync(path.join(work, `judged${n}.json`))).map(n => `judge p${n}`);
  const text = noteText(note, baseline, last, {missing: [...(rj(path.join(work, 'missing.json')) || []), ...unjudged], url: arg('url')});
  if (arg('out')) { fs.mkdirSync(path.dirname(arg('out')), {recursive: true}); fs.writeFileSync(arg('out'), JSON.stringify(note, null, 1) + '\n'); }
  console.log(text);
  const {BENCH_TELEGRAM_BOT_TOKEN: token, BENCH_TELEGRAM_CHAT_ID: chat} = process.env;
  if (!token || !chat) console.log('telegram: BENCH_TELEGRAM_BOT_TOKEN / BENCH_TELEGRAM_CHAT_ID not set, printed only');
  else {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({chat_id: chat, text, disable_web_page_preview: true})});
    console.log(`telegram: ${res.status}`); if (!res.ok) process.exit(1);
  }
}
