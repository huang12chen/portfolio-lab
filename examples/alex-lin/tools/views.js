/* Pure page builders, used at build time by generate-static.mjs to write both locale trees.
   No DOM access, and none of this ships: app.js never imports this file, so a reader downloads the
   HTML these produce instead of the code that produces it. This file used to sit in dist/ with
   that claim in its header while the static server answered /views.js with all 43 KB — unreferenced
   is not the same as unreachable. It lives in tools/ now, beside its only importer, and
   measure-site.mjs asserts /views.js answers 404. */
import { copy, projects, localProject } from '../dist/data.js';
import { language } from '../dist/demo-core.js';
import { getGrowthReport, periodLabel, metricMarkup, chartMarkup, productRowsMarkup, forecastMarkup, GROWTH_COPY } from '../dist/demo-views.js';
import { buildBrief, BRIEF_COPY, initialBrief, briefResultMarkup } from '../dist/brief-views.js';

const e = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[x]));
const money = (value, lang) => new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(value);
const count = (value, lang) => new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US').format(value);
const dayLabel = (date, lang) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const icon = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const badge = c => `<span class="fiction-badge"><i aria-hidden="true"></i>${e(c.fiction)}</span>`;

/** Weekly aggregates of the real synthetic dataset (28 days, all markets). */
export function weeklyFrames(lang = 'en') {
  const series = getGrowthReport().series;
  /* One scale for the whole month, and every frame draws the month. Normalising each week against
     its own peak put all four lines in the top 5% of the box — week 3 measured y 8.0–9.9 in a
     40-unit viewBox, i.e. a flat bar pinned above two thirds of empty card. Plotting the full
     28-day trace behind the week's own segment fills the frame and makes the point the scrub is
     actually making: this week is a step on a rising month, not a shape in isolation. */
  const lo = Math.min(...series.map(d => d.revenue));
  const hi = Math.max(...series.map(d => d.revenue));
  const xy = (i, v) => `${(4 + i * (112 / 27)).toFixed(1)},${(34 - ((v - lo) / (hi - lo)) * 28).toFixed(1)}`;
  const trace = series.map((d, i) => xy(i, d.revenue)).join(' ');
  const frames = [];
  for (let week = 0; week < 4; week += 1) {
    const days = series.slice(week * 7, week * 7 + 7);
    const totals = days.reduce((t, d) => ({ revenue: t.revenue + d.revenue, orders: t.orders + d.orders, spend: t.spend + d.spend }), { revenue: 0, orders: 0, spend: 0 });
    const points = days.map((d, i) => xy(week * 7 + i, d.revenue)).join(' ');
    frames.push({ start: days[0].date, end: days[days.length - 1].date, ...totals, roas: totals.revenue / totals.spend, trace, points });
  }
  return frames;
}

const EXTRA = {
  en: {
    heroAria: 'Open the Signal case: the console mock uses the same synthetic totals as the dashboard',
    heroInsight: ['From observation', 'to the next move'],
    stripLabel: 'Fictional context',
    stripBasis: 'These three figures are quoted from the <a href="{resume}" download>sample résumé</a>, not calculated by the demos. Every number inside the cases is computed from the synthetic dataset; the Signal case exports those daily rows as CSV.',
    filtersAria: 'Filter projects',
    pinnedLabel: 'The claim, kept in view',
    claim: 'From scattered channel reports to one weekly decision a small team could actually make.',
    metricsDt: ['sample days', 'markets', 'revenue ÷ spend'],
    pinnedSource: 'Figures: synthetic sample dataset, all markets, ending Sep 28, 2026. ROAS from the same period as the dashboard.',
    journey: [['Notice', 'Scattered reports. Repeated questions.'], ['Interpret', 'No shared starting point for a decision.'], ['Choose', 'A brief the team can discuss.']],
    notesTitle: 'Six sample notes',
    notesIntro: 'One interview, one note. Read side by side, the same question arrives from different roles, which is why the team needed a shared starting point before it needed another report.',
    noteCols: ['Interview', 'Recurring question', 'Workaround today', 'Consequence'],
    notes: [
      ['Merchandiser · three markets', 'Which number do I trust this week?', 'Rebuilds one sheet from three exports every Monday', 'The first hour of the week goes to reconciliation instead of a decision'],
      ['Founder · two-person store', 'Did the campaign actually work?', 'Screenshots the ad dashboard into a slide', 'The team debates the story, not the next test'],
      ['Operations lead · seasonal catalogue', 'Why did orders dip?', 'Asks the warehouse and the channel owner separately', 'Two answers arrive, with no shared starting point'],
      ['Marketing manager · six channels', 'Is this a channel problem or a product problem?', 'Combines channel reports by hand at month end', 'Learning arrives after the decision it should have informed'],
      ['Agency strategist · five clients', 'What did we learn last month?', 'Keeps a running document nobody reopens', 'Every kickoff restarts from memory'],
      ['Founder · after a failed launch', 'What would change our mind?', 'Asks for more data', 'Features keep shipping without naming the behaviour to watch'],
    ],
    notesNote: 'Six invented interviews. The quotes are illustrative composites, not transcripts; the notes demonstrate the synthesis method rather than real research evidence.',
    conceptCols: ['Concept', 'Effort', 'Value now', 'Learning speed', 'Next test'],
    concepts: [
      ['Decision brief', 'Low', 'High, immediately', 'Fast — one shared artifact', 'Does a weekly brief help the team pick one action?'],
      ['Report hub', 'Medium', 'Medium', 'Slow — dashboards answer old questions', 'Which report actually changes a decision?'],
      ['Automation suite', 'High', 'Unvalidated', 'Slow — dependencies before learning', 'Can a small prototype survive failed inputs and handover?'],
    ],
    conceptsNote: 'Invented research and an illustrative comparison demonstrate the decision process, not real interviews or commercial validation.',
    conceptsIntro: 'A long feature list made the opportunity feel bigger but the first useful release harder to see. The table is the whole comparison — the buttons only move emphasis.',
    decisionsKicker: 'Outcome',
    methodKicker: 'How the work happens',
    backAria: 'Back to all work',
    timeline: [['2023 — 2026', 'Northstar Studio', 'AI Product & Growth Lead', 'Turning recurring commerce-team problems into product ideas people can use, discuss and evaluate.'], ['2020 — 2023', 'Morrow Commerce', 'Growth Operator → Growth Lead', 'From content tests and commerce operations to cross-market analysis and a focused weekly decision rhythm.']],
    timelineKicker: 'An invented career path',
    timelineTitle: 'From growth questions to product opportunities',
    timelineNote: 'The employers, roles and career history above are fictional teaching material, not verified employment or endorsements.',
    principleKicker: 'A way of working',
    principle: 'The idea gets better when you can use it',
    principleNote: 'Alex Lin is fictional, so this section is set in type rather than a photograph of a desk. The demonstration material lives in the three cases; stock photography would only repeat what the text already says.',
    buildKicker: 'Now make it yours',
    buildTitle: 'Keep the method\nMake it your story',
    buildText: 'This example ships with the portfolio-website Skill. Bring your own real materials and choose the positioning, cases and visual direction that fit you.',
    buildSteps: [['Start with the materials', 'A résumé, work samples and a target reader. Keep contribution and evidence clear.'], ['Make the work tangible', 'Choose imagery, documents, data or a working prototype to suit each case.'], ['Test, then share', 'Exercise the full reader journey and deploy as an ordinary static website.']],
    aboutTitle: 'A product mind\nA growth instinct',
    aboutKicker: 'Meet the fictional character',
    aboutLead1: 'I like turning a complicated question into a useful next step.',
    aboutLead2: 'Alex’s six-year fictional career begins with understanding customers and commerce, then turns recurring problems into product opportunities. The three cases explore how growth judgement, product thinking and practical implementation support each other.',
    career: 'AI Product & Growth Lead',
    noscript: 'This fictional portfolio ships its whole written argument, in both languages, as static HTML. JavaScript adds two things only: the interactive dashboard and brief builder, and the project filters. No AI service, sign-in or API key is required.',
    archiveIntro: 'Without JavaScript all three complete cases are shown here in order. The written argument, tables and metrics need nothing to run.',
    projectTitle: 'Selected work — three fictional cases',
    conceptsTitle: 'Compare three concepts',
  },
  zh: {
    heroAria: '打开 Signal 案例：控制台示意与下方看板使用同一组合成数据',
    heroInsight: ['从观察', '到下一步'],
    stripLabel: '虚构履历速览',
    stripBasis: '这三个数字摘自<a href="{resume}" download>示例简历</a>，不是演示算出来的。案例内部的每一项数字都由合成数据计算得出；Signal 案例可把每日数据导出为 CSV。',
    filtersAria: '筛选项目',
    pinnedLabel: '保持可见的论点',
    claim: '把分散的渠道报表，变成一个团队每周真正能做的决定。',
    metricsDt: ['天样本', '个市场', '收入 ÷ 花费'],
    pinnedSource: '数字来源：合成样本数据，全部市场，统计截止 2026 年 9 月 28 日。ROAS 与看板使用相同周期。',
    journey: [['观察', '分散的数据，重复的沟通。'], ['解释', '团队缺少共用的决策起点。'], ['选择', '先做一份可讨论的决策简报。']],
    notesTitle: '六份示例笔记',
    notesIntro: '一次访谈留一张笔记。并排读下来，同一个问题从不同角色口中反复出现；这也是团队在需要下一张报表之前，先需要一个共用起点的原因。',
    noteCols: ['访谈对象', '反复出现的问题', '现在的做法', '带来的影响'],
    notes: [
      ['商品运营 · 三个市场', '这周该信哪个数字？', '每周一从三份导出里重新拼一张表', '一周的第一个小时花在对数上，而不是做决定'],
      ['创始人 · 两人的小店', '这次投放到底有没有用？', '把广告后台截图放进幻灯片', '团队争的是说法，不是下一步验证'],
      ['运营负责人 · 季节性目录', '订单为什么掉了？', '分别去问仓库和渠道负责人', '得到两个答案，却没有共同的起点'],
      ['市场经理 · 六个渠道', '这是渠道问题还是产品问题？', '月底手工合并各渠道报表', '结论总是在该做的决定之后才到'],
      ['代理商策略 · 五个客户', '上个月我们学到了什么？', '维护一份没人再打开的文档', '每次启动会都从记忆重新开始'],
      ['创始人 · 一次失败的发布之后', '什么结果会让我们改变想法？', '先要更多数据', '功能继续上线，却没说清要观察的行为'],
    ],
    notesNote: '六次访谈均为虚构。引述是示意性的综合表述，不是访谈记录；这组笔记演示的是归纳方法，而非真实研究证据。',
    conceptCols: ['概念', '投入', '当前价值', '学习速度', '下一步验证'],
    concepts: [
      ['决策简报', '低', '高，即刻可用', '快——一份共享产出', '每周简报能否帮团队选定一个行动？'],
      ['报表中心', '中', '中', '慢——看板回答的是旧问题', '哪些报表真正改变了决定？'],
      ['自动化系统', '高', '待验证', '慢——依赖先于学习', '小原型能否扛住失败输入与人工接管？'],
    ],
    conceptsNote: '此处用虚构研究与示意比较演示产品判断，并非真实访谈或商业验证。',
    conceptsIntro: '很长的功能清单让机会显得很大，却让第一个有用的版本越来越模糊。这张表就是完整的取舍本身——按钮只负责移动重点。',
    decisionsKicker: '成果',
    methodKicker: '工作方式',
    backAria: '返回全部项目',
    timeline: [['2023 — 2026', 'Northstar Studio', 'AI 产品与增长负责人', '把跨境团队反复遇到的问题，转化为可以体验、讨论和验证的产品方案。'], ['2020 — 2023', 'Morrow Commerce', '增长运营 → 增长负责人', '从内容测试与商品运营出发，建立跨市场增长分析和每周决策节奏。']],
    timelineKicker: '虚构的职业路径',
    timelineTitle: '从业务问题，到产品机会',
    timelineNote: '以上公司、职位与经历为教学设定，不代表真实雇佣关系或雇主背书。',
    principleKicker: '相信的工作方式',
    principle: '好的想法，需要一个可以体验的版本',
    principleNote: 'Alex Lin 是虚构人物，所以这一段用排版呈现工作方式，而不是放一张办公桌照片。真正的演示材料在三个案例里；摄影图只会重复文字已经说过的话。',
    buildKicker: '现在，换成你的故事',
    buildTitle: '保留方法，\n写出你的版本',
    buildText: '这个示例随开源技能提供。使用自己的真实材料，重新选择适合你的定位、案例、视觉与呈现方式。',
    buildSteps: [['梳理材料', '从简历、作品与目标读者开始，说清本人贡献和证据。'], ['做出体验', '按作品类型选择图片、文档、数据或交互原型。'], ['验证与发布', '测试完整阅读路径，再部署为普通浏览器可以访问的网站。']],
    aboutTitle: '把问题讲清楚，\n把答案做出来',
    aboutKicker: '认识这个虚构人物',
    aboutLead1: '我喜欢把一个复杂的问题，变成一个清楚、有用的下一步。',
    aboutLead2: '这段六年虚构履历从理解客户与电商开始，再把反复出现的问题做成产品机会。三个案例展示增长判断、产品思维与落地能力如何互相配合。',
    career: 'AI 产品与跨境增长',
    noscript: '这个虚构作品集的全部文字论证，中英文两个版本，都写在静态 HTML 里。JavaScript 只增加两样东西：交互看板与简报生成器，以及项目筛选。不需要 AI 服务、登录或 API 密钥。',
    archiveIntro: '没有 JavaScript 时，这里按顺序展示三个完整案例。文字论证、表格与指标不需要任何脚本。',
    projectTitle: '精选案例 —— 三个虚构项目',
    conceptsTitle: '对比三个方案',
  }
};

/**
 * `base` is where the document holding this markup lives: './' for the English tree at the root and
 * '../' for the Chinese tree in /zh/. Every route the page can reach is written against it, so one
 * template generates two static trees instead of one static tree plus a runtime rebuild — which is
 * what makes the Chinese locale readable with JavaScript switched off, and what keeps 63KB of
 * template modules out of the transfer.
 */
export function ctxFor(lang, page, params, base = './') {
  const c = copy[lang];
  const x = EXTRA[lang];
  const zh = lang === 'zh';
  const items = projects.map(p => localProject(p, lang));
  const home = base + 'index.html';
  const about = base + 'about.html';
  const url = id => base + 'project.html?id=' + encodeURIComponent(id);
  const file = page === 'home' ? 'index.html' : page === 'about' ? 'about.html' : 'project.html';
  const localeHref = () => (zh ? '../' : './zh/') + file;
  const resume = base + 'assets/sample-resume.md';
  /* Copy strings carry {resume} rather than a path because the same sentence has to land in two
     trees at two depths; the template resolves the token, so the prose stays written once. */
  const text = value => String(value).replaceAll('{resume}', resume);
  /* The route shows one case when ?id= names a known project; the builders need to know which,
     because the heading has to describe what is actually on screen. */
  const wanted = params?.get?.('id') ?? '';
  const caseId = projects.some(p => p.id === wanted) ? wanted : '';
  return { lang, zh, c, x, items, home, about, url, page, file, caseId, localeHref, resume, text };
}

/* ---------- Cover artifacts (hand-built, all text ≥11px, real data where numbers appear) ---------- */

function consoleMock(report, lang) {
  const zh = lang === 'zh';
  const series = report.series;
  /* Scale the trace to the series' own floor and ceiling, not to zero: a 28-day revenue line spans
     roughly 15% of its maximum, so dividing by max squashes every day into the top of a 100-unit box
     and leaves the flagship artifact two-thirds empty below its own chart. */
  const values = series.map(d => d.revenue);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const line = series.map((d, i) => `${i ? 'L' : 'M'}${(4 + i * (452 / (series.length - 1))).toFixed(1)} ${(88 - ((d.revenue - min) / range) * 72).toFixed(1)}`).join('');
  return `<div class="console-mock">
    <div class="console-layer console-bezel" aria-hidden="true"></div>
    <div class="console-layer console-screen">
      <p class="console-brand">signal<span class="console-dot" aria-hidden="true">.</span></p>
      <p class="console-period">${zh ? '合成数据 · 2026 年 9 月' : 'synthetic data · Sep 2026'}</p>
      <div class="console-stats"><div><span>${zh ? '商品销售额' : 'Gross sales'}</span><strong>${e(money(report.totals.revenue, lang))}</strong></div><div><span>${zh ? '订单' : 'Orders'}</span><strong>${e(count(report.totals.orders, lang))}</strong></div><div><span>ROAS</span><strong>${report.metrics.roas.toFixed(2)}×</strong></div></div>
      <svg width="460" height="100" viewBox="0 0 460 100" role="img" aria-label="${zh ? '样本周期每日销售额走势，总体上升' : 'Daily gross sales over the sample period, trending upward'}"><title>${zh ? '样本周期每日销售额走势' : 'Daily gross sales, sample period'}</title><path d="${line}"/></svg>
      <p class="console-foot">${zh ? '28 天样本 · 美国 · 英国 · 德国 · 美元' : '28 sample days · US · UK · DE · USD'}</p>
    </div>
    <div class="console-layer console-insight"><span>${zh ? '增长有节奏，' : 'Growth has a rhythm —'}</span><strong>${zh ? '下一步才看得清。' : 'so the next move shows.'}</strong></div>
  </div>`;
}

function briefMock() {
  return `<div class="brief-mock" aria-hidden="true"><span class="brief-bottle"><i></i></span><div class="brief-paper"><em>briefly</em><b></b><b></b><b></b><b class="short"></b></div></div>`;
}

function notesMock() {
  return `<div class="notes-mock" aria-hidden="true"><span class="note note-back"></span><span class="note note-front"></span></div>`;
}

/* The card thumbnail used to be the same console mock as the hero, so the signature artifact
   appeared twice on the home page and its 355px height set the three-card row's baseline 153px
   below the other two. The card now shows the case's own object at card scale: four week-bars on
   the same 28-day dataset, with the last week in the signal colour. Heights are the real weekly
   totals divided by the fourth week (8,212/9,502/10,474/11,964), so the shape is the data. */
function ledgerMock(lang) {
  const bars = [8212, 9502, 10474, 11964];
  const max = bars[bars.length - 1];
  const cap = lang === 'zh' ? '销售额 · 4 周 · 2026 年 9 月 · 示例' : 'Gross sales · 4 weeks · Sep 2026 · sample';
  return `<div class="ledger-mock" aria-hidden="true"><p class="ledger-cap">${cap}</p><p class="ledger-total">$40,152</p><ol class="ledger-bars">${bars.map((v, i) => `<li class="${i === bars.length - 1 ? 'is-last' : ''}" style="--h:${Math.round(v / max * 100)}%"></li>`).join('')}</ol><div class="ledger-axis"><span>01</span><span>02</span><span>03</span><span>04</span></div></div>`;
}

function cover(id, lang) {
  if (id === 'signal') return ledgerMock(lang);
  return id === 'briefly' ? briefMock() : notesMock();
}

/* ---------- Shared blocks ---------- */

function card(p, ctx) {
  const { c, url } = ctx;
  return `<article class="project-card" data-category="${p.category}"><a class="project-card-link" href="${url(p.id)}"><div class="project-image tone-${p.tone}">${cover(p.id, ctx.lang)}<span class="project-open control-icon">${icon}</span></div><span class="card-meta"><span>${e(p.type)}</span><span>${p.year}</span></span><h3>${e(p.short)}</h3><p>${e(p.preview)}</p><span class="project-more">${e(c.readCase)} <span class="control-icon">${icon}</span></span></a></article>`;
}

function caseHeader(p, ctx) {
  const { c, home } = ctx;
  return `<header class="case-title"><a class="back-link" href="${home}#work">${e(c.back)}</a><p class="case-type">${e(p.type)} · ${p.year}</p><h2 class="case-h2" id="case-h-${p.id}">${e(p.title)}</h2><p class="case-summary">${e(p.summary)}</p><div class="case-status">${badge(c)}<span>${e(c.caseLabel)}</span></div></header>`;
}

function snapshotBlock(p, c) {
  return `<section class="case-snapshot" aria-labelledby="snapshot-h-${p.id}"><h3 id="snapshot-h-${p.id}">${e(c.snapshot)}</h3><div class="snapshot-pairs"><div><p class="kicker">${e(c.taskLabel)}</p><p class="question">${e(p.question)}</p></div><div><p class="kicker">${e(c.roleLabel)}</p><p>${e(p.role)}</p></div></div><dl class="case-facts">${p.facts.map(([a, b]) => `<dt>${e(a)}</dt><dd>${e(b)}</dd>`).join('')}</dl></section>`;
}

function contentsNav(entries, c) {
  return entries.length < 2 ? '' : `<nav class="case-contents" aria-label="${e(c.onPage)}"><span>${e(c.onPage)}</span>${entries.map(([href, label]) => `<a href="${href}">${e(label)}</a>`).join('')}</nav>`;
}

function decisionsBlock(p, ctx, mode) {
  const { c, x } = ctx;
  const stream = `<div class="narrative-stream"><p class="challenge">${e(p.challenge)}</p>${p.decisions.map(([t, d], i) => `<section class="decision-section"><h4><span class="decision-number" aria-hidden="true">${i + 1}</span>${e(t)}</h4><p>${e(d)}</p></section>`).join('')}</div>`;
  const inner = mode === 'pinned'
    ? `<div class="narrative-layout"><aside class="narrative-context"><p class="kicker">${e(x.pinnedLabel)}</p><p class="narrative-claim">${e(x.claim)}</p><dl class="context-metrics"><dt>${e(getGrowthReport().series.length)} ${e(x.metricsDt[0])}</dt><dd>${e(money(getGrowthReport().totals.revenue, ctx.lang))}</dd><dt>3 ${e(x.metricsDt[1])}</dt><dd>US · UK · DE</dd><dt>${e(x.metricsDt[2])}</dt><dd>${getGrowthReport().metrics.roas.toFixed(2)}×</dd></dl><p class="context-source">${e(c.narrativeLead)}</p><p class="context-source">${e(x.pinnedSource)}</p></aside>${stream}</div>`
    : `<div class="decision-stack">${stream}</div>`;
  return `<section id="case-process-${p.id}" aria-labelledby="process-h-${p.id}"><h3 id="process-h-${p.id}">${e(c.thinking)}</h3>${inner}</section>`;
}

function resultsBlock(p, ctx) {
  const { c, x } = ctx;
  return `<section class="case-results" id="case-results-${p.id}" aria-labelledby="results-h-${p.id}"><p class="kicker">${e(x.decisionsKicker)}</p><h3 id="results-h-${p.id}">${e(c.results)}</h3><p>${e(p.outcome)}</p></section>`;
}

function browseBlock(items, p, ctx) {
  const { c, url: urlFor } = ctx;
  return `<nav class="case-browse" aria-label="${e(c.related)}"><span class="kicker">${e(c.related)}</span><span class="browse-links">${items.filter(q => q.id !== p.id).map(q => `<a href="${urlFor(q.id)}">${e(q.short)} <span class="control-icon">${icon}</span></a>`).join('')}</span></nav>`;
}

/* ---------- The three cases: deliberately different layouts ---------- */

/* The two cases that carry a running application say so in one line where the application cannot run.
   There is exactly one such place: a reader with JavaScript switched off. Each page's head script
   stamps `data-case` on every project route — the named case if the id is recognised, otherwise the
   first one — so a scripted reader who reaches project.html with no `?id=` gets Signal's article with
   Signal's dashboard mounted into it, and never sees this line. Without a script nothing is stamped,
   all three articles stay on screen in order and neither demo can bind, so demos.css removes the two
   hosts from the layout: a slider that moves a number nobody recalculates and a form whose submit
   answers nothing are worse reading than a gap, and the invented-static-state failure is exactly what
   the craft audit's state probe is for. This line names what is missing instead of hiding it. */
function demoStaticLine(ctx) {
  const { c } = ctx;
  return `<p class="demo-static-note">${e(c.demoStaticNote)}</p>`;
}

function caseSignal(p, ctx) {
  const { c, x, lang, items, url: urlFor } = ctx;
  const frames = weeklyFrames(lang);
  const report = getGrowthReport();
  return `<article class="case" id="case-signal" data-case="signal" aria-labelledby="case-h-signal">
    ${caseHeader(p, ctx)}
    ${contentsNav([['#case-artifact-signal', c.artifact], ['#case-rhythm', c.rhythmNav], ['#case-process-signal', c.thinking], ['#case-results-signal', c.results]], c)}
    <div class="case-opening"><div class="detail-cover tone-sage">${consoleMock(report, lang)}</div>${snapshotBlock(p, c)}</div>
    <section class="case-artifact" id="case-artifact-signal" aria-labelledby="artifact-h-signal"><h3 id="artifact-h-signal">${e(c.artifact)}</h3>${renderGrowthDemo(lang)}${demoStaticLine(ctx)}</section>
    <section class="case-rhythm" id="case-rhythm" aria-labelledby="rhythm-h"><h3 id="rhythm-h">${e(c.rhythmTitle)}</h3><p class="rhythm-intro">${e(c.rhythmIntro)}</p>
      <div class="scrub-wrap"><div class="scrub-stage"><p class="scrub-hint">${e(c.scrubHint)}</p><div class="scrub-rail" aria-hidden="true"><i></i></div><ol class="scrub-track">${frames.map((f, i) => `<li class="scrub-frame"><h4>${e(c.weekLabel)} ${i + 1} · ${e(dayLabel(f.start, lang))} – ${e(dayLabel(f.end, lang))}</h4><svg width="120" height="40" viewBox="0 0 120 40" role="img" aria-label="${e(dayLabel(f.start, lang))} – ${e(dayLabel(f.end, lang))}: ${e(money(f.revenue, lang))}"><title>${e(c.weekLabel)} ${i + 1}</title><polyline class="month-trace" points="${f.trace}"/><polyline class="week-trace" points="${f.points}"/></svg><dl><dt>${e(c.revenueCol)}</dt><dd>${e(money(f.revenue, lang))}</dd><dt>${e(c.ordersCol)}</dt><dd>${e(count(f.orders, lang))}</dd><dt>${e(c.roasCol)}</dt><dd>${f.roas.toFixed(2)}×</dd></dl></li>`).join('')}</ol></div></div>
      <div class="table-scroll" role="region" aria-label="${e(c.weekCaption)}" tabindex="0"><table class="week-table"><caption>${e(c.weekCaption)}</caption><thead><tr><th scope="col">${e(c.weekLabel)}</th><th scope="col">${e(c.revenueCol)}</th><th scope="col">${e(c.ordersCol)}</th><th scope="col">${e(c.spendCol)}</th><th scope="col">${e(c.roasCol)}</th></tr></thead><tbody>${frames.map((f, i) => `<tr><th scope="row">${i + 1} · ${e(dayLabel(f.start, lang))}–${e(dayLabel(f.end, lang))}</th><td>${e(money(f.revenue, lang))}</td><td>${e(count(f.orders, lang))}</td><td>${e(money(f.spend, lang))}</td><td>${f.roas.toFixed(2)}×</td></tr>`).join('')}</tbody></table></div>
      <p class="rhythm-source">${e(c.rhythmSource)}</p></section>
    ${decisionsBlock(p, ctx, 'pinned')}
    ${resultsBlock(p, ctx)}
    ${browseBlock(items, p, ctx)}
  </article>`;
}

function caseBriefly(p, ctx) {
  const { c, x, lang, items, url: urlFor } = ctx;
  const preset = lang === 'zh'
    ? { product: '陶瓷水瓶', audience: '习惯自带水瓶的通勤者', detail: '陶瓷瓶身和旋盖', tone: 'calm', duration: 15 }
    : { product: 'Ceramic bottle', audience: 'Commuters who carry a reusable bottle', detail: 'a ceramic body and screw-top lid', tone: 'calm', duration: 15 };
  const brief = buildBrief(preset, lang);
  return `<article class="case case-briefly" id="case-briefly" data-case="briefly" aria-labelledby="case-h-briefly">
    ${caseHeader(p, ctx)}
    ${contentsNav([['#case-storyboard', c.storyboardNav], ['#case-artifact-briefly', c.artifact], ['#case-process-briefly', c.thinking], ['#case-results-briefly', c.results]], c)}
    ${snapshotBlock(p, c)}
    <section class="case-storyboard" id="case-storyboard" aria-labelledby="board-h"><h3 id="board-h">${e(c.storyboardTitle)}</h3><p class="board-note">${e(c.storyboardNote)}</p>
      <ol class="shot-list">${brief.shots.map(s => `<li><span class="shot-time">${e(s.time)}</span><p>${e(s.visual)}</p><p class="shot-overlay">${e(s.overlay)}</p></li>`).join('')}</ol></section>
    <section class="case-artifact" id="case-artifact-briefly" aria-labelledby="artifact-h-briefly"><h3 id="artifact-h-briefly">${e(c.artifact)}</h3>${renderBriefDemo(lang)}${demoStaticLine(ctx)}</section>
    ${decisionsBlock(p, ctx, 'stack')}
    ${resultsBlock(p, ctx)}
    ${browseBlock(items, p, ctx)}
  </article>`;
}

function caseFieldwork(p, ctx) {
  const { c, x, items, url: urlFor } = ctx;
  return `<article class="case case-fieldwork" id="case-fieldwork" data-case="fieldwork" aria-labelledby="case-h-fieldwork">
    ${caseHeader(p, ctx)}
    ${contentsNav([['#case-notes', x.notesTitle], ['#case-concepts', x.conceptCols[0]], ['#case-process-fieldwork', c.thinking], ['#case-results-fieldwork', c.results]], c)}
    ${snapshotBlock(p, c)}
    <section class="journey-section" aria-labelledby="journey-h"><h3 id="journey-h">${x.journey.map(([t]) => e(t)).join(' → ')}</h3>
      <ol class="research-journey">${x.journey.map(([t, d], i) => `<li><span class="journey-index" aria-hidden="true">${i + 1}</span><h4>${e(t)}</h4><p>${e(d)}</p></li>`).join('')}</ol></section>
    <section class="case-artifact" id="case-notes" aria-labelledby="notes-h"><h3 id="notes-h">${e(x.notesTitle)}</h3><p class="concepts-intro">${e(x.notesIntro)}</p>
      <div class="table-scroll" role="region" aria-label="${e(c.notesCaption)}" tabindex="0"><table class="notes-table"><caption>${e(c.notesCaption)}</caption><thead><tr>${x.noteCols.map(col => `<th scope="col">${e(col)}</th>`).join('')}</tr></thead><tbody>${x.notes.map(row => `<tr><th scope="row">${e(row[0])}</th><td>${e(row[1])}</td><td>${e(row[2])}</td><td>${e(row[3])}</td></tr>`).join('')}</tbody></table></div>
      <p class="artifact-limit">${e(x.notesNote)}</p></section>
    <section class="case-artifact" id="case-concepts" aria-labelledby="concepts-h"><h3 id="concepts-h">${e(x.conceptsTitle)}</h3><p class="concepts-intro">${e(x.conceptsIntro)}</p>
      <div class="concept-controls" role="group" aria-label="${e(c.conceptsCaption)}">${x.concepts.map((row, i) => `<button type="button" data-concept-row="${i}" aria-pressed="${i === 0}">${e(row[0])}</button>`).join('')}</div>
      <div class="table-scroll" role="region" aria-label="${e(c.conceptsCaption)}" tabindex="0"><table class="concepts-table" data-concepts-table><caption>${e(c.conceptsCaption)}</caption><thead><tr>${x.conceptCols.map(col => `<th scope="col">${e(col)}</th>`).join('')}</tr></thead><tbody>${x.concepts.map((row, i) => `<tr data-concept-index="${i}"${i === 0 ? ' data-concept-active' : ''}><th scope="row">${e(row[0])}</th><td>${e(row[1])}</td><td>${e(row[2])}</td><td>${e(row[3])}</td><td>${e(row[4])}</td></tr>`).join('')}</tbody></table></div>
      <p class="artifact-limit">${e(x.conceptsNote)}</p></section>
    ${decisionsBlock(p, ctx, 'stack')}
    ${resultsBlock(p, ctx)}
    ${browseBlock(items, p, ctx)}
  </article>`;
}

/* ---------- Demo mount points ---------- */

/* These two build the markup the reader scrolls to. They used to live in demo-views.js, which the
   browser does need, so every case-page visitor downloaded ~7 KB of template that had already run
   at build time and could never run again in their tab. demos.js imports only the helpers these call,
   so the split is by who executes the code: reader or generator. */
export function renderGrowthDemo(lang = 'en') {
  lang = language(lang);
  const t = GROWTH_COPY[lang];
  const report = getGrowthReport();
  return `<section class="demo-growth" data-growth-demo data-lang="${lang}" aria-label="${lang === 'zh' ? 'Morrow 互动电商看板' : 'Morrow interactive commerce dashboard'}">
    <header class="demo-top"><div><p class="demo-eyebrow">${t.eyebrow}</p><h3>${t.title}</h3><p class="demo-subtitle">${t.subtitle}</p></div><span class="demo-badge"><span aria-hidden="true"></span>${t.badge}</span></header>
    <p class="demo-provenance">${t.notice}</p>
    <div class="demo-toolbar"><label class="demo-control"><span>${t.market}</span><select data-growth-market><option value="all">${t.all}</option><option value="us">${t.us}</option><option value="uk">${t.uk}</option><option value="de">${t.de}</option></select></label><label class="demo-control"><span>${t.period}</span><select data-growth-days>${[7, 14, 28].map(days => `<option value="${days}"${days === 28 ? ' selected' : ''}>${days} ${t.dayLabel}</option>`).join('')}</select></label><div class="demo-toolbar-actions"><button type="button" class="demo-button demo-button-secondary" data-growth-reset>${t.reset}</button><button type="button" class="demo-button demo-button-primary" data-growth-export>${t.export}<span aria-hidden="true"> ↗</span></button></div></div>
    <p class="demo-period" data-growth-period>${t.active}: ${t.all} · ${periodLabel(report, lang)}</p>
    <div class="demo-metrics" data-growth-metrics>${metricMarkup(report, lang)}</div>
    <div class="demo-growth-grid"><div class="demo-card demo-chart-card"><div class="demo-card-heading"><div><h4>${t.chartTitle}</h4><p>${t.chartSub}</p></div><span class="demo-chart-key"><i aria-hidden="true"></i>${t.gross}</span></div><div data-growth-chart>${chartMarkup(report, lang)}</div></div>
    <aside class="demo-card"><div class="demo-card-heading"><div><p class="demo-eyebrow">${t.forecast}</p><h4>${t.forecastSub}</h4></div></div><label class="demo-budget"><span>${t.budget}<output data-growth-budget-value>${money(2500, lang)}</output></span><input type="range" min="0" max="10000" step="100" value="2500" data-growth-budget aria-label="${t.budget}"><span class="demo-budget-ends"><span>${money(0, lang)}</span><span>${money(10000, lang)}</span></span></label><div data-growth-forecast>${forecastMarkup(report, 2500, lang)}</div><p class="demo-assumption">${t.assumption}</p></aside></div>
    <div class="demo-card demo-table-card" role="region" aria-label="${e(t.tableTitle)}"><div class="demo-card-heading"><div><h4>${t.tableTitle}</h4><p>${t.tableSub}</p></div></div><table><caption class="demo-sr-only">${t.tableTitle} · ${t.tableSub}</caption><thead><tr><th scope="col">${t.product}</th><th scope="col">${t.orders}</th><th scope="col">${t.gross}</th><th scope="col">${t.spend}</th><th scope="col">ROAS</th></tr></thead><tbody data-growth-products>${productRowsMarkup(report, lang)}</tbody></table></div>
    <p class="demo-footnote">${t.footnote}</p><p class="demo-status" data-growth-status role="status" aria-live="polite"></p>
  </section>`;
}

export function renderBriefDemo(lang = 'en') {
  lang = language(lang);
  const t = BRIEF_COPY[lang];
  const value = initialBrief(lang);
  return `<section class="demo-brief" data-brief-demo data-lang="${lang}" aria-label="${lang === 'zh' ? 'Briefly 内容简报互动原型' : 'Briefly interactive content brief prototype'}">
    <header class="demo-top"><div><p class="demo-eyebrow">${t.eyebrow}</p><h3>${t.title}</h3><p class="demo-subtitle">${t.subtitle}</p></div><span class="demo-badge"><span aria-hidden="true"></span>${t.badge}</span></header><p class="demo-provenance">${t.notice}</p>
    <div class="demo-brief-grid"><form class="demo-card demo-brief-form" data-brief-form novalidate><fieldset class="demo-presets"><legend>${t.start}</legend><div>${[['ceramic-bottle', t.bottle], ['desk-lamp', t.lamp], ['travel-bag', t.bag]].map(([id, label], index) => `<button type="button" data-brief-preset="${id}" aria-pressed="${index === 0}">${label}</button>`).join('')}</div></fieldset>
      <label class="demo-control"><span>${t.product}</span><input type="text" name="product" maxlength="80" minlength="2" value="${e(value.product)}" required autocomplete="off"></label>
      <label class="demo-control"><span>${t.audience}</span><textarea name="audience" maxlength="160" minlength="5" rows="2" required>${e(value.audience)}</textarea></label>
      <label class="demo-control"><span>${t.detail}</span><textarea name="detail" maxlength="200" minlength="5" rows="2" required>${e(value.detail)}</textarea><small>${t.detailHint}</small></label>
      <div class="demo-form-row"><label class="demo-control"><span>${t.tone}</span><select name="tone">${['calm', 'playful', 'direct'].map(tone => `<option value="${tone}">${t[tone]}</option>`).join('')}</select></label><label class="demo-control"><span>${t.duration}</span><select name="duration"><option value="15">15 ${t.seconds}</option><option value="30">30 ${t.seconds}</option></select></label></div>
      <p class="demo-form-error" data-brief-error role="alert" hidden></p><div class="demo-form-actions"><button class="demo-button demo-button-primary" type="submit">${t.build}<span aria-hidden="true"> →</span></button><button class="demo-button demo-button-secondary" type="button" data-brief-reset>${t.reset}</button></div>
      <details class="demo-method"><summary>${t.method}</summary><p>${t.methodText}</p></details>
    </form><article class="demo-card demo-brief-output"><div class="demo-card-heading"><div><h4 tabindex="-1" data-brief-result-heading>${t.result}</h4><p data-brief-version>${t.sample}</p></div><div class="demo-result-actions"><button type="button" class="demo-button demo-button-small" data-brief-copy>${t.copy}</button><button type="button" class="demo-button demo-button-small" data-brief-download>${t.download}</button></div></div><div data-brief-result>${briefResultMarkup(buildBrief(value, lang), lang)}</div></article></div><p class="demo-status" data-brief-status role="status" aria-live="polite"></p>
  </section>`;
}

/* ---------- Pages ---------- */

export function buildProjectInner(ctx) {
  const { items, x } = ctx;
  const archive = `<p class="archive-note">${e(x.archiveIntro)}</p>`;
  /* The unknown-id panel ships in the document rather than being assembled at runtime. It is built
     from this same template, so it cannot drift from the Chinese route, and the English case page no
     longer has to download this 31 KB module just to say "this case isn't here". */
  return archive + items.map(p => p.id === 'signal' ? caseSignal(p, ctx) : p.id === 'briefly' ? caseBriefly(p, ctx) : caseFieldwork(p, ctx)).join('') + buildMissing(ctx);
}

export function buildProjectTitle(ctx) {
  const selected = ctx.caseId ? ctx.items.find(p => p.id === ctx.caseId) : null;
  return `<h1 class="page-title" id="page-title">${e(selected ? selected.short : ctx.x.projectTitle)}</h1>`;
}

export function buildHome(ctx) {
  const { c, x, zh, items, url: urlFor, about, text } = ctx;
  const report = getGrowthReport();
  return `<section class="hero wrap" aria-labelledby="hero-h"><div><p class="hero-role">${e(c.role)}</p><h1 id="hero-h"><span class="title-line"><span>${e(c.line1)}</span></span><span class="title-line"><span><em>${e(c.line2)}</em></span></span></h1><p class="hero-intro">${e(c.intro)}</p><div class="hero-buttons"><a class="button button-dark" href="#work">${e(c.workCTA)} <span class="control-icon">${icon}</span></a><a class="text-link" href="${about}">${e(c.aboutCTA)}</a></div><div class="hero-footnote">${badge(c)}<p>${e(c.fictionNote)}</p></div></div><div class="hero-visual"><a class="hero-product-link" href="${urlFor('signal')}" aria-label="${e(x.heroAria)}"><div class="hero-stage" data-parallax-root>${consoleMock(report, ctx.lang)}</div><p class="stage-caption">${e(x.heroInsight[0])} → ${e(x.heroInsight[1])}</p></a></div></section>
  <section class="career-strip wrap" aria-label="${e(x.stripLabel)}"><p class="strip-label">${e(x.stripLabel)}</p><div><strong>6</strong><span>${e(c.heroYears)}</span></div><div><strong>3</strong><span>${e(c.heroMarkets)}</span></div><div><strong>$12.8M</strong><span>${e(c.heroMetric)}</span></div><p class="strip-basis">${text(x.stripBasis)}</p></section>
  <section class="work-section wrap" id="work" aria-labelledby="work-h"><div class="section-heading"><h2 id="work-h">${e(c.work)}</h2><div class="filters" role="group" aria-label="${e(x.filtersAria)}">${[['all', c.all], ['growth', c.growth], ['product', c.product], ['research', c.research]].map(([v, t]) => `<button type="button" data-filter="${v}" aria-pressed="${v === 'all'}">${e(t)}</button>`).join('')}</div></div><p class="work-intro">${e(c.workIntro)}</p><p id="filter-status" class="sr-only" role="status" aria-live="polite"></p><div class="project-grid" id="project-grid">${items.map(p => card(p, ctx)).join('')}</div></section>
  <section class="approach-section" aria-labelledby="approach-h"><div class="wrap"><div class="approach-heading"><p class="kicker">${e(x.methodKicker)}</p><h2 id="approach-h">${c.methods.length ? e(c.methodTitle).replace('\n', '<br>') : ''}</h2><p>${e(c.methodIntro)}</p></div><ol class="approach-list">${c.methods.map(([t, d]) => `<li><h3>${e(t)}</h3><p>${e(d)}</p></li>`).join('')}</ol><a class="text-link approach-cta" href="${about}#build">${e(c.build)} <span class="control-icon">${icon}</span></a></div></section>`;
}

export function buildAbout(ctx) {
  const { c, x, zh, resume } = ctx;
  const briefUrl = ctx.url('briefly');
  return `<section class="about-hero wrap" aria-labelledby="about-h"><div><p class="kicker">${e(x.aboutKicker)}</p><h1 id="about-h">${e(x.aboutTitle).replace('\n', '<br>')}</h1><div class="about-identity"><span class="profile-monogram" aria-hidden="true">al.</span><span class="about-name"><strong>Alex Lin</strong><span>${e(x.career)}</span></span></div></div><div class="about-lead"><p class="about-lead-line">${e(x.aboutLead1)}</p><p>${e(x.aboutLead2)}</p><div class="about-disclosure">${badge(c)}<p>${e(c.fictionNote)}</p></div></div></section>
  <section class="principle-band" aria-labelledby="principle-h"><div class="wrap principle-inner"><p class="kicker">${e(x.principleKicker)}</p><h2 id="principle-h">${e(x.principle)}</h2><p class="principle-note">${e(x.principleNote)}</p><a class="text-link" href="${briefUrl}">${e(c.prototypeLabel)} <span class="control-icon">${icon}</span></a></div></section>
  <section class="experience-section wrap" aria-labelledby="exp-h"><div class="section-heading"><p class="kicker">${e(x.timelineKicker)}</p><h2 id="exp-h">${e(x.timelineTitle)}</h2></div>${x.timeline.map(([date, name, role, text]) => `<article class="experience-row"><p class="experience-date">${e(date)}</p><div><h3>${e(name)}</h3><p class="experience-role">${e(role)}</p><p>${e(text)}</p></div></article>`).join('')}<p class="experience-note">${e(x.timelineNote)}</p></section>
  <section id="build" class="build-section" aria-labelledby="build-h"><div class="wrap build-inner"><div><p class="kicker">${e(x.buildKicker)}</p><h2 id="build-h">${e(x.buildTitle).replace('\n', '<br>')}</h2><p>${e(x.buildText)}</p><a class="button button-dark" href="${resume}" download>${e(c.sample)} <span aria-hidden="true">↓</span></a></div><ol class="build-steps">${x.buildSteps.map(([t, d], i) => `<li><span class="step-index" aria-hidden="true">${i + 1}</span><div><h3>${e(t)}</h3><p>${e(d)}</p></div></li>`).join('')}</ol></div></section>`;
}

export function buildMissing(ctx) {
  const { c, items, url: urlFor } = ctx;
  return `<section class="project-missing wrap"><p class="missing-title">${e(c.missing)}</p><p>${e(c.missingText)}</p><ul class="missing-list">${items.map(p => `<li><a href="${urlFor(p.id)}">${e(p.short)}</a></li>`).join('')}</ul></section>`;
}

export function headerHTML(ctx) {
  const { c, x, zh, home, about, localeHref } = ctx;
  const back = home + '#work';
  return `<a class="wordmark" href="${home}" aria-label="${zh ? 'Alex Lin —— 首页' : 'Alex Lin — home'}">alex.</a><div class="header-actions"><nav class="desktop-nav" aria-label="${zh ? '主导航' : 'Main navigation'}"><a href="${back}">${e(c.work)}</a><a href="${about}">${e(c.about)}</a><a class="nav-contact" href="${about}#build">${e(c.build)}<span class="control-icon">${icon}</span></a></nav><a class="locale-switch" href="${localeHref()}" lang="${zh ? 'en' : 'zh-CN'}" aria-label="${zh ? 'Switch to English' : '切换到中文'}">${zh ? 'EN' : '中文'}</a><button class="motion-toggle" type="button" hidden><span class="pause-mark" aria-hidden="true">❙❙</span><span class="play-mark" aria-hidden="true">▶</span><span class="sr-only">${e(c.pauseMotion)}</span></button><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav">${e(c.menu)}<span class="menu-glyph" aria-hidden="true">＋</span></button></div><nav id="mobile-nav" class="mobile-nav" aria-label="${zh ? '手机导航' : 'Mobile navigation'}" data-static-open><a href="${back}">${e(c.work)}</a><a href="${about}">${e(c.about)}</a><a href="${about}#build">${e(c.build)}</a></nav>`;
}

export function footerHTML(ctx) {
  const { c, about } = ctx;
  return `<a class="footer-invitation" href="${about}#build"><span>${e(c.footer)}</span><span class="footer-arrow control-icon">${icon}</span></a><p class="footer-sub">${e(c.footerSub)}</p><div class="footer-contact"><p class="kicker">${e(c.contactLabel)}</p><a href="mailto:alex.lin@example.com">alex.lin@example.com</a><p class="footer-contact-note">${e(c.contactNote)}</p></div><div class="footer-bottom"><span>alex. · ${e(c.fiction)}</span><a href="#main">${e(c.top)} ↑</a><span>© 2026</span></div>`;
}

export { EXTRA, e };
