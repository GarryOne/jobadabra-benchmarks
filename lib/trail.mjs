// A form that is a wizard shows only its last step at the end, so the end page alone loses the earlier answers. The trail reads every visible field of every http page every few seconds while a tool works and merges
// them: per (type, question) the latest non-empty value wins, a field that vanished (the page moved on) keeps its last value, required is sticky. collectEnd merges the final page into the trail.
import fs from 'node:fs'; import path from 'node:path';
const EXTRACT = fs.readFileSync(path.join(import.meta.dirname, 'extract-fields.js'), 'utf8');
export function startTrail(context, {everyMs = 3000} = {}) {
  const seen = new Map(); let stopped = false, busy = false, urls = new Set();
  const merge = fields => { for (const f of fields) { const key = `${f.type}|${f.name || ''}|${f.question}|${f.options ? f.options.slice(0, 3).join(',') : ''}`, old = seen.get(key); if (!old) seen.set(key, {...f}); else { if (f.value || !old.value) old.value = f.value || old.value; old.required = old.required || f.required; } } };
  const tick = async () => { if (busy || stopped) return; busy = true; try { for (const page of context.pages().filter(p => /^https?:/.test(p.url()))) for (const frame of page.frames()) { try { const r = await frame.evaluate(EXTRACT); merge(r.fields); urls.add(r.url.split('#')[0]); } catch { /* closed or cross-origin */ } } } finally { busy = false; } };
  const timer = setInterval(tick, everyMs);
  return {merge, snapshot: () => ({fields: [...seen.values()], urls: [...urls]}), stop: async () => { stopped = true; clearInterval(timer); while (busy) await new Promise(r => setTimeout(r, 100)); }};
}
