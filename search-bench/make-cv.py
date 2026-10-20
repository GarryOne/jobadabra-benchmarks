"""Writes <out>/draw/cv.pdf + draw.json for benchmark persona N, with the repo's own CV template (tools/persona-search/draw.py), so our arm gets the same persona as career-ops.
Usage: python3 make-cv.py <personas.json> <index 1-10> <out dir>"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.environ.get('JP', os.path.expanduser('~/job-pilotto')), 'tools/persona-search'))
import draw  # noqa: E402
from personas import pdf  # noqa: E402

personas, index, out = sys.argv[1:4]
p = json.load(open(personas))['personas'][int(index) - 1]
family = next(f for f in draw.DATA['families'] if f['id'] == p['family'])
city = next(c for c in draw.DATA['cities'] if c['city'] == p['city'])
folder = Path(out) / 'draw'
folder.mkdir(parents=True, exist_ok=True)
(folder / 'cv.pdf').write_bytes(pdf(draw.cv(family, city, 'Alex Example')))
(folder / 'draw.json').write_text(json.dumps({'seed': f'bench-{index}', 'family': p['family'], 'city': p['city'], 'country': p['country']}), encoding='utf-8')
print(json.dumps(p))
