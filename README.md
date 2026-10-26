# Portfolio Lab

A portfolio Skill, with a bilingual website example you can run.

Give your coding agent a résumé, work samples, and the role you want. [bespoke-portfolio](skills/bespoke-portfolio/SKILL.md) helps it choose the work to show, explain your contribution, and build the site. The style and project count follow your material.

[简体中文](README.zh-CN.md) · [Getting started](docs/QUICK_START.md) · [Installation](docs/INSTALLATION.md) · [Troubleshooting](docs/TROUBLESHOOTING.md)

![Switching project categories and expanding a card](docs/media/gallery.gif)

[Watch the full demo, about 36 seconds](docs/media/portfolio-demo.mp4)

## Install and use

Use a coding agent that supports Skills. Installation through the [Skills CLI](https://github.com/vercel-labs/skills) needs Node.js 22.20+:

```sh
npx skills add huang12chen/portfolio-lab --skill bespoke-portfolio
```

The CLI asks which agent to install to. If you have downloaded the source, you can copy the complete Skill folder instead; see [installation](docs/INSTALLATION.md). To let your agent handle setup, give it the repository URL or folder and [this prompt](docs/QUICK_START.md#portfolio).

Then send your materials with a request such as:

> Use $bespoke-portfolio. Here are my résumé and work samples. Build a portfolio for the role I am applying for. Choose the projects to show, explain what I did, and design the site around that work. Open the specific pages in my references. Give me a preview and check the mobile layout and main controls.

[More examples](docs/USAGE.md)

## Example website

The same fictional résumé is presented in two versions so you can compare how they work.

| Gallery | Continuous scroll |
| --- | --- |
| ![Gallery home](docs/screenshots/home-desktop.png) | ![Continuous-scroll home](docs/screenshots/story-desktop.png) |

Alex Lin, the employment history, and the business data are fictional. Photo sources are listed in the [asset notes](examples/alex-lin/dist/ASSETS.md).

![Continuous-scroll demo](docs/media/story.gif)

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

Download or clone the source and run this from the repository root. You need Node.js 22+; there is no npm install step.

```sh
npm run dev
```

Open the [gallery](http://localhost:4180/index.html?lang=en) or [scroll version](http://localhost:4180/story.html?lang=en). Use the language control at the top right to switch languages. Ctrl+C stops the server.

## Edit and deploy

The example lives in `examples/alex-lin/dist/`:

- `data.js`: project descriptions and bilingual content.
- `app.js`: page structure.
- `demos.js`: project demo behavior.

Replace the sample career, projects, and numbers with your own material. For a different profession, ask the Skill to reconsider the pages as well as the writing; you do not need to keep Alex's role or style.

Images, fonts, and scripts are included locally. The site can use a static hosting provider or your own server. [Deployment guide](docs/DEPLOYMENT.md)

## Docs and development

[Usage examples](docs/USAGE.md) · [Teaching outline](docs/TEACHING.md) · [Recordings](docs/MEDIA.md) · [Release packages](docs/RELEASE.md) · [Reviewing files before sharing](docs/SHARING.md)

```sh
npm test
npm run check
npm run release
```

Questions and improvements are welcome; see [Contributing](CONTRIBUTING.md). Original code, Skill, and documentation use the [MIT license](LICENSE). Photo, font, and animation-library licenses are listed in [third-party notices](THIRD_PARTY_NOTICES.md).
