/* Brief half of the two demo families: validation, the deterministic template and its markup.
   The growth half lives in ./demo-views.js; the behavior lives in ./demos.js and ./demos-brief.js. */
import { language, html } from './demo-core.js';

export const BRIEF_PRESETS = Object.freeze({
  'ceramic-bottle': { en: { product: 'Ceramic bottle', audience: 'Commuters who carry a reusable bottle', detail: 'a ceramic body and screw-top lid' }, zh: { product: '陶瓷水瓶', audience: '习惯自带水瓶的通勤者', detail: '陶瓷瓶身和旋盖' } },
  'desk-lamp': { en: { product: 'Desk lamp', audience: 'Students working at a small study desk', detail: 'an adjustable shade and a compact base' }, zh: { product: '桌面台灯', audience: '在小书桌前学习的学生', detail: '可调节灯罩和小巧底座' } },
  'travel-bag': { en: { product: 'Travel bag', audience: 'People packing for a weekend away', detail: 'a wide opening and a separate front pocket' }, zh: { product: '旅行包', audience: '为周末短途旅行打包的人', detail: '宽开口和独立前袋' } }
});
const normalizeText = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export function validateBrief(input = {}) {
  const value = { product: normalizeText(input.product), audience: normalizeText(input.audience), detail: normalizeText(input.detail), tone: input.tone, duration: input.duration };
  const errors = {};
  for (const [key, min, max] of [['product', 2, 80], ['audience', 5, 160], ['detail', 5, 200]]) {
    if (value[key].length < min) errors[key] = 'too_short';
    else if (value[key].length > max) errors[key] = 'too_long';
  }
  if (!['calm', 'playful', 'direct'].includes(value.tone)) errors.tone = 'invalid_choice';
  if (![15, 30].includes(value.duration)) errors.duration = 'invalid_choice';
  return { valid: Object.keys(errors).length === 0, errors, value };
}

export function buildBrief(input, lang = 'en') {
  lang = language(lang);
  const validation = validateBrief(input);
  if (!validation.valid) {
    const error = new TypeError('Please provide valid brief inputs');
    error.fields = validation.errors;
    throw error;
  }
  const { product, audience, detail, tone, duration } = validation.value;
  const zh = lang === 'zh';
  const hooks = zh ? { calm: `留一点日常空间，给${product}。`, playful: `${product}，今天轮到你出镜。`, direct: `${product}，一个细节看清楚。` } : { calm: `Make a little room for the ${product}.`, playful: `POV: the ${product} gets the main-character moment.`, direct: `The ${product}, in one clear close-up.` };
  const hook = hooks[tone];
  const cta = zh ? ({ calm: `慢慢看看${product}的细节。`, playful: `下一位日常搭子？看看${product}。`, direct: `查看${product}的具体信息。` }[tone]) : ({ calm: `Take a closer look at the ${product}.`, playful: `Meet your maybe-next favorite: the ${product}.`, direct: `See the details of the ${product}.` }[tone]);
  const shots = zh ? [
    { time: duration === 15 ? '0–3s' : '0–5s', visual: `从${audience}熟悉的日常场景开始，让${product}自然入镜。`, overlay: hook },
    { time: duration === 15 ? '3–10s' : '5–15s', visual: `用特写展示${detail}。实际拍摄前核对产品细节。`, overlay: detail },
    ...(duration === 30 ? [{ time: '15–24s', visual: `回到${audience}的使用场景，展示一次简单、真实的使用过程。`, overlay: `放进日常，再看一眼。` }] : []),
    { time: duration === 15 ? '10–15s' : '24–30s', visual: `回到完整产品画面，保留足够时间读完行动提示。`, overlay: cta }
  ] : [
    { time: duration === 15 ? '0–3s' : '0–5s', visual: `Open on a familiar everyday moment for “${audience}”. Keep the ${product} in the frame.`, overlay: hook },
    { time: duration === 15 ? '3–10s' : '5–15s', visual: `Film a close-up of ${detail}. Verify this detail on the actual product before shooting.`, overlay: detail },
    ...(duration === 30 ? [{ time: '15–24s', visual: `Return to the everyday setting for ${audience}. Show one simple, real use of the product.`, overlay: 'One small detail, in everyday life.' }] : []),
    { time: duration === 15 ? '10–15s' : '24–30s', visual: 'End on the full product. Leave enough time to read the call to action.', overlay: cta }
  ];
  const toneName = zh ? { calm: '平静', playful: '轻松', direct: '直接' }[tone] : tone;
  const rationale = zh ? `采用${toneName}语气开场；由“${audience}”决定第一幕的场景，用“${detail}”为中段提供可拍摄的具体内容。这是一份本地模板草稿，没有使用外部 AI 服务；发布前仍需核实产品事实。` : `The ${toneName} tone shapes the opening. The audience (${audience}) sets the first scene, while “${detail}” gives the middle scene a specific detail to show. This is a local template draft, with no external AI service; verify product facts before publishing.`;
  return { templateBased: true, language: lang, product, audience, detail, tone, duration, hook, shots, cta, rationale };
}

export function briefToText(brief) {
  const zh = brief.language === 'zh';
  return [zh ? `Briefly / 本地模板草稿 / ${brief.duration}秒` : `Briefly / Local template draft / ${brief.duration} seconds`, brief.product, '', `${zh ? '目标人群' : 'Audience'}: ${brief.audience}`, `${zh ? '产品细节' : 'Product detail'}: ${brief.detail}`, '', `${zh ? '开场钩子' : 'Hook'}\n${brief.hook}`, '', `${zh ? '镜头清单' : 'Shot list'}\n${brief.shots.map(shot => `${shot.time} — ${shot.visual}\n${zh ? '画面文字' : 'On-screen text'}: ${shot.overlay}`).join('\n\n')}`, '', `${zh ? '行动提示' : 'Call to action'}\n${brief.cta}`, '', `${zh ? '设计理由' : 'Rationale'}\n${brief.rationale}`].join('\n');
}
export const BRIEF_COPY = {
  en: {
    eyebrow: 'Try the workflow', title: 'A blank page, with a head start', subtitle: 'Briefly turns a few product details into a short-form content brief.', badge: 'Local interactive prototype', notice: 'Template-based output, generated in this browser. No external AI API, uploads or account required. Inputs stay on this page until you copy or download them.',
    start: 'Start with a product', bottle: 'Ceramic bottle', lamp: 'Desk lamp', bag: 'Travel bag', product: 'Product name', audience: 'Who is this for', detail: 'One product detail to show', detailHint: 'Describe a visible detail you can verify, rather than an unproven benefit.', tone: 'Tone', calm: 'Calm', playful: 'Playful', direct: 'Direct', duration: 'Video length', seconds: 'seconds', build: 'Build brief', reset: 'Reset',
    result: 'Your content brief', sample: 'Sample draft', latest: 'Current draft', stale: 'Previous draft — build to update', copy: 'Copy', download: 'Download .txt', hook: 'Opening hook', shots: 'Shot list', overlay: 'On-screen text', cta: 'Call to action', rationale: 'Why this structure', method: 'How this prototype works', methodText: 'A deterministic local template maps your audience, product detail, tone and length into a storyboard. The same inputs produce the same draft. It does not infer product facts, generate images or measure likely performance.',
    dirty: 'Inputs changed. Build a brief to update the result.', ready: 'Brief built from the current inputs.', resetDone: 'Inputs and sample draft reset.', copied: 'Brief copied to your clipboard.', copyFailed: 'Clipboard unavailable. Select the brief text or download the .txt file.', downloaded: 'Text download requested.', downloadFailed: 'Download unavailable. You can select the brief text to copy it.', invalid: 'Please check the highlighted fields.',
    errors: { product: 'Use 2–80 characters for the product name.', audience: 'Describe the audience in 5–160 characters.', detail: 'Add a product detail in 5–200 characters.', tone: 'Choose one of the available tones.', duration: 'Choose a 15- or 30-second length.' }
  },
  zh: {
    eyebrow: '试用创作流程', title: '从空白页，到第一份草稿', subtitle: '用几个产品信息，在 Briefly 生成短视频内容简报。', badge: '本地互动原型', notice: '内容由浏览器内的模板生成，无外部 AI API、上传或账号。输入仅保留在当前页面，直到你主动复制或下载。',
    start: '选择一个起点', bottle: '陶瓷水瓶', lamp: '桌面台灯', bag: '旅行包', product: '产品名称', audience: '内容面向谁', detail: '想展示的一个产品细节', detailHint: '填写可以核实的可见细节，避免未经证实的效果描述。', tone: '语气', calm: '平静', playful: '轻松', direct: '直接', duration: '视频长度', seconds: '秒', build: '生成简报', reset: '重置',
    result: '你的内容简报', sample: '示例草稿', latest: '当前草稿', stale: '上一版草稿 — 生成后更新', copy: '复制', download: '下载 .txt', hook: '开场钩子', shots: '镜头清单', overlay: '画面文字', cta: '行动提示', rationale: '为什么这样安排', method: '原型如何工作', methodText: '固定的本地模板把受众、产品细节、语气与时长组成分镜。同样的输入会生成同样的草稿。原型不会推断产品事实、生成图片或预测内容表现。',
    dirty: '输入已修改，生成简报后更新结果。', ready: '已根据当前输入生成简报。', resetDone: '已恢复初始输入与示例草稿。', copied: '简报已复制到剪贴板。', copyFailed: '无法使用剪贴板，可选中简报文字或下载 .txt 文件。', downloaded: '已请求下载文本文件。', downloadFailed: '无法下载，可选中简报文字后复制。', invalid: '请检查标出的输入项。',
    errors: { product: '产品名称需要 2–80 个字符。', audience: '请用 5–160 个字符描述受众。', detail: '请用 5–200 个字符描述产品细节。', tone: '请选择可用的语气。', duration: '请选择 15 秒或 30 秒。' }
  }
};
export const initialBrief = (lang) => ({ ...BRIEF_PRESETS['ceramic-bottle'][language(lang)], tone: 'calm', duration: 15 });

export function briefResultMarkup(brief, lang) {
  const t = BRIEF_COPY[language(lang)];
  return `<div class="demo-brief-hook"><h5 class="demo-section-label">${t.hook}</h5><p>${html(brief.hook)}</p></div><div class="demo-shot-list"><h5 class="demo-section-label">${t.shots}</h5><ol>${brief.shots.map(shot => `<li><span class="demo-shot-time">${shot.time}</span><div><p>${html(shot.visual)}</p><small>${t.overlay}: <span>${html(shot.overlay)}</span></small></div></li>`).join('')}</ol></div><div class="demo-brief-cta"><h5 class="demo-section-label">${t.cta}</h5><p>${html(brief.cta)}</p></div><div class="demo-brief-rationale"><h5 class="demo-section-label">${t.rationale}</h5><p>${html(brief.rationale)}</p></div>`;
}
