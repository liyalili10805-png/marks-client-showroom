(function () {
  'use strict';

  const scriptVersion = document.currentScript ? new URL(document.currentScript.src, location.href).searchParams.get('v') : '';
  const DATA_URL = 'data/collections.json?v=' + encodeURIComponent(scriptVersion || '20261118audit1');
  const SELECTION_KEY = 'soho-collection-selection';
  const MATERIAL_KEY = 'soho-material-choice';
  const LABELS = [
    ['Hand feel', 'hand'],
    ['Structure', 'structure'],
    ['Composition', 'composition'],
    ['Weight', 'weight'],
    ['Care', 'care'],
    ['Target retail', 'retail'],
    ['Sample status', 'status']
  ];
  const inDevelopmentScope = item => item.type === 'outerwear' || item.type === 'top' && /\bshirt\b/i.test(item.name || '') || item.type === 'bottom' && !/\bjeans\b/i.test(item.name || '');

  let data = null;
  let product = null;
  let selected = -1;
  let toastTimer = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function selection() {
    try { const value=JSON.parse(localStorage.getItem(SELECTION_KEY) || '[]');return Array.isArray(value)?value:[]; } catch (e) { return []; }
  }

  function updateCount() {
    const count = document.getElementById('count');
    if (!count) return;
    const total = selection().filter(code=>data && data.products.some(item=>item.code===code)).length;
    count.textContent = total;
    count.hidden = total === 0;
  }

  function addToSelection(code) {
    const list = selection();
    if (!list.includes(code)) list.push(code);
    localStorage.setItem(SELECTION_KEY, JSON.stringify(list));
    updateCount();
    if(window.dispatchEvent && typeof Event === 'function')window.dispatchEvent(new Event('soho:selection-change'));
  }

  function toast(message) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2600);
  }

  function choose(index) {
    const material = product.materials[index];
    try { const map = JSON.parse(localStorage.getItem('soho-material-choices') || '{}'); map[product.code] = material.name; localStorage.setItem('soho-material-choices', JSON.stringify(map));localStorage.setItem(MATERIAL_KEY, JSON.stringify({ code: product.code, material: material.name }));addToSelection(product.code); } catch (error) {toast('This device could not save the material choice.');return;}
    selected = index;
    const table = document.querySelector('.material-table');
    if (table) renderTable(table);
    toast(`${material.name} saved on this device only. Not sent.`);
  }

  function renderTable(table) {
    table.innerHTML = '';
    const materials = product.materials || [];

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.append(document.createElement('th'));
    materials.forEach((material, index) => {
      const th = document.createElement('th');
      th.className = 'mat-head' + (index === selected ? ' selected' : '');
      const swatch = el('p', 'mat-evidence', material.status === 'Reference fabric' && product.imageKind !== 'concept' ? 'Recorded garment fabric' : 'Development direction · sampling required');
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
    product = code ? data.products.find(item => item.code === code) : data.products[0];
    const root = document.getElementById('materials-view');root.innerHTML='';
    if(!product){root.append(el('h1',null,'Style unavailable'),el('p',null,'Choose a style from the current development selection.'));const browse=el('a','text-link','Browse styles →');browse.href='collection-series.html';root.append(browse);return;}
    const materials = product.materials || [];

    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(MATERIAL_KEY) || 'null'); } catch (e) { stored = null; }
    let map={};try{map=JSON.parse(localStorage.getItem('soho-material-choices') || '{}');}catch{}
    const chosen=map[product.code] || (stored && stored.code===product.code ? stored.material : '');
    selected=materials.findIndex(material=>material.name===chosen);

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
    (new URLSearchParams(location.search).has('trend')?[product]:data.products).forEach(item => {
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
    image.alt = product.name;
    image.width = 480;
    image.height = 720;
    image.loading = 'eager';
    image.decoding = 'async';
    image.fetchPriority = 'high';
    const original = (product.views && product.views.length) ? product.views[0] : product.image;
    const source = product.thumbnail || product.listImage || original;
    if (source !== original) image.addEventListener('error', () => { image.src = original; }, {once: true});
    image.src = source;
    aside.append(image, el('p', 'm-code', product.code), el('p', 'm-name', product.name));
    if(product.imageKind==='concept')aside.append(el('p','style-concept-label','Digital style concept · subject to physical development. Not an existing sample.'));
    else if(/^AE-/.test(product.code))aside.append(el('p','style-concept-label','Legacy reference — source and physical sample not verified.'));
    const detailLink = el('a', null, 'View style details →');
    const detailParams=new URLSearchParams(location.search);detailParams.set('code',product.code);
    detailLink.href = 'collection-detail.html?'+detailParams+'#materials';
    aside.append(detailLink);
    layout.append(aside);

    const table = document.createElement('table');
    table.className = 'material-table';
    layout.append(table);
    root.append(layout);
    root.append(el('p', 'materials-note', 'The style image does not show every alternative fabric. Proposed materials require sourcing, physical sampling and approval. Material properties require physical-sample review; sample availability is unconfirmed. Your choice is saved on this device only.'));

    renderTable(table);
  }

  fetch(DATA_URL)
    .then(response => response.json())
    .then(payload => {
      data = {...payload,products:(payload.products || []).filter(inDevelopmentScope)};
      render();
      updateCount();
    })
    .catch(() => {
      const root = document.getElementById('materials-view');
      if (root) root.innerHTML = '<p class="empty-note">Materials could not be loaded.</p>';
    });
})();


