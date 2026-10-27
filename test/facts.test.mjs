import test from 'node:test'; import assert from 'node:assert/strict';
import {factsOf} from '../lib/facts.mjs'; import {hash} from '../lib/manifest.mjs'; import {instruction} from '../lib/applicant.mjs';
const facts = 'Name: Test Person\nCity: Sofia', m = (f = facts) => ({instruction: instruction(f, 'https://x.test/apply'), applicantHash: hash(f)});
test('facts come from the instruction, proved by the hash', () => assert.equal(factsOf([m(), m()]), facts));
test('runs given different facts stop the judge', () => assert.throws(() => factsOf([m(), m('Name: Other')]), /different facts/));
test('an instruction whose facts do not match the hash stops the judge', () =>
  assert.throws(() => factsOf([{...m(), applicantHash: hash('something else')}]), /match its applicantHash/));
