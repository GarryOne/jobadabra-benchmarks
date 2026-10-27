#!/bin/bash
# Watch a round's CI runs for a Monitor (27 Oct 2026: a hand-written loop printed nothing while every job failed): each run's end, its
# failed jobs with their first failed step, a failure while the run still goes, and gh errors (never silent).
R=GarryOne/jobadabra-benchmarks; seen=" "
while :; do
  left=0
  for id in "$@"; do
    case "$seen" in *" $id "*) continue;; esac
    s=$(gh run view "$id" -R $R --json status,conclusion,workflowName,jobs --jq '"\(.status)|\(.conclusion)|\(.workflowName)|\([.jobs[]|select(.conclusion=="failure")|"\(.name) @ \([.steps[]|select(.conclusion=="failure")|.name][0] // "?")"]|join("; "))"' 2>&1) || { echo "WATCH gh error on $id: ${s:0:120}"; left=1; continue; }
    st=${s%%|*}; rest=${s#*|}; c=${rest%%|*}; rest=${rest#*|}; w=${rest%%|*}; f=${rest#*|}
    if [ "$st" = completed ]; then echo "RUN $id $w: $c${f:+ | FAILED: ${f:0:400}}"; seen="$seen$id "
    else left=1; [ -n "$f" ] && case "$seen" in *" f$id "*) ;; *) echo "RUN $id $w: still running, FAILED so far: ${f:0:300}"; seen="${seen}f$id ";; esac; fi
  done
  [ $left = 0 ] && { echo "ALL RUNS ENDED"; break; }
  sleep 45
done
