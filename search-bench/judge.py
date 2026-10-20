"""Blind judge for search-bench: pools both tools' lists for one persona, drops exact duplicates, shuffles, hides the source and asks the model, per job, 'right role?' and 'right place?'.
Usage: BENCH_JUDGE_KEY=<eval key> python3 judge.py <personas.json> <index> <pool.json> <out.json> [--limit N]
pool.json = [{"tool": "ours"|"career-ops", "title", "company", "location"}] (no URLs, no bodies). out.json = the pool with each job's verdict, the shuffle seed and the token cost.
Same prompt and rules for both tools; the model never sees which tool found a job."""
import json
import os
import random
import re
import sys
import urllib.request

MODEL = 'claude-sonnet-5-5'
PRICE = (2.00, 10.00)   # $ per million input/output tokens (src/ai/cost.py, 2 Oct 2026)
BATCH = 60
SYSTEM = ('You check a job search for one job seeker. You get their short profile and a numbered list of jobs (title, employer, place). For EACH job decide two things on their own. '
          'role: would a person with this profile see it as their kind of job? yes = same occupation (any seniority, any employer, any language of the title); no = a different occupation. '
          'place: yes = in their city or a short commute from it, or remote and the text names their country; remote = says remote and names no country; no = another city or country (including remote limited to another country); unknown = no place given. '
          'Judge only from the title, employer and place shown; do not guess beyond them. Answer with JSON only: {"jobs":[{"n":1,"role":"yes|no","place":"yes|remote|no|unknown"}, ...]} covering every number.')


def ask(key, profile, jobs):
    body = {'model': MODEL, 'max_tokens': 8000, 'system': SYSTEM, 'messages': [{'role': 'user', 'content': profile + '\n\nJOBS\n' + '\n'.join(
        f'{j["n"]}. {j["title"]} | {j["company"] or "?"} | {j["location"] or "(no place)"}' for j in jobs)}]}
    req = urllib.request.Request('https://api.anthropic.com/v1/messages', json.dumps(body).encode(), {'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    reply = json.load(urllib.request.urlopen(req, timeout=300))
    text = ''.join(b.get('text', '') for b in reply['content'])
    data = json.loads(re.search(r'\{.*\}', text, re.S).group(0))
    return {r['n']: r for r in data['jobs']}, reply['usage']


def main():
    personas, index, pool_path, out_path = sys.argv[1:5]
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    key = os.environ['BENCH_JUDGE_KEY']
    p = json.load(open(personas))['personas'][int(index) - 1]
    profile = f'Profile: {p["title"]}, 6 years of experience, living in {p["city"]}, {p["country"]}; on-site or hybrid; speaks {p["language"]} and English.'
    pool = json.load(open(pool_path))
    unique = {}   # one verdict per distinct job; every tool that found it gets it
    for row in pool:
        unique.setdefault((row['title'].strip().lower(), (row['company'] or '').strip().lower(), (row['location'] or '').strip().lower()), row)
    jobs = list(unique.values())
    seed = f'bench-judge-{index}'
    random.Random(seed).shuffle(jobs)
    if limit:
        jobs = jobs[:limit]
    tokens = [0, 0]
    for start in range(0, len(jobs), BATCH):
        chunk = [{'n': i + 1, **{k: j[k] for k in ('title', 'company', 'location')}} for i, j in enumerate(jobs[start:start + BATCH])]
        verdicts, usage = ask(key, profile, chunk)
        tokens[0] += usage['input_tokens']; tokens[1] += usage['output_tokens']
        for i, j in enumerate(jobs[start:start + BATCH]):
            v = verdicts.get(i + 1, {})
            j['role'], j['place'] = v.get('role', 'missing'), v.get('place', 'missing')
    verdict = {(j['title'].strip().lower(), (j['company'] or '').strip().lower(), (j['location'] or '').strip().lower()): j for j in jobs}
    for row in pool:
        v = verdict.get((row['title'].strip().lower(), (row['company'] or '').strip().lower(), (row['location'] or '').strip().lower()))
        row['role'], row['place'] = (v['role'], v['place']) if v else ('not-judged', 'not-judged')
    cost = tokens[0] / 1e6 * PRICE[0] + tokens[1] / 1e6 * PRICE[1]
    json.dump({'persona': p, 'seed': seed, 'model': MODEL, 'judged_jobs': len(jobs), 'tokens_in': tokens[0], 'tokens_out': tokens[1], 'cost_usd': round(cost, 4), 'rows': pool}, open(out_path, 'w'), ensure_ascii=False, indent=1)
    print(f'judged {len(jobs)} distinct jobs, {tokens[0]} in / {tokens[1]} out tokens, ${cost:.4f}')


if __name__ == '__main__':
    main()
