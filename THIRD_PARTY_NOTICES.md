# Third-party notices

The current release ships no third-party code, fonts, photographs or bundled libraries. The example site has no npm dependencies, downloads nothing at runtime, and draws every visual with CSS and inline SVG. Its only image file is a hand-drawn favicon. See `examples/alex-lin/dist/ASSETS.md` for the file-by-file register.

Type is set in operating-system fallback stacks. Naming a family such as `'Noto Serif SC'` inside a CSS `font-family` list asks the browser to use it when the reader's own machine already has it installed; no font file is copied, subset or redistributed here, so no font licence obligation attaches to this repository.

## Earlier releases

Versions up to and including 1.2.0 did carry three third-party items in the example site:

- Motion 14.6.0 (`vendor/`), MIT, with its licence file.
- A 10,908-byte subset of Noto Serif SC 500 (`assets/fonts/`), SIL Open Font License 1.1, with its `OFL.txt`.
- Two stock photographs (`assets/photos/`), used illustratively under their own Unsplash terms.

All three were removed when the case visuals became CSS drawings and the motion layer became the browser's own scroll-driven animations. If you are holding a 1.2.0 or earlier archive, the terms above applied to that archive; they do not apply to the current tree, which no longer contains those files.

Interface drawings, synthetic datasets and fictional case copy in this project are original teaching materials under the root MIT licence. No real brand endorsement or employment history is asserted.
