# Tutorial outline / 教学视频提纲

[README](../README.en.md) · [中文说明](../README.md) · [录屏素材](recordings.md)

可以用 Alex 示例录一个约 7–9 分钟的教程。开头说明人物和数据是虚构的，再按下面的顺序演示。

You can use the Alex example for a 7–9 minute tutorial. Introduce it as fictional, then work through the steps below.

| 步骤 / Step | 展示什么 / What to show |
| --- | --- |
| 看成品 / Show the result | 对比卡片版和滚动版，打开一个项目，切换语言。Compare both homepages, open a case, and switch languages. |
| 安装 / Install | 打开安装说明，把启动提示词交给编码工具，确认装好了作品集 Skill。Use the installation guide and setup prompt, then find portfolio-website in the agent. |
| 提供材料 / Add the material | 展示简历和作品，说明想投的岗位及本人负责的工作。Show the résumé, samples, target role, and individual contribution. |
| 操作项目 / Try the projects | 在 Signal 筛选国家和时段、导出 CSV；在 Briefly 修改输入、生成并下载简报；切换 Fieldwork 的方案。Use the dashboard, brief builder, and proposal comparison. |
| 调整页面 / Refine the pages | 展示一次具体修改，如图片裁切、标题大小、项目展开；再切到手机尺寸查看。Make one visible revision and check it at a narrow width. |
| 部署 / Deploy | 打开部署说明，展示需要上传的目录和运行后的地址。Show the deployable folder and the URL returned by the host. |

## 可以在视频里使用的提示词 / Prompts for the recording

> 使用 $portfolio-website。这是简历和作品，请先帮我挑选适合求职展示的内容，写清每个项目我负责的部分，再安排页面。

> Use $portfolio-website. Here are the résumé and work samples. Choose what to show for this role, explain my contribution to each project, and plan the pages.

> 使用 $portfolio-website。请查看这些参考页面，再改进首屏的排版、图片和按钮。保留现有内容和功能，做完运行给我看。

> Use $portfolio-website. Look at these references, then revise the first screen's typography, imagery, and controls. Keep the content and working behavior, and run the result.

## 录制前 / Before recording

在仓库根目录运行 `npm run dev`，打开准备演示的语言版本，先操作一遍要讲的按钮。录自己的资料时使用可公开的文件，关闭无关账号页和通知。

Run `npm run dev`, choose the language, and try the controls before recording. Use shareable files and close unrelated account pages and notifications.

Signal 使用示例数据，预算滑块按固定 ROAS 计算；Briefly 使用本地模板。修改 Briefly 输入后需要重新生成，复制和下载才会恢复可用。刷新页面会重置草稿。

Signal uses sample data and a fixed-ROAS budget scenario. Briefly uses local templates; after editing, rebuild the brief before copying or downloading. Reloading resets the draft.
