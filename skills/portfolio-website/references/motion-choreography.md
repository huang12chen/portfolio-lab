# Motion choreography

[depth and spectacle](scroll-depth.md) covers the one showpiece a portfolio may earn. This file covers the motion every portfolio actually ships whether or not it has a showpiece: the hover that lifts, the disclosure that opens, the filter that removes three cards and adds five, the card that becomes a page. Almost all of it is currently written as `transition: all .3s ease` in twelve places, which is why generated pages feel weightless rather than designed. Motion is grammar, not a count: it has duration, easing, order, and a direction, and each of those can mean something or nothing. Nothing below is a value.

The governing idea is that **movement is information**. A thing that moves tells the reader where it came from and where it is going; a thing that changes in place tells them it changed; a thing that appears with no transition tells them the page grew a new organ. So the question for every animation is not "is this tasteful" but "what does the reader learn from this, and do they lose it if I delete the animation". That question is also what makes the reduced-motion branch an argument rather than a subtraction — see below.

## What the object's own movement says

| Condition in the material | How the object actually behaves | What the page's motion inherits |
| --- | --- | --- |
| Loose paper, cards, notes on a desk | Light, high friction, stops dead, never overshoots | Short durations, strong deceleration, no spring; a lifted sheet returns with a settle, not a bounce |
| Clay, glaze, viscous material | Flows, resists, settles slowly | Long durations on the way in, longer on the way out, easing that never snaps |
| An instrument responding to input — a gauge, a console, a keyboard | Near-instant, and the value changes continuously | Motion belongs to the needle and the readout, not to the panel; UI state changes get no animation, data changes do |
| Bound structure — a book, a folder, a bound ledger | Rotation about a fixed edge, one plane passing over another | Hinge-like transforms with a real `transform-origin`, and the fold is where the light changes |
| Networked or computed work — a queue, a build, an inference | Duration is unknown and is the content | The progress representation must not imply a speed it does not have; a fake percentage is a lie about the person's own timing |

Record the row in `DESIGN.md` with the same one-line honesty as the light source. A page whose material is a bound ledger and whose motion is springy card physics has imported a product UI's body language.

**Check.** Read every `transition` and `animation` declaration on interactive and reveal states. For each, name in `DESIGN.md` which property of the material that motion is claiming. Declarations with no claim, and claims the material's row above contradicts, are the finding.

## Duration comes from distance, not from a token

A 40px chip and a 60vw panel sharing one duration is two defects at once: the chip feels drugged and the panel feels like a glitch. Perceived duration scales with how far the thing travels and how big it is, and the reader judges the ratio, not the number. So derive each duration from the displacement it carries, and keep one shared constant only as the *reference* displacement — the one distance the page uses most, against which everything else is longer or shorter.

Then use the ratio to say what matters: the transition the reader should feel as the page's central act gets the longest duration on the page, and the thing they should not notice gets the shortest. If the largest movement on the page animates for the same time as a hover, the page has decided nothing is important.

**Check.** Collect the distinct durations actually applied, and the displacement each one carries (`getBoundingClientRect` delta between the two states). Pass needs duration to increase with displacement across the set — not linearly, but monotonically enough that no 4px nudge outlasts a full-height reveal. Then report how many distinct durations the page uses: one means no grammar, more than about six means the scale is decorative.

## Easing is a statement about physics

`ease` is not a neutral choice; it is a mild accelerate-then-brake curve that suits nothing in particular and is therefore read as "default". The four that carry meaning:

- **Decelerate into place** (ease-out family) for anything arriving, because it enters at speed where the reader's attention is and settles under control where they will read it.
- **Accelerate away** (ease-in family) for anything leaving, because the first frames of a departure are the ones nobody needs and the last frames are the ones that tell them where it went.
- **Symmetric** for something changing in place, because it is not travelling anywhere and an asymmetric curve invents motion.
- **Linear** only for something genuinely continuous — a scrub along time, a rotating element, a marquee — and it is wrong for anything that starts and stops, because a linear stop is an impact.

Overshoot and springs are a claim about elasticity. Paper does not overshoot; a bound cover does not spring. Allow it only where the material has a thing that actually rebounds, and then make it small enough to read as the object's own mass rather than as a library default.

**Check.** For each animated state pair, read the timing function and classify the motion as arriving, leaving, changing-in-place, or continuous. Pass needs arriving motions to decelerate and leaving motions to accelerate; a page where every declaration resolves to the same curve — including `ease` and `linear` — fails, because then easing carries no information and could be deleted with no loss, which is the test for whether it was ever designed.

## Enter fast, leave slow, and never both at once

Symmetric enter/exit is the most reliable tell of undeclared motion. Asymmetry is cheap and it reads as intent, because real things are noticed arriving and remembered leaving. Choose per element by what the reader needs from it: things they **summon** (a menu, a search field, a filter applied) should arrive faster than they go, because they already know what they asked for and are waiting to read; things that **interrupt** (a toast, an error, a confirmation) should arrive slower than they go, because the arrival is the message and the dismissal is not.

The case people forget is removal from a grid. When a filter takes three cards out and re-places five, an un-staggered, un-animated reflow is unreadable — the reader cannot tell which ones stayed. That is the one place a shared-element or first/last-position transform earns its cost: the thing that survives the change must be visibly the same thing.

**Check.** For every element with both an open and a closed animation, compare the two durations and report which is longer. Identical pairs on elements taller than a control are the finding. Then trigger a filter or tab swap that re-places content, and confirm at least one surviving element is animated between its old and new position rather than teleporting; if nothing survives visibly, the page cannot be scanned after a single interaction.

## Stagger only where sequence is the argument

A uniform per-item cascade down every list is the signature of generated motion, and it is actively wrong twice. First, it makes the page feel like a screensaver whenever the reader scrolls fast, and it delays the last item's legibility by the whole cascade — the fifth card arrives after half a second so that the fourth can look choreographed. Second, and worse, **it imposes order on content whose order is already the argument**. A ranked list, a timeline in date order, a leaderboard, a change log: the sequence is the data, and animating the sequence as a visual cascade says "these arrive one at a time", which is not true and not what the reader needs.

Stagger is honest when the container's own layout is the thing being introduced — a gallery wall where the reader should see the *set*, a grid of unrelated specimens, a nav menu unfurling from its trigger. Then the axis matters: a grid read row-major should cascade row-major; cascading down columns of a row-major grid invents an order the page doesn't have.

**Check.** Find every `transition-delay` / `animation-delay` derived from index. For each, report the container's layout direction, the number of children, and the delay applied to the last child. Fail if the container is a ranked or chronological list (the label, the caption, or `DESIGN.md` says which), fail if the last child waits long enough to be noticed as waiting, and fail if the cascade axis disagrees with the reading axis. A page with zero staggers is not a fail — that is often the derived answer.

## Compositor, paint, layout — and why hover is where this bites

Three tiers of cost, and the difference is not academic on a 390px phone with a mid-tier GPU:

- `transform` and `opacity` are composited: the browser moves a layer it already drew.
- `background-color`, `color`, `box-shadow`, `filter` force repaint; `backdrop-filter` and large-area `filter` force repaint of everything behind.
- `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`, `line-height` force layout, and layout is recursive down the tree — animating a disclosure's `height` repositions every element under it every frame.

So: animate transforms and opacity; accept paint-tier properties for small, local state changes; and never put a layout property in a hover transition, because a hover is repeated at speed, and the second one arrives while the first is still laying out. `height: auto` cannot be interpolated, which is why the classic accordion animates to a magic number and snaps at the end — use the grid-row or `scale` techniques and say which.

`transition: all` is the bug that hides all of this, because it silently picks up `font-size` across a breakpoint, `width` when the label changes, and `transform` when something else set it. Declare the properties.

**Check.** Parse every `transition` and `animation` property list. Fail on `all` anywhere in the shipped CSS. Fail on any layout-tier property in a `:hover`, `:focus`, or `:active` rule. Then measure: scroll to the bottom, up, and open the largest disclosure while collecting frame intervals — a page that drops frames on a desktop viewport will drop them on the phone the reviewer actually uses.

## Reduced motion is the same argument, made differently

`prefers-reduced-motion: reduce` is not "the flat version of the page". The preference exists mostly for people for whom *movement itself* is aversive or disorienting — and deleting an animation deletes the information it was carrying, which is the same content loss in a different dress. So for each motion, decide what it was telling, and keep that:

| What the motion was carrying | What the reduced branch must still do |
| --- | --- |
| Where a thing came from (menu, panel, route) | Put it there instantly. Order of appearance is not required; correct final position is |
| That something changed (state, value, selection) | Change it in place with no interpolation, and make the new state legible by itself — the reader must not need to have seen the transition to know it happened |
| Which item they acted on | Keep the highlight; drop the travel |
| Sequence as content (a scrub, a timeline reveal) | Show the whole sequence at once, statically, and keep it legible — this is the hard case, and collapsing it to the first frame is a content loss, not an accessibility win |
| Pure decoration | Delete it. This is the only row where deletion is the correct answer |

The trap that breaks real builds: content that starts at `opacity: 0` and is revealed by an animation or a scroll observer. Under reduced motion the animation is off, so the reveal never happens, so the paragraph does not exist. That is not a visual bug, it is missing content, and it is invisible in a screenshot of the default branch.

**Check.** Load the page with emulation forced to `reduce` and: enumerate every element whose computed `opacity` is 0 or whose box sits outside the viewport while `transform` holds it there, then confirm no text, image, or control is unreachable in that state. Confirm the reduced block exists at all, that it covers the scroll-linked and the interaction-driven motion (not only the CSS keyframes), that nothing relies on `!important` to lose, and that the toggle for readers who want motion *on* still works and persists. Then compare a settled screenshot of each route in both modes: any route whose content differs between them is a fail, because accessibility is supposed to change how the page moves, not what it says.

## Order

Fix states before motion — see [interaction states](interaction-states.md): a hover that changes elevation needs the shadow structure to change into, and a press needs a channel to be measured against. Fix spatial tiers and overlap before motion — see [spatial construction](spatial-construction.md) — because an animated overlay moves through tiers the page may not have declared, and a transform can undo a static collision for part of every cycle. Then choose the showpiece last, from [depth and spectacle](scroll-depth.md), so the spectacle inherits the duration, easing, and reduced-motion rules everything else obeys instead of becoming a second physics system with its own vocabulary.
