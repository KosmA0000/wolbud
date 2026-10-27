(() => {
  'use strict';
  const gallery = document.querySelector('.wb-gallery-page [data-wb-gallery]');
  if (!gallery) return;
  const grid = gallery.querySelector('.wb-masonry');
  const items = [...grid.querySelectorAll('.wb-gallery-item')];
  const cards = items.map(item => item.querySelector('.wb-masonry-card'));
  const filters = [...gallery.querySelectorAll('[data-gallery-filter]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pool = document.createElement('div');
  pool.className = 'wb-gallery-pool';
  pool.hidden = true;
  grid.after(pool);
  const firstObservation = new WeakSet();
  const entranceTimers = new WeakMap();
  const flipAnimations = new WeakMap();
  let columns = 0;
  let category = filters.some(button => button.dataset.galleryFilter === location.hash.slice(1)) ? location.hash.slice(1) : 'all';
  let resizeFrame = 0;

  function finishEntrance(item) {
    clearTimeout(entranceTimers.get(item));
    const reveal = item.querySelector('.wb-card-reveal');
    reveal.classList.remove('is-entering');
    reveal.classList.add('is-revealed');
    item.dataset.enterState = 'ready';
  }
  function enter(item, initial) {
    if (item.hidden || item.dataset.enterState !== 'waiting') return;
    if (reduced.matches) { finishEntrance(item); return; }
    const reveal = item.querySelector('.wb-card-reveal');
    const delay = initial ? .2 + Number(item.dataset.column) * .06 + Number(item.dataset.row) * .2 : 0;
    item.style.setProperty('--entry-delay', `${delay}s`);
    item.dataset.enterState = 'animating';
    reveal.classList.add('is-entering');
    entranceTimers.set(item, setTimeout(() => finishEntrance(item), (Number(item.dataset.duration) + delay) * 1000 + 100));
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const initial = !firstObservation.has(entry.target);
      firstObservation.add(entry.target);
      if (entry.isIntersecting && !entry.target.hidden) {
        enter(entry.target, initial);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0 }) : null;

  items.forEach((item, index) => {
    item.dataset.enterState = 'waiting';
    item.querySelector('.wb-card-reveal').addEventListener('animationend', event => {
      if (event.animationName === 'wbGalleryArrive') finishEntrance(item);
    });
    cards[index].addEventListener('focus', () => finishEntrance(item));
  });

  function layout(animate = false) {
    const oldRects = new Map();
    if (animate && !reduced.matches) items.forEach(item => {
      if (!item.hidden) oldRects.set(item, item.getBoundingClientRect());
    });
    columns = grid.clientWidth < 768 ? 2 : 3;
    grid.style.setProperty('--gallery-columns', columns);
    const stacks = Array.from({ length: columns }, () => {
      const element = document.createElement('div');
      element.className = 'wb-gallery-column';
      return { element, height: 0, row: 0 };
    });
    items.forEach((item, index) => {
      const card = cards[index];
      const show = category === 'all' || card.dataset.category === category;
      item.hidden = card.hidden = !show;
      if (!show) { pool.append(item); return; }
      let col = 0;
      for (let i = 1; i < stacks.length; i++) if (stacks[i].height < stacks[col].height) col = i;
      const stack = stacks[col];
      const image = card.querySelector('img');
      const aspect = Number(image.getAttribute('width')) / Number(image.getAttribute('height')) || 1;
      const mobile = columns <= 2;
      const seed = col * 7 + stack.row * 13;
      const duration = 1.5 + seed % 4 * .2;
      item.dataset.column = col;
      item.dataset.row = stack.row;
      item.dataset.duration = duration.toFixed(1);
      item.style.setProperty('--entry-x', `${(col / (columns - 1) * 2 - 1) * (mobile ? 80 : 350)}px`);
      item.style.setProperty('--entry-y', `${(mobile ? 120 : 300) + stack.row * (mobile ? 40 : 100)}px`);
      item.style.setProperty('--entry-scale', mobile ? '1.15' : '1.5');
      item.style.setProperty('--entry-duration', `${duration}s`);
      stack.element.append(item);
      stack.height += 1 / aspect + .05;
      stack.row++;
    });
    grid.replaceChildren(...stacks.map(stack => stack.element));
    grid.classList.add('is-grid-ready');
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.galleryFilter === category)));
    items.forEach(item => {
      if (item.hidden) return;
      if (!observer || reduced.matches) finishEntrance(item);
      else if (item.dataset.enterState === 'waiting') observer.observe(item);
      if (!animate || reduced.matches || item.dataset.enterState !== 'ready') return;
      const after = item.getBoundingClientRect();
      if (after.bottom < 0 || after.top > innerHeight) return;
      flipAnimations.get(item)?.cancel();
      const before = oldRects.get(item);
      const nearby = before && Math.abs(before.top - after.top) < innerHeight && before.width;
      const from = nearby ? { transform: `translate(${before.left - after.left}px,${before.top - after.top}px) scale(${before.width / after.width})`, opacity: 1 } : { transform: 'translateY(20px) scale(.97)', opacity: 0 };
      flipAnimations.set(item, item.animate([from, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' }));
    });
  }
  if (observer && !reduced.matches) gallery.classList.add('wb-gallery-motion');
  layout();
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.galleryFilter;
    layout(true);
    history.replaceState(null, '', category === 'all' ? location.pathname : `#${category}`);
  }));
  addEventListener('hashchange', () => {
    const next = location.hash.slice(1) || 'all';
    if (filters.some(button => button.dataset.galleryFilter === next)) { category = next; layout(true); }
  });
  new ResizeObserver(() => {
    const wanted = grid.clientWidth < 768 ? 2 : 3;
    if (wanted !== columns && !resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; layout(); });
  }).observe(grid);
  reduced.addEventListener('change', () => {
    if (reduced.matches) { gallery.classList.remove('wb-gallery-motion'); items.forEach(finishEntrance); }
  });

  const dialog = gallery.querySelector('.wb-gallery-dialog');
  const view = dialog.querySelector('.wb-gallery-view');
  const stage = dialog.querySelector('.wb-gallery-stage');
  const photo = stage.querySelector('img');
  const caption = dialog.querySelector('[data-wb-gallery-caption]');
  const counter = dialog.querySelector('[data-wb-gallery-counter]');
  const preload = new Map();
  let selected = null;
  let closing = false;
  let closeTimer = 0;
  let photoAnimation = null;
  let drag = null;
  const visibleCards = () => cards.filter(card => !card.hidden);
  photo.draggable = false;
  counter.setAttribute('aria-live', 'polite');

  function warm(card) {
    if (!card) return null;
    if (!preload.has(card.dataset.full)) {
      const image = new Image();
      image.src = card.dataset.full;
      preload.set(card.dataset.full, image);
    }
    return preload.get(card.dataset.full);
  }
  function fitPhoto(ratio) {
    const available = Math.min(innerWidth - (innerWidth <= 768 ? 32 : 128), (innerHeight - 136) * ratio);
    view.style.setProperty('--photo-width', `${Math.max(100, available)}px`);
    photo.style.aspectRatio = String(ratio);
  }
  function show(card, direction = 0) {
    if (!card || closing) return;
    selected = card;
    const thumb = card.querySelector('img');
    const cached = warm(card);
    photo.src = cached.complete && cached.naturalWidth ? cached.src : thumb.currentSrc || thumb.src;
    photo.alt = card.dataset.title;
    caption.textContent = card.dataset.title;
    fitPhoto(Number(thumb.getAttribute('width')) / Number(thumb.getAttribute('height')) || 1);
    const applyFull = () => {
      if (selected !== card || !dialog.open || !cached.naturalWidth) return;
      photo.src = cached.src;
      fitPhoto(cached.naturalWidth / cached.naturalHeight);
    };
    if (cached.complete) requestAnimationFrame(applyFull);
    else cached.addEventListener('load', applyFull, { once: true });
    const list = visibleCards();
    const index = list.indexOf(card);
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    warm(list[(index + 1) % list.length]);
    warm(list[(index - 1 + list.length) % list.length]);
    if (!dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add('wb-photo-open');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (dialog.open && !closing) dialog.classList.add('is-open');
      }));
    } else if (direction && !reduced.matches) {
      photoAnimation?.cancel();
      photoAnimation = photo.animate([
        { opacity: 0, transform: `translateX(${direction * 36}px) scale(.985)`, filter: 'blur(2px)' },
        { opacity: 1, transform: 'translateX(0) scale(1)', filter: 'blur(0)' }
      ], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  }
  function move(direction) {
    const list = visibleCards();
    show(list[(list.indexOf(selected) + direction + list.length) % list.length], direction);
  }
  function close() {
    if (!dialog.open || closing) return;
    closing = true;
    dialog.classList.remove('is-open', 'has-close-cursor', 'is-cursor-pressed');
    closeTimer = setTimeout(() => dialog.close(), reduced.matches ? 0 : 320);
  }
  cards.forEach(card => {
    card.addEventListener('click', () => show(card));
    card.addEventListener('pointerenter', () => warm(card), { once: true });
  });
  dialog.querySelector('[data-wb-gallery-close]').addEventListener('click', close);
  dialog.querySelector('[data-wb-gallery-prev]').addEventListener('click', () => move(-1));
  dialog.querySelector('[data-wb-gallery-next]').addEventListener('click', () => move(1));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    clearTimeout(closeTimer);
    closing = false;
    document.documentElement.classList.remove('wb-photo-open');
    dialog.classList.remove('is-open', 'has-close-cursor', 'is-cursor-pressed');
    selected?.focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  });
  const outside = target => !target.closest('.wb-gallery-view, button');
  dialog.addEventListener('click', event => { if (outside(event.target)) close(); });
  dialog.addEventListener('pointermove', event => {
    const visible = finePointer.matches && event.pointerType !== 'touch' && outside(event.target);
    dialog.classList.toggle('has-close-cursor', visible);
    if (visible) {
      dialog.style.setProperty('--cursor-x', `${event.clientX}px`);
      dialog.style.setProperty('--cursor-y', `${event.clientY}px`);
    }
  });
  dialog.addEventListener('pointerdown', event => dialog.classList.toggle('is-cursor-pressed', finePointer.matches && outside(event.target)));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => dialog.addEventListener(type, () => dialog.classList.remove('is-cursor-pressed')));
  dialog.addEventListener('pointerleave', () => dialog.classList.remove('has-close-cursor'));
  addEventListener('resize', () => { if (dialog.open && selected) { const img = warm(selected); if (img.naturalWidth) fitPhoto(img.naturalWidth / img.naturalHeight); } }, { passive: true });

  stage.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || event.button !== 0 || closing) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), dx: 0, active: false };
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag.dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active && Math.abs(drag.dx) > 8 && Math.abs(drag.dx) > Math.abs(dy) * 1.15) {
      drag.active = true;
      photoAnimation?.cancel();
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('is-dragging');
    }
    if (drag.active) photo.style.transform = `translateX(${drag.dx * .45}px) scale(${1 - Math.min(Math.abs(drag.dx) / innerWidth, .5) * .05})`;
  });
  function release(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const state = drag;
    drag = null;
    stage.classList.remove('is-dragging');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    const from = photo.style.transform || 'none';
    photo.style.removeProperty('transform');
    if (!state.active) return;
    const velocity = Math.abs(state.dx) / Math.max(1, performance.now() - state.time);
    if (event.type !== 'pointercancel' && (Math.abs(state.dx) > 60 || velocity > .45)) move(state.dx < 0 ? 1 : -1);
    else if (!reduced.matches) photoAnimation = photo.animate([{ transform: from }, { transform: 'translateX(0) scale(1)' }], { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
})();
