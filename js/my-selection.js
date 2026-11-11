(function () {
  'use strict';

  const DATA_URL = 'data/collections.json';
  const SELECTION_KEY = 'soho-collection-selection';
  const MATERIALS_KEY = 'soho-material-choices';
  const SUBMISSIONS_KEY = 'soho-selection-submissions';
  const SUBMITTED_KEY = 'soho-selection-submitted';
  const DRAFT_KEY = 'soho-selection-draft';

  let data = null;
  let products = [];

  const read = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  let toastTimer = null;
  function toast(message) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = message;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('show'), 2200);
  }

  function selectionCodes() {
    return read(SELECTION_KEY, []) || [];
  }

  function setCodes(codes) {
    write(SELECTION_KEY, codes);
    updateCount();
  }

  function updateCount() {
    const count = document.getElementById('count');
    if (!count) return;
    const total = selectionCodes().length;
    count.textContent = total;
    count.hidden = total === 0;
  }

  function materialMap() {
    return read(MATERIALS_KEY, {}) || {};
  }

  function storeLabel() {
    const identity = read('soho-demo-identity', {}) || {};
    return identity.store || identity.storeName || identity.name || 'Store Toronto';
  }

  function feedbackValues(form) {
    const checks = Array.from(form.querySelectorAll('.sel-checks input:checked')).map(input => input.value);
    const sample = form.querySelector('input[name="sample"]:checked');
    return {
      checks,
      range: form.querySelector('input[name="range"]').value,
      comments: form.querySelector('textarea[name="comments"]').value,
      sample: sample ? sample.value : 'Not yet'
    };
  }

  function saveDraft(form, items) {
    write(DRAFT_KEY, {
      items: items.map(product => ({ code: product.code, material: materialMap()[product.code] || null })),
      feedback: feedbackValues(form),
      savedAt: new Date().toISOString()
    });
    toast('Draft saved');
  }

  function submitSelection(form, items) {
    const record = {
      items: items.map(product => ({
        code: product.code,
        name: product.name,
        material: materialMap()[product.code] || null,
        colour: (product.colours && product.colours[0]) ? product.colours[0].name : null
      })),
      feedback: feedbackValues(form),
      at: new Date().toISOString()
    };
    const list = read(SUBMISSIONS_KEY, []) || [];
    list.push(record);
    write(SUBMISSIONS_KEY, list);
    write(SUBMITTED_KEY, record);
    toast(`Selection submitted — ${items.length} style${items.length > 1 ? 's' : ''}`);
    render();
  }

  function feedbackForm(items) {
    const draft = read(DRAFT_KEY, null);
    const values = draft && draft.feedback ? draft.feedback : { checks: [], range: '', comments: '', sample: 'Not yet' };
    const form = el('form', 'sel-feedback');
    form.append(el('h2', null, 'Your feedback'));

    const checks = el('div', 'sel-checks');
    ['Good fit for our customers', 'Review the price', 'Prefer another material', 'Adjust fit or colour'].forEach(text => {
      const label = el('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = text;
      input.checked = values.checks.includes(text);
      label.append(input, document.createTextNode(text));
      checks.append(label);
    });
    form.append(checks);

    const rangeField = el('div', 'sel-field');
    const rangeLabel = el('label', null, 'Target retail range (CAD)');
    const range = document.createElement('input');
    range.type = 'text';
    range.name = 'range';
    range.placeholder = 'e.g. 59.99 – 79.99';
    range.value = values.range || '';
    rangeField.append(rangeLabel, range);
    form.append(rangeField);

    const commentField = el('div', 'sel-field');
    const commentLabel = el('label', null, 'Comments');
    const comments = document.createElement('textarea');
    comments.name = 'comments';
    comments.placeholder = 'A softer hand feel would suit our customers.';
    comments.value = values.comments || '';
    commentField.append(commentLabel, comments);
    form.append(commentField);

    const sampleRow = el('div', 'sel-field sel-sample');
    const sampleLabel = el('label', null, 'Need a sample?');
    sampleRow.append(sampleLabel);
    ['Yes', 'Not yet'].forEach(text => {
      const label = el('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'sample';
      input.value = text;
      input.checked = (values.sample || 'Not yet') === text;
      label.append(input, document.createTextNode(text));
      sampleRow.append(label);
    });
    form.append(sampleRow);

    form.addEventListener('submit', event => {
      event.preventDefault();
      submitSelection(form, items);
    });
    return form;
  }

  function render() {
    const root = document.getElementById('selection-view');
    root.innerHTML = '';
    const codes = selectionCodes();
    const items = products.filter(product => codes.includes(product.code));

    const head = el('div', 'selection-head');
    head.append(el('p', 'col-breadcrumb', 'COLLECTION / MY SELECTION'));
    head.append(el('h1', null, 'My Selection'));
    head.append(el('p', 'selection-sub', `${data.collection.title} / ${storeLabel()}`));
    head.append(el('p', 'selection-sample', 'Sample data.'));
    root.append(head);

    const submitted = read(SUBMITTED_KEY, null);
    if (submitted) {
      const receipt = el('div', 'sel-receipt');
      receipt.append(el('strong', null, 'Selection submitted'));
      const when = new Date(submitted.at);
      receipt.append(el('span', null, `${when.toLocaleString()} · ${submitted.items.length} style${submitted.items.length > 1 ? 's' : ''} · Sample: ${submitted.feedback.sample}`));
      root.append(receipt);
    }

    if (!items.length) {
      const empty = el('div', 'sel-empty');
      empty.append(el('p', null, 'Nothing selected yet.'));
      const browse = el('a', 'text-link', 'Browse the collection →');
      browse.href = 'collection-series.html?occasion=everyday';
      empty.append(browse);
      root.append(empty);
      return;
    }

    const body = el('div', 'selection-body');
    const main = el('div', 'selection-main');
    const list = el('div', 'sel-list');
    const mats = materialMap();

    items.forEach(product => {
      const item = el('article', 'sel-item');
      const detailHref = `collection-detail.html?code=${encodeURIComponent(product.code)}`;
      const imageLink = el('a', 'sel-image-link');
      imageLink.href = detailHref;
      imageLink.setAttribute('aria-label', `View ${product.name} details`);
      const image = document.createElement('img');
      image.src = product.image;
      image.alt = product.name;
      imageLink.append(image);
      item.append(imageLink);

      const info = el('div', 'sel-info');
      const nameLink = el('a', 'sel-name-link');
      nameLink.href = detailHref;
      nameLink.append(el('h3', 'sel-name', product.name));
      info.append(el('p', 'sel-code', product.code), nameLink);
      const colour = (product.colours && product.colours[0]) || null;
      const colourRow = el('p', 'sel-colour');
      if (colour) {
        const dot = el('span', 'sel-dot');
        dot.style.background = colour.hex;
        colourRow.append(dot, document.createTextNode(colour.name));
      }
      info.append(colourRow);
      const material = el('p', 'sel-material');
      material.append(document.createTextNode('Material: '));
      material.append(el('strong', null, mats[product.code] || 'To be confirmed'));
      info.append(material);
      const detailLink = el('a', 'sel-detail-link', 'View details →');
      detailLink.href = detailHref;
      info.append(detailLink);
      item.append(info);

      const remove = el('button', 'sel-remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${product.name}`);
      remove.addEventListener('click', () => {
        setCodes(selectionCodes().filter(code => code !== product.code));
        toast(`${product.code} removed`);
        render();
      });
      item.append(remove);
      list.append(item);
    });

    main.append(list);
    const form = feedbackForm(items);
    main.append(form);

    const aside = el('aside', 'sel-aside');
    aside.append(el('p', 'sel-count-label', 'Selected styles'), el('p', 'sel-count', String(items.length)));
    const submit = el('button', 'btn-accent', 'Submit selection');
    submit.type = 'button';
    submit.addEventListener('click', () => form.requestSubmit());
    const draft = el('button', 'btn-outline', 'Save draft');
    draft.type = 'button';
    draft.addEventListener('click', () => saveDraft(form, items));
    const clear = el('button', 'sel-clear', 'Clear selection');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      setCodes([]);
      toast('Selection cleared');
      render();
    });
    aside.append(submit, draft, clear);
    aside.append(el('p', 'sel-note', 'Your selection expresses interest. Orders require confirmation.'));

    body.append(main, aside);
    root.append(body);
  }

  fetch(DATA_URL + '?v=' + Date.now())
    .then(response => response.json())
    .then(payload => {
      data = payload;
      products = payload.products || [];
      render();
      updateCount();
    })
    .catch(() => {
      const root = document.getElementById('selection-view');
      if (root) root.innerHTML = '<p class="sel-empty">Selection could not be loaded.</p>';
    });
})();
