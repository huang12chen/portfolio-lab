<p align="center"><strong>中文</strong> · <a href="README.en.md">English</a></p>

<h1 align="center">作品集 UI 设计</h1>

<p align="center">根据简历和作品，制作适合自己的作品集网站。</p>

<p align="center">
  <a href="https://github.com/huang12chen/portfolio-ui-design/actions/workflows/ci.yml"><img src="https://github.com/huang12chen/portfolio-ui-design/actions/workflows/ci.yml/badge.svg" alt="构建检查"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-24292f.svg" alt="MIT 许可"></a>
</p>

<p align="center">
  <a href="#安装">安装</a> ·
  <a href="#网站示例">网站示例</a> ·
  <a href="#自检">自检</a> ·
  <a href="docs/deploy.zh-CN.md">部署</a> ·
  <a href="docs/faq.md">常见问题</a>
</p>

把简历、作品和目标岗位交给 Codex、Claude Code 或 Cursor，使用 [portfolio-website](skills/portfolio-website/SKILL.md) 整理案例、写清个人贡献，再设计并实现网站。风格和项目数量按你的材料来定。附可运行的中英文示例、网站源码及修改和部署说明。

![作品分类切换与卡片展开](docs/media/gallery.gif)

[观看完整演示，约 36 秒](docs/media/portfolio-demo.mp4)

上面两段录像摄于示例站重建之前，界面与现在不同，仅作留存。当前版本的真实界面见下方[网站示例](#网站示例)的截图。

## 安装

在支持 Skills 的编码工具中使用，例如 Codex、Claude Code 或 Cursor。可以直接把下面这段话发给它：

```text
请从下面的地址安装 portfolio-website 这个 Skill：
https://github.com/huang12chen/portfolio-ui-design/tree/main/skills/portfolio-website
安装到当前项目的技能目录，保留已有修改。装好后确认工具能找到它，先不要开始制作网站。
```

会使用终端的话，也可以在自己的项目目录运行下面这条命令，按提示选择工具。需要 [Node.js 22.20+](https://github.com/vercel-labs/skills#install-a-skill)：

```sh
npx skills add huang12chen/portfolio-ui-design --skill portfolio-website
```

默认只在当前项目使用；加上 `-g` 可安装到用户目录，供多个项目使用。手动安装、装好后的确认和更新都在[安装指南](docs/install.md)。

## 制作自己的作品集

发送简历、作品和目标读者，再提出需求，例如：

> 使用 portfolio-website 这个 Skill。我想制作求职作品集，这是我的简历和作品。请先挑选展示内容，写清每个项目里我做了什么，再设计并实现网站。做完给我预览地址，检查手机排版和主要按钮。

Codex 中可以直接输入 `$portfolio-website`，Claude Code 中使用 `/portfolio-website`。[更多用法](docs/examples.md)

除了内容上的把关，它也负责把页面做成一个有方向的设计。方向不是挑一套模板：先从你已有的材料里量出可读的东西——作品本身的宽高比、材料里真实出现的颜色、信息的层级与密度——再据此决定版式、字阶、留白和控件几何。参考网站会被真的打开，研究到具体的页面和交互，而不是记下一个名字。做完之后每一项都要在浏览器里量一遍，包括中文的字距、焦点环，以及 390 宽度下有没有横向溢出。

动效同样是被推导出来的，不是必选项。只有当材料本身带有静态排版表达不了的维度——顺序、时长、厚度、距离、状态——才做视差或滚动叙事，而且一页只允许一个招牌动作：第二个不再是论点，只是装饰。每一个被动的对象都要能追溯到内容的某个属性；减弱动效是拆解而不是遮掩，静止状态仍要通过同样的检查；关掉 JavaScript，页面还得把话说完。

## 网站示例

同一份虚构简历在这一个站点里有两种读法：首页的卡片索引，以及用 `project.html?id=…` 单独打开的一个案例。

| 卡片索引 | 已下线的滚动版 |
| --- | --- |
| ![首页卡片索引](docs/screenshots/home-desktop.png) | ![当前站点不再提供的连续滚动页](docs/screenshots/story-desktop.png) |

示例人物 Alex Lin、任职经历和业务数据均为虚构。站点不引用照片、网络字体或第三方脚本，每个文件的来源与许可见[素材说明](examples/alex-lin/dist/ASSETS.md)。

![已下线的滚动版录屏，仅作留存](docs/media/story.gif)

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

[下载源码 ZIP](https://github.com/huang12chen/portfolio-ui-design/archive/refs/heads/main.zip)，解压后打开 `portfolio-ui-design-main` 文件夹，在其中运行下面的命令。示例需要 Node.js 22+，不用先执行 npm install。

```sh
npm run dev
```

打开[卡片索引](http://localhost:4180/index.html)，或用 `project.html?id=…` 单独打开一个案例，例如 [Signal 案例](http://localhost:4180/project.html?id=signal)，另外两个是 `briefly` 和 `fieldwork`。中文是 [`/zh/`](http://localhost:4180/zh/index.html) 下同一套三个页面的另一份静态文件，所以右上角的语言切换只是一个链接，关掉 JavaScript 两种语言都照样能读；过去的 `?lang=zh` 链接仍然打得开，会跳转到对应目录。Ctrl+C 停止服务。

## 修改和部署

示例网站在 `examples/alex-lin/dist/`：

- `data.js`：项目介绍和中英文内容。
- `app.js`：页面结构。
- `demos.js`、`demos-brief.js`：Signal 与 Briefly 两个演示各自的交互逻辑；渲染拆在 `demo-views.js`、`brief-views.js`，共用部分在 `demo-core.js`。

使用自己的资料时，替换示例履历、项目和数据。换一个行业，也可以让 Skill 重新安排页面，不必保留 Alex 的职业和风格。

脚本与样式都在本地，站点不下载字体、图片或第三方脚本，文字用系统字体回退栈渲染。可以放到普通静态托管平台，也可以用自己的服务器。[部署说明](docs/deploy.zh-CN.md)

## 自检

做完之后不靠肉眼宣布通过。仓库自带一个检查器，示例站就是它的被测对象：

```sh
npm run audit          # 25 条不需要浏览器的规则：结构、打包、链接、语言目录、体积
npm run audit:browser  # 再加 13 条：在 1440 / 768 / 390 真实渲染后量版式、对比度、遮挡与状态
npm run audit:craft    # 再加 8 条质感探针：基线漂移、字号层级、表格裁切、阴影结构、状态矩阵、按压位移、可访问名称
```

装好 Skill 之后，同一套检查在技能目录里用一条命令跑，检查你自己的构建产物：

```sh
node scripts/selfcheck.mjs <构建产物目录>
```

退出码固定三种：`0` 量到了且干净，`1` 量到了但有缺陷，`2` 没量成。这个区分是重点——某个维度够不着时，它打印 `NOT-MEASURED` 并把原因写在旁边，不会把「零次测量」当成通过。`--static-only` 跳过浏览器，`--map` 列出每条规则对应哪一行参考文档（这张表由检查器自己给出，规则挪走时引用跟着走），`--json` 输出完整报告。

所以一份报告只有三种读法：`PASS` 是量过了没发现问题，`FAIL` 是量出了问题，`NOT-MEASURED` 是仪器够不着。三者都不等于「设计好看」，也都不代替你自己看一遍。

## 文档与开发

[使用示例](docs/examples.md) · [教学提纲](docs/recording-guide.md) · [录屏](docs/recordings.md) · [发布包](docs/packages.zh-CN.md) · [公开前的资料检查](docs/privacy.md)

```sh
npm test
npm run check
npm run release
```

欢迎提交问题或改进，见[贡献指南](CONTRIBUTING.md)。原创代码、Skill 和文档使用 [MIT 许可](LICENSE)；当前版本不含第三方素材，早期版本附带过的字体、照片与动画库的许可见[第三方说明](THIRD_PARTY_NOTICES.md)。
