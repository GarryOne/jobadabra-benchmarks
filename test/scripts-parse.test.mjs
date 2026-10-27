// Every script in this repo parses (27 Oct 2026: an edit to judge-blind.mjs dropped a bracket, was pushed, and the next judge run died
// at load). node --check compiles a file without running it.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {execFileSync} from 'node:child_process';
const root = path.join(import.meta.dirname, '..');
const files = ['.', 'lib', 'search-bench', 'tools'].flatMap(d => { try { return fs.readdirSync(path.join(root, d)).filter(f => /\.(mjs|js)$/.test(f)).map(f => path.join(d, f)); } catch { return []; } });
test('there are scripts to check', () => assert.ok(files.length > 10));
for (const f of files) test(`${f} parses`, () => { execFileSync(process.execPath, ['--check', path.join(root, f)], {stdio: 'pipe'}); });
