// $0 proof on the Nanobrowser browser (extension loaded, same guard): Submit pressed on the fixture -> the server gets 0 posts, the guard logs the aborts. No model call.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
import {startFixture} from './server.mjs'; import {startNanobrowser} from '../lib/nanobrowser.mjs'; import {CV_PDF} from '../lib/applicant.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bakeoff-nbproof-')), hits = path.join(dir, 'hits.jsonl'), glog = path.join(dir, 'guard.jsonl'); fs.writeFileSync(hits, '');
const site = await startFixture(hits), nb = await startNanobrowser({key: 'unused-in-this-proof', guardLog: glog});
await nb.page.goto(site.url);
await nb.page.fill('[name=first]', 'Ada'); await nb.page.fill('[name=last]', 'Tester'); await nb.page.fill('[name=email]', 'a@b.test'); await nb.page.setInputFiles('[name=cv]', CV_PDF); await nb.page.check('[name=consent]');
await nb.page.click('button[type=submit]').catch(() => {}); await nb.page.evaluate(() => fetch('/api/apply', {method: 'POST', body: 'x'}).catch(() => {})); await nb.page.waitForTimeout(1500);
const serverHits = fs.readFileSync(hits, 'utf8').split('\n').filter(Boolean).length, aborted = nb.guard.aborted();
await nb.close(); site.close();
assert.equal(serverHits, 0, 'posts reached the server'); assert.ok(aborted.length >= 1, 'no abort logged');
console.log(`NB GUARD PROOF OK: Submit pressed in the Nanobrowser browser: server hits ${serverHits}, aborted+logged ${aborted.length} (${aborted.map(e => e.method + ' ' + e.path).join('; ')})`);
