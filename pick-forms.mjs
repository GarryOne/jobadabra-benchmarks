// Picks the objective round's forms at random, from a list we did not make: the companies career-ops ships in its
// templates/portals.example.yml (pinned tag), on the four ATS whose apply forms open without a login.
// Any company we ever tested or fixed on is left out (bake-off forms, the product repo's e2e cases and fixtures).
// The seed and every skip are written next to the picks, so anyone can redo the draw.
// Usage: node pick-forms.mjs <portals.example.yml> <excluded.txt> <out.json> [--seed objective-2026-10-27] [--per greenhouse=2,ashby=2,lever=1,workable=1]
import fs from 'node:fs';
import crypto from 'node:crypto';

const [portalsFile, excludedFile, outFile] = process.argv.slice(2);
const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : dflt; };
const SEED = arg('seed', 'objective-2026-10-27');
const PER = Object.fromEntries(arg('per', 'greenhouse=2,ashby=2,lever=1,workable=1').split(',').map(s => s.split('=')).map(([k, v]) => [k, +v]));

// A seeded shuffle: the same seed gives the same order on any machine.
const rank = s => crypto.createHash('sha256').update(`${SEED}|${s}`).digest('hex');
const shuffled = list => [...list].sort((a, b) => rank(a.key).localeCompare(rank(b.key)));

const PATTERNS = {
  greenhouse: /https:\/\/(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/([a-z0-9_-]+)/i,
  ashby: /https:\/\/jobs\.ashbyhq\.com\/([a-z0-9_.-]+)/i,
  lever: /https:\/\/jobs\.(?:eu\.)?lever\.co\/([a-z0-9_.-]+)/i,
  workable: /https:\/\/apply\.workable\.com\/([a-z0-9_-]+)/i,
};
const excluded = fs.readFileSync(excludedFile, 'utf8').toLowerCase();
const companies = [];
for (const line of fs.readFileSync(portalsFile, 'utf8').split('\n')) {
  if (!/^\s+careers_url:/.test(line)) continue;
  for (const [ats, re] of Object.entries(PATTERNS)) {
    const m = line.match(re); if (!m) continue;
    const slug = m[1].toLowerCase();
    if (!['exampleco', 'example'].includes(slug)) companies.push({ats, slug, key: `${ats}/${slug}`});
  }
}

// Each ATS's public postings feed: [{title, location, url}] (the apply form's address).
const FEEDS = {
  greenhouse: async s => (await j(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs`)).jobs.map(p => ({title: p.title, location: p.location?.name || '', url: p.absolute_url})),
  ashby: async s => (await j(`https://api.ashbyhq.com/posting-api/job-board/${s}`)).jobs.filter(p => p.isListed !== false).map(p => ({title: p.title, location: p.location || '', url: `${p.jobUrl}/application`})),
  lever: async s => (await j(`https://api.lever.co/v0/postings/${s}?mode=json`)).map(p => ({title: p.text, location: p.categories?.location || '', url: `${p.hostedUrl}/apply`})),
  workable: async s => (await j(`https://apply.workable.com/api/v1/widget/accounts/${s}`)).jobs.map(p => ({title: p.title, location: [p.city, p.country].filter(Boolean).join(', '), url: `https://apply.workable.com/${s}/j/${p.shortcode}/apply/`})),
};
async function j(url) { const r = await fetch(url, {headers: {accept: 'application/json'}}); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

const picks = [], skipped = [];
for (const [ats, n] of Object.entries(PER)) {
  let got = 0;
  for (const c of shuffled(companies.filter(c => c.ats === ats))) {
    if (got >= n) break;
    if (excluded.includes(c.slug)) { skipped.push({...c, why: 'tested or fixed on before'}); continue; }
    let posts;
    try { posts = await FEEDS[ats](c.slug); } catch (e) { skipped.push({...c, why: `feed: ${e.message}`}); continue; }
    if (!posts.length) { skipped.push({...c, why: 'no open postings'}); continue; }
    const post = shuffled(posts.map(p => ({...p, key: p.url})))[0];
    picks.push({id: 100 + picks.length + 1, platform: ats, company: c.slug, host: new URL(post.url).host, title: post.title, location: post.location, url: post.url});
    got++;
  }
}
const out = {seed: SEED, source: 'career-ops templates/portals.example.yml (career-ops-v1.38.0)', pickedAt: new Date().toISOString(), per: PER, picks, skipped: skipped.map(({key, ...s}) => s)};
fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(picks.map(p => `${p.platform} ${p.company}: ${p.title} (${p.location})`), null, 1), `\nskipped ${skipped.length}`);
