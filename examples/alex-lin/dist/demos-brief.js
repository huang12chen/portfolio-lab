import { language, downloadText } from './demo-core.js';
import { BRIEF_PRESETS, validateBrief, buildBrief, briefToText, BRIEF_COPY, initialBrief, briefResultMarkup } from './brief-views.js';

const boundDemos = new WeakMap();
const briefStates = new WeakMap();

function bindBrief(root, listen, isActive) {
  const lang = language(root.dataset.lang);
  const t = BRIEF_COPY[lang];
  const form = root.querySelector('[data-brief-form]');
  const result = root.querySelector('[data-brief-result]');
  const version = root.querySelector('[data-brief-version]');
  const status = root.querySelector('[data-brief-status]');
  const error = root.querySelector('[data-brief-error]');
  const copy = root.querySelector('[data-brief-copy]');
  const download = root.querySelector('[data-brief-download]');
  const savedState = briefStates.get(root);
  let current = savedState?.current ?? buildBrief(initialBrief(lang), lang);
  let copying = false;
  let dirty = savedState?.dirty ?? false;
  const saveState = () => briefStates.set(root, { current, dirty });
  const field = (name) => form.elements.namedItem(name);
  const read = () => ({ product: field('product').value, audience: field('audience').value, detail: field('detail').value, tone: field('tone').value, duration: Number(field('duration').value) });
  function clearErrors() {
    error.hidden = true; error.textContent = '';
    for (const name of ['product', 'audience', 'detail', 'tone', 'duration']) field(name).removeAttribute('aria-invalid');
  }
  function markDirty() {
    dirty = true; copy.disabled = true; download.disabled = true; version.textContent = t.stale; status.textContent = t.dirty;
    root.dataset.briefState = 'dirty'; saveState(); clearErrors();
  }
  listen(form, 'input', () => {
    for (const preset of root.querySelectorAll('[data-brief-preset]')) preset.setAttribute('aria-pressed', String(BRIEF_PRESETS[preset.dataset.briefPreset][lang].product === field('product').value));
    markDirty();
  });
  listen(form, 'change', markDirty);
  for (const preset of root.querySelectorAll('[data-brief-preset]')) listen(preset, 'click', () => {
    const values = BRIEF_PRESETS[preset.dataset.briefPreset][lang];
    for (const name of ['product', 'audience', 'detail']) field(name).value = values[name];
    for (const button of root.querySelectorAll('[data-brief-preset]')) button.setAttribute('aria-pressed', String(button === preset));
    markDirty();
  });
  listen(form, 'submit', (event) => {
    event.preventDefault(); clearErrors();
    const values = read();
    const validation = validateBrief(values);
    if (!validation.valid) {
      error.textContent = Object.keys(validation.errors).map(key => t.errors[key]).join(' ');
      error.hidden = false;
      for (const key of Object.keys(validation.errors)) field(key).setAttribute('aria-invalid', 'true');
      field(Object.keys(validation.errors)[0]).focus();
      status.textContent = t.invalid; root.dataset.briefState = 'invalid'; return;
    }
    current = buildBrief(values, lang); dirty = false; saveState();
    result.innerHTML = briefResultMarkup(current, lang);
    version.textContent = t.latest; copy.disabled = copying; download.disabled = false; status.textContent = t.ready; root.dataset.briefState = 'ready';
    root.querySelector('[data-brief-result-heading]').focus({ preventScroll: true });
  });
  listen(root.querySelector('[data-brief-reset]'), 'click', () => {
    form.reset(); clearErrors(); current = buildBrief(initialBrief(lang), lang); dirty = false; saveState();
    result.innerHTML = briefResultMarkup(current, lang); version.textContent = t.sample; copy.disabled = copying; download.disabled = false; status.textContent = t.resetDone; root.dataset.briefState = 'sample';
    for (const preset of root.querySelectorAll('[data-brief-preset]')) preset.setAttribute('aria-pressed', String(preset.dataset.briefPreset === 'ceramic-bottle'));
  });
  listen(copy, 'click', async () => {
    if (copying || dirty) return;
    const copiedDraft = current;
    copying = true; copy.disabled = true;
    try {
      const clipboard = root.ownerDocument.defaultView.navigator.clipboard;
      if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
      await clipboard.writeText(briefToText(copiedDraft));
      if (isActive() && current === copiedDraft && !dirty) status.textContent = t.copied;
    } catch { if (isActive() && current === copiedDraft && !dirty) status.textContent = t.copyFailed; }
    finally { copying = false; if (isActive()) copy.disabled = dirty; }
  });
  listen(download, 'click', () => {
    if (dirty) return;
    try { downloadText(root, briefToText(current), 'text/plain;charset=utf-8', `briefly-local-brief-${lang}.txt`); status.textContent = t.downloaded; }
    catch { status.textContent = t.downloadFailed; }
  });
  if (!savedState) root.dataset.briefState = 'sample';
  copy.disabled = dirty; download.disabled = dirty; saveState();
}

/** Bind each rendered brief demo once. Repeated calls preserve draft state; cleanup removes listeners. */
export function initDemos(root = globalThis.document) {
  if (!root?.querySelectorAll) return () => {};
  const instances = [...(root.matches?.('[data-brief-demo]') ? [root] : []), ...root.querySelectorAll('[data-brief-demo]')].filter(instance => instance.matches?.('[data-brief-demo]'));
  const cleanups = instances.map(instance => {
    const existing = boundDemos.get(instance);
    if (existing) return existing;
    const listeners = [];
    let active = true;
    const listen = (element, type, handler) => { element.addEventListener(type, handler); listeners.push(() => element.removeEventListener(type, handler)); };
    const cleanup = () => {
      if (!active) return;
      active = false; listeners.forEach(remove => remove());
      if (boundDemos.get(instance) === cleanup) boundDemos.delete(instance);
    };
    boundDemos.set(instance, cleanup);
    bindBrief(instance, listen, () => active);
    return cleanup;
  });
  return () => cleanups.forEach(cleanup => cleanup());
}
