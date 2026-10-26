// A transient asset error gets one fresh request; a persistent error exposes a real retry action.
export function watchArtworkImages() {
  const records = new WeakMap();
  function eligible(image) {
    if (!(image instanceof HTMLImageElement) || !image.src) return false;
    const url = new URL(image.currentSrc || image.src, location.href);
    return url.origin === location.origin && url.pathname.includes('/assets/');
  }
  function state(image) {
    if (!records.has(image)) records.set(image, { source: image.getAttribute('src'), attempts: 0, button: undefined });
    return records.get(image);
  }
  function hostOf(image) { return image.closest('.particle-artwork,.photo-cover'); }
  function retry(image, record) {
    record.attempts++;
    const host = hostOf(image);
    if (host) { host.dataset.imageState = 'loading'; host.setAttribute('aria-busy', 'true'); }
    record.button?.remove(); record.button = undefined;
    const url = new URL(record.source, location.href);
    url.searchParams.set('reload', String(Date.now()));
    image.src = url.href;
  }
  function error(event) {
    const image = event.target;
    if (!eligible(image)) return;
    const record = state(image);
    if (record.attempts === 0) { retry(image, record); return; }
    const host = hostOf(image);
    if (!host) return;
    host.dataset.imageState = 'error'; host.removeAttribute('aria-busy');
    if (!record.button && host.closest('a[href]')) {
      record.button = document.createElement('span'); record.button.className = 'media-unavailable';
      record.button.textContent = '画作暂时无法加载'; host.append(record.button); return;
    }
    if (!record.button) {
      record.button = document.createElement('button'); record.button.type = 'button';
      record.button.className = 'button media-retry'; record.button.textContent = '重新加载画作';
      record.button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); retry(image, record); }); host.append(record.button);
    }
  }
  function loaded(event) {
    const image = event.target;
    if (!eligible(image)) return;
    const record = records.get(image);
    if (!record?.attempts || !image.naturalWidth) return;
    record.button?.remove(); record.button = undefined;
    const host = hostOf(image);
    if (host) { host.dataset.imageState = 'ready'; host.removeAttribute('aria-busy'); }
    document.dispatchEvent(new CustomEvent('folio:image-ready', { detail: { image } }));
  }
  document.addEventListener('error', error, true);
  document.addEventListener('load', loaded, true);
  document.querySelectorAll('img').forEach(image => {
    if (eligible(image) && image.complete && !image.naturalWidth) error({ target: image });
  });
  document.documentElement.dataset.imageRecoveryReady = 'true';
}
