(() => {
  'use strict';

  const SUPABASE_URL = 'https://slvopkofcypjukavovar.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdm9wa29mY3lwanVrYXZvdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NzEzNTUsImV4cCI6MjEwODA0NzM1NX0.lcsnkn_TLILMwFbatTUZeOxwjU9vXT1cgXRTwDXTjwU';
  const HEADERS = {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  };

  const catalog = document.getElementById('catalog');
  const detail = document.getElementById('detail');
  const detailBody = document.getElementById('detail-body');
  const countEl = document.getElementById('count');
  const toastEl = document.getElementById('toast');

  const CATEGORY = document.body.dataset.category || 'mens';
  const state = { season: null, category: null, products: [], votes: {}, selected: new Set() };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'k-' + Date.now() + '-' + Math.random().toString(16).slice(2));

  function clientKey() {
    let key = localStorage.getItem('soho-client-key');
    if (!key) { key = uid(); localStorage.setItem('soho-client-key', key); }
    return key;
  }

  function imageUrl(path) {
    if (!path) return '';
    if (/^(https?:\/\/|assets\/|\.\/)/.test(path)) return path;
    return `${SUPABASE_URL}/storage/v1/object/public/showroom/${path}`;
  }

  async function api(path, options = {}) {
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      ...options,
      headers: { ...HEADERS, ...(options.headers || {}) }
    });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2000);
  }

  function isSelected(id) { return state.selected.has(id); }

  function saveSelection() {
    localStorage.setItem('soho-selected', JSON.stringify([...state.selected]));
    countEl.textContent = String(state.selected.size);
    countEl.hidden = state.selected.size === 0;
  }

  async function load() {
    const seasons = await api('seasons?select=*&is_active=eq.true&order=sort&limit=1');
    if (!seasons || !seasons.length) throw new Error('No active season');
    state.season = seasons[0];

    const cats = await api(`categories?select=*&season_id=eq.${state.season.id}&slug=eq.${CATEGORY}&limit=1`);
    if (!cats || !cats.length) throw new Error(`FW27 has no ${CATEGORY.toUpperCase()} category yet`);
    state.category = cats[0];

    const products = await api(`products?select=*&season_id=eq.${state.season.id}&category_id=eq.${state.category.id}&is_published=eq.true&order=sort`);
    const ids = products.map(p => p.id);
    const images = ids.length ? await api(`product_images?select=*&product_id=in.(${ids.join(',')})&order=sort`) : [];
    const votes = ids.length ? await api(`votes?select=product_id&product_id=in.(${ids.join(',')})`) : [];

    state.products = products.map(p => ({ ...p, images: images.filter(i => i.product_id === p.id) }));
    state.votes = votes.reduce((map, v) => { map[v.product_id] = (map[v.product_id] || 0) + 1; return map; }, {});
    state.selected = new Set(JSON.parse(localStorage.getItem('soho-selected') || '[]'));
    saveSelection();
  }

  function actionButton(label, onClick, className) {
    const button = el('button', 'act' + (className ? ' ' + className : ''), label);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
  }

  function productBlock(product) {
    const block = el('section', 'product-block');
    const head = el('div', 'product-head');
    head.append(el('span', 'product-code', product.code || ''), el('h2', null, product.name));
    if (product.subtitle) head.append(el('span', 'product-sub', product.subtitle));
    block.append(head);

    const row = el('div', 'look-row');
    if (product.images.length === 1) row.classList.add('single');
    product.images.forEach(image => {
      const w = image.width || 4;
      const h = image.height || 3;
      const figure = el('figure');
      figure.style.flex = `${(w / h).toFixed(3)} 1 0%`;
      const img = document.createElement('img');
      img.src = imageUrl(image.path);
      img.alt = `${product.name} ${image.kind || ''}`.trim();
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('click', () => openDetail(product));
      figure.append(img);
      row.append(figure);
    });
    block.append(row);

    const actions = el('div', 'product-actions');
    actions.append(
      actionButton(isSelected(product.id) ? 'Selected' : 'Select', () => toggleSelect(product), isSelected(product.id) ? 'is-on' : ''),
      actionButton(`Vote ${state.votes[product.id] || 0}`, () => vote(product)),
      actionButton('Comment', () => openDetail(product, true))
    );
    block.append(actions);
    return block;
  }

  function render() {
    catalog.innerHTML = '';
    if (!state.products.length) {
      catalog.append(el('p', 'empty-note', 'No styles published yet. Add them from /admin.'));
      return;
    }
    state.products.forEach(product => catalog.append(productBlock(product)));
  }

  async function toggleSelect(product) {
    if (isSelected(product.id)) {
      state.selected.delete(product.id);
      saveSelection();
      toast('Removed from selection');
      render();
      if (!detail.hidden) openDetail(product);
      return;
    }
    state.selected.add(product.id);
    saveSelection();
    render();
    if (!detail.hidden) openDetail(product);
    try {
      await api('selections', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ product_id: product.id, client_key: clientKey() })
      });
    } catch (e) {
      // 已经记录过（唯一约束）不算错误
    }
    toast('Added to selection');
  }

  async function vote(product) {
    try {
      await api('votes', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ product_id: product.id, voter_key: clientKey() })
      });
      state.votes[product.id] = (state.votes[product.id] || 0) + 1;
      toast('Vote recorded');
    } catch (e) {
      toast('You have already voted for this style');
    }
    render();
    if (!detail.hidden) openDetail(product);
  }

  async function fetchComments(product) {
    try {
      return await api(`comments?select=*&product_id=eq.${product.id}&is_approved=eq.true&order=created_at.desc`);
    } catch (e) {
      return [];
    }
  }

  async function addComment(product, author, body) {
    await api('comments', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ product_id: product.id, author: author || 'Store client', body })
    });
  }

  async function openDetail(product, focusComment = false) {
    detailBody.innerHTML = '';
    detail.hidden = false;
    document.body.classList.add('modal-open');

    const gallery = el('div', 'detail-gallery');
    product.images.forEach(image => {
      const img = document.createElement('img');
      img.src = imageUrl(image.path);
      img.alt = product.name;
      img.loading = 'lazy';
      gallery.append(img);
    });

    const info = el('div', 'detail-info');
    info.append(el('p', 'eyebrow', `${state.season ? state.season.name : ''} · ${CATEGORY.toUpperCase()}`));
    info.append(el('h2', null, product.name));
    if (product.subtitle) info.append(el('p', 'detail-sub', product.subtitle));
    if (product.description) info.append(el('p', 'detail-desc', product.description));

    const actions = el('div', 'detail-actions');
    actions.append(
      actionButton(isSelected(product.id) ? 'Selected' : 'Add to selection', () => toggleSelect(product), isSelected(product.id) ? 'is-on' : ''),
      actionButton(`Vote ${state.votes[product.id] || 0}`, () => vote(product))
    );

    const comments = el('div', 'detail-comments');
    comments.append(el('p', 'eyebrow', 'COMMENTS'));
    const list = el('div', 'comment-list');
    list.append(el('p', 'empty-note', 'Loading comments…'));
    comments.append(list);

    const form = el('form', 'comment-form');
    const author = document.createElement('input');
    author.type = 'text';
    author.placeholder = 'Name (optional)';
    author.maxLength = 40;
    const body = document.createElement('textarea');
    body.placeholder = 'Leave a comment about this style';
    body.rows = 3;
    const submit = el('button', 'act is-on', 'Submit comment');
    submit.type = 'submit';
    form.append(author, body, submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const text = body.value.trim();
      if (!text) return;
      submit.disabled = true;
      try {
        await addComment(product, author.value.trim(), text);
        body.value = '';
        toast('Comment posted');
        await fillComments(product, list);
      } catch (e) {
        toast('Could not post. Try again.');
      }
      submit.disabled = false;
    });
    comments.append(form);

    detailBody.append(gallery, info, actions, comments);
    fillComments(product, list);
    detail.querySelector('[data-close]').focus();
    if (focusComment) body.focus();
  }

  async function fillComments(product, list) {
    const comments = await fetchComments(product);
    list.innerHTML = '';
    if (!comments.length) {
      list.append(el('p', 'empty-note', 'No comments yet.'));
      return;
    }
    comments.forEach(comment => {
      const row = el('div', 'comment');
      row.append(el('strong', null, comment.author || 'Store client'));
      row.append(el('p', null, comment.body));
      row.append(el('small', null, new Date(comment.created_at).toLocaleString('zh-CN')));
      list.append(row);
    });
  }

  function closeDetail() {
    detail.hidden = true;
    document.body.classList.remove('modal-open');
  }

  detail.addEventListener('click', event => {
    if (event.target === detail || event.target.hasAttribute('data-close')) closeDetail();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !detail.hidden) closeDetail();
  });

  load()
    .then(() => {
      render();
      saveSelection();
    })
    .catch(error => {
      catalog.innerHTML = '';
      const box = el('div', 'empty-note');
      box.append(el('p', null, 'Could not load content: ' + error.message));
      box.append(el('p', null, 'Check that the Supabase project is running, the schema is applied, and supabase.co is reachable.'));
      catalog.append(box);
    });
})();
