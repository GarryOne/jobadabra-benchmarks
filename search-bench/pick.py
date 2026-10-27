"""Seeded pick of the 10 benchmark personas: 5 non-tech + 5 tech/office, distinct countries."""
import hashlib, json, os, random, sys
seed = sys.argv[1]
d = json.load(open(os.path.join(os.environ.get('JP', os.path.expanduser('~/jobadabra')), 'tools/persona-search/draws.json')))   # the product's draw list
TECH = {'software', 'data-analyst', 'designer', 'marketing', 'support'}
rnd = random.Random(int(hashlib.sha256(seed.encode()).hexdigest(), 16))
fam = [f for f in d['families']]
non = rnd.sample([f for f in fam if f['id'] not in TECH], 5)
tech = rnd.sample([f for f in fam if f['id'] in TECH], 5)
cities = d['cities'][:]; rnd.shuffle(cities)
used, out = set(), []
roles = non + tech
for f in roles:
    c = next(c for c in cities if c['country'] not in used)
    used.add(c['country']); cities.remove(c)
    out.append({'family': f['id'], 'title': f['title'], 'kind': 'tech' if f['id'] in TECH else 'non-tech', 'city': c['city'], 'country': c['country'], 'language': c['language']})
json.dump({'seed': seed, 'personas': out}, open('personas.json', 'w'), indent=1)
for i, p in enumerate(out, 1): print(i, p['kind'], p['title'], p['city'], p['country'])
