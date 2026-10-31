# Reference research

A reference you only heard of cannot change a design. A site's name, a screenshot inside an article, an HTTP 200, its marketing copy, or a package that installed cleanly are evidence that it exists, not that you understood it. Research depth serves a design question; it is not unlimited crawling.

## Follow the chain to what decides

| You started from | What actually matters | A useful stopping point |
| --- | --- | --- |
| An article or roundup list | The body's substantive links, then the specific site | You can say how this reference changes this page and how to check the adaptation |
| An inspiration gallery | Category → the case → the original site, not the gallery thumbnail | You inspected the real layout at your target width and exercised any behavior being borrowed |
| A component library | The component's preview, parameters, implementation, and conditions | You know its triggers, states, dependencies, fallback, and adaptation cost |
| An animation or effect write-up | The running demo, not the install command | You observed enter, progress, exit, reset, and the reduced-motion path |
| A screenshot the user sent | What is visible in that frame | You did not claim unseen motion, unseen lower sections, or a complete flow |

Login pages, paywalls, and empty shells that return 200 are not case content. A showcase video demonstrates its own recording, not your interaction with the product. When a source fails, record it as `blocked` with the routes you attempted, then continue independent work; raising a status is not a remedy.

Ordinary portfolio work needs two or three references that shape the build. If the user asks for every entry in a list to be covered, deduplicate the substantive links and state each one's reached depth and limits, excluding unrelated navigation, ads, accounts, and sharing. Never generalize a few deep inspections to the rest of an inventory.

## Start from the uncertainty, not the bookmark

A named site is not a research plan. Pick the reference by the design question that is currently unresolved, because a source that answers a question nobody is asking costs build time and changes nothing.

| Unresolved | Look at | Reach, and compare |
| --- | --- | --- |
| What the reader should do, and in what order | Real-product interface libraries and flow recordings | One specific screen: its purpose, the context it needs, its states, and what is optional depth |
| What composition this material wants | Portfolio and single-page galleries, then the individual site you picked from them | First screen, the next informative section, navigation, and the cost of exploring |
| Why someone else's type holds together | Type-pairing indexes and foundry specimens | A specific pairing in a live context, real copy at real sizes, script coverage, weights, licence |
| Which interaction belongs here | Component libraries and motion galleries | Trigger, before and after, return, focus, touch, reduced motion, dependency, fallback |
| Which assets are honest | Icon sets, illustration collections, photography | One specific family or image, its composition, and its usage terms |
| How choices become one system | Brand and design-language documentation | Semantic roles, graded values, contrast, type hierarchy, and component states across several real pages |

Routes, not a required stack, and not a list to revisit in full for every project.

## A recipe is not research

Effect galleries and prompt collections publish finished instructions. Reading one tells you what its author made; it does not tell you what the mechanism does to a reader, and pasting it yields their site — the same easing, the same skeleton, the same three sections in the same order. Open the running example instead, record the trigger, the property that changes, the return, and the fallback, then write your own specification against this material. The same holds for an installed component's default: a preset carries its author's padding, radii, and timing, all of which belong to a different project.

## Record a number, not an impression

Where behaviour is what you borrowed, measure it. *The wheel moved the page from 0 to 1800px and exposed two more rows.* *Hovering grew the icon from 50px to about 70px and restored on leave.* *Escape took the dialog count from 1 to 0.* *Enter dismissed the intro and changed the audio control.* A number is re-checkable next month, it cannot be flattered by the fact that you liked the site, and it tells whoever reads the record exactly what was exercised. "Smooth scrolling" and "nice hover" describe a mood and prove nothing was touched.

## Record the depth you actually reached

Use one word per reference in `DESIGN.md`, and let the surrounding sentence carry the observation:

- `discovered` — you know it exists.
- `text-read` — you read the relevant body of an article or documentation.
- `visual-inspected` — you saw the running page, or an honest screenshot of it, at a real width.
- `interaction-tested` — you triggered the behavior and observed before, during, and after, including its touch or keyboard alternative.
- `integrated` — you implemented it in this project and verified it in the running result.
- `blocked` — unreachable, with the reason and the routes attempted.

A search result or a fetched page is a retrieval record and cannot raise one of these statuses by itself.

Keep project evidence — the person's material, screenshots, and reference notes — inside that project. It does not belong in shared skill state or in a public example, and other people's articles and images do not become distributable assets because they were useful.

Then write the three-part line, which is what makes a reference usable after the build:

- **Observation** — what the reference does, named as a mechanism. *The title column and the body column use different widths, and the space is organized around the reading path.*
- **Adaptation** — what this site does instead. *A centered reading column with left-aligned long text; artifacts laid out at their own proportions.*
- **Check** — how you will know it worked. *Balanced outer space at 1440, useful line length at 390, titles still scannable.*

Unsupported adjectives — premium, polished, high-end, 高级感 — are not observations. They name an intensity, and cannot be checked or handed over.

## Do not gate evidence behind an effect

Whatever is borrowed, the reader's access to the work must not depend on the presentation succeeding.

- Essential content stays reachable by ordinary scrolling. Do not hijack the wheel to advance a story a reader should be able to skim.
- Nothing that must be seen is available only on hover; touch and keyboard readers need the same information by default.
- No evidence appears only at a precise point in an animation, and none disappears when the animation is skipped, the script fails, or media does not load.
- A shared-element or page transition never duplicates navigation or leaves ghost text behind. Check fixed navigation, font loading, and native Back; if the effect is unreliable, keep plain navigation.

These are the failure modes that separate a technically accomplished portfolio from a usable one, and they are invisible in a screenshot taken in the middle of an effect.
