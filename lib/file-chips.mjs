// An upload a run's saved fields read as empty while the page showed the file in that slot: some pages drop the file box once the file is in and draw the file as a chip
// (27 Oct 2026, fair round forms 101 and 102, Greenhouse: every tool's CV read as an empty "Attach"; the trail kept the box's last reading from before the upload).
// The reader now reads the chip itself (lib/extract-fields.js); this rule scores runs read before it, from the chips each fields.json saved ("Resume/CV*cv.pdf": slot words, then the file).
// A chip belongs to the empty file field whose name or question appears in the chip's slot words. Applied to every tool's judged fields (score-round.mjs). Guard: test/score-round.test.mjs.
const FILE = /([^\s/\\:*]+\.(?:pdf|docx?|rtf|txt|odt))\b/i;
const fold = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export const markChipUploads = (judged, fileChips = []) => {
  const slots = fileChips.map(c => { const m = String(c).match(FILE); return m && {words: fold(String(c).slice(0, m.index)), file: m[1]}; }).filter(s => s?.words);
  return judged.map(f => {
    if (f.type !== 'file' || f.verdict !== 'empty') return f;
    const slot = slots.find(s => [f.name, f.question].some(k => fold(k).length >= 3 && s.words.includes(fold(k))));
    return slot ? {...f, value: slot.file, verdict: 'right', answerable: true, chip: true, note: `${f.note ? f.note + '; ' : ''}${slot.file} shown in its slot`} : f;
  });
};
