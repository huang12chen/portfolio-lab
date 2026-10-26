import './vendor/motion-14.6.0.js';
import { createParticleArtwork } from './particles.js';
import { createDotCursor } from './cursor.js';
import { createRefinedInteractions } from './interactions.js';

const M = globalThis.Motion;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const ease = [.22, .75, .18, 1];
let paused = false;
let disposers = [];
let animations = [];
const layoutAnimations = new Set();
let generation = 0;
let snapshots = new Map();
let pauseButton;

export const motionEnabled = () => Boolean(M && !paused && !reduced.matches);

function remember(element) {
  if (!snapshots.has(element)) snapshots.set(element, element.getAttribute('style'));
  return element;
}
function animate(element, keyframes, options = {}) {
  (Array.isArray(element) ? element : [element]).forEach(remember);
  const animation = M.animate(element, keyframes, { duration: .7, ease, ...options });
  animations.push(animation);
  return animation;
}
function listen(element, event, handler, options) {
  element.addEventListener(event, handler, options);
  disposers.push(() => element.removeEventListener(event, handler, options));
}
function cleanEffects() {
  generation++;
  layoutAnimations.forEach(animation => animation.complete());
  layoutAnimations.clear();
  disposers.splice(0).reverse().forEach(dispose => dispose());
  animations.splice(0).forEach(animation => animation.stop());
  document.querySelector('#project-grid')?.getAnimations({ subtree: true }).forEach(animation => animation.finish());
  snapshots.forEach((style, element) => style === null ? element.removeAttribute('style') : element.setAttribute('style', style));
  snapshots.clear();
  document.documentElement.classList.remove('cursor-enabled');
  document.querySelectorAll('.is-pointer-active').forEach(element => element.classList.remove('is-pointer-active'));
}

export function animateFilterUpdate(grid, update) {
  if (!motionEnabled() || !M.animateLayout) { update(); return; }
  const started = generation;
  M.animateLayout(grid, update, { type: 'spring', duration: .65, bounce: .1 }).then(group => {
    if (started !== generation || !motionEnabled()) { group.complete(); return; }
    layoutAnimations.add(group);
    group.finished.then(() => layoutAnimations.delete(group));
  }, error => { console.error('The project filter could not animate.', error); update(); });
}

function enterAndScroll() {
  const lines = [...document.querySelectorAll('.title-line > span')];
  if (lines.length) animate(lines, { y: ['112%', '0%'], rotate: [3, 0] }, { duration: 1, delay: M.stagger(.12) });
  else {
    const heading = document.querySelector('main h1');
    if (heading) animate(heading, { y: [38, 0], opacity: [0, 1] }, { duration: .85 });
  }
  const intro = [...document.querySelectorAll('.hero-copy > p')];
  if (intro.length) animate(intro, { y: [24, 0], opacity: [0, 1] }, { delay: M.stagger(.08, { startDelay: .2 }) });
  const heroButton = document.querySelector('.hero-copy > .button');
  if (heroButton) animate(heroButton, { opacity: [0, 1] }, { delay: .38, duration: .65 });
  const headings = document.querySelectorAll('.section-heading h2,.teaser-inner h2,.project-sections h2,.contact-inner h2,.small-heading');
  headings.forEach(heading => {
    disposers.push(M.inView(heading, () => {
      animate(heading, { y: [28, 0], opacity: [.25, 1], clipPath: ['inset(0% 0% 100% 0%)', 'inset(0% 0% 0% 0%)'] }, { duration: .85 });
    }, { amount: .25 }));
  });
  document.querySelectorAll('.teaser-copy p,.experience-row,.practice-grid article,.project-sections section p,.project-card-link,.project-aside,.about-lead p,.project-summary,.project-title .hero-role,.back-link,.contact-inner p,.contact-actions,.credits-section p,.next-project').forEach((element, index) => {
    disposers.push(M.inView(element, () => { animate(element, { y: [20, 0], opacity: [.35, 1] }, { duration: .75, delay: (index % 3) * .045 }); }, { amount: .12 }));
  });
  document.querySelectorAll('.section-heading,.site-footer,.project-story,.credits-section').forEach(element => {
    element.classList.add('motion-rule');
    disposers.push(() => element.classList.remove('motion-rule', 'is-line-visible'));
    disposers.push(M.inView(element, () => { element.classList.add('is-line-visible'); }, { amount: .08 }));
  });
  const invitation = document.querySelector('.footer-invitation');
  if (invitation) disposers.push(M.inView(invitation, () => {
    animate(invitation, { y: [32, 0], opacity: [.25, 1] }, { duration: .95 });
  }, { amount: .35 }));
  const footer = document.querySelector('.footer-bottom');
  if (footer) disposers.push(M.inView(footer, () => {
    animate([...footer.children], { y: [12, 0], opacity: [.3, 1] }, { duration: .65, delay: M.stagger(.07) });
  }, { amount: .4 }));
  const progress = document.createElement('div');
  progress.className = 'reading-progress'; progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress); disposers.push(() => progress.remove());
  disposers.push(M.scroll(value => {
    progress.style.transform = `scaleX(${value})`;
  }, { trackContentSize: true }));
  if (innerWidth > 900) {
    const visual = document.querySelector('.hero-visual');
    if (visual) {
      const animation = animate(visual, { y: [0, 65] }, { ease: 'linear' });
      disposers.push(M.scroll(animation, { target: document.querySelector('.hero'), offset: ['start start', 'end start'] }));
    }
  }
  const menu = document.querySelector('.menu-toggle');
  listen(menu, 'click', () => {
    if (menu.getAttribute('aria-expanded') === 'true') animate(document.querySelector('#mobile-nav'), { opacity: [0, 1], y: [-12, 0] }, { duration: .25 });
  });
}

function pointerEffects() {
  if (!finePointer.matches) return;
  const springs = [];
  function bind(element, initial) {
    remember(element);
    const values = Object.fromEntries(Object.entries(initial).map(([key, value]) => {
      const spring = M.springValue(value, { stiffness: 220, damping: 26, mass: .7 });
      springs.push(spring); return [key, spring];
    }));
    disposers.push(M.styleEffect(element, values));
    return values;
  }
  document.querySelectorAll('.button > .control-content,.nav-contact > .control-content').forEach(element => {
    const values = bind(element, { x: 0, y: 0 });
    let box;
    const hitArea = element.parentElement;
    listen(hitArea, 'pointerenter', event => { if (event.pointerType === 'mouse') box = hitArea.getBoundingClientRect(); });
    listen(hitArea, 'pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      if (!box) box = hitArea.getBoundingClientRect();
      values.x.set((event.clientX - box.left - box.width / 2) * .12);
      values.y.set((event.clientY - box.top - box.height / 2) * .18);
    }, { passive: true });
    listen(hitArea, 'pointerleave', () => { box = undefined; values.x.set(0); values.y.set(0); });
    listen(hitArea, 'blur', () => { values.x.set(0); values.y.set(0); });
    listen(window, 'scroll', () => { box = undefined; values.x.set(0); values.y.set(0); }, { passive: true });
  });
  disposers.push(createDotCursor(M));
  document.querySelectorAll('.project-image').forEach(element => {
    const values = bind(element, { rotateX: 0, rotateY: 0 });
    let box;
    const reset = () => {
      box = undefined;
      values.rotateX.set(0); values.rotateY.set(0);
      element.classList.remove('is-pointer-active');
    };
    listen(element, 'pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      if (!box) box = element.getBoundingClientRect();
      element.classList.add('is-pointer-active');
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      values.rotateX.set((.5 - y) * 5); values.rotateY.set((x - .5) * 6);
      element.style.setProperty('--pointer-x', `${x * 100}%`);
      element.style.setProperty('--pointer-y', `${y * 100}%`);
    }, { passive: true });
    listen(element, 'pointerleave', reset);
    listen(window, 'scroll', reset, { passive: true });
    listen(window, 'blur', reset);
    listen(document, 'folio:filter', reset);
  });
  disposers.push(() => springs.forEach(value => value.destroy()));
}

function refresh() {
  cleanEffects();
  const enabled = motionEnabled();
  document.documentElement.dataset.motion = enabled ? 'on' : 'off';
  pauseButton.disabled = reduced.matches;
  pauseButton.setAttribute('aria-pressed', String(!enabled));
  const zh = document.documentElement.lang.startsWith('zh');
  pauseButton.setAttribute('aria-label', reduced.matches ? (zh ? '系统已减少动效' : 'System reduced motion enabled') : paused ? (zh ? '播放页面动效' : 'Play page motion') : (zh ? '暂停页面动效' : 'Pause page motion'));
  pauseButton.title = pauseButton.getAttribute('aria-label');
  const replay = document.querySelector('[data-art-replay]');
  if (replay) replay.hidden = !enabled;
  if (!enabled) return;
  enterAndScroll(); pointerEffects();
  disposers.push(createRefinedInteractions(M));
  const artwork = document.querySelector('.particle-artwork');
  if (artwork) {
    let disposeArtwork = createParticleArtwork(artwork);
    disposers.push(() => disposeArtwork());
    listen(document, 'folio:image-ready', event => {
      if (event.detail?.image === artwork.querySelector('img') && !artwork.querySelector('.art-particles')) {
        disposeArtwork(); disposeArtwork = createParticleArtwork(artwork);
      }
    });
  }
}

export function bootMotion() {
  if (!M?.animate || !M?.springValue) {
    console.warn('Motion is unavailable; keeping the static portfolio.');
    return;
  }
  pauseButton = document.querySelector('.motion-toggle');
  pauseButton.addEventListener('click', () => { paused = !paused; refresh(); });
  reduced.addEventListener('change', refresh); finePointer.addEventListener('change', refresh);
  window.addEventListener('pagehide', cleanEffects);
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  document.documentElement.classList.add('motion-ready');
  refresh();
}


