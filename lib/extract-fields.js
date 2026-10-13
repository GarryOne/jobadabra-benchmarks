// ONE field reader for every tool and for a page the owner filled by hand: an IIFE that returns [{question, type, required, value, options?}] for each visible form control on the page
// (frames excluded; paste it in DevTools on an owner-filled page, copy(JSON.stringify(...)) the result, save as fields.json). Values are read from the DOM, never from the tool's own report.
(() => {
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const visible = el => { const r = el.getBoundingClientRect(), st = getComputedStyle(el); return st.visibility !== 'hidden' && st.display !== 'none' && (r.width > 0 && r.height > 0); };
  const textOf = id => clean(id.split(/\s+/).map(i => document.getElementById(i)?.textContent || '').join(' '));
  const labelOf = el => {
    if (el.getAttribute('aria-labelledby')) { const t = textOf(el.getAttribute('aria-labelledby')); if (t) return t; }
    if (el.labels?.length) { const t = clean([...el.labels].map(l => l.textContent).join(' ')); if (t) return t; }
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
    const box = el.closest('[class*=select], [class*=combobox], [role=combobox], [class*=dropdown]') || el.parentElement;
    const shown = box?.querySelector('[class*=single-value], [class*=singleValue], [class*=selected], [class*=value-container] [class*=value]');
    return clean(shown?.textContent || '');
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
    if (!isFile && !visible(el) && !el.closest('label') ) continue;
    const question = labelOf(el), required = el.required || el.getAttribute('aria-required') === 'true' || /\*\s*$|\(required\)|\brequired\b/i.test(question);
    if (type === 'radio' || type === 'checkbox') {
      const key = type + '|' + (el.name || question);
      const g = groups.get(key) || {question: groupQuestion(el, question), type, required, value: [], options: []};
      const opt = clean(el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.value);
      g.options.push(opt); if (el.checked) g.value.push(opt); g.required = g.required || required;
      if (!groups.has(key)) { groups.set(key, g); out.push(g); }
      continue;
    }
    let value = isFile ? [...(el.files || [])].map(f => f.name).join(', ') : type === 'select-one' || type === 'select-multiple' ? [...el.selectedOptions].map(o => clean(o.textContent)).filter(t => !/^(select|choose|please|--)/i.test(t)).join(', ') : el.value;
    if (!clean(value) && !isFile) value = comboValue(el);
    out.push({question, type, required, value: clean(value), ...(type.startsWith('select') ? {options: [...el.options].map(o => clean(o.textContent)).slice(0, 40)} : {})});
  }
  for (const g of out) if (Array.isArray(g.value)) g.value = g.value.join(', ');
  const fileChips = [...document.querySelectorAll('[class*=file], [class*=upload], [class*=attachment]')].map(e => clean(e.textContent)).filter(t => /\.(pdf|docx?|rtf|txt)\b/i.test(t)).map(t => t.slice(0, 120));
  return {url: location.href, title: document.title, fields: out, fileChips: [...new Set(fileChips)]};
})()
