<p align="center"><a href="README.md">中文</a> · <strong>English</strong></p>

<h1 align="center">Portfolio UI Design</h1>

<p align="center">Build a portfolio website around your résumé and work.</p>

<p align="center">
  <a href="https://github.com/huang12chen/portfolio-ui-design/actions/workflows/ci.yml"><img src="https://github.com/huang12chen/portfolio-ui-design/actions/workflows/ci.yml/badge.svg" alt="Build checks"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-24292f.svg" alt="MIT license"></a>
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#example-website">Example website</a> ·
  <a href="#self-check">Self-check</a> ·
  <a href="docs/deploy.md">Deploy</a> ·
  <a href="docs/faq.md">Troubleshooting</a>
</p>

Give Codex, Claude Code, or Cursor your résumé, work samples, and target role. [portfolio-website](skills/portfolio-website/SKILL.md) helps it choose the work to show, explain your contribution, and build the site. The style and project count follow your material. Includes a runnable bilingual example, website source, and editing and deployment notes.

![Switching project categories and expanding a card](docs/media/gallery.gif)

[Watch the full demo, about 36 seconds](docs/media/portfolio-demo.mp4)

Both recordings were captured before the example site was rebuilt, so their interface differs from today's; they are kept for reference. For the current UI, see the screenshots under [Example website](#example-website) below.

## Install

Use a coding tool that supports Skills, such as Codex, Claude Code, or Cursor. Send it this request:

```text
Install the portfolio-website Skill from
https://github.com/huang12chen/portfolio-ui-design/tree/main/skills/portfolio-website
in this project's Skill directory. Preserve any existing local edits, confirm the Skill is discoverable, and stop after installation.
```

Or run this in your project terminal, then choose your coding tool. Requires [Node.js 22.20+](https://github.com/vercel-labs/skills#install-a-skill):

```sh
npx skills add huang12chen/portfolio-ui-design --skill portfolio-website
```

The command installs to this project by default; add `-g` to use it across projects. For manual installation, confirmation, or updates, see [the install guide](docs/install.md).

## Make your portfolio

Send your résumé, work samples, and intended audience, then ask:

> Use the portfolio-website Skill. Build a portfolio for the role I am applying for. Choose which projects to show, explain my contribution, then design and build the site. Give me a preview and check the mobile layout and main controls.

In Codex you can invoke `$portfolio-website`; in Claude Code use `/portfolio-website`. [More requests](docs/examples.md)

Alongside checking what the content is allowed to claim, it decides what the page should look like, and derives that from your material instead of picking a template: the aspect ratios your work already has, the colours that actually appear in it, the hierarchy and density of the information itself. Reference sites get opened and studied down to the specific page and interaction rather than name-dropped. Every claim about the result is then measured in a browser — Chinese letter-spacing, focus rings, and whether anything overflows at 390px.

Motion is derived the same way, and is never a requirement. Depth is only built where the material carries a dimension a still layout cannot show — an order, an elapsed duration, a thickness, a distance, a change of state — and then exactly one showpiece per page, because a second one stops being an argument and becomes decoration. Every animated object has to trace back to a property of the content; reduced motion is a teardown rather than a hiding, so the static state has to pass the same checks; and with JavaScript off the page still has to finish making its point.

## Example website

The same fictional résumé can be read two ways on one site: the card index on the home page, or a single case opened by itself through `project.html?id=…`.

| Card index | Retired scroll page |
| --- | --- |
| ![Home page card index](docs/screenshots/home-desktop.png) | ![Continuous-scroll page that the current site no longer ships](docs/screenshots/story-desktop.png) |

Alex Lin, the employment history, and the business data are fictional. The site references no photographs, webfonts, or third-party scripts; each file's origin and licence is listed in the [asset notes](examples/alex-lin/dist/ASSETS.md).

![Recording of the retired scroll page, kept for reference](docs/media/story.gif)

The three projects include these working controls:

- **Signal:** filter a commerce dashboard by country and period, change a budget scenario, and export CSV. Uses sample data.
- **Briefly:** enter product details, choose tone and duration, then build, copy, or download a content brief. Uses local browser templates.
- **Fieldwork:** compare three product proposals and read the reasons for choosing one.

| Signal dashboard | Briefly content brief |
| --- | --- |
| ![Signal dashboard](docs/screenshots/growth-demo.png) | ![Briefly content brief](docs/screenshots/brief-demo.png) |

<details>
<summary>Mobile and About pages</summary>

![Mobile home](docs/screenshots/home-mobile.png)

![About page](docs/screenshots/about-desktop.png)

</details>

## Run the example

[Download the source ZIP](https://github.com/huang12chen/portfolio-ui-design/archive/refs/heads/main.zip), unzip it, and open the `portfolio-ui-design-main` folder. Run the command below there. The example needs Node.js 22+ and has no npm dependencies.

```sh
npm run dev
```

Open the [card index](http://localhost:4180/index.html), or [one case on its own](http://localhost:4180/project.html?id=signal) — any of `signal`, `briefly`, `fieldwork` after `?id=`. Chinese is its own copy of all three pages under [`/zh/`](http://localhost:4180/zh/index.html), so the language control at the top right is one link and both languages read with JavaScript switched off; an older `?lang=zh` link still works and redirects. Ctrl+C stops the server.

## Edit and deploy

The example lives in `examples/alex-lin/dist/`:

- `data.js`: project descriptions and bilingual content.
- `app.js`: page structure.
- `demos.js`, `demos-brief.js`: interaction logic for the Signal and Briefly demos; their renderers sit in `demo-views.js` and `brief-views.js`, with shared helpers in `demo-core.js`.

Replace the sample career, projects, and numbers with your own material. For a different profession, ask the Skill to reconsider the pages as well as the writing; you do not need to keep Alex's role or style.

Scripts and styles are all local; the site downloads no webfonts, images, or third-party scripts, and text renders in operating-system fallback stacks. The site can use a static hosting provider or your own server. [Deployment guide](docs/deploy.md)

## Self-check

A finished page should not have to be declared correct by eye. The repository ships an auditor, and the example site is its test subject:

```sh
npm run audit          # 25 rules that need no browser: structure, packaging, links, locale, budget
npm run audit:browser  # + 13 rules measured in a real browser at 1440 / 768 / 390: layout, contrast, occlusion, states
npm run audit:craft    # + 8 craft probes: baseline drift, type hierarchy, table cropping, shadow structure, state matrix, press displacement, accessible names
```

Once the Skill is installed, the same checks run from its own directory against your build:

```sh
node scripts/selfcheck.mjs <built-site-dir>
```

The exit code has exactly three meanings: 0 measured and clean, 1 measured and defective, 2 could not measure. That distinction is the point — when a dimension is out of reach the report prints `NOT-MEASURED` with the reason beside it, instead of reading zero measurements as a pass. `--static-only` skips the browser, `--map` lists which reference line states each rule (the checker emits that table, so a rule that moves takes its citation with it), and `--json` prints the full report.

So a report can only be read three ways: `PASS` means it was measured and nothing was found, `FAIL` means it was measured and something was found, `NOT-MEASURED` means the instrument could not reach it. None of the three means the design looks good, and none replaces looking at it yourself.

## Docs and development

[Usage examples](docs/examples.md) · [Teaching outline](docs/recording-guide.md) · [Recordings](docs/recordings.md) · [Release packages](docs/packages.md) · [Reviewing files before sharing](docs/privacy.md)

```sh
npm test
npm run check
npm run release
```

Questions and improvements are welcome; see [Contributing](CONTRIBUTING.md). Original code, Skill, and documentation use the [MIT license](LICENSE). The current release carries no third-party assets; licenses for the fonts, photographs, and animation library that earlier releases bundled are listed in [third-party notices](THIRD_PARTY_NOTICES.md).
