/**
 * Visual-craft probes for the browser layer of scripts/audit-site.mjs.
 *
 * These are the machine-enforced versions of the `**Check.**` paragraphs in the Skill's own
 * references: surfaces.md (shadow layer structure, inset pairing), interaction-states.md (the
 * type x state completeness matrix, press displacement, name/state agreement) and
 * component-anatomy.md (sibling baselines, heading size inversion, table fit and affordance).
 *
 * They only run when `--craft` is passed, because the shipped example site is expected to fail
 * several of them (the defects in component-anatomy.md were measured on pages like these), and the
 * Layer 2 test that gates the deliverable asserts the example site reports zero violations. The
 * probes are opt-in, never advisory: a violation from here travels the same `{code, line, message,
 * evidence}` channel as every other browser finding and is decorated with the same rule citation.
 *
 * Split that keeps the audit honest:
 * - `measureCraftProbes` is serialised into the page and returns raw measurements only — geometry,
 *   computed strings, selector matches. No verdict is taken in-page, because a verdict computed
 *   where nobody can unit-test it is a verdict nobody can check.
 * - `runCraftInteractions` drives real Input-domain events (pointer move, press held, Tab, click,
 *   keyboard activation) between two page evaluations, so the press delta and the state matrix are
 *   resolved against what the page actually renders, not against what a stylesheet merely claims.
 * - the verdicts themselves are pure node-side functions over those raw measurements:
 *   `parseShadowLayers`, `headingFindings`, `tableFindings`, `shadowFindings`, `siblingFindings`,
 *   `stateMatrix`, `pressFindings`, `nameStateFindings` — unit-testable without a browser.
 *
 * Every empty result distinguishes NOT-RUN / NOT-FOUND from PASS. A probe that matched nothing says
 * so, and never reports a clean page.
 */

/* --------------------------------------------------------------- rule text -- */

export const CRAFT_RULES = {
  CRAFT_SIBLING_BASELINE: {
    layer: 'browser', ref: 'skills/portfolio-website/references/component-anatomy.md:42',
    anchor: 'Pass requires zero delta',
    text: 'Within a rendered row, the comparable parts of siblings (action link, metadata line, status marker) share one top offset. A non-zero delta is reported as a finding to be explained: the harness cannot read DESIGN.md intent, so deliberate offsets are the author\'s to name, not the tool\'s to guess.'
  },
  CRAFT_HEADING_INVERSION: {
    layer: 'browser', ref: 'skills/portfolio-website/references/component-anatomy.md:50',
    anchor: 'greater than the largest',
    text: 'The route h1 computes larger than the largest h2 on the route, at every measured width. A page whose identity heading is smaller than its section headings carries hierarchy on the wrong element.'
  },
  CRAFT_TABLE_FIT: {
    layer: 'browser', ref: 'skills/portfolio-website/references/component-anatomy.md:62',
    anchor: 'pass requires a rendered affordance',
    text: 'A table whose scrollWidth exceeds its container and whose header cells fall outside the visible area needs a real affordance: a mask, fade or edge indicator with a computed non-none gradient or opacity step, plus the scroll container keyboard-reachable by tabindex, role or accessible name. A native scrollbar is not an affordance.'
  },
  CRAFT_SHADOW_LAYERS: {
    layer: 'browser', ref: 'skills/portfolio-website/references/surfaces.md:18',
    anchor: 'names no light source',
    text: 'A page that stacks three or more distinct raised shadow recipes is claiming a layered surface system; a raised class in that system that renders as a single shadow layer is a framework default, not a derivation.'
  },
  CRAFT_SHADOW_INSET: {
    layer: 'browser', ref: 'skills/portfolio-website/references/surfaces.md:92',
    anchor: 'strong drop and a strong inset shade',
    text: 'No element carries both a strong drop shadow and a strong inset shade: the pair reads as a hole with a lid on it. Both inner layers are one step, and follow the recorded light.'
  },
  CRAFT_STATE_MATRIX: {
    layer: 'browser', ref: 'skills/portfolio-website/references/interaction-states.md:37',
    anchor: 'fail any cell that is empty',
    text: 'Each interactive type owes rules for the states it is held to by the state-ownership table (interaction-states.md:26-33): link, button, toggle, switch, tab and disclosure owe every state their route can reach, a textbox owes focus-visible/disabled/error rather than hover and active, a native select\'s own hover and pressed chrome is painted by the platform and reported NOT-MEASURABLE, and a scroll region owes focus-visible plus a static overflow cue instead of hover and active. A cell is resolved per instance — every visible instance of the type on the route, up to a stated cap, with the truncation reported — and passes when any tested instance answers with a rule that changes a visible property in that state or with a computed diff under real input. An empty cell for an owed state is a component shipped at rest only; a state the reader cannot reach (hidden, aria-hidden or inert subtree) is excluded and counted, never failed; an exempted cell is named in the report with its reason, never quietly cleared.'
  },
  CRAFT_PRESS_DELTA: {
    layer: 'browser', ref: 'skills/portfolio-website/references/interaction-states.md:65',
    anchor: 'a non-zero delta on at least one channel the control owns',
    text: 'Under a real pointer-down, a press-capable control must change at least one visible channel it owns: displacement on a compositor property (transform, opacity, filter), or tone and edge on the material (background, border, shadow, colour, weight). Exactly zero change on every channel is a press that never happened. Tone-only response is not the defect — interaction-states.md:57 lets a sheet answer a press "by tone and edge", because a sheet does not compress. The obligation is graded by anatomy: a control that paints its own box must answer, and so must a nav, header or footer link that paints none, because it is still a target the reader aims at (interaction-states.md:28); either may answer on itself or on its nearest styled host (interaction-states.md:49, only the inner layer may move). Only a link inside running prose is exempt from displacement, and it still owes a change to the text itself (interaction-states.md:32). The delta is measured from the hovered rest, so a control that only answered the pointer arriving is not credited with answering the press, and a press the harness never marked active is judged on the selector channel and labelled with its weaker evidence rather than counted as a defect or quietly cleared.'
  },
  CRAFT_NAME_STATE: {
    layer: 'browser', ref: 'skills/portfolio-website/references/interaction-states.md:83',
    anchor: 'state attributes flip',
    text: 'For every toggle, disclosure, tab and selectable control that the reader can actually reach on this route, the accessible name and the exposed state must agree after real click and keyboard activation: state attributes flip, an action-verb name changes with them, the name never contradicts the visible label, and every flipped state attribute changes at least one observable visual property.'
  }
};

/* ------------------------------------------------------------- in-page raw -- */

/* Shared classifier, re-built inside every serialised page function from this source string — a
 *  serialised function closes over nothing, so the only way module scope reaches the page is as
 *  data passed in the options argument, exactly like Layer 1 ships the phrase-role vocabulary. */
export const CRAFT_CLASSIFY_SOURCE = `
const classifyType = element => {
  const tag = element.tagName.toLowerCase();
  const role = String(element.getAttribute('role') || '').toLowerCase();
  const inputType = tag === 'input' ? String(element.getAttribute('type') || 'text').toLowerCase() : null;
  if (role === 'tab') return 'tab';
  if (role === 'switch' || (inputType && ['checkbox', 'radio'].includes(inputType))) return 'switch';
  if (element.hasAttribute('aria-pressed')) return 'toggle';
  if (tag === 'select' || role === 'combobox' || role === 'listbox') return 'combobox';
  if (tag === 'textarea' || element.isContentEditable ||
      ['email','number','password','search','tel','text','url'].includes(inputType) || role === 'textbox') return 'textbox';
  if (element.hasAttribute('aria-expanded') && !(tag === 'a' && element.hasAttribute('href'))) return 'disclosure';
  if (tag === 'button' || role === 'button' || (inputType && ['button','submit','reset'].includes(inputType))) return 'button';
  if (tag === 'a' && element.hasAttribute('href')) return 'link';
  if (element.getAttribute('tabindex') === '0') return 'region';
  return null;
};
/* Reader-reachability scope, fix 1 of the audit findings. A control the reader cannot reach on this
 * route cannot answer a click, and a probe that fires on one teaches builders the check is theatre:
 * a route that ships every case's markup statically and hides the ones it is not showing keeps the
 * OTHER cases' controls in the DOM, in every selector query, and not on the screen. Rejected on any
 * of: [hidden] or aria-hidden="true" on the element or an ancestor; no rendered box (offsetParent is
 * null for this element whenever it or any ancestor is display:none, so one read collapses the
 * whole chain and the walk never has to compute a style per ancestor); inherited visibility or full
 * transparency; zero area. Fixed and sticky keep a box of their own, so offsetParent === null there
 * means nothing and is excused, exactly as the check is specified. */
const hiddenByAttribute = element => {
  let node = element;
  for (let depth = 0; node && node.nodeType === 1 && depth < 64; depth += 1) {
    if (node.hasAttribute && node.hasAttribute('hidden')) return true;
    if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return true;
    node = node.parentElement;
  }
  return false;
};
/* Inert is the third way a route opts a control out, fix 2 of this pass: the attribute (on self or an
 * ancestor) and the IDL property (el.inert = true, which reflects but is also set directly by
 * script) both make the subtree non-actionable — no click, no focus, no hover hit-test. A control the
 * author has deliberately marked inert is not a component shipped at rest, so it cannot be failed by
 * a state-completeness cell; it joins the excluded denominator so the report still says how many
 * instances were on the page and why they were not tested. */
const inertScope = element => {
  let node = element;
  for (let depth = 0; node && node.nodeType === 1 && depth < 64; depth += 1) {
    if (node.hasAttribute && node.hasAttribute('inert')) return true;
    if (node.inert === true) return true;
    node = node.parentElement;
  }
  return false;
};
const unboxed = element => {
  if (!('offsetParent' in element)) return false;
  const style = getComputedStyle(element);
  if (style.position === 'fixed' || style.position === 'sticky') return false;
  return element.offsetParent === null;
};
const stateful = element => {
  if (typeof classifyType !== 'function') return true;
  return Boolean(classifyType(element)) || element.hasAttribute('aria-pressed') || element.hasAttribute('aria-expanded') ||
    element.hasAttribute('aria-checked') || element.hasAttribute('aria-selected') || element.hasAttribute('role') ||
    element.hasAttribute('tabindex') || element.hasAttribute('data-audit-i') || element.hasAttribute('data-audit-t');
};
const visible = element => {
  if (!element || element.nodeType !== 1) return false;
  const tag = String(element.tagName || '').toUpperCase();
  if (tag === 'HTML' || tag === 'BODY') return true;
  /* The attribute test is an interaction-scope rule, not a paint rule: aria-hidden removes a node
     from the accessibility tree, not from the eye, and the surface, baseline and heading probes read
     what the eye sees. It is applied where "the reader cannot reach or act on it" is the claim being
     tested — controls that carry state, are focusable, or are classified as an interactive type. */
  if (stateful(element) && (hiddenByAttribute(element) || inertScope(element))) return false;
  if (unboxed(element)) return false;
  if (typeof element.checkVisibility === 'function') {
    try {
      if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    } catch {}
  }
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
  if (rect && (rect.width <= 0 || rect.height <= 0)) return false;
  return true;
};
const SNAP_PROPS = ['color','backgroundColor','backgroundImage','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor','outlineStyle','outlineWidth','boxShadow','textShadow','transform','opacity','filter','fontWeight','letterSpacing','textDecorationLine'];
const snapOf = (style, matrix) => {
  const out = {};
  for (const name of SNAP_PROPS) out[name] = String(style[name] ?? '');
  if (matrix && matrix !== 'none') { const m = new DOMMatrix(matrix); out.a = m.a; out.d = m.d; out.e = m.e; out.f = m.f; }
  else { out.a = 1; out.d = 1; out.e = 0; out.f = 0; }
  return out;
};
const snapElement = element => {
  const self = getComputedStyle(element);
  const before = snapOf(getComputedStyle(element, '::before'));
  const after = snapOf(getComputedStyle(element, '::after'));
  /* The tr object rides beside the zones, never inside them: snapshotDiff and pressChannels only walk
     self/before/after, and a property that describes how fast a value moves is not evidence that a
     channel moved. The held read needs the declared transition of the element it is pressing in order
     to size its own deadline, so the rest snapshot carries it instead of the driver guessing a constant. */
  return { self: snapOf(self, self.transform), before, after,
    tr: { transitionDuration: String(self.transitionDuration ?? ''), transitionDelay: String(self.transitionDelay ?? '') } };
};
/* Press anatomy: whether a press owes a visible response is a question about the object, which the
 * ownership table settles — a link that is the whole of a list item, or that sits inside a declared
 * navigation region, owes the press (interaction-states.md:28), while a link with text around it in
 * the same block does not owe displacement and answers through the text instead
 * (interaction-states.md:29). The test reads computed paint and the declared region, never a class
 * name, so it survives a rename. */
const boxPaint = element => {
  const style = getComputedStyle(element);
  const background = String(style.backgroundColor || '');
  const transparent = background === 'transparent' || /^rgba\\(\\s*0,\\s*0,\\s*0,\\s*0(\\.0+)?\\)$/.test(background);
  const painted = !transparent || String(style.backgroundImage || 'none') !== 'none' ||
    String(style.boxShadow || 'none') !== 'none';
  const bordered = ['Top', 'Right', 'Bottom', 'Left'].some(side =>
    (parseFloat(style['border' + side + 'Width']) || 0) > 0 && String(style['border' + side + 'Style']) !== 'none');
  const padding = ['Top', 'Right', 'Bottom', 'Left'].reduce((sum, side) => sum + (parseFloat(style['padding' + side]) || 0), 0);
  return { painted, bordered, padding, ownBox: painted || bordered };
};
const proseHost = element => (element.closest ? element.closest('p, dd, blockquote, li, td') : null) || null;
/* A nav list and a prose list share the li tag, so the tag alone cannot say whether the link inside
   is read or aimed at. The document has already answered that by naming the region, so a link inside
   declared navigation is never prose — without this, every nav written as ul > li > a would be excused
   by exactly the exemption that the ownership table's first row holds to a press. */
const navRegion = element => (element.closest ? element.closest('nav, [role="navigation"], [role="menu"], [role="menubar"], [role="tablist"]') : null) || null;
const pressClassOf = element => {
  const style = getComputedStyle(element);
  const tag = String(element.tagName || '').toUpperCase();
  /* Two more exemptions the object itself declares. A control clipped out of view until it takes
   * focus (the skip link) is a keyboard affordance: nothing is ever pressed on it, so demanding a
   * press channel from it is inventing a rule. And an input, select or textarea that still carries
   * its native appearance answers the press with platform-drawn pixels — a native checkbox really
   * does respond under the thumb, and computed style simply cannot see it. Both are rows, never
   * findings. */
  if (String(style.clipPath || 'none') !== 'none' || String(style.webkitClipPath || 'none') !== 'none') return 'clipped';
  const appearance = String(style.appearance || style.webkitAppearance || '');
  if ((tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') && appearance && appearance !== 'none') return 'native-widget';
  const box = boxPaint(element);
  if (box.ownBox) return 'control-box';
  if (proseHost(element) && !box.padding && !navRegion(element)) return 'prose-link';
  return 'inline-link';
};
/* The nearest styled ancestor: a card that lifts when the title link inside it is pressed is a
 * legitimate response — interaction-states.md:49 and visual-direction.md both say only the inner
 * layer may move, so the answer can live one box out from the text that was pressed. */
const styledHostOf = element => {
  let node = element.parentElement;
  for (let depth = 0; node && node.nodeType === 1 && depth < 8; depth += 1) {
    if (boxPaint(node).ownBox) return node;
    node = node.parentElement;
  }
  return null;
};
const selectorPath = element => {
  const parts = [];
  let node = element;
  for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth += 1) {
    let name = node.tagName.toLowerCase();
    if (node.id) name += '#' + node.id;
    const classes = (typeof node.className === 'string' ? node.className : '').trim().split(/\\s+/).filter(Boolean).slice(0, 2);
    if (classes.length) name += '.' + classes.join('.');
    parts.unshift(name);
    node = node.parentElement;
  }
  return parts.join(' > ');
};
`;

/**
 * Runs inside the page at one viewport. Returns raw measurements for probes 1-4 and the
 * selector-evidence half of probe 5, plus the interactive inventory the interaction driver needs.
 * Never called with closures: everything it knows arrives in `options`, all patterns as strings.
 */
export function measureCraftProbes(options) {
  const classify = new Function(options.classifySource +
    '\nreturn { classifyType, visible, snapElement, inertScope, hiddenByAttribute, pressClassOf, styledHostOf, selectorPath, boxPaint };')();
  const selectorOf = element => {
    const parts = [];
    let node = element;
    for (let depth = 0; node && node.nodeType === 1 && depth < 3; depth += 1) {
      let name = node.tagName.toLowerCase();
      if (node.id) name += '#' + node.id;
      const classes = (typeof node.className === 'string' ? node.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (classes.length) name += '.' + classes.join('.');
      parts.unshift(name);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };
  const round = (value, digits = 1) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;

  /* Probe 1 — sibling baseline drift. Group same-signature children of one container, split them
     into rendered rows by their own top edge, and compare each comparable part's top within every
     row of two or more siblings. A stacked single-column set is excluded: at 390 the ragged-edge
     argument applies to heights, not baselines, and the reference itself excuses the baseline one
     there. */
  const partPatterns = options.partPatterns;
  const siblingGroups = [];
  const all = Array.prototype.slice.call(document.querySelectorAll('body *'), 0, 4000);
  for (const container of all) {
    if (siblingGroups.length >= 30) break;
    const kids = Array.prototype.slice.call(container.children);
    if (kids.length < 2 || kids.length > 12) continue;
    const signature = node => node.tagName.toLowerCase() + '|' +
      (typeof node.className === 'string' ? node.className : '').trim().split(/\s+/).sort().join(' ');
    const bySignature = new Map();
    for (const kid of kids) {
      if (!classify.visible(kid)) continue;
      const rect = kid.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const key = signature(kid);
      (bySignature.get(key) ?? bySignature.set(key, []).get(key)).push({ node: kid, rect });
    }
    for (const [key, members] of bySignature) {
      if (members.length < 2) continue;
      const rows = [];
      for (const member of members) {
        const row = rows.find(candidate => Math.abs(candidate.top - member.rect.top) <= 8);
        if (row) { row.items.push(member); row.top = (row.top * (row.items.length - 1) + member.rect.top) / row.items.length; }
        else rows.push({ top: member.rect.top, items: [member] });
      }
      const multiRows = rows.filter(row => row.items.length >= 2);
      if (!multiRows.length) continue;
      const roleOf = node => node.tagName.toLowerCase() + '|' +
        (typeof node.className === 'string' ? node.className : '').trim().split(/\s+/).sort().join(' ') +
        '|' + String(node.getAttribute('role') || '') + '|' + (node.hasAttribute('href') ? 'href' : 'no-href');
      const findParts = kid => {
        const found = {};
        /* SVG geometry is excluded from the part search. A chart line, bar or polyline is placed by its
           data, not by the layout the anatomy rule governs, and its className is an SVGAnimatedString,
           so the matcher's string tests read every polyline as the same anonymous part. That is how a
           Signal scrub chart reported its own data points as four siblings that failed to share a
           baseline. Inside a `ul` whose rows contain an inline SVG icon, the HTML parts are still found. */
        const isHtml = node => node.namespaceURI === 'http://www.w3.org/1999/xhtml';
        for (const [part, pattern] of Object.entries(partPatterns)) {
          const regexp = new RegExp(pattern, 'i');
          const candidates = Array.prototype.slice.call(kid.querySelectorAll('a[href], button, [class], [role]')).filter(isHtml);
          let hit = candidates.find(node => regexp.test(String(typeof node.className === 'string' ? node.className : '') + ' ' + String(node.getAttribute('role') || '')));
          let matchedBy = 'class or role pattern';
          if (!hit && part === 'action') {
            const links = candidates.filter(node => !node.closest('[aria-expanded]') && String(node.textContent || '').trim().length <= 40);
            hit = links[links.length - 1];
            matchedBy = 'fallback last link';
          }
          if (hit && classify.visible(hit)) found[part] = {
            top: hit.getBoundingClientRect().top - kid.getBoundingClientRect().top,
            role: roleOf(hit), matchedBy, partSelector: selectorOf(hit)
          };
        }
        return found;
      };
      /* Same-role comparison, fix 3. A part name from the vocabulary ("action") is not one role: inside
         one card the action slot can be filled by a styled link, by a button, or by the fallback
         last link, and the last two are different parts of the anatomy. The worst delta that mixes
         them is an artefact of the matcher, not a ragged baseline — a 186px "worst" on one container
         is two different roles measured against each other. So: bucket the hits inside one row by the
         matched node's own role signature, compare only within a bucket, and report each bucket. */
      const partsReport = {};
      const roleStats = {};
      for (const row of multiRows) {
        const tops = row.items.map(item => ({ selector: selectorOf(item.node), found: findParts(item.node) }));
        for (const part of Object.keys(partPatterns)) {
          const byRole = new Map();
          for (const entry of tops) {
            const hit = entry.found[part];
            if (!hit || !Number.isFinite(hit.top)) continue;
            const group = byRole.get(hit.role) ?? byRole.set(hit.role, { role: hit.role, matchedBy: hit.matchedBy, members: [] }).get(hit.role);
            group.members.push({ selector: entry.selector, partSelector: hit.partSelector, top: hit.top });
          }
          const stat = roleStats[part] ?? (roleStats[part] = { roleCount: 0, compared: 0, skippedSingletons: 0 });
          stat.roleCount += byRole.size;
          for (const group of byRole.values()) {
            if (group.members.length < 2) { stat.skippedSingletons += 1; continue; }
            stat.compared += 1;
            const values = group.members.map(member => member.top);
            const spread = Math.max.apply(null, values) - Math.min.apply(null, values);
            const entry = {
              role: group.role, matchedBy: group.matchedBy, rowCount: group.members.length,
              tops: values.map(value => round(value + row.top)), delta: round(spread),
              memberSelectors: group.members.map(member => member.partSelector), rolesInRow: byRole.size
            };
            const bucket = partsReport[part] ?? (partsReport[part] = { worst: entry, rows: [] });
            bucket.rows.push(entry);
            if (entry.delta > bucket.worst.delta) bucket.worst = entry;
          }
        }
      }
      const parts = Object.entries(partsReport).filter(([, value]) => value.worst.delta !== null).map(([part, value]) => ({
        part, role: value.worst.role, matchedBy: value.worst.matchedBy,
        deltaPx: value.worst.delta, tops: value.worst.tops.slice(0, 6), rowsCompared: value.worst.rowCount,
        comparedParts: value.worst.memberSelectors.slice(0, 6),
        rowDeltas: value.rows.map(row => row.delta).filter(row => row !== null),
        roleBucketsCompared: value.rows.length,
        distinctRolesMatched: roleStats[part]?.roleCount ?? 0,
        roleBucketsSkippedAsSingletons: roleStats[part]?.skippedSingletons ?? 0
      }));
      if (parts.length) siblingGroups.push({ container: selectorOf(container), memberCount: members.length, rows: multiRows.length, parts });
    }
  }

  /* Probe 2 — heading size inversion, fix 4: the two numbers alone are not evidence. Record what the
     two elements actually are — tag, classes, id, the selector path and the text — so the report can
     say `.page-title` against a section heading without the reader opening the stylesheet. Only
     headings the reader reaches count: on a route that ships every case statically, the largest h2
     in the DOM can belong to a case that is display:none on this route. */
  const headingFont = node => node ? round(parseFloat(getComputedStyle(node).fontSize), 2) : null;
  const headingIdentity = node => {
    const classes = (typeof node.className === 'string' ? node.className : '').trim().split(/\s+/).filter(Boolean);
    return {
      tag: node.tagName.toLowerCase(), classText: classes.join(' '), classSelector: classes.length ? '.' + classes.join('.') : '',
      id: node.id || null, selector: selectorOf(node)
    };
  };
  const h1 = document.querySelector('h1');
  const h2s = Array.prototype.slice.call(document.querySelectorAll('h2')).filter(node => classify.visible(node));
  const h2sHidden = Array.prototype.slice.call(document.querySelectorAll('h2')).length - h2s.length;
  const h3s = Array.prototype.slice.call(document.querySelectorAll('h3')).filter(node => classify.visible(node));
  const headings = {
    h1: h1 ? { sizePx: headingFont(h1), text: String(h1.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48), ...headingIdentity(h1) } : null,
    h2s: h2s.map(node => ({
      sizePx: headingFont(node), text: String(node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), ...headingIdentity(node)
    })),
    h2HiddenExcluded: h2sHidden,
    largestH3SizePx: h3s.length ? Math.max.apply(null, h3s.map(node => headingFont(node) || 0)) : null
  };

  /* Probe 3 — table fit and affordance. */
  const tables = [];
  for (const table of document.querySelectorAll('table')) {
    let container = table.parentElement, scroller = null;
    while (container) {
      const overflowX = getComputedStyle(container).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') { scroller = container; break; }
      container = container.parentElement;
    }
    const frame = scroller || table.parentElement || table;
    const frameRect = frame.getBoundingClientRect();
    const headers = Array.prototype.slice.call(table.querySelectorAll('thead th, thead td')).length
      ? Array.prototype.slice.call(table.querySelectorAll('thead th'))
      : Array.prototype.slice.call(table.querySelectorAll('tr th'));
    const cut = headers.filter(node => {
      if (!classify.visible(node)) return false;
      const right = node.getBoundingClientRect().right;
      return right > frameRect.right + 1 && node.getBoundingClientRect().left < frameRect.right - 1;
    }).map(node => ({ text: String(node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30), rightBeyondPx: round(node.getBoundingClientRect().right - frameRect.right) }));
    const caption = table.querySelector('caption');
    let edgeCue = null;
    const cueHost = scroller ? [scroller, scroller.parentElement].filter(Boolean) : [table.parentElement].filter(Boolean);
    for (const host of cueHost) {
      const nodes = Array.prototype.slice.call(host.querySelectorAll('*'), 0, 300);
      for (const node of (scroller ? nodes.concat([scroller]) : nodes)) {
        const style = getComputedStyle(node);
        const paint = [style.backgroundImage, style.maskImage || style.webkitMaskImage].filter(value => value && value !== 'none');
        const pseudo = ['::before', '::after'].map(pseudoName => {
          const value = getComputedStyle(node, pseudoName);
          return (value.backgroundImage !== 'none' || (value.maskImage && value.maskImage !== 'none') || Number(value.opacity) > 0.05) ? value.backgroundImage : null;
        }).filter(Boolean);
        const hasStep = paint.some(value => /gradient/.test(value)) || pseudo.some(value => /gradient/.test(String(value)));
        if (!hasStep) continue;
        const rect = node.getBoundingClientRect();
        const nearRightEdge = rect.right >= frameRect.right - 64 && rect.left <= frameRect.right + 8 && rect.height > 8;
        const nearLeftEdge = rect.left <= frameRect.left + 64 && rect.right >= frameRect.left - 8 && rect.height > 8;
        if (Number(style.opacity) <= 0.05 && !pseudo.length) continue;
        if (nearRightEdge || nearLeftEdge) { edgeCue = { selector: selectorOf(node), paint: paint.concat(pseudo)[0].slice(0, 80), side: nearRightEdge ? 'right' : 'left' }; break; }
      }
      if (edgeCue) break;
    }
    const keyboardReachable = Boolean(
      (scroller && scroller.hasAttribute('tabindex') && Number(scroller.getAttribute('tabindex')) >= 0) ||
      (scroller && scroller.hasAttribute('role')) ||
      (scroller && (scroller.hasAttribute('aria-label') || scroller.hasAttribute('aria-labelledby'))) ||
      (table.hasAttribute('tabindex') && Number(table.getAttribute('tabindex')) >= 0)
    );
    const overflowing = round(table.scrollWidth) > round(scroller ? scroller.clientWidth : (frame.clientWidth || frameRect.width)) + 1;
    tables.push({
      selector: selectorOf(table), scrollerFound: Boolean(scroller),
      tableScrollWidthPx: round(table.scrollWidth), frameClientWidthPx: round(scroller ? scroller.clientWidth : frame.clientWidth || frameRect.width),
      overflowing, headerCount: headers.length, cutHeaders: cut,
      affordance: { edgeCue, keyboardReachable, caption: caption ? String(caption.textContent || '').trim().slice(0, 60) : null },
      complete: Boolean(edgeCue) && keyboardReachable
    });
  }

  /* Probe 4 — raw shadow inventory: the computed string per raised element, grouped by surface
     class, so the parser and the verdicts live in node where tests can reach them. */
  const shadows = [];
  const shadowSeen = new Map();
  for (const node of all) {
    if (shadows.length >= 200) break;
    const value = getComputedStyle(node).boxShadow;
    if (!value || value === 'none') continue;
    if (!classify.visible(node)) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    const classKey = node.tagName.toLowerCase() + '|' +
      (typeof node.className === 'string' ? node.className : '').trim().split(/\s+/).sort().slice(0, 3).join(' ');
    if (shadowSeen.has(value + '::' + classKey)) { shadowSeen.get(value + '::' + classKey).count += 1; continue; }
    const record = { value, classKey, selector: selectorOf(node), count: 1, backgroundColor: getComputedStyle(node).backgroundColor };
    shadowSeen.set(value + '::' + classKey, record);
    shadows.push(record);
  }

  /* Probe 5, selector half — does any CSSOM rule change a visible property for this type under
     this state token? Weaker evidence than a computed diff, and the report says so. */
  const stateTokens = {
    hover: [':hover'], 'focus-visible': [':focus-visible'], focus: [':focus'], active: [':active'],
    disabled: ['[disabled', '[aria-disabled', ':disabled'], expanded: ['[aria-expanded'], busy: ['[aria-busy']
  };
  const visiblePropertyPattern = new RegExp('^(' + options.visibleProps.join('|') + ')', 'i');
  const rulesByCell = {};
  let sheetRuleCount = 0, inaccessibleSheets = 0;
  const typeElements = {};
  const hiddenInstances = {};
  const interactive = [];
  const countExcluded = (type, reason) => {
    const row = hiddenInstances[type] ?? (hiddenInstances[type] = { count: 0, notRendered: 0, zeroArea: 0, inert: 0, attributeHidden: 0 });
    row.count += 1; row[reason] += 1;
  };
  for (const node of all) {
    const type = classify.classifyType(node);
    if (!type) continue;
    // Scoped to what the reader reaches, and the excluded count is kept: the denominators are the
    // evidence that a NOT-FOUND is a scoping result and not a probe that forgot to look. Inert is one
    // of the three exclusion reasons now — a control the author switched off is not a component
    // shipped at rest, and it must still show up in the denominator.
    if (!classify.visible(node)) {
      countExcluded(type, classify.inertScope(node) ? 'inert' : classify.hiddenByAttribute(node) ? 'attributeHidden' : 'notRendered');
      continue;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) { countExcluded(type, 'zeroArea'); continue; }
    (typeElements[type] ?? (typeElements[type] = [])).push(node);
    if (interactive.length < 60) interactive.push({ type, selector: selectorOf(node), hasExpanded: node.hasAttribute('aria-expanded'), hasBusy: node.hasAttribute('aria-busy'), disabledAttribute: Boolean(node.disabled) || node.getAttribute('aria-disabled') === 'true' });
  }
  const toggleScope = { visible: 0, hidden: 0, inert: 0, byStateAttribute: {}, byType: {} };
  for (const node of document.querySelectorAll('[aria-pressed],[aria-expanded],[aria-checked],[aria-selected],[role="switch"],[role="tab"],input[type="checkbox"],input[type="radio"]')) {
    if (!classify.visible(node)) {
      toggleScope.hidden += 1;
      if (classify.inertScope(node)) toggleScope.inert += 1;
      continue;
    }
    toggleScope.visible += 1;
    const type = classify.classifyType(node) || String(node.getAttribute('role') || node.tagName.toLowerCase());
    toggleScope.byType[type] = (toggleScope.byType[type] ?? 0) + 1;
    for (const attr of ['aria-pressed', 'aria-expanded', 'aria-checked', 'aria-selected']) {
      if (node.hasAttribute(attr)) toggleScope.byStateAttribute[attr] = (toggleScope.byStateAttribute[attr] ?? 0) + 1;
    }
  }
  /* Per-instance state resolution — the sampling bug this pass exists to fix. One sample per type
     meant the cell for link/hover was scored against the first anchor in the DOM, a nav link, while
     `.case-contents a:hover` sat in the stylesheet matching a different instance of the same type;
     the rule fired 30 findings on the largest count of any probe, and a check that cries wolf on the
     biggest number is worse than no check. Every visible instance of the type is now tested, up to a
     stated cap, and a cell records how many instances were tested, how many answered, and which
     selector resolved it. When the cap truncates the set the cell says so: a partial sample must
     never read as full coverage. */
  const instanceCap = Math.max(1, Math.min(Math.round(Number(options.stateInstanceCap) || 12), 24));
  const inspected = Object.entries(typeElements).map(([type, nodes]) => ({
    type, nodes: nodes.slice(0, instanceCap), totalInstances: nodes.length, capHit: nodes.length > instanceCap
  }));
  /* A rule group like `.button:active, .locale-switch:active { … }` owes a base for EVERY piece, not
     only the first: `Element.matches(':active')` is false unless the element is genuinely being
     pressed, so the state token has to come off before the match — and reading only the first piece
     made the probe blind to the rest of the group (this exact bug kept link/active failing on the
     routes whose only pressed anchor is the locale switch). */
  const splitSelectorList = selector => {
    const pieces = [];
    let depth = 0, current = '';
    for (const character of selector) {
      if (character === '(' || character === '[') depth += 1;
      if (character === ')' || character === ']') depth -= 1;
      if (character === ',' && depth <= 0) { pieces.push(current); current = ''; continue; }
      current += character;
    }
    pieces.push(current);
    return pieces.filter(piece => piece.trim());
  };
  const stripState = (selector, tokens) => selector
    .split(/(\[[^\]]*\]|:[\w-]+(?:\([^)]*\))?)/g)
    .map(piece => {
      if (piece.startsWith('[')) {
        const inner = piece.slice(1, -1).trim();
        return tokens.some(token => token.startsWith('[') && inner.startsWith(token.slice(1))) ? '' : piece;
      }
      if (piece.startsWith(':')) {
        const name = piece.split('(')[0];
        return tokens.includes(name) ? '' : piece;
      }
      return piece;
    }).join('').trim();
  for (const sheet of Array.prototype.slice.call(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch { inaccessibleSheets += 1; continue; }
    for (const rule of Array.prototype.slice.call(rules || [])) {
      const selectorText = rule.selectorText || (rule.cssRules ? Array.prototype.slice.call(rule.cssRules).map(inner => inner.selectorText).join(',') : null);
      if (!selectorText || !rule.style) continue;
      sheetRuleCount += 1;
      const changed = Array.prototype.slice.call(rule.style).filter(property => visiblePropertyPattern.test(property.replace(/-/g, '')) || visiblePropertyPattern.test(property));
      if (!changed.length) continue;
      for (const [state, tokens] of Object.entries(stateTokens)) {
        if (!tokens.some(token => selectorText.includes(token))) continue;
        const candidates = splitSelectorList(selectorText).map(piece => stripState(piece, tokens)).filter(Boolean).concat([selectorText]);
        for (const entry of inspected) {
          const hits = [];
          for (let index = 0; index < entry.nodes.length; index += 1) {
            for (const candidate of candidates) {
              const trimmed = candidate.trim();
              if (!trimmed) continue;
              try { if (entry.nodes[index].matches(trimmed)) { hits.push(index); break; } } catch { /* selector the engine cannot test as written */ }
            }
          }
          if (!hits.length) continue;
          const byState = rulesByCell[entry.type] ?? (rulesByCell[entry.type] = {});
          const cell = byState[state] ?? (byState[state] = {
            selectors: [], respondedBy: new Set(), instancesTested: entry.nodes.length,
            totalInstances: entry.totalInstances, capHit: entry.capHit, resolvedBy: null, rulesMatched: 0
          });
          cell.rulesMatched += 1;
          for (const index of hits) cell.respondedBy.add(index);
          if (cell.selectors.length < 4 && !cell.selectors.includes(selectorText.slice(0, 90))) {
            cell.selectors.push(selectorText.slice(0, 90));
            if (!cell.resolvedBy) cell.resolvedBy = {
              selector: selectorText.slice(0, 90),
              instance: classify.selectorPath(entry.nodes[hits[0]]),
              channel: Array.prototype.slice.call(rule.style).filter(property => visiblePropertyPattern.test(property)).slice(0, 3)
            };
          }
        }
      }
    }
  }
  /* Set → count, and name the instances that answered so the reader can open the page and look at
     exactly those elements instead of trusting the cell. */
  const nodesByType = new Map(inspected.map(entry => [entry.type, entry.nodes]));
  for (const [type, states] of Object.entries(rulesByCell)) {
    for (const cell of Object.values(states)) {
      const nodes = nodesByType.get(type) ?? [];
      cell.instancesResponding = cell.respondedBy.size;
      cell.respondingInstances = Array.from(cell.respondedBy).slice(0, 4).map(index => classify.selectorPath(nodes[index]));
      delete cell.respondedBy;
    }
  }
  const typeStats = {};
  for (const [type, nodes] of Object.entries(typeElements)) {
    typeStats[type] = {
      count: nodes.length,
      anyExpanded: nodes.some(node => node.hasAttribute('aria-expanded')),
      anyBusy: nodes.some(node => node.hasAttribute('aria-busy')),
      anyDisabled: nodes.some(node => Boolean(node.disabled) || node.getAttribute('aria-disabled') === 'true'),
      stateInstanceCap: instanceCap,
      instancesTestedForStates: Math.min(nodes.length, instanceCap),
      stateSampleCapHit: nodes.length > instanceCap,
      excludedHiddenCount: hiddenInstances[type]?.count ?? 0,
      excludedNotRendered: hiddenInstances[type]?.notRendered ?? 0,
      excludedZeroArea: hiddenInstances[type]?.zeroArea ?? 0,
      excludedInert: hiddenInstances[type]?.inert ?? 0,
      excludedAttributeHidden: hiddenInstances[type]?.attributeHidden ?? 0
    };
  }
  // A type whose only instances live in a hidden subtree still gets a row, with count 0: that is the
  // difference between "this route has no reachable toggle" and "this route has no toggle at all".
  for (const [type, row] of Object.entries(hiddenInstances)) {
    if (typeStats[type]) continue;
    typeStats[type] = {
      count: 0, anyExpanded: false, anyBusy: false, anyDisabled: false,
      stateInstanceCap: instanceCap, instancesTestedForStates: 0, stateSampleCapHit: false,
      excludedHiddenCount: row.count, excludedNotRendered: row.notRendered, excludedZeroArea: row.zeroArea,
      excludedInert: row.inert, excludedAttributeHidden: row.attributeHidden
    };
  }

  /* The instance selectors themselves travel: a MISS that names the elements it tested is a finding a
     human can disprove by looking at those three nodes, and a MISS that names nothing is a claim. */
  const stateInstances = {};
  for (const entry of inspected) {
    stateInstances[entry.type] = {
      tested: entry.nodes.map(node => classify.selectorPath(node)),
      pressClasses: entry.nodes.map(node => classify.pressClassOf(node)),
      totalInstances: entry.totalInstances, capHit: entry.capHit, cap: instanceCap
    };
  }

  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    siblings: siblingGroups,
    headings,
    tables,
    shadows,
    stateSelectors: rulesByCell,
    stateInstances,
    typeStats,
    toggleScope,
    interactive,
    cssom: { rulesWalked: sheetRuleCount, inaccessibleSheets }
  };
}

/* ---------------------------------------------------- interaction driver -- */

/* Everything below this line runs in node and drives Chrome through the same Devtools client the
   Layer 2 session already uses. The page-side helpers are plain functions serialised with
   Function.prototype.toString, each self-contained (they re-declare the shared classifier through
   CLASSIFY_SOURCE, because a serialised function closes over nothing). */

const pageTargetBox = arg => {
  const node = document.querySelector('[data-audit-i="' + arg.key + '"]');
  if (!node) return null;
  // behavior:'instant' is not cosmetic: motion.css puts `scroll-behavior: smooth` on the route when
  // data-motion is on, which headless Chrome enables by default, so the default scrollIntoView
  // animates for hundreds of milliseconds and the rect read immediately after it is the pre-scroll
  // rect — the pointer then lands on whatever occupies those coordinates, and a real `:active` rule
  // measures as a silent press.
  node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const rect = node.getBoundingClientRect();
  const { snapElement, pressClassOf, styledHostOf, selectorPath } =
    new Function(arg.classify + '\nreturn { snapElement, pressClassOf, styledHostOf, selectorPath };')();
  const host = styledHostOf(node);
  const cx = Math.round(rect.left + rect.width / 2);
  const cy = Math.round(rect.top + rect.height / 2);
  // A press is only evidence about this control if the pointer actually landed on it. elementFromPoint
  // is read at the same coordinates the driver will dispatch to, so an occluded control reports the
  // occluder instead of pretending it was pressed.
  const hit = document.elementFromPoint(cx, cy);
  return {
    cx, cy,
    rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    snap: snapElement(node),
    host: host ? { selector: selectorPath(host), snap: snapElement(host) } : null,
    pressClass: pressClassOf(node), selector: selectorPath(node),
    active: node.matches(':active'),
    hitSelector: hit ? selectorPath(hit) : null,
    hitOnTarget: Boolean(hit) && (hit === node || node.contains(hit)),
    disabled: Boolean(node.disabled) || node.getAttribute('aria-disabled') === 'true',
    attrs: { 'aria-expanded': node.getAttribute('aria-expanded'), 'aria-busy': node.getAttribute('aria-busy'), 'aria-disabled': node.getAttribute('aria-disabled'), 'aria-pressed': node.getAttribute('aria-pressed') }
  };
};

const pageTargetSnap = arg => {
  const node = document.querySelector('[data-audit-i="' + arg.key + '"]');
  if (!node) return null;
  const { snapElement, styledHostOf, selectorPath } =
    new Function(arg.classify + '\nreturn { snapElement, styledHostOf, selectorPath };')();
  const host = styledHostOf(node);
  // `active` travels beside the snapshot: it says whether the UA registered the pointer-down on this
  // node at all, which separates a control that answers by a channel the probe can read from a control
  // whose :active state never fired. It is a top-level field, outside the self/before/after zones, so
  // it cannot invent a visual channel in snapshotDiff or pressChannels.
  return { ...snapElement(node), active: node.matches(':active'), focused: document.activeElement === node, host: host ? { selector: selectorPath(host), snap: snapElement(host) } : null };
};

/* Settle-while-held read, one CDP round-trip. The fixed two-rAF held snapshot this replaces measured
 * rest transform "none" → held transform "matrix(1,0,0,1,0,0)" on examples/alex-lin's `.demo-button`
 * (demos.css:31, translateY(1px) over a 180ms transform transition declared at demos.css:30) and on
 * `.demo-presets button` (styles.css:232-233, scale(.985), transition at demos.css:111): two frames is
 * ~33ms into a 120–180ms transition, so Blink had committed the `:active` recalc — matches(":active")
 * was already true — but the animation had not produced a non-start tick. Three runs of the same
 * command on the same tree reported 6, 8 and 7 CRAFT_PRESS_DELTA violations; a count that drifts by ±1
 * is an unstable read point, not a changing site.
 *
 * The polling therefore happens inside the page (awaitPromise), while the pointer stays down: the
 * snapshot is retaken every frame and resolves once it has been identical for 2 consecutive frames
 * after at least 3 frames, or when the element's own declared transition says it cannot settle any
 * more (deadlineMs, sized by pressSettleDeadlineMs from the rest snapshot), or immediately when
 * matches(":active") goes false — the press was lost, which is a different fact from "it settled and
 * nothing moved" and is reported distinctly. `early` is the frame-2 snapshot, i.e. exactly what the old
 * read saw, so the artefact stays visible in the record after the fix.
 *
 * The stability key is built from the style/geometry zones only (self/before/after plus the host's
 * snap). selector/active/focused are excluded deliberately: the selector path of a node is a constant
 * string, so including it would make every frame "different" and nothing could ever be stable.
 */
const pageTargetSnapSettled = arg => new Promise(resolve => {
  const node = document.querySelector('[data-audit-i="' + arg.key + '"]');
  if (!node) return resolve(null);
  const { snapElement, styledHostOf, selectorPath } =
    new Function(arg.classify + '\nreturn { snapElement, styledHostOf, selectorPath };')();
  const read = () => {
    const host = styledHostOf(node);
    return { ...snapElement(node), active: node.matches(':active'), focused: document.activeElement === node,
      host: host ? { selector: selectorPath(host), snap: snapElement(host) } : null };
  };
  const keyOf = snap => JSON.stringify([snap.self, snap.before, snap.after, snap.host?.snap ?? null]);
  const deadline = Math.max(1, Math.min(4000, Number(arg.deadlineMs) || 300));
  const started = Date.now();
  let previous = null, sameCount = 0, frames = 0, early = null;
  const finish = (snap, outcome) => resolve({
    ...snap, settle: outcome, heldSettleMs: Date.now() - started, heldSettleFrames: frames,
    early: frames >= 2 ? early : snap.self
  });
  const tick = () => {
    const snap = read();
    frames += 1;
    if (frames === 2) early = snap.self;
    // The press vanished under the driver: whatever the pixels say afterwards is not press evidence.
    if (!snap.active) return finish(snap, 'active-lost');
    if (previous && keyOf(previous) === keyOf(snap)) sameCount += 1; else sameCount = 0;
    previous = snap;
    if (sameCount >= 2 && frames >= 3) return finish(snap, 'settled');
    if (Date.now() - started >= deadline) return finish(snap, 'timeout');
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

/* Every visible instance of a type is read, not one representative. The page walks the instances in
 * document order, tags each of the first `perType` with a key, and reports the total it saw, so the
 * driver can state the cap it worked under instead of implying it covered the route. */
const pagePickInstances = options => {
  const classify = new Function(options.classify + '\nreturn { classifyType, visible, pressClassOf, selectorPath };')();
  const totals = new Map();
  const taken = new Map();
  const out = [];
  let next = 0;
  for (const node of document.querySelectorAll('body *')) {
    const type = classify.classifyType(node);
    if (!type) continue;
    const row = totals.get(type) ?? totals.set(type, 0).get(type);
    if (!classify.visible(node)) { totals.set(type, row + 1); continue; }
    totals.set(type, row + 1);
    const count = taken.get(type) ?? 0;
    if (count >= options.perType) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    taken.set(type, count + 1);
    node.setAttribute('data-audit-i', String(next));
    out.push({ key: next, type, index: count, selector: classify.selectorPath(node), pressClass: classify.pressClassOf(node) });
    next += 1;
  }
  return { instances: out, totals: Array.from(totals.entries()).map(([type, count]) => ({ type, count })) };
};

/* One evaluate for a whole batch: the rest snapshot of every instance of a type. The attribute-forceable
 * states (disabled, busy, expanded) cost nothing to widen, so they are resolved over the full batch in
 * a single set/diff/restore cycle instead of on one sample. */
const pageInstancesRead = arg => {
  const { snapElement, pressClassOf, styledHostOf, selectorPath } =
    new Function(arg.classify + '\nreturn { snapElement, pressClassOf, styledHostOf, selectorPath };')();
  return arg.keys.map(key => {
    const node = document.querySelector('[data-audit-i="' + key + '"]');
    if (!node) return null;
    const host = styledHostOf(node);
    return {
      key, selector: selectorPath(node), pressClass: pressClassOf(node),
      snap: snapElement(node), host: host ? { selector: selectorPath(host), snap: snapElement(host) } : null,
      disabled: Boolean(node.disabled) || node.getAttribute('aria-disabled') === 'true',
      attrs: { 'aria-expanded': node.getAttribute('aria-expanded'), 'aria-busy': node.getAttribute('aria-busy'), 'aria-pressed': node.getAttribute('aria-pressed') }
    };
  }).filter(Boolean);
};

const pageInstancesForceAttr = arg => {
  for (const pair of arg.pairs) {
    const node = document.querySelector('[data-audit-i="' + pair.key + '"]');
    if (!node) continue;
    if (pair.value === null) node.removeAttribute(arg.attr); else node.setAttribute(arg.attr, pair.value);
  }
  return true;
};

/* The instance box is re-read immediately before each pointer move: a batch of rects taken once would
 * be stale the moment an earlier instance is scrolled into view, and a pointer moved to a stale
 * coordinate hovers nothing — which is exactly the kind of false MISS this pass is removing. */
const pageInstanceBox = arg => {
  const node = document.querySelector('[data-audit-i="' + arg.key + '"]');
  if (!node) return null;
  // behavior:'instant' is not cosmetic: motion.css puts `scroll-behavior: smooth` on the route when
  // data-motion is on, which headless Chrome enables by default, so the default scrollIntoView
  // animates for hundreds of milliseconds and the rect read immediately after it is the pre-scroll
  // rect — the pointer then lands on whatever occupies those coordinates, and a real `:active` rule
  // measures as a silent press.
  node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const rect = node.getBoundingClientRect();
  return { cx: Math.round(rect.left + rect.width / 2), cy: Math.round(rect.top + rect.height / 2) };
};

const pageTargetSnapForced = arg => {
  const { snapElement, styledHostOf, selectorPath } =
    new Function(arg.classify + '\nreturn { snapElement, styledHostOf, selectorPath };')();
  return arg.keys.map(key => {
    const node = document.querySelector('[data-audit-i="' + key + '"]');
    if (!node) return null;
    const host = styledHostOf(node);
    return { key, snap: snapElement(node), host: host ? { selector: selectorPath(host), snap: snapElement(host) } : null };
  }).filter(Boolean);
};

const pageTargetFocus = arg => {
  const node = document.querySelector('[data-audit-i="' + arg.key + '"]');
  if (!node) return null;
  node.focus({ preventScroll: true });
  return document.activeElement === node;
};

const pageTargetForceAttr = arg => {
  const node = document.querySelector('[data-audit-i="' + arg.key + '"]');
  if (!node) return null;
  if (arg.value === null) node.removeAttribute(arg.attr); else node.setAttribute(arg.attr, arg.value);
  return true;
};

const pageFocusToggle = arg => {
  const node = document.querySelector('[data-audit-t="' + arg.key + '"]');
  if (!node) return null;
  node.focus({ preventScroll: true });
  return document.activeElement === node;
};

const pageBlurActive = () => { const node = document.activeElement; if (node && node.blur) node.blur(); return true; };

const pageToggleInventory = options => {
  const classify = new Function(options.classify + '\nreturn { classifyType, visible, snapElement };')();
  const out = [];
  let next = 0;
  for (const node of document.querySelectorAll('[aria-pressed],[aria-expanded],[aria-checked],[aria-selected],[role="switch"],[role="tab"],input[type="checkbox"],input[type="radio"]')) {
    if (out.length >= options.max) break;
    if (!classify.visible(node)) continue;
    const name = node.getAttribute('aria-label') ||
      (String(node.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
        .map(id => document.getElementById(id)?.textContent || '').join(' ').trim()) ||
      String(node.innerText || node.textContent || node.value || '').trim();
    const label = String(node.innerText || node.textContent || node.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
    node.setAttribute('data-audit-t', String(next));
    /* The group is recorded because a single-select row behaves differently from a lone switch: in a
       row where exactly one member carries the state, re-activating the member that is already on is
       correctly a no-op. Without the container nothing in the record distinguishes that from a dead
       control, and the probe would call the selected member of a working filter a defect. */
    const parent = node.parentElement;
    const group = parent ? parent.tagName.toLowerCase() +
      (typeof parent.className === 'string' && parent.className.trim() ? '.' + parent.className.trim().split(/\s+/)[0] : '') +
      '[' + Array.from(parent.children).filter(child => child.hasAttribute('aria-pressed') ||
        child.hasAttribute('aria-expanded') || child.hasAttribute('aria-checked') || child.hasAttribute('aria-selected')).length + ']'
      : null;
    out.push({
      key: next, type: classify.classifyType(node) || String(node.getAttribute('role') || node.tagName.toLowerCase()),
      stateAttr: node.hasAttribute('aria-pressed') ? 'aria-pressed' : node.hasAttribute('aria-expanded') ? 'aria-expanded'
        : node.hasAttribute('aria-checked') ? 'aria-checked' : node.hasAttribute('aria-selected') ? 'aria-selected'
        : (node.tagName.toLowerCase() === 'input' ? 'checked' : null),
      group,
      selector: node.tagName.toLowerCase() + (typeof node.className === 'string' && node.className.trim() ? '.' + node.className.trim().split(/\s+/)[0] : ''),
      name: name.slice(0, 80), label: label.slice(0, 80)
    });
    next += 1;
  }
  return out;
};

const pageToggleRead = arg => {
  const node = document.querySelector('[data-audit-t="' + arg.key + '"]');
  if (!node) return null;
  const snapElement = new Function(arg.classify + '\nreturn snapElement;')();
  const name = node.getAttribute('aria-label') ||
    (String(node.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
      .map(id => document.getElementById(id)?.textContent || '').join(' ').trim()) ||
    String(node.innerText || node.textContent || node.value || '').trim();
  const rect = node.getBoundingClientRect();
  return {
    name: String(name).slice(0, 80),
    attrs: {
      'aria-pressed': node.getAttribute('aria-pressed'), 'aria-expanded': node.getAttribute('aria-expanded'),
      'aria-checked': node.getAttribute('aria-checked'), 'aria-selected': node.getAttribute('aria-selected'),
      checked: node.tagName.toLowerCase() === 'input' ? String(node.checked) : null
    },
    visual: snapElement(node),
    box: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    hitAreaStable: null
  };
};

const pageToggleBox = arg => {
  const node = document.querySelector('[data-audit-t="' + arg.key + '"]');
  if (!node) return null;
  node.scrollIntoView({ block: 'center', behavior: 'instant' });
  const rect = node.getBoundingClientRect();
  return { cx: Math.round(rect.left + rect.width / 2), cy: Math.round(rect.top + rect.height / 2) };
};

const epsilon = (a, b) => Math.abs(a - b) > 0.01;

/** Names of the properties a snapshot pair disagrees on. transform/opacity are compared as the
 *  numbers the reader perceives (matrix terms), the rest as strings. */
function snapshotDiff(before, after) {
  if (!before || !after) return [];
  const changed = [];
  const zones = [['self', before.self, after.self], ['before', before.before, after.before], ['after', before.after, after.after]];
  for (const [zone, first, second] of zones) {
    if (!first || !second) continue;
    for (const property of Object.keys(first)) {
      const a = first[property], b = second[property];
      if (['a', 'd', 'e', 'f'].includes(property)) { if (epsilon(Number(a), Number(b))) changed.push(zone + '.' + property); continue; }
      if (String(a) !== String(b)) changed.push(zone + '.' + property);
    }
  }
  return changed;
}

/** How long the held read is willing to wait for this element's own transition to finish.
 *  Derived, not guessed: `max(transitionDuration) + max(transitionDelay) + 120ms` of settle, clamped to
 *  [120ms, 700ms] so a `transition: all 5s` page cannot stall the pass. examples/alex-lin declares
 *  `transition: background 0.18s, transform 0.18s` (demos.css:30), which sizes to 300ms and lands the
 *  read on the real held value instead of on the ~33ms identity matrix the two-frame read caught.
 *  300ms is the fallback for a snapshot whose durations cannot be read (no `tr`, `none`, or a
 *  transition shorthand the computed value lists with steps/percentages). */
export function pressSettleDeadlineMs(snapshot) {
  const maxOf = list => {
    const numbers = String(list ?? '').split(',').map(part => {
      const match = /^([\d.]+)(ms|s)$/.exec(part.trim());
      if (!match) return null;
      const value = Number(match[1]);
      return Number.isFinite(value) ? (match[2] === 's' ? value * 1000 : value) : null;
    }).filter(Number.isFinite);
    return numbers.length ? Math.max(...numbers) : null;
  };
  const declared = maxOf(snapshot?.tr?.transitionDuration);
  if (declared === null) return 300;
  const delay = maxOf(snapshot?.tr?.transitionDelay) ?? 0;
  return Math.min(700, Math.max(120, Math.round(declared + delay + 120)));
}

/**
 * Drives one route at one viewport through real input. `send` is the session's bound
 * `devtools.send(method, params, sessionId)`. Resolution evidence is recorded per cell so the
 * matrix says which cells came from a computed diff and which from selector matching alone.
 */
export async function runCraftInteractions(send, options) {
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  /* Every serialised helper gets the classifier source on its argument: module scope does not
     exist inside the page, and the one string that does reach the page is the JSON argument. */
  const withClassify = arg => ({ ...(arg ?? {}), classify: CRAFT_CLASSIFY_SOURCE });
  const evaluate = async (fn, arg, awaitPromise) => {
    const response = await send('Runtime.evaluate', {
      // awaitPromise is what lets one round-trip hold the pointer-down while the page polls frames
      // itself; a Node-side polling loop would need an Input.dispatchMouseEvent per retry and multiply
      // the very round-trips this pass is trying to cut.
      expression: '(' + fn.toString() + ')(' + JSON.stringify(withClassify(arg)) + ')', returnByValue: true,
      awaitPromise: Boolean(awaitPromise)
    });
    if (response.exceptionDetails) throw new Error(String(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text).slice(0, 160));
    return response.result.value;
  };
  /* `button` is not decoration. A CDP mouse press with no explicit button is dispatched as a press of
     button "none", and Blink builds the active chain only for a real button — measured on this
     harness: press+release on a styled button logged no pointerdown/mousedown/click at all while a
     mouseMoved did set :hover, so every `:active` rule on every route was invisible to the pixel
     channel and `matches(":active")` could never be true. Passing button:'left' makes the page see
     the press; see the release site below for why the matching release is deliberately not a click. */
  const mouse = (type, x, y, buttons, button) => send('Input.dispatchMouseEvent', {
    type, x, y, button: button ?? 'none', buttons, clickCount: type === 'mousePressed' ? 1 : 0
  });
  /* A fixed sleep can land inside the frame in which the press was still queued, so a frame-bounded
     wait is the right shape for a settle. It no longer drives the held read: two rAFs is a point in
     time (~33ms), and a 180ms transform transition had not moved by then — that read is now
     pageTargetSnapSettled, which waits for the value to stop changing. Retained for any settle that
     has to happen on the Node side, because the hover path's `sleep` is not frame-aware. */
  const waitFrames = async timeoutMs => {
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: 'Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),' +
        ' new Promise(r => setTimeout(r, ' + timeoutMs + '))])'
    }).catch(() => {});
  };
  const key = async (k, code, text, keyCode) => {
    await send('Input.dispatchKeyEvent', { type: text === undefined ? 'rawKeyDown' : 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  };

  const evidence = {};
  const presses = [];
  const toggleRecords = [];
  const notes = [];
  /* Caps the computed-diff side works under, stated in the output instead of implied by the sample.
     The CSSOM half of a cell resolves against up to 12 instances of the type at no input cost; a
     computed diff needs real input per instance, so hover, focus and press each drive a smaller set.
     A cell that reads "3 of 40 instances driven by a pointer" is honest; a cell that says "tested" and
     means one representative is the bug this pass removes. */
  const clampCount = (value, fallback, min, max) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
  };
  const instanceCaps = {
    hover: clampCount(options.hoverInstanceCap, 6, 1, 12),
    'focus-visible': clampCount(options.focusInstanceCap, 4, 1, 12),
    press: clampCount(options.pressInstanceCap, 3, 1, 12),
    instances: clampCount(options.stateInstanceCap, 12, 1, 12)
  };
  const pick = (await evaluate(pagePickInstances, { perType: instanceCaps.instances })) ?? { instances: [], totals: [] };
  const totals = new Map(pick.totals.map(row => [row.type, row.count]));
  const byType = new Map();
  for (const instance of pick.instances) {
    (byType.get(instance.type) ?? byType.set(instance.type, []).get(instance.type)).push(instance);
  }
  const hostDiff = (restHost, heldHost) => (restHost && heldHost
    ? snapshotDiff(restHost.snap, heldHost.snap).map(name => 'host ' + restHost.selector + ' ' + name) : []);
  const settleHover = Math.min(160, Math.max(60, options.settleMs / 2));
  for (const [type, instances] of byType) {
    const keys = instances.map(instance => instance.key).slice(0, instanceCaps.instances);
    const rest = (await evaluate(pageInstancesRead, { keys })) ?? [];
    const restByKey = new Map(rest.map(entry => [entry.key, entry]));
    const totalInstances = totals.get(type) ?? instances.length;
    const cell = {};
    const record = (state, props, responders, tested, via) => {
      cell[state] = {
        props: props.slice(0, 6), via,
        instancesTested: tested, instancesResponding: responders.length,
        resolvedBy: responders[0] ?? null, allResponders: responders.slice(0, 6),
        instancesTotal: totalInstances, capNote: tested < totalInstances
          ? tested + ' of ' + totalInstances + ' reachable instance(s) driven; cap ' + tested + ' reached, coverage is partial' : null
      };
    };
    // hover — a real pointer move per instance, not a synthesised :hover. The box is re-read before
    // every move because the previous instance was scrolled into view and a stale coordinate hovers
    // nothing at all.
    let hoverTested = 0; let hoverProps = []; const hoverResponders = [];
    for (const instance of instances.slice(0, instanceCaps.hover)) {
      const base = restByKey.get(instance.key);
      if (!base) continue;
      const box = await evaluate(pageInstanceBox, { key: instance.key });
      if (!box) { notes.push('instance ' + type + ' #' + instance.index + ' vanished before the pointer move'); continue; }
      hoverTested += 1;
      await mouse('mouseMoved', box.cx, box.cy, 0);
      await sleep(settleHover);
      const hovered = await evaluate(pageTargetSnap, { key: instance.key });
      const changed = snapshotDiff(base.snap, hovered).concat(hostDiff(base.host, hovered?.host));
      await mouse('mouseMoved', 2, 2, 0);
      await sleep(40);
      if (!changed.length) continue;
      hoverResponders.push(base.selector);
      if (!hoverProps.length) hoverProps = changed;
    }
    if (hoverResponders.length) record('hover', hoverProps, hoverResponders, hoverTested, 'computed diff under a real pointer move');
    // focus-visible — a real Tab press sets the keyboard modality once for the type, then each instance
    // is focused and read in turn.
    await mouse('mouseMoved', 2, 2, 0);
    await key('Tab', 'Tab', undefined, 9);
    let focusTested = 0; let focusProps = []; const focusResponders = [];
    for (const instance of instances.slice(0, instanceCaps['focus-visible'])) {
      const base = restByKey.get(instance.key);
      if (!base) continue;
      const focusedFlag = await evaluate(pageTargetFocus, { key: instance.key });
      const focused = await evaluate(pageTargetSnap, { key: instance.key });
      focusTested += 1;
      const changed = snapshotDiff(base.snap, focused).concat(hostDiff(base.host, focused?.host));
      await evaluate(pageBlurActive, null);
      if (!changed.length || !focusedFlag) continue;
      focusResponders.push(base.selector);
      if (!focusProps.length) focusProps = changed;
    }
    if (focusResponders.length) record('focus-visible', focusProps, focusResponders, focusTested, 'computed diff after a real Tab press set keyboard modality, then programmatic focus (heuristic approximation)');
    // press — every visible channel read while the pointer is held, on the instance itself and on its
    // nearest styled host: a card that lifts when the title link inside it is pressed did answer the
    // press, and interaction-states.md:49 says the inner layer is the one that moves.
    let activeTested = 0; let activeProps = []; const activeResponders = [];
    const sameRect = (a, b) => Boolean(a && b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);
    for (const instance of instances.slice(0, instanceCaps.press)) {
      const base = restByKey.get(instance.key);
      if (!base) continue;
      const prepared = await evaluate(pageTargetBox, { key: instance.key });
      if (!prepared) { notes.push('target ' + type + ' #' + instance.index + ' vanished before measurement'); continue; }
      await mouse('mouseMoved', prepared.cx, prepared.cy, 0);
      await sleep(settleHover);
      // The baseline for a press is the *hovered* rest, not the untouched rest. Measuring from the
      // un-hovered snapshot charges a control's hover response to its press, which is how a filter
      // button could PASS on a background tone that only changed because the pointer arrived.
      const hovered = await evaluate(pageTargetSnap, { key: instance.key });
      if (!hovered) { notes.push('target ' + type + ' #' + instance.index + ' vanished before the press'); continue; }
      await mouse('mousePressed', prepared.cx, prepared.cy, 1, 'left');
      /* Settle while held, inside the page, in one round-trip — see pageTargetSnapSettled for the
         measured signature that forced this: rest transform "none" → held transform
         "matrix(1,0,0,1,0,0)" at ~33ms into a 180ms transform transition (demos.css:30-31), with
         run-to-run CRAFT_PRESS_DELTA counts of 6 / 8 / 7 on the same tree. The deadline comes from the
         hovered rest snapshot's own declared transition, so the wait is the element's, not a constant.
         The release is still moved off-target below, so this is a press and never a click. */
      const held = await evaluate(pageTargetSnapSettled,
        { key: instance.key, deadlineMs: pressSettleDeadlineMs(hovered) }, true);
      const settleOutcome = held?.settle ?? 'not-read';
      const heldEarlyTransform = held?.early?.transform ?? null;
      // What else the frame-2 read had wrong: the properties still moving when the old read took its value.
      const earlyMoving = held?.early ? Object.keys(held.early).filter(property => (
        ['a', 'd', 'e', 'f'].includes(property)
          ? epsilon(Number(held.early[property]), Number(held.self?.[property]))
          : String(held.early[property]) !== String(held.self?.[property])
      )) : [];
      const heldBox = await evaluate(pageTargetBox, { key: instance.key });
      /* The release is moved off the control before it is let go, on purpose. A press that is released
         on its own target is a full click: the fixture link navigated, and a route with delegated
         click handlers would have mutated its own state mid-measurement and poisoned every later
         snapshot. Released away from the target, Blink dispatches the click on the nearest common
         ancestor, so the control sees mousedown (which is what sets :active) and no activation —
         verified on the press fixture: `mousedown` logged, no mouseup/click, document unchanged. */
      await mouse('mouseMoved', 2, 2, 1, 'left');
      await mouse('mouseReleased', 2, 2, 0, 'left');
      const hoverChannels = pressChannels(prepared.snap, hovered);
      const channels = pressChannels(hovered, held);
      const hostChannels = hovered.host && held?.host
        ? pressChannels(hovered.host.snap, held.host.snap).map(channel => ({ ...channel, element: hovered.host.selector })) : [];
      const answered = channels.concat(hostChannels);
      const changed = snapshotDiff(hovered, held).concat(hostDiff(hovered.host, held?.host));
      activeTested += 1;
      if (changed.length) {
        activeResponders.push(prepared.selector ?? base.selector);
        if (!activeProps.length) activeProps = changed;
      }
      // The return-to-identity sweep is a property of the material, not of every instance of a type,
      // and it costs up to 1.5s each: it runs on the first instance of the type only.
      let returnMs = null;
      if (instance.index === 0 && held?.self) {
        const deadline = Date.now() + Math.min(1500, options.settleMs * 2 + 600);
        for (let tick = 0; Date.now() < deadline; tick += 1) {
          await sleep(40);
          const settled = await evaluate(pageTargetSnap, { key: instance.key });
          if (settled && !snapshotDiff(hovered, settled).filter(p => /transform|opacity|filter/.test(p)).length) { returnMs = tick * 40; break; }
        }
        if (returnMs === null) returnMs = 'still displaced after ' + (Math.min(1500, options.settleMs * 2 + 600)) + 'ms';
      }
      presses.push({
        type, instanceIndex: instance.index, pressClass: instance.pressClass,
        selector: (prepared.selector ?? type) + ' box ' + JSON.stringify(prepared.rect),
        elementSelector: prepared.selector ?? null, hostSelector: prepared.host?.selector ?? null,
        answeredBy: channels.length ? 'self' : (hostChannels.length ? hovered.host.selector : null),
        activeApplied: held?.active ?? null,
        // A real press also focuses the node, so a channel a `:focus` rule paints is disclosed here
        // rather than left to look like a press answer.
        focusedWhileHeld: held?.focused ?? null,
        hitOnTarget: prepared.hitOnTarget ?? null, hitSelector: prepared.hitSelector ?? null,
        hoverChannels: hoverChannels.map(channel => channel.summary),
        dx: held && hovered ? Number(((held.self.e ?? 0) - (hovered.self.e ?? 0)).toFixed(2)) : 0,
        dy: held && hovered ? Number(((held.self.f ?? 0) - (hovered.self.f ?? 0)).toFixed(2)) : 0,
        scale: held && hovered ? Number(((held.self.a ?? 1) / (hovered.self.a ?? 1)).toFixed(4)) : 1,
        opacityDelta: held && hovered ? Number(held.self.opacity ?? 1) - Number(hovered.self.opacity ?? 1) : 0,
        filterChanged: held && hovered && String(held.self.filter) !== String(hovered.self.filter),
        channels: answered, channelSummaries: answered.map(channel => channel.kind + ' ' +
          (channel.element ? 'on host ' + channel.element + ': ' : 'on self: ') + channel.summary),
        restRect: prepared.rect, heldRect: heldBox?.rect ?? null, hitAreaStable: sameRect(prepared.rect, heldBox?.rect),
        restTransform: hovered.self.transform, heldTransform: held?.self?.transform, returnMs, skipped: prepared.disabled,
        /* The settle is recorded beside the values so a reader can audit the verdict from the JSON alone:
           heldEarlyTransform is what the fixed two-frame read saw, heldTransform what the settled read
           sees, and settle says which of the three outcomes produced it. A press whose value was still
           moving when the deadline expired is NOT-MEASURABLE, not a silence. */
        settle: settleOutcome, heldSettleMs: held?.heldSettleMs ?? null, heldSettleFrames: held?.heldSettleFrames ?? null,
        heldEarlyTransform, heldEarlyNote: earlyMoving.length
          ? 'the two-frame read point saw ' + JSON.stringify(heldEarlyTransform) + ' but the value was still moving at frame 2 — ' +
            earlyMoving.slice(0, 6).join(', ') + ' differed from the settled held snapshot ' +
            JSON.stringify(held?.self?.transform ?? null) + '. That is the artefact this read replaces, disclosed so a later reader can see it was real.'
          : null,
        pressSampleCapNote: totalInstances > instanceCaps.press
          ? instanceCaps.press + ' of ' + totalInstances + ' reachable instance(s) of this type pressed' : null
      });
      await mouse('mouseMoved', 2, 2, 0);
      await sleep(40);
    }
    if (activeResponders.length) record('active', activeProps, activeResponders, activeTested, 'computed diff while a real pointer is held down');
    // attribute-forceable states are batched: the attribute is set on every instance of the type in one
    // pass, all instances are snapshotted in one pass, and each is restored to the value the reader met.
    const forceable = [];
    if (rest.some(entry => !entry.disabled)) forceable.push(['aria-disabled', 'true', 'disabled']);
    forceable.push(['aria-busy', 'true', 'busy']);
    if (rest.some(entry => entry.attrs['aria-expanded'] !== null)) forceable.push(['aria-expanded', 'toggle', 'expanded']);
    for (const [attr, value, state] of forceable) {
      const pairs = keys.map(key => ({
        key,
        value: attr === 'aria-expanded'
          ? (restByKey.get(key)?.attrs['aria-expanded'] === 'true' ? 'false' : 'true')
          : value
      }));
      await evaluate(pageInstancesForceAttr, { attr, pairs });
      await sleep(120);
      const forced = (await evaluate(pageTargetSnapForced, { keys })) ?? [];
      const responders = []; let props = [];
      for (const entry of forced) {
        const base = restByKey.get(entry.key);
        if (!base) continue;
        const changed = snapshotDiff(base.snap, entry.snap).concat(hostDiff(base.host, entry.host));
        if (!changed.length) continue;
        responders.push(base.selector);
        if (!props.length) props = changed;
      }
      await evaluate(pageInstancesForceAttr, {
        attr,
        pairs: keys.map(key => ({ key, value: attr === 'aria-expanded' ? (restByKey.get(key)?.attrs['aria-expanded'] ?? null) : null }))
      });
      if (responders.length) record(state, props, responders, forced.length, 'computed diff with [' + attr + '] set live on all ' + forced.length + ' instance(s)');
    }
    evidence[type] = Object.assign(evidence[type] ?? {}, cell);
    await mouse('mouseMoved', 2, 2, 0);
    await sleep(40);
  }

  const toggles = (await evaluate(pageToggleInventory, { max: 8 })) ?? [];
  for (const toggle of toggles) {
    const before = await evaluate(pageToggleRead, { key: toggle.key });
    const box = await evaluate(pageToggleBox, { key: toggle.key });
    if (!before || !box) { notes.push('toggle ' + toggle.selector + ' could not be boxed'); continue; }
    const record = { ...toggle, before: before.attrs, nameBefore: before.name, visualBefore: before.visual, boxBefore: before.box };
    // real click
    try {
      await mouse('mouseMoved', box.cx, box.cy, 0);
      await mouse('mousePressed', box.cx, box.cy, 1);
      await mouse('mouseReleased', box.cx, box.cy, 0);
      await sleep(Math.max(150, options.settleMs / 2));
      const after = await evaluate(pageToggleRead, { key: toggle.key });
      record.afterClick = after?.attrs ?? null;
      record.nameAfter = after?.name ?? record.nameBefore;
      record.flippedByClick = after ? JSON.stringify(after.attrs) !== JSON.stringify(before.attrs) : false;
      record.visualChangedByClick = after ? snapshotDiff(before.visual.self, after.visual.self).length > 0 : false;
      record.pseudoChangedByClick = after ? snapshotDiff(before.visual, after.visual).some(p => p.startsWith('before.') || p.startsWith('after.')) : false;
      record.boxAfterClick = after?.box ?? null;
      // restore so the keyboard pass starts from the same state the reader met
      if (record.flippedByClick) {
        await mouse('mousePressed', box.cx, box.cy, 1); await mouse('mouseReleased', box.cx, box.cy, 0);
        await sleep(120);
      }
      // keyboard activation: focus it, press Enter (Space only if Enter did nothing)
      await key('Tab', 'Tab', undefined, 9);
      const keyboardFocused = await evaluate(pageFocusToggle, { key: toggle.key });
      if (!keyboardFocused) notes.push('toggle ' + toggle.selector + ' could not take keyboard focus; keyboard pass measures the activation the page routes to the focused element anyway');
      await key('Enter', 'Enter', '\r', 13);
      await sleep(Math.max(150, options.settleMs / 2));
      let keyed = await evaluate(pageToggleRead, { key: toggle.key });
      if (keyed && JSON.stringify(keyed.attrs) === JSON.stringify(before.attrs)) {
        await key(' ', 'Space', ' ', 32);
        await sleep(150);
        keyed = await evaluate(pageToggleRead, { key: toggle.key });
      }
      record.afterKeyboard = keyed?.attrs ?? null;
      record.flippedByKeyboard = keyed ? JSON.stringify(keyed.attrs) !== JSON.stringify(before.attrs) : false;
      if (record.flippedByKeyboard) { await key('Enter', 'Enter', '\r', 13); await sleep(120); }
      record.hitAreaStable = record.boxAfterClick ? JSON.stringify(record.boxAfterClick) === JSON.stringify(before.box) : null;
    } catch (error) { record.clickFailed = String(error?.message ?? error).slice(0, 120); }
    record.stateAttrName = toggle.stateAttr;
    toggleRecords.push(record);
  }
  return {
    evidence, presses, toggles: toggleRecords, notes,
    targets: Array.from(byType.keys()), instanceCaps,
    instancesDriven: pick.instances.length, instanceTotals: pick.totals
  };
}

/* --------------------------------------------------------------- patterns -- */

/* Passed into the serialised page probe as JSON — a serialised function closes over nothing, so the
   class vocabularies travel as strings, the same way Layer 1 hands the phrase-role vocabulary to
   measureRenderedPage. */
export const CRAFT_PART_PATTERNS = {
  action: '(action|cta|more-link|read-more|open|view|detail|follow|source)',
  metadata: '(meta|date|year|info|tags?|role|spec|credit|period)',
  status: '(status|badge|marker|pill|dot|state|live)'
};
export const CRAFT_VISIBLE_PROPS = ['color', 'background', 'border', 'outline', 'boxshadow', 'textdecor', 'fontweight', 'opacity', 'transform', 'filter'];

/* ---------------------------------------------------------- node-side roll -- */

/**
 * Turns one default route's raw measurements (390 pass on the route, plus the 1440/768 craft passes
 * attached as `craftPasses`) into violations and a per-width summary. Pure over the measurement
 * objects: no browser, testable. Findings for probes 5-7 are taken only from the 1440 interaction
 * pass, so one route cannot fail the same matrix twice at two widths.
 */
export function buildCraftFindings(route) {
  const findings = [];
  const passes = [
    { width: 390, craft: route.craft, craftError: route.craftError },
    ...(route.craftPasses ?? []).map(pass => ({
      width: pass.width, craft: pass.craft, craftError: pass.craftError ?? pass.error,
      interactions: pass.interactions, interactionsError: pass.interactionsError
    }))
  ];
  const widths = {};
  for (const pass of passes) {
    if (!pass.craft) {
      widths[pass.width] = { status: 'NOT-RUN', reason: pass.craftError ?? 'the craft probe returned nothing' };
      continue;
    }
    const row = {};
    const sibs = siblingFindings(pass.craft.siblings, pass.width);
    findings.push(...sibs);
    const deltas = pass.craft.siblings.flatMap(group => group.parts.map(part => part.deltaPx)).filter(value => Number.isFinite(value));
    row.siblings = {
      groupsCompared: pass.craft.siblings.length, findings: sibs.length,
      // Fix 3: one maximum over every container on the route is not a measurement anyone can act
      // on — it compares a card footer against a table row and calls the result the worst baseline.
      // The per-container, per-role rows in the findings are the evidence; this is a reading order.
      crossContainerMaxDeltaPx: deltas.length ? Math.max.apply(null, deltas) : null,
      crossContainerMaxIsNotAVerdict: 'spans containers and part roles; read the per-container rows, each of which names its own selector and role',
      containersWithFindings: Array.from(new Set(sibs.map(item => item.containerTag))).sort(),
      status: pass.craft.siblings.length === 0 ? 'NOT-FOUND (no multi-item rendered rows)' : sibs.length ? 'FINDINGS' : 'PASS'
    };
    const head = headingFindings(pass.craft.headings, pass.width);
    findings.push(...head.findings);
    row.headings = {
      status: head.status,
      headingRelation: head.headingRelation ?? null,
      ties: head.findings.filter(item => item.headingRelation === 'tie').length,
      inversions: head.findings.filter(item => item.headingRelation === 'inversion').length,
      h1SizePx: pass.craft.headings.h1?.sizePx ?? null,
      h1Identity: head.h1Identity ?? null,
      largestH2SizePx: head.largestH2 ? head.largestH2.sizePx : null,
      largestH2Identity: head.largestH2Identity ?? null,
      h2Count: pass.craft.headings.h2s.length,
      h2HiddenExcluded: pass.craft.headings.h2HiddenExcluded ?? 0,
      ruleReading: 'component-anatomy.md:50 requires the h1 to exceed the largest h2, so a tie is a finding; it is labelled separately from an inversion because they are different defects',
      scopeNote: 'h2 sizes are the ones the reader reaches on this route; headings inside a hidden cross-case subtree are excluded and counted'
    };
    const tables = tableFindings(pass.craft.tables, pass.width);
    findings.push(...tables);
    row.tables = {
      status: pass.craft.tables.length === 0 ? 'NOT-FOUND (no table rendered at this width)'
        : tables.length ? 'FAIL' : pass.craft.tables.some(table => table.overflowing) ? 'PASS (scrolls, affordance complete or nothing cut)' : 'PASS (no horizontal overflow)'
    };
    const shadows = shadowFindings(pass.craft.shadows);
    findings.push(...shadows.findings);
    row.shadows = { findings: shadows.findings.length, inventory: shadows.inventory,
      status: shadows.inventory.raisedRecords === 0 ? 'NOT-FOUND (no element with a computed box-shadow)'
        : shadows.findings.length ? 'FAIL' : 'PASS' };
    row.interactiveTypeCounts = pass.craft.typeStats;
    row.stateInstanceSample = {
      cap: Object.values(pass.craft.typeStats ?? {})[0]?.stateInstanceCap ?? null,
      note: 'the CSSOM half of every state cell is resolved against every visible instance of the type up to this cap; a type whose instance count exceeds it says capHit on the cell',
      perType: pass.craft.stateInstances ?? null
    };
    if (pass.interactions) {
      const matrix = stateMatrix(pass.craft.stateSelectors, pass.interactions.evidence, pass.craft.typeStats, pass.craft.stateInstances);
      findings.push(...matrix.findings);
      row.stateMatrix = matrix.ran
        ? {
            status: matrix.findings.length ? 'FAIL' : 'PASS', cells: matrix.matrix, scopedTypes: matrix.scoped,
            excludedHiddenByType: matrix.excluded,
            exemptByOwnership: matrix.exempt ?? {},
            ownershipNote: 'cells cleared by the state-ownership table at interaction-states.md:26-33 are named here with their reason — a scroll region owes no hover, a text field owes no press, and a native select\'s own chrome is not readable by this instrument. An exemption is a ruling a reader can disagree with, never a silent pass.',
            instanceCaps: pass.interactions.instanceCaps ?? null,
            resolutionNote: 'a cell passes when any tested instance answered — on the CSSOM channel or under real input — and names the instance and the selector or property that resolved it'
          }
        : { status: 'NOT-FOUND (no interactive type reachable on this route)', cells: matrix.matrix, excludedHiddenByType: matrix.excluded };
      row.stateMatrixEvidenceNote = 'cells with rules>0 and no computedDiff rest on selector matching, which is weaker evidence than a diff; a type with 0 reachable instances is NOT-FOUND with its excluded count, never a MISS; capHit on a cell means the sample was truncated and must not be read as full coverage';
      // A silent press is only a defect when nothing else vouches for the state. The raw CSSOM walk kept
      // the `:active` rule texts and the instances each rule matched, so the press verdict consults that
      // receipt rather than the matrix cell — the cell's own `resolvedBy` names whichever channel was
      // strongest, which is often the computed diff and carries no selector at all.
      const activeSupportFor = (type, selector) => {
        const cell = (pass.craft.stateSelectors ?? {})[type]?.active;
        if (!cell) return null;
        const ruleText = (cell.selectors ?? [])[0] ?? null;
        if (!ruleText) return null;
        if (selector && (cell.respondingInstances ?? []).includes(selector)) return ruleText;
        const tested = cell.instancesTested ?? 0;
        return tested > 0 && (cell.instancesResponding ?? 0) === tested ? ruleText : null;
      };
      const press = pressFindings(pass.interactions.presses, activeSupportFor);
      findings.push(...press.findings);
      const neverActive = press.rows.filter(row => row.activeApplied === false).length;
      const pressedControls = press.rows.filter(row => row.pressCapable &&
        (row.pressClass === 'control-box' || row.pressClass === 'inline-link')).length;
      const answeredBySelectorOnly = press.rows.filter(row => row.pressEvidence?.startsWith('CSSOM')).length;
      const unanswered = press.rows.filter(row => row.pressCapable && !row.moved && !row.skipped);
      /* The honest third state. A pass in which not one control reported matches(":active") cannot
         claim the press dimension was verified: every silent row in it was excused by a CSSOM rule the
         probe never got to exercise, and `violations: 0` in that situation is a statement about the
         instrument. FAIL still wins (a defect is a defect), a pass that did register the state still
         reads PASS, and this case reads NOT-MEASURABLE with its count and its reason — published, never
         counted as a site violation. Same rule the native-select hover cell follows. */
      const registeredActive = press.rows.filter(row => row.activeApplied === true).length;
      /* A second instrument limit beside the never-:active one: a press whose held value was still
         moving when the element's own declared transition said it should have finished (or whose
         :active was lost mid-read). The read never reached a stable held state, so the silence says
         nothing about the stylesheet — it is published as NOT-MEASURABLE with the count and the reason,
         added to no violation total, and it can never be read as a pass. */
      const heldNotSettled = press.rows.filter(row => row.notMeasurable);
      const pressUnverifiable = press.findings.length === 0 && registeredActive === 0;
      const pressReason = 'none of the ' + press.rows.length + ' press(es) driven on this route registered matches(":active"), ' +
        'so no :active rule was ever exercised and this instrument cannot say whether a press displaces the control — ' +
        neverActive + ' silent row(s) were excused by a CSSOM rule the probe could not drive. Not a pass: ' +
        'an instrument limit, published rather than counted as a site defect.';
      row.press = press.rows.length
        ? {
            status: press.findings.length
              ? 'FAIL'
              : pressUnverifiable ? 'NOT-MEASURABLE (' + neverActive + ' press(es) excused, 0 registered :active)'
                : heldNotSettled.length ? 'NOT-MEASURABLE (' + heldNotSettled.length +
                  ' press(es) whose held value never settled, reported below with the reason)' : 'PASS',
            controls: press.rows,
            demanded: pressedControls,
            activeStateNeverRegistered: neverActive,
            controlsRegisteringActive: registeredActive,
            heldNotSettled: heldNotSettled.length,
            notMeasurableReason: (pressUnverifiable ? pressReason : null) ??
              (heldNotSettled.length ? heldNotSettled.map(row => row.selector + ' — ' + row.notMeasurable).join(' | ') : null),
            answeredBySelectorMatchOnly: answeredBySelectorOnly,
            activeStateNote: pressedControls
              ? 'of ' + pressedControls + ' control-box press(es) measured on this route, ' + neverActive +
                ' reported matches(":active") false while held; where a CSSOM :active rule matched that instance the row is downgraded to selector-match evidence and is not called a defect, because the instrument cannot exercise that state here — the claim is about the probe, not about the site'
              : null,
            answeredByHost: press.rows.filter(row => row.answeredBy && row.answeredBy !== 'self').length,
            unansweredByClass: unanswered.reduce((counts, row) => Object.assign(counts, { [row.pressClass]: (counts[row.pressClass] ?? 0) + 1 }), {}),
            channelNote: 'a press passes on any visible channel it owns — displacement, tone or edge, on the control or on its nearest styled host; only total silence on a control that owns a box fails, and an inline or prose link is reported without being demanded'
          }
        : { status: 'NOT-FOUND (no reachable press-capable control measured)', excludedHiddenByType: matrix.excluded };
      const nameState = nameStateFindings(pass.interactions.toggles);
      findings.push(...nameState);
      const scope = pass.craft.toggleScope ?? { visible: 0, hidden: 0 };
      row.nameState = {
        status: pass.interactions.toggles.length === 0
          ? 'NOT-FOUND (no toggle/disclosure/tab/selectable control reachable on this route)' : nameState.length ? 'FAIL' : 'PASS',
        exemptBySingleSelect: nameState.exemptBySingleSelect ?? [],
        singleSelectNote: 'a control that is already the selected member of a row whose other members do flip is doing its job when a re-click changes nothing; the exemption names the group and how many of its members answered, so a dead row still fails',
        measured: pass.interactions.toggles.length,
        reachableInstances: scope.visible ?? 0,
        excludedHiddenInstances: scope.hidden ?? 0,
        excludedInertInstances: scope.inert ?? 0,
        reachableByStateAttribute: scope.byStateAttribute ?? {},
        scopeNote: 'state-bearing controls inside a hidden or aria-hidden subtree, or inside an inert one, belong to a case this route is not showing or to a control the author switched off; they are counted as excluded instead of clicked',
        rows: (pass.interactions.toggles ?? []).map(toggle => ({
          selector: toggle.selector, type: toggle.type, stateAttr: toggle.stateAttrName,
          nameBefore: toggle.nameBefore, nameAfter: toggle.nameAfter,
          flippedByClick: toggle.flippedByClick, flippedByKeyboard: toggle.flippedByKeyboard,
          visualChangedByClick: toggle.visualChangedByClick, hitAreaStable: toggle.hitAreaStable
        }))
      };
      row.interactionNotes = pass.interactions.notes;
    } else {
      row.stateMatrix = { status: 'NOT-RUN (interactions only run on the 1440 pass)', selectorEvidence: pass.craft.stateSelectors };
    }
    if (pass.interactionsError) row.interactionsError = pass.interactionsError;
    widths[pass.width] = row;
  }
  return { findings: collapseByDedupe(findings), summary: { route: route.file, executed: passes.filter(pass => Boolean(pass.craft)).length, widths } };
}

/* One defect, one finding. A surface or a container does not change its anatomy when the viewport
   changes, so the same single-layer class reported at three widths is one defect the builder fixes
   once, and the count made the demo look three times worse than it is. Widths are named inside the
   row rather than dropped, because a delta that only exists at 390 is a different claim from one that
   survives every width. Findings without a dedupe key pass through untouched. */
export function collapseByDedupe(findings) {
  const out = [];
  const seen = new Map();
  for (const finding of findings) {
    if (!finding.dedupe) { out.push(finding); continue; }
    const key = finding.code + '|' + finding.dedupe;
    const widthMatch = /At (\d+)px/.exec(finding.message);
    const existing = seen.get(key);
    if (existing) {
      if (widthMatch) existing.sawWidths.push(widthMatch[1]);
      existing.evidence += ' || also at ' + (widthMatch ? widthMatch[1] + 'px' + (finding.evidenceDelta ? ' (delta ' + finding.evidenceDelta + ')' : '') : 'a further width');
      continue;
    }
    const entry = { ...finding, sawWidths: widthMatch ? [widthMatch[1]] : [], widthsCollapsed: 1 };
    seen.set(key, entry);
    out.push(entry);
  }
  for (const entry of out) {
    const widths = entry.sawWidths ?? [];
    if (widths.length > 1 && /^At \d+px,/.test(entry.message)) {
      entry.message = entry.message.replace(/^At \d+px,/, 'At ' + widths.join('px, ') + 'px,');
    }
    entry.widthsCollapsed = widths.length || 1;
    if (entry.widthsCollapsed > 1) {
      entry.message += ' Reported once for ' + entry.widthsCollapsed + ' width pass(es) (' + widths.join(', ') + ') because this is one element class, not one per viewport.';
    }
    delete entry.sawWidths;
    delete entry.dedupe;
  }
  return out;
}

/* ------------------------------------------------------ shadow structure -- */

/** Parse a computed `box-shadow` list into layers. Pure, unit-tested; the in-page probe never
 *  decides anything about this, it only hands back the computed string. Tokenised by position so
 *  both serialisation orders — CSSOM (lengths then colour) and the legacy Gecko one (colour
 *  first) — land in the same structure. */
export function parseShadowLayers(value) {
  const text = String(value ?? '').trim();
  if (!text || text === 'none') return [];
  const parts = [];
  let depth = 0, current = '';
  for (const character of text) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += character;
  }
  parts.push(current);
  return parts.map(part => {
    const layer = { inset: false, x: 0, y: 0, blur: 0, spread: 0, alpha: null, raw: part.trim() };
    const tokens = [];
    let buffer = '', parens = 0;
    for (const character of part.trim()) {
      if (character === '(') parens += 1;
      if (character === ')') parens -= 1;
      if (character === ' ' && parens === 0) { if (buffer) tokens.push(buffer); buffer = ''; continue; }
      buffer += character;
    }
    if (buffer) tokens.push(buffer);
    const lengths = [];
    const rest = [];
    for (const token of tokens) {
      if (token.toLowerCase() === 'inset') { layer.inset = true; continue; }
      if (/^-?(\d+\.?\d*|\.\d+)(px)?$/.test(token)) { lengths.push(Number.parseFloat(token)); continue; }
      rest.push(token);
    }
    const order = ['x', 'y', 'blur', 'spread'];
    for (let index = 0; index < Math.min(lengths.length, 4); index += 1) layer[order[index]] = lengths[index];
    layer.color = rest.join(' ');
    const alpha = /rgba?\([^)]*?,\s*([\d.]+)\s*\)/i.exec(layer.color);
    layer.alpha = alpha ? Number(alpha[1]) : (layer.color ? 1 : null);
    layer.offsetPx = Math.round(Math.hypot(layer.x, layer.y) * 100) / 100;
    layer.ratio = layer.blur > 0 ? Math.round((layer.offsetPx / layer.blur) * 1000) / 1000 : null;
    layer.quadrant = (layer.x === 0 && layer.y === 0) ? 'origin' :
      ((layer.x >= 0 ? '+' : '-') + (layer.y >= 0 ? '+' : '-'));
    return layer;
  }).filter(layer => layer.raw);
}

export function shadowFindings(shadowRecords) {
  const findings = [];
  const notes = [];
  const parsed = shadowRecords.map(record => ({ ...record, layers: parseShadowLayers(record.value) }));
  const distinctRecipes = new Set(parsed.map(record => record.value));
  // surfaces.md counts unique background + box-shadow pairs; the recipe count below uses the same
  // pairing so a shadow recoloured per ground does not masquerade as one system.
  const distinctPairs = new Set(parsed.map(record => record.value + '||' + record.backgroundColor));
  for (const record of parsed) {
    const strongDrop = record.layers.some(layer => !layer.inset && layer.offsetPx >= 2 && layer.blur >= 8);
    const strongInset = record.layers.some(layer => layer.inset && layer.offsetPx >= 2 && layer.blur >= 8);
    if (strongDrop && strongInset) {
      findings.push({
        code: 'CRAFT_SHADOW_INSET', line: 0, dedupe: 'inset|' + record.classKey,
        message: record.classKey + ' carries a strong drop layer and a strong inset layer at once — a hole with a lid on it. ' + record.layers.length + ' layer(s): ' + record.layers.map(layer => (layer.inset ? 'inset ' : '') + layer.x + 'px ' + layer.y + 'px ' + layer.blur + 'px').join(', ') + '.',
        evidence: record.selector + ' | ' + record.value.slice(0, 200)
      });
    }
  }
  const singleLayerClasses = parsed.filter(record => record.layers.length === 1 && distinctPairs.size >= 3);
  for (const record of singleLayerClasses) {
    findings.push({
      code: 'CRAFT_SHADOW_LAYERS', line: 0, dedupe: 'layers|' + record.classKey, evidenceDelta: record.layers.length + ' layer(s)',
      message: record.classKey + ' is a single-layer shadow (' + record.layers[0]?.x + 'px ' + record.layers[0]?.y + 'px blur ' + record.layers[0]?.blur + 'px' + (record.layers[0]?.inset ? ', inset' : '') + ') while this route stacks ' + distinctPairs.size + ' distinct background+shadow surface pairs. A page claiming three-plus raised classes does not get a one-layer card.',
      evidence: record.selector + ' | ' + record.value.slice(0, 200)
    });
  }
  for (const record of parsed) {
    if (record.layers.length < 2) continue;
    const ratios = record.layers.map(layer => layer.ratio);
    const known = ratios.map((ratio, index) => ratio === null ? (record.layers[index].offsetPx === 0 ? 0 : Infinity) : ratio);
    const monotonic = known.every((value, index) => index === 0 || value >= known[index - 1] - 0.001);
    const quadrants = new Set(record.layers.map(layer => layer.quadrant));
    notes.push({
      classKey: record.classKey, selector: record.selector, layers: record.layers.length,
      offsetBlurRatios: ratios, ratiosMonotonic: monotonic, quadrants: Array.from(quadrants),
      insetSplit: record.layers.filter(layer => layer.inset).length + ' inset / ' + record.layers.filter(layer => !layer.inset).length + ' drop',
      structure: record.layers.map(layer => (layer.inset ? 'inset' : 'drop') + ' ' + layer.x + ' ' + layer.y + ' ' + layer.blur + ' ' + layer.spread + ' a' + (layer.alpha ?? '?'))
    });
  }
  return { findings, inventory: {
    raisedRecords: parsed.length, distinctShadowRecipes: distinctRecipes.size, distinctSurfacePairs: distinctPairs.size,
    singleLayerRecords: parsed.filter(record => record.layers.length === 1).length,
    multiLayer: notes.slice(0, 10),
    // Every layer count, even for one-layer classes, so a reviewer can see the parsed structure
    // rather than trusting the verdict.
    layers: parsed.slice(0, 20).map(record => ({ classKey: record.classKey, layers: record.layers.map(layer => layer.raw) }))
  } };
}

/* --------------------------------------------------------- other verdicts -- */

export function siblingFindings(groups, width) {
  const findings = [];
  for (const group of groups) {
    for (const part of group.parts) {
      if (!(part.deltaPx > 0.5)) continue;
      findings.push({
        code: 'CRAFT_SIBLING_BASELINE', line: 0, containerTag: group.container,
      dedupe: group.container + '|' + part.part + '|' + (part.role ?? ''), evidenceDelta: part.deltaPx + 'px',
        message: 'At ' + width + 'px, inside the one container ' + group.container + ', the ' + part.part +
          ' parts that share an established role (' + (part.role ?? 'role unknown') + ', matched by ' + (part.matchedBy ?? 'class or role pattern') +
          ') land ' + part.deltaPx + 'px apart across ' + part.rowsCompared + ' sibling(s) of that role (tops: ' + part.tops.join(', ') +
          'px). Only the tag+class+role of the matched part is compared, so a container whose ' + part.part + ' slot is filled by two different roles reports each role on its own rather than one invented maximum' +
          (part.roleBucketsCompared > 1 ? ' (' + part.roleBucketsCompared + ' role rows compared in this container)' : '') +
          '. Not an automatic fail — the harness cannot read DESIGN.md intent — but a non-zero delta is a finding to be explained as deliberate or fixed.',
        evidence: group.container + ' | part ' + part.part + ' | role ' + (part.role ?? '?') + ' | delta ' + part.deltaPx +
          'px | per-row deltas: ' + part.rowDeltas.slice(0, 8).join(', ') +
          ' | compared parts: ' + (part.comparedParts ?? []).slice(0, 4).join(' ; ') +
          ' | distinct roles matched: ' + (part.distinctRolesMatched ?? 1) + ', singletons not compared: ' + (part.roleBucketsSkippedAsSingletons ?? 0)
      });
    }
  }
  return findings;
}

export function headingFindings(headings, width) {
  if (!headings.h1 || !headings.h2s.length) {
    return { findings: [], status: headings.h1 ? 'NOT-FOUND (no visible h2 on route)' : 'NOT-FOUND (no h1 on route)' };
  }
  const h1Size = headings.h1.sizePx || 0;
  const largest = headings.h2s.reduce((best, node) => ((node.sizePx || 0) > (best?.sizePx || 0) ? node : best), headings.h2s[0]);
  const largestH2 = largest?.sizePx || 0;
  /* Fix 4: two numbers tell the reader nothing they can check. Name both elements — class, id, the
     selector path and the text — so `.page-title` against a section heading is visible without
     opening the stylesheet. */
  const identity = (node, fallbackTag) => {
    if (!node) return null;
    const classes = node.classText ? ' .' + String(node.classText).trim().split(/\s+/).join('.') : '';
    const id = node.id ? '#' + node.id : '';
    return (node.tag ?? fallbackTag) + classes + id + ' "' + (node.text ?? '') + '" at ' + (node.sizePx ?? null) + 'px' +
      (node.selector ? ' [' + node.selector + ']' : '');
  };
  const summary = {
    h1Identity: identity(headings.h1, 'h1'), largestH2: largest, largestH2Identity: identity(largest, 'h2'),
    visibleH2Count: headings.h2s.length, h2HiddenExcluded: headings.h2HiddenExcluded ?? 0
  };
  if (h1Size > largestH2) return { findings: [], status: 'PASS', headingRelation: 'h1 exceeds largest h2', ...summary };
  /* A tie and an inversion are both findings — component-anatomy.md:50 states the rule as "greater
     than the largest h2", and equal is not greater — but they are different defects and must not share
     a label: a display size that was carried down unchanged reads as a tie at 390, while an identity
     heading that lost the hierarchy outright reads as an inversion. One rule code, two verdicts. */
  const kind = h1Size === largestH2 ? 'tie' : 'inversion';
  return {
    findings: [{
      code: 'CRAFT_HEADING_INVERSION', line: 0, headingRelation: kind,
      message: 'At ' + width + 'px the route h1 computes ' + h1Size + 'px while the largest h2 computes ' + largestH2 + 'px — ' +
        (kind === 'tie' ? 'tie at ' + width + ', rule requires strictly greater' : 'inversion at ' + width + ', the h1 is smaller') +
        '. ' + 'The identity heading is ' + summary.h1Identity + '; the heading that ' +
        (kind === 'tie' ? 'matches it is' : 'outranks it is') + ' ' + summary.largestH2Identity +
        '. The element that names the page does not ' + (kind === 'tie' ? 'own the display role outright' : 'own the display role') + '.',
      evidence: kind + ' | h1 ' + (headings.h1.selector ?? headings.h1.tag ?? 'h1') + ' ' + h1Size + 'px | largest visible h2 ' +
        (largest?.selector ?? 'h2') + ' ' + largestH2 + 'px | visible h2 on route: ' + headings.h2s.length +
        ', hidden cross-case h2 excluded: ' + (headings.h2HiddenExcluded ?? 0)
    }],
    status: 'FAIL', headingRelation: kind, ...summary
  };
}

export function tableFindings(tables, width) {
  const findings = [];
  for (const table of tables) {
    if (!table.overflowing) continue;
    if (!table.cutHeaders.length) continue;
    const missing = [];
    if (!table.affordance.edgeCue) missing.push('no mask/fade/edge indicator with a computed gradient or opacity step');
    if (!table.affordance.keyboardReachable) missing.push('scroll container not keyboard-reachable (no tabindex/role/accessible name)');
    if (table.complete) continue;
    findings.push({
      code: 'CRAFT_TABLE_FIT', line: 0,
      message: 'At ' + width + 'px the table ' + table.selector + ' scrolls ' + table.tableScrollWidthPx + 'px inside a ' + table.frameClientWidthPx + 'px container and ' + table.cutHeaders.length + ' of ' + table.headerCount + ' header cell(s) fall outside the visible area (' + table.cutHeaders.map(header => '"' + header.text + '" +' + header.rightBeyondPx + 'px').join('; ') + '). Missing affordance: ' + missing.join('; ') + '.',
      evidence: 'caption: ' + (table.affordance.caption ?? 'none') + ' | edgeCue: ' + (table.affordance.edgeCue ? table.affordance.edgeCue.selector + ' ' + table.affordance.edgeCue.paint : 'none') + ' | keyboardReachable: ' + table.affordance.keyboardReachable
    });
  }
  return findings;
}

/* Which states each classified type owes, read off the ownership table in
   skills/portfolio-website/references/interaction-states.md:26-33. This exists because "can enter the
   state" and "owes a designed state" are different claims: a pointer is physically over a scroll region
   and `:active` matches it on mousedown, so a matrix that demands a rule from every such node rewards
   pasting a colour change onto a landmark, and punishes the thing the container actually owes — a cue
   that it scrolls. Two exemptions are recorded rather than hidden, and they mean different things:
   `notOwed` is a design ruling the reference makes, `notMeasurable` is a limit of the instrument, and an
   un-measurable cell is never a pass — the reader is told to look at it. A type missing from this table
   is held to the full set, so widening the classifier cannot launder a state. */
export const CRAFT_STATE_OWNERSHIP = {
  link: { owes: 'all', cite: 'interaction-states.md:28' },
  button: { owes: 'all', cite: 'interaction-states.md:28' },
  toggle: { owes: 'all', cite: 'interaction-states.md:28' },
  switch: { owes: 'all', cite: 'interaction-states.md:28' },
  tab: { owes: 'all', cite: 'interaction-states.md:28' },
  disclosure: { owes: 'all', cite: 'interaction-states.md:28' },
  textbox: {
    notOwed: {
      hover: 'the caret and the selection already say the field is live; a hover step on a shape that reads as a field is decoration (interaction-states.md:30)',
      active: 'pressing a text field places a caret, which is the response; there is no box to press (interaction-states.md:30)'
    },
    cite: 'interaction-states.md:30'
  },
  combobox: {
    notMeasurable: {
      hover: 'the platform paints hover for a native select inside a closed shadow tree, so an author rule that does not exist is not evidence that the screen does not change — look at it rather than trusting this cell (interaction-states.md:31)',
      active: 'the platform paints the pressed chrome of a native select inside a closed shadow tree (interaction-states.md:31)'
    },
    notOwed: { expanded: 'only owed when the control exposes aria-expanded; a native select does not (interaction-states.md:31)' },
    cite: 'interaction-states.md:31'
  },
  region: {
    notOwed: {
      hover: 'a scroll region is a window onto content, not a target; the affordance it owes is a static cue that there is more to read, which CRAFT_TABLE_FIT checks (interaction-states.md:32)',
      active: 'a container has no press response; demanding one buys a colour change on a landmark (interaction-states.md:32)',
      disabled: 'a scroll region cannot be made non-actionable in a way the reader acts on (interaction-states.md:32)'
    },
    cite: 'interaction-states.md:32'
  }
};

export function stateMatrix(selectorEvidence, interactionEvidence, typeStats, instances, ownership = CRAFT_STATE_OWNERSHIP) {
  const states = ['hover', 'focus-visible', 'active', 'disabled', 'expanded', 'busy'];
  const matrix = {};
  const findings = [];
  const scoped = [];
  const exempt = {};
  const excluded = {};
  /* One cell, two channels. The CSSOM channel asks: does a rule that changes a visible property match
     any tested instance of this type in this state? The diff channel asks: did any instance the driver
     actually hovered/focused/held change a visible property? A cell is a MISS only when no tested
     instance answered on either channel. Legacy input (a bare array of selectors, which is what the
     matrix took before per-instance resolution existed) is still accepted so the pure verdicts stay
     testable — a legacy cell simply reports its instance counts as null instead of pretending to have
     counted them. */
  const ruleView = raw => {
    if (!raw) return { selectors: [], tested: null, responding: null, total: null, capHit: false, resolvedBy: null, respondingInstances: [] };
    if (Array.isArray(raw)) {
      return { selectors: raw, tested: null, responding: null, total: null, capHit: false, resolvedBy: raw[0] ? { selector: raw[0], instance: null } : null, respondingInstances: [] };
    }
    return {
      selectors: raw.selectors ?? [], tested: raw.instancesTested ?? null, responding: raw.instancesResponding ?? null,
      total: raw.totalInstances ?? null, capHit: Boolean(raw.capHit), resolvedBy: raw.resolvedBy ?? null,
      respondingInstances: raw.respondingInstances ?? []
    };
  };
  const types = new Set([...Object.keys(selectorEvidence ?? {}), ...Object.keys(interactionEvidence ?? {}), ...Object.keys(typeStats ?? {})]);
  for (const type of types) {
    const stats = typeStats?.[type] ?? { count: 0 };
    const excludedHiddenCount = stats.excludedHiddenCount ?? 0;
    /* Fix 1: a type with no reachable instance on this route cannot be pressed, hovered or focused,
       so no cell of it may be failed — and reporting it as a pass would be worse. It gets NOT-FOUND
       with the count that was excluded, which is the number that says why. */
    if (!(stats.count > 0)) {
      if (excludedHiddenCount) excluded[type] = excludedHiddenCount;
      matrix[type] = {
        status: 'NOT-FOUND (no reachable instance of this type on this route)',
        excludedHiddenCount,
        excludedInert: stats.excludedInert ?? 0,
        excludedAttributeHidden: stats.excludedAttributeHidden ?? 0,
        cellCount: 0,
        note: excludedHiddenCount
          ? excludedHiddenCount + ' instance(s) of this type are in the DOM but not reachable on this route (display:none / [hidden] / aria-hidden subtree / [inert] subtree / zero area) — excluded, not failed' +
            (stats.excludedInert ? '; ' + stats.excludedInert + ' of them inside an inert subtree' : '')
          : 'no instance of this type rendered at all'
      };
      continue;
    }
    scoped.push(type);
    matrix[type] = {};
    const scope = ownership[type] ?? { owes: 'all', cite: 'interaction-states.md:28' };
    const exemptTypes = [];
    const testedInstances = instances?.[type]?.tested ?? [];
    for (const state of states) {
      const rule = ruleView(selectorEvidence?.[type]?.[state]);
      const ruleFocus = state === 'focus-visible' ? ruleView(selectorEvidence?.[type]?.focus) : null;
      const selectors = [...rule.selectors, ...(ruleFocus ? ruleFocus.selectors : [])];
      const reachable = state === 'hover' || state === 'focus-visible' || state === 'active'
        ? stats.count > 0
        : state === 'expanded' ? Boolean(stats.anyExpanded) || selectors.length > 0
        : state === 'disabled' ? Boolean(stats.anyDisabled) || selectors.length > 0
        : Boolean(stats.anyBusy) || selectors.length > 0;
      const diff = interactionEvidence?.[type]?.[state] ?? null;
      const respondedToRule = Math.max(rule.responding ?? 0, ruleFocus ? ruleFocus.responding ?? 0 : 0);
      const capNote = rule.capHit
        ? 'CSS rules tested against the first ' + rule.tested + ' of ' + rule.total + ' reachable instance(s) (cap ' + (stats.stateInstanceCap ?? 12) + ')'
        : null;
      const empty = !selectors.length && !diff;
      const notOwed = scope.notOwed?.[state] ?? null;
      const notMeasurable = scope.notMeasurable?.[state] ?? null;
      const cell = empty
        ? (reachable
            ? (notOwed
                ? (exemptTypes.push(state + ' (not owed: ' + notOwed + ')'),
                   'n/a — state reachable but not owed by this type: ' + notOwed)
                : notMeasurable
                  ? (exemptTypes.push(state + ' (not measurable: ' + notMeasurable + ')'),
                     'NOT-MEASURABLE — this instrument cannot read it, which is not a pass: ' + notMeasurable)
                  : 'MISS')
            : 'n/a (state not reachable for this type)')
        : {
            rules: selectors.length,
            computedDiff: diff ? diff.props : null,
            via: diff ? diff.via : 'selector matching only (weaker evidence than a computed diff)',
            resolvedBy: diff
              ? { channel: 'computed diff', instance: diff.resolvedBy ?? null, properties: diff.props ?? null }
              : { channel: 'CSSOM rule', selector: rule.resolvedBy?.selector ?? selectors[0] ?? null, instance: rule.resolvedBy?.instance ?? null, changes: rule.resolvedBy?.channel ?? null },
            instances: {
              testedByRule: rule.tested, respondedToRule: respondedToRule || null,
              testedByInput: diff ? diff.instancesTested ?? null : null,
              respondedToInput: diff ? diff.instancesResponding ?? null : null,
              totalVisible: rule.total ?? stats.count,
              capHit: Boolean(rule.capHit || diff?.capNote),
              capNote: capNote ?? diff?.capNote ?? null,
              respondingInstances: rule.respondingInstances?.length ? rule.respondingInstances : (diff?.allResponders ?? [])
            },
            evidenceStrength: diff ? (selectors.length ? 'computed diff, corroborated by a CSSOM rule' : 'computed diff only') : 'selector match only'
          };
      matrix[type][state] = cell;
      if (cell === 'MISS') {
        findings.push({
          code: 'CRAFT_STATE_MATRIX', line: 0,
          message: 'No rule in any reachable stylesheet changes a visible property for any of the ' +
            (rule.tested ?? (testedInstances.length || stats.count)) + ' tested instance(s) of "' + type + '" in the ' + state +
            ' state, and driving the real input on ' + (diff ? diff.instancesTested ?? 0 : 0) +
            ' instance(s) produced no computed change either — while ' + stats.count + ' reachable instance(s) of it render on this route and can enter it' +
            (excludedHiddenCount ? ' (' + excludedHiddenCount + ' further instance(s) unreachable on this route excluded' +
              (stats.excludedInert ? ', ' + stats.excludedInert + ' of them inert' : '') + ')' : '') +
            (capNote ? '; ' + capNote : '') + '. Instances tested: ' +
            (testedInstances.length ? testedInstances.slice(0, 6).join(' ; ') : 'the probe has no instance list for this route') + '.',
          evidence: 'rules matching any tested instance: 0 | computed diff: ' + (diff ? JSON.stringify(diff.props ?? []) : 'none captured') +
            ' | ' + stats.count + ' reachable instance(s), ' + (rule.tested ?? 'n/a') + ' tested against the CSSOM' +
            ', ' + excludedHiddenCount + ' excluded as unreachable | state token looked for: ' + state +
            (capNote ? ' | SAMPLE TRUNCATED: ' + capNote : ' | every reachable instance was tested')
        });
      }
    }
    /* Disclosed, not hidden: every cell this table cleared is named in the report with the reason and
       the rule line, so a reader can disagree with the ruling instead of discovering it later. */
    if (exemptTypes.length) {
      exempt[type] = exemptTypes;
      matrix[type].ownershipNote = 'exempted from ' + exemptTypes.length + ' cell(s) by the state-ownership table at ' +
        scope.cite + ': ' + exemptTypes.join(' | ');
    }
  }
  return { matrix, findings, ran: scoped.length > 0, scoped, excluded, exempt };
}

/* The channels a press can answer through, and the only standard that matters for the verdict:
 * something moved, on a channel this control owns. Displacement is one of them; interaction-states.md
 * sanctions tone and edge as the whole response for paper, so colour, background, border, shadow and
 * weight are the others. Names are read off the snapshot the page function returns, so widening the
 * sampled property list in CRAFT_CLASSIFY_SOURCE widens the channels here too. */
const PRESS_EDGE_CHANNELS = ['boxshadow', 'textshadow', 'outlinestyle', 'transform', 'filter'];

export function pressChannels(rest, held) {
  const channels = [];
  if (!rest || !held) return channels;
  const rgb = value => {
    const match = /rgba?\(([^)]*)\)/i.exec(String(value ?? ''));
    if (!match) return null;
    const parts = match[1].split(/[,\s]+/).filter(Boolean).map(Number);
    return parts.length >= 3 && parts.every(number => Number.isFinite(number))
      ? { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 } : null;
  };
  const kindOf = property => (PRESS_EDGE_CHANNELS.includes(String(property).toLowerCase()) ? 'edge' : 'tone');
  const zones = [['self', rest.self, held.self], ['before', rest.before, held.before], ['after', rest.after, held.after]];
  for (const [zone, first, second] of zones) {
    if (!first || !second) continue;
    for (const property of Object.keys(first)) {
      if (['transform', 'a', 'd', 'e', 'f'].includes(property)) continue;
      const from = String(first[property] ?? ''), to = String(second[property] ?? '');
      if (from === to) continue;
      let summary;
      if (property === 'opacity') {
        summary = 'opacity ' + from + ' → ' + to + ' (Δ' + Number((Number(to) - Number(from)).toFixed(3)) + ')';
      } else if (String(property).toLowerCase().endsWith('shadow')) {
        summary = property + ' changed: ' + (from === 'none' ? '' : 'from ' + from.slice(0, 40) + ' ') + 'to ' + to.slice(0, 60);
      } else {
        const a = rgb(from), b = rgb(to);
        summary = a && b
          ? property + ' rgb delta ' + Math.round(Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)) +
            (Math.abs(a.a - b.a) > 0.001 ? ', alpha delta ' + Number((b.a - a.a).toFixed(3)) : '')
          : property + ' "' + from.slice(0, 40) + '" → "' + to.slice(0, 40) + '"';
      }
      channels.push({ zone, property, kind: kindOf(property), summary });
    }
  }
  const dx = Number(held.self?.e ?? 0) - Number(rest.self?.e ?? 0);
  const dy = Number(held.self?.f ?? 0) - Number(rest.self?.f ?? 0);
  const restA = Number(rest.self?.a ?? 1) || 1;
  const scale = Number((Number(held.self?.a ?? 1) / restA).toFixed(4));
  if (Math.hypot(dx, dy) > 0.01 || Math.abs(scale - 1) > 0.001) {
    channels.unshift({ zone: 'self', property: 'transform', kind: 'displacement', summary: 'moved ' + Number(dx.toFixed(2)) + 'px by ' + Number(dy.toFixed(2)) + 'px, scale ' + scale });
  }
  if (String(rest.self?.filter ?? '') !== String(held.self?.filter ?? '')) {
    channels.unshift({ zone: 'self', property: 'filter', kind: 'edge', summary: 'filter ' + rest.self?.filter + ' → ' + held.self?.filter });
  }
  return channels;
}

export function pressFindings(presses, activeSupport) {
  const findings = [];
  const rows = [];
  // A textbox is not press-capable in the reference's sense: pressing it places a caret, and
  // demanding displacement from it would be inventing a rule the reference does not state.
  const pressCapable = new Set(['button', 'link', 'toggle', 'switch', 'tab', 'disclosure', 'combobox']);
  for (const press of presses ?? []) {
    const channels = press.channels ?? pressChannels(press.restSnapshot, press.heldSnapshot) ?? [];
    const own = channels.filter(channel => !channel.element);
    const host = channels.filter(channel => channel.element);
    const compositorMoved = Math.hypot(press.dx ?? 0, press.dy ?? 0) > 0.01 || Math.abs((press.scale ?? 1) - 1) > 0.001 ||
      Math.abs(press.opacityDelta ?? 0) > 0.001 || Boolean(press.filterChanged);
    const moved = own.length > 0 || host.length > 0 || compositorMoved;
    /* Press anatomy. The object decides the obligation, and `pressClassOf` derives the object from
       what the element paints and where it sits, not from its tag: a control that paints its own box is
       a thing under the thumb and must answer (interaction-states.md:28); a link whose text sits in
       running prose is read rather than aimed at, and owes a change to the text instead of displacement
       (the prose row under the ownership table). `inline-link` — a nav, header or footer link with no
       painted box — is enforced as well: the table's first row names it, and a declared navigation
       region reaches this class even when the link sits in an `li`, because the prose row is about the
       sentence around the link and a nav list has none. The nearest styled host is still searched before
       a press is called silent, because a card that lifts when the title link inside it is pressed has
       answered the press (interaction-states.md:49: only the inner layer may move). */
    const pressClass = press.pressClass ?? 'control-box';
    const expectations = {
      'prose-link': 'not demanded: link inside running prose — no displacement and no channel is required of it',
      'inline-link': 'must answer on a channel it owns: a nav, header or footer link is aimed at even though it paints no box',
      'clipped': 'not demanded: clipped out of view at rest, so it is a keyboard affordance nothing presses',
      'native-widget': 'not demanded: native form appearance, and its press response is drawn by the platform where computed style cannot read it',
      'control-box': 'must answer on a channel it owns'
    };
    const answeredBy = own.length || compositorMoved ? 'self' : (host.length ? host[0].element : null);
    /* A press the UA never marked active is not evidence about the stylesheet. Driving the press
       without an explicit `button` field, this harness dispatched a press of button "none": Blink never
       built the active chain and the page received no mousedown at all, which made every `:active` rule
       in a real site invisible to the pixel channel (measured: 0 of 24 control-box presses reported
       matches(":active") before that was fixed; the press fixture now reports true). The driver still
       cannot know that a row it reads as inactive was exercised, so where the selector channel matches
       an `:active` rule for this exact instance the row is reported as answered by weaker evidence — it
       is not credited as a computed-diff pass, and it is not called a defect. The route block decides
       the honest status for the whole pass. */
    const support = typeof activeSupport === 'function' ? activeSupport(press.type, press.elementSelector) : null;
    const selectorMatched = press.activeApplied === false && Boolean(support);
    /* The third outcome the two-frame read could not express. `settle` says how the held value was
       obtained: "settled" (the snapshot stopped changing — silence is evidence), "timeout" (still
       moving when the element's own declared transition said it should have finished — the instrument
       did not see the held state, so it may claim nothing), "active-lost" (the UA stopped calling the
       node active mid-read) and "not-read" (the node vanished). Only the first can produce a finding.
       A timeout is published as NOT-MEASURABLE with its reason, never as a pass and never as a defect:
       the same discipline as the native-select cell and the never-:active block below. */
    const settle = press.settle ?? 'not-read';
    const settleEvidence = settle === 'settled' ? 'settled after ' + (press.heldSettleMs ?? 0) + 'ms'
      : settle === 'timeout' ? 'still moving after ' + (press.heldSettleMs ?? 0) + 'ms'
        : settle === 'active-lost' ? ':active lost after ' + (press.heldSettleMs ?? 0) + 'ms (' + press.heldSettleFrames + ' frames)'
          : 'held snapshot never read';
    const measurable = settle === 'settled';
    rows.push({
      type: press.type, selector: press.selector, pressClass, elementSelector: press.elementSelector ?? null,
      hostSelector: press.hostSelector ?? null, answeredBy,
      expectation: selectorMatched
        ? 'not failed: the synthetic pointer never registered :active, and a CSSOM rule matching this instance owns the press state — selector-match evidence, weaker than a computed diff'
        : expectations[pressClass] ?? 'must answer on a channel it owns',
      pressEvidence: moved ? 'computed diff under a real pointer-down'
        : selectorMatched ? 'CSSOM :active rule only: ' + support : 'no channel and no matching rule',
      dx: press.dx, dy: press.dy, scale: press.scale,
      opacityDelta: press.opacityDelta, filterChanged: press.filterChanged, returnToIdentityMs: press.returnMs,
      channels: (press.channelSummaries ?? channels.map(channel => channel.kind + ' ' + channel.summary)).slice(0, 8),
      channelKinds: Array.from(new Set(channels.map(channel => channel.kind))),
      restRect: press.restRect ?? null, heldRect: press.heldRect ?? null,
      hitAreaStable: press.hitAreaStable ?? null,
      activeApplied: press.activeApplied ?? null, hitOnTarget: press.hitOnTarget ?? null,
      focusedWhileHeld: press.focusedWhileHeld ?? null,
      settle, settleEvidence, heldSettleMs: press.heldSettleMs ?? null, heldSettleFrames: press.heldSettleFrames ?? null,
      heldEarlyTransform: press.heldEarlyTransform ?? null,
      /* The press record names its own read point, so a verdict can be re-audited from the row: if the
         two-frame value and the settled value disagree, that is the transition-mid-flight artefact this
         read exists to kill, and a reader must be able to see it happened rather than take it on trust. */
      heldEarlyNote: press.heldEarlyNote ?? null, measurable,
      notMeasurable: !measurable && !moved && pressCapable.has(press.type) && !press.skipped &&
        (pressClass === 'control-box' || pressClass === 'inline-link')
        ? 'held value ' + settleEvidence + ' (' + settle + ') and the channels render identical — the read did not reach a stable held state, ' +
          'so this instrument cannot say whether the press moved anything. Not a pass, not a defect: an instrument limit.' : null,
      hoverChannelsSeen: (press.hoverChannels ?? []).slice(0, 4),
      sampleNote: press.pressSampleCapNote ?? null,
      moved, pressCapable: pressCapable.has(press.type)
    });
    if (!pressCapable.has(press.type) || press.skipped) continue;
    if (moved) continue;
    if (pressClass !== 'control-box' && pressClass !== 'inline-link') continue;
    if (selectorMatched) continue;
    // Silence measured before the value stopped moving is the instrument's read point, not the site's
    // stylesheet, so a non-settled press is reported through `notMeasurable` above instead of here.
    if (!measurable) continue;
    const stateNote = press.activeApplied === false
      ? ' The node reported matches(":active") false while the pointer was held, and no CSSOM rule with :active matched this instance either, so the claim rests on the missing rule as well as the silent pixels — quote the stylesheet before accepting or dismissing this row.'
      : press.activeApplied === true
        ? ' The node did report matches(":active") true while the pointer was held, so the state fired and no owned channel moved.' : '';
    findings.push({
      code: 'CRAFT_PRESS_DELTA', line: 0, pressClass, activeApplied: press.activeApplied ?? null,
      hitOnTarget: press.hitOnTarget ?? null, hitSelector: press.hitSelector ?? null,
      message: 'A real pointer-down held on the ' + (pressClass === 'inline-link' ? 'box-less' : 'control-box') + ' ' + press.type + ' ' + press.selector + ' changes nothing on any visible channel it owns — displacement, tone and edge all render identical while the pointer is held, and its nearest styled host (' +
        (press.hostSelector ?? 'none found within eight levels') + ') is silent too, so the press produced no response at all. The held value ' + settleEvidence + ', i.e. the read waited for this element\'s own declared transition to stop moving before it judged the pixels, so this is a settled silence and not a transition sampled mid-flight. Zero response is the defect; tone-only response is not, and this probe does not demand displacement from a control that answers by edge.' + stateNote,
      settle, settleEvidence, heldSettleMs: press.heldSettleMs ?? null, heldSettleFrames: press.heldSettleFrames ?? null,
      heldEarlyTransform: press.heldEarlyTransform ?? null,
      evidence: 'baseline is the hovered rest, so the hover tone is not charged to the press | hover-only channels seen before the press: ' +
        ((press.hoverChannels ?? []).join('; ') || 'none') +
        ' | hold ' + settleEvidence + ' over ' + (press.heldSettleFrames ?? 0) + ' frame(s) | value at the old two-frame read point ' +
        JSON.stringify(press.heldEarlyTransform ?? null) + ' | rest transform ' + JSON.stringify(press.restTransform) + ' | held ' + JSON.stringify(press.heldTransform) +
        ' | channels that moved: none of transform, opacity, filter, background, border, shadow, colour, weight | self and host both silent | return to identity ' + press.returnMs +
        'ms | hit area rest ' + JSON.stringify(press.restRect ?? null) + ' held ' + JSON.stringify(press.heldRect ?? null) +
        ' stable ' + JSON.stringify(press.hitAreaStable ?? null) +
        ' | matches(":active") while held ' + JSON.stringify(press.activeApplied ?? null) +
        ' | pointer landed on the control or a descendant ' + JSON.stringify(press.hitOnTarget ?? null) +
        ' (elementFromPoint ' + JSON.stringify(press.hitSelector ?? null) + ')'
    });
  }
  return { findings, rows };
}

const ACTION_VERB_PATTERN = /^(play|pause|show|hide|open|close|expand|collapse|enable|disable|start|stop|mute|unmute|reveal)\b/i;

export function nameStateFindings(toggles) {
  const findings = [];
  const exempt = [];
  /* Which groups demonstrably answer the reader. A row of single-select chips moves its state from one
     member to another, so the member that is already selected does not flip when it is clicked again —
     that is correct behaviour, and charging it made the instrument report the selected filter of a
     working page as broken. The exemption is granted only on observed group behaviour: when nothing in
     the group flips, the group is dead and the selected member is reported with it. */
  const flippedByGroup = new Map();
  for (const record of toggles ?? []) {
    if (!record.group) continue;
    if (record.flippedByClick || record.flippedByKeyboard) flippedByGroup.set(record.group, (flippedByGroup.get(record.group) ?? 0) + 1);
  }
  for (const toggle of toggles ?? []) {
    const label = '"' + (toggle.label ?? '').slice(0, 40) + '"';
    if (toggle.clickFailed && toggle.keyboardFailed) continue;
    if (!toggle.stateAttrName) {
      findings.push({ code: 'CRAFT_NAME_STATE', line: 0,
        message: 'The ' + toggle.type + ' ' + toggle.selector + ' is selectable by role but exposes no state attribute (aria-pressed/expanded/checked/selected), so nothing announces which state the reader is in.',
        evidence: label + ' name: ' + (toggle.name ?? '').slice(0, 60) });
      continue;
    }
    if (!toggle.flippedByClick && !toggle.flippedByKeyboard) {
      const onAtRest = String(toggle.before?.[toggle.stateAttrName]) === 'true' || toggle.before?.[toggle.stateAttrName] === true;
      const matesFlipped = toggle.group ? (flippedByGroup.get(toggle.group) ?? 0) : 0;
      if (onAtRest && matesFlipped > 0) {
        exempt.push(label + ' ' + toggle.stateAttrName + '=true at rest in group ' + toggle.group + ', whose other ' + matesFlipped +
          ' member(s) did flip: re-activating the selected member of a single-select row is correctly a no-op');
        continue;
      }
      findings.push({ code: 'CRAFT_NAME_STATE', line: 0,
        message: 'Activating ' + label + ' (' + toggle.type + ') by real click and by keyboard never flips ' + toggle.stateAttrName + ' — the exposed state never answers the input' +
          (onAtRest ? ', and no other member of its group ' + (toggle.group ?? 'unnamed') + ' flipped either, so the whole row is inert rather than the selected chip behaving correctly' : '') + '.',
        evidence: toggle.stateAttrName + '=' + toggle.before?.[toggle.stateAttrName] + ' after click=' + toggle.afterClick?.[toggle.stateAttrName] + ' after keyboard=' + toggle.afterKeyboard?.[toggle.stateAttrName] +
          ' | group: ' + (toggle.group ?? 'not recorded') + ' | members of the group that flipped: ' + matesFlipped });
      continue;
    }
    const nameChanged = toggle.nameBefore !== toggle.nameAfter;
    if (!nameChanged && ACTION_VERB_PATTERN.test(String(toggle.nameBefore ?? ''))) {
      findings.push({ code: 'CRAFT_NAME_STATE', line: 0,
        message: 'The accessible name "' + toggle.nameBefore + '" for ' + label + ' is an action verb that never changes with the state (' + String(toggle.stateAttrName) + ' flips ' + toggle.before?.[toggle.stateAttrName] + '→' + toggle.afterClick?.[toggle.stateAttrName] + '), so it contradicts what the control now is: the shipped motion-toggle defect (a control named "Play page motion" while paused).',
        evidence: 'name before: ' + toggle.nameBefore + ' | name after: ' + toggle.nameAfter });
    }
    if (nameChanged && toggle.nameAfter && toggle.label && toggle.nameAfter.toLowerCase() !== String(toggle.label).toLowerCase().slice(0, 60) &&
        !String(toggle.label).toLowerCase().includes(String(toggle.nameAfter).toLowerCase())) {
      findings.push({ code: 'CRAFT_NAME_STATE', line: 0,
        message: 'After activation the accessible name "' + toggle.nameAfter + '" contradicts the visible label "' + String(toggle.label).slice(0, 48) + '" on ' + label + '.',
        evidence: toggle.selector });
    }
    if (toggle.flippedByClick && !toggle.visualChangedByClick && !toggle.pseudoChangedByClick) {
      findings.push({ code: 'CRAFT_NAME_STATE', line: 0,
        message: 'Clicking ' + label + ' flips ' + toggle.stateAttrName + ' ' + toggle.before?.[toggle.stateAttrName] + '→' + toggle.afterClick?.[toggle.stateAttrName] + ' but every observable visual property (including ::before/::after) renders identical — the exposed state describes pixels that do not change.',
        evidence: toggle.selector + ' | attrs after click: ' + JSON.stringify(toggle.afterClick ?? {}) });
    }
  }
  // The array stays the return value so existing callers and tests work; the exemptions ride on it.
  findings.exemptBySingleSelect = exempt;
  return findings;
}
