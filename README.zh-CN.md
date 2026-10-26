<p align="center">
  <a href="README.md" title="简体中文"><img src="docs/images/chinese-active.svg" alt="简体中文（当前）" width="112" height="44"></a>
  &nbsp;
  <a href="README.en.md" title="English"><img src="docs/images/english.svg" alt="English" width="96" height="44"></a>
</p>

# Portfolio Lab

根据简历和作品制作个人作品集的 Skill，附一个中英文网站示例。

把简历、作品和目标岗位交给编码工具，使用 [portfolio-website](skills/portfolio-website/SKILL.md) 整理案例、写清个人贡献，再设计并实现网站。风格和项目数量按你的材料来定。交付内容包括网站源码、可运行的预览，以及替换内容和部署的说明。

[安装指南](docs/install.md) · [常见问题](docs/faq.md)

![作品分类切换与卡片展开](docs/media/gallery.gif)

[观看完整演示，约 36 秒](docs/media/portfolio-demo.mp4)

## 安装

在支持 Skills 的编码工具中使用，例如 Codex、Claude Code 或 Cursor。可以直接把下面这段话发给它：

```text
请从下面的地址安装 portfolio-website 这个 Skill：
https://github.com/huang12chen/portfolio-lab/tree/main/skills/portfolio-website
安装到当前项目的技能目录，保留已有修改。装好后确认工具能找到它，先不要开始制作网站。
```

会使用终端的话，也可以在自己的项目目录运行下面这条命令，按提示选择工具。需要 [Node.js 22.20+](https://github.com/vercel-labs/skills#install-a-skill)：

```sh
npx skills add huang12chen/portfolio-lab --skill portfolio-website
```

默认只在当前项目使用；加上 `-g` 可安装到用户目录，供多个项目使用。手动安装、装好后的确认和更新都在[安装指南](docs/install.md)。

## 制作自己的作品集

发送简历、作品和目标读者，再提出需求，例如：

> 使用 portfolio-website 这个 Skill。我想制作求职作品集，这是我的简历和作品。请先挑选展示内容，写清每个项目里我做了什么，再设计并实现网站。做完给我预览地址，检查手机排版和主要按钮。

Codex 中可以直接输入 `$portfolio-website`，Claude Code 中使用 `/portfolio-website`。[更多用法](docs/examples.md)

## 网站示例

同一份虚构简历做了两个版本，可以比较不同的浏览方式。

| 卡片版 | 连续滚动版 |
| --- | --- |
| ![卡片版首页](docs/screenshots/home-desktop.png) | ![连续滚动版首页](docs/screenshots/story-desktop.png) |

示例人物 Alex Lin、任职经历和业务数据均为虚构。照片来源见[素材说明](examples/alex-lin/dist/ASSETS.md)。

![连续滚动版演示](docs/media/story.gif)

三个项目里有这些可以操作的内容：

- **Signal**：按国家和时间筛选电商看板，调整预算，导出 CSV。使用示例数据。
- **Briefly**：填写商品信息，选择语气与时长，生成、复制或下载内容简报。使用浏览器本地模板。
- **Fieldwork**：比较三个产品方案，查看选择其中一个的理由。

| Signal 看板 | Briefly 简报 |
| --- | --- |
| ![Signal 看板](docs/screenshots/growth-demo.png) | ![Briefly 简报](docs/screenshots/brief-demo.png) |

<details>
<summary>手机与 About 页面</summary>

![手机首页](docs/screenshots/home-mobile.png)

![About 页面](docs/screenshots/about-desktop.png)

</details>

## 本地运行

[下载源码 ZIP](https://github.com/huang12chen/portfolio-lab/archive/refs/heads/main.zip)，解压后打开 `portfolio-lab-main` 文件夹，在其中运行下面的命令。示例需要 Node.js 22+，不用先执行 npm install。

```sh
npm run dev
```

打开[卡片版](http://localhost:4180/index.html?lang=zh)或[滚动版](http://localhost:4180/story.html?lang=zh)。页面右上角可以切换语言，Ctrl+C 停止服务。

## 修改和部署

示例网站在 `examples/alex-lin/dist/`：

- `data.js`：项目介绍和中英文内容。
- `app.js`：页面结构。
- `demos.js`：三个项目的演示逻辑。

使用自己的资料时，替换示例履历、项目和数据。换一个行业，也可以让 Skill 重新安排页面，不必保留 Alex 的职业和风格。

图片、字体和脚本都随网站保存。可以放到普通静态托管平台，也可以用自己的服务器。[部署说明](docs/deploy.zh-CN.md)

## 文档与开发

[使用示例](docs/examples.md) · [教学提纲](docs/recording-guide.md) · [录屏](docs/recordings.md) · [发布包](docs/packages.zh-CN.md) · [公开前的资料检查](docs/privacy.md)

```sh
npm test
npm run check
npm run release
```

欢迎提交问题或改进，见[贡献指南](CONTRIBUTING.md)。原创代码、Skill 和文档使用 [MIT 许可](LICENSE)；照片、字体与动画库的许可见[第三方说明](THIRD_PARTY_NOTICES.md)。
