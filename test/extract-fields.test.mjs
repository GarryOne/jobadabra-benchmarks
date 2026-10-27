// The field reader on the two shapes that scored a filled field as a miss for every tool (fair round, run 40440347913, 27 Oct 2026):
// a <label> that wraps its box AND the box's suggestion list (form 105), and an upload slot that drops its file box and shows the file as a chip (forms 101, 102).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {chromium} from 'playwright';
const EXTRACT = fs.readFileSync(path.join(import.meta.dirname, '..', 'lib', 'extract-fields.js'), 'utf8');

// A place box whose label wraps the field, the page's suggestion list and a filler's hint beside it (markup shape of a hosted form, invented names).
const PLACE = list => `<form><label><div class="application-label">Current location<span class="required">✱</span></div>
  <div class="application-field"><input name="location" type="text" value="Zuri"><div class="hint">Click to choose: Zurich, Switzerland</div>
  <div class="dropdown-container" style="display:${list ? 'block' : 'none'}"><div class="dropdown-results">${list}</div>
  <div class="dropdown-no-results" style="display:none">No location found. Try entering a different location</div></div></div></label>
  <label><input type="checkbox" name="ok"> I agree to the terms</label></form>`;

// An upload slot drawn as a named group; once the file is in, the page drops the buttons and the file box and draws the file's chip.
const SLOT = after => `<form><div role="group" aria-labelledby="upload-label-resume" class="file-upload"><div id="upload-label-resume" class="label upload-label">Resume/CV<span>*</span></div>
  <div class="file-upload__wrapper">${after ? '<div class="file-upload__filename"><p>cv.pdf</p><button type="button" aria-label="Remove file">×</button></div>'
    : '<button type="button">Attach</button><label style="position:absolute;width:1px;height:1px;overflow:hidden" for="resume">Attach</label><input id="resume" type="file" style="position:absolute;width:1px;height:1px"><p>Accepted file types: pdf, doc, docx</p>'}</div></div>
  <div role="group" aria-labelledby="upload-label-cover" class="file-upload"><div id="upload-label-cover" class="label upload-label">Cover Letter</div>
  <div class="file-upload__wrapper"><button type="button">Attach</button><label style="position:absolute;width:1px;height:1px;overflow:hidden" for="cover_letter">Attach</label><input id="cover_letter" type="file" style="position:absolute;width:1px;height:1px"></div></div></form>`;

let browser; test.before(async () => { browser = await chromium.launch(); }); test.after(() => browser?.close());
const read = async html => { const page = await browser.newPage(); await page.setContent(html); const r = await page.evaluate(EXTRACT); await page.close(); return r; };

test('a label that wraps its box: the question is the label alone, the same whatever the list shows', async () => {
  const shown = [await read(PLACE('')), await read(PLACE('<div>Zurich, Switzerland</div><div>Zurich, NLD</div>'))];
  for (const r of shown) assert.equal(r.fields.find(f => f.name === 'location').question, 'Current location✱');
  assert.equal(shown[0].fields.find(f => f.name === 'ok').question, 'I agree to the terms');   // the control's own words after it still name it
});

test('an upload slot is asked by its name, and a file shown in the slot is its value', async () => {
  const before = await read(SLOT(false)), after = await read(SLOT(true));
  assert.deepEqual(before.fields.filter(f => f.type === 'file').map(f => [f.question, f.value]), [['Resume/CV*', ''], ['Cover Letter', '']]);
  assert.deepEqual(after.fields.filter(f => f.type === 'file').map(f => [f.question, f.value]), [['Cover Letter', ''], ['Resume/CV*', 'cv.pdf']]);
});
