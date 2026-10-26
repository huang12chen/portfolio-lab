// Original Canvas 2D artwork effect. The image stays as the accessible fallback.
export function createParticleArtwork(host) {
  const image = host?.querySelector('img');
  if (!image) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'art-particles';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const sampler = document.createElement('canvas');
  const sampleContext = sampler.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) return () => {};
  let width = 0, height = 0, cell = 5, points = [], crop;
  let raf = 0, elapsed = 0, lastFrame = 0, visible = true, disposed = false;
  let pulseTimer = 0;
  const pointer = { x: -1000, y: -1000, active: false };
  const compact = matchMedia('(max-width: 700px)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const state = (name) => { if (host.dataset.artState !== name) host.dataset.artState = name; };
  function wake() {
    if (!disposed && visible && !document.hidden && !raf && points.length) {
      lastFrame = 0;
      host.dataset.artRunning = 'true';
      raf = requestAnimationFrame(frame);
    }
  }
  function stop() {
    cancelAnimationFrame(raf); raf = 0; lastFrame = 0;
    host.dataset.artRunning = 'false';
  }
  function resize() {
    if (disposed || !image.naturalWidth) return;
    const box = host.getBoundingClientRect();
    const nextWidth = Math.round(box.width), nextHeight = Math.round(box.height);
    if (width === nextWidth && height === nextHeight && points.length) return;
    width = nextWidth; height = nextHeight;
    if (!width || !height) return;
    const wasReady = points.length > 0;
    const density = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * density); canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sw = width / scale, sh = height / scale;
    crop = [(image.naturalWidth - sw) * .48, (image.naturalHeight - sh) * .5, sw, sh];
    cell = compact.matches ? 5.5 : Math.max(5, Math.sqrt(width * height / 9000));
    const columns = Math.ceil(width / cell), rows = Math.ceil(height / cell);
    sampler.width = columns; sampler.height = rows;
    sampleContext.drawImage(image, ...crop, 0, 0, columns, rows);
    const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
    points = [];
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const at = (row * columns + column) * 4;
      const ox = (column + .5) * cell, oy = (row + .5) * cell;
      const seed = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
      const angle = (seed - Math.floor(seed)) * Math.PI * 2;
      points.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0,
        sx: width * .5 + Math.cos(angle) * width * .55,
        sy: height * .5 + Math.sin(angle * 1.7) * height * .65,
        color: `rgb(${pixels[at]},${pixels[at + 1]},${pixels[at + 2]})` });
    }
    elapsed = wasReady ? 1600 : 0;
    pointer.active = false;
    wake();
  }
  function frame(now) {
    raf = 0;
    if (disposed || !visible || document.hidden) { stop(); return; }
    const delta = lastFrame ? now - lastFrame : 34;
    if (delta < 30) { raf = requestAnimationFrame(frame); return; }
    lastFrame = now;
    elapsed += Math.min(delta, 50);
    const progress = clamp(elapsed / 1600, 0, 1);
    const ease = 1 - (1 - progress) ** 3;
    const radius = compact.matches ? 70 : 100;
    const moving = [];
    let energy = 0;
    for (const point of points) {
      const dx = point.x - pointer.x, dy = point.y - pointer.y;
      const square = dx * dx + dy * dy;
      if (pointer.active && square < radius * radius) {
        const distance = Math.max(1, Math.sqrt(square));
        const force = (1 - distance / radius) * 3.8;
        point.vx += (dx / distance) * force;
        point.vy += (dy / distance) * force;
      }
      point.vx = (point.vx + (point.ox - point.x) * .055) * .82;
      point.vy = (point.vy + (point.oy - point.y) * .055) * .82;
      point.x += point.vx; point.y += point.vy;
      const offset = Math.abs(point.x - point.ox) + Math.abs(point.y - point.oy);
      energy = Math.max(energy, offset);
      if (offset > .2) moving.push(point);
    }
    context.clearRect(0, 0, width, height);
    if (progress < 1) {
      for (const point of points) {
        context.fillStyle = point.color;
        const x = point.sx + (point.x - point.sx) * ease;
        const y = point.sy + (point.y - point.sy) * ease;
        const size = .8 + (cell - .8) * ease;
        context.fillRect(x - size / 2, y - size / 2, size, size);
      }
      if (progress > .8) {
        context.globalAlpha = (progress - .8) / .2;
        context.drawImage(image, ...crop, 0, 0, width, height);
        context.globalAlpha = 1;
      }
      state('forming');
    } else {
      context.drawImage(image, ...crop, 0, 0, width, height);
      for (const point of moving) context.clearRect(point.ox - cell / 2, point.oy - cell / 2, cell + .4, cell + .4);
      for (const point of moving) {
        context.fillStyle = point.color;
        context.fillRect(point.x - cell * .44, point.y - cell * .44, cell * .88, cell * .88);
      }
      state(pointer.active ? 'interactive' : energy > .2 ? 'settling' : 'still');
    }
    if (progress < 1 || pointer.active || energy > .2) raf = requestAnimationFrame(frame);
    else host.dataset.artRunning = 'false';
  }
  function pointAt(event) {
    const box = host.getBoundingClientRect();
    pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top;
    pointer.active = true; wake();
  }
  function move(event) { if (event.pointerType === 'mouse') pointAt(event); }
  function leave() { pointer.active = false; wake(); }
  function touch(event) {
    if (event.pointerType === 'mouse') return;
    pointAt(event); clearTimeout(pulseTimer);
    pulseTimer = setTimeout(leave, 240);
  }
  function replay() {
    elapsed = 0;
    points.forEach(point => { point.x = point.ox; point.y = point.oy; point.vx = point.vy = 0; });
    wake();
  }
  function visibility() { if (document.hidden) stop(); else wake(); }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? wake() : stop(); });
  const resizer = new ResizeObserver(() => { try { resize(); } catch (error) { fallback(error); } });
  const replayButton = document.querySelector('[data-art-replay]');
  host.addEventListener('pointermove', move, { passive: true });
  host.addEventListener('pointerleave', leave);
  host.addEventListener('pointerdown', touch, { passive: true });
  replayButton?.addEventListener('click', replay);
  document.addEventListener('visibilitychange', visibility);
  image.decode().then(() => {
    if (disposed) return;
    resize();
    host.append(canvas); host.classList.add('particles-ready');
    observer.observe(host); resizer.observe(host);
  }).catch(fallback);
  function fallback(error) {
    if (disposed) return;
    cleanup();
    console.warn('Artwork animation could not start; keeping the image.', error);
  }
  function cleanup() {
    disposed = true; stop(); clearTimeout(pulseTimer);
    observer.disconnect(); resizer.disconnect();
    host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); host.removeEventListener('pointerdown', touch);
    replayButton?.removeEventListener('click', replay); document.removeEventListener('visibilitychange', visibility);
    canvas.remove(); host.classList.remove('particles-ready'); state('static');
  }
  return cleanup;
}

