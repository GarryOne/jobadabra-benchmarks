#!/bin/bash
# Our arm of a search round, alone (the rivals run on CI: search-rivals.yml, search-bench-career-ops.yml, search-career-ops-docs.yml).
# One persona at a time, on this Mac's Claude plan ($0), a fresh throwaway install, the persona's fake CV, one Find jobs press (its own cap).
# Usage: WORK=<dir> JP=<jobadabra checkout on main> search-bench/ours.sh <from> <to>
B=${WORK:?set WORK=<scratch dir>}; REPO=$(cd "$(dirname "$0")/.." && pwd); JP=${JP:-$HOME/jobadabra}
TMP=$(python3 -c 'import tempfile;print(tempfile.gettempdir())')
echo "OURS build $(git -C $JP rev-parse --short HEAD)"
for i in $(seq $1 $2); do
  mkdir -p $B/ours/p$i
  JP=$JP python3 -I $REPO/search-bench/make-cv.py $REPO/search-bench/personas.json $i $B/ours/p$i >/dev/null || { echo "OURS p$i FAILED cv"; continue; }
  start=$(date +%s)
  (cd $JP && env -u ANTHROPIC_API_KEY -u OPENAI_API_KEY JOB_PILOTTO_NO_DOTENV=1 \
    bash tools/heavy-lock.sh persona-search node tools/persona-search/run.mjs draw $B/ours/p$i --presses 1 --fresh --tag bench$i > $B/ours/p$i.log 2>&1)
  echo "OURS p$i done in $(( $(date +%s) - start )) s: $(grep '^PRESS' $B/ours/p$i.log | tail -1 | cut -c1-200)"
  python3 -I $REPO/search-bench/extract.py ours $TMP/jp-persona-draw-bench$i/data/jobs.sqlite $B/ours/p$i.json
done
echo "OURS ALL DONE"
