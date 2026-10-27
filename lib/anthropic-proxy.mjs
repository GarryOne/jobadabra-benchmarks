// Local pass-through to api.anthropic.com for every agent (27 Oct 2026: Browser Use too, so all three are metered and priced the same way). For Stagehand only: (1) sets thinking disabled (Stagehand 3.7.3 replays Sonnet 5.5's thinking blocks after editing earlier turns, which the API rejects with
// "Invalid signature in thinking block"; Browser Use does not replay them), (2) meters the tokens of every call, even a failed run's, so the cost is exact. The key stays in this process.
import http from 'node:http'; import {AGENT_MODEL, callUsd, priceOf} from './models.mjs';

// What Stagehand's request becomes: Sonnet 5.5's own "off" (between_tools; API 400 said so), none for other models (Haiku 5.5 refuses
// between_tools, 27 Oct 2026); earlier turns' thinking blocks dropped (Stagehand edits the turns before them, which breaks their signature).
// Guarded by test/proxy.test.mjs.
export function shapeRequest(j) {
  if (/sonnet-5/.test(j.model || '')) j.thinking = {type: 'between_tools'}; else delete j.thinking;
  delete j.output_config;
  for (const m of j.messages || []) if (Array.isArray(m.content)) m.content = m.content.filter(b => b.type !== 'thinking' && b.type !== 'redacted_thinking');
  return j;
}

export function startAnthropicProxy(key, {passThrough = false} = {}) {   // passThrough: meter only, change nothing (Nanobrowser)
  const usage = {in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0, usd: 0, longCalls: 0, maxIn: 0, model: AGENT_MODEL};   // usd: priced per call (lib/models.mjs: a long Haiku call costs 5x)
  const add = u => { if (!u) return; usage.in += u.input_tokens || 0; usage.out += u.output_tokens || 0; usage.cacheRead += u.cache_read_input_tokens || 0; usage.cacheWrite += u.cache_creation_input_tokens || 0; };
  const price = (model, u) => { const input = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0); usage.maxIn = Math.max(usage.maxIn, input); if (input > priceOf(model).longOver) usage.longCalls++; usage.usd += callUsd(model, u); };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      try {
        let body = Buffer.concat(chunks).toString('utf8');
        if (req.method === 'POST' && /\/messages/.test(req.url) && passThrough) usage.calls++;
        else if (req.method === 'POST' && /\/messages/.test(req.url)) {
          body = JSON.stringify(shapeRequest(JSON.parse(body))); usage.calls++; }
        const response = await fetch('https://api.anthropic.com' + req.url.replace(/^\/v1/, '/v1'), {method: req.method, headers: {'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(req.headers['anthropic-beta'] ? {'anthropic-beta': req.headers['anthropic-beta']} : {})}, body: req.method === 'POST' ? body : undefined});
        const text = await response.text();
        const sent = (() => { try { return JSON.parse(body).model; } catch { return AGENT_MODEL; } })(), call = {};
        if ((response.headers.get('content-type') || '').includes('event-stream')) { for (const line of text.split('\n')) if (line.startsWith('data:')) { try { const e = JSON.parse(line.slice(5)); if (e.message?.usage) Object.assign(call, e.message.usage); if (e.type === 'message_delta') call.output_tokens = (call.output_tokens || 0) + (e.usage?.output_tokens || 0); } catch { /* partial */ } } }
        else { try { Object.assign(call, JSON.parse(text).usage || {}); } catch { /* not json */ } }
        if (Object.keys(call).length) { add(call); price(sent || AGENT_MODEL, call); if (sent && sent !== AGENT_MODEL) usage.model = `${AGENT_MODEL} (a call asked ${sent})`; }
        res.writeHead(response.status, {'content-type': response.headers.get('content-type') || 'application/json'}); res.end(text);
      } catch (error) { res.writeHead(502); res.end(String(error)); }
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({url: `http://127.0.0.1:${server.address().port}/v1`, usage, close: () => server.close()})));
}
