(async function () {
  'use strict';
  const root = document.querySelector('[data-visual-library]');
  if (!root) return;
  const grid = root.querySelector('.mv-grid');
  const count = root.querySelector('[data-result-count]');
  const dialog = document.querySelector('.mv-dialog');
  const large = dialog.querySelector('.mv-large');
  const filters = {
    family: root.querySelector('[name=family]'),
    colour: root.querySelector('[name=colour]'),
    season: root.querySelector('[name=season]'),
    search: root.querySelector('[type=search]')
  };
  let records = [], active = null, returnFocus = null;

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }
  function button(text, className, action) {
    const element = make('button', className, text);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  }
  function card(item, index) {
    const article = make('article', 'mv-card');
    article.dataset.studyId = item.id;
    const media = make('div', 'mv-media');
    const open = button('', 'mv-open', () => openDetail(item, open));
    open.setAttribute('aria-label', 'View ' + item.title);
    const image = make('img', 'mv-photo');
    image.src = item.original;
    image.srcset = item.thumbnail + ' 360w, ' + item.original + ' 720w';
    image.sizes = '(max-width:650px) calc((100vw - 45px) / 2), (max-width:1540px) calc((100vw - 116px) / 3), 475px';
    image.width = 720;
    image.height = 960;
    image.alt = item.title + ' — digital drape reference';
    image.loading = index < 3 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.fetchPriority = index === 0 ? 'high' : 'auto';
    open.append(image);
    media.append(open);
    const meta = make('div', 'mv-meta');
    meta.append(make('span', null, item.family), make('span', null, item.id));
    const heading = make('h2');
    const title = button(item.shortTitle, 'mv-title', () => openDetail(item, title));
    heading.append(title);
    const footer = make('div', 'mv-card-footer');
    const view = button('View study ↗', 'mv-study-link', () => openDetail(item, view));
    footer.append(make('span', null, 'Digital reference'), view);
    article.append(media, meta, heading, make('p', 'mv-card-note', item.surface), footer);
    return article;
  }
  function render() {
    const query = filters.search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const visible = records.filter(item =>
      (!filters.family.value || item.family === filters.family.value) &&
      (!filters.colour.value || item.colour === filters.colour.value) &&
      (!filters.season.value || item.seasons.includes(filters.season.value)) &&
      query.every(term => [item.id, item.title, item.family, item.colour, item.surface, ...item.uses].join(' ').toLowerCase().includes(term))
    );
    grid.replaceChildren(...visible.map(card));
    if (!visible.length) grid.append(make('p', 'mv-empty', 'No material studies match these filters.'));
    count.textContent = visible.length + ' of ' + records.length + ' material studies';
  }
  function showImage(index) {
    const photo = active.images[index];
    large.src = photo.image;
    large.width = photo.width;
    large.height = photo.height;
    large.alt = active.title + ' — digital ' + photo.label.toLowerCase() + ' reference';
    dialog.querySelectorAll('[data-detail-view]').forEach(control => {
      control.setAttribute('aria-pressed', String(Number(control.dataset.detailView) === index));
    });
    dialog.querySelector('.mv-record-link').href = photo.image;
  }
  function openDetail(item, trigger) {
    active = item;
    returnFocus = trigger;
    dialog.querySelector('[data-detail-id]').textContent = item.id + ' / ' + item.family;
    dialog.querySelector('h2').textContent = item.title;
    dialog.querySelector('[data-detail-surface]').textContent = item.surface;
    dialog.querySelector('[data-detail-colour]').textContent = item.colour + ' · rendered colour';
    dialog.querySelector('[data-detail-composition]').textContent = item.composition;
    dialog.querySelector('[data-detail-use]').textContent = item.uses.join(', ') + ' · directions to explore';
    dialog.querySelector('[data-detail-year]').textContent = item.sourceYear + ' · selected for A/W 27/28 visual development';
    const views = dialog.querySelector('.mv-detail-views');
    views.replaceChildren(...item.images.map((photo, index) => {
      const control = button(photo.label, '', () => showImage(index));
      control.dataset.detailView = index;
      return control;
    }));
    showImage(0);
    dialog.showModal();
  }
  function close() { dialog.close(); }
  dialog.querySelector('.mv-close').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    large.removeAttribute('src');
    active = null;
    returnFocus?.focus();
  });
  Object.values(filters).forEach(control => {
    control.addEventListener(control.type === 'search' ? 'input' : 'change', render);
  });
  try {
    const response = await fetch('data/materials-visual-preview.json?v=20261118drape1');
    if (!response.ok) throw Error('Study data unavailable');
    const data = await response.json();
    records = data.items;
    if (data.mode !== 'digital-visual-study' || !Array.isArray(records) || records.some(item => item.kind !== 'digital-render-reference' || item.materialId !== null)) {
      throw Error('Digital study identity is invalid');
    }
    for (const key of ['family', 'colour']) {
      for (const value of [...new Set(records.map(item => item[key]))].sort()) {
        const option = make('option', null, value);
        option.value = value;
        filters[key].append(option);
      }
    }
    render();
  } catch (_) {
    grid.replaceChildren(make('p', 'mv-empty', 'The visual preview is temporarily unavailable. Please open the fabric library.'));
    count.textContent = 'Preview unavailable';
  }
})();
