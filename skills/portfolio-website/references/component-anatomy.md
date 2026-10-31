# Component anatomy

Three of the findings in the last blind review were not taste failures. Nobody chose ragged card baselines, or a 178px nav, or a table with its argument column cut off — the components were simply missing parts, and the page shipped as half-built. Taste is hard to teach; anatomy is a list. This file is that list, plus the rules that decide where a part's edge goes when a component is one of a set.

Every claim below is something a script can measure on the rendered page. An anatomy defect produces no console error and reads as "not quite finished" to every reviewer who looks.

## The failure class

Four measured findings from a built portfolio, reported here as classes, not as a look to copy.

| What was measured | What the reader experienced | The missing part |
| --- | --- | --- |
| Index cards ended at heights 454, 479, and 514 in one row at 1440, so their three action links landed on three different baselines | A row of siblings that does not belong to the same system | A fixed region and a flexible region inside the card, and a shared baseline for the part the reader scans down |
| A case contents nav collapsed into three ragged rows 178px tall at 390 | The first screen was the navigation, and the case had not started | A defined overflow behaviour for nav items, and a height budget measured against the viewport |
| A page's own `h1` was set at body size (17.5px) while its section `h2`s were at 40px | The page identity read as a paragraph; hierarchy was carried by the wrong element | The display role bound to the element that names the page, not to whichever heading is longest |
| A 480px data table sat inside a 291px scroll region with no affordance | The two columns the case argued about were not on the screen the reader saw | An affordance, or a decision to reflow — one of the two, chosen from the data's shape |

**Check.** For each row, the same probe in a browser: the max `top` offset delta of the sibling action links; the nav's own height as a fraction of the viewport height at 390; computed `font-size` of the route's `h1` against the largest `h2` on that route; each table's `scrollWidth` against its container's client width and the presence of an affordance. Record the four numbers in `DESIGN.md` as pass/fail with the value.

## Which parts a component must have

The parts in the right-hand column are the ones generated output omits, and each one is what makes the component read as designed rather than as assembled.

| Component | Required parts | The part whose absence reads as half-built |
| --- | --- | --- |
| Card | container, primary identifier, one tier of supporting text, the artifact or evidence itself, one action, and metadata tied to the artifact (date, medium, scale, role) | One action. A card with three competing links is a list, and a card whose image is decorative rather than evidential is a template tile |
| Table | caption that states what is being compared, headers associated with their column and row, the unit column or unit-in-header convention, an alignment rule per column type, and a source or period line | The caption and the source line. Numbers without a definition of what they count are the same defect as an unsourced metric in [visual review](visual-review.md) |
| Nav | group label when there is more than one group, current-position marker, a bounded item count per level, an overflow behaviour, and a return path | The current-position marker and the overflow behaviour. Nav that shows no "you are here" and grows without limit is a list of links |
| Input | label that is not the placeholder, the field, helper text where the format is not obvious, an inline error region that reserves its space, and a submit affordance | The reserved error region and helper text. Placeholder-as-label disappears on input, so the reader forgets what the field wanted |
| Control (button, toggle, select) | hit area, resting edge, exposed state, and a name that survives locale switching | The exposed state. See [interaction states](interaction-states.md): a control with no state has nothing to announce |

**Check.** For each component instance in the rendered page, test for the presence of its required parts by selector and by accessibility tree — caption and `th[scope]` per table, a real `<label>` bound by `for` or wrapping per input, one primary action per card, an aria-current or equivalent marker in nav, an error region in the form. Report a presence count per part type. Any required part missing on more than zero instances is a fail, and the number of instances is the finding's size.

## Siblings share the baseline the reader scans

A set of cards, list items, or table rows is a component, not a collection of components. The reader compares them vertically, so any part they compare must land on the same line across the set: actions, metadata, status markers, and the last line of a title block.

Decide it structurally rather than by fixing heights after the fact. Inside a sibling set, split the parts into a fixed region — identifier, metadata, action, sized by the design — and one flexible region — the abstract, the note, the description — and let the flexible one absorb the variation. Where the set is a grid, a nested grid or subgrid row makes the baselines agree by construction; where that is not available, one shared minimum height derived from the tallest content in the set is acceptable, and per-item content-derived heights are not. Text that overflows a fixed region gets clipped with a stated rule, never allowed to push the action down.

Then check the set at every width, because the row that held together at 1440 becomes a stack of three single-item rows at 390, where the baseline argument no longer applies but the ragged-edge argument does: a stacked set with wildly varying item heights reads as a broken grid.

**Check.** In a headless browser at 1440, 768, and 390, group rendered siblings by their container row and report the max delta of each comparable part's `top` offset within the group — the action link, the metadata line, the status marker. Pass requires zero delta, or within a small tolerance only where the part is deliberately offset and `DESIGN.md` says so. Report one number per row; the 454/479/514 finding was three different numbers for a set that looked fine in source.

## Where hierarchy has to sit

The element that names the page owns the display role, and the section headings below it own the next one. Hierarchy carried by the wrong element is not a smaller heading, it is a page that does not know what it is about.

Rules that survive a swap between fields: one `h1` per route, sized above every other text role on that route; a heading whose text is the page's identity cannot be a styled paragraph with an `aria-labelledby` pointing at itself; and a case page's title has to out-rank its first section title at every width, including the narrow ones where a desktop display size was carried down unchanged. The size steps come from [visual direction](visual-direction.md)'s modular ratio and its narrow-screen rule that the display-to-body ratio comes down as width drops — anatomy decides which element gets which step, not how big it is.

**Check.** For every route, read computed `font-size` for the `h1`, every `h2`, the largest `h3`, and the body paragraph. Pass requires `h1` greater than the largest `h2` on that route, and the body size unchanged from the token. Report the two numbers at 1440 and at 390; the 17.5px-`h1`-against-40px-`h2` inversion is caught by this probe in one pass, on any site.

## Data that cannot fit

A table wider than its container has two honest answers, and the choice comes from the data's shape, not from available space.

- **Keep the table and scroll it, with an affordance** — when the reader's task is comparing across columns: a spec matrix, a metrics table where the argument is a delta between two periods, a glaze test grid read by firing number. The affordance is not optional: a visible cut edge or fade at the scroll side, a hint of the next column's content, focusability so a keyboard reader can reach the cut cells, and a caption that names what is off-screen. A native scrollbar that appears on one platform and not on touch is not an affordance.
- **Reflow it** — when the reader's task is going down the rows and the columns are attributes of one thing: a timeline, a per-specimen record, a list where each row is a small object. Render each row as a keyed block with its own label-value pairs, and keep row order and any ordering claim intact.
- **Prune columns by decision** — when only some columns carry the argument, keep those and move the rest into the detail the row already links to. Say in `DESIGN.md` which columns were dropped and why; silently dropping them is a content defect.

Never let the container decide. A 480px table inside a 291px region with no cue hides whichever columns fall right of the cut, and in a case page that is exactly where the argument lives.

**Check.** For each table at 390 and 768: report `scrollWidth`, the container's client width, and the count of header cells whose right edge is beyond the container's visible area. If any header is cut, pass requires a rendered affordance — a mask, fade, or edge indicator element with a computed non-none gradient or opacity step at the boundary — plus the table's scroll container reachable by keyboard, plus a caption naming at least one off-screen column. Where the alternative answer was chosen, assert instead that no table is horizontally scrollable and that each reflowed row exposes label-value pairs in the accessibility tree. Either way, list the cut columns and check them against the columns the surrounding prose argues about.

## Nav that has to shrink

The contents-nav finding was not ugly wrapping, it was an undefined overflow behaviour: at 390 the item set had no rule, so it produced three rows of ragged height and consumed the first screen. Nav gets three decisions before building: how many items per level fit at 390, what happens to the ones that do not (horizontal scroll with snap, a disclosure, or a shorter label set — chosen, not defaulted), and the maximum share of the viewport the nav may hold at any width. A sticky contents rail that eats a third of a phone screen is not navigation, it is an obstacle the reader scrolls past to reach the thing it describes.

**Check.** At 390 and 768, report the nav's own height as a fraction of `innerHeight`, the count of rows its items wrap to, and the variance in item height within one row. Pass requires the fraction under a limit stated in `DESIGN.md`, at most the stated number of rows, and equal item heights. Then scroll past the nav's target and assert the current-position marker is still correct at that offset.

## Order

Fix anatomy before surface and before motion: a card whose action baselines disagree looks broken at any radius, and a table with its argument column cut off has no state worth animating. Check presence of required parts, then sibling alignment, then hierarchy, then fit. Once those pass, [surfaces](surfaces.md) decides what the components are made of and [interaction states](interaction-states.md) decides how they answer.
