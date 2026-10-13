// Local pass-through to api.anthropic.com for Stagehand only: (1) sets thinking disabled (Stagehand 3.7.3 replays Sonnet 5.5's thinking blocks after editing earlier turns, which the API rejects with
// "Invalid signature in thinking block"; Browser Use does not replay them), (2) meters the tokens of every call, even a failed run's, so the cost is exact. The key stays in this process.
import http from 'node:http';

export function startAnthropicProxy(key) {
  const usage = {in: 0, out: 0, cacheRead: 0, cacheWrite: 0, calls: 0};
  const add = u => { if (!u) return; usage.in += u.input_tokens || 0; usage.out += u.output_tokens || 0; usage.cacheRead += u.cache_read_input_tokens || 0; usage.cacheWrite += u.cache_creation_input_tokens || 0; };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      try {
        let body = Buffer.concat(chunks).toString('utf8');
        if (req.method === 'POST' && /\/messages/.test(req.url)) { const j = JSON.parse(body); j.thinking = {type: 'between_tools'}; delete j.output_config;   // this model's own 'off' (API 400 said so); earlier turns' thinking blocks are dropped: Stagehand edits the turns before them, which breaks their signature
          for (const m of j.messages || []) if (Array.isArray(m.content)) m.content = m.content.filter(b => b.type !== 'thinking' && b.type !== 'redacted_thinking'); body = JSON.stringify(j); usage.calls++; }
        const response = await fetch('https://api.anthropic.com' + req.url.replace(/^\/v1/, '/v1'), {method: req.method, headers: {'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(req.headers['anthropic-beta'] ? {'anthropic-beta': req.headers['anthropic-beta']} : {})}, body: req.method === 'POST' ? body : undefined});
        const text = await response.text();
        if ((response.headers.get('content-type') || '').includes('event-stream')) { for (const line of text.split('\n')) if (line.startsWith('data:')) { try { const e = JSON.parse(line.slice(5)); add(e.message?.usage); if (e.type === 'message_delta') usage.out += e.usage?.output_tokens || 0; } catch { /* partial */ } } }
        else { try { add(JSON.parse(text).usage); } catch { /* not json */ } }
        res.writeHead(response.status, {'content-type': response.headers.get('content-type') || 'application/json'}); res.end(text);
      } catch (error) { res.writeHead(502); res.end(String(error)); }
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({url: `http://127.0.0.1:${server.address().port}/v1`, usage, close: () => server.close()})));
}
