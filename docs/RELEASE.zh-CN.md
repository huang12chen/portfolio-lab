# 本地发布包

[English](RELEASE.md) · [部署说明](DEPLOYMENT.zh-CN.md) · [README](../README.zh-CN.md)

使用 Node.js 22 或更新版本，在仓库根目录执行：

```sh
npm test
npm run check
npm run release
```

无需安装 npm 依赖、登录账号、配置 Git 远程仓库或 API Key。Windows 下打包器还使用系统 PowerShell 检查重解析点属性。

完整发布会在已忽略的 `release/` 目录中生成：

| 文件 | 内容 |
| --- | --- |
| `portfolio-lab-source.zip` | 顶层为 `portfolio-lab/`，包含白名单内的静态站、代码、测试、公共文档、实际截图、Skill 与部署示例。 |
| `portfolio-lab-site.zip` | 顶层直接包含 `index.html`、`story.html`、案例、素材和许可，可供静态托管平台上传 ZIP。 |
| `manifest.json` | 两个压缩包及其中每个文件的大小与 SHA-256。 |
| `SHA256SUMS.txt` | 两个压缩包和清单的校验值。 |

打包器回读写出的 ZIP 字节，逐文件核对长度与 SHA-256；固定 ZIP 时间戳使相同源码可产生相同结果。选中目录内的链接、重解析点、私有文件、未允许的文件类型以及文本中可识别的凭据或个人本地路径会导致失败。这是针对发布包的检查，不能代替素材授权与内容核对。

正常命令会拒绝不完整的教学包：作品集 Skill 的入口与元数据、README 使用的六张截图均须存在。如确实需要不完整的本地草稿，可执行 `npm run release -- --allow-incomplete`；清单会标明 `complete: false` 并列出缺失材料，不能把该草稿当成完整交付。

上传前检查生成清单与两个压缩包。个人原稿和托管身份保存在仓库外。生成发布包不会新建 GitHub 仓库、推送代码、修改网站访问范围或向外部发布。

按[部署说明](DEPLOYMENT.zh-CN.md)使用自己的托管平台。作品索引版入口为 `index.html?lang=zh`，连续滚动版为 `story.html?lang=zh`；两版也支持 `lang=en`。

源码包包含安装、使用与社区指南，以及 README 引用的 GIF 和 MP4 真实录屏。静态站点 ZIP 仅包含可部署网页及其许可。两者均按当前白名单重新生成。
