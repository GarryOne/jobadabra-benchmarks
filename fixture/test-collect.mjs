// $0: fill the fixture by script, then read it with the scorer's collector; the fields must come back with their values.
import {CV_PDF} from '../lib/applicant.mjs'; import {startAgentBrowser} from '../lib/browser.mjs'; import {collectEnd} from '../lib/score.mjs'; import fs from 'node:fs'; import assert from 'node:assert/strict';
const url = process.argv[2], b = await startAgentBrowser({guardLog: '/dev/null'});
await b.page.goto(url); await b.page.fill('[name=first]', 'Ada'); await b.page.fill('[name=email]', 'a@b.test'); await b.page.selectOption('[name=auth]', 'Yes'); await b.page.check('[name=consent]');
await b.page.setInputFiles('[name=cv]', CV_PDF);
const d = await collectEnd(b.context, process.argv[3]); await b.close();
console.log(d.fields.map(f => `${f.required ? '*' : ' '} ${f.question} => ${JSON.stringify(f.value)}`).join('\n'));
const by = q => d.fields.find(f => f.question.includes(q));
assert.equal(by('First name').value, 'Ada'); assert.equal(by('authorised').value, 'Yes'); assert.match(by('privacy').value, /agree/); assert.equal(by('Resume').value, 'cv.pdf'); assert.equal(by('Last name').value, ''); assert.ok(by('First name').required);
console.log('COLLECT OK');
