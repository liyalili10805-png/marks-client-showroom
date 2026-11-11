(function () {
  'use strict';

  const DATA_URL = 'data/collections.json';
  const SELECTION_KEY = 'soho-collection-selection';
  const MATERIAL_KEY = 'soho-material-choice';
  const LABELS = [
    ['Hand feel', 'hand'],
    ['Structure', 'structure'],
    ['Composition', 'composition'],
    ['Weight', 'weight'],
    ['Care', 'care'],
    ['Indicative cost', 'cost'],
    ['Target retail', 'retail'],
    ['Sample status', 'status']
  ];
  const POSITIONS = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'];

  let data = null;
  let product = null;
  let selected = 0;
  let toastTimer = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function selection() {
    try { return JSON.parse(localStorage.getItem(SELECTION_KEY) || '[]'); } catch (e) { return []; }
  }

  function updateCount() {
    const count = document.getElementById('count');
    if (!count) return;
    const total = selection().length;
    count.textContent = total;
    count.hidden = total === 0;
  }

  function addToSelection(code) {
    const list = selection();
    if (!list.includes(code)) list.push(code);
    localStorage.setItem(SELECTION_KEY, JSON.stringify(list));
    updateCount();
  }

  function toast(message) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('is-on'), 2600);
  }

  function swatchSource() {
    const views = product.views || [];
    return views.find(view => view.indexOf('05-detail') !== -1) ||
      views[views.length - 1] || product.image;
  }

  function choose(index) {
    selected = index;
    const material = product.materials[index];
    localStorage.setItem(MATERIAL_KEY, JSON.stringify({ code: product.code, material: material.name }));
    try { const map = JSON.parse(localStorage.getItem('soho-material-choices') || '{}'); map[product.code] = material.name; localStorage.setItem('soho-material-choices', JSON.stringify(map)); } catch (error) { /* ignore */ }
    addToSelection(product.code);
    const table = document.querySelector('.material-table');
    if (table) renderTable(table);
    toast(`${material.name} selected — ${product.code} added to My Selection`);
  }

  function renderTable(table) {
    table.innerHTML = '';
    const materials = product.materials || [];
    const source = swatchSource();

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.append(document.createElement('th'));
    materials.forEach((material, index) => {
      const th = document.createElement('th');
      th.className = 'mat-head' + (index === selected ? ' selected' : '');
      const swatch = el('div', 'mat-swatch');
      swatch.style.backgroundImage = `url("${source}")`;
      swatch.style.backgroundPosition = POSITIONS[index % POSITIONS.length];
      th.append(
        swatch,
        el('div', 'mat-option', `Option ${String.fromCharCode(65 + index)}`),
        el('div', 'mat-name', material.name),
        el('div', 'mat-selected', index === selected ? 'Selected' : '')
      );
      headRow.append(th);
    });
    thead.append(headRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    LABELS.forEach(([label, key]) => {
      const row = document.createElement('tr');
      row.append(el('th', null, label));
      materials.forEach((material, index) => {
        row.append(el('td', index === selected ? 'selected' : null, material[key] || 'To be confirmed'));
      });
      tbody.append(row);
    });

    const actionRow = document.createElement('tr');
    actionRow.append(el('th'));
    materials.forEach((material, index) => {
      const cell = el('td', 'mat-actions' + (index === selected ? ' selected' : ''));
      const button = el('button', 'choose-material' + (index === selected ? ' is-selected' : ''),
        index === selected ? 'Selected' : 'Choose material');
      button.type = 'button';
      button.addEventListener('click', () => choose(index));
      cell.append(button);
      actionRow.append(cell);
    });
    tbody.append(actionRow);
    table.append(tbody);
  }

  function render() {
    const code = new URLSearchParams(location.search).get('code');
    product = data.products.find(item => item.code === code) || data.products[0];
    const materials = product.materials || [];

    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(MATERIAL_KEY) || 'null'); } catch (e) { stored = null; }
    if (stored && stored.code === product.code) {
      const found = materials.findIndex(material => material.name === stored.material);
      selected = found >= 0 ? found : 0;
    } else {
      selected = materials.length > 1 ? 1 : 0;
    }

    const root = document.getElementById('materials-view');
    root.innerHTML = '';

    const head = el('div', 'materials-head');
    head.append(el('h1', null, 'Materials for this collection'));

    const collectionRow = el('div', 'materials-collection');
    collectionRow.append(el('span', null, 'Collection:'));
    const collectionSelect = document.createElement('select');
    collectionSelect.setAttribute('aria-label', 'Collection');
    const collectionOption = document.createElement('option');
    collectionOption.textContent = data.collection.title;
    collectionSelect.append(collectionOption);
    collectionRow.append(collectionSelect);
    head.append(collectionRow);

    const compare = el('p', 'materials-compare');
    compare.append(document.createTextNode('Compare options for '));
    compare.append(el('strong', null, product.name), document.createTextNode(` / ${product.code} `));
    const productSelect = document.createElement('select');
    productSelect.setAttribute('aria-label', 'Choose style');
    data.products.forEach(item => {
      const option = document.createElement('option');
      option.value = item.code;
      option.textContent = `${item.name} / ${item.code}`;
      if (item.code === product.code) option.selected = true;
      productSelect.append(option);
    });
    productSelect.addEventListener('change', () => {
      location.href = 'materials.html?code=' + encodeURIComponent(productSelect.value);
    });
    compare.append(productSelect);
    head.append(compare);
    root.append(head);

    const layout = el('div', 'materials-layout');
    const aside = el('aside', 'materials-product');
    const image = document.createElement('img');
    image.src = (product.views && product.views.length) ? product.views[0] : product.image;
    image.alt = product.name;
    aside.append(image, el('p', 'm-code', product.code), el('p', 'm-name', product.name));
    const detailLink = el('a', null, 'View style details →');
    detailLink.href = `collection-detail.html?code=${encodeURIComponent(product.code)}#materials`;
    aside.append(detailLink);
    layout.append(aside);

    const table = document.createElement('table');
    table.className = 'material-table';
    layout.append(table);
    root.append(layout);
    root.append(el('p', 'materials-note', 'Fabric specifications and prices require confirmation.'));

    renderTable(table);
  }

  fetch(DATA_URL + '?v=' + Date.now())
    .then(response => response.json())
    .then(payload => {
      data = payload;
      render();
      updateCount();
    })
    .catch(() => {
      const root = document.getElementById('materials-view');
      if (root) root.innerHTML = '<p class="empty-note">Materials could not be loaded.</p>';
    });
})();

