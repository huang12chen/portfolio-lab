# Reads as generated

Every portfolio built by a model shares a small set of tells, and they are not taste failures — they are the visible residue of answering the wrong question. The tell appears when the builder asks "what does this section need" instead of "what does this material contain". A numbered eyebrow fills a slot; a row of three equal cards fills a slot; a gradient behind a headline fills a slot. Slots are safe because they never contradict the content, and they read as generated for exactly that reason: nothing in them could only be true of this person.

This file is a catalogue of the residue, and a measurement for the part no individual reviewer can see: two people's sites looking like one person's. [visual direction](visual-direction.md) gives the swap test for a direction statement; this gives the swap test for the finished artifact.

## The element-level provenance rule

The single check that dissolves most of the list below: **every visible element on the finished page must trace to a fact in the material or to a reader task, and the trace must be nameable in one phrase.** "The container that holds the résumé" names a task. "A decorative card row" names a slot. "The four weekly figures from the Signal dataset" names a fact. "Some numbers to fill the metric strip" names nothing, and if you cannot name it, the element came from a template you have seen before.

An element that survives only because deleting it would leave an obvious hole in the layout is a slot. An element that survives because the reader needs it is content. The difference is what the checks below are actually detecting.

## The list

| Tell | The slot it fills | What a derived answer looks like |
| --- | --- | --- |
| Three or four equal cards in a row | "features" — a grid for content of supposedly equal weight | The work is not equal. Rank it, or make the count come from the material's own number of cases, and let one be structurally bigger |
| `01 / 02 / 03` eyebrows above every heading | sequence, where the sequence is already the DOM order | Number only what is genuinely an ordered procedure; a reader scanning a page does not need a number to know a section is next |
| One system sans doing every role — Inter, Geist, the OS face at three sizes | "clean type" | Hierarchy then has to come from weight alone, which flattens inside three steps. A display face is not required; a second *voice* is, and it comes from the material — the lettering on the object, the readout's mono, the face on the printed sheet |
| ALL-CAPS letterspaced small type on every eyebrow, label and caption | "editorial finish" | Editorial practice reserves that treatment for one role. Give it to all three and they flatten into a single layer, so the reader can no longer tell a section name from a field label |
| A fade-up on every section as it enters the viewport | "motion" | Motion is a claim about what matters. Two or three places where something actually leads attention and the rest stays still — see [motion choreography](motion-choreography.md) |
| An aspirational opening line that makes no claim | "an intro" | The first line has to be checkable: what was made, for whom, what changed. `Turning ideas into elegant solutions` is a slot every generated site fills the same way |
| Warm paper, one earthy accent, a serif display face | "tasteful" | Derive the canvas from the material's own ground and the accent from a named sample point; a restorer's page and a ceramicist's page must not be able to swap palettes unnoticed |
| Near-black plus one acid accent | "technical" | Same test. This is the dark twin of the above and is equally portable between personas |
| A gradient blob, aurora, or grain field behind the headline | "modern" | Texture only where the material has texture — paper fibre, a kiln surface, a scan of the actual page — and name the source |
| `letter-spacing` on any element containing CJK | "designed headline" | See [visual direction](visual-direction.md); a widened Chinese heading is a defect at any tracking value, and the harness counts these |
| Section headings that are abstract nouns — Process, Approach, Impact, Overview | the template's own section names | Head the section with what the section says: `顺序是固定的，判断是逐册的` is a heading; `流程` is a slot |
| A metric strip with no period, no unit, no source | "impressive numbers" | Every number carries value, definition, period and attribution at the place it is used, or it is not shown |
| One radius token used on everything | "consistent design system" | Radius is a claim about the object's edge: a folded sheet, a machined panel and a text field are not the same corner |
| One shadow used on every card | "elevated" | See [surfaces](surfaces.md) — the layer count comes from how many separations the material's object has |
| An icon in a circle above every section | "visual interest" | An icon earns its place when the reader meets the same object repeatedly and needs to recognise it without reading; a portfolio has maybe two such objects |
| Uniform index-based stagger on every list | "motion design" | See [motion choreography](motion-choreography.md): stagger only where the set, not the sequence, is the thing being introduced |
| `hover: translateY(-4px)` and a bigger shadow on every card | "interactivity" | Feedback belongs on things that answer. A paragraph of evidence does not need to lift when a mouse passes it |
| Rounded pill tags in rows under every project | "metadata" | Tags are a navigation affordance or they are decoration; if clicking one does nothing, they are decoration wearing a control's clothes |
| A four-column footer of links, several of which go nowhere | "a complete site" | A footer holds the things a reader might actually need after the work: contact, the résumé, the source, the date the page was made |
| Two unequal items pushed to `space-between` | "a row" | Alignment should express the relationship; `space-between` on a label and its value invents a gap that means nothing |
| Stock photography of desks, laptops, clay, bookshelves | "there should be an image here" | Show the thing itself — the artifact, the diagram, the diff, the data — or show a drawn object, and label it as drawn |
| Copy that praises the author in the abstract | "a professional bio" | Write what happened, what you decided, and what it cost. `它慢、它抖、它贵` is a person talking; "detail-obsessed problem solver" is a slot |
| A visible design-system: swatch grid, type specimens, spacing table | "shows I know design systems" | The system is the page's skeleton, not its content. Show it only when the person's actual work is the system |
| Everything centred at one max-width | "clean layout" | Centring is a claim that the object has no relationship to anything beside it. Two centred blocks in a row is one axis, and a page with one axis is a document, not a composition |

A tell is not a prohibition. A row of cards is correct when the material genuinely contains a set of equal-weight items. What is never correct is reaching for the shape before asking whether the material has it — which is why the table above names the question, not the ban.

## The similarity measurement, because you cannot see this one yourself

One build against one reviewer is unwinnable: the tells above all look fine in isolation, which is what makes them dangerous. The failure that matters — two different people's sites that could have been made by the same hands — only exists in the *comparison*, so it has to be measured rather than judged.

Compare your output against the last thing you built with this skill, and against the example in `examples/` if you read it:

- **Accent hue distance.** Sample the primary and secondary accents of both pages as hue, and report the angular distance. Two pages built from different materials landing near each other on both accents is one palette with relabelled tokens, which is what happened in this project's own measurement run before the material-sampling rule existed. Distance alone is not the finding; distance *plus* the same role structure is.
- **Named colour roles.** Compare the role vocabulary. If both pages declare the same set of roles and the same canvas family, the direction was not derived twice, no matter how far apart the hues are.
- **First-screen skeleton.** Compare the sequence of block kinds and each block's fraction of the viewport height. Two first screens with the same sequence and similar fractions were not composed from the material; they came from the same internal template.
- **Distinct-value counts.** Count the distinct type sizes, distinct weights, distinct radii and distinct shadow layer-counts. Two builds with near-identical counts across all four are running one system with different words in it.
- **Heading n-gram overlap.** Compare the heading text. Shared multi-word phrases across two personas' sites — especially abstract ones — mean the copy was generated from the same prior.
- **The swap test at artifact level.** Replace your page's headings and figures with another persona's, without touching layout, colour or type. If nothing looks wrong, your design is content-agnostic, and content-agnostic design is by definition not derived from the content.

**Check.** Run the harness comparison over both builds and report every one of the six measures above, with the numbers, in the review notes — a comparison asserted without measured values is a self-report and gets discarded. The gate is not "maximise difference": a backend engineer and a data analyst legitimately produce similar pages. The gate is that **every shared property must be explainable by a shared fact about the two people's material**, and anything you cannot explain that way is the residue this file is named for.

## Order

Run this after the artifact exists and before it is called finished, because every entry above is a comparison against a rendered page, not against an intention. Fix the traceable-cause items first — a metric with no period is a content defect that also happens to be a tell, and fixing the tell without fixing the fact is how a site ends up looking less generated while saying less. Then run the similarity measures, and treat a shared property with no material explanation as a fail on the same footing as a contrast or overflow violation.
