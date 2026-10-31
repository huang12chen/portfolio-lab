---
name: portfolio-website
description: Build or redesign a personal portfolio, job-hunting site, or résumé/CV as a website with an explicit visual direction, evidence-accurate cases, and browser-verified polish. Use when the user mentions a résumé, CV, 简历, 作品集, portfolio site, personal website, or asks how to present past work, projects, or a career to a hiring reader, including improving an existing portfolio and including cases where the user never names a skill. Also supports explicitly authorized fictional teaching examples.
---

# Portfolio UI Design

Build a portfolio that helps its intended reader understand what a person can do, what they did, their contribution, and the evidence. Let the material and reader shape the story, visual direction, media, and navigation.

[完整中文指南](references/zh-CN/overview.md)

## Start with the person and the material

Use the supplied résumé, work, links, images, video, and feedback. Extract the purpose, audience, strengths, responsibilities, available material, publication scope, and maintenance constraints. Reuse confirmed information and authorization; leave identity or contact fields empty when requested. Ask only for gaps that change the result, and continue independent work.

Read [intake and evidence](references/content.md) when organizing claims or uncertain contributions. Separate original material, edited copy, and design assumptions. A résumé copied into web sections is not a complete portfolio.

Real-person portfolios use supported facts. For an explicitly authorized fictional teaching example, interactive demonstration, or public sample package, read [fictional demos and release](references/demo-projects.md). Keep invented identities, employment, metrics, and research labeled and separate from real-person claims.

## Shape the reading path

Use [adaptive structure](references/structure.md) to choose curation, project depth, and a useful index. Project count, profession, and material vary; do not impose three projects or a signature color palette.

Give the first screen a clear position and useful overview. Use concrete project names. Let one meaningful selection open a full case with its core material visible; image enlargement and supplementary documents can be optional. Explain context, individual role, work, decisions, results, and limits in an order appropriate to the evidence, rather than filling a rigid case-study template.

Write or update a proportionate `DESIGN.md`. When a reference shapes the design, read [reference research](references/reference-research.md): follow the chain to the specific site or component, record the depth actually reached, and state the observation, the adaptation, and the check. Everything the work needs is in this Skill and is read on demand.

## Choose a visual direction

Restraint is not a direction. Read [visual direction](references/visual-direction.md) and derive the form from the material: the reader's task, the visual objects the work already contains, the evidence shape of the field, and the maintenance the person will actually keep. Record a three-sentence direction statement, then apply the swap test — if it would still describe a different person's site, keep working before building.

Type, colour, spacing, motion, and media follow from that statement. Not from a range: [visual direction](references/visual-direction.md) explains why a range only constrains and never generates, and lists the properties to measure off the real files first — aspect ratio, the hue sampled from a named spot in the material, how many levels its structure has, whether it is dense or sparse, sequential or spatial. A dense reporting page and an editorial argument need different scales, and one person's palette must not become everyone's.

With the direction chosen, read [surface, light and depth](references/surfaces.md): record where the light is and how hard, take the number of surface layers from how many separations the material's own object has, then pick the separator for each boundary — tone shift, shadow, hairline, or blur. The ceramicist's stacked tile, the engineer's diagram on one plane, and the restorer's board-leather-spine are three different answers, and a page that reaches the same one for all three was never derived.

Then read [spatial construction](references/spatial-construction.md): name the depth tiers and what is allowed on each, take the overlap count from whether the material's object is annotated on itself, physically stacked, or a before/after pair, set a budget for how many times the grid gets broken, and spend one vertical gap on the page much larger than all the others. A stack of full-width blocks in a good palette is still a stack.

## Present the work and implement

Read [media and navigation](references/images-and-links.md) for images, documents, code, and the reader's route. Read [typographic execution](references/typography-execution.md) once the scale exists: figure mode per place a number is read, digits justified by their basis, `balance` scoped to headings, and an optical rather than geometric column edge — a page can pass every scale rule and still look un-set. Read [depth and spectacle](references/scroll-depth.md) before adding parallax, scroll-linked motion, or three dimensions — the gate is whether the material has sequence, scale, thickness, or state that a still layout cannot show. Read [component anatomy](references/component-anatomy.md) before laying out any repeated component, [motion choreography](references/motion-choreography.md) before shipping any transition that is not the showpiece — duration from displacement, easing as a claim about physics, stagger only where sequence is the argument, and a reduced-motion branch that keeps the information — and [interaction states](references/interaction-states.md) before shipping: a state nothing on the page can reach was not designed, and a missing part reads as half-built at any radius. Read [responsive construction](references/responsive-construction.md) before writing any media query: rank the content by what the reader needs, name the relationships that must survive reflow, decide per table whether the argument is columnar or row-wise, and never hide an overflow instead of fixing the object that causes it. Use [portfolio refinements](references/review.md) when improving an existing portfolio. Read the references needed for the task rather than loading the whole collection.

Show representative work, screenshots, excerpts, code, or methods directly. Respect image proportions and composition; keep long text readable and metrics adjacent to their definition and evidence. Organize the material available now without inventing empty future slots. Choose motion for a useful purpose, with stable hit areas and touch and keyboard alternatives.

## Verify and hand over

Run the site with real content. Read [reads as generated](references/reads-as-generated.md) before calling a page finished: every visible element must trace to a fact in the material or a reader task, and the finished artifact gets compared against the last build it came from — accent hue distance, colour role names, first-screen skeleton, distinct-value counts — because two people's sites looking like one person's is a failure no single reviewer can see in one page. Use [visual review](references/visual-review.md) for the rendered checks — focal weight per screen, hierarchy without colour, the font that actually renders, computed contrast, component states, and the order to fix things in — and change one thing at a time, comparing screenshots at the same widths. In a real browser, check representative desktop, tablet, and narrow layouts, including any user-reported size; exercise each media type, primary navigation, filters, Back, close actions, keyboard use, and reduced motion as applicable.

Most of these checks have an executable form. Run `node scripts/selfcheck.mjs <built-site-dir>` from this Skill's directory: it runs the structure rules first, then a real browser at three widths for layout, contrast, occlusion and the craft probes, and prints one verdict per layer. Read [self-check](references/self-check.md) for the three verdict states, the code-to-reference table, and the thirty-one Check rows that have no instrument and stay judgement. A clean run is evidence for the rules it covers and for nothing else, and a NOT-MEASURED row is a limit of the instrument — report it, never round it into a pass.

Before calling the work done, measure these six values on the rendered page and record the number you got. Each one looks finished in source and fails silently in the browser:

- the smallest rendered glyph is at least 11px **after** multiplying by the SVG screen CTM — text inside a scaled chart is not the size its attribute says;
- every in-page anchor comes to rest with its target clear of the sticky header, at every breakpoint — read the landing position, not the jump;
- `:focus-visible` reaches every interactive type, links included — Tab each one, since a rule scoped to `button` leaves anchors unringed;
- the painted family and weight match the declared stack (`CSS.getPlatformFontsForNode`), in every locale the page offers — a fallback that splits one heading across two faces reads as a bug;
- no heading, label, nav item, button, or chip ends in a sentence mark;
- every `font-size` derives from a token, and every `var()` it names is declared in a stylesheet that route loads.

If browser checks are unavailable, state the unverified scope rather than implying a pass.

Evaluate the reader's task: find relevant work, understand the contribution and evidence, and return or make contact. Fix broken routes, missing material, misleading claims, and harmful cropping. Deliver the authorized source, preview or hosting result, and maintenance guidance. Distinguish local checks from publication. Keep private résumés, media, credentials, deployment identities, and personal preferences out of shared skills and public examples.
