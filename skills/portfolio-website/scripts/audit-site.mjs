/**
 * Design-quality audit for a directory of static HTML.
 *
 * Layer 1 reads HTML and CSS with no browser and always runs. Layer 2 renders each page in Chrome or
 * Edge over the DevTools protocol — reusing scripts/serve.mjs so ES modules resolve exactly as they do
 * in a real preview — and only runs with `browser: true` / `--browser`.
 *
 * Every violation carries the rule it enforces and the Skill line that states it, so a claim about
 * generated output can be re-measured instead of re-argued. No timestamps, rounded floats: the same
 * directory produces the same JSON.
 */
import { spawn, spawnSync } from 'node:child_process';
import { access, constants, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStaticServer } from './serve.mjs';
import {
  CRAFT_RULES, CRAFT_PART_PATTERNS, CRAFT_VISIBLE_PROPS, CRAFT_CLASSIFY_SOURCE,
  measureCraftProbes, runCraftInteractions, buildCraftFindings
} from './craft-probes.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const defaultRoot = join(projectRoot, 'examples', 'alex-lin', 'dist');
const decoder = new TextDecoder('utf-8', { fatal: true });
const samples = 8;

/**
 * Each check names its rule and the Skill line that states it. The report cites these, never prose.
 * `anchor` is a fragment of the cited line and `verifyRuleRefs` proves it still lives there: a report
 * that points at the wrong line is a false claim shipped inside the measuring instrument, and these
 * files get edited — the refs drifted twice while this file was being written.
 */
export const RULES = {
  H1_COUNT: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:35', anchor: 'Semantics are valid',
    text: 'Count h1 per page: exactly one. A styled <p> standing in for the identity element is a missing heading, not a design choice.'
  },
  HEADING_SKIP: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:35', anchor: 'heading-level skips',
    text: 'No heading-level skips: a level may not exceed the previous level by more than one.'
  },
  DEFINITION_LIST: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:35', anchor: 'enclosing `dl`',
    text: 'Every dt/dd pair is wrapped in a dl, and a dl holds only dt/dd groups.'
  },
  FOOTER_IN_MAIN: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:35', anchor: 'contentinfo exposed',
    text: 'footer sits outside main so contentinfo is exposed.'
  },
  PAGE_LANG: {
    layer: 'static', ref: 'skills/portfolio-website/references/demo-projects.md:45; zh-CN/demo-projects.md:45',
    anchor: 'Choose languages',
    text: 'The html element declares lang. Locale coverage of copy, ARIA and control labels is only checkable once the interface language is stated.'
  },
  SKIP_LINK: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:38', anchor: 'follow the skip link',
    text: 'The focus path starts with a skip link that resolves to a real in-page target.'
  },
  SKIP_TARGET_TABINDEX: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:38', anchor: 'skip target carries',
    text: 'The skip target carries tabindex="-1" or is natively focusable.'
  },
  FOCUS_VISIBLE_SCOPE: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:38; visual-direction.md:166',
    anchor: 'not only anchors',
    text: 'A :focus-visible rule reaches buttons, links, summaries and [tabindex], not only anchors.'
  },
  REDUCED_MOTION: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-direction.md:162; visual-review.md:32',
    anchor: 'prefers-reduced-motion',
    text: 'A prefers-reduced-motion block exists in the CSS the page actually loads.'
  },
  OFFSCREEN_HIDE: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:38', anchor: 'not `left:-9999px`',
    text: 'Hidden-until-focused uses clip-path, not a large negative left/top offset.'
  },
  THIRD_PARTY_RUNTIME: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:50; visual-direction.md:184',
    anchor: 'third-party host must answer',
    text: 'No request a third-party host must answer for the page to work. Source-credit links in <a href> are exempt.'
  },
  FONT_SCALE_HARDCODED: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:40', anchor: 'Maintenance claims are true',
    text: '"Change one value and the scale follows" must match the hardcoded font-size count exactly: a token-driven scale may not also hardcode font-size.'
  },
  FONT_SCALE_NO_TOKENS: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:40', anchor: 'hardcoded `font-size`',
    text: 'Several hardcoded font-size declarations with no token use means there is no scale to maintain.'
  },
  TABLE_CAPTION: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:36', anchor: 'each table for `caption`',
    text: 'Every table has a caption.'
  },
  TH_SCOPE: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:36', anchor: 'each `th` for `scope`',
    text: 'Every th declares a valid scope so header cells associate with their cells.'
  },
  CRITICAL_PATH_BUDGET: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-direction.md:184', anchor: 'critical path near 200KB',
    text: 'Critical path under about 200KB for a hand-built static site.'
  },
  JS_BUDGET: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-direction.md:184', anchor: 'under 60KB of script',
    text: 'JavaScript loaded by a page under 60KB without a framework.'
  },
  MISSING_RESOURCE: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:50', anchor: 'Open devtools on every route',
    text: 'Fix broken routes: a stylesheet the page links but does not ship never renders.'
  },
  EMPTY_LINK: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:48', anchor: 'Empty slots absent',
    text: 'An anchor with an empty href or href="#" resolves to the page it sits on: a planned slot left in the delivery, or a JavaScript action wearing a link. Fill it with the real destination, or make it a button.'
  },
  SHIP_METADATA: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:51; demo-projects.md:19',
    anchor: 'no experiment metadata',
    text: 'The shipped directory holds only the deliverable: no build metadata, no authoring evidence, no internal notes.'
  },
  SHIP_SCRATCH_PAGE: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:51', anchor: 'No scratch pages',
    text: 'No scratch page, and no file that names which arm of a comparison it came from.'
  },
  SHIP_UNREACHABLE_PAGE: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:51', anchor: 'List the shipped directory',
    text: 'An HTML file inside the deliverable that no page links is a scratch page until proven otherwise.'
  },
  CSS_UNDEFINED_VAR: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:32', anchor: 'Custom properties resolve',
    text: 'Every var(--x) reads a custom property some loaded stylesheet declares. An undeclared one is a guaranteed-invalid value: the whole declaration drops, no console error, no failed request.'
  },
  DUPLICATE_ID: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-review.md:35', anchor: 'aria-labelledby',
    text: 'One page, one id. A repeated id silently breaks every aria-labelledby and in-page anchor that points at it, so an accessibility claim becomes false while nothing fails.'
  },
  LABEL_PUNCTUATION: {
    layer: 'static', ref: 'skills/portfolio-website/references/visual-direction.md:101; zh-CN/visual-direction.md:94',
    anchor: 'Terminal marks in phrase roles',
    text: 'A heading, kicker, eyebrow, label, nav item, button, chip, stat value or one-line caption ends no line with 。! ? . and does not stop on a connective ，、. Prose and full sentences keep theirs, and a comma joining two clauses of one heading is syntax — the test is the role, not the tag.'
  },
  BROWSER_DUPLICATE_ID: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-review.md:35', anchor: 'aria-labelledby',
    text: 'The ids the running scripts put in the document are unique too: a case page built by looping one template only shows its repeated id after the route has rendered.'
  },
  BROWSER_LABEL_PUNCTUATION: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-direction.md:101; zh-CN/visual-direction.md:94',
    anchor: 'Terminal marks in phrase roles',
    text: 'Phrase roles stay unpunctuated in the rendered document as well, on every line the reader sees, because script-built labels and the second locale never appear in the static markup.'
  },
  BROWSER_LOCALE_RENDERED: {
    layer: 'browser', ref: 'skills/portfolio-website/references/demo-projects.md:45', anchor: 'Choose languages',
    text: 'A locale the deliverable offers has to be the locale the reader gets: the switch changes document lang and puts CJK text on the page, or every Chinese-typography check measured the wrong document.'
  },
  BROWSER_H_OVERFLOW: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-direction.md:147; visual-review.md:25',
    anchor: 'break a phone',
    text: 'document.documentElement.scrollWidth must not exceed the viewport at the measured width.'
  },
  BROWSER_ELEMENT_OVERFLOW: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-direction.md:147', anchor: 'survives 360px',
    text: 'A non-fixed element whose box leaves the viewport needs a rule that survives the narrow width.'
  },
  BROWSER_COLUMN_COLLAPSE: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-review.md:21', anchor: 'Count characters per line',
    text: 'A text block that renders a couple of characters per line, or a document that runs tens of screens tall, is a collapsed layout: every typographic decision above it is being drawn into a column no reader can use. Measured, because a grid class that also matches the section wrapper passes every overflow, contrast and state probe without a word.'
  },
  BROWSER_JS_BUDGET: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-direction.md:184', anchor: 'under 60KB of script',
    text: 'The ceiling is applied to what the browser really transferred on the route the reader landed on, in either locale: a second language is a second download, not a footnote on the first.'
  },
  BROWSER_MIN_FONT_SIZE: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-review.md:37; visual-direction.md:104',
    anchor: 'Small text is measured',
    text: 'Nothing renders below about 11px — measured as the painted size, so SVG-scaled type is multiplied by its own screen CTM before the floor is applied.'
  },
  BROWSER_CONTRAST: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-direction.md:125; visual-review.md:26',
    anchor: 'Contrast floors',
    text: 'Contrast is computed against the background the text actually sits on: 4.5:1 body, 3:1 large text.'
  },
  BROWSER_CJK_TRACKING: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-direction.md:67; zh-CN/visual-direction.md:82',
    anchor: 'No CJK text takes letterspacing',
    text: 'No CJK text takes letterspacing at any size — not headings, not table headers, not small labels.'
  },
  BROWSER_PAINTED_FONT: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-direction.md:86', anchor: 'A weight substitution you never asked for',
    text: 'A heading paints the family and weight the machine resolved, not the ones declared: read the face behind a name that carries a weight word against the declared number, and flag a painted family that is nowhere in the declared stack. getComputedStyle cannot see either failure.'
  },
  BROWSER_OCCLUSION: {
    layer: 'browser', ref: 'skills/portfolio-website/references/scroll-depth.md:82', anchor: 'paint order',
    text: 'A text run is covered only if something opaque paints above it at a point inside its own line box — asked in paint order with elementsFromPoint, swept across the scroll range with the geometry recomputed at every offset, because an animated overlay collides where it goes rather than where it was laid out. Copy sliding under a sticky bar is how that bar works; what is measured at rest is where an anchor lands.'
  },
  BROWSER_CONSOLE_ERROR: {
    layer: 'browser', ref: 'skills/portfolio-website/references/visual-review.md:50', anchor: 'No errors',
    text: 'No console errors and no failed request on any route.'
  }
};

/* The visual-craft probes (scripts/craft-probes.mjs) extend the same registry, so their findings
   travel the same `{code, message, evidence, rule, ref}` channel with the same citation guarantee:
   verifyRuleRefs below checks their anchors too, and a craft rule that stops citing a real line
   stops being enforceable. They only *run* with --craft, because the example site is a measurement
   subject for them and several probes fail on it by design. */
Object.assign(RULES, CRAFT_RULES);

/**
 * Prove that every rule still cites a line that states it. Refs are line numbers into files that get
 * edited, so a section inserted anywhere below the cited line silently turns the report's citations
 * into false claims about the Skill — which is the exact failure this audit exists to catch in a site.
 */
export async function verifyRuleRefs({ root = projectRoot } = {}) {
  /* Two layouts run this file: the repo, where the references sit under skills/portfolio-website/,
     and the published skill, where this script is copied into that directory and the references are
     its siblings. Resolving by what is actually on disk keeps one copy of the checker honest in both
     places instead of shipping a second, drifting copy. */
  const readable = async dir => {
    try {
      await access(join(dir, 'references'), constants.R_OK);
      return true;
    } catch {
      return false;
    }
  };
  const nested = join(root, 'skills', 'portfolio-website');
  const skillDir = await readable(nested) ? nested : root;
  const files = new Map();
  const load = async full => {
    if (!files.has(full)) {
      try {
        files.set(full, decoder.decode(await readFile(full)).split('\n'));
      } catch {
        files.set(full, null);
      }
    }
    return files.get(full);
  };
  const errors = [];
  for (const [code, rule] of Object.entries(RULES)) {
    const cites = rule.ref.split(';').map(part => part.trim().replace(/^skills\/portfolio-website\//, ''));
    const cited = await Promise.all(cites.map(async cite => {
      const match = /^(.+?):(\d+)$/.exec(cite);
      if (!match) return { cite, problem: 'malformed citation' };
      const path = match[1].replaceAll('\\', '/');
      const inSkillRoot = path === 'SKILL.md' || path.startsWith('references/');
      const full = join(skillDir, ...(inSkillRoot ? [path] : ['references', path]));
      const line = Number(match[2]);
      const lines = await load(full);
      if (!lines) return { cite, problem: 'file not found' };
      const text = lines[line - 1];
      if (text === undefined) return { cite, problem: `line ${line} past end of file (${lines.length})` };
      if (!text.trim()) return { cite, problem: `line ${line} is blank` };
      return { cite, text };
    }));
    for (const entry of cited) if (entry.problem) errors.push(`${code} cites ${entry.cite}: ${entry.problem}`);
    const [primary] = cited;
    if (!primary.problem) {
      if (!rule.anchor) errors.push(`${code} has no anchor to verify its citation with`);
      else if (!primary.text.includes(rule.anchor)) errors.push(`${code} cites ${primary.cite}, which does not state it — expected "${rule.anchor}" in: ${primary.text.slice(0, 80)}`);
    }
  }
  return errors;
}

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const rawTextElements = new Set(['script', 'style', 'textarea', 'title']);
const implicitClose = new Set(['li', 'dt', 'dd', 'tr', 'td', 'th', 'p', 'tbody', 'thead', 'tfoot', 'option', 'optgroup']);
const closedBy = {
  p: new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']),
  li: new Set(['li']), dt: new Set(['dt', 'dd']), dd: new Set(['dt', 'dd']),
  tr: new Set(['tr', 'tbody', 'tfoot', 'thead']),
  td: new Set(['td', 'th', 'tr', 'tbody', 'tfoot', 'thead']),
  th: new Set(['td', 'th', 'tr', 'tbody', 'tfoot', 'thead']),
  caption: new Set(['caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th']),
  thead: new Set(['tbody', 'tfoot', 'thead']),
  tbody: new Set(['tbody', 'tfoot', 'thead']),
  tfoot: new Set(['tbody', 'tfoot', 'thead']),
  option: new Set(['option', 'optgroup', 'select']), optgroup: new Set(['optgroup', 'option', 'select']),
  rt: new Set(['rt', 'rp']), rp: new Set(['rt', 'rp']),
  colgroup: new Set(['colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th']),
  head: new Set(['body', 'html'])
};
const entityNames = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** CJK ideographs, kana, hangul, CJK punctuation and fullwidth forms. Escaped, never literal. */
export const CJK_PATTERN = '[\\u2e80-\\u2eff\\u3000-\\u303f\\u3040-\\u30ff\\u3100-\\u312f\\u3130-\\u318f\\u31c0-\\u31ef\\u3200-\\u32ff\\u3300-\\u33ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\ufe10-\\ufe1f\\ufe30-\\ufe4f\\uff00-\\uffef]';
const cjkAny = new RegExp(CJK_PATTERN);
const cjkAll = new RegExp(CJK_PATTERN, 'g');

/** Selectors that must all appear in some :focus-visible rule for the focus path to count as complete. */
const focusTargets = {
  'a[href]': /(?:^|[\s,>+~(|])a(?=$|[\s,>+~:)\[])|(?:^|[\s,>+~(])a\[href/i,
  button: /(?:^|[\s,>+~(|])(?:button|input|select|textarea)(?=$|[\s,>+~:)\[])|\[\s*type\s*=\s*["']?(?:submit|button|reset|image)/i,
  summary: /(?:^|[\s,>+~(|])summary(?=$|[\s,>+~:)\[])/i,
  '[tabindex]': /\[\s*tabindex/i
};
const universalTarget = /(?:^|[\s,>+~(])\*(?=$|[\s,>+~:])|(?:^|[\s,>+~(])(?:div|section|article|main|header|nav|figure)(?=$|[\s,>+~:])/i;

/* A rule whose selector names no element at all — `:focus-visible`, `*:focus-visible`, `:where(...)` —
   is the commonest way to ring every focusable thing, and reading it as "not a button" made the
   checker call working pages unringed. Pseudo-classes and pseudo-elements are stripped; whatever is
   left (a tag, class, id or attribute) is what makes the selector narrower than universal. */
const bareSelectorTarget = selector => selector
  .replace(/::[\w-]+(?:\([^)]*\))?/g, ' ')
  .replace(/:[\w-]+(?:\([^)]*\))?/g, ' ')
  .trim() === '';

const deliverableExtensions = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.ico', '.mp4', '.webm', '.mov', '.woff', '.woff2', '.ttf', '.otf', '.txt', '.md', '.pdf', '.vtt', '.srt', '.csv']);
const documentationNames = /^(?:readme|license|licence|copying|notice|notices|authors|credits|attributions?|assets|asset-?sources|changelog|third[-_.]?party[-_.]?notices|ofl|sil[-_.]?open[-_.]?font[-_.]?license|open[-_.]?font[-_.]?license)(?:[.-].*)?$/i;
const metadataNames = /^(?:package|package-lock|yarn|pnpm-lock|bun|npm-shrinkwrap|composer|gemfile|podfile|requirements|go|cargo|tsconfig|jsconfig|babel|eslintconfig|eslintrc|prettier|stylelint|vite|vitest|webpack|rollup|next|nuxt|svelte|tailwind|postcss|astro|serverless|firebase|netlify|vercel|render|railway|manifest|asset-manifest|build-manifest|stats|coverage|schema|codegen|dockerignore|docker-compose|dockerfile|makefile|justfile|tasks|devcontainer|procfile)(?:[.-].*)?$/i;
const scratchNames = /(?:^|[._-])(?:scratch|draft|temp|tmp|debug|unused|old|backup|copy|wip|spike|experiment|variant|arm|a-b|ab|candidate|option|version|final|do-not-publish|dont-publish|internal|private|evidence|authoring|notes?|audit|review|feedback|checklist|report|archive)(?:[._-]|$)/i;
const contentScratch = /<!--[^>]{0,200}(?:scratch|do ?not ?publish|internal only|experiment|draft only|remove before|arm ?[ab12]|variant ?[ab12])|\bTODO(?: remove| delete)?\b|\bDEPRECATED\b|\binternal(?: notes| only)\b/i;
const hiddenOffsetProperty = /^(?:left|top|margin-left|margin-top|text-indent)$/i;
const nonDeliverableExtensions = new Set(['.lock', '.log', '.jsonl', '.sqlite', '.sqlite3', '.db', '.har', '.bak', '.tmp', '.orig', '.rej', '.swp', '.pyc', '.map', '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg', '.sh', '.bash', '.ps1', '.py', '.rb', '.go', '.rs', '.java', '.php', '.patch', '.diff']);
const externalSchemes = /^(?:data|blob|mailto|tel|sms|callto|about|javascript|chrome-extension):/i;
const runtimeAttributes = ['src', 'srcset', 'poster', 'data', 'action', 'xlink:href'];
const requestLinkRels = new Set(['preload', 'prefetch', 'modulepreload', 'stylesheet', 'font', 'manifest', 'dns-prefetch', 'preconnect']);

const slash = value => value.split(sep).join('/');
const round = (value, digits = 3) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
/** Progress lines for a browser-driven run: Layer 2 touches several processes, so silence is hard to debug. */
const trace = (options, message) => { if (options?.trace) process.stderr.write('[audit] ' + message + '\n'); };
const pageName = url => { try { return decodeURIComponent(new URL(url).pathname).replace(/^\//, ''); } catch { return String(url); } };

/* ------------------------------------------------------------------ markup -- */

const safeCodePoint = value => Number.isFinite(value) && value > 0 && value < 0x10ffff ? String.fromCodePoint(value) : '';

function decodeEntities(value) {
  return String(value).replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]{1,31});?/gi, (all, body) => {
    const key = String(body).toLowerCase();
    if (key.startsWith('#x')) return safeCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith('#')) return safeCodePoint(parseInt(key.slice(1), 10));
    return entityNames[key] ?? all;
  });
}

/**
 * Tolerant HTML reader: strict enough that ancestry checks (dt/dd in dl, footer in main, heading
 * order) decide from real structure rather than string matching, forgiving enough not to stop on
 * malformed generated markup. Nodes carry their line so evidence points somewhere usable.
 */
export function parseHtml(source) {
  const document = { tag: '#document', attrs: {}, children: [], parent: null, line: 1 };
  const stack = [document];
  const unmatched = [];
  const lineStarts = [0];
  for (let index = source.indexOf('\n'); index >= 0; index = source.indexOf('\n', index + 1)) lineStarts.push(index + 1);
  const lineAt = index => {
    let low = 0, high = lineStarts.length - 1;
    while (low < high) { const middle = (low + high + 1) >> 1; if (lineStarts[middle] <= index) low = middle; else high = middle - 1; }
    return low + 1;
  };
  const current = () => stack[stack.length - 1];
  const addText = (parent, text, offset, raw) => {
    if (text) parent.children.push({ tag: '#text', text, parent, line: lineAt(offset), raw: Boolean(raw) });
  };
  let cursor = 0;
  while (cursor < source.length) {
    const lt = source.indexOf('<', cursor);
    if (lt < 0) { addText(current(), source.slice(cursor), cursor); break; }
    if (lt > cursor) addText(current(), source.slice(cursor, lt), cursor);
    if (source.startsWith('<!--', lt)) { const end = source.indexOf('-->', lt + 4); cursor = end < 0 ? source.length : end + 3; continue; }
    if (source.startsWith('<!', lt) || source.startsWith('<?', lt)) { const end = source.indexOf('>', lt); cursor = end < 0 ? source.length : end + 1; continue; }
    const closing = source[lt + 1] === '/';
    const nameMatch = /^<\s*\/?\s*([a-zA-Z][\w:.-]*)/.exec(source.slice(lt, lt + 120));
    if (!nameMatch) { cursor = lt + 1; continue; }
    const tag = nameMatch[1].toLowerCase();
    let scan = lt + nameMatch[0].length;
    if (closing) {
      const end = source.indexOf('>', lt);
      // A close tag ends the nearest open element of that name, exactly as an HTML parser does.
      let depth = 0;
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].tag === tag) { depth = index; break; }
      }
      if (depth === 0) unmatched.push({ tag, line: lineAt(lt) });
      else while (stack.length - 1 >= depth) stack.pop();
      cursor = end < 0 ? source.length : end + 1;
      continue;
    }
    const attrs = {};
    let selfClosing = false;
    for (;;) {
      while (scan < source.length && /\s/.test(source[scan])) scan += 1;
      if (scan >= source.length) break;
      if (source[scan] === '>') { scan += 1; break; }
      if (source[scan] === '/' && source[scan + 1] === '>') { selfClosing = true; scan += 2; break; }
      const name = /^[^\s=/>+~]+/.exec(source.slice(scan, scan + 300));
      if (!name) { scan += 1; continue; }
      const key = name[0].toLowerCase();
      scan += name[0].length;
      while (scan < source.length && /\s/.test(source[scan])) scan += 1;
      if (source[scan] !== '=') { attrs[key] = key; continue; }
      scan += 1;
      while (scan < source.length && /\s/.test(source[scan])) scan += 1;
      const quote = source[scan];
      if (quote === '"' || quote === "'") {
        const end = source.indexOf(quote, scan + 1);
        attrs[key] = decodeEntities(source.slice(scan + 1, end < 0 ? source.length : end));
        scan = end < 0 ? source.length : end + 1;
      } else {
        const value = /^[^\s>]*/.exec(source.slice(scan, scan + 8000))[0];
        attrs[key] = decodeEntities(value);
        scan += value.length;
      }
    }
    for (;;) {
      const parent = current();
      // closedBy[X] lists the start tags that implicitly close an open X, so the rule reads from the parent.
      const rules = closedBy[parent.tag];
      if (rules && rules.has(tag)) { stack.pop(); continue; }
      if (tag === parent.tag && implicitClose.has(tag)) { stack.pop(); continue; }
      break;
    }
    const node = { tag, attrs, children: [], parent: current(), line: lineAt(lt) };
    current().children.push(node);
    if (rawTextElements.has(tag)) {
      const pattern = new RegExp('<\\s*/\\s*' + tag + '(?:\\s|/?>)', 'i');
      const rest = source.slice(scan);
      const found = rest.search(pattern);
      addText(node, found < 0 ? rest : rest.slice(0, found), scan, true);
      if (found < 0) { cursor = source.length; if (!voidElements.has(tag)) stack.push(node); continue; }
      const end = source.indexOf('>', scan + found);
      cursor = end < 0 ? source.length : end + 1;
      if (!voidElements.has(tag)) stack.push(node);
      continue;
    }
    if (!voidElements.has(tag) && !selfClosing) stack.push(node);
    cursor = scan;
  }
  return { document, unmatched, openAtEnd: stack.length - 1 };
}

export function* walkElements(node) {
  for (const child of node.children ?? []) {
    if (child.tag === '#text') continue;
    yield child;
    yield* walkElements(child);
  }
}

const inNoscript = node => ancestors(node).some(item => item.tag === 'noscript');

/** The elements a browser DOM would actually contain: the noscript branch does not exist there. */
const renderedElements = document => [...walkElements(document)].filter(node => !inNoscript(node));

function ancestors(node) {
  const chain = [];
  for (let parent = node?.parent; parent; parent = parent.parent) chain.push(parent);
  return chain;
}

/** Text of an element, skipping the raw source of embedded <script>/<style>. */
function textOf(node, depth = 0) {
  if (node.tag === '#text') return node.raw ? '' : node.text;
  if (depth > 200) return '';
  let text = '';
  for (const child of node.children ?? []) {
    if (child.tag === 'script' || child.tag === 'style') continue;
    text += textOf(child, depth + 1);
  }
  return text;
}

const rawTextOf = node => node.children.filter(child => child.tag === '#text').map(child => child.text).join('');
const classesOf = node => (typeof node.attrs.class === 'string' ? node.attrs.class : '');

function describeElement(node) {
  if (!node) return 'none';
  const classes = classesOf(node).split(/\s+/).filter(Boolean).slice(0, 3);
  return '<' + node.tag + '>' + (node.attrs.id ? '#' + node.attrs.id : '') + (classes.length ? '.' + classes.join('.') : '');
}

const tabbableOrder = attrs => {
  if (attrs.tabindex === undefined) return null;
  const value = Number(String(attrs.tabindex).trim());
  return Number.isFinite(value) ? value : null;
};

const focusableWithoutTabindex = (tag, attrs) =>
  ['button', 'select', 'textarea', 'iframe', 'summary'].includes(tag) ||
  (tag === 'a' && Boolean(attrs.href)) || (tag === 'input' && attrs.type !== 'hidden') ||
  Boolean(attrs.contenteditable && attrs.contenteditable !== 'false');

/* --------------------------------------------------------------------- css -- */

/**
 * Reads the CSS subset the checks need — selector blocks, declarations with byte offsets, at-rule
 * conditions, @import targets. Comments are blanked rather than removed so every offset survives and
 * every finding can be reported with a real line number.
 */
export function parseCss(source) {
  const text = source.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, match => match.replace(/[^\n]/g, ' '));
  const newlinePositions = [];
  for (let index = text.indexOf('\n'); index >= 0; index = text.indexOf('\n', index + 1)) newlinePositions.push(index);
  const lineAt = offset => {
    let low = 0, high = newlinePositions.length;
    while (low < high) { const middle = (low + high) >> 1; if (newlinePositions[middle] < offset) low = middle + 1; else high = middle; }
    return low + 1;
  };
  const rules = [];
  const imports = [];
  const readImport = (statement, offset) => {
    const target = /url\(\s*(?:(["'])(.*?)\1|([^)]*))\s*\)|(["'])(.*?)\4/.exec(statement);
    const value = (target?.[2] ?? target?.[3] ?? target?.[5] ?? '').trim();
    if (value) imports.push({ value, line: lineAt(offset), offset });
  };
  const scan = (body, base, media) => {
    let index = 0, quote = null, start = 0, paren = 0;
    while (index < body.length) {
      const char = body[index];
      if (quote) { if (char === quote && body[index - 1] !== '\\') quote = null; index += 1; continue; }
      if (char === '"' || char === "'") { quote = char; index += 1; continue; }
      if (char === '(') paren += 1;
      else if (char === ')') paren = Math.max(0, paren - 1);
      else if (char === ';' && paren === 0) {
        const statement = body.slice(start, index).trim();
        if (/^@import/i.test(statement)) readImport(statement, base + start);
        start = index + 1;
      } else if (char === '{' && paren === 0) {
        const prelude = body.slice(start, index).trim();
        const close = matchingBrace(body, index);
        const innerStart = index + 1;
        index = close;
        start = close + 1;
        if (/^@(media|supports|container|layer|rule|scope|document)/i.test(prelude)) {
          scan(body.slice(innerStart, close), base + innerStart, /^@media/i.test(prelude) ? prelude.replace(/\s+/g, ' ') : media);
        } else if (!/^@/.test(prelude)) {
          rules.push(readRule(prelude, body.slice(innerStart, close), base + innerStart, media));
        }
      }
      index += 1;
    }
    const trailing = body.slice(start).trim();
    if (/^@import/i.test(trailing)) readImport(trailing, base + start);
  };
  scan(text, 0, null);
  return { rules, imports, lineAt };
}

function matchingBrace(body, index) {
  let depth = 0, quote = null;
  for (let i = index; i < body.length; i += 1) {
    const char = body[i];
    if (quote) { if (char === quote && body[i - 1] !== '\\') quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') { depth -= 1; if (depth === 0) return i; }
  }
  return body.length;
}

function readRule(prelude, body, base, media) {
  const declarations = [];
  let index = 0, quote = null, start = 0, paren = 0;
  const push = (text, offset) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('@')) return;
    const colon = trimmed.indexOf(':');
    if (colon < 1) return;
    const property = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    if (!property || !value) return;
    declarations.push({ property, value, offset });
  };
  while (index < body.length) {
    const char = body[index];
    if (quote) { if (char === quote && body[index - 1] !== '\\') quote = null; index += 1; continue; }
    if (char === '"' || char === "'") { quote = char; index += 1; continue; }
    if (char === '(') paren += 1;
    else if (char === ')') paren = Math.max(0, paren - 1);
    else if (char === ';' && paren === 0) { push(body.slice(start, index), base + start); start = index + 1; }
    index += 1;
  }
  push(body.slice(start), base + start);
  return { selector: prelude.replace(/\s+/g, ' '), media, declarations, offset: base };
}

const cssUrls = source => {
  const found = [];
  for (const match of String(source).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi)) {
    const value = (match[2] ?? match[3] ?? '').trim();
    if (value) found.push(value);
  }
  return found;
};

const flattenSelectors = selector => selector.split(',').map(part => part.trim()).filter(Boolean);

/** url() and @import targets inside a stylesheet the page loads that only work if another host answers. */
function cssExternalReferences(entry) {
  const found = [];
  const blanked = String(entry.source).replace(/\/\*[\s\S]*?(?:\*\/|$)/g, match => match.replace(/[^\n]/g, ' '));
  for (const match of blanked.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi)) {
    const value = isRuntimeExternal((match[2] ?? match[3] ?? '').trim());
    if (value) found.push({ value, line: entry.parsed.lineAt(match.index), where: 'url() in ' + entry.file });
  }
  for (const item of entry.parsed.imports) {
    const value = isRuntimeExternal(item.value);
    if (value) found.push({ value, line: item.line, where: '@import in ' + entry.file });
  }
  return found;
}

/** Returns the third-party URL when a reference only works if some other host answers. */
export function isRuntimeExternal(value) {
  const target = String(value ?? '').replace(/&amp;/g, '&').trim();
  if (!target || target.startsWith('#') || externalSchemes.test(target)) return null;
  if (!/^(?:https?:)?\/\//i.test(target)) return null;
  let url;
  try { url = new URL(target.startsWith('//') ? 'https:' + target : target); }
  catch { return target; }
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host.startsWith('127.') || host === '0.0.0.0') return null;
  if (/^(?:www\.)?w3\.org$/i.test(host) || host === 'schema.org') return null;
  return target;
}

function markupReferences(elements) {
  const references = [];
  for (const node of elements) {
    if (node.tag === 'a' || node.tag === 'html' || node.tag === 'head') continue;
    if (node.tag === 'link') {
      const rel = String(node.attrs.rel ?? '').toLowerCase();
      if (requestLinkRels.has(rel) && node.attrs.href) references.push({ where: `<link rel="${rel}">`, value: node.attrs.href, line: node.line });
      continue;
    }
    for (const attribute of runtimeAttributes) {
      const value = node.attrs[attribute];
      if (!value) continue;
      if (attribute === 'srcset') {
        for (const entry of String(value).split(',')) {
          const candidate = entry.trim().split(/\s+/)[0];
          if (candidate) references.push({ where: `<${node.tag} ${attribute}>`, value: candidate, line: node.line });
        }
      } else references.push({ where: `<${node.tag} ${attribute}>`, value, line: node.line });
    }
  }
  return references;
}

/** Maps a relative reference to a root-relative name, or null for anything not local. */
function localReference(fromFile, value) {
  const target = String(value ?? '').replace(/&amp;/g, '&').trim();
  if (!target || target.startsWith('#') || target.startsWith('/') || externalSchemes.test(target) || isRuntimeExternal(target)) return null;
  const path = target.split(/[?#]/, 1)[0];
  if (!path || /[<>|]/.test(path)) return null;
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { return null; }
  const absolute = resolve(dirname('/' + fromFile), decoded);
  const relativePath = slash(relative('/', absolute));
  return relativePath.startsWith('..') ? null : relativePath;
}

/* ------------------------------------------------------------ static checks -- */

/**
 * A var() reference keeps its full custom-property name. A token rename that leaves a dash behind
 * writes `var(----edge)`, which is a different property from the `--edge` that ships, and normalising
 * the leading dashes away is exactly how that defect survives the check.
 */
const customPropertyUse = /var\(\s*(--[^\s,;()]*)\s*(,)?/g;
const customPropertyDeclaration = /(?:^|[;{])\s*(--[\w-]+)\s*:/g;

/**
 * A rule no element on the page can match never paints, so a var() inside it is not this page's
 * defect even though the shared stylesheet is where the name appears — the pages that do match are
 * checked against their own markup. The test is one-sided: it skips only when a tag, class or id the
 * sample names is absent, and treats selectors it cannot read as able to match.
 */
function selectorMayMatch(selector, elements) {
  return String(selector).split(',').some(part => {
    const sample = part.replace(/::[\w-]+(?:\([^)]*\))?/g, ' ').replace(/:[\w-]+(?:\([^)]*\))?/g, ' ');
    const tags = [...sample.matchAll(/(?:^|[\s>+~(])([a-zA-Z][\w-]*)/g)].map(match => match[1].toLowerCase());
    const classes = [...sample.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(match => match[1]);
    const ids = [...sample.matchAll(/#([A-Za-z_][\w-]*)/g)].map(match => match[1]);
    if (!tags.length && !classes.length && !ids.length) return true;
    return tags.every(name => elements.some(node => node.tag === name)) &&
      classes.every(name => elements.some(node => String(node.attrs.class ?? '').split(/\s+/).includes(name))) &&
      ids.every(name => elements.some(node => node.attrs.id === name));
  });
}

/**
 * Every custom property the page's stylesheets declare, plus the ones its own markup declares in a
 * style attribute. Declarations are collected more generously than uses — a reference parsed out of a
 * blind spot in the stylesheet reader would otherwise be reported as a defect the page does not have.
 */
function undefinedCustomProperties(sources, elements) {
  const declared = new Set();
  for (const node of elements) {
    for (const match of String(node.attrs.style ?? '').matchAll(/(?:^|;)\s*(--[\w-]+)\s*:/g)) declared.add(match[1]);
  }
  for (const entry of sources) {
    for (const rule of entry.parsed.rules) for (const item of rule.declarations) if (item.property.startsWith('--')) declared.add(item.property);
    for (const match of entry.source.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, '').matchAll(customPropertyDeclaration)) declared.add(match[1]);
  }
  const found = [];
  for (const entry of sources) {
    for (const rule of entry.parsed.rules) {
      if (!selectorMayMatch(rule.selector, elements)) continue;
      for (const item of rule.declarations) {
        for (const match of item.value.matchAll(customPropertyUse)) {
          if (declared.has(match[1])) continue;
          found.push({
            file: entry.file, line: entry.parsed.lineAt(item.offset), selector: rule.selector, property: match[1],
            declaration: item.property,
            fallback: Boolean(match[2]), value: item.value.replace(/\s+/g, ' ').slice(0, 90)
          });
        }
      }
    }
  }
  return found;
}

/** ids used more than once, in document order, so the finding names the copy that broke it. */
function duplicateIds(elements) {
  const byId = new Map();
  for (const node of elements) {
    const id = node.attrs.id;
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(node);
  }
  return [...byId.values()].filter(nodes => nodes.length > 1).sort((a, b) => a[1].line - b[1].line);
}

/* ------------------------------------------------------------- phrase roles -- */

/**
 * The roles the Skill lists as phrase-shaped — heading, nav item, eyebrow, label, button, chip, stat
 * value, one-line caption. Tag names are only half of it: a `<p class="kicker">` is a label and a
 * `<figcaption>` inside prose is not, so a class that names the role counts as much as the tag does.
 * Anchored to whole class tokens because `hero-stage` is a stage, not a tag. Both layers read these
 * definitions from here, so a label judged clean in markup cannot be judged differently in the DOM.
 */
const labelClassSource = '^(?:[a-z][a-z0-9]*[-_])*(?:eyebrow|kicker|label|chip|badge|pill|tag|title|heading|caption|nav|menu|tab|tablist|button|btn|cta|stat|metric|step)(?:[-_][a-z0-9]+)*$';
/**
 * Two classes of mark, because the Skill splits them. A sentence mark ends a thought, so a reader sees
 * it as a defect wherever a line break puts it — including the first fragment of `textA.<br>textB`. A
 * connective mark (`，` `、` `,`) is only a defect when the phrase stops there with nothing left to
 * connect, so it is judged at the true end of the label. That distinction is what keeps the heading
 * `保留方法，<br>写出你的版本` — one comma joining two balanced clauses across a designed line break —
 * out of a check whose prose says structural marks are the ones to keep.
 */
const sentenceMarkSource = '[.。！!？?]$';
const connectiveMarkSource = '[，、,]$';
const phraseRoleSource = '^(?:heading|button|tab|menuitem|link)$';
const phraseTags = ['button', 'summary', 'legend', 'th', 'dt'];
const inlinePhraseTags = ['span', 'em', 'strong', 'i', 'b', 'u', 's', 'small', 'code', 'kbd', 'samp', 'abbr', 'time', 'mark', 'sub', 'sup', 'q', 'cite', 'a', 'br'];
const proseContainers = ['p', 'li', 'dd', 'blockquote', 'figcaption', 'caption', 'td'];
const navigationRoles = '^(?:navigation|menubar|tablist)$';
/** Display width, not code points: one CJK glyph costs two Latin characters of the line. */
const phraseUnits = text => [...text].reduce((sum, character) => sum + (cjkAny.test(character) ? 2 : 1), 0);
const phraseUnitBound = 72, phraseLineBound = 2;

const labelClassToken = new RegExp(labelClassSource, 'i');
const phraseRoles = new RegExp(phraseRoleSource, 'i');
const sentenceMark = new RegExp(sentenceMarkSource);
const connectiveMark = new RegExp(connectiveMarkSource);
const inlinePhraseSet = new Set(inlinePhraseTags);
const proseSet = new Set(proseContainers);

/**
 * The lines a phrase-role element renders, split where a reader sees a break. A heading written
 * `textA<br>textB`, or one whose tail sits in a following child span, hides the period at the end of
 * the first fragment from any end-of-string probe, so every fragment gets tested on its own.
 * Block children are left out: their own roles are judged on their own, and folding their prose into
 * the label's text is how a label wrapper reports somebody else's sentence.
 */
function phraseLines(node) {
  const lines = [];
  let current = '';
  const flush = () => {
    const value = current.replace(/\s+/g, ' ').trim();
    if (value) lines.push(value);
    current = '';
  };
  for (const child of node.children ?? []) {
    if (child.tag === 'script' || child.tag === 'style') continue;
    if (child.tag === '#text') { current += child.raw ? '' : child.text; continue; }
    if (child.tag === 'br') { flush(); continue; }
    if (!inlinePhraseSet.has(child.tag)) { flush(); continue; }
    current += textOf(child);
  }
  flush();
  return lines;
}

function inProse(node) {
  return ancestors(node).some(item => proseSet.has(item.tag));
}

/**
 * Which mark, if any, makes these lines a defect. A sentence mark is judged on every line, so a period
 * hidden at the end of `textA.<br>textB` cannot survive the line break; a connective mark is judged only
 * where the phrase actually stops. The render layer repeats this six-line test inline — the probe is
 * serialised into the page and cannot call this function — and the two must stay in step.
 */
function phraseMark(lines, sentence, connective) {
  for (const value of lines) if (sentence.test(value)) return { text: value.slice(0, 80), mark: 'sentence' };
  const last = lines[lines.length - 1];
  if (last && connective.test(last)) return { text: last.slice(0, 80), mark: 'connective' };
  return null;
}

function inNavigation(node) {
  return ancestors(node).some(item => item.tag === 'nav' || new RegExp(navigationRoles, 'i').test(String(item.attrs.role ?? '')));
}

/**
 * Phrase roles are decided by function, never by tag alone. An element already judged is not judged
 * again through its children, and a label longer than two lines of display text is prose in a
 * heading's clothes — which prose rules already cover.
 */
function labelPunctuation(elements) {
  const labelled = new Set();
  for (const node of elements) {
    for (const id of String(node.attrs['aria-labelledby'] ?? '').split(/\s+/).filter(Boolean)) labelled.add(id);
  }
  const found = [];
  const judged = new Set();
  for (const node of elements) {
    if (['script', 'style', 'svg', 'template', 'noscript'].includes(node.tag)) continue;
    if (ancestors(node).some(item => judged.has(item))) continue;
    const classHint = classesOf(node).split(/\s+/).filter(Boolean).some(token => labelClassToken.test(token));
    const namesSomething = Boolean(node.attrs.id) && labelled.has(node.attrs.id);
    const declaredRole = phraseRoles.test(String(node.attrs.role ?? ''));
    const navigationLink = node.tag === 'a' && node.attrs.href !== undefined && (classHint || inNavigation(node)) && !inProse(node);
    /* An inline span inside a paragraph is prose in the paragraph's middle, whatever its class is
       called — otherwise every labelled value written as `邮箱：jane@…` becomes a finding. */
    const proseInline = inProse(node) && inlinePhraseSet.has(node.tag) && !declaredRole && !namesSomething;
    const isPhrase = !proseInline && (/^h[1-6]$/.test(node.tag) || phraseTags.includes(node.tag) ||
      declaredRole || classHint || namesSomething || navigationLink);
    if (!isPhrase) continue;
    judged.add(node);
    const lines = phraseLines(node);
    const units = phraseUnits(lines.join(' '));
    if (!units || lines.length > phraseLineBound || units > phraseUnitBound) continue;
    const mark = phraseMark(lines, sentenceMark, connectiveMark);
    if (mark) found.push({ line: node.line, tag: node.tag, selector: describeElement(node), ...mark });
  }
  return found;
}

function auditStructure(page, elements) {
  const violations = [];
  const metrics = {};
  const html = elements.find(node => node.tag === 'html');
  const body = elements.find(node => node.tag === 'body') ?? { tag: 'body', attrs: {}, children: [], line: 1 };

  const lang = String(html?.attrs.lang ?? '').trim();
  metrics.lang = lang || null;
  if (!lang) {
    violations.push({
      code: 'PAGE_LANG', line: html?.line ?? 1, message: 'The html element has no lang attribute.',
      evidence: html ? describeElement(html) : 'no <html> element was parsed'
    });
  }

  const headings = elements.filter(node => /^h[1-6]$/.test(node.tag));
  const h1 = headings.filter(node => node.tag === 'h1');
  metrics.h1Count = h1.length;
  if (h1.length !== 1) {
    violations.push({
      code: 'H1_COUNT', line: h1[0]?.line ?? body.line,
      message: `Found ${h1.length} h1 elements on this page; the rule is exactly one.`,
      evidence: h1.length ? h1.map(node2 => describeElement(node2) + ':' + node2.line).join(', ')
        : 'first heading is ' + (headings[0] ? 'h' + headings[0].tag[1] + ':' + headings[0].line : 'absent')
    });
  }
  let previousLevel = 0;
  let skips = 0;
  for (const node of headings) {
    const level = Number(node.tag[1]);
    if (level > previousLevel + 1) {
      skips += 1;
      violations.push({
        code: 'HEADING_SKIP', line: node.line,
        message: `Heading level jumps from ${previousLevel ? 'h' + previousLevel : 'no heading'} to h${level}.`,
        evidence: textOf(node).replace(/\s+/g, ' ').trim().slice(0, 60) || describeElement(node)
      });
    }
    previousLevel = Math.max(previousLevel, level);
  }
  metrics.headingSkips = skips;
  metrics.headingLevels = headings.map(node => Number(node.tag[1]));

  const terms = elements.filter(node => node.tag === 'dt' || node.tag === 'dd');
  /* A description list may group each term with its definition inside a `div` that is itself a direct
     child of the `dl` — that is the form the HTML spec sanctions for styling a pair, and it is the one
     most real pages use. Reading only the direct parent reported every such group as an orphan, which
     turned a correct page into sixteen findings and made a checker's error look like a site defect. */
  const inDescriptionGroup = node =>
    node.parent?.tag === 'dl' || (node.parent?.tag === 'div' && node.parent.parent?.tag === 'dl');
  const orphans = terms.filter(node => !inDescriptionGroup(node));
  metrics.definitionTerms = terms.length;
  metrics.orphanDefinitionTerms = orphans.length;
  for (const orphan of orphans.slice(0, samples)) {
    violations.push({
      code: 'DEFINITION_LIST', line: orphan.line,
      message: `A ${orphan.tag} is not inside a dl (direct parent is <${orphan.parent?.tag ?? 'none'}>).`,
      evidence: textOf(orphan).replace(/\s+/g, ' ').trim().slice(0, 60) || describeElement(orphan)
    });
  }
  const malformed = [];
  for (const list of elements.filter(node => node.tag === 'dl')) {
    const children = list.children.filter(child => !(child.tag === '#text' && !child.text.trim()));
    for (const child of children) {
      if (child.tag === '#text') { malformed.push({ line: child.line, found: 'loose text directly inside dl' }); continue; }
      if (child.tag === 'dt' || child.tag === 'dd') continue;
      if (child.tag === 'div') {
        for (const inner of child.children) {
          if (inner.tag !== '#text' && inner.tag !== 'dt' && inner.tag !== 'dd') malformed.push({ line: inner.line, found: '<' + inner.tag + '> inside a dl group' });
          else if (inner.tag === '#text' && inner.text.trim()) malformed.push({ line: inner.line, found: 'loose text inside a dl group' });
        }
        continue;
      }
      malformed.push({ line: child.line, found: '<' + child.tag + '> as a direct dl child' });
    }
    const hasTerm = children.some(child => child.tag === 'dt' ||
      (child.tag === 'div' && child.children.some(inner => inner.tag === 'dt')));
    if (!hasTerm) malformed.push({ line: list.line, found: 'dl with no dt' });
  }
  metrics.malformedDefinitionLists = malformed.length;
  for (const problem of malformed.slice(0, samples)) {
    violations.push({ code: 'DEFINITION_LIST', line: problem.line ?? 1, message: 'A dl group is incomplete: ' + problem.found + '.', evidence: page.file });
  }

  const nestedFooters = elements.filter(node => node.tag === 'footer' && ancestors(node).some(item => item.tag === 'main'));
  metrics.footersInsideMain = nestedFooters.length;
  for (const node of nestedFooters) {
    violations.push({ code: 'FOOTER_IN_MAIN', line: node.line, message: 'A footer is nested inside main, so contentinfo is not exposed.', evidence: describeElement(node) });
  }

  const tables = elements.filter(node => node.tag === 'table');
  const captionless = tables.filter(node => {
    const caption = node.children.find(child => child.tag === 'caption');
    return !caption || !textOf(caption).trim();
  });
  const unscooped = tables.flatMap(table => [...walkElements(table)]
    .filter(node => node.tag === 'th' && !['col', 'colgroup', 'row', 'rowgroup'].includes(String(node.attrs.scope ?? '').toLowerCase())));
  metrics.tables = tables.length;
  metrics.tablesWithoutCaption = captionless.length;
  metrics.headerCellsWithoutScope = unscooped.length;
  for (const node of captionless.slice(0, samples)) {
    violations.push({ code: 'TABLE_CAPTION', line: node.line, message: 'A table has no caption with text.', evidence: describeElement(node) });
  }
  for (const node of unscooped.slice(0, samples)) {
    violations.push({ code: 'TH_SCOPE', line: node.line, message: 'A th declares no valid scope attribute.', evidence: textOf(node).replace(/\s+/g, ' ').trim().slice(0, 40) || describeElement(node) });
  }

  const anchors = elements.filter(node => node.tag === 'a' && /^#/.test(String(node.attrs.href ?? '')));
  const skip = anchors.find(node => /skip/i.test(classesOf(node) + ' ' + String(node.attrs.id ?? '')) ||
    /skip|跳转|跳至|跳到|跳过/i.test(textOf(node)));
  metrics.skipLink = Boolean(skip);
  metrics.skipTargetTabindex = null;
  if (!skip) {
    violations.push({
      code: 'SKIP_LINK', line: body.line, message: 'No skip link pointing at an in-page target was found.',
      evidence: anchors.length ? anchors.length + ' hash anchor(s), none labelled as a skip link' : 'no hash anchors at all'
    });
  } else {
    const id = String(skip.attrs.href).slice(1).split(/[?,#]/)[0];
    const target = id ? elements.find(node => node.attrs.id === id) : null;
    if (!target) {
      violations.push({ code: 'SKIP_LINK', line: skip.line, message: `The skip link targets #${id}, which this page does not contain.`, evidence: describeElement(skip) });
    } else {
      const order = tabbableOrder(target.attrs);
      metrics.skipTargetTabindex = order;
      if (!(order === -1 || (Number.isFinite(order) && order > 0) || focusableWithoutTabindex(target.tag, target.attrs))) {
        violations.push({ code: 'SKIP_TARGET_TABINDEX', line: target.line, message: `The skip target <${target.tag}> does not carry tabindex="-1".`, evidence: describeElement(target) });
      }
    }
  }

  /* A link with no destination is not a smaller link: href="" and href="#" both resolve to the page
     itself, so the control looks finished, the click does something, and the reader gets the page they
     were already on. The resolved URL is static-derivable, so this needs no browser. */
  const destinationless = elements.filter(node => node.tag === 'a' && node.attrs.href !== undefined &&
    ['', '#'].includes(String(node.attrs.href).trim()));
  metrics.anchorsWithoutDestination = destinationless.length;
  for (const node of destinationless.slice(0, samples)) {
    violations.push({
      code: 'EMPTY_LINK', line: node.line,
      message: 'An anchor carries no destination: its href is empty or "#", so it resolves to the page it sits on.',
      evidence: describeElement(node) + ' "' + textOf(node).replace(/\s+/g, ' ').trim().slice(0, 60) + '"'
    });
  }

  const textRuns = elements.filter(node => !node.children.some(child => child.tag !== '#text'));
  metrics.cjkTextRuns = textRuns.filter(node => cjkAny.test(textOf(node))).length;
  metrics.cjkGlyphs = textRuns.reduce((sum, node) => sum + (textOf(node).match(cjkAll) ?? []).length, 0);
  metrics.unmatchedCloseTags = page.parsed.unmatched.length;
  metrics.htmlBytes = page.bytes;
  return { violations, metrics };
}

/** Resolves the stylesheets a page loads, following local @import, and reports what does not ship. */
function collectCss(page, files) {
  const sources = [];
  const missing = [];
  const queue = [];
  const seen = new Set();
  for (const node of page.elements.filter(item => item.tag === 'link' && /stylesheet/i.test(String(item.attrs.rel ?? '')))) {
    if (isRuntimeExternal(node.attrs.href)) continue;
    const target = localReference(page.file, node.attrs.href);
    if (target) queue.push({ target, from: page.file, line: node.line });
  }
  while (queue.length) {
    const item = queue.shift();
    if (seen.has(item.target)) continue;
    seen.add(item.target);
    const entry = files.get(item.target);
    if (!entry) { missing.push({ file: item.target, from: item.from, line: item.line }); continue; }
    sources.push({ file: item.target, source: entry.text, bytes: entry.bytes.length, parsed: parseCss(entry.text) });
    for (const imported of sources[sources.length - 1].parsed.imports) {
      if (isRuntimeExternal(imported.value)) continue;
      const target = localReference(item.target, imported.value);
      if (target) queue.push({ target, from: item.target, line: imported.line });
    }
  }
  return { sources, missing, names: new Set(sources.map(item => item.file)) };
}

/** Every declaration in the page's CSS, tagged with the file and line it came from. */
function cssDeclarations(sources) {
  const rules = [];
  for (const entry of sources) {
    for (const rule of entry.parsed.rules) {
      rules.push({
        file: entry.file, selector: rule.selector, media: rule.media,
        declarations: rule.declarations.map(item => ({ property: item.property, value: item.value, file: entry.file, line: entry.parsed.lineAt(item.offset), selector: rule.selector, media: rule.media }))
      });
    }
  }
  return rules;
}

/** Classes that only ever appear on SVG drawing elements. A px font-size there is in the
 *  graphic's user units, not a step in the page's type scale, so the scale rule must not
 *  claim it — those sizes have to compensate for how the canvas is scaled instead.
 *  A class that also styles an HTML element loses the exemption: on that text the literal is
 *  a scale break like any other, and the exemption has to stay narrow to stay credible. */
function svgScopedClasses(elements) {
  const svgTags = new Set(['svg', 'g', 'text', 'tspan', 'textpath', 'foreignobject', 'tref', 'switch']);
  const onSvg = new Set();
  const onHtml = new Set();
  for (const element of elements) {
    const names = String(element.attrs.class ?? '').split(/\s+/).filter(Boolean);
    if (svgTags.has(String(element.tag).toLowerCase())) for (const name of names) onSvg.add(name);
    else for (const name of names) onHtml.add(name);
  }
  for (const name of onHtml) onSvg.delete(name);
  return onSvg;
}

function fontScale(rules, svgClasses = new Set()) {
  const hardcoded = [];
  const tokenUses = [];
  const scaleTokens = new Set();
  for (const rule of rules) {
    const selectorClasses = new Set((rule.selector.match(/\.([\w-]+)/g) ?? []).map(token => token.slice(1)));
    const svgScoped = [...selectorClasses].some(name => svgClasses.has(name));
    for (const item of rule.declarations) {
      if (item.property.startsWith('--')) {
        if (/^--[\w-]*(?:font|text|type|size|fs|step|scale)[\w-]*$/i.test(item.property) && /[\d.]+(?:px|rem|em|%)|calc\(/i.test(item.value)) scaleTokens.add(item.property);
        continue;
      }
      if (item.property.toLowerCase() !== 'font-size') continue;
      if (/\bvar\(\s*--/i.test(item.value)) tokenUses.push(item);
      else if (!svgScoped) hardcoded.push(item);
    }
  }
  return { hardcoded, tokenUses, scaleTokens: [...scaleTokens].sort() };
}

function focusVisibleCoverage(rules) {
  const selectors = [];
  for (const rule of rules) {
    for (const part of flattenSelectors(rule.selector)) {
      if (/:focus-visible\b/i.test(part)) selectors.push({ selector: part, file: rule.file, line: rule.declarations[0]?.line ?? 0 });
    }
  }
  const covered = {};
  for (const key of Object.keys(focusTargets)) {
    covered[key] = selectors.some(item => focusTargets[key].test(item.selector) ||
      universalTarget.test(item.selector) || bareSelectorTarget(item.selector));
  }
  return { selectors, covered, any: selectors.length > 0 };
}

/** Which interactive types the page actually contains: a site with no disclosure widget needs no summary indicator. */
function interactiveTypes(elements) {
  const present = {};
  present['a[href]'] = elements.some(node => node.tag === 'a' && node.attrs.href !== undefined);
  present.button = elements.some(node => ['button', 'input', 'select', 'textarea'].includes(node.tag) ||
    /(?:submit|reset|image|button)/i.test(String(node.attrs.type ?? '')));
  present.summary = elements.some(node => node.tag === 'summary' || node.tag === 'details');
  present['[tabindex]'] = elements.some(node => node.attrs.tabindex !== undefined);
  return present;
}

const evidenceList = items => items.slice(0, samples).map(item => `${item.file}:${item.line} ${item.selector} { font-size: ${item.value} }`).join(' | ');

function auditPage(page, files, options, sharedSvgClasses = null) {
  const violations = [];
  const structure = auditStructure(page, page.elements);
  violations.push(...structure.violations);
  const metrics = { ...structure.metrics };

  const inlineStyles = page.elements.filter(node => node.tag === 'style');
  const inlineText = inlineStyles.map(node => rawTextOf(node)).join('\n');
  const css = collectCss(page, files);
  const inlineUnit = { file: page.file + ' (inline <style>)', source: inlineText, bytes: Buffer.byteLength(inlineText, 'utf8'), parsed: parseCss(inlineText) };
  const rules = cssDeclarations([inlineUnit, ...css.sources]);

  metrics.stylesheets = css.sources.length;
  metrics.cssBytes = css.sources.reduce((sum, item) => sum + item.bytes, 0) + inlineUnit.bytes;
  metrics.missingStylesheets = css.missing.length;
  for (const item of css.missing) {
    violations.push({ code: 'MISSING_RESOURCE', line: item.line, message: `The page links ${item.file}, which is not in the shipped directory.`, evidence: 'linked by ' + item.from });
  }

  /* Undefined custom properties are the one defect class that cannot announce itself: the browser
     drops the declaration, the page still paints, and the console stays clean. */
  const undefinedVars = undefinedCustomProperties([inlineUnit, ...css.sources], page.elements);
  metrics.undefinedCustomProperties = undefinedVars.length;
  for (const item of undefinedVars.slice(0, samples)) {
    violations.push({
      code: 'CSS_UNDEFINED_VAR', line: item.line, ownedBy: item.file,
      message: `${item.property} is read by var() but declared in no stylesheet this page loads` +
        (item.fallback ? ' — the fallback is what renders here.' : ' — this declaration drops, and nothing logs it.'),
      evidence: `${item.selector} { ${item.declaration}: ${item.value.slice(0, 52)} } @${item.file}`
    });
  }

  const duplicated = duplicateIds(page.elements);
  metrics.duplicateIds = duplicated.reduce((sum, nodes) => sum + nodes.length - 1, 0);
  for (const nodes of duplicated.slice(0, samples)) {
    violations.push({
      code: 'DUPLICATE_ID', line: nodes[1].line,
      message: `id="${nodes[0].attrs.id}" appears ${nodes.length} times on this page, so each aria-labelledby and in-page anchor aimed at it resolves to the first only.`,
      evidence: nodes.slice(0, samples).map(node => describeElement(node) + ':' + node.line).join(' | ')
    });
  }

  const punctuatedLabels = labelPunctuation(page.elements);
  metrics.labelPunctuation = punctuatedLabels.length;
  metrics.labelSentenceMarks = punctuatedLabels.filter(item => item.mark === 'sentence').length;
  for (const item of punctuatedLabels.slice(0, samples)) {
    violations.push({
      code: 'LABEL_PUNCTUATION', line: item.line,
      message: `A phrase role (<${item.tag}>) ${item.mark === 'sentence'
        ? 'ends a line with a sentence mark, which reads as a text dump in a box'
        : 'stops on a connective mark with nothing left to connect'}, on "${item.text}"`,
      evidence: item.selector
    });
  }

  const inlineScriptText = page.elements.filter(node => node.tag === 'script' && !node.attrs.src).map(node => rawTextOf(node)).join('\n');
  metrics.inlineScriptBytes = Buffer.byteLength(inlineScriptText, 'utf8');
  metrics.scriptBytes = page.scripts.reduce((sum, item) => sum + item.bytes, 0) + metrics.inlineScriptBytes;
  metrics.reachableScriptBytes = metrics.scriptBytes + page.reachableExtraBytes;
  metrics.blockingScriptBytes = page.scripts.filter(item => item.blocking).reduce((sum, item) => sum + item.bytes, 0) + metrics.inlineScriptBytes;
  metrics.criticalPathBytes = metrics.htmlBytes + metrics.cssBytes + metrics.blockingScriptBytes;

  metrics.prefersReducedMotion = rules.some(rule => /prefers-reduced-motion/i.test(rule.media ?? ''));
  if (!metrics.prefersReducedMotion) {
    violations.push({
      code: 'REDUCED_MOTION', line: 1, message: 'The CSS this page loads contains no prefers-reduced-motion block.',
      evidence: [page.file, ...css.names].join(' + ')
    });
  }

  metrics.reducedMotionInScript = /prefers-reduced-motion/i.test(inlineScriptText) ||
    page.scriptFiles.some(name => (files.get(name)?.text ?? '').includes('prefers-reduced-motion'));

  const coverage = focusVisibleCoverage(rules);
  const interactive = interactiveTypes(page.elements);
  const required = Object.keys(focusTargets).filter(key => interactive[key]);
  metrics.focusVisibleSelectors = coverage.selectors.length;
  metrics.focusVisibleTypesPresent = required;
  metrics.focusVisibleCovered = Object.entries(coverage.covered).filter(([, hit]) => hit).map(([key]) => key);
  const uncovered = required.filter(key => !coverage.covered[key]);
  if (!coverage.any && required.length) {
    violations.push({
      code: 'FOCUS_VISIBLE_SCOPE', line: 1,
      message: 'No :focus-visible rule exists in the CSS this page loads.',
      evidence: required.join(', ') + ' present but no focus indicator'
    });
  } else if (uncovered.length) {
    violations.push({
      code: 'FOCUS_VISIBLE_SCOPE', line: coverage.selectors[0]?.line ?? 1, ownedBy: coverage.selectors[0]?.file,
      message: 'The :focus-visible rule does not reach ' + uncovered.join(', ') + '.',
      evidence: coverage.selectors.slice(0, samples).map(item => item.selector + '@' + item.file + ':' + item.line).join(' | ')
    });
  }

  const scale = fontScale(rules, sharedSvgClasses ?? svgScopedClasses(page.elements));
  metrics.hardcodedFontSizes = scale.hardcoded.length;
  metrics.tokenFontSizes = scale.tokenUses.length;
  metrics.scaleTokensDefined = scale.scaleTokens.length;
  if (scale.hardcoded.length && !scale.tokenUses.length && scale.hardcoded.length >= 3) {
    violations.push({
      code: 'FONT_SCALE_NO_TOKENS', line: scale.hardcoded[0].line, ownedBy: scale.hardcoded[0].file,
      message: `${scale.hardcoded.length} hardcoded font-size declarations and none derived from a token: there is no scale to maintain.`,
      evidence: evidenceList(scale.hardcoded)
    });
  } else if (scale.tokenUses.length && scale.hardcoded.length) {
    violations.push({
      code: 'FONT_SCALE_HARDCODED', line: scale.hardcoded[0].line, ownedBy: scale.hardcoded[0].file,
      message: `Type derives from a token ${scale.tokenUses.length} times but ${scale.hardcoded.length} font-size declarations stay hardcoded, so "change one value and the scale follows" is false.`,
      evidence: evidenceList(scale.hardcoded)
    });
  }

  const externals = [];
  for (const reference of markupReferences(page.elements)) {
    const value = isRuntimeExternal(reference.value);
    if (value) externals.push({ ...reference, value });
  }
  for (const node of inlineStyles) {
    for (const value of cssUrls(rawTextOf(node))) {
      const external = isRuntimeExternal(value);
      if (external) externals.push({ where: 'inline <style> url()', value: external, line: node.line });
    }
  }
  for (const entry of css.sources) {
    for (const item of cssExternalReferences(entry)) externals.push(item);
  }
  for (const node of page.elements.filter(item => item.tag === 'script' && !item.attrs.src)) {
    for (const match of rawTextOf(node).matchAll(/(["'`])((?:https?:)?\/\/[^\s"'`<>]+)\1/gi)) {
      const external = isRuntimeExternal(match[2]);
      if (external) externals.push({ where: 'inline <script> string', value: external, line: node.line });
    }
  }
  metrics.externalRuntimeReferences = externals.length;
  for (const item of externals.slice(0, samples)) {
    violations.push({ code: 'THIRD_PARTY_RUNTIME', line: item.line, message: `A runtime reference only works if a third-party host answers: ${item.value}`, evidence: item.where });
  }

  const offscreen = [];
  for (const rule of rules) {
    for (const item of rule.declarations) {
      if (!hiddenOffsetProperty.test(item.property)) continue;
      for (const match of item.value.replace(/\s+/g, '').matchAll(/(-[\d.]+)(px|em|rem|pt)/gi)) {
        const size = Number(match[1]);
        if (match[2].toLowerCase() === 'px' ? size <= -500 : size <= -20) offscreen.push({ ...item, magnitude: size + match[2] });
      }
    }
  }
  metrics.offscreenHideDeclarations = offscreen.length;
  for (const item of offscreen.slice(0, samples)) {
    violations.push({ code: 'OFFSCREEN_HIDE', line: item.line, ownedBy: item.file, message: `Hidden-until-focused uses ${item.property}: ${item.magnitude} instead of clip-path.`, evidence: item.selector + ' @' + item.file });
  }

  if (metrics.criticalPathBytes > options.maxCriticalBytes) {
    violations.push({
      code: 'CRITICAL_PATH_BUDGET', line: 1,
      message: `Critical path is ${metrics.criticalPathBytes} bytes against the ${options.maxCriticalBytes} byte ceiling.`,
      evidence: [`html:${metrics.htmlBytes}`, ...css.sources.map(item => item.file + ':' + item.bytes), 'inline:' + inlineUnit.bytes, 'blocking-js:' + metrics.blockingScriptBytes].join(' + ')
    });
  }
  if (metrics.scriptBytes > options.maxScriptBytes) {
    violations.push({
      code: 'JS_BUDGET', line: 1,
      message: `JavaScript this page cannot avoid is ${metrics.scriptBytes} bytes against the ${options.maxScriptBytes} byte floor ceiling.`,
      evidence: page.scripts.map(item => item.file + ':' + item.bytes).join(' + ')
    });
  }
  /* Not a violation, and deliberately not folded into the number above. Everything an import() could
     pull in is the worst case a route can reach, not what it pays: an English case page and a Chinese
     case page share a markup tag and share nothing else. The browser layer measures the real transfer
     per route, so printing this as though it were a cost would double-count the same choice. */
  metrics.deferredScriptFiles = page.deferredScripts;
  return { violations, metrics, css: css.names };
}

const checksFor = (metrics, options) => ({
  singleH1: metrics.h1Count === 1,
  noHeadingSkips: metrics.headingSkips === 0,
  definitionListsValid: metrics.orphanDefinitionTerms === 0 && metrics.malformedDefinitionLists === 0,
  footerOutsideMain: metrics.footersInsideMain === 0,
  langDeclared: Boolean(metrics.lang),
  skipLinkUsable: metrics.skipLink === true,
  tablesCaptioned: metrics.tablesWithoutCaption === 0,
  headerCellsScoped: metrics.headerCellsWithoutScope === 0,
  focusVisibleCoversInteractives: (metrics.focusVisibleTypesPresent ?? []).every(key => metrics.focusVisibleCovered.includes(key)),
  reducedMotionHandled: metrics.prefersReducedMotion === true,
  noOffscreenHide: metrics.offscreenHideDeclarations === 0,
  noThirdPartyRuntime: metrics.externalRuntimeReferences === 0,
  fontScaleTokenDriven: metrics.hardcodedFontSizes === 0 || metrics.tokenFontSizes > metrics.hardcodedFontSizes,
  everyCustomPropertyDeclared: metrics.undefinedCustomProperties === 0,
  uniqueElementIds: metrics.duplicateIds === 0,
  anchorsHaveDestinations: metrics.anchorsWithoutDestination === 0,
  phraseRolesUnpunctuated: metrics.labelPunctuation === 0,
  criticalPathWithinBudget: metrics.criticalPathBytes <= options.maxCriticalBytes,
  javascriptWithinBudget: metrics.scriptBytes <= options.maxScriptBytes,
  everyLinkedStylesheetShips: metrics.missingStylesheets === 0
});

/* --------------------------------------------------------------- packaging -- */

function classifyShippedFile(file, text) {
  const name = file.split('/').pop();
  const lower = name.toLowerCase();
  const extension = extname(lower);
  const base = lower.slice(0, lower.length - extension.length);
  if (lower === '.nojekyll' || lower === '.gitkeep' || file.split('/').includes('vendor')) return [];
  if (documentationNames.test(lower) || documentationNames.test(base)) return [];
  if (metadataNames.test(lower) || metadataNames.test(base)) return [{ code: 'SHIP_METADATA', message: 'Build or tool metadata shipped inside the deliverable: ' + name }];
  const findings = [];
  if (scratchNames.test(base) || scratchNames.test(lower)) findings.push({ code: 'SHIP_SCRATCH_PAGE', message: 'Scratch or comparison-arm file shipped in the deliverable: ' + name });
  if (nonDeliverableExtensions.has(extension) || !deliverableExtensions.has(extension)) {
    findings.push({ code: 'SHIP_METADATA', message: 'Non-deliverable file type inside the shipped directory: ' + name });
  }
  if (extension === '.html' && text) {
    const marker = contentScratch.exec(text);
    if (marker) findings.push({ code: 'SHIP_SCRATCH_PAGE', message: 'Scratch marker inside a shipped page: ' + marker[0].replace(/\s+/g, ' ').slice(0, 70) });
  }
  return findings;
}

/* ------------------------------------------------------------- render layer -- */

/**
 * Runs inside the page. It is serialised with Function.prototype.toString, so `node --check` reads it
 * as real code, and it closes over nothing: thresholds arrive as an argument.
 */
function measureRenderedPage(options) {
  const cjk = new RegExp(options.cjkPattern);
  const cjkGlobal = new RegExp(options.cjkPattern, 'g');
  const client = document.documentElement.clientWidth;
  const round = (value, digits) => Number.isFinite(value) ? Number(value.toFixed(digits ?? 3)) : null;
  const px = value => { const match = /^(-?[\d.]+)px$/.exec(String(value)); return match ? Number(match[1]) : null; };
  const selectorOf = element => {
    const parts = [];
    let node = element;
    for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth += 1) {
      let name = node.tagName.toLowerCase();
      if (node.id) name += '#' + node.id;
      const classes = (typeof node.className === 'string' ? node.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (classes.length) name += '.' + classes.join('.');
      const parent = node.parentElement;
      if (parent) {
        const same = Array.prototype.filter.call(parent.children, child => child.tagName === node.tagName);
        if (same.length > 1) name += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      }
      parts.unshift(name);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const sentinel = '#010203';
  const resolveColor = value => {
    if (!value) return null;
    context.fillStyle = sentinel;
    context.fillStyle = String(value);
    if (String(context.fillStyle).toLowerCase() === sentinel) return null;
    context.clearRect(0, 0, 1, 1);
    context.globalAlpha = 1;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    const alpha = data[3] / 255;
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return { r: Math.round(Math.min(255, data[0] / alpha)), g: Math.round(Math.min(255, data[1] / alpha)), b: Math.round(Math.min(255, data[2] / alpha)), a: alpha };
  };
  const flatten = layers => {
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const layer = layers[index];
      base = { r: layer.r * layer.a + base.r * (1 - layer.a), g: layer.g * layer.a + base.g * (1 - layer.a), b: layer.b * layer.a + base.b * (1 - layer.a), a: 1 };
    }
    return base;
  };
  const channel = value => { const part = value / 255; return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4; };
  const luminance = color => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  const ratioOf = (first, second) => {
    const light = luminance(first), dark = luminance(second);
    return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
  };
  /* An ancestor's background only reaches the glyphs if the ancestor's painted box actually
     intersects the text. A 1px rule that owns a background (a chart marker, an underline span)
     can contain the label in the DOM while painting nowhere near it; reading its colour as the
     backdrop reported dark-on-dark for text that sat on the page all along. Skip boxes that do
     not overlap the run, and keep walking to the surface that does. */
  const backgroundFor = (element, rect) => {
    const layers = [];
    let node = element, image = false, opaque = false;
    while (node && node.nodeType === 1) {
      const box = node.getBoundingClientRect();
      const covers = !rect || (box.right > rect.left && box.left < rect.right && box.bottom > rect.top && box.top < rect.bottom);
      if (covers) {
        const style = getComputedStyle(node);
        if (style.backgroundImage && style.backgroundImage !== 'none') image = true;
        const color = resolveColor(style.backgroundColor);
        if (color && color.a > 0) layers.push(color);
        if (color && color.a >= 1) { opaque = true; break; }
      }
      node = node.parentElement;
    }
    return { color: flatten(layers), solid: opaque && !image };
  };
  const isVisible = element => {
    if (typeof element.checkVisibility === 'function') {
      try { return element.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true }); }
      catch { /* older engine: fall through to the manual walk */ }
    }
    let node = element;
    while (node && node.nodeType === 1) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      node = node.parentElement;
    }
    return true;
  };

  const tracking = [];
  const contrastFailures = [];
  const sizes = [];
  const fontProbe = [];
  const probed = new Set();
  let characters = 0, contrastMeasured = 0, contrastUnmeasurable = 0, cjkRuns = 0;
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = node.nodeValue;
    if (!value || !/\S/.test(value)) continue;
    const element = node.parentElement;
    if (!element || /^(?:SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(element.tagName)) continue;
    if (!isVisible(element)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) continue;
    const style = getComputedStyle(element);
    // Type drawn inside a scaled SVG coordinate system reports its size in user units, not in
    // pixels on screen: 13.5px of axis label on a 640-unit canvas painted into a 320px card is
    // 6.75px to the reader. The declared value would clear any floor the audit knows about, so
    // the screen transform has to be folded in before the comparison means anything.
    const ctmScale = element.ownerSVGElement && typeof element.getScreenCTM === 'function'
      ? Math.abs(element.getScreenCTM()?.a ?? 1) : 1;
    const declaredSize = px(style.fontSize);
    const size = declaredSize === null ? null : declaredSize * ctmScale;
    if (size !== null) sizes.push({ size: round(size), svgScaled: ctmScale !== 1, scale: round(ctmScale, 3), selector: selectorOf(element), text: value.trim().replace(/\s+/g, ' ').slice(0, 40) });
    /* Which face actually got painted is not answerable from inside the page: getComputedStyle
       returns the font-family list exactly as the stylesheet wrote it, never the one the browser
       resolved glyph-by-glyph. Tag each run that needs checking with a stable attribute so the
       caller can read CSS.getPlatformFontsForNode against it, and hand back what the CSS claimed.
       Only CJK runs and display-size text are tagged — a run of Latin prose at body size is not the
       case where a system stack quietly changes the weight on you. */
    if (!probed.has(element) && (cjk.test(value) || (size ?? 0) >= 24)) {
      probed.add(element);
      const index = fontProbe.length;
      element.setAttribute('data-audit-font', String(index));
      fontProbe.push({
        index, selector: selectorOf(element), tag: element.tagName.toLowerCase(),
        declaredFamily: style.fontFamily, declaredWeight: style.fontWeight,
        sizePx: round(size ?? 0), text: value.trim().replace(/\s+/g, ' ').slice(0, 40),
      });
    }
    if (cjk.test(value)) {
      cjkRuns += 1;
      const spacingPx = style.letterSpacing === 'normal' ? 0 : px(style.letterSpacing);
      if (spacingPx !== null && Math.abs(spacingPx) > 0.02) {
        characters += (value.match(cjkGlobal) ?? []).length;
        tracking.push({
          selector: selectorOf(element), tag: element.tagName.toLowerCase(),
          letterSpacingPx: round(spacingPx), fontSizePx: round(size ?? 0), em: size ? round(spacingPx / size) : null,
          text: value.trim().replace(/\s+/g, ' ').slice(0, 30)
        });
      }
    }
    const foreground = resolveColor(style.color);
    if (!foreground || foreground.a === 0) continue;
    const background = backgroundFor(element, rect);
    if (!background.solid) { contrastUnmeasurable += 1; continue; }
    contrastMeasured += 1;
    const ratio = ratioOf(foreground, background.color);
    const bold = Number(style.fontWeight) >= 700;
    const large = (size ?? 0) >= 24 || ((size ?? 0) >= 18.66 && bold);
    const floor = large ? options.largeFloor : options.bodyFloor;
    if (ratio < floor) {
      contrastFailures.push({
        ratio: round(ratio), floor, large, foreground: style.color,
        background: [Math.round(background.color.r), Math.round(background.color.g), Math.round(background.color.b)].join(','),
        fontSizePx: round(size ?? 0), selector: selectorOf(element), text: value.trim().replace(/\s+/g, ' ').slice(0, 40)
      });
    }
  }

  const overflowing = [];
  const clipped = [];
  let wideInScrollers = 0;
  for (const element of document.querySelectorAll('body *')) {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.position === 'fixed' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    const rect = element.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    if (rect.right <= client + 1 && rect.left >= -1) continue;
    let ancestor = element.parentElement, scroller = null;
    while (ancestor) {
      const overflowX = getComputedStyle(ancestor).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden') { scroller = { selector: selectorOf(ancestor), scrolls: overflowX !== 'hidden' }; break; }
      ancestor = ancestor.parentElement;
    }
    const sample = { selector: selectorOf(element), tag: element.tagName.toLowerCase(), left: round(rect.left, 1), right: round(rect.right, 1), width: round(rect.width, 1), scroller, whiteSpace: style.whiteSpace };
    /* A box inside a scrollable ancestor is reachable; a box inside an overflow:hidden
       ancestor is being masked on purpose by something — a reveal, a marquee, a stage.
       Neither is a layout failure, and reporting them as one is how an overflow check
       earns eighty warnings on a correct page and gets switched off. Only a box that
       leaves the viewport with nothing clipping it is a real defect. */
    if (scroller && scroller.scrolls) { wideInScrollers += 1; continue; }
    if (scroller) { clipped.push(sample); continue; }
    overflowing.push(sample);
  }

  /* A case page built by looping one template only shows its repeated id after the route has
     rendered. The markup the static parser walked can be clean while the document the reader gets
     has seven copies of the same id, and the seventh is the one that broke aria-labelledby. */
  const idGroups = new Map();
  for (const element of document.querySelectorAll('[id]')) {
    const value = element.id;
    if (!value) continue;
    const group = idGroups.get(value) ?? { id: value, count: 0, samples: [] };
    group.count += 1;
    if (group.samples.length < 6) group.samples.push(selectorOf(element));
    idGroups.set(value, group);
  }
  const ids = Array.from(idGroups.values()).filter(group => group.count > 1)
    .map(group => ({ id: group.id, count: group.count, extra: group.count - 1, samples: group.samples }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  /* The phrase-role vocabulary is defined once, in Layer 1, and cannot be closed over here, so the
     sources travel as JSON and are rebuilt in the page. One definition, two documents: a label that
     reads clean in markup must not be judged differently in the DOM, so neither layer consults
     visibility — the same strings are tested either way. */
  const classToken = new RegExp(options.labelClassPattern, 'i');
  const sentenceEnd = new RegExp(options.sentenceMarkPattern);
  const connectiveEnd = new RegExp(options.connectiveMarkPattern);
  const rolePattern = new RegExp(options.phraseRolePattern, 'i');
  const navRolePattern = new RegExp(options.navigationRolePattern, 'i');
  const phraseTagSet = new Set(options.phraseTags);
  const inlineTagSet = new Set(options.inlinePhraseTags);
  const proseTagSet = new Set(options.proseContainers);
  const hiddenTagSet = new Set(['script', 'style', 'svg', 'template', 'noscript']);
  const labelled = new Set();
  for (const element of document.querySelectorAll('[aria-labelledby]')) {
    for (const value of String(element.getAttribute('aria-labelledby') || '').split(/\s+/)) if (value) labelled.add(value);
  }
  const ancestorsOf = element => {
    const chain = [];
    for (let node = element.parentElement; node; node = node.parentElement) if (node.nodeType === 1) chain.push(node);
    return chain;
  };
  const linesOf = element => {
    const lines = [];
    let current = '';
    const flush = () => {
      const value = current.replace(/\s+/g, ' ').trim();
      if (value) lines.push(value);
      current = '';
    };
    for (const child of Array.prototype.slice.call(element.childNodes)) {
      if (child.nodeType === 3) { current += child.nodeValue; continue; }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') continue;
      if (tag === 'br' || !inlineTagSet.has(tag)) { flush(); continue; }
      current += child.textContent;
    }
    flush();
    return lines;
  };
  const labels = [];
  const judged = new Set();
  for (const element of document.querySelectorAll('body *')) {
    const tag = element.tagName.toLowerCase();
    if (hiddenTagSet.has(tag)) continue;
    const chain = ancestorsOf(element);
    if (chain.some(node => judged.has(node))) continue;
    const classHint = String(typeof element.className === 'string' ? element.className : '').split(/\s+/).filter(Boolean)
      .some(token => classToken.test(token));
    const namesSomething = Boolean(element.id) && labelled.has(element.id);
    const declaredRole = rolePattern.test(String(element.getAttribute('role') || ''));
    const insideProse = chain.some(node => proseTagSet.has(node.tagName.toLowerCase()));
    const insideNav = chain.some(node => node.tagName.toLowerCase() === 'nav' || navRolePattern.test(String(node.getAttribute('role') || '')));
    const navigationLink = tag === 'a' && element.hasAttribute('href') && (classHint || insideNav) && !insideProse;
    const proseInline = insideProse && inlineTagSet.has(tag) && !declaredRole && !namesSomething;
    const isPhrase = !proseInline && (/^h[1-6]$/.test(tag) || phraseTagSet.has(tag) || declaredRole ||
      classHint || namesSomething || navigationLink);
    if (!isPhrase) continue;
    judged.add(element);
    const lines = linesOf(element);
    const units = lines.join(' ').split('').reduce((sum, character) => sum + (cjk.test(character) ? 2 : 1), 0);
    if (!units || lines.length > options.phraseLineBound || units > options.phraseUnitBound) continue;
    // The same two-class test as phraseMark() in Layer 1, written out because this body is serialised.
    let hit = null;
    for (const value of lines) if (sentenceEnd.test(value)) { hit = { text: value.slice(0, 80), mark: 'sentence' }; break; }
    const tail = lines[lines.length - 1];
    if (!hit && tail && connectiveEnd.test(tail)) hit = { text: tail.slice(0, 80), mark: 'connective' };
    if (hit) labels.push({ tag, selector: selectorOf(element), mark: hit.mark, text: hit.text });
  }

  /* The Chinese switch is a custom property, and a plain :root written inside a media query does not
     out-specify :root[lang^="zh"] written outside one. Whether the override landed is therefore only
     knowable from the computed value on the live root element. */
  const rootScale = (getComputedStyle(document.documentElement).getPropertyValue('--track-scale') || '').trim() || null;

  /* The only byte figure in this audit that a visitor actually pays. `import()` is invisible to a
     static read of the markup, so the number of module tags in a document is not the number of modules
     on the wire. decodedBodySize is the shipped file size and encodedBodySize is what crosses the
     network; both are kept so neither can be quoted as the other. */
  const jsResources = performance.getEntriesByType('resource')
    .filter(entry => /\.js(?:\?|$)/.test(entry.name))
    .map(entry => ({
      name: entry.name.split('/').pop().split('?')[0],
      bytes: entry.decodedBodySize, wire: entry.encodedBodySize,
    }));

  /* A grid collision that squeezes a section into a one-character column passes every other probe:
     nothing overflows, contrast is unchanged, the state matrix still fires. Measure the box itself. */
  const columnSamples = [];
  for (const element of document.querySelectorAll('p, li, dd, dt, h1, h2, h3, h4, blockquote, figcaption, td, th')) {
    const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    /* A closed case study or an inactive tab keeps its children's computed display but paints no box.
       clientWidth is 0 there for the same reason it is 0 in a collapsed column, so the two are told
       apart by whether the element has a rendered rect at all. */
    if (!element.getClientRects().length) continue;
    const units = Array.from(text).reduce((sum, character) => sum + (cjk.test(character) ? 2 : 1), 0);
    if (units < 30) continue;
    const fontSize = px(style.fontSize);
    if (!fontSize) continue;
    const widthEm = element.clientWidth / fontSize;
    if (widthEm >= 6) continue;
    columnSamples.push({
      selector: selectorOf(element), widthPx: Math.round(element.clientWidth), fontSizePx: Math.round(fontSize),
      widthEm: round(widthEm, 1), text: text.slice(0, 40)
    });
  }
  const documentHeight = document.documentElement.scrollHeight;
  const columns = {
    samples: columnSamples.slice(0, 40), count: columnSamples.length,
    docHeight: documentHeight, viewportHeight: window.innerHeight,
    screens: round(documentHeight / Math.max(1, window.innerHeight), 1)
  };

  const sortedSizes = sizes.slice().sort((a, b) => a.size - b.size || a.selector.localeCompare(b.selector));
  const sortedTracking = tracking.slice().sort((a, b) => Math.abs(b.letterSpacingPx) - Math.abs(a.letterSpacingPx) || a.selector.localeCompare(b.selector));
  const sortedContrast = contrastFailures.slice().sort((a, b) => a.ratio - b.ratio || a.selector.localeCompare(b.selector));
  return {
    viewport: { innerWidth: window.innerWidth, clientWidth: client, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body ? document.body.scrollWidth : 0 },
    rendered: {
      textRuns: sizes.length, title: document.title, lang: document.documentElement.getAttribute('lang'),
      h1Count: document.querySelectorAll('h1').length, cjkRuns,
      duplicateIdGroups: ids.length, duplicateIds: ids.reduce((sum, group) => sum + group.extra, 0),
      punctuatedLabels: labels.length
    },
    ids,
    labels: { count: labels.length, samples: labels.slice(0, 12) },
    fonts: { smallest: sortedSizes.slice(0, 5), belowFloor: sortedSizes.filter(item => item.size < options.minFontPx).slice(0, 12), probe: fontProbe.slice(0, 80), probeTotal: fontProbe.length },
    tracking: {
      instances: tracking.length, cjkCharacters: characters, rootScale,
      selectors: Array.from(new Set(tracking.map(item => item.selector))).sort(), samples: sortedTracking.slice(0, 12)
    },
    contrast: { measured: contrastMeasured, unmeasurable: contrastUnmeasurable, failureCount: contrastFailures.length, failures: sortedContrast.slice(0, 12) },
    columns,
    scripts: { files: jsResources, total: jsResources.reduce((sum, item) => sum + item.bytes, 0) },
    overflowing: {
      count: overflowing.length, samples: overflowing.slice(0, 12), clipped: clipped.length,
      clippedSamples: clipped.slice(0, 6).map(item => item.selector + ' in ' + item.scroller.selector),
      // Counted, not reported: a 560px data table inside overflow-x:auto is a reachable table, and a
      // check that calls it a defect gets 89 findings on two correct tables and is then switched off.
      inScrollers: wideInScrollers
    }
  };
}

/**
 * Runs inside the page, after the static measurement, and asks the question a screenshot cannot: is a
 * line of text covered at some point during the scroll. It is serialised with Function.prototype.toString.
 *
 * Two shortcuts produce false findings, so both are avoided. Sampling *elements* rather than text leaves
 * every ancestor of the overlay in the results — a card's own link contains the annotation plate painted
 * inside it, so the card's `textContent` includes the plate's text and the page reports its own component
 * as occluded. And comparing bounding rects without asking who paints first turns an ordinary sticky
 * header into a defect: an opaque header at a higher z-index *should* slide over a plate whose rect
 * overlaps it. So each probe point is resolved with `elementsFromPoint`, which returns the paint stack, and
 * the coverer is whatever sits above the text's own element and is not related to it in the tree.
 */
export async function sweepOcclusion(options) {
  const px = value => { const match = /^(-?[\d.]+)px$/.exec(String(value)); return match ? Number(match[1]) : null; };
  const selectorOf = element => {
    const parts = [];
    let node = element;
    for (let depth = 0; node && node.nodeType === 1 && depth < 3; depth += 1) {
      let name = node.tagName.toLowerCase();
      if (node.id) name += '#' + node.id;
      const classes = (typeof node.className === 'string' ? node.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 1);
      if (classes.length) name += '.' + classes[0];
      parts.unshift(name);
      node = node.parentElement;
    }
    return parts.join(' > ');
  };
  const alphaOf = value => {
    const match = /^rgba?\(([^)]+)\)$/.exec(String(value ?? '').trim());
    if (!match) return 0;
    const parts = match[1].split(/[,\s/]+/).filter(Boolean);
    const alpha = parts.length > 3 ? parts[3] : '1';
    const number = Number(String(alpha).replace(/%$/, '')) / (String(alpha).endsWith('%') ? 100 : 1);
    return Number.isFinite(number) ? number : 0;
  };
  const opaque = (element, style) => {
    if (['IMG', 'VIDEO', 'CANVAS', 'IFRAME'].includes(element.tagName.toUpperCase()) && style.objectVisibility !== 'hidden') return true;
    if (alphaOf(style.backgroundColor) >= 0.85) return true;
    const image = style.backgroundImage;
    return Boolean(image && image !== 'none' && /gradient|url\(/.test(image) && alphaOf(style.backgroundColor) > 0);
  };
  /* An element only paints above another one's text if it takes part in the stacking battle at all.
     A static box with `z-index: auto` and no background is painted in normal flow and cannot be the
     thing that hides a sentence, so it is not a candidate. */
  const paintsAbove = (candidate, style) => {
    if (style.position !== 'static') return true;
    if (candidate.tagName === 'IMG' || candidate.tagName === 'CANVAS' || candidate.tagName === 'VIDEO') return true;
    return alphaOf(style.backgroundColor) >= 0.85 || (style.backgroundImage && style.backgroundImage !== 'none');
  };
  /* True while the element is playing a finite entrance or reveal. A wipe mask is over its own copy
     for 600ms by design; a plate that has come to rest over a sentence is a defect. An infinite
     animation is not exempt — a loop that keeps covering text is the finding, not the excuse. */
  const revealing = element => {
    const running = typeof element.getAnimations === 'function' ? element.getAnimations() : [];
    return running.some(animation => animation.playState === 'running'
      && Number(animation.effect?.getComputedTiming?.().iterations ?? 1) !== Infinity);
  };
  const nodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.currentNode; node; node = walker.nextNode()) {
    const value = String(node.nodeValue ?? '').replace(/\s+/g, ' ').trim();
    if (value.length < 2) continue;
    const element = node.parentElement;
    if (!element) continue;
    nodes.push({ node, element, text: value.slice(0, 60), selector: selectorOf(element) });
    if (nodes.length >= options.maxRuns) break;
  }
  const range = document.createRange();
  /* Rects are measured inside the scroll loop, not once before it: a parallax page moves every box
     between one offset and the next, and a probe aimed at where a sentence used to be lands on
     whatever has since moved into that pixel. */
  const lineOf = run => {
    const style = getComputedStyle(run.element);
    if (style.visibility === 'hidden' || style.display === 'none' || px(style.opacity) === 0) return null;
    if (revealing(run.element)) return null;             // the copy is still travelling into place
    range.selectNodeContents(run.node);
    const rects = Array.prototype.filter.call(range.getClientRects(), rect => rect.width > 4 && rect.height > 4);
    if (!rects.length) return null;
    return rects.reduce((widest, item) => (item.width > widest.width ? item : widest));
  };
  /* Persistent chrome — a fixed bar, or a sticky one pinned to the top edge across the width. Copy
     travelling *underneath* it while the reader scrolls is how every sticky header on the market
     behaves and is not a collision; copy that is still underneath it once the page comes to rest is,
     which is what the anchor pass below measures. */
  const chromeOf = (element, style) => {
    if (style.position === 'fixed') return true;
    if (style.position !== 'sticky') return false;
    const rect = element.getBoundingClientRect();
    return rect.top <= 2 && rect.width >= window.innerWidth * 0.6;
  };
  const settle = ms => new Promise(resolve => setTimeout(resolve, ms));
  /* A page may declare `scroll-behavior: smooth` on the root for its readers, and a probe that drives
     the scroll itself has to defeat it: every offset is then sampled mid-animation and the anchor
     "lands" wherever the ease had reached at the deadline, which reports a correct page as a heading
     under its bar. Force instant scrolling for the measurement and restore the page's own value. */
  const declaredScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  const hits = new Map();
  const underChrome = new Map();
  const revealingAtProbe = new Map();
  const scrollHeight = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const steps = scrollHeight > 0 ? options.steps : 1;
  for (let step = 0; step <= steps; step += 1) {
    window.scrollTo(0, Math.round((scrollHeight * step) / steps));
    await settle(options.stepMs);                 // let the scroll-linked transforms arrive where they are going
    for (const run of nodes) {
      const key = run.selector + ' ' + run.text;
      if (hits.has(key)) continue;
      const rect = lineOf(run);
      if (!rect) continue;
      if (rect.bottom < 4 || rect.top > window.innerHeight - 4 || rect.right < 4 || rect.left > window.innerWidth - 4) continue;
      const own = getComputedStyle(run.element);
      /* Probe the middle of the line, twice in from each edge: the ends of a text run sit in the
         side bearings and in whatever decorative box hugs the copy. */
      const probes = [
        [rect.left + Math.min(14, rect.width * 0.25), rect.top + rect.height / 2],
        [rect.left + rect.width - Math.min(14, rect.width * 0.25), rect.top + rect.height / 2]
      ];
      for (const [x, y] of probes) {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
        const stack = document.elementsFromPoint(x, y);
        const depth = stack.indexOf(run.element);
        /* The text is not in the hit stack at this pixel — because a covering box swallowed the
           point, or because the run is clipped out. Either way this is not evidence about paint
           order, and guessing from the topmost element is how a stale coordinate becomes a defect. */
        if (depth === -1) continue;
        if (depth === 0) break;                     // the run paints on top here: nothing covers it
        for (const candidate of stack.slice(0, depth)) {
          if (candidate === document.documentElement || candidate === document.body) continue;
          if (candidate.contains(run.element) || run.element.contains(candidate)) continue;
          const style = getComputedStyle(candidate);
          if (!paintsAbove(candidate, style)) continue;
          if (style.pointerEvents === 'none' || style.visibility === 'hidden') continue;
          if (px(style.opacity) !== null && px(style.opacity) < 0.05) continue;
          if (!opaque(candidate, style)) continue;
          if (chromeOf(candidate, style)) {
            if (!underChrome.has(key)) underChrome.set(key, { selector: run.selector, text: run.text, by: selectorOf(candidate) });
            break;                                 // chrome, not a collision: measured at rest by the anchor pass
          }
          const cover = candidate.getBoundingClientRect();
          const overlapped = Math.max(0, Math.min(rect.right, cover.right) - Math.max(rect.left, cover.left))
            * Math.max(0, Math.min(rect.bottom, cover.bottom) - Math.max(rect.top, cover.top));
          if (overlapped < rect.width * rect.height * 0.2) continue;   // a corner grazing the line is not occlusion
          if (revealing(candidate) || revealing(run.element)) {         // a wipe passing over its own copy
            if (!revealingAtProbe.has(key)) revealingAtProbe.set(key, { selector: run.selector, text: run.text, coveredBy: selectorOf(candidate) });
            continue;
          }
          hits.set(key, {
            selector: run.selector, text: run.text, size: px(own.fontSize), scrollY: Math.round(window.scrollY),
            coveredBy: selectorOf(candidate), coveredByStyle: candidate.tagName.toLowerCase() +
              (candidate.id ? '#' + candidate.id : '') + ' z-index ' + (style.zIndex || 'auto') +
              ' position ' + style.position, depth
          });
          break;
        }
        if (hits.has(key)) break;
      }
    }
  }
  /* A bare fragment is the browser's own jump: the target's top edge arrives under whatever clearance
     the page declared — `scroll-padding-top` on the scroll container, `scroll-margin-top` on the
     target — and an opaque sticky bar then eats the section title the reader aimed at when neither is
     set. This is measured where the page comes to rest, which is the only moment a reader stops to
     read. `scrollIntoView` is deliberately not used: it honours scroll-margin but ignores the
     scroll-padding a root scroller applies to fragment navigation, so it reports a defect on a page
     that set the correct one and passes the page that set neither. */
  const rootPad = Math.max(px(getComputedStyle(document.documentElement).scrollPaddingTop) ?? 0,
    px(getComputedStyle(document.body).scrollPaddingTop) ?? 0);
  const chromeElements = [];
  for (const element of Array.from(document.querySelectorAll('*'))) {
    const style = getComputedStyle(element);
    if (style.position !== 'fixed' && style.position !== 'sticky') continue;
    if (style.pointerEvents === 'none' || !opaque(element, style)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < window.innerWidth * 0.5 || rect.height <= 0 || rect.height >= window.innerHeight * 0.6) continue;
    chromeElements.push(element);
    if (chromeElements.length >= 12) break;
  }
  const anchorIds = Array.from(new Set(Array.from(document.querySelectorAll('a[href^="#"]'))
    .map(link => String(link.getAttribute('href') ?? '').slice(1)).filter(Boolean)));
  const landing = [];
  if (chromeElements.length) {
    for (const id of anchorIds.slice(0, options.maxAnchors)) {
      const target = document.getElementById(id);
      if (!target) continue;
      const clearance = Math.max(rootPad, px(getComputedStyle(target).scrollMarginTop) ?? 0);
      /* Land, let the page come to rest, and land again: a reveal still in flight moves the heading
         under the bar at the moment of measurement and clears it a beat later, and a heading that is
         still travelling is not something the reader ever reads at that offset. */
      let heading = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        window.scrollTo(0, Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - clearance)));
        await settle(attempt === 0 ? options.stepMs : 260);
        heading = target.matches('h1,h2,h3,h4') ? target : target.querySelector('h1,h2,h3,h4');
        if (heading && !revealing(heading)) break;
        heading = null;
      }
      if (!heading) continue;
      range.selectNodeContents(heading);
      const lines = Array.prototype.filter.call(range.getClientRects(), line => line.width > 4 && line.height > 4);
      if (!lines.length) continue;
      const first = lines.reduce((highest, line) => (line.top <= highest.top ? line : highest));
      for (const bar of chromeElements) {
        const rect = bar.getBoundingClientRect();
        if (rect.bottom <= first.top + first.height * 0.4 || rect.top > first.top) continue;
        if (!lines.some(line => line.left < rect.right && line.right > rect.left)) continue;
        const eaten = Math.min(rect.bottom, first.bottom) - Math.max(rect.top, first.top);
        if (eaten < first.height * 0.4) continue;
        landing.push({
          id, text: String(heading.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
          px: Math.round(Math.max(0, eaten)), bar: selectorOf(bar), barHeight: Math.round(rect.height),
          clearance: Math.round(clearance)
        });
        break;
      }
      if (landing.length >= 12) break;
    }
  }
  window.scrollTo(0, 0);
  document.documentElement.style.scrollBehavior = declaredScrollBehavior;
  const samples = Array.from(hits.values());
  return {
    runs: nodes.length, samples: steps + 1, covered: samples.length, hits: samples.slice(0, 12),
    midReveal: revealingAtProbe.size, midRevealSamples: Array.from(revealingAtProbe.values()).slice(0, 6),
    underChrome: underChrome.size, underChromeSamples: Array.from(underChrome.values()).slice(0, 4),
    chromeBars: chromeElements.length, anchors: anchorIds.length, landing
  };
}

/* ------------------------------------------------------------- CDP plumbing -- */

const browserCandidates = explicit => {
  const list = [];
  if (explicit) list.push({ path: String(explicit).replace(/\\/g, '/'), source: '--chrome' });
  const programFiles = process.env.PROGRAMFILES ? process.env.PROGRAMFILES.replace(/\\/g, '/') : 'C:/Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] ? process.env['PROGRAMFILES(X86)'].replace(/\\/g, '/') : 'C:/Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA.replace(/\\/g, '/') : null;
  list.push(
    { path: programFiles + '/Google/Chrome/Application/chrome.exe', source: 'standard Chrome install' },
    { path: programFilesX86 + '/Google/Chrome/Application/chrome.exe', source: 'standard Chrome install' },
    { path: programFiles + '/Microsoft/Edge/Application/msedge.exe', source: 'standard Edge install' },
    { path: programFilesX86 + '/Microsoft/Edge/Application/msedge.exe', source: 'standard Edge install' },
    { path: programFiles + '/Chromium/Application/chrome.exe', source: 'standard Chromium install' }
  );
  if (localAppData) {
    list.push({ path: localAppData + '/Google/Chrome/Application/chrome.exe', source: 'user Chrome install' });
    list.push({ path: localAppData + '/Microsoft/Edge/Application/msedge.exe', source: 'user Edge install' });
  }
  list.push({ path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', source: 'macOS install' });
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable', 'chrome', 'msedge']) {
    list.push({ path: name, source: 'PATH lookup', lookup: true });
  }
  return list;
};

/** Discovers a CDP-capable binary. Nothing is downloaded and no dependency is installed. */
export async function findBrowser(explicit) {
  const tried = [];
  for (const candidate of browserCandidates(explicit)) {
    if (!candidate.path) continue;
    if (candidate.lookup) {
      const located = spawnSync(process.platform === 'win32' ? 'where' : 'which', [candidate.path], { encoding: 'utf8', windowsHide: true, timeout: 8000 });
      const found = located.status === 0 ? located.stdout.trim().split(/\r?\n/)[0] : null;
      if (found) return { path: slash(found), source: candidate.source, tried };
      tried.push(candidate.path + ' (not on PATH)');
      continue;
    }
    try {
      await access(candidate.path, constants.F_OK);
      return { path: candidate.path, source: candidate.source, tried };
    } catch { tried.push(candidate.path); }
  }
  return { path: null, source: null, tried };
}

class Devtools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    socket.addEventListener('message', event => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      const waiter = message.id ? this.pending.get(message.id) : null;
      if (waiter) {
        this.pending.delete(message.id);
        clearTimeout(waiter.timer);
        if (message.error) waiter.reject(new Error(message.error.message ?? 'DevTools error'));
        else waiter.resolve(message.result);
        return;
      }
      for (const listener of Array.from(this.listeners)) listener(message);
    });
    socket.addEventListener('close', () => {
      for (const waiter of this.pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error('DevTools socket closed')); }
      this.pending.clear();
    });
  }

  static async open(endpoint) {
    const socket = new WebSocket(endpoint);
    await new Promise((resolveOpen, rejectOpen) => {
      const timer = setTimeout(() => rejectOpen(new Error('DevTools socket timed out')), 20000);
      socket.addEventListener('open', () => { clearTimeout(timer); resolveOpen(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timer); rejectOpen(new Error('DevTools socket error')); }, { once: true });
    });
    return new Devtools(socket);
  }

  send(method, params = {}, sessionId) {
    return new Promise((resolveCall, rejectCall) => {
      const id = this.nextId++;
      const waiter = { resolve: resolveCall, reject: rejectCall };
      waiter.timer = setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); rejectCall(new Error(method + ' timed out')); }
      }, 60000);
      this.pending.set(id, waiter);
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  close() { try { this.socket.close(); } catch { /* already closed */ } }
}

const cleanup = async (profile, options) => {
  if (!profile) return;
  // Chrome releases the profile lock a moment after the process tree dies, so retry briefly and then give up:
  // a throwaway directory left in the system temp folder is a nuisance, a hung audit is a defect.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let failure = null;
    const removal = rm(profile, { recursive: true, force: true }).catch(error => { failure = error; });
    await Promise.race([removal, new Promise(done => setTimeout(done, 1500))]);
    if (!failure) return;
    trace(options, 'cleanup attempt ' + attempt + ' failed: ' + (failure.code ?? failure.message));
    await new Promise(done => setTimeout(done, 250));
  }
};

class BrowserSession {
  constructor(devtools, child, profile, info, binary, source, tried) {
    Object.assign(this, { devtools, child, profile, info, binary, source, tried });
  }

  static async start(options) {
    trace(options, 'looking for a Chrome or Edge binary');
    const found = await findBrowser(options.chrome);
    if (!found.path) {
      return { session: null, reason: 'no CDP-capable Chrome or Edge binary is present on this machine. Looked for --chrome, then ' + found.tried.join(', ') + '. No browser dependency is installed, so Layer 2 stayed off and Layer 1 is unaffected.' };
    }
    trace(options, 'found ' + found.path + ' (' + found.source + '), launching headless');
    let profile = null;
    try { profile = await mkdtemp(join(tmpdir(), 'portfolio-ui-audit-')); }
    catch (error) { return { session: null, reason: 'cannot create a throwaway browser profile: ' + error.message }; }
    const args = [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=0',
      '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--disable-component-update', '--disable-sync', '--mute-audio', '--hide-scrollbars',
      '--disable-features=Translate,MediaRouter', 'about:blank'
    ];
    let child;
    try { child = spawn(found.path, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }); }
    catch (error) { await cleanup(profile, options); return { session: null, reason: 'could not launch ' + found.path + ': ' + error.message }; }
    try {
      const chunks = [];
      child.stderr.setEncoding('utf8');
      const endpoint = await new Promise((resolveEndpoint, rejectEndpoint) => {
        const timer = setTimeout(() => rejectEndpoint(new Error('no DevTools endpoint within 30s; stderr: ' + chunks.join('').slice(-300))), 30000);
        const settle = () => {
          const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(chunks.join(''));
          if (match) { clearTimeout(timer); resolveEndpoint(match[1]); }
        };
        child.stderr.on('data', chunk => { chunks.push(chunk); settle(); });
        child.once('exit', code => { clearTimeout(timer); rejectEndpoint(new Error('browser exited with code ' + code + '; stderr: ' + chunks.join('').slice(-300))); });
        child.once('error', error => { clearTimeout(timer); rejectEndpoint(error); });
        settle();
      });
      const version = await fetch(endpoint.replace(/^ws/, 'http').replace(/\/devtools\/browser.*$/, '/json/version')).then(response => response.json()).catch(() => ({}));
      trace(options, 'DevTools endpoint answered, version=' + (version.Browser ?? 'unknown'));
      const devtools = await Devtools.open(endpoint);
      trace(options, 'DevTools websocket connected');
      return { session: new BrowserSession(devtools, child, profile, version, found.path, found.source, found.tried) };
    } catch (error) {
      try { child.kill(); } catch { /* already gone */ }
      await cleanup(profile, options);
      return { session: null, reason: found.path + ' was found but could not be driven over CDP: ' + error.message };
    }
  }

  async stop(options) {
    this.devtools?.close();
    const child = this.child;
    if (child) {
      // Chrome forks renderers that inherit the profile directory and our stderr pipe. Killing only the
      // parent leaves the profile locked and the pipe open, so the tree goes first on Windows.
      if (process.platform === 'win32') {
        try { spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 6000 }); } catch { /* best effort */ }
      }
      try { child.kill(); } catch { /* already gone */ }
      child.unref();
      try { child.stderr?.destroy(); } catch { /* already closed */ }
      await new Promise(done => { child.once('exit', done); child.once('close', done); setTimeout(done, 2000); });
    }
    await cleanup(this.profile, options);
  }

  /**
   * Loads one URL at the given viewport and runs the measurement pass, collecting console and network
   * events. `expectLang` is the locale the URL asks for: the second locale of a bilingual page is built
   * by an async import, so document lang flips after the load event, and a probe fired at load would
   * have measured the English document while reporting the Chinese one.
   */
  async measure(url, options, expectLang = null) {
    const { targetId } = await this.devtools.send('Target.createTarget', { url: 'about:blank' });
    try {
      const { sessionId } = await this.devtools.send('Target.attachToTarget', { targetId, flatten: true });
      const events = [];
      const detach = this.devtools.on(message => { if (message.sessionId === sessionId) events.push(message); });
      try {
        for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable']) {
          await this.devtools.send(method, {}, sessionId).catch(() => {});
        }
        await this.devtools.send('Emulation.setDeviceMetricsOverride', { width: options.viewportWidth, height: options.viewportHeight, deviceScaleFactor: 1, mobile: false }, sessionId).catch(() => {});
        const loaded = new Promise(resolveLoad => {
          const off = this.devtools.on(message => {
            if (message.method === 'Page.loadEventFired' && message.sessionId === sessionId) { off(); clearTimeout(timer); resolveLoad(true); }
          });
          // The timer is cleared on success so a finished audit does not hold the event loop open per page.
          const timer = setTimeout(() => { off(); resolveLoad(false); }, options.navigationTimeoutMs);
        });
        await this.devtools.send('Page.navigate', { url }, sessionId);
        const loadEvent = await loaded;
        await this.devtools.send('Runtime.evaluate', {
          expression: '(document.fonts?document.fonts.ready:Promise.resolve()).then(function(){return true;})',
          awaitPromise: true, returnByValue: true
        }, sessionId).catch(() => false);
        if (options.settleMs > 0) await new Promise(settle => setTimeout(settle, options.settleMs));
        const locale = expectLang ? await this.waitForLocale(sessionId, expectLang, options) : null;
        // Runtime.evaluate with an IIFE: callFunctionOn would need an execution context id we do not track.
        const evaluation = await this.devtools.send('Runtime.evaluate', {
          expression: '(' + measureRenderedPage.toString() + ')(' + JSON.stringify({
            minFontPx: options.minFontPx, bodyFloor: options.contrastBody,
            largeFloor: options.contrastLarge, cjkPattern: CJK_PATTERN,
            phraseTags, inlinePhraseTags, proseContainers, phraseUnitBound, phraseLineBound,
            labelClassPattern: labelClassSource, sentenceMarkPattern: sentenceMarkSource,
            connectiveMarkPattern: connectiveMarkSource,
            phraseRolePattern: phraseRoleSource, navigationRolePattern: navigationRoles
          }) + ')',
          returnByValue: true
        }, sessionId);
        const paintedFonts = options.paintProbe === false
          ? { available: false, runs: [] }
          : await this.readPaintedFonts(sessionId, evaluation?.result?.value?.fonts?.probe ?? []);
        // Last, because it scrolls the document: the sweep reads the page where the reader travels, not
        // where the layout starts, and everything measured above assumes the top of the page.
        const swept = options.occlusionSteps > 0 ? await this.devtools.send('Runtime.evaluate', {
          expression: '(' + sweepOcclusion.toString() + ')(' + JSON.stringify({
            steps: options.occlusionSteps, maxRuns: options.occlusionMaxRuns, stepMs: options.occlusionStepMs,
            maxAnchors: options.occlusionMaxAnchors
          }) + ')',
          awaitPromise: true, returnByValue: true
        }, sessionId).catch(error => ({ threw: String(error?.message ?? error) })) : null;
        // A sweep that never ran must not read as a sweep that found nothing.
        const occlusion = swept?.result?.value ?? null;
        const occlusionError = (occlusion || options.occlusionSteps <= 0) ? null : String(swept?.exceptionDetails?.exception?.description
          ?? swept?.exceptionDetails?.text ?? swept?.threw ?? 'the sweep returned nothing').slice(0, 200);
        /* The craft pass runs after everything above, because the interaction half of it clicks real
           controls and flips real state: the page it perturbs is the page nobody measures afterwards.
           Raw geometry and computed strings only; every verdict is taken node-side where tests reach. */
        let craft = null;
        let craftError = null;
        if (options.craftProbes) {
          const probed = await this.devtools.send('Runtime.evaluate', {
            expression: '(' + measureCraftProbes.toString() + ')(' + JSON.stringify({
              partPatterns: CRAFT_PART_PATTERNS, visibleProps: CRAFT_VISIBLE_PROPS,
              classifySource: CRAFT_CLASSIFY_SOURCE
            }) + ')', returnByValue: true
          }, sessionId).catch(error => ({ threw: String(error?.message ?? error) }));
          craft = probed?.result?.value ?? null;
          craftError = craft ? null : String(probed?.exceptionDetails?.exception?.description
            ?? probed?.threw ?? 'the craft probe returned nothing').slice(0, 200);
        }
        let interactions = null;
        let interactionsError = null;
        if (options.craftInteractions) {
          try {
            interactions = await runCraftInteractions((method, params) => this.devtools.send(method, params, sessionId), options);
          } catch (error) { interactionsError = String(error?.message ?? error).slice(0, 200); }
        }
        const requested = new Map();
        const consoleErrors = new Set();
        const failedRequests = new Set();
        // Chrome asks for /favicon.ico on every navigation; a site without one is not a defect worth a violation.
        const favicon = value => /\/favicon\.ico(?:$|\?)/i.test(String(value ?? '')) || /favicon/i.test(String(value ?? ''));
        const exception = evaluation?.result === undefined ? evaluation?.exceptionDetails : null;
        for (const message of events) {
          const params = message.params ?? {};
          if (message.method === 'Network.requestWillBeSent') {
            if (params.requestId) requested.set(params.requestId, params.request?.url ?? '');
          } else if (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(params.type)) {
            const text = (params.args ?? []).map(argument => argument.value ?? argument.description ?? argument.type ?? '').join(' ').slice(0, 300);
            if (!favicon(text)) consoleErrors.add(text);
          } else if (message.method === 'Runtime.exceptionThrown') {
            const details = params.exceptionDetails ?? {};
            consoleErrors.add(String(details.exception?.description ?? details.text ?? 'uncaught exception').slice(0, 300));
          } else if (message.method === 'Log.entryAdded' && params.entry?.level === 'error') {
            const text = String(params.entry.text ?? '');
            if (!favicon(text) && !favicon(params.entry.url)) consoleErrors.add(text.slice(0, 300));
          } else if (message.method === 'Network.loadingFailed') {
            const target = String(requested.get(params.requestId) ?? '');
            if (!favicon(target)) failedRequests.add([(params.errorText ?? 'failed').slice(0, 120), target.slice(0, 200)].join(' | '));
          } else if (message.method === 'Network.responseReceived' && (params.response?.status ?? 0) >= 400) {
            const target = String(params.response.url ?? '');
            if (!favicon(target)) failedRequests.add(['HTTP ' + params.response.status, target.slice(0, 200)].join(' | '));
          }
        }
        const origin = new URL(url).origin;
        return {
          ok: Boolean(evaluation?.result?.value), loadEvent, result: evaluation?.result?.value ?? null,
          paintedFonts, occlusion, occlusionError, craft, craftError, interactions, interactionsError,
          localeRequested: expectLang, localeWaitMs: locale?.waited ?? 0, localeSeen: locale?.value ?? null,
          error: exception ? String(exception.exception?.description ?? exception.text ?? 'the probe threw').slice(0, 200) : null,
          consoleErrors: Array.from(consoleErrors).sort(), failedRequests: Array.from(failedRequests).sort(),
          externalRequests: Array.from(new Set(requested.values())).filter(entry => entry && !entry.startsWith(origin) && !externalSchemes.test(entry)).sort()
        };
      } finally { detach(); }
    } finally {
      await this.devtools.send('Target.closeTarget', { targetId }).catch(() => {});
    }
  }

  /**
   * Reads which face the browser actually painted for each run the in-page probe tagged.
   * getComputedStyle cannot answer this — it returns the family list exactly as the stylesheet wrote
   * it, never the face the browser resolved glyph by glyph. Two real defects are only visible this
   * way: a Chinese heading declared `font-weight: 400` that painted a Heavy instance because that
   * was the one subfamily registered under the requested name, and a single heading line split
   * across three families because the ideographs, the Latin and the CJK punctuation each fell
   * through to a different face. Both leave the computed style looking clean.
   */
  async readPaintedFonts(sessionId, probe) {
    if (!probe?.length) return { available: false, runs: [] };
    const dom = await this.devtools.send('DOM.enable', {}, sessionId).catch(() => null);
    const css = await this.devtools.send('CSS.enable', {}, sessionId).catch(() => null);
    if (!dom || !css) return { available: false, runs: [] };
    const runs = [];
    try {
      let root = null;
      for (const entry of probe) {
        if (!root) {
          const doc = await this.devtools.send('DOM.getDocument', { depth: -1 }, sessionId).catch(() => null);
          root = doc?.root?.nodeId ? doc.root : null;
          if (!root) break;
        }
        let found = await this.devtools.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: `[data-audit-font="${entry.index}"]` }, sessionId).catch(() => null);
        if (!found?.nodeIds?.length) {
          root = null;                       // the tree changed under us; re-read it once and retry
          continue;
        }
        const read = await this.devtools.send('CSS.getPlatformFontsForNode', { nodeId: found.nodeIds[0] }, sessionId).catch(() => null);
        runs.push({
          index: entry.index, selector: entry.selector, declaredFamily: entry.declaredFamily,
          declaredWeight: entry.declaredWeight, sizePx: entry.sizePx, text: entry.text,
          painted: (read?.fonts ?? []).map(face => ({ family: face.familyName, glyphs: face.glyphCount })),
        });
      }
    } finally {
      await this.devtools.send('CSS.disable', {}, sessionId).catch(() => {});
      await this.devtools.send('DOM.disable', {}, sessionId).catch(() => {});
    }
    return { available: true, runs };
  }

  /** Polls the live document lang until it says the locale the URL asked for, or the budget runs out. */
  async waitForLocale(sessionId, expectLang, options) {
    const wanted = String(expectLang).toLowerCase();
    const poll = Math.max(20, options.localePollMs);
    const deadline = Date.now() + Math.max(0, options.localeWaitMs);
    let waited = 0;
    for (;;) {
      const seen = await this.devtools.send('Runtime.evaluate', {
        expression: '(document.documentElement.getAttribute("lang") || "")', returnByValue: true
      }, sessionId).catch(() => null);
      const value = String(seen?.result?.value ?? '');
      if (value.toLowerCase().startsWith(wanted) || Date.now() >= deadline) return { value, waited };
      await new Promise(step => setTimeout(step, poll));
      waited += poll;
    }
  }
}

/* ------------------------------------------------------------------ report -- */

const violationKey = item => [item.code, item.file, item.line, item.message].join(' ~ ');

const compareViolations = (a, b) => a.code.localeCompare(b.code) || String(a.file).localeCompare(String(b.file)) ||
  a.line - b.line || String(a.message).localeCompare(String(b.message));

function decorate(entry, file, layer) {
  const rule = RULES[entry.code];
  if (!rule) throw new Error('Unknown audit rule code: ' + entry.code);
  // ownedBy names the stylesheet a defect actually lives in. Every page that links that sheet
  // would otherwise report the same line as its own, and a report that repeats one finding three
  // times reads like three findings.
  return {
    code: entry.code, layer: layer ?? rule.layer, file: entry.ownedBy ?? file, line: Number.isFinite(entry.line) ? entry.line : 0,
    message: entry.message, evidence: entry.evidence ? String(entry.evidence).slice(0, 500) : null,
    rule: rule.text, ref: rule.ref
  };
}

async function readDirectory(base) {
  const out = [];
  const walk = async directory => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() || entry.isSymbolicLink()) out.push({ full, file: slash(relative(base, full)) });
    }
  };
  await walk(base);
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

async function loadFiles(entries) {
  const files = new Map();
  for (const entry of entries) {
    const bytes = await readFile(entry.full).catch(() => Buffer.alloc(0));
    let text = null;
    try { text = decoder.decode(bytes); } catch { text = null; }
    files.set(entry.file, { bytes, text, full: entry.full });
  }
  return files;
}

/* What a reader downloads is not what the document tags. One `<script type="module">` can pull six
   files through an import graph that the browser follows silently, and counting only the tags reported
   7.6 KB on a page that ships 97 KB — a budget check certifying a number nobody pays.

   Three numbers are kept apart, because collapsing them is what produced the lie:
   - `scriptBytes`: the page's own module tag plus everything that graph reaches statically. A floor.
   - `reachableScriptBytes`: the same walk including `import()` specifiers, i.e. the worst case a route
     can reach. A ceiling on paper, not a measurement — an English case page never fetches the template
     that the Chinese route does.
   - the browser layer's real transfer size, per route, which is the only one of the three a visitor
     pays. The budget that gates the deliverable is applied to that, with `scriptBytes` as the static
     backstop when no browser ran. */
const staticImport = /(?:^|[\n;{}])\s*(?:import|export)\s+(?:[^'"();]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const dynamicImport = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function walkModuleGraph(entryFiles, files, includeDynamic) {
  const found = new Set();
  const queue = entryFiles.filter(file => file && files.has(file));
  for (const file of queue) found.add(file);
  while (queue.length) {
    const current = queue.shift();
    const text = files.get(current).text ?? '';
    const specs = includeDynamic
      ? [...text.matchAll(staticImport), ...text.matchAll(dynamicImport)].map(match => match[1])
      : [...text.matchAll(staticImport)].map(match => match[1]);
    for (const spec of specs) {
      const target = localReference(current, spec);
      if (target && files.has(target) && !found.has(target)) { found.add(target); queue.push(target); }
    }
  }
  return [...found];
}

function buildPage(file, text, files) {
  const parsed = parseHtml(text);
  const elements = renderedElements(parsed.document);
  const scripts = [];
  const scriptFiles = [];
  for (const node of elements.filter(item => item.tag === 'script')) {
    if (!node.attrs.src) continue;
    const target = localReference(file, node.attrs.src);
    scriptFiles.push(target ?? String(node.attrs.src));
    if (!target || !files.has(target)) continue;
    const type = String(node.attrs.type ?? '');
    scripts.push({
      file: target, bytes: files.get(target).bytes.length,
      blocking: !node.attrs.defer && !node.attrs.async && !/module/i.test(type)
    });
  }
  const reached = walkModuleGraph(scriptFiles, files, false);
  for (const target of reached) {
    if (scripts.some(item => item.file === target)) continue;
    scripts.push({ file: target, bytes: files.get(target).bytes.length, blocking: false, throughGraph: true });
  }
  const reachableFiles = walkModuleGraph(scriptFiles, files, true).filter(target => !reached.includes(target));
  const reachableBytes = reachableFiles.reduce((sum, target) => sum + files.get(target).bytes.length, 0);
  return {
    file, source: text, bytes: Buffer.byteLength(text, 'utf8'), parsed, elements, scripts, scriptFiles,
    deferredScripts: reachableFiles, reachableExtraBytes: reachableBytes,
  };
}

/**
 * The locales a page offers are the ones its own links ask for, because a `?lang=` query the
 * deliverable writes is a switch a reader can actually reach. A `lang="zh-CN"` attribute is not
 * evidence — a Chinese-only site carries one everywhere and a bilingual site puts one on the switch
 * label itself. A switch generated by a template exists only in the script source, so the modules the
 * page loads are read as well.
 */
const localeQuery = /[?&]lang=([a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?)/g;

function offeredLocales(page, files) {
  /* Two ways a site can offer a second language, and this only knows about one of them: a query
     string the page reads. A pre-rendered tree — English at the root, Chinese under /zh/ — carries no
     `?lang=` anywhere, so it is not measured twice here; each file is already its own locale route
     and arrives in the page list with its own text runs, its own contrast pairs and its own
     transferred bytes. The example site is built that way, and `grep -c "?lang=" dist/` returning
     nothing is what makes its route table six rather than three visited twice. */
  const codes = new Set();
  const harvest = text => {
    for (const match of String(text ?? '').matchAll(localeQuery)) codes.add(match[1].toLowerCase().split('-')[0]);
  };
  for (const node of page.elements) harvest(node.attrs.href);
  for (const name of page.scriptFiles) harvest(files.get(name)?.text);
  for (const node of page.elements.filter(item => item.tag === 'script' && !item.attrs.src)) harvest(rawTextOf(node));
  return Array.from(codes).sort();
}

const weightWords = new Map([['thin', 100], ['hairline', 100], ['extralight', 200], ['ultralight', 200], ['light', 300],
  ['book', 400], ['regular', 400], ['normal', 400], ['medium', 500], ['semibold', 600], ['demibold', 600],
  ['bold', 700], ['extrabold', 800], ['ultrabold', 800], ['black', 900], ['heavy', 900]]);
const genericFamilies = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'apple-system', 'blinkmacsystemfont', 'math', 'emoji']);
const nameTokens = value => String(value).toLowerCase().split(/[^a-z0-9\u4e00-\u9fff]+/).filter(token => token.length > 2);
const declaredStack = value => String(value ?? '').split(',').map(part => part.trim().replace(/^["']|["']$/g, '')).filter(Boolean);

/**
 * Compares the faces the browser said it painted against the family and weight the stylesheet asked
 * for. Three findings, chosen because each was measured on a finished page and none is visible through
 * getComputedStyle: a subfamily whose registered name carries a weight word far from the declared
 * number (a Chinese heading asking for 400 and painting Heavy), a single line split across three
 * families because the ideographs, the Latin and the CJK punctuation each fell through somewhere
 * different, and a face that appears nowhere in the declared stack. The last is skipped whenever the
 * stack ends in a generic: a declared `serif` gives the machine permission to paint its own default,
 * and reporting that as a defect would be reporting the platform.
 */
/* One full weight class, not "any difference". Measured on Windows: a run that mixes Chinese with
   digits paints the Han in Microsoft YaHei and the digits in Segoe UI Semibold while declaring 400 —
   the platform's own font link, chosen so Latin numerals carry the same stroke weight as the Han
   around them, and it advances them by exactly the same width a Regular face would (+0.00px over a
   43.69px run of "$2,500"). Flagging it would flag the operating system's typographic judgement, and
   the finding that earned this check — 400 declared, Heavy painted — is 500 units away. */
const paintedWeightFloor = 300;

/* The decision half of the collapse check: the page reports raw widths, this decides whether they
   describe a layout. Kept out of the serialised body so both directions can be tested without Chrome. */
export function columnCollapse(columns) {
  if (!columns) return null;
  const critical = columns.samples.filter(item => item.widthEm < 2);
  const narrow = columns.samples.filter(item => item.widthEm < 6);
  const runaway = columns.screens >= 25;
  if (!critical.length && narrow.length < 3 && !runaway) return null;
  return {
    critical: critical.length, narrow: narrow.length, screens: columns.screens,
    docHeight: columns.docHeight, viewportHeight: columns.viewportHeight,
    samples: (critical.length ? critical : narrow.length ? narrow : columns.samples).slice(0, 8)
  };
}

function paintedFontFindings(runs) {
  const found = [];
  for (const run of runs) {
    const declared = declaredStack(run.declaredFamily);
    const allowsFallback = declared.some(name => genericFamilies.has(name.toLowerCase()) || name.startsWith('-'));
    const declaredTokens = nameTokens(declared.join(' '));
    const declaredWeight = /^[\d.]+$/.test(String(run.declaredWeight)) ? Number(run.declaredWeight)
      : weightWords.get(String(run.declaredWeight).toLowerCase()) ?? null;
    const faces = (run.painted ?? []).filter(face => face.glyphs > 0);
    for (const face of faces) {
      const faceWeight = weightWords.get(nameTokens(face.family).find(token => weightWords.has(token)) ?? '') ?? null;
      if (faceWeight !== null && declaredWeight !== null && Math.abs(faceWeight - declaredWeight) >= paintedWeightFloor) {
        found.push({ kind: 'a weight', selector: run.selector, text: run.text, detail: `declared ${declaredWeight}, painted ${face.family} (${faceWeight})` });
      } else if (!allowsFallback && !nameTokens(face.family).some(token => declaredTokens.includes(token))) {
        found.push({ kind: 'a family', selector: run.selector, text: run.text, detail: `painted ${face.family}, which is not in the declared stack (${declared.join(', ')})` });
      }
    }
    if (faces.length >= 3) {
      found.push({ kind: 'split', selector: run.selector, text: run.text,
        detail: `${faces.length} faces in one line: ${faces.map(face => `${face.family} (${face.glyphs})`).join(' + ')}` });
    }
  }
  return found.slice(0, 12);
}

function browserViolations(page, options) {
  const found = [];
  const data = page.result;
  if (!data) {
    found.push({ code: 'BROWSER_CONSOLE_ERROR', line: 0, message: 'This page could not be measured: ' + (page.error ?? 'no result came back from the browser'), evidence: page.file });
    return found;
  }
  /* The locale a switch promises is the locale the reader has to get, because every Chinese-typography
     number below describes whichever document was actually loaded. A Chinese URL that serves English
     turns a clean CJK result into a false claim. */
  const wanted = String(page.localeRequested ?? '').toLowerCase();
  if (wanted) {
    const served = String(data.rendered.lang ?? '').toLowerCase();
    const wrongDocument = !served.startsWith(wanted);
    const noChinese = /^zh/.test(wanted) && !data.rendered.cjkRuns;
    if (wrongDocument || noChinese) {
      found.push({
        code: 'BROWSER_LOCALE_RENDERED', line: 0,
        message: `lang=${wanted} served ${wrongDocument
          ? `a document whose lang is "${data.rendered.lang ?? 'unset'}"` : 'a document with no visible Chinese text run'}` +
          (wrongDocument && page.localeWaitMs ? `, and the switch had still not flipped after ${page.localeWaitMs}ms of waiting.` : '.'),
        evidence: `${page.file} lang=${data.rendered.lang ?? 'unset'} cjk runs=${data.rendered.cjkRuns}`
      });
    }
  }
  for (const group of data.ids) {
    found.push({
      code: 'BROWSER_DUPLICATE_ID', line: 0,
      message: `id="${group.id}" appears ${group.count} times in the rendered document, so each aria-labelledby and in-page anchor aimed at it resolves to the first only.`,
      evidence: group.samples.join(' | ').slice(0, 400)
    });
  }
  if (data.labels.count) {
    const marks = Array.from(new Set(data.labels.samples.map(item => item.mark))).join(' + ') || 'sentence';
    found.push({
      code: 'BROWSER_LABEL_PUNCTUATION', line: 0,
      message: `${data.labels.count} phrase role(s) in the rendered document carry a ${marks} mark where the label ends — script-built labels and the second locale never appear in the markup the static pass read.`,
      evidence: data.labels.samples.map(item => `${item.mark} on <${item.tag}> "${item.text}"`).join(' | ').slice(0, 400)
    });
  }
  /* The budget that matters is the one measured on the wire. `scriptFiles` in the markup is a floor:
     a module that reaches three others through import() pays for all four and tags none of them.
     Every route is gated, including the Chinese one. It was exempted here once, on the reasoning
     that both locales are the same document built by one template rather than two builds, so the
     zh figure can only ever repeat the en one — which is true, and is exactly why the exemption was
     worthless: an exemption on a route that shares a build with the gated route hides nothing, and
     the moment the two do diverge it hides the divergence. Gate both and the sameness becomes
     something the report shows rather than something this comment asserts. */
  if (data.scripts.total > options.maxRenderedScriptBytes) {
    found.push({
      code: 'BROWSER_JS_BUDGET', line: 0,
      message: `This route transferred ${data.scripts.total} bytes of JavaScript over ${data.scripts.files.length} modules, against the ${options.maxRenderedScriptBytes} byte ceiling.`,
      evidence: data.scripts.files.map(item => item.name + ':' + item.bytes).join(' + ')
    });
  }
  if (data.viewport.scrollWidth > data.viewport.clientWidth) {
    found.push({
      code: 'BROWSER_H_OVERFLOW', line: 0,
      message: `documentElement.scrollWidth is ${data.viewport.scrollWidth}px against a ${data.viewport.clientWidth}px viewport.`,
      evidence: data.overflowing.samples.map(item => item.selector).join(' | ').slice(0, 400)
    });
  } else if (data.overflowing.count) {
    found.push({
      code: 'BROWSER_ELEMENT_OVERFLOW', line: 0,
      message: `${data.overflowing.count} non-fixed element box(es) leave the viewport while the document itself does not scroll.`,
      evidence: data.overflowing.samples.map(item => item.selector + (item.scroller ? ' in ' + item.scroller.selector : '')).join(' | ').slice(0, 400)
    });
  }
  const collapse = columnCollapse(data.columns);
  if (collapse) {
    found.push({
      code: 'BROWSER_COLUMN_COLLAPSE', line: 0,
      message: `The page is ${collapse.screens} screens tall (${collapse.docHeight}px against a ${collapse.viewportHeight}px viewport) and ${collapse.narrow} text block(s) render narrower than 6em, ${collapse.critical} of them under 2em.`,
      evidence: collapse.samples.map(item => `${item.widthEm}em wide (${item.widthPx}px / ${item.fontSizePx}px) ${item.selector} "${item.text}"`).join(' | ').slice(0, 400)
    });
  }
  if (data.fonts.belowFloor.length) {
    found.push({
      code: 'BROWSER_MIN_FONT_SIZE', line: 0,
      message: `${data.fonts.belowFloor.length} rendered text run(s) sit below the ${options.minFontPx}px floor; smallest is ${data.fonts.smallest[0]?.size ?? 'n/a'}px.`,
      evidence: data.fonts.belowFloor.map(item => `${item.size}px ${item.selector} "${item.text}"`).join(' | ').slice(0, 400)
    });
  }
  if (data.contrast.failureCount) {
    found.push({
      code: 'BROWSER_CONTRAST', line: 0,
      message: `${data.contrast.failureCount} text run(s) fall below the WCAG floor against the background they actually sit on.`,
      evidence: data.contrast.failures.map(item => `${item.ratio}:1 (needs ${item.floor}) ${item.selector} "${item.text}"`).join(' | ').slice(0, 400)
    });
  }
  if (data.tracking.instances) {
    found.push({
      code: 'BROWSER_CJK_TRACKING', line: 0,
      message: `${data.tracking.instances} CJK text run(s) spanning ${data.tracking.cjkCharacters} glyphs carry letter-spacing from ${data.tracking.selectors.length} selector(s).`,
      // The computed value on the live root says whether the locale override landed; a stylesheet can
      // declare the switch and still lose the specificity contest at runtime.
      evidence: ('computed --track-scale on the rendered root: ' + (data.tracking.rootScale ?? 'unset') + ' | ').concat(
        data.tracking.samples.map(item => `${item.em ?? item.letterSpacingPx}px on ${item.selector} "${item.text}"`).join(' | ')
      ).slice(0, 400)
    });
  }
  const painted = paintedFontFindings(page.paintedFonts?.runs ?? []);
  if (painted.length) {
    const kinds = Array.from(new Set(painted.map(item => item.kind))).sort();
    found.push({
      code: 'BROWSER_PAINTED_FONT', line: 0,
      message: `${painted.length} rendered text run(s) paint ${kinds.join(' or ')} than the stylesheet declared — invisible to getComputedStyle, which reports the stack as written.`,
      evidence: painted.map(item => `${item.detail} in ${item.selector} "${item.text}"`).join(' | ').slice(0, 400)
    });
  }
  if (page.occlusion?.covered) {
    found.push({
      code: 'BROWSER_OCCLUSION', line: 0,
      message: `${page.occlusion.covered} text run(s) of ${page.occlusion.runs} sampled are painted over by a non-chrome box at some scroll offset across ${page.occlusion.samples} position(s).`,
      evidence: page.occlusion.hits.map(item => `"${item.text}" (${item.selector}) covered by ${item.coveredByStyle} at scrollY ${item.scrollY}`).join(' | ').slice(0, 400)
    });
  }
  /* The copy a reader aimed at and never saw: a fragment jump that parks the section title under the
     sticky bar. Reported apart from the scroll sweep because this one is permanent — the page is at
     rest, and nothing uncovers it. */
  if (page.occlusion?.landing?.length) {
    found.push({
      code: 'BROWSER_OCCLUSION', line: 0,
      message: `${page.occlusion.landing.length} of ${page.occlusion.anchors} in-page anchor target(s) come to rest with their heading under the sticky bar: ` +
        page.occlusion.landing.map(item => `#${item.id} loses ${item.px}px to a ${item.barHeight}px bar`).join('; ') + '.',
      evidence: page.occlusion.landing.map(item => `#${item.id} "${item.text}" by ${item.bar} (${item.barHeight}px, ${item.px}px eaten)`).join(' | ').slice(0, 400)
    });
  }
  for (const message of page.consoleErrors) found.push({ code: 'BROWSER_CONSOLE_ERROR', line: 0, message: 'Console error: ' + message, evidence: page.file });
  for (const message of page.failedRequests) found.push({ code: 'BROWSER_CONSOLE_ERROR', line: 0, message: 'Failed request: ' + message, evidence: page.file });
  for (const url of page.externalRequests) found.push({ code: 'THIRD_PARTY_RUNTIME', line: 0, message: 'The rendered page asked a third-party host for a resource: ' + url, evidence: page.file });
  return found;
}

const pageSummary = page => {
  const data = page.result;
  return {
    file: page.file, loadEvent: page.loadEvent ?? false, measured: Boolean(data),
    error: page.error ?? null,
    // One page can be rendered as several routes: the locale a page offers only exists after its
    // scripts have run, so a per-file row would hide the second document the reader can reach.
    locale: data?.rendered.lang ?? page.localeSeen ?? null,
    localeRequested: page.localeRequested ?? null, localeWaitMs: page.localeWaitMs ?? 0,
    consoleErrors: page.consoleErrors ?? [], failedRequests: page.failedRequests ?? [], externalRequests: page.externalRequests ?? [],
    scrollWidth: data?.viewport.scrollWidth ?? null, clientWidth: data?.viewport.clientWidth ?? null,
    minRenderedFontPx: data?.fonts.smallest[0]?.size ?? null, renderedH1: data?.rendered.h1Count ?? null,
    renderedCjkRuns: data?.rendered.cjkRuns ?? null,
    renderedDuplicateIds: data?.rendered.duplicateIds ?? null,
    renderedDuplicateIdGroups: data?.ids?.map(item => item.id + ' x' + item.count) ?? [],
    renderedPunctuatedLabels: data?.labels?.count ?? null,
    renderedScriptBytes: data?.scripts?.total ?? null,
    renderedScriptModules: data?.scripts?.files.map(item => item.name + ':' + item.bytes).join(' + ') ?? null,
    renderedLabelSamples: data?.labels?.samples?.map(item => `<${item.tag}> "${item.text}"`) ?? [],
    trackScaleOnRoot: data?.tracking.rootScale ?? null,
    cjkTrackedRuns: data?.tracking.instances ?? null, cjkTrackedGlyphs: data?.tracking.cjkCharacters ?? null,
    cjkTrackedSelectors: data?.tracking.selectors ?? null, cjkTracking: data?.tracking.samples ?? null,
    // What the browser layer proved about faces, not what the stylesheet asked for. The probe count is
    // the denominator, so "0 findings" reads as a clean page rather than a check that never ran.
    fontProbeRuns: data?.fonts?.probeTotal ?? 0, paintedFontRuns: page.paintedFonts?.runs?.length ?? 0,
    paintedFontsAvailable: page.paintedFonts?.available ?? false,
    occlusionOffsets: page.occlusion?.samples ?? null, occlusionTextRuns: page.occlusion?.runs ?? null,
    occlusionCovered: page.occlusion?.covered ?? null, occlusionHits: page.occlusion?.hits ?? [],
    occlusionLanding: page.occlusion?.landing ?? [], occlusionAnchorTargets: page.occlusion?.anchors ?? 0,
    occlusionChromeBars: page.occlusion?.chromeBars ?? 0, occlusionUnderChrome: page.occlusion?.underChrome ?? 0,
    occlusionMidReveal: page.occlusion?.midReveal ?? 0,
    occlusionError: page.occlusionError ?? null,
    contrastFailures: data?.contrast.failureCount ?? null, contrastMeasured: data?.contrast.measured ?? null,
    contrastUnmeasurable: data?.contrast.unmeasurable ?? null, contrastWorst: data?.contrast.failures[0] ?? null,
    overflowingElements: data?.overflowing.count ?? null, overflowingSamples: data?.overflowing.samples ?? null,
    wideInsideScrollers: data?.overflowing.inScrollers ?? null,
    // Boxes a line-mask, marquee or stage clips on purpose. Worth reporting separately, because
    // "nothing sticks out of the viewport" and "everything is visible" are different claims.
    clippedByDesign: data?.overflowing.clipped ?? null, clippedSamples: data?.overflowing.clippedSamples ?? null,
    smallestText: data?.fonts.smallest ?? null
  };
};

/**
 * Audit a directory of static HTML and return one JSON-serialisable report.
 * Layer 1 always runs; Layer 2 only when `browser: true`, and its absence never fails Layer 1.
 */
export async function auditSite(input = {}) {
  const options = {
    viewportWidth: 390, viewportHeight: 844, minFontPx: 11, contrastBody: 4.5, contrastLarge: 3,
    maxCriticalBytes: 200 * 1024, maxScriptBytes: 60 * 1024, settleMs: 400, navigationTimeoutMs: 20000,
    /* The on-wire ceiling is the reference's own number, not a figure this build happens to clear.
       Measured here, and identical in both locales because both are pre-rendered static trees: home,
       about, Fieldwork and the unknown id fetch 28,118 bytes over three modules; Signal fetches
       46,606 over six and Briefly 46,252 over six. Fieldwork and the unknown id stay at three
       modules, because the demo import is gated on the requested case, and each demo route imports
       only its own half of the demo code. The demo routes are the only ones that pull those modules
       — and their headroom is deliberate. When this rule trips, the answer is to take bytes out of
       what ships (a build-time renderer belongs in the template module, copy belongs in the HTML),
       not to move the ceiling: the last time this number was raised it went to 72 KB, because a
       31 KB template was being downloaded to relabel content the page already had. */
    maxRenderedScriptBytes: 60 * 1024,
    localeWaitMs: 2500, localePollMs: 100,
    /* Eleven offsets is enough to catch the one defect this sweep exists for: a plate whose parallax
       keyframe carries it 54px over the line it was laid out clear of. Fewer steps sample the animation
       where it happens to be resting; more steps cost a browser pass per page for nothing new. */
    occlusionSteps: 10, occlusionStepMs: 90, occlusionMaxRuns: 260, occlusionMaxAnchors: 24,
    browser: false, chrome: null, reportUnreferencedPages: false, trace: false,
    /* The visual-craft layer (scripts/craft-probes.mjs) is opt-in: it re-renders each default route
       at 1440 and 768, drives real pointer and keyboard input, and its thresholds currently fail
       pages of the example site — the defects component-anatomy.md records were measured on exactly
       this kind of build. The deliverable gates (Layer 1, Layer 2) stay as they were. */
    craft: false, ...input
  };
  const requested = resolve(options.root ?? defaultRoot);
  let base;
  try {
    base = await realpath(requested);
    if (!(await stat(base)).isDirectory()) throw new Error('not a directory');
  } catch {
    return emptyReport('Static output directory is missing: ' + slash(relative(projectRoot, requested)));
  }
  const entries = await readDirectory(base);
  const files = await loadFiles(entries);

  const pages = [];
  for (const entry of entries) {
    if (!/\.html?$/i.test(entry.file)) continue;
    const text = files.get(entry.file).text;
    if (text === null) continue;
    pages.push(buildPage(entry.file, text, files));
  }

  const staticViolations = [];
  const reachableCss = new Set();
  const reportedPages = [];
  // Stylesheets are shared, so which classes style SVG geometry has to be decided across every
  // page at once. The chart markup lives on project.html, but about.html links the same demos.css
  // that styles it — measured per page, that sheet's compensated axis-label size looks like an
  // unexplained literal on the two pages that happen not to draw a chart.
  const sharedSvgClasses = svgScopedClasses(pages.flatMap(page => page.elements));
  for (const page of pages) {
    const result = auditPage(page, files, options, sharedSvgClasses);
    staticViolations.push(...result.violations.map(entry => decorate(entry, page.file)));
    for (const name of result.css) reachableCss.add(name);
    reportedPages.push({ file: page.file, metrics: result.metrics, checks: checksFor(result.metrics, options) });
  }

  // CSS that ships but no page links is still shipped, so it is still checked for the same patterns.
  for (const [name, entry] of files) {
    if (!/\.css$/i.test(name) || reachableCss.has(name) || entry.text === null) continue;
    for (const value of cssUrls(entry.text)) {
      const external = isRuntimeExternal(value);
      if (external) staticViolations.push(decorate({ code: 'THIRD_PARTY_RUNTIME', line: 0, message: `An unlinked stylesheet still references a third-party host: ${external}`, evidence: name }, name));
    }
    for (const rule of cssDeclarations([{ file: name, source: entry.text, parsed: parseCss(entry.text) }])) {
      for (const item of rule.declarations) {
        if (!hiddenOffsetProperty.test(item.property)) continue;
        for (const match of item.value.replace(/\s+/g, '').matchAll(/(-[\d.]+)(px|em|rem|pt)/gi)) {
          const size = Number(match[1]);
          if (match[2].toLowerCase() !== 'px' || size > -500) continue;
          staticViolations.push(decorate({ code: 'OFFSCREEN_HIDE', line: item.line, message: `Hidden-until-focused uses ${item.property}: ${size}px instead of clip-path.`, evidence: rule.selector + ' @' + name }, name));
        }
      }
    }
  }

  const linkedTargets = new Set();
  for (const page of pages) {
    for (const node of page.elements) {
      for (const attribute of ['href', 'src', 'poster', 'data']) {
        const target = localReference(page.file, node.attrs[attribute]);
        if (target) linkedTargets.add(target.split('#')[0]);
      }
      for (const value of String(node.attrs.srcset ?? '').split(',')) {
        const target = localReference(page.file, value.trim().split(/\s+/)[0]);
        if (target) linkedTargets.add(target);
      }
    }
    for (const script of page.scriptFiles) linkedTargets.add(script);
  }

  let packagingCount = 0;
  for (const entry of entries) {
    const record = files.get(entry.file);
    for (const finding of classifyShippedFile(entry.file, record.text ?? '')) {
      packagingCount += 1;
      staticViolations.push(decorate({ code: finding.code, line: 0, message: finding.message, evidence: entry.file }, entry.file));
    }
  }
  let unreachable = [];
  if (options.reportUnreferencedPages) {
    unreachable = pages.map(page => page.file)
      .filter(file => file !== 'index.html' && !file.split('/').pop().startsWith('index.'))
      .filter(file => !linkedTargets.has(file))
      .sort();
    for (const file of unreachable) {
      staticViolations.push(decorate({ code: 'SHIP_UNREACHABLE_PAGE', line: 0, message: 'No page links this HTML file, so it is a scratch page until proven otherwise.', evidence: file }, file));
    }
  }

  const browserLayer = {
    browser: 'not requested', reason: 'Layer 2 needs --browser. Nothing rendered was measured, so scrollWidth, computed contrast, computed font sizes, rendered CJK letter-spacing, the second locale, script-built ids and console and network state are unverified on this run.',
    binary: null, binarySource: null, tried: null, version: null, viewport: null, pages: [], routes: [], locales: [], violations: [], craft: null
  };
  if (options.browser && pages.length) {
    const started = await BrowserSession.start(options);
    if (!started.session) {
      browserLayer.browser = 'unavailable';
      browserLayer.reason = started.reason;
    } else {
      const session = started.session;
      const server = createStaticServer({ root: base });
      await new Promise(listen => server.listen(0, '127.0.0.1', listen));
      const origin = 'http://127.0.0.1:' + server.address().port;
      const measured = [];
      try {
        let index = 0;
        const note = (file, detail) => trace(options, '[' + index + '/' + pages.length + '] ' + file + ' ' + detail);
        for (const page of pages) {
          index += 1;
          const base = origin + '/' + encodeURI(page.file);
          // The default route is measured first: which locales still have to be visited is a question
          // about what the page is actually serving, and the markup's own lang attribute does not
          // answer it — a bilingual page flips document lang from a script after load.
          const routes = [];
          try {
            const defaultRoute = await session.measure(base, options.craft ? { ...options, craftProbes: true } : options);
            note(page.file, defaultRoute.result ? 'measured ' + defaultRoute.result.rendered.textRuns + ' text run(s) as ' + (defaultRoute.result.rendered.lang ?? 'unset lang') : 'not measured: ' + (defaultRoute.error ?? 'no result'));
            routes.push({ file: page.file, url: base, ...defaultRoute });
            const routeRecord = routes[routes.length - 1];
            /* The craft layer re-renders the default route at the two widths its reference checks
               name — 1440 for the row geometry and the interaction pass, 768 for the table fit —
               with the occlusion sweep and the painted-font reads switched off: those two belong to
               the deliverable's own gates, are already measured at 390, and repeating them here is
               seconds per page bought for no new number. Locale routes are not re-rendered: a
               translation cannot change a baseline, and the doubled passes would double the runtime
               to defend against a defect that is geometry, not copy. */
            if (options.craft && defaultRoute.result) {
              routeRecord.craftPasses = [];
              for (const [width, height, withInteractions] of [[1440, 900, true], [768, 1024, false]]) {
                try {
                  const pass = await session.measure(base, {
                    ...options, viewportWidth: width, viewportHeight: height,
                    occlusionSteps: 0, paintProbe: false, craftProbes: true, craftInteractions: withInteractions
                  });
                  routeRecord.craftPasses.push({
                    width, craft: pass.craft, craftError: pass.craftError,
                    interactions: pass.interactions, interactionsError: pass.interactionsError, ok: pass.ok
                  });
                  note(page.file, 'craft pass at ' + width + ': ' + (pass.craft ? 'measured' : 'not run: ' + (pass.craftError ?? 'no result')));
                } catch (error) {
                  routeRecord.craftPasses.push({ width, error: String(error?.message ?? error).slice(0, 160) });
                }
              }
            }
            /* Case routes (--craft only). `project.html` statically ships every case article plus an
               unknown-id panel, and its head boot script stamps `data-case` from `?id=`, so the
               interactive components that belong to a case other than the first one — Briefly's
               `.demo-presets` chip group, its `p.demo-form-error` validation state, its
               `aria-pressed` matrix — live at URLs this file-list route builder never produces. The
               default `project.html` resolves to the first id, so those controls were reachable by no
               route the craft layer ran. The ids are read out of the markup rather than hard-coded,
               so a page without cross-case articles gains no routes.
               A variant is a route of an existing page, never a page: it is pushed into `routes`
               (and so into `measured`, `browserLayer.routes`, `.pages` and `.violations`) but not into
               `pages` or `reportedPages`, which are what the page count and SHIP_UNREACHABLE_PAGE are
               computed from. It is also not a locale route, so it carries its own locale expectation:
               these are the English documents, and `expectLang = 'en'` keeps them out of the
               `lang=`/locale-check path rather than letting them inherit whichever locale the last
               navigation proved. */
            if (options.craft && page.file === 'project.html') {
              const caseIds = Array.from(new Set(page.elements
                .filter(node => node.tag === 'article' && /^case-[a-z0-9][a-z0-9_-]*$/i.test(String(node.attrs.id ?? '')))
                .map(node => String(node.attrs.id).replace(/^case-/i, ''))));
              for (const id of [...caseIds, 'nonexistent']) {
                const url = base + (page.file.includes('?') ? '&' : '?') + 'id=' + id;
                const file = page.file + '?id=' + id;
                try {
                  const route = await session.measure(url, { ...options, craftProbes: true }, 'en');
                  note(file, route.result
                    ? 'case route measured ' + route.result.rendered.textRuns + ' text run(s) and ' +
                      route.result.scripts.total + ' JS byte(s) as ' + (route.result.rendered.lang ?? 'unset lang')
                    : 'not measured: ' + (route.error ?? 'no result'));
                  routes.push({ file, url, caseId: id, ...route });
                  const caseRecord = routes[routes.length - 1];
                  /* One re-render per case route, at 1440, because that is the pass whose interaction
                     half resolves the state matrix, press delta and name/state agreement — the reason
                     these routes are visited at all. The 768 table-fit pass the default route gets is
                     skipped: it is a second geometry read of the same article, and 4 routes x 2 passes
                     would be 8 renders bought to re-check a breakpoint that does not depend on which
                     case is revealed. */
                  if (route.result) {
                    caseRecord.craftPasses = [];
                    try {
                      const pass = await session.measure(url, {
                        ...options, viewportWidth: 1440, viewportHeight: 900,
                        occlusionSteps: 0, paintProbe: false, craftProbes: true, craftInteractions: true
                      }, 'en');
                      caseRecord.craftPasses.push({
                        width: pass.width ?? 1440, craft: pass.craft, craftError: pass.craftError,
                        interactions: pass.interactions, interactionsError: pass.interactionsError, ok: pass.ok
                      });
                      note(file, 'craft interaction pass at 1440: ' + (pass.craft ? 'measured' : 'not run: ' + (pass.craftError ?? 'no result')));
                    } catch (error) {
                      caseRecord.craftPasses.push({ width: 1440, error: String(error?.message ?? error).slice(0, 160) });
                    }
                  }
                } catch (error) {
                  note(file, 'threw ' + String(error?.message ?? error).slice(0, 160));
                  routes.push({ file, url, caseId: id, ok: false, result: null, consoleErrors: [], failedRequests: [], externalRequests: [], error: String(error?.message ?? error).slice(0, 200) });
                }
              }
            }
            const served = String(defaultRoute.result?.rendered.lang ?? '').toLowerCase();
            for (const code of offeredLocales(page, files)) {
              if (served.startsWith(code)) continue;
              const url = base + (page.file.includes('?') ? '&' : '?') + 'lang=' + code;
              try {
                const route = await session.measure(url, options, code);
                note(page.file, 'as ' + code + ': ' + (route.result ? route.result.rendered.textRuns + ' text run(s), ' + route.result.rendered.cjkRuns + ' CJK run(s), lang ' + (route.result.rendered.lang ?? 'unset') : 'not measured: ' + (route.error ?? 'no result')));
                routes.push({ file: page.file + '?lang=' + code, url, localeRequested: code, ...route });
              } catch (error) {
                note(page.file + '?lang=' + code, 'threw ' + String(error?.message ?? error).slice(0, 160));
                routes.push({ file: page.file + '?lang=' + code, url, localeRequested: code, ok: false, result: null, consoleErrors: [], failedRequests: [], externalRequests: [], error: String(error?.message ?? error).slice(0, 200) });
              }
            }
          } catch (error) {
            note(page.file, 'threw ' + String(error?.message ?? error).slice(0, 160));
            routes.push({ file: page.file, ok: false, result: null, consoleErrors: [], failedRequests: [], externalRequests: [], error: String(error?.message ?? error).slice(0, 200) });
          }
          measured.push(...routes);
        }
      } finally {
        // The browser holds a keep-alive socket to the local server, so it has to die before the server does.
        trace(options, 'stopping the browser');
        await session.stop(options);
        trace(options, 'closing the local server');
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
        await new Promise(close => server.close(() => close()));
        trace(options, 'browser and server released');
      }
      browserLayer.browser = session.info?.product ?? 'chrome/edge via CDP';
      browserLayer.version = session.info?.Browser ?? null;
      browserLayer.reason = null;
      browserLayer.binary = session.binary;
      browserLayer.binarySource = session.source;
      browserLayer.viewport = { width: options.viewportWidth, height: options.viewportHeight, mobile: false };
      for (const page of measured) {
        browserLayer.violations.push(...browserViolations(page, options).map(entry => decorate(entry, page.file, 'browser')));
      }
      if (options.craft) {
        const craftSummaries = [];
        for (const page of measured.filter(entry => entry.craft || entry.craftPasses)) {
          const built = buildCraftFindings(page);
          browserLayer.violations.push(...built.findings.map(entry => decorate(entry, page.file, 'browser')));
          craftSummaries.push(built.summary);
        }
        /* The press block can only be honest about its own blindness if the blindness travels with it.
           Same mechanism as the native-select hover cell: publish the limit and its count, add no
           violation, and make the summary say so, because `violations: 0` next to a press block where
           nothing registered :active is otherwise read as "presses verified". */
        const pressNotMeasurable = [];
        for (const route of craftSummaries) {
          for (const [width, cells] of Object.entries(route.widths ?? {})) {
            const block = cells?.press;
            if (block && String(block.status).startsWith('NOT-MEASURABLE')) {
              pressNotMeasurable.push({
                route: route.route, width: Number(width), status: block.status,
                excusedControls: block.activeStateNeverRegistered ?? 0,
                heldNotSettled: block.heldNotSettled ?? 0,
                reason: block.notMeasurableReason ?? block.status
              });
            }
          }
        }
        browserLayer.craft = {
          widths: [390, 768, 1440], interactionsMeasuredAt: 1440, routes: craftSummaries,
          pressNotMeasurable,
          // A craft run that measured nothing must not read as a craft run that found nothing.
          executedPasses: craftSummaries.reduce((sum, row) => sum + (row.executed ?? 0), 0),
          note: 'Sibling baselines and heading/table/shadow numbers are reported per width; the state matrix, press delta and name/state agreement are resolved once per route from the 1440 interaction pass, with selector matching as the fallback witness. A NOT-RUN or NOT-FOUND row means the probe did not measure anything — it is not a pass. A press block listed under pressNotMeasurable is NOT-MEASURABLE: no control registered :active, so that dimension was never exercised, and it is deliberately not counted as a violation.'
        };
      }
      browserLayer.pages = measured.map(pageSummary);
      // Which documents were actually rendered: a page offering a switch is measured once per locale,
      // so the route count and the page count are different numbers and the report has to say so.
      browserLayer.routes = measured.map(page => page.file);
      browserLayer.locales = Array.from(new Set(measured.map(page => page.result?.rendered.lang ?? page.localeRequested ?? 'unset'))).sort();
      const swept = measured.filter(page => page.occlusion);
      const faceReader = measured.filter(page => page.paintedFonts?.available);
      browserLayer.checks = {
        occlusionSweep: {
          routes: measured.length, swept: swept.length, offsets: swept[0]?.occlusion.samples ?? 0,
          textRuns: swept.reduce((sum, page) => sum + (page.occlusion.runs ?? 0), 0),
          covered: swept.reduce((sum, page) => sum + (page.occlusion.covered ?? 0), 0),
          threw: measured.filter(page => page.occlusionError).map(page => page.file + ': ' + page.occlusionError).slice(0, 4)
        },
        paintedFonts: {
          routes: measured.length, readable: faceReader.length,
          tagged: measured.reduce((sum, page) => sum + (page.result?.fonts?.probeTotal ?? 0), 0),
          read: faceReader.reduce((sum, page) => sum + page.paintedFonts.runs.length, 0)
        }
      };
    }
  } else if (options.browser) {
    browserLayer.browser = 'unavailable';
    browserLayer.reason = 'The directory contains no HTML page to render.';
  }

  const violations = dedupe([...staticViolations, ...browserLayer.violations]).sort(compareViolations);
  const byCode = {};
  for (const item of violations) byCode[item.code] = (byCode[item.code] ?? 0) + 1;
  /* The limit banner has to say which limit it hit. The first version of this string asserted "no
     control registered :active" unconditionally, which was true of the original blindness and is false
     now: with the settle-while-held read, the common cause is a press whose :active was lost mid-read or
     whose value never stopped moving, and on both of those most controls on the route did register the
     state. A banner that mis-describes its own cause is how `violations: 0` gets read as a clean
     instrument, so the cause is taken from the block's own status instead of from a constant. */
  const pressLimits = browserLayer.craft?.pressNotMeasurable ?? [];
  const unmeasured = pressLimits.length
    ? [pressLimits.length + ' press block(s) reported NOT-MEASURABLE across ' +
       new Set(pressLimits.map(item => item.route)).size + ' route(s): ' +
       pressLimits.reduce((sum, item) => sum + (item.excusedControls ?? 0), 0) +
       ' press(es) never registered :active and ' +
       pressLimits.reduce((sum, item) => sum + (item.heldNotSettled ?? 0), 0) +
       ' press(es) had no settled held value to judge. Cause(s): ' +
       [...new Set(pressLimits.map(item => item.status))].join(' ; ') +
       ' — an instrument limit, published beside the zero it sits next to. Not a site defect, not a pass.']
    : [];
  return {
    schemaVersion: 1,
    root: slash(relative(projectRoot, base)) || '.',
    browser: browserLayer.browser,
    summary: {
      pages: reportedPages.length, files: entries.length, violations: violations.length,
      staticViolations: staticViolations.length, browserViolations: browserLayer.violations.length, byCode,
      // Quality dimensions this run could not exercise, beside the zero they sit next to.
      unmeasured
    },
    static: {
      pages: reportedPages.sort((a, b) => a.file.localeCompare(b.file)),
      packaging: { findings: packagingCount, unreachablePages: unreachable },
      budgets: { maxCriticalBytes: options.maxCriticalBytes, maxScriptBytes: options.maxScriptBytes, maxRenderedScriptBytes: options.maxRenderedScriptBytes },
      excluded: ['<noscript> subtrees: Layer 1 skips them because the rendered DOM does not contain them; Layer 2 measures the live tree.']
    },
    violations,
    browserLayer: {
      browser: browserLayer.browser, reason: browserLayer.reason, binary: browserLayer.binary,
      binarySource: browserLayer.binarySource, version: browserLayer.version, viewport: browserLayer.viewport,
      unverifiedWhenUnavailable: [
        'document.documentElement.scrollWidth versus viewport', 'element boxes that leave the viewport',
        'computed font-size of the smallest rendered text', 'computed colour against the effective background (WCAG ratio)',
        'computed letter-spacing on rendered CJK text', 'the locale a switch offers, rendered as its own route',
        'ids and phrase roles created by the running scripts', 'console errors and failed requests',
        'which font face the browser painted behind the declared family', 'text covered by an overlay in paint order',
        ...(options.craft ? [] : ['the visual-craft probes (--craft): sibling baseline drift, heading size inversion, table fit and affordance, shadow layer structure, the interactive type x state matrix, press displacement, and accessible-name/state agreement'])
      ],
      craft: browserLayer.craft,
      // Denominators, so a zero is read as a clean page and not as a check that never ran.
      checks: browserLayer.checks,
      routes: browserLayer.routes, locales: browserLayer.locales,
      pages: browserLayer.pages
    }
  };
}

function dedupe(list) {
  const seen = new Map();
  for (const item of list) if (!seen.has(violationKey(item))) seen.set(violationKey(item), item);
  return Array.from(seen.values());
}

function emptyReport(message) {
  return {
    schemaVersion: 1, root: null, browser: null, error: message,
    summary: { pages: 0, files: 0, violations: 1, staticViolations: 1, browserViolations: 0, byCode: { MISSING_ROOT: 1 } },
    static: { pages: [], packaging: { findings: 0, unreachablePages: [] }, budgets: {}, excluded: [] },
    violations: [{ code: 'MISSING_ROOT', layer: 'static', file: null, line: 0, message, evidence: null, rule: 'The audit needs a directory of static HTML.', ref: 'scripts/audit-site.mjs' }],
    browserLayer: { browser: 'not requested', reason: 'No directory to measure.', binary: null, binarySource: null, version: null, viewport: null, pages: [], routes: [], locales: [] }
  };
}

/* --------------------------------------------------------------------- cli -- */

const usage = `Usage: node scripts/audit-site.mjs [directory] [options]

Layer 1 (no browser) always runs. Layer 2 renders pages in Chrome or Edge over CDP.

  directory                     static output to audit (default examples/alex-lin/dist)
  --browser                     enable Layer 2 measurement
  --craft                       Layer 2 visual-craft probes (needs --browser): sibling baselines at
                               1440/768/390, heading size inversion, table fit and affordance, shadow
                               layer structure, interactive type x state matrix, press delta, and
                               accessible-name/state agreement, measured with real input events
  --chrome <path>               browser binary to drive (default: discover Chrome/Edge locally)
  --viewport-width <px>         render width (default 390)
  --viewport-height <px>        render height (default 844)
  --min-font-px <px>            rendered floor for the smallest text (default 11)
  --max-critical-kb <kb>        critical path ceiling (default 200)
  --max-js-kb <kb>              page JavaScript ceiling (default 60)
  --max-rendered-js-kb <kb>     ceiling on JavaScript the browser really transfers on a route
                               (default 60; every route is gated, both locale trees included)
  --settle-ms <ms>              wait after load for script-rendered content (default 400)
  --locale-wait-ms <ms>         wait for a locale switch to flip document lang (default 2500)
  --occlusion-steps <n>         scroll offsets swept looking for covered text (default 10; 0 skips)
  --report-unreferenced-pages   also flag HTML files that nothing links
  --trace                       progress lines on stderr while the browser layer runs
  --out <path>                  also write the JSON report to a file
  --help                        show this text

stdout is the JSON report. Exit code 1 means objectively checkable violations were found; 2 means the
audit could not run. A browser that cannot be driven reports browser:"unavailable" with a reason and
never fails Layer 1.`;

function parseArguments(argv) {
  const flags = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) { flags._.push(argument); continue; }
    const key = argument.slice(2);
    if (['browser', 'craft', 'help', 'report-unreferenced-pages', 'trace'].includes(key)) { flags[key] = true; continue; }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error('--' + key + ' needs a value');
    flags[key] = value;
    index += 1;
  }
  return flags;
}

const positiveNumber = (value, fallback, name) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new RangeError('--' + name + ' must be a positive number');
  return parsed;
};

const nonNegativeInteger = (value, name) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new RangeError('--' + name + ' must be a whole number of steps, or 0 to skip the sweep');
  return parsed;
};

const directlyRun = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (directlyRun) {
  let flags;
  try { flags = parseArguments(process.argv.slice(2)); }
  catch (error) { console.error(error.message + '\n' + usage); process.exitCode = 2; }
  if (flags?.help) { console.error(usage); process.exitCode = 0; }
  else if (flags) {
    let report;
    try {
      report = await auditSite({
        root: flags._[0] ? resolve(process.cwd(), flags._[0]) : defaultRoot,
        browser: Boolean(flags.browser), chrome: flags.chrome ?? null,
        viewportWidth: positiveNumber(flags['viewport-width'], 390, 'viewport-width'),
        viewportHeight: positiveNumber(flags['viewport-height'], 844, 'viewport-height'),
        minFontPx: positiveNumber(flags['min-font-px'], 11, 'min-font-px'),
        maxCriticalBytes: positiveNumber(flags['max-critical-kb'], 200, 'max-critical-kb') * 1024,
        maxScriptBytes: positiveNumber(flags['max-js-kb'], 60, 'max-js-kb') * 1024,
        maxRenderedScriptBytes: positiveNumber(flags['max-rendered-js-kb'], 60, 'max-rendered-js-kb') * 1024,
        settleMs: positiveNumber(flags['settle-ms'], 400, 'settle-ms'),
        localeWaitMs: positiveNumber(flags['locale-wait-ms'], 2500, 'locale-wait-ms'),
        occlusionSteps: flags['occlusion-steps'] === undefined ? 10 : nonNegativeInteger(flags['occlusion-steps'], 'occlusion-steps'),
        reportUnreferencedPages: Boolean(flags['report-unreferenced-pages']),
        craft: Boolean(flags.craft),
        trace: Boolean(flags.trace)
      });
    } catch (error) {
      console.error('Audit failed: ' + (error?.stack ?? error));
      process.exitCode = 2;
      report = null;
    }
    if (report) {
      const json = JSON.stringify(report, null, 2);
      process.stdout.write(json + '\n');
      if (flags.out) await writeFile(resolve(process.cwd(), flags.out), json + '\n');
      console.error(`audit: ${report.summary.pages} page(s), ${report.summary.files} file(s), ${report.summary.violations} violation(s); browser=${report.browserLayer.browser}`);
      for (const item of report.violations) console.error(`  ${item.code} ${item.file ?? ''}${item.line ? ':' + item.line : ''} ${item.message}`);
      if (report.error) process.exitCode = 2;
      else if (report.summary.violations) process.exitCode = 1;
    }
  }
}
