/* Measures the shipped demo site in a real browser and prints a report.
   Usage: node examples/alex-lin/tools/measure-site.mjs [--screenshots <dir>]
   Reads scripts/serve.mjs (the repo's own static server) so routes are exercised exactly
   as they will be deployed. Nothing here is shipped inside examples/alex-lin/dist. */
import { createRequire } from 'node:module';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createStaticServer } from '../../../scripts/serve.mjs';

const require = createRequire('C:/Users/34319/AppData/Roaming/npm/node_modules/@playwright/cli/package.json');
const { chromium } = require('playwright');

const OUT = process.argv.includes('--screenshots')
  ? process.argv[process.argv.indexOf('--screenshots') + 1]
  : join(process.env.TEMP || '/tmp', 'alex-lin-measure');
mkdirSync(OUT, { recursive: true });

const pages = [
  ['home-en', '/index.html?lang=en'],
  ['home-zh', '/index.html?lang=zh'],
  ['case-signal-en', '/project.html?id=signal&lang=en'],
  ['case-signal-zh', '/project.html?id=signal&lang=zh'],
  ['case-briefly-en', '/project.html?id=briefly&lang=en'],
  ['case-fieldwork-en', '/project.html?id=fieldwork&lang=en'],
  ['about-en', '/about.html?lang=en'],
  ['about-zh', '/about.html?lang=zh'],
];
const viewports = [360, 390, 768, 1440];

const server = createStaticServer({ mount: '/' });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

/* The pinned Playwright build in this environment has no matching browser download,
   so resolve a locally installed Chromium instead. Nothing is downloaded. */
function findChromium() {
  if (process.env.MEASURE_CHROME && existsSync(process.env.MEASURE_CHROME)) return process.env.MEASURE_CHROME;
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  let builds = [];
  try {
    builds = readdirSync(root).filter(name => /^chromium-\d+$/.test(name)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  } catch { builds = []; }
  for (const dir of builds) {
    for (const folder of ['chrome-win64', 'chrome-win']) {
      const candidate = join(root, dir, folder, 'chrome.exe');
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}
const chromePath = findChromium();
const browser = await chromium.launch(chromePath ? { executablePath: chromePath } : {});
const report = { base, pages: {}, critical: {}, budgets: {} };

/* ---------- per-page measurements ---------- */
async function newContext(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  return context;
}

function contrastFn() {
  const parse = value => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r, g, b, a: Number(a) };
  };
  const lum = ({ r, g, b }) => {
    const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = node => {
    let element = node;
    while (element && element.nodeType === 1) {
      const color = parse(getComputedStyle(element).backgroundColor);
      if (color && color.a > 0.94) return color;
      element = element.parentElement;
    }
    return { r: 244, g: 245, b: 239 };
  };
  const out = { pairs: {}, worst: { ratio: 99 }, minFont: 999, cjkTracked: 0, headings: {}, overflow: [] };
  const counts = {};
  for (const node of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) counts[node.tagName] = (counts[node.tagName] ?? 0) + 1;
  out.headings = counts;
  out.h1Ids = [...document.querySelectorAll('h1')].map(h => h.id || h.textContent.trim().slice(0, 40));
  let previous = 0;
  out.levelSkips = [];
  for (const node of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const level = Number(node.tagName[1]);
    if (previous && level > previous + 1) out.levelSkips.push(`${node.tagName} after H${previous}: ${node.textContent.trim().slice(0, 40)}`);
    previous = level;
  }
  out.dtOutsideDl = [...document.querySelectorAll('dt,dd')].filter(n => n.parentElement?.tagName !== 'DL').map(n => n.parentElement.className || n.parentElement.tagName);
  out.dlWithoutDt = [...document.querySelectorAll('dl')].filter(dl => ![...dl.children].some(c => c.tagName === 'DT')).length;
  out.tables = [...document.querySelectorAll('table')].map(t => ({ caption: !!t.querySelector('caption'), th: t.querySelectorAll('th').length, unscoped: [...t.querySelectorAll('th')].filter(th => !['col', 'row', 'rowgroup', 'colgroup'].includes(th.getAttribute('scope'))).length }));
  out.footerInsideMain = !!document.querySelector('main footer');
  for (const node of document.querySelectorAll('body *')) {
    if (node.closest('[hidden],noscript,script,style')) continue;
    const text = [...node.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent).join(' ').trim();
    const style = getComputedStyle(node);
    if (text) {
      const size = parseFloat(style.fontSize);
      if (size < out.minFont) out.minFont = size;
      if (node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0 && !style.color.includes('rgba(0, 0, 0, 0)')) {
        const fg = parse(style.color);
        if (fg && fg.a > 0.9) {
          const bg = bgOf(node.parentElement ?? node);
          const value = ratio(fg, bg);
          const key = `${style.fontSize}|${style.color}|rgb(${bg.r}, ${bg.g}, ${bg.b})|${(node.className || node.tagName).toString().slice(0, 40)}`;
          const entry = { size: parseFloat(style.fontSize), ratio: Number(value.toFixed(2)) };
          if (!out.pairs[key] || out.pairs[key].ratio > entry.ratio) out.pairs[key] = entry;
          if (value < out.worst.ratio) out.worst = { ratio: Number(value.toFixed(2)), key, text: text.slice(0, 40) };
        }
      }
      if (/[\u3400-\u9fff]/.test(text) && parseFloat(style.letterSpacing) > 0) out.cjkTracked += 1;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.right > document.documentElement.clientWidth + 1) {
      out.overflow.push({ selector: `${node.tagName}.${(node.className || '').toString().split(' ')[0]}`, right: Math.round(rect.right) });
    }
  }
  out.pairs = Object.fromEntries(Object.entries(out.pairs).sort((a, b) => a[1].ratio - b[1].ratio).slice(0, 40));
  return out;
}

/* ---------- critical path bytes ---------- */
async function bytesFor(path) {
  const response = await fetch(base + path);
  const buffer = Buffer.from(await response.arrayBuffer());
  const zlib = await import('node:zlib');
  return { raw: buffer.length, gzip: zlib.gzipSync(buffer, { level: 9 }).length, status: response.status };
}

const contexts = [];
try {
  /* pass 1: viewports */
  for (const [name, path] of pages) {
    const entry = { path, scrollWidth: {}, overflow: {}, contrast: null, minFont: null, structure: null, screenshots: [], requested: [] };
    for (const width of viewports) {
      const context = await newContext({ viewport: { width, height: 900 } });
      contexts.push(context);
      const page = await context.newPage();
      const errors = [];
      const requested = new Set();
      page.on('pageerror', error => errors.push(String(error.message)));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.hostname === '127.0.0.1') requested.add(url.pathname + url.search);
      });
      await page.goto(base + path, { waitUntil: 'load' });
      if (path.includes('lang=zh')) await page.waitForFunction(() => document.documentElement.lang === 'zh-CN', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(250);
      entry.scrollWidth[width] = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      if (width === 390) {
        const audit = await page.evaluate(contrastFn);
        entry.contrast = { worst: audit.worst, pairs: audit.pairs, cjkTracked: audit.cjkTracked };
        entry.minFont = audit.minFont;
        entry.structure = {
          headings: audit.headings, h1Ids: audit.h1Ids, levelSkips: audit.levelSkips,
          dtOutsideDl: audit.dtOutsideDl, dlWithoutDt: audit.dlWithoutDt, tables: audit.tables, footerInsideMain: audit.footerInsideMain,
        };
        entry.overflow390 = audit.overflow.slice(0, 8);
        const shot = `${name}-390.png`;
        await page.screenshot({ path: join(OUT, shot), fullPage: true });
        entry.screenshots.push(shot);
      }
      entry.errors = errors;
      if (width === 1440) entry.requested = [...requested].map(value => value.split('?')[0]).sort();
      await context.close();
    }
    report.pages[name] = entry;
  }

  /* pass 2: reduced motion + JS off + motion toggle */
  const reduced = await newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await reduced.newPage();
  await page.goto(base + '/project.html?id=signal&lang=en', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  report.reducedMotion = {
    dataMotion: await page.evaluate(() => document.documentElement.dataset.motion),
    toggleDisabled: await page.evaluate(() => { const t = document.querySelector('.motion-toggle'); return t ? { hidden: t.hidden, disabled: t.disabled } : null; }),
    scrubWrapHeight: await page.evaluate(() => { const el = document.querySelector('.scrub-wrap'); return el ? Math.round(el.getBoundingClientRect().height) : null; }),
    stagePosition: await page.evaluate(() => { const el = document.querySelector('.scrub-stage'); return el ? getComputedStyle(el).position : null; }),
    trackAnimation: await page.evaluate(() => { const el = document.querySelector('.scrub-track'); return el ? getComputedStyle(el).animationName + '/' + getComputedStyle(el).display + '/' + getComputedStyle(el).width : null; }),
    stickyContext: await page.evaluate(() => { const el = document.querySelector('.narrative-context'); return el ? getComputedStyle(el).position : null; }),
    toggleClick: await (async () => {
      await page.evaluate(() => document.querySelector('.motion-toggle')?.click());
      return page.evaluate(() => ({ motion: document.documentElement.dataset.motion, scrubHeight: Math.round(document.querySelector('.scrub-wrap')?.getBoundingClientRect().height ?? 0), stage: getComputedStyle(document.querySelector('.scrub-stage')).position }));
    })(),
  };
  await page.screenshot({ path: join(OUT, 'case-signal-reduced-1440.png'), fullPage: true });
  await reduced.close();

  /* motion allowed: the same page with the enhancement active */
  const active = await newContext({ viewport: { width: 1440, height: 900 } });
  const ap = await active.newPage();
  await ap.goto(base + '/project.html?id=signal&lang=en', { waitUntil: 'load' });
  await ap.waitForTimeout(400);
  report.motionOn = {
    dataMotion: await ap.evaluate(() => document.documentElement.dataset.motion),
    toggle: await ap.evaluate(() => { const t = document.querySelector('.motion-toggle'); return t ? { hidden: t.hidden, disabled: t.disabled, pressed: t.getAttribute('aria-pressed') } : null; }),
    scrub: await ap.evaluate(() => {
      const wrap = document.querySelector('.scrub-wrap');
      const stage = document.querySelector('.scrub-stage');
      const track = document.querySelector('.scrub-track');
      const cs = getComputedStyle(track);
      return {
        wrapHeight: Math.round(wrap.getBoundingClientRect().height),
        stagePosition: getComputedStyle(stage).position,
        timeline: cs.animationTimeline, name: cs.animationName, timing: cs.animationTimingFunction,
        translateAtStart: cs.transform,
      };
    }),
    translateAtEnd: await ap.evaluate(async () => {
      const wrap = document.querySelector('.scrub-wrap');
      scrollTo({ top: wrap.getBoundingClientRect().top + scrollY + wrap.offsetHeight - innerHeight + 5, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 120));
      return getComputedStyle(document.querySelector('.scrub-track')).transform;
    }),
    pausedOffscreen: await ap.evaluate(async () => {
      scrollTo({ top: 0, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 300));
      const wrap = document.querySelector('.scrub-wrap');
      return { idleAttribute: wrap.getAttribute('data-depth-idle'), playState: getComputedStyle(document.querySelector('.scrub-track')).animationPlayState };
    }),
    viewTransitionRules: await ap.evaluate(() => {
      const found = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.constructor.name === 'CSSMediaRule') {
              for (const inner of rule.cssRules) if (inner.cssText && inner.cssText.startsWith('@view-transition')) found.push('nested:' + sheet.href.split('/').pop());
            } else if (rule.cssText && rule.cssText.startsWith('@view-transition')) found.push('top:' + sheet.href.split('/').pop());
          }
        } catch { /* cross-origin, none here */ }
      }
      return found;
    }),
    stickyContext: await ap.evaluate(() => {
      const el = document.querySelector('.narrative-context');
      return { position: getComputedStyle(el).position, top: getComputedStyle(el).top };
    }),
  };
  await ap.evaluate(() => document.querySelector('.motion-toggle').click());
  report.motionOn.afterPause = await ap.evaluate(() => ({
    motion: document.documentElement.dataset.motion,
    scrubHeight: Math.round(document.querySelector('.scrub-wrap').getBoundingClientRect().height),
    stage: getComputedStyle(document.querySelector('.scrub-stage')).position,
    trackWidth: getComputedStyle(document.querySelector('.scrub-track')).width,
    animation: getComputedStyle(document.querySelector('.scrub-track')).animationName,
  }));
  await ap.screenshot({ path: join(OUT, 'case-signal-motion-off-1440.png'), fullPage: true });
  await active.close();

  const noJs = await newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const np = await noJs.newPage();
  await np.goto(base + '/project.html?lang=en', { waitUntil: 'load' });
  report.noJs = {
    casesVisible: await np.evaluate(() => [...document.querySelectorAll('.case')].filter(c => c.getBoundingClientRect().height > 0).length),
    h1: await np.evaluate(() => [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 40))),
    archiveNote: await np.evaluate(() => !!document.querySelector('.archive-note')?.getBoundingClientRect().height),
    mobileNavLinks: await np.evaluate(() => { const n = document.querySelector('#mobile-nav'); return n ? getComputedStyle(n).display : null; }),
    tables: await np.evaluate(() => document.querySelectorAll('table').length),
  };
  await np.screenshot({ path: join(OUT, 'project-nojs-1440.png'), fullPage: true });
  await noJs.close();

  /* pass 3: performance + frame cost on the showpiece */
  const perfContext = await newContext({ viewport: { width: 1440, height: 900 } });
  const pp = await perfContext.newPage();
  for (const [name, path] of [['case-signal-en', '/project.html?id=signal&lang=en'], ['home-en', '/index.html?lang=en'], ['about-en', '/about.html?lang=en']]) {
    await pp.goto(base + path, { waitUntil: 'load' });
    const metrics = await pp.evaluate(async () => {
      const lcp = await new Promise(resolve => {
        let value = 0;
        new PerformanceObserver(list => { for (const entry of list.getEntries()) value = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(Math.round(value)), 1200);
      });
      const cls = await new Promise(resolve => {
        let total = 0;
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value; }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(Number(total.toFixed(4))), 800);
      });
      return { lcp, cls };
    });
    report.pages[name].performance = metrics;
  }
  /* frame timing through the scrub section */
  await pp.goto(base + '/project.html?id=signal&lang=en', { waitUntil: 'load' });
  await pp.waitForTimeout(400);
  report.scrubFrames = await pp.evaluate(async () => {
    const wrap = document.querySelector('.scrub-wrap');
    const track = document.querySelector('.scrub-track');
    if (!wrap || !track) return null;
    const top = wrap.getBoundingClientRect().top + scrollY;
    const frames = [];
    let last = performance.now();
    let stop = false;
    const tick = () => { frames.push(performance.now() - last); last = performance.now(); if (!stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const height = wrap.offsetHeight - innerHeight;
    for (let i = 0; i <= 60; i += 1) {
      scrollTo({ top: top + (height * i) / 60, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 16));
    }
    stop = true;
    const values = frames.slice(2);
    const sorted = [...values].sort((a, b) => a - b);
    return {
      mode: getComputedStyle(track).animationName,
      positions: [...new Set(values.map(v => Math.round(v)))].length,
      medianMs: sorted[Math.floor(sorted.length / 2)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      worstMs: Math.round(sorted.at(-1)),
      finalTranslate: getComputedStyle(track).transform,
    };
  });
  await perfContext.close();

  /* pass 4: transferred bytes of the real request graph. The repo server sends identity
     encoding, so gzip is computed from exactly the same bytes a compressed host would send. */
  for (const [name] of pages) {
    const entry = report.pages[name];
    const files = [...new Set((entry.requested ?? []).filter(file => !/\.(svg|png|jpg|jpeg|webp)$/.test(file)))];
    const detail = {};
    let raw = 0, gzip = 0, jsRaw = 0, jsGzip = 0;
    for (const file of files) {
      const value = await bytesFor(file);
      detail[file] = value;
      raw += value.raw; gzip += value.gzip;
      if (file.endsWith('.js')) { jsRaw += value.raw; jsGzip += value.gzip; }
    }
    entry.bytes = { files, criticalRaw: raw, criticalGzip: gzip, jsRaw, jsGzip, detail };
  }
  const perPage = Object.entries(report.pages).map(([name, entry]) => ({
    name,
    criticalRaw: entry.bytes?.criticalRaw ?? 0,
    criticalGzip: entry.bytes?.criticalGzip ?? 0,
    jsRaw: entry.bytes?.jsRaw ?? 0,
    jsGzip: entry.bytes?.jsGzip ?? 0,
  }));
  report.budgets = {
    note: 'identity encoding on the local server; gzip column is the compressed size of the same bytes',
    perPage,
    worstCriticalGzip: Math.max(...perPage.map(item => item.criticalGzip)),
    worstJsRaw: Math.max(...perPage.map(item => item.jsRaw)),
    worstJsGzip: Math.max(...perPage.map(item => item.jsGzip)),
    /* The build-time template module lives in tools/. If this ever answers 200 again, a module the
       browser never imports is back in the shipped tree — which is how /views.js came to serve
       43 KB while DESIGN.md said it did not ship. */
    buildModule: { '/views.js': (await bytesFor('/views.js')).status },
  };
} finally {
  await browser.close();
  server.close();
}

console.log(JSON.stringify(report, null, 1));
console.log('screenshots -> ' + OUT);
