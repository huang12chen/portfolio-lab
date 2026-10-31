# Media, Navigation, and Reading Checks

[简体中文](zh-CN/images-and-links.md)

## Arrange images around what the reader needs to see

- Prefer natural proportions or `contain` when originals and evidence screenshots need a complete view. Covers can crop deliberately, but retain the information needed to judge the work and provide direct access to the full content.
- For mixed landscape, portrait, and square media, consider centered stages, proportional grids, or a deliberate editorial rhythm. Do not square-crop all originals merely for uniformity.
- Check the group, image box, subject, and text column separately. Whitespace inside an original composition is not a reason for unsupported zooming.
- Do not stretch a portrait scene into a full-width landscape banner. A complete image beside a concise explanation or a natural-ratio layout can communicate better.
- Inspect computed sizes with `contain`: ancestor clipping, intrinsic dimensions, padding, hover scaling, and scroll parallax can still hide the image.
- Make the default page understandable. Full-size links are optional supplements, not the only way to inspect whether a claim is supported.

## Video, documents, and code

Give video clear playback controls and context; do not autoplay sound or require a long recording to understand the person's role. Give documents a readable summary or excerpt and an original-file route. Give code projects running behavior, features, and constraints rather than unrelated decorative code.

Provide a visible fallback, bounded retries, and usable navigation when a resource fails. Keep source content available if canvas or animation initialization fails. Avoid nesting retry buttons inside an enclosing link.

## Taking a colour out of an image

[visual direction](visual-direction.md) requires every accent to name the file and the point it was sampled from. That instruction is easy to satisfy dishonestly, so the procedure matters more than the rule:

Do not average the image. The mean colour of almost any photograph or scan is a low-chroma mud, and a page painted with it looks dead while technically obeying the rule. Instead collect hues from pixels that are far enough from grey, from black, and from white to carry a colour opinion, build a hue histogram, and read the cluster that belongs to the *object*, not to its background — a photograph of a celadon bowl on a grey table has two clusters, and the one with more pixels is the table.

Then verify the hue before adopting it: place it on the canvas the page actually uses and measure the contrast ratio; a sampled hue that fails 4.5:1 as body-size text is a decoration or a large-number colour, not an accent, and saying so in `DESIGN.md` is a better outcome than quietly saturating it until it passes. Record the file, the coordinates or named region, the hue, and the contrast result.

Sometimes the honest answer is that the material has no colour in it. A black-and-white print archive, a terminal, a spreadsheet: sample it, find only neutrals, and then derive the palette from the *ground* — the paper, the ink, the grid line — and take the accent's role from something structural instead, such as a single state colour whose meaning is stated. A hue you cannot find is a finding; do not invent one, and do not fall back to the warm-paper-and-earthy-red default that [reads as generated](reads-as-generated.md) names.

**Check.** Confirm each accent in `DESIGN.md` carries a file name and a sample point, that the sample point lies inside the referenced image's real dimensions, and that the sampled hue matches the shipped token within a small angular distance rather than being a different colour with the citation attached. Then confirm the accent passes its stated contrast use at the size it is used at. A provenance line whose hue does not match the pixel it cites is worse than no provenance line, because it looks verified.

## When there is no photography

The absence of images is a common and legitimate state for a portfolio — the work is code, or text, or a quantity, or it is confidential. It is not a licence to import stock photography or to generate a stand-in: a photograph that did not happen is a claim about the person's work, and the reader cannot tell. The substitutes below are ordered by how much they preserve the actual evidence, and using a lower one when a higher one was available is the defect.

1. The artifact itself as data: the plot, the diff, the table, the log, the specification sheet, rendered as the page's own object. This is what the work *is*, and it needs no camera.
2. The artifact itself as type: the paragraph, the verse, the clause, the interface string — set at its real proportions, with its real line breaks, as a drawn object on the page.
3. A measured drawing of the object: a cross-section, an orthographic view, an exploded assembly, drawn from the person's own dimensions and labelled with them. State that it is drawn.
4. A colour or material plate sampled from the real thing, with the sample point named.
5. Nothing — a page that says the work cannot be shown, and why, and gives the reader a route to ask for it. This is a complete answer and it is better than a fake; several real portfolios are built entirely this way.

Label which of the five you used, on the object itself, in the reader's language. A drawing that reads as a photograph costs the person more credibility than an empty space.

**Check.** For every image slot on the page, confirm it contains a real artifact, a real rendering, or a stated substitute, and that the stated kind matches what is rendered — a drawing labelled as drawn, a plot whose numbers trace to a source, an absent image acknowledged in the text next to its slot. Fail on any bitmap that is neither the person's material nor a document of the work, and on any generated stand-in, whatever it is labelled. Where the site ships no photography at all, confirm that the first screen still contains the work rather than a headline about it.

## What media costs

An image-heavy portfolio fails on the connection the reviewer actually uses, not on the one the author has. Every raster gets intrinsic dimensions so nothing shifts the text below it while loading; the first image a reader sees is fetched at the size it will be drawn at, not downscaled from a camera original; images below the fold do not compete with it for bandwidth; and a drawn or plotted object is measured in the same units as a photograph, because a 900px-wide SVG with thousands of paths costs just as much.

**Check.** Report each route's largest image in bytes against the box it renders into, and flag any image whose delivered width is more than about twice its rendered width. Confirm reserved dimensions on everything above the fold, then load the page on the throttled profile and report whether any text moved while images arrived. Confirm the byte budget in [visual direction](visual-direction.md) still holds after media is added, because media is how a portfolio quietly exceeds a budget it met as a text-only page.

## Entrances and exits

- First screen: position, representative content or a clear overview, and a useful action.
- Overview: what the project is, the person's role, and what can be inspected inside.
- Entry: one clear choice reaches the full case; no compulsory preview before details.
- Within a page: long content can have a contents list; fixed navigation must not cover its targets.
- Return: browser Back, project list, home, and work navigation have consistent destinations; related links use specific project names.
- Contact: preserve the chosen disclosure scope. Temporary panels close clearly, support Escape and focus restoration, and do not require Back to exit.

## Reader tasks across sizes

Run the user-reported size and representative desktop, tablet, and narrow layouts. Cover each media proportion, the longest title, mixed scripts, real screenshots, expanded menus, and return routes.

1. Can readers identify the available work and find what matters to them?
2. Is each important image complete and legible? Do metrics correspond to the evidence? Are long images being clipped?
3. Is the sequence of titles, body, and data clear, with a useful reading measure and deliberate space?
4. Are hit areas stable and pointer feedback visible on light and dark surfaces? Are touch, keyboard, and reduced motion usable?
5. Do filters change actual results and reflect selection? Reorganize or remove filters with no meaningful difference.
6. Do return, contents, retry, close, empty, and error paths work?

When a browser is unavailable, deliver the implementation and completed checks with explicit limits. No overflow, file existence, and valid syntax cannot establish image completeness or reading quality.
