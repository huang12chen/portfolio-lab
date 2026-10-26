/* Fictional, deterministic portfolio demos. No network requests or top-level DOM access. */
const language = (lang) => lang === 'zh' ? 'zh' : 'en';
const locale = (lang) => language(lang) === 'zh' ? 'zh-CN' : 'en-US';
const html = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = (value, lang) => new Intl.NumberFormat(locale(lang), { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(value);
const number = (value, lang) => new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 0 }).format(value);
const ratio = (value) => `${value.toFixed(2)}×`;
const dateLabel = (date, lang, year = false) => new Intl.DateTimeFormat(locale(lang), { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const periodLabel = (report, lang) => `${dateLabel(report.startDate, lang)} – ${dateLabel(report.endDate, lang, true)}`;
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

const GROWTH_COPY = {
  en: {
    eyebrow: '01 / Try the dashboard', title: 'Morrow, at a glance.', subtitle: 'A small commerce workspace for a fictional everyday-goods brand.', badge: 'Synthetic workspace',
    notice: 'All figures are synthetic. This is a portfolio demo, not a real TikTok screenshot or a live platform connection.', market: 'Market', all: 'All markets', us: 'United States', uk: 'United Kingdom', de: 'Germany', period: 'Period ending Sep 28, 2026', dayLabel: 'days', reset: 'Reset', export: 'Export CSV',
    gross: 'Gross sales', orders: 'Orders', spend: 'Ad spend', roas: 'Return on ad spend', grossNote: 'Before returns and tax', ordersNote: 'Orders, not unique buyers', spendNote: 'Sample paid-media cost', roasNote: 'Gross sales ÷ ad spend',
    chartTitle: 'The daily rhythm', chartSub: 'Daily gross sales · USD', forecast: 'Forecast sandbox', forecastSub: 'Change the budget. Explore the assumption.', budget: 'Next-period ad budget', estimate: 'Estimated gross sales', estimatedOrders: 'estimated orders', samePeriod: 'Same period length',
    assumption: 'Constant-ROAS scenario: budget × sample ROAS. Assumes the same average order value; excludes returns, fees, tax and changes in performance. Not a guarantee.',
    tableTitle: 'What is selling', tableSub: 'All sample products in this selection', product: 'Product', footnote: 'All money is in USD, including the UK and German samples. No currency conversion or unique-person metric is implied. CSV contains the selected synthetic daily rows.',
    chartSummary: (min, max, peak) => `Daily gross sales range from ${min} to ${max}; the highest day is ${peak}.`, active: 'Showing', exported: 'CSV download requested for the selected synthetic rows.', exportFailed: 'Download was unavailable. Please try again in a browser.', resetDone: 'Filters and forecast budget reset.'
  },
  zh: {
    eyebrow: '01 / 试用数据看板', title: 'Morrow，一眼看清。', subtitle: '为虚构日用品牌设计的小型电商工作台。', badge: '合成数据工作区',
    notice: '所有数字均为合成数据。本作品集演示并非真实 TikTok 截图，也未连接任何实时平台。', market: '市场', all: '全部市场', us: '美国', uk: '英国', de: '德国', period: '统计截止于 2026年9月28日', dayLabel: '天', reset: '重置', export: '导出 CSV',
    gross: '商品销售额', orders: '订单数', spend: '广告花费', roas: '广告投入产出比', grossNote: '未扣退货与税费', ordersNote: '订单数，非独立买家数', spendNote: '合成投放成本', roasNote: '商品销售额 ÷ 广告花费',
    chartTitle: '每天的销售节奏', chartSub: '每日商品销售额 · 美元', forecast: '预算预测沙盒', forecastSub: '调整预算，查看固定假设下的结果。', budget: '下一统计周期广告预算', estimate: '预计商品销售额', estimatedOrders: '笔预计订单', samePeriod: '保持相同统计天数',
    assumption: '固定 ROAS 情景：预算 × 样本 ROAS。假设平均订单金额不变；未考虑退货、费用、税费及表现变化。此结果不构成保证。',
    tableTitle: '哪些商品在销售', tableSub: '当前筛选下的全部样本商品', product: '商品', footnote: '金额统一为美元，英国与德国样本也使用美元；不代表实际汇率换算。未使用独立人数指标。CSV 包含筛选后的合成每日记录。',
    chartSummary: (min, max, peak) => `每日商品销售额介于 ${min} 至 ${max}，最高值出现在 ${peak}。`, active: '当前显示', exported: '已请求下载当前筛选的合成记录 CSV。', exportFailed: '无法下载，请在浏览器中重试。', resetDone: '已重置筛选条件与预测预算。'
  }
};

function metricMarkup(report, lang) {
  const t = GROWTH_COPY[language(lang)];
  return [[t.gross, money(report.totals.revenue, lang), t.grossNote], [t.orders, number(report.totals.orders, lang), t.ordersNote], [t.spend, money(report.totals.spend, lang), t.spendNote], [t.roas, ratio(report.metrics.roas), t.roasNote]].map(([label, value, note], index) => `<div class="demo-metric${index === 0 ? ' demo-metric-featured' : ''}"><span class="demo-metric-label">${label}</span><strong>${value}</strong><span class="demo-metric-note">${note}</span></div>`).join('');
}

function chartMarkup(report, lang) {
  const t = GROWTH_COPY[language(lang)];
  const max = Math.ceil(Math.max(...report.series.map(day => day.revenue)) / 100) * 100;
  const highest = report.series.reduce((peak, day) => day.revenue > peak.revenue ? day : peak, report.series[0]);
  const summary = t.chartSummary(money(Math.min(...report.series.map(day => day.revenue)), lang), money(highest.revenue, lang), dateLabel(highest.date, lang));
  const coords = report.series.map((day, index) => [52 + (index / (report.series.length - 1)) * 558, 190 - (day.revenue / max) * 164]);
  const points = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const xLabels = [...new Set([0, Math.round((report.series.length - 1) / 3), Math.round((report.series.length - 1) * 2 / 3), report.series.length - 1])];
  return `<svg viewBox="0 0 640 232" role="img" aria-label="${html(summary)}"><title>${html(summary)}</title>${[0, 0.5, 1].map(fraction => `<line x1="52" x2="610" y1="${190 - fraction * 164}" y2="${190 - fraction * 164}" class="demo-chart-grid"/><text x="42" y="${194 - fraction * 164}" text-anchor="end" class="demo-chart-label">${number(max * fraction, lang)}</text>`).join('')}<polygon points="52,190 ${points} 610,190" class="demo-chart-area"/><polyline points="${points}" class="demo-chart-line"/>${coords.map(([x, y], index) => index === coords.length - 1 ? `<circle cx="${x}" cy="${y}" r="4" class="demo-chart-dot"/>` : '').join('')}${xLabels.map(index => `<text x="${coords[index][0]}" y="218" text-anchor="${index === 0 ? 'start' : index === report.series.length - 1 ? 'end' : 'middle'}" class="demo-chart-label">${html(dateLabel(report.series[index].date, lang))}</text>`).join('')}</svg><p class="demo-chart-summary">${summary}</p>`;
}

function productRowsMarkup(report, lang) {
  return report.products.map((row, index) => {
    const product = PRODUCTS.find(item => item.id === row.id);
    return `<tr><td><span class="demo-product-name"><span class="demo-product-dot" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${html(product[language(lang)])}<small>${language(lang) === 'zh' ? product.typeZh : product.typeEn}</small></span></span></td><td>${number(row.orders, lang)}</td><td>${money(row.revenue, lang)}</td><td>${ratio(row.roas)}</td></tr>`;
  }).join('');
}

function forecastMarkup(report, budget, lang) {
  const t = GROWTH_COPY[language(lang)];
  const forecast = forecastGrowth(report, budget);
  return `<span class="demo-forecast-label">${t.estimate}</span><strong class="demo-forecast-value">${money(forecast.revenue, lang)}</strong><p class="demo-forecast-orders">${number(forecast.orders, lang)} ${t.estimatedOrders}</p><div class="demo-forecast-rule"><span>${t.samePeriod}</span><strong>${report.days} ${t.dayLabel}</strong></div><div class="demo-forecast-rule"><span>${t.roas}</span><strong>${ratio(forecast.roas)}</strong></div>`;
}
export function renderGrowthDemo(lang = 'en') {
  lang = language(lang);
  const t = GROWTH_COPY[lang];
  const report = getGrowthReport();
  return `<section class="demo-growth" data-growth-demo data-lang="${lang}" aria-label="${lang === 'zh' ? 'Morrow 互动电商看板' : 'Morrow interactive commerce dashboard'}">
    <header class="demo-top"><div><p class="demo-eyebrow">${t.eyebrow}</p><h3>${t.title}</h3><p class="demo-subtitle">${t.subtitle}</p></div><span class="demo-badge"><span aria-hidden="true"></span>${t.badge}</span></header>
    <p class="demo-provenance">${t.notice}</p>
    <div class="demo-toolbar"><label class="demo-control"><span>${t.market}</span><select data-growth-market><option value="all">${t.all}</option><option value="us">${t.us}</option><option value="uk">${t.uk}</option><option value="de">${t.de}</option></select></label><label class="demo-control"><span>${t.period}</span><select data-growth-days>${[7, 14, 28].map(days => `<option value="${days}"${days === 28 ? ' selected' : ''}>${days} ${t.dayLabel}</option>`).join('')}</select></label><div class="demo-toolbar-actions"><button type="button" class="demo-button demo-button-secondary" data-growth-reset>${t.reset}</button><button type="button" class="demo-button demo-button-primary" data-growth-export>${t.export}<span aria-hidden="true"> ↗</span></button></div></div>
    <p class="demo-period" data-growth-period>${t.active}: ${t.all} · ${periodLabel(report, lang)}</p>
    <div class="demo-metrics" data-growth-metrics>${metricMarkup(report, lang)}</div>
    <div class="demo-growth-grid"><div class="demo-card demo-chart-card"><div class="demo-card-heading"><div><h4>${t.chartTitle}</h4><p>${t.chartSub}</p></div><span class="demo-chart-key"><i aria-hidden="true"></i>${t.gross}</span></div><div data-growth-chart>${chartMarkup(report, lang)}</div></div>
    <aside class="demo-card demo-forecast"><div class="demo-card-heading"><div><p class="demo-eyebrow">${t.forecast}</p><h4>${t.forecastSub}</h4></div></div><label class="demo-budget"><span>${t.budget}<output data-growth-budget-value>${money(2500, lang)}</output></span><input type="range" min="0" max="10000" step="100" value="2500" data-growth-budget aria-label="${t.budget}"><span class="demo-budget-ends"><span>${money(0, lang)}</span><span>${money(10000, lang)}</span></span></label><div data-growth-forecast>${forecastMarkup(report, 2500, lang)}</div><p class="demo-assumption">${t.assumption}</p></aside></div>
    <div class="demo-card demo-table-card"><div class="demo-card-heading"><div><h4>${t.tableTitle}</h4><p>${t.tableSub}</p></div></div><table><caption class="demo-sr-only">${t.tableTitle} · ${t.tableSub}</caption><thead><tr><th scope="col">${t.product}</th><th scope="col">${t.orders}</th><th scope="col">${t.gross}</th><th scope="col">ROAS</th></tr></thead><tbody data-growth-products>${productRowsMarkup(report, lang)}</tbody></table></div>
    <p class="demo-footnote">${t.footnote}</p><p class="demo-status" data-growth-status role="status" aria-live="polite"></p>
  </section>`;
}

export const BRIEF_PRESETS = Object.freeze({
  'ceramic-bottle': { en: { product: 'Ceramic bottle', audience: 'Commuters who carry a reusable bottle', detail: 'a ceramic body and screw-top lid' }, zh: { product: '陶瓷水瓶', audience: '习惯自带水瓶的通勤者', detail: '陶瓷瓶身和旋盖' } },
  'desk-lamp': { en: { product: 'Desk lamp', audience: 'Students working at a small study desk', detail: 'an adjustable shade and a compact base' }, zh: { product: '桌面台灯', audience: '在小书桌前学习的学生', detail: '可调节灯罩和小巧底座' } },
  'travel-bag': { en: { product: 'Travel bag', audience: 'People packing for a weekend away', detail: 'a wide opening and a separate front pocket' }, zh: { product: '旅行包', audience: '为周末短途旅行打包的人', detail: '宽开口和独立前袋' } }
});
const normalizeText = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export function validateBrief(input = {}) {
  const value = { product: normalizeText(input.product), audience: normalizeText(input.audience), detail: normalizeText(input.detail), tone: input.tone, duration: input.duration };
  const errors = {};
  for (const [key, min, max] of [['product', 2, 80], ['audience', 5, 160], ['detail', 5, 200]]) {
    if (value[key].length < min) errors[key] = 'too_short';
    else if (value[key].length > max) errors[key] = 'too_long';
  }
  if (!['calm', 'playful', 'direct'].includes(value.tone)) errors.tone = 'invalid_choice';
  if (![15, 30].includes(value.duration)) errors.duration = 'invalid_choice';
  return { valid: Object.keys(errors).length === 0, errors, value };
}

export function buildBrief(input, lang = 'en') {
  lang = language(lang);
  const validation = validateBrief(input);
  if (!validation.valid) {
    const error = new TypeError('Please provide valid brief inputs');
    error.fields = validation.errors;
    throw error;
  }
  const { product, audience, detail, tone, duration } = validation.value;
  const zh = lang === 'zh';
  const hooks = zh ? { calm: `留一点日常空间，给${product}。`, playful: `${product}，今天轮到你出镜。`, direct: `${product}，一个细节看清楚。` } : { calm: `Make a little room for ${product}.`, playful: `POV: ${product} gets the main-character moment.`, direct: `${product}, in one clear close-up.` };
  const hook = hooks[tone];
  const cta = zh ? ({ calm: `慢慢看看${product}的细节。`, playful: `下一位日常搭子？看看${product}。`, direct: `查看${product}的具体信息。` }[tone]) : ({ calm: `Take a closer look at ${product}.`, playful: `Meet your maybe-next favorite: ${product}.`, direct: `See ${product} details.` }[tone]);
  const shots = zh ? [
    { time: duration === 15 ? '0–3s' : '0–5s', visual: `从${audience}熟悉的日常场景开始，让${product}自然入镜。`, overlay: hook },
    { time: duration === 15 ? '3–10s' : '5–15s', visual: `用特写展示${detail}。实际拍摄前核对产品细节。`, overlay: detail },
    ...(duration === 30 ? [{ time: '15–24s', visual: `回到${audience}的使用场景，展示一次简单、真实的使用过程。`, overlay: `放进日常，再看一眼。` }] : []),
    { time: duration === 15 ? '10–15s' : '24–30s', visual: `回到完整产品画面，保留足够时间读完行动提示。`, overlay: cta }
  ] : [
    { time: duration === 15 ? '0–3s' : '0–5s', visual: `Open on a familiar everyday moment for ${audience}. Keep ${product} in the frame.`, overlay: hook },
    { time: duration === 15 ? '3–10s' : '5–15s', visual: `Film a close-up of ${detail}. Verify this detail on the actual product before shooting.`, overlay: detail },
    ...(duration === 30 ? [{ time: '15–24s', visual: `Return to the everyday setting for ${audience}. Show one simple, real use of the product.`, overlay: 'One small detail, in everyday life.' }] : []),
    { time: duration === 15 ? '10–15s' : '24–30s', visual: 'End on the full product. Leave enough time to read the call to action.', overlay: cta }
  ];
  const toneName = zh ? { calm: '平静', playful: '轻松', direct: '直接' }[tone] : tone;
  const rationale = zh ? `采用${toneName}语气开场；由“${audience}”决定第一幕的场景，用“${detail}”为中段提供可拍摄的具体内容。这是一份本地模板草稿，没有使用外部 AI 服务；发布前仍需核实产品事实。` : `The ${toneName} tone shapes the opening. The audience (${audience}) sets the first scene, while “${detail}” gives the middle scene a specific detail to show. This is a local template draft, with no external AI service; verify product facts before publishing.`;
  return { templateBased: true, language: lang, product, audience, detail, tone, duration, hook, shots, cta, rationale };
}

export function briefToText(brief) {
  const zh = brief.language === 'zh';
  return [zh ? `Briefly / 本地模板草稿 / ${brief.duration}秒` : `Briefly / Local template draft / ${brief.duration} seconds`, brief.product, '', `${zh ? '目标人群' : 'Audience'}: ${brief.audience}`, `${zh ? '产品细节' : 'Product detail'}: ${brief.detail}`, '', `${zh ? '开场钩子' : 'Hook'}\n${brief.hook}`, '', `${zh ? '镜头清单' : 'Shot list'}\n${brief.shots.map(shot => `${shot.time} — ${shot.visual}\n${zh ? '画面文字' : 'On-screen text'}: ${shot.overlay}`).join('\n\n')}`, '', `${zh ? '行动提示' : 'Call to action'}\n${brief.cta}`, '', `${zh ? '设计理由' : 'Rationale'}\n${brief.rationale}`].join('\n');
}
const BRIEF_COPY = {
  en: {
    eyebrow: '02 / Try the workflow', title: 'A blank page, with a head start.', subtitle: 'Briefly turns a few product details into a short-form content brief.', badge: 'Local interactive prototype', notice: 'Template-based output, generated in this browser. No external AI API, uploads or account required. Inputs stay on this page until you copy or download them.',
    start: 'Start with a product', bottle: 'Ceramic bottle', lamp: 'Desk lamp', bag: 'Travel bag', product: 'Product name', audience: 'Who is this for?', detail: 'One product detail to show', detailHint: 'Describe a visible detail you can verify, rather than an unproven benefit.', tone: 'Tone', calm: 'Calm', playful: 'Playful', direct: 'Direct', duration: 'Video length', seconds: 'seconds', build: 'Build brief', reset: 'Reset',
    result: 'Your content brief', sample: 'Sample draft', latest: 'Current draft', stale: 'Previous draft — build to update', copy: 'Copy', download: 'Download .txt', hook: 'Opening hook', shots: 'Shot list', overlay: 'On-screen text', cta: 'Call to action', rationale: 'Why this structure', method: 'How this prototype works', methodText: 'A deterministic local template maps your audience, product detail, tone and length into a storyboard. The same inputs produce the same draft. It does not infer product facts, generate images or measure likely performance.',
    dirty: 'Inputs changed. Build a brief to update the result.', ready: 'Brief built from the current inputs.', resetDone: 'Inputs and sample draft reset.', copied: 'Brief copied to your clipboard.', copyFailed: 'Clipboard unavailable. Select the brief text or download the .txt file.', downloaded: 'Text download requested.', downloadFailed: 'Download unavailable. You can select the brief text to copy it.', invalid: 'Please check the highlighted fields.',
    errors: { product: 'Use 2–80 characters for the product name.', audience: 'Describe the audience in 5–160 characters.', detail: 'Add a product detail in 5–200 characters.', tone: 'Choose one of the available tones.', duration: 'Choose a 15- or 30-second length.' }
  },
  zh: {
    eyebrow: '02 / 试用创作流程', title: '从空白页，到第一份草稿。', subtitle: '用几个产品信息，在 Briefly 生成短视频内容简报。', badge: '本地互动原型', notice: '内容由浏览器内的模板生成，无外部 AI API、上传或账号。输入仅保留在当前页面，直到你主动复制或下载。',
    start: '选择一个起点', bottle: '陶瓷水瓶', lamp: '桌面台灯', bag: '旅行包', product: '产品名称', audience: '内容面向谁？', detail: '想展示的一个产品细节', detailHint: '填写可以核实的可见细节，避免未经证实的效果描述。', tone: '语气', calm: '平静', playful: '轻松', direct: '直接', duration: '视频长度', seconds: '秒', build: '生成简报', reset: '重置',
    result: '你的内容简报', sample: '示例草稿', latest: '当前草稿', stale: '上一版草稿 — 生成后更新', copy: '复制', download: '下载 .txt', hook: '开场钩子', shots: '镜头清单', overlay: '画面文字', cta: '行动提示', rationale: '为什么这样安排', method: '原型如何工作', methodText: '固定的本地模板把受众、产品细节、语气与时长组成分镜。同样的输入会生成同样的草稿。原型不会推断产品事实、生成图片或预测内容表现。',
    dirty: '输入已修改，生成简报后更新结果。', ready: '已根据当前输入生成简报。', resetDone: '已恢复初始输入与示例草稿。', copied: '简报已复制到剪贴板。', copyFailed: '无法使用剪贴板，可选中简报文字或下载 .txt 文件。', downloaded: '已请求下载文本文件。', downloadFailed: '无法下载，可选中简报文字后复制。', invalid: '请检查标出的输入项。',
    errors: { product: '产品名称需要 2–80 个字符。', audience: '请用 5–160 个字符描述受众。', detail: '请用 5–200 个字符描述产品细节。', tone: '请选择可用的语气。', duration: '请选择 15 秒或 30 秒。' }
  }
};
const initialBrief = (lang) => ({ ...BRIEF_PRESETS['ceramic-bottle'][language(lang)], tone: 'calm', duration: 15 });

function briefResultMarkup(brief, lang) {
  const t = BRIEF_COPY[language(lang)];
  return `<div class="demo-brief-hook"><span class="demo-section-label">${t.hook}</span><p>${html(brief.hook)}</p></div><div class="demo-shot-list"><h5>${t.shots}</h5><ol>${brief.shots.map(shot => `<li><span class="demo-shot-time">${shot.time}</span><div><p>${html(shot.visual)}</p><small>${t.overlay}: <span>${html(shot.overlay)}</span></small></div></li>`).join('')}</ol></div><div class="demo-brief-cta"><span class="demo-section-label">${t.cta}</span><p>${html(brief.cta)}</p></div><div class="demo-brief-rationale"><h5>${t.rationale}</h5><p>${html(brief.rationale)}</p></div>`;
}

export function renderBriefDemo(lang = 'en') {
  lang = language(lang);
  const t = BRIEF_COPY[lang];
  const value = initialBrief(lang);
  return `<section class="demo-brief" data-brief-demo data-lang="${lang}" aria-label="${lang === 'zh' ? 'Briefly 内容简报互动原型' : 'Briefly interactive content brief prototype'}">
    <header class="demo-top"><div><p class="demo-eyebrow">${t.eyebrow}</p><h3>${t.title}</h3><p class="demo-subtitle">${t.subtitle}</p></div><span class="demo-badge"><span aria-hidden="true"></span>${t.badge}</span></header><p class="demo-provenance">${t.notice}</p>
    <div class="demo-brief-grid"><form class="demo-card demo-brief-form" data-brief-form novalidate><fieldset class="demo-presets"><legend>${t.start}</legend><div>${[['ceramic-bottle', t.bottle], ['desk-lamp', t.lamp], ['travel-bag', t.bag]].map(([id, label], index) => `<button type="button" data-brief-preset="${id}" aria-pressed="${index === 0}">${label}</button>`).join('')}</div></fieldset>
      <label class="demo-control"><span>${t.product}</span><input type="text" name="product" maxlength="80" minlength="2" value="${html(value.product)}" required autocomplete="off"></label>
      <label class="demo-control"><span>${t.audience}</span><textarea name="audience" maxlength="160" minlength="5" rows="2" required>${html(value.audience)}</textarea></label>
      <label class="demo-control"><span>${t.detail}</span><textarea name="detail" maxlength="200" minlength="5" rows="2" required>${html(value.detail)}</textarea><small>${t.detailHint}</small></label>
      <div class="demo-form-row"><label class="demo-control"><span>${t.tone}</span><select name="tone">${['calm', 'playful', 'direct'].map(tone => `<option value="${tone}">${t[tone]}</option>`).join('')}</select></label><label class="demo-control"><span>${t.duration}</span><select name="duration"><option value="15">15 ${t.seconds}</option><option value="30">30 ${t.seconds}</option></select></label></div>
      <p class="demo-form-error" data-brief-error role="alert" hidden></p><div class="demo-form-actions"><button class="demo-button demo-button-primary" type="submit">${t.build}<span aria-hidden="true"> →</span></button><button class="demo-button demo-button-secondary" type="button" data-brief-reset>${t.reset}</button></div>
      <details class="demo-method"><summary>${t.method}</summary><p>${t.methodText}</p></details>
    </form><article class="demo-card demo-brief-output"><div class="demo-card-heading"><div><h4 tabindex="-1" data-brief-result-heading>${t.result}</h4><p data-brief-version>${t.sample}</p></div><div class="demo-result-actions"><button type="button" class="demo-button demo-button-small" data-brief-copy>${t.copy}</button><button type="button" class="demo-button demo-button-small" data-brief-download>${t.download}</button></div></div><div data-brief-result>${briefResultMarkup(buildBrief(value, lang), lang)}</div></article></div><p class="demo-status" data-brief-status role="status" aria-live="polite"></p>
  </section>`;
}

const boundDemos = new WeakMap();
const briefStates = new WeakMap();
function downloadText(root, content, mime, filename) {
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

/** Bind each rendered instance once. Repeated calls preserve mounted state; cleanup removes listeners. */
export function initDemos(root = globalThis.document) {
  if (!root?.querySelectorAll) return () => {};
  const instances = [...(root.matches?.('[data-growth-demo], [data-brief-demo]') ? [root] : []), ...root.querySelectorAll('[data-growth-demo], [data-brief-demo]')];
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
    if (instance.matches('[data-growth-demo]')) bindGrowth(instance, listen);
    else bindBrief(instance, listen, () => active);
    return cleanup;
  });
  return () => cleanups.forEach(cleanup => cleanup());
}


