// Local fixture form for the bake-off: a Submit that posts. Every non-GET that reaches it is a guard failure, logged to <hits file>.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
export function startFixture(hitsFile) {
  const pages = {'/': fs.readFileSync(path.join(import.meta.dirname, 'form.html')), '/wizard': fs.readFileSync(path.join(import.meta.dirname, 'wizard.html')), '/combo': fs.readFileSync(path.join(import.meta.dirname, 'combo.html'))};
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url.startsWith('/location_suggestions/')) { res.writeHead(200, {'content-type': 'application/json'}); res.end('{"suggestions":[]}'); return; }   // the address service: no match
    if (req.method !== 'GET') { fs.appendFileSync(hitsFile, JSON.stringify({method: req.method, url: req.url}) + '\n'); res.writeHead(200); res.end('received'); return; }
    res.writeHead(200, {'content-type': 'text/html'}); res.end(pages[req.url.split('?')[0]] || pages['/']);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({url: `http://127.0.0.1:${server.address().port}/`, port: server.address().port, close: () => server.close()})));
}
