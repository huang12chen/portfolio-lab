/* Motion controller. The depth layer itself (pinned context, scroll-scrubbed frames, parallax on
   the layered console) is pure CSS and is enabled or removed by the single data-motion attribute on
   <html>, which this module owns together with the header state and one IntersectionObserver that
   pauses off-screen depth elements. Cross-document route transitions are the deliberate exception:
   they are gated only by prefers-reduced-motion, because keying them to the attribute would hand a
   reader with JavaScript switched off a cross-fade they had no way to decline. Teardown is real:
   observers disconnect, listeners are removed, and every animated element keeps its final static
   state. */
import { copy } from './data.js';

export function createMotionController({ lang = 'en' } = {}) {
  const c = copy[lang] ?? copy.en;
  const root = document.documentElement;
  const toggle = document.querySelector('.motion-toggle');
  let observer = null;
  let running = false;
  let reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // A pause the reader chose must survive the next page, or every route re-animates them.
  const STORE = 'alex-motion';
  const stored = () => { try { return localStorage.getItem(STORE); } catch { return null; } };
  const remember = on => { try { localStorage.setItem(STORE, on ? 'on' : 'off'); } catch { /* optional preference */ } };
  const onReducedChange = ev => { if (running && !stored()) setMode(!ev.matches); };

  const label = on => {
    if (!toggle) return;
    toggle.setAttribute('aria-label', on ? c.pauseMotion : c.playMotion);
    const text = toggle.querySelector('.sr-only');
    if (text) text.textContent = toggle.getAttribute('aria-label');
  };

  const setMode = on => {
    root.dataset.motion = on ? 'on' : 'off';
    label(on);
    if (on) attach(); else detach();
  };

  function attach() {
    if (observer) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const el = entry.target;
        if (el.dataset.sentinel !== undefined) {
          document.querySelector('.site-header')?.classList.toggle('is-scrolled', !entry.isIntersecting && entry.boundingClientRect.top < 0);
        } else {
          // Depth elements only animate while on screen: one observer, no rAF, no scroll listener.
          if (entry.isIntersecting) el.removeAttribute('data-depth-idle');
          else el.setAttribute('data-depth-idle', '');
        }
      }
    }, { rootMargin: '0px' });
    const targets = [...document.querySelectorAll('.header-sentinel, [data-parallax-root], .scrub-wrap')];
    targets.forEach(el => observer.observe(el));
  }

  function detach() {
    observer?.disconnect();
    observer = null;
    document.querySelectorAll('[data-parallax-root]').forEach(el => el.removeAttribute('data-depth-idle'));
    document.querySelector('.site-header')?.classList.remove('is-scrolled');
  }

  const onToggle = () => {
    const on = root.dataset.motion !== 'on';
    remember(on);
    setMode(on);
  };

  return {
    start() {
      if (running) return;
      running = true;
      if (toggle) {
        toggle.hidden = false;
        toggle.disabled = false; // never disabled by system preference: the reader chooses
        toggle.addEventListener('click', onToggle);
      }
      // An explicit choice wins; otherwise start from the system preference and stay live.
      const saved = stored();
      setMode(saved === 'on' || saved === 'off' ? saved === 'on' : !reduced.matches);
      reduced.addEventListener('change', onReducedChange);
    },
    teardown() {
      running = false;
      toggle?.removeEventListener('click', onToggle);
      reduced.removeEventListener('change', onReducedChange);
      detach();
    },
  };
}
