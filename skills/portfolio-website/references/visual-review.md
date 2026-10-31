# Visual review

Judging a portfolio from source files misses most of what matters. Layout, contrast, font fallback, motion timing, and cropping only exist once the page renders. Look at the rendered page, at more than one width, before calling the work done.

## Record what you actually looked at

Note the browser, the widths, and which interactions you exercised. Where you could not render, state the unverified scope instead of implying a check. A claim of "responsive" from reading CSS is not a check.

## Pass / fail checks

Each of these has an observable answer. A check you cannot decide from a screenshot or a computed value does not belong here. The defects worth the most attention here are the ones that produce no error at all: an undefined custom property, a silent font fallback, a clearance measured twice, and a generated page edited by hand all look finished and behave wrong, so each needs a check that reads the rendered value rather than the source.

| Check | How to run it | Pass |
| --- | --- | --- |
| Derivation is recorded, not asserted | Read `DESIGN.md` for the measured properties and the accent's provenance line | Aspect ratio, sampled hue, structure levels, density, sequential-or-spatial, and surface are filled in from the actual files; every accent names the file and the spot it was sampled from |
| The archetype is exclusive | Hold the first screen against the seven signature objects in [visual direction](visual-direction.md) | The chosen one is present and none of the others appear; across two people's sites, the two accents are more than roughly fifteen degrees of hue apart |
| References reach the depth they claim | Take each entry's status word in `DESIGN.md` and check it against the observation beside it | Anything claimed as `interaction-tested` carries a number or a state change. An entry resting on a name, a gallery thumbnail, a 200 response, or an adjective is demoted to the depth actually reached |
| One focal weight per screen | Squint or blur the page until text is unreadable | One dominant region, or a claim with its evidence beside it reading as a single unit; two rival claims, or none, means the hierarchy is not carrying |
| Hierarchy survives without colour | Screenshot in grayscale | Reading order and grouping stay obvious; if only the accent distinguished them, contrast is doing the job colour should not |
| The declared font is the rendered font | Read computed `font-family` and `font-size` on a heading, a paragraph, and one CJK run | The intended face appears; a silent fallback is a defect, not a preference |
| Measure and line height hold | Count characters per line at 1440 and at 390 | Within the range in [visual direction](visual-direction.md) at both widths |
| The display heading is not oversized on a phone | Read computed `font-size` of the largest heading at 1440 and at 360, and count the lines it wraps to | The display-to-body ratio comes down as width drops and the heading fits in about two lines. Holding the desktop ratio with `clamp()` or `em` still lands too heavy |
| Punctuation is confined to prose | Read the last character of every heading, nav item, label, button, chip, stat value and one-line caption — **and the last character of each fragment inside them**, since a heading written as `line one.<br>line two` hides its period from an end-of-string probe, and the element doing the heading's job is often a styled `<p>`; then grep for decorative `·`/`～`/`！` outside prose | None of them ends in `。！？，、`, and no data cell carries a trailing period. Commas and colons doing syntactic work inside a heading stay — deleting them yields ungrammatical fragments, which is a worse defect than the one being fixed. Prose keeps its marks; one unit convention and one quote-mark style per language |
| Spacing rhythm is one system | Compare a few intra-group and inter-group gaps | Group gaps are clearly smaller than section gaps; near-equal gaps mean the reader ranks for you |
| Nothing clips or overflows | Full-page screenshot at 360, 390, 768, 1440, plus any width the reader reported | No horizontal scroll, no truncated label, no cropped artifact |
| Contrast is computed | Measure foreground against the background it actually sits on, including muted text on tinted panels and small letterspaced labels | 4.5:1 body, 3:1 large and graphical |
| States exist | Hover, press, focus with Tab, disable, load, empty | Each looks intentional and none shifts the layout |
| Surface, state completeness, and anatomy are judged by their own probes | Run the measurable check each file states instead of eyeballing: the computed `box-shadow` layer list and offset-to-blur ratios on the raised elements in [surface, light and depth](surfaces.md); the interactive-type × state matrix and the rest-versus-pressed `transform` delta in [interaction states](interaction-states.md); the sibling action-link `top` delta, the route's `h1` against its largest `h2`, and each table's width against its container with its affordance in [component anatomy](component-anatomy.md) | One recorded number per probe, not an adjective. The raised elements carry the layer structure and inner edge that the recorded light implies; every state cell a type can enter is filled and named consistently; no required part is missing and no scanned-across baseline drifts |
| Control geometry is decided | Read computed `border-radius` on the primary button, secondary button, input, chip and card, against each control's own height | One family of two or three values, justified from the material in `DESIGN.md`, with a nested radius derived from its container. A 2–4px token on a 44px target is a framework default still in place, and a pill beside square controls is two systems |
| A state rule keeps the component's shape | Tab each control type and read computed `border-radius` immediately before and while focused | Focus draws a ring and changes nothing else. A global `:focus-visible` rule that sets geometry out-specifies the component's own class, so the pill button you ringed goes square the moment the keyboard reaches it — invisible to every mouse user, and invisible in a screenshot too |
| A measured fact has one home | Find every number that appears more than once across the stylesheets — header height, sticky `top`, drawer `top`, scroll clearance — then jump to each in-page anchor and measure where the target lands below the sticky bar | One declaration with the rest derived from it by `calc()`, and the landed clearance the same at every breakpoint. Two clearance mechanisms stacked is one too many, and a copy that has quietly gone stale is exactly what a single declaration exists to prevent |
| Custom properties resolve where the page loads them | Collect each `var(--x)` reference and each `--x:` declaration across every stylesheet, diff the two sets, then read the computed value on an element that uses each name | No reference without a declaration in the set that page actually fetches. An undefined custom property is a guaranteed-invalid value: the declaration is dropped and the console says nothing, so a rename that missed twelve call sites still renders |
| Motion has a purpose and an exit | Scroll slowly, then with `prefers-reduced-motion` on | Each animation teaches something; the reduced path reaches the same content and the pause control genuinely tears effects down. A control disabled because the system already prefers reduced motion takes the choice away from the one reader who wants it back |
| Motion is a mechanism, not a recipe | For each effect, state in one line the input that starts it, the property that changes, what it returns to, and what a touch or keyboard reader gets | The description names no library or preset. Tilt moves the inner layer while the hit area holds; a counter ends on a real number; a shared element leaves no duplicated navigation behind. An effect that cannot be described except by its package name was pasted |
| Semantics are valid, not decorative | Count `h1` per page, find heading-level skips, confirm `footer` sits outside `main`, check every `dt`/`dd` pair has an enclosing `dl` | One `h1` each; no skipped levels; contentinfo exposed. A page whose identity element is a styled `<p>` with `aria-labelledby` pointing at it is a missing heading, not a design choice |
| Tables can be read by a machine | Inspect each `th` for `scope` and each table for `caption`; measure every table's width at 390 | Headers associated with cells; no `white-space:nowrap` on headers pushing a table to twice the viewport inside a scroller with no visible affordance. The column that gets cut off is usually the one carrying the argument |
| Small text is measured, not assumed | Read computed `font-size` and colour of the smallest rendered glyphs — multiplied by each one's screen CTM, since chart text inside a scaled SVG renders smaller than its attribute — against the background each actually sits on, plus the computed size of one body paragraph | Nothing below about 11px; body sits inside the range in [visual direction](visual-direction.md) — a 15px CJK paragraph is a violation even on an intentionally dense page; and the single muted token used for every label clears 4.5:1 on tinted panels. Where the token block states a contrast ratio, recompute it — an unverified claim in a comment is a defect with extra confidence |
| The focus path is complete | Tab from the first element; follow the skip link | Every interactive type gets an indicator, not only anchors; the skip target carries `tabindex="-1"`; the hidden-until-focused technique uses `clip-path`, not `left:-9999px` |
| The font stack can reach its families | Compare declared order against what exists on Windows, on Android, and in a `zh-CN` locale | A face listed after one that always exists is unreachable; a mono stack without a CJK family silently drops Chinese labels to the system default |
| Maintenance claims are true | Take any claim in the page or `DESIGN.md` about how the CSS works and grep the CSS | "Change one value and the scale follows" must match the number of hardcoded `font-size` declarations, exactly |
| A generated page is the builder's output | Re-run the generator and diff its output against the files being shipped | No differences. A hand-edit to a generated page is a change the next build silently deletes, and it is how a written fix to the copy shows up in one locale and not the other |
| Each route loads only what it can run | Read the network list on every route, in the locale the reader lands in | No route fetches a script it cannot execute. A dynamic `import()` does not split anything if some module already reachable on that route statically imports the same file; when the read-only part of a module is what a page needs, that part belongs in its own file |
| The budget is four measured numbers | Cold cache, throttled mid-range mobile: sum what the landing route transfers before first paint, read LCP and the largest layout shift from the Performance panel, and count every script the route actually received including what `import()` pulls after load — then read what `DESIGN.md` recorded | Recorded and measured are the same four values and sit inside the ceilings in [visual direction](visual-direction.md), or the overrun names the one file that pays for it and what the reader gets for it. Anything that moves after the page settles is a shift source: read an element's position at load and again two seconds later instead of trusting that a font swap "should be fine" |
| Adding a project touches one place | Trace, on paper, every file that must change for one new case to appear, in each locale | One content file and nothing else. A structure where a new case means editing four files is the structure where this person stops updating the site in a month, and no static check will ever report that |
| Native objects are undistorted | Compare each artifact against its source | Proportions and composition preserved; no zoom to fill |
| No stand-in imagery for absent work | Compare every image against the material it claims to show | Each one traces to something the person made or to a captioned source; no generated mood frame covering for a missing artifact, and no production label rendered on the page — no "AI concept cover" badge, no "示例数据" chip on a figure meant to be believed |
| Claims match evidence | Read each number next to its definition and source | Metric, period, and scope stated; nothing inflated |
| Empty slots absent | Look for planned, upcoming, or placeholder sections | Removed or filled with real material |
| Swap test on the direction | Substitute another field's content into the first screen | The page would look wrong for that field; if it would fit, the direction is still generic |
| Console and network | Open devtools on every route | No errors; no request a third-party host must answer |
| The deliverable is only the deliverable | List the shipped directory | No scratch pages, no experiment metadata, no file that names which arm of a comparison it came from. Internal notes belong outside what a reader can reach |

## Compare, don't guess

Change one thing at a time, re-render at the same widths, and compare against the previous screenshot. Blind multi-point edits make it impossible to tell which change helped, and the common result is a page that drifts back toward defaults while feeling busier.

Keep the input fixed while judging. Rebuilding the same résumé twice is the only honest way to see whether a decision improved the page or the content simply carried it. When comparing two candidates, look at them side by side at the same width and the same scroll position; sequential viewing overestimates the second one.

Two cheap diagnostics worth running:

- **First-screen test.** Open at 1440 and at 390, scroll nothing, and write down what a stranger would say this person does. If the answer is a category ("product", "engineer") rather than a specific claim, the first screen is not carrying its weight.
- **Four-minute test.** Read the whole page and mark where attention dropped. Long runs of same-weight blocks, or a scroll that goes on past the point where the material ends, are the usual causes.

## Fix order

Resolve in this order, because each later item is cheaper to redo than the earlier one:

1. Wrong or absent direction (the swap test fails).
2. Hierarchy and focal weight.
3. Type: scale, measure, line height, real rendered face, and the written surface — punctuation in the roles that should not carry it, units, number format.
4. Space: rhythm, grouping, section separation.
5. Colour and contrast.
6. Control geometry: the radius family and its justification, nested radii, then states.
7. Media treatment and cropping.
8. Motion and micro-feedback.

Polishing step 8 on a page that fails step 1 produces a well-animated generic site, which is the most common failure mode of generated portfolios.
