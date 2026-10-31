/* Growth half of the two demo families: the synthetic dataset, the dashboard renderers and the CSV.
   The brief half lives in ./brief-views.js; the behavior lives in ./demos.js and ./demos-brief.js. */
/* Fictional, deterministic portfolio demos. No network requests or top-level DOM access. */
import { language, locale, html, money } from './demo-core.js';

/* Chart ticks only: a full currency string cannot fit the 46px tick column at phone width, and an
   axis label's job is order of magnitude — the exact value is one row down in the table. */
const compactMoney = (value, lang) => new Intl.NumberFormat(locale(lang), { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', notation: 'compact', maximumFractionDigits: 1 }).format(value);
const number = (value, lang) => new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 0 }).format(value);
const ratio = (value) => `${value.toFixed(2)}×`;
const dateLabel = (date, lang, year = false) => new Intl.DateTimeFormat(locale(lang), { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
export const periodLabel = (report, lang) => `${dateLabel(report.startDate, lang)} – ${dateLabel(report.endDate, lang, true)}`;
const PRODUCTS = [
  { id: 'bottle', en: 'Everyday bottle', zh: '日用水瓶', price: 42, typeEn: 'Daily essentials', typeZh: '日用好物' },
  { id: 'tote', en: 'Weekday tote', zh: '通勤手提袋', price: 68, typeEn: 'Carry goods', typeZh: '出行用品' },
  { id: 'cup', en: 'Studio cup', zh: '工作室杯', price: 24, typeEn: 'Home objects', typeZh: '家居小物' }
];
const sumRows = (rows) => rows.reduce((total, row) => {
  for (const key of ['revenue', 'spend', 'orders', 'impressions', 'clicks']) total[key] += row[key];
  return total;
}, { revenue: 0, spend: 0, orders: 0, impressions: 0, clicks: 0 });
const metricsFor = (total) => ({ roas: total.spend ? total.revenue / total.spend : 0, cpa: total.orders ? total.spend / total.orders : 0, aov: total.orders ? total.revenue / total.orders : 0, conversionRate: total.clicks ? total.orders / total.clicks : 0 });
const SYNTHETIC_ROWS = [];
for (let day = 1; day <= 28; day += 1) {
  for (const [marketIndex, market] of ['us', 'uk', 'de'].entries()) {
    PRODUCTS.forEach((product, productIndex) => {
      const seed = (day * 7 + productIndex * 11 + marketIndex * 13) % 17;
      const impressions = 1100 + day * 41 + productIndex * 360 + marketIndex * 240 + seed * 31;
      const clicks = Math.round(impressions * (0.018 + productIndex * 0.003 + marketIndex * 0.001));
      const orders = Math.max(1, Math.round(clicks * (0.045 + productIndex * 0.012 + seed * 0.001)));
      SYNTHETIC_ROWS.push({ date: `2026-09-${String(day).padStart(2, '0')}`, market, productId: product.id, product: product.en, impressions, clicks, orders, revenue: orders * product.price, spend: Math.round((16 + productIndex * 6 + marketIndex * 4 + seed * 0.7 + day * 0.23) * 100) / 100 });
    });
  }
}

/** Additive event/order totals only; impressions and clicks are not unique people. */
export function getGrowthReport({ market = 'all', days = 28 } = {}) {
  if (!['all', 'us', 'uk', 'de'].includes(market)) throw new RangeError('Unsupported market');
  if (![7, 14, 28].includes(days)) throw new RangeError('Unsupported period');
  const startDate = `2026-09-${String(29 - days).padStart(2, '0')}`;
  const rows = SYNTHETIC_ROWS.filter(row => row.date >= startDate && (market === 'all' || row.market === market)).map(row => ({ ...row }));
  const totals = sumRows(rows);
  const series = [...new Set(rows.map(row => row.date))].map(date => ({ date, ...sumRows(rows.filter(row => row.date === date)) }));
  const products = PRODUCTS.map(product => {
    const total = sumRows(rows.filter(row => row.productId === product.id));
    return { id: product.id, name: product.en, ...total, roas: metricsFor(total).roas };
  }).sort((a, b) => b.revenue - a.revenue);
  return { synthetic: true, market, days, currency: 'USD', startDate, endDate: '2026-09-28', rows, totals, metrics: metricsFor(totals), series, products };
}

/** Transparent scenario, not a predictive model: hold sample ROAS and order value constant. */
export function forecastGrowth(report, budget) {
  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0 || budget > 10000) throw new RangeError('Budget must be a number from 0 to 10000 USD');
  const revenue = budget * report.metrics.roas;
  return { isForecast: true, budget, revenue, orders: report.metrics.aov ? Math.round(revenue / report.metrics.aov) : 0, roas: report.metrics.roas, periodDays: report.days };
}

export function escapeCSVCell(value) {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return /[,"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildGrowthCSV(report) {
  const rows = [['data_type', 'market', 'currency', 'date', 'product', 'impressions', 'clicks', 'orders', 'ad_spend_usd', 'revenue_usd'], ...report.rows.map(row => ['synthetic', row.market, 'USD', row.date, row.product, row.impressions, row.clicks, row.orders, row.spend.toFixed(2), row.revenue.toFixed(2)])];
  return rows.map(row => row.map(escapeCSVCell).join(',')).join('\r\n');
}

export const GROWTH_COPY = {
  en: {
    eyebrow: 'Try the dashboard', title: 'Morrow, at a glance', subtitle: 'A small commerce workspace for a fictional everyday-goods brand.', badge: 'Synthetic workspace',
    notice: 'All figures are synthetic. This is a portfolio demo, not a real TikTok screenshot or a live platform connection.', market: 'Market', all: 'All markets', us: 'United States', uk: 'United Kingdom', de: 'Germany', period: 'Period ending Sep 28, 2026', dayLabel: 'days', reset: 'Reset', export: 'Export CSV',
    gross: 'Gross sales', orders: 'Orders', spend: 'Ad spend', roas: 'Return on ad spend', grossNote: 'Before returns and tax', ordersNote: 'Orders, not unique buyers', spendNote: 'Sample paid-media cost', roasNote: 'Gross sales ÷ ad spend',
    chartTitle: 'The daily rhythm', chartSub: 'Daily gross sales · USD', forecast: 'Forecast sandbox', forecastSub: 'Change the budget, explore the assumption', budget: 'Next-period ad budget', estimate: 'Estimated gross sales', estimatedOrders: 'estimated orders', samePeriod: 'Same period length',
    assumption: 'Constant-ROAS scenario: budget × sample ROAS. Assumes the same average order value; excludes returns, fees, tax and changes in performance. Not a guarantee.',
    tableTitle: 'What is selling', tableSub: 'All sample products in this selection', product: 'Product', footnote: 'All money is in USD, including the UK and German samples. No currency conversion or unique-person metric is implied. CSV contains the selected synthetic daily rows.',
    chartSummary: (min, max, peak) => `Daily gross sales range from ${min} to ${max}; the highest day is ${peak}.`, active: 'Showing', exported: 'CSV download requested for the selected synthetic rows.', exportFailed: 'Download was unavailable. Please try again in a browser.', resetDone: 'Filters and forecast budget reset.'
  },
  zh: {
    eyebrow: '试用数据看板', title: 'Morrow，一眼看清', subtitle: '为虚构日用品牌设计的小型电商工作台。', badge: '合成数据工作区',
    notice: '所有数字均为合成数据。本作品集演示并非真实 TikTok 截图，也未连接任何实时平台。', market: '市场', all: '全部市场', us: '美国', uk: '英国', de: '德国', period: '统计截止于 2026年9月28日', dayLabel: '天', reset: '重置', export: '导出 CSV',
    gross: '商品销售额', orders: '订单数', spend: '广告花费', roas: 'ROAS', grossNote: '未扣退货与税费', ordersNote: '订单数，非独立买家数', spendNote: '合成投放成本', roasNote: '商品销售额 ÷ 广告花费',
    chartTitle: '每天的销售节奏', chartSub: '每日商品销售额 · 美元', forecast: '预算预测沙盒', forecastSub: '调整预算，查看固定假设下的结果', budget: '下一统计周期广告预算', estimate: '预计商品销售额', estimatedOrders: '笔预计订单', samePeriod: '保持相同统计天数',
    assumption: '固定 ROAS 情景：预算 × 样本 ROAS。假设平均订单金额不变；未考虑退货、费用、税费及表现变化。此结果不构成保证。',
    tableTitle: '哪些商品在销售', tableSub: '当前筛选下的全部样本商品', product: '商品', footnote: '金额统一为美元，英国与德国样本也使用美元；不代表实际汇率换算。未使用独立人数指标。CSV 包含筛选后的合成每日记录。',
    chartSummary: (min, max, peak) => `每日商品销售额介于 ${min} 至 ${max}，最高值出现在 ${peak}。`, active: '当前显示', exported: '已请求下载当前筛选的合成记录 CSV。', exportFailed: '无法下载，请在浏览器中重试。', resetDone: '已重置筛选条件与预测预算。'
  }
};

export function metricMarkup(report, lang) {
  const t = GROWTH_COPY[language(lang)];
  return [[t.gross, money(report.totals.revenue, lang), t.grossNote], [t.orders, number(report.totals.orders, lang), t.ordersNote], [t.spend, money(report.totals.spend, lang), t.spendNote], [t.roas, ratio(report.metrics.roas), t.roasNote]].map(([label, value, note], index) => `<div class="demo-metric${index === 0 ? ' demo-metric-featured' : ''}"><span class="demo-metric-label">${label}</span><strong>${value}</strong><span class="demo-metric-note">${note}</span></div>`).join('');
}

export function chartMarkup(report, lang) {
  const t = GROWTH_COPY[language(lang)];
  const max = Math.ceil(Math.max(...report.series.map(day => day.revenue)) / 100) * 100;
  const highest = report.series.reduce((peak, day) => day.revenue > peak.revenue ? day : peak, report.series[0]);
  const summary = t.chartSummary(money(Math.min(...report.series.map(day => day.revenue)), lang), money(highest.revenue, lang), dateLabel(highest.date, lang));
  const coords = report.series.map((day, index) => [8 + (index / (report.series.length - 1)) * 624, 190 - (day.revenue / max) * 164]);
  const points = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const xLabels = [...new Set([0, Math.round((report.series.length - 1) / 3), Math.round((report.series.length - 1) * 2 / 3), report.series.length - 1])];
  /* Geometry inside the SVG, every glyph and the end dot in an HTML layer over it.
     Text drawn inside a scaled viewBox is measured in user units, so the same declaration painted
     9.23px at 960px wide and 7.92px at 320px: the compensation steps could not hold the 11px floor,
     because the scale factor changes once per layout break and there are six of them between 320 and
     1440. A real px label needs a real px gutter, so the tick column is a fixed 46px outside the plot
     and the plot itself now spans the whole viewBox. Percentages still land exactly, because the
     wrapper holds the viewBox's own aspect ratio and the mapping stays uniform. Ticks are compact
     ("$18k") for the same reason: a full currency string cannot fit a 46px column at any size. */
  const left = x => (x / 640 * 100).toFixed(3);
  const top = y => (y / 232 * 100).toFixed(3);
  const peak = coords[coords.length - 1];
  return `<div class="demo-chart-plot"><div class="demo-chart-ticks">${[0, 0.5, 1].map(fraction => `<span class="demo-chart-label" style="top:${top(190 - fraction * 164)}%">${compactMoney(max * fraction, lang)}</span>`).join('')}</div><div class="demo-chart-field"><svg viewBox="0 0 640 232" role="img" aria-label="${html(summary)}"><title>${html(summary)}</title>${[0, 0.5, 1].map(fraction => `<line x1="0" x2="640" y1="${190 - fraction * 164}" y2="${190 - fraction * 164}" class="demo-chart-grid"/>`).join('')}<polygon points="0,190 ${points} 640,190" class="demo-chart-area"/><polyline points="${points}" class="demo-chart-line"/></svg><span class="demo-chart-dot" style="left:${left(peak[0])}%;top:${top(peak[1])}%"></span>${xLabels.map(index => `<span class="demo-chart-label demo-chart-x demo-chart-x-${index === 0 ? 'first' : index === report.series.length - 1 ? 'last' : 'middle'}" style="left:${left(coords[index][0])}%">${html(dateLabel(report.series[index].date, lang))}</span>`).join('')}</div></div><p class="demo-chart-summary">${summary}</p>`;
}

export function productRowsMarkup(report, lang) {
  return report.products.map((row, index) => {
    const product = PRODUCTS.find(item => item.id === row.id);
    return `<tr><td><span class="demo-product-name"><span class="demo-product-dot" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${html(product[language(lang)])}<small>${language(lang) === 'zh' ? product.typeZh : product.typeEn}</small></span></span></td><td>${number(row.orders, lang)}</td><td>${money(row.revenue, lang)}</td><td>${money(row.spend, lang)}</td><td>${ratio(row.roas)}</td></tr>`;
  }).join('');
}

export function forecastMarkup(report, budget, lang) {
  const t = GROWTH_COPY[language(lang)];
  const forecast = forecastGrowth(report, budget);
  return `<span class="demo-forecast-label">${t.estimate}</span><strong class="demo-forecast-value">${money(forecast.revenue, lang)}</strong><p class="demo-forecast-orders">${number(forecast.orders, lang)} ${t.estimatedOrders}</p><div class="demo-forecast-rule"><span>${t.samePeriod}</span><strong>${report.days} ${t.dayLabel}</strong></div><div class="demo-forecast-rule"><span>${t.roas}</span><strong>${ratio(forecast.roas)}</strong></div>`;
}
