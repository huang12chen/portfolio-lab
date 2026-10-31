#!/usr/bin/env node
/* The skill's executable gate. Every **Check.** row in references/ states a property of the built
   page; this file runs the instrument that measures those properties and prints one verdict per
   layer, so a builder can tell "measured and clean" from "could not measure" — the two states a
   prose checklist cannot distinguish. Nothing here re-implements a rule: audit-site.mjs owns them,
   and craft-probes.mjs owns the craft ones. */
import { resolve } from 'node:path';
import { auditSite, RULES } from './audit-site.mjs';

const usage = `Usage: node selfcheck.mjs <built-site-dir> [options]

  --static-only       skip the browser and the craft probes (structure and packaging only)
  --chrome <path>     use a specific Chrome or Edge binary
  --json              print the full report instead of the verdict table
  --map               list every check code beside the reference line that states it

Exit codes: 0 measured and clean, 1 measured and defective, 2 could not measure.`;

const argv = process.argv.slice(2);
/* The mapping is read from the checker rather than copied into prose, so a rule that moves takes its
   citation with it. `npm run check` proves each cited line still exists and still says the thing. */
if (argv.includes('--map')) {
  const rows = Object.entries(RULES)
    .map(([code, rule]) => ({ code, ref: rule.ref.split(';')[0].trim(), anchor: rule.anchor ?? '' }))
    .sort((a, b) => a.ref.localeCompare(b.ref) || a.code.localeCompare(b.code));
  for (const row of rows) process.stdout.write(row.code.padEnd(26) + row.ref + '  —  ' + row.anchor + '\n');
  process.exit(0);
}
if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
  console.error(usage);
  process.exit(2);
}
const target = argv.find(arg => !arg.startsWith('-'));
if (!target) {
  console.error('A built-site directory is required.\n\n' + usage);
  process.exit(2);
}
const chromeIndex = argv.indexOf('--chrome');
const chrome = chromeIndex >= 0 ? argv[chromeIndex + 1] : null;
const browser = !argv.includes('--static-only');

let report;
try {
  report = await auditSite({ root: resolve(process.cwd(), target), browser, craft: browser, chrome });
} catch (error) {
  console.error('self-check could not run: ' + (error?.stack ?? error));
  process.exit(2);
}

if (argv.includes('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exit(report.error ? 2 : report.summary.violations ? 1 : 0);
}

const out = [];
const verdict = count => count ? 'FAIL' : 'PASS';
out.push('self-check: ' + (report.root.startsWith('..') ? resolve(process.cwd(), target) : report.root));
out.push('  ' + report.summary.pages + ' page(s), ' + report.summary.files + ' file(s), ' +
  (report.browserLayer.craft?.routes?.length ?? 0) + ' route(s), ' +
  (report.browserLayer.craft?.executedPasses ?? 0) + ' measurement pass(es)');
out.push('');
out.push('  static        ' + verdict(report.summary.staticViolations).padEnd(5) +
  '  structure, packaging, links, locale and budget rules that need no browser');
if (!browser) {
  out.push('  browser       SKIPPED  --static-only: layout, contrast, occlusion, states and press were not measured');
} else if (report.browser === 'unavailable') {
  out.push('  browser       COULD NOT MEASURE  ' + report.browserLayer.reason);
} else {
  out.push('  browser       ' + verdict(report.summary.browserViolations).padEnd(5) + '  ' + report.browser);
  /* One row per craft dimension, because a single craft FAIL does not say which question failed.
     A dimension measured on no pass at all reads NOT-MEASURED, never PASS. */
  const tally = new Map();
  for (const route of report.browserLayer.craft?.routes ?? []) {
    for (const width of Object.keys(route.widths ?? {})) {
      for (const [dimension, value] of Object.entries(route.widths[width])) {
        if (!value || typeof value !== 'object' || Array.isArray(value) || !value.status) continue;
        const key = dimension;
        if (!tally.has(key)) tally.set(key, { pass: 0, fail: 0, notMeasured: 0, total: 0 });
        const row = tally.get(key);
        row.total += 1;
        if (value.status === 'FAIL') row.fail += 1;
        else if (String(value.status).startsWith('NOT-MEASURABLE')) row.notMeasured += 1;
        else row.pass += 1;
      }
    }
  }
  for (const [dimension, row] of tally) {
    const state = row.fail ? 'FAIL' : row.pass ? 'PASS' : 'NOT-MEASURED';
    out.push('  ' + dimension.padEnd(13) + ' ' + state.padEnd(5) + '  ' + row.pass + ' pass / ' +
      row.notMeasured + ' not-measurable / ' + row.total + ' measured pass(es)');
  }
}
if (report.summary.unmeasured?.length) {
  out.push('');
  out.push('  NOT MEASURED — published so a zero is never read as a pass:');
  for (const line of report.summary.unmeasured) out.push('    ' + line);
}
if (report.violations.length) {
  out.push('');
  out.push('  violations:');
  for (const item of report.violations) {
    out.push('    ' + item.code + '  ' + (item.file ?? '') + (item.line ? ':' + item.line : '') + '  ' + item.message);
  }
}
out.push('');
out.push(report.error ? '  RESULT: could not finish — ' + report.error
  : report.summary.violations ? '  RESULT: ' + report.summary.violations + ' violation(s); fix these before calling the page done'
    : '  RESULT: measured and clean. This is evidence for the Check rows it covers, not a judgement of the design.');
process.stdout.write(out.join('\n') + '\n');
process.exit(report.error ? 2 : report.summary.violations ? 1 : 0);
