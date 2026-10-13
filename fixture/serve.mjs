// Serves the fixture form until killed; hits (any non-GET that arrives) go to out/fixture-hits.jsonl.
import {startFixture} from './server.mjs'; import fs from 'node:fs';
const hits = new URL('../out/fixture-hits.jsonl', import.meta.url).pathname; fs.writeFileSync(hits, '');
const s = await startFixture(hits); console.log('FIXTURE ' + s.url); setInterval(() => {}, 1e9);
