(() => {
  'use strict';

  const DATA_URL = 'data/collections.json';
  const SELECT_KEY = 'soho-collection-selection';
  const view = document.body.dataset.view || 'landing';

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const escape = value => String(value == null ? '' : value);

  let selection = [];
  try { selection = JSON.parse(localStorage.getItem(SELECT_KEY) || '[]'); } catch { selection = []; }

  const countEl = document.getElementById('count');
  const toastEl = document.getElementById('toast');

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1900);
  }

  function saveSelection() {
    localStorage.setItem(SELECT_KEY, JSON.stringify(selection));
    if (countEl) {
      countEl.textContent = String(selection.length);
      countEl.hidden = selection.length === 0;
    }
    document.querySelectorAll('[data-save]').forEach(button => {
      const saved = selection.includes(button.dataset.save);
      button.classList.toggle('is-saved', saved);
      const label = button.querySelector('span');
      if (label) label.textContent = saved ? 'Saved' : 'Save style';
      else button.textContent = saved ? 'Saved' : 'Save style';
    });
  }

  function toggleSelection(product) {
    if (selection.includes(product.code)) {
      selection = selection.filter(code => code !== product.code);
      toast('Removed from My Selection');
    } else {
      selection = [...selection, product.code];
      toast('Saved to My Selection');
    }
    saveSelection();
  }

  function swatches(product) {
    const wrap = el('div', 'swatches');
    (product.colours || []).forEach(colour => {
      const dot = el('span', 'swatch');
      dot.style.background = colour.hex;
      dot.title = colour.name;
      wrap.append(dot);
    });
    return wrap;
  }

  function card(product, withActions) {
    const article = el('article', 'col-card');
    const media = el('a', 'col-card-media');
    media.href = `collection-detail.html?code=${encodeURIComponent(product.code)}`;
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';
    media.append(img);
    article.append(media);

    const info = el('div', 'col-card-info');
    const title = el('div');
    title.append(el('h3', null, product.name), el('p', 'col-code', product.code));
    const bottom = el('div', 'col-card-bottom');
    bottom.append(swatches(product));

    if (withActions) {
      const actions = el('div', 'col-card-actions');
      const select = el('button', 'link-action', selection.includes(product.code) ? 'Selected' : 'Select');
      select.type = 'button';
      select.classList.toggle('active', selection.includes(product.code));
      select.addEventListener('click', () => {
        toggleSelection(product);
        select.textContent = selection.includes(product.code) ? 'Selected' : 'Select';
        select.classList.toggle('active', selection.includes(product.code));
        renderPanel();
      });
      const vote = el('button', 'link-action', 'Vote');
      vote.type = 'button';
      vote.addEventListener('click', () => toast('Vote recorded (sample)'));
      const comment = el('a', 'link-action', 'Comment');
      comment.href = `collection-detail.html?code=${encodeURIComponent(product.code)}#feedback`;
      actions.append(select, el('span', 'sep', '|'), vote, el('span', 'sep', '|'), comment);
      bottom.append(actions);
    } else {
      const save = el('button', 'save-style', selection.includes(product.code) ? 'Saved' : 'Save style');
      save.type = 'button';
      save.dataset.save = product.code;
      save.classList.toggle('is-saved', selection.includes(product.code));
      save.addEventListener('click', () => toggleSelection(product));
      info.append(save);
    }

    info.append(title, bottom);
    article.append(info);
    return article;
  }

  function renderPanel() {
    const panel = document.getElementById('selection-panel');
    if (!panel) return;
    panel.innerHTML = '';
    panel.append(el('p', 'panel-title', `My selection (${selection.length})`));
    if (!selection.length) {
      panel.append(el('p', 'panel-empty', 'Nothing selected yet.'));
      const review = el('a', 'btn-accent panel-review', 'Review selection →');
      review.href = 'my-selection.html';
      panel.append(review);
      return;
    }
    const list = el('div', 'panel-list');
    selection.forEach(code => {
      const product = products.find(p => p.code === code);
      if (!product) return;
      const row = el('div', 'panel-row');
      const img = document.createElement('img');
      img.src = product.listImage || product.image;
      img.alt = product.name;
      const text = el('div');
      text.append(el('strong', null, product.name), el('small', null, product.code));
      const remove = el('button', 'panel-remove', '×');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        selection = selection.filter(item => item !== code);
        saveSelection();
        renderSeries();
      });
      row.append(img, text, remove);
      list.append(row);
    });
    panel.append(list);
    const review = el('a', 'btn-accent panel-review', 'Review selection →');
    review.href = 'my-selection.html';
    panel.append(review);
  }

  function renderLanding() {
    const root = document.getElementById('collection-view');
    root.innerHTML = '';

    const hero = el('section', 'col-hero');
    const copy = el('div', 'col-hero-copy');
    copy.append(el('p', 'eyebrow', collection.eyebrow));
    const headline = el('h1');
    const lines = Array.isArray(collection.titleLines) ? collection.titleLines : String(collection.headline).split('\n');
    lines.forEach((line, index) => {
      if (index) headline.append(document.createElement('br'));
      headline.append(document.createTextNode(line));
    });
    copy.append(headline);
    copy.append(el('p', 'col-intro', collection.intro));
    const explore = el('a', 'btn-accent', collection.ctaLabel || 'Explore the collection →');
    explore.href = 'collection-series.html?occasion=everyday';
    copy.append(explore);
    const media = el('div', 'col-hero-media');
    const cover = document.createElement('img');
    cover.src = collection.cover;
    cover.alt = collection.title;
    media.append(cover);
    hero.append(copy, media);
    root.append(hero);

    const weekly = el('section', 'col-section');
    const head = el('div', 'col-section-head');
    head.append(el('h2', null, "This week's selections"));
    const all = el('a', 'text-link', 'View all styles →');
    all.href = 'collection-series.html?occasion=everyday';
    head.append(all);
    weekly.append(head);
    const grid = el('div', 'weekly-grid');
    (data.weekly || []).forEach(item => {
      const card = el('article', 'weekly-card');
      const media = el('a', 'weekly-media');
      media.href = `collection-detail.html?code=${encodeURIComponent(item.code)}`;
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      img.loading = 'lazy';
      media.append(img);

      const info = el('div', 'weekly-info');
      info.append(el('h3', null, item.name));
      const dots = el('div', 'swatches');
      (item.colours || []).forEach(colour => {
        const dot = el('span', 'swatch');
        dot.style.background = colour.hex;
        dot.title = colour.name;
        dots.append(dot);
      });
      info.append(dots);

      const save = el('button', 'save-style');
      save.type = 'button';
      save.dataset.save = item.code;
      save.classList.toggle('is-saved', selection.includes(item.code));
      save.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z"/></svg><span>' + (selection.includes(item.code) ? 'Saved' : 'Save style') + '</span>';
      save.addEventListener('click', () => {
        const product = products.find(p => p.code === item.code) || { code: item.code, name: item.name, image: item.image, colours: item.colours };
        toggleSelection(product);
        save.querySelector('span').textContent = selection.includes(item.code) ? 'Saved' : 'Save style';
        save.classList.toggle('is-saved', selection.includes(item.code));
      });
      info.append(save);

      card.append(media, info);
      grid.append(card);
    });
    weekly.append(grid);
    root.append(weekly);

    const occasions = el('section', 'col-section');
    occasions.append(el('h2', null, 'Browse by occasion'));
    const occGrid = el('div', 'occasion-grid');
    data.occasions.forEach(item => {
      const tile = el('a', 'occasion-tile');
      tile.href = `collection-series.html?occasion=${encodeURIComponent(item.slug)}`;
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.name;
      tile.append(img, el('span', 'occasion-label', item.name));
      occGrid.append(tile);
    });
    occasions.append(occGrid);
    root.append(occasions);
    saveSelection();
  }

  function renderSeries() {
    const root = document.getElementById('collection-view');
    root.innerHTML = '';
    const params = new URLSearchParams(location.search);
    const occasion = params.get('occasion');
    const themeLabel = occasion ? occasion.charAt(0).toUpperCase() + occasion.slice(1) : null;

    const head = el('div', 'col-page-head');
    const crumb = el('p', 'col-breadcrumb', `COLLECTION / ${collection.title}`);
    head.append(crumb, el('h1', null, collection.title));
    head.append(el('p', 'col-sub', themeLabel ? `${themeLabel} styles selected for store review.` : 'Everyday casual styles selected for store review.'));
    const main = el('div', 'col-main');
    main.append(head);

    const filters = {
      gender: params.get('gender') || '',
      type: params.get('type') || '',
      material: params.get('material') || '',
      colour: params.get('colour') || '',
      retail: params.get('retail') || '',
      occasion: occasion || ''
    };

    function uniqueValues(list) {
      return [...new Set(list.filter(Boolean))];
    }

    const toolbar = el('div', 'col-toolbar');
    function makeSelect(key, label, options) {
      const select = document.createElement('select');
      select.setAttribute('aria-label', label);
      options.forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        if (value === filters[key]) option.selected = true;
        select.append(option);
      });
      select.addEventListener('change', () => {
        filters[key] = select.value;
        paint();
        syncUrl();
      });
      return select;
    }

    const colourOptions = uniqueValues(products.flatMap(product => (product.colours || []).map(colour => colour.name)));
    toolbar.append(
      makeSelect('gender', 'Gender', [['', 'Gender'], ['women', 'Women'], ['men', 'Men']]),
      makeSelect('type', 'Category', [['', 'Category'], ['outerwear', 'Outerwear'], ['top', 'Top'], ['bottom', 'Bottom']]),
      makeSelect('material', 'Material', [['', 'Material'], ...uniqueValues(products.map(product => product.material)).map(value => [value, value])]),
      makeSelect('colour', 'Colour', [['', 'Colour'], ...colourOptions.map(value => [value, value])]),
      makeSelect('retail', 'Target retail', [['', 'Target retail'], ['To be confirmed', 'To be confirmed']]),
      makeSelect('occasion', 'Occasion', [['', 'Occasion'], ...data.occasions.map(item => [item.slug, item.name])])
    );
    const clear = el('button', 'filter-clear', 'Clear');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      history.replaceState(null, '', location.pathname);
      renderSeries();
    });
    toolbar.append(clear);
    main.append(toolbar);

    const layout = el('div', 'col-layout');
    const grid = el('div', 'col-grid');
    main.append(grid);
    const panel = el('aside', 'selection-panel');
    panel.id = 'selection-panel';
    layout.append(main, panel);
    root.append(layout);

    function syncUrl() {
      const next = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) next.set(key, value); });
      const query = next.toString();
      history.replaceState(null, '', location.pathname + (query ? '?' + query : ''));
    }

    function paint() {
      grid.innerHTML = '';
      products
        .filter(product => !filters.gender || product.gender === filters.gender)
        .filter(product => !filters.type || product.type === filters.type)
        .filter(product => !filters.material || product.material === filters.material)
        .filter(product => !filters.colour || (product.colours || []).some(colour => colour.name === filters.colour))
        .filter(product => !filters.retail || product.retail === filters.retail)
        .filter(product => !filters.occasion || (product.occasions || []).includes(filters.occasion))
        .forEach(product => grid.append(card(product, true)));
      if (!grid.children.length) grid.append(el('p', 'empty-note', 'No styles match these filters.'));
      renderPanel();
      saveSelection();
    }

    paint();
  }

  function renderDetail() {
    const root = document.getElementById('collection-view');
    const code = new URLSearchParams(location.search).get('code') || products[0].code;
    const product = products.find(item => item.code === code) || products[0];
    root.innerHTML = '';

    const crumb = el('div', 'breadcrumb');
    const back = el('a', null, 'COLLECTION');
    back.href = 'collection-series.html';
    crumb.append(back, document.createTextNode(` / ${product.name}`));
    root.append(crumb);

    const layout = el('div', 'detail-layout');
    const thumbs = el('div', 'detail-thumbs');
    const main = el('div', 'detail-main');
    const mainImg = document.createElement('img');
    mainImg.src = product.views[0];
    mainImg.alt = product.name;
    main.append(mainImg);
    product.views.forEach((src, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = index === 0 ? 'active' : '';
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${product.name} view ${index + 1}`;
      button.append(img);
      button.addEventListener('click', () => {
        mainImg.src = src;
        thumbs.querySelectorAll('button').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
      });
      thumbs.append(button);
    });

    const side = el('div', 'detail-side');
    side.append(el('p', 'eyebrow', `SAMPLE STYLE ${product.code}`));
    side.append(el('h1', null, product.name));

    const facts = el('div', 'detail-facts');
    [product.fit, product.texture, product.weight].forEach(fact => {
      facts.append(el('span', null, fact));
    });
    side.append(facts);

    side.append(el('p', 'detail-label', 'Colour'));
    side.append(swatches(product));

    side.append(el('p', 'detail-label', 'Material options'));
    const materialList = el('div', 'material-list');
    product.materials.forEach((material, index) => {
      const row = el('div', 'material-row');
      row.append(el('span', null, material.name));
      const link = el('a', 'text-link', 'View details →');
      link.href = '#materials';
      row.append(link);
      row.addEventListener('click', () => {
        document.querySelectorAll('.material-row').forEach(item => item.classList.remove('selected'));
        row.classList.add('selected');
      });
      materialList.append(row);
    });
    side.append(materialList);

    side.append(el('p', 'detail-label', 'Target retail'));
    side.append(el('p', 'detail-value', product.retail));

    const actions = el('div', 'detail-cta');
    const add = el('button', 'btn-accent', selection.includes(product.code) ? 'In My Selection' : 'Add to selection →');
    add.type = 'button';
    add.addEventListener('click', () => {
      toggleSelection(product);
      add.textContent = selection.includes(product.code) ? 'In My Selection' : 'Add to selection →';
    });
    const sample = el('button', 'btn-outline', 'Request sample');
    sample.type = 'button';
    sample.addEventListener('click', () => toast('Sample request recorded (sample)'));
    actions.append(add, sample);
    side.append(actions);

    const meta = el('div', 'detail-meta-actions');
    const vote = el('button', 'link-action', 'Vote');
    vote.type = 'button';
    vote.addEventListener('click', () => toast('Vote recorded (sample)'));
    const comment = el('a', 'link-action', 'Comment');
    comment.href = '#feedback';
    meta.append(vote, el('span', 'sep', '|'), comment);
    side.append(meta);

    side.append(el('p', 'detail-label', 'Why this style'));
    side.append(el('p', 'detail-why', product.why));
    layout.append(thumbs, main, side);
    root.append(layout);

    const tabs = el('div', 'detail-tabs');
    ['Style details', 'Materials', 'Store feedback'].forEach((label, index) => {
      const anchor = el('a', index === 0 ? 'active' : '', label);
      anchor.href = index === 1 ? '#materials' : index === 2 ? '#feedback' : '#style';
      tabs.append(anchor);
    });
    root.append(tabs);

    const materialSection = el('section', 'materials-section');
    materialSection.id = 'materials';
    materialSection.append(el('h2', null, `Materials for ${product.name}`));
    const table = el('div', 'materials-table');
    const header = el('div', 'materials-row materials-head');
    header.append(el('span', null, ''));
    product.materials.forEach((material, index) => {
      header.append(el('span', null, `Option ${String.fromCharCode(65 + index)} · ${material.name}`));
    });
    table.append(header);
    [['Hand feel', 'hand'], ['Structure', 'structure'], ['Composition', 'composition'], ['Weight', 'weight'], ['Care', 'care'], ['Indicative cost', 'cost'], ['Target retail', 'retail'], ['Sample status', 'status']].forEach(([label, key]) => {
      const row = el('div', 'materials-row');
      row.append(el('span', 'materials-label', label));
      product.materials.forEach((material, index) => {
        const cell = el('span', null, material[key]);
        if (index === 0) cell.classList.add('selected');
        row.append(cell);
      });
      table.append(row);
    });
    const chooseRow = el('div', 'materials-row materials-choose');
    chooseRow.append(el('span', null, ''));
    product.materials.forEach((material, index) => {
      const button = el('button', index === 0 ? 'btn-accent' : 'btn-outline', 'Choose material');
      button.type = 'button';
      button.addEventListener('click', () => toast(`Selected ${material.name} (sample)`));
      chooseRow.append(button);
    });
    table.append(chooseRow);
    materialSection.append(table);
    root.append(materialSection);

    const feedback = el('section', 'feedback-section');
    feedback.id = 'feedback';
    feedback.append(el('h2', null, 'Store feedback'));
    feedback.append(el('p', 'detail-why', 'Tell us what works for your store, what needs a price or material change, and whether you need a sample.'));
    const form = el('form', 'feedback-form');
    const checks = el('div', 'feedback-checks');
    ['Good fit for our customers', 'Review the price', 'Prefer another material', 'Adjust fit or colour'].forEach(text => {
      const label = el('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      label.append(input, document.createTextNode(text));
      checks.append(label);
    });
    form.append(checks);
    const range = document.createElement('input');
    range.type = 'text';
    range.placeholder = 'Target retail range (e.g. 59.99 – 79.99)';
    const commentBox = document.createElement('textarea');
    commentBox.placeholder = 'Comments';
    const submit = el('button', 'btn-accent', 'Submit feedback');
    submit.type = 'submit';
    form.append(range, commentBox, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      toast('Feedback saved (sample)');
    });
    feedback.append(form);
    root.append(feedback);

    saveSelection();
  }

  const normCode = code => String(code || '').replace(/^AE-0?/, 'AE-');

  async function applyOverrides() {
    if (!window.DemoStore) return;
    try {
      const state = await DemoStore.state();
      const overrides = state.overrides || {};
      const preview = new URLSearchParams(location.search).has('preview');
      const useContent = preview || (state.contentStatus || 'published') === 'published';
      if (useContent && overrides.hero) {
        if (overrides.hero.titleLines && overrides.hero.titleLines.length) collection.titleLines = overrides.hero.titleLines;
        if (overrides.hero.intro) collection.intro = overrides.hero.intro;
        if (overrides.hero.ctaLabel) collection.ctaLabel = overrides.hero.ctaLabel;
        if (overrides.hero.imageId) {
          const blob = await DemoStore.getBlob(overrides.hero.imageId);
          if (blob) collection.cover = URL.createObjectURL(blob);
        }
      }
      if (useContent && overrides.productImages) {
        for (const [code, id] of Object.entries(overrides.productImages)) {
          const product = products.find(item => normCode(item.code) === normCode(code));
          if (!product) continue;
          const blob = await DemoStore.getBlob(id);
          if (blob) product.image = URL.createObjectURL(blob);
        }
      }
    } catch (error) {
      console.warn('Demo overrides unavailable', error);
    }
  }

  let data;
  let collection;
  let products;

  fetch(DATA_URL + '?v=' + Date.now())
    .then(response => response.json())
    .then(async payload => {
      data = payload;
      collection = payload.collection;
      products = payload.products;
      await applyOverrides();
      if (view === 'landing') renderLanding();
      if (view === 'series') renderSeries();
      if (view === 'detail') renderDetail();
      saveSelection();
    })
    .catch(error => {
      const root = document.getElementById('collection-view');
      if (root) root.innerHTML = `<p class="empty-note">Could not load collection data: ${escape(error.message)}</p>`;
    });
})();
