// The extension's own working time: from the app opening the form tab to the extension's last fill line in the run's app log. The harness (lib/live-row.mjs) keeps watching about 50 s after the last change
// (its "still" clock), so result.seconds for the extension is the work plus that wait; the agents return when they are done, with no such wait. Used for the comparison's time column.
import fs from 'node:fs'; import path from 'node:path';
export function activeSeconds(toolDir) {
  let lines; try { lines = fs.readFileSync(path.join(toolDir, 'capture', 'app.log'), 'utf8').split('\n'); } catch { return null; }
  const at = l => Date.parse(l.slice(0, 24)), start = lines.find(l => l.includes('[apply] opened the form tab')), fills = lines.filter(l => /\[(extension|fill)\]/.test(l) && /fill/.test(l) && !/checked in/.test(l));
  if (!start || !fills.length) return null;
  return Math.round((at(fills.at(-1)) - at(start)) / 1000);
}
