# Typographic execution

[visual direction](visual-direction.md) chooses the scale, the tracking, and the CJK corrections. That is the part a design statement can get right while the page still looks wrong, because none of the decisions that make type read as *set* rather than *placed* live in a scale: figures that line up, numbers written in the form the locale actually uses, a paragraph's last line not stranded, precision that matches the measurement behind it, and edges that are optically straight instead of geometrically flush. Nothing below is a value.

## Two ways to write a number, and a page usually needs both

Numbers a reader scans *down* need equal advance widths so the column's magnitudes line up vertically; numbers a reader reads *in a sentence* need to sit in the text's rhythm, which proportional figures do and tabular ones don't (a tabular `1` in running prose looks like it has been spaced out). So a page with a metrics table and a sentence quoting the same metric is a page with two figure modes, and shipping one mode for both is the defect.

Check the font too: `font-variant-numeric: tabular-nums` is a request, not a guarantee. A font without tabular figures in its `tnum` feature accepts the declaration and changes nothing, and the column stays crooked while the CSS says it was fixed.

**Check.** For every element whose text is a number inside a column or a table cell, measure the rendered advance width of each digit glyph in it (`0` against `1` against `8`); pass needs the widths equal. Then find numbers embedded in prose and confirm they do *not* use the column's mode. Then confirm the mode is real rather than declared: if the widths are unequal, the font does not have the feature and the declaration is decorative — say so and pick a font that has it or restructure the column.

## The number's form belongs to the locale, not the string

A bilingual site that renders `12,800,000` in both languages has not localised anything. Chinese groups by four digits against `万` and `亿`, so the same quantity is `1280 万`; the currency symbol, the space between symbol and amount, the treatment of a negative, the date order, and the unit all differ; and percent signs sit differently in tables and in running text. The same is true in miniature inside one language: `2.3k` in a chart label and `2,300` in the sentence beneath it are two claims about precision, not one number.

Derive the form from where the number is read. A label with no room gets the compressed form and must not lose the unit. A value that carries an argument gets full digits and the period it was measured over.

**Check.** For every numeric or date string that appears in both locales, report the two renderings. Pass needs them to differ wherever the two languages' grouping, unit, or date conventions differ, and to be identical only where they genuinely should be (an identifier, a version, a filename). Then flag any single quantity rendered two ways on the same route.

## Digits you cannot justify are digits you invented

A metric quoted to five significant figures from a source that supports two is the most common way a generated page lies with typography rather than with words. False precision reads as authority to a reader who cannot see the spreadsheet, and the person who owns the material cannot defend it in an interview. So the count of digits comes from the measurement's own error bar or from the granularity of the underlying records — whichever is coarser — and the rounding rule is written next to the number the first time it appears.

Percentages have their own trap: a change from 4% to 6% is +50% relative and +2 points absolute, and which one is quoted is a claim. Pick one, name which, and keep it across the page.

**Check.** For every number in the shipped text, find its basis in the source material or in `DESIGN.md`. Fail on any value carrying more significant digits than its basis supports, on any percentage whose relative-or-absolute form is not stated, and on any figure whose period is absent at the place it is used — see [content](content.md), where the same rule exists because it is a content defect that happens to be rendered as type.

## `balance` is for lines, not for paragraphs

`text-wrap: balance` exists to stop a two-line heading from leaving two words on the second line, and it works by making every line about the same length. Applied to a paragraph, that is exactly wrong: prose is supposed to be ragged, and equalised lines create a river-shaped block with two accidental edges. Applied to a long heading it can produce a break that separates an adjective from its noun, which reads worse than the orphan it removed. So the rule is scope, not usage: balance on headings, labels, captions, and short ledes; nothing longer than about three rendered lines gets it; body prose gets `pretty` or nothing.

The reason this matters more than the number of CSS lines is that balance changes the *shape* of the most prominent object on the screen, and a heading balanced into an hourglass is a visible decision no one made.

**Check.** For every element declaring `text-wrap: balance`, report its rendered line count and the character count of its shortest line. Fail on any balanced block longer than three lines, and on any balanced block whose shortest line carries a single word (Latin) or fewer than three characters (CJK) — that is a break the algorithm chose for geometry and the reader experiences as a mistake. Then check the body copy: if the last line of any paragraph is shorter than a quarter of the column, and no `text-wrap: pretty` or equivalent is in use, report it as a widow.

## The column edge is optical

A left-aligned column whose lines start with an italic, a quote mark, or a CJK full-width opening bracket is not flush with anything: the *ink* sits further in or out than the box, so the edge of the text runs ragged at the very place the reader's eye uses to find the next line. Hanging punctuation is the fix where `hanging-punctuation` is supported, and a small negative indent on the affected character is the fallback; a page that ships neither has a drawn edge and a ragged ink edge at the same time, which is what "something's wrong with the spacing but I can't say what" usually is.

The same applies wherever geometry pretends to be centring — see [spatial construction](spatial-construction.md) — and to mixed-script lines, where a Latin word inside CJK needs a hair of space, and where a numeral's height will not match the surrounding hanzi's.

**Check.** Measure the ink left edge of every line in a column against the column's box edge and report the spread; a spread wider than the tracking already accounts for is an un-hung edge. For CJK, confirm that opening brackets and full-width punctuation at line starts do not push the first glyph in past every other line, and confirm `line-break` is strict enough that a `。」` does not sit alone at the start of a line while its sentence ends on the previous one.

## Weights have to be distinguishable or they are decoration

A type system with 400, 500, 550, 600, 650 and 700 is a system where the reader can reliably tell about two of those apart, and the rest are the designer's private vocabulary. The same trap as too many pixel sizes: more steps is not more hierarchy, it is a smaller difference between each step, and differences under the just-noticeable threshold carry no information at any distance.

So count the distinctions the page actually needs to make — usually: body, emphasis, label, display — and give each one a step the reader can see next to the others at the size it will be used at, remembering that weight contrast shrinks as size shrinks, so the metadata row needs a bigger difference than the headline does.

**Check.** Collect the distinct `font-weight` values in use, paired with the size each appears at. Fail when two weights that are adjacent in the page's hierarchy are less than one real step apart at the smaller of the two sizes; fail when more than four weights are used to carry more than one distinction. Then a knock-down test: render the page in a single weight and count the distinctions that survive — the ones that don't survive were carrying no meaning that contrast could not have carried better.

## Small type is a decision, not a floor

Metadata, captions and labels sit below the reading size for a reason: they are not the argument. But small type on a 1440 screen is being viewed from 60cm, not from the 35cm a phone is held at, so the same nominal pixel size is a smaller visual angle — and a page that scales its *labels* down as its container gets wider ends up with dust on desktop and legible text on mobile, which is the exact inverse of the intended relationship. Small is allowed; small-that-only-exists-on-the-big-screen is the finding.

Truncation is the related defect: `-webkit-line-clamp` and `text-overflow: ellipsis` on a primary label quietly delete content, and the reader cannot tell a clipped title from a short one.

**Check.** For every text-bearing class, report its computed size at 1440 and at 390. Fail on any class whose size *decreases* as the viewport grows unless that class is a display heading, and on any sustained run (more than a short label) below the size at which the page's own body text stops being readable at the same viewing distance. Then find every clamped or ellipsised element and confirm the full string is reachable — a `title`, the detail route, or the source document — and that none of them is the only place a thing is named.

## Order

Type execution comes after the scale is chosen and before everything else visual is judged: surfaces, motion and images are all evaluated against text the reader is already trying to read, and numbers set in proportional figures in a column will be reported as "misaligned" by a panel that has correctly identified a typographic cause. Fix figure mode, then numeric form and precision, then balance scope, then the column edge, then weight steps. Every rule above is also a row in [visual review](visual-review.md), and the numbers they cite belong in `DESIGN.md` next to the direction statement, because a type decision with no recorded basis is indistinguishable from a default.
