# Troubleshooting and FAQ / 常见问题

[Start here / 从这里开始](QUICK_START.md) · [Installation / 安装](INSTALLATION.md) · [English README](../README.md) · [中文说明](../README.zh-CN.md)

## Is this a template or a website generator?

The Skill contains instructions and references for a coding agent. The Alex website is a runnable example included alongside it. Using a Skill can reshape the content and style; copying the example alone gives you the existing fictional site. You still need an agent with suitable tools to build a new result.

作品集 Skill 是给编码智能体的方法与参考；Alex 是另外附带的成品示例。只复制网站会得到现有虚构内容，要制作自己的版本则使用 Skill 并提供实际材料。

## Must I have three projects, work in commerce, or use this style?

No. The example uses its own fictional material. A student with one substantial project, a writer with excerpts, or an architect with drawings can need different structure, evidence, typography, and media. Give the agent your audience and real artifacts rather than asking it to preserve Alex's career.

不需要。项目数量、职业和风格由实际材料及目标读者决定，不能把示例人物的经历、成绩和布局强加给别人。

## Do I need to pay for this or enter an API key?

The original project is MIT-licensed. The included website runs locally without an account, API key, model request, or paid component library. Your chosen coding agent/model and hosting provider have their own availability and prices. Briefly is a local template demonstration, not connected AI.

原创项目采用 MIT。示例运行不要求账号、API Key、模型请求或付费组件库；你选择的智能体、模型与托管平台费用另计。Briefly 是本地模板演示，没有接入 AI 服务。

## The page is blank after double-clicking the HTML file

Run `npm run dev` from the repository root and use the printed HTTP address. ES modules should be served over HTTP instead of opened as a `file:` document. For a ZIP upload, the site's `index.html` and sibling assets must be at the hosting root; see [deployment](DEPLOYMENT.md).

请在仓库根目录运行本地服务，使用它打印的 HTTP 地址，不要直接双击 HTML。上传站点 ZIP 时，入口与相邻素材应放在正确的托管根目录。

If `node` or `npm` is not recognized, install Node.js and reopen the terminal. The demo needs Node.js 22+; the optional Skills CLI currently requires 22.20+. If port 4180 is already used, choose a free port rather than stopping an unrelated process:

```powershell
$env:PORT = '4181'
npm run dev
```

```sh
PORT=4181 npm run dev
```

Open `http://localhost:4181/` after the server starts. `PORT` is set for that terminal session or command only. Node.js 未找到时，安装后重开终端；端口占用则换可用端口，不要终止无关进程。

## Installation says the GitHub repository cannot be found

Check the repository URL and whether it is published and reachable with your account/network. When using a downloaded copy, install its complete `skills/` folders manually as described in [installation](INSTALLATION.md), or use the CLI's supported local-directory source. Never put a token in a public issue.

先检查地址、仓库是否已发布、账号权限和网络。已下载的源码可以完整复制技能文件夹，不必依赖远程安装。

## I installed a Skill but the agent does not show it

Confirm the complete folder is in that host's supported discovery path, with `SKILL.md` at its root and references present. In Codex, project Skills live under `.agents/skills/`. Refresh or restart the host if necessary. Do not install nested copies such as `bespoke-portfolio/bespoke-portfolio/SKILL.md`, and avoid duplicate same-name installations. [Installation](INSTALLATION.md) explains updates and removal.

检查宿主的发现目录、入口层级及完整参考文件，必要时刷新或重启。不要多套一层同名文件夹，也不要重复安装造成混淆。

## A reference site needs login or cannot be opened

Use any access you legitimately have in that agent environment, or mark the exact step as blocked and use relevant accessible sources. A title or search snippet cannot stand in for viewing a case, testing motion, or reading implementation. Recording an access limit does not unlock those services.

有正常访问能力时继续研究；无法访问就记录具体阻碍，再找相关且可访问的来源。网站名字或摘要不能代替看过案例、操作动效或阅读实现。

## Briefly will not copy the result, or an edited draft will not download

Edits mark the previous output stale. Build the brief again before copying or downloading. Copying also depends on browser clipboard permission; the TXT download is a separate local export. This is prototype behavior, not a model or publishing failure. Reloading resets the draft.

编辑输入后先重新生成，再复制或下载；复制还取决于剪贴板权限，TXT 下载是另一条本地导出路径。刷新会重置草稿。

## Can I use this outside China, or host it for readers in China?

The Skill entrypoint is English with a full Chinese guide, and the example supports both languages. A new site's language follows its brief. The static example has local runtime assets and can use ordinary static hosting or your existing server; it does not require a ChatGPT-hosted address. Test the chosen provider and domain from the intended audience's network before promising availability.

可以按不同语言和地区需求使用。示例素材本地化，不依赖 GPT 站点域名，也不一定要自备服务器；具体托管平台和域名是否适合目标地区，要实际验证。

For an unresolved problem, follow [CONTRIBUTING.md](../CONTRIBUTING.md) and include the exact command or route, expected behavior, and a sanitized reproduction.
