# 自检

其他每篇参考都在小节末尾有一条**检查**。检查是散文，而散文有一种代价本项目已经付过的失效方式：一次跑出了零问题的报告，而被测的那个维度实际上根本测不了——按压探针打印 PASS，是因为它内部的任何东西都无法失败。所以测量器随技能一起发布，而不是留在另一个仓库里。

## 怎么跑

```
node scripts/selfcheck.mjs <构建产物目录>
```

零依赖；需要 Node 22 或更新。浏览器层与质感层需要本机装有 Chrome 或 Edge，会自动查找，也可以用 `--chrome <路径>` 指定。

- `--static-only`——只跑结构、打包、链接、语言与体积规则，不开浏览器。构建过程中用它，几秒出结果。
- `--map`——把每个检查码和陈述它的参考行并列打出来，从检查器里读，不是抄进散文。
- `--json`——完整报告，给脚本用，或者用来对比两次构建的差异。

退出码 0 表示测过且干净，1 表示测过且有缺陷，2 表示这次跑不起来。把 2 当作失败对待：那正是报告可能因为错误原因而为空的场景。

## 三种状态，不是两种

| 判定 | 含义 | 该做什么 |
| --- | --- | --- |
| PASS | 这条规则在这个页面上被测量过，并且成立 | 不用管 |
| FAIL | 测量到了，页面违反了它 | 修页面 |
| NOT-MEASURED | 测量器够不到这个问题 | 在交接里说明；绝不能当作通过 |

第三种状态才是重点。一个没有任何路径会提交的表单错误、一次按住值始终没有稳定下来的按压、一个由平台在封闭 shadow tree 里绘制外观的原生控件——每一条都是测量器的真实边界，每一条都必须出现在它本来会被误读成零的那个零旁边。如果交接里写着"所有检查通过"，而某一行读作 NOT-MEASURED，那就是在描述一次从未做过的测量。

## 这些码覆盖了什么

下表按执行哪条检查行的参考分组。`--map` 打印带行号引用的实时版本。

| 参考 | 检查码 |
| --- | --- |
| [部件解剖](component-anatomy.md) | `CRAFT_SIBLING_BASELINE`、`CRAFT_HEADING_INVERSION`、`CRAFT_TABLE_FIT` |
| [演示项目](demo-projects.md) | `PAGE_LANG`、`BROWSER_LOCALE_RENDERED` |
| [交互状态](interaction-states.md) | `CRAFT_STATE_MATRIX`、`CRAFT_PRESS_DELTA`、`CRAFT_NAME_STATE` |
| [纵深与奇观](scroll-depth.md) | `BROWSER_OCCLUSION` |
| [表面与光](surfaces.md) | `CRAFT_SHADOW_LAYERS`、`CRAFT_SHADOW_INSET` |
| [视觉方向](visual-direction.md) | `BROWSER_CJK_TRACKING`、`BROWSER_PAINTED_FONT`、`BROWSER_LABEL_PUNCTUATION`、`LABEL_PUNCTUATION`、`BROWSER_CONTRAST`、`BROWSER_COLUMN_COLLAPSE`、`BROWSER_ELEMENT_OVERFLOW`、`BROWSER_H_OVERFLOW`、`REDUCED_MOTION`、`JS_BUDGET`、`BROWSER_JS_BUDGET`、`CRITICAL_PATH_BUDGET` |
| [视觉验收](visual-review.md) | `CSS_UNDEFINED_VAR`、`DUPLICATE_ID`、`BROWSER_DUPLICATE_ID`、`DEFINITION_LIST`、`FOOTER_IN_MAIN`、`H1_COUNT`、`HEADING_SKIP`、`TABLE_CAPTION`、`TH_SCOPE`、`BROWSER_MIN_FONT_SIZE`、`FOCUS_VISIBLE_SCOPE`、`OFFSCREEN_HIDE`、`SKIP_LINK`、`SKIP_TARGET_TABINDEX`、`FONT_SCALE_HARDCODED`、`FONT_SCALE_NO_TOKENS`、`EMPTY_LINK`、`BROWSER_CONSOLE_ERROR`、`MISSING_RESOURCE`、`THIRD_PARTY_RUNTIME`、`SHIP_METADATA`、`SHIP_SCRATCH_PAGE`、`SHIP_UNREACHABLE_PAGE` |

45 个码对 51 条检查行，差额不是四舍五入。有三十一条检查行完全没有可执行检查：[动效编排](motion-choreography.md)的七条、[排版执行](typography-execution.md)的七条、[响应式构建](responsive-construction.md)的七条、[空间构建](spatial-construction.md)的六条、[媒体与导航](images-and-links.md)的三条，以及[反生成感](reads-as-generated.md)的一条。它们仍然是判断题。不要让上面这张干净的表暗示它们被测量过——一个页面可以通过这里每一个码，同时仍然是一摞通栏方块。

## 没有仪器会告诉你的事

代码说不出一个说法是否属实，证据对这个人所在的领域是否够用，方向陈述是从材料推导出来的还是从建造者上一个喜欢的站点借来的，也说不出层级第一眼是否读得通。这些靠[视觉验收](visual-review.md)去读，靠方向陈述去论证。自检的作用，是把"本来可以用测量解决"的问题从"不能"的那一类里拿走，好让剩下的判断花在真正需要判断的地方。

## 顺序

构建、运行、修掉 FAIL、再运行。永远不要为了让某条发现消失而去改期望值。当检查本身错了，先错的是参考：本项目的按压规则要求每一种可按压类型都有合成层位移，而同一节又写着纸做的控件靠色调回答——探针忠实执行了规则，于是造出一条材料本身否认的要求。修复的顺序是先改规则，再改分类器，最后改站点。检查与页面不一致，是在问哪一个错了，答案从来不是"把检查放松到它同意为止"。

这里发布的检查器副本与示例站所依据的那一份逐字节相同，两者一旦分叉测试就会失败，所以一条规则改了而探针没跟上，会被抓住，而不是以后被发现。
