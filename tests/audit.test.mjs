import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { auditSite, parseHtml, parseCss, walkElements } from '../scripts/audit-site.mjs';

const siteRoot = fileURLToPath(new URL('../examples/alex-lin/dist/', import.meta.url));
let fixtures;

before(async () => { fixtures = await mkdtemp(join(tmpdir(), 'portfolio-ui-design-audit-')); });
after(async () => {
  assert.equal(dirname(resolve(fixtures)), resolve(tmpdir()));
  assert.match(basename(fixtures), /^portfolio-ui-design-audit-/);
  await rm(fixtures, { recursive: true, force: true });
});

/** Write a directory of files and audit it without a browser, so Layer 1 alone is under test. */
async function run(name, sources, options = {}) {
  const root = join(fixtures, name);
  await mkdir(root, { recursive: true });
  for (const [file, text] of Object.entries(sources)) {
    await mkdir(join(root, dirname(file)), { recursive: true });
    await writeFile(join(root, file), text);
  }
  return auditSite({ root, ...options });
}

const codes = report => report.violations.map(item => item.code);

/* A page that satisfies every Layer 1 rule. Each test below starts from this and breaks one
   thing, so a finding can only ever be the one the test names. */
const compliant = {
  'index.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Fixture</title>
<link rel="stylesheet" href="./styles.css"></head>
<body><a class="skip-link" href="#main">Skip to content</a>
<main id="main" tabindex="-1"><h1>Fixture</h1><p>Body copy.</p>
<p><a href="https://example.invalid">a link out, not a runtime dependency</a></p></main>
</body></html>`,
  'styles.css': `:root { --fs-body: 17px; --fs-small: 13px; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
a:focus-visible, [tabindex]:focus-visible { outline: 3px solid black; }
body { font-size: var(--fs-body); }
p { font-size: var(--fs-body); }
`
};

test('a page that satisfies every Layer 1 rule reports nothing', async () => {
  const report = await run('clean', compliant);
  assert.deepEqual(report.violations.map(item => item.code + ' @' + item.file + ':' + item.line), []);
  assert.equal(report.summary.pages, 1);
  assert.equal(report.browser, 'not requested');
});

test('the browser layer is reported as unverified rather than failing when it was not asked for', async () => {
  const report = await run('no-browser', compliant);
  assert.equal(report.browserLayer.browser, 'not requested');
  assert.equal(report.summary.browserViolations, 0);
  assert.ok(report.browserLayer.unverifiedWhenUnavailable.length, 'the report must name what went unmeasured');
});

test('a defect in a stylesheet linked by several pages is reported once', async () => {
  const sources = {
    ...compliant,
    'a.html': compliant['index.html'],
    'b.html': compliant['index.html'],
    'c.html': compliant['index.html'],
    'styles.css': compliant['styles.css'] + '.offscreen { left: -9999px; }\n'
  };
  const report = await run('shared-css', sources);
  const findings = report.violations.filter(item => item.code === 'OFFSCREEN_HIDE');
  assert.equal(findings.length, 1, 'three pages link the sheet, so three findings would read as three defects');
  assert.equal(findings[0].file, 'styles.css');
});

test('a px font-size that only ever styles SVG text is not a break in the type scale', async () => {
  const sources = {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', `
<svg viewBox="0 0 640 232"><text x="42" y="194" class="axis">0</text></svg></main>`),
    'styles.css': compliant['styles.css'] + `
@media (max-width: 430px) { .axis { font-size: 28px; } }
`
  };
  const report = await run('svg-scope', sources);
  assert.deepEqual(codes(report), [], 'an SVG axis label is sized in user units to undo the canvas scale, not to bypass the tokens');
});

test('a px font-size on an HTML element is still flagged while the SVG one is exempt', async () => {
  const sources = {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', `
<svg viewBox="0 0 640 232"><text x="42" y="194" class="axis">0</text></svg>
<p class="axis">shares the class name but is HTML</p></main>`),
    'styles.css': compliant['styles.css'] + '@media (max-width: 430px) { .axis { font-size: 28px; } }\n'
  };
  const report = await run('svg-ambiguous', sources);
  assert.deepEqual(codes(report), ['FONT_SCALE_HARDCODED']);
});

test('a missing linked stylesheet is named, not silently ignored', async () => {
  const sources = { ...compliant };
  delete sources['styles.css'];
  const report = await run('missing-css', sources);
  assert.ok(codes(report).includes('MISSING_RESOURCE'));
});

/* ------------------------------------------------- the four silent defects -- */

test('a var() reading a property no loaded stylesheet declares is reported against that stylesheet', async () => {
  const report = await run('undefined-var', {
    ...compliant,
    'index.html': compliant['index.html']
      .replace('<h1>Fixture</h1>', '<h1 style="--local-gap: 4px">Fixture</h1>')
      .replace('</main>', '<div class="sheet band uses-inline">x</div></main>'),
    'styles.css': compliant['styles.css'] + `
.sheet { padding: var(--r-sheet); }
.band { color: var(--band-body); }
.uses-inline { gap: var(--local-gap); }
`
  });
  assert.deepEqual(codes(report), ['CSS_UNDEFINED_VAR', 'CSS_UNDEFINED_VAR']);
  const [first, second] = report.violations;
  assert.match(first.message, /--r-sheet is read by var\(\) but declared in no stylesheet this page loads/);
  assert.match(first.evidence, /\.sheet \{ padding: var\(--r-sheet\) \} @styles\.css/);  assert.equal(second.message.includes('fallback'), false, 'no fallback was written, so the report must not claim one');
  assert.ok(!report.violations.some(item => item.message.includes('--local-gap')),
    'a custom property declared in a style attribute on the page is declared');
  assert.equal(report.static.pages[0].checks.everyCustomPropertyDeclared, false);
});

test('a var() with a fallback still counts as a reference, and says what actually renders', async () => {
  const report = await run('undefined-var-fallback', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', '<div class="edge">x</div></main>'),
    'styles.css': compliant['styles.css'] + '.edge { left: calc(100% - var(----edge, 8px)); }\n'
  });
  assert.deepEqual(codes(report), ['CSS_UNDEFINED_VAR']);
  // The quadruple dash is the defect: normalising the leading dashes away is how it survives.
  assert.match(report.violations[0].message, /----edge is read by var\(\).* — the fallback is what renders here\./);
});

test('a download link with an empty href is a planned slot, not a control', async () => {
  const html = compliant['index.html'].replace('</main>',
    '<p><a class="button" href="" download>Download sample résumé</a></p></main>');
  const report = await run('empty-link', { ...compliant, 'index.html': html });
  assert.deepEqual(codes(report), ['EMPTY_LINK']);
  assert.equal(report.violations[0].line, html.split('\n').findIndex(line => line.includes('Download sample')) + 1,
    'the finding points at the control, not the page');
  assert.match(report.violations[0].message, /resolves to the page it sits on/);
  assert.equal(report.static.pages[0].checks.anchorsHaveDestinations, false);
});

test('an anchor with no href at all is a placeholder, not a dead link', async () => {
  const report = await run('anchor-no-href', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', '<p><a>Placeholder</a></p></main>')
  });
  assert.deepEqual(codes(report), [], 'an <a> without href is not focusable and claims no destination');
});

test('a duplicated id names the id, the count and the copies that carry it', async () => {
  const html = compliant['index.html'].replace('</main>', `
<section id="snapshot-h"><h2>One</h2></section>
<section id="snapshot-h"><h2>Two</h2></section></main>`);
  const report = await run('duplicate-id', { ...compliant, 'index.html': html });
  assert.deepEqual(codes(report), ['DUPLICATE_ID']);
  assert.match(report.violations[0].message, /id="snapshot-h" appears 2 times on this page.*resolves to the first only/);
  assert.equal(report.violations[0].line, html.split('\n').findIndex(line => line.includes('<h2>Two')) + 1,
    'the finding points at the copy that broke it, not the first');
  assert.match(report.violations[0].evidence, /<section>#snapshot-h:\d+ \| <section>#snapshot-h:\d+/);
  assert.equal(report.static.pages[0].metrics.duplicateIds, 1);
  assert.equal(report.static.pages[0].checks.uniqueElementIds, false);
});

test('a phrase role ending in a sentence mark is a finding while prose keeps its punctuation', async () => {
  const report = await run('label-punctuation', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', `
<h2>A blank page, with a head start.</h2>
<p class="kicker">Change the budget. Explore the assumption.</p>
<div class="stat"><span class="stat-value">3.4x.</span></div>
<nav aria-label="More"><a href="#note">Read the note.</a></nav></main>`)
  });
  assert.deepEqual(codes(report), ['LABEL_PUNCTUATION', 'LABEL_PUNCTUATION', 'LABEL_PUNCTUATION', 'LABEL_PUNCTUATION']);
  assert.deepEqual(report.violations.map(item => item.message.match(/^A phrase role \((<[^>]+>)\)/)[1]),
    ['<h2>', '<p>', '<div>', '<a>'], 'a p used as a kicker is a label and a span inside a stat box is one line of it');
  assert.ok(report.violations.every(item => item.message.includes('sentence mark')));
  assert.equal(report.static.pages[0].checks.phraseRolesUnpunctuated, false);
});

test('a period hidden by a line break is caught, and a comma doing syntactic work is not', async () => {
  const broken = await run('label-punctuation-fragment', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', '<h2 id="frag">Set the price.<br>then watch the assumption</h2></main>')
  });
  assert.deepEqual(codes(broken), ['LABEL_PUNCTUATION']);
  assert.match(broken.violations[0].message, /on "Set the price\."/, 'the first fragment is the one carrying the period');

  // The two clauses of one heading, joined by a comma the reader needs, broken over two designed lines.
  const balanced = await run('label-punctuation-structural', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', '<h2>保留方法，<br>写出你的版本</h2></main>')
  });
  assert.deepEqual(codes(balanced), [], 'a comma that connects two clauses is structure, not a terminal mark');

  const dangling = await run('label-punctuation-dangling', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', '<h2>保留方法，</h2></main>')
  });
  assert.deepEqual(codes(dangling), ['LABEL_PUNCTUATION']);
  assert.match(dangling.violations[0].message, /stops on a connective mark/);
});

test('the punctuation test is bounded by length and by role, not by tag', async () => {
  const long = 'The section that reads as a paragraph wearing a heading tag because it runs past two lines of display text and is already covered by the prose rules of the Skill';
  const bound = await run('label-punctuation-bound', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', `<h2>${long}.</h2>
<p>Copy with a <span class="label">mailbox label：</span> inside it, ending in prose.</p></main>`)
  });
  assert.deepEqual(codes(bound), [], 'a label over the display-unit bound, and a span inside a paragraph, are prose');

  const chineseLong = await run('label-punctuation-cjk-bound', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', `<h2>${'字'.repeat(40)}.</h2></main>`)
  });
  assert.deepEqual(codes(chineseLong), [], 'one CJK glyph costs two Latin characters of the line, so forty of them are past the bound');

  const chineseShort = await run('label-punctuation-cjk-phrase', {
    ...compliant,
    'index.html': compliant['index.html'].replace('</main>', '<h2>这是一个完整的标题句子。</h2></main>')
  });
  assert.deepEqual(codes(chineseShort), ['LABEL_PUNCTUATION'], 'eleven glyphs are a phrase, and a heading has no business ending in 。');
});

test('a runtime reference to a third-party host is a finding, but an ordinary link out is not', async () => {
  const linked = await run('third-party', {
    ...compliant,
    'index.html': compliant['index.html'].replace(
      '<link rel="stylesheet" href="./styles.css">',
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">')
  });
  assert.ok(codes(linked).includes('THIRD_PARTY_RUNTIME'));
  const plain = await run('link-out', compliant);
  assert.ok(!codes(plain).includes('THIRD_PARTY_RUNTIME'), '<a href> to another site is content, not a dependency');
});

test('a page that loses its h1 reports the count, not a generic structure failure', async () => {
  const sources = { ...compliant, 'index.html': compliant['index.html'].replace('<h1>Fixture</h1>', '<h3>Fixture</h3>') };
  const report = await run('no-h1', sources);
  assert.ok(codes(report).includes('H1_COUNT'));
});

test('a directory with no HTML in it is reported as unusable instead of clean', async () => {
  const missing = await auditSite({ root: join(fixtures, 'never-created') });
  assert.equal(missing.violations[0].code, 'MISSING_ROOT');
  assert.equal(missing.root, null);
  const noPages = await run('empty-html', { 'placeholder.txt': 'x' });
  assert.equal(noPages.summary.pages, 0, 'a directory of non-HTML files audits zero pages, which is not the same as passing');
});

/* ------------------------------------------------------------- html parser -- */

const tags = document => Array.from(walkElements(document)).map(node => node.tag);
const findByTag = (document, tag) => Array.from(walkElements(document)).filter(node => node.tag === tag);

test('an open paragraph is closed by a block start tag, not swallowed by it', () => {
  const { document, unmatched, openAtEnd } = parseHtml('<p>text<div>inside</div>');
  assert.equal(openAtEnd, 0, 'every element has to be released by the time the source ends');
  assert.deepEqual(unmatched, []);
  const [paragraph, division] = [findByTag(document, 'p')[0], findByTag(document, 'div')[0]];
  assert.equal(division.parent, paragraph.parent, '<div> closes <p>, so it must be a sibling');
  assert.equal(paragraph.children.length, 1, 'the paragraph holds only its text');
});

test('a repeated list item closes the previous one instead of nesting', () => {
  const { document } = parseHtml('<ul><li>one<li>two<li>three</ul>');
  const items = findByTag(document, 'li');
  assert.equal(items.length, 3);
  assert.equal(items[1].parent, items[0].parent);
  assert.equal(items[2].parent, items[0].parent);
});

test('definition terms and descriptions alternate as siblings', () => {
  const { document } = parseHtml('<dl><dt>a<dd>b<dt>c<dd>d</dl>');
  assert.deepEqual(tags(document).filter(tag => ['dt', 'dd'].includes(tag)), ['dt', 'dd', 'dt', 'dd']);
  const pairs = findByTag(document, 'dt').map(node => node.parent);
  assert.equal(new Set(pairs).size, 1, 'all four belong to the same <dl>');
});

test('an element closed twice reports the stray end tag instead of corrupting the tree', () => {
  const { unmatched, openAtEnd } = parseHtml('<main><p>ok</p></main></main>');
  assert.equal(openAtEnd, 0);
  assert.deepEqual(unmatched.map(item => item.tag), ['main']);
});

test('raw text elements keep their source out of the tree', () => {
  const { document } = parseHtml('<script>const a = "<p>not markup</p>";</script><style>.x::before { content: "<div>" }</style>');
  assert.equal(findByTag(document, 'p').length, 0);
  assert.equal(findByTag(document, 'div').length, 0);
  assert.deepEqual(tags(document), ['script', 'style']);
});

test('attribute values survive entities, quotes and unquoted forms', () => {
  const { document } = parseHtml('<a href=./x.html title="say &amp; go" data-count=3 hidden>x</a>');
  const link = findByTag(document, 'a')[0];
  assert.equal(link.attrs.href, './x.html');
  assert.equal(link.attrs.title, 'say & go');
  assert.equal(link.attrs['data-count'], '3');
  assert.equal(link.attrs.hidden, 'hidden');
});

/* ------------------------------------------------------------- css parser -- */

test('declarations keep the offset they were written at so a finding is actionable', () => {
  const parsed = parseCss('a { color: red; }\n\n\nb { font-size: 20px; }\n');
  const rule = parsed.rules[1];
  assert.equal(rule.selector, 'b');
  assert.equal(parsed.lineAt(rule.declarations[0].offset), 4);
});

test('a rule inside a media query carries the condition', () => {
  const parsed = parseCss('@media (max-width: 660px) { .axis { font-size: 20px } }');
  assert.equal(parsed.rules[0].media, '@media (max-width: 660px)');
});

test('a nested brace inside a value does not end the rule', () => {
  const parsed = parseCss('.x { grid-template-areas: "a { b" "c d"; color: red; }');
  assert.equal(parsed.rules.length, 1);
  assert.equal(parsed.rules[0].declarations.length, 2);
});

/* ------------------------------------------------------------- the render layer -- */

/**
 * A fixture whose second locale exists only after the scripts have run. The markup Layer 1 reads is
 * clean, and every defect below is created by the route the `?lang=zh` link asks for — which is
 * precisely why a static pass cannot be the gate.
 */
const rendered = {
  'index.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Rendered fixture</title>
<link rel="stylesheet" href="./styles.css"></head>
<body><a class="skip-link" href="#main">Skip to content</a>
<main id="main" tabindex="-1"><h1>Rendered</h1><p>Body copy.</p></main>
<a class="locale-switch" href="./index.html?lang=zh" lang="zh-CN">中文</a>
<script>
if (new URLSearchParams(location.search).get('lang') === 'zh') {
  document.documentElement.lang = 'zh-CN';
  document.getElementById('main').insertAdjacentHTML('beforeend',
    '<h2 class="section-title">总览。</h2>' + [0, 1, 2].map(function () {
      return '<section class="snapshot"><h3 id="snapshot-h">片段</h3></section>';
    }).join('') +
    '<div class="table-scroll"><table><caption>每周</caption><thead><tr><th scope="col">日</th><th scope="col">值</th></tr></thead>' +
    '<tbody><tr><td>周一</td><td>12</td></tr></tbody></table></div>');
}
</script></body></html>`,
  'styles.css': `:root { --fs-body: 17px; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
a:focus-visible, [tabindex]:focus-visible { outline: 3px solid black; }
body { font-size: var(--fs-body); }
/* The locale switch lands: a Chinese root does carry --track-scale: 0. */
:root { --track-scale: 1; }
:root[lang^="zh"] { --track-scale: 0; }
/* ...and this rule bypasses the token. Only measuring the rendered page can see that. */
.section-title { letter-spacing: -0.02em; }
.table-scroll { overflow-x: auto; }
.table-scroll table { min-width: 560px; }
`
};

test('the render layer reports the defects only a running script and a second locale produce', async t => {
  const report = await run('rendered-defects', rendered, { browser: true });
  if (report.browserLayer.browser === 'unavailable') { t.skip(report.browserLayer.reason); return; }
  assert.equal(report.summary.staticViolations, 0, 'the markup is clean, so Layer 1 alone would have passed this site');
  const byRoute = {};
  for (const item of report.violations) (byRoute[item.file] ??= []).push(item.code);
  assert.deepEqual(Object.keys(byRoute), ['index.html?lang=zh'], 'the English route is clean; only the Chinese one has these defects');
  assert.deepEqual(byRoute['index.html?lang=zh'],
    ['BROWSER_CJK_TRACKING', 'BROWSER_DUPLICATE_ID', 'BROWSER_LABEL_PUNCTUATION']);

  const route = report.browserLayer.pages.find(page => page.file === 'index.html?lang=zh');
  assert.equal(route.locale, 'zh-CN');
  assert.ok(route.renderedCjkRuns >= 5, 'the Chinese document was really rendered, runs: ' + route.renderedCjkRuns);
  assert.equal(route.trackScaleOnRoot, '0',
    'the token switch itself is correct, so the tracking finding is a rule that bypasses it, not a missing switch');
  assert.deepEqual(route.renderedDuplicateIdGroups, ['snapshot-h x3']);
  assert.match(report.violations.find(item => item.code === 'BROWSER_DUPLICATE_ID').message,
    /appears 3 times in the rendered document.*resolves to the first only/);
  assert.match(route.renderedLabelSamples.join(' '), /<h2> "总览。"/);
  // The 560px table inside a scrollable box is a reachable table, not a layout failure.
  assert.equal(route.overflowingElements, 0);
  assert.ok(route.wideInsideScrollers >= 1, 'the wide table has to have been measured and then excluded');
});

/** The same switch, and a render that swaps the words but forgets to declare the language. */
const stalled = {
  'index.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Stalled fixture</title>
<link rel="stylesheet" href="./styles.css"></head>
<body><a class="skip-link" href="#main">Skip to content</a>
<main id="main" tabindex="-1"><h1>Rendered</h1><p>Body copy.</p></main>
<a class="locale-switch" href="./index.html?lang=zh" lang="zh-CN">中文</a>
<script>
if (new URLSearchParams(location.search).get('lang') === 'zh') {
  document.querySelector('h1').textContent = '已渲染';
}
</script></body></html>`,
  'styles.css': compliant['styles.css']
};

test('a locale the page offers but never renders is a finding instead of a clean pass', async t => {
  const report = await run('rendered-stalled', stalled, { browser: true, localeWaitMs: 600 });
  if (report.browserLayer.browser === 'unavailable') { t.skip(report.browserLayer.reason); return; }
  assert.deepEqual(codes(report), ['BROWSER_LOCALE_RENDERED']);
  const finding = report.violations[0];
  assert.equal(finding.file, 'index.html?lang=zh');
  assert.match(finding.message, /lang=zh served a document whose lang is "en"[\s\S]*had still not flipped after \d+ms of waiting/);
  assert.match(finding.evidence, /lang=en cjk runs=\d+/);
});

/* ---------------------------------------------------------- the shipped site -- */

test('the example site passes Layer 1 with no findings', async () => {
  const report = await auditSite({ root: siteRoot });
  assert.deepEqual(
    report.violations.map(item => item.code + ' @' + item.file + ':' + item.line),
    [],
    'the demo is what the skill promises, so it has to be the cleanest thing in the repo');
  /* Six, not three: each page exists twice, once per locale tree, because Chinese is pre-rendered
     rather than rebuilt in the tab. A reader who turns JavaScript off still gets both languages. */
  assert.equal(report.summary.pages, 6);
});

test('the example site passes the render layer in both locales it offers', async t => {
  const report = await auditSite({ root: siteRoot, browser: true });
  if (report.browserLayer.browser === 'unavailable') { t.skip(report.browserLayer.reason); return; }
  assert.deepEqual(report.violations, [], 'the Chinese route is the one that used to hide defects');
  assert.deepEqual(report.browserLayer.locales, ['en', 'zh-CN'], 'the browser has to have seen both documents');
  assert.equal(report.browserLayer.routes.length, 6, 'three pages, each measured as English and as Chinese');
  for (const page of report.browserLayer.pages.filter(item => item.locale === 'zh-CN')) {
    assert.equal(page.locale, 'zh-CN');
    assert.ok(page.renderedCjkRuns > 20, page.file + ' rendered only ' + page.renderedCjkRuns + ' CJK text run(s)');
    assert.equal(page.trackScaleOnRoot, '0', 'the Chinese switch has to be proven by the computed value, not by the sheet');
    assert.equal(page.cjkTrackedRuns, 0);
    assert.equal(page.overflowingElements, 0);
  }
  const tables = report.browserLayer.pages.find(page => page.file === 'zh/project.html');
  assert.ok(tables.wideInsideScrollers > 0, 'the 560px data tables were measured, then excluded as reachable');
});
