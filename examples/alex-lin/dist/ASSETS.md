# Asset register / 素材登记表

All website assets are bundled locally. The site does not need to fetch images, fonts, or scripts from a third-party CDN at runtime.

网站素材保存在本地，运行时不需要从第三方 CDN 获取图片、字体或脚本。

Alex Lin, the employers, case narratives, research, and every portfolio metric are fictional. The photographs below are contextual third-party images. They are not pictures of Alex, Alex's property, client products, or evidence of the invented work.

Alex Lin、任职机构、案例、调研与所有指标均为虚构。以下照片仅作场景说明，不代表 Alex 本人、其财产、客户产品或虚构工作的证据。

## Photographs / 照片

Source and license pages checked, images downloaded and visually inspected on **2026-10-23**. Suggested visible captions: “Illustrative stock photo · Elijah Pilchard / Unsplash” and “Illustrative packing photo · Kelli McClintock / Unsplash”.

| Local file / 本地文件 | Author / 作者 | Source page / 来源 | License / 许可 | Intended role / 用途 |
| --- | --- | --- | --- | --- |
| `assets/photos/workspace.jpg` | **Elijah Pilchard** | [A desk with a laptop and a lamp on it](https://unsplash.com/photos/a-desk-with-a-laptop-and-a-lamp-on-it-C51WQ7xqsAE) | [Unsplash License](https://unsplash.com/license) | Warm workspace context for the fictional portfolio. No claim that this is Alex's desk. / 工作空间场景，不声称是 Alex 的桌面。 |
| `assets/photos/product.jpg` | **Kelli McClintock** | [Brown cardboard box](https://unsplash.com/photos/brown-cardboard-box-DcoB_NoNl6U) | [Unsplash License](https://unsplash.com/license) | Neutral commerce packing context. No client or product-design claim. / 中性的电商包装场景，不代表客户或产品设计成果。 |

### Export details / 导出记录

**workspace.jpg**

- Downloaded from [the Unsplash image CDN](https://images.unsplash.com/photo-1644337540803-2b2fb3cebf12?fm=jpg&fit=max&w=1600&q=80).
- JPEG, **1600 × 1067**, **335,157 bytes**.
- CDN resize with `fit=max`, width 1600, JPEG quality 80; no local retouching or subject alteration. The page may crop the displayed frame with CSS.
- SHA-256: `851e5e58a944f052c9d09c77c3b7641bb7293ff180429dc91e5617aa561faa2a`.

**product.jpg**

- Downloaded from [the Unsplash image CDN](https://images.unsplash.com/photo-1573376670329-0261ea9fde97?fm=jpg&fit=max&w=1800&q=82).
- JPEG, **1800 × 1200**, **133,069 bytes**.
- CDN resize with `fit=max`, width 1800, JPEG quality 82; no local retouching or subject alteration. The page may crop the displayed frame with CSS.
- SHA-256: `cbc82e76168c42af7e38cfa0cc24ab836a0c228cc2af83d23d54ca3303c98452`.

The [Unsplash License](https://unsplash.com/license) permits free use and distribution, including commercial use, with its stated restrictions. These two photos are included as part of a working website demo, not an image collection. Their copyright is not transferred or relicensed under this project's code license. Preserve this register when redistributing the example; do not sell unmodified image copies or use it to build a competing image service.

照片通过 CDN 缩放并压缩为 JPEG，没有本地修图或主体变更；网页可能通过 CSS 调整显示取景。照片保留 Unsplash 许可及其限制，不自动改为项目代码的 MIT 许可。分发示例时请保留此登记表。

## Other bundled assets / 其他本地素材

| Asset / 素材 | Source and license / 来源与许可 | Role / 用途 |
| --- | --- | --- |
| `assets/fonts/noto-serif-sc-500.woff2` | Noto Serif SC 500; [Noto CJK project](https://github.com/notofonts/noto-cjk), [Google Fonts specimen](https://fonts.google.com/noto/specimen/Noto+Serif+SC); SIL Open Font License 1.1. See `assets/fonts/OFL.txt`. | Retained **10,908-byte subset**, limited to selected legacy Han titles. It is not full CJK coverage; system fonts cover the new Chinese text. / 保留的微型子集，仅覆盖部分旧标题汉字；新中文内容使用系统字体。 |
| `vendor/motion-14.6.0.js` | [Motion](https://motion.dev/), [upstream repository](https://github.com/motiondivision/motion), version 14.6.0; MIT. See `vendor/motion-LICENSE.md`. | Locally bundled animation library. / 本地动画库。 |

Original diagrams, dashboard visuals, layouts, and browser prototype content are created for this example. Synthetic charts and research materials do not represent real accounts or user studies.

本示例的图表、布局和浏览器原型内容为演示而制作。合成图表和调研材料不代表真实账号或用户研究。
