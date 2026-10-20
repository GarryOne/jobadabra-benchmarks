"""Turns career-ops' shipped templates/portals.example.yml into one persona's portals.yml: ONLY title_filter.positive and location_filter change (same rule for every persona).
Usage: python3 make-config.py <personas.json> <index 1-10> <example.yml> <out portals.yml>
Rule: positive = [the persona's job title exactly as on its CV]; location_filter = allow + always_allow [city, country] (English names), strict left at its default (false)."""
import json
import re
import sys

personas, index, example, out = sys.argv[1:5]
p = json.load(open(personas))['personas'][int(index) - 1]
lines = open(example, encoding='utf-8').read().split('\n')
start = next(i for i, l in enumerate(lines) if l == '  positive:')
end = next(i for i, l in enumerate(lines) if l == '  negative:' and i > start)
kept = [l for l in lines[start + 1:end] if not re.match(r'^    - ', l)]   # comments stay, the example's keywords go
lines[start + 1:end] = [f'    - "{p["title"]}"'] + kept
lines += ['', '# -- search-bench: the only other change --', 'location_filter:', '  always_allow:', f'    - "{p["city"]}"', f'    - "{p["country"]}"',
          '  allow:', f'    - "{p["city"]}"', f'    - "{p["country"]}"', '']
open(out, 'w', encoding='utf-8').write('\n'.join(lines))
print(json.dumps({'persona': p, 'positive': [p['title']], 'location': [p['city'], p['country']]}))
