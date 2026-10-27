// ONE field reader for every tool and for a page the owner filled by hand: an IIFE that returns [{question, type, required, value, options?}] for each visible form control on the page
// (frames excluded; paste it in DevTools on an owner-filled page, copy(JSON.stringify(...)) the result, save as fields.json). Values are read from the DOM, never from the tool's own report.
(() => {
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const visible = el => { const r = el.getBoundingClientRect(), st = getComputedStyle(el); return st.visibility !== 'hidden' && st.display !== 'none' && (r.width > 0 && r.height > 0); };
  const textOf = id => clean(id.split(/\s+/).map(i => document.getElementById(i)?.textContent || '').join(' '));
  // A <label> that wraps its own box can also wrap the page's suggestion list and a filler's hint beside the box: its text then changes while a tool types, and one field was
  // read as several questions (27 Oct 2026, fair round form 105, a place box: "Current location ✱Zürich, CHE No location found…", "…Click to choose…"). Such a label's question
  // is its parts that hold no control; a label beside its box is read whole, as before. Guard: test/extract-fields.test.mjs.
  const labelText = (lab, el) => {
    if (!lab.contains(el)) return clean(lab.textContent);
    const parts = [...lab.childNodes].filter(n => !(n.nodeType === 1 && (n.contains(el) || n.matches('input, select, textarea') || n.querySelector('input, select, textarea'))));
    return clean(parts.map(n => n.nodeType === 1 ? n.innerText : n.nodeType === 3 ? n.textContent : '').join(' ')) || clean(lab.innerText);
  };
  // An upload slot drawn as a named group: its name is the question (the box's own label is the button that opens the picker, "Attach"), and once the file is in, some pages drop
  // the box and show the file as a chip in the slot (27 Oct 2026, fair round forms 101 and 102: every tool's CV read as an empty "Attach"). Guard: test/extract-fields.test.mjs.
  const controls = root => [...root.querySelectorAll('input, select, textarea')].filter(c => c.type !== 'hidden');
  const groupName = grp => clean((grp.getAttribute('aria-labelledby') && textOf(grp.getAttribute('aria-labelledby'))) || grp.getAttribute('aria-label') || grp.querySelector(':scope > legend')?.textContent || '');
  const slotOf = el => { const grp = el.closest('[role=group], fieldset'); return grp && groupName(grp) && controls(grp).every(c => c === el) ? grp : null; };
  const FILE_NAME = /(?:^|\s)([^\s/\\:]+\.(?:pdf|docx?|rtf|txt|odt))(?=\s|$)/i;
  const fileShownIn = grp => (clean(grp.innerText.replace(groupName(grp), ' ')).match(FILE_NAME) || [])[1] || '';
  const labelOf = el => {
    if (el.getAttribute('aria-labelledby')) { const t = textOf(el.getAttribute('aria-labelledby')); if (t) return t; }
    if (el.labels?.length) { const t = clean([...el.labels].map(l => labelText(l, el)).join(' ')); if (t) return t; }
    if (el.getAttribute('aria-label')) return clean(el.getAttribute('aria-label'));
    const wrap = el.closest('fieldset'); const legend = wrap?.querySelector('legend'); if (legend) return clean(legend.textContent);
    let node = el;   // the nearest ancestor with text of its own before the control: the question as the page shows it
    for (let i = 0; i < 5 && node.parentElement; i++) {
      node = node.parentElement;
      const lab = node.querySelector('label, legend, [class*=label], [class*=question], h3, h4, p');
      if (lab && !lab.contains(el) && clean(lab.textContent)) return clean(lab.textContent).slice(0, 300);
    }
    return clean(el.placeholder || el.name || el.id || '');
  };
  const comboValue = el => {   // react-select style widgets keep the choice in a sibling element, not in the input
    // Climb from the input until an ancestor holds the widget's chosen value; stop before an ancestor that holds another control (15 Oct 2026: Nebius country, city and
    // "employed before: No" were read as empty: the nearest select-like container was the input's own wrapper, which has no value inside it).
    for (let node = el.parentElement, depth = 0; node && depth < 6; node = node.parentElement, depth++) {
      if ([...node.querySelectorAll('input, select, textarea')].filter(c => c !== el && c.type !== 'hidden').length) break;
      const shown = node.querySelector('[class*=single-value], [class*=singleValue], [class*=selected], [class*=multi-value__label], [class*=value-container] [class*=value]');
      if (shown && clean(shown.textContent)) return clean(shown.textContent);
    }
    return '';
  };
  // A radio/checkbox group's question is the text of its container before the options (not the first option's label): legend / group label, else the container's text minus the option labels.
  const groupQuestion = (el, fallback) => {
    const same = [...document.querySelectorAll(`input[type=${el.type}]`)].filter(i => el.name ? i.name === el.name : i === el);
    const grp = el.closest('[role=radiogroup], [role=group], fieldset');
    const named = grp && (clean(grp.querySelector('legend')?.textContent) || clean(grp.getAttribute('aria-label')) || textOf(grp.getAttribute('aria-labelledby') || ''));
    if (named) return named.slice(0, 300);
    let box = el.parentElement;
    while (box && same.some(i => !box.contains(i))) box = box.parentElement;
    for (let i = 0; i < 3 && box && box.parentElement && same.length > 1; i++) {
      let text = clean(box.textContent); for (const o of same) text = text.replace(clean(o.labels?.[0]?.textContent || o.value), '');
      if (clean(text).length > 3) return clean(text).slice(0, 300);
      box = box.parentElement;
    }
    return fallback;
  };
  const out = [], groups = new Map();
  for (const el of document.querySelectorAll('input, select, textarea')) {
    const type = (el.type || el.tagName).toLowerCase();
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) continue;
    const isFile = type === 'file';
    if (el.closest('[aria-hidden="true"]')) continue;   // a honeypot the page hides from people (Breezy hp_7f2b, 17 Oct 2026): not a question, and not required of anyone
    if (!isFile && !visible(el) && !el.closest('label') ) continue;
    const slot = isFile ? slotOf(el) : null;
    const question = slot ? groupName(slot) : labelOf(el), required = el.required || el.getAttribute('aria-required') === 'true' || slot?.getAttribute('aria-required') === 'true' || /\*\s*$|\(required\)|\brequired\b/i.test(question);
    if (type === 'radio' || type === 'checkbox') {
      const key = type + '|' + (el.name || question);
      const g = groups.get(key) || {question: groupQuestion(el, question), type, required, name: el.name || '', value: [], options: []};
      const opt = clean(el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.value);
      g.options.push(opt); if (el.checked) g.value.push(opt); g.required = g.required || required;
      if (!groups.has(key)) { groups.set(key, g); out.push(g); }
      continue;
    }
    let value = isFile ? [...(el.files || [])].map(f => f.name).join(', ') : type === 'select-one' || type === 'select-multiple' ? [...el.selectedOptions].map(o => clean(o.textContent)).filter(t => !/^(select|choose|please|--)/i.test(t)).join(', ') : el.value;
    if (!clean(value) && !isFile) value = comboValue(el);
    if (!clean(value) && slot) value = fileShownIn(slot);
    out.push({question, type, required, name: el.name || el.id || '', value: clean(value), ...(type.startsWith('select') ? {options: [...el.options].map(o => clean(o.textContent)).slice(0, 40)} : {})});
  }
  for (const g of out) if (Array.isArray(g.value)) g.value = g.value.join(', ');
  for (const grp of document.querySelectorAll('[role=group], fieldset')) {   // a named slot that dropped its box and shows the file it holds
    if (!groupName(grp) || controls(grp).length || grp.closest('[aria-hidden="true"]') || !visible(grp)) continue;
    const file = fileShownIn(grp); if (!file) continue;
    out.push({question: groupName(grp), type: 'file', required: grp.getAttribute('aria-required') === 'true' || /\*\s*$/.test(groupName(grp)), name: '', value: file});
  }
  const fileChips = [...document.querySelectorAll('[class*=file], [class*=upload], [class*=attachment]')].map(e => clean(e.textContent)).filter(t => /\.(pdf|docx?|rtf|txt)\b/i.test(t)).map(t => t.slice(0, 120));
  return {url: location.href, title: document.title, fields: out, fileChips: [...new Set(fileChips)]};
})()
