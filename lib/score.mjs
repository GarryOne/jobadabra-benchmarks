// The ONE scorer, identical for every tool: reads each field's question and final value from the end page (lib/extract-fields.js, DOM) and judges it against the applicant facts.
// collectEnd(context|page, dir): fields.json + end.png of the form tab. judge(fields, facts): per field right / wrong / empty (Sonnet 5.5 via the Keychain Tests key, one call, cost metered).
// summarize(judged): right, wrong, empty-should-fill (facts had the answer), empty-required, empty-ok (facts had none). scoreFile(fieldsJson, dir) scores a saved end state (an owner-filled page).
import fs from 'node:fs'; import path from 'node:path'; import {execFileSync} from 'node:child_process';

const EXTRACT = fs.readFileSync(path.join(import.meta.dirname, 'extract-fields.js'), 'utf8');
export const MODEL = 'claude-sonnet-5-5', PRICE = {in: 2 / 1e6, out: 10 / 1e6};   // $/token (src/ai/cost.py, checked 2026-10-02)
import {anthropicKey as key} from './models.mjs';

// The form tab: the last http(s) page with the most fields. Frames are read too (embedded ATS forms).
export async function collectEnd(context, dir, trail = null) {   // trail (lib/trail.mjs): the answers of earlier wizard steps, merged with the final page
  fs.mkdirSync(dir, {recursive: true});
  const pages = context.pages().filter(p => /^https?:/.test(p.url()));
  let best = null;
  for (const page of pages) {
    const parts = [];
    for (const frame of page.frames()) { try { const r = await frame.evaluate(EXTRACT); if (r.fields.length) parts.push(r); } catch { /* a closed or cross-origin frame */ } }
    const fields = parts.flatMap(p => p.fields), fileChips = parts.flatMap(p => p.fileChips);
    if (!best || fields.length > best.fields.length) best = {page, url: page.url(), title: await page.title().catch(() => ''), fields, fileChips};
  }
  if (trail) { await trail.stop(); if (best) trail.merge(best.fields, {final: true}); const t = trail.snapshot(); if (!best) best = {page: null, url: t.urls.at(-1) || '', title: '', fileChips: []}; best.fields = t.fields; best.trailUrls = t.urls; }
  if (!best) { fs.writeFileSync(path.join(dir, 'fields.json'), JSON.stringify({fields: [], fileChips: [], note: 'no page'})); return null; }
  await best.page?.screenshot({path: path.join(dir, 'end.png'), fullPage: true}).catch(() => {});
  const {page, ...data} = best; fs.writeFileSync(path.join(dir, 'fields.json'), JSON.stringify(data, null, 1));
  return data;
}

export async function judge(fields, facts, {fetchImpl = fetch} = {}) {
  const list = fields.map((f, i) => ({i, question: f.question, type: f.type, required: !!f.required, value: f.value, ...(f.options ? {options: f.options.slice(0, 12)} : {})}));
  const prompt = `You score a job application form that a tool filled in. The applicant's facts are below. For EACH field decide:\n- verdict: "right" (the value correctly reflects the facts, or a sensible fixed choice such as consent), "wrong" (the value contradicts the facts, or invents what the facts do not say), "empty" (no value).\n- answerable: true when the facts do answer this question (so empty means a miss), false when they do not (then an empty field is correct).\nA CV file name counts as a value for the CV/resume upload field. Return ONLY JSON: {"fields":[{"i":0,"verdict":"right|wrong|empty","answerable":true,"note":"max 8 words"}]}.\n\nFACTS:\n${facts}\n\nFIELDS (question, final value read from the page):\n${JSON.stringify(list)}`;
  const response = await fetchImpl('https://api.anthropic.com/v1/messages', {method: 'POST', headers: {'x-api-key': key(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json'}, body: JSON.stringify({model: MODEL, max_tokens: 8000, messages: [{role: 'user', content: prompt}]})});
  const body = await response.json();
  if (!body.content) throw new Error(`judge: ${JSON.stringify(body).slice(0, 200)}`);
  const text = body.content.map(c => c.text || '').join(''), verdicts = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).fields;
  const usd = (body.usage.input_tokens * PRICE.in) + (body.usage.output_tokens * PRICE.out);
  return {judged: fields.map((f, i) => ({...f, ...(verdicts.find(v => v.i === i) || {verdict: 'empty', answerable: true, note: 'not judged'})})), usd, tokens: body.usage};
}

export function summarize(judged) {
  const n = pred => judged.filter(pred).length;
  return {fields: judged.length, right: n(f => f.verdict === 'right'), wrong: n(f => f.verdict === 'wrong'), emptyShouldFill: n(f => f.verdict === 'empty' && f.answerable),
    emptyOk: n(f => f.verdict === 'empty' && !f.answerable), emptyRequired: n(f => f.verdict === 'empty' && f.required), requiredTotal: n(f => f.required)};
}

// A saved end state (fields.json from the console snippet on an owner-filled page) -> the same table.
export async function scoreFile(fieldsFile, facts, outFile) {
  const data = JSON.parse(fs.readFileSync(fieldsFile, 'utf8')), j = await judge(data.fields, facts);
  const result = {url: data.url, ...summarize(j.judged), judgeUsd: j.usd, judged: j.judged}; fs.writeFileSync(outFile, JSON.stringify(result, null, 1)); return result;
}
