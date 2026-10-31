import { language, money, downloadText } from './demo-core.js';
import { periodLabel, metricMarkup, chartMarkup, productRowsMarkup, forecastMarkup, getGrowthReport, forecastGrowth, buildGrowthCSV, GROWTH_COPY } from './demo-views.js';

const boundDemos = new WeakMap();

function bindGrowth(root, listen) {
  const lang = language(root.dataset.lang);
  const t = GROWTH_COPY[lang];
  const market = root.querySelector('[data-growth-market]');
  const days = root.querySelector('[data-growth-days]');
  const budget = root.querySelector('[data-growth-budget]');
  const status = root.querySelector('[data-growth-status]');
  const report = () => getGrowthReport({ market: market.value, days: Number(days.value) });
  function updateForecast(current = report()) {
    const value = Number(budget.value);
    root.querySelector('[data-growth-budget-value]').textContent = money(value, lang);
    budget.setAttribute('aria-valuetext', money(value, lang));
    root.querySelector('[data-growth-forecast]').innerHTML = forecastMarkup(current, value, lang);
  }
  function update() {
    const current = report();
    root.querySelector('[data-growth-period]').textContent = `${t.active}: ${t[market.value]} · ${periodLabel(current, lang)}`;
    root.querySelector('[data-growth-metrics]').innerHTML = metricMarkup(current, lang);
    root.querySelector('[data-growth-chart]').innerHTML = chartMarkup(current, lang);
    root.querySelector('[data-growth-products]').innerHTML = productRowsMarkup(current, lang);
    updateForecast(current);
    status.textContent = `${t.active}: ${t[market.value]} · ${current.days} ${t.dayLabel} · ${money(current.totals.revenue, lang)} ${t.gross.toLowerCase()}.`;
  }
  listen(market, 'change', update);
  listen(days, 'change', update);
  listen(budget, 'input', () => updateForecast());
  listen(budget, 'change', () => {
    const forecast = forecastGrowth(report(), Number(budget.value));
    status.textContent = `${t.forecast}: ${money(forecast.revenue, lang)} · ${forecast.periodDays} ${t.dayLabel}.`;
  });
  listen(root.querySelector('[data-growth-reset]'), 'click', () => {
    market.value = 'all'; days.value = '28'; budget.value = '2500'; update(); status.textContent = t.resetDone;
  });
  listen(root.querySelector('[data-growth-export]'), 'click', () => {
    const current = report();
    try { downloadText(root, `\uFEFF${buildGrowthCSV(current)}`, 'text/csv;charset=utf-8', `morrow-synthetic-${current.market}-${current.startDate}-${current.endDate}.csv`); status.textContent = t.exported; }
    catch { status.textContent = t.exportFailed; }
  });
  updateForecast();
}
/** Bind each rendered growth demo once. Repeated calls preserve mounted state; cleanup removes listeners. */
export function initDemos(root = globalThis.document) {
  if (!root?.querySelectorAll) return () => {};
  const instances = [...(root.matches?.('[data-growth-demo]') ? [root] : []), ...root.querySelectorAll('[data-growth-demo]')].filter(instance => instance.matches?.('[data-growth-demo]'));
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
    bindGrowth(instance, listen);
    return cleanup;
  });
  return () => cleanups.forEach(cleanup => cleanup());
}
