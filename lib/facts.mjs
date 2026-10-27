// The applicant facts a form's runs were given, for the blind judge (judge-blind.mjs). A manifest keeps the instruction (which ends with
// "FACTS:\n<facts>") and the facts' hash, not the facts alone (27 Oct 2026: the judge read a missing applicantText and stopped). The facts
// are taken from the instruction and proved by the hash, and every run of the form must have had the same facts. Guard: test/facts.test.mjs.
import {hash} from './manifest.mjs';
export function factsOf(manifests) {
  const hashes = new Set(manifests.map(m => m.applicantHash));
  if (hashes.size !== 1) throw new Error(`the runs of one form were given different facts (${[...hashes].join(', ')})`);
  for (const m of manifests) {
    const i = (m.instruction || '').indexOf('\n\nFACTS:\n'), facts = m.applicantText ?? (i >= 0 ? m.instruction.slice(i + 9) : null);
    if (facts != null && hash(facts) === m.applicantHash) return facts;
  }
  throw new Error('no run of this form carries facts that match its applicantHash');
}
