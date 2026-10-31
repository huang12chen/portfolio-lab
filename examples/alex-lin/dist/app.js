/* Bootstrap. Both locales are static HTML — English at the root, Chinese in /zh/ — so this module
   never rebuilds a page: it adds the menu, filters, concept emphasis, demo binding and the motion
   controller to markup that is already readable without it. No third-party scripts. All listeners
   are removable; see motion.js for teardown. */
import { copy, projects, localProject } from './data.js';

const params = new URLSearchParams(location.search);
/* The directory decides the language, so the locale cannot disagree with the file the reader asked
   for; the query only ever redirects (see the boot script in each page). */
const lang = /^zh/i.test(document.documentElement.lang) ? 'zh' : 'en';
const zh = lang === 'zh';
const page = document.body.dataset.page;
const root = document.documentElement;
root.dataset.js = 'on';

let cleanupDemos = () => {};
let motion = null;

function ctx() {
  const items = projects.map(p => localProject(p, lang));
  return { items, lang, zh };
}

async function bootMotion() {
  try {
    const module = await import('./motion.js');
    motion = module.createMotionController({ lang });
    motion.start();
  } catch {
    root.dataset.motion = 'off';
    const toggle = document.querySelector('.motion-toggle');
    if (toggle) toggle.hidden = true;
  }
}

/* A case route with no `?id=` is the first case: the head script stamps `data-case` with
   projects[0].id, and everything below resolves the missing id the same way, so the revealed article
   and the demo mounted into it are the one case the reader is looking at. */
const caseId = () => params.get('id') || projects[0].id;

/* The interactive layer is the only thing here that cannot be produced from markup, so it is fetched
   on demand, only when the mount point belongs to the case the reader asked for, and only for that
   case: Signal fetches the growth dashboard, Briefly fetches the brief builder. The home and about
   pages download none of it. Every case page carries all three articles in the document, so testing
   for a mount alone made the unknown-id and Fieldwork routes download demo applications they never
   show, and a single demo bundle made Briefly pay for the dashboard it never renders. */
async function mountDemos() {
  if (page !== 'project') return;
  const requested = caseId();
  const growth = requested === 'signal';
  if (!growth && requested !== 'briefly') return;
  if (!document.querySelector(growth ? '[data-growth-demo]' : '[data-brief-demo]')) return;
  const { initDemos } = growth ? await import('./demos.js') : await import('./demos-brief.js');
  cleanupDemos = initDemos(document);
}

/* The case route is decided twice, and neither half needs views.js. The head script stamps data-case
   so the archive does not flash before one case is revealed; this names the case in the heading and
   the tab. Both strings come from data.js and the unknown-id panel ships inside the document, so an
   English case page no longer downloads the 31 KB template to re-label content it already has. A
   missing id is the first case, exactly as in the head script and mountDemos; only an id that is
   present and unknown falls through to the missing-case tab title. */
function syncCaseTitle() {
  const requested = caseId();
  const selected = projects.map(p => localProject(p, lang)).find(p => p.id === requested);
  if (selected) {
    const heading = document.getElementById('page-title');
    if (heading) heading.textContent = selected.short;
    document.title = selected.name + ' — Alex Lin';
  } else if (requested) document.title = copy[lang].missing + ' — Alex Lin';
}

function wire() {
  const c = copy[lang];
  const menu = document.querySelector('.menu-toggle');
  const mobile = document.querySelector('#mobile-nav');
  if (menu && mobile) {
    mobile.removeAttribute('data-static-open'); // JavaScript takes over: menu starts collapsed
    const navOpen = () => mobile.hasAttribute('data-static-open');
    const setNav = (open, focus = false) => {
      if (open) mobile.setAttribute('data-static-open', '');
      else mobile.removeAttribute('data-static-open');
      menu.setAttribute('aria-expanded', String(open));
      if (focus) menu.focus();
    };
    menu.addEventListener('click', () => setNav(!navOpen()));
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && navOpen()) setNav(false, true); });
    mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));
    const mq = matchMedia('(min-width: 861px)');
    mq.addEventListener('change', ev => { if (ev.matches) setNav(false); });
  }
  let filterVersion = 0;
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.filter;
    const version = ++filterVersion;
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    const grid = document.querySelector('#project-grid');
    if (!grid || version !== filterVersion) return;
    let shown = 0;
    grid.querySelectorAll('.project-card').forEach(card => {
      const hidden = value !== 'all' && card.dataset.category !== value;
      card.hidden = hidden;
      if (!hidden) shown += 1;
    });
    const status = document.querySelector('#filter-status');
    if (status) status.textContent = zh ? `${c.filterStatus} ${shown} 个案例` : `${c.filterStatus} ${shown} ${shown === 1 ? 'case' : 'cases'}`;
  }));
  const table = document.querySelector('[data-concepts-table]');
  if (table) {
    document.querySelectorAll('[data-concept-row]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-concept-row]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      table.querySelectorAll('[data-concept-index]').forEach(row => {
        if (row.dataset.conceptIndex === button.dataset.conceptRow) row.dataset.conceptActive = '';
        else delete row.dataset.conceptActive;
      });
    }));
  }
  cleanupDemos();
  void mountDemos();
  if (location.hash) {
    let fragment = location.hash.slice(1);
    try { fragment = decodeURIComponent(fragment); } catch { /* optional fragment only */ }
    const target = document.getElementById(fragment);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
}

/* The switch href is a path written into each locale's HTML, so it cannot know the fragment the
   reader is on. Carrying it across is what the old query-based switch did for free. */
const carryFragment = () => {
  const link = document.querySelector('.locale-switch');
  if (link && location.hash) link.href = link.href.split('#')[0] + location.hash;
};
window.addEventListener('hashchange', carryFragment);
carryFragment();

if (page === 'project') syncCaseTitle();
wire();
bootMotion();
window.addEventListener('pagehide', () => { cleanupDemos(); if (motion) motion.teardown(); });
