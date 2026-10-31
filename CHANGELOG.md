# Changelog

## 1.3.0 — 2026-10-30

### The Skill gained an executable gate

- `scripts/selfcheck.mjs` runs the audit for you and prints one verdict per layer: structure and packaging first, then a real browser at 1440, 768 and 390. Exit code 0 means measured and clean, 1 means measured and defective, 2 means could not measure. Flags: `--static-only`, `--chrome <path>`, `--json`, `--map`.
- Every check code cites the reference line that states it, and the table is read from the checker rather than copied into prose, so a rule that moves takes its citation with it. `npm run check` proves each cited line still exists and still says the thing.
- A dimension the instrument could not reach reports `NOT-MEASURED` beside the zero it sits next to, and is never rounded into a pass.

### A site auditor ships for the first time

- `scripts/audit-site.mjs` carries 46 rules: 25 static (structure, packaging, links, locale, budget), 13 browser, 8 craft. `npm run audit`, `npm run audit:browser` and `npm run audit:craft` run the three scopes against the example site, and `scripts/craft-probes.mjs` owns the craft measurements.
- The craft layer is opt-in (`--craft`, `npm run audit:craft`): sibling action/metadata baseline drift at 1440, 768 and 390; h1-versus-largest-h2 computed size per route; table `scrollWidth` against container with cut-header and affordance accounting; parsed `box-shadow` layer structure (layers, offset-to-blur ratios, quadrants, inset split); an interactive-type × state coverage matrix resolved by CSSOM rules plus real pointer and keyboard computed diffs; press displacement under a held pointer; and accessible-name/state agreement after click and keyboard activation.
- `BROWSER_COLUMN_COLLAPSE` catches the failure the other rules cannot see: a grid class that also matches the section wrapper squeezes a text column to a couple of characters per line while passing every overflow, contrast and state probe. It measures rendered column width and document height, so a body column collapsed to 8px can no longer ship as a clean run.
- 107 tests cover the rules, the self-check gate, the craft probes and the dev server.

### The example site is now self-contained

- Removed the vendored Motion 14.6.0 and its licence file, the 10,908-byte Noto Serif SC subset and its `OFL.txt`, and two stock photographs. The shipped site now downloads no webfonts, no photographs, no raster images and no third-party scripts; its only image file is a hand-drawn favicon. `THIRD_PARTY_NOTICES.md` and `examples/alex-lin/dist/ASSETS.md` were brought in line with that.
- Case visuals are drawn with CSS and inline SVG, and the motion layer uses the browser's own scroll-driven animations. Type renders in operating-system fallback stacks, so the exact face differs by machine and nothing depends on a vendor's cut.
- The Chinese locale is a real page tree under `zh/` rather than a client-side switch.

### References

- Thirteen new reference documents, each in English and Chinese: visual direction, surfaces, spatial construction, typography execution, component anatomy, interaction states, motion choreography, responsive construction, scroll depth, reference research, reads-as-generated, visual review, and self-check.

## 1.2.0 — 2026-10-26

- Rename the Skill to portfolio-website and use shorter filenames.
- Combine installation, setup checks, and first use in one guide.
- Correct image-loading messages for English and Chinese pages.

## 1.1.2 — 2026-10-26

- Initial public release of portfolio-website, with English and Chinese instructions.
- Fictional portfolio in gallery and continuous-scroll versions, with three working project demos.
- Installation and deployment guides, screenshots, and recordings.
