/* Helpers both demo families share. Kept out of either half so a route that mounts one demo does
   not download the other's renderers; ./demos-brief.js imports only language and downloadText here. */
export const language = (lang) => lang === 'zh' ? 'zh' : 'en';
export const locale = (lang) => language(lang) === 'zh' ? 'zh-CN' : 'en-US';
export const html = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const money = (value, lang) => new Intl.NumberFormat(locale(lang), { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(value);
export function downloadText(root, content, mime, filename) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const url = win.URL.createObjectURL(new win.Blob([content], { type: mime }));
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  doc.body.append(link);
  try { link.click(); } finally { link.remove(); win.setTimeout(() => win.URL.revokeObjectURL(url), 1000); }
}
