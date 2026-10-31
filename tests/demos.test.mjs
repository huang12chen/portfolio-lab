import test from 'node:test';
import assert from 'node:assert/strict';

let demos = {};
try {
  /* Imported as real modules rather than inlined through a data: URL, because the dataset and the
     interactive layer are two files and the browser resolves them the same way this does. The two
     static renderers are asserted from views.js: they build markup at build time and stay out of
     the bundle the reader downloads to run the controls. */
  const dist = new URL('../examples/alex-lin/dist/', import.meta.url);
  const tools = new URL('../examples/alex-lin/tools/', import.meta.url);
  const growth = await import(new URL('demos.js', dist).href);
  const brief = await import(new URL('demos-brief.js', dist).href);
  demos = {
    ...(await import(new URL('demo-views.js', dist).href)),
    ...(await import(new URL('brief-views.js', dist).href)),
    ...(await import(new URL('views.js', tools).href)),
    initDemos(root) {
      const stopGrowth = growth.initDemos(root);
      const stopBrief = brief.initDemos(root);
      return () => { stopGrowth(); stopBrief(); };
    },
  };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const requireFunction = (name) => {
  assert.equal(typeof demos[name], 'function', `${name} must be exported`);
  return demos[name];
};

const approximately = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} should equal ${expected}`);

test('module imports without a browser and exposes the integration contract', () => {
  for (const name of ['renderGrowthDemo', 'renderBriefDemo', 'initDemos', 'getGrowthReport', 'forecastGrowth', 'buildGrowthCSV', 'escapeCSVCell', 'validateBrief', 'buildBrief', 'briefToText']) requireFunction(name);
  assert.equal(typeof demos.initDemos(), 'function');
});

test('growth report uses a fixed, explicit 28-day synthetic period', () => {
  const report = requireFunction('getGrowthReport')();
  assert.equal(report.startDate, '2026-09-01');
  assert.equal(report.endDate, '2026-09-28');
  assert.equal(report.days, 28);
  assert.equal(report.currency, 'USD');
  assert.equal(report.synthetic, true);
  assert.equal(report.series.length, 28);
  assert.ok(report.totals.orders > 0);
  assert.ok(report.totals.revenue > report.totals.spend);
});

test('market filters partition additive totals without summing unique people', () => {
  const report = requireFunction('getGrowthReport');
  const all = report();
  const us = report({ market: 'us' });
  const uk = report({ market: 'uk' });
  const de = report({ market: 'de' });
  for (const key of ['revenue', 'spend', 'orders', 'clicks', 'impressions']) approximately(all.totals[key], us.totals[key] + uk.totals[key] + de.totals[key]);
  assert.equal('uniquePeople' in all.totals, false);
  assert.ok(all.rows.every(row => row.market === 'us' || row.market === 'uk' || row.market === 'de'));
  assert.ok(uk.rows.every(row => row.market === 'uk'));
  assert.ok(de.rows.every(row => row.market === 'de'));
  assert.equal(all.rows.length, 28 * 3 * 3);
});

test('time filters alter cards, chart series, and table from the same rows', () => {
  const getReport = requireFunction('getGrowthReport');
  const week = getReport({ market: 'us', days: 7 });
  const fortnight = getReport({ market: 'us', days: 14 });
  assert.equal(week.startDate, '2026-09-22');
  assert.equal(fortnight.startDate, '2026-09-15');
  assert.equal(week.series.length, 7);
  assert.ok(week.totals.orders < fortnight.totals.orders);
  approximately(week.totals.revenue, week.series.reduce((sum, day) => sum + day.revenue, 0));
  approximately(week.totals.spend, week.products.reduce((sum, product) => sum + product.spend, 0));
  assert.equal(week.totals.orders, week.products.reduce((sum, product) => sum + product.orders, 0));
  assert.ok(week.rows.every(row => row.date >= week.startDate && row.date <= week.endDate));
});

test('ROAS and cost per order use weighted totals, not averaged row rates', () => {
  const report = requireFunction('getGrowthReport')({ market: 'uk', days: 14 });
  approximately(report.metrics.roas, report.totals.revenue / report.totals.spend);
  approximately(report.metrics.cpa, report.totals.spend / report.totals.orders);
  approximately(report.metrics.aov, report.totals.revenue / report.totals.orders);
  approximately(report.metrics.conversionRate, report.totals.orders / report.totals.clicks);
});

test('growth report rejects unsupported filters and returns isolated records', () => {
  const report = requireFunction('getGrowthReport');
  assert.throws(() => report({ market: 'xx' }), RangeError);
  assert.throws(() => report({ days: 0 }), RangeError);
  assert.throws(() => report({ days: 8 }), RangeError);
  const original = report();
  original.rows[0].orders = -99;
  assert.ok(report().rows[0].orders > 0);
});

test('forecast is a disclosed constant-ROAS scenario for the same period length', () => {
  const report = requireFunction('getGrowthReport')({ days: 7 });
  const forecast = requireFunction('forecastGrowth');
  const first = forecast(report, 2500);
  const second = forecast(report, 5000);
  assert.equal(first.periodDays, 7);
  assert.equal(first.isForecast, true);
  approximately(first.revenue, 2500 * report.metrics.roas);
  approximately(second.revenue, first.revenue * 2);
  assert.equal(first.orders, Math.round(first.revenue / report.metrics.aov));
  assert.equal(forecast(report, 0).revenue, 0);
  assert.equal(forecast(report, 0).orders, 0);
});

test('forecast rejects invalid or unsupported budget input', () => {
  const report = requireFunction('getGrowthReport')();
  const forecast = requireFunction('forecastGrowth');
  for (const budget of [-1, Infinity, NaN, '2500', 10001]) assert.throws(() => forecast(report, budget), RangeError);
});

test('CSV export includes synthetic provenance and exactly the filtered daily rows', () => {
  const report = requireFunction('getGrowthReport')({ market: 'uk', days: 7 });
  const csv = requireFunction('buildGrowthCSV')(report);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, report.rows.length + 1);
  assert.ok(lines[0].includes('ad_spend_usd'));
  assert.ok(lines[0].includes('revenue_usd'));
  assert.ok(lines.slice(1).every(line => line.startsWith('synthetic,uk,USD,2026-09-')));
  assert.ok(!csv.includes(',us,'));
});

test('CSV cell escaping preserves commas, quotes and line breaks, and blocks spreadsheet formulas', () => {
  const escape = requireFunction('escapeCSVCell');
  assert.equal(escape('Bottle, large'), '"Bottle, large"');
  assert.equal(escape('A "quoted" name'), '"A ""quoted"" name"');
  assert.equal(escape('first\nsecond'), '"first\nsecond"');
  assert.equal(escape('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(escape(' +CMD'), "' +CMD");
  assert.equal(escape(12.5), '12.5');
});

const validBrief = { product: 'Ceramic bottle', audience: 'Commuters who carry a reusable bottle', detail: 'a ceramic body and screw-top lid', tone: 'calm', duration: 15 };

test('brief validates required fields, lengths, tone and duration', () => {
  const validate = requireFunction('validateBrief');
  assert.equal(validate(validBrief).valid, true);
  const empty = validate({ product: '', audience: '', detail: '', tone: 'robot', duration: 99 });
  assert.equal(empty.valid, false);
  for (const key of ['product', 'audience', 'detail', 'tone', 'duration']) assert.ok(empty.errors[key]);
  assert.equal(validate({ ...validBrief, product: 'x'.repeat(81) }).valid, false);
  assert.equal(validate({ ...validBrief, audience: 'x'.repeat(161) }).valid, false);
  assert.equal(validate({ ...validBrief, detail: 'x'.repeat(201) }).valid, false);
});

test('brief normalizes whitespace and never silently accepts invalid inputs', () => {
  const build = requireFunction('buildBrief');
  const brief = build({ ...validBrief, product: '  Ceramic   bottle  ' });
  assert.equal(brief.product, 'Ceramic bottle');
  assert.throws(() => build({ ...validBrief, audience: '' }), TypeError);
});

test('brief output is deterministic and changes with product, audience, tone and duration', () => {
  const build = requireFunction('buildBrief');
  const first = build(validBrief);
  assert.deepEqual(first, build(validBrief));
  assert.notEqual(first.hook, build({ ...validBrief, product: 'Desk lamp' }).hook);
  assert.notEqual(first.rationale, build({ ...validBrief, audience: 'Students with a small study desk' }).rationale);
  assert.notEqual(first.hook, build({ ...validBrief, tone: 'playful' }).hook);
  assert.notEqual(first.shots.length, build({ ...validBrief, duration: 30 }).shots.length);
  assert.ok(first.shots.every(shot => shot.time && shot.visual && shot.overlay));
  assert.ok(first.cta && first.rationale);
  assert.equal(first.templateBased, true);
});

test('brief output supports Chinese and text download includes the provided details', () => {
  const build = requireFunction('buildBrief');
  const toText = requireFunction('briefToText');
  const brief = build({ ...validBrief, product: '陶瓷水瓶', audience: '每日通勤的人', detail: '陶瓷瓶身和旋盖' }, 'zh');
  const text = toText(brief);
  assert.match(brief.hook, /陶瓷水瓶/);
  assert.match(text, /本地模板/);
  assert.match(text, /每日通勤的人/);
  assert.match(text, /陶瓷瓶身和旋盖/);
});

test('rendered demos explain provenance, expose accessible controls, and escape user-like text', () => {
  const growth = requireFunction('renderGrowthDemo')('en');
  const brief = requireFunction('renderBriefDemo')('zh');
  assert.match(growth, /data-growth-demo/);
  assert.match(growth, /data-growth-market/);
  assert.match(growth, /data-growth-days/);
  assert.match(growth, /data-growth-budget/);
  assert.match(growth, /data-growth-export/);
  assert.match(growth, /Synthetic/);
  assert.match(growth, /role="img"/);
  assert.match(growth, /Forecast/);
  assert.match(brief, /data-brief-demo/);
  assert.match(brief, /data-brief-result/);
  assert.match(brief, /data-brief-copy/);
  assert.match(brief, /本地/);
  assert.match(brief, /name="audience"/);
  const malicious = demos.buildBrief({ ...validBrief, product: '<img src=x onerror=alert(1)>' });
  assert.equal(malicious.product, '<img src=x onerror=alert(1)>');
  assert.ok(demos.briefToText(malicious).includes('<img src=x onerror=alert(1)>'));
});

test('brief initialization, cleanup and remount preserve draft content and export state', async () => {
  class Element extends EventTarget {
    constructor() { super(); this.dataset = {}; this.textContent = ''; this.innerHTML = ''; this.disabled = false; this.value = ''; this.attributes = new Map(); this.focusCount = 0; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    focus() { this.focusCount += 1; }
  }
  const fields = Object.fromEntries(Object.entries(validBrief).map(([name, value]) => { const field = new Element(); field.value = String(value); return [name, field]; }));
  const form = new Element();
  form.elements = { namedItem: name => fields[name] };
  const controls = new Map(['data-brief-form', 'data-brief-result', 'data-brief-version', 'data-brief-status', 'data-brief-error', 'data-brief-copy', 'data-brief-download', 'data-brief-reset', 'data-brief-result-heading'].map(name => [`[${name}]`, new Element()]));
  controls.set('[data-brief-form]', form);
  const root = new Element();
  root.dataset = { lang: 'en' };
  root.matches = selector => selector.includes('data-brief-demo') && !selector.includes('data-growth-demo]');
  root.querySelectorAll = () => [];
  root.querySelector = selector => controls.get(selector);
  const host = { querySelectorAll: () => [root] };
  const initialize = requireFunction('initDemos');
  const firstCleanup = initialize(host);
  fields.product.value = 'My edited desk lamp';
  form.dispatchEvent(new Event('input'));
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  assert.equal(controls.get('[data-brief-version]').textContent, 'Current draft');
  assert.match(controls.get('[data-brief-result]').innerHTML, /My edited desk lamp/);
  const currentOutput = controls.get('[data-brief-result]').innerHTML;
  const secondCleanup = initialize(host);
  assert.equal(root.dataset.briefState, 'ready');
  assert.equal(controls.get('[data-brief-result]').innerHTML, currentOutput);
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  assert.equal(controls.get('[data-brief-result-heading]').focusCount, 2);
  fields.product.value = '<img src=x onerror=alert(1)>';
  form.dispatchEvent(new Event('input'));
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  assert.ok(!controls.get('[data-brief-result]').innerHTML.includes('<img'));
  assert.ok(controls.get('[data-brief-result]').innerHTML.includes('&lt;img'));
  firstCleanup(); secondCleanup();
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  assert.equal(controls.get('[data-brief-result-heading]').focusCount, 3);
  let clipboardText = '';
  root.ownerDocument = { defaultView: { navigator: { clipboard: { writeText: async text => { clipboardText = text; } } } } };
  const remountCleanup = initialize(host);
  assert.equal(root.dataset.briefState, 'ready');
  controls.get('[data-brief-copy]').dispatchEvent(new Event('click'));
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(clipboardText.includes('<img src=x onerror=alert(1)>'));
  fields.audience.value = 'A different audience for the next version';
  form.dispatchEvent(new Event('input'));
  remountCleanup();
  const dirtyCleanup = initialize(host);
  assert.equal(root.dataset.briefState, 'dirty');
  assert.equal(controls.get('[data-brief-copy]').disabled, true);
  assert.equal(controls.get('[data-brief-download]').disabled, true);
  dirtyCleanup();
});




