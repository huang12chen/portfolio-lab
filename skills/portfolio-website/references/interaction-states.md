# Interaction states

A component is finished when every state it can be in has been designed. Generated output ships rest and hover, and calls that a button — the missing states are where a portfolio reads as half-built, and they are also where a real reader gets stuck. The complaint "it lacks premium micro-interaction and press feedback" is almost never about animation quality; it is about states that do not exist and about a press that produces no measurable displacement.

Every mechanism below pairs with something a script or a reviewer can compute on the built page. A state you cannot observe is a state you did not build.

## The completeness table

Each interactive object in the page — link, button, card that navigates, filter, toggle, input, disclosure — owes eight states.

| State | The question it answers | What generated output usually does |
| --- | --- | --- |
| Rest | What is this, and is it actionable? | Fine, often the only state built |
| Hover | Am I on it, and what will happen? | A colour change of unknown provenance, or nothing |
| Focus-visible | Same as hover, for a keyboard reader, without the pointer | Scoped to `button`, so anchors, cards, and chips never get it |
| Active / pressed | Did the input land? | Absent, or a 300ms transition the reader stopped believing |
| Loading | Is work happening, and where is the result? | A spinner over content that never had an async path, or no indication at all |
| Disabled | Can't act, and why? | `opacity` only, which fails contrast, and removes the element from the hit test |
| Empty | Nothing matches — now what? | The section is deleted, so the reader cannot tell a filter error from a broken page |
| Error | What went wrong and how to recover? | Never built, because nothing on the page can fail |

Loading, empty, disabled, and error are skipped for one reason: nothing in the built page exercises them. The fix is to create the condition deliberately — filter to a value with no matches, load with the network stalled, request a document that was never attached — and then look at the screen. A state with no reachable route is not a design decision, it is a gap.

The eight states belong to the objects in the list above, not to every node that can technically match a pseudo-class. Demanding a hover and a press from a scroll container rewards exactly the wrong thing — a colour change pasted onto a landmark — while the affordance that container actually owes is a cue that it scrolls. So read the ownership column before the matrix:

| Object | States it owes | States it does not | Why |
| --- | --- | --- | --- |
| Link — including a nav, header, or footer link, and a link that is the whole of a list item — button, card that navigates, filter, toggle, disclosure, tab | all eight that its route can reach | — | It is the thing the reader aims at, so every one of their inputs is a claim about it |
| A link inside running prose: text around it in the same `p`, `dd`, `blockquote`, `li`, or `td` | hover, focus-visible, active as a change to the text itself — tone, underline, weight | press displacement | A word inside a sentence is read, not aimed at; displacing it reflows the line and sets the paragraph swimming |
| Text input and textarea | rest, focus-visible, disabled, error, loading (if it can validate asynchronously) | hover, active | The caret and the selection are the press response; a hover step on a field that already looks like a field is decoration |
| Native `select`, and any control whose chrome the platform paints | focus-visible, disabled, expanded (if it exposes one) | hover, active | The platform draws these inside a closed shadow tree, so an author stylesheet that has no rule for them is not evidence that nothing changes on screen |
| Scroll region (`[role=region]`, `overflow` container, carousel viewport) | rest, focus-visible when keyboard-reachable, empty when it can hold nothing, and a static cue that there is more to read | hover, active, disabled | It is a window onto content, not a target; see the table-fit rule in [component anatomy](component-anatomy.md) |
| Decorative element with no handler | — | everything | It has no states; if it needs one, it is a control and belongs in the first row |

A region the document has already declared as navigation — `nav`, `[role=navigation]`, `[role=menu]`, `[role=menubar]`, `[role=tablist]` — settles the question before the tag does. A link inside one is aimed at even when it sits in an `li` beside other links, so the prose exemption does not reach it; and the same holds for the wordmark and the contact link, which are targets standing alone in the header. The exemption follows the sentence, not the element.

**Check.** Enumerate interactive elements in the rendered DOM by role (link, button, switch, textbox, combobox, and any element with a click handler or `role`), then for each state in that type's *owed* column, test whether a rule exists that changes a visible property for that element type in that state — read the resolved style under the state condition (`:hover` by real pointer move, `:focus-visible` by keyboard, `[aria-disabled]`, `[aria-busy]`, `[aria-expanded]`, and the empty/error variants by their rendered route). Report a matrix of element type × state, and fail any cell that is empty for a type that owes it. A cell the instrument cannot reach is reported as not measurable, never as a pass. A page whose only state rules target `button` fails for every link and card.

**Check.** For every element that can reach loading, disabled, or empty, capture its box before and after the state change. Pass requires the box to be identical: a state that reflows the layout is a state the reader cannot predict, and the shift is what makes a filter feel broken.

## What makes a state read as unfinished

Five observations that a reviewer makes instantly, all of them measurable:

- **Only colour changes.** A state with no second channel — no edge, no elevation, no weight, no displacement — is invisible in grayscale and invisible to a colourblind reader. The same failure as the colour-only hierarchy check in [visual review](visual-review.md).
- **The state is smaller than the gap between it and rest.** A hover that lightens a border by a few percent reads as a rendering glitch. The step has to clear the level at which the reader notices a change on that surface at all.
- **No return path.** Hover that persists after leave, focus ring that outlives blur, a pressed scale that never resets on `pointercancel` or blur. Test by leaving the element with the pointer outside the window, not on another element.
- **A transition duration that does not match how long the state lasts.** Press feedback at the length of an entrance animation is lag; an entrance at the length of a press is a page that never settles.
- **The hit area moves.** Any state that changes the size or position of the target under the pointer — padding, border-width growth, a scale on the outer box — makes the element dodge the cursor. See [visual direction](visual-direction.md) on tilt, where only the inner layer may move.

**Check.** For each interactive type, read the computed box and the hit-area rect in rest and in every state it can enter. Pass: the hit-area rect is byte-identical across states; at least one non-colour property changes in hover and in focus-visible; and the transition duration of the state's own property is inside the press/reveal bands in [visual direction](visual-direction.md)'s motion table.

## Deriving press feedback from the material

Displacement is not a constant to pick; it is a claim about what the object is made of. Ask what happens to the material under a thumb, at the scale of a control, and let that answer three things: does it move at all, does it change shape or only tone, and how it comes back.

- **Paper and printed matter** — a sheet does not compress. It answers by tone and edge: the surface darkens slightly, the hairline reads harder, and any movement is a corner lifting, not the whole box shifting. The return is immediate and exact, because a sheet does not remember the press.
- **Glass and glazed ceramic** — rigid, so no travel. The response is a small uniform scale plus a brightened edge where the light hits; the return is fast and carries no overshoot, because nothing flexed.
- **Metal and hard enamel** — a control with a detent. It travels a small amount in the light direction, the contact shadow tightens as it seats, and it returns without bounce. The visible cue is the shadow closing up, not the shape shrinking.
- **Clay, rubber, and anything soft** — it deforms under the point of contact rather than uniformly: the displacement is local and asymmetric, the edges bulge, and the return has one small settle. Use this only where the material really is soft; a software portfolio that springs like rubber is a borrowed personality.
- **Screens and diagrams** — there is no surface to press. Feedback is state change plus a cursor or selection cue, and any simulated squeeze is dishonest about what the object is.

Derive the amount by ratio to the control's own height, and derive the timing from how fast the material's response would be visible — a stiff thing answers within a frame or two, a soft thing over several. Then hold one metaphor across every control on the page: a paper button beside a rubber card is two materials on one desk.

**Check.** In a headless browser, capture the computed `transform` of a representative control at rest, dispatch a real pointer-down, capture it again while held — after the element's own declared transition has stopped moving, never at the transition's first frame — then release and capture after it settles. Report the matrix delta (translation in px, scale factor), the other owned channels that changed, and the time to return. Pass requires: a non-zero delta on at least one channel the control owns, for every press-capable type — compositor-only where the material's answer is displacement, and on tone or edge where the material says the object does not travel, because a paper button that darkens has answered and demanding a transform from it contradicts the material above; the return to the rest matrix or rest tone within the press band in [visual direction](visual-direction.md); any displacement under a small fraction of the control's own height, so the label stays legible and the text does not swim; and identical hit-area rects before and after. Then compare the delta across control types — a page where paper and glass displace identically used one recipe instead of one derivation.

## Pointer-follow, snap, and scrollbar reveal

Three small mechanisms that carry most of what people mean by "premium", each with a job, each with a floor.

- **Pointer-follow** (a highlight, rim, or light spot tracking the cursor across a surface) answers "which part of this large object am I on". It has to be bounded inside the object, must not move the object or its hit area, must have a rest state that is not a hard reset, and must degrade to nothing on touch rather than to a stuck light. If the object is small, the follow is decoration.
- **Snap** (a moving element settling to a discrete position — a tab indicator, a segmented pill, a magnetic target) says the control has real states instead of a continuum. It has to follow the *selected* item, not the last hovered one, and it must land correct with motion disabled.
- **Scrollbar reveal** (a track or edge that appears only while there is more to read) is the honest affordance for any scroll region, and the only acceptable answer when a component cannot show all of its content. It needs a static cue as well — a fade, a cut edge, a visible fragment of the next item — because a scrollbar that appears only on drag is invisible to a keyboard reader, and a scroll region with no cue at all is the defect recorded in [component anatomy](component-anatomy.md).

**Check.** For pointer-follow, sample the highlight's position against the pointer at four points in the object: it must move, must stay inside the object's box, and the object's own rect must not change. For snap, drive the selection by keyboard and by click and assert the indicator's rect equals the selected item's rect in both, and with motion off. For every element whose `scrollWidth` exceeds its client width at 390, assert at least one reveal affordance exists; a scroll region that passes the check only because a native scrollbar happens to be visible on this platform is a fail on touch.

## The accessible name and the exposed state must agree

A shipped defect worth keeping as a rule: a motion toggle announced "Play page motion" with `aria-pressed="true"` while the page was paused. The name said the action, the state said the opposite, and a screen-reader reader could not tell what pressing it would do. Every check in this file would have passed it, because the visual state existed.

Split the two jobs and never mix them: the accessible **name** describes the object ("Page motion"); the state **attribute** describes what is true of it (`aria-pressed`, `aria-expanded`, `aria-checked`, `aria-selected`, `aria-busy`, `aria-disabled`). If you instead put the action in the name ("Play page motion"), the name must change with the state, and the check is the same either way. An inverted state is worse than a missing one: a missing state leaves the reader guessing, an inverted one leaves them confident and wrong.

**Check.** For every toggle, disclosure, tab, and selectable control: read the accessible name and all state attributes, activate it once with a real click and once with the keyboard, and re-read both. Pass requires that state attributes flip, that the name stays stable when it describes the object (and flips to the opposite verb when it describes the action), that the name never contradicts the visible label, and that the visual state and the exposed state describe the same condition — assert one observable visual property per state attribute, so a `aria-pressed="true"` that renders the same pixels as `false` fails even when the attribute is technically correct.

## Order

Build rest, hover, focus-visible, and active for every object in the first row of the ownership table first, since those are on the page right now. Then create the conditions for loading, empty, disabled, and error, and design the four screens. Then derive press feedback from the material. Fix surfaces before states — see [surfaces](surfaces.md) — because a state that changes elevation without a shadow structure to change into is a colour swap wearing a name.
