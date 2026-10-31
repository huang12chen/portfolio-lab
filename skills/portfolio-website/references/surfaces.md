# Surface, light and depth

A page reads as expensive or cheap mostly at its edges: where one surface stops and the next begins, and whether that boundary was drawn, lit, or left to a framework default. "Shadow" is the least-specified word in portfolio work — [visual direction](visual-direction.md) forbids one shadow on every card but never says what a second one would be made of. Nothing here is a value. Every mechanism below is derived from the material and then measured on the built page.

Start by adding one line to the direction statement in `DESIGN.md`: where the light is, how hard it is, and how many surfaces the material actually stacks. A page with no recorded light source cannot pass any check in this file, because there is nothing to compare the pixels against.

## Derive the light from how the object is seen

| Condition in the material | What it says about light | What the page then does |
| --- | --- | --- |
| Objects photographed or displayed under one lamp — vessels, specimens, prints under glass | One direction, one hardness, shadows fall the same way on every object | One shadow recipe site-wide, with a consistent offset direction on every raised element |
| Flat printed matter read under room light — ledgers, score pages, datasheets | No dominant direction; separation comes from ink on paper | No drop shadows; tone shift, rules, and folds carry every boundary |
| An object turned in the hand, or a scene with depth of field — field gear, a mounted leaf, a kiln load | Light and distance change together | Blur and shadow both vary by depth, and the variation is what the page animates |
| Screens, dashboards, diagrams on one plane | There is no light; there is a z-order | Elevation is expressed by ordering and containment, never by simulated material |

Derive the hardness, not a number: how far the object sits above the surface it casts on, and how wide the penumbra is relative to the object. Both come straight out of the material's own photographs, which is also the honest attribution.

**Check.** Read computed `box-shadow` on the topmost raised element. If it is one layer, or if every raised class carries the same offset-to-blur ratio, and the direction statement names no light source, fail. A single default shadow on a page whose material is a stack of physical sheets is the exact defect this file exists for.

## How many layers the surface system needs

Count the separations the object itself has. A ceramicist's working surface is shelf, bisque, glaze test, and a paper label stuck on the foot — four things that touch, and the interesting fact is which one sits on which. A rare-book restorer's object is board, leather, spine, endpaper, and the pastedown under it, and a page with four nested tones can show the layer order of a repair. A backend engineer's material is a dependency diagram on a single plane, and any physical stacking on that site is imported from a product dashboard.

Take the count from that inventory, then subtract every separation the reader does not need to see. One layer means the page is a sheet and gets rules only. Two means figure and ground and gets one shadow recipe. Three is the working ceiling: canvas, panel, raised. Four is only honest when the material itself has four touching layers, and then it is worth the cost. Ask "how many layers look nice" and every build lands on two.

**Check.** Count the distinct elevation classes present in the shipped CSS — unique background and `box-shadow` pairs that a surface actually uses — and compare against the layer count recorded in `DESIGN.md`. More classes than the material justified is decoration; fewer than the number of boundaries the reader has to parse is a flat page. Either mismatch by more than one is a fail.

## What separates two adjacent layers

Pick the separator from what the material already uses for that boundary. Four levers, and a page should use the same one for the same kind of boundary every time.

| Lever | Correct when | Wrong when | Verify by |
| --- | --- | --- | --- |
| Tone shift | Layers are made of the same stuff — sheet on sheet, slip on clay | The palette has too few steps to make the shift visible, or the shift is doing colour's job | Compute the luminance delta between the two adjacent surfaces; below the point where grayscale still shows them apart, the boundary is invisible to a colorblind or grayscale reader |
| Shadow | One object physically rests on another | The object is drawn, not placed — rules, diagrams, code blocks | The layer structure below, plus a direction audit |
| Hairline | The boundary is drawn or incised: a plate edge, a rule, a score line, an engraved label | Every card gets the same 1px ring, which is a component library, not an edge | Count elements carrying a border with no other separator; a page where the border does all the work is a wireframe |
| Blur | Something translucent lies above something legible: tracing paper, a wet mount, glass | The material is opaque, so frosted panels are wallpaper | For each `backdrop-filter`, name the translucent material in `DESIGN.md`; no name means fail |

**Check.** Pick three boundaries of the same kind on different routes (card on canvas, panel edge, overlay seam) and read which lever each one uses. Same kind, different lever means the surface system was never decided, only guessed at, per screen.

## Shadow structure, not shadow values

A shadow is a list, and the list's length is the decision. Build it in three roles:

1. A contact layer: tight, small radius, offset barely larger than the object's own thickness. This is what makes an object look placed rather than floating.
2. A penumbra layer: much larger blur, low strength, offset in the same direction as the contact layer at a ratio set by the light's hardness. Hard light keeps the two offsets close; diffuse light lets the penumbra drift.
3. An air layer on the highest class only, so the overlay separates from everything it can cover.

Hue: a neutral shadow over a tinted canvas reads as grey dirt. Shift each layer's hue toward the hue of the surface it falls on, keeping it darker and slightly more saturated than that ground, because real ground light is bounced back into the shadow. One shadow colour used over two different canvases is one shadow lying about the ground on at least one of them.

Hardness lives in a ratio, not a pixel count: offset divided by blur. Record that ratio per light source and let every shadow derive its own offsets from it, so the whole page moves together when you find the right light.

**Check.** Read the computed `box-shadow` list on the three highest raised elements. Pass needs: more than one layer on any element that is described as resting on the page; a monotonically larger offset-to-blur ratio between the layers; and every layer's direction in the same quadrant as the recorded light. Then sample the pixels just below one element's bottom edge and just above its top edge: if the shadow's hue equals the canvas's hue exactly, it is grey, not a shadow of this canvas.

## Why the same recipe dies on a dark ground

A dark shadow on a dark surface encodes nothing: there is no headroom left to darken, so the elevation disappears while the CSS still says it is there. On a dark ground, separation comes from light entering, not light failing to reach, and the three replacements are: a brightened top edge (an inner highlight on the edge facing the recorded light), a faint inner glow that lifts the whole face, and a hairline one step lighter than the surface rather than darker than the ground.

Pick by the same inventory as before: a fired or glazed edge catches a bright rim; a matte or flocked surface only lifts; a drawn or incised boundary gets the light hairline. Keep the outer shadow too, at reduced strength, because on a dark ground a raised object still removes light from what is underneath — it just cannot do it alone.

**Check.** Screenshot a raised element sitting on the darkest surface on the page, settled. Compare the mean luminance of the row of pixels along its top edge against the face's interior: a brightened edge needs a visible step. If that delta is at measurement noise and every `box-shadow` layer is darker than the surface itself, the element has no elevation and the page only thinks it does.

## Hairlines on a real display

One CSS pixel is not one device pixel. On a display at two or three times density, a 1px border is drawn as a soft two- or three-device-pixel line and reads as a smudge on small controls; on a low-DPI screen the same declaration at fractional width snaps to nothing and the boundary vanishes. Two treatments, and you have to say which one a given line is:

- **A device hairline**, for edges that must read as one crisp pixel — dividers inside data views, table rules, a plate's inner edge. Declare it at half a CSS pixel or draw it as a pseudo-element scaled by density, and re-declare it inside a `min-resolution` query so it stays exactly one device pixel as density changes.
- **An ink rule**, for boundaries the material draws rather than lights — a printed sheet, a manuscript, an engraving. One full CSS pixel at a strength set against its own ground.

The strength is the part that goes wrong globally. A single `--border` token at low alpha is invisible on a dark ground and a visible smear on a light one, because the eye reads a boundary as a contrast step, not as an alpha value. Derive the strength from the ground it sits on, and store it per ground, not per component.

**Check.** Multiply each element's computed `border-width` by `devicePixelRatio` and report the pair. A line claimed as a device hairline whose product is not one is two. Then find a boundary colour token used on both light and dark surfaces and measure the contrast step across the boundary on each ground in the screenshot; a step below the point where a reader still sees an edge on one of them means one shared token is doing two jobs it cannot both do.

## Grain, noise and dither

Grain is the cheapest way to make a flat page feel like a material and the cheapest way to make it look dirty. Rules that hold for any field:

- Use a luminance-only grain — the same offset in all three channels. Colour noise is a compression artifact, and no material has it.
- Grain belongs to a surface, not to a document. It goes on the canvas and on panels made of the same stuff, and never on a card that is supposed to lift off the page, where it eats the shadow.
- Keep it out of anything the reader decodes: type, data, code, chart marks. If text sits on the texture, the texture is now part of the contrast computation.
- Amount: the ceiling is set by the structure, not by a taste threshold. Texture variation inside a plain surface region must stay well under the luminance difference between two adjacent elevation layers, or the grain is louder than the layout it is supposed to be inside of.
- Banding on any broad tonal ramp deserves a dither at the same time the ramp gets a grain; a smooth gradient across a textured page is the one place the two must meet.

**Check.** Sample two regions of the built page at the same nominal colour: a plain textured surface, and a control region with the texture disabled or absent. Report per-channel standard deviation of each. Fail on: texture present at variance near zero (flattened by the pipeline, so it was never applied), texture variance at or above the luminance delta between adjacent elevation layers (dirty), non-zero chroma variance where luminance variance is not equal across channels (colour noise), or texture visible inside a text block's bounding box. For a banding check, take the max luminance step between adjacent rows across a ramp region; a step larger than the grain's own standard deviation means the ramp is banding and the grain is not hiding it.

## Inner highlight and inset edge pairing

The outer shadow and the inner edge are one decision, and pages routinely do half of it. A raised object has an inner highlight on the edge facing the light and a soft inner shade on the opposite edge. A sunk object inverts both: shade inside at the top, light inside at the bottom. Both inner layers are one step, not a scale, and they follow the light source recorded above.

Two errors to look for: an element carrying both an outer drop shadow and an inset top shade, which reads as a hole with a lid on it; and a raised element with no inner edge at all, which reads as a flat shape with a smudge under it, and is what most generated output ships.

**Check.** For each surface class, read the computed `box-shadow` and split the layers into inset and non-inset. Pass: an element described as raised has non-inset layers and a lighter-than-face inset layer on the light side; an element described as sunk has inset layers and no drop; no element has both a strong drop and a strong inset shade. Report any class with more than one inset shade layer or with none of the required edge.

## Cost

Every texture, filter, and blur is a paint cost and some of them are per-pixel costs on the scroll path. Keep the number of distinct surface classes small enough to name in `DESIGN.md`, cap noise and blur off on low-power tiers, and make sure the page passes the checks in [visual review](visual-review.md) with the surface treatment removed — grayscale, no filters. If removing texture removes the hierarchy, the texture was carrying structure that needs a real separator. For the press and hover treatment of these same surfaces, see [interaction states](interaction-states.md); for which parts a surface is allowed to hold, see [component anatomy](component-anatomy.md).
