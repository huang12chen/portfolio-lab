# Spatial construction

[surfaces](surfaces.md) decides what a page is made of and [interaction states](interaction-states.md) decides how it answers. Neither decides where things sit in depth when the page is standing still, and that is the gap: markup composes a stack of full-width blocks, and a stack of blocks wearing a good palette is still a stack. Composition happens when one thing is *in front of* another on purpose, when a block refuses the grid once, and when the empty space around an object is unequal to the empty space around the others. Nothing below is a value. Each mechanism is read off the material, then measured on the built page.

Start with the same line `DESIGN.md` already carries for light, and add its spatial twin: how many depth tiers the page has, what sits on each one, and how many times anything is allowed to break the grid. A page with no recorded tier list cannot pass the checks here, because there is nothing for an element's `z-index` to be measured against.

## Where the tiers come from

Depth on a page is not decoration; it is the claim that one thing is read *through* or *on top of* another. The material either makes that claim or it does not.

| Condition in the material | What its real geometry is | What the page's tiers then are |
| --- | --- | --- |
| An object annotated on itself — a core sample with a depth scale, a print with a registration mark, a vessel drawn over its own sherd plan | Two registrations of the same thing, deliberately not identical | Ground, figure, annotation on the figure. The offset between the two registrations is content, so it must survive at every width |
| Something physically stacked and separable — board, leather, endpaper; shelf, bisque, glaze test | Every layer is a real surface you could lift | One tier per real layer, in the material's own order, and nothing else may use a tier |
| A before/after or corrected/original pair — a redaction, a restored passage, a p99 traced over a p50 | One thing hiding another, and the point is what is hidden | A slider or a keyed overlay, not two cards side by side. Side-by-side loses the whole argument |
| Diagrams, dashboards, code on one plane | There is no depth in the object, only draw order | Two tiers maximum: canvas and the one thing that floats over it (a menu, a toast). Simulated stacking here is imported from a product UI |
| A single artifact with no parts and no state — one poem, one photograph, one number | There is no layering to represent | Zero overlap. The page composes by scale and silence, and an added floating panel is a lie about the object |

**Check.** Read every element whose computed `z-index` is not `auto` and which actually paints above a different element's box. Group them. Pass needs each one to belong to a tier named in `DESIGN.md`, and the number of tiers used to be within one of the number the material's row above implies. More tiers than the object has layers means the page is stacking for the look of stacking.

## Tiers, not a z-index ladder

A `z-index` of 999 is a bug report written as CSS: the author lost an argument with the stacking order and escalated until nothing else could win. Once one element sits at 999, the next overlay needs 1000, and the page ends with no way to tell from the numbers which thing is supposed to be on top. Declare the tiers as a fixed set — ground, structure, figure, annotation, overlay — and let those five names be the only values anything uses. Anything that genuinely needs to beat the overlay is not an overlay, it is a bug.

The reason to fix this in names rather than in a numeric scale is that a name can be checked against the material and a number cannot. `annotation` above `figure` is a claim about the object; `40` above `30` is arithmetic.

**Check.** Collect the distinct non-`auto` `z-index` values in the shipped CSS. Pass needs their count to be at most the declared tier count plus the handful of negative values used deliberately, and no value above 100. Then find any two unrelated components that share one value — that is a collision waiting for a browser, not a tier.

## Overlap has to be an argument

One overlap on a portfolio page usually reads as a mistake: a heading sitting on a photo it cannot be read against, a card's corner tucked under another for no stated reason. The fix is not fewer overlaps, it is overlaps where the reader can say which thing is being seen through which and why. That sentence is the test. If you cannot finish it, the overlap is decoration and the page will be described as "messy" by someone who cannot tell you why.

Keep the count small and keep each one load-bearing, and take the count from the inventory above rather than from taste. Then handle the part everyone forgets: an overlap that survives 1440 usually dies at 390, because the two boxes no longer have room to be in the same place. Decide per overlap whether it collapses to a single layer, keeps its offset at a legible scale, or is dropped — and say which. An overlap that quietly becomes occlusion on a phone is the same defect the [component anatomy](component-anatomy.md) data section complains about, arrived at from the other direction.

**Check.** At each of 1440, 768 and 390, list every pair of visible elements whose boxes overlap by more than a few pixels in both axes, and for each one report which element paints on top, whether any text run on the lower element is covered, and whether the pair appears at all three widths. A pair that overlaps at 1440 and occludes at 390 is a fail. A pair nobody can name a reason for is a fail. Zero overlaps on a page whose material's row above implies a registration or a stack is also a fail — it means the depth was never derived.

## The grid is only visible in what breaks it

An all-aligned page is not automatically composed; it is a table. Emphasis in a layout works the way emphasis works in a sentence: it is relative, it is rare, and it needs a baseline of non-emphasis to be measured against. So pick the grid, hold it, and then break it a stated number of times, with each break attached to a thing the reader should notice. A page where nothing breaks the grid has no emphasis vocabulary; a page where every section has its own width has no grid to break, and the reader stops orienting.

The break budget comes from the material's own hierarchy. A three-level structure (a collection, a volume, a page) earns roughly one break per level — the wide object that shows the collection, the offset one that shows a single spread. A flat log earns none, and should be honest about being flat.

**Check.** Read the bounding boxes of the top-level content blocks at 1440. Cluster their left edges. Pass needs one dominant cluster — the grid — and a small, named minority outside it, each of them the element `DESIGN.md` says deserves emphasis. Zero outliers means the page cannot point at anything. Outliers in the majority means the clusters are an accident of different containers' padding, which is the most common way a "broken grid" look is actually an unstated one.

## Unequal air is the only way whitespace carries weight

A spacing scale is a maintenance tool, not a composition tool. When every gap on the page is drawn from one scale and none of them is an outlier, all objects are equally expensive, which means none of them is. The air around something is what tells a reader how much to care before they have read a word: the restorer's page has a lot of nothing around one spread because that is what a book on a working bench looks like; a console page is dense because the density is the product. Take the page's overall density from the material's, then spend one gap much larger than the rest, on the thing you want read first.

One honest exception: a page whose whole argument is a single number or a single image can be mostly air. That is a composition of one object, and it passes the same check as long as the object is the reason for it.

**Check.** Measure the vertical gaps between successive top-level blocks at 1440 and 390, settled, no motion in flight. Report the distinct values, the median, and the ratio of the largest to the median. A ratio near 1 means every gap came off one scale and the page has no spatial emphasis — that is the finding, not a pass. When the ratio is large, report what sits directly under the biggest gap: the most expensive space on the page should be above the most important object, and this is the check that catches a page with a hero-height hole above a footer.

## The box is not the ink

Centring is a claim about a rectangle, and reading happens on marks. A triangle in a circle is geometrically centred and visually low-left. Type at the edge of a column is geometrically flush and visually short, because side bearings and italic overhangs leave a sliver nobody asked for. Full-width CJK punctuation carries trailing space, so a line ending in `。」` sits further from the margin than the Latin line beside it. Hanging punctuation and a few corrected optical centres are the difference between a page that looks set and one that looks placed.

Derive which of these matter from the material: a page whose object is a photograph of a printed page cares about the margin edge; a page of diagrams cares about icon-in-circle alignment; a bilingual page cares about the punctuation overhang on both sides.

**Check.** For each element that is centred inside a wider box and contains only a glyph, an icon, or a short label, compare the centre of its box to the centre of its ink — `getBoundingClientRect` on the element against the rendered bounds of its text or path. Flag any pair more than a couple of pixels apart, which is visible at a glance on a control. Then, for every right-aligned or justified text edge, check the last character of each line against the container edge; a column whose punctuation hangs in from one line and not the next was not set.

## Order

Decide tiers and overlap before surfaces: a shadow list implies which tier an object sits on, and an element with no tier has nothing for its penumbra to fall on. Decide the grid and its break budget before motion, because scroll-linked movement is a spatial claim and needs a spatial baseline to deviate from — see [depth and spectacle](scroll-depth.md). Fix anatomy first: parts that disagree about a baseline read as broken regardless of how well the page is composed. Once these pass, the checks belong in [visual review](visual-review.md) as rows, not in this file as advice.
