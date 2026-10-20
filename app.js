(() => {
  'use strict';

  const IMG = 'assets/img/';
  const VIDEO = 'https://file.style3d.com/website/Company/b8d4aa61-626f-4d7c-9edc-501b61112de9/displayhall/video_20260407184745_6386_4%E6%9C%883%E6%97%A5/4%E6%9C%883%E6%97%A5.mp4';

  // intrinsic sizes keep the collection rows at a consistent height without layout shift
  const DIMS = {
    'mens-banner.webp': [1920, 738],
    'mens-lineup.webp': [2200, 1129],
    'mens-look-coat.webp': [682, 1264],
    'mens-views-coat.webp': [1466, 1253],
    'mens-fabric-coat.webp': [848, 1028],
    'mens-look-jacket.webp': [518, 990],
    'mens-views-jacket.webp': [1189, 755],
    'mens-fabric-jacket.webp': [848, 1028],
    'mens-fabric-quilted.webp': [848, 1028],
    'womens-lineup.webp': [2200, 1129],
    'womens-look-green.webp': [790, 1244],
    'womens-views-green.webp': [1376, 768],
    'womens-fabric-green.webp': [1148, 768],
    'womens-look-tan.webp': [746, 1205],
    'womens-views-tan.webp': [1376, 768],
    'womens-fabric-tan.webp': [1068, 768],
    'womens-views-cream.webp': [1376, 768],
    'womens-fabric-cream.webp': [1068, 768]
  };

  const trend = [
    { id: 'trend-shacket', no: '01', name: 'SHACKET', meta: 'FW26 Shacket Trend', file: 'trend-shacket.webp' },
    { id: 'trend-shirt', no: '02', name: 'SHIRT', meta: 'FW26 Shirt Trend', file: 'trend-shirt.webp' },
    { id: 'trend-jacket', no: '03', name: 'JACKET', meta: 'FW26 Jacket Trend', file: 'trend-jacket.webp' },
    { id: 'trend-coat', no: '04', name: 'COAT', meta: 'FW26 Coat Trend', file: 'trend-coat.webp' },
    { id: 'trend-trouser', no: '05', name: 'TROUSER', meta: 'FW26 Trouser Trend', file: 'trend-trouser.webp' },
    { id: 'trend-fabric', no: '06', name: 'FABRIC', meta: 'FW26 Fabric Trend', file: 'trend-fabric.webp' }
  ];

  const collections = {
    mens: {
      label: 'MENS',
      banner: 'mens-banner.webp',
      lineup: 'mens-lineup.webp',
      groups: [
        { id: 'mens-coat', name: 'COAT', meta: '棉质风衣 · 侧面 / 背面 / 面料', images: ['mens-look-coat.webp', 'mens-views-coat.webp', 'mens-fabric-coat.webp'] },
        { id: 'mens-jacket', name: 'JACKET', meta: '绿色夹克 · 侧面 / 背面 / 面料', images: ['mens-look-jacket.webp', 'mens-views-jacket.webp', 'mens-fabric-jacket.webp'] },
        { id: 'mens-quilted', name: 'QUILTED', meta: '黑色绗缝面料细节', images: ['mens-fabric-quilted.webp'] }
      ]
    },
    womens: {
      label: 'WOMENS',
      banner: null,
      lineup: 'womens-lineup.webp',
      groups: [
        { id: 'womens-green', name: 'GREEN', meta: '橄榄绿工装 · 侧面 / 背面 / 面料', images: ['womens-look-green.webp', 'womens-views-green.webp', 'womens-fabric-green.webp'] },
        { id: 'womens-tan', name: 'TAN', meta: '驼色绗缝 · 侧面 / 背面 / 面料', images: ['womens-look-tan.webp', 'womens-views-tan.webp', 'womens-fabric-tan.webp'] },
        { id: 'womens-cream', name: 'CREAM', meta: '奶油色套装 · 侧面 / 背面 / 面料', images: ['womens-views-cream.webp', 'womens-fabric-cream.webp'] }
      ]
    }
  };

  const pages = {
    trend: { title: 'TREND', intro: 'FW26 · SOHO-Marks' },
    products: { title: 'PRODUCTS', intro: 'Select a category' },
    mens: { title: 'MENS', intro: 'Mens collection' },
    womens: { title: 'WOMENS', intro: 'Womens collection' },
    about: { title: 'ABOUT US', intro: 'SOHO Fashion since 1979' }
  };

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    }
  };

  let shortlist = store.get('marks-shortlist-v2', []);
  let comments = store.get('marks-comments-v2', {});
  let lastFocus = null;

  const main = document.getElementById('main');
  const detailModal = document.getElementById('detail-modal');
  const subscribeModal = document.getElementById('subscribe-modal');
  const searchOverlay = document.getElementById('search-overlay');
  const shortlistPanel = document.getElementById('shortlist-panel');
  const countEl = document.getElementById('shortlist-count');
  const toastEl = document.getElementById('toast');

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  function imgEl(src, alt, { lazy = true } = {}) {
    const img = document.createElement('img');
    img.src = IMG + src;
    img.alt = alt;
    img.loading = lazy ? 'lazy' : 'eager';
    img.decoding = 'async';
    return img;
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove('show'), 1900);
  }

  function allItems() {
    const list = trend.map(item => ({
      id: item.id,
      name: item.name,
      meta: item.meta,
      images: [item.file],
      kind: 'trend'
    }));
    for (const key of ['mens', 'womens']) {
      const collection = collections[key];
      for (const group of collection.groups) {
        list.push({
          id: group.id,
          name: group.name,
          meta: `${collection.label} · ${group.meta}`,
          images: group.images,
          kind: 'group',
          collection: key
        });
      }
    }
    return list;
  }

  const ITEMS = allItems();
  const ITEM_MAP = new Map(ITEMS.map(item => [item.id, item]));

  function isSaved(id) {
    return shortlist.some(item => item.id === id);
  }

  function toggleSave(item) {
    if (isSaved(item.id)) {
      shortlist = shortlist.filter(entry => entry.id !== item.id);
      toast('已从选款单移除');
    } else {
      shortlist = [...shortlist, { id: item.id, name: item.name, meta: item.meta, image: item.images[0] }];
      toast('已加入选款单');
    }
    store.set('marks-shortlist-v2', shortlist);
    refreshSaveState();
  }

  function refreshSaveState() {
    countEl.textContent = String(shortlist.length);
    countEl.hidden = shortlist.length === 0;
    document.querySelectorAll('[data-save-id]').forEach(button => {
      const saved = isSaved(button.dataset.saveId);
      button.classList.toggle('saved', saved);
      if (button.dataset.saveLabel) button.textContent = saved ? '已选' : '选款';
    });
    const detailSave = document.querySelector('#detail-content [data-save-detail]');
    if (detailSave) {
      const id = detailSave.dataset.saveDetail;
      detailSave.textContent = isSaved(id) ? '已加入选款单' : '加入选款单';
    }
    renderShortlist();
  }

  /* ---------- page rendering ---------- */

  function pageHead(title, intro) {
    const head = el('div', 'page-head');
    head.append(el('h1', null, title), el('p', null, intro));
    return head;
  }

  function renderTrend() {
    const frag = document.createDocumentFragment();
    frag.append(pageHead('TREND', 'FW26 · SOHO-Marks'));

    const hero = el('div', 'hero');
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'none';
    video.poster = IMG + 'hero-poster.webp';
    video.setAttribute('aria-label', 'SOHO-Marks 预告片');
    const source = document.createElement('source');
    source.src = VIDEO;
    source.type = 'video/mp4';
    video.append(source);
    hero.append(video);

    const note = el('div', 'hero-note');
    note.append(el('span', null, 'SOHO-Marks film'), el('span', null, 'FW26 / 2026'));
    hero.append(note);
    frag.append(hero);

    trend.forEach(item => {
      const block = el('section', 'trend-block');
      const index = el('div', 'block-index');
      index.append(el('b', null, item.no), el('span', null, item.name), el('span', null, item.meta));
      const figure = el('figure');
      figure.style.margin = '0';
      const img = imgEl(item.file, `${item.meta} · ${item.name}`);
      img.dataset.item = item.id;
      img.dataset.index = '0';
      img.style.aspectRatio = '2400 / 1418';
      figure.append(img);
      block.append(index, figure);
      frag.append(block);
    });

    return frag;
  }

  function renderProducts() {
    const frag = document.createDocumentFragment();
    frag.append(pageHead('PRODUCTS', 'Select a category'));

    const grid = el('div', 'categories');
    for (const key of ['mens', 'womens']) {
      const data = collections[key];
      const link = el('a', 'category');
      link.href = '#' + key;
      const img = imgEl(data.banner || data.lineup, `${data.label} collection`);
      img.style.aspectRatio = '2.55 / 1';
      const label = el('span', 'category-label', data.label);
      label.append(el('small', null, 'VIEW COLLECTION'));
      link.append(img, label);
      grid.append(link);
    }
    frag.append(grid);
    return frag;
  }

  function renderCollection(key) {
    const data = collections[key];
    const frag = document.createDocumentFragment();

    const crumb = el('div', 'breadcrumb');
    const home = el('a', null, 'PRODUCTS');
    home.href = '#products';
    crumb.append(home, document.createTextNode(` / ${data.label}`));
    frag.append(crumb);

    if (data.banner) {
      const banner = el('div', 'banner');
      banner.append(imgEl(data.banner, `${data.label} banner`));
      frag.append(banner);
    }

    if (data.lineup) {
      const lineup = el('div', 'lineup');
      lineup.append(imgEl(data.lineup, `${data.label} lineup`));
      frag.append(lineup);
    }

    for (const group of data.groups) {
      const row = el('div', 'look-row');
      if (group.images.length === 1) row.classList.add('single');
      group.images.forEach((file, index) => {
        const figure = el('figure');
        const dims = DIMS[file] || [4, 3];
        figure.style.flex = `${(dims[0] / dims[1]).toFixed(3)} 1 0%`;
        const img = imgEl(file, `${data.label} ${group.name} ${index + 1}`);
        img.dataset.item = group.id;
        img.dataset.index = String(index);
        const chip = el('button', 'save-chip', '选款');
        chip.type = 'button';
        chip.dataset.saveId = group.id;
        chip.dataset.saveLabel = '1';
        chip.addEventListener('click', event => {
          event.stopPropagation();
          toggleSave(ITEM_MAP.get(group.id));
        });
        figure.append(img, chip);
        row.append(figure);
      });
      frag.append(row);
    }

    return frag;
  }

  function renderAbout() {
    const frag = document.createDocumentFragment();
    frag.append(pageHead('ABOUT US', 'SOHO Fashion since 1979'));

    const copy = el('div', 'about-copy');
    copy.append(el('h2', null, '苏豪时尚 · SOHO FASHION'));
    copy.append(el('p', null, '江苏苏豪时尚集团，1979 年成立，业务覆盖纺织服装进出口、国内贸易与服装生产。本页展示品牌与集团资料，可直接用于门店与客户沟通。'));
    frag.append(copy);

    const stack = el('div', 'about-stack');
    ['about-01.webp', 'about-02.webp'].forEach((file, index) => {
      const figure = el('figure');
      figure.style.margin = '0';
      const img = imgEl(file, `SOHO 集团介绍 ${index + 1}`);
      img.style.aspectRatio = '2400 / 885';
      figure.append(img);
      stack.append(figure);
    });
    frag.append(stack);
    return frag;
  }

  function render() {
    const key = Object.prototype.hasOwnProperty.call(pages, location.hash.slice(1)) ? location.hash.slice(1) : 'trend';
    const config = pages[key];
    document.title = `${config.title} · SOHO-Marks`;

    main.innerHTML = '';
    if (key === 'trend') main.append(renderTrend());
    if (key === 'products') main.append(renderProducts());
    if (key === 'mens') main.append(renderCollection('mens'));
    if (key === 'womens') main.append(renderCollection('womens'));
    if (key === 'about') main.append(renderAbout());

    document.querySelectorAll('[data-route]').forEach(link => {
      const active = link.dataset.route === key;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    refreshSaveState();
  }

  /* ---------- detail ---------- */

  function openDetail(item, startIndex = 0) {
    const content = document.getElementById('detail-content');
    content.innerHTML = '';
    let current = Math.min(Math.max(startIndex, 0), item.images.length - 1);

    const figure = el('figure', 'detail-figure');
    const image = document.createElement('img');
    image.alt = item.name;
    figure.append(image);

    const bar = el('div', 'detail-bar');
    const barLeft = el('span', null, item.kind === 'trend' ? 'TREND' : item.meta.split('·')[0].trim());
    const barRight = el('span', null, '');
    bar.append(barLeft, barRight);

    const thumbs = el('div', 'thumbs');
    if (item.images.length > 1) {
      item.images.forEach((file, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `查看第 ${index + 1} 张`);
        const thumb = imgEl(file, '', { lazy: false });
        button.append(thumb);
        button.addEventListener('click', () => {
          current = index;
          update();
        });
        thumbs.append(button);
      });
    }

    const info = el('div', 'detail-info');
    const title = el('h2', null, item.name);
    title.id = 'detail-title';
    const meta = el('p', 'detail-meta', item.meta);
    const actions = el('div', 'detail-actions');
    const saveButton = el('button', 'outline-button');
    saveButton.type = 'button';
    saveButton.dataset.saveDetail = item.id;
    saveButton.addEventListener('click', () => toggleSave(item));
    const commentButton = el('button', 'solid-button', '写意见');
    commentButton.type = 'button';
    commentButton.addEventListener('click', () => {
      const box = content.querySelector('#comment-box');
      if (box) box.focus();
    });
    actions.append(saveButton, commentButton);
    info.append(title, meta, actions);

    const note = el('p', 'detail-note', item.kind === 'trend'
      ? '这一页是 FW26 趋势提案，可加入选款单，或在这里记录门店与客户的反馈。'
      : '这一组包含上身、三视图与面料细节。可以加入选款单，也可以记录客户意见。');
    info.append(note);

    const commentSection = el('div', 'comments');
    commentSection.append(el('p', 'eyebrow', 'COMMENTS · 意见'));
    const list = comments[item.id] || [];
    if (list.length === 0) {
      commentSection.append(el('p', 'empty-note', '还没有意见。'));
    } else {
      list.forEach(entry => {
        const row = el('div', 'comment');
        row.append(document.createTextNode(entry.text));
        row.append(el('small', null, entry.time));
        commentSection.append(row);
      });
    }
    const form = el('form', 'comment-form');
    const box = document.createElement('textarea');
    box.id = 'comment-box';
    box.placeholder = '写下这款在门店查看后的意见';
    const submit = el('button', 'outline-button', '提交意见');
    submit.type = 'submit';
    form.append(box, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = box.value.trim();
      if (!text) return;
      comments[item.id] = [...(comments[item.id] || []), { text, time: new Date().toLocaleString('zh-CN') }];
      store.set('marks-comments-v2', comments);
      openDetail(item, current);
      toast('意见已记录在本机');
    });
    commentSection.append(form);

    content.append(figure, bar, thumbs, info, commentSection);

    function update() {
      image.src = IMG + item.images[current];
      barRight.textContent = item.images.length > 1 ? `${current + 1} / ${item.images.length}` : '';
      thumbs.querySelectorAll('button').forEach((button, index) => {
        button.classList.toggle('active', index === current);
      });
      saveButton.textContent = isSaved(item.id) ? '已加入选款单' : '加入选款单';
    }

    update();
    openModal(detailModal);
  }

  function openImage(file, alt) {
    const content = document.getElementById('detail-content');
    content.innerHTML = '';
    const figure = el('figure', 'detail-figure');
    const image = document.createElement('img');
    image.src = IMG + file;
    image.alt = alt;
    figure.append(image);
    const heading = el('h2', 'sr-only', alt);
    heading.id = 'detail-title';
    content.append(figure, heading);
    openModal(detailModal);
  }

  /* ---------- shortlist ---------- */

  function renderShortlist() {
    const box = document.getElementById('shortlist-items');
    box.innerHTML = '';
    if (shortlist.length === 0) {
      box.append(el('p', 'empty-note', '选款单还是空的。浏览 TREND 或 MENS / WOMENS 时点「选款」加入。'));
      return;
    }
    shortlist.forEach(item => {
      const row = el('div', 'shortlist-row');
      const img = imgEl(item.image, item.name);
      const text = el('div');
      text.append(el('strong', null, item.name), el('small', null, item.meta));
      const remove = el('button', 'text-button', '移除');
      remove.type = 'button';
      remove.addEventListener('click', () => toggleSave(ITEM_MAP.get(item.id)));
      row.append(img, text, remove);
      box.append(row);
    });
  }

  function openPanel() {
    lastFocus = document.activeElement;
    shortlistPanel.classList.add('open');
    shortlistPanel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    renderShortlist();
    shortlistPanel.querySelector('[data-close-panel]').focus();
  }

  function closePanel() {
    shortlistPanel.classList.remove('open');
    shortlistPanel.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.open, .overlay.open')) document.body.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  }

  function exportShortlist() {
    if (shortlist.length === 0) {
      toast('选款单还是空的');
      return;
    }
    const absolute = file => new URL(IMG + file, location.href).href;
    const rows = shortlist.map((item, index) => `
      <li>
        <img src="${absolute(item.image)}" alt="">
        <div><strong>${index + 1}. ${item.name}</strong><span>${item.meta}</span></div>
      </li>`).join('');
    const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>SOHO-Marks 选款单</title>
      <style>
        body{font-family:"Helvetica Neue",Arial,"Microsoft YaHei",sans-serif;color:#222;margin:40px;max-width:820px}
        h1{font-size:18px;font-weight:400;letter-spacing:.12em;margin:0 0 6px}
        p{color:#888;font-size:12px;margin:0 0 26px}
        ol{list-style:none;padding:0;margin:0}
        li{display:flex;gap:18px;align-items:center;padding:14px 0;border-bottom:1px solid #e8e8e8}
        img{width:96px;height:120px;object-fit:cover;background:#f4f4f4}
        strong{display:block;font-weight:500;font-size:14px}
        span{display:block;margin-top:4px;color:#999;font-size:11px}
        footer{margin-top:30px;color:#aaa;font-size:11px}
      </style>
      <h1>SOHO-Marks 选款单</h1>
      <p>${new Date().toLocaleDateString('zh-CN')} · 共 ${shortlist.length} 款</p>
      <ol>${rows}</ol>
      <footer>SOHO FASHION · online@saintycorp.com</footer>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'SOHO-Marks-选款单.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast('选款单已导出');
  }

  /* ---------- search ---------- */

  function openSearch() {
    lastFocus = document.activeElement;
    searchOverlay.classList.add('open');
    searchOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const input = document.getElementById('search-input');
    input.value = '';
    renderSearch('');
    input.focus();
  }

  function closeSearch() {
    searchOverlay.classList.remove('open');
    searchOverlay.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.open, .side-panel.open')) document.body.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  }

  function renderSearch(query) {
    const box = document.getElementById('search-results');
    box.innerHTML = '';
    const q = query.trim().toLowerCase();
    const matches = q
      ? ITEMS.filter(item => `${item.name} ${item.meta}`.toLowerCase().includes(q))
      : ITEMS;
    if (matches.length === 0) {
      box.append(el('p', 'search-empty', `没有找到「${query}」。试试 SHACKET、JACKET、COAT 或 FABRIC。`));
      return;
    }
    matches.forEach(item => {
      const card = el('button', 'search-card');
      card.type = 'button';
      card.dataset.item = item.id;
      card.dataset.index = '0';
      const img = imgEl(item.images[0], item.name);
      card.append(img, el('strong', null, item.name), el('small', null, item.meta));
      box.append(card);
    });
  }

  /* ---------- modal helpers ---------- */

  function openModal(modal) {
    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const close = modal.querySelector('[data-close-modal]');
    if (close) close.focus();
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.open, .overlay.open, .side-panel.open')) {
      document.body.classList.remove('modal-open');
    }
    if (lastFocus) lastFocus.focus();
  }

  function closeAll() {
    document.querySelectorAll('.modal.open, .side-panel.open').forEach(node => {
      node.classList.remove('open');
      node.setAttribute('aria-hidden', 'true');
    });
    if (searchOverlay.classList.contains('open')) closeSearch();
    document.body.classList.remove('modal-open');
  }

  /* ---------- events ---------- */

  window.addEventListener('hashchange', () => {
    closeAll();
    render();
    window.scrollTo(0, 0);
  });

  main.addEventListener('click', event => {
    const target = event.target.closest('[data-item]');
    if (!target) return;
    if (event.target.closest('[data-save-id]')) return;
    const item = ITEM_MAP.get(target.dataset.item);
    if (item) openDetail(item, Number(target.dataset.index || 0));
  });

  main.addEventListener('click', event => {
    const img = event.target.closest('.about-stack img');
    if (img) openImage(img.src.split('/').pop(), img.alt);
  });

  document.getElementById('open-shortlist').addEventListener('click', openPanel);
  document.getElementById('open-subscribe').addEventListener('click', () => openModal(subscribeModal));
  document.getElementById('open-search').addEventListener('click', openSearch);
  document.getElementById('download-shortlist').addEventListener('click', exportShortlist);

  document.querySelectorAll('[data-close-panel]').forEach(button => button.addEventListener('click', closePanel));
  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => closeModal(button.closest('.modal')));
  });
  document.querySelector('[data-close-search]').addEventListener('click', closeSearch);

  [detailModal, subscribeModal].forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal(modal);
    });
  });

  searchOverlay.addEventListener('click', event => {
    if (event.target === searchOverlay) closeSearch();
  });

  document.getElementById('search-input').addEventListener('input', event => renderSearch(event.target.value));

  document.getElementById('search-results').addEventListener('click', event => {
    const card = event.target.closest('[data-item]');
    if (!card) return;
    const item = ITEM_MAP.get(card.dataset.item);
    if (!item) return;
    closeSearch();
    openDetail(item, 0);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openModalNode = document.querySelector('.modal.open');
    if (openModalNode) { closeModal(openModalNode); return; }
    if (searchOverlay.classList.contains('open')) { closeSearch(); return; }
    if (shortlistPanel.classList.contains('open')) closePanel();
  });

  document.getElementById('subscribe-form').addEventListener('submit', event => {
    event.preventDefault();
    const email = document.getElementById('subscribe-email').value.trim();
    const status = document.getElementById('subscribe-status');
    store.set('marks-subscribe-email', email);
    status.textContent = `已记录 ${email}。当前为演示流程，不会实际发送邮件。`;
    toast('订阅信息已记录');
  });

  /* ---------- init ---------- */
  render();
})();
