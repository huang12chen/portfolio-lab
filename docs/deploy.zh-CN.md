# 部署静态示例

[English](deploy.md) · [README](../README.md)

部署目录为 **`examples/alex-lin/dist/`**。发布后，`index.html` 应位于站点根目录，与 `project.html`、`about.html`、脚本、样式和素材同级。三个案例共用同一个案例页的查询路由 `project.html?id=signal|briefly|fieldwork`，因此这三个入口页面就是完整站点。网站本身不需要构建命令、应用服务器、环境变量或 API Key。

请使用自己的托管账号或已有服务器，上传前检查发布文件；域名和 HTTPS 按自己的托管环境配置。

## 先检查实际发布文件

在仓库根目录执行：

```sh
npm test
npm run check
npm run dev
```

打开[本地示例](http://localhost:4180/index.html)，英文在根目录、中文在 `/zh/` 下，检查两种语言、三个案例、Signal 控件、Briefly 编辑、About 页面和移动端尺寸。上传副本应保留虚构内容标识与素材署名。

发布的是 **`dist/` 内的内容**。不要把整个仓库、本地笔记、原始个人简历、凭据或无关文件当作站点根目录上传。

## Cloudflare Pages：直接上传

1. 在 Cloudflare 控制台打开 **Workers & Pages**。
2. 选择 **Create application → Get started → Drag and drop your files**。
3. 填写项目名，上传 `examples/alex-lin/dist/`，或顶层包含 `index.html` 的 ZIP。
4. 点击 **Deploy site**，检查平台实际返回的地址。

后续更新使用项目内的 **Create a new deployment**。控制台上传支持文件夹或 ZIP。Direct Upload 项目后续不能直接转换为 Git 集成；需要自动部署时可另建 Git 集成项目。详见 [Cloudflare 官方指南](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

## GitHub Pages

### 从当前仓库通过 Actions 发布

先检查附带的 [Pages 工作流](../.github/workflows/pages.yml)。在自己的仓库中选择 **Settings → Pages → Build and deployment → Source → GitHub Actions**，再从 Actions 页手动运行 **Deploy static portfolio to Pages**。工作流上传目录为 `examples/alex-lin/dist`。

发布只接受手动触发，因此新克隆或 Fork 可以直接运行 CI，无需先配置托管，也不会意外发布网页。运行发布工作流时选择仓库默认分支，其他分支会被拒绝。

关键上传路径：

```yaml
- uses: actions/upload-pages-artifact@v4
  with:
    path: examples/alex-lin/dist
```

部署使用 `github-pages` environment，并需要 `pages: write` 和 `id-token: write` 权限。运行配置好的工作流，再查看它返回的实际部署地址。完整配置参考 [GitHub 官方工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

### 分支发布备选方案

分支发布只允许选择目标分支的 **`/`** 或 **`/docs`**，不能直接选择本仓库内的 `examples/alex-lin/dist/`。

将 `dist/` 的内容复制到专用发布分支（如 `gh-pages`）的根目录，加入 `.nojekyll`，再选择 **Deploy from a branch → gh-pages → /(root)**。仓库说明文档保留在源码分支。详见 [GitHub 发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

项目站通常位于仓库子路径下。请保留 `./zh/project.html?id=signal`、`./assets/favicon.svg` 这类相对路径，不要统一改成以 `/` 开头的根路径。

## 现有 Nginx 静态站点

在自己已控制的服务器上，将 `dist/` 内的内容复制到选定的网站目录，沿用已有 HTTPS 配置，并填入实际域名与目录。

以下使用保留示例域名：

```nginx
server {
    listen 80;
    server_name portfolio.example;
    root /var/www/portfolio;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

确认 `/var/www/portfolio/index.html` 存在，并保留标准 MIME 类型配置。用 `nginx -t` 检查配置后，再按原服务器的管理方式重新加载。这是静态文件配置片段，不包含 TLS 配置或服务器购买流程。参考 [Nginx 静态内容指南](https://nginx.org/en/docs/beginners_guide.html#static)与 [try_files 文档](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)。

若部署在子目录，可将文件放入已有根目录下的 `/var/www/html/portfolio/`，从 `/portfolio/index.html` 访问，并实际检查带有子目录前缀的相对链接。

## 检查公共部署

使用托管平台实际生成的地址进行以下检查。

- 分别打开 `index.html` 和 `zh/index.html`，以及直接打开单个案例的 `zh/project.html?id=signal`；上传时要带上整棵 `zh/` 目录。
- 从首页进入每个案例、刷新详情页、打开 About，再返回首页。
- 操作 Signal 控件，编辑 Briefly 简报。
- 检查手机宽度与键盘操作。
- 在网络面板检查素材丢失和意外的第三方请求。

静态托管提供浏览器演示，不会自动增加大模型服务、数据分析后端、共享存储、邮件发送或表单处理能力。可用性与速度，包括中国大陆访问情况，需要从目标读者实际使用的网络验证。

上述平台步骤于 2026-10-24 对照所链接的官方文档核对；界面名称与服务规则可能变化。
