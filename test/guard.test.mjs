// What counts as "pressed Submit" (lib/guard.mjs submitLike): a draft autosave or an upload never does; a submit-looking write does.
import test from 'node:test'; import assert from 'node:assert/strict';
import {submitLike} from '../lib/guard.mjs';

const write = op => ({allow: false, why: 'graphql write', op, path: '/api/non-user-graphql'});
for (const op of ['ApiSetFormValue', 'ApiCreateFileUploadHandle']) test(`${op} is not a Submit`, () => assert.equal(submitLike(write(op)), false));
for (const op of ['ApiSubmitApplicationForm', 'SubmitApplication']) test(`${op} is a Submit`, () => assert.equal(submitLike(write(op)), true));
test('an allowed read is never a Submit', () => assert.equal(submitLike({allow: true, why: 'graphql read', op: 'ApiSubmit'}), false));
