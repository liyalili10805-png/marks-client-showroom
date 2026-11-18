(() => {
  'use strict';

  const body = document.body;
  const hub = document.getElementById('research-library-app');
  const dossier = document.getElementById('research-dossier-app');
  const app = body.dataset.page === 'dossier' ? dossier : hub;
  if (!app) return;

  const dataUrl = body.dataset.researchData || 'data/research-library.json';
  const detailPage = body.dataset.reportPage || 'trend-story.html';
  const libraryPage = body.dataset.libraryPage || 'trend.html';
  const connectionsUrl = body.dataset.trendConnections || 'data/trend-connections.json?v=20261117match2';
  const categories = ['All research', 'Outerwear', 'Shirts', 'Trousers', 'Materials', 'Print & Pattern', 'Construction & Finish'];
  const state = { category: 'All research', gender: 'all', query: '' };
  let data, reports, byId, featuredIds = [], activeObserver, connections = {};
  const reportCache = new WeakMap();
  const cardCache = new Map();
  const pendingImages = new WeakMap();
  let imageObserver;

  const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const array = value => Array.isArray(value) ? value : value == null ? [] : [value];
  const strings = value => array(value).map(text).filter(Boolean);
  const unique = values => [...new Set(values.filter(Boolean))];
  const clean = value => text(value).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = text(value);
    return element;
  }
  function safeUrl(value, externalOnly = false) {
    if (!text(value)) return '';
    try {
      const url = new URL(value, location.href);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      if (externalOnly && !/^https?:\/\//i.test(value)) return '';
      return url.href;
    } catch { return ''; }
  }
  function link(href, className, label, external = false) {
    const element = node('a', className, label);
    const safe = safeUrl(href);
    if (safe) element.href = safe;
    if (external && safe) { element.target = '_blank'; element.rel = 'noopener noreferrer'; }
    return element;
  }
  function reportUrl(id) { return `${detailPage}?report=${encodeURIComponent(id)}`; }
  function connectionTerms(report, kind) {
    const record = connections[report.id];
    return array(record && record[kind === 'style' ? 'styleTerms' : 'materialTerms']).filter(term => term && text(term.key) && text(term.label) && strings(term.ids).length);
  }
  function connectionUrl(report, kind, term) {
    const params = new URLSearchParams({trend: report.id});
    if (term) params.set('direction', term.key);
    return `${kind === 'style' ? 'collection-series.html' : 'products.html'}?${params}`;
  }
  function connectionCount(terms) { return unique(terms.flatMap(term => strings(term.ids))).length; }
  const connectionTiers = [['direct','Direct matches'],['alternative','Development alternatives'],['concept','Studio concepts']];
  function connectionTier(term) { return connectionTiers.some(([key]) => term.tier === key) ? term.tier : 'alternative'; }
  function connectionReason(term) { return text(term.rationale) || 'A development reference to review against the intended garment and material brief.'; }
  function connectionSummary(report) {
    const styleTerms = connectionTerms(report, 'style'), materialTerms = connectionTerms(report, 'material');
    if (!styleTerms.length && !materialTerms.length) return null;
    const nav = node('nav', 'rl-direction-summary'); nav.setAttribute('aria-label', 'Explore this direction');
    nav.append(node('span', 'rl-connection-kicker', 'Explore this direction'));
    [['style', styleTerms, 'local style references'], ['material', materialTerms, 'local materials & patterns']].forEach(([kind, terms, label]) => {
      if (terms.length) nav.append(link(connectionUrl(report, kind), 'rl-direction-all', `${connectionCount(terms)} ${label} ↗`));
    });
    nav.append(node('span','rl-connection-note','Direct matches, alternatives and concepts are identified below.'));
    return nav;
  }
  function connectionBlock(report, kind) {
    const terms = connectionTerms(report, kind); if (!terms.length) return null;
    const nav = node('nav', 'rl-direction-keywords');
    const heading = kind === 'style' ? 'Explore related styles' : 'Explore materials & patterns';
    nav.setAttribute('aria-label', heading); nav.append(node('p', 'rl-connection-kicker', heading));
    connectionTiers.forEach(([tier,label]) => {
      const selected=terms.filter(term=>connectionTier(term)===tier);if(!selected.length)return;
      const group=node('section','rl-connection-group');group.dataset.tier=tier;
      group.append(node('h4','rl-connection-tier',label));
      const links=node('div','rl-connection-links');
      selected.forEach(term=>{
        const entry=node('div','rl-connection-entry'),anchor=link(connectionUrl(report,kind,term),'rl-connection-term'),count=unique(strings(term.ids)).length;
        anchor.dataset.tier=tier;
        anchor.append(node('span','',term.label),node('span','rl-connection-count',count));
        anchor.setAttribute('aria-label',`${term.label}: ${count} local ${kind==='style'?'style':'material'} ${count===1?'reference':'references'} · ${label}`);
        entry.append(anchor,node('p','rl-connection-rationale',connectionReason(term)));links.append(entry);
      });
      group.append(links);nav.append(group);
    });
    return nav;
  }
  function appendConnectedText(container, value, report, kind) {
    const source = text(value), lower = source.toLowerCase();
    const hits = connectionTerms(report, kind).filter(term=>connectionTier(term)==='direct').flatMap(term => {
      const position = lower.indexOf(term.label.toLowerCase());
      return position < 0 ? [] : [{term, position, end: position + term.label.length}];
    }).sort((a, b) => a.position - b.position || b.end - a.end);
    let cursor = 0;
    hits.forEach(hit => {
      if (hit.position < cursor) return;
      container.append(document.createTextNode(source.slice(cursor, hit.position)), link(connectionUrl(report, kind, hit.term), 'rl-inline-direction', source.slice(hit.position, hit.end)));
      cursor = hit.end;
    });
    container.append(document.createTextNode(source.slice(cursor)));
  }
  function materialTermFor(report, name) {
    const normalised = ` ${clean(name)} `;
    return connectionTerms(report, 'material').filter(term => connectionTier(term)==='direct' && (normalised.includes(` ${clean(term.key)} `) || normalised.includes(` ${clean(term.label)} `))).sort((a, b) => clean(b.key).length - clean(a.key).length)[0];
  }
  function titleCase(value) { return text(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); }
  function categoryOf(report) {
    const raw = clean(report.category);
    const kind = clean(report.kind);
    if (/construction|finish|process/.test(raw)) return 'Construction & Finish';
    if (/print|pattern/.test(raw)) return 'Print & Pattern';
    if (/material|textile|fabric/.test(raw)) return 'Materials';
    if (/outerwear|outwear|shacket|jacket|coat/.test(raw)) return 'Outerwear';
    if (/shirt|blouse|woven top/.test(raw)) return 'Shirts';
    if (/trouser|pant|chino|cargo/.test(raw)) return 'Trousers';
    if (/construction|finish|process/.test(kind)) return 'Construction & Finish';
    if (/print|pattern/.test(kind)) return 'Print & Pattern';
    if (/material|textile|fabric/.test(kind)) return 'Materials';
    return text(report.category) || 'Research';
  }
  function typeOf(report) {
    const category = categoryOf(report);
    if (category === 'Materials') return 'material';
    if (category === 'Print & Pattern') return 'pattern';
    if (category === 'Construction & Finish') return 'process';
    const kind = clean(report.kind);
    if (/material|textile|fabric/.test(kind)) return 'material';
    if (/print|pattern/.test(kind)) return 'pattern';
    if (/construction|finish|process/.test(kind)) return 'process';
    return 'item';
  }
  function matchesCategory(report, value) {
    if (value === 'All research') return true;
    if (value === 'Materials') return typeOf(report) === 'material';
    if (value === 'Print & Pattern') return typeOf(report) === 'pattern';
    if (value === 'Construction & Finish') return typeOf(report) === 'process';
    return categoryOf(report) === value;
  }
  function genderText(report) { return strings(report.gender).join(' · '); }
  function matchesGender(report, value) {
    if (value === 'all') return true;
    const raw = clean(genderText(report));
    if (!raw || /\b(unisex|both|all)\b/.test(raw)) return true;
    return value === 'women' ? /\b(women|womens|woman|female)\b/.test(raw) : /\b(men|mens|man|male)\b/.test(raw);
  }
  function searchText(report) {
    const cached = reportCache.get(report);
    if (cached && cached.search != null) return cached.search;
    const value = [report.title, report.category, report.kind, genderText(report), report.summary, report.whatChanges,
      ...strings(report.elements), ...strings(report.patterns), ...strings(report.processes),
      ...array(report.materials).flatMap(material => [material && material.name, material && material.question])]
      .map(text).join(' ').toLowerCase();
    const memo = cached || {}; memo.search = value; reportCache.set(report, memo);
    return value;
  }
  function isBoard(visual) { return /board|collage|swatch|print design|textile direction/i.test([visual.role, visual.alt].map(text).join(' ')); }
  function isSilhouette(visual) { return /silhouette|full.length|lookbook|full.body/i.test(text(visual.role)); }
  function visualIds(report) {
    const cached = reportCache.get(report);
    if (cached && cached.visualIds) return cached.visualIds;
    const ids = unique(strings(report.visualIds)).filter(id => data.visuals[id] && safeUrl(data.visuals[id].src));
    const memo = cached || {}; memo.visualIds = ids; reportCache.set(report, memo);
    return ids;
  }
  function coverId(report) {
    const ids = visualIds(report);
    return ids[0];
  }
  function image(visual, eager = false, layout = 'figure') {
    const img = node('img');
    img.alt = text(visual.alt) || text(visual.caption);
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.fetchPriority = eager ? 'high' : 'auto';
    const width = Number(visual.width), height = Number(visual.height);
    if (width > 0 && height > 0) { img.width = width; img.height = height; }
    const srcset = (layout === 'figure' ? '' : text(visual.srcset)).split(',').map(value => {
      const [src, descriptor] = value.trim().split(/\s+/);
      return safeUrl(src) && /^\d+w$/.test(descriptor) ? `${safeUrl(src)} ${descriptor}` : '';
    }).filter(Boolean).join(', ');
    const sizes = layout === 'feature'
      ? '(max-width: 800px) 100vw, (min-width: 1000px) 65vw, 33vw'
      : layout === 'card'
        ? '(max-width: 560px) 100vw, (max-width: 800px) 50vw, (min-width: 1450px) 25vw, 33vw'
        : '(max-width: 800px) 100vw, (min-width: 1450px) 1100px, 85vw';
    const loadImage = () => {
      if (srcset) { img.sizes = sizes; img.srcset = srcset; }
      img.src = safeUrl((layout === 'card' ? visual.thumbnail : '') || visual.src);
    };
    // A small observer margin avoids native lazy loading several screens of large cards.
    // Dimensions (or the card's CSS ratio) reserve layout before a source is assigned.
    if (!eager && (layout !== 'figure' || (width > 0 && height > 0)) && 'IntersectionObserver' in window) {
      if (!imageObserver) imageObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const start = pendingImages.get(entry.target);
          if (start) { pendingImages.delete(entry.target); start(); }
          imageObserver.unobserve(entry.target);
        });
      }, { rootMargin: '300px 0px' });
      pendingImages.set(img, loadImage); imageObserver.observe(img);
    } else loadImage();
    return img;
  }
  function source(id) { return id && data.sources[id] || null; }
  function sourceLink(id, label) {
    const item = source(id);
    if (!item || !safeUrl(item.url, true)) return null;
    return link(item.url, '', label || item.title || item.publisher, true);
  }
  function card(report, feature = false, eager = false) {
    const cacheKey = `${report.id}:${feature ? 'feature' : 'card'}`;
    if (cardCache.has(cacheKey)) return cardCache.get(cacheKey);
    const article = node('article', 'rl-card');
    article.dataset.reportId = report.id;
    const id = coverId(report), visual = id && data.visuals[id];
    if (visual) {
      const media = link(reportUrl(report.id), 'rl-card-media' + (isBoard(visual) ? ' is-board' : isSilhouette(visual) ? ' is-silhouette' : ''), null);
      media.setAttribute('aria-label', `Read ${report.title}`);
      const img = image(visual, eager, feature ? 'feature' : 'card');
      img.addEventListener('error', () => { media.remove(); article.classList.add('is-text-only'); }, { once: true });
      media.append(img); article.append(media);
    } else article.classList.add('is-text-only');
    const meta = node('div', 'rl-card-meta');
    meta.append(node('span', '', categoryOf(report)), node('span', '', genderText(report) || text(report.kind)));
    const heading = node('h3');
    const headingLink = link(reportUrl(report.id), 'rl-card-title', null);
    headingLink.append(node('b', '', report.title), node('span', '', '↗'));
    heading.append(headingLink); article.append(meta, heading);
    if (report.summary) article.append(node('p', 'rl-card-summary', report.cardSummary || report.summary));
    if (visual && (visual.season || visual.role)) article.append(node('p', 'rl-card-visual-note', [visual.season, visual.role].map(text).filter(Boolean).join(' · ')));
    cardCache.set(cacheKey, article);
    return article;
  }
  function figure(id, eager = false) {
    const visual = data.visuals[id];
    if (!visual || !safeUrl(visual.src)) return null;
    const fig = node('figure', 'rl-figure');
    const img = image(visual, eager); img.className = 'rl-figure-image';
    img.addEventListener('error', () => fig.remove(), { once: true });
    const caption = node('figcaption', '', visual.caption || visual.alt);
    const detail = [visual.season, visual.role].map(text).filter(Boolean).join(' · ');
    if (detail) caption.append(node('small', '', detail));
    if (visual.credit) caption.append(node('small', '', visual.credit));
    if (safeUrl(visual.sourceUrl, true)) { const credit = node('small'); credit.append(link(visual.sourceUrl, '', 'View original source ↗', true)); caption.append(credit); }
    fig.append(img, caption); return fig;
  }
  function gallery(ids) {
    const usable = unique(ids).filter(id => data.visuals[id] && safeUrl(data.visuals[id].src));
    if (!usable.length) return null;
    const container = node('div', 'rl-gallery' + (usable.length === 1 ? ' is-single' : ''));
    usable.forEach(id => { const fig = figure(id); if (fig) container.append(fig); });
    return container;
  }
  function metricCard(metric) {
    const article = node('article', 'rl-metric');
    const meta = node('div', 'rl-metric-context');
    if (metric.contextClass) meta.append(node('span', '', titleCase(metric.contextClass)));
    if (metric.market) meta.append(node('span', '', metric.market));
    article.append(meta);
    if (metric.valueDisplay) article.append(node('strong', 'rl-metric-value', metric.valueDisplay));
    article.append(node('h3', '', metric.label));
    if (metric.period) article.append(node('p', 'rl-metric-period', metric.period));
    if (metric.method || metric.limitation) {
      const notes = node('details'); notes.append(node('summary', '', 'Measure & context'));
      if (metric.method) notes.append(node('p', '', metric.method));
      if (metric.limitation) notes.append(node('p', '', metric.limitation));
      const original = sourceLink(metric.sourceId, 'Source report ↗'); if (original) notes.append(original);
      article.append(notes);
    } else {
      const original = sourceLink(metric.sourceId, 'Source report ↗'); if (original) article.append(original);
    }
    return article;
  }
  function metricGrid(ids) {
    const list = unique(ids).map(id => data.metrics[id]).filter(Boolean);
    if (!list.length) return null;
    const grid = node('div', 'rl-metric-grid'); list.forEach(metric => grid.append(metricCard(metric))); return grid;
  }
  function sourceRows(ids, joins = []) {
    const grid = node('div', 'rl-source-list');
    unique(ids).forEach(id => {
      const item = source(id); if (!item) return;
      const row = node('article', 'rl-source');
      const heading = node('h3'), title = sourceLink(id, `${item.title || item.publisher} ↗`);
      heading.append(title || node('span', '', item.title || item.publisher)); row.append(heading);
      const meta = [item.publisher, item.season, item.publishedAt ? `Published ${item.publishedAt}` : ''].map(text).filter(Boolean).join(' · ');
      if (meta) row.append(node('p', 'rl-source-meta', meta));
      const exactJoins = joins.filter(join => join && join.sourceId === id && join.section);
      if (exactJoins.length) {
        const list = node('ul', 'rl-source-joins');
        exactJoins.forEach(join => list.append(node('li', '', text(join.section) + (join.role ? ` — ${join.role}` : '')))); row.append(list);
      }
      grid.append(row);
    });
    return grid;
  }
  function disclosure(label, build) {
    const details = node('details', 'rl-source-disclosure');
    details.append(node('summary', '', label));
    let built = false;
    details.addEventListener('toggle', () => {
      if (!details.open || built) return;
      built = true; details.append(build());
    });
    return details;
  }
  function imageCredits(ids) {
    return disclosure('Image credits & actual collection seasons', () => {
    const rows = node('div', 'rl-visual-credits');
    unique(ids).forEach(id => {
      const visual = data.visuals[id]; if (!visual) return;
      const row = node('div', 'rl-credit-row');
      row.append(node('b', '', visual.caption || visual.alt || id));
      const meta = [visual.season, visual.role].map(text).filter(Boolean).join(' · '); if (meta) row.append(node('p', '', meta));
      if (visual.credit) row.append(node('p', '', visual.credit));
      if (safeUrl(visual.sourceUrl, true)) row.append(link(visual.sourceUrl, '', 'Original source ↗', true));
      rows.append(row);
    });
    return rows;
    });
  }
  function readState() {
    const query = new URLSearchParams(location.search), requested = query.get('category');
    state.query = query.get('q') || '';
    state.category = categories.find(label => clean(label) === clean(requested)) || 'All research';
    state.gender = ['men','women'].includes(query.get('gender')) ? query.get('gender') : 'all';
  }
  function syncState() {
    const current = new URL(location.href);
    [['q',state.query],['category',state.category === 'All research' ? '' : state.category],['gender',state.gender === 'all' ? '' : state.gender]].forEach(([key,value]) => value ? current.searchParams.set(key,value) : current.searchParams.delete(key));
    history.replaceState(null, '', current.href);
  }
  function renderHub() {
    readState();
    const shell = node('div','rl-shell'); shell.id = 'intelligence';
    const masthead = node('section','rl-masthead'), edition = node('div','rl-edition-line rl-kicker');
    edition.append(node('span','','SOHO Fashion / Trend research'),node('span','',[data.season,data.edition].map(text).filter(Boolean).join(' · ')));
    const main = node('div','rl-masthead-main'); main.append(node('h1','','Seasonal Research'),node('p','','A/W 27/28 for Mark’s. Outerwear, shirts and trousers, explored through silhouette, detail, cloth and surface.'));
    masthead.append(edition,main); shell.append(masthead);

    const featured = node('section','rl-featured'); featured.setAttribute('aria-labelledby','rl-featured-title');
    const featureHeading = node('div','rl-section-topline'); const featureTitle = node('h2','','Featured research'); featureTitle.id='rl-featured-title';
    featureHeading.append(featureTitle,node('span','rl-kicker rl-muted','The seasonal edit'));
    const featureGrid = node('div','rl-feature-grid'); featuredIds.forEach(id => featureGrid.append(card(byId.get(id),true)));
    featured.append(featureHeading,featureGrid); if (featuredIds.length) shell.append(featured);

    const toolbar = node('section','rl-toolbar'); toolbar.setAttribute('aria-label','Filter research');
    const tabs = node('nav','rl-category-tabs'); tabs.setAttribute('aria-label','Research categories');
    const buttons = [];
    categories.forEach(label => {
      const button = node('button','rl-category-tab'); button.type='button'; button.setAttribute('aria-label',label);
      button.append(node('span','',label)); const count = node('span','rl-category-count',reports.filter(report => matchesCategory(report,label)).length); count.setAttribute('aria-hidden','true'); button.append(count);
      button.addEventListener('click',() => { state.category=label; update(); }); buttons.push([label,button]); tabs.append(button);
    });
    const filterRow = node('div','rl-filter-row'), search = node('form','rl-search'); search.setAttribute('role','search');
    const icon = document.createElementNS('http://www.w3.org/2000/svg','svg'); icon.setAttribute('viewBox','0 0 24 24'); icon.setAttribute('aria-hidden','true');
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle'); circle.setAttribute('cx','10.5');circle.setAttribute('cy','10.5');circle.setAttribute('r','6.5');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','m16 16 5 5');icon.append(circle,path);
    const input=node('input'); input.type='search';input.placeholder='Search items, fabrics or details';input.setAttribute('aria-label','Search research');input.value=state.query;
    search.append(icon,input); search.addEventListener('submit',event => { event.preventDefault(); state.query=input.value.trim(); update(); });
    let inputTimer;
    input.addEventListener('input',() => { clearTimeout(inputTimer);inputTimer=setTimeout(() => { state.query=input.value.trim(); update(); },150); });
    const actions=node('div','rl-filter-actions'), label=node('label','rl-gender-label');label.append(node('span','','Audience'));
    const select=node('select');select.setAttribute('aria-label','Filter by audience');
    [['all','Women & men'],['women','Women'],['men','Men']].forEach(([value,name]) => { const option=node('option','',name);option.value=value;select.append(option); });select.value=state.gender;
    select.addEventListener('change',() => {state.gender=select.value;update();});label.append(select);
    const clear=node('button','rl-clear','Clear filters');clear.type='button';
    const reset = () => {clearTimeout(inputTimer);state.category='All research';state.gender='all';state.query='';input.value='';select.value='all';update();};clear.addEventListener('click',reset);
    actions.append(label,clear);filterRow.append(search,actions);toolbar.append(tabs,filterRow);shell.append(toolbar);

    const library=node('section','rl-library');library.id='report-library';library.setAttribute('aria-labelledby','rl-library-title');
    const libraryHead=node('div','rl-library-heading'), libraryTitle=node('h2','','All research');libraryTitle.id='rl-library-title';
    const count=node('p','rl-result-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');
    const grid=node('div','rl-report-grid');libraryHead.append(libraryTitle,count);library.append(libraryHead,grid);shell.append(library);

    const citedIds=unique(reports.flatMap(report => strings(report.metricIds)));
    const metricIds=unique([...strings(data.contextMetricIds),...citedIds]).filter(id => data.metrics[id] && data.metrics[id].chartable !== false).slice(0,6);
    const evidence=node('section','rl-data-panel');evidence.setAttribute('aria-labelledby','rl-data-title');
    const panelHead=node('div','rl-panel-heading'), panelTitle=node('h2','','Data & sources');panelTitle.id='rl-data-title';
    panelHead.append(panelTitle,node('p','','Each figure retains its market, period and measure. Collection imagery and seasonal forecasts are identified separately in the source records.'));
    evidence.append(panelHead);const metricSection=metricGrid(metricIds);if(metricSection)evidence.append(metricSection);
    const sources=disclosure('Explore the research sources', () => sourceRows(unique(reports.flatMap(report => [...strings(report.sourceIds),...array(report.sourceJoins).map(join => join && join.sourceId)]))));evidence.append(sources);
    evidence.append(imageCredits(unique(reports.flatMap(visualIds))));shell.append(evidence);app.replaceChildren(shell);

    function update(push=true) {
      const active=state.category!=='All research'||state.gender!=='all'||!!state.query;
      featured.hidden=active||!featuredIds.length;
      const results=reports.filter(report => matchesCategory(report,state.category)&&matchesGender(report,state.gender)&&(!state.query||searchText(report).includes(state.query.toLowerCase())));
      const visible=(active?results:results.filter(report => !featuredIds.includes(report.id))).sort((a,b)=>Number(!!coverId(b))-Number(!!coverId(a)));
      buttons.forEach(([name,button]) => button.setAttribute('aria-pressed',String(name===state.category)));
      clear.hidden=!active;libraryTitle.textContent=state.query?'Search results':state.category;
      count.textContent=active||!featuredIds.length?`${results.length} ${results.length===1?'report':'reports'}`:`${visible.length} more reports · ${featuredIds.length} featured above`;
      if(visible.length) grid.replaceChildren(...visible.map(report => card(report)));
      else { const empty=node('div','rl-empty');empty.append(node('h3','',active?'No reports match these filters.':'You have reached the current edit.'));if(active){empty.append(node('p','','Try another item, material or design detail.'));const button=node('button','rl-clear','Clear all filters');button.type='button';button.addEventListener('click',reset);empty.append(button);}grid.replaceChildren(empty); }
      if(push)syncState();
    }
    update(false);
    if(location.hash==='#intelligence')requestAnimationFrame(()=>shell.scrollIntoView({block:'start'}));
    window.addEventListener('research:search',event => {state.query=text(event.detail && event.detail.query).trim();input.value=state.query;state.category='All research';update();library.scrollIntoView({block:'start'});});
  }
  function paragraphGroup(title,value) {
    const div=node('div');div.append(node('h3','',title));strings(value).forEach(item => div.append(node('p','',item)));return div;
  }
  function listSection(items, report, kind) {
    const list=node('ol','rl-detail-list');strings(items).forEach(item => {const row=node('li');if(report)appendConnectedText(row,item,report,kind);else row.textContent=item;list.append(row);});return list;
  }
  function renderDossier() {
    const params=new URLSearchParams(location.search),id=params.get('report')||params.get('id')||params.get('story');
    const aliases={'quiet-architecture':'T03','protective-fluidity':'OW06','human-imprint':'PROC01','pastoral-tension':'PAT03'};
    const report=byId.get(id)||byId.get(aliases[id]);
    if(!report){const missing=node('div','rl-shell rl-error');missing.append(node('h1','','Report not found'),node('p','','Return to the library to explore the current research.'),link(`${libraryPage}#intelligence`,'rl-button','Open research library'));app.replaceChildren(missing);return;}
    document.title=`${report.title} | ${text(data.season)} · SOHO Fashion`;
    const shell=node('div','rl-shell'),crumb=node('nav','rl-breadcrumb');crumb.setAttribute('aria-label','Breadcrumb');
    crumb.append(link(`${libraryPage}#intelligence`,'','Research library'),node('span','','/'),node('span','',categoryOf(report)));shell.append(crumb);
    const head=node('header','rl-dossier-head');head.append(node('span','rl-kicker',[categoryOf(report),data.season].map(text).filter(Boolean).join(' / ')),node('h1','',report.title));
    if(report.summary)head.append(node('p','rl-dossier-summary',report.summary));
    const meta=node('div','rl-dossier-meta');[genderText(report),report.kind,report.priority,data.edition].map(text).filter(Boolean).forEach(value=>meta.append(node('span','',value)));head.append(meta);const summary=connectionSummary(report);if(summary)head.append(summary);shell.append(head);
    const cover=coverId(report),ids=visualIds(report),used=new Set(cover?[cover]:[]);
    if(cover){const opener=node('div','rl-opener');const fig=figure(cover,true);if(fig){opener.append(fig);shell.append(opener);}}
    const layout=node('div','rl-dossier-layout'),toc=node('nav','rl-toc');toc.setAttribute('aria-label','Report contents');toc.append(node('h2','','In this report'));const tocList=node('ol');toc.append(tocList);
    const content=node('div','rl-dossier-body'),chapters=[];
    function chapter(key,title,fill) {
      const section=node('section','rl-chapter');section.id=key;section.append(node('h2','',title));fill(section);content.append(section);chapters.push([key,title]);return section;
    }
    function addGallery(section,predicate) {
      const picks=ids.filter(visualId => !used.has(visualId)&&predicate(data.visuals[visualId]));
      if(!picks.length)return;picks.forEach(visualId=>used.add(visualId));const images=gallery(picks);if(images)section.append(images);
    }
    const kind=typeOf(report);
    if(report.whyMarks||report.whatChanges){chapter('direction',kind==='item'?'The item direction':'The research direction',section=>{const pair=node('div','rl-copy-pair');if(report.whyMarks)pair.append(paragraphGroup('Why it matters for Mark’s',report.whyMarks));if(report.whatChanges)pair.append(paragraphGroup('What changes',report.whatChanges));section.append(pair);});}
    const addElements=()=>{if(strings(report.elements).length)chapter('elements',kind==='item'?'Design elements':'Design expression',section=>{section.append(listSection(report.elements,report,'style'));const keywords=connectionBlock(report,'style');if(keywords)section.append(keywords);addGallery(section,visual=>/detail|element|construction|waist|collar|pocket/i.test(text(visual.role)));});};
    const addMaterials=()=>{if(array(report.materials).some(material=>material&&material.name))chapter('materials','Material direction',section=>{const list=node('div','rl-material-list');array(report.materials).forEach(material=>{if(!material||!material.name)return;const entry=node('article','rl-material'),heading=node('h3'),term=materialTermFor(report,material.name);if(term){const anchor=link(connectionUrl(report,'material',term),'rl-material-direction',material.name);anchor.setAttribute('aria-label',`${material.name}: explore ${unique(strings(term.ids)).length} local references`);heading.append(anchor);}else heading.textContent=material.name;entry.append(heading);if(material.question)entry.append(node('p','',material.question));list.append(entry);});section.append(list);const keywords=connectionBlock(report,'material');if(keywords)section.append(keywords);addGallery(section,visual=>/material|textile|fabric|swatch|weave|pile|cloth/i.test(text(visual.role))&&!/print|pattern/.test(text(visual.role)));});};
    const addPatterns=()=>{if(strings(report.patterns).length)chapter('pattern','Print & pattern',section=>{section.append(listSection(report.patterns));addGallery(section,visual=>/print|pattern|motif|botanic/i.test(text(visual.role)));});};
    const addProcesses=()=>{if(strings(report.processes).length)chapter('process','Construction & finish',section=>{section.append(listSection(report.processes));if(!array(report.materials).some(material=>material&&material.name)){const keywords=connectionBlock(report,'material');if(keywords)section.append(keywords);}addGallery(section,visual=>/process|finish|wash|construction|seam/i.test(text(visual.role)));});};
    if(kind==='material'){addMaterials();addProcesses();addPatterns();addElements();}
    else if(kind==='pattern'){addPatterns();addMaterials();addProcesses();addElements();}
    else if(kind==='process'){addProcesses();addElements();addMaterials();addPatterns();}
    else{addElements();addMaterials();addPatterns();addProcesses();}
    const remaining=ids.filter(visualId=>!used.has(visualId));
    if(remaining.length)chapter('visual-study','Visual study',section=>{const images=gallery(remaining);if(images)section.append(images);});
    const reportMetrics=unique(strings(report.metricIds)).filter(metricId=>data.metrics[metricId]);
    if(reportMetrics.length)chapter('data','Data & context',section=>{const grid=metricGrid(reportMetrics);if(grid)section.append(grid);});
    const joins=array(report.sourceJoins).filter(Boolean),sourceIds=unique([...strings(report.sourceIds),...joins.map(join=>join.sourceId),...reportMetrics.map(metricId=>data.metrics[metricId].sourceId)]);
    if(sourceIds.length||ids.length||strings(report.limitations).length)chapter('sources','Sources & scope',section=>{
      if(sourceIds.length)section.append(sourceRows(sourceIds,joins));
      if(strings(report.limitations).length){const limits=node('ul','rl-limitations');strings(report.limitations).forEach(limit=>limits.append(node('li','',limit)));section.append(limits);}
      if(ids.length)section.append(imageCredits(ids));
    });
    chapters.forEach(([key,title],index)=>{const row=node('li'),anchor=link(`#${key}`,'',null);anchor.append(node('span','',String(index+1).padStart(2,'0')),document.createTextNode(title));row.append(anchor);tocList.append(row);});
    layout.append(toc,content);shell.append(layout);
    const related=unique(strings(report.relatedIds)).filter(relatedId=>relatedId!==report.id&&byId.has(relatedId)).slice(0,3);
    if(related.length){const section=node('section','rl-related');section.append(node('h2','','Related research'));const grid=node('div','rl-feature-grid');related.forEach(relatedId=>grid.append(card(byId.get(relatedId))));section.append(grid);shell.append(section);}
    app.replaceChildren(shell);
    if(activeObserver)activeObserver.disconnect();
    if('IntersectionObserver' in window){activeObserver=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(!visible.length)return;const selected=visible[0].target.id;tocList.querySelectorAll('a').forEach(anchor=>anchor.setAttribute('aria-current',anchor.hash===`#${selected}`?'location':'false'));},{rootMargin:'-15% 0px -60% 0px'});content.querySelectorAll('.rl-chapter').forEach(section=>activeObserver.observe(section));}
    if(location.hash){const target=content.querySelector(`#${CSS.escape(location.hash.slice(1))}`);if(target)requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}
  }
  function showError() {
    const message=node('div','rl-shell rl-error');message.append(node('h1','','Research is temporarily unavailable'),node('p','','Please try loading the library again.'));
    const button=node('button','rl-button','Try again');button.type='button';button.addEventListener('click',load);message.append(button);app.replaceChildren(message);
  }
  async function load() {
    app.replaceChildren(node('p','rl-loading','Loading research…'));
    try {
      const [response, connectionData]=await Promise.all([fetch(dataUrl),body.dataset.page==='dossier'?fetch(connectionsUrl).then(response=>response.ok?response.json():null).catch(()=>null):Promise.resolve(null)]);if(!response.ok)throw new Error('Unavailable');const incoming=await response.json();
      if(!incoming||!Array.isArray(incoming.reports))throw new Error('Invalid data');
      connections=connectionData&&connectionData.version===1&&connectionData.reports&&typeof connectionData.reports==='object'?connectionData.reports:{};
      data={...incoming,sources:incoming.sources||{},metrics:incoming.metrics||{},visuals:incoming.visuals||{}};
      cardCache.clear();
      const seen=new Set();reports=incoming.reports.filter(report=>report&&text(report.id)&&text(report.title)&&!seen.has(report.id)&&(seen.add(report.id),true));byId=new Map(reports.map(report=>[report.id,report]));
      featuredIds=unique(strings(incoming.featured)).filter(id=>byId.has(id)).slice(0,3);
      if(body.dataset.page==='dossier')renderDossier();else renderHub();
    } catch {showError();}
  }
  const headerForm=document.querySelector('.header-search');
  if(headerForm)headerForm.addEventListener('submit',event=>{event.preventDefault();const query=headerForm.querySelector('input').value.trim();if(body.dataset.page==='hub')window.dispatchEvent(new CustomEvent('research:search',{detail:{query}}));else location.href='trend.html?q='+encodeURIComponent(query)+'#report-library';});
  const selection=document.querySelector('[aria-label="View selection"]');if(selection)selection.addEventListener('click',()=>location.href='my-selection.html');
  const contact=document.querySelector('[aria-label="Subscribe"]');if(contact){contact.setAttribute('aria-label','Contact SOHO Fashion');contact.addEventListener('click',()=>location.href='mailto:online@saintycorp.com');}
  load();
})();
