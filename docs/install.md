# Install / 安装

[English README](../README.en.md) · [中文说明](../README.md) · [FAQ](faq.md)

## Ask your coding tool / 让编码工具安装

在 Codex、Claude Code 或 Cursor 中发送下面这段话。工具需要能访问网络和项目文件。

Send this to Codex, Claude Code, or Cursor with access to your project files and the network:

```text
请从 https://github.com/huang12chen/portfolio-ui-design/tree/main/skills/portfolio-website 安装 portfolio-website，放到当前项目的技能目录。保留已有修改，装好后确认能找到它，先不要开始制作网站。
```

```text
Install portfolio-website from https://github.com/huang12chen/portfolio-ui-design/tree/main/skills/portfolio-website into this project's Skill directory. Preserve existing local edits, confirm it is discoverable, and stop after installation.
```

## Use the CLI / 使用终端

需要 [Node.js 22.20+](https://github.com/vercel-labs/skills#install-a-skill)。在自己的项目目录运行，按提示选择工具。默认安装到当前项目；加 `-g` 则供多个项目使用。

Requires Node.js 22.20+. Run this from your project and choose the coding tool when prompted. The default scope is this project; add `-g` to install for your user.

```sh
npx skills add huang12chen/portfolio-ui-design --skill portfolio-website
```

已明确使用哪个工具时，可以跳过选择：

To select the tool explicitly:

```sh
npx skills add huang12chen/portfolio-ui-design --skill portfolio-website --agent codex
npx skills add huang12chen/portfolio-ui-design --skill portfolio-website --agent claude-code
npx skills add huang12chen/portfolio-ui-design --skill portfolio-website --agent cursor
```

上面三条选自己需要的一条。完整选项见 [Skills CLI](https://github.com/vercel-labs/skills/blob/main/docs/commands.md)。Choose the one for your tool, not all three.

## Check the installation / 确认装好

CLI 安装后可在同一项目运行：After a CLI installation, run this in the same project:

```sh
npx skills list
```

列表里应出现 `portfolio-website`。再打开工具的技能列表或选择器，确认能选到它。若界面未刷新，重新打开对话或重启工具。

Look for `portfolio-website`, then confirm it appears in your coding tool's Skill list or picker. If needed, reopen the chat or restart the tool.

| 工具 / Tool | 首次使用 / First use |
| --- | --- |
| Codex | 输入 `$portfolio-website`，再发送简历与作品。Type `$portfolio-website`, then provide your résumé and work. |
| Claude Code | 输入 `/portfolio-website`，再发送材料。Type `/portfolio-website`, then provide your material. |
| Cursor | 在 Agent 中选择该 Skill，或写“使用 portfolio-website 制作我的作品集”。Select the Skill in Agent, or ask it to use portfolio-website. |

例如：Example request:

> 使用 portfolio-website 这个 Skill。我想申请内容编辑岗位，附件里有简历、两篇文章和一份选题策划。请帮我选择展示内容，写清我的贡献，再制作网站并给我预览。

> Use portfolio-website. I am applying for an editing role. Here are my résumé, two articles, and a proposal. Choose what to show, explain my contribution, and build a website I can preview.

## Install manually / 手动安装

[下载源码](https://github.com/huang12chen/portfolio-ui-design/archive/refs/heads/main.zip)，解压后复制完整的 `skills/portfolio-website/` 文件夹到下面对应的项目目录。保留 `SKILL.md`、`agents/`、`references/` 和许可证；不需要复制网站示例或整个仓库。

Download and unzip the source. Copy the complete `skills/portfolio-website/` folder into the matching project directory below, keeping its instructions, metadata, references, and license. You do not need to copy the example website or the whole repository.

| 工具 / Tool | 项目内最终路径 / Final path in your project |
| --- | --- |
| Codex | `.agents/skills/portfolio-website/SKILL.md` |
| Claude Code | `.claude/skills/portfolio-website/SKILL.md` |
| Cursor | `.agents/skills/portfolio-website/SKILL.md` |

手动复制本身不需要 Node.js 或 Python。其他工具的路径见 [CLI 支持列表](https://github.com/vercel-labs/skills/blob/main/docs/agents.md)。No Node.js or Python is needed just to copy the Skill. See the CLI's supported-agent list for other tools.

## Update or remove / 更新与移除

CLI 安装可用 `npx skills check` 检查更新、`npx skills update portfolio-website` 更新、`npx skills remove portfolio-website` 移除；全局安装使用相应命令的 `-g` 选项。手动安装则比较并替换或移除该 Skill 文件夹。先保留自己的修改，生成的作品集项目另行保留。

For CLI installations, use `npx skills check`, `npx skills update portfolio-website`, or `npx skills remove portfolio-website`; use `-g` for the global scope. For manual installations, compare and replace or remove the Skill folder. Keep local changes and your generated portfolio project separately.

旧版名称是 `bespoke-portfolio`。如果装过旧版，先在原安装范围移除旧 Skill，再安装 `portfolio-website`，避免工具同时读到两份。Earlier versions used the name `bespoke-portfolio`; remove that older Skill in the same scope before installing the new one.

工具目录与调用方式参考：[Codex](https://learn.chatgpt.com/docs/build-skills)、[Claude Code](https://code.claude.com/docs/en/skills)、[Cursor](https://cursor.com/docs/skills)。
