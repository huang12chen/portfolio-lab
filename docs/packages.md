# Local release packages

[简体中文](packages.zh-CN.md) · [Deployment](deploy.md) · [README](../README.en.md)

Run these commands from the repository root with Node.js 22 or newer:

```sh
npm test
npm run check
npm run release
```

No npm installation, account, Git remote, or API key is needed. On Windows the packager also uses the system PowerShell to check reparse-point attributes.

A complete release writes these local files to the ignored `release/` directory:

| File | Contents |
| --- | --- |
| `portfolio-ui-design-source.zip` | The allowlisted project beneath a `portfolio-ui-design/` directory: static site, code, tests, public documentation, actual screenshots, the portfolio Skill, and deployment examples. |
| `portfolio-ui-design-site.zip` | The static site with `index.html`, `story.html`, cases, assets, and licenses at its top level. Suitable for a static host's ZIP upload. |
| `manifest.json` | Archive sizes and SHA-256 values, plus each archived file's size and SHA-256. |
| `SHA256SUMS.txt` | Checksums for both archives and the manifest. |

The packager reads the resulting ZIP bytes back and compares every file's length and SHA-256 with its source snapshot. ZIP timestamps are fixed for reproducible output. It refuses linked/reparse paths, private files in selected trees, unsupported file types, and recognizable credentials or local private paths in text. This is a targeted packaging check, not a guarantee that arbitrary material is cleared for publication.

The normal command refuses an incomplete teaching bundle: the portfolio Skill entry point and its metadata and the six README screenshots must be present. For an explicitly incomplete local draft only, run `npm run release -- --allow-incomplete`. The returned manifest will say `complete: false` and list the missing material. Do not present that draft as the finished release.

Check the generated manifest and inspect both archives before uploading. Keep private originals and hosting identities outside this repository. Creating these packages does not create a GitHub repository, push commits, change a site's audience, or publish anything.

Use the [deployment guide](deploy.md) for a host you control. The gallery view starts at `index.html?lang=en`; the continuous-scroll view starts at `story.html?lang=en`. Both also support `lang=zh`.

The source package includes the installation/usage/community guides and the GIF/MP4 browser recordings referenced by the README. The flat site ZIP includes only the deployable website and its licenses. Both are regenerated from the current allowlist.
