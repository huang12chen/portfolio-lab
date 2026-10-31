# Asset register / 素材登记表

The shipped site downloads no webfonts, no photographs, no raster images and no third-party scripts. Its only image file is the hand-drawn `assets/favicon.svg` named by `rel="icon"`, which a browser fetches for the tab and the page never draws. Every visual on every page — the console mock, the notes, the bottle, the sparklines, the charts and the icons — is drawn with CSS and inline SVG in this directory.

发布站点不下载网络字体、照片、位图图像或任何第三方脚本；唯一的图片文件是 `rel="icon"` 指向的手绘 `assets/favicon.svg`，浏览器只为标签页取它，页面本身并不绘制。页面上的控制台示意、便签、瓶子、迷你折线、图表与图标，全部由本目录内的 CSS 与内联 SVG 绘制。

Alex Lin, the employers, case narratives, research, and every portfolio metric are fictional.

Alex Lin、任职机构、案例、调研与所有指标均为虚构。

## Files in this directory / 本目录文件

| File / 文件 | Origin / 来源 | Licence / 许可 | Role / 用途 |
| --- | --- | --- | --- |
| `assets/favicon.svg` | Drawn for this example. / 为本示例绘制。 | MIT, same as the repository. / 与仓库相同的 MIT 许可。 | Tab icon. / 标签页图标。 |
| `assets/sample-resume.md` | Written for this example; the employment, dates and figures inside it are invented. / 为本示例撰写，其中的任职、时间与数字均为虚构。 | MIT. | The file behind the "Download sample résumé" link, so the résumé the site claims to be built from can be inspected. / 「下载示例简历」链接指向的文件，用来核对网站声称所依据的那份简历。 |

## Typefaces / 字体

No font files are bundled. Text renders in the operating system's own families, declared as two stacks:

不附带任何字体文件，文字使用系统自带字体，按以下两组回退栈渲染：

- `--serif`: Georgia, 'Songti SC', 'Noto Serif SC', 'Source Han Serif SC', 'Noto Serif CJK SC', SimSun, serif
- `--sans`: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif

`'Noto Serif SC'` sits ahead of `'Source Han Serif SC'` on purpose: on a machine where the latter is registered only as its Heavy instance, a heading declared `font-weight: 400` paints at roughly 900 and splits one line across three families. Noto answers the requested weight and covers CJK punctuation, and where it is absent the stack falls through to the same faces it had before. Verified with `CSS.getPlatformFontsForNode`, which reports what was painted rather than what was declared.

Because the stack is a fallback list rather than a download, the exact face differs by machine. Two weights are requested that a given system may not carry as real instances, in which case the browser synthesises them; nothing here depends on a specific vendor's cut.

由于这是一组回退栈而非下载文件，实际字形随系统而异。部分字重在某些系统上没有独立字面，浏览器会以合成方式呈现；本站不依赖任何厂商的具体字形。

## Earlier bundles / 早期版本附带过的素材

The released versions up to and including 1.2.0 shipped two Unsplash photographs (`assets/photos/`), a 10,908-byte Noto Serif SC subset with its OFL.txt (`assets/fonts/`), and a vendored copy of Motion 14.6.0 with its MIT notice (`vendor/`). All three groups were removed afterwards, when the case visuals moved to CSS drawings and the motion layer to the browser's own scroll-driven animations. Nothing in this directory now carries a third-party licence obligation. If you are reading this in a released 1.2.0 archive, the photographs' own Unsplash terms applied to that archive instead.

截至 1.2.0 的已发布版本曾附带两张 Unsplash 照片（`assets/photos/`）、一个 10,908 字节的 Noto Serif SC 子集及 OFL.txt（`assets/fonts/`），以及 Motion 14.6.0 的本地副本与 MIT 声明（`vendor/`）。在案例图形改为 CSS 绘制、动效改为浏览器原生滚动时间线之后，这三类素材均已移除，当前目录不再包含任何第三方许可义务；若你手上的仍是 1.2.0 的发布包，其中照片部分另受 Unsplash 许可约束。
