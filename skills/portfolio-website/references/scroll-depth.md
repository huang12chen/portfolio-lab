# Depth and spectacle

Movement, layering, and three dimensions are the fastest way to make a page look expensive, and the fastest way to make a portfolio say nothing. A reader who finishes a scroll sequence and learned nothing about the person has been charged attention for decoration, and experienced reviewers now read that as generated.

Depth is worth building when the material has something a still layout cannot show: sequence, scale, thickness, or state over time. An incident that unfolded across four hours can be scrubbed. A vessel has a wall thickness. A migration has an ordering. A photograph has a depth of field. A résumé with six bullet points does not.

## Gate it on the material, not on the ambition

Answer three questions in `DESIGN.md` before adding any layered motion:

1. What does depth reveal here that a static composition would hide? Name the property: order, duration, thickness, distance, state.
2. Which object in the person's work has that property? Point at it.
3. What is the page's fallback for a reader on a low-power device, on a slow connection, and with reduced motion requested? It must still be a complete, legible page.

If the honest answer to the first two is "it would look better," build the still page and put the effort into typography and evidence.

## What each technique returns

Ordered by what they give a person deciding whether to hire someone.

| Technique | What it teaches | What it costs |
| --- | --- | --- |
| Pinned context column | The reader keeps the claim, the metric, or the diagram visible while the argument scrolls past. Best depth pattern a portfolio has | Modest; needs care so the pinned block never covers the thing it explains |
| Scroll-scrubbed real data | Duration, sequence, and cause in one gesture: an outage timeline, a build's latency curve, a glaze cooled across a kiln's ramp | Real data must exist. Fabricating a scrub target is worse than no scrub |
| Route transition that preserves reading position | The site is one continuous document, not a set of disconnected pages | Cheap, and the only motion users reliably notice as quality |
| Parallax across layers of a real artifact | Depth in the object itself: a printed spread, a framed painting, a stratified core sample, a stack of layered services | Only valid when the layers are the artifact's own. Foreground/background speed split for its own sake is wallpaper |
| Three dimensions of the actual thing | Volume, joinery, proportion: a vessel, a part, a building massing, a product from every angle the buyer would ask for | Expensive to build, expensive to load, and it must beat a good photograph. If it does not, use the photograph |
| Canvas or WebGL field, generative texture | Rhythm and material when the work *is* generative, spatial, or data-driven | The technique most likely to be mistaken for a template. Justify it from the work |

## At component scale

Spectacle is not only scroll narrative. A handful of component-scale effects carry most of what people mean when they say a page feels expensive, and each is a mechanism with one job rather than a preset to drop in.

| Effect | What it is actually for | What has to be true |
| --- | --- | --- |
| Tilt with a light source | A card that reads as an object with a face and a thickness, worth inspecting | The outer hit area stays fixed and only the inner layer moves; image edges stay whole; it settles back on leave; touch gets the same information without hover |
| Fluid pill or morph | One branded primary action, or a real state change | Text and hit area hold steady through the shape change; the shape never chases the pointer out from under a finger |
| Shared-element expansion | Continuity from an index into a detail, so the reader keeps where they were | One shared element per transition; no duplicated navigation or ghost title; native Back returns; the plain link still works when the effect fails |
| Magnetic pull, rolling counter | Light physical feedback; a number that is genuinely counting to a real value | Content moves within a bounded offset instead of the target moving; the final figure is the actual number, never an inflated one, and it lands correct with motion off |
| Damped drawer or sheet | Contact, filters, a temporary task | Close, Escape, focus return and scroll restoration all work; nothing re-asks for information the page already has |
| Glow or animated border | Local focus and orientation, in one or two places | Contrast holds while it moves; it retracts; a static mode exists for low-power devices |
| Spring stagger | A set that genuinely reorders — filters, categories | Selection state and results are already correct before anything animates; rapid input settles on the latest choice, not the last animation |
| Press micro-scale | Confirming a tap landed | 120–200ms, hit area unmoved, resets on cancel and blur. It is not haptics and should not be described as if it were |
| Custom cursor | A desktop presentation piece where the pointer itself carries identity | Ordinary pointing still works; legible over light, dark, link and pressed states; it does not live inside a transformed ancestor |

Two or three of these, chosen because the material asks a question they answer, is a page with judgement. All nine is a component gallery, and readers who have seen one will read it as one. Run each through the same three questions as the scroll techniques — what does it reveal, which object in the work has that property, what is the fallback — and the ones whose honest answer is "it would feel nicer" go away.

An effect gallery's published prompt or preset is a recipe for somebody else's material; see [reference research](reference-research.md) for why pasting one costs you the site's identity. Take the mechanism, write the specification yourself.

## What reads as generated

Wheel hijacking, scroll-triggered fade-up on every block, a WebGL particle field unrelated to the work, counting-up numbers, auto-advancing carousels, cursor-following glow, and any sequence only reachable by scrolling at the author's exact speed. Each one interrupts reading to announce that effort was spent.

## Build it so it can be taken away

- Animate `transform` and `opacity`. Nothing else triggers layout on the scroll path.
- Drive scroll work from one `IntersectionObserver` and one `requestAnimationFrame` loop. Pause anything off-screen. Cap device pixel ratio at 2.
- Set explicit dimensions on every media element and use `content-visibility` on below-fold sections; a page that reflows while its hero animates fails the one thing spectacle is supposed to prove.
- Tier down on more than one signal: `prefers-reduced-motion`, low reported memory, effective connection type, and a first-frame measurement on a real mid-range phone. Choose the tier before painting, not after.
- Keep the whole thing inside the budget in [visual direction](visual-direction.md). Spectacle that blows the critical path is a bad trade on a screen where someone is deciding about you.

The reduced path is a teardown, not a hiding. Content must reach its final state with motion off; the static arrangement has to pass every check in [visual review](visual-review.md) on its own; and with JavaScript switched off the page should still carry its argument in prose. A control that disables itself when the system already prefers reduced motion removes the choice from the one person most likely to want it back.

Never gate evidence behind an effect. Nothing a reader must verify may exist only at a precise animation frame, only under hover, or only after a hijacked wheel gesture.

## Choose one showpiece

One thing on the page should be genuinely extraordinary: the pinned case narrative, a scrubbed timeline, one object rendered in three dimensions. A site where every section is at seventy percent ambition reads as a template with a budget left over, and reviewers can name that quality instantly.

## Make sure the timeline is watching the page

A scroll-driven animation can be correctly written, present in the DOM, and still frozen. `overflow: hidden` turns an element into a scroll container, and a `view()` timeline resolves against the nearest scrollable ancestor — so a parallax layer inside a card that clips its own corners measures its progress against that card, never leaves its starting offset, and reads as a permanent misalignment between two layers that should have moved together. Use `overflow: clip` for the same visual crop without creating the scrollport, or attach a named `view-timeline` to an ancestor that is definitely the page.

The failure is invisible in a screenshot and invisible in the console — an unresolved timeline reports no error at all. Measure it: read `getComputedStyle(el).transform` at four scroll offsets and require at least three distinct values. The same probe catches the other silent failure, a `steps()` scrub whose track is narrower than the stage it slides inside, which shows three frames at once and cuts the previous one in half at the clip edge; make the track exactly one width per frame of the step function.

Getting the mechanism right is not the same as getting the frame right, and a correctly scrubbing showpiece can still read as unfinished. Four geometry checks, each measured in the browser rather than judged from the code:

- The pinned box is its content's height. A hard `height` larger than the card inside it pins the card to the top of the viewport and leaves a dead band below for the whole scrub — 258px of card inside a 440px stage is a third of the pinned area empty at every step, and no amount of correct animation recovers that. Let the card set the height; the scroll distance comes from the wrapper.
- A grid item with `max-width` and `margin-inline: auto` stops stretching and shrink-wraps to its content, so the frame collapses to the width of its text while the stage stays full-bleed. Give the frame `width: 100%` and place its children explicitly.
- A transform can undo a collision the static layout was fixed for, so an animated overlay has to be tested where it *goes*, not where it is laid out. On a finished page the annotation plate was given `padding-bottom` inside its card so it no longer covered the provenance line, and the parallax keyframe then carried it 54px back over it for part of every scroll cycle. Nothing in a static screenshot or a layout-only check sees that. Three rules follow:
  - Give a floating plate a **one-directional** excursion, or clamp it to the clearance you actually measured. A symmetric `±54px` animation reaches 54px *above* the laid-out position, and the layout was only ever proven from that position downward.
  - Check occlusion in **paint order**, not by rect intersection. Sweep the whole scroll range at several widths and, for each text run, ask `document.elementsFromPoint` who is on top at a point inside the run's own line rect; a plate whose rect overlaps the header is not covering anything, because an opaque sticky header with a higher z-index paints over it. Two shortcuts that waste a verification run: sampling *elements* rather than text leaves every ancestor of the overlay in the results — the card's own link contains the plate, so its `textContent` includes the plate's text and the check reports your own annotation as occluded — and comparing rects without asking who paints first turns an ordinary sticky-header overpass into a supposed defect.
  - Separate the overpass from the parking lot. Copy that slides *under* a sticky bar while the reader is moving is how that bar works; a sweep that reports it produces one finding per line on every site in the market. What has to be measured is where the page comes to rest: land on each in-page anchor the way the browser lands on a bare fragment and ask whether the heading the reader aimed at is under the bar. Set the clearance on the scroll container — `html { scroll-padding-top: calc(var(--header-h) + 14px) }` — and the page passes every anchor at once; with neither that nor `scroll-margin-top` on the targets, the section title loses the top of itself to the header on every link that points at it, and the reader experiences that as a link that went nowhere. Do not resize the bar. One trap in writing the check: `scrollIntoView({ block: 'start' })` honours `scroll-margin` but ignores the `scroll-padding` a root scroller applies to fragment navigation, so a probe built on it reports a defect on the page that set the correct property and passes the page that set neither. Compute the landing yourself — target offset minus `max(scroll-padding-top of the scroller, scroll-margin-top of the target)`.
  - Recompute the geometry at every offset. Rects captured before the scroll describe a different page: a probe aimed at where a sentence used to be lands on whatever has since moved into that pixel, and the topmost element sitting there gets accused of covering it. Measured on a finished page: 78 of 812 runs reported as covered, every one of them the sticky header, because the coordinates were stale.
- A chart drawn in a small `viewBox` and scaled up carries two quiet lies. Stroke width scales with it, so a 2.4-unit line arrives as a 12px bar; set `vector-effect: non-scaling-stroke`. And a series normalised to its own visible slice squashes into a flat band at the top of the box — scale against the whole dataset and draw the whole series behind the highlighted segment, which fills the frame and tells the reader which part of the month they are looking at.

## Score it without being fooled

Judges are drawn to motion; the page must survive its absence.

1. Five stills at fixed scroll offsets, and one pass with JavaScript off. Transcribe what a reader learns from each. Learning a category rather than a claim means the sequence is decoration.
2. Blur or grayscale the stills. Hierarchy must survive without the animation.
3. Screenshot at 360px *while the motion runs*. Hand-built depth objects are the most likely thing on the page to break a phone.
4. Measure on a device, not an emulator, and record the frame timing and the transferred bytes.
5. Run the swap test on the motion: if the same technique, timing, and easing would belong on someone else's site in a different field, it was chosen for the effect rather than the material.
