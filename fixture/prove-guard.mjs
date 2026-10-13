// Proof ($0, no live site): a Submit that posts is aborted by the guard, even from a tab a second CDP client (like Stagehand or Browser Use) opened; a control browser without the guard DOES reach the server.
import {CV_PDF} from '../lib/applicant.mjs'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {submitLike} from '../lib/guard.mjs'; import {startFixture} from './server.mjs'; import {startAgentBrowser} from '../lib/browser.mjs'; import {verdictOf} from '../lib/guard.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bakeoff-proof-')), hits = path.join(dir, 'hits.jsonl'), glog = path.join(dir, 'guard.jsonl');
fs.writeFileSync(hits, '');
const site = await startFixture(hits);
const fill = async page => {
  await page.goto(site.url);
  await page.fill('[name=first]', 'Ada'); await page.fill('[name=last]', 'Tester'); await page.fill('[name=email]', 'ada@example.test');
  await page.setInputFiles('[name=cv]', CV_PDF); await page.check('[name=consent]');
  await page.click('button[type=submit]').catch(() => {});
  await page.evaluate(() => fetch('/api/apply', {method: 'POST', body: 'x'}).catch(() => {})).catch(() => {});
  await page.waitForTimeout(1500);
};
const hitCount = () => fs.readFileSync(hits, 'utf8').split('\n').filter(Boolean).length;
// 1. control: no guard -> the server is reached (proves the repro is real)
const control = await startAgentBrowser({guarded: false});
await fill(control.page); await control.close();
const controlHits = hitCount(); assert.ok(controlHits >= 1, 'control: the unguarded submit must reach the server');
fs.writeFileSync(hits, '');
// 2. guarded; a second client attaches over CDP and opens ITS OWN tab, as the agents do
const guarded = await startAgentBrowser({guardLog: glog});
const second = await chromium.connectOverCDP(guarded.cdpUrl);
const tab = await second.contexts()[0].newPage();
await fill(tab);
const serverHits = hitCount(), aborted = guarded.guard.aborted();
const navLog = guarded.guard.entries().length;
await second.close(); await guarded.close();
// navigation limit: a tab sent to another site is aborted before it leaves, and logged
const nav = await startAgentBrowser({guardLog: glog, navAllow: ['127.0.0.1']});
await nav.page.goto('https://example.com/', {timeout: 8000}).catch(() => {});
const navBlocked = nav.guard.entries().filter(e => e.method === 'NAV' && e.host === 'example.com');
await nav.close(); site.close();
assert.equal(navBlocked.length, 1, 'navigation to another site must be blocked');
assert.ok(aborted.some(e => submitLike(e)), 'the fixture Submit must count as pressed submit');
for (const [name, input, expect] of [
  ['graphql read', {method: 'POST', url: 'https://jobs.ashbyhq.com/api/non-user-graphql', body: '{"operationName":"ApiJobPosting","query":"query X{a}"}'}, true],
  ['graphql unreadable', {method: 'POST', url: 'https://jobs.ashbyhq.com/api/non-user-graphql', body: '{"operationName":"ApiX","extensions":{"persistedQuery":{"sha256Hash":"ab"}}}'}, false],
  ['graphql batch', {method: 'POST', url: 'https://jobs.ashbyhq.com/api/non-user-graphql', body: '[{"query":"query X{a}"}]'}, false],
  ['graphql submit', {method: 'POST', url: 'https://jobs.ashbyhq.com/api/non-user-graphql', body: '{"operationName":"ApiSubmitApplicationForm","query":"mutation X{a}"}'}, false],
  ['storage upload', {method: 'PUT', url: 'https://bucket.s3.eu-west-1.amazonaws.com/cv.pdf', pageSite: 'jobs.lever.co'}, true],
  ['ats api post', {method: 'POST', url: 'https://api.lever.co/v0/postings/x/apply', pageSite: 'jobs.lever.co'}, false],
  ['form site post', {method: 'POST', url: 'https://jobs.lever.co/x/apply', pageSite: 'jobs.lever.co'}, false],
  ['stand-in app', {method: 'POST', url: 'http://127.0.0.1:4711/extension/me', localPorts: [4711]}, true],
]) assert.equal(verdictOf(input).allow, expect, name);
assert.equal(serverHits, 0, `the guard let ${serverHits} request(s) reach the server`);
assert.ok(aborted.length >= 1, 'the guard logged no abort');
console.log(`GUARD PROOF OK: control reached the server ${controlHits}x; guarded: server hits ${serverHits}, aborted+logged ${aborted.length} (${aborted.map(e => e.method + ' ' + e.path + ' ' + e.why).join('; ')}); 8 rule cases pass; navigation to example.com aborted; Submit flagged as pressed`);
