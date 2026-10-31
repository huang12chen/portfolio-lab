# Responsive construction

A breakpoint is not a device width; it is a sentence about your content — "at this width, this thing stops working and I choose what to do about it". Most generated portfolios have three breakpoints inherited from a template, one `clamp()` doing all the type sizing, and a mobile layout that is the desktop layout squeezed, which is how a page ends up with its argument column cut off, its body text at 13px, and its before/after pair stacked so the comparison is gone. Nothing below is a value. Every rule is derived and then measured at real widths.

Declare in `DESIGN.md`, before writing any media query, two lists: the content ranked by how much the reader needs it, and the layout relationships that must survive at every width. Those two lists are what the checks below can be graded against; without them, "responsive" is untestable.

## Reading size does not shrink; display size does

The most common mechanism that produces unreadable phones is a `clamp()` whose slope is set by the display headline: the same expression drives body text, so as the viewport falls the body falls with it, and reading type ends up at a size no human eye was designed for. The two kinds move in opposite directions. Display type scales down because its job at 390 is to fit and to be loud relative to the body; reading type does not scale, because its job is legibility at a fixed viewing distance, and the phone is *held closer*, not further away.

So set the reading sizes as constants that hold from the smallest width up — allowing one deliberate increase for CJK, which needs a larger nominal size at the same legibility — and let only the display steps be fluid.

**Check.** Read the computed `font-size` of the body text, a caption, and a label at 360, 390, 430 and 1440. Pass needs none of them to *decrease* as width decreases, and needs the body size to be at least as large on the phone as the size the page's own prose would need to be readable at 35cm. For the display steps, report the ratio between the largest and smallest rendered size and confirm the page still has a visible hierarchy at the narrow end — a headline that has come down to within one step of body size has no ladder left.

## What gets dropped is a ranked list, not a coincidence

At every narrowing step something is removed, hidden, or re-parented. In a page with no declared ranking, what gets dropped is whichever element a media query happened to reach first — which is almost never the least valuable thing, and is frequently the unit label, the attribution line, or the column of a table that carried the comparison.

Take the ranking from the material: the thing the reader came to judge is first, the evidence for it is second, the framing is third, and the parts that exist to make the desktop layout look finished are last. Then write the drop order once and follow it at every width, so that the same class of content disappears on every route rather than whatever fitted.

**Check.** At each declared breakpoint, list the elements that become hidden, removed, or `display: none` relative to the wider layout, and compare against the ranking in `DESIGN.md`. Fail if anything above the framing tier disappears before something below it; fail if the set of dropped content differs between routes with the same tier of content; and fail if any dropped element is the sole carrier of a fact that appears nowhere else — a hidden unit label is a content loss, not a layout change.

## Relationships that must not be broken by reflow

Column order carries meaning in exactly one layout — the one where the reader is expected to compare across columns. A before/after pair, a control-and-measurement row, a specimen next to its scale bar, an original beside a correction: these are single objects with two parts, and stacking them into a vertical sequence converts a comparison into two unrelated facts. The reader does not scroll back and forth; they lose the relationship.

So classify every multi-column structure before building: **sequential** (collapse to one column in reading order), **spatial or comparative** (keep side-by-side and scale, or convert deliberately into an overlay with a control, or keep both parts visible together inside one scrollable region), and **dependent** (a label and its figure, a caption and its image — these collapse together or not at all, and a caption that reflows away from its figure is a bug).

**Check.** For each grid or flex container with more than one column, record which class it belongs to in `DESIGN.md`. Then compare rendered geometry at 1440 and 390: for a comparative container, fail if the parts are separated vertically by more than the height of one part — the reader can no longer see both at once; for a dependent pair, fail if the two elements are separated by any intervening content block. Sequential containers are the only ones allowed to become a plain stack.

## Tables: scroll or reflow, decided by where the argument is

Both answers are correct and they are correct for different tables. If the argument lives **across the columns** — the reader is comparing one row's values against each other, or a category axis is the point — the table must stay a table and scroll sideways, with a visible cue that there is more, because reflowing it into stacked cards destroys the very comparison being reported. If the argument lives **down the rows** — each row is a case and the columns are just its fields — then reflow into a definition-list-like block and keep everything on the screen at once, because a horizontal scroll that hides the field that matters is worse than a taller page.

The default failure is picking scroll because it is easy and then letting the scroll clip the column that carries the argument, so the reader sees the labels and the first number and never reaches the conclusion. Whichever is chosen, the first thing visible in the scroll region must be a thing worth reading on its own.

**Check.** For every table, state in `DESIGN.md` whether its argument is columnar or row-wise, and verify the chosen treatment matches. Then at 390, measure `scrollWidth` against `clientWidth` for the scroll container, and read which columns fall outside: fail if any column named as argument-bearing is clipped, fail if there is no static overflow cue (a gradient edge or a visible cut) so the scrollability is undiscoverable, and fail on `white-space: nowrap` applied to a header cell — that single declaration is what forces a 600px table inside a 340px region.

## Targets stay large; the number of targets goes down

A 44px touch target and a data-dense table are both real requirements, and the way pages reconcile them is usually the wrong one: padding every row until a 300-value table becomes ten screens, or shrinking every control until nothing is tappable. Neither. When width runs out, reduce the *number* of simultaneously visible controls, or move a control behind one disclosure, or convert a hover affordance into a tap — do not shrink the thing that remains, and do not inflate a row the reader is scanning rather than tapping.

The distinction to keep in mind: the row you *tap* needs clearance; the row you *read* needs alignment. A list of numbers to be scanned wants tight, tabular, dense rows and a large tap region around the action; a list of things to be opened wants generous rows and few of them.

**Check.** At 390, measure the rendered box of every interactive element and report any below the size the site's own primary action uses at 1440. Then check the reverse defect: report any read-only data row that has been padded to interactive clearance, because that is what turns one screen of evidence into six and costs the page its substance. Confirm every hover-only affordance has a tap equivalent that is reachable, not merely present in CSS.

## Never hide an overflow; report it

`overflow-x: hidden` on `body` is how a page stops scrolling sideways while keeping the defect: the content is still wider than the viewport, it is now simply cut, and on a phone the cut is where the reader cannot see it. Every overflow must be found and fixed at the object that causes it — usually an SVG with an intrinsic width and no `viewBox`, a table, a `pre`, a long unbroken token, a fixed-width pill, or a negative margin meant for a wide gutter.

Fixed-width objects are the reliable cause on a hand-built portfolio, because the objects are drawn rather than flowed. Any element you build with its own dimensions has to have a declared shrink path, and a shrink path is not `max-width: 100%` on the wrapper if the child has an intrinsic size.

**Check.** For every route, at 360, 390 and 430, report `document.documentElement.scrollWidth` and require it to equal the viewport width. Then — this is the part that gets skipped — for every hand-built SVG, table, code block, and pill, measure the element's own `scrollWidth` against the viewport, because a child overflowing an `overflow-x: auto` wrapper is invisible to the document check and still unreadable to a person. Fail on any `overflow-x: hidden` on `html` or `body`. Fail on any element whose `scrollWidth` exceeds its own `clientWidth` with no cue and no reason.

## Breakpoints are content's failure points, and they must be ordered

If a layout works at 390 and at 1440, and the breakpoints were chosen at 480/768/1024 because those are device widths, then everything between them is untested and the page breaks at 640. Choose a breakpoint where a specific thing stops working, name that thing, and check the widths on both sides of it. Media queries then form a sequence of declared decisions rather than a set of inherited numbers, and the order matters: a query that sets a value the next query does not reset leaves a value pinned at the wrong size for one width band, which is the classic "fine on my machine at 1280" report.

Two related traps recorded from real builds. First, changing `position` at a breakpoint changes paint order, and a `position: static` mobile override silently removes an element from the stacking context so an opaque sibling paints over its text — so when a layered element's position changes, re-verify coverage at that width rather than assuming the desktop layering survives. Second, a `:root` rule inside a media query cannot out-specify a `:root[lang]` rule outside one, so per-script values that must change with width have to be restated inside the width block, and a change to one of them without the other is a locale-specific break.

**Check.** For each media query, record in `DESIGN.md` which content relationship or which measurement forced it. Fail on a query with no stated reason. Then sweep the widths: for each declared breakpoint, test one pixel inside and one pixel outside, and confirm no element is wider than its container, no layered element covers another's text, and no font size leaves the ladder. Finally compare a settled screenshot at each tested width against the one at 1440 and report any element present in one and absent from the other for no declared reason.

## Order

Rank the content and name the surviving relationships before writing any media query — those two lists are the only thing that makes the rest of this file checkable. Fix type execution before responsive work, because a `clamp()` that shrinks reading type is the defect the first section above exists to catch, and it looks like a responsive problem. Fix component anatomy and table fit before motion, since a scroll region that clips its argument cannot be rescued by animating it. Everything here is a row in [visual review](visual-review.md) measured at real widths, not a claim that the page "has breakpoints".
