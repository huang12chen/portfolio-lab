# Deploy the static demo

[简体中文](deploy.zh-CN.md) · [README](../README.md)

The deployable directory is **`examples/alex-lin/dist/`**. Its `index.html` must appear at the published site root, alongside `project.html`, `story.html`, `about.html`, scripts, styles, and assets. No build command, application server, environment variables, or API keys are required for the site itself.

Use the steps below with your own hosting account or existing server. Review the files before uploading them; configure domains and HTTPS through the hosting you control.

## Check the exact files first

From the repository root:

```sh
npm test
npm run check
npm run dev
```

Open the local demo at [localhost:4180](http://localhost:4180/index.html?lang=en). Test both languages, all three cases, Signal controls, Briefly editing, the About page, and a mobile viewport. Keep the fictional-content notices and asset credits in the uploaded copy.

The release consists of the **contents** of `dist/`, not the repository root. Do not expose local notes, source résumés, credentials, or unrelated files.

## Cloudflare Pages: Direct Upload

1. In Cloudflare's dashboard, open **Workers & Pages**.
2. Choose **Create application → Get started → Drag and drop your files**.
3. Name the project and upload `examples/alex-lin/dist/`, or a ZIP whose top level contains `index.html`.
4. Select **Deploy site** and inspect the URL Cloudflare returns.

Later updates use **Create a new deployment** in that project. Cloudflare permits folders or ZIP files for dashboard uploads. A Direct Upload project cannot later be converted to Git integration; create a separate Git-integrated project if needed. See the [official Direct Upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## GitHub Pages

### Actions from this repository

Review the included [Pages workflow](../.github/workflows/pages.yml). In your own repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then manually run **Deploy static portfolio to Pages** from Actions. It uploads `examples/alex-lin/dist` as the Pages artifact.

Publication is manual so a fresh clone or fork can run CI without configuring hosting or unintentionally publishing a site. Select the repository default branch when running the workflow; deployment from other branches is refused.

The essential artifact setting is:

```yaml
- uses: actions/upload-pages-artifact@v4
  with:
    path: examples/alex-lin/dist
```

The deployment needs the `github-pages` environment and `pages: write` plus `id-token: write` permissions. Run the configured workflow and inspect its returned deployment URL. Refer to GitHub's [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for the complete configuration.

### Branch publishing alternative

GitHub's branch source selector supports only **`/`** or **`/docs`** on the chosen branch. It cannot select this repository's nested `examples/alex-lin/dist/` directly.

Copy the contents of `dist/` to the root of a dedicated publishing branch such as `gh-pages`, include a `.nojekyll` file, then select **Deploy from a branch → gh-pages → /(root)**. Keep repository documentation on the source branch. See [publishing-source settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

A project site normally lives under a repository subdirectory. Keep relative links such as `./project.html?id=signal&lang=en` and `./assets/photos/workspace.jpg`; avoid replacing them with root-relative paths beginning with `/`.

## An existing Nginx static site

For a server you already control, copy the contents of `dist/` into its chosen document root. Retain its HTTPS configuration and use its actual domain and filesystem path.

Example server configuration, with a deliberately reserved hostname:

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

`/var/www/portfolio/index.html` must exist. Keep the standard MIME types configuration enabled. Validate the existing configuration with `nginx -t` before reloading via your server's normal service procedure. This example is a file-serving fragment, not a TLS or server-provisioning guide. See Nginx's [static-content guide](https://nginx.org/en/docs/beginners_guide.html#static) and [try_files reference](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files).

For subdirectory hosting, copy the files beneath the existing document root, for example `/var/www/html/portfolio/`, and open `/portfolio/index.html`. Keep the directory prefix in the browser while testing relative links.

## Verify the public deployment

Use the actual URL produced by your selected provider.

- Open `index.html?lang=en`, `index.html?lang=zh`, and both languages of `story.html`.
- Follow each project link, reload its detail page, open About, then return home.
- Change Signal controls and edit a Briefly brief.
- Check phone-width layout and keyboard operation.
- Inspect the network panel for missing assets and unexpected third-party requests.

Static hosting makes the browser demo available. It does not add a model service, analytics backend, shared storage, email delivery, or form processing. Provider availability and performance, including mainland China access, must be checked from the intended audience's network.

Provider procedures were checked against the linked primary documentation on 2026-10-24. Interface names and service policies can change.
