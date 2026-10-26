// Precise dot + soft ring. Native pointers remain until the first real mouse move.
export function createDotCursor(M) {
  const cursor = document.createElement('div');
  cursor.className = 'work-cursor site-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"><div></div></div>';
  document.body.append(cursor);
  const dot = cursor.querySelector('.cursor-dot');
  const ring = cursor.querySelector('.cursor-ring');
  const x = M.springValue(0, { stiffness: 540, damping: 38, mass: .45 });
  const y = M.springValue(0, { stiffness: 540, damping: 38, mass: .45 });
  const releaseStyle = M.styleEffect(ring, { x, y });
  const removers = [];
  let active = false, lastX = 0, lastY = 0;
  const nativeTarget = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),iframe,video,audio';
  const interactive = 'a[href],button:not(:disabled),[role="button"],[data-art-replay],.particle-artwork';
  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    removers.push(() => target.removeEventListener(name, handler, options));
  }
  function hide() {
    active = false;
    cursor.classList.remove('is-active', 'is-pressed', 'is-link', 'is-control');
    document.documentElement.classList.remove('cursor-enabled');
  }
  function syncLayer() {
    const layer = document.querySelector('dialog[open]') || document.body;
    if (cursor.parentElement !== layer) layer.append(cursor);
  }
  const layerObserver = new MutationObserver(syncLayer);
  layerObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  syncLayer();
  function targetState(target) {
    if (!(target instanceof Element) || target.closest(nativeTarget)) { hide(); return false; }
    cursor.classList.toggle('is-link', Boolean(target.closest(interactive)));
    cursor.classList.toggle('is-control', Boolean(target.closest('button:not(:disabled),.button,.nav-contact')));
    return true;
  }
  function move(event) {
    if (event.pointerType !== 'mouse') { hide(); return; }
    lastX = event.clientX; lastY = event.clientY;
    syncLayer();
    if (typeof HTMLDialogElement !== 'undefined' && event.target instanceof HTMLDialogElement && event.target.open) {
      const box = event.target.getBoundingClientRect();
      if (lastX < box.left || lastX > box.right || lastY < box.top || lastY > box.bottom) { hide(); return; }
    }
    if (!targetState(event.target)) return;
    // The dot uses exact coordinates. Only its decorative ring follows a spring.
    dot.style.transform = `translate3d(${lastX}px,${lastY}px,0)`;
    if (!active) { x.jump(lastX); y.jump(lastY); ring.style.transform = `translate3d(${lastX}px,${lastY}px,0)`; }
    else { x.set(lastX); y.set(lastY); }
    active = true;
    cursor.classList.add('is-active');
    document.documentElement.classList.add('cursor-enabled');
  }
  listen(document, 'pointermove', move, { passive: true });
  listen(document, 'pointerout', event => { if (!event.relatedTarget || (event.relatedTarget instanceof Element && event.relatedTarget.closest(nativeTarget))) hide(); });
  listen(document, 'pointerdown', event => {
    if (event.pointerType !== 'mouse') { hide(); return; }
    if (active && event.button === 0) cursor.classList.add('is-pressed');
  }, { passive: true });
  listen(document, 'pointerup', () => cursor.classList.remove('is-pressed'), { passive: true });
  listen(document, 'pointercancel', hide);
  listen(document, 'keydown', event => { if (event.key === 'Tab' || event.key === 'Escape') hide(); });
  listen(window, 'scroll', () => { if (active) targetState(document.elementFromPoint(lastX, lastY)); }, { passive: true });
  listen(window, 'blur', hide);
  listen(document, 'visibilitychange', () => { if (document.hidden) hide(); });
  return () => {
    hide(); layerObserver.disconnect(); removers.reverse().forEach(remove => remove());
    releaseStyle(); x.destroy(); y.destroy(); cursor.remove();
  };
}