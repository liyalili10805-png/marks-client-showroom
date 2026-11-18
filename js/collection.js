(() => {
  'use strict';

  const scriptVersion = document.currentScript ? new URL(document.currentScript.src, location.href).searchParams.get('v') : '';
  const DATA_URL = 'data/collections.json?v=' + encodeURIComponent(scriptVersion || '20261118audit2');
  const TREND_CONNECTIONS_URL = 'data/trend-connections.json?v=' + encodeURIComponent(scriptVersion || '20261118audit2');
  const SELECT_KEY = 'soho-collection-selection';
  const view = document.body.dataset.view || 'landing';
  const SERIES_QUERY_KEYS = ['gender', 'type', 'material', 'colour', 'retail', 'occasion', 'season', 'q', 'page'];
  let trendConnections = null;
  let trendConnectionsPromise;
  let trendConnectionsFailed = false;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const escape = value => String(value == null ? '' : value);
  // Keep archived source records intact; only this development brief enters the active journey.
  const inDevelopmentScope = product => product.type === 'outerwear' || product.type === 'top' && /\bshirt\b/i.test(product.name || '') || product.type === 'bottom' && !/\bjeans\b/i.test(product.name || '');
  function readVotes() { try { const list=JSON.parse(localStorage.getItem('soho-votes') || '[]');return Array.isArray(list)?list:[]; } catch { return []; } }
  function paintVotes() { document.querySelectorAll('[data-style-vote]').forEach(button=>{const active=readVotes().includes(button.dataset.styleVote);button.classList.toggle('is-voted',active);button.setAttribute('aria-pressed',String(active));const label=button.querySelector('span');if(label)label.textContent=active?'Voted locally':'Vote';else button.textContent=active?'Voted locally':'Vote';}); }
  function toggleVote(product) { const votes=readVotes(),next=votes.includes(product.code)?votes.filter(code=>code!==product.code):votes.concat(product.code);try{localStorage.setItem('soho-votes',JSON.stringify(next));paintVotes();toast('Preference saved on this device only. Not sent.');}catch{toast('This device could not save your preference.');} }
  const CONNECTION_TIERS = {direct:{rank:0,label:'Direct match'},alternative:{rank:1,label:'Development alternative'},concept:{rank:2,label:'Studio concept'}};
  function termTier(term) { return term && Object.prototype.hasOwnProperty.call(CONNECTION_TIERS,term.tier) ? term.tier : 'alternative'; }
  function termRationale(term) { return typeof term.rationale === 'string' && term.rationale.trim() ? term.rationale.trim() : 'A development reference to review against the intended garment and material brief.'; }
  function styleConnections(product, context = trendSelection()) {
    return (context.terms || []).filter(term => Array.isArray(term.ids) && term.ids.includes(product.code)).map(term => product.imageKind === 'concept' ? {...term,tier:'concept',rationale:'Digital shape reference only, not an existing physical sample. Subject to physical development. '+termRationale(term)} : term).sort((a,b)=>CONNECTION_TIERS[termTier(a)].rank-CONNECTION_TIERS[termTier(b)].rank);
  }
  function sortTrendStyles(list, context) {
    if (!context.active) return list;
    const rank=product=>{const first=styleConnections(product,context)[0];return first?CONNECTION_TIERS[termTier(first)].rank:3;};
    return list.sort((a,b)=>rank(a)-rank(b));
  }
  function connectionReasons(terms, max = terms.length) {
    const list = el('ul','col-trend-reasons');
    terms.slice(0,max).forEach(term=>{
      const item=el('li'),tier=termTier(term);item.dataset.tier=tier;
      item.append(el('span','col-connection-tier',CONNECTION_TIERS[tier].label),el('strong',null,term.label || term.key),el('span','col-connection-rationale',termRationale(term)));list.append(item);
    });
    return list;
  }
  function trendEvidence(product, context = trendSelection()) {
    if (!context.active) return null;
    const terms=styleConnections(product,context);if(!terms.length)return null;
    const section=el('div','col-trend-evidence');section.dataset.tier=termTier(terms[0]);
    section.setAttribute('aria-label','Why this style is linked');section.append(connectionReasons(terms,2));return section;
  }

  async function loadTrendConnections(forDetail = false) {
    if (!forDetail && !new URLSearchParams(location.search).has('trend')) return;
    if (!trendConnectionsPromise) {
      trendConnectionsPromise = fetch(TREND_CONNECTIONS_URL)
        .then(response => {
          if (!response.ok) throw new Error('Trend connections unavailable');
          return response.json();
        })
        .then(payload => {
          if (!payload || !payload.reports || typeof payload.reports !== 'object' || Array.isArray(payload.reports)) throw new Error('Invalid trend connections');
          trendConnections = payload;
        })
        .catch(() => { trendConnectionsFailed = true; });
    }
    await trendConnectionsPromise;
  }

  function relatedResearch(product) {
    if (!trendConnections || !trendConnections.reports) return [];
    return Object.entries(trendConnections.reports).filter(([,report])=>report && typeof report==='object' && Array.isArray(report.styleTerms)).map(([id,report])=>{
      const terms=styleConnections(product,{terms:report.styleTerms});
      return {id,title:report.title || id,terms};
    }).filter(report=>report.terms.length).sort((a,b)=>CONNECTION_TIERS[termTier(a.terms[0])].rank-CONNECTION_TIERS[termTier(b.terms[0])].rank || a.title.localeCompare(b.title));
  }

  function renderRelatedResearch(product) {
    const section=el('section','col-related-research');section.setAttribute('aria-label','Related research');
    const heading=el('div','col-related-heading');heading.append(el('p','col-trend-eyebrow','Research / Style connections'),el('h2',null,'Related research'),el('p','col-related-intro','Research connections explain this style reference. Materials in the linked reports are separate research references; compatibility, construction and physical sample quality require review.'));section.append(heading);
    const content=el('div','col-related-content');content.append(el('p','col-trend-message','Loading recorded research connections…'));section.append(content);
    function paint(){
      content.innerHTML='';
      if(!trendConnections){content.append(el('p','col-trend-message','Research connections could not be loaded. You can still review this style and add development notes.'));return;}
      const reports=relatedResearch(product);
      if(!reports.length){content.append(el('p','col-trend-message','No local research connection is recorded for this style yet.'));return;}
      reports.forEach(report=>{
        const card=el('article','col-related-report');card.dataset.report=report.id;
        const title=el('h3'),reportLink=el('a',null,report.title);reportLink.href='trend-story.html?report='+encodeURIComponent(report.id);title.append(reportLink);card.append(title,connectionReasons(report.terms,2));
        const links=el('nav','col-related-links');links.setAttribute('aria-label',report.title+' research links');
        const read=el('a',null,'Read report ↗');read.href=reportLink.href;
        const materials=el('a',null,'Related material research ↗');materials.href='products.html?'+new URLSearchParams({trend:report.id});
        links.append(read,materials);card.append(links);content.append(card);
      });
    }
    if(trendConnections)paint();else loadTrendConnections(true).then(paint);
    return section;
  }

  function trendSelection() {
    const params = new URLSearchParams(location.search);
    if (!params.has('trend')) return {active: false};
    const id = params.get('trend');
    const direction = params.get('direction');
    const result = {active: true, id, direction, ids: new Set(), terms: [], title: 'Trend selection', label: 'Related style directions'};
    if (!trendConnections) {
      result.error = trendConnectionsFailed ? 'This trend selection could not be loaded. Return to the report or clear the trend selection to browse the collection.' : 'Loading this trend selection…';
      return result;
    }
    const report = Object.prototype.hasOwnProperty.call(trendConnections.reports, id) ? trendConnections.reports[id] : null;
    if (!report || !Array.isArray(report.styleTerms)) {
      result.error = 'This trend report is not available. Return to the report or clear the trend selection to browse the collection.';
      return result;
    }
    result.title = report.title || report.id || id;
    result.season = trendConnections.season || '';
    const availableTerms = report.styleTerms.filter(term => term && typeof term === 'object');
    const terms = params.has('direction') ? availableTerms.filter(term => term.key === direction) : availableTerms;
    if (params.has('direction') && !terms.length) {
      result.label = 'Keyword unavailable';
      result.error = 'This keyword is not available in the selected report. Return to the report to choose another direction.';
      return result;
    }
    if (params.has('direction')) result.label = terms[0].label || terms[0].key;
    result.terms = terms;
    terms.forEach(term => {
      if (term && Array.isArray(term.ids)) term.ids.forEach(code => { if (typeof code === 'string' && code) result.ids.add(code); });
    });
    return result;
  }

  function seriesUrl(options = {}) {
    const current = new URLSearchParams(location.search), params = new URLSearchParams();
    if (options.keepFilters !== false) SERIES_QUERY_KEYS.forEach(key => { if (current.has(key)) params.set(key, current.get(key)); });
    if (!options.clearTrend && current.has('trend')) {
      params.set('trend', current.get('trend'));
      if (current.has('direction')) params.set('direction', current.get('direction'));
    }
    if (options.resetPage) params.delete('page');
    return 'collection-series.html' + (params.size ? '?' + params.toString() : '');
  }

  function detailUrl(code, hash = '') {
    const current = new URLSearchParams(location.search), params = new URLSearchParams({code});
    if (current.has('trend')) {
      params.set('trend', current.get('trend'));
      if (current.has('direction')) params.set('direction', current.get('direction'));
    }
    SERIES_QUERY_KEYS.forEach(key => { if (current.has(key)) params.set(key, current.get(key)); });
    return 'collection-detail.html?' + params.toString() + hash;
  }

  function trendContext(context, product) {
    const section = el('section', 'col-trend-context');
    section.setAttribute('aria-label', 'Trend selection');
    if (context.error) section.classList.add('has-error');
    const copy = el('div', 'col-trend-copy');
    copy.append(el('p', 'col-trend-eyebrow', ['From the Trend library', context.season].filter(Boolean).join(' · ')), el('h2', null, context.title), el('p', 'col-trend-keyword', context.label));
    if (context.error) copy.append(el('p', 'col-trend-message', context.error));
    else {
      copy.append(el('p', 'col-trend-message', product ? 'The relationship to this style is identified below. Return to the trend selection to continue browsing.' : context.direction != null ? 'The relationship to this keyword is identified below. Refine the selection using the filters.' : 'References across the report’s related dimensions. Direct matches, development alternatives and studio concepts are identified separately.'));
      const terms=product?styleConnections(product,context):context.terms || [];
      if(terms.length && (product || context.direction != null))copy.append(connectionReasons(terms,product?2:terms.length));
      else if(terms.length){
        const counts=Object.entries(CONNECTION_TIERS).map(([tier,info])=>{
          const ids=new Set(terms.filter(term=>termTier(term)===tier).flatMap(term=>term.ids||[]));
          return ids.size?`${ids.size} ${info.label.toLowerCase()}${ids.size===1?'':'s'}`:'';
        }).filter(Boolean);
        copy.append(el('p','col-trend-message',counts.join(' · ')));
        copy.append(el('p','col-trend-dimensions',[...new Set(terms.map(term=>term.label||term.key))].join(' / ')));
      }
    }
    const links = el('nav', 'col-trend-actions');
    links.setAttribute('aria-label', 'Trend selection navigation');
    const report = el('a', null, 'Back to report ↗');
    report.href = context.id ? 'trend-story.html?report=' + encodeURIComponent(context.id) : 'trend.html';
    const clear = el('a', null, 'Clear trend selection');
    clear.dataset.clearTrend = '';
    clear.href = seriesUrl({clearTrend: true, resetPage: true});
    links.append(report, clear);
    section.append(copy, links);
    return section;
  }

  function imageSource(value) {
    const source = String(value || '');
    const publicRoot = 'https://liyalili10805-png.github.io/marks-client-showroom/';
    return source.startsWith(publicRoot) ? source.slice(publicRoot.length) : source;
  }
  function listImage(item, compact) {
    if (String(item.image || '').startsWith('blob:')) return item.image;
    return (compact && item.viewThumbnails && item.viewThumbnails[0]) || item.thumbnail || item.listImage || item.image;
  }
  function materialImage(source, label, options = {}) {
    const img = document.createElement('img');
    img.alt = label || '';
    img.width = options.width || 480;
    img.height = options.height || 720;
    img.loading = options.eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    if (options.priority) img.fetchPriority = 'high';
    if (options.styleCode) {
      img.dataset.styleImage = options.styleCode;
      img.dataset.imageSize = options.compact ? 'compact' : 'list';
    }
    const primary = imageSource(source);
    const fallback = imageSource(options.fallback);
    if (fallback && fallback !== primary) img.addEventListener('error', () => {
      img.removeAttribute('srcset');
      img.src = fallback;
    }, {once: true});
    img.src = primary;
    return img;
  }
  function refreshOverrideImages() {
    document.querySelectorAll('[data-style-image]').forEach(img => {
      const item = products.find(product => normCode(product.code) === normCode(img.dataset.styleImage));
      if (item) img.src = imageSource(listImage(item, img.dataset.imageSize === 'compact'));
    });
  }

  // Development timing is an assigned brief, not the source garment's collection date.
  const developmentSeason = product => String(product.developmentSeason || '').trim();
  function matchesStyleFilters(product, filters) {
    return (!filters.gender || product.gender === filters.gender)
      && (!filters.type || product.type === filters.type)
      && (!filters.material || product.material === filters.material)
      && (!filters.colour || (product.colours || []).some(colour => colour.name === filters.colour))
      && (!filters.retail || product.retail === filters.retail)
      && (!filters.occasion || (product.occasions || []).includes(filters.occasion))
      && (!filters.season || (filters.season === 'unassigned' ? !developmentSeason(product) : developmentSeason(product) === filters.season))
      && (!filters.q || filters.q.toLowerCase().trim().split(/\s+/).every(term=>[product.code,product.name,product.material,product.description,product.fit].filter(Boolean).join(' ').toLowerCase().includes(term)));
  }

  let selection = [];
  try { const saved=JSON.parse(localStorage.getItem(SELECT_KEY) || '[]');selection=Array.isArray(saved)?saved:[]; } catch { selection = []; }

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
    try {localStorage.setItem(SELECT_KEY, JSON.stringify(selection));}catch {toast('This device could not save your selection.');return false;}
    if (countEl) {
      const activeCount=selection.filter(code=>products && products.some(product=>product.code===code)).length;
      countEl.textContent = String(activeCount);
      countEl.hidden = activeCount === 0;
    }
    document.querySelectorAll('[data-save]').forEach(button => {
      const saved = selection.includes(button.dataset.save);
      button.classList.toggle('is-saved', saved);
      const label = button.querySelector('span');
      if (label) label.textContent = saved ? 'Saved' : 'Save style';
      else button.textContent = saved ? 'Saved' : 'Save style';
    });
    document.querySelectorAll('[data-style-select]').forEach(button => {
      const saved = selection.includes(button.dataset.styleSelect);
      button.textContent = saved ? 'Selected' : 'Select';
      button.classList.toggle('active', saved);
    });
    if(window.dispatchEvent && typeof Event === 'function')window.dispatchEvent(new Event('soho:selection-change'));
    return true;
  }

  function toggleSelection(product) {
    const previous=selection;
    if (selection.includes(product.code)) {
      selection = selection.filter(code => code !== product.code);
      toast('Removed from My Selection');
    } else {
      selection = [...selection, product.code];
      toast('Saved to My Selection');
    }
    if(!saveSelection()){selection=previous;return false;}
    return true;
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

  function card(product, withActions, index = 0) {
    const article = el('article', 'col-card');
    const media = el('a', 'col-card-media');
    media.href = detailUrl(product.code);
    const img = materialImage(listImage(product), product.name, {eager: index < 3, priority: index === 0, fallback: product.image, styleCode: product.code});
    img.className = 'fit-top';
    media.append(img);
    article.append(media);

    const info = el('div', 'col-card-info');
    const title = el('div');
    title.append(el('h3', null, product.name), el('p', 'col-code', product.code));
    if(product.imageKind === 'concept')title.append(el('p','style-concept-label','Digital style concept'));
    const bottom = el('div', 'col-card-bottom');
    bottom.append(swatches(product));

    if (withActions) {
      const actions = el('div', 'col-card-actions');
      const select = el('button', 'link-action', selection.includes(product.code) ? 'Selected' : 'Select');
      select.type = 'button';
      select.dataset.styleSelect = product.code;
      select.classList.toggle('active', selection.includes(product.code));
      select.addEventListener('click', () => {
        toggleSelection(product);
        select.textContent = selection.includes(product.code) ? 'Selected' : 'Select';
        select.classList.toggle('active', selection.includes(product.code));
        renderPanel();
      });
      const vote = el('button', 'link-action', 'Vote');
      vote.type = 'button';
      vote.dataset.styleVote=product.code;
      vote.addEventListener('click', () => toggleVote(product));
      const comment = el('a', 'link-action', 'Comment');
      comment.href = detailUrl(product.code, '#feedback');
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
    const evidence = trendEvidence(product);
    if(evidence)info.append(evidence);
    article.append(info);
    return article;
  }

  function renderPanel() {
    const panel = document.getElementById('selection-panel');
    if (!panel) return;
    panel.innerHTML = '';
    const activeSelection=selection.filter(code=>products.some(product=>product.code===code));
    panel.append(el('p', 'panel-title', `My selection (${activeSelection.length})`));
    if (!activeSelection.length) {
      panel.append(el('p', 'panel-empty', 'Nothing selected yet.'));
      const review = el('a', 'btn-accent panel-review', 'Review selection →');
      review.href = 'my-selection.html';
      panel.append(review);
      return;
    }
    const list = el('div', 'panel-list');
    activeSelection.forEach(code => {
      const product = products.find(p => p.code === code);
      if (!product) return;
      const row = el('div', 'panel-row');
      const img = materialImage(listImage(product, true), product.name, {width: 120, height: 160, fallback: product.listImage || product.image, styleCode: product.code, compact: true});
      const text = el('div');
      text.append(el('strong', null, product.name), el('small', null, product.code));
      const remove = el('button', 'panel-remove', '×');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        selection = selection.filter(item => item !== code);
        saveSelection();
        renderPanel();
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
    const cover = materialImage(collection.coverThumbnail || collection.cover, collection.title, {width: 1200, height: 900, eager: true, priority: true, fallback: collection.cover});
    media.append(cover);
    hero.append(copy, media);
    root.append(hero);

    const weekly = el('section', 'col-section');
    const head = el('div', 'col-section-head');
    head.append(el('h2', null, 'Development highlights'));
    const all = el('a', 'text-link', 'View all styles →');
    all.href = 'collection-series.html?occasion=everyday';
    head.append(all);
    weekly.append(head);
    const grid = el('div', 'weekly-grid');
    const highlights=['outerwear','top','bottom'].map(type=>products.find(product=>product.type===type));
    highlights.filter(Boolean).forEach(item => {
      const card = el('article', 'weekly-card');
      const media = el('a', 'weekly-media');
      media.href = detailUrl(item.code);
      const productImage = products.find(product => normCode(product.code) === normCode(item.code)) || item;
      const img = materialImage(listImage(productImage), item.name, {width: 480, height: 480, fallback: item.image, styleCode: item.code});
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
      const img = materialImage(item.thumbnail || item.image, item.name, {width: 900, height: 350, fallback: item.image});
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
    const trend = trendSelection();
    const occasion = params.get('occasion');
    const themeLabel = occasion ? occasion.charAt(0).toUpperCase() + occasion.slice(1) : null;

    const head = el('div', 'col-page-head');
    const crumb = el('p', 'col-breadcrumb', `COLLECTION / ${collection.title}`);
    head.append(crumb, el('h1', null, collection.title));
    head.append(el('p', 'col-sub', themeLabel ? `${themeLabel} styles selected for store review.` : 'Everyday casual styles selected for store review.'));
    const main = el('div', 'col-main');
    main.append(head);
    if (trend.active) main.append(trendContext(trend));

    const assignedSeasons = uniqueValues(products.map(developmentSeason));
    const requestedSeason = params.get('season') || '';
    const filters = {
      gender: params.get('gender') || '',
      type: params.get('type') || '',
      material: params.get('material') || '',
      colour: params.get('colour') || '',
      retail: params.get('retail') || '',
      occasion: occasion || '',
      season: assignedSeasons.includes(requestedSeason) || requestedSeason === 'unassigned' ? requestedSeason : '',
      q: params.get('q') || ''
    };

    function uniqueValues(list) {
      return [...new Set(list.filter(Boolean))];
    }

    const toolbar = el('div', 'col-toolbar');
    function makeSelect(key, label, options) {
      const select = document.createElement('select');
      select.setAttribute('aria-label', label);
      select.dataset.filter = key;
      options.forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        if (value === filters[key]) option.selected = true;
        select.append(option);
      });
      select.addEventListener('change', () => {
        filters[key] = select.value;
        page = 1;
        paint();
        syncUrl();
      });
      return select;
    }

    const colourOptions = uniqueValues(products.flatMap(product => (product.colours || []).map(colour => colour.name)));
    toolbar.append(
      makeSelect('gender', 'Gender', [['', 'Gender'], ['women', 'Women'], ['men', 'Men']]),
      makeSelect('type', 'Category', [['', 'Category'], ['outerwear', 'Outerwear'], ['top', 'Shirts'], ['bottom', 'Trousers']]),
      makeSelect('material', 'Material', [['', 'Material'], ...uniqueValues(products.map(product => product.material)).map(value => [value, value])]),
      makeSelect('colour', 'Colour', [['', 'Colour'], ...colourOptions.map(value => [value, value])]),
      makeSelect('retail', 'Target retail', [['', 'Target retail'], ['To be confirmed', 'To be confirmed']]),
      makeSelect('occasion', 'Occasion', [['', 'Occasion'], ...data.occasions.map(item => [item.slug, item.name])]),
      makeSelect('season', 'Development season', [['', 'Development season'], ...assignedSeasons.map(value => [value, value]), ...(products.some(product => !developmentSeason(product)) ? [['unassigned', 'Season not assigned']] : [])])
    );
    const clear = el('button', 'filter-clear', 'Clear');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      history.replaceState(null, '', trend.active ? seriesUrl({keepFilters: false}) : location.pathname);
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

    const PAGE_SIZE = 9;
    let page = Math.max(1, Number(params.get('page')) || 1);

    function syncUrl() {
      const next = new URLSearchParams();
      if (trend.active) {
        next.set('trend', trend.id);
        if (params.has('direction')) next.set('direction', trend.direction);
      }
      Object.entries(filters).forEach(([key, value]) => { if (value) next.set(key, value); });
      if (page > 1) next.set('page', String(page));
      const query = next.toString();
      history.replaceState(null, '', location.pathname + (query ? '?' + query : ''));
    }

    function renderPager(pages) {
      let pager = document.getElementById('col-pager');
      if (!pager) {
        pager = el('nav', 'col-pager');
        pager.id = 'col-pager';
        grid.after(pager);
      }
      pager.innerHTML = '';
      if (pages <= 1) return;
      const prev = el('button', 'pager-step', '← Previous');
      prev.type = 'button';
      prev.disabled = page === 1;
      prev.addEventListener('click', () => { page -= 1; paint(); syncUrl(); });
      pager.append(prev);
      for (let i = 1; i <= pages; i += 1) {
        const button = el('button', 'pager-page', String(i));
        button.type = 'button';
        if (i === page) button.classList.add('active');
        button.addEventListener('click', () => { page = i; paint(); syncUrl(); });
        pager.append(button);
      }
      const next = el('button', 'pager-step', 'Next →');
      next.type = 'button';
      next.disabled = page === pages;
      next.addEventListener('click', () => { page += 1; paint(); syncUrl(); });
      pager.append(next);
    }

    function paint() {
      const filtered = sortTrendStyles(products.filter(product => (!trend.active || trend.ids.has(product.code)) && matchesStyleFilters(product, filters)), trend);
      const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (page > pages) page = pages;
      // Link destinations must carry the current filters, including immediately after a change.
      syncUrl();
      const clearTrend = main.querySelector('[data-clear-trend]');
      if (clearTrend) clearTrend.href = seriesUrl({clearTrend: true, resetPage: true});
      grid.innerHTML = '';
      filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).forEach((product, index) => grid.append(card(product, true, index)));
      if (!filtered.length) grid.append(el('p', 'empty-note', trend.active ? trend.error ? 'No styles are shown while this trend selection is unavailable.' : trend.ids.size ? 'No linked styles match these filters.' : 'No styles are currently linked to this research direction.' : 'No styles match these filters.'));
      renderPager(pages);
      renderPanel();
      saveSelection();
      paintVotes();
    }

    paint();
    syncUrl();
  }

  function renderDetail() {
    const root = document.getElementById('collection-view');
    const params = new URLSearchParams(location.search);
    const trend = trendSelection();
    const code = params.get('code') || '';
    const requestedProduct = products.find(item => item.code === code);
    const product = requestedProduct;
    root.innerHTML = '';
    if(!product){root.append(el('h1',null,'Style unavailable'),el('p','empty-note','This style is not part of the current development selection.'));const back=el('a','text-link','Browse the development selection →');back.href=seriesUrl();root.append(back);return;}

    const crumb = el('div', 'breadcrumb');
    const back = el('a', null, trend.active ? 'BACK TO TREND SELECTION' : 'COLLECTION');
    back.href = seriesUrl();
    crumb.append(back, document.createTextNode(` / ${trend.active && !requestedProduct ? 'Style unavailable' : product.name}`));
    root.append(crumb);
    if (trend.active) {
      if (!trend.error && (!requestedProduct || !trend.ids.has(product.code))) trend.error = 'This style is not linked to the selected research direction. Return to the trend selection to explore the linked styles.';
      root.append(trendContext(trend,product));
      if (trend.error) {
        root.append(el('p', 'empty-note', 'This style is unavailable in the current trend selection.'));
        saveSelection();
        return;
      }
    }

    const layout = el('div', 'detail-layout');
    const thumbs = el('div', 'detail-thumbs');
    const main = el('div', 'detail-main');
    const views = Array.isArray(product.views) ? product.views : [];
    let mainImg = null;
    if (views.length) {
      mainImg = materialImage(views[0], product.name, {width: 600, height: 900, eager: true, priority: true});
      main.append(mainImg);
      views.forEach((src, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = index === 0 ? 'active' : '';
        const thumbnail = (product.viewThumbnails || [])[index] || (index === 0 ? listImage(product, true) : src);
        const label = product.viewLabels && product.viewLabels[index] ? product.viewLabels[index] : `${product.name} view ${index + 1}`;
        const img = materialImage(thumbnail, label, {width: 120, height: 180, fallback: src});
        button.append(img);
        button.addEventListener('click', () => {
          mainImg.src = imageSource(src);
          thumbs.querySelectorAll('button').forEach(item => item.classList.remove('active'));
          button.classList.add('active');
        });
        thumbs.append(button);
      });
    } else {
      main.append(el('div', 'detail-placeholder', 'Image coming soon'));
    }

    const side = el('div', 'detail-side');
    side.append(el('p', 'eyebrow', `STYLE ${product.code}`));
    side.append(el('h1', null, product.name));
    if(product.imageKind === 'concept')side.append(el('p','style-concept-label','Digital style concept · subject to physical development. A shape reference, not an existing physical sample.'));
    else if(/^AE-/.test(product.code))side.append(el('p','style-concept-label','Legacy reference — source and physical sample not verified.'));
    side.append(el('p','material-note','Sample availability is unconfirmed. Material properties require physical-sample review.'));
    if (product.subtitle) side.append(el('p', 'detail-subtitle', product.subtitle));

    const factIcons = {
      fit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l3 2 3-2 4 3-2 4v9H7v-9L5 7z"/></svg>',
      texture: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8c3-2 6 2 9 0s6 2 9 0M3 13c3-2 6 2 9 0s6 2 9 0M3 18c3-2 6 2 9 0s6 2 9 0"/></svg>',
      weight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/></svg>'
    };
    const facts = el('div', 'detail-facts');
    [[product.fit, factIcons.fit], [product.texture, factIcons.texture], [product.weight, factIcons.weight]].filter(([fact]) => fact).forEach(([fact, icon]) => {
      const item = el('span', 'detail-fact');
      item.innerHTML = icon;
      item.append(document.createTextNode(fact));
      facts.append(item);
    });
    side.append(facts);

    const firstColour = (product.colours || [])[0];
    side.append(el('p', 'detail-label', `Colour: ${firstColour ? firstColour.name : 'To be confirmed'}`));
    const colourRow = el('div', 'detail-colours');
    (product.colours || []).forEach((colour, index) => {
      const item = el('span', 'detail-colour');
      const dot = el('span', 'detail-colour-dot');
      dot.style.background = colour.hex;
      if (index === 0) dot.classList.add('active');
      item.append(dot, el('span', 'detail-colour-name', colour.name));
      colourRow.append(item);
    });
    side.append(colourRow);

    side.append(el('p', 'detail-label', 'Material options'));
    const MATERIAL_KEY = 'soho-material-choice';
    let chosenMaterial = -1;
    try {
      const storedChoice = JSON.parse(localStorage.getItem(MATERIAL_KEY) || 'null'), map=JSON.parse(localStorage.getItem('soho-material-choices') || '{}');
      const savedName=map && map[product.code] || (storedChoice && storedChoice.code===product.code ? storedChoice.material : '');
      if (savedName) {
        const found = product.materials.findIndex(material => material.name === savedName);
        if (found >= 0) chosenMaterial = found;
      }
    } catch (error) { chosenMaterial = -1; }

    function selectMaterial(index) {
      const material = product.materials[index];
      try { const map = JSON.parse(localStorage.getItem('soho-material-choices') || '{}'); map[product.code] = material.name; localStorage.setItem('soho-material-choices', JSON.stringify(map));localStorage.setItem(MATERIAL_KEY, JSON.stringify({ code: product.code, material: material.name })); } catch (error) {toast('This device could not save the material choice.');return false;}
      chosenMaterial = index;
      document.querySelectorAll('.material-row').forEach((row, rowIndex) => {
        row.classList.toggle('selected', rowIndex === index);
        const radio = row.querySelector('input[type="radio"]');
        if (radio) radio.checked = rowIndex === index;
      });
      document.querySelectorAll('.materials-choose button').forEach((button, buttonIndex) => {
        button.classList.toggle('btn-accent', buttonIndex === index);
        button.classList.toggle('btn-outline', buttonIndex !== index);
        button.textContent = buttonIndex === index ? 'Selected material' : 'Choose material';
      });
      return true;
    }

    const materialList = el('div', 'material-list');
    product.materials.forEach((material, index) => {
      const row = el('label', 'material-row' + (index === chosenMaterial ? ' selected' : ''));
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'detail-material';
      radio.value = String(index);
      radio.checked = index === chosenMaterial;
      const dot = el('span', 'material-radio');
      const name = el('span', 'material-name', material.name);
      const link = el('a', 'text-link', index === 0 ? 'View details →' : 'Compare option →');
      link.href = '#materials';
      link.addEventListener('click', event => event.stopPropagation());
      row.append(radio, dot, name, link);
      row.addEventListener('click', () => selectMaterial(index));
      materialList.append(row);
    });
    side.append(materialList);

    if (!product.code.startsWith('RF27-')) { side.append(el('p', 'detail-label', 'Target retail')); side.append(el('p', 'detail-value', product.retail)); }

    const actions = el('div', 'detail-cta');
    const add = el('button', 'btn-accent', selection.includes(product.code) ? 'In My Selection' : 'Add to selection →');
    add.type = 'button';
    add.addEventListener('click', () => {
      if(!toggleSelection(product))return;
      const material = product.materials[chosenMaterial];
      if(material)try {localStorage.setItem(MATERIAL_KEY, JSON.stringify({ code: product.code, material: material.name }));const map = JSON.parse(localStorage.getItem('soho-material-choices') || '{}'); map[product.code] = material.name; localStorage.setItem('soho-material-choices', JSON.stringify(map)); } catch (error) {toast('Material choice could not be saved on this device.');}
      add.textContent = selection.includes(product.code) ? 'In My Selection' : 'Add to selection →';
      toast(selection.includes(product.code)
        ? `${product.code} added to My Selection${material ? ' · '+material.name : ' · material not selected'}`
        : `${product.code} removed from My Selection`);
    });
    const sample = el('button', 'btn-outline', 'Discuss a sample');
    sample.type = 'button';
    sample.addEventListener('click', () => {const box=document.getElementById('sample-interest');if(box)box.checked=true;const feedback=document.getElementById('feedback');if(feedback)feedback.scrollIntoView({behavior:'smooth',block:'start'});toast('Add your sample needs below. Availability requires confirmation.');});
    actions.append(add, sample);
    side.append(actions);

    const meta = el('div', 'detail-meta-actions');
    const vote = el('button', 'link-action');
    vote.type = 'button';
    vote.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20z"/></svg><span>Vote</span>';
    vote.dataset.styleVote=product.code;
    vote.addEventListener('click', () => toggleVote(product));
    const comment = el('a', 'link-action');
    comment.href = '#feedback';
    comment.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H9l-5 4z"/></svg><span>Comment</span>';
    meta.append(vote, el('span', 'sep', '|'), comment);
    side.append(meta);

    side.append(el('p', 'detail-label', 'Why this style'));
    side.append(el('p', 'detail-why', product.why));
    layout.append(thumbs, main, side);
    root.append(layout);

    const tabs = el('div', 'detail-tabs');
    ['Style details', 'Materials', 'Development feedback'].forEach((label, index) => {
      const anchor = el('a', index === 0 ? 'active' : '', label);
      anchor.href = index === 1 ? '#materials' : index === 2 ? '#feedback' : '#style';
      tabs.append(anchor);
    });
    root.append(tabs);

    const styleSection = el('section', 'style-section');
    styleSection.id = 'style';
    const styleCopy = el('div', 'style-copy');
    styleCopy.append(el('h2', null, 'Style details'));
    styleCopy.append(el('p', 'detail-why', product.description || ''));
    if (product.trendReference) styleCopy.append(el('p', 'detail-why', `Trend direction: ${product.trendReference.title} · ${product.trendReference.report} report, page ${product.trendReference.page}. ${product.trendReference.reasonEN}`));


    const similarBlock = el('div', 'style-similar');
    similarBlock.append(el('h2', null, 'Similar styles'));
    const similarGrid = el('div', 'similar-grid');
    const similarPool = products.filter(item => !trend.active || trend.ids.has(item.code));
    const similar = similarPool
      .filter(item => item.code !== product.code && item.type === product.type && item.gender === product.gender)
      .slice(0, 3);
    const fallback = similarPool
      .filter(item => item.code !== product.code && !similar.includes(item) && item.type === product.type)
      .slice(0, 3 - similar.length);
    similar.concat(fallback).forEach(item => {
      const card = el('a', 'similar-card');
      card.href = detailUrl(item.code);
      const image = materialImage(listImage(item), item.name, {width: 480, height: 600, fallback: item.image, styleCode: item.code});
      card.append(image, el('strong', null, item.name), el('span', null, item.code));
      similarGrid.append(card);
    });
    similarBlock.append(similarGrid);
    styleSection.append(styleCopy, similarBlock);
    root.append(styleSection);
    root.append(renderRelatedResearch(product));

    const materialSection = el('section', 'materials-section');
    materialSection.id = 'materials';
    materialSection.append(el('h2', null, `Materials for ${product.name}`));
    if (trend.active && !trend.error && trendConnections?.reports?.[trend.id]?.materialTerms?.length) {
      const localMaterials=el('a','material-library-link','Explore local material references for this direction ↗');
      localMaterials.href='products.html?trend='+encodeURIComponent(trend.id);
      materialSection.append(localMaterials,el('p','material-note','These references relate to the research direction. Review their construction and suitability separately from the proposed garment options below.'));
    }
    const table = el('div', 'materials-table');
    table.style.setProperty('--material-count', product.materials.length);
    const header = el('div', 'materials-row materials-head');
    header.append(el('span', null, ''));
    product.materials.forEach((material, index) => {
      header.append(el('span', null, `Option ${String.fromCharCode(65 + index)} · ${material.name}`));
    });
    table.append(header);
    [['Hand feel', 'hand'], ['Construction', 'structure'], ['Composition', 'composition'], ['Care', 'care'], ['Development status', 'status']].forEach(([label, key]) => {
      const row = el('div', 'materials-row');
      row.append(el('span', 'materials-label', label));
      product.materials.forEach((material, index) => {
        const cell = el('span', null, material[key]);
        if (index === chosenMaterial) cell.classList.add('selected');
        row.append(cell);
      });
      table.append(row);
    });
    if (product.code.startsWith('RF27-')) {
      materialSection.append(el('p', 'material-note', 'One recorded garment fabric and two development directions. Colour blocks indicate screen colour only; they are not fabric photographs or evidence of texture. Proposed fabrics require sourcing, physical sampling and approval.'));
      const concepts = el('div', 'fabric-concepts');
      product.materials.forEach((material, index) => {
        const concept = el('article', 'fabric-concept');
        const preview = el('div', 'fabric-colour-reference','Screen colour direction only');preview.style.backgroundColor=material.previewColour || (product.colours[0] || {}).hex || '#ddd';
        concept.append(preview, el('p', 'fabric-option', `OPTION ${String.fromCharCode(65 + index)} · ${material.status}`), el('h3', null, material.name));
        concept.append(el('p', 'fabric-trend', `${material.trendBasis.title} · Page ${material.trendBasis.page}`), el('p', 'fabric-reason', material.trendBasis.reason));
        const choose = el('button', 'btn-outline', 'Choose this direction'); choose.type = 'button'; choose.addEventListener('click', () => { if(selectMaterial(index))toast(`${material.name} saved on this device only. Not sent.`); }); concept.append(choose); concepts.append(concept);
      }); materialSection.append(concepts);
    }
    const chooseRow = el('div', 'materials-row materials-choose');
    chooseRow.append(el('span', null, ''));
    product.materials.forEach((material, index) => {
      const button = el('button', index === chosenMaterial ? 'btn-accent' : 'btn-outline', index === chosenMaterial ? 'Selected material' : 'Choose material');
      button.type = 'button';
      button.addEventListener('click', () => {
        if(selectMaterial(index))toast(`${material.name} saved on this device only. Not sent.`);
      });
      chooseRow.append(button);
    });
    table.append(chooseRow);
    materialSection.append(table);
    root.append(materialSection);

    const feedback = el('section', 'feedback-section');
    feedback.id = 'feedback';
    feedback.append(el('h2', null, 'Development feedback'));
    feedback.append(el('p', 'detail-why', 'Save notes on this device, download a copy or open an email draft. Nothing is sent automatically. Samples and proposed fabrics require confirmation.'));
    const form = el('form', 'feedback-form');
    const checks = el('div', 'feedback-checks');
    ['Good fit for our customers', 'Review the price', 'Prefer another material', 'Adjust fit or colour', 'Discuss a sample'].forEach(text => {
      const label = el('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value=text;
      if(text==='Discuss a sample')input.id='sample-interest';
      label.append(input, document.createTextNode(text));
      checks.append(label);
    });
    form.append(checks);
    const range = document.createElement('input');
    range.type = 'text';
    range.placeholder = 'Target retail range (e.g. 59.99 – 79.99)';
    const commentBox = document.createElement('textarea');
    commentBox.placeholder = 'Comments';

    const fileLabel = el('label', 'attach-label');
    fileLabel.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Attach images or files</span>';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
    fileInput.hidden = true;
    fileLabel.append(fileInput);
    const fileList = el('div', 'feedback-files');
    fileInput.addEventListener('change', () => {
      fileList.innerHTML = '';
      Array.from(fileInput.files || []).forEach(file => {
        fileList.append(el('span', null, `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`));
      });
    });

    const submit = el('button', 'btn-accent', 'Save note on this device');
    submit.type = 'submit';
    form.append(fileLabel, fileList, range, commentBox, submit);
    const feedbackText=()=>{const preferences=Array.from(checks.querySelectorAll('input')).filter(input=>input.checked).map(input=>input.value);return [`Style: ${product.code} · ${product.name}`,product.imageKind==='concept'?'Digital style concept · subject to physical development.':'Style reference',`Material: ${product.materials[chosenMaterial]?.name || 'Not selected'}`,`Development season: ${developmentSeason(product) || 'Not assigned'}`,`Interests: ${preferences.join('; ') || 'Not specified'}`,`Target retail: ${range.value || 'Not specified'}`,commentBox.value,`Reference: ${location.href}`,'Please confirm sample and material availability.'].join('\n\n');};
    const email=el('button','btn-outline','Open email draft');email.type='button';
    email.addEventListener('click',()=>{location.href='mailto:online@saintycorp.com?subject='+encodeURIComponent('Development feedback · '+product.code)+'&body='+encodeURIComponent(feedbackText());});
    const download=el('button','btn-outline','Download feedback note');download.type='button';download.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([feedbackText()],{type:'text/plain;charset=utf-8'})),link=el('a');link.href=url;link.download=product.code+'-development-feedback.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Feedback note downloaded. Not sent.');});
    form.append(download,email,el('p','material-note','Email opens in your mail app. Attach files there; the website does not send them. Local notes are not orders or submissions to our team.'));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const files = Array.from(fileInput.files || []);
      const stored = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        let id = null;
        if (window.DemoStore && DemoStore.putBlob) {
          id = `feedback-${product.code}-${Date.now()}-${index}`;
          try { await DemoStore.putBlob(id, file); } catch (error) { id = null; }
        }
        stored.push({ name: file.name, size: file.size, type: file.type, id });
      }
      const record = {
        code: product.code,
        at: new Date().toISOString(),
        range: range.value,
        comment: commentBox.value,
        preferences:Array.from(checks.querySelectorAll('input')).filter(input=>input.checked).map(input=>input.value),
        material:product.materials[chosenMaterial]?.name || '',
        trend:trend.active?{report:trend.id,direction:trend.direction}:null,
        attachments: stored
      };
      try {
        const list = JSON.parse(localStorage.getItem('soho-feedback-submissions') || '[]');
        list.push(record);
        localStorage.setItem('soho-feedback-submissions', JSON.stringify(list));
      } catch (error) {toast('This device could not save the note. Copy it or use the email draft.');return;}
      form.reset();
      fileList.innerHTML = '';
      if (stored.length) {
        const receipt = el('div', 'feedback-files');
        stored.forEach(item => {
          if (!item.id || !window.DemoStore || !DemoStore.getBlob) return;
          DemoStore.getBlob(item.id).then(blob => {
            if (!blob) return;
            const link = el('a', null, `Download ${item.name}`);
            link.href = URL.createObjectURL(blob);
            link.download = item.name;
            receipt.append(link);
          }).catch(() => {});
        });
        feedback.append(el('p', 'detail-label', 'Attachments saved on this device'), receipt);
      }
      toast(stored.some(item=>!item.id)?'Note saved locally; some attachments could not be stored. Attach them in your email app.':'Note saved on this device only. Not sent.');
    });
    feedback.append(form);
    root.append(feedback);

    saveSelection();
    paintVotes();
  }

  const normCode = code => String(code || '').replace(/^AE-0?/, 'AE-');

  async function applyOverrides() {
    if (!window.DemoStore) return false;
    let changed = false;
    try {
      const state = await DemoStore.state();
      const overrides = state.overrides || {};
      const preview = new URLSearchParams(location.search).has('preview');
      const useContent = preview || (state.contentStatus || 'published') === 'published';
      if (useContent && overrides.hero) {
        if (overrides.hero.titleLines && overrides.hero.titleLines.length) { collection.titleLines = overrides.hero.titleLines; changed = true; }
        if (overrides.hero.intro) { collection.intro = overrides.hero.intro; changed = true; }
        if (overrides.hero.ctaLabel) { collection.ctaLabel = overrides.hero.ctaLabel; changed = true; }
        if (overrides.hero.imageId) {
          const blob = await DemoStore.getBlob(overrides.hero.imageId);
          if (blob) { collection.cover = URL.createObjectURL(blob); collection.coverThumbnail = collection.cover; changed = true; }
        }
      }
      if (useContent && overrides.productImages) {
        for (const [code, id] of Object.entries(overrides.productImages)) {
          const product = products.find(item => normCode(item.code) === normCode(code));
          if (!product) continue;
          const blob = await DemoStore.getBlob(id);
          if (blob) { product.image = URL.createObjectURL(blob); product.thumbnail = product.image; changed = true; }
        }
      }
    } catch (error) {
      console.warn('Demo overrides unavailable', error);
    }
    return changed;
  }

  let data;
  let collection;
  let products;

  fetch(DATA_URL)
    .then(response => response.json())
    .then(async payload => {
      data = payload;
      collection = payload.collection;
      products = payload.products.filter(inDevelopmentScope);
      await loadTrendConnections();
      const preview = new URLSearchParams(location.search).has('preview');
      if (preview) await applyOverrides();
      if (view === 'landing') renderLanding();
      if (view === 'series') {
        renderSeries();
        window.addEventListener('popstate', async () => { await loadTrendConnections(); renderSeries(); });
      }
      if (view === 'detail') renderDetail();
      saveSelection();
      if (!preview) applyOverrides().then(changed => {
        if (!changed) return;
        if (view === 'landing') renderLanding();
        else refreshOverrideImages();
      });
    })
    .catch(error => {
      const root = document.getElementById('collection-view');
      if (root) root.innerHTML = `<p class="empty-note">Could not load collection data: ${escape(error.message)}</p>`;
    });
})();


