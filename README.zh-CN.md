# Portfolio Lab

根据简历和作品制作个人作品集的 Skill，附一个中英文网站示例。

把简历、作品和目标岗位交给编码工具，使用 [bespoke-portfolio](skills/bespoke-portfolio/SKILL.md) 整理案例、写清个人贡献，再设计并实现网站。风格和项目数量按你的材料来定。

[English](README.md) · [第一次使用](docs/QUICK_START.md) · [安装说明](docs/INSTALLATION.md) · [常见问题](docs/TROUBLESHOOTING.md)

![作品分类切换与卡片展开](docs/media/gallery.gif)

[观看完整演示，约 36 秒](docs/media/portfolio-demo.mp4)

## 安装和使用

在支持 Skill 的编码工具中使用。通过 [Skills CLI](https://github.com/vercel-labs/skills) 安装，需要 Node.js 22.20+：

```sh
npx skills add huang12chen/portfolio-lab --skill bespoke-portfolio
```

CLI 会让你选择安装到哪个工具。已下载源码时，也可以直接复制完整的 Skill 文件夹，见[安装说明](docs/INSTALLATION.md)。想让 AI 帮你处理安装，就把仓库地址或文件夹交给它，使用[这段提示词](docs/QUICK_START.md#portfolio)。

装好后，把自己的材料发过去，例如：

> 使用 $bespoke-portfolio。这是我的简历和作品，请帮我制作求职作品集。先挑选值得展示的项目，写清我做了什么，再根据目标岗位设计网站。参考链接请进入具体页面查看。做完后给我预览地址，并检查手机排版和主要按钮。

[更多使用示例](docs/USAGE.md)

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

下载或克隆源码，在仓库根目录运行。需要 Node.js 22+，不用先执行 npm install。

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

图片、字体和脚本都随网站保存。可以放到普通静态托管平台，也可以用自己的服务器。[部署说明](docs/DEPLOYMENT.zh-CN.md)

## 文档与开发

[使用示例](docs/USAGE.md) · [教学提纲](docs/TEACHING.md) · [录屏](docs/MEDIA.md) · [发布包](docs/RELEASE.zh-CN.md) · [公开前的资料检查](docs/SHARING.md)

```sh
npm test
npm run check
npm run release
```

欢迎提交问题或改进，见[贡献指南](CONTRIBUTING.md)。原创代码、Skill 和文档使用 [MIT 许可](LICENSE)；照片、字体与动画库的许可见[第三方说明](THIRD_PARTY_NOTICES.md)。
