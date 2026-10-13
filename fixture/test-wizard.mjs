// $0: drive the wizard fixture by script through all 5 steps; the trail must keep the answers of the steps that are no longer on the page; the final Submit must be aborted by the guard.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
import {startFixture} from './server.mjs'; import {startAgentBrowser} from '../lib/browser.mjs'; import {startTrail} from '../lib/trail.mjs'; import {collectEnd} from '../lib/score.mjs'; import {CV_PDF} from '../lib/applicant.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bakeoff-wiz-')), hits = path.join(dir, 'hits.jsonl'); fs.writeFileSync(hits, '');
const site = await startFixture(hits), b = await startAgentBrowser({guardLog: path.join(dir, 'g.jsonl')}), trail = startTrail(b.context, {everyMs: 500}), p = b.page;
await p.goto(site.url + 'wizard');
await p.fill('[name=first]', 'Ada'); await p.fill('[name=last]', 'Tester'); await p.fill('[name=email]', 'ada@example.test'); await p.selectOption('[name=cc]', '+41 Switzerland'); await p.fill('[name=phone]', '795550123');
await p.fill('[name=city]', 'Zur'); await p.click('#sug li:first-child'); await p.fill('[name=start]', '2027-01-15'); await p.waitForTimeout(800); await p.click('#next');
await p.fill('[name=title1]', 'SRE'); await p.fill('[name=company1]', 'Acme Cloud'); await p.fill('[name=from1]', '2021-03'); await p.check('[name=current1]'); await p.click('#add'); await p.fill('[name=title2]', 'DevOps'); await p.fill('[name=company2]', 'Beta'); await p.fill('[name=from2]', '2018-01'); await p.fill('[name=to2]', '2021-02'); await p.waitForTimeout(800); await p.click('#next');
await p.check('[name=auth][value=yes]'); await p.fill('[name=salary]', '140000'); await p.selectOption('[name=notice]', '3 months'); await p.selectOption('[name=hear]', 'Other'); await p.fill('[name=hearother]', 'A friend'); await p.fill('[name=why]', 'Because the platform work here is about reliability at scale, which I have done for eight years.'); await p.waitForTimeout(800); await p.click('#next');
await p.setInputFiles('[name=cv]', CV_PDF); await p.check('[name=consent]'); await p.waitForTimeout(800); await p.click('#next'); await p.waitForTimeout(800);
await p.click('#submit').catch(() => {}); await p.waitForTimeout(1200);
const d = await collectEnd(b.context, dir, trail), by = q => d.fields.find(f => f.question.includes(q));
console.log(d.fields.length, 'fields:', d.fields.map(f => `${f.question.slice(0, 22)}=${String(f.value).slice(0, 12)}`).join(' | '));
assert.equal(by('First name').value, 'Ada'); assert.match(by('Job title').value, /SRE/); assert.match(by('Salary').value, /140000/); assert.equal(by('Resume').value, 'cv.pdf');
assert.equal(fs.readFileSync(hits, 'utf8').split('\n').filter(Boolean).length, 0, 'the submit reached the server'); assert.ok(b.guard.aborted().length >= 1);
await b.close(); site.close(); console.log('WIZARD OK: steps kept by the trail, submit aborted');
