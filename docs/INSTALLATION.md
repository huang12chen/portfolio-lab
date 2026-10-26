# Installation / 安装

[README](../README.md) · [中文说明](../README.zh-CN.md) · [让 AI 帮你安装](QUICK_START.md)

## With the CLI / 命令行安装

需要 Node.js 22.20+。在自己的项目目录运行，按提示选择要安装到的工具：

Use Node.js 22.20+. Run this in your project and choose your coding agent when prompted:

```sh
npx skills add huang12chen/portfolio-lab --skill bespoke-portfolio
```

默认装到当前项目，添加 `-g` 则安装到用户目录。CLI 的支持列表见[官方说明](https://github.com/vercel-labs/skills/blob/main/docs/agents.md)。

The default scope is the current project; add `-g` for a user-wide install. See the CLI's [supported agents](https://github.com/vercel-labs/skills/blob/main/docs/agents.md).

## From a downloaded copy / 使用已下载的源码

复制完整的 `skills/bespoke-portfolio/` 文件夹，保留其中的 `references/` 和 `LICENSE.txt`。Codex 的项目级目录是 `.agents/skills/`，用户级目录是 `~/.agents/skills/`。

Copy the complete `skills/bespoke-portfolio/` folder, including references and its license. For Codex, use `.agents/skills/` in your project or `~/.agents/skills/` for your user.

```text
your-project/
└── .agents/
    └── skills/
        └── bespoke-portfolio/
            ├── SKILL.md
            ├── LICENSE.txt
            ├── agents/
            └── references/
```

示意图只列出了主要文件，请复制整个文件夹。其他工具按各自的技能目录安装。[Codex 技能目录说明](https://learn.chatgpt.com/docs/build-skills)

The diagram shows the main files; copy the whole folder. Other agents use their own Skill locations. [Codex Skill locations](https://learn.chatgpt.com/docs/build-skills)

也可以让 CLI 读取本地来源。假设下载的 `portfolio-lab` 与自己的项目在同一层，在自己的项目内运行：

The CLI can also use a local folder. If `portfolio-lab` is beside your own project, run this from your project:

```sh
npx skills add ../portfolio-lab --skill bespoke-portfolio --agent codex --copy
```

## After installation / 装好之后

在工具中找到对应 Skill，然后按[使用示例](USAGE.md)发送需求。Codex 中可以直接写 `$bespoke-portfolio`。找不到时，检查目录层级，必要时重启工具。

Find the Skill in your agent, then send a request from the [usage examples](USAGE.md). In Codex, you can name `$bespoke-portfolio` directly. If it does not appear, check the folder layout and restart the tool if needed.

## Update or remove / 更新和移除

更新前保留自己的修改。CLI 安装可用 `npx skills check` 检查更新、`npx skills update` 更新；手动复制的版本，比较后替换对应文件夹即可。卸载时移除安装的 Skill 文件夹，自己的作品集项目单独保留。

Keep a copy of local edits before updating. For CLI installs, use `npx skills check` and `npx skills update`. For manual installs, compare and replace the selected folder. Remove the installed Skill folder to uninstall; keep your portfolio project separately.

研究参考和检查页面需要工具具备浏览器能力。运行示例网站本身不需要 Python。问题见[常见问题](TROUBLESHOOTING.md)。

Reference research and page checks need browser access in your agent. The example website does not need Python. See [troubleshooting](TROUBLESHOOTING.md) for help.
