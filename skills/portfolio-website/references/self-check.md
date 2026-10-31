# Self-check

Every other reference ends its sections with a **Check** row. A Check row is prose, and prose has one failure mode this project has already paid for: a run that reported zero findings while the dimension was physically unmeasurable — the press probe printed PASS because nothing in it could fail. So the instrument ships inside the Skill instead of living in a separate repository.

## Run it

```
node scripts/selfcheck.mjs <built-site-dir>
```

Zero dependencies; Node 22 or newer. The browser and craft layers need a local Chrome or Edge, found automatically or named with `--chrome <path>`.

- `--static-only` — structure, packaging, links, locale and budget rules, no browser. Use it while building; it answers in seconds.
- `--map` — every check code beside the reference line that states it, read from the checker rather than copied into prose.
- `--json` — the full report, for a script or a diff between two builds.

Exit code 0 means measured and clean, 1 means measured and defective, 2 means the run could not measure. Treat 2 exactly like a failure: it is the case where a report can be empty for the wrong reason.

## Three states, not two

| Verdict | What it means | What to do |
| --- | --- | --- |
| PASS | The rule was measured on this page and held | Nothing |
| FAIL | The rule was measured and the page breaks it | Fix the page |
| NOT-MEASURED | The instrument could not reach the question | Say so in the handover; never report it as a pass |

The third state is the whole point. A form error that no route submits, a press whose held value never settled, a native control whose chrome the platform paints inside a closed shadow tree — each is a real limit of the instrument, and each must appear beside the zero it would otherwise be mistaken for. A handover that says "all checks pass" while any row reads NOT-MEASURED is describing a measurement that was never made.

## What these codes cover

The table is grouped by the reference whose Check row each code executes. `--map` prints the live version with line citations.

| Reference | Codes |
| --- | --- |
| [component anatomy](component-anatomy.md) | `CRAFT_SIBLING_BASELINE`, `CRAFT_HEADING_INVERSION`, `CRAFT_TABLE_FIT` |
| [demo projects](demo-projects.md) | `PAGE_LANG`, `BROWSER_LOCALE_RENDERED` |
| [interaction states](interaction-states.md) | `CRAFT_STATE_MATRIX`, `CRAFT_PRESS_DELTA`, `CRAFT_NAME_STATE` |
| [depth and spectacle](scroll-depth.md) | `BROWSER_OCCLUSION` |
| [surfaces](surfaces.md) | `CRAFT_SHADOW_LAYERS`, `CRAFT_SHADOW_INSET` |
| [visual direction](visual-direction.md) | `BROWSER_CJK_TRACKING`, `BROWSER_PAINTED_FONT`, `BROWSER_LABEL_PUNCTUATION`, `LABEL_PUNCTUATION`, `BROWSER_CONTRAST`, `BROWSER_COLUMN_COLLAPSE`, `BROWSER_ELEMENT_OVERFLOW`, `BROWSER_H_OVERFLOW`, `REDUCED_MOTION`, `JS_BUDGET`, `BROWSER_JS_BUDGET`, `CRITICAL_PATH_BUDGET` |
| [visual review](visual-review.md) | `CSS_UNDEFINED_VAR`, `DUPLICATE_ID`, `BROWSER_DUPLICATE_ID`, `DEFINITION_LIST`, `FOOTER_IN_MAIN`, `H1_COUNT`, `HEADING_SKIP`, `TABLE_CAPTION`, `TH_SCOPE`, `BROWSER_MIN_FONT_SIZE`, `FOCUS_VISIBLE_SCOPE`, `OFFSCREEN_HIDE`, `SKIP_LINK`, `SKIP_TARGET_TABINDEX`, `FONT_SCALE_HARDCODED`, `FONT_SCALE_NO_TOKENS`, `EMPTY_LINK`, `BROWSER_CONSOLE_ERROR`, `MISSING_RESOURCE`, `THIRD_PARTY_RUNTIME`, `SHIP_METADATA`, `SHIP_SCRATCH_PAGE`, `SHIP_UNREACHABLE_PAGE` |

That is 45 codes against 51 Check rows, and the difference is not rounding. Thirty-one rows have no executable check at all: the seven in [motion choreography](motion-choreography.md), the seven in [typographic execution](typography-execution.md), the seven in [responsive construction](responsive-construction.md), the six in [spatial construction](spatial-construction.md), the three in [media and navigation](images-and-links.md), and the one in [reads as generated](reads-as-generated.md). Those remain judgement calls. Do not let the clean table above imply they were measured — a page can pass every code here and still be a stack of full-width blocks.

## What no instrument will tell you

The code cannot say whether a claim is true, whether the evidence is enough for this person's field, whether the direction statement was derived from the material or borrowed from the last site the builder liked, or whether the hierarchy reads at a glance. Those are read by [visual review](visual-review.md) and argued in the direction statement. The self-check exists to remove the questions that *can* be settled by measurement from the ones that cannot, so the remaining judgement is spent where judgement is actually required.

## The order

Build, run, fix what FAILs, run again. Never edit an expectation to silence a finding. When the check itself is wrong the reference is wrong first: this project's press rule demanded a compositor displacement from every press-capable type while the same section said a paper control answers by tone — the probe obeyed the rule and manufactured a requirement the material contradicted. The repair was to amend the rule, then the classifier, then the site. A check that disagrees with the page is a question about which one is wrong, and the answer is never "loosen the check until it agrees".

The copy of the checker that ships here is byte-identical to the one the example site is built against, and the test suite fails if the two ever diverge, so a rule that moves without its probe is caught rather than discovered later.
