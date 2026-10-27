// Network guard for every bake-off browser (agents and our extension alike): no Submit can leave. Installed on the browser CONTEXT with Playwright routing, so tabs
// opened later by any CDP client (Stagehand, Browser Use) are covered. Rule: GET/HEAD/OPTIONS pass; any other request is aborted and logged, except
//  (a) a request to an allowed local port (the extension's stand-in app), (b) a GraphQL read (no "mutation", no submit/apply/create-like operation name; Ashby loads its form so),
//  (c) an upload (PUT/POST) to a storage host that is not the form's own site (S3, GCS, Azure blob, CloudFront), which a CV needs.
// Everything allowed or aborted is logged to guard.jsonl (method, host, path, verdict) so the owner can audit. Proven by fixture/prove-guard.mjs.
import fs from 'node:fs';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
const STORAGE = /(^|\.)(s3[.-][a-z0-9-]*\.?amazonaws\.com|s3\.amazonaws\.com|storage\.googleapis\.com|blob\.core\.windows\.net|cloudfront\.net)$/i;

export function verdictOf({method, url, body = '', contentType = '', pageSite = '', localPorts = []}) {
  if (SAFE.has(method)) return {allow: true, why: 'read'};
  let u; try { u = new URL(url); } catch { return {allow: false, why: 'bad url'}; }
  if (['127.0.0.1', 'localhost'].includes(u.hostname) && localPorts.includes(Number(u.port))) return {allow: true, why: 'stand-in app'};
  if (/graphql/i.test(u.pathname) && method === 'POST') {
    // a read only when the body is JSON whose query text starts with "query" (or "{") and says no mutation; anything unreadable (persisted hash, batch, bad JSON) counts as a mutation (cc, 13 Oct 2026)
    let q = null; try { const j = JSON.parse(String(body)); if (!Array.isArray(j) && typeof j.query === 'string') q = j; } catch { /* unreadable */ }
    if (q && /^\s*(query\b|\{)/i.test(q.query) && !/mutation/i.test(q.query) && !/(submit|apply|create|upsert|send|save)/i.test(String(q.operationName || ''))) return {allow: true, why: 'graphql read'};
    let op = ''; try { const j = JSON.parse(String(body)); op = String((Array.isArray(j) ? j.map(x => x.operationName).join(',') : j.operationName) || ''); } catch { /* unreadable */ }
    const submitting = /mutation/i.test(String(body)) && /(submit|apply|createapplic|application)/i.test(String(body)) || /(submit|apply)/i.test(op);
    return {allow: false, why: submitting ? 'graphql write' : 'graphql unreadable or other write', op: op.slice(0, 60)};
  }
  // Diagnosis switch (BAKEOFF_READPOSTS=1, off by default so the existing results stay comparable): POSTs that only READ or PREPARE (address/location autocomplete, search, presigned upload urls) pass; anything that looks like the application itself still does not.
  if (process.env.BAKEOFF_READPOSTS === '1' && method === 'POST' && /(autocomplete|suggest|typeahead|presign|geocode|lookup)/i.test(u.pathname) && !/(apply|submit|application|candidate)/i.test(u.pathname)) return {allow: true, why: 'read-like POST (diagnosis switch)'};
  const host = u.hostname.toLowerCase();
  if ((method === 'PUT' || method === 'POST') && STORAGE.test(host) && host !== pageSite) return {allow: true, why: 'storage upload'};
  return {allow: false, why: 'non-GET to ' + (host === pageSite ? 'the form site' : 'another host')};
}

// A blocked write that looks like the application itself, not telemetry: a GraphQL write, or a post to the form's site that is multipart or whose path says apply/submit/application.
// Ashby saves each typed value as ApiSetFormValue: a draft, not a Submit (27 Oct 2026: Browser Use was flagged "pressed submit" on 13 autosaves). test/guard.test.mjs.
export const submitLike = e => !e.allow && (e.why === 'graphql write' && e.op !== undefined && !/upload|file|attach|SetFormValue/i.test(e.op) || (/form site/.test(e.why) && /(\/apply\/?$|submit|application|candidate)/i.test(e.path) && !/parse|upload|resume|track|telemetry|analytics|collect|event|metric|log|ingraphs|counter|gauge|beacon/i.test(e.path)));   // 13 Oct 2026: /parseResume (Lever's CV autofill, multipart) is not the application
// context: a Playwright BrowserContext; log: path of the jsonl; localPorts: ports of our own stand-in app. -> {aborted(), entries()}
export async function installGuard(context, {log, localPorts = [], pageUrl = () => '', navAllow = null} = {}) {   // navAllow: host suffixes a top-level navigation may reach (13 Oct 2026: Browser Use wandered to linkedin.com off a blank tab); null = no limit
  const entries = [];
  const write = entry => { entries.push(entry); fs.appendFileSync(log, JSON.stringify(entry) + '\n'); };
  await context.route('**/*', async route => {
    const request = route.request(), method = request.method();
    if (navAllow && request.isNavigationRequest() && !request.frame().parentFrame()) {
      let nav = ''; try { nav = new URL(request.url()).hostname.toLowerCase(); } catch { /* blocked below */ }
      if (nav && !/^(about|data|chrome)/.test(request.url()) && !navAllow.some(suffix => nav === suffix || nav.endsWith('.' + suffix))) { write({at: new Date().toISOString(), method: 'NAV', host: nav, path: '', bytes: 0, allow: false, why: 'navigation outside the form site'}); await route.abort('blockedbyclient'); return; }
    }
    if (SAFE.has(method)) { await route.continue(); return; }
    let host = ''; try { host = new URL(request.url()).hostname.toLowerCase(); } catch { /* aborted below */ }
    let pageSite = ''; try { pageSite = new URL(pageUrl() || request.frame()?.url?.() || '').hostname.toLowerCase(); } catch { /* none */ }
    const v = verdictOf({method, url: request.url(), body: request.postData() || '', pageSite, localPorts});
    const u = (() => { try { return new URL(request.url()); } catch { return {pathname: ''}; } })();
    write({at: new Date().toISOString(), method, host, path: u.pathname.slice(0, 80), bytes: (request.postData() || '').length, ctype: (request.headers()['content-type'] || '').slice(0, 40), allow: v.allow, why: v.why, ...(v.op !== undefined ? {op: v.op} : {})});
    if (v.allow) await route.continue(); else await route.abort('blockedbyclient');
  });
  return {aborted: () => entries.filter(e => !e.allow),
    pressedSubmit: () => entries.filter(submitLike), entries: () => entries};
}
