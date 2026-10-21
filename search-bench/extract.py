"""Turns each tool's raw output into the judge's pool rows (title, company, location, provider; no URLs sent to the judge, no posting bodies stored).
Usage: python3 extract.py ours <jobs.sqlite> <out.json>
       python3 extract.py career-ops <scan-history.tsv> <out.json>
career-ops: rows whose status is not skipped_* (what its own filters let through = what a user would see in pipeline.md); every row is also counted in <out>.all.json (incl. skipped) for the title-matched-wrong-place count."""
import csv
import json
import sqlite3
import sys

kind, src, out = sys.argv[1:4]
if kind == 'ours':
    db = sqlite3.connect(src)
    rows = [{'tool': 'ours', 'title': t, 'company': c or '', 'location': l or '', 'provider': s}
            for t, c, l, s in db.execute("SELECT j.title, co.name, j.location, s.name FROM jobs j LEFT JOIN companies co ON co.id = j.company_id LEFT JOIN sources s ON s.id = j.source_id WHERE j.state = 'open'")]
    json.dump(rows, open(out, 'w'), ensure_ascii=False, indent=1)
else:
    import os
    # career-ops writes no scan-history.tsv when no posting matched the role keyword: that is an empty list, not an error
    allrows = [{'tool': 'career-ops', 'title': r['title'], 'company': r['company'], 'location': r['location'], 'provider': r['portal'], 'status': r['status']}
               for r in (csv.DictReader(open(src, encoding='utf-8'), delimiter='\t') if os.path.exists(src) else [])]
    json.dump(allrows, open(out.replace('.json', '.all.json'), 'w'), ensure_ascii=False, indent=1)
    rows = [r for r in allrows if not r['status'].startswith('skipped')]
    json.dump(rows, open(out, 'w'), ensure_ascii=False, indent=1)
print(kind, len(rows), 'rows')
