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
