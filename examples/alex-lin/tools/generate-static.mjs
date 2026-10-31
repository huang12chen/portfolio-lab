/* Regenerates both static locale trees in dist/ from tools/views.js.
   Usage: node examples/alex-lin/tools/generate-static.mjs
   One template, two builds: dist/*.html in English and dist/zh/*.html in Chinese. Neither tree is a
   runtime reconstruction of the other, so a reader who asks for Chinese and a reader who has
   JavaScript switched off both get the document they asked for — and no route downloads the 63 KB of
   template modules that used to be shipped to rebuild the Chinese page in the browser. views.js is
   still the single source of markup; it just runs at build time. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ctxFor, buildHome, buildProjectInner, buildProjectTitle, buildAbout, headerHTML, footerHTML, EXTRA } from './views.js';
import { copy, projects } from '../dist/data.js';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

/**
 * The first thing the page does is honour a `?lang=` link that predates the two static trees, then
 * stamp the case and the motion preference. The redirect deletes the parameter before it leaves, so a
 * stale bookmark cannot loop; `id` and the fragment are carried, because a shared case link should
 * still open the same case in the other language.
 *
 * A case route with no `?id=` is the first case, not the archive. Stamping nothing left all three
 * articles on screen with every preset chip and select in the document answering nothing — three
 * silent prototypes where the reader expects one working one — so `data-case` takes the first project
 * id and app.js mounts that case's demo against it. A *present but unrecognised* id still gets
 * `data-caseUnknown`, which is the panel the template already ships, and a reader with JavaScript off
 * still gets the archive: the note and the three articles are in the document either way.
 */
const boot = (tree, file) => {
  const other = tree === 'zh' ? '../' + file : 'zh/' + file;
  return `<script>(function(){var d=document.documentElement;d.dataset.js='on';var q=new URLSearchParams(location.search);var want=q.get('lang');if(want){var ask=want.toLowerCase().indexOf('zh')===0?'zh':'en';if(ask!=='${tree}'){q.delete('lang');var s=q.toString();location.replace('${other}'+(s?'?'+s:'')+location.hash);return;}}if(/project/i.test(location.pathname)){var ids=${JSON.stringify(projects.map(p => p.id))};var id=q.get('id');if(ids.indexOf(id)>-1)d.dataset.case=id;else if(id)d.dataset.caseUnknown='';else d.dataset.case=ids[0];}var m='';try{m=localStorage.getItem('alex-motion')||'';}catch(e){}d.dataset.motion=m==='on'||m==='off'?m:(matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on');})();</script>`;
};

const pageTitles = {
  en: { home: copy.en.homeTitle, project: 'Selected work — Alex Lin', about: 'About Alex — Alex Lin' },
  zh: { home: copy.zh.homeTitle, project: '精选案例 — Alex Lin', about: '关于 Alex — Alex Lin' },
};
const descriptions = {
  en: {
    home: 'A fictional bilingual portfolio with browser-local growth and product demos. An open-source teaching example; all content is invented.',
    project: 'Three complete fictional case studies with inspectable synthetic data. An open-source teaching example.',
    about: 'About the fictional Alex Lin: an invented 2020-2026 career path and the method behind the demo cases.',
  },
  zh: {
    home: '虚构的双语作品集，增长看板与简报生成器都在浏览器本地运行。这是一个开源教学示例，全部内容均为虚构。',
    project: '三个完整的虚构案例，附可查验的合成数据。开源教学示例。',
    about: '关于虚构人物 Alex Lin：一段 2020 至 2026 年的虚构履历，以及三个案例背后的方法。',
  },
};

/**
 * Both locales of the same page are declared to each other and to `x-default`, so a search engine
 * and the audit can see that the switch leads somewhere real rather than to a script promise.
 */
const alternates = (tree, file) => (tree === 'zh'
  ? `<link rel="alternate" hreflang="zh-CN" href="./${file}">
<link rel="alternate" hreflang="en" href="../${file}">
<link rel="alternate" hreflang="x-default" href="../${file}">`
  : `<link rel="alternate" hreflang="en" href="./${file}">
<link rel="alternate" hreflang="zh-CN" href="zh/${file}">
<link rel="alternate" hreflang="x-default" href="./${file}">`);

function shell(page, inner, ctx, opts = {}) {
  const c = copy[ctx.lang];
  const base = ctx.zh ? '../' : './';
  const langAttr = ctx.zh ? 'zh-CN' : 'en';
  const resumeLink = ctx.zh ? '阅读虚构的示例简历' : 'Read the fictional sample résumé';
  return `<!doctype html>
<html lang="${langAttr}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f4f5ef">
<meta name="description" content="${descriptions[ctx.lang][page]}">
${alternates(ctx.lang, page === 'home' ? 'index.html' : page === 'about' ? 'about.html' : 'project.html')}
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}styles.css">
${page === 'project' ? `<link rel="stylesheet" href="${base}demos.css">
` : ''}<link rel="stylesheet" href="${base}motion.css">
${boot(ctx.lang, page === 'home' ? 'index.html' : page === 'about' ? 'about.html' : 'project.html')}
<title>${pageTitles[ctx.lang][page]}</title>
</head>
<body data-page="${page}">
<a class="skip-link" href="#main">${c.skip}</a>
<div class="header-sentinel" data-sentinel aria-hidden="true"></div>
<header class="site-header wrap">${headerHTML(ctx)}</header>
<main id="main" tabindex="-1">
<div id="app">${opts.pageTitle ?? ''}${inner}</div>
<noscript><div class="wrap no-script-note"><p>${EXTRA[ctx.lang].noscript}</p><p><a href="${base}assets/sample-resume.md">${resumeLink}</a></p></div></noscript>
</main>
<footer class="site-footer wrap">${footerHTML(ctx)}</footer>
<script type="module" src="${base}app.js"></script>
</body>
</html>
`;
}

/* A page is built twice from one pair of calls, so a template change cannot land in English and be
   forgotten in Chinese — which is the failure this file existed to prevent in the first place. */
const builders = {
  home: ctx => buildHome(ctx),
  project: ctx => buildProjectInner(ctx),
  about: ctx => buildAbout(ctx),
};

const written = [];
for (const tree of ['en', 'zh']) {
  const dir = tree === 'zh' ? join(dist, 'zh') : dist;
  const base = tree === 'zh' ? '../' : './';
  await mkdir(dir, { recursive: true });
  for (const [page, name] of [['home', 'index.html'], ['project', 'project.html'], ['about', 'about.html']]) {
    const ctx = ctxFor(tree, page, new URLSearchParams(), base);
    const inner = builders[page](ctx);
    const html = shell(page, inner, ctx, page === 'project' ? { pageTitle: buildProjectTitle(ctx) } : {});
    await writeFile(join(dir, name), html);
    console.log('wrote', tree === 'zh' ? 'zh/' + name : name, html.length, 'bytes');
  }
}
