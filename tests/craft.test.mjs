import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { RULES, auditSite, verifyRuleRefs } from '../scripts/audit-site.mjs';
import {
  parseShadowLayers, shadowFindings, siblingFindings, headingFindings, tableFindings,
  stateMatrix, pressFindings, pressChannels, pressSettleDeadlineMs, nameStateFindings, buildCraftFindings, collapseByDedupe, CRAFT_RULES,
  CRAFT_STATE_OWNERSHIP, CRAFT_CLASSIFY_SOURCE
} from '../scripts/craft-probes.mjs';

/* The craft layer's verdicts are pure functions over browser measurements, so every one of them is
   testable with hand-made numbers. These fixtures are synthetic, never the example site: the site
   is the thing under measurement, and its real numbers are reported by the browser run. */

test('the craft rules each cite a line that states them (legacy citations drift on their own, reported separately)', async () => {
  const errors = await verifyRuleRefs();
  const craftCodes = Object.keys(CRAFT_RULES);
  const craftErrors = errors.filter(error => craftCodes.some(code => error.startsWith(code + ' ')));
  assert.deepEqual(craftErrors, [], 'a report that cites a wrong line is a false claim inside the instrument');
  for (const code of craftCodes) assert.equal(RULES[code], CRAFT_RULES[code], code + ' must be registered in the shared RULES table');
});

test('parseShadowLayers splits a computed shadow list into layers with structure, not strings', () => {
  const layers = parseShadowLayers('rgba(0, 0, 0, 0.1) 0px 1px 2px 0px inset, rgb(20, 30, 10, 0.4) 0px 2px 4px 0px, rgba(0, 0, 0, 0.05) 0px 8px 24px -4px');
  assert.equal(layers.length, 3);
  assert.equal(layers[0].inset, true);
  assert.equal(layers[0].y, 1);
  assert.equal(layers[1].inset, false);
  assert.equal(layers[2].spread, -4);
  assert.equal(layers[2].blur, 24);
  assert.equal(layers[2].ratio, 0.333, 'offset-to-blur ratio, rounded to the third decimal the report prints');
  assert.equal(layers[2].quadrant, '++');
});

test('a one-layer shadow on a route that stacks three surface pairs is a finding, and the parsed structure is reported either way', () => {
  const records = [
    { value: 'rgba(0,0,0,0.1) 0px 1px 3px 0px', backgroundColor: 'rgb(255, 255, 255)', classKey: 'div.card', selector: 'main > div.card', count: 4 },
    { value: 'rgba(0,0,0,0.2) 0px 2px 8px 0px', backgroundColor: 'rgb(250, 250, 250)', classKey: 'article.panel', selector: 'main > article.panel', count: 2 },
    { value: 'rgba(0,0,0,0.3) 0px 4px 16px 0px', backgroundColor: 'rgb(245, 245, 245)', classKey: 'aside.sheet', selector: 'main > aside.sheet', count: 1 }
  ];
  const result = shadowFindings(records);
  assert.equal(result.findings.filter(item => item.code === 'CRAFT_SHADOW_LAYERS').length, 3, 'every single-layer class in a three-plus system is a finding, not one summary line');
  assert.equal(result.inventory.distinctSurfacePairs, 3);
  assert.ok(result.inventory.layers[0].layers[0].includes('3px'), 'the raw layer text travels so a human can see what the verdict means');
});

test('an element with both a strong drop and a strong inset layer reads as a hole with a lid and is reported', () => {
  const result = shadowFindings([{
    value: 'rgba(0,0,0,0.4) 0px 12px 24px 0px, rgba(0,0,0,0.5) 0px 3px 12px 0px inset',
    backgroundColor: 'rgb(255,255,255)', classKey: 'div.sunken', selector: 'main > div.sunken', count: 1
  }]);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].code, 'CRAFT_SHADOW_INSET');
});

test('sibling baseline drift: zero delta passes, a row that ends 35px apart is reported with its numbers', () => {
  const clean = siblingFindings([{ container: 'ul.cards', memberCount: 3, rows: 1, parts: [{ part: 'action', deltaPx: 0, tops: [454, 454, 454], rowsCompared: 3, rowDeltas: [0] }] }], 1440);
  assert.equal(clean.length, 0);
  const drifted = siblingFindings([{ container: 'ul.cards', memberCount: 3, rows: 1, parts: [{ part: 'action', deltaPx: 35, tops: [454, 479, 514], rowsCompared: 3, rowDeltas: [35] }] }], 1440);
  assert.equal(drifted.length, 1);
  assert.equal(drifted[0].code, 'CRAFT_SIBLING_BASELINE');
  assert.match(drifted[0].message, /454, 479, 514/);
  assert.match(drifted[0].message, /Not an automatic fail/, 'the harness cannot read DESIGN.md intent, and says so');
});

test('heading inversion: a 17.5px h1 under a 40px h2 fails, a taller h1 passes, and a missing h2 is NOT-FOUND not PASS', () => {
  const inverted = headingFindings({ h1: { sizePx: 17.5, text: 'Alex Lin' }, h2s: [{ sizePx: 40, text: 'Fieldwork' }], largestH3SizePx: 20 }, 390);
  assert.equal(inverted.status, 'FAIL');
  assert.match(inverted.findings[0].message, /17\.5px while the largest h2 computes 40px/);
  assert.equal(headingFindings({ h1: { sizePx: 48 }, h2s: [{ sizePx: 40 }] }, 390).status, 'PASS');
  assert.equal(headingFindings({ h1: { sizePx: 48 }, h2s: [] }, 390).status, 'NOT-FOUND (no visible h2 on route)');
  assert.equal(headingFindings({ h1: null, h2s: [{ sizePx: 12 }] }, 390).status, 'NOT-FOUND (no h1 on route)');
});

test('a horizontally overflowing table with cut headers and no affordance fails; with cue plus keyboard reach it passes; without overflow it stays silent', () => {
  const base = {
    selector: 'section.case table', scrollerFound: true, tableScrollWidthPx: 480, frameClientWidthPx: 291, overflowing: true, headerCount: 4,
    cutHeaders: [{ text: 'Impact', rightBeyondPx: 120 }, { text: 'Role', rightBeyondPx: 58 }]
  };
  const naked = tableFindings([{ ...base, affordance: { edgeCue: null, keyboardReachable: false, caption: null }, complete: false }], 390);
  assert.equal(naked.length, 1);
  assert.equal(naked[0].code, 'CRAFT_TABLE_FIT');
  assert.match(naked[0].message, /480px inside a 291px container/);
  assert.match(naked[0].message, /"Impact" \+120px/, 'the cut columns are listed by name — this is where the argument lives');
  const withAffordance = tableFindings([{ ...base, affordance: { edgeCue: { selector: 'div.mask', paint: 'linear-gradient(90deg, transparent, rgb(255,255,255))', side: 'right' }, keyboardReachable: true, caption: 'Metrics' }, complete: true }], 390);
  assert.equal(withAffordance.length, 0);
  assert.equal(tableFindings([{ ...base, overflowing: false, cutHeaders: [], complete: true }], 390).length, 0);
});

test('the state matrix fails a reachable cell only on the evidence the probe actually has, and an unreachable state is n/a', () => {
  const matrix = stateMatrix(
    { link: { hover: ['a.nav:hover'] } },
    { button: { 'focus-visible': { props: ['self.outlineColor'], via: 'computed diff after Tab' } } },
    { link: { count: 5, anyExpanded: false, anyBusy: false, anyDisabled: false }, button: { count: 2, anyExpanded: false, anyBusy: false, anyDisabled: false } }
  );
  assert.equal(matrix.matrix.link.hover !== 'MISS', true, 'hover resolved by selector matching');
  assert.equal(matrix.matrix.link.active, 'MISS');
  assert.equal(matrix.matrix.button['focus-visible'].computedDiff.length, 1, 'computed diff beats selector matching and is recorded as such');
  assert.match(matrix.matrix.link.busy, /not reachable/, 'a state nothing on the route can enter is not credited or failed');
  assert.ok(matrix.findings.every(item => item.code === 'CRAFT_STATE_MATRIX'));
});

test('reader-reachability scoping: a type whose only instances are hidden gets NOT-FOUND with its denominator, never a MISS', () => {
  const hidden = stateMatrix({}, {}, {
    toggle: { count: 0, anyExpanded: false, anyBusy: false, anyDisabled: false, excludedHiddenCount: 6, excludedNotRendered: 6, excludedZeroArea: 0 }
  });
  assert.equal(hidden.findings.length, 0, 'nothing reachable means nothing the reader can fail — and no phantom finding either');
  assert.equal(hidden.ran, false, 'a matrix over only hidden instances did not run on this route');
  assert.equal(hidden.matrix.toggle.status, 'NOT-FOUND (no reachable instance of this type on this route)');
  assert.equal(hidden.matrix.toggle.excludedHiddenCount, 6, 'the denominator is the receipt: six controls in the DOM, none on this route');
  assert.deepEqual(hidden.excluded, { toggle: 6 });
  const mixed = stateMatrix({}, {}, { toggle: { count: 0, excludedHiddenCount: 6 }, button: { count: 3 } });
  assert.equal(mixed.ran, true, 'one reachable type still runs the matrix for that type');
  assert.ok(mixed.findings.length > 0);
  assert.ok(mixed.findings.every(item => /"button"/.test(item.message)), 'only the reachable type is ever failed');
  assert.ok(mixed.findings.every(item => !/"toggle"/.test(item.message)));
});

test('press verdict: tone and edge are feedback, only total silence fails, and the row names the channel that moved', () => {
  const rest = {
    self: {
      color: 'rgb(20, 20, 20)', backgroundColor: 'rgb(255, 255, 255)', backgroundImage: 'none',
      borderTopColor: 'rgb(220, 220, 220)', borderRightColor: 'rgb(220, 220, 220)',
      borderBottomColor: 'rgb(220, 220, 220)', borderLeftColor: 'rgb(220, 220, 220)',
      boxShadow: 'none', textShadow: 'none', opacity: '1', filter: 'none', fontWeight: '400',
      letterSpacing: '0px', textDecorationLine: 'none', outlineColor: 'rgb(0,0,0)', outlineWidth: '0px',
      outlineStyle: 'none', transform: 'none', a: 1, d: 1, e: 0, f: 0
    }, before: {}, after: {}
  };
  const held = JSON.parse(JSON.stringify(rest));
  held.self.backgroundColor = 'rgb(243, 240, 234)';
  held.self.borderTopColor = 'rgb(150, 150, 150)';
  held.self.boxShadow = 'rgba(0, 0, 0, 0.12) 0px 1px 2px 0px inset';
  const channels = pressChannels(rest, held);
  assert.ok(channels.length >= 3, 'background, border and inset shadow all moved');
  assert.deepEqual(Array.from(new Set(channels.map(channel => channel.kind))), ['tone', 'edge']);
  assert.equal(channels.some(channel => channel.property === 'transform'), false, 'no displacement, and that is not a defect for a sheet');
  assert.match(channels.find(channel => channel.property === 'backgroundColor').summary, /backgroundColor rgb delta \d+/);
  assert.match(channels.find(channel => channel.property === 'boxShadow').summary, /boxShadow changed/);
  const toneOnly = pressFindings([{
    type: 'button', selector: 'button.card', dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false,
    returnMs: 0, restTransform: 'none', heldTransform: 'none',
    channels, channelSummaries: channels.map(channel => channel.kind + ' ' + channel.summary), settle: 'settled', heldSettleMs: 240, hitAreaStable: true
  }]);
  assert.equal(toneOnly.findings.length, 0, 'interaction-states.md:57 lets a sheet answer a press by tone and edge');
  assert.equal(toneOnly.rows[0].moved, true);
  assert.match(toneOnly.rows[0].channels.join(' | '), /backgroundColor rgb delta/);
  const silent = pressFindings([{
    type: 'button', selector: 'button.flat', dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false,
    returnMs: 0, restTransform: 'none', heldTransform: 'none', channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4, hitAreaStable: true
  }]);
  assert.equal(silent.findings.length, 1, 'a press that changes no channel at all is still the defect');
  assert.equal(silent.findings[0].code, 'CRAFT_PRESS_DELTA');
  assert.match(silent.findings[0].message, /any visible channel/);
  assert.match(silent.findings[0].evidence, /hit area rest/, 'the hit-area stability check survives the widening');
});

test('name/state agreement: an action-verb name that never changes with the flipped attribute is the shipped motion-toggle defect', () => {
  const findings = nameStateFindings([{
    type: 'toggle', selector: 'button.motion', stateAttrName: 'aria-pressed', label: 'Play page motion',
    nameBefore: 'Play page motion', nameAfter: 'Play page motion',
    before: { 'aria-pressed': 'false' }, afterClick: { 'aria-pressed': 'true' }, afterKeyboard: { 'aria-pressed': 'true' },
    flippedByClick: true, flippedByKeyboard: true, visualChangedByClick: true, pseudoChangedByClick: false
  }]);
  assert.ok(findings.some(item => /Play page motion/.test(item.message) && item.code === 'CRAFT_NAME_STATE'));
});

test('a state attribute that flips without changing one observable visual property fails even when the attribute is correct', () => {
  const findings = nameStateFindings([{
    type: 'disclosure', selector: 'button.faq', stateAttrName: 'aria-expanded', label: 'Details',
    nameBefore: 'Details', nameAfter: 'Details',
    before: { 'aria-expanded': 'false' }, afterClick: { 'aria-expanded': 'true' }, afterKeyboard: { 'aria-expanded': 'true' },
    flippedByClick: true, flippedByKeyboard: true, visualChangedByClick: false, pseudoChangedByClick: false
  }]);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /renders identical/);
});

test('a toggle that never flips its state attribute under click or keyboard is reported, and an unmeasurable toggle is not counted', () => {
  const findings = nameStateFindings([
    { type: 'switch', selector: 'div.sw', stateAttrName: 'aria-checked', label: 'Mode', nameBefore: 'Mode', nameAfter: 'Mode', before: { 'aria-checked': 'true' }, afterClick: { 'aria-checked': 'true' }, afterKeyboard: { 'aria-checked': 'true' }, flippedByClick: false, flippedByKeyboard: false, visualChangedByClick: false, pseudoChangedByClick: false },
    { type: 'switch', selector: 'div.dead', stateAttrName: 'aria-checked', clickFailed: 'Target closed', keyboardFailed: 'Target closed' }
  ]);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /never flips/);
});

test('a route that ships every case statically reports name/state as NOT-FOUND with the hidden instances it excluded', () => {
  const craft = {
    siblings: [], headings: { h1: null, h2s: [] }, tables: [], shadows: [], stateSelectors: {},
    typeStats: { toggle: { count: 0, excludedHiddenCount: 6 }, tab: { count: 0, excludedHiddenCount: 3 } },
    toggleScope: { visible: 0, hidden: 6, byStateAttribute: { 'aria-pressed': 6 }, byType: { toggle: 0 } },
    interactive: [], cssom: { rulesWalked: 0, inaccessibleSheets: 0 }
  };
  const built = buildCraftFindings({
    file: 'project.html?id=signal', craft,
    craftPasses: [{
      width: 1440, craft,
      interactions: { evidence: {}, presses: [], toggles: [], notes: [], targets: [] }
    }]
  });
  const row = built.summary.widths[1440];
  assert.equal(built.findings.length, 0, 'a phantom finding is not a defect that got a nicer label — it is not a finding');
  assert.match(row.nameState.status, /NOT-FOUND \(no toggle\/disclosure\/tab\/selectable control reachable on this route\)/);
  assert.equal(row.nameState.reachableInstances, 0);
  assert.equal(row.nameState.excludedHiddenInstances, 6, 'the excluded count is the evidence that the probe looked and scoped');
  assert.match(row.stateMatrix.status, /NOT-FOUND \(no interactive type reachable on this route\)/);
  assert.deepEqual(row.stateMatrix.excludedHiddenByType, { toggle: 6, tab: 3 });
  assert.match(row.press.status, /NOT-FOUND/);
});

test('heading inversion names both elements so .page-title against a section heading needs no CSS to read', () => {
  const inverted = headingFindings({
    h1: { sizePx: 17.5, text: 'Selected work', tag: 'h1', classText: 'page-title', id: 'page-title', selector: 'body > h1.page-title' },
    h2s: [
      { sizePx: 24, text: 'Contents', tag: 'h2', classText: '', id: '', selector: 'section > h2' },
      { sizePx: 40, text: 'Signal', tag: 'h2', classText: 'case-h2', id: 'case-h-signal', selector: 'article > h2.case-h2' }
    ],
    h2HiddenExcluded: 2
  }, 1440);
  assert.equal(inverted.status, 'FAIL');
  assert.match(inverted.findings[0].message, /h1 \.page-title#page-title "Selected work" at 17\.5px/);
  assert.match(inverted.findings[0].message, /h2 \.case-h2#case-h-signal "Signal" at 40px/);
  assert.equal(inverted.largestH2.sizePx, 40, 'the largest VISIBLE h2 wins, not the largest in the DOM');
  assert.match(inverted.findings[0].evidence, /hidden cross-case h2 excluded: 2/);
});

test('a sibling delta is one row per container and per established role, with no cross-container maximum standing in for a verdict', () => {
  const group = {
    container: 'main > ul.cards', memberCount: 3, rows: 2,
    parts: [{
      part: 'action', role: 'a|view|no-role|href', matchedBy: 'class or role pattern', deltaPx: 35,
      tops: [454, 479], rowsCompared: 2, comparedParts: ['li > a.view', 'li > a.view'],
      rowDeltas: [35, 0], roleBucketsCompared: 2, distinctRolesMatched: 3, roleBucketsSkippedAsSingletons: 1
    }]
  };
  const drifted = siblingFindings([group], 1440);
  assert.equal(drifted.length, 1);
  assert.match(drifted[0].message, /inside the one container main > ul\.cards/);
  assert.match(drifted[0].message, /share an established role \(a\|view\|no-role\|href/);
  assert.match(drifted[0].evidence, /distinct roles matched: 3, singletons not compared: 1/, 'the roles that could not be compared are named, not silently dropped');
  const built = buildCraftFindings({
    file: 'z.html',
    craft: {
      siblings: [group], headings: { h1: null, h2s: [] }, tables: [], shadows: [], stateSelectors: {},
      typeStats: {}, toggleScope: { visible: 0, hidden: 0 }, interactive: [], cssom: { rulesWalked: 0, inaccessibleSheets: 0 }
    },
    craftPasses: []
  });
  const sibsRow = built.summary.widths[390].siblings;
  assert.equal(sibsRow.worstDeltaPx, undefined, 'the aggregate maximum over every container and role is gone');
  assert.equal(sibsRow.crossContainerMaxDeltaPx, 35);
  assert.match(sibsRow.crossContainerMaxIsNotAVerdict, /spans containers and part roles/);
  assert.deepEqual(sibsRow.containersWithFindings, ['main > ul.cards']);
});

test('a state cell is resolved per instance, not on one representative: a rule that matches a second link passes the cell, and a MISS names the instances it tested', () => {
  /* The sampling bug: the first link on the route is a nav anchor, so link/hover was scored MISS while
     `.case-contents a:hover` matched an instance further down the page. Resolution now walks every
     visible instance up to a cap and reports the counts. */
  const selectorEvidence = {
    link: {
      hover: {
        selectors: ['.case-contents a:hover'], instancesTested: 12, instancesResponding: 3,
        totalInstances: 18, capHit: true, respondingInstances: ['nav.case-contents > a'],
        resolvedBy: { selector: '.case-contents a:hover', instance: 'nav.case-contents > a', channel: ['text-decoration-line'] }
      }
    }
  };
  const instances = { link: { tested: ['a.wordmark', 'nav.desktop-nav > a', 'nav.case-contents > a'], totalInstances: 18, capHit: true, cap: 12 } };
  const typeStats = { link: { count: 18, stateInstanceCap: 12 } };
  const matrix = stateMatrix(selectorEvidence, {}, typeStats, instances);
  assert.notEqual(matrix.matrix.link.hover, 'MISS', 'a rule that matches ANY tested instance resolves the cell');
  assert.equal(matrix.matrix.link.hover.rules, 1);
  assert.equal(matrix.matrix.link.hover.instances.respondedToRule, 3, 'the cell reports how many instances answered');
  assert.equal(matrix.matrix.link.hover.instances.testedByRule, 12);
  assert.equal(matrix.matrix.link.hover.instances.totalVisible, 18);
  assert.equal(matrix.matrix.link.hover.instances.capHit, true, '18 instances exist and 12 were tested — that must read as a truncated sample');
  assert.match(matrix.matrix.link.hover.instances.capNote, /first 12 of 18/);
  assert.equal(matrix.matrix.link.hover.resolvedBy.channel, 'CSSOM rule');
  assert.equal(matrix.matrix.link.hover.resolvedBy.selector, '.case-contents a:hover');
  assert.match(matrix.matrix.link.hover.via, /weaker evidence/, 'selector matching alone is still labelled as the weaker channel');
  const missed = matrix.findings.find(finding => /active/.test(finding.message));
  assert.equal(matrix.matrix.link.active, 'MISS', 'no rule matched any instance and no input was driven — a real MISS survives the widening');
  assert.match(missed.message, /3 tested instance\(s\)/);
  assert.match(missed.message, /nav\.case-contents > a/, 'a MISS names the elements it tested so a human can disprove it');
  assert.match(missed.evidence, /every reachable instance was tested/, 'the active cell was resolved against the full instance set, so no truncation is claimed');
});

test('a computed diff beats a selector match for the label, and an instance-driven answer names the instance that moved', () => {
  const matrix = stateMatrix(
    { toggle: { hover: { selectors: ['.motion-toggle:hover'], instancesTested: 4, instancesResponding: 1, totalInstances: 4, capHit: false, resolvedBy: { selector: '.motion-toggle:hover', instance: 'button.motion-toggle' } } } },
    { toggle: { hover: { props: ['self.backgroundColor'], via: 'computed diff under a real pointer move', instancesTested: 4, instancesResponding: 2, resolvedBy: 'button.motion-toggle', instancesTotal: 4, capNote: null } } },
    { toggle: { count: 4 } },
    { toggle: { tested: ['button.motion-toggle'], totalInstances: 4, capHit: false } }
  );
  const cell = matrix.matrix.toggle.hover;
  assert.equal(cell.evidenceStrength, 'computed diff, corroborated by a CSSOM rule');
  assert.equal(cell.resolvedBy.channel, 'computed diff');
  assert.equal(cell.resolvedBy.instance, 'button.motion-toggle');
  assert.equal(cell.instances.respondedToInput, 2);
  assert.equal(cell.instances.respondedToRule, 1);
  assert.equal(matrix.findings.length, 2, 'focus-visible and active stay MISS — a passing hover cell does not launder them');
  assert.ok(matrix.findings.every(finding => !/hover state/.test(finding.message)), 'the resolved hover cell produces no finding');
});

test('inert is an exclusion reason: a type whose only instances are switched off gets NOT-FOUND with the inert count', () => {
  const matrix = stateMatrix({}, {}, {
    disclosure: { count: 0, excludedHiddenCount: 5, excludedInert: 5, excludedAttributeHidden: 0, excludedNotRendered: 0 }
  });
  assert.equal(matrix.ran, false);
  assert.equal(matrix.findings.length, 0, 'a control the author deliberately made non-actionable is not a state-completeness failure');
  assert.equal(matrix.matrix.disclosure.excludedInert, 5, 'the inert denominator is reported, not folded into "hidden"');
  assert.match(matrix.matrix.disclosure.note, /5 of them inside an inert subtree/);
});

test('a silent press states what the instrument could not separate: hover is not charged to the press, and a :active that never registered is flagged as an instrument candidate', () => {
  const neverActive = pressFindings([{
    type: 'toggle', pressClass: 'control-box', selector: 'div.filters > button', dx: 0, dy: 0, scale: 1,
    opacityDelta: 0, filterChanged: false, returnMs: 0, restTransform: 'none', heldTransform: 'none',
    channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4, settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4, hoverChannels: ['backgroundColor rgb delta 375, alpha delta 0.85'],
    activeApplied: false, hitOnTarget: true, hitSelector: 'div.filters > button'
  }]);
  assert.equal(neverActive.findings.length, 1, 'still a finding when nothing vouches for the state');
  assert.match(neverActive.findings[0].message, /matches\(":active"\) false/, 'the message names the state that did not fire');
  assert.match(neverActive.findings[0].message, /no CSSOM rule with :active matched this instance/, 'and says the selector channel found no rule either');
  assert.match(neverActive.findings[0].evidence, /baseline is the hovered rest/);
  assert.match(neverActive.findings[0].evidence, /hover-only channels seen before the press: backgroundColor rgb delta 375/, 'the hover delta is disclosed, not deleted');
  assert.match(neverActive.findings[0].evidence, /elementFromPoint "div\.filters > button"/, 'the hit target is quoted so an occlusion can be disproved');
  /* The same silence, but the CSSOM channel knows an :active rule for this exact instance. The probe
     cannot make the synthetic pointer active in this harness, so the row is reported as answered on
     weaker evidence instead of being called a defect — and it is never credited as a computed diff. */
  const support = () => '.button:active, .filters button:active';
  const withSelectorSupport = pressFindings([{
    type: 'toggle', pressClass: 'control-box', selector: 'div.filters > button',
    elementSelector: 'div.filters > button', dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false,
    returnMs: 0, restTransform: 'none', heldTransform: 'none', channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4,
    hoverChannels: [], activeApplied: false, hitOnTarget: true
  }], support);
  assert.equal(withSelectorSupport.findings.length, 0, 'a rule the instrument cannot exercise is not a defect verdict against the site');
  assert.equal(withSelectorSupport.rows[0].moved, false, 'the pixels still said nothing — that stays on the record');
  assert.match(withSelectorSupport.rows[0].pressEvidence, /^CSSOM :active rule only: \.button:active, \.filters button:active/);
  assert.match(withSelectorSupport.rows[0].expectation, /weaker than a computed diff/);
  const firedButSilent = pressFindings([{
    type: 'button', pressClass: 'control-box', selector: 'button.flat', dx: 0, dy: 0, scale: 1, opacityDelta: 0,
    filterChanged: false, returnMs: 0, restTransform: 'none', heldTransform: 'none', channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4,
    hoverChannels: [], activeApplied: true, hitOnTarget: true
  }], () => '.button:active');
  assert.equal(firedButSilent.findings.length, 1, 'when the state really fired, a matched rule cannot excuse the silence');
  assert.match(firedButSilent.findings[0].message, /the state fired and no owned channel moved/);
  assert.equal(firedButSilent.findings[0].activeApplied, true);
  /* A press whose only movement was the pointer arriving is not a press response: with the hovered
     baseline the hover channels are no longer in `channels`, so the control stays a finding. */
  const hoverOnly = pressFindings([{
    type: 'toggle', pressClass: 'control-box', selector: 'div.filters > button', dx: 0, dy: 0, scale: 1,
    opacityDelta: 0, filterChanged: false, returnMs: 0, channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4,
    hoverChannels: ['backgroundColor rgb delta 38'], activeApplied: true
  }]);
  assert.equal(hoverOnly.findings.length, 1, 'a hover tone cannot answer for the press any more');
  assert.equal(hoverOnly.rows[0].moved, false);
  assert.deepEqual(hoverOnly.rows[0].hoverChannelsSeen, ['backgroundColor rgb delta 38']);
});

test('press verdicts split by anatomy: a silent control-box and a silent nav link both fail, a prose link is exempt, and a host that answered counts as an answer', () => {
  const controlBox = pressFindings([{
    type: 'button', pressClass: 'control-box', selector: 'button.flat', dx: 0, dy: 0, scale: 1, opacityDelta: 0,
    filterChanged: false, returnMs: 0, restTransform: 'none', heldTransform: 'none', channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4
  }]);
  assert.equal(controlBox.findings.length, 1, 'a control that owns a box and answers nothing is the defect');
  assert.equal(controlBox.findings[0].pressClass, 'control-box');
  const inlineSilent = pressFindings([{
    type: 'link', pressClass: 'inline-link', selector: 'a (wordmark)', elementSelector: 'header > a.wordmark',
    hostSelector: 'header.site-header', answeredBy: null, dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false,
    returnMs: 0, channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4
  }]);
  assert.equal(inlineSilent.findings.length, 1, 'a nav or header link that paints no box is still a target the reader aims at: the ownership table names it, and the prose row exempts only the sentence around a link');
  assert.equal(inlineSilent.findings[0].pressClass, 'inline-link', 'the finding keeps the anatomy that produced it, so a reader can tell which obligation was enforced');
  assert.equal(inlineSilent.rows[0].moved, false, 'and the silence is on the record as a row either way');
  assert.match(inlineSilent.rows[0].expectation, /must answer on a channel it owns/);
  const proseSilent = pressFindings([{
    type: 'link', pressClass: 'prose-link', selector: 'p > a', dx: 0, dy: 0, scale: 1, opacityDelta: 0,
    filterChanged: false, channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4
  }]);
  assert.equal(proseSilent.findings.length, 0);
  assert.match(proseSilent.rows[0].expectation, /not demanded/i, 'no displacement is demanded of a prose link');
  const hostAnswered = pressFindings([{
    type: 'link', pressClass: 'inline-link', selector: 'article > a.project-card-link-title', elementSelector: 'h3 > a',
    hostSelector: 'article.project-card', answeredBy: 'article.project-card', dx: 0, dy: 0, scale: 1, opacityDelta: 0,
    filterChanged: false, channels: [{ zone: 'self', property: 'boxShadow', kind: 'edge', summary: 'boxShadow changed', element: 'article.project-card' }],
    channelSummaries: ['edge on host article.project-card: boxShadow changed']
  }]);
  assert.equal(hostAnswered.findings.length, 0);
  assert.equal(hostAnswered.rows[0].moved, true, 'a card that lifts when the link inside it is pressed did answer');
  assert.equal(hostAnswered.rows[0].answeredBy, 'article.project-card', 'the row says which element answered');
  /* Two more objects that own no press obligation: a control clipped out of view until focus, and a
     native form widget whose press response is drawn by the platform. */
  const exempt = pressFindings([
    { type: 'link', pressClass: 'clipped', selector: 'a.skip-link', dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false, channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4 },
    { type: 'toggle', pressClass: 'native-widget', selector: 'input.checkbox', dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false, channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4 }
  ]);
  assert.equal(exempt.findings.length, 0, 'neither is a violation — the object does not owe a press channel');
  assert.equal(exempt.rows.length, 2, 'both stay on the record as rows');
  assert.match(exempt.rows[0].expectation, /keyboard affordance/);
  assert.match(exempt.rows[1].expectation, /native form appearance/);
});

test('a heading tie is a finding with its own label, distinct from a true inversion', () => {
  const tie = headingFindings({ h1: { sizePx: 24, text: 'Selected work', tag: 'h1', selector: 'body > h1' }, h2s: [{ sizePx: 24, text: 'Case', tag: 'h2', selector: 'section > h2' }] }, 390);
  assert.equal(tie.status, 'FAIL', 'component-anatomy.md requires the h1 to EXCEED the largest h2, so a tie violates it');
  assert.equal(tie.findings[0].headingRelation, 'tie');
  assert.match(tie.findings[0].message, /tie at 390, rule requires strictly greater/);
  const inversion = headingFindings({ h1: { sizePx: 32, text: 'Alex', tag: 'h1', selector: 'body > h1' }, h2s: [{ sizePx: 40, text: 'Fieldwork', tag: 'h2', selector: 'section > h2' }] }, 1440);
  assert.equal(inversion.findings[0].headingRelation, 'inversion');
  assert.match(inversion.findings[0].message, /inversion at 1440, the h1 is smaller/);
  assert.match(inversion.findings[0].message, /32px while the largest h2 computes 40px/);
  const built = buildCraftFindings({
    file: 'z.html',
    craft: {
      siblings: [], headings: { h1: { sizePx: 24, tag: 'h1' }, h2s: [{ sizePx: 24, tag: 'h2' }], h2HiddenExcluded: 0 },
      tables: [], shadows: [], stateSelectors: {}, stateInstances: {}, typeStats: {},
      toggleScope: { visible: 0, hidden: 0, inert: 0 }, interactive: [], cssom: { rulesWalked: 0, inaccessibleSheets: 0 }
    },
    craftPasses: []
  });
  const row = built.summary.widths[390].headings;
  assert.equal(row.headingRelation, 'tie');
  assert.equal(row.ties, 1);
  assert.equal(row.inversions, 0);
});

test('the serialized reachability predicate treats inert as unreachable — attribute on self or an ancestor, and the IDL property', () => {
  /* The predicate only ever runs inside the page, so it is exercised here against a hand-made DOM: the
     source string is the one the audit serialises, which makes this a test of the shipped code path,
     not of a copy. A control the author switched off must leave the numerator (it cannot be failed) and
     stay in the denominator (it is still on the page). */
  const style = { position: 'static', display: 'block', visibility: 'visible', opacity: '1' };
  globalThis.getComputedStyle = () => style;
  const build = new Function(CRAFT_CLASSIFY_SOURCE + '\nreturn { visible, inertScope, classifyType };')();
  const element = (tagName, attributes = {}, extra = {}) => ({
    nodeType: 1, tagName, inert: false,
    attributes,
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    getAttribute(name) { return this.hasAttribute(name) ? String(this.attributes[name]) : null; },
    parentElement: null, offsetParent: { nodeName: 'BODY' },
    checkVisibility: () => true, getBoundingClientRect: () => ({ width: 120, height: 32, top: 10, left: 10 }),
    ...extra
  });
  const archive = element('DIV', { inert: '' });
  const control = element('BUTTON', { type: 'button' }, { parentElement: archive });
  archive.parentElement = element('BODY');
  assert.equal(build.classifyType(control), 'button', 'the control is an interactive type before scope is applied');
  assert.equal(build.inertScope(control), true, 'an ancestor carrying [inert] makes the subtree inert');
  assert.equal(build.visible(control), false, 'and an inert control is not reachable on this route');
  const propertyOnly = element('DIV');
  propertyOnly.inert = true;
  const viaProperty = element('A', { href: '#' }, { parentElement: propertyOnly });
  propertyOnly.parentElement = element('BODY');
  assert.equal(build.inertScope(viaProperty), true, 'inert set through the IDL property counts too');
  const live = element('BUTTON', { type: 'button' }, { parentElement: element('BODY') });
  assert.equal(build.inertScope(live), false);
  assert.equal(build.visible(live), true, 'and a control outside any inert or hidden scope is still measured');
  delete globalThis.getComputedStyle;
});

test('buildCraftFindings says NOT-RUN when a pass measured nothing, and a route with no rows reports NOT-FOUND, not PASS', () => {
  const broken = buildCraftFindings({ file: 'x.html', craft: null, craftError: 'the craft probe threw', craftPasses: [{ width: 1440, error: 'navigate timed out' }] });
  assert.equal(broken.summary.widths[390].status, 'NOT-RUN');
  assert.equal(broken.summary.widths[1440].status, 'NOT-RUN');
  assert.match(broken.summary.widths[1440].reason, /timed out/);
  const empty = buildCraftFindings({
    file: 'y.html',
    craft: { siblings: [], headings: { h1: null, h2s: [] }, tables: [], shadows: [], stateSelectors: {}, typeStats: {}, toggleScope: { visible: 0, hidden: 0 }, interactive: [], cssom: { rulesWalked: 0, inaccessibleSheets: 0 } },
    craftPasses: []
  });
  assert.equal(empty.summary.widths[390].siblings.status, 'NOT-FOUND (no multi-item rendered rows)');
  assert.equal(empty.summary.widths[390].shadows.status, 'NOT-FOUND (no element with a computed box-shadow)');
  assert.equal(empty.findings.length, 0, 'NOT-FOUND produces no violation — and no clean bill either; the status row is the receipt');
});

test('a route summary discloses that the harness never registered :active, and grades each silent press by the channel that vouches for it', () => {
  /* The press probe found its own limit: a synthesised CDP pointer-down never made a node
     matches(":active") true on this route set, so a `:active` rule is invisible to the pixel channel.
     The row must therefore say which channel answered — computed diff, CSSOM rule only, or nothing —
     and the route must carry the count instead of burying it. */
  const craft = {
    siblings: [], tables: [], shadows: [], interactive: [], cssom: { rulesWalked: 2, inaccessibleSheets: 0 },
    headings: {
      h1: { sizePx: 30, text: 'Alex Lin', selector: 'body > h1', tag: 'h1' },
      h2s: [{ sizePx: 20, text: 'Selected work', selector: 'section > h2', tag: 'h2' }], h2HiddenExcluded: 0
    },
    toggleScope: { visible: 1, hidden: 0, inert: 0, byStateAttribute: { 'aria-pressed': 1 } },
    stateInstances: { toggle: { tested: ['div.filters > button'], pressClasses: ['control-box'], totalInstances: 1, capHit: false, cap: 12 } },
    typeStats: { toggle: { count: 1, stateInstanceCap: 12, instancesTestedForStates: 1, stateSampleCapHit: false, excludedHiddenCount: 0 } },
    stateSelectors: {
      toggle: {
        active: {
          selectors: ['.button:active, .filters button:active'], instancesTested: 1, instancesResponding: 1,
          totalInstances: 1, capHit: false, respondingInstances: ['div.filters > button'],
          resolvedBy: { selector: '.button:active, .filters button:active', instance: 'div.filters > button', channel: ['transform'] }
        }
      }
    }
  };
  const silentPress = {
    type: 'toggle', pressClass: 'control-box', selector: 'div.filters > button box {"x":10,"y":10,"width":90,"height":40}',
    elementSelector: 'div.filters > button', dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false,
    returnMs: 0, restTransform: 'none', heldTransform: 'none', channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4,
    hoverChannels: [], activeApplied: false, hitOnTarget: true, hitSelector: 'div.filters > button'
  };
  const interactions = {
    instanceCaps: { hover: 6, 'focus-visible': 4, press: 3, instances: 12 },
    evidence: {}, presses: [silentPress], toggles: []
  };
  const vouches = buildCraftFindings({ file: 'run.html', craft, craftPasses: [{ width: 1440, craft, interactions }] });
  const row = vouches.summary.widths[1440].press;
  assert.equal(row.demanded, 1);
  assert.equal(row.activeStateNeverRegistered, 1, 'the route says how many presses the harness could not activate');
  assert.equal(row.answeredBySelectorMatchOnly, 1);
  assert.match(row.activeStateNote, /matches\(":active"\) false while held/);
  assert.match(row.activeStateNote, /the claim is about the probe, not about the site/);
  assert.equal(vouches.findings.filter(finding => finding.code === 'CRAFT_PRESS_DELTA').length, 0,
    'a rule the instrument cannot exercise is disclosed, not charged to the site');
  assert.equal(row.controls[0].pressEvidence, 'CSSOM :active rule only: .button:active, .filters button:active');
  const nothingVouches = buildCraftFindings({
    file: 'run.html', craft,
    craftPasses: [{ width: 1440, craft: { ...craft, stateSelectors: {} }, interactions: { ...interactions, evidence: {} } }]
  });
  assert.equal(nothingVouches.findings.filter(finding => finding.code === 'CRAFT_PRESS_DELTA').length, 1,
    'with no rule and no movement the press is a real finding — the disclosure does not launder counts');
  assert.equal(nothingVouches.summary.widths[1440].press.answeredBySelectorMatchOnly, 0);
});

test('the state matrix holds each type to the states the ownership table owes it, and names every exemption', () => {
  /* A scroll container answers the keyboard and nothing else. Charging it a missing hover taught the
     demo four phantom findings at once and pushes builders to paint a colour change onto a landmark. */
  const region = stateMatrix(
    { region: { 'focus-visible': { selectors: ['.table-scroll:focus-visible'], instancesTested: 3, instancesResponding: 3, totalInstances: 3 } } },
    { region: { 'focus-visible': { props: ['self.outlineColor'], via: 'computed diff under a real Tab', instancesTested: 3, instancesResponding: 3 } } },
    { region: { count: 3 } },
    { region: { tested: ['div.table-scroll'] } }
  );
  assert.equal(region.findings.length, 0, 'hover and active are not owed by a region');
  assert.match(region.matrix.region.hover, /^n\/a — state reachable but not owed/, 'the cell is labelled exempt, not left blank');
  assert.deepEqual(Object.keys(region.exempt), ['region']);
  assert.equal(region.exempt.region.length, 2, 'hover and active, the two the region row exempts (disabled is never reachable for it)');
  assert.ok(region.exempt.region.every(entry => /interaction-states.md:32/.test(entry)),
    'each exemption quotes the row of the table that grants it, so a reader can disagree with the ruling');
  assert.match(region.matrix.region.ownershipNote, /state-ownership table at interaction-states.md:32/);

  /* A native select paints its own hover inside a closed shadow tree. The instrument cannot read it,
     so the cell is NOT-MEASURABLE: not a pass, and not a finding either. */
  const combo = stateMatrix({ combobox: { 'focus-visible': { selectors: ['select:focus-visible'], instancesTested: 4, instancesResponding: 4, totalInstances: 4 } } },
    {}, { combobox: { count: 4 } }, { combobox: { tested: ['select'] } });
  assert.equal(combo.findings.length, 0, 'an unmeasurable platform channel is not charged to the site');
  assert.match(combo.matrix.combobox.hover, /^NOT-MEASURABLE/, 'reported as a limit of the instrument, never as a pass');
  assert.match(combo.matrix.combobox.hover, /not a pass/);
  const comboNoFocus = stateMatrix({}, {}, { combobox: { count: 4 } }, { combobox: { tested: ['select'] } });
  assert.equal(comboNoFocus.findings.length, 1, 'the hover exemption does not launder focus-visible, which a select does owe');
  assert.match(comboNoFocus.findings[0].message, /focus-visible state/);

  /* The obligation a type owes is not decided by whether the table happens to mention it: an unmapped
     type gets the full set, so extending the classifier cannot quietly exempt a control. */
  const unmapped = stateMatrix({}, {}, { slider: { count: 2 } }, { slider: { tested: ['div[role=slider]'] } });
  assert.equal(unmapped.findings.length, 3, 'hover, focus-visible and active all MISS for a type the table does not exempt');
  assert.equal(CRAFT_STATE_OWNERSHIP.slider, undefined, 'slider is deliberately absent from the table, so the full demand applies');
});

test('the selected member of a single-select row is not called a dead control, and a dead row still fails', () => {
  const chip = name => ({ selector: 'button', type: 'toggle', stateAttrName: 'aria-pressed', label: name, name,
    nameBefore: name, nameAfter: name, group: 'div.filters[3]', before: { 'aria-pressed': name === 'All work' ? 'true' : 'false' },
    afterClick: { 'aria-pressed': name === 'All work' ? 'true' : 'false' }, afterKeyboard: { 'aria-pressed': name === 'All work' ? 'true' : 'false' },
    flippedByClick: name !== 'All work', flippedByKeyboard: name !== 'All work',
    visualChangedByClick: name !== 'All work' });
  const working = nameStateFindings([chip('All work'), chip('Growth'), chip('Research')]);
  assert.equal(working.length, 0, 'the filter already on does not flip when re-clicked, which is what a single-select row does');
  assert.equal(working.exemptBySingleSelect.length, 1);
  assert.match(working.exemptBySingleSelect[0], /other 2 member\(s\) did flip/);

  const dead = { ...chip('Ceramic bottle'), group: 'fieldset.demo-presets[3]',
    flippedByClick: false, flippedByKeyboard: false, visualChangedByClick: false,
    before: { 'aria-pressed': 'true' }, afterClick: { 'aria-pressed': 'true' }, afterKeyboard: { 'aria-pressed': 'true' } };
  const others = [chip('Desk lamp'), chip('Travel bag')].map(item => ({ ...item, group: dead.group, flippedByClick: false, flippedByKeyboard: false,
    visualChangedByClick: false,
    before: { 'aria-pressed': 'false' }, afterClick: { 'aria-pressed': 'false' }, afterKeyboard: { 'aria-pressed': 'false' } }));
  const groupDead = nameStateFindings([dead, ...others]);
  assert.equal(groupDead.length, 3, 'nothing in the row answers the reader, so the selected chip is reported with the rest');
  assert.match(groupDead[0].message, /the whole row is inert rather than the selected chip behaving correctly/);
});

test('collapseByDedupe reports one defect once across widths and names every width it was seen at', () => {
  const rows = collapseByDedupe([
    { code: 'CRAFT_SHADOW_LAYERS', dedupe: 'layers|div|note', message: 'div|note is a single-layer shadow', evidence: 'a' },
    { code: 'CRAFT_SHADOW_LAYERS', dedupe: 'layers|div|note', message: 'div|note is a single-layer shadow', evidence: 'b' },
    { code: 'CRAFT_SIBLING_BASELINE', dedupe: 'ol#x|action|a', message: 'At 1440px, inside ol#x the action parts land 186px apart', evidence: 'c', evidenceDelta: '186px' },
    { code: 'CRAFT_SIBLING_BASELINE', dedupe: 'ol#x|action|a', message: 'At 768px, inside ol#x the action parts land 24px apart', evidence: 'd', evidenceDelta: '24px' },
    { code: 'CRAFT_HEADING_INVERSION', message: 'no key, no collapse', evidence: 'e' },
    { code: 'CRAFT_HEADING_INVERSION', message: 'no key, no collapse either', evidence: 'f' }
  ]);
  assert.equal(rows.length, 4, 'two shadow rows become one, two sibling rows become one, and unkeyed findings are untouched');
  const sibling = rows.find(row => row.code === 'CRAFT_SIBLING_BASELINE');
  assert.match(sibling.message, /^At 1440px, 768px,/, 'the surviving row says which widths it stands for');
  assert.match(sibling.message, /one element class, not one per viewport/);
  assert.match(sibling.evidence, /also at 768px \(delta 24px\)/, 'the per-width delta survives in the evidence');
  assert.equal(sibling.widthsCollapsed, 2);
  assert.equal(sibling.dedupe, undefined, 'the internal key does not leak into the report');
});

/* --------------------------------------------------- the press driver, live -- */

/* Everything above this line is pure arithmetic over hand-made numbers. This block is the one place
   the craft layer is tested against a real browser, because the claim under test — "a held CDP
   pointer-down makes the node :active, so a `:active` rule is visible to the pixel channel" — is a
   property of the driver, not of a verdict function. A fixture that fakes `activeApplied` would test
   the fake. Written as one button whose ONLY press response is a background-colour change: no
   transform, no compositor layer, so a failure here can only mean `:active` never applied, and a pass
   here proves the state machinery works before anyone argues about transition timing. */

const pressFixture = {
  'index.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Press fixture</title>
<link rel="stylesheet" href="./styles.css"></head>
<body><a class="skip-link" href="#main">Skip to content</a>
<main id="main" tabindex="-1"><h1>Press fixture</h1>
<p>One control, one state.</p>
<button class="tone-only" type="button">Press me</button>
</main></body></html>`,
  'styles.css': `:root { --fs-body: 17px; --fs-small: 13px; }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
button:focus-visible, a:focus-visible, [tabindex]:focus-visible { outline: 3px solid black; }
body { font-size: var(--fs-body); }
p { font-size: var(--fs-body); }
button.tone-only { font-size: var(--fs-body); padding: 18px 32px; background: rgb(255, 255, 255);
  border: 1px solid rgb(20, 20, 20); }
/* Background only, on purpose. If the driver cannot make this node :active, nothing about
   compositor timing or transform interpolation can be the excuse. */
button.tone-only:active { background-color: rgb(17, 34, 68); }
`
};

/** Write a synthetic one-page site and audit it with the craft layer on, browser included. */
async function runCraftSite(name, sources) {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-ui-design-craft-'));
  try {
    for (const [file, text] of Object.entries(sources)) {
      await mkdir(join(root, dirname(file)), { recursive: true });
      await writeFile(join(root, file), text);
    }
    return await auditSite({ root, browser: true, craft: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('the press driver registers :active on a real pointer-down, so a background-only press rule is measured', async t => {
  const report = await runCraftSite('press-active', pressFixture);
  if (report.browserLayer.browser === 'unavailable') { t.skip(report.browserLayer.reason); return; }
  const route = report.browserLayer.craft.routes[0];
  const press = route.widths[1440].press;
  const control = press.controls.find(row => /button\.tone-only/.test(row.selector ?? ''));
  assert.ok(control, 'the fixture button was never pressed. press block: ' + JSON.stringify(press).slice(0, 900));
  assert.equal(control.activeApplied, true,
    'the driver held a left button on the node and matches(":active") still said false — the whole ' +
    'press dimension would then be unmeasurable. row: ' + JSON.stringify(control).slice(0, 900));
  const background = (control.channels ?? []).filter(channel => /backgroundColor/.test(channel));
  assert.ok(background.length, 'no background delta was read while the pointer was held, so the press ' +
    'channel is blind even when the state fires. row: ' + JSON.stringify(control).slice(0, 900));
  assert.match(background[0], /rgb delta/, 'the tone channel names the numeric rgb delta it measured');
  assert.equal(control.moved, true, 'a tone-only answer counts as a press response by the reference');
  assert.equal(control.focusedWhileHeld, true, 'a real press also focuses the node; the row discloses it instead of letting a focus channel pass as a press answer');
  /* The honest label must be wired to the measurement, not hard-coded: a route whose presses DID
     register the state is graded PASS and publishes nothing as unmeasurable. */
  assert.equal(press.status, 'PASS', press.notMeasurableReason ?? 'fixture route registered :active, so the press dimension was measured');
  assert.ok(press.controlsRegisteringActive >= 1);
  assert.deepEqual(report.browserLayer.craft.pressNotMeasurable, [], 'no press block to excuse on this route');
  assert.deepEqual(report.summary.unmeasured, [], 'and the summary therefore publishes no instrument limit here');
  assert.equal(report.violations.filter(item => item.code === 'CRAFT_PRESS_DELTA').length, 0);
});

test('a press pass where nothing registered :active is NOT-MEASURABLE, not PASS, and adds no violation', () => {
  /* The instrument limit this repo has a rule about: on the shipped route set every press came back
     activeApplied false, and the block still reported PASS because a CSSOM `:active` rule excused each
     row. An instrument limit must be published as NOT-MEASURABLE with its count and reason — never
     counted as a site violation, never allowed to read as verification. */
  const craft = {
    siblings: [], tables: [], shadows: [], interactive: [], cssom: { rulesWalked: 2, inaccessibleSheets: 0 },
    headings: { h1: { sizePx: 30, text: 'F', selector: 'body > h1', tag: 'h1' }, h2s: [], h2HiddenExcluded: 0 },
    toggleScope: { visible: 0, hidden: 0, inert: 0, byStateAttribute: {} },
    stateInstances: { button: { tested: ['button.a', 'button.b'], pressClasses: ['control-box', 'control-box'], totalInstances: 2, capHit: false, cap: 12 } },
    typeStats: { button: { count: 2 } },
    stateSelectors: {
      button: { active: { selectors: ['button:active'], instancesTested: 2, instancesResponding: 2, totalInstances: 2, capHit: false, respondingInstances: ['button.a', 'button.b'] } }
    }
  };
  const silent = selector => ({
    type: 'button', pressClass: 'control-box', selector: selector + ' box {"x":10,"y":10,"width":90,"height":40}',
    elementSelector: selector, dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false,
    returnMs: 0, restTransform: 'none', heldTransform: 'none', channels: [], channelSummaries: [], settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4,
    hoverChannels: [], activeApplied: false, hitOnTarget: true, hitSelector: selector
  });
  const answered = selector => ({ ...silent(selector), activeApplied: true,
    channels: [{ zone: 'self', property: 'transform', kind: 'displacement', summary: 'transform scale 0.985' }],
    channelSummaries: ['displacement on self: transform scale 0.985'] });
  const blind = buildCraftFindings({
    file: 'run.html', craft,
    craftPasses: [{ width: 1440, craft, interactions: { instanceCaps: {}, evidence: {}, presses: [silent('button.a'), silent('button.b')], toggles: [], notes: [] } }]
  });
  const row = blind.summary.widths[1440].press;
  assert.match(row.status, /^NOT-MEASURABLE/, 'zero of zero controls registered the state — that is the instrument, and it must say so');
  assert.equal(row.activeStateNeverRegistered, 2, 'the count of excused presses travels with the label');
  assert.match(row.notMeasurableReason, /matches\(":active"\)/, 'and the reason is stated, not implied');
  assert.equal(blind.findings.filter(item => item.code === 'CRAFT_PRESS_DELTA').length, 0,
    'an instrument limit is not a site defect and must not inflate the violation count');
  /* The same block with a control that did register the state keeps the old verdicts untouched. */
  const measured = buildCraftFindings({
    file: 'run.html', craft,
    craftPasses: [{ width: 1440, craft, interactions: { instanceCaps: {}, evidence: {},
      presses: [silent('button.a'), answered('button.b')], toggles: [], notes: [] } }]
  });
  assert.equal(measured.summary.widths[1440].press.status, 'PASS', 'presses that register :active are still graded as before');
  /* And a genuinely silent press that nothing vouches for still FAILs — the new state must not
     become a fresh way to excuse a real defect. */
  const failing = buildCraftFindings({
    file: 'run.html', craft,
    craftPasses: [{ width: 1440, craft: { ...craft, stateSelectors: {} },
      interactions: { instanceCaps: {}, evidence: {}, presses: [silent('button.a'), answered('button.b')], toggles: [], notes: [] } }]
  });
  assert.equal(failing.summary.widths[1440].press.status, 'FAIL');
  assert.equal(failing.findings.filter(item => item.code === 'CRAFT_PRESS_DELTA').length, 1);
});

test('the held read sizes its own wait from the element\'s declared transition, not from a constant', () => {
  // examples/alex-lin declares `transition: background 0.18s, transform 0.18s` (demos.css:30) beside
  // `.demo-button:active { transform: translateY(1px) }` (demos.css:31). The two-frame read landed at
  // ~33ms and saw matrix(1,0,0,1,0,0) — the start of that 180ms, not the held value.
  assert.equal(pressSettleDeadlineMs({ tr: { transitionDuration: '0.18s, 0.18s', transitionDelay: '0s, 0s' } }), 300);
  assert.equal(pressSettleDeadlineMs({ tr: { transitionDuration: '120ms, 60ms', transitionDelay: '80ms' } }), 320,
    'max(duration) + max(delay) + 120ms of settle');
  assert.equal(pressSettleDeadlineMs({ tr: { transitionDuration: '0s', transitionDelay: '0s' } }), 120, 'a transitionless control still gets one frame-pair of settle');
  assert.equal(pressSettleDeadlineMs({ tr: { transitionDuration: '4s', transitionDelay: '0s' } }), 700, 'a slow page cannot stall the pass');
  assert.equal(pressSettleDeadlineMs({}), 300, 'unreadable durations fall back to 300ms');
  assert.equal(pressSettleDeadlineMs({ tr: { transitionDuration: 'none', transitionDelay: '' } }), 300);
});

test('a press whose held value never settled is NOT-MEASURABLE with its reason — never a pass, never a CRAFT_PRESS_DELTA', () => {
  const timeout = {
    type: 'button', pressClass: 'control-box', selector: 'button.slow box {"x":1,"y":1,"width":90,"height":40}',
    elementSelector: 'button.slow', hostSelector: null, dx: 0, dy: 0, scale: 1, opacityDelta: 0, filterChanged: false,
    returnMs: 0, restTransform: 'none', heldTransform: 'matrix(1, 0, 0, 1, 0, 0)',
    heldEarlyTransform: 'matrix(1, 0, 0, 1, 0, 0)', heldSettleMs: 700, heldSettleFrames: 41,
    channels: [], channelSummaries: [], hoverChannels: [], settle: 'timeout', activeApplied: true, hitOnTarget: true
  };
  const verdict = pressFindings([timeout]);
  assert.equal(verdict.findings.length, 0, 'a value still moving when the deadline expired is the read point, not the stylesheet');
  assert.equal(verdict.rows[0].measurable, false, 'and the row says so instead of clearing the press');
  assert.match(verdict.rows[0].settleEvidence, /^still moving after 700ms$/);
  assert.match(verdict.rows[0].notMeasurable, /still moving after 700ms \(timeout\)/);
  assert.match(verdict.rows[0].notMeasurable, /Not a pass, not a defect/);
  /* The settled case keeps failing: the new state must not become a fresh way to excuse a real defect. */
  const settled = pressFindings([{ ...timeout, settle: 'settled', heldSettleMs: 240, heldSettleFrames: 4 }]);
  assert.equal(settled.findings.length, 1);
  assert.match(settled.findings[0].message, /settled after 240ms/);
  assert.match(settled.findings[0].evidence, /hold settled after 240ms over 4 frame\(s\)/);
  const lost = pressFindings([{ ...timeout, settle: 'active-lost' }]);
  assert.equal(lost.findings.length, 0, 'a press the UA dropped mid-read is not evidence about the press state');
  const craft = {
    siblings: [], tables: [], shadows: [], interactive: [], cssom: { rulesWalked: 1, inaccessibleSheets: 0 },
    headings: { h1: { sizePx: 30, text: 'F', selector: 'body > h1', tag: 'h1' }, h2s: [], h2HiddenExcluded: 0 },
    toggleScope: { visible: 0, hidden: 0, inert: 0, byStateAttribute: {} },
    stateInstances: {}, typeStats: { button: { count: 1 } }, stateSelectors: {}
  };
  const block = buildCraftFindings({
    file: 'run.html', craft,
    craftPasses: [{ width: 1440, craft, interactions: { instanceCaps: {}, evidence: {}, presses: [timeout], toggles: [], notes: [] } }]
  });
  assert.match(block.summary.widths[1440].press.status, /^NOT-MEASURABLE \(1 press\(es\) whose held value never settled/);
  assert.match(block.summary.widths[1440].press.notMeasurableReason, /button\.slow/);
  assert.equal(block.findings.filter(item => item.code === 'CRAFT_PRESS_DELTA').length, 0, 'the limit adds no violation');
});
