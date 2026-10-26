// One pressure system and one elastic selection surface, including late-added controls.
export function createRefinedInteractions(M) {
  const removers = [], timers = new Map(), down = new Set();
  const controls = '.button,.nav-contact,.art-replay,.filters button,.menu-toggle,.text-link';
  const elements = new Set(document.querySelectorAll(controls));
  const listen = (target, name, handler, options) => {
    target.addEventListener(name, handler, options);
    removers.push(() => target.removeEventListener(name, handler, options));
  };
  function resetPress(element) {
    clearTimeout(timers.get(element)); timers.delete(element); down.delete(element);
    element.classList.remove('is-down', 'is-released');
  }
  function press(element, event) {
    if (!element || element.disabled) return;
    if (!elements.has(element)) { elements.add(element); element.classList.add('has-press-feedback'); }
    resetPress(element);
    const box = element.getBoundingClientRect();
    element.style.setProperty('--press-x', `${event?.clientX == null ? box.width / 2 : event.clientX - box.left}px`);
    element.style.setProperty('--press-y', `${event?.clientY == null ? box.height / 2 : event.clientY - box.top}px`);
    element.classList.add('is-down'); down.add(element);
  }
  function release() {
    [...down].forEach(element => {
      down.delete(element); element.classList.remove('is-down'); element.classList.add('is-released');
      timers.set(element, setTimeout(() => { element.classList.remove('is-released'); timers.delete(element); }, 520));
    });
  }
  function resetAll() { elements.forEach(resetPress); }
  const targetControl = event => event.target instanceof Element ? event.target.closest(controls) : null;
  elements.forEach(element => element.classList.add('has-press-feedback'));
  listen(document, 'pointerdown', event => {
    if (event.button === 0 && event.isPrimary) press(targetControl(event), event);
  }, { passive: true });
  listen(document, 'pointerup', release, { passive: true });
  listen(document, 'pointercancel', resetAll, { passive: true });
  listen(document, 'keydown', event => {
    if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) press(targetControl(event));
    if (event.key === 'Escape' || event.key === 'Tab') resetAll();
  });
  listen(document, 'keyup', event => { if (event.key === 'Enter' || event.key === ' ') release(); });
  listen(window, 'blur', resetAll);
  listen(document, 'visibilitychange', () => { if (document.hidden) resetAll(); });
  const filters = document.querySelector('.filters');
  let indicator, fill, selectionAnimation, shapeAnimation, resizeObserver, lastX;
  if (filters) {
    indicator = document.createElement('span'); indicator.className = 'filter-indicator'; indicator.setAttribute('aria-hidden', 'true');
    fill = document.createElement('span'); fill.className = 'filter-fill'; indicator.append(fill);
    filters.prepend(indicator); filters.classList.add('is-enhanced');
    function positionSelection(instant = false) {
      const button = filters.querySelector('button[aria-pressed="true"]');
      if (!button) return;
      selectionAnimation?.stop(); shapeAnimation?.stop(); fill.style.transform = 'none';
      const frame = { x: button.offsetLeft, y: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight };
      if (instant) {
        indicator.style.transform = `translate(${frame.x}px,${frame.y}px)`;
        indicator.style.width = `${frame.width}px`; indicator.style.height = `${frame.height}px`;
      } else {
        selectionAnimation = M.animate(indicator, frame, { type: 'spring', stiffness: 380, damping: 33, mass: .8 });
        if (frame.x !== lastX) {
          fill.style.transformOrigin = frame.x > lastX ? 'left center' : 'right center';
          shapeAnimation = M.animate(fill, { scaleX: [1, 1.13, 1], scaleY: [1, .94, 1] }, { duration: .46, ease: [.22, .75, .18, 1] });
        }
      }
      lastX = frame.x;
    }
    positionSelection(true);
    listen(document, 'folio:filter', () => positionSelection());
    resizeObserver = new ResizeObserver(() => positionSelection(true));
    resizeObserver.observe(filters);
    filters.querySelectorAll('button').forEach(button => resizeObserver.observe(button));
  }
  return () => {
    resetAll(); removers.reverse().forEach(remove => remove());
    elements.forEach(element => {
      element.classList.remove('has-press-feedback');
      element.style.removeProperty('--press-x'); element.style.removeProperty('--press-y');
    });
    selectionAnimation?.stop(); shapeAnimation?.stop(); resizeObserver?.disconnect(); indicator?.remove(); filters?.classList.remove('is-enhanced');
  };
}
