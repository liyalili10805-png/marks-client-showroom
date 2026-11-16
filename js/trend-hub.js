(() => {
  'use strict';
  const DATA_URL = 'data/trend-editorial.json?v=20261115edit1';
  const SAVE_KEY = 'soho-trend-saved-v1';
  const view = document.body.dataset.trendView;
  const params = new URLSearchParams(location.search);
  const filters = { category: params.get('category') || 'All', gender: params.get('audience') || 'All', query: params.get('q') || '', saved: params.get('saved') === '1' };
  const categories = ['All', 'Outerwear', 'Shirts', 'Trousers', 'Materials'];
  if (!categories.includes(filters.category)) filters.category = 'All';
  if (!['All', 'Women', 'Men'].includes(filters.gender)) filters.gender = 'All';
  let data;
  let saved = [];
  let toastTimer;
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]');
    if (Array.isArray(stored)) saved = stored.filter(id => typeof id === 'string');
  } catch { /* Browsing remains available when local storage is disabled. */ }

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const storyURL = story => `trend-story.html?story=${encodeURIComponent(story.id)}`;
  const image = (src, alt, position, eager = false) => {
    const img = el('img');
    img.src = src;
    img.alt = alt;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    if (position) img.style.objectPosition = position;
    return img;
  };
  function link(href, className, text) {
    const a = el('a', className, text);
    a.href = href;
    return a;
  }
  function toast(text) {
    const node = document.getElementById('edit-toast');
    if (!node) return;
    node.textContent = text;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
  }
  function bookmarkIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M6 3h12v18l-6-4-6 4z');
    svg.append(path);
    return svg;
  }
  function updateSavedButtons() {
    document.querySelectorAll('[data-save-story]').forEach(button => {
      const active = saved.includes(button.dataset.saveStory);
      button.setAttribute('aria-pressed', String(active));
      const story = data.stories.find(s => s.id === button.dataset.saveStory);
      button.setAttribute('aria-label', `${active ? 'Unsave' : 'Save'} ${story ? story.title : 'story'}`);
      button.title = active ? 'Remove from saved stories' : 'Save story on this device';
    });
    const count = document.getElementById('saved-count');
    if (count) count.textContent = String(saved.length);
  }
  function saveButton(story) {
    const button = el('button', 'story-save');
    button.type = 'button';
    button.dataset.saveStory = story.id;
    button.append(bookmarkIcon());
    button.addEventListener('click', () => {
      saved = saved.includes(story.id) ? saved.filter(id => id !== story.id) : [...saved, story.id];
      let persisted = true;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { persisted = false; }
      updateSavedButtons();
      if (filters.saved && view === 'hub') renderFeed();
      toast(saved.includes(story.id) ? (persisted ? 'Story saved on this device' : 'Story saved for this visit') : 'Story removed from saved');
    });
    return button;
  }
  function storyCard(story) {
    const card = el('article', 'story-card');
    card.dataset.storyId = story.id;
    const media = el('div', 'story-card-media');
    const photoLink = link(storyURL(story));
    photoLink.tabIndex = -1;
    photoLink.setAttribute('aria-hidden', 'true');
    photoLink.append(image(story.image, '', story.imagePosition));
    media.append(photoLink, el('span', 'story-label', story.category), saveButton(story));
    const macro = data.macroStories.find(m => m.id === story.macroStoryId);
    const meta = el('div', 'story-card-meta');
    meta.append(el('span', null, macro.id === 'purpose-reconsidered' ? 'Purpose, reconsidered' : 'Texture, with character'), el('span', null, story.gender));
    const heading = el('h3');
    heading.append(link(storyURL(story), null, story.title));
    const bottom = el('div', 'story-card-bottom');
    const read = link(storyURL(story), null, 'Read the story');
    read.setAttribute('aria-label', `Read ${story.title}`);
    read.append(el('span', null, '↗'));
    bottom.append(el('span', null, story.season), read);
    card.append(media, meta, heading, el('p', null, story.subtitle), bottom);
    return card;
  }
  function renderLead() {
    const node = document.getElementById('lead-stories');
    const story = data.stories.find(s => s.id === 'utility-rebalanced');
    const article = el('article', 'feature-story');
    const media = link(storyURL(story), 'feature-media');
    media.setAttribute('aria-label', `Read ${story.title}`);
    media.append(image(story.image, story.imageAlt, '50% 24%', true), el('span', 'feature-number', '01'));
    const copy = el('div', 'feature-copy');
    const heading = el('h2');
    heading.append(link(storyURL(story), null, story.title));
    const cta = link(storyURL(story), 'text-cta', 'Discover the direction');
    cta.append(el('span', null, '↗'));
    copy.append(el('p', 'edit-kicker', 'THE BIG IDEA / OUTERWEAR'), heading, el('p', null, 'Workwear roots. Softer structure. A more considered way to layer for the everyday.'), cta);
    article.append(media, copy);
    const side = el('div', 'lead-side');
    const label = el('div', 'lead-side-label');
    label.append(el('span', null, 'Also on our radar'), el('span', null, 'A/W 27/28'));
    side.append(label);
    for (const id of ['top-layer-shirt', 'straighter-direction']) {
      const item = data.stories.find(s => s.id === id);
      const mini = el('article', 'lead-mini');
      const miniMedia = link(storyURL(item), 'lead-mini-media');
      miniMedia.tabIndex = -1;
      miniMedia.setAttribute('aria-hidden', 'true');
      miniMedia.append(image(item.image, '', item.imagePosition));
      const text = el('div');
      const h3 = el('h3');
      h3.append(link(storyURL(item), null, item.title));
      text.append(el('small', null, item.category), h3, el('p', null, item.subtitle));
      mini.append(miniMedia, text);
      side.append(mini);
    }
    side.append(el('p', 'lead-foot', 'Seasonal ideas, translated into everyday choices.'));
    node.replaceChildren(article, side);
  }
  function matches(story) {
    if (filters.category !== 'All' && !story.topics.includes(filters.category)) return false;
    if (filters.gender !== 'All' && !story.gender.split(/\s*&\s*/).includes(filters.gender)) return false;
    if (filters.saved && !saved.includes(story.id)) return false;
    const haystack = [story.title, story.subtitle, story.category, story.gender, story.patternEdit, ...story.takeaways, ...story.materialRoutes.map(r => `${r.name} ${r.description} ${r.pattern}`)].join(' ').toLocaleLowerCase('en');
    return filters.query.trim().toLocaleLowerCase('en').split(/\s+/).every(word => !word || haystack.includes(word));
  }
  function updateURL() {
    const query = new URLSearchParams();
    if (filters.category !== 'All') query.set('category', filters.category);
    if (filters.gender !== 'All') query.set('audience', filters.gender);
    if (filters.query) query.set('q', filters.query);
    if (filters.saved) query.set('saved', '1');
    const suffix = query.toString();
    history.replaceState(null, '', `${location.pathname}${suffix ? '?' + suffix : ''}${location.hash}`);
  }
  function renderFeed() {
    const stories = data.stories.filter(matches);
    document.getElementById('story-grid').replaceChildren(...stories.map(storyCard));
    document.getElementById('edit-empty').hidden = stories.length > 0;
    document.getElementById('result-count').textContent = `${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`;
    document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === filters.category)));
    document.getElementById('saved-filter').setAttribute('aria-pressed', String(filters.saved));
    updateSavedButtons();
    updateURL();
  }
  function contextLink(source) {
    const li = el('li');
    const a = link(source.url, null, source.publisher + ' · A/W 27/28');
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    li.append(a, el('small', null, `${source.title} / ${source.date}`));
    return li;
  }
  function setupHub() {
    renderLead();
    document.getElementById('signals-grid').replaceChildren(...data.sources.map(source => {
      const signal = el('article', 'global-signal');
      const sourceLink = link(source.url, null, source.publisher + ' ↗');
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener noreferrer';
      signal.append(el('p', 'edit-kicker', source.signalLabel), el('h3', null, source.signalTitle), el('p', null, source.signalText), sourceLink);
      return signal;
    }));
    const search = document.getElementById('edit-search');
    const gender = document.getElementById('edit-gender');
    search.value = filters.query;
    gender.value = filters.gender;
    document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
      filters.category = button.dataset.category;
      renderFeed();
    }));
    search.addEventListener('input', () => { filters.query = search.value; renderFeed(); });
    gender.addEventListener('change', () => { filters.gender = gender.value; renderFeed(); });
    document.getElementById('saved-filter').addEventListener('click', () => { filters.saved = !filters.saved; renderFeed(); });
    document.getElementById('reset-filters').addEventListener('click', () => {
      Object.assign(filters, { category: 'All', gender: 'All', query: '', saved: false });
      search.value = '';
      gender.value = 'All';
      renderFeed();
    });
    document.getElementById('view-materials').addEventListener('click', () => {
      Object.assign(filters, { category: 'Materials', query: '', saved: false });
      search.value = '';
      renderFeed();
      document.getElementById('latest').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
    document.getElementById('context-links').replaceChildren(...data.sources.map(contextLink));
    renderFeed();
  }
  function figure(src, alt, position, caption, eager = false) {
    const node = el('figure');
    node.append(image(src, alt, position, eager), el('figcaption', null, caption));
    return node;
  }
  function articleTitleBlock(kicker, title) {
    const block = el('div');
    block.append(el('p', 'edit-kicker', kicker), el('h2', null, title));
    return block;
  }
  async function renderArticle() {
    const article = document.getElementById('trend-article');
    const story = data.stories.find(s => s.id === params.get('story'));
    if (!story) {
      const error = el('div', 'edit-empty');
      error.append(el('h1', null, 'This story is not in the current edit.'), link('trend.html#latest', 'text-cta', 'Explore all trend stories ↗'));
      article.replaceChildren(error);
      document.querySelector('.related-stories').hidden = true;
      return;
    }
    document.title = `${story.title} | A/W 27/28 | SOHO for Mark’s`;
    document.querySelector('meta[name="description"]').content = story.subtitle;
    const macro = data.macroStories.find(m => m.id === story.macroStoryId);
    const head = el('header', 'article-header');
    const meta = el('div', 'article-meta');
    meta.append(el('span', null, story.category), el('span', null, story.gender), el('span', null, story.season), saveButton(story));
    const byline = el('div', 'article-byline');
    byline.append(el('span', null, 'SOHO Fashion / For Mark’s'), el('time', null, '15 November 2026'));
    byline.querySelector('time').dateTime = story.publishedAt;
    head.append(meta, el('h1', null, story.title), el('p', null, story.subtitle), byline);
    const pair = el('div', 'article-image-pair');
    pair.append(figure(story.image, story.imageAlt, story.imagePosition, story.caption, true), figure(story.secondaryImage, story.secondaryCaption, '50% 35%', story.secondaryCaption));
    const translation = el('section', 'article-translation');
    const relevance = articleTitleBlock(macro.eyebrow, 'The everyday translation');
    relevance.append(el('p', null, story.whyRelevant));
    const moves = el('ol', 'design-moves');
    story.takeaways.forEach(move => moves.append(el('li', null, move)));
    translation.append(relevance, moves);
    const materials = el('section', 'article-materials');
    const materialsTop = el('div', 'article-materials-top');
    materialsTop.append(articleTitleBlock('THREE WAYS INTO THE STORY', 'Material directions'), el('p', null, 'Alternative routes for development.'));
    const routes = el('div', 'material-route-grid');
    story.materialRoutes.forEach((route, i) => {
      const node = el('div', 'material-route');
      node.append(el('small', null, `0${i + 1} / MATERIAL ROUTE`), el('h3', null, route.name), el('p', null, route.description), el('p', 'route-pattern', route.pattern));
      routes.append(node);
    });
    materials.append(materialsTop, routes);
    const pattern = el('section', 'article-pattern');
    pattern.append(articleTitleBlock('COLOUR, WEAVE & SURFACE', 'The pattern edit'), el('p', null, story.patternEdit));
    const sourceNote = el('aside', 'article-source-note');
    sourceNote.append(el('p', null, 'Original SOHO development interpretation. Reference garments illustrate shape, detail or surface; alternative materials are proposed directions.'));
    const context = el('nav');
    context.setAttribute('aria-label', 'Public seasonal context');
    data.sources.filter(s => story.sourceIds.includes(s.id)).forEach(source => {
      const a = link(source.url, null, source.publisher + ' · A/W 27/28 ↗');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      context.append(a);
    });
    sourceNote.append(el('p', null, 'Explore the wider textile context:'), context);
    article.replaceChildren(head, pair, translation, materials, pattern);
    const referenceBlock = el('section', 'article-related-styles');
    referenceBlock.append(articleTitleBlock('FROM DIRECTION TO GARMENT', 'Explore the design references'));
    const styles = el('div', 'reference-styles');
    try {
      const response = await fetch('data/collections.json');
      if (!response.ok) throw new Error('Collection not available');
      const catalogue = await response.json();
      const records = story.relatedStyleCodes.map(code => catalogue.products.find(product => product.code === code)).filter(Boolean);
      records.forEach(product => {
        const node = el('article', 'reference-style');
        const a = link(`collection-detail.html?code=${encodeURIComponent(product.code)}`);
        a.append(image(product.image, product.name, '50% 20%'), el('h3', null, product.name), el('span', null, 'Explore this reference ↗'));
        node.append(a);
        styles.append(node);
      });
      if (records.length) { referenceBlock.append(styles); article.append(referenceBlock); }
    } catch {
      referenceBlock.append(link('collection-series.html?occasion=everyday', 'text-cta', 'Explore the everyday collection ↗'));
      article.append(referenceBlock);
    }
    article.append(sourceNote);
    const related = [...data.stories.filter(s => s.id !== story.id && s.macroStoryId === story.macroStoryId), ...data.stories.filter(s => s.macroStoryId !== story.macroStoryId)].slice(0, 3);
    document.getElementById('related-grid').replaceChildren(...related.map(storyCard));
    updateSavedButtons();
  }
  function setupHeader() {
    const form = document.querySelector('.header-search');
    if (form) form.addEventListener('submit', event => {
      event.preventDefault();
      const query = form.querySelector('input').value.trim();
      if (view === 'hub') {
        filters.query = query;
        document.getElementById('edit-search').value = query;
        renderFeed();
        document.getElementById('latest').scrollIntoView();
      } else location.href = `trend.html?q=${encodeURIComponent(query)}#latest`;
    });
    const selection = document.querySelector('[aria-label="View selection"]');
    if (selection) selection.addEventListener('click', () => { location.href = 'my-selection.html'; });
    const contact = document.querySelector('[aria-label="Subscribe"]');
    if (contact) {
      contact.setAttribute('aria-label', 'Contact SOHO Fashion');
      contact.title = 'Contact SOHO Fashion';
      contact.addEventListener('click', () => { location.href = 'mailto:online@saintycorp.com?subject=SOHO%20Trend%20Edit%20AW27%2F28'; });
    }
  }
  async function start() {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error('Seasonal edit unavailable');
      data = await response.json();
      saved = [...new Set(saved)].filter(id => data.stories.some(story => story.id === id));
      setupHeader();
      if (view === 'hub') setupHub();
      else await renderArticle();
    } catch {
      const node = document.getElementById(view === 'hub' ? 'lead-stories' : 'trend-article');
      const error = el('div', 'edit-empty');
      error.append(el('h2', null, 'The edit could not load.'), el('p', null, 'Please refresh the page, or explore the collection.'), link('collection-series.html?occasion=everyday', 'text-cta', 'Explore the collection ↗'));
      if (node) node.replaceChildren(error);
      if (view === 'hub') document.getElementById('latest').hidden = true;
    }
  }
  start();
})();
