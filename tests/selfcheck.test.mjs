import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { RULES, auditSite, columnCollapse, verifyRuleRefs } from '../skills/portfolio-website/scripts/audit-site.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const skill = join(root, 'skills', 'portfolio-website');
const shared = ['audit-site.mjs', 'craft-probes.mjs', 'serve.mjs'];
const sha = async path => createHash('sha256').update(await readFile(path)).digest('hex');

test('the self-check the Skill ships is the same instrument the example site is built against', async () => {
  /* Two copies exist because the Skill has to be publishable on its own and the repo has to be able
     to run its own gate. A rule edited in one place and not the other is the failure this test
     exists for: the released Skill would then measure a page against a rule it no longer contains. */
  for (const name of shared) {
    assert.equal(await sha(join(root, 'scripts', name)), await sha(join(skill, 'scripts', name)),
      name + ' differs between scripts/ and the published Skill — copy the change, do not edit one copy');
  }
});

test('the shipped copy resolves the references it cites from inside the Skill directory', async () => {
  /* In the repo the references live under skills/portfolio-website/references; in the package this
     script sits inside that directory. `verifyRuleRefs` detects which layout it is in by reading the
     disk, so this call proves the published layout finds its own documentation rather than failing
     silently on a path that only exists in the repo. */
  const errors = await verifyRuleRefs();
  /* Every code, not only the craft ones: the legacy citations had drifted by one to thirteen lines
     when this test was written, which made the published map print a line that did not say what the
     check claimed. They are repaired now, and this assertion is what keeps them repaired. */
  assert.deepEqual(errors, [], 'every check must cite a line that still says what the check claims');
});

test('every check code is named in both language versions of the self-check reference', async () => {
  /* The table is prose and RULES is code, so this is the only thing stopping a new check from shipping
     undocumented — a builder reading the reference would never know the rule existed. */
  const codes = Object.keys(RULES);
  assert.equal(codes.length, 46, 'the code list changed; update the reference table in both languages');
  for (const path of ['references/self-check.md', 'references/zh-CN/self-check.md']) {
    const text = await readFile(join(skill, path), 'utf8');
    for (const code of codes) assert.ok(text.includes(code), path + ' does not mention ' + code);
  }
});

const auditHtml = async html => {
  const dir = await mkdtemp(join(tmpdir(), 'selfcheck-'));
  try {
    await writeFile(join(dir, 'index.html'), html);
    return await auditSite({ root: dir, browser: false });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};
const codesOf = report => report.violations.map(item => item.code);

test('a description list that groups each pair in a div is valid, and the checker knew it was not', async () => {
  /* The spec's `dl > div > (dt, dd)` form is what most styled pages use, and this check reported every
     group in it as an orphan — 33 findings on one persona site and 12 on another, all of them the
     checker's error dressed as a site defect. Both directions are asserted so the repair cannot have
     been a silencing: the grouped form passes, the genuinely stray term still fails. */
  const grouped = await auditHtml('<!doctype html><html lang="en"><body><h1>QC</h1>' +
    '<dl class="lever"><div><dt>Rule</dt><dd>Jump the queue.</dd></div>' +
    '<div><dt>Split</dt><dd>Pre-assign the bench.</dd></div></dl></body></html>');
  assert.deepEqual(codesOf(grouped).filter(code => code === 'DEFINITION_LIST'), [],
    'a div-wrapped term-and-definition pair is a complete group');

  const orphan = await auditHtml('<!doctype html><html lang="en"><body><h1>QC</h1>' +
    '<div><dt>Rule</dt><dd>Jump the queue.</dd></div></body></html>');
  assert.ok(codesOf(orphan).includes('DEFINITION_LIST'), 'a term with no dl above it is still a defect');
});

test('an undefined custom property is reported where the rule can paint, not on pages the rule cannot reach', async () => {
  /* A shared stylesheet names a property once; each page supplies it, or does not. Before this test the
     checker flagged `var(--w)` on eight pages that contain no `.ltrack` at all — rules that never match
     do not paint — and called a bar whose markup sets `--w:100%` a fallback. All three directions are
     asserted so the repair could not be a blanket silencing. */
  const page = body => '<!doctype html><html lang="en"><body><h1>QC</h1><style>' +
    '.bar { width: var(--w, 0%); } .absent { width: var(--nope); }</style>' + body + '</body></html>';
  const supplied = await auditHtml(page('<span class="bar" style="--w:100%"></span>'));
  assert.deepEqual(codesOf(supplied).filter(code => code === 'CSS_UNDEFINED_VAR'), [],
    'a rule whose property the markup supplies has a declaration on the element that paints');

  const missing = await auditHtml(page('<span class="bar"></span>'));
  assert.ok(codesOf(missing).includes('CSS_UNDEFINED_VAR'),
    'a rule that matches an element with no declaration anywhere still drops the declaration');

  const unreachable = await auditHtml(page('<span class="bar" style="--w:100%"></span>'));
  assert.deepEqual(codesOf(unreachable).filter(code => code === 'CSS_UNDEFINED_VAR'), [],
    'a rule that matches nothing on this page cannot render its fallback here');
});

test('a bare :focus-visible rule rings every focusable type, and a scoped one still does not', async () => {
  /* The unwritten universal selector is the most common focus rule there is, and the checker read it as
     "reaches no button" — the lab persona site carries exactly that rule at styles.css:123 and was
     reported as unringed on all nine pages. The scoped rule keeps failing so this cannot be a silencing. */
  const page = rule => '<!doctype html><html lang="en"><body><h1>QC</h1><style>' + rule +
    '</style><p><a href="#top">Back</a></p><button type="button">Filter</button></body></html>';
  const global = await auditHtml(page(':focus-visible { outline: 2px solid #14573f; }'));
  assert.deepEqual(codesOf(global).filter(code => code === 'FOCUS_VISIBLE_SCOPE'), [],
    'a rule with no element in its selector rings links and buttons alike');

  const scoped = await auditHtml(page('.on-dark :focus-visible { outline-color: #fff; }'));
  assert.ok(codesOf(scoped).includes('FOCUS_VISIBLE_SCOPE'),
    'a rule that only reaches one region does not cover a link outside it');
});

test('a column squeezed to a few characters is a collapse, and a normal column is not', () => {
  /* The ceramic persona shipped a page whose every section matched a chart-row grid: 8px text columns,
     40,479px tall, and the whole self-check passed it. The measurement lives in the page; the decision
     lives here so both directions can be asserted without a browser. */
  const normal = columnCollapse({
    samples: [{ widthEm: 34, selector: 'p' }, { widthEm: 20, selector: 'dd' }],
    screens: 9, docHeight: 7290, viewportHeight: 810
  });
  assert.equal(normal, null, 'a 34em measure on a nine-screen page is not a collapse');

  const critical = columnCollapse({
    samples: [{ widthEm: 0.3, selector: 'h1', text: '日用器' }],
    screens: 5, docHeight: 4000, viewportHeight: 800
  });
  assert.ok(critical && critical.critical === 1, 'one block under 2em is enough — 8px text is unreadable');

  const narrow = columnCollapse({
    samples: [{ widthEm: 3 }, { widthEm: 4 }, { widthEm: 5 }],
    screens: 6, docHeight: 4800, viewportHeight: 800
  });
  assert.ok(narrow && narrow.narrow === 3, 'three blocks under 6em describe a layout, not one stray label');

  const runaway = columnCollapse({ samples: [], screens: 50, docHeight: 40000, viewportHeight: 800 });
  assert.ok(runaway && runaway.screens === 50, 'a page forty screens tall is reported even if every box is wide');
});

