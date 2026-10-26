# Contributing / 贡献指南

English and Chinese issues, documentation, and improvements are welcome. Use [Issues](https://github.com/huang12chen/portfolio-lab/issues) for questions, reproducible bugs, and proposed changes.

欢迎用中英文提交问题、文档与改进。先说明具体需求或可复现行为，再提出相应修改。

## A useful contribution

For a bug, include the route, language, viewport, expected behavior, and reproduction steps. Use synthetic data in screenshots and recordings. For a Skill change, give a realistic input and explain the decision or observed result it improves; avoid adding an unconditional rule for one person's preferences.

Reference notes should identify the specific source or component, what was directly observed, access limits, and the proposed adaptation. Do not copy a third-party article, screenshot collection, or implementation into the Skill without the right to redistribute it.

问题应给出路由、语言、尺寸、复现步骤和预期，媒体使用合成数据。改 Skill 时提供具体使用场景，不要将个人偏好变为所有项目的硬规则。研究笔记分清观察、推断和限制。

## Develop and verify

Use Node.js 22+; there are no npm dependencies for this demo.

```sh
npm test
npm run check
npm run dev
npm run release
```

If you change interactions or layout, inspect the running page, narrow screens, keyboard access, and reduced motion as relevant. Include what you actually checked. No paid API or personal login should be necessary to reproduce the demo.

Fork, make a focused branch, and open a pull request using the template. Keep behavioral changes, public docs, screenshots, and asset credits consistent. Contributions you submit must be yours to share and are licensed under this project's MIT license; retain the licenses of third-party material. See [community conduct](CODE_OF_CONDUCT.md) and [security reporting](SECURITY.md).
