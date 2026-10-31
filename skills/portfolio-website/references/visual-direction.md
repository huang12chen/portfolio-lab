# Visual direction

Design decisions change what a reader learns about the person. Restraint alone is not a direction: a page can be clean, coherent, and say nothing. Choose a direction that could only belong to this material, then hold it across every screen.

## Derive form from the material

Distinctiveness comes from derivation, not decoration. The visual vocabulary already exists inside what the person works with; importing an unrelated style costs the one thing a portfolio can buy cheaply.

Work through these four inputs before choosing anything visible:

| Input | What it decides | Read it from |
| --- | --- | --- |
| The reader's task | First-screen weight, density, how much evidence sits above the fold | 8-second triage needs one claim and one proof; a 4-minute reviewer needs navigation and depth; a verifier needs inspectable data and sources |
| Native objects in the material | The page's visual vocabulary | Code, charts, dashboards, schematics, manuscripts, physical products, field notes, datasets, drawings, printed matter |
| Evidence shape of the field | Layout archetype | Editorial argument, instrument console, gallery wall, laboratory notebook, document, field log, catalogue |
| Maintenance constraint | What you may promise | Ongoing effort for imagery, motion, and updates the person will actually keep doing |

Name the native objects first. A growth analyst's dashboards, a civil engineer's section drawings, and a composer's score pages are each already a design system; render them at real proportions and let palette, grid, and type follow. A ceramicist's glaze tests and a backend engineer's incident timelines should not share a layout.

Naming them is not sufficient, and the reason is worth stating plainly: **a range only constrains; it does not generate.** Ask for an accent "taken from the material" and a body size "17–20px", and anything that cannot observe the material returns its own prior at the midpoint of every range at once. That is how two builds for two different people end up sharing a skeleton while both followed the guidance. Distinctness needs an input that actually varies, so measure these properties against the real files before choosing anything visible:

| Measure | Against what | It decides |
| --- | --- | --- |
| Aspect ratio of each artifact | the actual file, not memory | the grid's proportions |
| Dominant hues, sampled | a screenshot, printed sheet, or material surface | the accent, and its provenance |
| Number of structure levels | how many nested parts the object has | how many heading tiers the page earns |
| Density | marks per unit area | whitespace and measure |
| Sequential or spatial | whether the work is read in order or compared side by side | scroll direction and navigation model |
| Surface | texture present or absent | whether the page gets any imagery at all |

Record the readings, including the ones that refused to resolve. An accent colour has to name the file and the spot it was sampled from; without that line it is a colour you chose, and next time it will be the same colour.

Then commit to one archetype and make it binding. The chosen row must put its signature object on the first screen: an instrument console shows a readout with units, a catalogue shows a numbered specimen, a laboratory notebook shows a dated entry, a field log shows conditions against a place and time, a gallery wall shows the work and almost nothing else, an editorial argument states its claim a full paragraph before any evidence, a document opens on its header block. Once one is chosen, the other archetypes' signature objects are off-limits. This is the cheapest thing that makes a skeleton non-transferable — a list you may pick from without consequence is decoration.

When material genuinely contains no visual objects, say so in `DESIGN.md` and choose the archetype that best fits how the reader works. Do not substitute an abstract style for absent content.

## Write a falsifiable direction statement

Record three sentences before building:

1. What the reader learns in the first screen, and which element carries it.
2. What carries the personality of the page, named as a specific mechanism rather than an adjective.
3. What is deliberately absent, and what it would cost to add.

Then run the swap test: replace the person's name, field, and material with someone else's. If the same three sentences still describe that site, no direction has been chosen yet. This is the cheapest available check on generic output, and it fails far more often than it passes.

Adjectives are not directions. "Minimal", "premium", "elegant", "modern", and "clean" describe intensity, not form, and cannot be checked or handed over.

## Defaults to avoid

Model output converges on a small set of looks. Because they are the modal response, they carry no information about the person, and readers now recognize them as unedited generation: a gradient where the work contains no gradient, three equal cards where the work contains no equal-weight set.

The catalogue lives in [reads as generated](reads-as-generated.md) — each tell, the slot it is filling, and what a derived answer looks like — together with the element-level provenance rule that dissolves most of the list before it starts. Nothing there is a ban. A row of cards is correct when the material genuinely holds a set of equal-weight things; the failure is reaching for the shape before asking whether the material has it.

Run the swap test against the last thing you built as well as against other people's sites. Type voice and evidence objects are the easiest layers to differentiate; palette, section rhythm, and the shape of the navigation are the layers that quietly repeat, and a reader who has seen two of this person's pages will notice those first.

## Type

Type is the largest share of the visual result and the cheapest thing to get wrong.

| Decision | Working range | How to adjust |
| --- | --- | --- |
| Scale ratio | 1.125–1.25 for dense or utility pages; 1.333–1.618 for editorial pages | More levels and larger jumps when the page argues; fewer and tighter when it reports |
| Body size | 16–19px Latin; 17–20px CJK | CJK glyphs fill the em box, so the same nominal size reads smaller and denser; raise it before raising line length. A dense archetype — ledger, instrument, catalogue — earns a tighter measure, more column rules and shorter paragraphs, not a smaller body: measured output has drifted to 15px CJK in pursuit of a document feel, and a document at 15px Chinese is simply hard to read |
| Measure | 45–75 Latin characters; 22–38 CJK characters | The range is for the reading width; never widen to fill a container. On a 360px phone the viewport caps it below the floor — keep the body size and let the measure drop rather than shrinking type to hit a character count |
| Line height | 1.5–1.75 Latin body; 1.75–2.0 CJK body; 1.05–1.25 headings | CJK needs more air because there is no inter-word space |
| Tracking | −0.01 to −0.035em on large Latin display only | No CJK text takes letterspacing at any size — not headings, not table headers, not small labels. The fixed-width rhythm is what makes Chinese scannable, and `letter-spacing` declared on a label class hits every glyph inside it |
| Weight | 400–500 for reading, 600–700 for emphasis | Two weights and two or three text colours carry a whole hierarchy; nothing below 400, which vanishes at small sizes and on low-DPI screens. Reaching for a heavier number instead of a lighter colour is how a heading ends up both too bold and too large |
| Family count | 1–2, plus one CJK fallback pair | Add a third only when a real distinction (voice vs data, prose vs code) needs it |

Measure the measure in the unit you capped it in, and measure the line rather than the box. Two traps, both hit on a finished page:

- **`ch` is the advance of `0`, not of a letter.** A `max-width: 74ch` cap and the widest line it produced agreed at 73.6ch; the same line divided by the advance of a lowercase `x` reported 86.5ch, and divided by an average English character it reported something else again. If the rule is written in `ch` the check has to be too, or a compliant stylesheet looks like a failure and a failing one looks compliant.
- **A Range over an *element* returns rects as wide as its container.** Selecting a list item's contents reported an 837px "line" in an item whose longest actual line of text was 516px, because the leading rect spans the content box. Walk to the element's own direct text nodes and take the widest rect from those.

Then hold one ceiling and apply it per role: about 66ch for body prose, and a slightly wider 68ch for small-text notes, where the same character count is physically narrower. Caps written this way are cheap and they fail loudly when a new block forgets them.

Write the CJK tracking rule as a switch, not as a list of exceptions. The sentence "no CJK text takes letterspacing" is easy to state and hard to keep: a stylesheet accumulates negative tracking on every display role — headline, section title, pull quote, caption, table footer, metric — and a reset aimed at the headings leaves the other six unregulated. Measured on a finished page: a heading-level reset was in place and fifteen of seventeen tracked rules still applied their Latin correction to Chinese text. Author each value once as `letter-spacing: calc(-0.025em * var(--track-scale))` with `--track-scale: 1` at the root and `0` under the Chinese locale, so the per-rule optical values survive — a 64px line still wants tighter tracking than a 32px one — and one declaration decides the whole page. The same reasoning covers any rule whose correctness depends on script rather than on component role.

Then let the display sizes come *down* for Chinese while the body sizes go up. Both directions come from one fact: a CJK glyph fills its em box, so the same nominal pixel size covers more area and reads heavier. A 64px Chinese headline over a 19px body is not the same statement as a 64px Georgia headline over a 17.5px body — it is louder, and it wins the page against its own argument. Roughly 0.88× on the display steps puts the two locales at the same visual weight.

The modular ratio does not travel down to a phone on its own. **Large elements have to shrink faster than small ones.** A display line at 45px over 18px body is 2.5×, and holding that ratio on a 360px screen — with `clamp()` on the font size, or a relative `em` display — lands the heading near 35px, three lines tall, out-arguing the sentence underneath it. On a narrow screen the ratio itself comes down: about 1.4–1.7× the body, so 20–26px for a display line. Tighten the line height as it shrinks too, or the heading reads as a stack of separate words.

Check the font that actually renders, not the one declared — and know that computed style will not show it to you. `getComputedStyle(el).fontFamily` returns the family list exactly as the stylesheet wrote it, never the face the browser resolved glyph by glyph, so the check people reach for here is the one that passes a broken page. Ask the browser what it painted instead: over the DevTools protocol, `CSS.getPlatformFontsForNode` on the node reports the real family and how many glyphs each one carried. Two failures that read clean in computed style and ruin the page:

- **A weight substitution you never asked for.** `font-family: Georgia, 'Source Han Serif SC', serif` with `font-weight: 400` on a Chinese heading painted *Source Han Serif SC Heavy* — that machine had only the Heavy instance registered under that family name, so the request for Regular resolved to the one face carrying the name, at roughly 900. A display heading that arrives 500 units heavier than declared is not a subtle miss: it wins the page against its own argument, and it is invisible to every in-page check.
- **A line split across families.** The same heading rendered ideographs in Source Han Serif SC Heavy, Latin in Georgia, and `「」` and `→` in SimSun — three faces in one line, because each glyph fell through to whatever covered it. Putting a family that actually covers CJK punctuation ahead of the one that does not collapses that to two matched serifs.

So a system font stack is a list of *requests*, and the machine decides. When the type is display-scale, or when the page is bilingual, or when the stack is the only reason a heading looks like a heading, read the painted faces before writing the DESIGN.md paragraph that claims the type works. Where a subfamily name carries a weight word (Light, Medium, Semibold, Bold, Heavy, Black), compare it to the declared number: a 400 declared against a face named Heavy is the finding, and it is the one that recurs whenever display type is set in a script the designer's own machine does not read. One divergence is not a defect, though: the platform's own font link. On Windows a run that mixes Chinese with Latin digits paints the Han in Microsoft YaHei and the digits in Segoe UI **Semibold** while the page declares 400 — measured at +0.00px of advance across a 43.69px run of `$2,500`, so the linked face carries exactly the width a Regular one would. The operating system is matching stroke weight across scripts, and no stylesheet can un-ask it; a weight-divergence check therefore needs a floor of about one full weight class (≈300 units) before it calls anything a finding. The failure this section exists to catch — 400 declared, Heavy painted — is 500 units away, and clearing a 300-unit floor does not hide it.

Text that lives inside a scaled `viewBox` has no px size, so no size floor can be written against it. Type drawn in SVG is measured in user units and then multiplied by whatever the browser scales the canvas to: a 13.5-unit axis label arrived at 10px on a small tablet and 6px on a phone, and `getComputedStyle` still reported 13.5px all the way down. A breakpoint table that inflates the declared size to compensate cannot hold a floor either, because the scale factor changes once per layout break — six times between 320 and 1440px on one page — and a table of breakpoints is a guess at a number that only the renderer knows. Take the labels out of the scaled coordinate system and paint them as HTML positioned by percentage over the same box; a wrapper whose aspect ratio matches the viewBox makes the percentages land exactly where the `<text>` nodes were, and the declared size is then the size that renders. Keep `vector-effect: non-scaling-stroke` on the strokes for the same reason. If type does stay inside the SVG, measure it as `fontSize × getScreenCTM().a` — a floor checked against the declared value alone is checking a number nobody sees.

Self-hosting a CJK face requires covering the characters the copy uses. Compute coverage against the real text; below roughly 95%, describe the file as a partial subset rather than a hosted typeface, and expect the fallback to carry most of the page.

## The written surface

Punctuation is typography. A page of headings, labels and buttons that carries sentence punctuation reads as a text dump arranged in boxes, and in Chinese the cost is higher: `。`, `，` and `、` each occupy a full em, so one stray mark punches a gap wide as a glyph into the fixed rhythm the reader is scanning. `！` on a button shouts. `～` and a decorative `·` add marks without adding meaning, and a heading with two of them looks like a subtitle that lost its formatting.

Sort every mark on the page into three kinds and treat them differently:

- **Terminal marks in phrase roles** — a heading, nav item, eyebrow, label, button, chip, stat value, or one-line caption that *ends* with `。！，、`. Always a defect. Write these lines as noun phrases or plain claims and the marks fall out on their own.
- **Decorative marks** — `·` `～` `！` `？` used for charm, `、` chains inside table cells, a `。` after a bare number. Always a defect; they add marks and no information.
- **Structural marks** — a comma inside a heading that carries two balanced clauses (`顺序是固定的，判断是逐册的`), a colon or semicolon doing real syntactic work. Keep them. Deleting these does not make the line cleaner, it makes it ungrammatical, and a page of comma-less Chinese fragments reads worse than one with too many periods.
- A caption written as a full sentence keeps its sentence punctuation; a caption that is a label does not. The test is the text object, not the HTML tag — several of these roles legitimately hold prose, and a check that bans `。` from every `<figcaption>` will report forty false defects and get ignored.

Two specific marks earn the most scrutiny:

- The colon usually means a missing decision rather than a needed mark. `邮箱：jane@example.com` states what the format already gives away; drop the label, let the identifying value carry the heavier role, and the colon goes with it. Where a reader genuinely searches by field name — a technical specification, a data table — keep the label and set it weaker than the value; there the colon is a retrieval aid.
- `。` sprinkled through data displays (a stats grid where every cell ends with a period) is the single most common way a generated Chinese page looks unfinished, because it turns a table into a paragraph.

Paragraph prose keeps all its punctuation. Stripping `。` and `，` from body copy is the over-correction and it makes writing read as machine output. Numbers and units take one convention site-wide — 万 against 10,000 against 10k, `%` against 个百分点 — and no separators the source data did not have. Quote marks and brackets pick one style per language and hold it; mixing `「」`, `“”` and `""` on one page reads as four authors.

## Colour

Name roles, not values: `paper`, `ink`, `muted`, `accent`, `signal`. Values follow from the material.

Those role names are a trap. `paper` invites a warm off-white and `accent` invites an earthy red, and a page can be built entirely from named roles while the palette was never decided. When the material contains no colour to take — a text-only résumé, no public screenshots — the absence is the fact to record, and the substitute still needs a reason. Say in `DESIGN.md` why this person's canvas is warm, cool, or saturated; "neutral and readable" is not a reason.

Check the distance between builds, not just the distance from a template. Two sites produced by this guidance have landed within five hex points of each other on both accent colours while swapping which role each one fills — which is one palette with relabelled tokens. A build with no guidance at all produced a four-role system in petrol, ochre, brick and green, and a dark variant of every one of them. So measure it: compare your canvas, your accent, and your section rhythm against the last output you made. If two people's sites are within a few points on all three, the palette came from the instructions rather than from the material.

Take the accent from the sampled readings above, never from a palette generator. When a measured distance says the two builds converged, the fix is the readings, not the colour picker: go back and find something in the material that the other person's material does not contain.

- One accent, one muted neutral, and at most one unexpected colour, kept under about five visible uses per page. A surprise colour spends its value on every use; past a handful it is just a second accent.
- Name the roles the page actually performs. A hue drawn more than once is doing a job, so it should be named for that job — otherwise its fifth use is a guess. And a token called `accent` that only ever paints selection and focus is a written record of a decision that was not kept: rename it to what it does (`highlight`, `focus`, `rule`, `gutter`), or give it the job its name claims. A highlight that matches the brand is worth checking here too, because it disappears into the thing it is meant to point at.
- Contrast floors: 4.5:1 body text, 3:1 large text and meaningful graphics. Compute them; eyeballing fails most often on muted text over tinted panels and on small letterspaced labels, which are exactly the two cases portfolios lean on.
- Rhythm without a dark mode: alternating surface tones must still separate sections. If every section shares one background, the page reads as one long grey scroll regardless of how good the palette is.
- Semantic colours (success, warning, error) need a non-colour cue as well: a shape, a label, or position.

## Image language

Order of preference, strongest first:

1. The material's own objects, rendered or laid out at true proportions.
2. Screenshots, diagrams, plots, and excerpts from the work, cropped to the decision they support.
3. Hand-built CSS or SVG illustration when the real artifact is unavailable and the concept still needs form. It is expensive and it is the difference between a page with an idea and a page with a template.
4. Abstract shapes, gradients, and patterns, only where they carry structure.
5. Stock photography. At most one or two images, and only when the photograph contains information the text lacks.

Keep native aspect ratios. Never zoom into an original composition to fill a box, and never pad a wide artifact into a square. Caption every borrowed image with its source at the point of use.

A generated image standing in for work the person actually did is fabricated evidence, and it is legible as such: an AI concept cover announces that the real material was not sufficient, which is the one thing the page exists to deny. When no artifact exists for a case, the absence is answered by structure — a diagram of the mechanism, a spec table, a hand-built CSS or SVG object, a quotation from the writing — not by a mood frame. Where generative work genuinely *is* part of what this person does, say so in the caption at the point of use, with the same treatment as any other source.

What must not appear on the surface is a production label: no "AI 概念封面" badge, no "generated visual" watermark over a heading, no "示例数据" chip on a figure a reader is being asked to believe. Keep the disclosures that change how something should be read; delete the ones that only describe how the page was assembled.

An internal comparison is worth running: line up the hand-built elements against the photographic ones. If the photography is visibly the weakest part of the page, the budget went to the wrong place.

A hand-built artifact drawn at true proportions is the most likely thing on the page to break a phone. An inline SVG with a fixed pixel width, a spec table with six columns, and a long email inside a pill all overflow before anything else does. Give every such object a rule that survives 360px — a `viewBox` that scales, a scroll container with a visible affordance, or a stacked variant — and measure `document.documentElement.scrollWidth` at 360, 390, and 430 rather than assuming the responsive block you wrote is the one winning.

## Motion

Motion is a claim about what matters. Animate the two or three moments where a reader could otherwise stop, and leave the rest still.

| Use | Duration | Notes |
| --- | --- | --- |
| Press, hover, toggle feedback | 120–200ms | Must feel immediate; slower reads as lag |
| Entrance and reveal | 200–450ms | Above 500ms a reader waits; below 150ms nothing registers |
| Scroll-linked displacement | ≤ 8–12% of viewport | Beyond this the content detaches from its own layout |
| Cross-page or state change | 250–400ms | Keep the source legible during the transition |

Ease in with a decelerating curve for arrivals (`cubic-bezier` with a long tail), ease out sharply for departures, and use spring physics where an element should feel like an object rather than a timer. Animate `transform` and `opacity` only; width, height, top, and left trigger layout and are the usual cause of jank.

Budget two or three animated focal points per scroll. Respect `prefers-reduced-motion` in both CSS and script, offer a control that actually tears effects down rather than hiding them, and keep every animated element's final state reachable without motion and by ordinary scrolling rather than a hijacked wheel. Parallax and 3D must serve reading: a scene that exists to impress costs attention from people trying to understand the work, and it is the most common way a technically accomplished site fails.

## Component states

Every interactive component needs default, hover, press, focus-visible, disabled, loading, and empty. Missing states are where generated interfaces look cheapest, and where real use breaks. Hit areas at least 44px, stable after scroll and layout change, usable by touch and keyboard, with labels that survive locale switching.

A press state is the one place where "more motion" reads as "more quality", and it is cheap to get wrong. It has to answer inside the frame the input arrives in — a 1–2% scale plus a surface change at ~120ms on a compositor-only property, not a 300ms slide that the reader has already stopped believing. Reserve the larger transitions for state that persists. And do not put this behind the motion toggle or `prefers-reduced-motion`: ambient motion is decoration, a press response is the answer to an input, and taking it away from a keyboard or reduced-motion user removes the one piece of feedback they were relying on to know the click registered. Hover can be gated; the press cannot.

Interaction must answer a question the reader actually has. A preview modal on a case whose material is already shown complete, or a filter across lists that do not differ, adds work without adding information and reads as decoration.

### Control geometry

Corners are one of the four levers that set a page's personality, alongside type, colour, and wording, and they have to be *chosen*, which means being able to say which of three you picked: square (a document, a drawing, an instrument, a formal institution), small (neutral utility), or large and continuous (a tactile app, a friendly one). Each is defensible from the right material and cheap from the wrong one.

The common failure is not the wrong choice — it is no choice. A 2–4px radius on a 40–44px control is exactly what a framework default leaves behind at that size, and readers who have seen two generated sites name it. If the material is a schematic or a printed sheet, square is the honest answer; if the person's work is a product people hold in one hand, a control with no curve is the anomaly. Neither is reached by asking which looks nicer.

Then treat radius as a scale rather than a per-component sprinkle: two or three values across the whole control family — button, input, chip, card, sheet — held consistently, with nested geometry derived instead of repeated. A rounded child inside a rounded parent wants an inner radius about one inset smaller than the outer, or the two curves visibly fight, and a pill primary action beside square secondary actions reads as two design systems on one page. Variance where *function* varies is judgement; variance where it does not is noise.

## Budget

Four quantities gate the page, and each one is a measurement of the rendered site rather than a property of the plan: the bytes the first screen must transfer before it paints, LCP on a throttled mid-range mobile connection, the largest cumulative layout shift anywhere in the scroll, and the JavaScript actually transferred on the route the reader lands on. Dynamic imports count. A module graph the browser follows silently is precisely the number that estimating from `<script>` tags gets wrong, and the usual result is a page certified at 8KB that a visitor pays 100KB for.

For a hand-built static site read for a résumé screen the ceilings are: critical path near 200KB, LCP under 2.5s, CLS under 0.1, and under 60KB of script with no framework. They are ceilings, not targets, and nobody negotiates them downward by hoping. Write the four measured values into `DESIGN.md` with the widths and the throttling profile they were taken at. A budget asserted rather than measured has the standing of a contrast ratio written into a CSS comment: unverified, and usually wrong in the flattering direction. The gate also covers availability: no request may be one a third-party host has to answer for the page to work, since a font, an embed, or a tag that disappears takes the portfolio's appearance down with it. That is a maintenance decision wearing the costume of a network one.

Spectacle is paid for out of whatever the content leaves over, so it is the first thing cut and it goes in this order: the animation restating something already visible, then the image larger than its reading measure needs, then the third-party embed, then the showpiece itself. A parallax scene that pushes LCP past the ceiling is the defect, not the casualty. Where the material genuinely needs more — a video case, a real 3D object the work *is* — raise the number in writing, name the one file that pays for it, and say what the reader gets that a smaller file cannot deliver. An unrecorded overrun is a failure; a recorded one is a decision, and that is the only difference between them.

Maintenance is the same gate on a longer clock. Two questions decide it: how many places does the next project get added in, and can this person do it alone in a month without the builder's help. A structure where one new case means editing four files is the structure where the person stops updating the site, and a portfolio that stopped being updated is expired whatever it looks like. Prefer the layout that keeps the material in one place and derives the markup from it.

## Turning references into decisions

Reading references is how a direction gets better. Copying them is how it becomes derivative, and a reader who has seen the reference will notice.

Pick two or three. Prefer one from an adjacent or unrelated field: a site about physical objects usually teaches a software portfolio more than another software portfolio does, because the shared patterns between similar sites are exactly what makes output converge.

Open the actual page, at the size you plan to build for, and interact with it. For each one record four things in `DESIGN.md`:

1. What problem the page solves for its reader.
2. Why it works, named as a mechanism: scale contrast, sequence, density control, framing, a single focal object, timing.
3. What it costs, in load size, maintenance, reading effort, or accessibility.
4. Whether this person's material supports the same conditions.

Transfer relations, not appearances. Hierarchy, rhythm, contrast, attention path, and how much air a claim gets are transferable. Hex values, font names, radii, and specific effects are not; they belong to that material. If you cannot state which relation you took and how it now serves different content, you copied a look.

Where a reference changed your plan, write the adaptation and the difference down. That record is what lets the site be revised later without losing the reasoning, and it is the honest attribution.
